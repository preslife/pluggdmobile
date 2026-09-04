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
  Image,
  type ImageSourcePropType,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useReducedMotion } from '../../design/useReducedMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback, type PluggdTrack } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts, pluggdTextStyles } from '../../design/typography';
import { edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { supabase } from '../../lib/supabase';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';
import {
  contentInitials,
  formatCompact,
  formatDate,
  type EventItem,
  type FeedBundle,
  type ProfileItem,
} from '../../lib/mobileContent';
import { isPublicProfileName } from '../../lib/publicAudienceFilters';
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
import { DiscoveryReturnBar } from '../discovery/DiscoveryReturnBar';
import { loadPluggdTvFeed, type PluggdTvVideo } from '../video/pluggdTvService';
import { loadBattleSummaries, type BattleSummary } from './battleService';

const COLORS = {
  canvas: '#0a0806',
  shell: '#100c08',
  surface: '#171310',
  surface2: '#241d15',
  border: '#262626',
  orange: '#ff6600',
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
  canFollow: boolean;
};

type ScheduleItem =
  | { kind: 'room'; key: string; startsAt: string; room: LiveRoomItem }
  | { kind: 'event'; key: string; startsAt: string; event: EventItem };

const IMAGE_GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#152B33', '#11131B', '#07070A'],
  ['#391413', '#16131A', '#07070A'],
  ['#2b1c10', '#11131B', '#07070A'],
  ['#11312B', '#171310', '#07070A'],
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
  if (room.source !== 'session_room' && room.source !== 'scheduled_session') return false;
  if (!room.scheduled_for) return true;
  const scheduledAt = new Date(room.scheduled_for).getTime();
  return Number.isFinite(scheduledAt) && scheduledAt > Date.now();
}

function isCommunityRoom(room: LiveRoomItem) {
  if (room.discovery_category) return room.discovery_category === 'community_room';
  return room.source === 'community_room' || roomSearchText(room).includes('community') || roomSearchText(room).includes('audio_room');
}

function isListeningParty(room: LiveRoomItem) {
  if (room.discovery_category) return room.discovery_category === 'listening_party';
  const text = roomSearchText(room);
  return text.includes('listening') || text.includes('party') || text.includes('album playback') || text.includes('premiere');
}

function isStudioSession(room: LiveRoomItem) {
  if (room.discovery_category) return room.discovery_category === 'studio_cook_up';
  const text = roomSearchText(room);
  return text.includes('studio') || text.includes('cook') || text.includes('producer') || text.includes('feedback') || text.includes('breakdown');
}

function isEventLinkedRoom(room: LiveRoomItem) {
  return room.discovery_category === 'event_linked' && Boolean(room.linked_event_id);
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
  if (diffMs <= -6 * 60 * 60 * 1000) return 'Ended';
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
  return profile.display_name?.trim() || profile.full_name?.trim() || profile.username?.trim() || null;
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

function isFollowableCreatorId(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value));
}

