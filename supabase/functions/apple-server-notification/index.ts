/**
 * apple-server-notification — App Store Server Notifications V2 handler.
 *
 * Apple calls this endpoint when subscription events occur:
 *  - DID_RENEW          → renewal succeeded
 *  - DID_FAIL_TO_RENEW  → billing retry / grace period
 *  - DID_CHANGE_RENEWAL_STATUS → auto-renew toggled
 *  - EXPIRED            → subscription ended
 *  - REFUND             → user got a refund
 *  - SUBSCRIBED         → initial purchase (backup for client receipt validation)
 *  - REVOKE             → family sharing revoked
 *
 * The payload is a JWS (JSON Web Signature) signed by Apple.
 * We decode the payload, extract the transaction info, and update
 * the fan_subscriptions table in Supabase.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  verifyAppleNotification,
  verifyAppleRenewalInfo,
  verifyAppleTransaction,
} from "../_shared/appleSignedData.ts";
import {
  APPLE_CREDIT_PACKS,
  type AppleCreditPack,
} from "../_shared/appleCreditPacks.ts";

// ─── Types ───────────────────────────────────────────────────────────
interface DecodedNotification {
  notificationType: string;
  subtype?: string;
  notificationUUID: string;
  data: {
    appAppleId?: number;
    bundleId: string;
    bundleVersion?: string;
    environment: "Sandbox" | "Production";
    signedTransactionInfo: string;
    signedRenewalInfo?: string;
  };
  version: string;
  signedDate: number;
}

interface TransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  type: string;
  appAccountToken?: string; // UUID we set = subscriber_id
  environment: string;
  storefront?: string;
  revocationDate?: number;
  revocationReason?: number;
}

interface RenewalInfo {
  autoRenewProductId: string;
  autoRenewStatus: number; // 1 = on, 0 = off
  expirationIntent?: number;
  gracePeriodExpiresDate?: number;
  isInBillingRetryPeriod?: boolean;
  originalTransactionId: string;
  renewalDate?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Map Apple notification type + subtype → fan_subscriptions status */
function resolveStatus(
  notificationType: string,
  subtype?: string,
): "active" | "cancelled" | "past_due" | "expired" | null {
  switch (notificationType) {
    case "SUBSCRIBED":
    case "DID_RENEW":
      return "active";

    case "DID_CHANGE_RENEWAL_STATUS":
      // subtype AUTO_RENEW_DISABLED means user turned off auto-renew
      // but they're still active until period ends
      return subtype === "AUTO_RENEW_DISABLED" ? "cancelled" : "active";

    case "DID_FAIL_TO_RENEW":
      return subtype === "GRACE_PERIOD" ? "past_due" : "past_due";

    case "EXPIRED":
    case "REVOKE":
      return "expired";

    case "REFUND":
      return "expired";

    default:
      return null;
  }
}

type SupabaseServiceClient = ReturnType<typeof createClient>;

async function getWalletBalance(
  supabaseClient: SupabaseServiceClient,
  userId: string,
) {
  const { data, error } = await supabaseClient.rpc("get_wallet_balance", {
    p_user_id: userId,
  });
  if (error) throw new Error(`Wallet balance lookup failed: ${error.message}`);
  return data;
}

