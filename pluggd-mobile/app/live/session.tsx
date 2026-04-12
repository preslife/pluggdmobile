
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, PermissionsAndroid, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from "react-native";
import { fetchLiveToken } from "../../src/lib/live";
import {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  createAgoraRtcEngine,
} from "react-native-agora";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/context/AuthProvider";

type ChatMessage = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
};

export default function LiveSession() {
  const router = useRouter();
  const { roomId, role } = useLocalSearchParams<{ roomId?: string; role?: string }>();
  const { user } = useAuth();
  const [status, setStatus] = useState<"connecting" | "joined" | "error">("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [tokenInfo, setTokenInfo] = useState<{ channelName: string; token: string; uid: number; appId: string }>();
  const engineRef = useRef<IRtcEngine | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isHost = useMemo(() => (role ?? "audience") === "host", [role]);

  useEffect(() => {
    const start = async () => {
      try {
        if (!user) {
          Alert.alert("Sign in required", "Please log in to join live sessions", [
            { text: "Go to Login", onPress: () => router.push("/auth/login") },
            { text: "Cancel", style: "cancel" },
          ]);
          setStatus("error");
          return;
        }

        await ensurePermissions();
        await bootstrapChat();
        const token = await fetchLiveToken({ roomId: roomId || "demo-room", role: isHost ? "host" : "audience" });
        setTokenInfo(token);
        initAgora(token);
      } catch (e) {
        console.warn("Live init failed", e);
        setStatus("error");
      }
    };
    start();
    return () => {
      engineRef.current?.leaveChannel();
      engineRef.current?.release();
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [roomId, isHost]);

  const ensurePermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }
  };

  const bootstrapChat = async () => {
    const currentRoom = roomId || "demo-room";
    const { data, error } = await supabase
      .from("session_messages")
      .select("*")
      .eq("session_id", currentRoom)
      .order("created_at", { ascending: true })
      .limit(50);
    if (!error && data) setMessages(data);

    // subscribe for new messages
    const channel = supabase
      .channel(`session-chat-${currentRoom}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "session_messages", filter: `session_id=eq.${currentRoom}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;
  };

  const initAgora = (token: { appId: string; channelName: string; token: string; uid: number }) => {
    const engine = createAgoraRtcEngine();
    engineRef.current = engine;
    engine.registerEventHandler({
      onJoinChannelSuccess: () => setStatus("joined"),
      onUserJoined: (_connection, uid) => setRemoteUsers((prev) => [...new Set([...prev, uid])]),
      onUserOffline: (_connection, uid) => setRemoteUsers((prev) => prev.filter((id) => id !== uid)),
      onError: (_connection, err, msg) => {
        console.warn("agora error", err, msg);
        setStatus("error");
      },
    });

    engine.initialize({
      appId: token.appId,
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });
    engine.enableVideo();
    engine.startPreview();
    engine.joinChannel(token.token, token.channelName, token.uid, {
      clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    const messageText = input.trim();
    setInput("");
    const currentRoom = roomId || "demo-room";
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      content: messageText,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    await supabase.from("session_messages").insert({
      content: messageText,
      session_id: currentRoom,
      user_id: user.id,
    });
  };

  return (
    <View className="flex-1 bg-background-dark h-full">
      {/* Video Area */}
      <View className="relative w-full aspect-[4/3] bg-zinc-900 overflow-hidden">
        {status === "joined" && tokenInfo ? (
          <>
            <RtcSurfaceView
              canvas={{ uid: isHost ? 0 : tokenInfo.uid }}
              style={{ flex: 1 }}
              className="w-full h-full"
            />
            {remoteUsers[0] && (
              <View className="absolute bottom-3 right-3 w-32 h-48 border border-white/10 rounded-xl overflow-hidden">
                <RtcSurfaceView canvas={{ uid: remoteUsers[0] }} style={{ flex: 1 }} />
              </View>
            )}
          </>
        ) : (
          <View className="absolute inset-0 items-center justify-center">
            <Text className="material-symbols-outlined text-white/40 text-6xl">hourglass_top</Text>
            <Text className="text-white/70 mt-2">
              {status === "error" ? "Failed to join. Check token." : "Connecting…"}
            </Text>
          </View>
        )}
        <View className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

        {/* Top Bar */}
        <View className="absolute top-0 left-0 right-0 p-4 pt-12 flex-row items-center justify-between z-20">
          <TouchableOpacity onPress={() => router.back()} className="size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md">
            <Text className="material-symbols-outlined text-white">arrow_back</Text>
          </TouchableOpacity>
          <TouchableOpacity className="size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md">
            <Text className="material-symbols-outlined text-white">more_horiz</Text>
          </TouchableOpacity>
        </View>

        {/* Status Chips */}
        <View className="absolute bottom-4 left-4 flex-row gap-2 z-20">
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm shadow-lg shadow-primary/20">
            <View className="size-2 rounded-full bg-white opacity-100" />
            <Text className="text-xs font-bold tracking-wider text-white">LIVE</Text>
          </View>
          <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
            <Text className="material-symbols-outlined text-white/80 text-[16px]">visibility</Text>
            <Text className="text-xs font-medium text-white">{remoteUsers.length + 1}</Text>
          </View>
        </View>
      </View>

      {/* Content Area */}
      <View className="flex-1 bg-background-dark relative">
        {/* Tabs */}
        <View className="flex-row border-b border-white/10 px-6">
          <TouchableOpacity className="flex-1 pb-3 pt-4 border-b-2 border-primary">
            <Text className="text-white font-semibold text-sm tracking-wide text-center">Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 pb-3 pt-4 border-b-2 border-transparent">
            <Text className="text-zinc-500 font-medium text-sm tracking-wide text-center">Q&A</Text>
          </TouchableOpacity>
        </View>

        {/* Chat Stream */}
        <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 16, paddingBottom: 100 }}>
          {messages.map((msg) => (
            <View key={msg.id} className="flex-row gap-3 items-start">
              <View className="size-8 rounded-full bg-zinc-700" />
              <View className="flex-1">
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-sm font-bold text-zinc-300">{msg.user_id.slice(0, 6)}</Text>
                  <Text className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleTimeString()}</Text>
                </View>
                <Text className="text-sm text-zinc-200 leading-snug">{msg.content}</Text>
              </View>
            </View>
          ))}
          {messages.length === 0 && (
            <Text className="text-center text-zinc-500">No messages yet. Say hi!</Text>
          )}
        </ScrollView>

        {/* Floating Reactions */}
        <View className="absolute right-4 bottom-24 items-center gap-4 z-20">
          <TouchableOpacity className="size-12 rounded-full bg-surface-dark/80 items-center justify-center border border-white/5 shadow-lg">
            <Text className="material-symbols-outlined text-orange-500 text-2xl">local_fire_department</Text>
          </TouchableOpacity>
          <TouchableOpacity className="size-12 rounded-full bg-surface-dark/80 items-center justify-center border border-white/5 shadow-lg">
            <Text className="material-symbols-outlined text-red-500 text-2xl">favorite</Text>
          </TouchableOpacity>
        </View>

        {/* Input Area */}
        <View className="w-full bg-surface-dark border-t border-white/10 p-4 pb-8 z-30">
          <View className="flex-row items-center gap-3">
            <View className="flex-1 relative">
              <TextInput
                placeholder="Say something..."
                placeholderTextColor="#71717a"
                className="w-full bg-black/50 border border-white/10 rounded-full py-3 pl-4 pr-10 text-white text-sm"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                <Text className="material-symbols-outlined text-zinc-400 text-xl">sentiment_satisfied</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={sendMessage}
              className="bg-primary rounded-full p-3 pr-5 pl-4 flex-row items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Text className="material-symbols-outlined text-white text-xl">send</Text>
              <Text className="text-white font-bold text-sm">Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
