import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type RecordingAction = "attach" | "update" | "delete";

type RecordingPayload = {
  recording_id?: string;
  session_id?: string;
  title?: string;
  playback_url?: string | null;
  duration_seconds?: number | null;
  published_at?: string | null;
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

const ensureSessionOwnership = async (
  serviceClient: ReturnType<typeof createClient>,
  sessionId: string,
  hostId: string,
) => {
  const { data, error } = await serviceClient
    .from("session_rooms")
    .select("id, host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify session ownership: ${error.message}`);
  }

  if (!data || data.host_id !== hostId) {
    throw new Error("You do not have permission to manage recordings for this session");
  }
};

const ensureRecordingOwnership = async (
  serviceClient: ReturnType<typeof createClient>,
  recordingId: string,
  hostId: string,
) => {
  const { data, error } = await serviceClient
    .from("session_recordings")
    .select("id, session_id")
    .eq("id", recordingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify recording: ${error.message}`);
  }

  if (!data) {
    throw new Error("Recording not found");
  }

  await ensureSessionOwnership(serviceClient, data.session_id, hostId);
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

    const action: RecordingAction | undefined = body?.action;
    const payload: RecordingPayload = body?.payload ?? {};

    if (!action) {
      throw new Error("Action is required");
    }

    if (action === "attach") {
      if (!payload.session_id || !payload.title?.trim()) {
        throw new Error("session_id and title are required to attach a recording");
      }

      await ensureSessionOwnership(serviceClient, payload.session_id, user.id);

      const insertPayload = {
        session_id: payload.session_id,
        host_id: user.id,
        title: payload.title.trim(),
        playback_url: payload.playback_url ?? null,
        duration_seconds: payload.duration_seconds ?? null,
        published_at: payload.published_at ?? null,
      };

      const { data, error } = await serviceClient
        .from("session_recordings")
        .insert(insertPayload)
        .select("id, session_id, host_id, title, playback_url, published_at, created_at")
        .single();

      if (error) {
        throw new Error(`Failed to attach recording: ${error.message}`);
      }

      return jsonResponse(200, {
        success: true,
        recording: data,
      });
    }

    if (action === "update") {
      if (!payload.recording_id) {
        throw new Error("recording_id is required to update a recording");
      }

      await ensureRecordingOwnership(serviceClient, payload.recording_id, user.id);

      const updates: Record<string, unknown> = {};

      if (typeof payload.title === "string") updates.title = payload.title.trim();
      if (payload.playback_url !== undefined) updates.playback_url = payload.playback_url;
      if (payload.duration_seconds !== undefined) updates.duration_seconds = payload.duration_seconds;
      if (payload.published_at !== undefined) updates.published_at = payload.published_at;

      if (Object.keys(updates).length === 0) {
        throw new Error("No updates provided");
      }

      const { data, error } = await serviceClient
        .from("session_recordings")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.recording_id)
        .select("id, session_id, host_id, title, playback_url, published_at, created_at")
        .single();

      if (error) {
        throw new Error(`Failed to update recording: ${error.message}`);
      }

      return jsonResponse(200, {
        success: true,
        recording: data,
      });
    }

    if (action === "delete") {
      if (!payload.recording_id) {
        throw new Error("recording_id is required to delete a recording");
      }

      await ensureRecordingOwnership(serviceClient, payload.recording_id, user.id);

      const { error } = await serviceClient
        .from("session_recordings")
        .delete()
        .eq("id", payload.recording_id);

      if (error) {
        throw new Error(`Failed to delete recording: ${error.message}`);
      }

      return jsonResponse(200, { success: true });
    }

    return jsonResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    console.error("[session-recording-manager]", error);
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});
