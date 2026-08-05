import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '../../../components/BrandLogo';
import { PluggdImage } from '../../components/PluggdImage';
import { pluggdFonts } from '../../design/typography';
import { loadHomeEditorialStories, type HomeEditorialStory } from '../home/homeDiscoveryData';

const ORANGE = '#FF6600';
const CANVAS = '#0A0908';
const INK = '#F7F3ED';
const MUTED = '#999087';
const LINE = '#302A24';

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
  return (
    <View style={featured ? styles.featureFrame : styles.storyFrame}>
      {story.featured_image_url ? (
        <PluggdImage uri={story.featured_image_url} style={StyleSheet.absoluteFillObject} resizeMode="cover" displayWidth={featured ? 980 : 520} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.fallback]}><MaterialIcons name="auto-stories" size={32} color={ORANGE} /></View>
      )}
      <LinearGradient
        colors={featured ? ['rgba(7,5,3,0.04)', 'rgba(7,5,3,0.96)'] : ['rgba(7,5,3,0.10)', 'rgba(7,5,3,0.94)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={featured ? styles.featureCopy : styles.storyCopy}>
        <Text style={styles.storyKicker}>{storyCategory(story).toUpperCase()} · {dateLabel(story.created_at)}</Text>
        <Text style={featured ? styles.featureTitle : styles.storyTitle} numberOfLines={featured ? 3 : 2}>{story.title || 'Untitled dispatch'}</Text>
        {featured && story.excerpt ? <Text style={styles.featureExcerpt} numberOfLines={3}>{story.excerpt}</Text> : null}
        <View style={styles.readRow}><Text style={styles.readText}>Read dispatch</Text><MaterialIcons name="arrow-forward" size={16} color={ORANGE} /></View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Read ${story.title || 'THE PLUG story'}`}
        onPress={onPress}
        style={({ pressed }) => [styles.frameHit, pressed && styles.pressed]}
      />
    </View>
  );
}

export function ThePlugIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState('All');
  const query = useQuery({
    queryKey: ['the-plug', 'index'],
    queryFn: () => loadHomeEditorialStories(30),
    staleTime: 1000 * 60,
  });
  const stories = query.data ?? [];
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(stories.map(storyCategory))).slice(0, 7)],
    [stories],
  );
  const visible = category === 'All' ? stories : stories.filter((story) => storyCategory(story) === category);
  const featured = visible[0] ?? stories[0];
  const remaining = visible.filter((story) => story.id !== featured?.id);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={ORANGE} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 72 }]}
      >
        <View style={styles.masthead}>
          <BrandLogo width={112} height={29} />
          <View style={styles.mastheadActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Search PLUGGD" onPress={() => router.push('/search' as any)} style={styles.iconButton}>
              <MaterialIcons name="search" size={23} color={INK} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open Community" onPress={() => router.push('/community' as any)} style={styles.iconButton}>
              <MaterialIcons name="groups" size={22} color={INK} />
            </Pressable>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>PLUGGD EDITORIAL · CULTURE IN MOTION</Text>
          <Text style={styles.pageTitle}>THE PLUG</Text>
          <Text style={styles.dek}>Interviews, scene reports and independent music stories from the people building what comes next.</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
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

        {query.isLoading ? <View style={styles.loading}><ActivityIndicator color={ORANGE} /></View> : null}
        {!query.isLoading && featured ? (
          <>
            <View style={styles.sectionTop}><Text style={styles.sectionLabel}>THE LEAD STORY</Text><Text style={styles.issue}>CURRENT ISSUE</Text></View>
            <StoryFrame story={featured} featured onPress={() => router.push(`/plug/${featured.id}` as any)} />
          </>
        ) : null}

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
            <MaterialIcons name="auto-stories" size={31} color={ORANGE} />
            <Text style={styles.emptyTitle}>The next dispatch is being written.</Text>
            <Text style={styles.emptyBody}>Return soon for interviews, reports and stories from across independent music.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/discover' as any)} style={styles.emptyAction}><Text style={styles.emptyActionText}>Keep discovering</Text></Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CANVAS },
  content: { paddingHorizontal: 20 },
  masthead: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mastheadActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { paddingTop: 28, paddingBottom: 20, borderBottomWidth: 1, borderColor: LINE },
  eyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.65 },
  pageTitle: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 32, lineHeight: 36, letterSpacing: -1.1, marginTop: 5 },
  dek: { color: '#B8AFA6', fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21, maxWidth: 345, marginTop: 9 },
  categoryRail: { gap: 8, paddingVertical: 15, paddingRight: 20 },
  category: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#171411', alignItems: 'center', justifyContent: 'center' },
  categoryActive: { backgroundColor: ORANGE },
  categoryText: { color: '#CEC6BC', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  categoryTextActive: { color: '#130B06' },
  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  sectionTop: { minHeight: 58, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 },
  sectionLabel: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.35 },
  sectionTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 20, letterSpacing: -0.45 },
  issue: { color: MUTED, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1 },
  featureFrame: { width: '100%', height: 370, minHeight: 370, maxHeight: 370, position: 'relative', borderRadius: 7, overflow: 'hidden' },
  storyFrame: { width: '48.5%', height: 218, minHeight: 218, maxHeight: 218, position: 'relative', borderRadius: 6, overflow: 'hidden' },
  fallback: { backgroundColor: '#211A15', alignItems: 'center', justifyContent: 'center' },
  featureCopy: { position: 'absolute', zIndex: 2, left: 18, right: 18, bottom: 18 },
  storyCopy: { position: 'absolute', zIndex: 2, left: 11, right: 11, bottom: 11 },
  storyKicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, lineHeight: 12, letterSpacing: 0.75 },
  featureTitle: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 29, lineHeight: 33, letterSpacing: -0.85, marginTop: 6 },
  storyTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 16, lineHeight: 19, letterSpacing: -0.25, marginTop: 5 },
  featureExcerpt: { color: '#DDD5CB', fontFamily: pluggdFonts.satoshiRegular, fontSize: 12, lineHeight: 17, marginTop: 7, maxWidth: 320 },
  readRow: { minHeight: 34, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  readText: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5 },
  frameHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  empty: { minHeight: 390, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 14 },
  emptyTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28, marginTop: 13 },
  emptyBody: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 19, maxWidth: 310, marginTop: 7 },
  emptyAction: { minHeight: 44, borderRadius: 22, backgroundColor: ORANGE, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  emptyActionText: { color: '#130B06', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
});
