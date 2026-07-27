import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  handleReconcileCommerceCheckout,
  type CheckoutReconciliationRecord,
  type ReconcileCheckoutDependencies,
} from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
  auth: { persistSession: false },
});
const service = createClient(
  url,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

async function loadEntitlement(checkout: CheckoutReconciliationRecord) {
  if (checkout.purchase_kind === "beat_license") {
    const contractId = checkout.provider_metadata?.contract_id;
    if (typeof contractId !== "string") return null;
    const { data } = await service.from("licensing_contracts")
      .select(
        "id,status,beat_id,template_type,contract_pdf_url,completed_at,refunded_at",
      )
      .eq("id", contractId)
      .eq("artist_id", checkout.user_id)
      .maybeSingle();
    if (!data) return null;
    return {
      type: "beat_license",
      id: data.id,
      status: data.status,
      active: checkout.status === "completed" && data.status === "completed",
      beatId: data.beat_id,
      licenseType: data.template_type,
      licensePdfUrl: data.contract_pdf_url ?? null,
    };
  }
  if (checkout.purchase_kind === "event_ticket") {
    const orderId = checkout.provider_metadata?.ticket_order_id;
    if (typeof orderId !== "string") return null;
    const { data } = await service.from("ticket_orders")
      .select(
        "id,status,event_id,ticket_tier_id,quantity,completed_at,refunded_at",
      )
      .eq("id", orderId)
      .eq("user_id", checkout.user_id)
      .maybeSingle();
    if (!data) return null;
    return {
      type: "event_ticket",
      id: data.id,
      status: data.status,
      active: checkout.status === "completed" && data.status === "completed",
      eventId: data.event_id,
      ticketTypeId: data.ticket_tier_id,
      quantity: data.quantity,
    };
  }
  if (checkout.purchase_kind === "physical_merch") {
    const orderId = checkout.provider_metadata?.merch_order_id;
    if (typeof orderId !== "string") return null;
    const { data } = await service.from("physical_merch_orders")
      .select("id,status,product_id,product_source,quantity,completed_at")
      .eq("id", orderId)
      .eq("user_id", checkout.user_id)
      .maybeSingle();
    if (!data) return null;
    return {
      type: "physical_merch",
      id: data.id,
      status: data.status,
      active: checkout.status === "completed" && data.status === "completed",
      productId: data.product_id,
      productSource: data.product_source,
      quantity: data.quantity,
    };
  }
  if (checkout.purchase_kind === "release_unlock") {
    const purchaseId = checkout.provider_metadata?.release_purchase_id;
    if (typeof purchaseId !== "string") return null;
    const { data } = await service.from("release_purchases")
      .select("id,status,release_id,completed_at")
      .eq("id", purchaseId)
      .or(
        `user_id.eq.${checkout.user_id},purchaser_id.eq.${checkout.user_id}`,
      )
      .maybeSingle();
    if (!data) return null;
    return {
      type: "release_unlock",
      id: data.id,
      status: data.status,
      active: checkout.status === "completed" && data.status === "completed",
      releaseId: data.release_id,
    };
  }
  return checkout.status === "completed"
    ? {
      type: checkout.purchase_kind,
      id: checkout.provider_metadata?.entitlement_id ?? checkout.resource_id,
      status: "completed",
      active: true,
    }
    : null;
}

const deps: ReconcileCheckoutDependencies = {
  async authenticate(req) {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const { data, error } = await anon.auth.getUser(header.slice(7));
    return error || !data.user ? null : { id: data.user.id };
  },
  async loadOwnedCheckout(userId, sessionId) {
    const columns =
      "id,user_id,purchase_kind,resource_id,variant_id,quantity,amount_cents,currency,stripe_checkout_session_id,status,completed_at,refunded_at,pricing_snapshot,provider_metadata";
    const byStripe = await service.from("external_checkout_sessions")
      .select(columns)
      .eq("user_id", userId)
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (byStripe.data) return byStripe.data;
    const byId = await service.from("external_checkout_sessions")
      .select(columns)
      .eq("user_id", userId)
      .eq("id", sessionId)
      .maybeSingle();
    return byId.data;
  },
  loadEntitlement,
};

serve((req) =>
  handleReconcileCommerceCheckout(req, deps).catch((error) => {
    console.error("[RECONCILE-COMMERCE-CHECKOUT]", error);
    return new Response(JSON.stringify({ error: "Unable to reconcile checkout" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })
);
