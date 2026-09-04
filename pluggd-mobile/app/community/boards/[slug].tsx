import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecoveryState } from '../../../components/ContentUI';
import { MobileSocialPostCard } from '../../../src/features/culture/MobileSocialPostCard';
import {
  joinCommunityBoard,
  leaveCommunityBoard,
  loadCommunityBoardDetail,
} from '../../../src/features/culture/mobileSocial';
import { impactHaptic, selectionHaptic } from '../../../src/design/haptics';
import { pluggdFonts } from '../../../src/design/typography';
import { formatCompact } from '../../../src/lib/mobileContent';
import { useBottomChromeInset } from '../../../src/design/useBottomChromeInset';
import { usePluggdTheme } from '../../../src/design/usePluggdTheme';

const BOARD_FILTERS = ['Latest', 'Hot', 'Tickets', 'Audio', 'Events', 'Questions'] as const;
type BoardFilter = (typeof BOARD_FILTERS)[number];

function boardIcon(icon?: string | null): keyof typeof MaterialIcons.glyphMap {
  if (icon === 'headphones') return 'headset';
  if (icon === 'waves') return 'graphic-eq';
  if (icon === 'music') return 'music-note';
  if (icon === 'users') return 'groups';
  if (icon === 'disc') return 'album';
  if (icon === 'sparkles') return 'auto-awesome';
  if (icon === 'megaphone') return 'campaign';
  if (icon === 'radio') return 'settings-input-antenna';
  if (icon === 'trophy') return 'emoji-events';
  if (icon === 'wrench') return 'build';
  return 'forum';
}

function postText(post: any) {
  const destinations = Array.isArray(post.destinations)
    ? post.destinations.map((destination: any) => `${destination.destination_type || ''} ${destination.related_type || ''}`).join(' ')
    : '';
  return `${post.title || ''} ${post.body || ''} ${post.content || ''} ${post.post_type || ''} ${destinations}`.toLowerCase();
}

function filterBoardPosts(posts: any[], filter: BoardFilter) {
  const sorted = [...posts];
  if (filter === 'Hot') {
    return sorted.sort((a, b) => {
      const left = (a.likes_count || a.like_count || 0) + (a.comments_count || a.comment_count || 0);
      const right = (b.likes_count || b.like_count || 0) + (b.comments_count || b.comment_count || 0);
      return right - left;
    });
  }
  if (filter === 'Tickets') return sorted.filter((post) => /ticket|spare|swap|sold out|entry|queue|guest|afterparty|meetup/.test(postText(post)));
  if (filter === 'Audio') return sorted.filter((post) => /audio|beat|mix|track|release|soundboard|sample|verse|producer/.test(postText(post)));
  if (filter === 'Events') return sorted.filter((post) => /event|show|gig|live|rsvp|venue|hub/.test(postText(post)));
  if (filter === 'Questions') return sorted.filter((post) => /question|\?|help|how|what|where|why/.test(postText(post)));
  return sorted;
}

