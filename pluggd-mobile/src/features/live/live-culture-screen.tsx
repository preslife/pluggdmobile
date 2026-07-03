import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { DetailTitle } from '../../../components/DetailTitle';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback, type PluggdTrack } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts, pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import {
  contentInitials,
  formatCompact,
  formatDate,
  type EventItem,
  type FeedBundle,
  type ProfileItem,
} from '../../lib/mobileContent';
import {
  cancelEventLocalReminder,
  cancelLiveSessionLocalReminder,
  scheduleEventLocalReminder,
  scheduleLiveSessionLocalReminder,
} from '../../lib/localNotifications';
import {
  loadReminderState,
  loadUnreadNotifications,
  setEventReminder,
  setScheduledSessionReminder,
  toggleProfileFollow,
} from '../culture/mobileServices';
import {
  useBackstage,
  useEventLayer,
  useHomeFeed,
  useLiveRooms,
  type BackstageCommunity,
  type LiveRoomItem,
} from '../culture/useCultureData';

const COLORS = {
  canvas: '#08080C',
  shell: '#0D0D11',
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262626',
  orange: '#FF5A00',
  coral: '#FF4757',
  white: '#FFFFFF',
  soft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

const FILTERS = ['Live Now', 'Upcoming', 'Rooms', 'Listening Parties', 'Replays'] as const;
type LiveFilter = (typeof FILTERS)[number];

type FocusSource =
  | { kind: 'room'; room: LiveRoomItem; state: 'live' | 'upcoming' | 'replay' }
  | { kind: 'event'; event: EventItem; state: 'upcoming' | 'replay' };

type CreatorCard = {
  id: string;
  name: string;
  handle: string;
  route: string;
  imageUrl?: string | null;
  isLive?: boolean;
};

const IMAGE_GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#152B33', '#11131B', '#07070A'],
  ['#391413', '#16131A', '#07070A'],
  ['#241E42', '#11131B', '#07070A'],
  ['#11312B', '#12121A', '#07070A'],
  ['#392015', '#13131B', '#07070A'],
];

