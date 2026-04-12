import { supabase } from "./supabase";

export type AgoraJoinPayload = {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
  role: "host" | "collaborator" | "audience";
  expiresAt: string;
};

export async function fetchLiveToken(params: { roomId: string; role?: "host" | "audience" | "collaborator" }) {
  const { roomId, role = "audience" } = params;
  const { data, error } = await supabase.functions.invoke<AgoraJoinPayload>("create-live-session-token", {
    body: { room_id: roomId, role },
  });
  if (error || !data) throw new Error(error?.message || "Failed to get live token");
  return data;
}
