import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

export type BlockUserPayload = {
  blockedUserId: string;
  reason?: string;
  expiresAt?: string;
  context?: Record<string, unknown> | null;
};

export type SupabaseClientLike = {
  auth: {
    getUser: (token: string) => Promise<{ data: { user: { id: string } | null } | null; error: { message?: string } | null }>;
  };
  from: (table: string) => any;
};

export type CreateClientFn = (
  supabaseUrl: string,
  supabaseKey: string,
  options?: Record<string, unknown>,
) => SupabaseClientLike;

export interface BlockUserHandlerOptions {
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

const sanitizeContext = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
};

const jsonResponse = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const createBlockUserHandler = ({
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  createClient,
  corsHeaders = defaultCorsHeaders,
}: BlockUserHandlerOptions) => {
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

    let payload: BlockUserPayload | null = null;
    try {
      payload = await req.json() as BlockUserPayload;
    } catch (error) {
      const logger = createSystemLogger(serviceClient, {
        component: "block_user",
        feature: "trust_safety",
        userId: authData.user.id,
        correlationId: generateCorrelationId(),
      });
      await logger.error("block_user_invalid_json", error);
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }

    if (!payload) {
      const logger = createSystemLogger(serviceClient, {
        component: "block_user",
        feature: "trust_safety",
        userId: authData.user.id,
        correlationId: generateCorrelationId(),
      });
      await logger.warn("block_user_missing_payload");
      return jsonResponse({ error: "Request body required" }, 400, corsHeaders);
    }

    const { blockedUserId, reason, expiresAt, context } = payload;
    if (!blockedUserId || typeof blockedUserId !== "string" || blockedUserId.trim().length === 0) {
      const logger = createSystemLogger(serviceClient, {
        component: "block_user",
        feature: "trust_safety",
        userId: authData.user.id,
        correlationId: generateCorrelationId(),
      });
      await logger.warn("block_user_invalid_target", { blockedUserId });
      return jsonResponse({ error: "blockedUserId is required" }, 400, corsHeaders);
    }

    if (blockedUserId === authData.user.id) {
      const logger = createSystemLogger(serviceClient, {
        component: "block_user",
        feature: "trust_safety",
        userId: authData.user.id,
        correlationId: generateCorrelationId(),
      });
      await logger.warn("block_user_self_block_attempt");
      return jsonResponse({ error: "You cannot block yourself" }, 400, corsHeaders);
    }

    const logger = createSystemLogger(serviceClient, {
      component: "block_user",
      feature: "trust_safety",
      userId: authData.user.id,
      correlationId: req.headers.get("x-correlation-id") ?? generateCorrelationId(),
    });

    const normalizedReason = reason?.trim() ?? null;
    let normalizedExpires: string | null = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        await logger.warn("block_user_invalid_expiration", { expiresAt });
        return jsonResponse({ error: "expiresAt must be a valid ISO date string" }, 400, corsHeaders);
      }
      normalizedExpires = parsed.toISOString();
    }

    const contextValue = sanitizeContext(context);

    try {
      const { data: existingBlock, error: existingError } = await serviceClient
        .from("user_blocks")
        .select("id, status")
        .eq("blocker_id", authData.user.id)
        .eq("blocked_user_id", blockedUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        await logger.error("block_user_existing_lookup_failed", existingError, { blockedUserId });
        return jsonResponse({ error: "Failed to verify existing block" }, 500, corsHeaders);
      }

      const nowIso = new Date().toISOString();

      if (existingBlock && existingBlock.status === "active") {
        const { data: updatedBlock, error: updateError } = await serviceClient
          .from("user_blocks")
          .update({
            reason: normalizedReason,
            context: contextValue,
            expires_at: normalizedExpires,
            updated_at: nowIso,
          })
          .eq("id", existingBlock.id)
          .select("id, blocker_id, blocked_user_id, status, reason, context, expires_at, updated_at")
          .maybeSingle();

        if (updateError) {
          await logger.error("block_user_update_failed", updateError, { blockedUserId });
          return jsonResponse({ error: "Failed to update block" }, 500, corsHeaders);
        }

        await logger.info("block_user_updated", {
          block_id: updatedBlock?.id ?? null,
          blocked_user_id: blockedUserId,
          reason: normalizedReason,
        });

        return jsonResponse({ block: updatedBlock, correlationId: logger.correlationId }, 200, corsHeaders);
      }

      const { data: insertedBlock, error: insertError } = await serviceClient
        .from("user_blocks")
        .insert({
          blocker_id: authData.user.id,
          blocked_user_id: blockedUserId,
          reason: normalizedReason,
          context: contextValue,
          expires_at: normalizedExpires,
          status: "active",
        })
        .select("id, blocker_id, blocked_user_id, status, reason, context, expires_at, created_at")
        .maybeSingle();

      if (insertError) {
        await logger.error("block_user_insert_failed", insertError, { blockedUserId });
        return jsonResponse({ error: "Failed to block user" }, 500, corsHeaders);
      }

      await logger.info("block_user_created", {
        block_id: insertedBlock?.id ?? null,
        blocked_user_id: blockedUserId,
      });

      return jsonResponse({ block: insertedBlock, correlationId: logger.correlationId }, 201, corsHeaders);
    } catch (err) {
      await logger.error("block_user_unexpected_error", err, { blockedUserId });
      return jsonResponse({ error: "Unexpected error blocking user" }, 500, corsHeaders);
    }
  };
};

export { sanitizeContext };
