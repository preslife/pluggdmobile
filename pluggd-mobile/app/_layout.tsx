import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TrackPlayer from "react-native-track-player";
import { MaterialIcons } from "@expo/vector-icons";
import { Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { NativeModules, StyleSheet, View } from "react-native";
import "../global.css";
import { AppChrome } from "../components/AppChrome";
import { LiquidBackground } from "../components/liquid-glass";
import { AuthProvider } from "../src/context/AuthProvider";
import { PlaybackProvider } from "../src/context/PlaybackProvider";
import { PluggdThemeProvider, usePluggdTheme } from "../src/design/usePluggdTheme";
import { addLocalNotificationResponseListener, configureLocalNotificationHandler } from "../src/lib/localNotifications";
import { PlaybackService } from "../src/lib/playback-service";

// Register the playback service once at module scope
TrackPlayer.registerPlaybackService(() => PlaybackService);
configureLocalNotificationHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 2,
    },
  },
});

export default function Layout() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    "PluggdSans5-Regular": require("../assets/fonts/Pluggdsans5-Regular.otf"),
    "Satoshi-Light": require("../assets/fonts/Satoshi-Light.otf"),
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/Satoshi-Black.otf"),
    "Inter-SemiBold": Inter_600SemiBold,
    "Sora-SemiBold": Sora_600SemiBold,
    "Sora-Bold": Sora_700Bold,
    "Sora-ExtraBold": Sora_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PluggdThemeProvider>
      <LayoutContent />
    </PluggdThemeProvider>
  );
}

function LayoutContent() {
  const theme = usePluggdTheme();

  useEffect(() => {
    if (!__DEV__) return;
    NativeModules.DevSettings?.setProfilingEnabled?.(false);
    NativeModules.DevMenu?.setProfilingEnabled?.(false);
  }, []);

  useEffect(() => addLocalNotificationResponseListener(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PlaybackProvider>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
              <LiquidBackground style={{ ...StyleSheet.absoluteFillObject }} />
              <Slot />
              <AppChrome />
            </View>
          </PlaybackProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
