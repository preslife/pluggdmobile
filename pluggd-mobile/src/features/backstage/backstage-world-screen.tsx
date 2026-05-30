import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { useAuth } from '../../context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts, pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import {
  contentInitials,
  formatCompact,
  formatDate,
  type BeatItem,
  type EventItem,
  type FeedBundle,
  type ProfileItem,
  type SocialPostItem,
  type SoundboardItem,
} from '../../lib/mobileContent';
import { loadUnreadNotifications } from '../culture/mobileServices';
import {
  useBackstage,
  useEventLayer,
  useHomeFeed,
  useLiveRooms,
  type BackstageBoard,
  type BackstageCommunity,
  type BackstageRoom,
  type BackstageThread,
  type LiveRoomItem,
} from '../culture/useCultureData';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262626',
  orange: '#FF5A00',
  coral: '#FF4757',
  violet: '#7C3AED',
  white: '#FFFFFF',
  soft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

const backstageVioletStyles = StyleSheet.create({
  filterPillActive: {
    borderColor: 'rgba(124,58,237,0.82)',
    backgroundColor: 'rgba(124,58,237,0.22)',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  clusterHeader: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: COLORS.white,
  },
  communityAccent: {
    color: COLORS.violet,
  },
  communityIconSurface: {
    backgroundColor: 'rgba(124,58,237,0.14)',
  },
  forumUpdateText: {
    fontFamily: pluggdFonts.interSemiBold,
  },
});

const FILTERS = ['My Circles', 'Event Hubs', 'Threads', 'Rooms', 'Producers', 'Challenges', 'Soundboards'] as const;
type BackstageFilter = (typeof FILTERS)[number];

type SectionKey = BackstageFilter | 'Ticket Threads';

type ProducerLoungeItem = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  replies?: number | null;
  route: string;
  cta: 'Open Thread' | 'Join Room' | 'Submit';
};

type CommunityMoment = {
  id: string;
  title: string;
  imageUrl?: string | null;
  route: string;
};

type Recommendation = {
  id: string;
  title: string;
  label?: string | null;
  imageUrl?: string | null;
  route: string;
  memberCount?: number | null;
};

const IMAGE_GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#251A1A', '#14151D', '#07070A'],
  ['#172C32', '#11131B', '#07070A'],
  ['#2B2248', '#12121A', '#07070A'],
  ['#122E26', '#11131B', '#07070A'],
  ['#3A2116', '#13131B', '#07070A'],
];

function hashIndex(value: string | null | undefined, modulo: number) {
  const source = value || 'pluggd-backstage';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function routeForCommunity(community: BackstageCommunity) {
  return `/backstage/${community.slug || community.id}`;
}

function routeForThread(thread: BackstageThread) {
  if (thread.route && thread.route !== '/backstage') return thread.route;
  if (thread.slug) return `/community/boards/${thread.slug}`;
  if (thread.community_id) return `/backstage/${thread.community_id}`;
  return `/post/${thread.id}`;
}

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'PLUGGD Creator';
}

function profileLabel(profile: ProfileItem) {
  return profile.primary_genre || profile.city || profile.user_type || profile.profile_type || 'Creator';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/profile/${profile.user_id}`;
  return '/search';
}

function boardRoute(board: BackstageBoard) {
  return board.route || `/community/boards/${board.slug || board.id}`;
}

function eventCountdown(startsAt?: string | null) {
  if (!startsAt) return 'Time TBA';
  const start = new Date(startsAt).getTime();
  if (!Number.isFinite(start)) return 'Time TBA';
  const diffMs = start - Date.now();
  if (diffMs <= 0) return 'Happening now';
  const mins = Math.floor(diffMs / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days.toString().padStart(2, '0')}d : ${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m`;
  return `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m`;
}

function hasTicketSignal(thread: BackstageThread) {
  return /ticket|spare|swap|sold out|entry|queue|guest|afterparty|meetup/i.test(`${thread.title} ${thread.body || ''} ${thread.category || ''}`);
}

function hasProducerSignal(thread: BackstageThread) {
  return /producer|feedback|verse|sample|collab|beat|mix|breakdown|cook/i.test(`${thread.title} ${thread.body || ''} ${thread.category || ''}`);
}

function roomTitle(room: BackstageRoom | LiveRoomItem) {
  return room.title || room.description || 'Community room';
}

function roomCommunity(room: BackstageRoom | LiveRoomItem) {
  if ('category' in room && room.category) return room.category;
  if ('room_type' in room && room.room_type) return room.room_type;
  return 'Community room';
}

function roomActiveCount(room: BackstageRoom | LiveRoomItem) {
  if ('active_users' in room && room.active_users != null) return room.active_users;
  if ('viewer_count' in room && room.viewer_count != null) return room.viewer_count;
  return null;
}

