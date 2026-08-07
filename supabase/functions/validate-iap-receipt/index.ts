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
import { verifyAppleTransaction } from "../_shared/appleSignedData.ts";
import {
  APPLE_CREDIT_PACKS,
  type AppleCreditPack,
} from "../_shared/appleCreditPacks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type MembershipProductRecord = {
  id: string;
  creator_id: string;
  membership_tier_id: string;
  product_id: string;
  legacy_product_id?: string | null;
  price_point_cents: number;
  currency: string;
  billing_period: "monthly" | "yearly";
  status: string;
  membership_tiers?: { name?: string | null } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────

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
  revocationDate?: number;
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
    .eq("idempotency_key", `apple-iap:${transactionId}`)
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
  pack: AppleCreditPack,
) {
  const balanceBefore = await getWalletBalance(supabaseClient, userId);
  const balanceAfterCredits =
    balanceBefore.available_credits + pack.totalCredits;

  const basePayload = {
    user_id: userId,
    amount_credits: pack.totalCredits,
    kind: "topup_iap",
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
    idempotency_key: `apple-iap:${transactionId}`,
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

async function resolveMembershipProduct(
  supabaseClient: SupabaseServiceClient,
  userId: string,
  productId: string,
  originalTransactionId: string,
): Promise<MembershipProductRecord | null> {
  const { data: activeProduct, error: productError } = await supabaseClient
    .from("membership_iap_products")
    .select(
      "id,creator_id,membership_tier_id,product_id,legacy_product_id,price_point_cents,currency,billing_period,status,membership_tiers(name)",
    )
    .eq("product_id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (productError) {
    throw new Error(`Membership catalogue lookup failed: ${productError.message}`);
  }
  if (activeProduct) return activeProduct as MembershipProductRecord;

  // Shared legacy SKUs are intentionally never used to create a new membership:
  // they can only reconcile an already mapped subscription for this account.
  const { data: legacySubscription, error: legacyError } = await supabaseClient
    .from("fan_subscriptions")
    .select("creator_id,tier_id,price_cents,currency,metadata")
    .eq("fan_id", userId)
    .eq("metadata->>apple_original_transaction_id", originalTransactionId)
    .eq("metadata->>apple_sku", productId)
    .maybeSingle();

  if (legacyError) {
    throw new Error(`Legacy membership lookup failed: ${legacyError.message}`);
  }
  if (!legacySubscription?.tier_id || !legacySubscription.creator_id) {
    return null;
  }

  const { data: tier } = await supabaseClient
    .from("membership_tiers")
    .select("name")
    .eq("id", legacySubscription.tier_id)
    .maybeSingle();

  return {
    id: `legacy:${originalTransactionId}`,
    creator_id: legacySubscription.creator_id,
    membership_tier_id: legacySubscription.tier_id,
    product_id: productId,
    legacy_product_id: productId,
    price_point_cents: Number(legacySubscription.price_cents ?? 0),
    currency: String(legacySubscription.currency ?? "USD").toUpperCase(),
    billing_period: "monthly",
    status: "legacy_mapped",
    membership_tiers: tier ?? null,
  };
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
    } = await req.json();

    if (!product_id || !transaction_id) {
      throw new Error("Missing product_id or transaction_id");
    }

    if (platform !== "ios") {
      throw new Error("Only iOS receipts are supported");
    }

    if (typeof receipt_data !== "string" || receipt_data.split(".").length !== 3) {
      throw new Error("A StoreKit 2 signed transaction is required");
    }

    // Verify the JWS certificate chain, signature, bundle ID and App Apple ID
    // before trusting any client-supplied transaction fields.
    const verified = await verifyAppleTransaction(receipt_data);
    const decodedTx = verified.payload as TransactionInfo;
    if (
      decodedTx.productId !== product_id ||
      decodedTx.transactionId !== transaction_id
    ) {
      throw new Error("Signed transaction does not match the requested product or transaction");
    }
    if (!decodedTx.appAccountToken || decodedTx.appAccountToken !== user.id) {
      throw new Error("Signed transaction is not assigned to this PLUGGD account");
    }
    if (decodedTx.revocationDate) {
      throw new Error("This transaction has been revoked");
    }

    const creditPack = APPLE_CREDIT_PACKS[product_id] ?? null;
    const membershipProduct = creditPack
      ? null
      : await resolveMembershipProduct(
        supabaseClient,
        user.id,
        product_id,
        decodedTx.originalTransactionId ?? transaction_id,
      );
    const inferredType = creditPack
      ? "credits"
      : membershipProduct
      ? "subscription"
      : null;

    if (!inferredType) {
      throw new Error(`Product is not provisioned for this account: ${product_id}`);
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
          environment: decodedTx.environment ?? verified.verifiedEnvironment,
          purchase_date: decodedTx.purchaseDate
            ? new Date(decodedTx.purchaseDate).toISOString()
            : new Date().toISOString(),
          expires_date: decodedTx.expiresDate
            ? new Date(decodedTx.expiresDate).toISOString()
            : null,
          status: "validated",
          raw_receipt: null,
          idempotency_key: `apple-iap:${transaction_id}`,
        });

      if (txError) {
        throw new Error(`Failed to record verified Apple transaction: ${txError.message}`);
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
    if (inferredType === "subscription" && membershipProduct) {
      const tierName = membershipProduct.membership_tiers?.name ??
        "Creator membership";
      const expiresDate = decodedTx.expiresDate
        ? new Date(decodedTx.expiresDate).toISOString()
        : null;
      const metadata = {
        apple_sku: product_id,
        apple_catalog_id: membershipProduct.id,
        apple_transaction_id: transaction_id,
        apple_original_transaction_id:
          decodedTx.originalTransactionId ?? transaction_id,
        tier_name: tierName,
        billing_period: membershipProduct.billing_period,
        platform: "ios",
        legacy_mapped: membershipProduct.status === "legacy_mapped",
      };

      const { data: subscription, error: subscriptionError } =
        await supabaseClient
          .from("fan_subscriptions")
          .upsert({
            fan_id: user.id,
            creator_id: membershipProduct.creator_id,
            tier_id: membershipProduct.membership_tier_id,
            apple_sku: product_id,
            price_cents: membershipProduct.price_point_cents,
            currency: membershipProduct.currency,
            status: "active",
            last_payment_at: new Date().toISOString(),
            current_period_end: expiresDate,
            updated_at: new Date().toISOString(),
            metadata,
          }, { onConflict: "fan_id,creator_id" })
          .select("id")
          .single();

      if (subscriptionError || !subscription) {
        throw new Error(
          `Failed to activate verified membership: ${
            subscriptionError?.message ?? "missing subscription record"
          }`,
        );
      }

      console.log(
        `[validate-iap] Activated subscription ${subscription.id} for ${user.id}`,
      );

      if (!alreadyLoggedTransaction) {
        try {
          await supabaseClient.functions.invoke("broadcast-notification", {
            body: {
              recipients: [membershipProduct.creator_id],
              type: "membership",
              title: "New member!",
              message: `Someone just subscribed to your ${tierName} tier.`,
              payload: {
                subscription_id: subscription.id,
                fan_id: user.id,
                tier: tierName,
              },
              relatedId: subscription.id,
              relatedType: "fan_subscription",
            },
          });
        } catch (notifyErr) {
          console.warn("[validate-iap] Creator notification failed:", notifyErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          duplicate: alreadyLoggedTransaction,
          type: "subscription",
          tier: tierName,
          subscription_id: subscription.id,
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
