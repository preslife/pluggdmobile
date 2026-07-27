import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import {
  handleCreateBeatPurchase,
  type BeatCheckoutDependencies,
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

const deps: BeatCheckoutDependencies = {
  async authenticate(req) {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const { data, error } = await anon.auth.getUser(header.slice(7));
    return error || !data.user
      ? null
      : { id: data.user.id, email: data.user.email };
  },
  async loadSource({ beatId, licenseOptionId, contractId }) {
    const [beatResult, optionResult, contractResult] = await Promise.all([
      service.from("beats")
        .select("id,user_id,title,producer_name,is_published")
        .eq("id", beatId).maybeSingle(),
      service.from("licensing_options")
        .select("id,beat_id,license_type,price_pence,is_available")
        .eq("id", licenseOptionId).eq("beat_id", beatId).maybeSingle(),
      service.from("licensing_contracts")
        .select(
          "id,beat_id,producer_id,artist_id,template_type,status,amount_cents,currency,producer_signature,artist_signature,contract_data,pricing_snapshot",
        )
        .eq("id", contractId).maybeSingle(),
    ]);
    if (!beatResult.data || !optionResult.data || !contractResult.data) return null;
    return {
      beat: beatResult.data,
      option: optionResult.data,
      contract: contractResult.data,
    };
  },
  async loadPolicy() {
    const { data } = await service.from("commerce_policy_rules")
      .select("*").eq("purchase_kind", "beat_license").maybeSingle();
    return data;
  },
  async loadPayoutAccount(producerId) {
    const { data } = await service.from("producer_stripe_accounts")
      .select("stripe_account_id,onboarding_complete,payouts_enabled")
      .eq("user_id", producerId).maybeSingle();
    return data;
  },
  async findCheckout(idempotencyKey) {
    const { data } = await service.from("external_checkout_sessions")
      .select("id,stripe_checkout_session_id,status,provider_metadata")
      .eq("idempotency_key", idempotencyKey).maybeSingle();
    return data;
  },
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
  async updateContract(id, input) {
    const { error } = await service.from("licensing_contracts")
      .update(input).eq("id", id);
    if (error) throw error;
  },
  now: () => new Date(),
};

serve((req) =>
  handleCreateBeatPurchase(req, deps).catch((error) => {
    console.error("[CREATE-BEAT-PURCHASE]", error);
    return new Response(JSON.stringify({ error: "Unable to create checkout" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })
);
