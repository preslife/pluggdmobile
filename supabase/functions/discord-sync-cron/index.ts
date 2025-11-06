import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const WINDOW_MINUTES = 60;
const BATCH_LIMIT = 50;

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase configuration missing" }, 500);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const correlationId = req.headers.get("x-correlation-id") ?? generateCorrelationId();
  const logger = createSystemLogger(serviceClient, {
    component: "discord_sync_cron",
    feature: "memberships",
    correlationId,
  });

  try {
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { data: membershipRows, error: membershipError } = await serviceClient
      .from("memberships")
      .select("id, user_id, status, updated_at, membership_tiers(owner_id, owner_type)")
      .gte("updated_at", windowStart)
      .order("updated_at", { ascending: false })
      .limit(BATCH_LIMIT);

    if (membershipError) {
      await logger.error("discord_cron_membership_query_failed", membershipError, { window_start: windowStart });
      return jsonResponse({ error: "Unable to load memberships" }, 500);
    }

    const profileOwnerCache = new Map<string, string | null>();
    const jobs: Array<{ creatorId: string; fanId: string; action: "grant" | "revoke" | "sync"; membershipId: string }> = [];

    for (const row of membershipRows ?? []) {
      const membershipTier = row.membership_tiers as { owner_id: string | null; owner_type: string | null } | null;
      const ownerId = membershipTier?.owner_id ?? null;
      const ownerType = membershipTier?.owner_type ?? "profile";
      if (!ownerId || ownerType !== "profile") {
        continue;
      }

      if (!profileOwnerCache.has(ownerId)) {
        const { data: profileRow, error: profileError } = await serviceClient
          .from("profiles")
          .select("user_id")
          .eq("id", ownerId)
          .maybeSingle();

        if (profileError) {
          await logger.warn("discord_cron_profile_lookup_failed", { error: profileError.message, profile_id: ownerId });
          profileOwnerCache.set(ownerId, null);
        } else {
          profileOwnerCache.set(ownerId, profileRow?.user_id ?? null);
        }
      }

      const creatorUserId = profileOwnerCache.get(ownerId);
      if (!creatorUserId) continue;

      const normalizedStatus = String(row.status ?? "");
      let action: "grant" | "revoke" | "sync" = "sync";
      if (normalizedStatus === "active") action = "grant";
      else if (normalizedStatus === "cancelled" || normalizedStatus === "expired") action = "revoke";
      else if (normalizedStatus === "past_due") action = "sync";

      jobs.push({
        creatorId: creatorUserId,
        fanId: row.user_id,
        action,
        membershipId: row.id,
      });
    }

    const summaries: Array<{ membershipId: string; success: boolean; error?: string | null }> = [];

    for (const job of jobs) {
      try {
        const { error: invokeError } = await serviceClient.functions.invoke("discord-sync-subscriber", {
          body: {
            creator_id: job.creatorId,
            fan_user_id: job.fanId,
            action: job.action,
          },
        });

        if (invokeError) {
          summaries.push({ membershipId: job.membershipId, success: false, error: invokeError.message });
          await logger.warn("discord_cron_sync_failed", {
            membership_id: job.membershipId,
            creator_id: job.creatorId,
            fan_id: job.fanId,
            error: invokeError.message,
          });
        } else {
          summaries.push({ membershipId: job.membershipId, success: true });
          await logger.info("discord_cron_sync_success", {
            membership_id: job.membershipId,
            creator_id: job.creatorId,
            fan_id: job.fanId,
            action: job.action,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summaries.push({ membershipId: job.membershipId, success: false, error: message });
        await logger.error("discord_cron_sync_exception", error, {
          membership_id: job.membershipId,
          creator_id: job.creatorId,
          fan_id: job.fanId,
        });
      }
    }

    await logger.info("discord_cron_summary", {
      window_start: windowStart,
      attempted: jobs.length,
      successes: summaries.filter((summary) => summary.success).length,
      failures: summaries.filter((summary) => !summary.success).length,
    });

    return jsonResponse({
      attempted: jobs.length,
      successes: summaries.filter((summary) => summary.success).length,
      failures: summaries.filter((summary) => !summary.success).length,
      details: summaries,
    }, 200);
  } catch (error) {
    await logger.error("discord_cron_unexpected_error", error);
    return jsonResponse({ error: "Unexpected Discord cron error" }, 500);
  }
});
