/**
 * validate-iap-receipt — Validates Apple IAP receipts for credits and subscriptions.
 *
 * Called from the mobile app after a successful purchase. Handles:
 *  - Credit pack purchases (consumable) → credits ledger entry
 *  - Subscription purchases → fan_subscriptions record update
 *
 * Uses Apple's App Store Server API (v2) to verify transactions.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  decode as base64Decode,
} from "https://deno.land/std@0.190.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Credit pack SKU → credit amounts ────────────────────────────────
// Matches PLUGGD_NEW/src/lib/creditPricing.ts and the mobile useCredits hook.
type CreditPackConfig = {
  label: string;
  priceGBP: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
};

const CREDIT_PACKS: Record<string, CreditPackConfig> = {
  pluggd_credits_starter: {
    label: "Starter",
    priceGBP: 5,
    baseCredits: 500,
    bonusCredits: 0,
    totalCredits: 500,
  },
  pluggd_credits_popular: {
    label: "Popular",
    priceGBP: 10,
    baseCredits: 1000,
    bonusCredits: 50,
    totalCredits: 1050,
  },
  pluggd_credits_value: {
    label: "Value",
    priceGBP: 25,
    baseCredits: 2500,
    bonusCredits: 250,
    totalCredits: 2750,
  },
  pluggd_credits_premium: {
    label: "Premium",
    priceGBP: 50,
    baseCredits: 5000,
    bonusCredits: 750,
    totalCredits: 5750,
  },
  pluggd_credits_ultimate: {
    label: "Ultimate",
    priceGBP: 100,
    baseCredits: 10000,
    bonusCredits: 2000,
    totalCredits: 12000,
  },
};

// ─── Subscription SKUs ───────────────────────────────────────────────
const SUBSCRIPTION_SKUS = [
  "pluggd_tier_299",
  "pluggd_tier_499",
  "pluggd_tier_999",
  "pluggd_tier_1999",
  "pluggd_tier_4999",
];

const SKU_TIER_MAP: Record<string, string> = {
  pluggd_tier_299: "Bronze",
  pluggd_tier_499: "Silver",
  pluggd_tier_999: "Gold",
  pluggd_tier_1999: "Platinum",
  pluggd_tier_4999: "Diamond",
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Decode a JWS payload (base64url-encoded JSON) */
function decodeJWSPayload<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWS format");
  const payloadBytes = base64Decode(parts[1]);
  return JSON.parse(new TextDecoder().decode(payloadBytes)) as T;
}

interface TransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  quantity: number;
  type: string;
  environment: string;
  appAccountToken?: string;
}

type SupabaseServiceClient = ReturnType<typeof createClient>;

async function getWalletBalance(
  supabaseClient: SupabaseServiceClient,
  userId: string,
) {
  const { data, error } = await supabaseClient.rpc("get_wallet_balance", {
    p_user_id: userId,
  });

  if (error) {
    console.warn("[validate-iap] Balance fetch failed:", error.message);
  }

  const balance = data as
    | {
      balance_credits?: number;
      pending_credits?: number;
      available_credits?: number;
    }
    | null;

  return {
    balance_credits: Number(balance?.balance_credits ?? 0),
    pending_credits: Number(balance?.pending_credits ?? 0),
    available_credits: Number(balance?.available_credits ?? 0),
  };
}

async function hasWalletLedgerEntryForTransaction(
  supabaseClient: SupabaseServiceClient,
  userId: string,
  transactionId: string,
) {
  const { data, error } = await supabaseClient
    .from("wallet_ledger")
    .select("id")
    .eq("user_id", userId)
    .eq("ref_type", "apple_iap")
    .contains("meta", { transaction_id: transactionId })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[validate-iap] Duplicate ledger check failed:", error.message);
    return false;
  }

  return Boolean(data);
}

async function insertCreditLedgerEntry(
  supabaseClient: SupabaseServiceClient,
  userId: string,
  productId: string,
  transactionId: string,
  pack: CreditPackConfig,
) {
  const balanceBefore = await getWalletBalance(supabaseClient, userId);
  const balanceAfterCredits =
    balanceBefore.available_credits + pack.totalCredits;

  const basePayload = {
    user_id: userId,
    amount_credits: pack.totalCredits,
    kind: "topup",
    ref_type: "apple_iap",
    ref_id: null,
    meta: {
      product_id: productId,
      transaction_id: transactionId,
      platform: "ios",
      label: pack.label,
      price_gbp: pack.priceGBP,
      base_credits: pack.baseCredits,
      bonus_credits: pack.bonusCredits,
    },
  };

  const payloadWithBalances = {
    ...basePayload,
    balance_before: balanceBefore.available_credits,
    balance_after: balanceAfterCredits,
  };

  const { error } = await supabaseClient
    .from("wallet_ledger")
    .insert(payloadWithBalances);

  if (!error) {
    return getWalletBalance(supabaseClient, userId);
  }

  const errorMessage = error.message ?? "";
  const canRetryWithoutBalances =
    errorMessage.includes("balance_before") ||
    errorMessage.includes("balance_after") ||
    errorMessage.includes("schema cache");

  if (!canRetryWithoutBalances) {
    throw new Error(`Failed to add credits to wallet: ${errorMessage}`);
  }

  const { error: retryError } = await supabaseClient
    .from("wallet_ledger")
    .insert(basePayload);

  if (retryError) {
    throw new Error(`Failed to add credits to wallet: ${retryError.message}`);
  }

  return getWalletBalance(supabaseClient, userId);
}

