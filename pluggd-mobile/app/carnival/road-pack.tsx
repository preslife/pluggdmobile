import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { pluggdFonts } from '../../src/design/typography';
import { loadCarnivalRoadPack } from '../../src/features/carnival/carnivalService';
import { EdPressable } from '../../src/features/editorial/EditorialBits';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function CarnivalRoadPackRoute() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useRoadPackStyles();
  const insets = useSafeAreaInsets();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarnivalRoadPack()
      .then(async (pack) => pack ? setHtml(await FileSystem.readAsStringAsync(pack.uri)) : setHtml(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: insets.top + 6, height: insets.top + 60 }]}>
        <EdPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/hubs/notting-hill-carnival-2026' as any)} style={styles.iconButton}><MaterialIcons name="arrow-back" size={21} color={theme.colors.text} /></EdPressable>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>OFFLINE ESSENTIALS</Text><Text style={styles.title}>Carnival road pack</Text></View>
        <View style={styles.iconButton}><MaterialIcons name="offline-pin" size={20} color={theme.colors.accentText} /></View>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={theme.colors.accentText} /></View> : html ? (
        <WebView style={styles.reader} source={{ html }} javaScriptEnabled={false} domStorageEnabled={false} originWhitelist={['about:blank']} allowFileAccess={false} allowsLinkPreview={false} />
      ) : (
        <View style={styles.center}><MaterialIcons name="cloud-download" size={30} color={theme.colors.accentText} /><Text style={styles.emptyTitle}>No road pack saved yet</Text><Text style={styles.emptyCopy}>Return to the Carnival guide and choose “Save road pack offline” while you have a connection.</Text></View>
      )}
    </View>
  );
}

function useRoadPackStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.1 },
  title: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 15 },
  reader: { flex: 1, backgroundColor: '#F4EADB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 },
  emptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 20 },
  emptyCopy: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
}), [theme]);
}
