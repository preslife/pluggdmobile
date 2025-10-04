import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { RtcRole, RtcTokenBuilder } from "https://esm.sh/agora-access-token@2.0.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

const agoraAppId = Deno.env.get("AGORA_APP_ID");
const agoraAppCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");

if (!agoraAppId || !agoraAppCertificate) {
  console.warn("[create-live-session-token] Missing Agora credentials in environment");
}

const uuidToUint32 = (uuid: string) => {
  const sanitized = uuid.replace(/-/g, "").slice(0, 8) || "";
  const parsed = parseInt(sanitized || "0", 16);
  if (Number.isFinite(parsed) && parsed > 0) return parsed >>> 0;
  // fallback to random uid within 32-bit range (max Agora UID is 4294967295)
  return Math.floor(Math.random() * 4_000_000_000) + 1;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!agoraAppId || !agoraAppCertificate) {
      throw new Error("Agora credentials are not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userResult, error: userError } = await serviceClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Unable to authenticate user: ${userError.message}`);
    }

    const user = userResult.user;
    if (!user) {
      throw new Error("User not found for provided token");
    }

    const body = await req.json();
    const roomId: string | undefined = body?.room_id ?? body?.roomId;
    const requestedRole: string = (body?.role || "audience").toLowerCase();
    const ttlSeconds: number = Math.min(Math.max(Number(body?.ttl_seconds) || TOKEN_DEFAULT_TTL_SECONDS, 300), 60 * 60 * 3);

    if (!roomId) {
      throw new Error("room_id is required");
    }

    const { data: room, error: roomError } = await serviceClient
      .from("session_rooms")
      .select("id, host_id, title, status, is_public, agora_channel_name, agora_host_uid")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError || !room) {
      throw new Error(roomError?.message || "Session room not found");
    }

    const isHost = room.host_id === user.id;

    // Determine if user is allowed to join
    let participantRole: "host" | "collaborator" | "viewer" = "viewer";
    let allowJoin = false;

    if (isHost) {
      allowJoin = true;
      participantRole = "host";
    } else {
      const { data: participant, error: participantError } = await serviceClient
        .from("session_participants")
        .select("id, role, left_at")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .maybeSingle();

      if (participantError) {
        throw new Error(`Failed to validate participant: ${participantError.message}`);
      }

      if (participant && !participant.left_at) {
        allowJoin = true;
        participantRole = (participant.role as typeof participantRole) || "viewer";
      } else if (room.is_public === true) {
        allowJoin = true;
        participantRole = "viewer";
      }
    }

    if (!allowJoin) {
      throw new Error("You do not have access to this live session");
    }

    const channelName = room.agora_channel_name || `room_${room.id.replace(/-/g, "")}`;
    const agoraRole = (isHost || requestedRole === "host") ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const agoraUid = uuidToUint32(user.id);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = currentTimestamp + ttlSeconds;

    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      agoraAppId,
      agoraAppCertificate,
      channelName,
      agoraUid,
      agoraRole,
      privilegeExpireTs
    );

    // Persist metadata
    const updates: Record<string, unknown> = {
      agora_channel_name: channelName,
      agora_last_token_issued_at: new Date().toISOString(),
      agora_last_activity_at: new Date().toISOString(),
    };

    if (isHost) {
      updates["status"] = "live";
      updates["agora_host_uid"] = agoraUid;
      if (!room.agora_live_started_at) {
        updates["agora_live_started_at"] = new Date().toISOString();
      }
    }

    await serviceClient
      .from("session_rooms")
      .update(updates)
      .eq("id", roomId);

    // Upsert participant (service role bypasses RLS)
    await serviceClient
      .from("session_participants")
      .upsert({
        room_id: roomId,
        user_id: user.id,
        role: participantRole,
        joined_at: new Date().toISOString(),
        left_at: null,
      }, { onConflict: "room_id,user_id" });

    const responsePayload = {
      appId: agoraAppId,
      channelName,
      token: rtcToken,
      uid: agoraUid,
      role: isHost ? "host" : (participantRole === "collaborator" ? "collaborator" : "audience"),
      expiresAt: new Date(privilegeExpireTs * 1000).toISOString(),
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[create-live-session-token]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
