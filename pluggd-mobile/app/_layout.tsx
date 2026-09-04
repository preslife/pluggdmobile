import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TrackPlayer from "react-native-track-player";
import { MaterialIcons } from "@expo/vector-icons";
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { ActivityIndicator, NativeModules, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import "../global.css";
import { AppChrome } from "../components/AppChrome";
import { LiquidBackground } from "../components/liquid-glass";
import { AuthProvider } from "../src/context/AuthProvider";
import { PlaybackProvider } from "../src/context/PlaybackProvider";
import { StoreKitProvider } from "../src/context/StoreKitProvider";
import { PluggdThemeProvider, usePluggdTheme, usePluggdThemeMode } from "../src/design/usePluggdTheme";
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
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PluggdThemeProvider>
        <HydratedLayout />
      </PluggdThemeProvider>
    </SafeAreaProvider>
  );
}

function HydratedLayout() {
  const [fontsLoaded, fontError] = useFonts({
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
  const theme = usePluggdTheme();
  const { isHydrated } = usePluggdThemeMode();

  // Keep the native launch surface in place until the persisted appearance is
  // known. This prevents a saved Editorial Light preference rendering a Night
  // app shell for one frame.
  if (!isHydrated) return null;

  if (!fontsLoaded) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={fontError ? "PLUGGD could not load its display fonts" : "Loading PLUGGD"}
        style={[styles.fontGate, { backgroundColor: theme.colors.background }]}
      >
        <Text
          maxFontSizeMultiplier={1.25}
          numberOfLines={1}
          style={[styles.fontGateBrand, { color: theme.colors.text }]}
        >
          PLUGGD
        </Text>
        {fontError ? (
          <Text style={[styles.fontGateMessage, { color: theme.colors.textMuted }]}>The app could not finish loading. Close and reopen PLUGGD to try again.</Text>
        ) : (
          <>
            <ActivityIndicator color={theme.colors.accentFill} size="small" />
            <Text style={[styles.fontGateMessage, { color: theme.colors.textMuted }]}>Loading your PLUGGD world…</Text>
          </>
        )}
      </View>
    );
  }

  return <LayoutContent />;
}

const styles = StyleSheet.create({
  fontGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  fontGateBrand: {
    alignSelf: 'stretch',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  fontGateMessage: {
    maxWidth: 300,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
});

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

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

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
                <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" translucent />
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
