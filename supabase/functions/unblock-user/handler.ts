import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

export type UnblockUserPayload = {
  blockedUserId: string;
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

export interface UnblockUserHandlerOptions {
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

export const createUnblockUserHandler = ({
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  createClient,
  corsHeaders = defaultCorsHeaders,
}: UnblockUserHandlerOptions) => {
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

    let payload: UnblockUserPayload | null = null;
    try {
      payload = await req.json() as UnblockUserPayload;
    } catch (error) {
      const logger = createSystemLogger(serviceClient, {
        component: "unblock_user",
        feature: "trust_safety",
        userId: authData.user.id,
        correlationId: generateCorrelationId(),
      });
      await logger.error("unblock_user_invalid_json", error);
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }

    if (!payload) {
      const logger = createSystemLogger(serviceClient, {
        component: "unblock_user",
        feature: "trust_safety",
        userId: authData.user.id,
        correlationId: generateCorrelationId(),
      });
      await logger.warn("unblock_user_missing_payload");
      return jsonResponse({ error: "Request body required" }, 400, corsHeaders);
    }

    const { blockedUserId, notes } = payload;
    if (!blockedUserId || typeof blockedUserId !== "string" || blockedUserId.trim().length === 0) {
      const logger = createSystemLogger(serviceClient, {
        component: "unblock_user",
        feature: "trust_safety",
        userId: authData.user.id,
        correlationId: generateCorrelationId(),
      });
      await logger.warn("unblock_user_invalid_target", { blockedUserId });
      return jsonResponse({ error: "blockedUserId is required" }, 400, corsHeaders);
    }

    const logger = createSystemLogger(serviceClient, {
      component: "unblock_user",
      feature: "trust_safety",
      userId: authData.user.id,
      correlationId: req.headers.get("x-correlation-id") ?? generateCorrelationId(),
    });

    try {
      const { data: existingBlock, error: lookupError } = await serviceClient
        .from("user_blocks")
        .select("id, status")
        .eq("blocker_id", authData.user.id)
        .eq("blocked_user_id", blockedUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        await logger.error("unblock_user_lookup_failed", lookupError, { blockedUserId });
        return jsonResponse({ error: "Failed to load block state" }, 500, corsHeaders);
      }

      if (!existingBlock || existingBlock.status !== "active") {
        await logger.warn("unblock_user_no_active_block", { blockedUserId });
        return jsonResponse({ error: "No active block found" }, 404, corsHeaders);
      }

      const nowIso = new Date().toISOString();
      const { data: updatedBlock, error: updateError } = await serviceClient
        .from("user_blocks")
        .update({
          status: "revoked",
          resolved_at: nowIso,
          resolved_by: authData.user.id,
          resolution_notes: notes?.trim() ? notes.trim() : null,
          updated_at: nowIso,
        })
        .eq("id", existingBlock.id)
        .select("id, status, resolved_at, resolved_by, resolution_notes, updated_at")
        .maybeSingle();

      if (updateError) {
        await logger.error("unblock_user_update_failed", updateError, { blockedUserId });
        return jsonResponse({ error: "Failed to update block" }, 500, corsHeaders);
      }

      await logger.info("unblock_user_success", {
        block_id: updatedBlock?.id ?? null,
        blocked_user_id: blockedUserId,
      });

      return jsonResponse({ block: updatedBlock, correlationId: logger.correlationId }, 200, corsHeaders);
    } catch (err) {
      await logger.error("unblock_user_unexpected_error", err, { blockedUserId });
      return jsonResponse({ error: "Unexpected error unblocking user" }, 500, corsHeaders);
    }
  };
};