function mapCreators(bundle?: FeedBundle, rooms: LiveRoomItem[] = []): CreatorCard[] {
  const creators: CreatorCard[] = [];
  const seen = new Set<string>();

  rooms.forEach((room) => {
    const name = room.creator_name?.trim();
    if (!name || !isPublicProfileName(name) || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    const creatorId = room.creator_id?.trim();
    creators.push({
      id: isFollowableCreatorId(creatorId) ? creatorId! : `live-${room.id}`,
      name,
      handle: humanizeLabel(room.category) || 'Live creator',
      route: creatorRoute(room),
      imageUrl: room.creator_avatar_url || room.thumbnail_url,
      isLive: room.status === 'live',
      canFollow: isFollowableCreatorId(creatorId),
    });
  });

  bundle?.profiles.forEach((profile) => {
    const name = profileName(profile);
    if (!name || !isPublicProfileName(name) || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    creators.push({
      id: profile.user_id || profile.id || profile.username || name,
      name,
      handle: profileHandle(profile),
      route: profileRoute(profile),
      imageUrl: profile.avatar_url,
      canFollow: isFollowableCreatorId(profile.user_id || profile.id),
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

function LiveArtwork({
  uri,
  title,
  fallbackSource,
  style,
}: {
  uri?: string | null;
  title: string;
  fallbackSource?: ImageSourcePropType;
  style?: object;
}) {
  const styles = useLiveCultureStyles();
  const colors = IMAGE_GRADIENTS[hashIndex(title, IMAGE_GRADIENTS.length)];
  return (
    <LinearGradient colors={colors as any} style={[styles.artworkBase, style]}>
      {uri ? <PluggdImage uri={uri} style={styles.imageFill} resizeMode="cover" /> : null}
      {!uri && fallbackSource ? <Image source={fallbackSource} style={styles.imageFill} resizeMode="cover" /> : null}
      {!uri && !fallbackSource ? <Text style={styles.fallbackInitials}>{contentInitials(title)}</Text> : null}
    </LinearGradient>
  );
}

function LiveHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  const styles = useLiveCultureStyles();
  const label = user?.email || 'PLUGGD';
  const unreadNotifications = useQuery({
    queryKey: ['culture', 'notifications', 'unread'],
    queryFn: loadUnreadNotifications,
    enabled: !!user?.id,
    staleTime: 1000 * 45,
  });
  const unreadCount = unreadNotifications.data ?? 0;
  const compact = width < 360;

  const go = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };

  return (
    <View
      style={[
        styles.header,
        compact && styles.headerCompact,
        {
          height: Math.max(insets.top + 62, 96),
          paddingTop: insets.top + 12,
          backgroundColor: theme.colors.headerGlass,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      <Text style={[styles.headerTitle, compact && styles.headerTitleCompact, { color: theme.colors.text }]}>LIVE</Text>
      <View style={[styles.headerActions, compact && styles.headerActionsCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go Live"
          onPress={() => go(user ? '/live/create' : '/auth/login')}
          style={[styles.goLiveButton, compact && styles.goLiveButtonCompact]}
        >
          <MaterialIcons name="sensors" size={17} color={theme.colors.onAccent} />
          <Text style={styles.goLiveLabel}>GO LIVE</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Search PLUGGD" onPress={() => go('/search')} style={[styles.headerIcon, compact && styles.headerIconCompact]}>
          <MaterialIcons name="search" size={22} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
          onPress={() => go('/notifications')}
          style={[styles.headerIcon, compact && styles.headerIconCompact]}
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
          style={[styles.avatarButton, compact && styles.avatarButtonCompact]}
        >
          <Text style={[styles.avatarInitials, { color: theme.colors.text }]}>{contentInitials(label)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterPills({ active, onChange }: { active: LiveFilter; onChange: (filter: LiveFilter) => void }) {
  const styles = useLiveCultureStyles();
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
  const styles = useLiveCultureStyles();
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
  const theme = usePluggdTheme();
  const styles = useLiveCultureStyles();
  return (
    <View style={styles.emptyInline}>
      <View style={styles.emptyInlineIcon}>
        <MaterialIcons name="graphic-eq" size={20} color={theme.colors.accentText} />
      </View>
      <View style={styles.emptyInlineCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
      </View>
      {primary && onPrimary ? (
        <Pressable accessibilityRole="button" onPress={onPrimary} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{primary}</Text>
          <MaterialIcons name="arrow-forward" size={17} color={theme.colors.onAccent} />
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
  currentUserId,
  onRemoveRoom,
}: {
  source?: FocusSource;
  onJoinRoom: (room: LiveRoomItem) => void;
  onToggleRoomReminder: (room: LiveRoomItem) => void;
  onToggleEventReminder: (event: EventItem) => void;
  onPlayReplay: (room: LiveRoomItem) => void;
  isRoomReminded: (room: LiveRoomItem) => boolean;
  isEventReminded: (event: EventItem) => boolean;
  currentUserId?: string | null;
  onRemoveRoom: (room: LiveRoomItem) => void;
}) {
  const router = useRouter();
  const styles = useLiveCultureStyles();
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 9000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 9000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, scale]);

  if (!source) {
    return (
      <View style={styles.focusEmpty}>
        <Image source={WEB_PARITY_ASSETS.liveHero} style={styles.imageFill} resizeMode="cover" />
        <LinearGradient colors={['rgba(10,8,6,0.28)', 'rgba(10,8,6,0.94)']} style={StyleSheet.absoluteFill} />
        <View style={styles.focusEmptyCopy}>
          <Text style={styles.focusEmptyEyebrow}>LIVE STATUS</Text>
          <Text style={styles.focusEmptyTitle}>Nothing live or scheduled yet</Text>
          <Text style={styles.focusEmptyBody}>When a creator schedules a real session, it will appear here first.</Text>
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
  const ownedRoom = isRoom && Boolean(currentUserId) && source.room.creator_id === currentUserId;

  const primaryLabel = ownedRoom
    ? isLive ? 'Return as host' : 'Open Green Room'
    : isLive && isRoom && isJoinableRoom(source.room)
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
    if (ownedRoom && isRoom) {
      onJoinRoom(source.room);
      return;
    }
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
        <LiveArtwork uri={imageUrl} title={title} fallbackSource={WEB_PARITY_ASSETS.liveHero} style={styles.focusImage} />
      </Animated.View>
      <LinearGradient colors={['rgba(10,8,6,0.04)', 'rgba(10,8,6,0.52)', 'rgba(10,8,6,0.96)']} locations={[0, 0.52, 1]} style={StyleSheet.absoluteFill} />
      {isLive ? <LinearGradient colors={['rgba(255,71,87,0.22)', 'rgba(10,8,6,0)']} style={StyleSheet.absoluteFill} /> : null}
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
          {ownedRoom && isRoom ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${title}`} onPress={() => onRemoveRoom(source.room)} style={styles.focusDanger}>
              <MaterialIcons name="delete-outline" size={17} color="#FFFFFF" />
              <Text style={styles.focusDangerText}>Delete</Text>
            </Pressable>
          ) : canOpenBackstage ? (
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

function categorySourceTitle(source?: FocusSource) {
  if (!source) return null;
  return source.kind === 'room' ? roomTitle(source.room) : eventTitle(source.event);
}

function categorySourceImage(source?: FocusSource) {
  if (!source) return null;
  return source.kind === 'room' ? mediaImageForRoom(source.room) : source.event.cover_image_url;
}

function categorySourceStatus(source?: FocusSource) {
  if (!source) return null;
  if (source.state === 'live') return 'Live now';
  const startsAt = source.kind === 'room' ? source.room.scheduled_for : source.event.starts_at;
  return startsAt ? formatDate(startsAt, 'Upcoming') : 'Upcoming';
}

function CategoryTile({
  title,
  source,
  fallbackSource,
  emptyKicker,
  emptyCopy,
  onOpen,
  size,
}: {
  title: string;
  source?: FocusSource;
  fallbackSource: ImageSourcePropType;
  emptyKicker: string;
  emptyCopy: string;
  onOpen: (source: FocusSource) => void;
  size: number;
}) {
  const styles = useLiveCultureStyles();
  const itemTitle = categorySourceTitle(source);
  const content = (
    <>
      <LiveArtwork uri={categorySourceImage(source)} title={itemTitle || title} fallbackSource={fallbackSource} style={styles.categoryImage} />
      <LinearGradient colors={['rgba(10,8,6,0.02)', 'rgba(10,8,6,0.92)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.categoryCopy}>
        <Text style={styles.categoryStatus}>{categorySourceStatus(source) || emptyKicker}</Text>
        <Text style={styles.categoryTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.categoryItemTitle} numberOfLines={2}>{itemTitle || emptyCopy}</Text>
      </View>
    </>
  );

  if (!source) {
    return (
      <View
        accessible
        accessibilityLabel={`${title}. ${emptyCopy}`}
        style={[styles.categoryTile, { width: size, height: size }]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}: ${itemTitle}`}
      onPress={() => {
        selectionHaptic();
        onOpen(source);
      }}
      style={({ pressed }) => [styles.categoryTile, { width: size, height: size }, pressed && styles.categoryTilePressed]}
    >
      {content}
    </Pressable>
  );
}

function scheduleTimestamp(item: ScheduleItem) {
  return new Date(item.startsAt).getTime();
}

function scheduleTime(startsAt: string) {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return 'Time TBA';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function isSameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function ScheduleRow({
  item,
  reminded,
  onOpen,
  onReminder,
}: {
  item: ScheduleItem;
  reminded: boolean;
  onOpen: (item: ScheduleItem) => void;
  onReminder: (item: ScheduleItem) => void;
}) {
  const styles = useLiveCultureStyles();
  const isRoom = item.kind === 'room';
  const title = isRoom ? roomTitle(item.room) : eventTitle(item.event);
  const host = isRoom ? roomHost(item.room) : eventHost(item.event);
  const imageUrl = isRoom ? mediaImageForRoom(item.room) : item.event.cover_image_url;
  const canRemind = isRoom ? canRemindRoom(item.room) : canRemindEvent(item.event);

  return (
    <View style={styles.scheduleRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${title}`}
        onPress={() => {
          selectionHaptic();
          onOpen(item);
        }}
        style={styles.scheduleOpen}
      >
        <LiveArtwork
          uri={imageUrl}
          title={title}
          fallbackSource={isRoom ? WEB_PARITY_ASSETS.liveHero : WEB_PARITY_ASSETS.eventsHero}
          style={styles.scheduleThumb}
        />
        <View style={styles.scheduleCopy}>
          <Text style={styles.scheduleTime}>{scheduleTime(item.startsAt)}</Text>
          <Text style={styles.scheduleTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.scheduleHost} numberOfLines={1}>{host}</Text>
        </View>
      </Pressable>
      {canRemind ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reminded ? `Remove reminder for ${title}` : `Notify me about ${title}`}
          accessibilityState={{ selected: reminded }}
          onPress={() => onReminder(item)}
          style={[styles.notifyButton, reminded && styles.notifyButtonOn]}
        >
          <Text style={[styles.notifyButtonText, reminded && styles.notifyButtonTextOn]}>{reminded ? 'Set' : 'Notify'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LiveNowCard({ room, onJoin, currentUserId }: { room: LiveRoomItem; onJoin: (room: LiveRoomItem) => void; currentUserId?: string | null }) {
  const styles = useLiveCultureStyles();
  const title = roomTitle(room);
  const host = roomHost(room);
  const viewers = viewerLabel(room);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={room.creator_id === currentUserId ? `Return to ${title} as host` : `Join ${title}`} onPress={() => onJoin(room)} style={styles.liveNowCard}>
      <LiveArtwork uri={mediaImageForRoom(room)} title={title} style={styles.liveNowImage} />
      <LinearGradient colors={['rgba(10,8,6,0.08)', 'rgba(10,8,6,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.liveBadgeSmall}>
        <View style={styles.liveDotSmall} />
        <Text style={styles.liveBadgeSmallText}>LIVE</Text>
      </View>
      <View style={styles.liveNowCopy}>
        <Text style={styles.liveNowHost} numberOfLines={1}>{host}</Text>
        <Text style={styles.liveNowTitle} numberOfLines={2}>{title}</Text>
        {viewers ? <Text style={styles.liveNowMeta} numberOfLines={1}>{viewers}</Text> : null}
        <View style={styles.liveNowButton}>
          <Text style={styles.liveNowButtonText}>{room.creator_id === currentUserId ? 'Return as host' : 'Join'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function PluggdTvEntry({ video, onPress }: { video?: PluggdTvVideo; onPress: () => void }) {
  const styles = useLiveCultureStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open PLUGGD TV" onPress={onPress} style={styles.tvEntry}>
      <LiveArtwork uri={video?.thumbnailUrl} title={video?.title || 'PLUGGD TV'} fallbackSource={WEB_PARITY_ASSETS.phoneStage} style={styles.tvEntryImage} />
      <LinearGradient colors={['rgba(10,8,6,0.08)', 'rgba(10,8,6,0.94)']} style={StyleSheet.absoluteFill} />
      <View style={styles.tvEntryCopy}>
        <View style={styles.tvEntryLabel}><MaterialIcons name="live-tv" size={16} color={COLORS.white} /><Text style={styles.tvEntryLabelText}>PLUGGD TV</Text></View>
        <Text style={styles.tvEntryTitle} numberOfLines={2}>{video?.title || 'The scene, in motion.'}</Text>
        <Text style={styles.tvEntryBody} numberOfLines={2}>{video ? `${video.creatorName} · Watch the latest published visual.` : 'Creator videos, sessions and selected visuals from across PLUGGD.'}</Text>
        <View style={styles.tvEntryButton}><Text style={styles.tvEntryButtonText}>Open PLUGGD TV</Text><MaterialIcons name="arrow-forward" size={18} color={COLORS.white} /></View>
      </View>
    </Pressable>
  );
}

function BattleArenaEntry({ battle, onPress }: { battle?: BattleSummary; onPress: () => void }) {
  const styles = useLiveCultureStyles();
  const theme = usePluggdTheme();
  const active = battle?.status === 'live';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open Battle Arena" onPress={onPress} style={({ pressed }) => [styles.battleEntry, pressed && styles.categoryTilePressed]}>
      <LinearGradient colors={theme.scheme === 'dark' ? ['#351306', '#160D08', '#090706'] : ['#FFD8B8', '#F4E7D2', '#FFFCF7']} style={StyleSheet.absoluteFill} />
      <View style={styles.battleEntryGlow} />
      <View style={styles.battleEntryCopy}>
        <View style={styles.battleEntryTopRow}>
          <View style={[styles.battleEntryLabel, active && styles.battleEntryLabelLive]}>
            <MaterialIcons name="emoji-events" size={16} color={active ? COLORS.white : theme.colors.accentText} />
            <Text style={[styles.battleEntryLabelText, { color: active ? COLORS.white : theme.colors.accentText }]}>{active ? 'LIVE BATTLE' : 'BATTLE ARENA'}</Text>
          </View>
          <View style={styles.battleEntryMark}><MaterialIcons name="bolt" size={31} color={theme.colors.accentText} /></View>
        </View>
        <Text style={[styles.battleEntryTitle, { color: theme.colors.text }]} numberOfLines={2}>{battle?.title || 'Enter the tournament.'}</Text>
        <Text style={[styles.battleEntryBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>{battle ? `${battle.entryCount} entries · ${battle.status === 'finished' ? 'Results ready' : battle.status === 'live' ? 'Hear the matchups and vote now.' : 'Submit a track before the bracket begins.'}` : 'Producer battles, tournament brackets, live voting and results.'}</Text>
        <View style={[styles.battleEntryButton, { borderColor: theme.colors.accent }]}><Text style={[styles.battleEntryButtonText, { color: theme.colors.text }]}>Open Battle Arena</Text><MaterialIcons name="arrow-forward" size={18} color={theme.colors.accentText} /></View>
      </View>
    </Pressable>
  );
}

function LiveSwipeEntry({ onPress, rooms }: { onPress: () => void; rooms: LiveRoomItem[] }) {
  const styles = useLiveCultureStyles();
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
  const theme = usePluggdTheme();
  const styles = useLiveCultureStyles();
  const title = roomTitle(room);
  const canRemind = canRemindRoom(room);
  return (
    <View style={styles.upcomingCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onOpen} style={styles.upcomingDetailsButton}>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{roomHost(room)}</Text>
        <View style={styles.countdownRow}>
          <MaterialIcons name="schedule" size={13} color={theme.colors.textMuted} />
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
  const theme = usePluggdTheme();
  const styles = useLiveCultureStyles();
  const activeUsers = Number(room.viewer_count ?? 0);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Join room ${roomTitle(room)}`} onPress={() => onOpen(room)} style={styles.roomRow}>
      <View style={styles.roomIcon}>
        <MaterialIcons name="settings-input-antenna" size={20} color={theme.colors.accentText} />
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
  const styles = useLiveCultureStyles();
  const isLive = isRealLiveRoom(room);
  return (
    <View style={styles.wideCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${roomTitle(room)}`} onPress={() => onJoin(room)} style={StyleSheet.absoluteFill}>
        <LiveArtwork uri={mediaImageForRoom(room)} title={roomTitle(room)} style={styles.wideImage} />
        <LinearGradient colors={['rgba(10,8,6,0.04)', 'rgba(10,8,6,0.86)']} style={StyleSheet.absoluteFill} />
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
  const styles = useLiveCultureStyles();
  return (
    <View style={styles.wideCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open event hub for ${eventTitle(event)}`} onPress={() => router.push(`/events/${event.id}` as any)} style={StyleSheet.absoluteFill}>
        <LiveArtwork uri={event.cover_image_url} title={eventTitle(event)} style={styles.wideImage} />
        <LinearGradient colors={['rgba(10,8,6,0.05)', 'rgba(10,8,6,0.88)']} style={StyleSheet.absoluteFill} />
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
  const theme = usePluggdTheme();
  const styles = useLiveCultureStyles();
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
        <MaterialIcons name={active && isPlaying ? 'pause' : 'play-arrow'} size={18} color={theme.colors.onAccent} />
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
  const styles = useLiveCultureStyles();
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
        accessibilityLabel={creator.canFollow ? (following ? `Unfollow ${creator.name}` : `Follow ${creator.name}`) : `Open ${creator.name} profile`}
        onPress={() => {
          impactHaptic();
          if (creator.canFollow) onToggle();
          else router.push(creator.route as any);
        }}
        style={[styles.followButton, following && styles.followButtonOn]}
      >
        <Text style={[styles.followText, following && styles.followTextOn]}>{creator.canFollow ? (following ? 'Following' : 'Follow') : 'View profile'}</Text>
      </Pressable>
    </View>
  );
}

export function LiveCultureScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  const styles = useLiveCultureStyles();
  const roomsQuery = useLiveRooms();
  const eventsQuery = useEventLayer(16);
  const backstageQuery = useBackstage();
  const homeQuery = useHomeFeed();
  const tvQuery = useQuery({ queryKey: ['pluggd-tv', 'live-entry'], queryFn: () => loadPluggdTvFeed(1), staleTime: 60_000 });
  const battlesQuery = useQuery({ queryKey: ['live', 'battles'], queryFn: loadBattleSummaries, staleTime: 20_000 });
  const playback = usePlayback();
  const remindersQuery = useQuery({ queryKey: ['culture', 'reminders'], queryFn: loadReminderState });
  const [following, setFollowing] = useState<Set<string>>(() => new Set());
  const categoryTileSize = Math.max(148, Math.floor((width - 42) / 2));

  const rooms = roomsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const liveNow = useMemo(() => rooms.filter(isRealLiveRoom), [rooms]);
  const upcomingRooms = useMemo(() => rooms.filter(isUpcomingRoom), [rooms]);
  const communityRooms = useMemo(() => rooms.filter((room) => (isRealLiveRoom(room) || isUpcomingRoom(room)) && isCommunityRoom(room)), [rooms]);
  const listeningParties = useMemo(() => rooms.filter((room) => (isRealLiveRoom(room) || isUpcomingRoom(room)) && isListeningParty(room)), [rooms]);
  const studioSessions = useMemo(() => rooms.filter((room) => (isRealLiveRoom(room) || isUpcomingRoom(room)) && isStudioSession(room)), [rooms]);
  const eventLinkedRooms = useMemo(() => rooms.filter((room) => (isRealLiveRoom(room) || isUpcomingRoom(room)) && isEventLinkedRoom(room)), [rooms]);
  const replays = useMemo(() => rooms.filter(isReplayRoom), [rooms]);
  const eventLinked = useMemo(() => events.filter(isEventLinkedLive), [events]);
  const creators = useMemo(() => mapCreators(homeQuery.data, rooms), [homeQuery.data, rooms]);
  const focus = useMemo(
    () => {
      const live = liveNow[0];
      if (live) return { kind: 'room', room: live, state: 'live' } satisfies FocusSource;
      const upcoming = upcomingRooms[0];
      if (upcoming) return { kind: 'room', room: upcoming, state: 'upcoming' } satisfies FocusSource;
      const event = eventLinked
        .filter((item) => Number.isFinite(new Date(item.starts_at || '').getTime()) && new Date(item.starts_at || '').getTime() > Date.now())
        .sort((left, right) => new Date(left.starts_at || '').getTime() - new Date(right.starts_at || '').getTime())[0];
      return event ? ({ kind: 'event', event, state: 'upcoming' } satisfies FocusSource) : undefined;
    },
    [eventLinked, liveNow, upcomingRooms],
  );
  const categorySources = useMemo(() => ({
    community: communityRooms[0]
      ? ({ kind: 'room', room: communityRooms[0], state: isRealLiveRoom(communityRooms[0]) ? 'live' : 'upcoming' } satisfies FocusSource)
      : undefined,
    listening: listeningParties[0]
      ? ({ kind: 'room', room: listeningParties[0], state: isRealLiveRoom(listeningParties[0]) ? 'live' : 'upcoming' } satisfies FocusSource)
      : undefined,
    studio: studioSessions[0]
      ? ({ kind: 'room', room: studioSessions[0], state: isRealLiveRoom(studioSessions[0]) ? 'live' : 'upcoming' } satisfies FocusSource)
      : undefined,
    event: eventLinkedRooms[0]
      ? ({ kind: 'room', room: eventLinkedRooms[0], state: isRealLiveRoom(eventLinkedRooms[0]) ? 'live' : 'upcoming' } satisfies FocusSource)
      : eventLinked[0]
        ? ({ kind: 'event', event: eventLinked[0], state: 'upcoming' } satisfies FocusSource)
        : undefined,
  }), [communityRooms, eventLinked, eventLinkedRooms, listeningParties, studioSessions]);
  const featuredBattle = useMemo(() => {
    const battles = battlesQuery.data ?? [];
    return battles.find((battle) => battle.is_featured && battle.status !== 'finished')
      ?? battles.find((battle) => battle.status === 'live')
      ?? battles.find((battle) => battle.status === 'upcoming')
      ?? battles.find((battle) => battle.status === 'finished');
  }, [battlesQuery.data]);
  const schedule = useMemo(() => {
    const linkedEventIds = new Set(upcomingRooms.map((room) => room.linked_event_id).filter(Boolean));
    const roomItems: ScheduleItem[] = upcomingRooms
      .filter((room) => Boolean(room.scheduled_for))
      .map((room) => ({ kind: 'room', key: `room-${room.id}`, startsAt: room.scheduled_for as string, room }));
    const eventItems: ScheduleItem[] = eventLinked
      .filter((event) => Boolean(event.starts_at) && !linkedEventIds.has(event.id))
      .map((event) => ({ kind: 'event', key: `event-${event.id}`, startsAt: event.starts_at as string, event }));
    const now = Date.now();
    const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
    return [...roomItems, ...eventItems]
      .filter((item) => {
        const time = scheduleTimestamp(item);
        return Number.isFinite(time) && time >= now && time <= sevenDaysFromNow;
      })
      .sort((left, right) => scheduleTimestamp(left) - scheduleTimestamp(right));
  }, [eventLinked, upcomingRooms]);
  const tonight = useMemo(() => {
    const today = new Date();
    return schedule.filter((item) => isSameLocalDay(new Date(item.startsAt), today));
  }, [schedule]);
  const thisWeek = useMemo(() => {
    const today = new Date();
    return schedule.filter((item) => !isSameLocalDay(new Date(item.startsAt), today));
  }, [schedule]);
  const loading = roomsQuery.isLoading || eventsQuery.isLoading || backstageQuery.isLoading || homeQuery.isLoading;
  const refreshing = roomsQuery.isRefetching || eventsQuery.isRefetching || backstageQuery.isRefetching || homeQuery.isRefetching || remindersQuery.isRefetching;
  const focusHeight = focus ? Math.min(390, Math.max(300, width * 0.86)) : 168;
  const bottomPadding = useBottomChromeInset();

  const refresh = () => {
    void roomsQuery.refetch();
    void eventsQuery.refetch();
    void backstageQuery.refetch();
    void homeQuery.refetch();
    void tvQuery.refetch();
    void battlesQuery.refetch();
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
    Alert.alert('Room unavailable', 'This room cannot be opened right now. Try again in a moment.');
  };

  const removeOwnedRoom = (room: LiveRoomItem) => {
    if (!user?.id || room.creator_id !== user.id) return;
    Alert.alert(
      room.status === 'live' ? 'End and delete this live?' : 'Delete this live?',
      'It will disappear from Live. Ticket, gift, recording and moderation history will be retained safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { data, error } = await supabase.functions.invoke('manage-live-sessions', {
              body: { action: 'delete', payload: { room_id: room.id } },
            });
            if (error || (data as any)?.error) {
              Alert.alert('Live not deleted', 'Please check your connection and try again.');
              return;
            }
            await roomsQuery.refetch();
            Alert.alert('Live deleted', 'The live has been removed from public view.');
          },
        },
      ],
    );
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

  const openFocusSource = (source: FocusSource) => {
    if (source.kind === 'room') openRoom(source.room);
    else router.push(`/events/${source.event.id}` as any);
  };

  const openScheduleItem = (item: ScheduleItem) => {
    if (item.kind === 'room') openRoom(item.room);
    else router.push(`/events/${item.event.id}` as any);
  };

  const toggleScheduleReminder = (item: ScheduleItem) => {
    if (item.kind === 'room') void toggleRoomReminder(item.room);
    else void toggleEventReminder(item.event);
  };

  const isScheduleReminded = (item: ScheduleItem) => (
    item.kind === 'room' ? isRoomReminded(item.room) : isEventReminded(item.event)
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View pointerEvents="none" style={StyleSheet.absoluteFill} />
      <LiveHeader />
      <DiscoveryReturnBar />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentText} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      >
        {loading ? <PremiumSkeleton compact label="Loading real Live sessions..." style={styles.loadingBlock} /> : null}

        <View style={styles.featuredHeader}>
          <Text style={styles.featuredEyebrow}>FEATURED LIVE</Text>
          <View style={styles.featuredRule} />
        </View>
        <View style={[styles.focusWrap, { height: focusHeight }]}>
          <FocusCard
            source={focus}
            onJoinRoom={openRoom}
            onToggleRoomReminder={toggleRoomReminder}
            onToggleEventReminder={toggleEventReminder}
            onPlayReplay={(room) => { void playReplayRoom(room); }}
            isRoomReminded={isRoomReminded}
            isEventReminded={isEventReminded}
            currentUserId={user?.id}
            onRemoveRoom={removeOwnedRoom}
          />
        </View>

        <View style={styles.categoryGrid}>
          <View style={styles.categoryRow}>
            <CategoryTile size={categoryTileSize} title="Community Rooms" source={categorySources.community} fallbackSource={WEB_PARITY_ASSETS.intimateCrowdHero} emptyKicker="DROP IN TOGETHER" emptyCopy="Creator-led conversation and shared moments." onOpen={openFocusSource} />
            <CategoryTile size={categoryTileSize} title="Listening Parties" source={categorySources.listening} fallbackSource={WEB_PARITY_ASSETS.warmListeningRoom} emptyKicker="HEAR IT FIRST" emptyCopy="Collective first listens and release nights." onOpen={openFocusSource} />
          </View>
          <View style={styles.categoryRow}>
            <CategoryTile size={categoryTileSize} title="Studio / Cook-up" source={categorySources.studio} fallbackSource={WEB_PARITY_ASSETS.bedroomStudio} emptyKicker="BUILD IN PUBLIC" emptyCopy="Sessions, process and live making." onOpen={openFocusSource} />
            <CategoryTile size={categoryTileSize} title="Event-linked" source={categorySources.event} fallbackSource={WEB_PARITY_ASSETS.phoneStage} emptyKicker="FROM THE CROWD" emptyCopy="Live moments connected to real events." onOpen={openFocusSource} />
          </View>
        </View>

        <PluggdTvEntry video={tvQuery.data?.[0]} onPress={() => router.push('/pluggd-tv' as any)} />

        <BattleArenaEntry battle={featuredBattle} onPress={() => router.push('/live/battles' as any)} />

        {tonight.length > 0 ? (
          <View style={styles.scheduleSection}>
            <SectionHeader title="TONIGHT" />
            <View style={styles.scheduleList}>
              {tonight.map((item) => (
                <ScheduleRow key={item.key} item={item} reminded={isScheduleReminded(item)} onOpen={openScheduleItem} onReminder={toggleScheduleReminder} />
              ))}
            </View>
          </View>
        ) : null}

        {thisWeek.length > 0 ? (
          <View style={styles.scheduleSection}>
            <SectionHeader title="THIS WEEK" />
            <View style={styles.scheduleList}>
              {thisWeek.map((item) => (
                <ScheduleRow key={item.key} item={item} reminded={isScheduleReminded(item)} onOpen={openScheduleItem} onReminder={toggleScheduleReminder} />
              ))}
            </View>
          </View>
        ) : null}

        {liveNow.length > 1 ? (
          <View style={styles.sectionBlock}>
            <SectionHeader title="MORE LIVE NOW" action="Open Live Feed" onAction={() => router.push('/live/feed' as any)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveShelf}>
              {liveNow.slice(1).map((room) => <LiveNowCard key={room.id} room={room} onJoin={openRoom} currentUserId={user?.id} />)}
            </ScrollView>
          </View>
        ) : null}

        {replays.length > 0 ? <View style={styles.sectionBlock}>
          <SectionHeader title="REPLAYS + CLIPS" />
          <View style={styles.replayList}>
            {replays.slice(0, 8).map((room) => <ReplayRow key={room.id} room={room} />)}
          </View>
        </View> : null}

        {creators.length > 0 ? <View style={styles.sectionBlock}>
          <SectionHeader title="FEATURED LIVE CREATORS" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorShelf}>
            {creators.map((creator) => (
              <CreatorCardView key={creator.id} creator={creator} following={following.has(creator.id)} onToggle={() => toggleFollow(creator.id)} />
            ))}
          </ScrollView>
        </View> : null}
      </ScrollView>
    </View>
  );
}

function useLiveCultureStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.headerGlass,
    borderBottomColor: theme.colors.divider,
    zIndex: 3,
  },
  headerCompact: { paddingHorizontal: 10 },
  headerTitle: {
    ...pluggdTextStyles.appTitle,
    fontSize: 32,
    lineHeight: 36,
  },
  headerTitleCompact: { fontSize: 27, lineHeight: 32 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActionsCompact: { gap: 3 },
  goLiveButton: { minWidth: 84, height: 44, borderRadius: 22, paddingHorizontal: 13, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  goLiveButtonCompact: { minWidth: 70, paddingHorizontal: 8, gap: 3 },
  goLiveLabel: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 0.7 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconCompact: { width: 44, height: 44, borderRadius: 22 },
  notificationBadge: {
    position: 'absolute',
    right: 5,
    top: 5,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: theme.colors.danger,
    borderWidth: 1,
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: { fontFamily: pluggdFonts.satoshiBlack, color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
  },
  avatarButtonCompact: { width: 44, height: 44, borderRadius: 22 },
  avatarInitials: { fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  scrollContent: { paddingTop: 14 },
  featuredHeader: { marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  featuredEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, lineHeight: 13, letterSpacing: 1.8 },
  featuredRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.controlBorder },
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
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textSecondary,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 31,
  },
  filterTextActive: {
    color: theme.colors.accentText,
    borderColor: theme.colors.accentFill,
    backgroundColor: theme.colors.accentSoft,
  },
  loadingBlock: {
    marginHorizontal: 16,
    marginBottom: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
  },
  focusWrap: { marginHorizontal: 16, marginBottom: 16 },
  focusCard: {
    flex: 1,
    borderRadius: 4,
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
  statusBadgeNeutral: { backgroundColor: 'rgba(23,19,16,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
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
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 16,
  },
  focusPrimaryLive: { backgroundColor: theme.colors.accentFill },
  focusPrimaryText: { color: theme.colors.onAccent, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17 },
  focusSecondary: {
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(23,19,16,0.62)',
    paddingHorizontal: 16,
  },
  focusSecondaryText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 16 },
  focusDanger: { minHeight: 44, borderRadius: 22, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(156,24,36,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  focusDangerText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, lineHeight: 16 },
  focusEmpty: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  focusEmptyCopy: { position: 'absolute', left: 16, right: 16, bottom: 15, alignItems: 'center' },
  focusEmptySignal: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,102,0,0.42)', backgroundColor: 'rgba(255,102,0,0.12)' },
  focusEmptyEyebrow: { marginBottom: 5, color: COLORS.orange, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, lineHeight: 12, letterSpacing: 1.8 },
  focusEmptyTitle: { color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 22, lineHeight: 26, textAlign: 'center' },
  focusEmptyBody: { maxWidth: 560, fontFamily: pluggdFonts.satoshiMedium, marginTop: 6, color: COLORS.soft, fontSize: 12.5, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  focusEmptyActions: { marginTop: 18, flexDirection: 'row', gap: 10 },
  focusEmptyPrimary: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  focusEmptyPrimaryText: { color: theme.colors.onAccent, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  focusEmptySecondary: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.surface2 },
  focusEmptySecondaryText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  sectionBlock: { marginBottom: 24 },
  categoryGrid: { marginHorizontal: 16, marginBottom: 26, gap: 10 },
  categoryRow: { flexDirection: 'row', gap: 10 },
  categoryTile: { flexGrow: 0, flexShrink: 0, borderRadius: 3, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: COLORS.surface },
  categoryTilePressed: { opacity: 0.78 },
  categoryImage: { width: '100%', height: '100%' },
  categoryCopy: { position: 'absolute', left: 11, right: 10, bottom: 10 },
  categoryStatus: { color: COLORS.orange, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, lineHeight: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  categoryTitle: { marginTop: 3, color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 19, lineHeight: 21 },
  categoryItemTitle: { marginTop: 4, color: COLORS.soft, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 13, fontWeight: '600' },
  tvEntry: { marginHorizontal: 16, marginBottom: 26, height: 224, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: COLORS.surface },
  tvEntryImage: { width: '100%', height: '100%' },
  tvEntryCopy: { position: 'absolute', left: 16, right: 16, bottom: 15 },
  tvEntryLabel: { alignSelf: 'flex-start', minHeight: 28, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(10,8,6,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  tvEntryLabelText: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.3 },
  tvEntryTitle: { marginTop: 10, color: COLORS.white, fontFamily: pluggdFonts.displayBold, fontSize: 26, lineHeight: 29 },
  tvEntryBody: { marginTop: 5, color: COLORS.soft, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  tvEntryButton: { alignSelf: 'flex-start', marginTop: 11, minHeight: 40, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(10,8,6,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  tvEntryButtonText: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  battleEntry: { marginHorizontal: 16, marginBottom: 18, minHeight: 238, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,102,0,0.34)', backgroundColor: COLORS.surface },
  battleEntryGlow: { position: 'absolute', right: -58, top: -76, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,102,0,0.13)' },
  battleEntryCopy: { flex: 1, padding: 18, justifyContent: 'flex-end' },
  battleEntryTopRow: { position: 'absolute', left: 18, right: 18, top: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  battleEntryLabel: { minHeight: 30, borderRadius: 15, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,102,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,102,0,0.36)' },
  battleEntryLabelLive: { backgroundColor: COLORS.coral, borderColor: COLORS.coral },
  battleEntryLabelText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.3 },
  battleEntryMark: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,102,0,0.38)', backgroundColor: 'rgba(255,102,0,0.10)' },
  battleEntryTitle: { marginTop: 72, fontFamily: pluggdFonts.displayBold, fontSize: 29, lineHeight: 32 },
  battleEntryBody: { marginTop: 6, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 17 },
  battleEntryButton: { alignSelf: 'flex-start', marginTop: 13, minHeight: 42, borderRadius: 21, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1 },
  battleEntryButtonText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  scheduleSection: { marginBottom: 25 },
  scheduleList: { marginHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  scheduleRow: { minHeight: 82, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  scheduleOpen: { flex: 1, minWidth: 0, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11 },
  scheduleThumb: { width: 62, height: 62, borderRadius: 2 },
  scheduleCopy: { flex: 1, minWidth: 0 },
  scheduleTime: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, lineHeight: 13, letterSpacing: 0.6 },
  scheduleTitle: { marginTop: 3, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 15, lineHeight: 18, fontWeight: '800' },
  scheduleHost: { marginTop: 3, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 14, fontWeight: '600' },
  notifyButton: { minWidth: 72, minHeight: 44, borderRadius: 22, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  notifyButtonOn: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  notifyButtonText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  notifyButtonTextOn: { color: theme.colors.onAccent },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  sectionTick: { width: 3, height: 16, borderRadius: 2, backgroundColor: theme.colors.accentFill },
  sectionTitle: { fontFamily: edFonts.serif, color: theme.colors.text, fontSize: 22, lineHeight: 26, letterSpacing: 0 },
  sectionActionButton: { minHeight: 44, justifyContent: 'center' },
  sectionAction: { fontFamily: 'Satoshi-Bold', color: theme.colors.accentText, fontSize: 12, lineHeight: 15 },
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
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeCopy: { flex: 1, paddingRight: 12 },
  swipeTitle: { color: theme.colors.text, fontFamily: 'Satoshi-Black', fontSize: 18, lineHeight: 22 },
  swipeBody: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 5, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  swipeStack: { width: 94, height: 64, position: 'relative' },
  swipeThumb: { position: 'absolute', top: 0, width: 54, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.controlBorder },
  swipeThumbImage: { width: '100%', height: '100%' },
  swipeCTA: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, backgroundColor: theme.colors.accentFill },
  swipeCTAText: { color: theme.colors.onAccent, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  upcomingShelf: { paddingHorizontal: 16, gap: 12 },
  upcomingCard: {
    width: 244,
    height: 156,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    padding: 13,
  },
  upcomingDetailsButton: { flex: 1 },
  cardTitle: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 20 },
  cardMeta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 5, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  countdownRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  countdownText: { fontFamily: pluggdFonts.satoshiBold, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  compactCTA: { marginTop: 'auto', minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.controlBorder },
  compactCTAOn: { borderColor: theme.colors.accentFill, backgroundColor: theme.colors.accentSoft },
  compactCTAText: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  compactCTATextOn: { color: theme.colors.accentText },
  roomList: { marginHorizontal: 16, gap: 10 },
  roomRow: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  roomIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.controlBorder },
  roomCopy: { flex: 1, minWidth: 0 },
  roomTitle: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 18 },
  roomMeta: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 5, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 15, fontWeight: '600' },
  roomLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.coral },
  roomCTA: { color: theme.colors.accentText, fontFamily: 'Satoshi-Bold', fontSize: 12 },
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
  miniTag: { alignSelf: 'flex-start', height: 23, borderRadius: 8, paddingHorizontal: 8, backgroundColor: 'rgba(23,19,16,0.78)', flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniTagLive: { backgroundColor: COLORS.coral },
  miniTagText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 10, lineHeight: 12 },
  wideTitle: { marginTop: 'auto', color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 19 },
  wideMeta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 4, color: COLORS.muted, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  wideCTA: { marginTop: 9, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  wideCTAText: { color: theme.colors.onAccent, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  wideSplitActions: { marginTop: 9, flexDirection: 'row', gap: 8 },
  wideSmallCTA: { flex: 1, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill, paddingHorizontal: 8 },
  wideSmallCTAOn: { backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.controlBorder },
  replayList: { marginHorizontal: 16, gap: 10 },
  replayRow: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  replayThumb: { width: 72, height: 72, borderRadius: 12 },
  replayCopy: { flex: 1, minWidth: 0 },
  replayTitle: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 19 },
  replayMeta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 15, fontWeight: '700' },
  replayPlay: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  creatorShelf: { paddingHorizontal: 16, gap: 12 },
  creatorCard: { width: 140, minHeight: 184, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 12, alignItems: 'center' },
  creatorAvatar: { width: 82, height: 82, borderRadius: 41, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceAlt },
  creatorAvatarLive: { borderColor: COLORS.coral, borderWidth: 2 },
  creatorInitials: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 16, lineHeight: 20 },
  creatorLivePill: { position: 'absolute', bottom: -1, height: 20, borderRadius: 10, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.coral },
  creatorLiveText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 9, lineHeight: 11 },
  creatorName: { marginTop: 11, color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17, textAlign: 'center' },
  creatorHandle: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 15, fontWeight: '600', textAlign: 'center' },
  followButton: { marginTop: 10, minHeight: 44, alignSelf: 'stretch', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceAlt },
  followButtonOn: { borderColor: theme.colors.accentFill, backgroundColor: theme.colors.accentSoft },
  followText: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  followTextOn: { color: theme.colors.accentText },
  emptyInline: {
    marginHorizontal: 16,
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    gap: 12,
  },
  emptyInlineIcon: { width: 44, height: 44, borderRadius: 13, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.controlBorder },
  emptyInlineCopy: { flex: 1, minWidth: 0 },
  emptyTitle: { color: theme.colors.text, fontFamily: 'Sora-Bold', fontSize: 15, lineHeight: 19 },
  emptyBody: { fontFamily: pluggdFonts.satoshiMedium, marginTop: 4, color: theme.colors.textSecondary, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  emptyAction: { minHeight: 44, borderRadius: 22, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 15, backgroundColor: theme.colors.accentFill },
  emptyActionText: { color: theme.colors.onAccent, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  }), [theme]);
}
