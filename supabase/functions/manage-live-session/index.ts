import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ManageAction = "create" | "update" | "delete";

interface ManageLiveSessionRequest {
  action: ManageAction;
  userId: string;
  session: {
    id?: string;
    title?: string;
    description?: string | null;
    scheduled_at?: string;
    duration_minutes?: number;
    max_participants?: number | null;
    price_cents?: number | null;
    is_public?: boolean;
    host_id?: string;
  };
}

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const missing = requiredEnv.filter((key) => !Deno.env.get(key));
if (missing.length) {
  console.warn(`[manage-live-session] Missing environment variables: ${missing.join(", ")}`);
}

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

const scheduleReminders = async (
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  payload: {
    sessionId: string;
    hostId: string;
    title: string;
    scheduledAt: string;
    durationMinutes?: number;
    maxParticipants?: number | null;
    priceCents?: number | null;
    mode?: "schedule" | "cancel";
  },
) => {
  const { error } = await supabaseAdmin.functions.invoke("schedule-live-reminders", {
    body: payload,
  });

  if (error) {
    console.error("[manage-live-session] Failed to schedule reminders", error);
    throw new Error(error.message ?? "Failed to schedule reminders");
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, session, userId } = (await req.json()) as ManageLiveSessionRequest;

    if (!userId || !action || !session) {
      return jsonResponse(400, { error: "Missing required fields" });
    }

    if ((action === "create" || action === "update") && !session.title) {
      return jsonResponse(400, { error: "Title is required" });
    }

    if ((action === "create" || action === "update") && !session.scheduled_at) {
      return jsonResponse(400, { error: "Scheduled time is required" });
    }

    const supabaseAdmin = createAdminClient();

    if (action === "create") {
      const payload = {
        title: session.title,
        description: session.description ?? null,
        scheduled_at: session.scheduled_at,
        duration_minutes: session.duration_minutes ?? 60,
        max_participants: session.max_participants ?? null,
        price_cents: session.price_cents ?? 0,
        is_public: session.is_public ?? true,
        status: "scheduled",
        host_id: userId,
      };

      if (payload.price_cents < 0) {
        return jsonResponse(400, { error: "Price must be zero or greater" });
      }

      const { data, error } = await supabaseAdmin.from("sessions").insert(payload).select().single();
      if (error) {
        console.error("[manage-live-session] Create error", error);
        return jsonResponse(500, { error: error.message });
      }

      await scheduleReminders(supabaseAdmin, {
        sessionId: data.id,
        hostId: userId,
        title: data.title,
        scheduledAt: data.scheduled_at,
        durationMinutes: data.duration_minutes,
        maxParticipants: data.max_participants,
        priceCents: data.price_cents,
        mode: "schedule",
      });

      return jsonResponse(200, { session: data });
    }

    if (!session.id) {
      return jsonResponse(400, { error: "Session id is required" });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", session.id)
      .single();

    if (fetchError || !existing) {
      console.error("[manage-live-session] Unable to load session", fetchError);
      return jsonResponse(404, { error: "Session not found" });
    }

    if (existing.host_id !== userId) {
      return jsonResponse(403, { error: "You do not have permission to modify this session" });
    }

    if (action === "delete") {
      const { count: soldCount, error: soldError } = await supabaseAdmin
        .from("live_tickets")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .neq("status", "refunded");

      if (soldError) {
        console.error("[manage-live-session] Unable to inspect tickets", soldError);
        return jsonResponse(500, { error: soldError.message });
      }

      if ((soldCount ?? 0) > 0) {
        return jsonResponse(400, {
          error: "You cannot delete a session with active ticket holders. Refund or transfer them first.",
        });
      }

      const { error: deleteError } = await supabaseAdmin.from("sessions").delete().eq("id", session.id);
      if (deleteError) {
        console.error("[manage-live-session] Delete error", deleteError);
        return jsonResponse(500, { error: deleteError.message });
      }

      await scheduleReminders(supabaseAdmin, {
        sessionId: session.id,
        hostId: userId,
        title: existing.title,
        scheduledAt: existing.scheduled_at,
        durationMinutes: existing.duration_minutes,
        maxParticipants: existing.max_participants,
        priceCents: existing.price_cents,
        mode: "cancel",
      });

      return jsonResponse(200, { success: true });
    }

    const updates: Record<string, unknown> = {};
    if (session.title !== undefined) updates["title"] = session.title;
    if (session.description !== undefined) updates["description"] = session.description;
    if (session.scheduled_at !== undefined) updates["scheduled_at"] = session.scheduled_at;
    if (session.duration_minutes !== undefined) updates["duration_minutes"] = session.duration_minutes;
    if (session.max_participants !== undefined) updates["max_participants"] = session.max_participants;
    if (session.price_cents !== undefined) updates["price_cents"] = session.price_cents;
    if (session.is_public !== undefined) updates["is_public"] = session.is_public;

    if (typeof updates["price_cents"] === "number" && (updates["price_cents"] as number) < 0) {
      return jsonResponse(400, { error: "Price must be zero or greater" });
    }

    if (typeof updates["max_participants"] === "number") {
      const targetSeats = updates["max_participants"] as number;
      if (targetSeats > 0) {
        const { count: soldCount, error: soldError } = await supabaseAdmin
          .from("live_tickets")
          .select("id", { count: "exact", head: true })
          .eq("session_id", session.id)
          .neq("status", "refunded");

        if (soldError) {
          console.error("[manage-live-session] Unable to validate seat cap", soldError);
          return jsonResponse(500, { error: soldError.message });
        }

        if ((soldCount ?? 0) > targetSeats) {
          return jsonResponse(400, {
            error: "Seat cap cannot be lower than the number of tickets already sold.",
          });
        }
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("sessions")
      .update(updates)
      .eq("id", session.id)
      .select()
      .single();

    if (updateError) {
      console.error("[manage-live-session] Update error", updateError);
      return jsonResponse(500, { error: updateError.message });
    }

    await scheduleReminders(supabaseAdmin, {
      sessionId: updated.id,
      hostId: userId,
      title: updated.title,
      scheduledAt: updated.scheduled_at,
      durationMinutes: updated.duration_minutes,
      maxParticipants: updated.max_participants,
      priceCents: updated.price_cents,
      mode: "schedule",
    });

    return jsonResponse(200, { session: updated });
  } catch (error) {
    console.error("[manage-live-session] Unexpected error", error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : "Unexpected error" });
  }
});