function roomRoute(room: BackstageRoom | LiveRoomItem) {
  if ('source' in room && (room.source === 'session_room' || !room.source)) {
    return { pathname: '/live/session', params: { roomId: room.id } };
  }
  if ('backstage_id' in room && room.backstage_id) return `/backstage/${room.backstage_id}`;
  if ('community_id' in room && room.community_id) return `/backstage/${room.community_id}`;
  return '/backstage';
}

function soundboardRoute(soundboard: SoundboardItem) {
  return soundboard.slug ? `/soundboards/${soundboard.slug}` : `/soundboards/${soundboard.id}`;
}

function mapCreators(bundle?: FeedBundle): Recommendation[] {
  if (!bundle) return [];
  return bundle.profiles.slice(0, 10).map((profile) => ({
    id: profile.user_id || profile.id || profile.username || profileName(profile),
    title: profileName(profile),
    label: profileLabel(profile),
    imageUrl: profile.avatar_url,
    route: profileRoute(profile),
  }));
}

function mapProducerLounge(posts?: SocialPostItem[], beats?: BeatItem[], rooms?: Array<BackstageRoom | LiveRoomItem>): ProducerLoungeItem[] {
  const items: ProducerLoungeItem[] = [];
  posts
    ?.filter((post) => hasProducerSignal({
      id: post.id,
      title: post.title || post.body || post.content || '',
      body: post.body || post.content || null,
      category: post.post_type,
    }))
    .slice(0, 3)
    .forEach((post) => {
      items.push({
        id: `post-${post.id}`,
        tag: post.post_type?.replace(/_/g, ' ') || 'Thread',
        title: post.title || post.body || 'Producer thread',
        subtitle: post.body || 'Community production discussion',
        replies: post.comments_count,
        route: `/post/${post.id}`,
        cta: 'Open Thread',
      });
    });

  rooms
    ?.filter((room) => hasProducerSignal({ id: room.id, title: roomTitle(room), body: room.description || null, category: roomCommunity(room) }))
    .slice(0, Math.max(0, 4 - items.length))
    .forEach((room) => {
      items.push({
        id: `room-${room.id}`,
        tag: roomCommunity(room),
        title: roomTitle(room),
        subtitle: room.description || 'Producer room',
        replies: roomActiveCount(room),
        route: typeof roomRoute(room) === 'string' ? roomRoute(room) as string : '/live/session',
        cta: 'Join Room',
      });
    });

  beats?.slice(0, Math.max(0, 4 - items.length)).forEach((beat) => {
    items.push({
      id: `beat-${beat.id}`,
      tag: beat.genre || 'Beat feedback',
      title: beat.title || 'Producer drop',
      subtitle: beat.producer_name || beat.description || 'Producer lounge activity',
      route: `/beat/${beat.id}`,
      cta: 'Open Thread',
    });
  });

  return items.slice(0, 4);
}

function mapMoments(bundle?: FeedBundle, events?: EventItem[]): CommunityMoment[] {
  const moments: CommunityMoment[] = [];
  bundle?.posts.forEach((post) => {
    const image = Array.isArray(post.images) ? post.images[0] : null;
    if (!image && !post.video) return;
    moments.push({
      id: `post-${post.id}`,
      title: post.title || post.post_type?.replace(/_/g, ' ') || 'Community moment',
      imageUrl: image || post.video,
      route: `/post/${post.id}`,
    });
  });
  events?.forEach((event) => {
    if (!event.cover_image_url) return;
    moments.push({
      id: `event-${event.id}`,
      title: event.title || 'Event moment',
      imageUrl: event.cover_image_url,
      route: `/events/${event.id}`,
    });
  });
  bundle?.soundboards.forEach((soundboard) => {
    if (!soundboard.cover_image_url) return;
    moments.push({
      id: `soundboard-${soundboard.id}`,
      title: soundboard.title || 'Soundboard moment',
      imageUrl: soundboard.cover_image_url,
      route: soundboardRoute(soundboard),
    });
  });
  return moments.slice(0, 12);
}

function BackstageArtwork({ uri, title, style }: { uri?: string | null; title: string; style?: object }) {
  const colors = IMAGE_GRADIENTS[hashIndex(title, IMAGE_GRADIENTS.length)];
  return (
    <LinearGradient colors={colors as any} style={[styles.artworkBase, style]}>
      {uri ? <PluggdImage uri={uri} style={styles.imageFill} resizeMode="cover" /> : null}
      {!uri ? <Text style={styles.fallbackInitials}>{contentInitials(title)}</Text> : null}
    </LinearGradient>
  );
}

function BackstageHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  const label = user?.email || 'PLUGGD';
  const unreadNotifications = useQuery({
    queryKey: ['culture', 'notifications', 'unread'],
    queryFn: loadUnreadNotifications,
    enabled: !!user?.id,
    staleTime: 1000 * 45,
  });
  const unreadCount = unreadNotifications.data ?? 0;
  const go = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };

  return (
    <View
      style={[
        styles.header,
        {
          height: Math.max(insets.top + 62, 96),
          paddingTop: insets.top + 12,
          backgroundColor: theme.colors.headerGlass,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      <Text style={[styles.headerTitle, { color: theme.colors.backstage }]}>COMMUNITY</Text>
      <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Search PLUGGD" onPress={() => go('/search')} style={styles.headerIcon}>
          <MaterialIcons name="search" size={22} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
          onPress={() => go('/notifications')}
          style={styles.headerIcon}
        >
          <MaterialIcons name="notifications-none" size={22} color={theme.colors.textSecondary} />
          {unreadCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => go(user ? '/profile' : '/auth/login')}
          style={[styles.avatarButton, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.avatarInitials, { color: theme.colors.text }]}>{contentInitials(label)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterPills({ active, onChange }: { active: BackstageFilter; onChange: (filter: BackstageFilter) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {FILTERS.map((filter) => {
        const selected = filter === active;
        return (
          <Pressable
            key={filter}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              selectionHaptic();
              onChange(filter);
            }}
            style={styles.filterPill}
          >
            <Text style={[styles.filterText, selected && backstageVioletStyles.filterPillActive, selected && backstageVioletStyles.filterTextActive]}>{filter}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, backstageVioletStyles.clusterHeader]}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionActionButton}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyInline({ title, body, primary, secondary, onPrimary, onSecondary }: { title: string; body: string; primary?: string; secondary?: string; onPrimary?: () => void; onSecondary?: () => void }) {
  return (
    <View style={styles.emptyInline}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {(primary && onPrimary) || (secondary && onSecondary) ? (
        <View style={styles.emptyActions}>
          {primary && onPrimary ? (
            <Pressable accessibilityRole="button" onPress={onPrimary} style={styles.emptyPrimary}>
              <Text style={styles.emptyPrimaryText}>{primary}</Text>
            </Pressable>
          ) : null}
          {secondary && onSecondary ? (
            <Pressable accessibilityRole="button" onPress={onSecondary} style={styles.emptySecondary}>
              <Text style={styles.emptySecondaryText}>{secondary}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CircleCard({ community, roomActive, ticketActive }: { community: BackstageCommunity; roomActive: boolean; ticketActive: boolean }) {
  const router = useRouter();
  const online = community.online_count;
  const memberCount = community.member_count;
  const meta = [
    memberCount != null ? `${formatCompact(memberCount)} members` : null,
    online != null ? `${formatCompact(online)} online` : null,
  ].filter(Boolean).join(' · ') || community.hub_type?.replace(/_/g, ' ') || 'Community';

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${community.title}`} onPress={() => router.push(routeForCommunity(community) as any)} style={styles.circleCard}>
      <BackstageArtwork uri={community.cover_image_url || community.avatar_url} title={community.title} style={styles.circleBanner} />
      <View style={styles.circleAvatar}>
        {community.avatar_url ? <PluggdImage uri={community.avatar_url} style={styles.imageFill} /> : <Text style={styles.circleInitials}>{contentInitials(community.title)}</Text>}
      </View>
      <View style={styles.circleBody}>
        <Text style={styles.circleTitle} numberOfLines={2}>{community.title}</Text>
        <Text style={styles.circleMeta} numberOfLines={1}>{meta}</Text>
        <View style={styles.circleBadges}>
          {roomActive ? <Badge label="room active" live /> : null}
          {ticketActive ? <Badge label="ticket thread" /> : null}
        </View>
        <View style={styles.openCircleButton}>
          <Text style={styles.openCircleText}>Open</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Badge({ label, live }: { label: string; live?: boolean }) {
  return (
    <View style={[styles.badge, live && styles.badgeLive]}>
      {live ? <View style={styles.liveDotSmall} /> : null}
      <Text style={[styles.badgeText, live && styles.badgeTextLive]}>{label}</Text>
    </View>
  );
}

function RoomRow({ room }: { room: BackstageRoom | LiveRoomItem }) {
  const router = useRouter();
  const count = roomActiveCount(room);
  const route = roomRoute(room);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Join room ${roomTitle(room)}`} onPress={() => router.push(route as any)} style={styles.roomRow}>
      <View style={[styles.roomIcon, backstageVioletStyles.communityIconSurface]}>
        <MaterialIcons name="settings-input-antenna" size={20} color={COLORS.violet} />
      </View>
      <View style={styles.roomCopy}>
        <Text style={styles.roomTitle} numberOfLines={1}>{roomTitle(room)}</Text>
        <Text style={styles.roomMeta} numberOfLines={1}>{roomCommunity(room)}{count != null ? ` · ${formatCompact(count)} active` : ''}</Text>
      </View>
      {'status' in room && room.status === 'live' ? <View style={styles.roomLiveDot} /> : null}
      <Text style={styles.roomCTA}>Join Room</Text>
    </Pressable>
  );
}

function EventHubCard({ event, featured }: { event: EventItem; featured?: boolean }) {
  const router = useRouter();
  const title = event.title || 'Event hub';
  const ticketed = Boolean((event as any).ticket_url || (event as any).ticket_path);
  const rsvps = event.rsvp_count;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`View event ${title}`} onPress={() => router.push(`/events/${event.id}` as any)} style={[styles.eventHubCard, featured ? styles.featuredEventHubCard : styles.standardEventHubCard]}>
      <BackstageArtwork uri={event.cover_image_url} title={title} style={featured ? styles.featuredEventImage : styles.standardEventImage} />
      <View style={styles.eventHubBody}>
        <Text style={[styles.eventHubTitle, featured && styles.eventHubTitleFeatured]} numberOfLines={2}>{title}</Text>
        <Text style={styles.eventHubMeta} numberOfLines={2}>{[event.location, formatDate(event.starts_at)].filter(Boolean).join(' · ') || 'Location TBA'}</Text>
        <Text style={styles.eventCountdown}>{eventCountdown(event.starts_at)}</Text>
        <View style={styles.eventStateRow}>
          {rsvps != null ? <Text style={styles.eventState}>{formatCompact(rsvps)} RSVPs</Text> : null}
          {ticketed ? <Badge label="tickets" /> : null}
        </View>
        <View style={styles.eventActions}>
          <Pressable accessibilityRole="button" onPress={(pressEvent) => { pressEvent.stopPropagation(); impactHaptic(); router.push(`/events/${event.id}` as any); }} style={styles.eventPrimary}>
            <Text style={styles.eventPrimaryText}>{ticketed ? 'GET TICKETS' : 'RSVP'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={(pressEvent) => { pressEvent.stopPropagation(); selectionHaptic(); router.push(`/events/${event.id}` as any); }} style={styles.eventSecondary}>
            <Text style={styles.eventSecondaryText}>OPEN HUB</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function ThreadCard({ thread, mode = 'thread' }: { thread: BackstageThread; mode?: 'thread' | 'ticket' }) {
  const router = useRouter();
  const ticket = hasTicketSignal(thread);
  const audio = /audio|beat|mix|sample|sound/i.test(`${thread.title} ${thread.body || ''} ${thread.category || ''}`);
  const event = Boolean(thread.attached_event_id || ticket);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open thread ${thread.title}`} onPress={() => router.push(routeForThread(thread) as any)} style={styles.threadCard}>
      <View style={styles.threadTop}>
        <View style={styles.threadAvatar}><Text style={styles.threadAvatarText}>{contentInitials(thread.author_name || thread.author_handle || thread.category || 'TH')}</Text></View>
        <View style={styles.threadCategory}><Text style={styles.threadCategoryText}>{mode === 'ticket' ? 'Ticket' : thread.category || 'Thread'}</Text></View>
      </View>
      <Text style={styles.threadTitle} numberOfLines={2}>{thread.title}</Text>
      {thread.body ? <Text style={styles.threadPreview} numberOfLines={2}>{thread.body}</Text> : null}
      <View style={styles.threadFooter}>
        {thread.comment_count != null ? <Text style={styles.threadReplies}>{formatCompact(thread.comment_count)} replies</Text> : null}
        <View style={styles.threadChips}>
          {ticket ? <Chip label="ticket" active /> : null}
          {audio ? <Chip label="audio" /> : null}
          {event ? <Chip label="event" /> : null}
          {thread.category?.toLowerCase().includes('poll') ? <Chip label="poll" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function Chip({ label, active }: { label: string; active?: boolean }) {
  return (
    <View style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </View>
  );
}

function ProducerItemCard({ item }: { item: ProducerLoungeItem }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.cta} ${item.title}`} onPress={() => router.push(item.route as any)} style={styles.producerCard}>
      <View style={styles.producerTag}><Text style={[styles.producerTagText, backstageVioletStyles.communityAccent]}>{item.tag}</Text></View>
      <Text style={styles.producerTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.producerSubtitle} numberOfLines={2}>{item.subtitle}</Text>
      <View style={styles.producerFooter}>
        {item.replies != null ? <Text style={styles.producerReplies}>{formatCompact(item.replies)} active</Text> : null}
        <Text style={styles.producerCTA}>{item.cta}</Text>
      </View>
    </Pressable>
  );
}

function ChallengeCard({ challenge }: { challenge: BackstageThread }) {
  const router = useRouter();
  const status = challenge.category || 'Active';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open challenge ${challenge.title}`} onPress={() => router.push(routeForThread(challenge) as any)} style={styles.challengeCard}>
      <LinearGradient colors={['rgba(124,58,237,0.28)', 'rgba(18,18,26,0.98)']} style={StyleSheet.absoluteFill} />
      <Text style={styles.challengePhase}>{status}</Text>
      <Text style={styles.challengeTitle} numberOfLines={2}>{challenge.title}</Text>
      {challenge.body ? <Text style={styles.challengeBody} numberOfLines={2}>{challenge.body}</Text> : null}
      <View style={styles.challengeFooter}>
        {challenge.comment_count != null ? <Text style={styles.challengeMeta}>{formatCompact(challenge.comment_count)} entries</Text> : null}
        <Text style={styles.challengeCTA}>{/judging|vote/i.test(status) ? 'Vote' : /ended|winner/i.test(status) ? 'View Winner' : 'Enter'}</Text>
      </View>
    </Pressable>
  );
}

function SoundboardCard({ soundboard }: { soundboard: SoundboardItem }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open soundboard ${soundboard.title}`} onPress={() => router.push(soundboardRoute(soundboard) as any)} style={styles.soundboardCard}>
      <BackstageArtwork uri={soundboard.cover_image_url} title={soundboard.title || 'Soundboard'} style={styles.soundboardImage} />
      <View style={styles.soundboardCopy}>
        <Text style={styles.soundboardTitle} numberOfLines={2}>{soundboard.title || 'Soundboard'}</Text>
        <Text style={styles.soundboardMeta} numberOfLines={1}>{soundboard.item_count != null ? `${formatCompact(soundboard.item_count)} items` : 'Collaborative board'}</Text>
        <Text style={styles.soundboardOpen}>Open Soundboard</Text>
      </View>
    </Pressable>
  );
}

function MomentTile({ moment }: { moment: CommunityMoment }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open moment ${moment.title}`} onPress={() => router.push(moment.route as any)} style={styles.momentTile}>
      <BackstageArtwork uri={moment.imageUrl} title={moment.title} style={styles.momentImage} />
      <LinearGradient colors={['rgba(8,8,12,0.03)', 'rgba(8,8,12,0.86)']} style={StyleSheet.absoluteFill} />
      <Text style={styles.momentTitle} numberOfLines={1}>{moment.title}</Text>
    </Pressable>
  );
}

function DiscoverCard({ item }: { item: Recommendation }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Join ${item.title}`} onPress={() => router.push(item.route as any)} style={styles.discoverCard}>
      <BackstageArtwork uri={item.imageUrl} title={item.title} style={styles.discoverImage} />
      <Text style={styles.discoverTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.discoverMeta} numberOfLines={1}>{item.label || 'Scene'}{item.memberCount != null ? ` · ${formatCompact(item.memberCount)} members` : ''}</Text>
      <View style={styles.joinDiscoverButton}><Text style={styles.joinDiscoverText}>JOIN</Text></View>
    </Pressable>
  );
}

function RewardsPrompt({ xp, level }: { xp?: number | null; level?: number | null }) {
  if (xp == null && level == null) return null;
  return (
    <View style={styles.rewardsCard}>
      <View>
        <Text style={styles.rewardsTitle}>Join 2 discussions to earn XP</Text>
        <Text style={styles.rewardsBody}>{xp != null ? `${formatCompact(xp)} XP` : 'XP active'}{level != null ? ` · Level ${level}` : ''}</Text>
      </View>
      <MaterialIcons name="military-tech" size={24} color={COLORS.orange} />
    </View>
  );
}

export function BackstageWorldScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<SectionKey, number>>({
    'My Circles': 0,
    'Event Hubs': 0,
    Threads: 0,
    Rooms: 0,
    Producers: 0,
    Challenges: 0,
    Soundboards: 0,
    'Ticket Threads': 0,
  });
  const backstage = useBackstage();
  const events = useEventLayer(16);
  const home = useHomeFeed();
  const live = useLiveRooms();
  const [activeFilter, setActiveFilter] = useState<BackstageFilter>('My Circles');

  const allCommunities = backstage.data?.communities ?? [];
  const joinedCommunities = backstage.data?.joinedCommunities ?? [];
  const recommendedCommunities = allCommunities.filter((community) => !community.membership || community.membership.status === 'left');
  const myCircles = joinedCommunities.length ? joinedCommunities : recommendedCommunities.slice(0, 8);
  const threads = backstage.data?.threads ?? [];
  const ticketThreads = threads.filter(hasTicketSignal);
  const hotThreads = threads.filter((thread) => !hasTicketSignal(thread));
  const communityRooms = backstage.data?.rooms ?? [];
  const liveRooms = (live.data ?? []).filter((room) => room.status === 'live' || room.source === 'community_room');
  const activeRooms: Array<BackstageRoom | LiveRoomItem> = [...liveRooms, ...communityRooms].slice(0, 8);
  const eventRows = events.data?.length ? events.data : backstage.data?.events ?? [];
  const creators = useMemo(() => mapCreators(home.data), [home.data]);
  const producerItems = useMemo(() => mapProducerLounge(home.data?.posts, home.data?.beats, activeRooms), [activeRooms, home.data?.beats, home.data?.posts]);
  const moments = useMemo(() => mapMoments(home.data, eventRows), [eventRows, home.data]);
  const soundboards = home.data?.soundboards ?? [];
  const challenges = backstage.data?.challenges ?? [];
  const rewards = joinedCommunities.find((community) => community.membership?.xp != null || community.membership?.level != null)?.membership ?? null;
  const refreshing = backstage.isRefetching || events.isRefetching || home.isRefetching || live.isRefetching;
  const loading = backstage.isLoading || events.isLoading || home.isLoading || live.isLoading;
  const bottomPadding = Math.max(insets.bottom + 154, 176);

  const refresh = () => {
    void backstage.refetch();
    void events.refetch();
    void home.refetch();
    void live.refetch();
  };

  const sectionLayout = (key: SectionKey) => (event: { nativeEvent: { layout: { y: number } } }) => {
    sectionOffsets.current[key] = event.nativeEvent.layout.y;
  };

  const onFilter = (filter: BackstageFilter) => {
    setActiveFilter(filter);
    const y = sectionOffsets.current[filter] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  };

  const showEmpty = (filter: BackstageFilter) => activeFilter === filter;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <BackstageHeader />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.orange} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      >
        <FilterPills active={activeFilter} onChange={onFilter} />
        {loading ? <PremiumSkeleton compact label="Opening real Community surfaces..." style={styles.loadingBlock} /> : null}

        <View style={styles.sectionBlock} onLayout={sectionLayout('My Circles')}>
          <SectionHeader title="MY COMMUNITY / MY CIRCLES" />
          {myCircles.length === 0 ? (
            <EmptyInline
              title="Find your Community"
              body="Join circles, event hubs, and boards to keep up with your scene."
              primary="Discover Communities"
              secondary="Browse Event Hubs"
              onPrimary={() => router.push('/search' as any)}
              onSecondary={() => onFilter('Event Hubs')}
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleShelf}>
              {myCircles.map((community) => (
                <CircleCard
                  key={community.id}
                  community={community}
                  roomActive={activeRooms.some((room) => ('community_id' in room && room.community_id === community.id) || ('backstage_id' in room && room.backstage_id === community.id))}
                  ticketActive={ticketThreads.some((thread) => thread.community_id === community.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="ACTIVE NOW" />
          {activeRooms.length === 0 ? (
            <EmptyInline title="No rooms active right now" body="Check threads or see what's coming up." primary="View Threads" secondary="View Upcoming Events" onPrimary={() => onFilter('Threads')} onSecondary={() => onFilter('Event Hubs')} />
          ) : (
            <View style={styles.roomList}>
              {activeRooms.slice(0, 4).map((room) => <RoomRow key={`${'source' in room ? room.source : 'community'}-${room.id}`} room={room} />)}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Event Hubs')}>
          <SectionHeader title="EVENT HUBS" />
          {eventRows.length === 0 ? (
            showEmpty('Event Hubs') ? <EmptyInline title="No event hubs yet" body="Events you RSVP to or follow will show up here." primary="Browse Events" onPrimary={() => router.push('/events' as any)} /> : null
          ) : (
            <View style={styles.eventList}>
              {eventRows.slice(0, 1).map((event) => <EventHubCard key={event.id} event={event} featured />)}
              {eventRows.slice(1, 4).map((event) => <EventHubCard key={event.id} event={event} />)}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Threads')}>
          <SectionHeader title="HOT THREADS" />
          {hotThreads.length === 0 ? (
            showEmpty('Threads') ? <EmptyInline title="No active threads" body="Ticket questions, event plans and music discussions will appear here." /> : null
          ) : (
            <View style={styles.threadList}>{hotThreads.slice(0, 5).map((thread) => <ThreadCard key={thread.id} thread={thread} />)}</View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Ticket Threads')}>
          <SectionHeader title="TICKET THREADS" />
          {ticketThreads.length === 0 ? (
            <EmptyInline title="No ticket threads yet" body="Spare tickets, swaps, meetup plans and entry questions appear only when real threads exist." />
          ) : (
            <View style={styles.threadList}>{ticketThreads.slice(0, 4).map((thread) => <ThreadCard key={thread.id} thread={thread} mode="ticket" />)}</View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Rooms')}>
          <SectionHeader title="COMMUNITY ROOMS" />
          {activeRooms.length === 0 ? (
            showEmpty('Rooms') ? <EmptyInline title="No rooms active right now" body="Check threads or see what's coming up." primary="View Threads" onPrimary={() => onFilter('Threads')} /> : null
          ) : (
            <View style={styles.roomList}>{activeRooms.slice(0, 6).map((room) => <RoomRow key={`room-list-${room.id}`} room={room} />)}</View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Producers')}>
          <SectionHeader title="PRODUCER LOUNGE" />
          {producerItems.length === 0 ? (
            showEmpty('Producers') ? <EmptyInline title="No producer lounge activity yet" body="Sample flips, collab requests and feedback rooms will appear here." /> : null
          ) : (
            <View style={styles.producerGrid}>{producerItems.map((item) => <ProducerItemCard key={item.id} item={item} />)}</View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Challenges')}>
          <SectionHeader title="CHALLENGES / BATTLES / CONTESTS" />
          {challenges.length === 0 ? (
            showEmpty('Challenges') ? <EmptyInline title="No challenges active" body="Open verse, battles and contests appear here only when backed by real challenge data." /> : null
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeShelf}>
              {challenges.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} />)}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Soundboards')}>
          <SectionHeader title="SOUNDBOARDS" />
          {soundboards.length === 0 ? (
            showEmpty('Soundboards') ? <EmptyInline title="No soundboards active" body="Collaborative audio boards appear here when published." /> : null
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soundboardShelf}>
              {soundboards.slice(0, 10).map((soundboard) => <SoundboardCard key={soundboard.id} soundboard={soundboard} />)}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="COMMUNITY MOMENTS" />
          {moments.length === 0 ? (
            <EmptyInline title="No community moments yet" body="Fan clips, event photos and community snippets will appear here." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentShelf}>
              {moments.map((moment) => <MomentTile key={moment.id} moment={moment} />)}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="DISCOVER MORE COMMUNITIES" />
          {recommendedCommunities.length === 0 ? (
            <EmptyInline title="No recommendations yet" body="More creator communities will appear here when available." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoverShelf}>
              {recommendedCommunities.slice(0, 8).map((community) => (
                <DiscoverCard
                  key={community.id}
                  item={{
                    id: community.id,
                    title: community.title,
                    label: community.description || community.hub_type,
                    imageUrl: community.cover_image_url || community.avatar_url,
                    route: routeForCommunity(community),
                    memberCount: community.member_count,
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <RewardsPrompt xp={rewards?.xp} level={rewards?.level} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(8,8,12,0.92)',
    zIndex: 3,
  },
  headerTitle: { ...pluggdTextStyles.appTitle, fontSize: 32, lineHeight: 36 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notificationBadge: {
    position: 'absolute',
    right: 5,
    top: 5,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: COLORS.coral,
    borderWidth: 1,
    borderColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  avatarButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarInitials: { fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  scrollContent: { paddingTop: 12 },
  filters: { minHeight: 44, paddingHorizontal: 16, paddingBottom: 14, gap: 8, alignItems: 'center' },
  filterPill: { minHeight: 44, justifyContent: 'center' },
  filterText: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(31,31,46,0.76)',
    color: COLORS.muted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 31,
  },
  filterTextActive: { color: COLORS.white, borderColor: 'rgba(124,58,237,0.82)', backgroundColor: 'rgba(124,58,237,0.22)' },
  loadingBlock: { marginHorizontal: 16, marginBottom: 12, height: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface },
  sectionBlock: { marginBottom: 24 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...pluggdTextStyles.sectionTitle, color: COLORS.white, fontSize: 18, lineHeight: 22 },
  sectionActionButton: { minHeight: 44, justifyContent: 'center' },
  sectionAction: { fontFamily: 'Satoshi-Bold', color: COLORS.orange, fontSize: 12 },
  artworkBase: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  imageFill: { width: '100%', height: '100%' },
  fallbackInitials: { color: 'rgba(255,255,255,0.84)', fontSize: 28, lineHeight: 34, fontWeight: '900' },
  circleShelf: { paddingHorizontal: 16, gap: 10 },
  circleCard: { width: 142, height: 184, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface },
  circleBanner: { height: 66, width: '100%' },
  circleAvatar: { position: 'absolute', top: 42, left: 10, width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.surface, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  circleInitials: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  circleBody: { flex: 1, paddingTop: 30, paddingHorizontal: 10, paddingBottom: 10 },
  circleTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17 },
  circleMeta: { marginTop: 5, color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 11, lineHeight: 14 },
  circleBadges: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 5, minHeight: 20 },
  badge: { minHeight: 20, borderRadius: 8, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,90,0,0.11)' },
  badgeLive: { backgroundColor: 'rgba(255,71,87,0.16)' },
  liveDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.coral },
  badgeText: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 9, lineHeight: 11 },
  badgeTextLive: { color: COLORS.coral },
  openCircleButton: { marginTop: 'auto', minHeight: 32, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,31,46,0.84)' },
  openCircleText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  roomList: { marginHorizontal: 16, gap: 10 },
  roomRow: { minHeight: 78, borderRadius: 16, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  roomIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,58,237,0.14)' },
  roomCopy: { flex: 1, minWidth: 0 },
  roomTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 18 },
  roomMeta: { marginTop: 5, color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 15 },
  roomLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.coral },
  roomCTA: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  eventList: { marginHorizontal: 16, gap: 12 },
  eventHubCard: { borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, overflow: 'hidden' },
  featuredEventHubCard: { minHeight: 238, borderRadius: 20 },
  standardEventHubCard: { minHeight: 186, borderRadius: 17 },
  featuredEventImage: { height: 104, width: '100%' },
  standardEventImage: { height: 78, width: '100%' },
  eventHubBody: { padding: 13 },
  eventHubTitle: { color: COLORS.white, fontFamily: 'Satoshi-Black', fontSize: 20, lineHeight: 24 },
  eventHubTitleFeatured: { fontSize: 21, lineHeight: 25 },
  eventHubMeta: { marginTop: 4, color: COLORS.muted, fontSize: 15, lineHeight: 18, fontWeight: '700' },
  eventCountdown: { marginTop: 7, color: COLORS.white, fontSize: 24, lineHeight: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
  eventStateRow: { marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventState: { color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 13, lineHeight: 17 },
  eventActions: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  eventPrimary: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orange },
  eventPrimaryText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  eventSecondary: { minHeight: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  eventSecondaryText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  threadList: { marginHorizontal: 16, gap: 10 },
  threadCard: { minHeight: 96, borderRadius: 15, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, padding: 12 },
  threadTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threadAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface2 },
  threadAvatarText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 9 },
  threadCategory: { minHeight: 24, borderRadius: 12, paddingHorizontal: 9, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  threadCategoryText: { color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 11 },
  threadTitle: { marginTop: 8, color: COLORS.white, fontFamily: pluggdFonts.interSemiBold, fontSize: 16, lineHeight: 20 },
  threadPreview: { marginTop: 4, color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 13, lineHeight: 18 },
  threadFooter: { marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  threadReplies: { color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 16 },
  threadChips: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chip: { minHeight: 22, borderRadius: 8, paddingHorizontal: 7, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: 'rgba(255,90,0,0.14)' },
  chipText: { color: COLORS.muted, fontFamily: 'Satoshi-Bold', fontSize: 10 },
  chipTextActive: { color: COLORS.orange },
  producerGrid: { marginHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  producerCard: { width: '48%', minHeight: 96, borderRadius: 15, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, padding: 12 },
  producerTag: { alignSelf: 'flex-start', minHeight: 22, borderRadius: 8, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: 'rgba(124,58,237,0.16)' },
  producerTagText: { color: COLORS.violet, fontFamily: 'Satoshi-Bold', fontSize: 10 },
  producerTitle: { marginTop: 8, color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 18 },
  producerSubtitle: { marginTop: 4, color: COLORS.muted, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  producerFooter: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  producerReplies: { color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 11, lineHeight: 15 },
  producerCTA: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 11 },
  challengeShelf: { paddingHorizontal: 16, gap: 12 },
  challengeCard: { width: 238, height: 166, borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, padding: 13 },
  challengePhase: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 11, textTransform: 'uppercase' },
  challengeTitle: { marginTop: 8, color: COLORS.white, fontFamily: 'Satoshi-Black', fontSize: 18, lineHeight: 21 },
  challengeBody: { marginTop: 6, color: COLORS.muted, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  challengeFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  challengeMeta: { color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 16 },
  challengeCTA: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  soundboardShelf: { paddingHorizontal: 16, gap: 12 },
  soundboardCard: { width: 204, height: 146, borderRadius: 16, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, padding: 10, flexDirection: 'row', gap: 10 },
  soundboardImage: { width: 68, height: '100%', borderRadius: 12 },
  soundboardCopy: { flex: 1, minWidth: 0 },
  soundboardTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 18 },
  soundboardMeta: { marginTop: 6, color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 12, lineHeight: 16 },
  soundboardOpen: { marginTop: 'auto', color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  momentShelf: { paddingHorizontal: 16, gap: 10 },
  momentTile: { width: 92, height: 104, borderRadius: 15, overflow: 'hidden', backgroundColor: COLORS.surface },
  momentImage: { width: '100%', height: '100%' },
  momentTitle: { position: 'absolute', left: 8, right: 8, bottom: 8, color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 11 },
  discoverShelf: { paddingHorizontal: 16, gap: 10 },
  discoverCard: { width: 142, height: 184, borderRadius: 16, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, padding: 10 },
  discoverImage: { width: '100%', height: 72, borderRadius: 13 },
  discoverTitle: { marginTop: 9, color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17 },
  discoverMeta: { marginTop: 4, color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 11, lineHeight: 14 },
  joinDiscoverButton: { marginTop: 'auto', minHeight: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  joinDiscoverText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 11 },
  rewardsCard: { marginHorizontal: 16, minHeight: 96, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,90,0,0.28)', backgroundColor: 'rgba(255,90,0,0.1)', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rewardsTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 20 },
  rewardsBody: { marginTop: 5, color: COLORS.muted, fontFamily: pluggdFonts.interSemiBold, fontSize: 13, lineHeight: 17 },
  emptyInline: { marginHorizontal: 16, minHeight: 104, borderRadius: 16, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 19, textAlign: 'center' },
  emptyBody: { marginTop: 6, color: COLORS.muted, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  emptyActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  emptyPrimary: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: COLORS.orange },
  emptyPrimaryText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  emptySecondary: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.surface2 },
  emptySecondaryText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 12 },
});
