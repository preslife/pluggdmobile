import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { pluggdFonts } from '../../src/design/typography';
import { loadCarnivalRoadPack } from '../../src/features/carnival/carnivalService';
import { EdPressable } from '../../src/features/editorial/EditorialBits';

const ORANGE = '#FF6600';

export default function CarnivalRoadPackRoute() {
  const router = useRouter();
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
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 6, height: insets.top + 60 }]}>
        <EdPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/hubs/notting-hill-carnival-2026' as any)} style={styles.iconButton}><MaterialIcons name="arrow-back" size={21} color="#FFFFFF" /></EdPressable>
        <View style={{ flex: 1 }}><Text style={styles.eyebrow}>OFFLINE ESSENTIALS</Text><Text style={styles.title}>Carnival road pack</Text></View>
        <View style={styles.iconButton}><MaterialIcons name="offline-pin" size={20} color={ORANGE} /></View>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={ORANGE} /></View> : html ? (
        <WebView style={styles.reader} source={{ html }} javaScriptEnabled={false} domStorageEnabled={false} originWhitelist={['about:blank']} allowFileAccess={false} allowsLinkPreview={false} />
      ) : (
        <View style={styles.center}><MaterialIcons name="cloud-download" size={30} color={ORANGE} /><Text style={styles.emptyTitle}>No road pack saved yet</Text><Text style={styles.emptyCopy}>Return to the Carnival guide and choose “Save road pack offline” while you have a connection.</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080706' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 15 },
  reader: { flex: 1, backgroundColor: '#F4EADB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28 },
  emptyTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 20 },
  emptyCopy: { color: 'rgba(255,255,255,0.62)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
});
