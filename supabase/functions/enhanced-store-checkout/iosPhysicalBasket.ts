import type Stripe from "https://esm.sh/stripe@14.21.0";

const RETURN_URL = "pluggd://commerce/success";
const MAX_LINES = 20;
const MAX_QUANTITY = 4;
const ALLOWED_PRODUCT_TYPES = new Set(["physical", "merchandise", "merch"]);
const ALLOWED_COUNTRIES = [
  "GB",
  "US",
  "CA",
  "AU",
  "IE",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
];

type BasketLine = {
  productId: string;
  quantity: number;
  selectedOptions: Record<string, string>;
};

type Reservation = {
  products: Array<{ id: string; quantity: number }>;
  options: Array<{ id: string; quantity: number }>;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });

const cleanText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseLines(body: Record<string, unknown>): BasketLine[] {
  const allowedBodyKeys = new Set(["clientContext", "cartItems", "requestId"]);
  if (Object.keys(body).some((key) => !allowedBodyKeys.has(key))) {
    throw new Error(
      "Only product IDs, quantities and selected options are accepted",
    );
  }
  if (body.clientContext !== "ios_physical_basket") {
    throw new Error("Invalid basket context");
  }
  if (
    !Array.isArray(body.cartItems) || body.cartItems.length < 1 ||
    body.cartItems.length > MAX_LINES
  ) {
    throw new Error("Basket must contain between 1 and 20 lines");
  }

  const seen = new Set<string>();
  return body.cartItems.map((raw) => {
    if (!isRecord(raw)) throw new Error("Basket line is invalid");
    const allowedLineKeys = new Set([
      "id",
      "productId",
      "quantity",
      "selectedOptions",
    ]);
    if (Object.keys(raw).some((key) => !allowedLineKeys.has(key))) {
      throw new Error("Client-provided product pricing is not accepted");
    }
    const productId = cleanText(raw.productId);
    const quantity = Number(raw.quantity);
    const selectedOptions = raw.selectedOptions === undefined
      ? {}
      : raw.selectedOptions;
    if (
      !productId || !Number.isSafeInteger(quantity) || quantity < 1 ||
      quantity > MAX_QUANTITY ||
      !isRecord(selectedOptions)
    ) {
      throw new Error(
        "Each basket line needs a product, integer quantity and options",
      );
    }
    const normalizedOptions = Object.fromEntries(
      Object.entries(selectedOptions).map(([key, value]) => {
        const optionType = cleanText(key);
        const optionValue = cleanText(value);
        if (
          !optionType || !optionValue || optionType.length > 40 ||
          optionValue.length > 100 ||
          Object.keys(selectedOptions).length > 8
        ) throw new Error("Selected options are invalid");
        return [optionType, optionValue];
      }),
    );
    const key = `${productId}:${
      JSON.stringify(Object.entries(normalizedOptions).sort())
    }`;
    if (seen.has(key)) {
      throw new Error("Duplicate basket lines are not accepted");
    }
    seen.add(key);
    return { productId, quantity, selectedOptions: normalizedOptions };
  });
}

async function preventCheckoutCompletion(
  stripe: Stripe,
  session: Stripe.Checkout.Session | null,
) {
  if (!session) return true;
  let current = session;
  if (current.payment_status === "paid" || current.status === "complete") {
    return false;
  }
  if (current.status === "open") {
    try {
      current = await stripe.checkout.sessions.expire(current.id);
    } catch {
      current = await stripe.checkout.sessions.retrieve(current.id);
    }
  }
  return current.status === "expired" && current.payment_status !== "paid";
}