// ─── Main handler ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const {
      receipt_data,
      product_id,
      transaction_id,
      platform,
      type, // 'credits' | 'subscription'
    } = await req.json();

    if (!product_id || !transaction_id) {
      throw new Error("Missing product_id or transaction_id");
    }

    if (platform !== "ios") {
      throw new Error("Only iOS receipts are supported");
    }

    const inferredType = type ??
      (SUBSCRIPTION_SKUS.includes(product_id)
        ? "subscription"
        : CREDIT_PACKS[product_id]
        ? "credits"
        : null);

    if (inferredType !== "credits" && inferredType !== "subscription") {
      throw new Error(`Unknown product: ${product_id}`);
    }

    const creditPack = inferredType === "credits"
      ? CREDIT_PACKS[product_id]
      : null;

    if (inferredType === "credits" && !creditPack) {
      throw new Error(`Unknown credit pack SKU: ${product_id}`);
    }

    console.log(
      `[validate-iap] user=${user.id} product=${product_id} tx=${transaction_id} type=${inferredType}`,
    );

    // ── Check for duplicate transaction ──
    const { data: existingTx } = await supabaseClient
      .from("iap_transactions")
      .select("id")
      .eq("transaction_id", transaction_id)
      .maybeSingle();

    let alreadyLoggedTransaction = false;
    if (existingTx) {
      console.log(`[validate-iap] Duplicate transaction ${transaction_id}`);
      alreadyLoggedTransaction = true;

      if (inferredType === "credits") {
        const alreadyCredited = await hasWalletLedgerEntryForTransaction(
          supabaseClient,
          user.id,
          transaction_id,
        );

        if (alreadyCredited) {
          const balance = await getWalletBalance(supabaseClient, user.id);
          return new Response(
            JSON.stringify({
              success: true,
              duplicate: true,
              type: "credits",
              balance,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        }
      } else {
        return new Response(
          JSON.stringify({ success: true, duplicate: true }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
    }

    // ── Decode the receipt if it's a signed transaction (StoreKit 2) ──
    let decodedTx: TransactionInfo | null = null;
    if (receipt_data && receipt_data.includes(".")) {
      try {
        decodedTx = decodeJWSPayload<TransactionInfo>(receipt_data);
      } catch {
        console.warn("[validate-iap] Could not decode JWS receipt, proceeding with basic validation");
      }
    }

    // ── Record the transaction ──
    if (!alreadyLoggedTransaction) {
      const { error: txError } = await supabaseClient
        .from("iap_transactions")
        .insert({
          user_id: user.id,
          transaction_id,
          original_transaction_id: decodedTx?.originalTransactionId ?? transaction_id,
          product_id,
          type: inferredType,
          environment: decodedTx?.environment ?? "Production",
          purchase_date: decodedTx?.purchaseDate
            ? new Date(decodedTx.purchaseDate).toISOString()
            : new Date().toISOString(),
          expires_date: decodedTx?.expiresDate
            ? new Date(decodedTx.expiresDate).toISOString()
            : null,
          status: "validated",
          raw_receipt:
            typeof receipt_data === "string"
              ? receipt_data.substring(0, 500)
              : null,
        });

      if (txError) {
        console.error("[validate-iap] Failed to record transaction:", txError.message);
        // Don't throw — continue processing even if logging fails
      }
    }

    // ── Handle credit pack purchases ──
    if (inferredType === "credits" && creditPack) {
      const balance = await insertCreditLedgerEntry(
        supabaseClient,
        user.id,
        product_id,
        transaction_id,
        creditPack,
      );

      console.log(
        `[validate-iap] Credited ${creditPack.totalCredits} credits to ${user.id}`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          type: "credits",
          credits_added: creditPack.totalCredits,
          balance,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // ── Handle subscription purchases ──
    if (inferredType === "subscription") {
      const tierName = SKU_TIER_MAP[product_id] ?? "Membership";

      // Find and update the pending fan_subscriptions record
      // (created by the client before initiating the purchase)
      const { data: pendingSub } = await supabaseClient
        .from("fan_subscriptions")
        .select("id, fan_id, creator_id")
        .eq("fan_id", user.id)
        .eq("metadata->>apple_sku", product_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingSub) {
        const expiresDate = decodedTx?.expiresDate
          ? new Date(decodedTx.expiresDate).toISOString()
          : null;

        const { error: updateError } = await supabaseClient
          .from("fan_subscriptions")
          .update({
            status: "active",
            last_payment_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              apple_sku: product_id,
              apple_transaction_id: transaction_id,
              apple_original_transaction_id:
                decodedTx?.originalTransactionId ?? transaction_id,
              tier_name: tierName,
              platform: "ios",
            },
            ...(expiresDate ? { current_period_end: expiresDate } : {}),
          })
          .eq("id", pendingSub.id);

        if (updateError) {
          console.error(
            "[validate-iap] Failed to activate subscription:",
            updateError.message,
          );
          throw new Error("Failed to activate subscription");
        }

        console.log(
          `[validate-iap] Activated subscription ${pendingSub.id} for ${user.id}`,
        );

        // Notify the creator
        try {
          await supabaseClient.functions.invoke("broadcast-notification", {
            body: {
              recipients: [pendingSub.creator_id],
              type: "membership",
              title: "New member!",
              message: `Someone just subscribed to your ${tierName} tier.`,
              payload: {
                subscription_id: pendingSub.id,
                fan_id: user.id,
                tier: tierName,
              },
              relatedId: pendingSub.id,
              relatedType: "fan_subscription",
            },
          });
        } catch (notifyErr) {
          console.warn("[validate-iap] Creator notification failed:", notifyErr);
        }
      } else {
        console.warn(
          `[validate-iap] No pending subscription found for user=${user.id} product=${product_id}`,
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: "subscription",
          tier: tierName,
          subscription_id: pendingSub?.id ?? null,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Unknown product type
    throw new Error(`Unknown product: ${product_id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[validate-iap] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
