import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GiftRecord {
  id: string;
  release_id: string;
  purchase_id: string | null;
  purchaser_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  gift_message: string | null;
  deliver_at: string | null;
  status: string;
  claim_token: string;
  claimed_at: string | null;
  claimed_by: string | null;
  delivered_at: string | null;
  releases?: {
    title: string | null;
    artist: string | null;
    cover_art_url: string | null;
    download_url: string | null;
  } | null;
  purchase?: {
    id: string;
    status: string;
  } | null;
}

interface ProfileRecord {
  full_name: string | null;
  username: string | null;
}

interface StorageLocation {
  bucket: string;
  path: string;
}

const siteUrl = Deno.env.get("SITE_URL") ?? "https://pluggd.fm";
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromAddress = Deno.env.get("RESEND_DEFAULT_FROM") ?? "Pluggd Gifts <hello@pluggd.fm>";
const cronSecret = Deno.env.get("GIFT_QUEUE_CRON_SECRET");

if (!resendApiKey) {
  console.error("[process-gift-queue] RESEND_API_KEY is not set. Gift emails cannot be sent.");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function parseStorageLocation(url: string | null): StorageLocation | null {
  if (!url) return null;

  try {
    if (url.startsWith("http")) {
      const parsed = new URL(url);
      const segments = parsed.pathname.split("/").filter(Boolean);
      const objectIndex = segments.findIndex((segment) => segment === "object");
      if (objectIndex >= 0 && segments.length > objectIndex + 2) {
        const bucket = segments[objectIndex + 2];
        const pathSegments = segments.slice(objectIndex + 3);
        const path = pathSegments.join("/");
        return { bucket, path };
      }
    }

    const trimmed = url.replace(/^\/+/, "");
    const [bucket, ...rest] = trimmed.split("/");
    if (!bucket || rest.length === 0) return null;
    return { bucket, path: rest.join("/") };
  } catch (error) {
    console.error("[process-gift-queue] Failed to parse storage location", error, url);
    return null;
  }
}

function buildGiftEmail({
  recipientName,
  purchaserName,
  releaseTitle,
  releaseArtist,
  downloadLink,
  claimLink,
  giftMessage,
}: {
  recipientName?: string | null;
  purchaserName?: string | null;
  releaseTitle?: string | null;
  releaseArtist?: string | null;
  downloadLink: string;
  claimLink: string;
  giftMessage?: string | null;
}) {
  const safeRecipient = recipientName?.trim() || "there";
  const safePurchaser = purchaserName?.trim() || "A supporter";
  const safeRelease = releaseTitle?.trim() || "a release";
  const artistLine = releaseArtist ? ` by ${releaseArtist}` : "";

  const messageBlock = giftMessage
    ? `<blockquote style="border-left: 2px solid #8b5cf6; margin: 16px 0; padding: 12px 16px; font-style: italic; color: #4b5563;">${giftMessage}</blockquote>`
    : "";

  return {
    subject: `${safePurchaser} sent you ${safeRelease} on Pluggd`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #8b5cf6;">You got a gift! 🎁</h1>
        <p style="font-size: 16px;">Hi ${safeRecipient},</p>
        <p style="font-size: 16px; line-height: 1.5;">
          ${safePurchaser} just sent you <strong>${safeRelease}${artistLine}</strong> on Pluggd.
        </p>
        ${messageBlock}
        <p style="margin: 24px 0;">
          <a
            href="${downloadLink}"
            style="display: inline-block; padding: 14px 28px; background-color: #8b5cf6; color: #ffffff; border-radius: 9999px; text-decoration: none; font-weight: 600;"
          >
            Download your gift
          </a>
        </p>
        <p style="margin: 16px 0;">
          <a
            href="${claimLink}"
            style="display: inline-block; padding: 12px 24px; background-color: #1f2937; color: #ffffff; border-radius: 9999px; text-decoration: none; font-weight: 600;"
          >
            Add to your Pluggd library
          </a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Keep this email safe — the download link stays active for 7 days. Sign in or create a Pluggd account with this email to unlock your library and streams at any time.
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Need an account? <a href="${siteUrl}/signup" style="color: #8b5cf6;">Sign up here</a> with the same email address and your gift will appear in your library after you claim it.
        </p>
        <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
          — Team Pluggd
        </p>
      </div>
    `,
  };
}

async function sendGiftEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  gift: GiftRecord,
  downloadLink: string,
  claimLink: string,
): Promise<void> {
  if (!resend) {
    throw new Error("Email service not configured");
  }

  let purchaser: ProfileRecord | null = null;
  if (gift.purchaser_id) {
    const { data } = await supabaseAdmin
      .from<ProfileRecord>("profiles")
      .select("full_name, username")
      .eq("user_id", gift.purchaser_id)
      .maybeSingle();
    purchaser = data ?? null;
  }

  const email = buildGiftEmail({
    recipientName: gift.recipient_name,
    purchaserName: purchaser?.full_name ?? purchaser?.username ?? null,
    releaseTitle: gift.releases?.title,
    releaseArtist: gift.releases?.artist,
    downloadLink,
    claimLink,
    giftMessage: gift.gift_message,
  });

  await resend.emails.send({
    from: fromAddress,
    to: gift.recipient_email,
    subject: email.subject,
    html: email.html,
  });
}

async function processGift(
  supabaseAdmin: ReturnType<typeof createClient>,
  gift: GiftRecord,
  nowIso: string,
): Promise<void> {
  if (!gift.recipient_email) {
    throw new Error("Gift missing recipient email");
  }
  if (!gift.releases?.download_url) {
    throw new Error("Release missing downloadable asset");
  }

  const storageLocation = parseStorageLocation(gift.releases.download_url);
  let downloadLink = gift.releases.download_url;

  if (storageLocation) {
    const { data, error } = await supabaseAdmin.storage
      .from(storageLocation.bucket)
      .createSignedUrl(storageLocation.path, 60 * 60 * 24 * 7); // 7 days

    if (error) {
      console.warn("[process-gift-queue] Failed to create signed URL, falling back to original URL", error);
    } else if (data?.signedUrl) {
      downloadLink = data.signedUrl;
    }
  }

  const normalizedSiteUrl = siteUrl.replace(/\/$/, "");
  const claimLink = `${normalizedSiteUrl}/gift/claim?token=${encodeURIComponent(gift.claim_token)}`;

  await sendGiftEmail(supabaseAdmin, gift, downloadLink, claimLink);

  await supabaseAdmin
    .from("release_gift_queue")
    .update({
      status: "delivered",
      delivered_at: nowIso,
    })
    .eq("id", gift.id);

  await supabaseAdmin.from("system_logs").insert({
    level: 2,
    message: "Release gift delivered",
    component: "releases.gifting",
    action: "gift_delivered",
    metadata: {
      gift_id: gift.id,
      release_id: gift.release_id,
      purchase_id: gift.purchase_id,
      recipient_email: gift.recipient_email,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (cronSecret) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (token !== cronSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const nowIso = new Date().toISOString();

    const { data: gifts, error } = await supabaseAdmin
      .from<GiftRecord>("release_gift_queue")
      .select(`
        id,
        release_id,
        purchase_id,
        purchaser_id,
        recipient_email,
        recipient_name,
        gift_message,
        deliver_at,
        status,
        claim_token,
        claimed_at,
        claimed_by,
        delivered_at,
        releases:release_id (
          title,
          artist,
          cover_art_url,
          download_url
        ),
        purchase:purchase_id (
          id,
          status
        )
      `)
      .in("status", ["pending", "scheduled"])
      .lte("deliver_at", nowIso)
      .limit(50);

    if (error) {
      console.error("[process-gift-queue] Unable to load gifts", error);
      return new Response(
        JSON.stringify({ error: "Failed to load gift queue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!gifts || gifts.length === 0) {
      return new Response(
        JSON.stringify({ delivered: 0, failed: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let delivered = 0;
    let failed = 0;

    for (const gift of gifts) {
      try {
        if (gift.claimed_at) {
          continue;
        }
        if (gift.purchase && gift.purchase.status && gift.purchase.status !== "completed") {
          console.warn("[process-gift-queue] Purchase not settled yet, skipping", gift.id);
          continue;
        }

        await processGift(supabaseAdmin, gift, nowIso);
        delivered += 1;
      } catch (error) {
        failed += 1;
        console.error("[process-gift-queue] Failed to process gift", gift.id, error);
        await supabaseAdmin
          .from("release_gift_queue")
          .update({ status: "failed" })
          .eq("id", gift.id);
        await supabaseAdmin.from("system_logs").insert({
          level: 3,
          message: "Release gift delivery failed",
          component: "releases.gifting",
          action: "gift_failed",
          metadata: {
            gift_id: gift.id,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        delivered,
        failed,
        total: gifts.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[process-gift-queue] Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
