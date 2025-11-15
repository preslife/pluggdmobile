import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";
import { recordWalletTransaction } from "../_shared/walletTransactions.ts";

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
        error: "Cash-out is blocked because the wallet balance would drop below zero.",
        code: "WALLET_BALANCE_NEGATIVE",
        compliance_block: true,
      },
      logMeta: { reason: "balance_negative", message, ...complianceMeta },
    };
  }

  return {
    status: 500,
    body: {
      error: "Unable to record cash-out request.",
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
    component: "cash_out_credits",
    feature: "wallet",
    correlationId: requestCorrelationId,
    message: "Wallet cash-out request",
  });

  let userId: string | null = null;

  try {
    await logger.info("cash_out_request_received", {
      amount_credits: amountCredits,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    userId = user.id;

    await logger.info("cash_out_user_authenticated", {
      user_id: user.id,
    });

    if (!amountCredits || amountCredits < 1000) {
      throw new Error("Minimum cash-out is 1,000 credits (£10)");
    }

    const { data: balanceData, error: balanceError } = await supabaseClient.rpc("get_wallet_balance", {
      p_user_id: user.id,
    });
    if (balanceError) throw new Error(`Balance check failed: ${balanceError.message}`);

    const balance = balanceData as any;
    if (balance.available_credits < amountCredits) {
      throw new Error("Insufficient available credits");
    }

    await logger.info("cash_out_balance_validated", {
      user_id: user.id,
      available_credits: balance.available_credits,
      amount_credits: amountCredits,
    });

    const { data: stripeAccount, error: stripeError } = await supabaseClient
      .from("producer_stripe_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (stripeError || !stripeAccount) {
      throw new Error("Stripe Connect account not found. Please set up your payout account first.");
    }

    if (!stripeAccount.onboarding_complete || !stripeAccount.payouts_enabled) {
      throw new Error("Stripe Connect account not fully set up for payouts");
    }

    const { data: tierData, error: tierError } = await supabaseClient.rpc("get_user_tier_limits", {
      user_id: user.id,
    });
    if (tierError) throw new Error(`Tier check failed: ${tierError.message}`);

    const commissionRate = (tierData as any)?.commission_rate || 15.0;

    const grossAmountPence = Math.round((amountCredits / CREDITS_PER_GBP) * 100);
    const commissionAmountPence = Math.round(grossAmountPence * (commissionRate / 100));
    const netAmountPence = grossAmountPence - commissionAmountPence;

    await logger.info("cash_out_amounts_calculated", {
      user_id: user.id,
      amount_credits: amountCredits,
      gross_amount_pence: grossAmountPence,
      commission_amount_pence: commissionAmountPence,
      net_amount_pence: netAmountPence,
      commission_rate: commissionRate,
    });

    const complianceMeta = {
      event: "cash_out_request",
      actor_user_id: user.id,
      occurred_at: new Date().toISOString(),
      amount_credits: amountCredits,
      gross_amount_pence: grossAmountPence,
      commission_amount_pence: commissionAmountPence,
      net_amount_pence: netAmountPence,
      available_before: balance.available_credits,
      available_after: balance.available_credits - amountCredits,
    } as Record<string, unknown>;

    try {
      await recordWalletTransaction(
        supabaseClient,
        {
          userId: user.id,
          amountCredits: -amountCredits,
          kind: "convert_cashout",
          refType: "cashout",
          meta: {
            gross_amount_pence: grossAmountPence,
            commission_amount_pence: commissionAmountPence,
            net_amount_pence: netAmountPence,
            commission_rate: commissionRate,
            compliance: complianceMeta,
          },
        },
        { logger, correlationId: requestCorrelationId },
      );
    } catch (ledgerError: any) {
      const normalized = normalizeLedgerError(
        typeof ledgerError?.message === "string" ? ledgerError.message : null,
        complianceMeta,
      );
      await logger.warn("cash_out_ledger_blocked", {
        user_id: user.id,
        ...normalized.logMeta,
      });
      return new Response(JSON.stringify({ ...normalized.body, correlationId: requestCorrelationId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: normalized.status,
      });
    }

    const { error: payoutError } = await supabaseClient
      .from("producer_payouts")
      .insert({
        producer_id: user.id,
        amount_pence: netAmountPence,
        commission_pence: commissionAmountPence,
        status: "pending",
        payout_type: "wallet_cashout",
        from_credits: true,
        created_at: new Date().toISOString(),
      });

    if (payoutError) throw new Error(`Payout record creation failed: ${payoutError.message}`);

    await logger.info("cash_out_request_created", {
      user_id: user.id,
      net_amount_pence: netAmountPence,
    });

    return new Response(JSON.stringify({
      success: true,
      net_amount_gbp: (netAmountPence / 100).toFixed(2),
      correlationId: requestCorrelationId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger.error("cash_out_failed", error, {
      user_id: userId,
      amount_credits: amountCredits,
    });

    return new Response(JSON.stringify({ error: errorMessage, code: "UNEXPECTED_ERROR", correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