export default function CommunityBoardRoute() {
  const theme = usePluggdTheme();
  const styles = useCommunityBoardStyles();
  const bottomInset = useBottomChromeInset();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const boardSlug = String(slug || '');
  const [activeFilter, setActiveFilter] = useState<BoardFilter>('Latest');

  const boardQuery = useQuery({
    queryKey: ['culture', 'community-board', boardSlug],
    queryFn: () => loadCommunityBoardDetail(boardSlug),
    enabled: !!boardSlug,
  });

  const board = boardQuery.data?.board ?? null;
  const isMember = Boolean(boardQuery.data?.is_member);

  const membershipMutation = useMutation({
    mutationFn: async () => {
      if (!board?.id) throw new Error('Board unavailable.');
      const result = isMember ? await leaveCommunityBoard(board.id) : await joinCommunityBoard(board.id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['culture', 'community-board', boardSlug] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'backstage'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'mobile-social-feed'] });
    },
    onError: (error) => Alert.alert('Board action failed', error instanceof Error ? error.message : String(error)),
  });

  const createThread = () => {
    if (!board?.id) return;
    selectionHaptic();
    router.push({ pathname: '/create-post', params: { boardId: board.id, type: 'discussion' } } as any);
  };

  const filteredPosts = useMemo(() => filterBoardPosts(boardQuery.data?.posts ?? [], activeFilter), [activeFilter, boardQuery.data?.posts]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <LinearGradient colors={theme.scheme === 'dark' ? ['#0A0806', '#120D08', '#0A0806'] : ['#FFF8ED', '#F4E7D2', '#FFF8ED']} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={boardQuery.isRefetching} onRefresh={() => boardQuery.refetch()} tintColor={theme.colors.accentText} />}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 56), paddingBottom: bottomInset }}
      >
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}>
            <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>BOARD</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open community" style={styles.iconButton} onPress={() => router.push('/community' as any)}>
            <MaterialIcons name="groups" size={21} color={theme.colors.text} />
          </Pressable>
        </View>

        {boardQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentText} />
            <Text style={styles.loadingText}>Loading board...</Text>
          </View>
        ) : null}

        {!boardQuery.isLoading && !board ? (
          <RecoveryState
            eyebrow="BOARD CLOSED"
            title="This conversation has moved on"
            body="The board may be private, archived or living under a new name. Find an active scene and join in."
            icon="dynamic-feed"
            primaryLabel="Open community"
            onPrimary={() => router.replace('/community' as any)}
            secondaryLabel="Go back"
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}
          />
        ) : null}

        {board ? (
          <>
            <View style={styles.hero}>
              <LinearGradient
                colors={theme.scheme === 'dark'
                  ? ['rgba(255,102,0,0.22)', 'rgba(124,58,237,0.12)', 'rgba(23,19,16,0.98)']
                  : ['rgba(232,79,0,0.13)', 'rgba(124,58,237,0.08)', 'rgba(255,252,247,0.98)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.boardIcon}>
                <MaterialIcons name={boardIcon(board.icon)} size={34} color={theme.colors.accentText} />
              </View>
              <Text style={styles.kicker}>COMMUNITY BOARD</Text>
              <Text style={styles.title}>{board.name}</Text>
              {board.description ? <Text style={styles.description}>{board.description}</Text> : null}
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <MaterialIcons name="groups" size={15} color={theme.colors.accentText} />
                  <Text style={styles.metaText}>{formatCompact(boardQuery.data?.member_count ?? 0)} members</Text>
                </View>
                {board.category ? (
                  <View style={styles.metaPill}>
                    <MaterialIcons name="forum" size={15} color={theme.colors.accentText} />
                    <Text style={styles.metaText}>{board.category}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.heroActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isMember ? `Leave ${board.name}` : `Join ${board.name}`}
                  disabled={membershipMutation.isPending}
                  style={[styles.joinButton, isMember && styles.joinButtonActive]}
                  onPress={() => membershipMutation.mutate()}
                >
                  <Text style={[styles.joinText, isMember && styles.joinTextActive]}>
                    {membershipMutation.isPending ? 'Saving...' : isMember ? 'Joined' : 'Join Board'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {BOARD_FILTERS.map((filter) => {
                const selected = activeFilter === filter;
                return (
                <Pressable
                  key={filter}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.typePill, selected && styles.typePillActive]}
                  onPress={() => {
                    selectionHaptic();
                    setActiveFilter(filter);
                  }}
                >
                  <Text style={[styles.typeText, selected && styles.typeTextActive]}>{filter}</Text>
                </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.composerRow}>
              <Text style={styles.composerPrompt}>Start a board thread for {board.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Start a thread" style={styles.threadButton} onPress={createThread}>
                <Text style={styles.threadButtonText}>Start Thread</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>BOARD THREADS</Text>
              <Text style={styles.sectionMeta}>{formatCompact(filteredPosts.length)} posts</Text>
            </View>

            {filteredPosts.length ? (
              <View style={styles.postList}>
                {filteredPosts.map((post) => (
                  <MobileSocialPostCard
                    key={post.id}
                    post={post}
                    variant="compact"
                    onMutated={() => {
                      void boardQuery.refetch();
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No {activeFilter.toLowerCase()} threads yet</Text>
                <Text style={styles.emptyBody}>Start the first real discussion for this board. Posts are saved through social_post_destinations.</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function useCommunityBoardStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, lineHeight: 17, letterSpacing: 1.4 },
  loading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontFamily: pluggdFonts.satoshiBold, color: theme.colors.textMuted, fontSize: 13, fontWeight: '800' },
  hero: { marginHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', backgroundColor: theme.colors.surface, padding: 18, gap: 10 },
  boardIcon: { width: 62, height: 62, borderRadius: 5, backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: pluggdFonts.satoshiBlack, color: theme.colors.accentText, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontFamily: pluggdFonts.displayExtraBold, color: theme.colors.text, fontSize: 34, lineHeight: 39, fontWeight: '800' },
  description: { fontFamily: pluggdFonts.satoshiMedium, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundElevated, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  metaText: { fontFamily: pluggdFonts.satoshiBlack, color: theme.colors.textMuted, fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  joinButton: { flex: 1, height: 46, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.borderAccent, alignItems: 'center', justifyContent: 'center' },
  joinButtonActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  joinText: { fontFamily: pluggdFonts.satoshiBlack, color: theme.colors.accentText, fontSize: 13, fontWeight: '900' },
  joinTextActive: { color: theme.colors.onAccent },
  threadButton: { minWidth: 132, height: 46, borderRadius: 5, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  threadButtonText: { fontFamily: pluggdFonts.satoshiBlack, color: theme.colors.onAccent, fontSize: 13, fontWeight: '900' },
  typeRow: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  typePill: { minHeight: 44, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 13, justifyContent: 'center' },
  typePillActive: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  typeText: { fontFamily: pluggdFonts.satoshiBlack, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '900' },
  typeTextActive: { color: theme.colors.accentText },
  composerRow: { marginHorizontal: 16, marginTop: 14, minHeight: 68, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  composerPrompt: { fontFamily: pluggdFonts.satoshiBold, flex: 1, color: theme.colors.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  sectionHeader: { marginHorizontal: 16, marginTop: 22, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 21, letterSpacing: -0.2 },
  sectionMeta: { color: theme.colors.textMuted, fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 16 },
  postList: { marginHorizontal: 16, gap: 10 },
  emptyCard: { marginHorizontal: 16, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16, gap: 8 },
  emptyTitle: { fontFamily: pluggdFonts.displayBold, color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  emptyBody: { fontFamily: pluggdFonts.satoshiMedium, color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
}), [theme]);
}
