import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: { user }, error: authError } = await service.auth.getUser(
      authorization.slice(7),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const amountCredits = Number(body.amount_credits);
    const requestId = typeof body.request_id === "string"
      ? body.request_id.trim()
      : "";
    if (
      !Number.isSafeInteger(amountCredits) || amountCredits < 1000 ||
      requestId.length < 8
    ) {
      return json({
        error: "A minimum of 1,000 credits and a request ID are required",
      }, 400);
    }

    const { data: stripeAccount } = await service
      .from("producer_stripe_accounts")
      .select("stripe_account_id,onboarding_complete,payouts_enabled")
      .eq("user_id", user.id)
      .maybeSingle();
    if (
      !stripeAccount?.stripe_account_id ||
      !stripeAccount.onboarding_complete ||
      !stripeAccount.payouts_enabled
    ) {
      return json({
        error: "Complete Stripe Connect onboarding before requesting a payout.",
      }, 409);
    }

    const { data: tier } = await service.rpc("get_user_tier_limits", {
      user_id: user.id,
    });
    const commissionRate = Number(tier?.commission_rate ?? 15);
    const idempotencyKey = `credit-cashout:${user.id}:${requestId}`;
    const { data: reserved, error: reserveError } = await service.rpc(
      "reserve_mobile_credit_cashout",
      {
        p_user_id: user.id,
        p_amount_credits: amountCredits,
        p_commission_rate: commissionRate,
        p_idempotency_key: idempotencyKey,
      },
    );
    if (reserveError) {
      const status = reserveError.message?.includes("Insufficient") ? 409 : 400;
      return json({
        error: status === 409
          ? "Insufficient available credits"
          : "Cash-out request could not be reserved",
      }, status);
    }
    if (reserved?.status === "completed") {
      return json({
        success: true,
        requestId: reserved.request_id,
        status: "completed",
      });
    }

    await service.from("credit_cashout_requests").update({
      status: "processing",
      failure_reason: null,
      updated_at: new Date().toISOString(),
    }).eq("id", reserved.request_id);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });
    try {
      const transfer = await stripe.transfers.create({
        amount: Number(reserved.net_amount_cents),
        currency: "gbp",
        destination: stripeAccount.stripe_account_id,
        description: "PLUGGD creator support payout",
        metadata: {
          user_id: user.id,
          cashout_request_id: reserved.request_id,
          source: "ios_credits",
        },
      }, { idempotencyKey: `credit-cashout:${reserved.request_id}` });
      const { error: completionError } = await service
        .from("credit_cashout_requests").update({
          status: "completed",
          stripe_transfer_id: transfer.id,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", reserved.request_id);
      if (completionError) {
        throw new Error("Payout completed but reconciliation is pending");
      }
      return json({
        success: true,
        requestId: reserved.request_id,
        status: "completed",
        netAmountGbp: (Number(reserved.net_amount_cents) / 100).toFixed(2),
      });
    } catch (error) {
      await service.from("credit_cashout_requests").update({
        status: "failed",
        failure_reason: error instanceof Error ? error.message.slice(0, 500) : "Stripe transfer failed",
        updated_at: new Date().toISOString(),
      }).eq("id", reserved.request_id);
      return json({
        success: false,
        requestId: reserved.request_id,
        status: "pending",
        error: "Payout is pending and can be retried safely.",
      }, 202);
    }
  } catch (error) {
    console.error("cash-out-credits failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "Cash-out is unavailable" }, 500);
  }
});
