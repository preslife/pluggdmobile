import { configurePluggdTypography } from "../src/design/typography";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TrackPlayer from "react-native-track-player";
import { MaterialIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { NativeModules, View } from "react-native";
import "../global.css";
import { AppChrome } from "../components/AppChrome";
import { AuthProvider } from "../src/context/AuthProvider";
import { PlaybackProvider } from "../src/context/PlaybackProvider";
import { PluggdThemeProvider, usePluggdTheme } from "../src/design/usePluggdTheme";
import { addLocalNotificationResponseListener, configureLocalNotificationHandler } from "../src/lib/localNotifications";
import { PlaybackService } from "../src/lib/playback-service";

configurePluggdTypography();

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
  const [fontsLoaded] = useFonts(MaterialIcons.font);

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
              <Slot />
              <AppChrome />
            </View>
          </PlaybackProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