async function fulfilCreditPack(
  supabaseClient: SupabaseServiceClient,
  txInfo: TransactionInfo,
  pack: AppleCreditPack,
) {
  const userId = txInfo.appAccountToken;
  if (!userId) {
    throw new Error("Verified credit purchase is missing its PLUGGD account token");
  }

  const idempotencyKey = `apple-iap:${txInfo.transactionId}`;
  const { data: existingTransaction, error: existingTransactionError } =
    await supabaseClient
      .from("iap_transactions")
      .select("id,user_id")
      .eq("transaction_id", txInfo.transactionId)
      .maybeSingle();
  if (existingTransactionError) {
    throw new Error(
      `Apple transaction lookup failed: ${existingTransactionError.message}`,
    );
  }
  if (existingTransaction && existingTransaction.user_id !== userId) {
    throw new Error("Verified Apple transaction belongs to a different account");
  }

  if (!existingTransaction) {
    const { error: transactionError } = await supabaseClient
      .from("iap_transactions")
      .insert({
        user_id: userId,
        transaction_id: txInfo.transactionId,
        original_transaction_id:
          txInfo.originalTransactionId ?? txInfo.transactionId,
        product_id: txInfo.productId,
        type: "credits",
        environment: txInfo.environment,
        purchase_date: txInfo.purchaseDate
          ? new Date(txInfo.purchaseDate).toISOString()
          : new Date().toISOString(),
        expires_date: null,
        status: "validated",
        raw_receipt: null,
        idempotency_key: idempotencyKey,
      });
    if (transactionError && transactionError.code !== "23505") {
      throw new Error(
        `Failed to record verified Apple transaction: ${transactionError.message}`,
      );
    }
  }

  const { data: existingLedger, error: existingLedgerError } =
    await supabaseClient
      .from("wallet_ledger")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
  if (existingLedgerError) {
    throw new Error(`Credit ledger lookup failed: ${existingLedgerError.message}`);
  }

  if (!existingLedger) {
    const { error: ledgerError } = await supabaseClient
      .from("wallet_ledger")
      .insert({
        user_id: userId,
        amount_credits: pack.totalCredits,
        kind: "topup_iap",
        ref_type: "apple_iap",
        ref_id: null,
        meta: {
          product_id: txInfo.productId,
          transaction_id: txInfo.transactionId,
          platform: "ios",
          label: pack.label,
          price_gbp: pack.priceGBP,
          base_credits: pack.baseCredits,
          bonus_credits: pack.bonusCredits,
          source: "app_store_server_notification",
        },
        idempotency_key: idempotencyKey,
      });
    if (ledgerError && ledgerError.code !== "23505") {
      throw new Error(`Failed to add verified credits: ${ledgerError.message}`);
    }
  }

  return getWalletBalance(supabaseClient, userId);
}

