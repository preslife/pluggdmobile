import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { pluggdFonts } from '../../src/design/typography';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { useUniversalSearch } from '../../src/features/culture/useCultureData';
import { contentInitials } from '../../src/lib/mobileContent';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function GenreDetailRoute() {
  const theme = usePluggdTheme();
  const styles = useGenreStyles();
  const { genre } = useLocalSearchParams<{ genre: string }>();
  const router = useRouter();
  const bottomInset = useBottomChromeInset();
  const label = decodeURIComponent(String(genre || 'Genre'));
  const results = useUniversalSearch(label);
  const data = results.data;
  const releases = (data?.tracks || []).map((item) => ({
    id: item.id,
    title: item.title || 'Release',
    meta: item.artist || item.genre,
    image: item.cover_art_url,
    route: `/release/${item.id}`,
  }));
  const leadRelease = releases.find((release) => Boolean(release.image)) || releases[0];

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/discover' as any))}>
          <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>{label.toUpperCase()}</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>SCENE INDEX · VERIFIED RESULTS</Text>
        <Text style={styles.subtitle}>Releases, beats, mixes, video and creator signals indexed directly from PLUGGD.</Text>
        {results.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentText} />
            <Text style={styles.loadingLabel}>TUNING THE SCENE</Text>
          </View>
        ) : leadRelease ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open featured release ${leadRelease.title}`}
            style={styles.feature}
            onPress={() => router.push(leadRelease.route as any)}
          >
            <View style={styles.featureArt}>
              {leadRelease.image ? (
                <PluggdImage uri={leadRelease.image} style={styles.image} />
              ) : (
                <Text style={styles.featureInitial}>{contentInitials(leadRelease.title)}</Text>
              )}
            </View>
            <View style={styles.featureCopy}>
              <Text style={styles.featureKicker}>FIRST SIGNAL</Text>
              <Text style={styles.featureTitle} numberOfLines={3}>{leadRelease.title}</Text>
              {leadRelease.meta ? <Text style={styles.featureMeta} numberOfLines={1}>{leadRelease.meta}</Text> : null}
              <View style={styles.featureAction}>
                <MaterialIcons name="arrow-forward" size={18} color={theme.colors.onAccent} />
                <Text style={styles.featureActionText}>Open release</Text>
              </View>
            </View>
          </Pressable>
        ) : null}
        <GenreSection title="Releases" rows={releases.filter((release) => release.id !== leadRelease?.id)} />
        <GenreSection title="Beats" rows={(data?.beats || []).map((item) => ({ id: item.id, title: item.title || 'Beat', meta: item.producer_name || item.genre, image: item.image_url, route: `/beat/${item.id}` }))} />
        <GenreSection title="Mixes" rows={(data?.mixes || []).map((item) => ({ id: item.id, title: item.title || 'Mix', meta: item.city || item.recording_type, image: item.cover_url, route: `/mixes/${item.slug || item.id}` }))} />
        <GenreSection title="Videos" rows={(data?.videos || []).map((item) => ({ id: item.id, title: item.title || 'Video', meta: item.description, image: item.thumbnail_url, route: `/videos/${item.id}` }))} />
        <GenreSection title="Creators" rows={(data?.creators || []).map((item) => ({ id: item.user_id || item.id || item.username || item.full_name || 'creator', title: item.display_name || item.full_name || item.username || 'Creator', meta: item.username ? `@${item.username}` : item.city, image: item.avatar_url, route: item.username ? `/creator/${item.username}` : `/user/${item.user_id}` }))} />
        <GenreSection title="Soundboards" rows={(data?.communities || []).filter((item) => String(item.hub_type || '').toLowerCase().includes('soundboard')).map((item) => ({ id: item.id, title: item.title, meta: item.description, image: item.cover_image_url || item.avatar_url, route: `/backstage/${item.slug || item.id}` }))} />
      </ScrollView>
    </View>
  );
}

function GenreSection({ title, rows }: { title: string; rows: Array<{ id: string; title: string; meta?: string | null; image?: string | null; route: string }> }) {
  const styles = useGenreStyles();
  const router = useRouter();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {rows.length ? <Text style={styles.sectionCount}>{String(rows.length).padStart(2, '0')} FOUND</Text> : null}
      </View>
      {rows.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {rows.slice(0, 8).map((row, index) => (
            <Pressable
              key={`${title}-${row.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${row.title}`}
              style={styles.tile}
              onPress={() => router.push(row.route as any)}
            >
              <View style={styles.art}>
                {row.image ? <PluggdImage uri={row.image} style={styles.image} /> : <Text style={styles.initial}>{contentInitials(row.title)}</Text>}
                <View style={styles.indexBadge}>
                  <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
              </View>
              <Text style={styles.rowTitle} numberOfLines={2}>{row.title}</Text>
              {row.meta ? <Text style={styles.rowMeta} numberOfLines={1}>{row.meta}</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>No {title.toLowerCase()} have been indexed for this scene yet.</Text>
      )}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },
  header: { paddingHorizontal: 16, paddingTop: 42, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#241d15', flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 31, lineHeight: 35, letterSpacing: -0.8 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 190 },
  eyebrow: { color: '#FF6600', fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.35, marginBottom: 7 },
  subtitle: { color: '#B3B3B3', fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginBottom: 18, maxWidth: 330 },
  loading: { minHeight: 180, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#302A26', alignItems: 'flex-start', justifyContent: 'center', gap: 12 },
  loadingLabel: { color: '#8E8E9F', fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.2 },
  feature: { width: '100%', alignSelf: 'stretch', minHeight: 190, backgroundColor: '#16110D', borderWidth: 1, borderColor: '#3A2A20', borderRadius: 5, padding: 11, flexDirection: 'row', alignItems: 'stretch', gap: 14, marginBottom: 24 },
  featureArt: { width: 146, height: 166, borderRadius: 4, backgroundColor: '#241D15', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  featureInitial: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 38 },
  featureCopy: { flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'flex-start' },
  featureKicker: { color: '#FF6600', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.25, marginBottom: 8 },
  featureTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 22, lineHeight: 25, letterSpacing: -0.45 },
  featureMeta: { color: '#A59D97', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, marginTop: 6 },
  featureAction: { minHeight: 44, marginTop: 18, borderRadius: 4, backgroundColor: '#FF6600', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  featureActionText: { color: '#0A0806', fontFamily: pluggdFonts.satoshiBlack, fontSize: 11.5 },
  section: { marginBottom: 27 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderColor: '#302A26', paddingTop: 13, marginBottom: 11 },
  sectionTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 20 },
  sectionCount: { color: '#7F756E', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1 },
  rail: { gap: 10, paddingRight: 16 },
  tile: { width: 124 },
  art: { width: 124, height: 124, borderRadius: 4, backgroundColor: '#241d15', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  image: { width: '100%', height: '100%' },
  initial: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', fontSize: 13 },
  indexBadge: { position: 'absolute', left: 7, top: 7, minWidth: 27, height: 22, borderRadius: 3, backgroundColor: 'rgba(10,8,6,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  indexText: { color: '#FF6600', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9 },
  rowTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 14.5, lineHeight: 18 },
  rowMeta: { color: '#8E8E9F', fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, marginTop: 3 },
  empty: { color: '#8E8E9F', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, borderBottomWidth: 1, borderColor: '#302A26', paddingBottom: 18 },
});

function useGenreStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => ({
    ...baseStyles,
    screen: [baseStyles.screen, { backgroundColor: theme.colors.background }],
    header: [baseStyles.header, { borderBottomColor: theme.colors.border }],
    title: [baseStyles.title, { color: theme.colors.text }],
    eyebrow: [baseStyles.eyebrow, { color: theme.colors.accentText }],
    subtitle: [baseStyles.subtitle, { color: theme.colors.textSecondary }],
    loading: [baseStyles.loading, { borderColor: theme.colors.border }],
    loadingLabel: [baseStyles.loadingLabel, { color: theme.colors.textMuted }],
    feature: [baseStyles.feature, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }],
    featureArt: [baseStyles.featureArt, { backgroundColor: theme.colors.artworkBase }],
    featureInitial: [baseStyles.featureInitial, { color: theme.colors.text }],
    featureKicker: [baseStyles.featureKicker, { color: theme.colors.accentText }],
    featureTitle: [baseStyles.featureTitle, { color: theme.colors.text }],
    featureMeta: [baseStyles.featureMeta, { color: theme.colors.textMuted }],
    featureAction: [baseStyles.featureAction, { backgroundColor: theme.colors.accentFill }],
    featureActionText: [baseStyles.featureActionText, { color: theme.colors.onAccent }],
    sectionHead: [baseStyles.sectionHead, { borderColor: theme.colors.border }],
    sectionTitle: [baseStyles.sectionTitle, { color: theme.colors.text }],
    sectionCount: [baseStyles.sectionCount, { color: theme.colors.textSubtle }],
    art: [baseStyles.art, { backgroundColor: theme.colors.artworkBase }],
    initial: [baseStyles.initial, { color: theme.colors.text }],
    rowTitle: [baseStyles.rowTitle, { color: theme.colors.text }],
    rowMeta: [baseStyles.rowMeta, { color: theme.colors.textMuted }],
    empty: [baseStyles.empty, { color: theme.colors.textMuted, borderColor: theme.colors.border }],
  }), [theme]);
}
