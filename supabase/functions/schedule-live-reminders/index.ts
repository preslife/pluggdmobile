import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleReminderRequest {
  sessionId: string;
  hostId: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  maxParticipants?: number | null;
  priceCents?: number | null;
  mode?: "schedule" | "cancel";
}

const REMINDER_DELTAS: Array<{ type: "24h" | "1h"; minutes: number }> = [
  { type: "24h", minutes: 24 * 60 },
  { type: "1h", minutes: 60 },
];

const createAdminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: { persistSession: false },
    },
  );

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

const buildIcs = (payload: ScheduleReminderRequest) => {
  const start = new Date(payload.scheduledAt);
  const durationMinutes = payload.durationMinutes ?? 60;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const toUtcString = (date: Date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}` +
    `T${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}${String(date.getUTCSeconds()).padStart(2, "0")}Z`;

  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Pluggd//Live Session//EN\nCALSCALE:GREGORIAN\n` +
    `BEGIN:VEVENT\nUID:${payload.sessionId}@pluggd.com\nDTSTAMP:${toUtcString(new Date())}\nDTSTART:${toUtcString(start)}\nDTEND:${toUtcString(end)}\n` +
    `SUMMARY:${payload.title}\nDESCRIPTION:Join ${payload.title} on Pluggd\nLOCATION:Pluggd Live\nEND:VEVENT\nEND:VCALENDAR`;
};

const uploadIcs = async (supabaseAdmin: ReturnType<typeof createAdminClient>, sessionId: string, ics: string) => {
  const bucket = "session-files";
  const path = `reminders/${sessionId}.ics`;
  const bytes = new TextEncoder().encode(ics);
  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, {
    cacheControl: "86400",
    contentType: "text/calendar",
    upsert: true,
  });

  if (uploadError) {
    console.error("[schedule-live-reminders] Failed to upload ICS", uploadError);
    throw new Error(uploadError.message);
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as ScheduleReminderRequest;
    if (!payload.sessionId || !payload.hostId || !payload.title || !payload.scheduledAt) {
      return jsonResponse(400, { error: "Missing required fields" });
    }

    const supabaseAdmin = createAdminClient();

    if (payload.mode === "cancel") {
      await supabaseAdmin
        .from("live_session_reminders")
        .delete()
        .eq("session_id", payload.sessionId);

      await supabaseAdmin.from("notifications").insert({
        user_id: payload.hostId,
        type: "live_session",
        title: `Reminders cancelled for ${payload.title}`,
        message: "All pending reminders were removed after the session was cancelled.",
        related_id: payload.sessionId,
        related_type: "session",
      });

      return jsonResponse(200, { cancelled: true });
    }

    const start = new Date(payload.scheduledAt);
    if (Number.isNaN(start.getTime())) {
      return jsonResponse(400, { error: "Invalid scheduledAt" });
    }

    const upcomingReminders = REMINDER_DELTAS.map((delta) => ({
      type: delta.type,
      sendAt: new Date(start.getTime() - delta.minutes * 60 * 1000),
    })).filter((reminder) => reminder.sendAt.getTime() > Date.now());

    const { data: ticketRows, error: ticketsError } = await supabaseAdmin
      .from("live_tickets")
      .select("user_id")
      .eq("session_id", payload.sessionId)
      .neq("status", "refunded");

    if (ticketsError) {
      console.error("[schedule-live-reminders] Unable to fetch ticket holders", ticketsError);
      return jsonResponse(500, { error: ticketsError.message });
    }

    const userIds = new Set<string>();
    userIds.add(payload.hostId);
    for (const ticket of ticketRows ?? []) {
      if (ticket.user_id) {
        userIds.add(ticket.user_id);
      }
    }

    const ics = buildIcs(payload);
    const icsUrl = await uploadIcs(supabaseAdmin, payload.sessionId, ics);

    await supabaseAdmin
      .from("live_session_reminders")
      .delete()
      .eq("session_id", payload.sessionId);

    const rows = [] as Array<{
      session_id: string;
      user_id: string;
      reminder_type: "24h" | "1h";
      send_at: string;
      ics_url: string | null;
      title: string;
    }>;

    for (const userId of userIds) {
      for (const reminder of upcomingReminders) {
        rows.push({
          session_id: payload.sessionId,
          user_id: userId,
          reminder_type: reminder.type,
          send_at: reminder.sendAt.toISOString(),
          ics_url: icsUrl,
          title: payload.title,
        });
      }
    }

    if (rows.length) {
      const { error: insertError } = await supabaseAdmin.from("live_session_reminders").insert(rows);
      if (insertError) {
        console.error("[schedule-live-reminders] Unable to queue reminders", insertError);
        return jsonResponse(500, { error: insertError.message });
      }
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: payload.hostId,
      type: "live_session",
      title: `Reminders scheduled for ${payload.title}`,
      message: upcomingReminders.length
        ? `We'll notify attendees ${upcomingReminders.map((r) => r.type).join(" & ")}.`
        : "Session is too close for automated reminders, but the ICS file has been refreshed.",
      related_id: payload.sessionId,
      related_type: "session",
      data: {
        reminder_count: rows.length,
        ics_url: icsUrl,
        scheduled_at: payload.scheduledAt,
      },
    });

    const attendees = Array.from(userIds);
    for (const reminder of upcomingReminders) {
      for (const attendee of attendees) {
        await supabaseAdmin.functions.invoke("send-lifecycle-emails", {
          body: {
            user_id: attendee,
            email_type: "live_session_reminder",
            user_data: {
              reminder_type: reminder.type,
              session_title: payload.title,
              scheduled_at: payload.scheduledAt,
              ics_url: icsUrl,
              send_at: reminder.sendAt.toISOString(),
            },
          },
        });
      }
    }

    return jsonResponse(200, {
      scheduled: true,
      reminders: rows.length,
      attendees: attendees.length,
      ics_url: icsUrl,
    });
  } catch (error) {
    console.error("[schedule-live-reminders] Unexpected error", error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unexpected error" });
  }
});
