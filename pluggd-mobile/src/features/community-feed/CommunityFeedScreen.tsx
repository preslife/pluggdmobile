import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileSocialPostCard } from '../culture/MobileSocialPostCard';
import { MobileStoriesRail } from '../culture/MobileStoriesRail';
import { CommunityComposer } from './CommunityComposer';
import { CommunityFeedInterstitial } from './CommunityFeedInterstitials';
import { CommunityBottomDockControls, CommunityInternalSwitcher } from './CommunityInternalSwitcher';
import { FEED_FILTERS, type CommunityFeedFilterKey, type CommunityTabKey } from './communityFeedTypes';
import { filterCommunityPosts, loadCommunityFeedBundle } from './communityFeedService';
import { pluggdFonts } from '../../design/typography';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PluggdImage } from '../../components/PluggdImage';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';

const COLORS = {
  canvas: '#0a0806',
  surface: '#171310',
  border: '#2a221a',
  orange: '#ff6600',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

function normalizedTab(value?: string | string[]): CommunityTabKey {
  const next = Array.isArray(value) ? value[0] : value;
  return next === 'communities' || next === 'boards' || next === 'explore' ? next : 'feed';
}

function normalizedFilter(value?: string | string[]): CommunityFeedFilterKey {
  const next = Array.isArray(value) ? value[0] : value;
  return next === 'threads' || next === 'media' || next === 'reposts' || next === 'activity' ? next : 'all';
}

function SecondaryRow({
  item,
  onPress,
}: {
  item: { id: string; title: string; subtitle?: string | null; eyebrow?: string | null; route?: string | null; imageUrl?: string | null; metric?: string | null };
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.rowTap} onPress={onPress}>
      {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.rowImage} displayWidth={720} /> : <View style={[styles.rowImage, styles.rowFallback]}><MaterialIcons name="groups" size={30} color={COLORS.orange} /></View>}
      <LinearGradient colors={['rgba(6,5,4,0.08)', 'rgba(6,5,4,0.92)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.rowTop}><Text style={styles.rowEyebrow}>{item.eyebrow || 'Community'}</Text><MaterialIcons name="north-east" size={18} color={COLORS.white} /></View>
      <View style={styles.rowCard}><Text style={styles.rowTitle}>{item.title}</Text>{item.subtitle ? <Text style={styles.rowSubtitle} numberOfLines={2}>{item.subtitle}</Text> : null}{item.metric ? <Text style={styles.rowMetric}>{item.metric}</Text> : null}</View>
    </Pressable>
  );
}

export function CommunityFeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; filter?: string; hashtag?: string }>();
  const [tab, setTab] = useState<CommunityTabKey>(normalizedTab(params.tab));
  const [filter, setFilter] = useState<CommunityFeedFilterKey>(normalizedFilter(params.filter));
  const hashtag = typeof params.hashtag === 'string' ? params.hashtag.replace(/^#/, '') : null;

  const query = useQuery({
    queryKey: ['community-feed', 'bundle'],
    queryFn: loadCommunityFeedBundle,
    staleTime: 1000 * 30,
  });

  const bundle = query.data;
  const posts = useMemo(() => filterCommunityPosts(bundle?.posts ?? [], filter, hashtag), [bundle?.posts, filter, hashtag]);

  const feedHeader = (
    <View style={{ paddingTop: 4, paddingBottom: 10 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}><Text style={styles.kicker}>SCENES IN MOTION</Text><Text style={styles.heading}>Community</Text><Text style={styles.headerBody}>Follow the conversations, works in progress and people moving independent music forward.</Text></View>
        <View style={styles.communityMark}><MaterialIcons name="public" size={23} color={COLORS.orange} /></View>
      </View>

      {tab !== 'feed' ? (
        <View style={styles.switchWrap}>
          <CommunityInternalSwitcher value={tab} onChange={setTab} />
        </View>
      ) : null}

      {tab === 'feed' ? (
        <View style={styles.feedLead}>
          <View style={styles.switchWrap}>
            <CommunityInternalSwitcher value={tab} onChange={setTab} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FEED_FILTERS.map((item) => {
              const active = item.key === filter;
              return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.filterTab, active && styles.filterTabActive]} onPress={() => setFilter(item.key)}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text></Pressable>;
            })}
          </ScrollView>
          <CommunityComposer />
        </View>
      ) : null}
    </View>
  );

  if (query.isLoading) {
    return (
      <View style={styles.screen}>
        <DiscoveryHeader />
        {feedHeader}
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.orange} />
        </View>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={styles.screen}>
        <DiscoveryHeader />
        {feedHeader}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Community could not load</Text>
          <Text style={styles.emptyBody}>Pull to refresh or try again in a moment.</Text>
          <Pressable accessibilityRole="button" style={styles.retry} onPress={() => void query.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (tab !== 'feed') {
    const items =
      tab === 'boards'
        ? (bundle?.boards ?? []).map((board) => ({ id: board.id, title: board.name, subtitle: board.description || board.category || 'Board', eyebrow: board.joined ? 'Joined' : 'Board', route: board.route, imageUrl: null, metric: board.is_featured ? 'Featured' : null, kind: 'board' }))
        : tab === 'communities'
          ? (bundle?.communities ?? [])
          : (bundle?.exploreCards ?? []);

    return (
      <View style={styles.screen}>
        <DiscoveryHeader />
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={feedHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 220 }}
          refreshControl={<RefreshControl tintColor={COLORS.orange} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
          renderItem={({ item }) => <SecondaryRow item={item} onPress={() => item.route && router.push(item.route as any)} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyBody}>Check Feed for the latest community activity.</Text></View>}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={feedHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 226, gap: 14 }}
        refreshControl={<RefreshControl tintColor={COLORS.orange} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        renderItem={({ item, index }) => (
          <>
            <MobileSocialPostCard post={item} onMutated={() => void query.refetch()} />
            {index === 0 ? <MobileStoriesRail title="Scene stories" compact /> : null}
            {index === 1 && bundle ? <CommunityFeedInterstitial kind="the_plug" bundle={bundle} /> : null}
            {index === 5 ? (
              <View style={styles.lowerShortcuts}>
                <Text style={styles.lowerShortcutsTitle}>More ways in</Text>
                <CommunityBottomDockControls onChange={setTab} />
              </View>
            ) : null}
            {index === 5 && bundle ? <CommunityFeedInterstitial kind="live_now" bundle={bundle} /> : null}
            {index === 7 && bundle ? <CommunityFeedInterstitial kind="who_to_follow" bundle={bundle} /> : null}
            {index === 10 && bundle ? <CommunityFeedInterstitial kind="trending_boards" bundle={bundle} /> : null}
          </>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyBody}>Start the first conversation or try another feed filter.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  kicker: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.7 },
  heading: { color: COLORS.white, fontFamily: 'Sora-ExtraBold', fontSize: 34, lineHeight: 39, letterSpacing: -1.2, marginTop: 3 },
  headerBody: { color: COLORS.muted, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 300 },
  communityMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#3A332B', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  feedLead: { gap: 8 },
  switchWrap: { marginTop: 2 },
  filters: { paddingHorizontal: 20, paddingRight: 32, gap: 17 },
  filterTab: { minHeight: 40, justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  filterTabActive: { borderColor: COLORS.orange },
  filterText: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  filterTextActive: { color: COLORS.white },
  lowerShortcuts: { gap: 8, paddingTop: 4, paddingBottom: 4 },
  lowerShortcutsTitle: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiBold, fontSize: 11, marginHorizontal: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  center: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, gap: 8 },
  emptyTitle: { color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  emptyBody: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
  retry: { marginTop: 8, height: 42, borderRadius: 21, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: COLORS.canvas, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  rowTap: { height: 210, marginHorizontal: 20, marginBottom: 12, borderRadius: 6, overflow: 'hidden', padding: 14, justifyContent: 'space-between' },
  rowImage: { ...StyleSheet.absoluteFillObject },
  rowFallback: { backgroundColor: '#211C17', alignItems: 'center', justifyContent: 'center' },
  rowTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCard: { zIndex: 2, gap: 5 },
  rowEyebrow: { color: COLORS.orange, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2 },
  rowTitle: { color: COLORS.white, fontFamily: 'Sora-Bold', fontSize: 20, lineHeight: 24 },
  rowSubtitle: { color: '#DDD5CA', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  rowMetric: { color: COLORS.orange, fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
});
