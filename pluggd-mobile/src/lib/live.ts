import { supabase } from "./supabase";

export type AgoraJoinPayload = {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
  role: "host" | "collaborator" | "audience";
  expiresAt: string;
  liveMode?: string;
  modeConfig?: { video_enabled?: boolean };
};

export async function fetchLiveToken(params: { roomId: string; role?: "host" | "audience" | "collaborator" }) {
  const { roomId, role = "audience" } = params;
  const { data, error } = await supabase.functions.invoke<AgoraJoinPayload>("create-live-session-token", {
    body: { room_id: roomId, role, ...(role === "host" ? { defer_live_status: true } : {}) },
  });
  if (error || !data || (data as any).error) throw new Error(error?.message || (data as any)?.error || "Failed to get live token");
  return data;
}

export async function confirmLiveStarted(roomId: string, token: Pick<AgoraJoinPayload, "channelName" | "uid">) {
  const { data, error } = await supabase.functions.invoke("live-runtime-ops", {
    body: {
      action: "confirm_live_started",
      payload: { room_id: roomId, channel_name: token.channelName, host_uid: token.uid },
    },
  });
  if (error || data?.error || data?.success !== true) {
    throw new Error("Your stream could not be confirmed. Please try connecting again.");
  }
}
