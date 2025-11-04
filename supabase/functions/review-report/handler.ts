import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

export type ReviewAction = "investigate" | "resolve" | "dismiss" | "reopen";

export type ReviewReportPayload = {
  reportId: string;
  action: ReviewAction;
  notes?: string;
};

export type CreateClientFn = (
  supabaseUrl: string,
  supabaseKey: string,
  options?: Record<string, unknown>,
) => {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } | null } | null; error: { message?: string } | null }>;
  };
  from: (table: string) => any;
};

export interface ReviewReportHandlerOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  createClient: CreateClientFn;
  corsHeaders?: Record<string, string>;
}

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

const jsonResponse = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ensureAdmin = async (serviceClient: any, userId: string) => {
  const { data, error } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify admin role: ${error.message}`);
  }

  if (!data) {
    throw new Error("Admin access required");
  }
};

export const createReviewReportHandler = ({
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  createClient,
  corsHeaders = defaultCorsHeaders,
}: ReviewReportHandlerOptions) => {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Supabase configuration missing" }, 500, corsHeaders);
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required" }, 401, corsHeaders);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return jsonResponse({ error: "Authentication failed" }, 401, corsHeaders);
    }

    const logger = createSystemLogger(serviceClient, {
      component: "review_report",
      feature: "trust_safety",
      userId: authData.user.id,
      correlationId: req.headers.get("x-correlation-id") ?? generateCorrelationId(),
    });

    let payload: ReviewReportPayload | null = null;
    try {
      payload = await req.json() as ReviewReportPayload;
    } catch (error) {
      await logger.error("review_report_invalid_json", error);
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }

    if (!payload || typeof payload !== "object") {
      await logger.warn("review_report_missing_payload");
      return jsonResponse({ error: "Request body required" }, 400, corsHeaders);
    }

    const { reportId, action, notes } = payload;
    if (!reportId || typeof reportId !== "string" || reportId.trim().length === 0) {
      await logger.warn("review_report_invalid_report_id", { reportId });
      return jsonResponse({ error: "reportId is required" }, 400, corsHeaders);
    }

    if (!action) {
      await logger.warn("review_report_missing_action");
      return jsonResponse({ error: "action is required" }, 400, corsHeaders);
    }

    if (!["investigate", "resolve", "dismiss", "reopen"].includes(action)) {
      await logger.warn("review_report_unsupported_action", { action });
      return jsonResponse({ error: "Unsupported action" }, 400, corsHeaders);
    }

    try {
      await ensureAdmin(serviceClient, authData.user.id);
    } catch (err) {
      await logger.warn("review_report_admin_check_failed", err instanceof Error ? err.message : err, {
        reportId,
        action,
      });
      return jsonResponse({ error: err instanceof Error ? err.message : "Access denied" }, 403, corsHeaders);
    }

    try {
      const { data: existingReport, error: reportError } = await serviceClient
        .from("content_reports")
        .select("id, reporter_id, status")
        .eq("id", reportId)
        .maybeSingle();

      if (reportError) {
        await logger.error("review_report_lookup_failed", reportError, { reportId });
        return jsonResponse({ error: "Failed to load report" }, 500, corsHeaders);
      }

      if (!existingReport) {
        await logger.warn("review_report_not_found", { reportId });
        return jsonResponse({ error: "Report not found" }, 404, corsHeaders);
      }

      const nowIso = new Date().toISOString();
      const updatePayload: Record<string, unknown> = {
        status:
          action === "investigate"
            ? "investigating"
            : action === "resolve"
            ? "resolved"
            : action === "dismiss"
            ? "dismissed"
            : "appealed",
        updated_at: nowIso,
      };

      if (typeof notes === "string") {
        const trimmed = notes.trim();
        if (action === "reopen") {
          updatePayload.appeal_notes = trimmed.length > 0 ? trimmed : null;
        } else {
          updatePayload.resolution_notes = trimmed.length > 0 ? trimmed : null;
        }
      } else if (action === "reopen") {
        updatePayload.appeal_notes = null;
      } else {
        updatePayload.resolution_notes = null;
      }

      if (action === "resolve" || action === "dismiss") {
        updatePayload.resolved_by = authData.user.id;
        updatePayload.resolved_at = nowIso;
        updatePayload.appealed_at = null;
        updatePayload.appealed_by = null;
      } else if (action === "investigate") {
        updatePayload.resolved_by = null;
        updatePayload.resolved_at = null;
      } else if (action === "reopen") {
        updatePayload.appealed_at = nowIso;
        updatePayload.appealed_by = authData.user.id;
        updatePayload.resolved_at = null;
        updatePayload.resolved_by = null;
      }

      const { data: updatedReport, error: updateError } = await serviceClient
        .from("content_reports")
        .update(updatePayload)
        .eq("id", reportId)
        .select("id, status, resolved_at, resolved_by, appeal_notes, appealed_at, appealed_by, resolution_notes, updated_at")
        .maybeSingle();

      if (updateError) {
        await logger.error("review_report_update_failed", updateError, { reportId, updatePayload });
        return jsonResponse({ error: "Failed to update report" }, 500, corsHeaders);
      }

      await logger.info("review_report_status_updated", {
        report_id: reportId,
        action,
        next_status: updatePayload.status,
      });

      return jsonResponse({ report: updatedReport, correlationId: logger.correlationId }, 200, corsHeaders);
    } catch (err) {
      await logger.error("review_report_unexpected_error", err, { reportId, action });
      return jsonResponse({ error: "Unexpected error updating report" }, 500, corsHeaders);
    }
  };
};
