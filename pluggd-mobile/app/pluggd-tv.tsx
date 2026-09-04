import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../src/components/PluggdImage';
import { useBottomChromeInset } from '../src/design/useBottomChromeInset';
import { pluggdFonts } from '../src/design/typography';
import type { PluggdTheme } from '../src/design/tokens';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { loadPluggdTvFeed, type PluggdTvVideo } from '../src/features/video/pluggdTvService';

function VideoCard({ video, wide = false, onPress }: { video: PluggdTvVideo; wide?: boolean; onPress: () => void }) {
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Watch ${video.title} by ${video.creatorName}`} onPress={onPress} style={[styles.card, wide && styles.heroCard]}>
      {video.thumbnailUrl ? <PluggdImage uri={video.thumbnailUrl} style={styles.cardImage} resizeMode="cover" /> : <View style={styles.cardFallback}><MaterialIcons name="smart-display" size={wide ? 64 : 38} color={theme.colors.accentText} /></View>}
      <LinearGradient colors={['rgba(10,8,6,0.03)', 'rgba(10,8,6,0.92)']} style={StyleSheet.absoluteFillObject} />
      {video.isFeatured ? <View style={styles.featuredPill}><Text style={styles.featuredText}>FEATURED</Text></View> : null}
      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, wide && styles.heroTitle]} numberOfLines={wide ? 3 : 2}>{video.title}</Text>
        <Text style={styles.cardCreator} numberOfLines={1}>{video.creatorName}</Text>
        {wide && video.description ? <Text style={styles.heroBody} numberOfLines={2}>{video.description}</Text> : null}
        <View style={styles.watchRow}><MaterialIcons name="play-arrow" size={18} color="#FFFFFF" /><Text style={styles.watchText}>Watch</Text></View>
      </View>
    </Pressable>
  );
}

export default function PluggdTvRoute() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomChromeInset();
  const { width } = useWindowDimensions();
  const query = useQuery({ queryKey: ['pluggd-tv'], queryFn: () => loadPluggdTvFeed(36), staleTime: 60_000 });
  const videos = query.data || [];
  const hero = videos[0];
  const remaining = videos.slice(1);
  const cardWidth = Math.floor((width - 42) / 2);
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.colors.accentText} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 88, paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>PLUGGD TV</Text>
        <Text accessibilityRole="header" style={styles.title}>The scene, in motion.</Text>
        <Text style={styles.intro}>Published creator videos, sessions and selected visuals from across PLUGGD.</Text>
        {query.isLoading ? <View style={styles.loading}><ActivityIndicator size="large" color={theme.colors.accentText} /><Text style={styles.loadingText}>Loading PLUGGD TV…</Text></View> : null}
        {!query.isLoading && !videos.length ? <View style={styles.empty}><MaterialIcons name="live-tv" size={46} color={theme.colors.accentText} /><Text style={styles.emptyTitle}>The next screening is being prepared.</Text><Text style={styles.emptyBody}>Published creator videos will appear here as soon as they are ready.</Text></View> : null}
        {hero ? <VideoCard video={hero} wide onPress={() => router.push(`/videos/${hero.id}` as any)} /> : null}
        {remaining.length ? <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>More to watch</Text><Text style={styles.sectionCount}>{remaining.length} VIDEOS</Text></View>
          <View style={styles.grid}>{remaining.map((video) => <View key={video.id} style={{ width: cardWidth }}><VideoCard video={video} onPress={() => router.push(`/videos/${video.id}` as any)} /></View>)}</View>
        </> : null}
      </ScrollView>
    </View>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingHorizontal: 16, gap: 12 },
    eyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, letterSpacing: 2 },
    title: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 38, lineHeight: 41 },
    intro: { maxWidth: 620, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginBottom: 8 },
    loading: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13 },
    empty: { minHeight: 300, padding: 30, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 24, textAlign: 'center', marginTop: 13 },
    emptyBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 },
    card: { height: 236, borderRadius: 20, overflow: 'hidden', backgroundColor: theme.colors.artworkBase, borderWidth: 1, borderColor: theme.colors.border },
    heroCard: { height: 420, borderRadius: 26 },
    cardImage: { width: '100%', height: '100%' },
    cardFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceAlt },
    featuredPill: { position: 'absolute', top: 14, left: 14, minHeight: 28, borderRadius: 14, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,8,6,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    featuredText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
    cardCopy: { position: 'absolute', left: 14, right: 14, bottom: 14 },
    cardTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 19, lineHeight: 22 },
    heroTitle: { fontSize: 32, lineHeight: 35, maxWidth: 560 },
    cardCreator: { color: 'rgba(255,255,255,0.78)', fontFamily: pluggdFonts.satoshiBold, fontSize: 12, marginTop: 5 },
    heroBody: { color: 'rgba(255,255,255,0.82)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 18, marginTop: 8, maxWidth: 580 },
    watchRow: { alignSelf: 'flex-start', minHeight: 36, marginTop: 10, paddingHorizontal: 13, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(10,8,6,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
    watchText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
    sectionHeader: { marginTop: 14, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    sectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 25 },
    sectionCount: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  });
}
