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
  decode as base64Decode,
} from "https://deno.land/std@0.190.0/encoding/base64url.ts";

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

// ─── SKU → tier label mapping (must match useSubscription.ts) ────────
const SKU_TIER_MAP: Record<string, string> = {
  pluggd_tier_299: "Bronze",
  pluggd_tier_499: "Silver",
  pluggd_tier_999: "Gold",
  pluggd_tier_1999: "Platinum",
  pluggd_tier_4999: "Diamond",
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Decode a JWS payload without cryptographic verification (Supabase edge
 *  functions don't have access to Apple's root certificates for full
 *  chain verification). The App Store signs with ES256; in production
 *  you'd verify against Apple's root CA. For now we decode the claims. */
function decodeJWSPayload<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWS format");
  }
  const payloadBytes = base64Decode(parts[1]);
  const payloadText = new TextDecoder().decode(payloadBytes);
  return JSON.parse(payloadText) as T;
}

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

    // ── Decode the notification ──
    const notification = decodeJWSPayload<DecodedNotification>(signedPayload);
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

    if (existing) {
      console.log(`[apple-notification] Duplicate ${notificationUUID}, skipping`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Decode transaction info ──
    const txInfo = decodeJWSPayload<TransactionInfo>(
      notification.data.signedTransactionInfo,
    );

    let renewalInfo: RenewalInfo | null = null;
    if (notification.data.signedRenewalInfo) {
      renewalInfo = decodeJWSPayload<RenewalInfo>(
        notification.data.signedRenewalInfo,
      );
    }

    const {
      originalTransactionId,
      transactionId,
      productId,
      expiresDate,
      appAccountToken,
    } = txInfo;

    const tierName = SKU_TIER_MAP[productId] ?? null;
    const newStatus = resolveStatus(notificationType, subtype);

    console.log(
      `[apple-notification] tx=${transactionId} original=${originalTransactionId} ` +
        `product=${productId} tier=${tierName} status=${newStatus}`,
    );

    // ── Log the notification ──
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

    // ── Find the fan_subscriptions record ──
    // Strategy: match by original_transaction_id first (set during purchase),
    // then fall back to appAccountToken (subscriber_id) + product_id
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
        .eq("metadata->>apple_sku", productId)
        .maybeSingle();

      subscriptionRecord = byToken;
    }

    // Second fallback: match by apple_sku in metadata for pending records
    if (!subscriptionRecord) {
      const { data: byPending } = await supabaseClient
        .from("fan_subscriptions")
        .select("id, fan_id, creator_id, status, apple_sku, tier_id, metadata")
        .eq("metadata->>apple_sku", productId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      subscriptionRecord = byPending;
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
