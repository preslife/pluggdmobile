import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type ReminderAction = "get" | "upsert";

type ReminderPayload = {
  lead_minutes?: number;
  auto_notify?: boolean;
};

const DEFAULT_SETTINGS: Required<ReminderPayload> = {
  lead_minutes: 30,
  auto_notify: true,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const getServiceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        persistSession: false,
      },
    },
  );

const authenticateRequest = async (req: Request, serviceClient: ReturnType<typeof createClient>) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Error("Invalid authorization token");
  }

  const {
    data: { user },
    error,
  } = await serviceClient.auth.getUser(token);

  if (error || !user) {
    throw new Error(error?.message || "Unable to authenticate request");
  }

  return user;
};

const mergeSettings = (existing: Record<string, unknown> | null | undefined, updates: ReminderPayload) => {
  const current = {
    ...DEFAULT_SETTINGS,
    ...(existing?.live_session_reminders as ReminderPayload | undefined),
  };

  return {
    ...existing,
    live_session_reminders: {
      lead_minutes: updates.lead_minutes ?? current.lead_minutes ?? DEFAULT_SETTINGS.lead_minutes,
      auto_notify: updates.auto_notify ?? current.auto_notify ?? DEFAULT_SETTINGS.auto_notify,
    },
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const serviceClient = getServiceClient();

  try {
    const user = await authenticateRequest(req, serviceClient);
    const body = await req.json().catch(() => ({}));

    const action: ReminderAction | undefined = body?.action;
    const payload: ReminderPayload = body?.payload ?? {};

    if (!action) {
      throw new Error("Action is required");
    }

    const { data: preferences, error: preferencesError } = await serviceClient
      .from("user_preferences")
      .select("id, locale_settings")
      .eq("user_id", user.id)
      .maybeSingle();

    if (preferencesError) {
      throw new Error(`Failed to load preferences: ${preferencesError.message}`);
    }

    if (action === "get") {
      const settings = (preferences?.locale_settings?.live_session_reminders as ReminderPayload | undefined) ?? DEFAULT_SETTINGS;

      return jsonResponse(200, {
        success: true,
        settings: {
          lead_minutes: settings.lead_minutes ?? DEFAULT_SETTINGS.lead_minutes,
          auto_notify: settings.auto_notify ?? DEFAULT_SETTINGS.auto_notify,
        },
      });
    }

    if (action === "upsert") {
      const nextSettings = mergeSettings(preferences?.locale_settings ?? {}, payload);

      if (preferences?.id) {
        const { error } = await serviceClient
          .from("user_preferences")
          .update({
            locale_settings: nextSettings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", preferences.id);

        if (error) {
          throw new Error(`Failed to update reminder settings: ${error.message}`);
        }
      } else {
        const { error } = await serviceClient
          .from("user_preferences")
          .insert({
            user_id: user.id,
            locale_settings: nextSettings,
          });

        if (error) {
          throw new Error(`Failed to save reminder settings: ${error.message}`);
        }
      }

      return jsonResponse(200, {
        success: true,
        settings: nextSettings.live_session_reminders,
      });
    }

    return jsonResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    console.error("[live-session-reminders]", error);
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});
