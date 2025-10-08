import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type ManageLiveSessionsAction = "create" | "update" | "delete";

type ManageLiveSessionsPayload = {
  room_id?: string;
  title?: string;
  description?: string | null;
  scheduled_for?: string | null;
  status?: "idle" | "live" | "ended" | string;
  is_public?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const createResponse = (status: number, body: Record<string, unknown>) =>
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

type AuthenticatedUser = {
  id: string;
};

const authenticateRequest = async (req: Request, serviceClient: ReturnType<typeof createClient>): Promise<AuthenticatedUser> => {
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

  return { id: user.id };
};

const ensureHostOwnsRoom = async (
  serviceClient: ReturnType<typeof createClient>,
  roomId: string,
  hostId: string,
) => {
  const { data, error } = await serviceClient
    .from("session_rooms")
    .select("id, host_id")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify session ownership: ${error.message}`);
  }

  if (!data || data.host_id !== hostId) {
    throw new Error("You do not have permission to modify this session");
  }
};

const scheduleReminderIfNeeded = async (
  serviceClient: ReturnType<typeof createClient>,
  roomId: string,
  scheduledFor: string | null | undefined,
) => {
  if (!scheduledFor) return;

  try {
    await serviceClient.functions.invoke("schedule-live-reminders", {
      body: {
        room_id: roomId,
        scheduled_for: scheduledFor,
      },
    });
  } catch (error) {
    console.error("[manage-live-sessions] Failed to schedule reminders", error);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse(405, { error: "Method not allowed" });
  }

  const serviceClient = getServiceClient();

  try {
    const user = await authenticateRequest(req, serviceClient);
    const body = await req.json().catch(() => ({}));

    const action: ManageLiveSessionsAction | undefined = body?.action;
    const payload: ManageLiveSessionsPayload = body?.payload ?? {};

    if (!action) {
      throw new Error("Action is required");
    }

    if (action === "create") {
      if (!payload.title?.trim()) {
        throw new Error("Title is required to create a session");
      }

      const insertPayload = {
        title: payload.title.trim(),
        description: payload.description ?? null,
        host_id: user.id,
        status: payload.status ?? "idle",
        is_public: payload.is_public ?? true,
        scheduled_for: payload.scheduled_for ?? null,
      };

      const { data, error } = await serviceClient
        .from("session_rooms")
        .insert(insertPayload)
        .select("id, title, status, scheduled_for, is_public, description, host_id")
        .single();

      if (error) {
        throw new Error(`Failed to create session: ${error.message}`);
      }

      await scheduleReminderIfNeeded(serviceClient, data.id, insertPayload.scheduled_for);

      return createResponse(200, {
        success: true,
        room: data,
      });
    }

    if (action === "update") {
      if (!payload.room_id) {
        throw new Error("room_id is required to update a session");
      }

      await ensureHostOwnsRoom(serviceClient, payload.room_id, user.id);

      const updates: Record<string, unknown> = {};

      if (typeof payload.title === "string") updates.title = payload.title.trim();
      if (payload.description !== undefined) updates.description = payload.description;
      if (payload.status) updates.status = payload.status;
      if (payload.is_public !== undefined) updates.is_public = payload.is_public;
      if (payload.scheduled_for !== undefined) updates.scheduled_for = payload.scheduled_for;

      if (Object.keys(updates).length === 0) {
        throw new Error("No updates provided");
      }

      const { data, error } = await serviceClient
        .from("session_rooms")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.room_id)
        .select("id, title, status, scheduled_for, is_public, description, host_id")
        .single();

      if (error) {
        throw new Error(`Failed to update session: ${error.message}`);
      }

      await scheduleReminderIfNeeded(
        serviceClient,
        payload.room_id,
        updates.scheduled_for as string | null | undefined,
      );

      return createResponse(200, {
        success: true,
        room: data,
      });
    }

    if (action === "delete") {
      if (!payload.room_id) {
        throw new Error("room_id is required to delete a session");
      }

      await ensureHostOwnsRoom(serviceClient, payload.room_id, user.id);

      const { error } = await serviceClient
        .from("session_rooms")
        .delete()
        .eq("id", payload.room_id);

      if (error) {
        throw new Error(`Failed to delete session: ${error.message}`);
      }

      return createResponse(200, { success: true });
    }

    return createResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    console.error("[manage-live-sessions]", error);
    return createResponse(400, {
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});
