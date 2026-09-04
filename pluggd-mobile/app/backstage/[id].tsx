import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecoveryState } from '../../components/ContentUI';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { pluggdFonts } from '../../src/design/typography';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { contentInitials, formatCompact, formatDate } from '../../src/lib/mobileContent';
import { joinBackstage, leaveBackstage, loadBackstageDetail } from '../../src/features/culture/mobileServices';
import { MobileSocialPostCard } from '../../src/features/culture/MobileSocialPostCard';
import type { LiveRoomItem } from '../../src/features/culture/mobileTypes';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

const ORANGE = '#ff6600';
const CANVAS = '#0a0806';
const SURFACE = '#171310';
const BORDER = '#241d15';
const MUTED = '#8E8E9F';

const TABS = ['Community', 'Live', 'Collabs'] as const;
type DetailTab = (typeof TABS)[number];

export default function BackstageCommunityDetail() {
  const theme = usePluggdTheme();
  const styles = useBackstageStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomChromeInset();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DetailTab>('Community');

  const detail = useQuery({
    queryKey: ['culture', 'backstage-detail', id],
    queryFn: () => loadBackstageDetail(String(id)),
    enabled: !!id,
  });

  const community = detail.data?.community ?? null;
  const membership = detail.data?.membership ?? community?.membership ?? null;
  const isJoined = !!membership && membership.status !== 'left';
  const creatorProfileRoute = community?.username ? `/creator/${encodeURIComponent(community.username)}` : null;
  const creatorMusicRoute = creatorProfileRoute ? `${creatorProfileRoute}?tab=discography` : null;

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
      <LinearGradient colors={theme.scheme === 'dark' ? ['#0A0806', '#120D08', '#0A0806'] : ['#FFF8ED', '#F4E7D2', '#FFF8ED']} style={StyleSheet.absoluteFill} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 54), paddingBottom: bottomInset }}
      >
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}>
            <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isJoined ? `Leave ${community?.title || 'community'}` : `Join ${community?.title || 'community'}`}
            accessibilityState={{ selected: isJoined, disabled: !community || joinMutation.isPending }}
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
            <ActivityIndicator color={theme.colors.accentText} />
            <Text style={styles.loadingText}>Loading community...</Text>
          </View>
        ) : null}

        {detail.isError ? (
          <RecoveryState
            eyebrow="COMMUNITY UNAVAILABLE"
            title="We could not load this space"
            body="Your connection may have dropped. Try again without losing your place."
            icon="wifi-off"
            primaryLabel="Try again"
            onPrimary={() => detail.refetch()}
            secondaryLabel="Explore community"
            onSecondary={() => router.replace('/community' as any)}
          />
        ) : null}

        {!detail.isLoading && !detail.isError && !community ? (
          <RecoveryState
            eyebrow="BACKSTAGE CLOSED"
            title="This community has gone quiet"
            body="The space may be private, archived or shared under a new link. Find another room built around the music you follow."
            icon="groups"
            primaryLabel="Explore community"
            onPrimary={() => router.replace('/community' as any)}
            secondaryLabel="Go back"
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/community' as any))}
          />
        ) : null}

        {community ? (
          <>
            <View style={styles.hero}>
              {community.cover_image_url ? <Image source={{ uri: community.cover_image_url }} style={styles.heroImage} /> : null}
              <LinearGradient colors={['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.88)']} style={StyleSheet.absoluteFill} />
              <View style={styles.heroCopy}>
                <View style={styles.identityRow}>
                  <View style={styles.avatar}>
                    {community.avatar_url ? <Image source={{ uri: community.avatar_url }} style={styles.fill} /> : <Text style={styles.avatarText}>{contentInitials(community.title)}</Text>}
                  </View>
                  <View style={styles.identityCopy}>
                    <Text style={styles.eyebrow}>{creatorProfileRoute ? 'Creator community' : 'Community'}</Text>
                    <Text style={styles.title} numberOfLines={2}>{community.title}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {formatCompact(community.member_count)} members
                      {community.online_count != null ? ` · ${formatCompact(community.online_count)} online` : ''}
                      {membership?.role ? ` · ${membership.role}` : ''}
                    </Text>
                  </View>
                </View>
                {community.description ? <Text style={styles.description} numberOfLines={2}>{community.description}</Text> : null}
                {creatorProfileRoute ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${community.creator_name || community.title} creator profile`}
                    style={styles.profileAction}
                    onPress={() => router.push(creatorProfileRoute as any)}
                  >
                    <Text style={styles.profileActionText}>View creator profile</Text>
                    <MaterialIcons name="arrow-forward" size={17} color="#FFFFFF" />
                  </Pressable>
                ) : null}
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

            {activeTab === 'Community' ? (
              <View style={styles.section}>
                {detail.data?.latestRelease && creatorMusicRoute ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${community.creator_name || community.title} music on their creator profile`}
                    style={styles.latestCard}
                    onPress={() => router.push(creatorMusicRoute as any)}
                  >
                    <View style={styles.latestArt}>
                      {detail.data.latestRelease.cover_art_url ? (
                        <Image source={{ uri: detail.data.latestRelease.cover_art_url }} style={styles.fill} />
                      ) : (
                        <MaterialIcons name="album" size={24} color={theme.colors.accentText} />
                      )}
                    </View>
                    <View style={styles.roomCopy}>
                      <Text style={styles.threadTag}>Latest from {community.creator_name || community.title}</Text>
                      <Text style={styles.threadTitle} numberOfLines={1}>{detail.data.latestRelease.title || 'Latest music'}</Text>
                      <Text style={styles.threadBody} numberOfLines={1}>{detail.data.latestRelease.artist || 'Open profile music'}</Text>
                    </View>
                    <MaterialIcons name="arrow-forward" size={21} color={theme.colors.accentText} />
                  </Pressable>
                ) : null}
                {detail.data?.socialPosts?.length ? detail.data.socialPosts.map((post) => (
                  <MobileSocialPostCard key={post.id} post={post} variant="compact" onMutated={() => detail.refetch()} />
                )) : detail.data?.posts.length ? detail.data.posts.map((post) => {
                  const postBody = post.body || (post as any).content || '';
                  return (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${post.title || 'post'}`} key={post.id} style={styles.threadCard} onPress={() => router.push(`/post/${post.id}` as any)}>
                      <Text style={styles.threadTag}>{post.post_type?.replace(/_/g, ' ') || 'Post'}</Text>
                      <Text style={styles.threadTitle}>{post.title || postBody}</Text>
                      <Text style={styles.threadBody} numberOfLines={2}>{postBody}</Text>
                      <Text style={styles.threadMeta}>{formatCompact(post.likes_count)} likes · {formatCompact(post.comments_count)} comments</Text>
                    </Pressable>
                  );
                }) : <EmptyBlock title="No community posts yet" body="Creator announcements, member updates, questions and media threads will appear here." />}
              </View>
            ) : null}

            {activeTab === 'Live' ? (
              <View style={styles.section}>
                {detail.data?.liveSessions.map((room) => {
                  const canOpenRoom = room.source === 'session_room';
                  const content = (
                    <>
                      <View style={[styles.stateDot, room.status === 'live' && styles.stateDotLive]} />
                      <View style={styles.roomCopy}>
                        <Text style={styles.threadTag}>{liveSessionState(room)}</Text>
                        <Text style={styles.threadTitle}>{room.title || 'Community live session'}</Text>
                        <Text style={styles.threadBody} numberOfLines={2}>{liveSessionMeta(room)}</Text>
                      </View>
                      {canOpenRoom ? <Text style={styles.openText}>{room.status === 'live' ? 'Join live' : 'View room'}</Text> : null}
                    </>
                  );
                  return canOpenRoom ? (
                    <Pressable
                      key={`${room.source}:${room.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${room.status === 'live' ? 'Join' : 'Open'} ${room.title || 'community live session'}`}
                      style={styles.roomCard}
                      onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
                    >
                      {content}
                    </Pressable>
                  ) : <View key={`${room.source}:${room.id}`} style={styles.roomCard}>{content}</View>;
                })}
                {detail.data?.events.length ? detail.data.events.map((event) => (
                  <Pressable
                    key={event.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${event.title}`}
                    style={styles.threadCard}
                    onPress={() => router.push(`/community/events/${event.id}` as any)}
                  >
                    <Text style={styles.threadTag}>{event.event_type || 'Event'}</Text>
                    <Text style={styles.threadTitle}>{event.title}</Text>
                    <Text style={styles.threadBody}>{event.location || 'Online / TBA'} · {formatDate(event.starts_at)}</Text>
                    <Text style={styles.threadMeta}>Open community event</Text>
                  </Pressable>
                )) : null}
                {!detail.data?.liveSessions.length && !detail.data?.events.length ? (
                  <EmptyBlock title="Nothing live or scheduled" body="Genuine live rooms, community events and available replays will appear here when they are linked to this community." />
                ) : null}
              </View>
            ) : null}

            {activeTab === 'Collabs' ? (
              <View style={styles.section}>
                {detail.data?.rooms.map((room) => (
                  <View key={room.id} style={styles.threadCard}>
                    <Text style={styles.threadTag}>{room.room_type?.replaceAll('_', ' ') || 'Collaboration'}</Text>
                    <Text style={styles.threadTitle}>{room.title}</Text>
                    {room.description ? <Text style={styles.threadBody} numberOfLines={3}>{room.description}</Text> : null}
                    <Text style={styles.threadMeta}>{room.status || 'Open collaboration'} · Participation details are shared by the community team</Text>
                  </View>
                ))}
                {detail.data?.threads.map((challenge) => (
                  <View key={challenge.id} style={styles.challengeCard}>
                    <Text style={styles.threadTag}>Challenge</Text>
                    <Text style={styles.threadTitle}>{challenge.title}</Text>
                    {challenge.body ? <Text style={styles.threadBody} numberOfLines={3}>{challenge.body}</Text> : null}
                    <Text style={styles.threadMeta}>{challenge.comment_count != null ? `${formatCompact(challenge.comment_count)} entries` : 'Community challenge'}</Text>
                  </View>
                ))}
                {!detail.data?.rooms.length && !detail.data?.threads.length ? (
                  <EmptyBlock title="No open collaborations" body="Collaboration rooms and creator challenges will appear here when the community team opens them." />
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  const styles = useBackstageStyles();
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function liveSessionState(room: LiveRoomItem) {
  if (room.status === 'live') return 'Live now';
  if (room.status === 'ended' && room.replay_url) return 'Replay available';
  return 'Scheduled';
}

function liveSessionMeta(room: LiveRoomItem) {
  if (room.status === 'live') return room.viewer_count ? `${formatCompact(room.viewer_count)} watching` : room.description || 'Live with the community now';
  if (room.scheduled_for) return `${formatDate(room.scheduled_for)}${room.description ? ` · ${room.description}` : ''}`;
  return room.description || (room.replay_url ? 'A replay is available from this session' : 'Community live session');
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CANVAS },
  headerRow: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  joinButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,102,0,0.55)', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  joinButtonActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  joinText: { fontFamily: pluggdFonts.satoshiBlack, color: ORANGE, fontSize: 13, fontWeight: '900' },
  joinTextActive: { color: '#0a0806' },
  loading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontFamily: pluggdFonts.satoshiBold, color: MUTED, fontSize: 13, fontWeight: '800' },
  hero: { minHeight: 210, marginHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', backgroundColor: SURFACE, justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  fill: { width: '100%', height: '100%' },
  heroCopy: { padding: 16, gap: 9 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityCopy: { flex: 1, minWidth: 0, gap: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#241d15', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontFamily: pluggdFonts.satoshiBlack, color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  eyebrow: { fontFamily: pluggdFonts.satoshiBlack, color: ORANGE, fontSize: 9.5, letterSpacing: 0.7, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontFamily: pluggdFonts.displayExtraBold, color: '#FFFFFF', fontSize: 26, lineHeight: 30, fontWeight: '800' },
  meta: { fontFamily: pluggdFonts.satoshiBold, color: '#C2B9B0', fontSize: 11.5, fontWeight: '800' },
  description: { fontFamily: pluggdFonts.satoshiMedium, color: '#E4E4E9', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  profileAction: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(10,8,6,0.58)', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileActionText: { fontFamily: pluggdFonts.satoshiBlack, color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  tabs: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  tab: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  tabActive: { borderColor: ORANGE, backgroundColor: 'rgba(255,102,0,0.15)' },
  tabText: { fontFamily: pluggdFonts.satoshiBlack, color: MUTED, fontSize: 12, fontWeight: '900' },
  tabTextActive: { color: '#FFFFFF' },
  section: { marginTop: 16, paddingHorizontal: 16, gap: 10 },
  threadCard: { borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 14, gap: 6 },
  challengeCard: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,102,0,0.34)', backgroundColor: 'rgba(255,102,0,0.08)', padding: 14, gap: 6 },
  threadTag: { fontFamily: pluggdFonts.satoshiBlack, color: ORANGE, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  threadTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.interSemiBold, fontSize: 16, lineHeight: 21 },
  threadBody: { color: MUTED, fontFamily: pluggdFonts.interSemiBold, fontSize: 13, lineHeight: 19 },
  threadMeta: { color: '#62627A', fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 16 },
  roomCard: { minHeight: 82, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B735F' },
  stateDotLive: { backgroundColor: '#FF4757' },
  roomCopy: { flex: 1, minWidth: 0 },
  openText: { fontFamily: pluggdFonts.satoshiBlack, color: ORANGE, fontSize: 12, fontWeight: '900' },
  latestCard: { minHeight: 78, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,102,0,0.35)', backgroundColor: 'rgba(255,102,0,0.08)', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  latestArt: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#241d15', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 8 },
  emptyTitle: { fontFamily: pluggdFonts.displayBold, color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  emptyBody: { fontFamily: pluggdFonts.satoshiMedium, color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});

function useBackstageStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => ({
    ...baseStyles,
    screen: [baseStyles.screen, { backgroundColor: theme.colors.background }],
    backButton: [baseStyles.backButton, { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }],
    joinButton: [baseStyles.joinButton, { minHeight: 44, borderColor: theme.colors.borderAccent }],
    joinButtonActive: [baseStyles.joinButtonActive, { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill }],
    joinText: [baseStyles.joinText, { color: theme.colors.accentText }],
    joinTextActive: [baseStyles.joinTextActive, { color: theme.colors.onAccent }],
    loadingText: [baseStyles.loadingText, { color: theme.colors.textMuted }],
    tab: [baseStyles.tab, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    tabActive: [baseStyles.tabActive, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft }],
    tabText: [baseStyles.tabText, { color: theme.colors.textMuted }],
    tabTextActive: [baseStyles.tabTextActive, { color: theme.colors.accentText }],
    threadCard: [baseStyles.threadCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    challengeCard: [baseStyles.challengeCard, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft }],
    threadTag: [baseStyles.threadTag, { color: theme.colors.accentText }],
    threadTitle: [baseStyles.threadTitle, { color: theme.colors.text }],
    threadBody: [baseStyles.threadBody, { color: theme.colors.textMuted }],
    threadMeta: [baseStyles.threadMeta, { color: theme.colors.textSubtle }],
    roomCard: [baseStyles.roomCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    openText: [baseStyles.openText, { color: theme.colors.accentText }],
    latestCard: [baseStyles.latestCard, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft }],
    latestArt: [baseStyles.latestArt, { backgroundColor: theme.colors.artworkBase }],
    emptyCard: [baseStyles.emptyCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    emptyTitle: [baseStyles.emptyTitle, { color: theme.colors.text }],
    emptyBody: [baseStyles.emptyBody, { color: theme.colors.textMuted }],
  }), [theme]);
}