function hashIndex(value: string | null | undefined, modulo: number) {
  const source = value || 'pluggd-live';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function mediaImageForRoom(room: LiveRoomItem) {
  return room.thumbnail_url || room.creator_avatar_url || null;
}

function roomTitle(room: LiveRoomItem) {
  return room.title?.trim() || room.description?.trim() || 'Creator live session';
}

function humanizeLabel(value?: string | null) {
  const text = value?.trim();
  if (!text) return null;
  // Turn raw machine values like "scheduled_session" into "Scheduled Session" for display.
  return text.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function roomHost(room: LiveRoomItem) {
  return room.creator_name?.trim() || humanizeLabel(room.category) || 'PLUGGD Live';
}

function roomSearchText(room: LiveRoomItem) {
  return `${room.title || ''} ${room.description || ''} ${room.category || ''}`.toLowerCase();
}

function isJoinableRoom(room: LiveRoomItem) {
  return room.source === 'session_room' || !room.source;
}

function isRealLiveRoom(room: LiveRoomItem) {
  return room.status === 'live' && isJoinableRoom(room);
}

function isReplayRoom(room: LiveRoomItem) {
  return room.status === 'replay' && Boolean(room.replay_url);
}

function isUpcomingRoom(room: LiveRoomItem) {
  if (isRealLiveRoom(room) || isReplayRoom(room) || room.source === 'community_room') return false;
  return room.source === 'session_room' || room.source === 'scheduled_session';
}

function isCommunityRoom(room: LiveRoomItem) {
  return room.source === 'community_room' || roomSearchText(room).includes('community') || roomSearchText(room).includes('audio_room');
}

function isListeningParty(room: LiveRoomItem) {
  const text = roomSearchText(room);
  return text.includes('listening') || text.includes('party') || text.includes('album playback') || text.includes('premiere');
}

function isStudioSession(room: LiveRoomItem) {
  const text = roomSearchText(room);
  return text.includes('studio') || text.includes('cook') || text.includes('producer') || text.includes('feedback') || text.includes('breakdown');
}

function canRemindRoom(room: LiveRoomItem) {
  return Boolean(room.scheduled_for && (room.source === 'session_room' || room.source === 'scheduled_session'));
}

function canRemindEvent(event: EventItem) {
  return Boolean(event.starts_at);
}

function eventTitle(event: EventItem) {
  return event.title?.trim() || 'Live event';
}

function eventHost(event: EventItem) {
  return event.location?.trim() || 'PLUGGD Event';
}

function isEventLinkedLive(event: EventItem) {
  return Boolean(event.stream_url || event.playback_url);
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
  if (days > 0) return `${days.toString().padStart(2, '0')}D ${hours.toString().padStart(2, '0')}H ${minutes.toString().padStart(2, '0')}M`;
  return `${hours.toString().padStart(2, '0')}H ${minutes.toString().padStart(2, '0')}M`;
}

function viewerLabel(room: LiveRoomItem) {
  const viewers = Number(room.viewer_count ?? 0);
  if (viewers > 0) return `${formatCompact(viewers)} tuned in`;
  if (room.status === 'live') return 'Live now';
  return null;
}

function replayTrack(room: LiveRoomItem): PluggdTrack | null {
  if (!room.replay_url) return null;
  return {
    id: `live-replay-${room.id}`,
    url: room.replay_url,
    title: roomTitle(room),
    artist: roomHost(room),
    artwork: mediaImageForRoom(room) || undefined,
    type: 'preview',
    sourceType: 'preview',
  };
}

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'PLUGGD Creator';
}

function profileHandle(profile: ProfileItem) {
  if (profile.primary_genre) return profile.primary_genre;
  if (profile.user_type) return profile.user_type;
  if (profile.city) return profile.city;
  return 'Creator';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  return '/search';
}

function creatorRoute(room: LiveRoomItem) {
  if (room.creator_username) return `/creator/${room.creator_username}`;
  return room.creator_id ? '/search' : '/live';
}

function mapCreators(bundle?: FeedBundle, rooms: LiveRoomItem[] = []): CreatorCard[] {
  const creators: CreatorCard[] = [];
  const seen = new Set<string>();

  rooms.forEach((room) => {
    const name = roomHost(room);
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    creators.push({
      id: `live-${room.id}`,
      name,
      handle: humanizeLabel(room.category) || 'Live creator',
      route: creatorRoute(room),
      imageUrl: room.creator_avatar_url || room.thumbnail_url,
      isLive: room.status === 'live',
    });
  });

  bundle?.profiles.forEach((profile) => {
    const name = profileName(profile);
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    creators.push({
      id: profile.user_id || profile.id || profile.username || name,
      name,
      handle: profileHandle(profile),
      route: profileRoute(profile),
      imageUrl: profile.avatar_url,
    });
  });

  return creators.slice(0, 12);
}

function pickFocus(
  activeFilter: LiveFilter,
  liveNow: LiveRoomItem[],
  upcomingRooms: LiveRoomItem[],
  communityRooms: LiveRoomItem[],
  listeningParties: LiveRoomItem[],
  replays: LiveRoomItem[],
  eventLinked: EventItem[],
): FocusSource | undefined {
  if (activeFilter === 'Rooms') {
    const room = communityRooms[0];
    if (room) return { kind: 'room', room, state: room.status === 'live' ? 'live' : 'upcoming' };
  }
  if (activeFilter === 'Listening Parties') {
    const party = listeningParties[0];
    if (party) return { kind: 'room', room: party, state: party.status === 'live' ? 'live' : 'upcoming' };
  }
  if (activeFilter === 'Replays') {
    const replay = replays[0];
    if (replay) return { kind: 'room', room: replay, state: 'replay' };
    const eventReplay = eventLinked.find((event) => Boolean(event.playback_url));
    if (eventReplay) return { kind: 'event', event: eventReplay, state: 'replay' };
  }
  if (activeFilter === 'Upcoming') {
    const upcoming = upcomingRooms[0];
    if (upcoming) return { kind: 'room', room: upcoming, state: 'upcoming' };
    const event = eventLinked[0];
    if (event) return { kind: 'event', event, state: 'upcoming' };
  }
  const live = liveNow[0];
  if (live) return { kind: 'room', room: live, state: 'live' };
  const next = upcomingRooms[0];
  if (next) return { kind: 'room', room: next, state: 'upcoming' };
  const event = eventLinked[0];
  if (event) return { kind: 'event', event, state: 'upcoming' };
  const replay = replays[0];
  if (replay) return { kind: 'room', room: replay, state: 'replay' };
  return undefined;
}

function LiveArtwork({ uri, title, style }: { uri?: string | null; title: string; style?: object }) {
  const colors = IMAGE_GRADIENTS[hashIndex(title, IMAGE_GRADIENTS.length)];
  return (
    <LinearGradient colors={colors as any} style={[styles.artworkBase, style]}>
      {uri ? <PluggdImage uri={uri} style={styles.imageFill} resizeMode="cover" /> : null}
      {!uri ? <Text style={styles.fallbackInitials}>{contentInitials(title)}</Text> : null}
    </LinearGradient>
  );
}

function LiveHeader() {
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
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>LIVE</Text>
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

function FilterPills({ active, onChange }: { active: LiveFilter; onChange: (filter: LiveFilter) => void }) {
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
            style={[styles.filterPill, selected && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, selected && styles.filterTextActive]}>{filter}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTick} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionActionButton}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyInline({ title, body, primary, onPrimary }: { title: string; body: string; primary?: string; onPrimary?: () => void }) {
  return (
    <View style={styles.emptyInline}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {primary && onPrimary ? (
        <Pressable accessibilityRole="button" onPress={onPrimary} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{primary}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FocusCard({
  source,
  onJoinRoom,
  onToggleRoomReminder,
  onToggleEventReminder,
  onPlayReplay,
  isRoomReminded,
  isEventReminded,
  onViewUpcoming,
  onViewReplays,
}: {
  source?: FocusSource;
  onJoinRoom: (room: LiveRoomItem) => void;
  onToggleRoomReminder: (room: LiveRoomItem) => void;
  onToggleEventReminder: (event: EventItem) => void;
  onPlayReplay: (room: LiveRoomItem) => void;
  isRoomReminded: (room: LiveRoomItem) => boolean;
  isEventReminded: (event: EventItem) => boolean;
  onViewUpcoming: () => void;
  onViewReplays: () => void;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 9000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 9000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  if (!source) {
    return (
      <View style={styles.focusEmpty}>
        <Text style={styles.focusEmptyTitle}>No one is live right now</Text>
        <Text style={styles.focusEmptyBody}>See what's coming up or replay recent sessions.</Text>
        <View style={styles.focusEmptyActions}>
          <Pressable accessibilityRole="button" onPress={onViewUpcoming} style={styles.focusEmptyPrimary}>
            <Text style={styles.focusEmptyPrimaryText}>View Upcoming</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onViewReplays} style={styles.focusEmptySecondary}>
            <Text style={styles.focusEmptySecondaryText}>Watch Replays</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isRoom = source.kind === 'room';
  const title = isRoom ? roomTitle(source.room) : eventTitle(source.event);
  const host = isRoom ? roomHost(source.room) : eventHost(source.event);
  const imageUrl = isRoom ? mediaImageForRoom(source.room) : source.event.cover_image_url;
  const description = isRoom
    ? source.room.description || humanizeLabel(source.room.category) || 'Real-time PLUGGD session'
    : source.event.description || 'Event-linked live moment';
  const metric = isRoom
    ? source.state === 'live'
      ? viewerLabel(source.room)
      : `${formatDate(source.room.scheduled_for, 'Time TBA')} · ${eventCountdown(source.room.scheduled_for)}`
    : `${formatDate(source.event.starts_at, 'Time TBA')} · ${eventCountdown(source.event.starts_at)}`;
  const isLive = source.state === 'live';
  const isReplay = source.state === 'replay';
  const canSetReminder = isRoom ? canRemindRoom(source.room) : canRemindEvent(source.event);
  const reminded = isRoom ? isRoomReminded(source.room) : isEventReminded(source.event);
  const canOpenBackstage = isRoom && Boolean(source.room.backstage_id);

  const primaryLabel = isLive && isRoom && isJoinableRoom(source.room)
    ? 'Join Live'
    : isReplay
      ? 'Watch Replay'
      : canSetReminder
        ? reminded
          ? 'Reminder Set'
          : 'Set Reminder'
        : 'Open Details';

  const primaryAction = () => {
    impactHaptic();
    if (isLive && isRoom && isJoinableRoom(source.room)) {
      onJoinRoom(source.room);
      return;
    }
    if (isReplay) {
      if (isRoom) onPlayReplay(source.room);
      else router.push(`/events/${source.event.id}` as any);
      return;
    }
    if (canSetReminder) {
      if (isRoom) onToggleRoomReminder(source.room);
      else onToggleEventReminder(source.event);
      return;
    }
    if (isRoom) onJoinRoom(source.room);
    else router.push(`/events/${source.event.id}` as any);
  };

  return (
    <View style={styles.focusCard}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        <LiveArtwork uri={imageUrl} title={title} style={styles.focusImage} />
      </Animated.View>
      <LinearGradient colors={['rgba(8,8,12,0.04)', 'rgba(8,8,12,0.52)', 'rgba(8,8,12,0.96)']} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      {isLive ? <LinearGradient colors={['rgba(255,71,87,0.22)', 'rgba(8,8,12,0)']} style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.focusContent}>
        <View style={[styles.statusBadge, isLive ? styles.statusBadgeLive : styles.statusBadgeNeutral]}>
          {isLive ? <View style={styles.statusDotLive} /> : null}
          <Text style={styles.statusBadgeText}>{isLive ? 'LIVE' : isReplay ? 'REPLAY' : 'UPCOMING'}</Text>
        </View>
        <DetailTitle title={title} size={29} lineHeight={32} color={COLORS.white} numberOfLines={2} style={{ marginTop: 12 }} />
        <Text style={styles.focusHost} numberOfLines={1}>{host}</Text>
        {metric ? <Text style={styles.focusMetric} numberOfLines={1}>{metric}</Text> : null}
        <Text style={styles.focusDescription} numberOfLines={2}>{description}</Text>
        <View style={styles.focusActions}>
          <Pressable accessibilityRole="button" onPress={primaryAction} style={[styles.focusPrimary, isLive && styles.focusPrimaryLive]}>
            <Text style={styles.focusPrimaryText}>{primaryLabel}</Text>
          </Pressable>
          {canOpenBackstage ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/backstage/${source.room.backstage_id}` as any)} style={styles.focusSecondary}>
              <Text style={styles.focusSecondaryText}>Open Community</Text>
            </Pressable>
          ) : !isRoom ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/events/${source.event.id}` as any)} style={styles.focusSecondary}>
              <Text style={styles.focusSecondaryText}>Open Details</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function LiveNowCard({ room, onJoin }: { room: LiveRoomItem; onJoin: (room: LiveRoomItem) => void }) {
  const title = roomTitle(room);
  const host = roomHost(room);
  const viewers = viewerLabel(room);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Join ${title}`} onPress={() => onJoin(room)} style={styles.liveNowCard}>
      <LiveArtwork uri={mediaImageForRoom(room)} title={title} style={styles.liveNowImage} />
      <LinearGradient colors={['rgba(8,8,12,0.08)', 'rgba(8,8,12,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.liveBadgeSmall}>
        <View style={styles.liveDotSmall} />
        <Text style={styles.liveBadgeSmallText}>LIVE</Text>
      </View>
      <View style={styles.liveNowCopy}>
        <Text style={styles.liveNowHost} numberOfLines={1}>{host}</Text>
        <Text style={styles.liveNowTitle} numberOfLines={2}>{title}</Text>
        {viewers ? <Text style={styles.liveNowMeta} numberOfLines={1}>{viewers}</Text> : null}
        <View style={styles.liveNowButton}>
          <Text style={styles.liveNowButtonText}>Join</Text>
        </View>
      </View>
    </Pressable>
  );
}

function LiveSwipeEntry({ onPress, rooms }: { onPress: () => void; rooms: LiveRoomItem[] }) {
  if (!rooms.length) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open Live Feed" onPress={onPress} style={styles.swipeEntry}>
      <View style={styles.swipeCopy}>
        <Text style={styles.swipeTitle}>Swipe live rooms</Text>
        <Text style={styles.swipeBody}>Move through active sessions.</Text>
      </View>
      <View style={styles.swipeStack}>
        {rooms.slice(0, 3).map((room, index) => (
          <View key={room.id} style={[styles.swipeThumb, { right: index * 22, zIndex: 4 - index }]}>
            <LiveArtwork uri={mediaImageForRoom(room)} title={roomTitle(room)} style={styles.swipeThumbImage} />
          </View>
        ))}
      </View>
      <View style={styles.swipeCTA}>
        <Text style={styles.swipeCTAText}>Open Live Feed</Text>
      </View>
    </Pressable>
  );
}

function UpcomingSessionCard({
  room,
  reminded,
  onToggleReminder,
  onOpen,
}: {
  room: LiveRoomItem;
  reminded: boolean;
  onToggleReminder: () => void;
  onOpen: () => void;
}) {
  const title = roomTitle(room);
  const canRemind = canRemindRoom(room);
  return (
    <View style={styles.upcomingCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onOpen} style={styles.upcomingDetailsButton}>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{roomHost(room)}</Text>
        <View style={styles.countdownRow}>
          <MaterialIcons name="schedule" size={13} color={COLORS.muted} />
          <Text style={styles.countdownText}>{formatDate(room.scheduled_for, 'Time TBA')} · {eventCountdown(room.scheduled_for)}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={reminded ? `Remove reminder for ${title}` : `Set reminder for ${title}`}
        onPress={(event) => {
          event.stopPropagation();
          if (canRemind) onToggleReminder();
          else onOpen();
        }}
        style={[styles.compactCTA, reminded && styles.compactCTAOn]}
      >
        <Text style={[styles.compactCTAText, reminded && styles.compactCTATextOn]}>{canRemind ? (reminded ? 'Reminder Set' : 'Set Reminder') : 'View Details'}</Text>
      </Pressable>
    </View>
  );
}

function CompactRoomRow({ room, onOpen }: { room: LiveRoomItem; onOpen: (room: LiveRoomItem) => void }) {
  const activeUsers = Number(room.viewer_count ?? 0);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Join room ${roomTitle(room)}`} onPress={() => onOpen(room)} style={styles.roomRow}>
      <View style={styles.roomIcon}>
        <MaterialIcons name="settings-input-antenna" size={20} color={COLORS.orange} />
      </View>
      <View style={styles.roomCopy}>
        <Text style={styles.roomTitle} numberOfLines={1}>{roomTitle(room)}</Text>
        <Text style={styles.roomMeta} numberOfLines={1}>
          {humanizeLabel(room.category) || 'Community room'}{activeUsers > 0 ? ` · ${formatCompact(activeUsers)} active` : ''}
        </Text>
      </View>
      {room.status === 'live' ? <View style={styles.roomLiveDot} /> : null}
      <Text style={styles.roomCTA}>Join Room</Text>
    </Pressable>
  );
}

function WideSessionCard({
  room,
  label,
  reminded,
  onJoin,
  onReminder,
}: {
  room: LiveRoomItem;
  label: string;
  reminded: boolean;
  onJoin: (room: LiveRoomItem) => void;
  onReminder: (room: LiveRoomItem) => void;
}) {
  const isLive = isRealLiveRoom(room);
  return (
    <View style={styles.wideCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${roomTitle(room)}`} onPress={() => onJoin(room)} style={StyleSheet.absoluteFill}>
        <LiveArtwork uri={mediaImageForRoom(room)} title={roomTitle(room)} style={styles.wideImage} />
        <LinearGradient colors={['rgba(8,8,12,0.04)', 'rgba(8,8,12,0.86)']} style={StyleSheet.absoluteFill} />
      </Pressable>
      <View style={styles.wideContent}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${roomTitle(room)}`} onPress={() => onJoin(room)} style={styles.wideTextHitArea}>
          <View style={[styles.miniTag, isLive && styles.miniTagLive]}>
            {isLive ? <View style={styles.liveDotSmall} /> : null}
            <Text style={styles.miniTagText}>{isLive ? 'LIVE' : label}</Text>
          </View>
          <Text style={styles.wideTitle} numberOfLines={2}>{roomTitle(room)}</Text>
          <Text style={styles.wideMeta} numberOfLines={1}>{roomHost(room)} · {humanizeLabel(room.category) || 'Session'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            if (isLive) onJoin(room);
            else onReminder(room);
          }}
          style={styles.wideCTA}
        >
          <Text style={styles.wideCTAText}>{isLive ? 'Join' : reminded ? 'Reminder Set' : 'Set Reminder'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EventLiveCard({
  event,
  reminded,
  onReminder,
}: {
  event: EventItem;
  reminded: boolean;
  onReminder: (event: EventItem) => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.wideCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open event hub for ${eventTitle(event)}`} onPress={() => router.push(`/events/${event.id}` as any)} style={StyleSheet.absoluteFill}>
        <LiveArtwork uri={event.cover_image_url} title={eventTitle(event)} style={styles.wideImage} />
        <LinearGradient colors={['rgba(8,8,12,0.05)', 'rgba(8,8,12,0.88)']} style={StyleSheet.absoluteFill} />
      </Pressable>
      <View style={styles.wideContent}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open event hub for ${eventTitle(event)}`} onPress={() => router.push(`/events/${event.id}` as any)} style={styles.wideTextHitArea}>
          <View style={styles.miniTag}>
            <Text style={styles.miniTagText}>{event.stream_url ? 'EVENT LIVE' : 'REPLAY'}</Text>
          </View>
          <Text style={styles.wideTitle} numberOfLines={2}>{eventTitle(event)}</Text>
          <Text style={styles.wideMeta} numberOfLines={1}>{eventHost(event)} · {eventCountdown(event.starts_at)}</Text>
        </Pressable>
        <View style={styles.wideSplitActions}>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/events/${event.id}` as any)} style={styles.wideSmallCTA}>
            <Text style={styles.wideCTAText}>Open Event Hub</Text>
          </Pressable>
          {canRemindEvent(event) ? (
            <Pressable accessibilityRole="button" onPress={(pressEvent) => { pressEvent.stopPropagation(); onReminder(event); }} style={[styles.wideSmallCTA, reminded && styles.wideSmallCTAOn]}>
              <Text style={[styles.wideCTAText, reminded && styles.compactCTATextOn]}>{reminded ? 'Saved' : 'Reminder'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ReplayRow({ room }: { room: LiveRoomItem }) {
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayback();
  const track = replayTrack(room);
  const active = Boolean(track && currentTrack?.id === track.id);
  const title = roomTitle(room);

  const play = async () => {
    impactHaptic();
    if (!track) {
      router.push({ pathname: '/live/session', params: { roomId: room.id } } as any);
      return;
    }
    if (active) await togglePlayPause();
    else await playTrack(track);
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open replay ${title}`} onPress={() => void play()} style={styles.replayRow}>
      <LiveArtwork uri={mediaImageForRoom(room)} title={title} style={styles.replayThumb} />
      <View style={styles.replayCopy}>
        <Text style={styles.replayTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.replayMeta} numberOfLines={1}>{roomHost(room)}</Text>
        <Text style={styles.replayMeta} numberOfLines={1}>{viewerLabel(room) || 'Replay'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={active && isPlaying ? `Pause ${title}` : `Play ${title}`} onPress={(event) => { event.stopPropagation(); void play(); }} style={styles.replayPlay}>
        <MaterialIcons name={active && isPlaying ? 'pause' : 'play-arrow'} size={18} color={COLORS.canvas} />
      </Pressable>
    </Pressable>
  );
}

function CreatorCardView({
  creator,
  following,
  onToggle,
}: {
  creator: CreatorCard;
  following: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.creatorCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${creator.name}`}
        onPress={() => {
          selectionHaptic();
          router.push(creator.route as any);
        }}
        style={[styles.creatorAvatar, creator.isLive && styles.creatorAvatarLive]}
      >
        {creator.imageUrl ? <PluggdImage uri={creator.imageUrl} style={styles.imageFill} /> : <Text style={styles.creatorInitials}>{contentInitials(creator.name)}</Text>}
        {creator.isLive ? <View style={styles.creatorLivePill}><Text style={styles.creatorLiveText}>LIVE</Text></View> : null}
      </Pressable>
      <Text style={styles.creatorName} numberOfLines={1}>{creator.name}</Text>
      <Text style={styles.creatorHandle} numberOfLines={1}>{creator.handle}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={following ? `Unfollow ${creator.name}` : `Follow ${creator.name}`}
        onPress={() => {
          impactHaptic();
          onToggle();
        }}
        style={[styles.followButton, following && styles.followButtonOn]}
      >
        <Text style={[styles.followText, following && styles.followTextOn]}>{following ? 'Following' : 'Follow'}</Text>
      </Pressable>
    </View>
  );
}

export function LiveCultureScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const roomsQuery = useLiveRooms();
  const eventsQuery = useEventLayer(16);
  const backstageQuery = useBackstage();
  const homeQuery = useHomeFeed();
  const playback = usePlayback();
  const remindersQuery = useQuery({ queryKey: ['culture', 'reminders'], queryFn: loadReminderState });
  const [activeFilter, setActiveFilter] = useState<LiveFilter>('Live Now');
  const [following, setFollowing] = useState<Set<string>>(() => new Set());

  const rooms = roomsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const liveNow = useMemo(() => rooms.filter(isRealLiveRoom), [rooms]);
  const upcomingRooms = useMemo(() => rooms.filter(isUpcomingRoom), [rooms]);
  const communityRooms = useMemo(() => rooms.filter(isCommunityRoom).filter((room) => room.source === 'session_room' || Boolean(room.backstage_id)), [rooms]);
  const listeningParties = useMemo(() => rooms.filter((room) => (isRealLiveRoom(room) || isUpcomingRoom(room)) && isListeningParty(room)), [rooms]);
  const studioSessions = useMemo(() => rooms.filter((room) => (isRealLiveRoom(room) || isUpcomingRoom(room)) && isStudioSession(room)), [rooms]);
  const replays = useMemo(() => rooms.filter(isReplayRoom), [rooms]);
  const eventLinked = useMemo(() => events.filter(isEventLinkedLive), [events]);
  const creators = useMemo(() => mapCreators(homeQuery.data, rooms), [homeQuery.data, rooms]);
  const focus = useMemo(
    () => pickFocus(activeFilter, liveNow, upcomingRooms, communityRooms, listeningParties, replays, eventLinked),
    [activeFilter, communityRooms, eventLinked, listeningParties, liveNow, replays, upcomingRooms],
  );
  const loading = roomsQuery.isLoading || eventsQuery.isLoading || backstageQuery.isLoading || homeQuery.isLoading;
  const refreshing = roomsQuery.isRefetching || eventsQuery.isRefetching || backstageQuery.isRefetching || homeQuery.isRefetching || remindersQuery.isRefetching;
  const focusHeight = Math.min(340, Math.max(280, width * 0.78));
  const bottomPadding = Math.max(insets.bottom + 154, 176);

  useEffect(() => {
    if (!roomsQuery.isLoading && liveNow.length === 0 && activeFilter === 'Live Now') {
      setActiveFilter('Upcoming');
    }
  }, [activeFilter, liveNow.length, roomsQuery.isLoading]);

  const refresh = () => {
    void roomsQuery.refetch();
    void eventsQuery.refetch();
    void backstageQuery.refetch();
    void homeQuery.refetch();
    void remindersQuery.refetch();
  };

  const isRoomReminded = (room: LiveRoomItem) => remindersQuery.data?.liveSessionIds.includes(room.id) ?? false;
  const isEventReminded = (event: EventItem) => ['interested', 'going'].includes(remindersQuery.data?.eventStatuses[event.id] ?? 'none');

  const openRoom = (room: LiveRoomItem) => {
    selectionHaptic();
    if (isJoinableRoom(room)) {
      router.push({ pathname: '/live/session', params: { roomId: room.id } } as any);
      return;
    }
    if (room.backstage_id) {
      router.push(`/backstage/${room.backstage_id}` as any);
      return;
    }
    if (room.replay_url) {
      Alert.alert('Replay available', 'Use the replay row to start this recording in the PLUGGD player.');
      return;
    }
    Alert.alert('Room unavailable', 'This live item exists in PLUGGD, but it is not attached to a mobile join route yet.');
  };

  const playReplayRoom = async (room: LiveRoomItem) => {
    const track = replayTrack(room);
    if (!track) {
      openRoom(room);
      return;
    }
    impactHaptic();
    await playback.playTrack(track);
    router.push('/player' as any);
  };

  const toggleEventReminder = async (event: EventItem) => {
    impactHaptic();
    const current = remindersQuery.data?.eventStatuses[event.id] ?? 'none';
    if (current === 'going') {
      Alert.alert('Already going', 'You are marked as going. Manage your RSVP from the event page.');
      return;
    }
    const result = await setEventReminder(event.id, current !== 'interested');
    if (!result.success) {
      if (result.error?.toLowerCase().includes('sign in')) Alert.alert('Sign in required', 'Please sign in to set event reminders.');
      else Alert.alert('Reminder failed', result.error || 'This reminder could not be updated.');
      return;
    }
    if (current === 'interested') {
      await cancelEventLocalReminder(event.id);
    } else {
      const notification = await scheduleEventLocalReminder({ eventId: event.id, title: eventTitle(event), startsAt: event.starts_at });
      if (!notification.success) Alert.alert('Reminder saved', 'Your RSVP was saved in PLUGGD. Enable notifications in iOS Settings to receive a local alert.');
    }
    void remindersQuery.refetch();
    void eventsQuery.refetch();
  };

  const toggleRoomReminder = async (room: LiveRoomItem) => {
    impactHaptic();
    if (!canRemindRoom(room)) {
      Alert.alert('Reminder unavailable', 'Reminders are not available for this live item yet.');
      return;
    }
    const reminded = isRoomReminded(room);
    const result = await setScheduledSessionReminder({
      sessionId: room.id,
      enabled: !reminded,
      sendAt: room.scheduled_for,
      title: roomTitle(room),
      source: room.source,
    });
    if (!result.success) {
      Alert.alert('Reminder failed', result.error || 'This reminder could not be updated.');
      return;
    }
    if (reminded) {
      await cancelLiveSessionLocalReminder(room.id);
    } else {
      const notification = await scheduleLiveSessionLocalReminder({ sessionId: room.id, title: roomTitle(room), startsAt: room.scheduled_for });
      if (!notification.success) Alert.alert('Reminder saved', 'Your live reminder was saved in PLUGGD. Enable notifications in iOS Settings to receive a local alert.');
    }
    void remindersQuery.refetch();
  };

  const toggleFollow = (id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(id)) {
      Alert.alert('Follow from profile', 'Open this creator profile to follow the real account.');
      return;
    }
    setFollowing((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    void toggleProfileFollow(id).then((result) => {
      if (!result.success) {
        Alert.alert('Follow failed', result.error || 'Could not update this follow.');
        setFollowing((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }
    });
  };

  const communitiesById = useMemo(() => {
    const map = new Map<string, BackstageCommunity>();
    (backstageQuery.data?.communities ?? []).forEach((community) => map.set(community.id, community));
    return map;
  }, [backstageQuery.data?.communities]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <LiveHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.orange} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      >
        <FilterPills active={activeFilter} onChange={setActiveFilter} />
        {loading ? <PremiumSkeleton compact label="Loading real Live sessions..." style={styles.loadingBlock} /> : null}

        <View style={[styles.focusWrap, { height: focusHeight }]}>
          <FocusCard
            source={focus}
            onJoinRoom={openRoom}
            onToggleRoomReminder={toggleRoomReminder}
            onToggleEventReminder={toggleEventReminder}
            onPlayReplay={(room) => { void playReplayRoom(room); }}
            isRoomReminded={isRoomReminded}
            isEventReminded={isEventReminded}
            onViewUpcoming={() => setActiveFilter('Upcoming')}
            onViewReplays={() => setActiveFilter('Replays')}
          />
        </View>

        {liveNow.length > 1 ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="LIVE NOW" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveShelf}>
              {liveNow.map((room) => <LiveNowCard key={room.id} room={room} onJoin={openRoom} />)}
            </ScrollView>
          </View>
        ) : null}

        <LiveSwipeEntry rooms={liveNow} onPress={() => router.push('/live/feed' as any)} />

        <View style={styles.sectionBlock}>
          <SectionHeader title="UPCOMING LIVE SESSIONS" />
          {upcomingRooms.length === 0 ? (
            <EmptyInline title="Nothing scheduled yet" body="Follow creators to see their next live sessions here." primary="Find creators" onPrimary={() => router.push('/search' as any)} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingShelf}>
              {upcomingRooms.slice(0, 10).map((room) => (
                <UpcomingSessionCard
                  key={room.id}
                  room={room}
                  reminded={isRoomReminded(room)}
                  onToggleReminder={() => { void toggleRoomReminder(room); }}
                  onOpen={() => openRoom(room)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="COMMUNITY ROOMS" />
          {communityRooms.length === 0 ? (
            <EmptyInline title="No community rooms active" body="Community rooms appear here when circles open real room data." />
          ) : (
            <View style={styles.roomList}>
              {communityRooms.slice(0, 6).map((room) => (
                <CompactRoomRow
                  key={room.id}
                  room={{ ...room, title: room.title || communitiesById.get(room.backstage_id || '')?.title || room.title }}
                  onOpen={openRoom}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="LISTENING PARTIES" />
          {listeningParties.length === 0 ? (
            <EmptyInline title="No listening parties yet" body="Music-first live rooms will appear here when creators schedule them." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wideShelf}>
              {listeningParties.map((room) => (
                <WideSessionCard key={room.id} room={room} label="LISTENING" reminded={isRoomReminded(room)} onJoin={openRoom} onReminder={toggleRoomReminder} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="STUDIO / COOK-UP SESSIONS" />
          {studioSessions.length === 0 ? (
            <EmptyInline title="No studio sessions yet" body="Cook-ups, producer feedback and process rooms will appear here when they are real." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wideShelf}>
              {studioSessions.map((room) => (
                <WideSessionCard key={room.id} room={room} label="STUDIO" reminded={isRoomReminded(room)} onJoin={openRoom} onReminder={toggleRoomReminder} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="EVENT-LINKED LIVE SESSIONS" />
          {eventLinked.length === 0 ? (
            <EmptyInline title="No event-linked live sessions" body="Event streams, pre-parties, afterparties and recaps appear only when the event has live media attached." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wideShelf}>
              {eventLinked.map((event) => (
                <EventLiveCard key={event.id} event={event} reminded={isEventReminded(event)} onReminder={toggleEventReminder} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="REPLAYS + CLIPS" />
          {replays.length === 0 ? (
            <EmptyInline title="No replays yet" body="Creator replays and clips appear here when replay media exists." />
          ) : (
            <View style={styles.replayList}>
              {replays.slice(0, 8).map((room) => <ReplayRow key={room.id} room={room} />)}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="FEATURED LIVE CREATORS" />
          {creators.length === 0 ? (
            <EmptyInline title="No featured live creators yet" body="Follow creators to shape future live recommendations." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorShelf}>
              {creators.map((creator) => (
                <CreatorCardView key={creator.id} creator={creator} following={following.has(creator.id)} onToggle={() => toggleFollow(creator.id)} />
              ))}
            </ScrollView>
          )}
        </View>
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
  headerTitle: {
    ...pluggdTextStyles.appTitle,
    fontSize: 32,
    lineHeight: 36,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  notificationBadgeText: { fontFamily: pluggdFonts.satoshiBlack, color: COLORS.white, fontSize: 9, fontWeight: '900' },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInitials: { fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  scrollContent: { paddingTop: 12 },
  filters: { minHeight: 44, paddingHorizontal: 16, paddingBottom: 14, gap: 8, alignItems: 'center' },
  filterPill: {
    minHeight: 44,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  filterPillActive: {},
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
  filterTextActive: {
    color: COLORS.orange,
    borderColor: 'rgba(255,90,0,0.64)',
    backgroundColor: 'rgba(255,90,0,0.14)',
  },
  loadingBlock: {
    marginHorizontal: 16,
    marginBottom: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  focusWrap: { marginHorizontal: 16, marginBottom: 20 },
  focusCard: {
    flex: 1,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: COLORS.surface,
  },
  focusImage: { width: '100%', height: '100%' },
  artworkBase: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  imageFill: { width: '100%', height: '100%' },
  fallbackInitials: { fontFamily: pluggdFonts.satoshiBlack, color: 'rgba(255,255,255,0.86)', fontSize: 38, lineHeight: 44, fontWeight: '900' },
  focusContent: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  statusBadge: {
    alignSelf: 'flex-start',
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusBadgeLive: { backgroundColor: COLORS.coral },
  statusBadgeNeutral: { backgroundColor: 'rgba(18,18,26,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statusDotLive: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.white },
  statusBadgeText: { fontFamily: 'Satoshi-Bold', color: COLORS.white, fontSize: 11, lineHeight: 14 },
  focusTitle: {
    marginTop: 12,
    color: COLORS.white,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 29,
    lineHeight: 32,
    letterSpacing: 0,
  },
  focusHost: { marginTop: 5, color: COLORS.soft, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 18, textTransform: 'uppercase' },
  focusMetric: { fontFamily: pluggdFonts.satoshiBold, marginTop: 7, color: COLORS.muted, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  focusDescription: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 8, color: COLORS.soft, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  focusActions: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  focusPrimary: {
    minWidth: 132,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
  },
  focusPrimaryLive: { backgroundColor: COLORS.coral },
  focusPrimaryText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17 },
  focusSecondary: {
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(18,18,26,0.62)',
    paddingHorizontal: 16,
  },
  focusSecondaryText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 16 },
  focusEmpty: {
    flex: 1,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  focusEmptyTitle: { color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 22, lineHeight: 26, textAlign: 'center' },
  focusEmptyBody: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 8, color: COLORS.muted, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  focusEmptyActions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  focusEmptyPrimary: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orange },
  focusEmptyPrimaryText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  focusEmptySecondary: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.surface2 },
  focusEmptySecondaryText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  sectionBlock: { marginBottom: 24 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  sectionTick: { width: 3, height: 16, borderRadius: 2, backgroundColor: '#FF5A00' },
  sectionTitle: { ...pluggdTextStyles.sectionTitle, color: COLORS.white, fontSize: 18, lineHeight: 22, letterSpacing: -0.2 },
  sectionActionButton: { minHeight: 44, justifyContent: 'center' },
  sectionAction: { fontFamily: 'Satoshi-Bold', color: COLORS.orange, fontSize: 12, lineHeight: 15 },
  liveShelf: { paddingHorizontal: 16, gap: 12 },
  liveNowCard: {
    width: 166,
    height: 218,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.28)',
    backgroundColor: COLORS.surface,
  },
  liveNowImage: { width: '100%', height: '100%' },
  liveBadgeSmall: {
    position: 'absolute',
    left: 10,
    top: 10,
    height: 24,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.coral,
  },
  liveDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.white },
  liveBadgeSmallText: { fontFamily: 'Satoshi-Bold', color: COLORS.white, fontSize: 10, lineHeight: 12 },
  liveNowCopy: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  liveNowHost: { fontFamily: pluggdFonts.satoshiBold, color: COLORS.muted, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  liveNowTitle: { marginTop: 5, color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 18 },
  liveNowMeta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 5, color: COLORS.soft, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  liveNowButton: { marginTop: 9, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.coral },
  liveNowButtonText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  swipeEntry: {
    marginHorizontal: 16,
    marginBottom: 24,
    minHeight: 108,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeCopy: { flex: 1, paddingRight: 12 },
  swipeTitle: { color: COLORS.white, fontFamily: 'Satoshi-Black', fontSize: 18, lineHeight: 22 },
  swipeBody: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 5, color: COLORS.muted, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  swipeStack: { width: 94, height: 64, position: 'relative' },
  swipeThumb: { position: 'absolute', top: 0, width: 54, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.surface2 },
  swipeThumbImage: { width: '100%', height: '100%' },
  swipeCTA: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, backgroundColor: COLORS.orange },
  swipeCTAText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  upcomingShelf: { paddingHorizontal: 16, gap: 12 },
  upcomingCard: {
    width: 244,
    height: 156,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 13,
  },
  upcomingDetailsButton: { flex: 1 },
  cardTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 20 },
  cardMeta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 5, color: COLORS.muted, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  countdownRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  countdownText: { fontFamily: pluggdFonts.satoshiBold, color: COLORS.soft, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  compactCTA: { marginTop: 'auto', minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(31,31,46,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  compactCTAOn: { borderColor: COLORS.orange, backgroundColor: 'rgba(255,90,0,0.14)' },
  compactCTAText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  compactCTATextOn: { color: COLORS.orange },
  roomList: { marginHorizontal: 16, gap: 10 },
  roomRow: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  roomIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,90,0,0.12)' },
  roomCopy: { flex: 1, minWidth: 0 },
  roomTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 18 },
  roomMeta: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 5, color: COLORS.muted, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  roomLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.coral },
  roomCTA: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  wideShelf: { paddingHorizontal: 16, gap: 12 },
  wideCard: {
    width: 244,
    height: 156,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  wideImage: { width: '100%', height: '100%' },
  wideContent: { position: 'absolute', left: 12, right: 12, bottom: 12, top: 12, justifyContent: 'flex-end' },
  wideTextHitArea: { flex: 1, justifyContent: 'flex-end' },
  miniTag: { alignSelf: 'flex-start', height: 23, borderRadius: 8, paddingHorizontal: 8, backgroundColor: 'rgba(18,18,26,0.78)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniTagLive: { backgroundColor: COLORS.coral },
  miniTagText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 10, lineHeight: 12 },
  wideTitle: { marginTop: 'auto', color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 19 },
  wideMeta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 4, color: COLORS.muted, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  wideCTA: { marginTop: 9, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  wideCTAText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  wideSplitActions: { marginTop: 9, flexDirection: 'row', gap: 8 },
  wideSmallCTA: { flex: 1, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, paddingHorizontal: 8 },
  wideSmallCTAOn: { backgroundColor: 'rgba(255,90,0,0.16)', borderWidth: 1, borderColor: COLORS.orange },
  replayList: { marginHorizontal: 16, gap: 10 },
  replayRow: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replayThumb: { width: 72, height: 72, borderRadius: 12 },
  replayCopy: { flex: 1, minWidth: 0 },
  replayTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 19 },
  replayMeta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 4, color: COLORS.muted, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  replayPlay: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  creatorShelf: { paddingHorizontal: 16, gap: 12 },
  creatorCard: { width: 140, minHeight: 184, borderRadius: 16, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, padding: 12, alignItems: 'center' },
  creatorAvatar: { width: 82, height: 82, borderRadius: 41, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: COLORS.surface2 },
  creatorAvatarLive: { borderColor: COLORS.coral, borderWidth: 2 },
  creatorInitials: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 20 },
  creatorLivePill: { position: 'absolute', bottom: -1, height: 20, borderRadius: 10, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.coral },
  creatorLiveText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 9, lineHeight: 11 },
  creatorName: { marginTop: 11, color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17, textAlign: 'center' },
  creatorHandle: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 4, color: COLORS.muted, fontSize: 12, lineHeight: 15, fontWeight: '600', textAlign: 'center' },
  followButton: { marginTop: 10, minHeight: 44, alignSelf: 'stretch', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(31,31,46,0.48)' },
  followButtonOn: { borderColor: COLORS.orange, backgroundColor: 'rgba(255,90,0,0.14)' },
  followText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  followTextOn: { color: COLORS.orange },
  emptyInline: {
    marginHorizontal: 16,
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 19, textAlign: 'center' },
  emptyBody: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 6, color: COLORS.muted, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
  emptyAction: { marginTop: 12, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: COLORS.orange },
  emptyActionText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 13 },
});
