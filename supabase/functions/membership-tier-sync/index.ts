import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[membership-tier-sync] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseService = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const membershipTierStripeUrl = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/membership-tier-stripe`
  : "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestLogger: ReturnType<typeof createSystemLogger> | null = null;
  const requestCorrelationId = generateCorrelationId();

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase credentials not configured for sync job");
    }

    const payload = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limitValue = typeof payload?.limit === "number" ? payload.limit : 10;
    const limit = Math.max(1, Math.min(25, limitValue));
    const includeFailed = Boolean(payload?.includeFailed || payload?.retryFailed);
    const candidateStatuses = includeFailed ? ["pending", "error"] : ["pending"];
    const nowIso = new Date().toISOString();

    requestLogger = createSystemLogger(supabaseService, {
      component: "membership_tier_sync",
      feature: "membership",
      correlationId: requestCorrelationId,
      message: "Membership tier queue processor",
    });

    await requestLogger.info("membership_tier_sync_queue_poll", {
      limit,
      include_failed: includeFailed,
      candidate_statuses: candidateStatuses,
    });

    const { data: jobs, error: jobsError } = await supabaseService
      .from("membership_tier_sync_queue")
      .select("id, tier_id, action, payload, previous, attempts, status, actor_id, scheduled_at, created_at")
      .in("status", candidateStatuses)
      .lte("scheduled_at", nowIso)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (jobsError) {
      throw jobsError;
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const job of jobs ?? []) {
      const jobCorrelationId =
        job.payload?.correlation_id ?? job.id ?? generateCorrelationId();
      const jobLogger = createSystemLogger(supabaseService, {
        component: "membership_tier_sync",
        feature: "membership",
        userId: job.actor_id ?? job.payload?.actor_id ?? null,
        correlationId: jobCorrelationId,
        message: "Membership tier queue processor",
      });

      const { data: lockedJob, error: lockError } = await supabaseService
        .from("membership_tier_sync_queue")
        .update({
          status: "processing",
          locked_at: new Date().toISOString(),
          attempts: (job.attempts ?? 0) + 1,
        })
        .eq("id", job.id)
        .in("status", candidateStatuses)
        .select()
        .single();

      if (lockError || !lockedJob) {
        await jobLogger.warn("membership_tier_sync_lock_skip", {
          job_id: job.id,
          error: lockError ? String(lockError) : "already_processed",
        });
        continue;
      }

      const attemptCount = lockedJob.attempts ?? 1;

      try {
        await jobLogger.info("membership_tier_sync_job_start", {
          job_id: lockedJob.id,
          action: lockedJob.action,
          attempt: attemptCount,
          scheduled_at: lockedJob.scheduled_at,
          tier_id: lockedJob.tier_id,
        });

        const tierPayload = lockedJob.payload?.tier ?? lockedJob.payload;
        if (!tierPayload) {
          throw new Error("Missing tier payload for sync job");
        }

        if (lockedJob.action !== "delete" && lockedJob.tier_id) {
          await supabaseService
            .from("membership_tiers")
            .update({ stripe_sync_status: "processing", stripe_sync_error: null })
            .eq("id", lockedJob.tier_id);
        }

        const attempt = lockedJob.attempts ?? 1;
        const correlationId =
          lockedJob.payload?.correlation_id ?? lockedJob.id ?? crypto.randomUUID?.() ?? undefined;

        const response = await fetch(membershipTierStripeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            action: lockedJob.action,
            payload: {
              tier: tierPayload,
              actor_id: lockedJob.payload?.actor_id ?? lockedJob.actor_id ?? null,
              previous: lockedJob.previous ?? null,
              attempt,
              correlation_id: correlationId,
              job_id: lockedJob.id,
              queued_at: lockedJob.created_at,
              scheduled_at: lockedJob.scheduled_at,
            },
          }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(
            `[membership-tier-sync] Stripe sync failed (${response.status}): ${message || response.statusText}`
          );
        }

        const syncResult = await response.json();

        await jobLogger.info("membership_tier_sync_job_response", {
          job_id: lockedJob.id,
          action: lockedJob.action,
          response_status: response.status,
        });

        if (lockedJob.action !== "delete" && lockedJob.tier_id) {
          const { error: tierUpdateError } = await supabaseService
            .from("membership_tiers")
            .update({
              stripe_product_id: syncResult?.stripe_product_id ?? null,
              stripe_price_monthly_id: syncResult?.stripe_price_ids?.monthly ?? null,
              stripe_price_yearly_id: syncResult?.stripe_price_ids?.yearly ?? null,
              stripe_price_lifetime_id: syncResult?.stripe_price_ids?.lifetime ?? null,
              stripe_synced_at: new Date().toISOString(),
              stripe_sync_status: "synced",
              stripe_sync_error: null,
            })
            .eq("id", lockedJob.tier_id);

          if (tierUpdateError) {
            throw tierUpdateError;
          }
        }

        await supabaseService
          .from("membership_tier_sync_queue")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq("id", lockedJob.id);

        await jobLogger.info("membership_tier_sync_job_success", {
          job_id: lockedJob.id,
          action: lockedJob.action,
          tier_id: lockedJob.tier_id,
          status: "completed",
        });

        results.push({ id: lockedJob.id, status: "completed" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const maxAttempts = 5;
        const shouldFail = attemptCount >= maxAttempts;
        const nextStatus = shouldFail ? "failed" : "pending";
        const nextSchedule = shouldFail
          ? lockedJob.scheduled_at ?? new Date().toISOString()
          : new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await supabaseService
          .from("membership_tier_sync_queue")
          .update({
            status: nextStatus,
            last_error: message,
            scheduled_at: nextSchedule,
          })
          .eq("id", lockedJob.id);

        if (lockedJob.tier_id && lockedJob.action !== "delete") {
          await supabaseService
            .from("membership_tiers")
            .update({
              stripe_sync_status: "error",
              stripe_sync_error: message,
            })
            .eq("id", lockedJob.tier_id);
        }

        await jobLogger.error("membership_tier_sync_job_failed", error, {
          job_id: lockedJob.id,
          action: lockedJob.action,
          tier_id: lockedJob.tier_id,
          status: nextStatus,
          attempts: attemptCount,
          max_attempts: maxAttempts,
        });

        results.push({ id: lockedJob.id, status: nextStatus, error: message });
      }
    }

    await requestLogger.info("membership_tier_sync_queue_complete", {
      processed: results.length,
      results,
    });

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallbackLogger =
      requestLogger ??
      createSystemLogger(supabaseService, {
        component: "membership_tier_sync",
        feature: "membership",
        correlationId: requestCorrelationId,
        message: "Membership tier queue processor",
      });
    await fallbackLogger.error("membership_tier_sync_queue_failed", error, {
      error: message,
    });
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
