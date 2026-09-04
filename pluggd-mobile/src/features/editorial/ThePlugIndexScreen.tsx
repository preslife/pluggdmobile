import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '../../../components/BrandLogo';
import { PluggdImage } from '../../components/PluggdImage';
import { pluggdFonts } from '../../design/typography';
import { edFonts } from '../../design/editorial';
import { loadThePlugEditorialStories, type HomeEditorialStory } from '../home/homeDiscoveryData';
import { DiscoveryReturnBar } from '../discovery/DiscoveryReturnBar';
import { usePluggdTheme } from '../../design/usePluggdTheme';

function dateLabel(value?: string | null) {
  if (!value) return 'THE PLUG';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'THE PLUG';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function storyCategory(story: HomeEditorialStory) {
  return story.tags?.[0]?.trim() || 'Culture';
}

function StoryFrame({
  story,
  featured = false,
  onPress,
}: {
  story: HomeEditorialStory;
  featured?: boolean;
  onPress: () => void;
}) {
  const theme = usePluggdTheme();
  const styles = useThePlugIndexStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Read ${story.title || 'THE PLUG story'}`}
      onPress={onPress}
      style={featured ? styles.featureFrame : styles.storyFrame}
    >
      {story.featured_image_url ? (
        <PluggdImage uri={story.featured_image_url} style={StyleSheet.absoluteFillObject} resizeMode="cover" displayWidth={featured ? 980 : 520} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.fallback]}><MaterialIcons name="auto-stories" size={32} color={theme.colors.accentFill} /></View>
      )}
      <LinearGradient
        colors={featured ? ['rgba(7,5,3,0.04)', 'rgba(7,5,3,0.96)'] : ['rgba(7,5,3,0.10)', 'rgba(7,5,3,0.94)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={featured ? styles.featureCopy : styles.storyCopy}>
        <Text style={styles.storyKicker}>{storyCategory(story).toUpperCase()} · {dateLabel(story.published_at || story.created_at)}</Text>
        <Text style={featured ? styles.featureTitle : styles.storyTitle} numberOfLines={featured ? 3 : 2}>{story.title || 'Untitled dispatch'}</Text>
        {featured && story.excerpt ? <Text style={styles.featureExcerpt} numberOfLines={3}>{story.excerpt}</Text> : null}
        <View style={styles.readRow}><Text style={styles.readText}>Read dispatch</Text><MaterialIcons name="arrow-forward" size={16} color={theme.colors.accentFill} /></View>
      </View>
    </Pressable>
  );
}

export function ThePlugIndexScreen() {
  const theme = usePluggdTheme();
  const styles = useThePlugIndexStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('All');
  const query = useQuery({
    queryKey: ['the-plug', 'index'],
    queryFn: () => loadThePlugEditorialStories(100),
    staleTime: 1000 * 60,
  });
  const stories = query.data ?? [];
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(stories.map(storyCategory))).slice(0, 7)],
    [stories],
  );
  const visible = category === 'All' ? stories : stories.filter((story) => storyCategory(story) === category);
  const featured = [...visible]
    .filter((story) => story.is_featured)
    .sort((a, b) => Number(a.feature_rank ?? 1000) - Number(b.feature_rank ?? 1000))[0]
    ?? visible[0]
    ?? stories[0];
  const remaining = visible.filter((story) => story.id !== featured?.id);
  const editionDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={theme.colors.accentFill} />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 72 }]}
      >
        <View style={[styles.masthead, { minHeight: insets.top + 54, paddingTop: insets.top }]}>
          <BrandLogo variant="auto" width={112} height={29} />
          <View style={styles.mastheadActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Search PLUGGD" onPress={() => router.push('/search' as any)} style={styles.iconButton}>
              <MaterialIcons name="search" size={23} color={theme.colors.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open Community" onPress={() => router.push('/community' as any)} style={styles.iconButton}>
              <MaterialIcons name="groups" size={22} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        <DiscoveryReturnBar tone="paper" style={styles.returnBar} />

        <View style={styles.titleBlock}>
          <Text style={styles.editionDate}>CURRENT EDITION — {editionDate}</Text>
          <Text style={styles.pageTitle}>THE <Text style={styles.pageTitleAccent}>PLUG</Text></Text>
          <Text style={styles.dek}>Editorial, creator spotlights, interviews, scene reports, live culture, underground movements and what's happening now.</Text>
          <View style={styles.issueRule} />
          <Text style={styles.magazineLabel}>INDEPENDENT MUSIC, CULTURE AND CREATOR MAGAZINE</Text>
          <Text style={styles.storyCount}>{query.isLoading ? 'BUILDING THE EDITION' : `${stories.length} STORIES IN THIS EDITION`}</Text>
        </View>

        {query.isLoading ? <View style={styles.loading}><ActivityIndicator color={theme.colors.accentFill} /></View> : null}
        {!query.isLoading && featured ? (
          <>
            <View style={styles.sectionTop}><Text style={styles.sectionLabel}>LEAD DISPATCH</Text><Text style={styles.issue}>CURRENT ISSUE</Text></View>
            <StoryFrame story={featured} featured onPress={() => router.push(`/plug/${featured.id}` as any)} />
          </>
        ) : null}

        {remaining.length ? (
          <View style={styles.editionShelf}>
            <Text style={styles.editionShelfKicker}>IN THIS EDITION</Text>
            <Text style={styles.editionShelfTitle}>Latest from THE PLUG</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={232} decelerationRate="fast" contentContainerStyle={styles.editionRail}>
              {remaining.slice(0, 5).map((story, index) => (
                <Pressable key={story.id} accessibilityRole="button" accessibilityLabel={`Read ${story.title || 'THE PLUG story'}`} onPress={() => router.push(`/plug/${story.id}` as any)} style={styles.editionCard}>
                  <Text style={styles.editionCardNumber}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.editionCardCategory}>{storyCategory(story).toUpperCase()}</Text>
                  <Text style={styles.editionCardTitle} numberOfLines={3}>{story.title || 'Untitled dispatch'}</Text>
                  <Text style={styles.editionCardDate}>{dateLabel(story.published_at || story.created_at)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.categoryRail}>
          {categories.map((item) => {
            const active = item === category;
            return (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setCategory(item)}
                style={[styles.category, active && styles.categoryActive]}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {remaining.length ? (
          <>
            <View style={styles.sectionTop}><Text style={styles.sectionTitle}>Latest dispatches</Text><Text style={styles.issue}>{remaining.length} STORIES</Text></View>
            <View style={styles.grid}>
              {remaining.map((story) => (
                <StoryFrame key={story.id} story={story} onPress={() => router.push(`/plug/${story.id}` as any)} />
              ))}
            </View>
          </>
        ) : null}

        {!query.isLoading && !stories.length ? (
          <View style={styles.empty}>
            <MaterialIcons name="auto-stories" size={31} color={theme.colors.accentText} />
            <Text style={styles.emptyTitle}>The next dispatch is being written.</Text>
            <Text style={styles.emptyBody}>Return soon for interviews, reports and stories from across independent music.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/discover' as any)} style={styles.emptyAction}><Text style={styles.emptyActionText}>Keep discovering</Text></Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function useThePlugIndexStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20 },
  masthead: { marginHorizontal: -20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.headerGlass, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  returnBar: { paddingHorizontal: 0 },
  mastheadActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { paddingTop: 26, paddingBottom: 22, borderBottomWidth: 1, borderColor: theme.colors.divider },
  editionDate: { color: theme.colors.textMuted, fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.25 },
  pageTitle: { color: theme.colors.text, fontFamily: edFonts.serif, fontSize: 51, lineHeight: 55, letterSpacing: -2.1, marginTop: 10 },
  pageTitleAccent: { color: theme.colors.accentText, fontFamily: edFonts.serifItalic },
  dek: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 15.5, lineHeight: 26, maxWidth: 350, marginTop: 13 },
  issueRule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginTop: 22 },
  magazineLabel: { color: theme.colors.text, fontFamily: edFonts.mono, fontSize: 8, lineHeight: 13, letterSpacing: 0.85, marginTop: 14 },
  storyCount: { color: theme.colors.accentText, fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.05, marginTop: 10 },
  categoryRail: { gap: 8, paddingTop: 20, paddingBottom: 8, paddingRight: 20 },
  category: { minHeight: 44, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  categoryActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  categoryText: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 12 },
  categoryTextActive: { color: theme.colors.onAccent },
  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  sectionTop: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 },
  sectionLabel: { color: theme.colors.accentText, fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.35 },
  sectionTitle: { color: theme.colors.text, fontFamily: edFonts.serif, fontSize: 23, letterSpacing: -0.65 },
  issue: { color: theme.colors.textMuted, fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1 },
  featureFrame: { width: '100%', height: 360, minHeight: 360, maxHeight: 360, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  storyFrame: { width: '48.5%', height: 228, minHeight: 228, maxHeight: 228, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  fallback: { backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { position: 'absolute', zIndex: 2, left: 18, right: 18, bottom: 18 },
  storyCopy: { position: 'absolute', zIndex: 2, left: 11, right: 11, bottom: 11 },
  storyKicker: { color: theme.colors.accentFill, fontFamily: edFonts.mono, fontSize: 8, lineHeight: 12, letterSpacing: 0.75 },
  featureTitle: { color: theme.colors.mediaText, fontFamily: edFonts.serif, fontSize: 29, lineHeight: 33, letterSpacing: -0.85, marginTop: 6 },
  storyTitle: { color: theme.colors.mediaText, fontFamily: edFonts.bodyBlack, fontSize: 16, lineHeight: 19, letterSpacing: -0.25, marginTop: 5 },
  featureExcerpt: { color: theme.colors.mediaTextMuted, fontFamily: edFonts.bodyMedium, fontSize: 12, lineHeight: 17, marginTop: 7, maxWidth: 320 },
  readRow: { minHeight: 34, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  readText: { color: theme.colors.mediaText, fontFamily: edFonts.bodyBold, fontSize: 10.5 },
  editionShelf: { marginTop: 24, paddingTop: 18, paddingBottom: 20, borderTopWidth: 3, borderBottomWidth: 1, borderColor: theme.colors.divider },
  editionShelfKicker: { color: theme.colors.accentText, fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.55 },
  editionShelfTitle: { color: theme.colors.text, fontFamily: edFonts.serif, fontSize: 24, lineHeight: 28, letterSpacing: -0.65, marginTop: 6 },
  editionRail: { gap: 10, paddingTop: 15, paddingRight: 20 },
  editionCard: { width: 220, minHeight: 176, padding: 15, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  editionCardNumber: { color: theme.colors.accentText, fontFamily: edFonts.serif, fontSize: 30, lineHeight: 32 },
  editionCardCategory: { color: theme.colors.textMuted, fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 1.15, marginTop: 11 },
  editionCardTitle: { color: theme.colors.text, fontFamily: edFonts.serif, fontSize: 17, lineHeight: 21, letterSpacing: -0.35, marginTop: 5 },
  editionCardDate: { color: theme.colors.textMuted, fontFamily: edFonts.mono, fontSize: 7.5, letterSpacing: 0.85, marginTop: 'auto', paddingTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  empty: { minHeight: 390, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 14 },
  emptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28, marginTop: 13 },
  emptyBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 19, maxWidth: 310, marginTop: 7 },
  emptyAction: { minHeight: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  emptyActionText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  }), [theme]);
}
