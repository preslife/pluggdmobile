import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PurchaseType = "release" | "beat" | "sample_pack";

type OwnershipSource = "direct_purchase" | "order" | "membership" | "credits";

interface SupplementalOwnershipParams {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  productId?: string | null;
  purchaseType: PurchaseType;
  creatorId?: string | null;
}

interface SupplementalOwnershipResult {
  authorized: boolean;
  source?: OwnershipSource;
  details?: Record<string, unknown>;
  reason?: string;
}

interface StorageLocation {
  bucket: string;
  path: string;
  fileName?: string;
}

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
        return { bucket, path, fileName: pathSegments[pathSegments.length - 1] };
      }
    }

    const trimmed = url.replace(/^\/+/, "");
    const [bucket, ...rest] = trimmed.split("/");
    if (!bucket || rest.length === 0) return null;
    return { bucket, path: rest.join("/"), fileName: rest[rest.length - 1] };
  } catch (error) {
    console.error("Failed to parse storage location", error, url);
    return null;
  }
}

async function countDownloadEvents(supabaseService: ReturnType<typeof createClient>, purchaseId: string, purchaseType: PurchaseType) {
  const { count } = await supabaseService
    .from("download_events")
    .select("id", { count: "exact", head: true })
    .eq("purchase_id", purchaseId)
    .eq("purchase_type", purchaseType);

  return count ?? 0;
}

