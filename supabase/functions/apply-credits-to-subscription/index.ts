import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_GBP = 100;

interface LedgerErrorNormalization {
  status: number;
  body: Record<string, unknown>;
  logMeta: Record<string, unknown>;
}

const normalizeLedgerError = (
  message: string | null | undefined,
  complianceMeta: Record<string, unknown>,
): LedgerErrorNormalization => {
  if (message?.includes("WALLET_BALANCE_NEGATIVE")) {
    return {
      status: 409,
      body: {
        error: "Credits are locked pending compliance review. Please contact support for assistance.",
        code: "WALLET_BALANCE_NEGATIVE",
        compliance_block: true,
      },
      logMeta: { reason: "balance_negative", message, ...complianceMeta },
    };
  }

  return {
    status: 500,
    body: {
      error: "Unable to record subscription credit application.",
      code: "LEDGER_INSERT_FAILED",
    },
    logMeta: { reason: "unknown", message, ...complianceMeta },
  };
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    { auth: { persistSession: false } },
  );

  let rawPayload: Record<string, unknown> = {};
  try {
    rawPayload = await req.json();
  } catch {
    rawPayload = {};
  }

  const amountCredits = typeof rawPayload?.amount_credits === "number"
    ? (rawPayload.amount_credits as number)
    : undefined;
  const requestCorrelationId =
    (typeof rawPayload?.correlationId === "string" ? (rawPayload.correlationId as string) : undefined) ??
    req.headers.get("x-correlation-id") ??
    generateCorrelationId();

  const logger = createSystemLogger(supabaseClient, {
    component: "apply_credits_to_subscription",
    feature: "wallet",
    correlationId: requestCorrelationId,
    message: "Apply wallet credits to subscription",
  });

  let userId: string | null = null;

  try {
    await logger.info("apply_subscription_request_received", {
      amount_credits: amountCredits,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    userId = user.id;

    await logger.info("apply_subscription_user_authenticated", {
      user_id: user.id,
    });

    if (!amountCredits || amountCredits < 100) {
      throw new Error("Minimum application is 100 credits (£1)");
    }

    const { data: balanceData, error: balanceError } = await supabaseClient.rpc("get_wallet_balance", {
      p_user_id: user.id,
    });
    if (balanceError) throw new Error(`Balance check failed: ${balanceError.message}`);

    const balance = balanceData as any;
    if (balance.available_credits < amountCredits) {
      throw new Error("Insufficient available credits");
    }

    await logger.info("apply_subscription_balance_validated", {
      user_id: user.id,
      available_credits: balance.available_credits,
      amount_credits: amountCredits,
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please subscribe first.");
    }

    const customerId = customers.data[0].id;
    await logger.info("apply_subscription_customer_resolved", {
      user_id: user.id,
      customer_id: customerId,
    });

    const creditAmountPence = Math.round((amountCredits / CREDITS_PER_GBP) * 100);

    const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
      amount: -creditAmountPence,
      currency: "gbp",
      description: `Applied ${amountCredits.toLocaleString()} PLGD Credits to account`,
      metadata: {
        user_id: user.id,
        credits_applied: amountCredits.toString(),
        source: "wallet_credits",
      },
    });

    await logger.info("apply_subscription_stripe_balance_transaction", {
      user_id: user.id,
      customer_id: customerId,
      balance_transaction_id: balanceTransaction.id,
      amount_minor: creditAmountPence,
    });

    const complianceMeta = {
      event: "apply_credits_to_subscription",
      actor_user_id: user.id,
      occurred_at: new Date().toISOString(),
      amount_credits: amountCredits,
      balance_before: balance.balance_credits,
      available_before: balance.available_credits,
      available_after: balance.available_credits - amountCredits,
    } as Record<string, unknown>;

    const { error: ledgerError } = await supabaseClient
      .from("wallet_ledger")
      .insert({
        user_id: user.id,
        kind: "convert_sub_applied",
        amount_credits: -amountCredits,
        ref_type: "subscription",
        ref_id: balanceTransaction.id,
        meta: {
          stripe_customer_id: customerId,
          credit_amount_pence: creditAmountPence,
          balance_transaction_id: balanceTransaction.id,
          compliance: complianceMeta,
        },
      });

    if (ledgerError) {
      const normalized = normalizeLedgerError(ledgerError.message, complianceMeta);
      await logger.warn("apply_subscription_ledger_blocked", {
        user_id: user.id,
        ...normalized.logMeta,
      });
      return new Response(JSON.stringify({ ...normalized.body, correlationId: requestCorrelationId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: normalized.status,
      });
    }

    await logger.info("apply_subscription_success", {
      user_id: user.id,
      amount_credits: amountCredits,
      credit_amount_pence: creditAmountPence,
    });

    return new Response(JSON.stringify({
      success: true,
      credit_amount_gbp: (creditAmountPence / 100).toFixed(2),
      balance_transaction_id: balanceTransaction.id,
      correlationId: requestCorrelationId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger.error("apply_subscription_failed", error, {
      user_id: userId,
      amount_credits: amountCredits,
    });

    return new Response(JSON.stringify({ error: errorMessage, code: "UNEXPECTED_ERROR", correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
