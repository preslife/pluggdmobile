import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  defaultDeny,
  resolveCommercePolicy,
} from "../_shared/commercePolicy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const RETURN_URL = "pluggd://commerce/success";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

async function restoreStock(
  service: any,
  table: string,
  productId: string,
  quantity: number,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: current } = await service.from(table)
      .select("stock_quantity").eq("id", productId).maybeSingle();
    if (current?.stock_quantity === null || current?.stock_quantity === undefined) {
      return;
    }
    const { data: restored } = await service.from(table).update({
      stock_quantity: Number(current.stock_quantity) + quantity,
    }).eq("id", productId)
      .eq("stock_quantity", current.stock_quantity)
      .select("id");
    if (restored?.length) return;
  }
  throw new Error("Reserved merchandise stock could not be restored");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = createClient(
    url,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const { data: { user }, error: authError } = await service.auth.getUser(
      authorization.slice(7),
    );
    if (authError || !user?.email) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    if (body.amount !== undefined || body.price !== undefined) {
      return json({ error: "Client-provided pricing is not accepted" }, 400);
    }
    const productId = text(body.productId);
    const productSource = body.productSource === "creator_merchandise"
      ? "creator_merchandise"
      : body.productSource === "store_products"
      ? "store_products"
      : null;
    const returnUrl = text(body.returnUrl);
    const storefront = text(body.storefront);
    const requestId = text(body.requestId) ?? "initial";
    const quantity = Number(body.quantity);
    if (
      !productId || !productSource || returnUrl !== RETURN_URL ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 4
    ) {
      return json({
        error:
          "productId, productSource, quantity and the approved returnUrl are required",
      }, 400);
    }

    const select = productSource === "store_products"
      ? "id,title,description,image_url,price,product_type,stock_quantity,is_active"
      : "id,title,description,image_url,price,product_type,stock_quantity,status,requires_shipping,user_id";
    const { data: productRow, error: productError } = await service
      .from(productSource)
      .select(select)
      .eq("id", productId)
      .maybeSingle();
    if (productError || !productRow) {
      return json({ error: "Merchandise is unavailable" }, 404);
    }
    const product: any = productRow;
    const isPhysical = productSource === "store_products"
      ? product.is_active === true && product.product_type === "merchandise"
      : product.requires_shipping === true &&
        ["active", "published", "approved", "live"].includes(product.status);
    if (!isPhysical) {
      return json({ error: "Only verified physical merchandise is eligible" }, 403);
    }

    const unitAmountCents = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(unitAmountCents) || unitAmountCents <= 0) {
      return json({ error: "Merchandise pricing is invalid" }, 409);
    }
    if (
      product.stock_quantity !== null &&
      Number(product.stock_quantity) < quantity
    ) {
      return json({ error: "Not enough stock remains" }, 409);
    }

    const { data: rule } = await service.from("commerce_policy_rules")
      .select("*").eq("purchase_kind", "physical_merch").maybeSingle();
    const decision = rule
      ? resolveCommercePolicy({
        purchaseKind: "physical_merch",
        itemId: productId,
        optionId: productSource,
        classification: "physical",
        storefront,
        platform: "ios",
      }, rule)
      : defaultDeny(storefront, "Commerce policy could not be verified.");
    if (decision.permittedRail !== "stripe_checkout") {
      return json({ error: decision.reason, decision }, 403);
    }

    const connect = product.user_id
      ? await service.from("producer_stripe_accounts")
        .select("stripe_account_id,onboarding_complete,payouts_enabled")
        .eq("user_id", product.user_id).maybeSingle()
      : { data: null };
    const connectReady = Boolean(
      connect.data?.stripe_account_id &&
        connect.data.onboarding_complete &&
        connect.data.payouts_enabled,
    );
    if (productSource === "creator_merchandise" && !connectReady) {
      return json({
        error:
          "This seller must finish Stripe Connect onboarding before accepting merchandise payments.",
      }, 409);
    }

    const idempotencyKey =
      `physical-merch:${user.id}:${productSource}:${productId}:${quantity}:${requestId}`;
    const { data: existing } = await service.from("external_checkout_sessions")
      .select("id,stripe_checkout_session_id,status,provider_metadata")
      .eq("idempotency_key", idempotencyKey).maybeSingle();
    const existingUrl = typeof existing?.provider_metadata?.checkout_url ===
        "string"
      ? existing.provider_metadata.checkout_url
      : null;
    if (
      existingUrl && existing?.stripe_checkout_session_id &&
      ["created", "open"].includes(existing.status)
    ) {
      return json({
        checkoutUrl: existingUrl,
        sessionId: existing.stripe_checkout_session_id,
        orderId: existing.provider_metadata?.merch_order_id ?? null,
      });
    }

    if (product.stock_quantity !== null) {
      const nextStock = Number(product.stock_quantity) - quantity;
      const { data: updated } = await service.from(productSource)
        .update({ stock_quantity: nextStock })
        .eq("id", productId)
        .eq("stock_quantity", product.stock_quantity)
        .select("id");
      if (!updated?.length) {
        return json({ error: "Stock changed; please try again" }, 409);
      }
    }

    const totalAmountCents = unitAmountCents * quantity;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const pricingSnapshot = {
      product_id: productId,
      product_source: productSource,
      product_title: product.title,
      unit_amount_cents: unitAmountCents,
      quantity,
      total_amount_cents: totalAmountCents,
      currency: "GBP",
      creator_id: product.user_id ?? null,
      inventory_reserved: product.stock_quantity !== null,
    };

    const { data: order, error: orderError } = await service
      .from("physical_merch_orders")
      .insert({
        user_id: user.id,
        product_id: productId,
        product_source: productSource,
        creator_id: product.user_id ?? null,
        quantity,
        unit_amount_cents: unitAmountCents,
        total_amount_cents: totalAmountCents,
        currency: "GBP",
        status: "reserved",
        reservation_expires_at: expiresAt,
        idempotency_key: idempotencyKey,
        policy_version: decision.policyVersion,
        pricing_snapshot: pricingSnapshot,
      })
      .select("id").single();
    if (orderError || !order) {
      if (product.stock_quantity !== null) {
        await restoreStock(service, productSource, productId, quantity);
      }
      throw new Error(orderError?.message ?? "Unable to reserve merchandise");
    }

    const { data: checkout, error: checkoutError } = await service
      .from("external_checkout_sessions")
      .insert({
        user_id: user.id,
        purchase_kind: "physical_merch",
        resource_id: productId,
        quantity,
        amount_cents: totalAmountCents,
        currency: "GBP",
        status: "created",
        idempotency_key: idempotencyKey,
        policy_version: decision.policyVersion,
        pricing_snapshot: pricingSnapshot,
        provider_metadata: {
          merch_order_id: order.id,
          product_source: productSource,
        },
        expires_at: expiresAt,
      })
      .select("id").single();
    if (checkoutError || !checkout) {
      await service.from("physical_merch_orders").update({ status: "failed" })
        .eq("id", order.id);
      if (product.stock_quantity !== null) {
        await restoreStock(service, productSource, productId, quantity);
      }
      throw new Error(checkoutError?.message ?? "Unable to initialise checkout");
    }

    const metadata = {
      purchase_kind: "physical_merch",
      external_checkout_id: checkout.id,
      merch_order_id: order.id,
      product_id: productId,
      product_source: productSource,
      creator_id: product.user_id ?? "",
      user_id: user.id,
      quantity: String(quantity),
      amount_cents: String(totalAmountCents),
      currency: "GBP",
      policy_version: decision.policyVersion ?? "",
    };
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [{
          price_data: {
            currency: "gbp",
            unit_amount: unitAmountCents,
            product_data: {
              name: product.title,
              description: product.description ?? "Physical merchandise",
              images: product.image_url ? [product.image_url] : undefined,
              metadata,
            },
          },
          quantity,
        }],
        shipping_address_collection: {
          allowed_countries: ["GB", "US", "CA", "AU", "IE", "FR", "DE", "NL"],
        },
        phone_number_collection: { enabled: true },
        success_url:
          `${RETURN_URL}?status=success&sessionId={CHECKOUT_SESSION_ID}&kind=physical_merch&itemId=${productId}`,
        cancel_url:
          `${RETURN_URL}?status=cancelled&kind=physical_merch&itemId=${productId}`,
        expires_at: Math.floor(new Date(expiresAt).getTime() / 1000),
        metadata,
        payment_intent_data: connectReady
          ? {
            application_fee_amount: Math.round(totalAmountCents * 0.2),
            transfer_data: { destination: connect.data!.stripe_account_id },
            metadata,
          }
          : { metadata },
      }, { idempotencyKey });
      if (!session.url) throw new Error("Stripe returned no checkout URL");
    } catch (stripeError) {
      await Promise.all([
        service.from("external_checkout_sessions").update({ status: "failed" })
          .eq("id", checkout.id),
        service.from("physical_merch_orders").update({ status: "failed" })
          .eq("id", order.id),
      ]);
      if (product.stock_quantity !== null) {
        await restoreStock(service, productSource, productId, quantity);
      }
      throw stripeError;
    }
    const [checkoutWrite, orderWrite] = await Promise.all([
      service.from("external_checkout_sessions").update({
        stripe_checkout_session_id: session.id,
        status: "open",
        provider_metadata: {
          merch_order_id: order.id,
          product_source: productSource,
          checkout_url: session.url,
          connect_destination: connectReady
            ? connect.data!.stripe_account_id
            : null,
        },
      }).eq("id", checkout.id),
      service.from("physical_merch_orders").update({
        stripe_checkout_session_id: session.id,
        status: "checkout_open",
      }).eq("id", order.id),
    ]);
    if (checkoutWrite.error || orderWrite.error) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      await Promise.all([
        service.from("external_checkout_sessions").update({ status: "failed" })
          .eq("id", checkout.id),
        service.from("physical_merch_orders").update({ status: "failed" })
          .eq("id", order.id),
      ]);
      if (product.stock_quantity !== null) {
        await restoreStock(service, productSource, productId, quantity);
      }
      throw new Error("Unable to secure merchandise checkout state");
    }

    return json({
      checkoutUrl: session.url,
      sessionId: session.id,
      orderId: order.id,
      totalAmountCents,
      currency: "GBP",
    });
  } catch (error) {
    console.error("[CREATE-MERCH-CHECKOUT]", error);
    return json({ error: "Unable to create merchandise checkout" }, 500);
  }
});
