import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { MobileSocialPostCard } from '../culture/MobileSocialPostCard';
import { MobileStoriesRail } from '../culture/MobileStoriesRail';
import { CommunityFeedInterstitial } from './CommunityFeedInterstitials';
import { CommunityBottomDockControls, CommunityInternalSwitcher } from './CommunityInternalSwitcher';
import { FEED_FILTERS, type CommunityFeedFilterKey, type CommunityTabKey } from './communityFeedTypes';
import { filterCommunityPosts, loadCommunityFeedBundle } from './communityFeedService';
import { pluggdFonts } from '../../design/typography';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PluggdImage } from '../../components/PluggdImage';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import type { BackstageBoard, MobileSocialPost } from '../culture/mobileTypes';
import type { ParityCard } from '../parity/appWideParityServices';
import { selectionHaptic } from '../../design/haptics';
import { usePluggdTheme } from '../../design/usePluggdTheme';

const COLORS = {
  canvas: '#0a0806',
  surface: '#171310',
  border: '#2a221a',
  orange: '#ff6600',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

type FeedListRow =
  | { kind: 'switcher'; id: 'community-switcher' }
  | { kind: 'filters'; id: 'community-filters' }
  | { kind: 'empty'; id: 'community-feed-empty' }
  | { kind: 'post'; id: string; post: MobileSocialPost; postIndex: number };

type BoardListRow =
  | { kind: 'switcher'; id: 'community-switcher' }
  | { kind: 'intro'; id: 'board-intro' }
  | { kind: 'empty'; id: 'community-board-empty' }
  | { kind: 'board'; id: string; board: BackstageBoard };

type CommunityListRow =
  | { kind: 'switcher'; id: 'community-switcher' }
  | { kind: 'empty'; id: 'community-list-empty' }
  | { kind: 'community'; id: string; item: ParityCard };

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
  const styles = useCommunityStyles();
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.rowTap} onPress={onPress}>
      {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.rowImage} displayWidth={720} /> : <View style={[styles.rowImage, styles.rowFallback]}><MaterialIcons name="groups" size={30} color={theme.colors.accentText} /></View>}
      <LinearGradient colors={['rgba(6,5,4,0.08)', 'rgba(6,5,4,0.92)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.rowTop}><Text style={styles.rowEyebrow}>{item.eyebrow || 'Community'}</Text><MaterialIcons name="north-east" size={18} color={COLORS.white} /></View>
      <View style={styles.rowCard}><Text style={styles.rowTitle}>{item.title}</Text>{item.subtitle ? <Text style={styles.rowSubtitle} numberOfLines={2}>{item.subtitle}</Text> : null}{item.metric ? <Text style={styles.rowMetric}>{item.metric}</Text> : null}</View>
    </Pressable>
  );
}

