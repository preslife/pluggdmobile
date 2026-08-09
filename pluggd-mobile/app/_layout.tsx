import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TrackPlayer from "react-native-track-player";
import { MaterialIcons } from "@expo/vector-icons";
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { NativeModules, StyleSheet, View, useWindowDimensions } from "react-native";
import "../global.css";
import { AppChrome } from "../components/AppChrome";
import { LiquidBackground } from "../components/liquid-glass";
import { AuthProvider } from "../src/context/AuthProvider";
import { PlaybackProvider } from "../src/context/PlaybackProvider";
import { StoreKitProvider } from "../src/context/StoreKitProvider";
import { PluggdThemeProvider, usePluggdTheme } from "../src/design/usePluggdTheme";
import { addLocalNotificationResponseListener, configureLocalNotificationHandler } from "../src/lib/localNotifications";
import { applyAdaptiveAppOrientation } from "../src/lib/orientation";
import { initializeObservability, observeRootComponent } from "../src/lib/observability";
import { PlaybackService } from "../src/lib/playback-service";

initializeObservability();

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

function Layout() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    "PluggdSans5-Regular": require("../assets/fonts/Pluggdsans5-Regular.otf"),
    "Satoshi-Light": require("../assets/fonts/Satoshi-Light.otf"),
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/Satoshi-Black.otf"),
    "Sora-SemiBold": Sora_600SemiBold,
    "Sora-Bold": Sora_700Bold,
    "Sora-ExtraBold": Sora_800ExtraBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PluggdThemeProvider>
        <LayoutContent />
      </PluggdThemeProvider>
    </SafeAreaProvider>
  );
}

export default observeRootComponent(Layout);

function LayoutContent() {
  const theme = usePluggdTheme();
  const window = useWindowDimensions();

  useEffect(() => {
    if (!__DEV__) return;
    NativeModules.DevSettings?.setProfilingEnabled?.(false);
    NativeModules.DevMenu?.setProfilingEnabled?.(false);
  }, []);

  useEffect(() => addLocalNotificationResponseListener(), []);

  // Phones remain portrait-first. Android tablets and unfolded devices opt in
  // to rotation and resize so API 36 large-screen behaviour is first-class.
  useEffect(() => {
    applyAdaptiveAppOrientation(Math.min(window.width, window.height));
  }, [window.height, window.width]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StoreKitProvider>
            <PlaybackProvider>
              <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <LiquidBackground style={{ ...StyleSheet.absoluteFillObject }} />
                <Slot />
                <AppChrome />
              </View>
            </PlaybackProvider>
          </StoreKitProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