async function checkSupplementalOwnership({
  supabase,
  userId,
  productId,
  purchaseType,
  creatorId,
}: SupplementalOwnershipParams): Promise<SupplementalOwnershipResult> {
  if (!productId) {
    return { authorized: false, reason: "missing_product_id" };
  }

  const { data: orderMatch, error: orderError } = await supabase
    .from('orders')
    .select('id, status, paid_at, created_at')
    .eq('user_id', userId)
    .eq('order_items.product_id', productId)
    .in('status', ['completed', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    return { authorized: false, reason: `order_lookup_failed:${orderError.message}` };
  }

  if (orderMatch) {
    return {
      authorized: true,
      source: 'order',
      details: {
        orderId: orderMatch.id,
        status: orderMatch.status,
        paid_at: orderMatch.paid_at,
      },
    };
  }

  if (creatorId) {
    const { data: membershipMatch, error: membershipError } = await supabase
      .from('fan_subscriptions')
      .select('id, status')
      .eq('fan_id', userId)
      .eq('creator_id', creatorId)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return { authorized: false, reason: `membership_lookup_failed:${membershipError.message}` };
    }

    if (membershipMatch) {
      return {
        authorized: true,
        source: 'membership',
        details: {
          subscriptionId: membershipMatch.id,
          status: membershipMatch.status,
        },
      };
    }
  }

  let ledgerMatch: { id: string; kind: string; ref_type: string | null; ref_id: string | null } | null = null;

  const ledgerByRef = await supabase
    .from('wallet_ledger')
    .select('id, kind, ref_type, ref_id, meta')
    .eq('user_id', userId)
    .in('kind', ['spend_purchase', 'spend_tip', 'spend_gift'])
    .eq('ref_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ledgerByRef.error) {
    return { authorized: false, reason: `ledger_lookup_failed:${ledgerByRef.error.message}` };
  }

  ledgerMatch = ledgerByRef.data as typeof ledgerMatch;

  if (!ledgerMatch) {
    const ledgerByMeta = await supabase
      .from('wallet_ledger')
      .select('id, kind, ref_type, ref_id, meta')
      .eq('user_id', userId)
      .in('kind', ['spend_purchase', 'spend_tip', 'spend_gift'])
      .contains('meta', { product_id: productId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ledgerByMeta.error) {
      return { authorized: false, reason: `ledger_lookup_failed:${ledgerByMeta.error.message}` };
    }

    ledgerMatch = ledgerByMeta.data as typeof ledgerMatch;
  }

  if (ledgerMatch) {
    return {
      authorized: true,
      source: 'credits',
      details: {
        ledgerId: ledgerMatch.id,
        kind: ledgerMatch.kind,
        ref_type: ledgerMatch.ref_type,
        ref_id: ledgerMatch.ref_id,
      },
    };
  }

  return { authorized: false, reason: 'no_additional_records' };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let logger: ReturnType<typeof createSystemLogger> | null = null;
  let purchaseId: string | undefined;
  let purchaseType: PurchaseType | undefined;
  try {
    const body = await req.json();
    purchaseId = body?.purchaseId;
    purchaseType = body?.purchaseType;

    const correlationId = generateCorrelationId();

    if (!purchaseId || !purchaseType) {
      return new Response(
        JSON.stringify({ error: "purchaseId and purchaseType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = userData.user;

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    logger = createSystemLogger(supabaseService, {
      component: "download_signed_url",
      feature: "downloads",
      userId: user.id,
      correlationId,
      message: "Download service event",
    });

    await logger.info("download_request_received", {
      purchaseId,
      purchaseType,
    });

    let storage: StorageLocation | null = null;
    let limit = 0;
    let downloadCount = 0;
    let metadata: Record<string, unknown> = { purchaseId, purchaseType };
    let ownershipSource: OwnershipSource = 'direct_purchase';
    let supplementalContext: Record<string, unknown> | null = null;

    switch (purchaseType) {
      case "release": {
        const { data: purchase, error } = await supabaseService
          .from("release_purchases")
          .select(
            `*, releases:release_id (download_limit, download_url, download_expires_days, user_id, perk_access)`,
          )
          .eq("id", purchaseId)
          .maybeSingle();

        if (error || !purchase) {
          return new Response(
            JSON.stringify({ error: "Release purchase not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        metadata = {
          ...metadata,
          releaseId: purchase.release_id,
        };

        if (purchase.status !== 'completed') {
          await logger.error("release_not_settled", new Error('Purchase is not completed'), metadata);
          return new Response(
            JSON.stringify({ error: "Purchase is not completed" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const isDirectOwner = purchase.user_id === user.id || purchase.purchaser_id === user.id;

        if (!isDirectOwner) {
          const fallback = await checkSupplementalOwnership({
            supabase: supabaseService,
            userId: user.id,
            productId: purchase.release_id,
            purchaseType,
            creatorId: purchase.releases?.user_id ?? null,
          });

          if (!fallback.authorized) {
            await logger.error(
              "release_access_denied",
              new Error('User does not own release'),
              { ...metadata, reason: fallback.reason ?? 'unknown' },
            );
            return new Response(
              JSON.stringify({ error: "Access denied" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          ownershipSource = fallback.source ?? 'order';
          supplementalContext = fallback.details ?? null;
        } else {
          ownershipSource = (purchase as { from_credits?: boolean }).from_credits ? 'credits' : 'direct_purchase';
        }

        if (purchase.is_preorder && purchase.available_at) {
          const availableAtDate = new Date(purchase.available_at);
          if (availableAtDate.getTime() > Date.now()) {
            return new Response(
              JSON.stringify({ error: "Release is not available to download yet." }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }

        const release = purchase.releases;
        storage = parseStorageLocation(release?.download_url ?? null);
        limit = release?.download_limit ?? 3;

        downloadCount = Math.max(
          purchase.downloads_used ?? 0,
          await countDownloadEvents(supabaseService, purchaseId, purchaseType),
        );

        if (limit !== null && downloadCount >= limit) {
          await logger.warn("release_limit_reached", {
            ...metadata,
            ownershipSource,
            supplementalContext,
            downloadsUsed: downloadCount,
            limit,
          });
          return new Response(
            JSON.stringify({ error: "Download limit reached" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (purchase.download_expires_at) {
          const expires = new Date(purchase.download_expires_at);
          if (Date.now() > expires.getTime()) {
            await logger.warn("release_expired", {
              ...metadata,
              ownershipSource,
              supplementalContext,
              expiredAt: purchase.download_expires_at,
            });
            return new Response(
              JSON.stringify({ error: "Download window expired" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } else if (release?.download_expires_days && purchase.purchased_at) {
          const expires = new Date(purchase.purchased_at);
          expires.setDate(expires.getDate() + release.download_expires_days);
          if (Date.now() > expires.getTime()) {
            await logger.warn("release_expired", {
              ...metadata,
              ownershipSource,
              supplementalContext,
              expiredAt: expires.toISOString(),
            });
            return new Response(
              JSON.stringify({ error: "Download window expired" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }

        await supabaseService
          .from("release_purchases")
          .update({ downloads_used: downloadCount + 1, last_download_at: new Date().toISOString() })
          .eq("id", purchaseId);

        break;
      }

      case "beat": {
        const { data: purchase, error } = await supabaseService
          .from("purchases")
          .select(`id, beat_id, buyer_id, license_pdf_url, beats:beat_id (audio_url, user_id)`)
          .eq("id", purchaseId)
          .maybeSingle();

        if (error || !purchase) {
          return new Response(
            JSON.stringify({ error: "Beat purchase not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        metadata = { ...metadata, beatId: purchase.beat_id };

        if (purchase.buyer_id !== user.id) {
          const fallback = await checkSupplementalOwnership({
            supabase: supabaseService,
            userId: user.id,
            productId: purchase.beat_id,
            purchaseType,
            creatorId: purchase.beats?.user_id ?? null,
          });

          if (!fallback.authorized) {
            await logger.error(
              "beat_access_denied",
              new Error('User does not own beat'),
              { ...metadata, reason: fallback.reason ?? 'unknown' },
            );
            return new Response(
              JSON.stringify({ error: "Access denied" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          ownershipSource = fallback.source ?? 'order';
          supplementalContext = fallback.details ?? null;
        } else {
          ownershipSource = 'direct_purchase';
        }

        storage = parseStorageLocation(purchase.beats?.audio_url ?? null);
        limit = 5;
        downloadCount = await countDownloadEvents(supabaseService, purchaseId, purchaseType);

        if (downloadCount >= limit) {
          await logger.warn("beat_limit_reached", {
            ...metadata,
            ownershipSource,
            supplementalContext,
            downloadsUsed: downloadCount,
            limit,
          });
          return new Response(
            JSON.stringify({ error: "Download limit reached" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        break;
      }

      case "sample_pack": {
        const { data: purchase, error } = await supabaseService
          .from("sample_pack_purchases")
          .select(`id, user_id, download_url, sample_pack_id, sample_packs:sample_pack_id (download_url, user_id, owner_id)`)
          .eq("id", purchaseId)
          .maybeSingle();

        if (error || !purchase) {
          return new Response(
            JSON.stringify({ error: "Sample pack purchase not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        metadata = { ...metadata, samplePackId: purchase.sample_pack_id };

        if (purchase.user_id !== user.id) {
          const fallback = await checkSupplementalOwnership({
            supabase: supabaseService,
            userId: user.id,
            productId: purchase.sample_pack_id,
            purchaseType,
            creatorId: purchase.sample_packs?.user_id ?? purchase.sample_packs?.owner_id ?? null,
          });

          if (!fallback.authorized) {
            await logger.error(
              "sample_pack_access_denied",
              new Error('User does not own sample pack'),
              { ...metadata, reason: fallback.reason ?? 'unknown' },
            );
            return new Response(
              JSON.stringify({ error: "Access denied" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          ownershipSource = fallback.source ?? 'order';
          supplementalContext = fallback.details ?? null;
        } else {
          ownershipSource = 'direct_purchase';
        }

        storage = parseStorageLocation(purchase.download_url || purchase.sample_packs?.download_url ?? null);
        limit = 3;
        downloadCount = await countDownloadEvents(supabaseService, purchaseId, purchaseType);

        if (downloadCount >= limit) {
          await logger.warn("sample_pack_limit_reached", {
            ...metadata,
            ownershipSource,
            supplementalContext,
            downloadsUsed: downloadCount,
            limit,
          });
          return new Response(
            JSON.stringify({ error: "Download limit reached" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unsupported purchase type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    if (supplementalContext) {
      metadata = { ...metadata, supplementalContext };
    }

    metadata = { ...metadata, ownershipSource };

    if (!storage) {
      return new Response(
        JSON.stringify({ error: "Download not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseService.storage
      .from(storage.bucket)
      .createSignedUrl(storage.path, 3600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Failed to create signed URL", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Unable to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabaseService.from("download_events").insert({
      user_id: user.id,
      purchase_id: purchaseId,
      purchase_type: purchaseType,
      file_path: `${storage.bucket}/${storage.path}`,
    });

    await logger.info("download_issued", {
      ...metadata,
      remainingDownloads: limit ? Math.max(limit - (downloadCount + 1), 0) : null,
      bucket: storage.bucket,
      path: storage.path,
    });

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        expiresIn: 3600,
        fileName: storage.fileName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("download-signed-url error", error);
    try {
      if (logger) {
        await logger.error("download_failed", error, {
          purchaseId,
          purchaseType,
        });
      } else {
        const fallbackClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } },
        );
        const fallbackLogger = createSystemLogger(fallbackClient, {
          component: "download_signed_url",
          feature: "downloads",
          userId: null,
          correlationId: generateCorrelationId(),
          message: "Download service event",
        });
        await fallbackLogger.error("download_failed", error, {
          purchaseId,
          purchaseType,
        });
      }
    } catch (loggingError) {
      console.error("download-signed-url logging error", loggingError);
    }
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
