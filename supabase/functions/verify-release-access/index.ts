import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

type ReleaseAccessResponse = {
  hasAccess: boolean;
  hasPurchased: boolean;
  latestPurchaseId: string | null;
  latestPurchaseType: string | null;
  latestPurchaseAvailableAt: string | null;
  latestPurchaseIsPreorder: boolean;
  needsPurchase: boolean;
  isPremium: boolean;
  isScheduled: boolean;
  isPublished: boolean;
  isPreorder: boolean;
  availableAt: string | null;
  preorderPending: boolean;
};

type ReleaseAccessCacheRow = {
  user_id: string;
  release_id: string;
  has_access: boolean;
  has_purchased: boolean;
  latest_purchase_id: string | null;
  latest_purchase_available_at: string | null;
  latest_purchase_is_preorder: boolean;
  needs_purchase: boolean;
  is_premium: boolean;
  is_scheduled: boolean;
  is_published: boolean;
  preorder_pending: boolean;
  available_at: string | null;
  updated_at: string;
  created_at: string;
};

const CACHE_TTL_MS = Number(Deno.env.get("VERIFY_RELEASE_ACCESS_CACHE_TTL_MS") ?? 5 * 60 * 1000);

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase configuration missing" }, 500);
  }

  const anonClient = createClient(supabaseUrl, anonKey);
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const correlationId = req.headers.get("x-correlation-id") ?? generateCorrelationId();
  const logger = createSystemLogger(serviceClient, {
    component: "verify_release_access",
    feature: "membership",
    correlationId,
  });

  try {
    const body = await req.json().catch(() => null) as { releaseId?: string } | null;
    if (!body?.releaseId) {
      await logger.warn("verify_release_access_missing_release_id");
      return jsonResponse({ error: "releaseId is required" }, 400);
    }

    const releaseId = body.releaseId;
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await anonClient.auth.getUser(token);
      if (userError) {
        await logger.warn("verify_release_access_auth_failed", { error: userError.message });
      } else {
        userId = userData?.user?.id ?? null;
      }
    }

    await logger.info("verify_release_access_requested", {
      release_id: releaseId,
      has_token: Boolean(authHeader),
      user_id: userId,
    });

    let cacheMissReason: "empty" | "stale" | "error" | null = null;

    if (userId) {
      const { data: cacheLookup, error: cacheError } = await serviceClient
        .from<ReleaseAccessCacheRow>("release_access_cache")
        .select("*")
        .eq("user_id", userId)
        .eq("release_id", releaseId)
        .maybeSingle();

      if (cacheError) {
        cacheMissReason = "error";
        await logger.warn("verify_release_access_cache_lookup_failed", {
          release_id: releaseId,
          user_id: userId,
          error: cacheError.message,
        });
      } else if (cacheLookup) {
        const updatedAtMs = Date.parse(cacheLookup.updated_at ?? "");
        const ageMs = Date.now() - updatedAtMs;

        if (!Number.isNaN(ageMs) && ageMs <= CACHE_TTL_MS) {
          const cachedResponse: ReleaseAccessResponse = {
            hasAccess: cacheLookup.has_access,
            hasPurchased: cacheLookup.has_purchased,
            latestPurchaseId: cacheLookup.latest_purchase_id,
            latestPurchaseType: cacheLookup.latest_purchase_id ? "release" : null,
            latestPurchaseAvailableAt: cacheLookup.latest_purchase_available_at,
            latestPurchaseIsPreorder: cacheLookup.latest_purchase_is_preorder,
            needsPurchase: cacheLookup.needs_purchase,
            isPremium: cacheLookup.is_premium,
            isScheduled: cacheLookup.is_scheduled,
            isPublished: cacheLookup.is_published,
            isPreorder: cacheLookup.latest_purchase_is_preorder,
            availableAt: cacheLookup.available_at ?? cacheLookup.latest_purchase_available_at,
            preorderPending: cacheLookup.preorder_pending,
          };

          await logger.info("verify_release_access_cache_hit", {
            release_id: releaseId,
            user_id: userId,
            cache_age_ms: ageMs,
          });

          if (cachedResponse.preorderPending) {
            await logger.info("verify_release_access_preorder_block", {
              release_id: releaseId,
              user_id: userId,
              source: "cache",
              available_at: cachedResponse.availableAt,
            });
          }

          await logger.info("verify_release_access_completed", {
            release_id: releaseId,
            user_id: userId,
            has_access: cachedResponse.hasAccess,
            has_purchase: cachedResponse.hasPurchased,
            is_premium: cacheLookup.is_premium,
            is_scheduled: cacheLookup.is_scheduled,
            source: "cache",
          });

          return jsonResponse(cachedResponse, 200);
        }

        cacheMissReason = "stale";
      } else {
        cacheMissReason = "empty";
      }

      if (cacheMissReason) {
        await logger.info("verify_release_access_cache_miss", {
          release_id: releaseId,
          user_id: userId,
          reason: cacheMissReason,
        });
      }
    }

    const { data: release, error: releaseError } = await serviceClient
      .from("releases")
      .select(
        "id, price, is_premium_content, approval_status, scheduled_publish_date, owner_type, owner_id, user_id",
      )
      .eq("id", releaseId)
      .maybeSingle();

    if (releaseError) {
      await logger.error("verify_release_access_release_lookup_failed", releaseError, { release_id: releaseId });
      return jsonResponse({ error: "Unable to load release" }, 500);
    }

    if (!release) {
      await logger.warn("verify_release_access_release_not_found", { release_id: releaseId });
      return jsonResponse({ error: "Release not found" }, 404);
    }

    let hasAccess = false;
    let hasPurchased = false;
    let latestPurchaseId: string | null = null;
    let latestPurchaseAvailableAt: string | null = null;
    let latestPurchaseIsPreorder = false;

    if (userId) {
      const { data: accessResult, error: accessError } = await serviceClient
        .rpc("can_access_release", { p_user_id: userId, p_release_id: releaseId });

      if (accessError) {
        await logger.error("verify_release_access_rpc_failed", accessError, { release_id: releaseId, user_id: userId });
        return jsonResponse({ error: "Unable to verify release access" }, 500);
      }

      hasAccess = accessResult === true;

      const { data: purchaseResult, error: purchaseError } = await serviceClient
        .rpc("has_purchased_release", { p_user_id: userId, p_release_id: releaseId });

      if (purchaseError) {
        await logger.warn("verify_release_access_purchase_lookup_failed", { error: purchaseError.message, user_id: userId });
      } else {
        hasPurchased = purchaseResult === true;
      }

      if (hasPurchased) {
        const { data: latestPurchase, error: latestPurchaseError } = await serviceClient
          .from("release_purchases")
          .select("id, purchased_at, available_at, is_preorder")
          .eq("user_id", userId)
          .eq("release_id", releaseId)
          .order("purchased_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestPurchaseError) {
          await logger.warn("verify_release_access_latest_purchase_failed", {
            error: latestPurchaseError.message,
            release_id: releaseId,
            user_id: userId,
          });
        } else if (latestPurchase?.id) {
          latestPurchaseId = latestPurchase.id;
          latestPurchaseAvailableAt = latestPurchase.available_at ?? null;
          latestPurchaseIsPreorder = Boolean(latestPurchase.is_preorder);
        }
      }
    }

    const isPremium = Boolean(release.is_premium_content);
    const isPublished =
      release.approval_status === "approved" || release.approval_status === "auto_approved";
    const isScheduled = Boolean(
      release.scheduled_publish_date && new Date(release.scheduled_publish_date).getTime() > Date.now(),
    );

    const preorderPending = Boolean(
      latestPurchaseAvailableAt && new Date(latestPurchaseAvailableAt).getTime() > Date.now(),
    );

    const needsPurchase = Boolean((release.price ?? 0) > 0 && !hasPurchased);
    const finalHasAccess = Boolean(hasAccess && isPublished && !isScheduled && !preorderPending);

    const responsePayload: ReleaseAccessResponse = {
      hasAccess: finalHasAccess,
      hasPurchased,
      latestPurchaseId,
      latestPurchaseType: latestPurchaseId ? "release" : null,
      latestPurchaseAvailableAt,
      latestPurchaseIsPreorder,
      needsPurchase,
      isPremium,
      isScheduled,
      isPublished,
      isPreorder: latestPurchaseIsPreorder,
      availableAt: latestPurchaseAvailableAt,
      preorderPending,
    };

    if (preorderPending) {
      await logger.info("verify_release_access_preorder_block", {
        release_id: releaseId,
        user_id: userId,
        source: "live",
        available_at: latestPurchaseAvailableAt,
      });
    }

    if (userId) {
      try {
        await serviceClient
          .from("release_access_cache")
          .upsert({
            user_id: userId,
            release_id: releaseId,
            has_access: finalHasAccess,
            has_purchased: hasPurchased,
            latest_purchase_id: latestPurchaseId,
            latest_purchase_available_at: latestPurchaseAvailableAt,
            latest_purchase_is_preorder: latestPurchaseIsPreorder,
            needs_purchase: needsPurchase,
            is_premium: isPremium,
            is_scheduled: isScheduled,
            is_published: isPublished,
            preorder_pending: preorderPending,
            available_at: latestPurchaseAvailableAt,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,release_id" });

        await logger.info("verify_release_access_cache_populated", {
          release_id: releaseId,
          user_id: userId,
          status: finalHasAccess ? "granted" : "blocked",
        });
      } catch (cacheWriteError) {
        await logger.warn("verify_release_access_cache_write_failed", {
          release_id: releaseId,
          user_id: userId,
          error: cacheWriteError instanceof Error ? cacheWriteError.message : String(cacheWriteError),
        });
      }
    }

    await logger.info("verify_release_access_completed", {
      release_id: releaseId,
      user_id: userId,
      has_access: finalHasAccess,
      has_purchase: hasPurchased,
      is_premium: isPremium,
      is_scheduled: isScheduled,
      source: "live",
    });

    return jsonResponse(responsePayload, 200);
  } catch (error) {
    await logger.error("verify_release_access_unexpected_error", error);
    return jsonResponse({ error: "Unexpected error verifying release access" }, 500);
  }
});
