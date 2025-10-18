import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReviewAction = "approve" | "close";

interface ReviewRequestBody {
  action: ReviewAction;
  itemIds: string[];
  reason?: string;
}

interface ModerationItemRow {
  id: string;
  item_id: string;
  item_type: string;
  status: string;
  severity: string;
  reported_by: string | null;
  reason: string | null;
}

interface ContentReportRow {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: string;
  reason: string;
  status: string;
  description: string | null;
}

interface ReviewResult {
  itemId: string;
  status?: string;
  reportStatus?: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error("[moderation-review] Authentication failed", authError?.message);
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const user = userData.user;

    const supabaseService = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: adminRole, error: roleError } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("[moderation-review] Failed to verify admin role", roleError.message);
      return jsonResponse({ error: "Unable to verify permissions" }, 500);
    }

    if (!adminRole) {
      return jsonResponse({ error: "Admin access required" }, 403);
    }

    const body = await req.json() as ReviewRequestBody;
    if (!body?.action || !body?.itemIds || !Array.isArray(body.itemIds)) {
      return jsonResponse({ error: "Invalid request payload" }, 400);
    }

    const action = body.action;
    if (action !== "approve" && action !== "close") {
      return jsonResponse({ error: "Unsupported action" }, 400);
    }

    const itemIds = [...new Set(body.itemIds)].filter(Boolean);
    if (itemIds.length === 0) {
      return jsonResponse({ error: "No moderation items provided" }, 400);
    }

    const reason = body.reason?.trim() || null;
    const now = new Date().toISOString();

    const { data: moderationItems, error: moderationError } = await supabaseService
      .from("moderation_items")
      .select("id, item_id, item_type, status, severity, reported_by, reason")
      .in("id", itemIds);

    if (moderationError) {
      console.error("[moderation-review] Failed to load moderation_items", moderationError.message);
      return jsonResponse({ error: "Failed to load moderation queue" }, 500);
    }

    const { data: reports, error: reportsError } = await supabaseService
      .from("content_reports")
      .select("id, reporter_id, target_id, target_type, reason, status, description")
      .in("id", itemIds);

    if (reportsError) {
      console.error("[moderation-review] Failed to load content_reports", reportsError.message);
      return jsonResponse({ error: "Failed to load reports" }, 500);
    }

    const moderationMap = new Map<string, ModerationItemRow>();
    (moderationItems ?? []).forEach((item) => moderationMap.set(item.id, item));

    const reportMap = new Map<string, ContentReportRow>();
    (reports ?? []).forEach((report) => reportMap.set(report.id, report));

    const results: ReviewResult[] = [];
    const logsPayload: any[] = [];
    const notificationsPayload: any[] = [];

    for (const itemId of itemIds) {
      const moderationItem = moderationMap.get(itemId) ?? null;
      const report = reportMap.get(itemId) ?? null;

      if (!moderationItem && !report) {
        results.push({ itemId, success: false, error: "Item not found" });
        continue;
      }

      const status = action === "approve" ? "approved" : "rejected";
      const moderationAction = action === "approve" ? "approve" : "reject";
      const reportStatus = action === "approve" ? "resolved" : "dismissed";
      const targetType = moderationItem?.item_type ?? "report";
      const targetId = moderationItem?.item_id ?? report?.target_id ?? itemId;

      if (moderationItem) {
        const { error: updateError } = await supabaseService
          .from("moderation_items")
          .update({
            status,
            admin_notes: reason,
            reviewed_at: now,
            reviewed_by: user.id,
          })
          .eq("id", itemId);

        if (updateError) {
          console.error("[moderation-review] Failed to update moderation_item", updateError.message, itemId);
          results.push({ itemId, success: false, error: updateError.message });
          continue;
        }
      }

      if (report) {
        const { error: reportUpdateError } = await supabaseService
          .from("content_reports")
          .update({
            status: reportStatus,
            resolution_notes: reason,
            resolved_at: now,
            resolved_by: user.id,
          })
          .eq("id", report.id);

        if (reportUpdateError) {
          console.error("[moderation-review] Failed to update content_report", reportUpdateError.message, itemId);
          results.push({ itemId, success: false, error: reportUpdateError.message });
          continue;
        }

        if (report.reporter_id) {
          notificationsPayload.push({
            user_id: report.reporter_id,
            title: action === "approve" ? "Report resolved" : "Report closed",
            message: action === "approve"
              ? "Thanks for the report. Our team has taken action and resolved the issue."
              : "Your report has been closed. We'll continue monitoring for future updates.",
            type: "moderation", 
            related_id: report.target_id,
            related_type: report.target_type,
            data: {
              moderation_item_id: itemId,
              report_status: reportStatus,
              target_type: report.target_type,
            },
          });
        }
      }

      const { error: actionInsertError } = await supabaseService
        .from("moderation_actions")
        .insert({
          moderator_id: user.id,
          target_type,
          target_id,
          action: moderationAction,
          reason,
        });

      if (actionInsertError) {
        console.error("[moderation-review] Failed to insert moderation_action", actionInsertError.message, itemId);
        results.push({ itemId, success: false, error: actionInsertError.message });
        continue;
      }

      logsPayload.push({
        level: 1,
        message: "Moderation decision recorded",
        component: "moderation.dashboard",
        action: `moderation_${action}`,
        user_id: user.id,
        metadata: {
          moderation_item_id: itemId,
          target_type: targetType,
          target_id: targetId,
          reason,
          batch_size: itemIds.length,
          reviewer_email: user.email,
          report_status: report ? reportStatus : undefined,
        },
      });

      results.push({ itemId, status, reportStatus: report ? reportStatus : undefined, success: true });
    }

    if (logsPayload.length > 0) {
      const { error: logError } = await supabaseService.from("system_logs").insert(logsPayload);
      if (logError) {
        console.error("[moderation-review] Failed to record system_logs", logError.message);
      }
    }

    let notificationsSent = 0;
    if (notificationsPayload.length > 0) {
      const { data: notificationInsert, error: notificationError } = await supabaseService
        .from("notifications")
        .insert(notificationsPayload)
        .select("id");

      if (notificationError) {
        console.error("[moderation-review] Failed to send notifications", notificationError.message);
      } else {
        notificationsSent = notificationInsert?.length ?? notificationsPayload.length;
      }
    }

    const processed = results.filter((result) => result.success).length;
    const failed = results.length - processed;

    return jsonResponse({
      success: failed === 0,
      action,
      processed,
      failed,
      results,
      notificationsSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[moderation-review] Unexpected error", message);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
