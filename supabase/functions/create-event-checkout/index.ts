import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  handleCreateEventCheckout,
  type EventCheckoutDependencies,
  type EventCheckoutSource,
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
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

async function reserveAndCreateOrder(input: {
  userId: string;
  source: EventCheckoutSource;
  quantity: number;
  idempotencyKey: string;
  policyVersion: string;
  pricingSnapshot: Record<string, unknown>;
  reservationExpiresAt: string;
}) {
  const existing = await service.from("ticket_orders")
    .select("id,status,stripe_checkout_session_id")
    .eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (existing.data) return existing.data;

  let reserved = false;
  for (let attempt = 0; attempt < 3 && !reserved; attempt += 1) {
    const { data: tier, error } = await service.from("event_ticket_tiers")
      .select("reserved_quantity,sold_quantity,capacity,is_active")
      .eq("id", input.source.tier.id).single();
    if (error || !tier?.is_active) throw new Error("Ticket tier is unavailable");
    if (
      tier.capacity !== null &&
      tier.reserved_quantity + tier.sold_quantity + input.quantity > tier.capacity
    ) {
      throw new Error("Not enough tickets remain");
    }
    const { data: updated } = await service.from("event_ticket_tiers")
      .update({ reserved_quantity: tier.reserved_quantity + input.quantity })
      .eq("id", input.source.tier.id)
      .eq("reserved_quantity", tier.reserved_quantity)
      .eq("sold_quantity", tier.sold_quantity)
      .select("id");
    reserved = Boolean(updated?.length);
  }
  if (!reserved) throw new Error("Ticket inventory changed; please try again");

  const feeAmount = input.source.tier.fee_cents * input.quantity;
  const total = input.source.tier.price_cents * input.quantity + feeAmount;
  const { data, error } = await service.from("ticket_orders").insert({
    user_id: input.userId,
    event_id: input.source.event.id,
    ticket_tier_id: input.source.tier.id,
    quantity: input.quantity,
    unit_amount_cents: input.source.tier.price_cents,
    fee_amount_cents: feeAmount,
    total_amount_cents: total,
    currency: input.source.tier.currency,
    status: "reserved",
    reservation_expires_at: input.reservationExpiresAt,
    idempotency_key: input.idempotencyKey,
    policy_version: input.policyVersion,
    pricing_snapshot: input.pricingSnapshot,
  }).select("id,status,stripe_checkout_session_id").single();
  if (error || !data) {
    const { data: current } = await service.from("event_ticket_tiers")
      .select("reserved_quantity").eq("id", input.source.tier.id).single();
    if (current) {
      await service.from("event_ticket_tiers")
        .update({
          reserved_quantity: Math.max(
            0,
            current.reserved_quantity - input.quantity,
          ),
        })
        .eq("id", input.source.tier.id)
        .eq("reserved_quantity", current.reserved_quantity);
    }
    const replay = await service.from("ticket_orders")
      .select("id,status,stripe_checkout_session_id")
      .eq("idempotency_key", input.idempotencyKey).maybeSingle();
    if (replay.data) return replay.data;
    throw new Error(error?.message ?? "Unable to reserve tickets");
  }
  return data;
}

const deps: EventCheckoutDependencies = {
  async authenticate(req) {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const { data, error } = await anon.auth.getUser(header.slice(7));
    return error || !data.user
      ? null
      : { id: data.user.id, email: data.user.email };
  },
  async loadSource(eventId, ticketTypeId) {
    const [eventResult, tierResult] = await Promise.all([
      service.from("events")
        .select("id,title,description,commerce_classification")
        .eq("id", eventId)
        // Defence in depth: hosted Stripe tickets are only for real-world,
        // physical attendance. The handler verifies this classification again.
        .eq("commerce_classification", "physical")
        .maybeSingle(),
      service.from("event_ticket_tiers").select("*")
        .eq("id", ticketTypeId).eq("event_id", eventId).maybeSingle(),
    ]);
    return eventResult.data && tierResult.data
      ? { event: eventResult.data, tier: tierResult.data }
      : null;
  },
  async loadPolicy() {
    const { data } = await service.from("commerce_policy_rules")
      .select("*").eq("purchase_kind", "event_ticket").maybeSingle();
    return data;
  },
  async findCheckout(idempotencyKey) {
    const { data } = await service.from("external_checkout_sessions")
      .select("id,stripe_checkout_session_id,status,provider_metadata")
      .eq("idempotency_key", idempotencyKey).maybeSingle();
    return data;
  },
  async findOrder(idempotencyKey) {
    const { data } = await service.from("ticket_orders")
      .select("id,status,stripe_checkout_session_id")
      .eq("idempotency_key", idempotencyKey).maybeSingle();
    return data;
  },
  reserveAndCreateOrder,
  async createCheckout(input) {
    const { data, error } = await service.from("external_checkout_sessions")
      .insert(input)
      .select("id,stripe_checkout_session_id,status,provider_metadata").single();
    if (error || !data) throw new Error(error?.message ?? "Checkout insert failed");
    return data;
  },
  async createStripeSession(input, idempotencyKey) {
    return await stripe.checkout.sessions.create(
      input as Stripe.Checkout.SessionCreateParams,
      { idempotencyKey },
    );
  },
  async updateCheckout(id, input) {
    const { error } = await service.from("external_checkout_sessions")
      .update(input).eq("id", id);
    if (error) throw error;
  },
  async updateOrder(id, input) {
    const { error } = await service.from("ticket_orders")
      .update(input).eq("id", id);
    if (error) throw error;
  },
  async releaseReservation({ orderId, ticketTierId, quantity }) {
    const { data: tier } = await service.from("event_ticket_tiers")
      .select("reserved_quantity").eq("id", ticketTierId).maybeSingle();
    if (tier) {
      await service.from("event_ticket_tiers").update({
        reserved_quantity: Math.max(0, tier.reserved_quantity - quantity),
      }).eq("id", ticketTierId)
        .eq("reserved_quantity", tier.reserved_quantity);
    }
    await service.from("ticket_orders").update({
      status: "failed",
      reservation_expires_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
  },
  now: () => new Date(),
};

serve((req) =>
  handleCreateEventCheckout(req, deps).catch((error) => {
    console.error("[CREATE-EVENT-CHECKOUT]", error);
    const message = error instanceof Error ? error.message : "Unable to create checkout";
    const status = message.includes("tickets remain") ||
        message.includes("inventory changed")
      ? 409
      : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  })
);
