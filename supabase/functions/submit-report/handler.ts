import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

export type ReportTargetType = "release" | "beat" | "post" | "profile" | "comment" | "blog_post";

export type SubmitReportPayload = {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
};

export type ReportReason =
  | "inappropriate_content"
  | "spam"
  | "harassment"
  | "copyright_infringement"
  | "hate_speech"
  | "violence"
  | "other";

const ALLOWED_TARGET_TYPES: ReportTargetType[] = ["release", "beat", "post", "profile", "comment", "blog_post"];
const ALLOWED_REPORT_REASONS: ReportReason[] = [
  "inappropriate_content",
  "spam",
  "harassment",
  "copyright_infringement",
  "hate_speech",
  "violence",
  "other",
];

export type CreateClientFn = (
  supabaseUrl: string,
  supabaseKey: string,
  options?: Record<string, unknown>,
) => {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } | null } | null; error: { message?: string } | null }>;
  };
  from: (table: string) => any;
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export interface SubmitReportHandlerOptions {
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

export const resolveTargetOwner = async (
  serviceClient: any,
  type: ReportTargetType,
  targetId: string,
): Promise<{ ownerId: string | null; metadata: Record<string, unknown> | null }> => {
  switch (type) {
    case "release": {
      const { data, error } = await serviceClient
        .from("releases")
        .select("id, owner_id, user_id, title")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load release: ${error.message}`);
      if (!data) return { ownerId: null, metadata: null };
      return {
        ownerId: data.owner_id ?? data.user_id ?? null,
        metadata: { title: data.title ?? null, type: "release" },
      };
    }
    case "beat": {
      const { data, error } = await serviceClient
        .from("beats")
        .select("id, owner_id, user_id, title")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load beat: ${error.message}`);
      if (!data) return { ownerId: null, metadata: null };
      return {
        ownerId: data.owner_id ?? data.user_id ?? null,
        metadata: { title: data.title ?? null, type: "beat" },
      };
    }
    case "post": {
      const { data, error } = await serviceClient
        .from("posts")
        .select("id, user_id, title")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load post: ${error.message}`);
      if (!data) return { ownerId: null, metadata: null };
      return {
        ownerId: data.user_id ?? null,
        metadata: { title: data.title ?? null, type: "post" },
      };
    }
    case "profile": {
      const { data, error } = await serviceClient
        .from("profiles")
        .select("id, user_id, username")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load profile: ${error.message}`);
      if (!data) return { ownerId: null, metadata: null };
      return {
        ownerId: data.user_id ?? null,
        metadata: { username: data.username ?? null, type: "profile" },
      };
    }
    case "comment": {
      const { data, error } = await serviceClient
        .from("comments")
        .select("id, user_id, post_id")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load comment: ${error.message}`);
      if (!data) return { ownerId: null, metadata: null };
      return {
        ownerId: data.user_id,
        metadata: { post_id: data.post_id, type: "comment" },
      };
    }
    case "blog_post": {
      const { data, error } = await serviceClient
        .from("blog_posts")
        .select("id, created_by, title")
        .eq("id", targetId)
        .maybeSingle();
      if (error) throw new Error(`Failed to load blog post: ${error.message}`);
      if (!data) return { ownerId: null, metadata: null };
      return {
        ownerId: data.created_by ?? null,
        metadata: { title: data.title ?? null, type: "blog_post" },
      };
    }
    default:
      return { ownerId: null, metadata: null };
  }
};

export const createSubmitReportHandler = ({
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  createClient,
  corsHeaders = defaultCorsHeaders,
}: SubmitReportHandlerOptions) => {
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
      component: "submit_report",
      feature: "trust_safety",
      userId: authData.user.id,
      correlationId: req.headers.get("x-correlation-id") ?? generateCorrelationId(),
    });

    let payload: SubmitReportPayload | null = null;
    try {
      payload = await req.json() as SubmitReportPayload;
    } catch (error) {
      await logger.error("submit_report_invalid_json", error);
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }

    if (!payload || typeof payload !== "object") {
      await logger.warn("submit_report_missing_body");
      return jsonResponse({ error: "Request body required" }, 400, corsHeaders);
    }

  const { targetType, targetId, reason, description } = payload;

  if (!targetType || !targetId || !reason) {
      await logger.warn("submit_report_missing_fields", { targetType, targetId, hasReason: Boolean(reason) });
      return jsonResponse({ error: "targetType, targetId, and reason are required" }, 400, corsHeaders);
    }

    if (!targetId || typeof targetId !== "string" || targetId.trim().length === 0) {
      await logger.warn("submit_report_invalid_target", { targetId });
      return jsonResponse({ error: "Invalid targetId" }, 400, corsHeaders);
    }

  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    await logger.warn("submit_report_empty_reason");
    return jsonResponse({ error: "reason must not be empty" }, 400, corsHeaders);
  }

  if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
    await logger.warn("submit_report_invalid_type", { targetType });
    return jsonResponse({ error: "Unsupported targetType" }, 400, corsHeaders);
  }

  const normalizedReasonKey = normalizedReason.toLowerCase().replace(/\s+/g, "_") as ReportReason;
  if (!ALLOWED_REPORT_REASONS.includes(normalizedReasonKey)) {
    await logger.warn("submit_report_invalid_reason", { reason });
    return jsonResponse({ error: "Unsupported reason" }, 400, corsHeaders);
  }

    try {
      const { ownerId, metadata } = await resolveTargetOwner(serviceClient, targetType, targetId);
      if (!ownerId && targetType !== "comment" && targetType !== "blog_post") {
        await logger.warn("submit_report_target_not_found", { targetType, targetId });
        return jsonResponse({ error: "Target not found" }, 404, corsHeaders);
      }

      if (ownerId) {
        const { data: blockCheck, error: blockError } = await serviceClient
          .rpc("is_user_blocked", { p_actor: authData.user.id, p_target: ownerId });

        if (blockError) {
          await logger.error("submit_report_block_check_failed", blockError);
          return jsonResponse({ error: "Unable to verify block status" }, 500, corsHeaders);
        }

        if (blockCheck === true) {
          await logger.warn("submit_report_blocked_relationship", { ownerId, reporterId: authData.user.id });
          return jsonResponse({ error: "Interaction not allowed between blocked users" }, 403, corsHeaders);
        }
      }

      const insertPayload = {
        reporter_id: authData.user.id,
        target_type: targetType,
        target_id: targetId,
        target_owner_id: ownerId,
        reason: normalizedReasonKey,
        description: description?.trim() ? description.trim() : null,
        status: "pending",
      } as const;

      const { data: report, error: insertError } = await serviceClient
        .from("content_reports")
        .insert(insertPayload)
        .select("id, status, created_at, target_type, target_id")
        .single();

      if (insertError) {
        await logger.error("submit_report_insert_failed", insertError, { payload: insertPayload });
        return jsonResponse({ error: "Failed to submit report" }, 500, corsHeaders);
      }

      await logger.info("submit_report_created", {
        report_id: report?.id ?? null,
        target_type: targetType,
        target_owner_id: ownerId,
        metadata,
      });

      return jsonResponse({ report, correlationId: logger.correlationId }, 201, corsHeaders);
    } catch (err) {
      await logger.error("submit_report_unexpected_error", err, {
        targetType,
        targetId,
      });
      return jsonResponse({ error: "Unexpected error submitting report" }, 500, corsHeaders);
    }
  };
};