// ─── Main handler ────────────────────────────────────────────────────
serve(async (req) => {
  // Apple sends POST with JSON body
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json();
    const signedPayload: string = body.signedPayload;

    if (!signedPayload) {
      console.error("[apple-notification] Missing signedPayload");
      return new Response(JSON.stringify({ error: "Missing signedPayload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify the outer notification JWS certificate chain, signature, bundle
    // ID and App Apple ID before processing any notification fields.
    const verifiedNotification = await verifyAppleNotification(signedPayload);
    const notification = verifiedNotification.payload as DecodedNotification;
    const { notificationType, subtype, notificationUUID } = notification;

    console.log(
      `[apple-notification] ${notificationType}${subtype ? ` / ${subtype}` : ""} — ${notificationUUID}`,
    );

    // ── Check for duplicate (idempotency) ──
    const { data: existing } = await supabaseClient
      .from("apple_notification_log")
      .select("id")
      .eq("notification_uuid", notificationUUID)
      .maybeSingle();

    if (existing && notificationType !== "ONE_TIME_CHARGE") {
      console.log(`[apple-notification] Duplicate ${notificationUUID}, skipping`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Apple's TEST notification intentionally contains no transaction or
    // renewal payload. It still passes the same certificate-chain, signature,
    // bundle-ID and App-Apple-ID verification above, so record it as delivery
    // evidence and acknowledge it without weakening the transaction checks
    // required for every commerce notification below.
    if (notificationType === "TEST") {
      const { error: testLogError } = await supabaseClient
        .from("apple_notification_log")
        .insert({
          notification_uuid: notificationUUID,
          notification_type: notificationType,
          subtype: subtype ?? null,
          environment: notification.data?.environment ?? null,
          payload: notification,
          processed_at: new Date().toISOString(),
        });

      if (testLogError) {
        throw new Error(
          `Failed to log verified Apple test notification: ${testLogError.message}`,
        );
      }

      return new Response(JSON.stringify({ received: true, test: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!notification.data?.signedTransactionInfo) {
      throw new Error("Verified notification is missing signed transaction data");
    }

    // The nested transaction is independently signed and must also verify.
    const verifiedTransaction = await verifyAppleTransaction(
      notification.data.signedTransactionInfo,
    );
    const txInfo = verifiedTransaction.payload as TransactionInfo;

    let renewalInfo: RenewalInfo | null = null;
    if (notification.data.signedRenewalInfo) {
      renewalInfo = (
        await verifyAppleRenewalInfo(notification.data.signedRenewalInfo)
      ).payload as RenewalInfo;
    }

    const {
      originalTransactionId,
      transactionId,
      productId,
      expiresDate,
      appAccountToken,
    } = txInfo;

    const newStatus = resolveStatus(notificationType, subtype);

    // ── Log the notification ──
    if (!existing) {
      await supabaseClient.from("apple_notification_log").insert({
        notification_uuid: notificationUUID,
        notification_type: notificationType,
        subtype: subtype ?? null,
        original_transaction_id: originalTransactionId,
        transaction_id: transactionId,
        product_id: productId,
        environment: notification.data.environment,
        app_account_token: appAccountToken ?? null,
        payload: notification,
        processed_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) {
          console.error("[apple-notification] Failed to log notification:", error.message);
        }
      });
    }

    // Consumable credit packs must be fulfilled from Apple's independently
    // signed server notification as a crash-safe backup to the client callback.
    // The transaction and ledger share a unique idempotency key, so Apple
    // retries and client/server races cannot grant the same credits twice.
    if (notificationType === "ONE_TIME_CHARGE") {
      const creditPack = APPLE_CREDIT_PACKS[productId];
      if (!creditPack) {
        console.warn(
          `[apple-notification] Ignoring unprovisioned one-time product ${productId}`,
        );
        return new Response(
          JSON.stringify({ received: true, warning: "Unprovisioned product" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const balance = await fulfilCreditPack(supabaseClient, txInfo, creditPack);
      console.log(
        `[apple-notification] Fulfilled ${creditPack.totalCredits} credits for tx=${transactionId}`,
      );
      return new Response(
        JSON.stringify({
          received: true,
          type: "credits",
          credits_added: creditPack.totalCredits,
          balance,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ── Resolve the verified product and subscription record ──
    const { data: catalogueProduct, error: catalogueError } =
      await supabaseClient
        .from("membership_iap_products")
        .select(
          "id,creator_id,membership_tier_id,product_id,price_point_cents,currency,billing_period,status,membership_tiers(name)",
        )
        .eq("product_id", productId)
        .eq("status", "active")
        .maybeSingle();
    if (catalogueError) {
      throw new Error(`Membership catalogue lookup failed: ${catalogueError.message}`);
    }

    // Strategy: match by original_transaction_id first (set during purchase),
    // then by appAccountToken + product. Shared legacy products are allowed only
    // through an existing mapped subscription and never create new ownership.
    let subscriptionRecord: any = null;

    // Try by apple_original_transaction_id
    const { data: byTxId } = await supabaseClient
      .from("fan_subscriptions")
      .select("id, fan_id, creator_id, status, apple_sku, tier_id, metadata")
      .eq("metadata->>apple_original_transaction_id", originalTransactionId)
      .maybeSingle();

    subscriptionRecord = byTxId;

    // Fallback: match by subscriber_id (appAccountToken) and apple_sku
    if (!subscriptionRecord && appAccountToken) {
      const { data: byToken } = await supabaseClient
        .from("fan_subscriptions")
        .select("id, fan_id, creator_id, status, apple_sku, tier_id, metadata")
        .eq("fan_id", appAccountToken)
        .eq("apple_sku", productId)
        .maybeSingle();

      subscriptionRecord = byToken;
    }

    if (!subscriptionRecord && catalogueProduct && appAccountToken) {
      const tierName = catalogueProduct.membership_tiers?.name ??
        "Creator membership";
      const { data: created, error: createError } = await supabaseClient
        .from("fan_subscriptions")
        .upsert({
          fan_id: appAccountToken,
          creator_id: catalogueProduct.creator_id,
          tier_id: catalogueProduct.membership_tier_id,
          apple_sku: productId,
          price_cents: catalogueProduct.price_point_cents,
          currency: catalogueProduct.currency,
          status: newStatus ?? "active",
          current_period_end: expiresDate
            ? new Date(expiresDate).toISOString()
            : null,
          last_payment_at:
            notificationType === "DID_RENEW" ||
              notificationType === "SUBSCRIBED"
              ? new Date().toISOString()
              : null,
          metadata: {
            apple_catalog_id: catalogueProduct.id,
            apple_original_transaction_id: originalTransactionId,
            apple_transaction_id: transactionId,
            apple_sku: productId,
            tier_name: tierName,
            billing_period: catalogueProduct.billing_period,
            platform: "ios",
          },
        }, { onConflict: "fan_id,creator_id" })
        .select("id, fan_id, creator_id, status, apple_sku, tier_id, metadata")
        .single();
      if (createError) {
        throw new Error(
          `Verified membership reconciliation failed: ${createError.message}`,
        );
      }
      subscriptionRecord = created;
    }

    if (!subscriptionRecord) {
      console.warn(
        `[apple-notification] No fan_subscriptions record found for ` +
          `originalTx=${originalTransactionId} product=${productId} appAccountToken=${appAccountToken}`,
      );

      // Still return 200 so Apple doesn't retry — we logged it
      return new Response(
        JSON.stringify({
          received: true,
          warning: "No matching subscription record found",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const tierName = catalogueProduct?.membership_tiers?.name ??
      subscriptionRecord.metadata?.tier_name ??
      "Creator membership";
    console.log(
      `[apple-notification] tx=${transactionId} original=${originalTransactionId} ` +
        `product=${productId} tier=${tierName} status=${newStatus}`,
    );

    // ── Update the subscription record ──
    if (newStatus) {
      const updatePayload: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(subscriptionRecord.metadata ?? {}),
          apple_original_transaction_id: originalTransactionId,
          apple_transaction_id: transactionId,
          apple_sku: productId,
          last_notification_type: notificationType,
          last_notification_subtype: subtype ?? null,
        },
      };

      // Update expiry date if available
      if (expiresDate) {
        updatePayload.current_period_end = new Date(expiresDate).toISOString();
      }

      // If renewed / subscribed, update last_payment_at
      if (notificationType === "DID_RENEW" || notificationType === "SUBSCRIBED") {
        updatePayload.last_payment_at = new Date().toISOString();
      }

      // If auto-renew info available, store it
      if (renewalInfo) {
        (updatePayload.metadata as Record<string, unknown>).auto_renew_status =
          renewalInfo.autoRenewStatus;
        if (renewalInfo.gracePeriodExpiresDate) {
          (updatePayload.metadata as Record<string, unknown>).grace_period_expires =
            new Date(renewalInfo.gracePeriodExpiresDate).toISOString();
        }
      }

      const { error: updateError } = await supabaseClient
        .from("fan_subscriptions")
        .update(updatePayload)
        .eq("id", subscriptionRecord.id);

      if (updateError) {
        console.error(
          `[apple-notification] Failed to update fan_subscriptions:`,
          updateError.message,
        );
        throw updateError;
      }

      console.log(
        `[apple-notification] Updated subscription ${subscriptionRecord.id} → ${newStatus}`,
      );

      // ── Send in-app notifications ──
      try {
        const fanMessage = (() => {
          switch (notificationType) {
            case "DID_RENEW":
              return "Your membership renewed successfully.";
            case "DID_FAIL_TO_RENEW":
              return "We couldn't renew your membership. Please check your payment method.";
            case "DID_CHANGE_RENEWAL_STATUS":
              return subtype === "AUTO_RENEW_DISABLED"
                ? "Your membership auto-renewal has been turned off."
                : "Your membership auto-renewal has been turned back on.";
            case "EXPIRED":
              return "Your membership has expired.";
            case "REFUND":
              return "Your membership has been refunded.";
            default:
              return "Your membership status has been updated.";
          }
        })();

        await supabaseClient.functions.invoke("broadcast-notification", {
          body: {
            recipients: [subscriptionRecord.fan_id],
            type: "membership",
            title: "Membership update",
            message: fanMessage,
            payload: {
              subscription_id: subscriptionRecord.id,
              creator_id: subscriptionRecord.creator_id,
              status: newStatus,
              notification_type: notificationType,
            },
            relatedId: subscriptionRecord.id,
            relatedType: "fan_subscription",
          },
        });

        // Notify creator for relevant events
        if (
          notificationType === "DID_RENEW" ||
          notificationType === "SUBSCRIBED" ||
          notificationType === "EXPIRED" ||
          notificationType === "REFUND"
        ) {
          const creatorMessage = (() => {
            switch (notificationType) {
              case "DID_RENEW":
                return "A supporter just renewed their membership.";
              case "SUBSCRIBED":
                return "You have a new member!";
              case "EXPIRED":
                return "A membership has expired.";
              case "REFUND":
                return "A membership was refunded.";
              default:
                return "A membership was updated.";
            }
          })();

          await supabaseClient.functions.invoke("broadcast-notification", {
            body: {
              recipients: [subscriptionRecord.creator_id],
              type: "membership",
              title:
                notificationType === "SUBSCRIBED"
                  ? "New member!"
                  : "Membership update",
              message: creatorMessage,
              payload: {
                subscription_id: subscriptionRecord.id,
                fan_id: subscriptionRecord.fan_id,
                status: newStatus,
                notification_type: notificationType,
              },
              relatedId: subscriptionRecord.id,
              relatedType: "fan_subscription",
            },
          });
        }
      } catch (notifyError) {
        const msg = notifyError instanceof Error ? notifyError.message : String(notifyError);
        console.error("[apple-notification] Notification send failed:", msg);
        // Don't throw — we already updated the record
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[apple-notification] Error:", message);
    return new Response(JSON.stringify({ error: "Invalid App Store notification" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