export async function handleIosPhysicalBasket(args: {
  body: Record<string, unknown>;
  user: { id: string; email: string };
  service: any;
  stripe: Stripe;
}) {
  const { body, user, service, stripe } = args;
  let lines: BasketLine[];
  try {
    lines = parseLines(body);
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Invalid basket",
    }, 400);
  }

  const requestId = cleanText(body.requestId);
  if (!requestId || requestId.length > 100) {
    return json({ error: "A checkout request ID is required" }, 400);
  }
  const idempotencyKey = `ios-physical-basket:${user.id}:${requestId}`;
  const { data: existing } = await service.from("external_checkout_sessions")
    .select("id,status,stripe_checkout_session_id,provider_metadata")
    .eq("idempotency_key", idempotencyKey).maybeSingle();
  const existingUrl = cleanText(existing?.provider_metadata?.checkout_url);
  const existingOrderId = cleanText(existing?.provider_metadata?.order_id);
  if (
    existingUrl && existing?.stripe_checkout_session_id &&
    existingOrderId && existing?.provider_metadata?.inventory_state === "reserved" &&
    existing.status === "open"
  ) {
    return json({
      url: existingUrl,
      sessionId: existing.stripe_checkout_session_id,
      orderId: existingOrderId,
      currency: "GBP",
    });
  }
  if (existing) {
    return json(
      { error: "This checkout request has already been processed" },
      409,
    );
  }

  const productIds = [...new Set(lines.map((line) => line.productId))];
  const { data: products, error: productError } = await service.from(
    "store_products",
  )
    .select(
      "id,title,description,image_url,price,product_type,is_active,stock_quantity,visibility,moderation_status,currency,creator_id,owner_type",
    )
    .in("id", productIds);
  if (
    productError || !Array.isArray(products) ||
    products.length !== productIds.length
  ) {
    return json({ error: "One or more products are unavailable" }, 409);
  }
  const productsById = new Map(
    products.map((product: any) => [product.id, product]),
  );

  const { data: optionRows, error: optionError } = await service.from(
    "product_options",
  )
    .select(
      "id,product_id,option_type,option_value,price_modifier,stock_quantity",
    )
    .in("product_id", productIds);
  if (optionError) {
    return json({ error: "Product options could not be verified" }, 409);
  }
  const options = Array.isArray(optionRows) ? optionRows : [];
  const optionsByProduct = new Map<string, any[]>();
  for (const option of options) {
    optionsByProduct.set(option.product_id, [
      ...(optionsByProduct.get(option.product_id) ?? []),
      option,
    ]);
  }

  const productQuantities = new Map<string, number>();
  const optionQuantities = new Map<string, number>();
  const trustedLines: Array<any> = [];
  let subtotalCents = 0;

  try {
    for (const line of lines) {
      const product = productsById.get(line.productId);
      const productType = String(product?.product_type ?? "").toLowerCase();
      const ownerType = String(product?.owner_type ?? "").toLowerCase();
      if (
        !product || product.is_active !== true ||
        product.visibility !== "public" ||
        product.moderation_status !== "approved" ||
        String(product.currency).toUpperCase() !== "GBP" ||
        !ALLOWED_PRODUCT_TYPES.has(productType) || product.creator_id ||
        (ownerType && !["pluggd", "platform", "admin"].includes(ownerType))
      ) {
        throw new Error(
          "Only approved PLUGGD physical products can use this basket",
        );
      }
      if (
        !Number.isSafeInteger(product.stock_quantity) ||
        product.stock_quantity < 1
      ) {
        throw new Error(
          "A product is sold out or its stock cannot be verified",
        );
      }
      productQuantities.set(
        product.id,
        (productQuantities.get(product.id) ?? 0) + line.quantity,
      );

      const productOptions = optionsByProduct.get(product.id) ?? [];
      const optionTypes = [
        ...new Set(productOptions.map((option) => String(option.option_type))),
      ];
      const selectedTypes = Object.keys(line.selectedOptions);
      if (
        optionTypes.length !== selectedTypes.length ||
        optionTypes.some((type) => !selectedTypes.includes(type))
      ) {
        throw new Error("Choose one valid value for every product option");
      }
      const selectedRows = optionTypes.map((type) => {
        const selectedValue = line.selectedOptions[type].trim();
        const rowsForType = productOptions.filter((option) => String(option.option_type) === type);
        const exactRows = rowsForType.filter((option) => String(option.option_value).trim() === selectedValue);
        const tokenRows = rowsForType.filter((option) =>
          String(option.option_value).split(',').map((token) => token.trim()).includes(selectedValue)
        );
        const candidates = exactRows.length ? exactRows : tokenRows;
        const row = candidates.length === 1 ? candidates[0] : null;
        if (
          !row || !Number.isSafeInteger(row.stock_quantity) ||
          row.stock_quantity < line.quantity
        ) {
          throw new Error("A selected option is unavailable");
        }
        optionQuantities.set(
          row.id,
          (optionQuantities.get(row.id) ?? 0) + line.quantity,
        );
        return row;
      });

      const baseCents = Math.round(Number(product.price) * 100);
      const modifierCents = selectedRows.reduce(
        (sum, row) => sum + Math.round(Number(row.price_modifier ?? 0) * 100),
        0,
      );
      const unitAmountCents = baseCents + modifierCents;
      if (
        !Number.isSafeInteger(baseCents) ||
        !Number.isSafeInteger(modifierCents) || unitAmountCents <= 0
      ) {
        throw new Error("A product price could not be verified");
      }
      subtotalCents += unitAmountCents * line.quantity;
      trustedLines.push({
        product,
        quantity: line.quantity,
        selectedOptions: line.selectedOptions,
        selectedOptionIds: selectedRows.map((row) => row.id),
        unitAmountCents,
      });
    }
  } catch (error) {
    return json({
      error: error instanceof Error
        ? error.message
        : "Basket could not be verified",
    }, 409);
  }

  const reservation: Reservation = {
    products: [...productQuantities].map(([id, quantity]) => ({
      id,
      quantity,
    })),
    options: [...optionQuantities].map(([id, quantity]) => ({ id, quantity })),
  };
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const snapshot = trustedLines.map((line) => ({
    product_id: line.product.id,
    quantity: line.quantity,
    unit_amount_cents: line.unitAmountCents,
    selected_options: line.selectedOptions,
    selected_option_ids: line.selectedOptionIds,
  }));

  const { data: checkout, error: checkoutError } = await service
    .from("external_checkout_sessions")
    .insert({
      user_id: user.id,
      purchase_kind: "physical_merch",
      resource_id: productIds[0],
      quantity: totalQuantity,
      amount_cents: subtotalCents,
      currency: "GBP",
      status: "created",
      idempotency_key: idempotencyKey,
      policy_version: "2026-08-25.ios-basket.1",
      pricing_snapshot: {
        items: snapshot,
        subtotal_cents: subtotalCents,
        currency: "GBP",
      },
      provider_metadata: {
        ios_physical_basket: true,
        inventory_state: "planned",
        reservation,
      },
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (checkoutError || !checkout) {
    return json({ error: "Checkout state could not be secured" }, 409);
  }

  let order: { id: string } | null = null;
  let session: Stripe.Checkout.Session | null = null;
  try {
    const metadata = {
      type: "ios_physical_basket",
      purchase_kind: "physical_merch",
      external_checkout_id: checkout.id,
      user_id: user.id,
    };
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: trustedLines.map((line) => ({
        price_data: {
          currency: "gbp",
          unit_amount: line.unitAmountCents,
          product_data: {
            name: line.product.title,
            description: line.product.description ??
              "Physical PLUGGD merchandise",
            images: /^https:\/\//i.test(line.product.image_url ?? "")
              ? [line.product.image_url]
              : undefined,
            metadata: {
              product_id: line.product.id,
              selected_options: JSON.stringify(line.selectedOptions),
            },
          },
        },
        quantity: line.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: ALLOWED_COUNTRIES as any,
      },
      phone_number_collection: { enabled: true },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 500, currency: "gbp" },
          display_name: "Standard shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      }],
      success_url:
        `${RETURN_URL}?status=success&sessionId={CHECKOUT_SESSION_ID}&kind=store_order`,
      cancel_url:
        `${RETURN_URL}?status=cancelled&kind=store_order`,
      expires_at: Math.floor(new Date(expiresAt).getTime() / 1000),
      metadata,
      payment_intent_data: { metadata },
    }, { idempotencyKey });
    if (!session.url) throw new Error("Stripe returned no checkout URL");

    const checkoutUpdate = await service.from("external_checkout_sessions")
      .update({
        stripe_checkout_session_id: session.id,
        status: "open",
        provider_metadata: {
          ios_physical_basket: true,
          inventory_state: "planned",
          reservation,
          checkout_url: session.url,
        },
      }).eq("id", checkout.id);
    if (checkoutUpdate.error) {
      throw new Error("Checkout provider session could not be linked");
    }

    const prepared = await service.rpc(
      "prepare_ios_physical_basket_checkout",
      { p_checkout_id: checkout.id },
    );
    const preparedOrderId = cleanText(prepared.data?.order_id);
    if (prepared.error || !preparedOrderId) {
      throw new Error("Inventory and order preparation failed");
    }
    order = { id: preparedOrderId };

    const orderUpdate = await service.from("orders").update({
      payment_id: session.id,
      stripe_session_id: session.id,
    }).eq("id", order.id);
    if (orderUpdate.error) {
      throw new Error("Checkout order could not be linked");
    }

    return json({
      url: session.url,
      sessionId: session.id,
      orderId: order.id,
      subtotalAmountCents: subtotalCents,
      currency: "GBP",
    });
  } catch (error) {
    const checkoutCannotComplete = await preventCheckoutCompletion(
      stripe,
      session,
    ).catch(() => false);
    if (!checkoutCannotComplete) {
      console.error("[IOS-PHYSICAL-BASKET-RECONCILE]", error);
      return json({
        error: "Checkout state is being reconciled; no retry is needed",
      }, 409);
    }

    const released = await service.rpc(
      "release_ios_physical_basket_inventory",
      {
        p_checkout_id: checkout.id,
        p_checkout_status: "failed",
        p_order_status: "cancelled",
        p_refunded_amount_cents: null,
        p_refund_reason: null,
      },
    );
    if (released.error) {
      console.error("[IOS-PHYSICAL-BASKET-RELEASE]", released.error);
      return json({
        error: "Checkout state is being reconciled; no retry is needed",
      }, 409);
    }
    console.error("[IOS-PHYSICAL-BASKET]", error);
    return json({ error: "Unable to create physical basket checkout" }, 500);
  }
}