function BoardIndexRow({ board, onPress }: { board: BackstageBoard; onPress: () => void }) {
  const styles = useCommunityStyles();
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${board.name} board`} style={styles.boardRow} onPress={onPress}>
      <View style={styles.boardIcon}><MaterialIcons name="forum" size={20} color={theme.colors.accentText} /></View>
      <View style={styles.boardCopy}>
        <View style={styles.boardTitleRow}>
          <Text style={styles.boardTitle} numberOfLines={1}>{board.name}</Text>
          {board.joined ? <Text style={styles.joinedLabel}>JOINED</Text> : null}
        </View>
        {board.description ? <Text style={styles.boardDescription} numberOfLines={1}>{board.description}</Text> : null}
        <View style={styles.boardMetaRow}>
          <Text style={styles.boardCategory}>{board.category || 'General'}</Text>
          {board.is_featured ? <Text style={styles.boardFeatured}>FEATURED</Text> : null}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function ExploreRailCard({ item, onPress }: { item: ParityCard; onPress: () => void }) {
  const styles = useCommunityStyles();
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.exploreRailCard} onPress={onPress}>
      {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.exploreRailImage} displayWidth={440} /> : <View style={[styles.exploreRailImage, styles.rowFallback]}><MaterialIcons name="groups" size={25} color={theme.colors.accentText} /></View>}
      <Text style={styles.exploreRailEyebrow} numberOfLines={1}>{item.eyebrow}</Text>
      <Text style={styles.exploreRailTitle} numberOfLines={2}>{item.title}</Text>
      {item.metric ? <Text style={styles.exploreRailMetric} numberOfLines={1}>{item.metric}</Text> : null}
    </Pressable>
  );
}

function ExploreRail({ title, items, onOpen }: { title: string; items: ParityCard[]; onOpen: (item: ParityCard) => void }) {
  const styles = useCommunityStyles();
  const routedItems = items.filter((item) => Boolean(item.route));
  if (!routedItems.length) return null;
  return (
    <View style={styles.exploreSection}>
      <Text style={styles.exploreSectionTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exploreRail}>
        {routedItems.map((item) => <ExploreRailCard key={`${item.kind}-${item.id}`} item={item} onPress={() => onOpen(item)} />)}
      </ScrollView>
    </View>
  );
}

export function CommunityFeedScreen() {
  const styles = useCommunityStyles();
  const theme = usePluggdTheme();
  const bottomInset = useBottomChromeInset();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; filter?: string; hashtag?: string }>();
  const [tab, setTab] = useState<CommunityTabKey>(normalizedTab(params.tab));
  const [filter, setFilter] = useState<CommunityFeedFilterKey>(normalizedFilter(params.filter));
  const [boardSearch, setBoardSearch] = useState('');
  const [boardCategory, setBoardCategory] = useState('All');
  const navigate = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };
  const chooseFilter = (next: CommunityFeedFilterKey) => {
    if (next !== filter) selectionHaptic();
    setFilter(next);
  };
  const chooseBoardCategory = (next: string) => {
    if (next !== boardCategory) selectionHaptic();
    setBoardCategory(next);
  };
  const hashtag = typeof params.hashtag === 'string' ? params.hashtag.replace(/^#/, '') : null;

  const query = useQuery({
    queryKey: ['community-feed', 'bundle'],
    queryFn: loadCommunityFeedBundle,
    staleTime: 1000 * 30,
  });

  const bundle = query.data;
  const posts = useMemo(() => filterCommunityPosts(bundle?.posts ?? [], filter, hashtag), [bundle?.posts, filter, hashtag]);
  const boardCategories = useMemo(() => ['All', ...Array.from(new Set(
    (bundle?.boards ?? []).map((board) => board.category?.trim()).filter(Boolean) as string[],
  )).sort((left, right) => left.localeCompare(right))], [bundle?.boards]);
  const visibleBoards = useMemo(() => {
    const search = boardSearch.trim().toLocaleLowerCase('en-GB');
    return (bundle?.boards ?? []).filter((board) => {
      const categoryMatches = boardCategory === 'All' || board.category === boardCategory;
      const searchMatches = !search || `${board.name} ${board.description || ''} ${board.category || ''}`.toLocaleLowerCase('en-GB').includes(search);
      return categoryMatches && searchMatches;
    });
  }, [boardCategory, boardSearch, bundle?.boards]);
  const feedRows = useMemo<FeedListRow[]>(() => [
    { kind: 'switcher', id: 'community-switcher' },
    { kind: 'filters', id: 'community-filters' },
    ...(posts.length
      ? posts.map((post, postIndex) => ({ kind: 'post' as const, id: post.id, post, postIndex }))
      : [{ kind: 'empty' as const, id: 'community-feed-empty' as const }]),
  ], [posts]);
  const boardRows = useMemo<BoardListRow[]>(() => [
    { kind: 'switcher', id: 'community-switcher' },
    { kind: 'intro', id: 'board-intro' },
    ...(visibleBoards.length
      ? visibleBoards.map((board) => ({ kind: 'board' as const, id: board.id, board }))
      : [{ kind: 'empty' as const, id: 'community-board-empty' as const }]),
  ], [visibleBoards]);
  const communityRows = useMemo<CommunityListRow[]>(() => [
    { kind: 'switcher', id: 'community-switcher' },
    ...((bundle?.communities ?? []).length
      ? (bundle?.communities ?? []).map((item) => ({ kind: 'community' as const, id: item.id, item }))
      : [{ kind: 'empty' as const, id: 'community-list-empty' as const }]),
  ], [bundle?.communities]);

  const stickySwitcher = (
    <View style={styles.stickySwitchWrap}>
      <CommunityInternalSwitcher value={tab} onChange={setTab} />
    </View>
  );

  const feedFilters = (
    <View style={styles.feedLead}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FEED_FILTERS.map((item) => {
          const active = item.key === filter;
          return <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.filterTab, active && styles.filterTabActive]} onPress={() => chooseFilter(item.key)}><Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text></Pressable>;
        })}
      </ScrollView>
    </View>
  );

  if (query.isLoading) {
    return (
      <View style={styles.screen}>
        <DiscoveryHeader backToDiscovery compactReturn showReturnLabel={false} />
        <MobileStoriesRail title="Scene stories" compact />
        {stickySwitcher}
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accentText} />
        </View>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={styles.screen}>
        <DiscoveryHeader backToDiscovery compactReturn showReturnLabel={false} />
        <MobileStoriesRail title="Scene stories" compact />
        {stickySwitcher}
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Community could not load</Text>
          <Text style={styles.emptyBody}>Pull to refresh or try again in a moment.</Text>
          <Pressable accessibilityRole="button" style={styles.retry} onPress={() => { selectionHaptic(); void query.refetch(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (tab === 'boards') {
    return (
      <View style={styles.screen}>
        <DiscoveryHeader backToDiscovery compactReturn showReturnLabel={false} />
        <FlatList
          contentInsetAdjustmentBehavior="never"
          data={boardRows}
          keyExtractor={(row) => row.id}
          ListHeaderComponent={<View />}
          stickyHeaderIndices={[1]}
          renderItem={({ item: row }) => {
            if (row.kind === 'switcher') return stickySwitcher;
            if (row.kind === 'intro') return (
              <View style={styles.boardIntro}>
                <Text style={styles.indexEyebrow}>COMMUNITY BOARDS</Text>
                <Text style={styles.indexTitle}>Find your people. Join the conversation.</Text>
                <Text style={styles.indexBody}>{bundle?.boards.length || 0} active boards organised around scenes, craft and shared interests.</Text>
                <View style={styles.boardSearch}>
                  <MaterialIcons name="search" size={20} color={theme.colors.textMuted} />
                  <TextInput
                    accessibilityLabel="Search community boards"
                    placeholder="Search boards"
                    placeholderTextColor={theme.colors.textMuted}
                    value={boardSearch}
                    onChangeText={setBoardSearch}
                    style={styles.boardSearchInput}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardCategories}>
                  {boardCategories.map((category) => {
                    const active = category === boardCategory;
                    return (
                      <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Show ${category} boards`} onPress={() => chooseBoardCategory(category)} style={[styles.boardCategoryChip, active && styles.boardCategoryChipActive]}>
                        <Text style={[styles.boardCategoryChipText, active && styles.boardCategoryChipTextActive]}>{category}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={styles.boardResultCount}>{visibleBoards.length} {visibleBoards.length === 1 ? 'BOARD' : 'BOARDS'}</Text>
              </View>
            );
            if (row.kind === 'empty') return <View style={styles.compactEmpty}><Text style={styles.emptyTitle}>No matching boards</Text><Text style={styles.emptyBody}>Try another category or search term.</Text></View>;
            return <BoardIndexRow board={row.board} onPress={() => navigate(row.board.route)} />;
          }}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          refreshControl={<RefreshControl tintColor={theme.colors.accentText} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
          ItemSeparatorComponent={() => <View style={styles.boardDivider} />}
        />
      </View>
    );
  }

  if (tab === 'explore') {
    const destinations = [
      { id: 'boards', title: 'Boards', detail: `${bundle?.boards.length || 0} forums`, icon: 'forum', action: () => { selectionHaptic(); setTab('boards'); } },
      { id: 'communities', title: 'Communities', detail: `${bundle?.communities.length || 0} spaces`, icon: 'groups', action: () => { selectionHaptic(); setTab('communities'); } },
      { id: 'live', title: 'Live', detail: 'Rooms and broadcasts', icon: 'sensors', action: () => navigate('/live') },
      { id: 'events', title: 'Events', detail: 'Shows and meet-ups', icon: 'event', action: () => navigate('/events') },
      { id: 'creators', title: 'Find creators', detail: 'Artists, DJs and producers', icon: 'person-search', action: () => navigate('/search') },
      { id: 'soundboards', title: 'Soundboards', detail: 'Ideas building in public', icon: 'dashboard-customize', action: () => navigate('/soundboards') },
      { id: 'plug', title: 'THE PLUG', detail: 'Culture and scene reporting', icon: 'newspaper', action: () => navigate('/plug') },
      { id: 'maps', title: 'Maps', detail: 'Music around you', icon: 'public', action: () => navigate('/maps') },
    ];

    return (
      <View style={styles.screen}>
        <DiscoveryHeader backToDiscovery compactReturn showReturnLabel={false} />
        <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: bottomInset }} refreshControl={<RefreshControl tintColor={theme.colors.accentText} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}>
          <View />
          {stickySwitcher}
          <View style={styles.exploreIntro}>
            <Text style={styles.indexEyebrow}>EXPLORE COMMUNITY</Text>
            <Text style={styles.indexTitle}>Choose where you want to go.</Text>
            <Text style={styles.indexBody}>Jump into a forum, find a live room, meet creators or follow what is happening around the scene.</Text>
          </View>
          <View style={styles.destinationGrid}>
            {destinations.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={item.action} style={styles.destinationCard}>
                <MaterialIcons name={item.icon as any} size={22} color={theme.colors.accentText} />
                <View style={styles.destinationCopy}><Text style={styles.destinationTitle}>{item.title}</Text><Text style={styles.destinationDetail}>{item.detail}</Text></View>
                <MaterialIcons name="north-east" size={17} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </View>
          <ExploreRail title="Active now" items={bundle?.liveNow ?? []} onOpen={(item) => navigate(item.route!)} />
          <ExploreRail title="Communities to join" items={bundle?.communities ?? []} onOpen={(item) => navigate(item.route!)} />
          <ExploreRail title="People to know" items={bundle?.whoToFollow ?? []} onOpen={(item) => navigate(item.route!)} />
          <ExploreRail title="Happening nearby" items={bundle?.nearbyEvents ?? []} onOpen={(item) => navigate(item.route!)} />
          <ExploreRail title="From THE PLUG" items={bundle?.editorials ?? []} onOpen={(item) => navigate(item.route!)} />
          <ExploreRail title="Community radio" items={bundle?.radio ?? []} onOpen={(item) => navigate(item.route!)} />
        </ScrollView>
      </View>
    );
  }

  if (tab === 'communities') {
    return (
      <View style={styles.screen}>
        <DiscoveryHeader backToDiscovery compactReturn showReturnLabel={false} />
        <FlatList
          contentInsetAdjustmentBehavior="never"
          data={communityRows}
          keyExtractor={(row) => row.id}
          ListHeaderComponent={<View />}
          stickyHeaderIndices={[1]}
          contentContainerStyle={{ paddingBottom: bottomInset }}
          refreshControl={<RefreshControl tintColor={theme.colors.accentText} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
          renderItem={({ item: row }) => {
            if (row.kind === 'switcher') return stickySwitcher;
            if (row.kind === 'empty') return <View style={styles.empty}><Text style={styles.emptyTitle}>No communities yet</Text><Text style={styles.emptyBody}>Open Boards or Explore to find active conversations.</Text></View>;
            return <SecondaryRow item={row.item} onPress={() => row.item.route && navigate(row.item.route)} />;
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <DiscoveryHeader backToDiscovery compactReturn showReturnLabel={false} />
      <FlatList
        contentInsetAdjustmentBehavior="never"
        data={feedRows}
        keyExtractor={(row) => row.id}
        ListHeaderComponent={<MobileStoriesRail title="Scene stories" compact />}
        ListHeaderComponentStyle={styles.storiesHeader}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: bottomInset, gap: 14 }}
        refreshControl={<RefreshControl tintColor={theme.colors.accentText} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        renderItem={({ item: row }) => {
          if (row.kind === 'switcher') return stickySwitcher;
          if (row.kind === 'filters') return feedFilters;
          if (row.kind === 'empty') return <View style={styles.empty}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyBody}>Start the first conversation or try another feed filter.</Text></View>;
          const { post, postIndex } = row;
          return <>
            <MobileSocialPostCard post={post} onMutated={() => void query.refetch()} />
            {postIndex === 1 && bundle ? <CommunityFeedInterstitial kind="the_plug" bundle={bundle} /> : null}
            {postIndex === 5 ? (
              <View style={styles.lowerShortcuts}>
                <Text style={styles.lowerShortcutsTitle}>More ways in</Text>
                <CommunityBottomDockControls onChange={setTab} />
              </View>
            ) : null}
            {postIndex === 5 && bundle ? <CommunityFeedInterstitial kind="live_now" bundle={bundle} /> : null}
            {postIndex === 7 && bundle ? <CommunityFeedInterstitial kind="who_to_follow" bundle={bundle} /> : null}
            {postIndex === 10 && bundle ? <CommunityFeedInterstitial kind="trending_boards" bundle={bundle} /> : null}
          </>;
        }}
      />
    </View>
  );
}

function useCommunityStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => {
    const COLORS = {
      canvas: theme.colors.background,
      surface: theme.colors.surface,
      border: theme.colors.border,
      orange: theme.colors.accentText,
      white: theme.colors.text,
      muted: theme.colors.textMuted,
    };
    return StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  storiesHeader: { marginTop: -3, marginBottom: -20 },
  feedLead: { gap: 8 },
  stickySwitchWrap: { zIndex: 8, paddingTop: 2, paddingBottom: 4, backgroundColor: COLORS.canvas, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  filters: { flexGrow: 1, paddingHorizontal: 10, justifyContent: 'space-between', gap: 0 },
  filterTab: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  filterTabActive: { borderColor: COLORS.orange },
  filterText: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  filterTextActive: { color: COLORS.white },
  lowerShortcuts: { gap: 8, paddingTop: 4, paddingBottom: 4 },
  lowerShortcutsTitle: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiBold, fontSize: 11, marginHorizontal: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  center: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, gap: 8 },
  emptyTitle: { color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  emptyBody: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
  retry: { marginTop: 8, minHeight: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  rowTap: { height: 210, marginHorizontal: 20, marginBottom: 12, borderRadius: 6, overflow: 'hidden', padding: 14, justifyContent: 'space-between' },
  rowImage: { ...StyleSheet.absoluteFillObject },
  rowFallback: { backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center' },
  rowTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCard: { zIndex: 2, gap: 5 },
  rowEyebrow: { color: '#FF6600', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2 },
  rowTitle: { color: theme.colors.mediaText, fontFamily: 'Sora-Bold', fontSize: 20, lineHeight: 24 },
  rowSubtitle: { color: '#DDD5CA', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  rowMetric: { color: '#FF6600', fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  boardIntro: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  indexEyebrow: { color: COLORS.orange, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  indexTitle: { color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, marginTop: 5 },
  indexBody: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  boardSearch: { minHeight: 46, borderWidth: 1, borderColor: theme.colors.controlBorder, borderRadius: 8, marginTop: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: COLORS.surface },
  boardSearchInput: { flex: 1, color: COLORS.white, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, paddingVertical: 0 },
  boardCategories: { gap: 8, paddingTop: 10, paddingRight: 20 },
  boardCategoryChip: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, paddingHorizontal: 13 },
  boardCategoryChipActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  boardCategoryChipText: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  boardCategoryChipTextActive: { color: theme.colors.onAccent },
  boardResultCount: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.1, marginTop: 14 },
  boardRow: { minHeight: 82, marginHorizontal: 20, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  boardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,102,0,0.10)', alignItems: 'center', justifyContent: 'center' },
  boardCopy: { flex: 1, minWidth: 0, gap: 3 },
  boardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  boardTitle: { flexShrink: 1, color: COLORS.white, fontFamily: pluggdFonts.satoshiBold, fontSize: 14.5 },
  boardDescription: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5 },
  boardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardCategory: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5 },
  boardFeatured: { color: COLORS.orange, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 0.8 },
  joinedLabel: { color: theme.colors.success, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 0.8 },
  boardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginHorizontal: 20 },
  compactEmpty: { marginHorizontal: 20, marginTop: 16, paddingVertical: 28, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, gap: 5 },
  exploreIntro: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  destinationGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destinationCard: { flexBasis: '47.5%', flexGrow: 1, minHeight: 92, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.surface, padding: 11, gap: 7 },
  destinationCopy: { flex: 1 },
  destinationTitle: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  destinationDetail: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  exploreSection: { paddingTop: 22 },
  exploreSectionTitle: { color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 17, marginHorizontal: 20, marginBottom: 10 },
  exploreRail: { paddingHorizontal: 20, paddingRight: 32, gap: 10 },
  exploreRailCard: { width: 148 },
  exploreRailImage: { width: 148, height: 96, borderRadius: 6, backgroundColor: COLORS.surface },
  exploreRailEyebrow: { color: COLORS.orange, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 7 },
  exploreRailTitle: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5, lineHeight: 16, marginTop: 2 },
  exploreRailMetric: { color: COLORS.muted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 9.5, marginTop: 3 },
    });
  }, [theme]);
}
