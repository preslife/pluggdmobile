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
      isPremium: Boolean(release.is_premium_content),
      isScheduled,
      isPublished,
      isPreorder: latestPurchaseIsPreorder,
      availableAt: latestPurchaseAvailableAt,
      preorderPending,
    };

    await logger.info("verify_release_access_completed", {
      release_id: releaseId,
      user_id: userId,
      has_access: finalHasAccess,
      has_purchase: hasPurchased,
      is_premium: Boolean(release.is_premium_content),
      is_scheduled: isScheduled,
    });

    return jsonResponse(responsePayload, 200);
  } catch (error) {
    await logger.error("verify_release_access_unexpected_error", error);
    return jsonResponse({ error: "Unexpected error verifying release access" }, 500);
  }
});
