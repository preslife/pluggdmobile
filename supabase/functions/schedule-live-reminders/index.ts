import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type ScheduleRequest = {
  room_id?: string;
  scheduled_for?: string | null;
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

const getReminderSettings = async (
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
) => {
  const { data, error } = await serviceClient
    .from("user_preferences")
    .select("locale_settings")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[schedule-live-reminders] Failed to fetch reminder settings", error);
    return { lead_minutes: 30, auto_notify: true };
  }

  const preferences = data?.locale_settings?.live_session_reminders as
    | { lead_minutes?: number; auto_notify?: boolean }
    | undefined;

  return {
    lead_minutes: preferences?.lead_minutes ?? 30,
    auto_notify: preferences?.auto_notify ?? true,
  };
};

const scheduleReminder = async (
  serviceClient: ReturnType<typeof createClient>,
  roomId: string,
  hostId: string,
  scheduledFor: string,
  leadMinutes: number,
) => {
  const reminderAt = new Date(new Date(scheduledFor).getTime() - leadMinutes * 60 * 1000);
  if (Number.isNaN(reminderAt.getTime())) {
    throw new Error("Invalid scheduled time");
  }

  try {
    const { error } = await serviceClient
      .from("live_session_reminders")
      .upsert(
        {
          room_id: roomId,
          host_id: hostId,
          scheduled_for: scheduledFor,
          reminder_at: reminderAt.toISOString(),
        },
        { onConflict: "room_id" },
      );

    if (error) {
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("does not exist")) {
      console.warn(
        "[schedule-live-reminders] live_session_reminders table missing, skipping persistent schedule",
      );
      return;
    }

    throw error;
  }
};

const clearReminder = async (serviceClient: ReturnType<typeof createClient>, roomId: string) => {
  try {
    const { error } = await serviceClient
      .from("live_session_reminders")
      .delete()
      .eq("room_id", roomId);

    if (error) {
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("does not exist")) {
      console.warn(
        "[schedule-live-reminders] live_session_reminders table missing, skipping reminder cleanup",
      );
      return;
    }

    throw error;
  }
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
    const body: ScheduleRequest = await req.json().catch(() => ({}));

    if (!body.room_id) {
      throw new Error("room_id is required");
    }

    const { data: room, error: roomError } = await serviceClient
      .from("session_rooms")
      .select("id, host_id")
      .eq("id", body.room_id)
      .maybeSingle();

    if (roomError) {
      throw new Error(`Failed to load session room: ${roomError.message}`);
    }

    if (!room) {
      throw new Error("Session room not found");
    }

    if (room.host_id !== user.id) {
      throw new Error("You do not have permission to schedule reminders for this session");
    }

    if (!body.scheduled_for) {
      await clearReminder(serviceClient, body.room_id);
      return jsonResponse(200, { success: true, cleared: true });
    }

    const settings = await getReminderSettings(serviceClient, user.id);

    if (!settings.auto_notify) {
      await clearReminder(serviceClient, body.room_id);
      return jsonResponse(200, { success: true, skipped: true, reason: "auto_notify_disabled" });
    }

    await scheduleReminder(serviceClient, body.room_id, room.host_id, body.scheduled_for, settings.lead_minutes);

    return jsonResponse(200, {
      success: true,
      reminder_at: new Date(new Date(body.scheduled_for).getTime() - settings.lead_minutes * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("[schedule-live-reminders]", error);
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});
