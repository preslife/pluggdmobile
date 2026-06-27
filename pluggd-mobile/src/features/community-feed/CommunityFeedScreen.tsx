import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileSocialPostCard } from '../culture/MobileSocialPostCard';
import { MobileStoriesRail } from '../culture/MobileStoriesRail';
import { GlassPanel, GlassPillTabs, LiquidBackground } from '../../../components/liquid-glass';
import { CommunityComposer } from './CommunityComposer';
import { CommunityFeedInterstitial } from './CommunityFeedInterstitials';
import { CommunityBottomDockControls, CommunityInternalSwitcher } from './CommunityInternalSwitcher';
import { FEED_FILTERS, type CommunityFeedFilterKey, type CommunityTabKey } from './communityFeedTypes';
import { filterCommunityPosts, loadCommunityFeedBundle } from './communityFeedService';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
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
  item: { id: string; title: string; subtitle?: string | null; eyebrow?: string | null; route?: string | null };
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.rowTap} onPress={onPress}>
      <GlassPanel intensity="default" radius={18} contentStyle={styles.rowCard}>
        <Text style={styles.rowEyebrow}>{item.eyebrow || 'Community'}</Text>
        <Text style={styles.rowTitle}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
      </GlassPanel>
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
    <View style={{ paddingTop: Math.max(insets.top + 70, 108), paddingBottom: 10 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Community</Text>
          <Text style={styles.heading}>Feed</Text>
        </View>
      </View>

      {tab !== 'feed' ? (
        <View style={styles.switchWrap}>
          <CommunityInternalSwitcher value={tab} onChange={setTab} />
        </View>
      ) : null}

      {tab === 'feed' ? (
        <View style={styles.feedLead}>
          <MobileStoriesRail title="Stories" compact />
          <CommunityComposer />
          <View style={styles.switchWrap}>
            <CommunityInternalSwitcher value={tab} onChange={setTab} />
          </View>
          <View style={styles.filters}>
            <GlassPillTabs
              value={filter}
              items={FEED_FILTERS.map((item) => ({ value: item.key, label: item.label }))}
              onChange={setFilter}
            />
          </View>
        </View>
      ) : null}
    </View>
  );

  if (query.isLoading) {
    return (
      <View style={styles.screen}>
        <LiquidBackground tone="violet" style={StyleSheet.absoluteFill} />
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
        <LiquidBackground tone="violet" style={StyleSheet.absoluteFill} />
        {feedHeader}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Community could not load</Text>
          <Text style={styles.emptyBody}>Pull to refresh or try again in a moment.</Text>
          <Pressable style={styles.retry} onPress={() => void query.refetch()}>
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
        <LiquidBackground tone="violet" style={StyleSheet.absoluteFill} />
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
      <LiquidBackground tone="violet" style={StyleSheet.absoluteFill} />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={feedHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 226, gap: 14 }}
        refreshControl={<RefreshControl tintColor={COLORS.orange} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        renderItem={({ item, index }) => (
          <>
            <MobileSocialPostCard post={item} onMutated={() => void query.refetch()} />
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
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { color: COLORS.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
  heading: { color: COLORS.white, fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 2 },
  feedLead: { gap: 11 },
  switchWrap: { marginTop: 2 },
  filters: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 4 },
  lowerShortcuts: { gap: 8, paddingTop: 4, paddingBottom: 4 },
  lowerShortcutsTitle: { color: COLORS.muted, fontSize: 11, fontWeight: '700', marginHorizontal: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  center: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, gap: 8 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontWeight: '900' },
  emptyBody: { color: COLORS.muted, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  retry: { marginTop: 8, height: 42, borderRadius: 21, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: COLORS.canvas, fontSize: 13, fontWeight: '900' },
  rowTap: { marginHorizontal: 16, marginBottom: 10 },
  rowCard: { padding: 14, gap: 5 },
  rowEyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  rowTitle: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  rowSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
