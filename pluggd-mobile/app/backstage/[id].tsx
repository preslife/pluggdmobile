import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { pluggdFonts } from '../../src/design/typography';
import { contentInitials, formatCompact, formatDate } from '../../src/lib/mobileContent';
import { joinBackstage, leaveBackstage, loadBackstageDetail } from '../../src/features/culture/mobileServices';
import { MobileSocialPostCard } from '../../src/features/culture/MobileSocialPostCard';

const ORANGE = '#FF5A00';
const CANVAS = '#08080C';
const SURFACE = '#12121A';
const BORDER = '#1F1F2E';
const MUTED = '#8E8E9F';

const TABS = ['Posts', 'Threads', 'Rooms', 'Events', 'Soundboards', 'Drops'] as const;
type DetailTab = (typeof TABS)[number];

export default function BackstageCommunityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DetailTab>('Posts');

  const detail = useQuery({
    queryKey: ['culture', 'backstage-detail', id],
    queryFn: () => loadBackstageDetail(String(id)),
    enabled: !!id,
  });

  const community = detail.data?.community ?? null;
  const membership = detail.data?.membership ?? community?.membership ?? null;
  const isJoined = !!membership && membership.status !== 'left';

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!community?.id) throw new Error('Community unavailable.');
      const result = isJoined ? await leaveBackstage(community.id) : await joinBackstage(community.id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['culture', 'backstage'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'backstage-detail', id] });
    },
    onError: (error) => Alert.alert('Community action failed', error instanceof Error ? error.message : String(error)),
  });

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[CANVAS, '#090910', CANVAS]} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 54), paddingBottom: 190 }}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={[styles.joinButton, isJoined && styles.joinButtonActive]}
            onPress={() => joinMutation.mutate()}
            disabled={!community || joinMutation.isPending}
          >
            <Text style={[styles.joinText, isJoined && styles.joinTextActive]}>
              {joinMutation.isPending ? 'Saving...' : isJoined ? 'Joined' : 'Join'}
            </Text>
          </Pressable>
        </View>

        {detail.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={ORANGE} />
            <Text style={styles.loadingText}>Loading community...</Text>
          </View>
        ) : null}

        {!detail.isLoading && !community ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Community unavailable</Text>
            <Text style={styles.emptyBody}>This community is unavailable or has been removed.</Text>
          </View>
        ) : null}

        {community ? (
          <>
            <View style={styles.hero}>
              {community.cover_image_url ? <Image source={{ uri: community.cover_image_url }} style={styles.fill} /> : null}
              <LinearGradient colors={['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.88)']} style={StyleSheet.absoluteFill} />
              <View style={styles.heroCopy}>
                <View style={styles.avatar}>
                  {community.avatar_url ? <Image source={{ uri: community.avatar_url }} style={styles.fill} /> : <Text style={styles.avatarText}>{contentInitials(community.title)}</Text>}
                </View>
                <Text style={styles.eyebrow}>Official Community</Text>
                <Text style={styles.title}>{community.title}</Text>
                <Text style={styles.meta}>
                  {formatCompact(community.member_count)} members
                  {community.online_count != null ? ` · ${formatCompact(community.online_count)} online` : ''}
                  {membership?.role ? ` · ${membership.role}` : ''}
                </Text>
                {community.description ? <Text style={styles.description} numberOfLines={3}>{community.description}</Text> : null}
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {TABS.map((tab) => {
                const selected = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.tab, selected && styles.tabActive]}
                    onPress={() => {
                      selectionHaptic();
                      setActiveTab(tab);
                    }}
                  >
                    <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {activeTab === 'Posts' ? (
              <View style={styles.section}>
                {detail.data?.socialPosts?.length ? detail.data.socialPosts.map((post) => (
                  <MobileSocialPostCard key={post.id} post={post} variant="compact" onMutated={() => detail.refetch()} />
                )) : detail.data?.posts.length ? detail.data.posts.map((post) => {
                  const postBody = post.body || (post as any).content || '';
                  return (
                    <Pressable key={post.id} style={styles.threadCard} onPress={() => router.push(`/post/${post.id}` as any)}>
                      <Text style={styles.threadTag}>{post.post_type?.replace(/_/g, ' ') || 'Post'}</Text>
                      <Text style={styles.threadTitle}>{post.title || postBody}</Text>
                      <Text style={styles.threadBody} numberOfLines={2}>{postBody}</Text>
                      <Text style={styles.threadMeta}>{formatCompact(post.likes_count)} likes · {formatCompact(post.comments_count)} comments</Text>
                    </Pressable>
                  );
                }) : <EmptyBlock title="No posts yet" body="Creator announcements, member updates and media moments will appear here." />}
              </View>
            ) : null}

            {activeTab === 'Threads' ? (
              <View style={styles.section}>
                {detail.data?.boards.length ? detail.data.boards.slice(0, 6).map((board) => (
                  <Pressable key={board.id} style={styles.boardCard} onPress={() => router.push(board.route as any)}>
                    <Text style={styles.threadTag}>Board</Text>
                    <Text style={styles.threadTitle}>{board.name}</Text>
                    {board.description ? <Text style={styles.threadBody} numberOfLines={2}>{board.description}</Text> : null}
                    <Text style={styles.threadMeta}>{board.joined ? 'Joined' : 'Open board feed'}</Text>
                  </Pressable>
                )) : null}
                {detail.data?.threads.length ? detail.data.threads.map((thread) => (
                  <Pressable key={thread.id} style={styles.threadCard} onPress={() => router.push((thread.route || `/post/${thread.id}`) as any)}>
                    <Text style={styles.threadTag}>{thread.category || 'Thread'}</Text>
                    <Text style={styles.threadTitle}>{thread.title}</Text>
                    {thread.body ? <Text style={styles.threadBody} numberOfLines={2}>{thread.body}</Text> : null}
                    <Text style={styles.threadMeta}>{formatCompact(thread.like_count)} likes · {formatCompact(thread.comment_count)} replies</Text>
                  </Pressable>
                )) : detail.data?.boards.length ? null : <EmptyBlock title="No active threads" body="Ticket questions, release discussions and feedback threads will appear here." />}
              </View>
            ) : null}

            {activeTab === 'Rooms' ? (
              <View style={styles.section}>
                {detail.data?.rooms.length ? detail.data.rooms.map((room) => (
                  <Pressable
                    key={room.id}
                    style={styles.roomCard}
                    onPress={() => router.push(routeForRoom(room, community) as any)}
                  >
                    <View style={styles.liveDot} />
                    <View style={styles.roomCopy}>
                      <Text style={styles.threadTitle}>{room.title}</Text>
                      <Text style={styles.threadBody} numberOfLines={2}>{room.description || room.room_type || 'Community room'}</Text>
                    </View>
                    <Text style={styles.openText}>Join Room</Text>
                  </Pressable>
                )) : <EmptyBlock title="No rooms open" body="Live community rooms will appear here when this community is active." />}
              </View>
            ) : null}

            {activeTab === 'Events' ? (
              <View style={styles.section}>
                {detail.data?.events.length ? detail.data.events.map((event) => (
                  <Pressable
                    key={event.id}
                    style={styles.threadCard}
                    onPress={() => router.push(`/community/events/${event.id}` as any)}
                  >
                    <Text style={styles.threadTag}>{event.event_type || 'Event'}</Text>
                    <Text style={styles.threadTitle}>{event.title}</Text>
                    <Text style={styles.threadBody}>{event.location || 'Online / TBA'} · {formatDate(event.starts_at)}</Text>
                    <Text style={styles.threadMeta}>Open community event</Text>
                  </Pressable>
                )) : <EmptyBlock title="No community events" body="Community events and ticket threads will appear here when scheduled." />}
              </View>
            ) : null}

            {activeTab === 'Soundboards' ? (
              <View style={styles.section}>
                {detail.data?.soundboards.length ? detail.data.soundboards.map((soundboard) => (
                  <Pressable key={soundboard.id} style={styles.soundboardCard} onPress={() => router.push(`/soundboards/${soundboard.id}` as any)}>
                    <View style={styles.soundboardArt}>
                      {soundboard.cover_image_url ? <Image source={{ uri: soundboard.cover_image_url }} style={styles.fill} /> : <Text style={styles.avatarText}>{contentInitials(soundboard.title)}</Text>}
                    </View>
                    <View style={styles.roomCopy}>
                      <Text style={styles.threadTitle} numberOfLines={2}>{soundboard.title || 'Soundboard'}</Text>
                      <Text style={styles.threadBody} numberOfLines={1}>{soundboard.item_count != null ? `${formatCompact(soundboard.item_count)} items` : 'Collaborative audio board'}</Text>
                    </View>
                    <Text style={styles.openText}>Open Soundboard</Text>
                  </Pressable>
                )) : <EmptyBlock title="No soundboards linked yet" body="Collaborative audio boards tied to this community will appear here." />}
              </View>
            ) : null}

            {activeTab === 'Drops' ? (
              <View style={styles.section}>
                {detail.data?.drops.length ? detail.data.drops.map((drop: any) => (
                  <Pressable key={drop.id} style={styles.dropRow} onPress={() => router.push(routeForDrop(drop) as any)}>
                    <View style={styles.dropArt}>
                      {drop.cover_art_url || drop.image_url || drop.cover_url ? <Image source={{ uri: drop.cover_art_url || drop.image_url || drop.cover_url }} style={styles.fill} /> : <Text style={styles.avatarText}>{contentInitials(drop.title)}</Text>}
                    </View>
                    <View style={styles.roomCopy}>
                      <Text style={styles.threadTitle} numberOfLines={1}>{drop.title || 'Untitled drop'}</Text>
                      <Text style={styles.threadBody} numberOfLines={1}>{drop.artist || drop.producer_name || drop.genre || 'PLUGGD drop'}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={MUTED} />
                  </Pressable>
                )) : <EmptyBlock title="No drops linked yet" body="Releases, mixes, videos and producer drops will appear here when linked to this community." />}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function routeForDrop(drop: any) {
  if (drop?.producer_name || drop?.tagged_url || drop?.license_prices) return `/beat/${drop.id}`;
  if (drop?.cover_url || drop?.mix_type || drop?.duration_seconds) return `/mixes/${drop.id}`;
  return `/release/${drop.id}`;
}

function routeForRoom(room: any, community: { id: string; slug?: string | null }) {
  if (room.session_room_id) return { pathname: '/live/session', params: { roomId: room.session_room_id } };
  if (room.live_session_id) return { pathname: '/live/session', params: { roomId: room.live_session_id } };
  return `/backstage/${room.community_id || community.slug || community.id}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CANVAS },
  headerRow: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  joinButton: { minHeight: 38, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,90,0,0.55)', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  joinButtonActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  joinText: { color: ORANGE, fontSize: 13, fontWeight: '900' },
  joinTextActive: { color: '#08080C' },
  loading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: MUTED, fontSize: 13, fontWeight: '800' },
  hero: { minHeight: 220, maxHeight: 240, marginHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', backgroundColor: SURFACE, justifyContent: 'flex-end' },
  fill: { width: '100%', height: '100%' },
  heroCopy: { padding: 18, gap: 6 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  eyebrow: { color: ORANGE, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontWeight: '900' },
  meta: { color: MUTED, fontSize: 13, fontWeight: '800' },
  description: { color: '#E4E4E9', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  tabs: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  tab: { minHeight: 34, borderRadius: 17, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13 },
  tabActive: { borderColor: ORANGE, backgroundColor: 'rgba(255,90,0,0.15)' },
  tabText: { color: MUTED, fontSize: 12, fontWeight: '900' },
  tabTextActive: { color: '#FFFFFF' },
  section: { marginTop: 16, paddingHorizontal: 16, gap: 10 },
  threadCard: { borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 14, gap: 6 },
  boardCard: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,90,0,0.34)', backgroundColor: 'rgba(255,90,0,0.08)', padding: 14, gap: 6 },
  threadTag: { color: ORANGE, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  threadTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.interSemiBold, fontSize: 16, lineHeight: 21 },
  threadBody: { color: MUTED, fontFamily: pluggdFonts.interSemiBold, fontSize: 13, lineHeight: 19 },
  threadMeta: { color: '#62627A', fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 16 },
  roomCard: { minHeight: 82, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4757' },
  roomCopy: { flex: 1, minWidth: 0 },
  openText: { color: ORANGE, fontSize: 12, fontWeight: '900' },
  dropRow: { minHeight: 74, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropArt: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1F1F2E', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  soundboardCard: { minHeight: 136, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  soundboardArt: { width: 84, height: 104, borderRadius: 14, backgroundColor: '#1F1F2E', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 8 },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  emptyBody: { color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
