import {
  defaultDeny,
  resolveCommercePolicy,
  type CommercePolicyDecision,
  type CommercePolicyRule,
} from "../_shared/commercePolicy.ts";
import type { ExternalCheckoutRecord } from "../create-beat-purchase/handler.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type User = { id: string; email?: string | null };
export type EventCheckoutSource = {
  event: {
    id: string;
    title: string;
    description?: string | null;
    commerce_classification: string;
  };
  tier: {
    id: string;
    event_id: string;
    name: string;
    description?: string | null;
    price_cents: number;
    fee_cents: number;
    currency: string;
    capacity?: number | null;
    reserved_quantity: number;
    sold_quantity: number;
    available_quantity?: number | null;
    max_per_order: number;
    is_active: boolean;
    sale_starts_at?: string | null;
    sale_ends_at?: string | null;
    refund_terms?: string | null;
  };
};

export type TicketOrder = {
  id: string;
  status: string;
  stripe_checkout_session_id?: string | null;
};

type StripeSession = { id: string; url: string | null };

export interface EventCheckoutDependencies {
  authenticate(req: Request): Promise<User | null>;
  loadSource(eventId: string, ticketTypeId: string): Promise<EventCheckoutSource | null>;
  loadPolicy(): Promise<CommercePolicyRule | null>;
  findCheckout(idempotencyKey: string): Promise<ExternalCheckoutRecord | null>;
  findOrder(idempotencyKey: string): Promise<TicketOrder | null>;
  reserveAndCreateOrder(input: {
    userId: string;
    source: EventCheckoutSource;
    quantity: number;
    idempotencyKey: string;
    policyVersion: string;
    pricingSnapshot: Record<string, unknown>;
    reservationExpiresAt: string;
  }): Promise<TicketOrder>;
  createCheckout(input: Record<string, unknown>): Promise<ExternalCheckoutRecord>;
  createStripeSession(
    input: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<StripeSession>;
  updateCheckout(id: string, input: Record<string, unknown>): Promise<void>;
  updateOrder(id: string, input: Record<string, unknown>): Promise<void>;
  releaseReservation(input: {
    orderId: string;
    ticketTierId: string;
    quantity: number;
  }): Promise<void>;
  now(): Date;
}

type Body = {
  eventId?: unknown;
  ticketTypeId?: unknown;
  quantity?: unknown;
  returnUrl?: unknown;
  storefront?: unknown;
  requestId?: unknown;
  amount?: unknown;
  price?: unknown;
};

const RETURN_URL = "pluggd://commerce/success";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const id = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const checkoutUrl = (record?: ExternalCheckoutRecord | null) =>
  typeof record?.provider_metadata?.checkout_url === "string"
    ? record.provider_metadata.checkout_url
    : null;
const deny = (decision: CommercePolicyDecision) =>
  json({ error: decision.reason, decision }, 403);

export async function handleCreateEventCheckout(
  req: Request,
  deps: EventCheckoutDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await deps.authenticate(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (body.amount !== undefined || body.price !== undefined) {
    return json({ error: "Client-provided pricing is not accepted" }, 400);
  }

  const eventId = id(body.eventId);
  const ticketTypeId = id(body.ticketTypeId);
  const returnUrl = id(body.returnUrl);
  const storefront = id(body.storefront);
  const requestId = id(body.requestId) ?? "initial";
  const quantity = typeof body.quantity === "number" &&
      Number.isSafeInteger(body.quantity)
    ? body.quantity
    : NaN;
  if (!eventId || !ticketTypeId || !returnUrl || !Number.isSafeInteger(quantity)) {
    return json({
      error: "eventId, ticketTypeId, quantity and returnUrl are required",
    }, 400);
  }
  if (returnUrl !== RETURN_URL) {
    return json({ error: "Return URL is not permitted" }, 400);
  }
  if (quantity < 1) return json({ error: "Quantity must be at least one" }, 400);

  const source = await deps.loadSource(eventId, ticketTypeId);
  if (!source || !source.tier.is_active) {
    return json({ error: "Ticket tier is unavailable" }, 404);
  }
  if (source.event.commerce_classification !== "physical") {
    return json({
      error: "Stripe checkout is available only for verified physical events",
    }, 403);
  }
  const { tier, event } = source;
  if (tier.event_id !== event.id) {
    return json({ error: "Ticket tier does not belong to this event" }, 400);
  }
  if (quantity > tier.max_per_order) {
    return json({ error: `Maximum ${tier.max_per_order} tickets per order` }, 409);
  }
  if (tier.available_quantity !== null && tier.available_quantity !== undefined &&
    quantity > tier.available_quantity) {
    return json({ error: "Not enough tickets remain" }, 409);
  }
  const now = deps.now();
  if (
    (tier.sale_starts_at && now < new Date(tier.sale_starts_at)) ||
    (tier.sale_ends_at && now >= new Date(tier.sale_ends_at))
  ) {
    return json({ error: "This ticket tier is not currently on sale" }, 409);
  }
  if (
    !Number.isSafeInteger(tier.price_cents) || tier.price_cents < 0 ||
    !Number.isSafeInteger(tier.fee_cents) || tier.fee_cents < 0 ||
    !/^[A-Z]{3}$/.test(tier.currency)
  ) {
    return json({ error: "Ticket pricing is invalid" }, 409);
  }

  const rule = await deps.loadPolicy();
  const decision = rule
    ? resolveCommercePolicy({
      purchaseKind: "event_ticket",
      itemId: event.id,
      optionId: tier.id,
      classification: "physical",
      storefront,
      platform: "ios",
    }, rule)
    : defaultDeny(storefront, "Commerce policy could not be verified.");
  if (decision.permittedRail !== "stripe_checkout") return deny(decision);

  const idempotencyKey =
    `event-ticket:${user.id}:${event.id}:${tier.id}:${quantity}:${requestId}`;
  const existingCheckout = await deps.findCheckout(idempotencyKey);
  const existingUrl = checkoutUrl(existingCheckout);
  if (
    existingCheckout?.stripe_checkout_session_id &&
    existingUrl &&
    ["created", "open"].includes(existingCheckout.status)
  ) {
    const order = await deps.findOrder(idempotencyKey);
    return json({
      url: existingUrl,
      checkoutUrl: existingUrl,
      sessionId: existingCheckout.stripe_checkout_session_id,
      orderId: order?.id ?? null,
    });
  }

  const feeAmountCents = tier.fee_cents * quantity;
  const totalAmountCents = tier.price_cents * quantity + feeAmountCents;
  const pricingSnapshot = {
    event_id: event.id,
    event_title: event.title,
    ticket_tier_id: tier.id,
    ticket_tier_name: tier.name,
    unit_amount_cents: tier.price_cents,
    fee_amount_cents: feeAmountCents,
    quantity,
    total_amount_cents: totalAmountCents,
    currency: tier.currency,
    refund_terms: tier.refund_terms ?? null,
    commerce_classification: "physical",
  };
  const reservationExpiresAt = new Date(now.getTime() + 30 * 60 * 1000)
    .toISOString();

  let order = await deps.findOrder(idempotencyKey);
  if (!order) {
    order = await deps.reserveAndCreateOrder({
      userId: user.id,
      source,
      quantity,
      idempotencyKey,
      policyVersion: decision.policyVersion ?? "unknown",
      pricingSnapshot,
      reservationExpiresAt,
    });
  }

  let checkout = existingCheckout;
  if (!checkout) {
    try {
      checkout = await deps.createCheckout({
        user_id: user.id,
        purchase_kind: "event_ticket",
        resource_id: event.id,
        variant_id: tier.id,
        quantity,
        amount_cents: totalAmountCents,
        currency: tier.currency,
        status: "created",
        idempotency_key: idempotencyKey,
        policy_version: decision.policyVersion,
        pricing_snapshot: pricingSnapshot,
        provider_metadata: { ticket_order_id: order.id },
        expires_at: reservationExpiresAt,
      });
    } catch {
      checkout = await deps.findCheckout(idempotencyKey);
      if (!checkout) throw new Error("Unable to initialise ticket checkout");
    }
  }

  const metadata = {
    purchase_kind: "event_ticket",
    external_checkout_id: checkout.id,
    ticket_order_id: order.id,
    event_id: event.id,
    ticket_tier_id: tier.id,
    user_id: user.id,
    quantity: String(quantity),
    amount_cents: String(totalAmountCents),
    currency: tier.currency,
    policy_version: decision.policyVersion ?? "",
  };
  let stripeSession: StripeSession;
  try {
    stripeSession = await deps.createStripeSession({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: tier.currency.toLowerCase(),
          unit_amount: tier.price_cents,
          product_data: {
            name: `${tier.name} — ${event.title}`,
            description: tier.description ?? event.description ??
              `Admission to ${event.title}`,
            metadata,
          },
        },
        quantity,
      }, ...(tier.fee_cents > 0
        ? [{
          price_data: {
            currency: tier.currency.toLowerCase(),
            unit_amount: tier.fee_cents,
            product_data: {
              name: "Booking fee",
              metadata,
            },
          },
          quantity,
        }]
      : [])],
      success_url:
        `${RETURN_URL}?status=success&sessionId={CHECKOUT_SESSION_ID}&kind=event_ticket&itemId=${event.id}`,
      cancel_url:
        `${RETURN_URL}?status=cancelled&kind=event_ticket&itemId=${event.id}`,
      expires_at: Math.floor(new Date(reservationExpiresAt).getTime() / 1000),
      metadata,
      payment_intent_data: { metadata },
    }, idempotencyKey);
    if (!stripeSession.url) throw new Error("Stripe returned no checkout URL");
  } catch (error) {
    await deps.releaseReservation({
      orderId: order.id,
      ticketTierId: tier.id,
      quantity,
    });
    await deps.updateCheckout(checkout.id, {
      status: "failed",
      updated_at: deps.now().toISOString(),
    });
    throw error;
  }

  await deps.updateCheckout(checkout.id, {
    stripe_checkout_session_id: stripeSession.id,
    status: "open",
    provider_metadata: {
      ticket_order_id: order.id,
      checkout_url: stripeSession.url,
    },
    updated_at: deps.now().toISOString(),
  });
  await deps.updateOrder(order.id, {
    stripe_checkout_session_id: stripeSession.id,
    status: "checkout_open",
    updated_at: deps.now().toISOString(),
  });

  return json({
    url: stripeSession.url,
    checkoutUrl: stripeSession.url,
    sessionId: stripeSession.id,
    orderId: order.id,
    totalAmountCents,
    currency: tier.currency,
  });
}
