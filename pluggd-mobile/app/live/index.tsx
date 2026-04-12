import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BottomTabs } from "../../components/BottomTabs";

export default function LiveLobby() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="pt-14 px-4 pb-4 border-b border-white/10">
        <Text className="text-white text-2xl font-bold">Live Sessions</Text>
        <Text className="text-white/60 mt-1">Join or host a live stream.</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <Text className="text-white font-semibold text-lg mb-1">Demo Room</Text>
          <Text className="text-white/70 text-sm mb-3">Test the live pipeline with Agora + Supabase tokens.</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/live/session", params: { roomId: "demo-room", role: "host" } })}
              className="flex-1 h-12 rounded-xl bg-primary items-center justify-center"
            >
              <Text className="text-white font-bold">Host Demo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/live/session", params: { roomId: "demo-room", role: "audience" } })}
              className="flex-1 h-12 rounded-xl border border-white/20 items-center justify-center"
            >
              <Text className="text-white font-bold">Join Demo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <Text className="text-white font-semibold text-lg mb-1">Production Rooms</Text>
          <Text className="text-white/70 text-sm">Hook this list to `session_rooms` from Supabase.</Text>
        </View>
      </ScrollView>

      <BottomTabs />
    </View>
  );
}
