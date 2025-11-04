import {
  createPreferenceCache,
  NotificationPreferenceKey,
  shouldSendNotification,
} from "../_shared/notificationPreferences.ts";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

export type NotificationType = "system" | "order" | "tip" | "membership" | "moderation" | "social";

export type BroadcastNotificationPayload = {
  recipients: string[];
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
  relatedId?: string | null;
  relatedType?: string | null;
  preferenceKey?: NotificationPreferenceKey;
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
  rpc?: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

export interface BroadcastNotificationHandlerOptions {
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

const preferenceMap: Record<NotificationType, NotificationPreferenceKey> = {
  system: "notify_push",
  order: "notify_purchases",
  tip: "notify_supporters",
  membership: "notify_supporters",
  moderation: "notify_push",
  social: "notify_follows",
};

const sanitizePayload = (raw: unknown): Record<string, unknown> | null => {
  if (!raw) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
};

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

export const createBroadcastNotificationHandler = ({
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  createClient,
  corsHeaders = defaultCorsHeaders,
}: BroadcastNotificationHandlerOptions) => {
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
      component: "broadcast_notification",
      feature: "notifications",
      userId: authData.user.id,
      correlationId: req.headers.get("x-correlation-id") ?? generateCorrelationId(),
    });

    try {
      await ensureAdmin(serviceClient, authData.user.id);
    } catch (err) {
      await logger.warn("broadcast_notification_admin_check_failed", err instanceof Error ? err.message : err);
      return jsonResponse({ error: err instanceof Error ? err.message : "Access denied" }, 403, corsHeaders);
    }

    let payload: BroadcastNotificationPayload | null = null;
    try {
      payload = await req.json() as BroadcastNotificationPayload;
    } catch (error) {
      await logger.error("broadcast_notification_invalid_json", error);
      return jsonResponse({ error: "Invalid JSON payload" }, 400, corsHeaders);
    }

    if (!payload) {
      await logger.warn("broadcast_notification_missing_payload");
      return jsonResponse({ error: "Request body required" }, 400, corsHeaders);
    }

    const { recipients, type, title, message, payload: rawPayload, relatedId, relatedType, preferenceKey } = payload;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      await logger.warn("broadcast_notification_no_recipients");
      return jsonResponse({ error: "recipients must include at least one user id" }, 400, corsHeaders);
    }

    if (!title || !message || !type) {
      await logger.warn("broadcast_notification_missing_fields", {
        hasTitle: Boolean(title),
        hasMessage: Boolean(message),
        type,
      });
      return jsonResponse({ error: "title, message, and type are required" }, 400, corsHeaders);
    }

    if (!Object.prototype.hasOwnProperty.call(preferenceMap, type)) {
      await logger.warn("broadcast_notification_invalid_type", { type });
      return jsonResponse({ error: "Unsupported notification type" }, 400, corsHeaders);
    }

    const uniqueRecipients = Array.from(new Set(recipients.filter((id) => typeof id === "string" && id.trim().length > 0)));
    if (uniqueRecipients.length === 0) {
      await logger.warn("broadcast_notification_recipients_empty_after_filter", { originalCount: recipients.length });
      return jsonResponse({ error: "No valid recipient ids provided" }, 400, corsHeaders);
    }

    const preferenceKeyToUse = preferenceKey ?? preferenceMap[type];
    const cache = createPreferenceCache();
    const sanitizedPayload = sanitizePayload(rawPayload);

    const inserted: Array<{ id: string; user_id: string }> = [];
    const skipped: Array<{ userId: string; reason: string }> = [];

    for (const recipient of uniqueRecipients) {
      try {
        const enabled = await shouldSendNotification(serviceClient as any, cache, recipient, preferenceKeyToUse);
        if (!enabled) {
          skipped.push({ userId: recipient, reason: "preference_opt_out" });
          continue;
        }

        const { data, error } = await serviceClient
          .from("notifications")
          .insert({
            user_id: recipient,
            type,
            title,
            message,
            payload: sanitizedPayload ?? {},
            related_id: relatedId ?? null,
            related_type: relatedType ?? null,
            type_enum: type,
          })
          .select("id, user_id")
          .maybeSingle();

        if (error) {
          skipped.push({ userId: recipient, reason: error.message });
          await logger.error("broadcast_notification_insert_failed", error, { recipient });
          continue;
        }

        if (data) {
          inserted.push({ id: data.id, user_id: data.user_id });
        }
      } catch (err) {
        skipped.push({ userId: recipient, reason: err instanceof Error ? err.message : String(err) });
        await logger.error("broadcast_notification_unexpected_per_recipient", err, { recipient });
      }
    }

    await logger.info("broadcast_notification_completed", {
      total_requested: recipients.length,
      total_inserted: inserted.length,
      total_skipped: skipped.length,
      notification_type: type,
      preference_key: preferenceKeyToUse,
    });

    return jsonResponse({
      correlationId: logger.correlationId,
      inserted,
      skipped,
    }, 200, corsHeaders);
  };
};
