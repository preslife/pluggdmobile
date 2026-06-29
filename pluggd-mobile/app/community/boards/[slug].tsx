import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileSocialPostCard } from '../../../src/features/culture/MobileSocialPostCard';
import {
  joinCommunityBoard,
  leaveCommunityBoard,
  loadCommunityBoardDetail,
} from '../../../src/features/culture/mobileSocial';
import { impactHaptic, selectionHaptic } from '../../../src/design/haptics';
import { pluggdFonts } from '../../../src/design/typography';
import { formatCompact } from '../../../src/lib/mobileContent';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262637',
  orange: '#FF5A00',
  white: '#FFFFFF',
  soft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

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
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={boardQuery.isRefetching} onRefresh={() => boardQuery.refetch()} tintColor={COLORS.orange} />}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 56), paddingBottom: Math.max(insets.bottom + 172, 196) }}
      >
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={28} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>BOARD</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open community" style={styles.iconButton} onPress={() => router.push('/community' as any)}>
            <MaterialIcons name="groups" size={21} color={COLORS.white} />
          </Pressable>
        </View>

        {boardQuery.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.orange} />
            <Text style={styles.loadingText}>Loading board...</Text>
          </View>
        ) : null}

        {!boardQuery.isLoading && !board ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Board unavailable</Text>
            <Text style={styles.emptyBody}>This community board is unavailable or has been removed.</Text>
          </View>
        ) : null}

        {board ? (
          <>
            <View style={styles.hero}>
              <LinearGradient
                colors={['rgba(255,90,0,0.22)', 'rgba(124,58,237,0.12)', 'rgba(18,18,26,0.98)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.boardIcon}>
                <MaterialIcons name={boardIcon(board.icon)} size={34} color={COLORS.orange} />
              </View>
              <Text style={styles.kicker}>COMMUNITY BOARD</Text>
              <Text style={styles.title}>{board.name}</Text>
              {board.description ? <Text style={styles.description}>{board.description}</Text> : null}
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <MaterialIcons name="groups" size={15} color={COLORS.orange} />
                  <Text style={styles.metaText}>{formatCompact(boardQuery.data?.member_count ?? 0)} members</Text>
                </View>
                {board.category ? (
                  <View style={styles.metaPill}>
                    <MaterialIcons name="forum" size={15} color={COLORS.orange} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  headerRow: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, lineHeight: 17, letterSpacing: 1.4 },
  loading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontFamily: pluggdFonts.satoshiBold, color: COLORS.muted, fontSize: 13, fontWeight: '800' },
  hero: { marginHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', backgroundColor: COLORS.surface, padding: 18, gap: 10 },
  boardIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: 'rgba(255,90,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,90,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.orange, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.white, fontSize: 34, lineHeight: 39, fontWeight: '900' },
  description: { fontFamily: pluggdFonts.satoshiMedium, color: COLORS.soft, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: { minHeight: 30, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(8,8,12,0.38)', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  metaText: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.muted, fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  joinButton: { flex: 1, height: 46, borderRadius: 23, borderWidth: 1, borderColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  joinButtonActive: { backgroundColor: COLORS.orange },
  joinText: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.orange, fontSize: 13, fontWeight: '900' },
  joinTextActive: { color: COLORS.canvas },
  threadButton: { minWidth: 132, height: 46, borderRadius: 23, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  threadButtonText: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.canvas, fontSize: 13, fontWeight: '900' },
  typeRow: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  typePill: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 13, justifyContent: 'center' },
  typePillActive: { borderColor: COLORS.orange, backgroundColor: 'rgba(255,90,0,0.16)' },
  typeText: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.soft, fontSize: 12, fontWeight: '900' },
  typeTextActive: { color: COLORS.white },
  composerRow: { marginHorizontal: 16, marginTop: 14, minHeight: 68, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  composerPrompt: { fontFamily: pluggdFonts.satoshiBold, flex: 1, color: COLORS.muted, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  sectionHeader: { marginHorizontal: 16, marginTop: 22, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBlack, fontSize: 17, lineHeight: 21, letterSpacing: 0.4 },
  sectionMeta: { color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 16 },
  postList: { marginHorizontal: 16, gap: 10 },
  emptyCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16, gap: 8 },
  emptyTitle: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.white, fontSize: 17, fontWeight: '900' },
  emptyBody: { fontFamily: pluggdFonts.satoshiMedium, color: COLORS.muted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