export async function cancelIosPhysicalBasket(args: {
  body: Record<string, unknown>;
  user: { id: string };
  service: any;
  stripe: Stripe;
}) {
  const sessionId = cleanText(args.body.sessionId);
  if (!sessionId) {
    return json({ error: "A checkout session ID is required" }, 400);
  }
  const { data: checkout, error } = await args.service.from(
    "external_checkout_sessions",
  )
    .select("*")
    .eq("user_id", args.user.id)
    .eq("stripe_checkout_session_id", sessionId)
    .eq("purchase_kind", "physical_merch")
    .maybeSingle();
  if (
    error || !checkout ||
    checkout.provider_metadata?.ios_physical_basket !== true
  ) {
    return json({ error: "Physical basket checkout was not found" }, 404);
  }
  if (
    ["completed", "refunded", "partially_refunded", "disputed"].includes(
      checkout.status,
    )
  ) {
    return json({
      state: checkout.status === "completed" ? "success" : "failed",
    });
  }
  let providerSession = await args.stripe.checkout.sessions.retrieve(
    sessionId,
  );
  if (
    providerSession.payment_status === "paid" ||
    providerSession.status === "complete"
  ) {
    return json({ state: "pending" }, 202);
  }
  if (providerSession.status === "open") {
    try {
      providerSession = await args.stripe.checkout.sessions.expire(sessionId);
    } catch {
      providerSession = await args.stripe.checkout.sessions.retrieve(sessionId);
    }
  }
  if (
    providerSession.status !== "expired" ||
    providerSession.payment_status === "paid"
  ) {
    return json({ state: "pending" }, 202);
  }

  const metadata = checkout.provider_metadata ?? {};
  const orderId = cleanText(metadata.order_id);
  const released = await args.service.rpc(
    "release_ios_physical_basket_inventory",
    {
      p_checkout_id: checkout.id,
      p_checkout_status: "cancelled",
      p_order_status: "cancelled",
      p_refunded_amount_cents: null,
      p_refund_reason: null,
    },
  );
  if (released.error) {
    return json({ error: "Inventory release could not be completed" }, 409);
  }
  return json({ state: "cancelled", orderId });
}
