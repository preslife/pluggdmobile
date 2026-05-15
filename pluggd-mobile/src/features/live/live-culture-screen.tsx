import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
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
import {
  contentInitials,
  formatCompact,
  formatDate,
  type EventItem,
  type FeedBundle,
  type ProfileItem,
} from '../../lib/mobileContent';
import {
  useBackstage,
  useEventLayer,
  useHomeFeed,
  useLiveRooms,
  type BackstageCommunity,
  type LiveRoomItem,
} from '../culture/useCultureData';
import { loadReminderState, loadUnreadNotifications, setEventReminder, setScheduledSessionReminder, toggleProfileFollow } from '../culture/mobileServices';
import {
  cancelEventLocalReminder,
  cancelLiveSessionLocalReminder,
  scheduleEventLocalReminder,
  scheduleLiveSessionLocalReminder,
} from '../../lib/localNotifications';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262637',
  orange: '#FF5A00',
  coral: '#FF4757',
  white: '#FFFFFF',
  soft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

const FILTERS = ['Live Now', 'Upcoming', 'Replays', 'Community Rooms'] as const;
type LiveFilter = (typeof FILTERS)[number];

type HeroSource =
  | { kind: 'room'; room: LiveRoomItem; status: 'live' | 'upcoming' | 'replay' }
  | { kind: 'event'; event: EventItem; status: 'upcoming' };

type CreatorCard = {
  id: string;
  name: string;
  handle: string;
  route: string;
  imageUrl?: string | null;
  isLive?: boolean;
};

const IMAGE_GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#182B33', '#11131B', '#07070A'],
  ['#3A1512', '#16131A', '#07070A'],
  ['#231F47', '#11131B', '#07070A'],
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
  return room.title || room.description || 'Creator live session';
}

function roomHost(room: LiveRoomItem) {
  return room.creator_name || room.category || 'PLUGGD Live';
}

function roomStatus(room: LiveRoomItem): 'live' | 'upcoming' | 'replay' {
  if (room.status === 'live') return 'live';
  if (room.status === 'replay') return 'replay';
  return 'upcoming';
}

function isJoinableRoom(room: LiveRoomItem) {
  return room.source === 'session_room' || !room.source;
}

function openLiveRoom(router: ReturnType<typeof useRouter>, room: LiveRoomItem) {
  selectionHaptic();
  if (isJoinableRoom(room)) {
    router.push({ pathname: '/live/session', params: { roomId: room.id } } as any);
    return;
  }

  if (room.source === 'scheduled_session') {
    Alert.alert(
      'Scheduled session',
      'This item uses the scheduled-session reminder contract. Set a reminder here; the join room opens when a live room is created.',
    );
    return;
  }

  Alert.alert(
    'Live route unavailable',
    'This live item is visible from the backend, but it is not attached to a joinable session room yet.',
  );
}

function viewerLabel(room: LiveRoomItem) {
  const viewers = Number(room.viewer_count ?? 0);
  return viewers > 0 ? `${formatCompact(viewers)} tuned in` : room.status === 'live' ? 'Live now' : 'Scheduled';
}

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'PLUGGD Creator';
}

function profileHandle(profile: ProfileItem) {
  if (profile.username) return `@${profile.username}`;
  return profile.city || profile.user_type || 'Creator';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/profile/${profile.user_id}`;
  return '/search';
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
      handle: room.category || room.status || 'Live creator',
      route: room.creator_id ? `/creator/${room.creator_id}` : '/live',
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

  bundle?.releases.forEach((release) => {
    const name = release.artist?.trim();
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    creators.push({
      id: `release-${release.id}`,
      name,
      handle: release.genre || 'Release artist',
      route: `/release/${release.id}`,
      imageUrl: release.cover_art_url,
    });
  });

  return creators.slice(0, 12);
}

function pickHero(activeFilter: LiveFilter, rooms: LiveRoomItem[], events: EventItem[]): HeroSource | undefined {
  const live = rooms.filter((room) => room.status === 'live');
  const upcomingRooms = rooms.filter((room) => room.status !== 'live' && room.status !== 'replay');
  const replays = rooms.filter((room) => room.status === 'replay');

  if (activeFilter === 'Replays') {
    const replay = replays[0];
    if (replay) return { kind: 'room', room: replay, status: 'replay' };
  }

  if (activeFilter === 'Upcoming') {
    const upcoming = upcomingRooms[0];
    if (upcoming) return { kind: 'room', room: upcoming, status: 'upcoming' };
    const event = events[0];
    if (event) return { kind: 'event', event, status: 'upcoming' };
  }

  const liveRoom = live[0];
  if (liveRoom) return { kind: 'room', room: liveRoom, status: 'live' };

  const nextRoom = upcomingRooms[0] || replays[0];
  if (nextRoom) return { kind: 'room', room: nextRoom, status: roomStatus(nextRoom) };

  const event = events[0];
  if (event) return { kind: 'event', event, status: 'upcoming' };
  return undefined;
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

function LiveArtwork({
  uri,
  title,
  style,
}: {
  uri?: string | null;
  title: string;
  style?: object;
}) {
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
    <View style={[styles.header, { height: Math.max(insets.top + 72, 112), paddingTop: insets.top + 18 }]}>
      <Text style={styles.headerTitle}>LIVE</Text>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
          onPress={() => go('/notifications')}
          style={styles.headerIcon}
        >
          <MaterialIcons name="notifications-none" size={22} color={COLORS.soft} />
          {unreadCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => go('/wallet')} style={styles.headerIcon}>
          <MaterialIcons name="account-balance-wallet" size={22} color={COLORS.soft} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => go(user ? '/profile' : '/auth/login')} style={styles.avatarButton}>
          <Text style={styles.avatarInitials}>{contentInitials(label)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterPills({
  active,
  onChange,
}: {
  active: LiveFilter;
  onChange: (filter: LiveFilter) => void;
}) {
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

function FeaturedLiveHero({ source }: { source?: HeroSource }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 9000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 9000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  if (!source) {
    return (
      <View style={styles.heroEmpty}>
        <Text style={styles.emptyTitle}>No live culture is active yet.</Text>
        <Text style={styles.emptyBody}>Approved creator livestreams, event streams and replays will appear here.</Text>
      </View>
    );
  }

  const isRoom = source.kind === 'room';
  const isLive = source.status === 'live';
  const title = isRoom ? roomTitle(source.room) : source.event.title || 'Upcoming live event';
  const host = isRoom ? roomHost(source.room) : source.event.location || 'PLUGGD Event';
  const imageUrl = isRoom ? mediaImageForRoom(source.room) : source.event.cover_image_url;
  const metric = isRoom ? viewerLabel(source.room) : `${formatDate(source.event.starts_at)} · ${eventCountdown(source.event.starts_at)}`;
  const subtitle = isRoom ? source.room.description || source.room.category || 'Live creator moment' : source.event.description || 'Live culture connected to the event layer.';

  const join = () => {
    selectionHaptic();
    if (isRoom) {
      openLiveRoom(router, source.room);
      return;
    }
    router.push(`/events/${source.event.id}` as any);
  };

  return (
    <View style={styles.heroCard}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        <LiveArtwork uri={imageUrl} title={title} style={styles.heroImage} />
      </Animated.View>
      <LinearGradient colors={['rgba(8,8,12,0.04)', 'rgba(8,8,12,0.58)', 'rgba(8,8,12,0.96)']} locations={[0, 0.48, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,71,87,0.18)', 'rgba(255,90,0,0.08)', 'rgba(8,8,12,0)']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.heroContent}>
        <View style={[styles.liveBadge, isLive && styles.liveBadgeOn]}>
          <View style={[styles.liveDot, isLive && styles.liveDotOn]} />
          <Text style={styles.liveBadgeText}>{isLive ? 'LIVE' : source.status === 'replay' ? 'REPLAY' : 'UPCOMING'}</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.heroHost} numberOfLines={1}>{host}</Text>
        <Text style={styles.heroMetric} numberOfLines={1}>{metric}</Text>
        <Text style={styles.heroSubtitle} numberOfLines={2}>{subtitle}</Text>
        <View style={styles.heroActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Join ${title}`} onPress={join} style={styles.joinHero}>
            <Text style={styles.joinHeroText}>{isLive ? 'Join Live' : source.status === 'replay' ? 'Watch Replay' : 'View Live'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Enter Backstage" onPress={() => router.push('/backstage' as any)} style={styles.backstageHero}>
            <Text style={styles.backstageHeroText}>Enter Backstage</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LiveNowCard({ room }: { room: LiveRoomItem }) {
  const router = useRouter();
  const title = roomTitle(room);
  const host = roomHost(room);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Join ${title}`}
      onPress={() => {
        openLiveRoom(router, room);
      }}
      style={styles.liveNowCard}
    >
      <LiveArtwork uri={mediaImageForRoom(room)} title={title} style={styles.liveNowImage} />
      <LinearGradient colors={['rgba(8,8,12,0.08)', 'rgba(8,8,12,0.9)']} style={StyleSheet.absoluteFill} />
      <View style={styles.liveNowTopBadge}>
        <View style={styles.liveDotOn} />
        <Text style={styles.liveNowBadgeText}>LIVE</Text>
      </View>
      <View style={styles.liveNowCopy}>
        <Text style={styles.liveNowHost} numberOfLines={1}>{host}</Text>
        <Text style={styles.liveNowTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.liveNowMeta} numberOfLines={1}>{viewerLabel(room)}</Text>
        <View style={styles.liveNowButton}>
          <Text style={styles.liveNowButtonText}>Join Live</Text>
        </View>
      </View>
    </Pressable>
  );
}

function UpcomingCard({
  event,
  room,
  reminded,
  onToggleReminder,
}: {
  event?: EventItem;
  room?: LiveRoomItem;
  reminded: boolean;
  onToggleReminder: () => void;
}) {
  const router = useRouter();
  const id = room?.id || event?.id || 'upcoming';
  const title = room ? roomTitle(room) : event?.title || 'Upcoming live event';
  const host = room ? roomHost(room) : event?.location || 'PLUGGD Event';
  const imageUrl = room ? mediaImageForRoom(room) : event?.cover_image_url;
  const startsAt = room?.scheduled_for || event?.starts_at;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      onPress={() => {
        selectionHaptic();
        if (room) openLiveRoom(router, room);
        else if (event) router.push(`/events/${event.id}` as any);
      }}
      style={styles.upcomingCard}
    >
      <LiveArtwork uri={imageUrl} title={title} style={styles.upcomingImage} />
      <View style={styles.upcomingCopy}>
        <Text style={styles.upcomingTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.upcomingHost} numberOfLines={1}>{host}</Text>
        <View style={styles.countdownRow}>
          <MaterialIcons name="schedule" size={13} color={COLORS.muted} />
          <Text style={styles.countdownText}>{formatDate(startsAt, 'TBA')} · {eventCountdown(startsAt)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reminded ? `Remove reminder for ${title}` : `Set reminder for ${title}`}
          onPress={(eventPress) => {
            eventPress.stopPropagation();
            onToggleReminder();
          }}
          style={[styles.reminderButton, reminded && styles.reminderButtonOn]}
        >
          <Text style={[styles.reminderButtonText, reminded && styles.reminderButtonTextOn]}>{reminded ? 'Reminder Set' : 'Set Reminder'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function CommunityRoomCard({ community }: { community: BackstageCommunity }) {
  const router = useRouter();
  const members = Number(community.online_count ?? community.member_count ?? 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${community.title}`}
      onPress={() => {
        selectionHaptic();
        router.push(`/backstage/${community.id}` as any);
      }}
      style={styles.communityRoomCard}
    >
      <Text style={styles.communityTitle} numberOfLines={1}>{community.title}</Text>
      <Text style={styles.communityMeta} numberOfLines={1}>{members > 0 ? `${formatCompact(members)} members` : 'Community room'} · {community.description || 'Topic'}</Text>
    </Pressable>
  );
}

function ReplayRow({ room }: { room: LiveRoomItem }) {
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayback();
  const title = roomTitle(room);
  const track = replayTrack(room);
  const active = Boolean(track && currentTrack?.id === track.id);

  const play = async () => {
    impactHaptic();
    if (!track) {
      openLiveRoom(router, room);
      return;
    }
    if (active) await togglePlayPause();
    else await playTrack(track);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open replay ${title}`}
      onPress={() => openLiveRoom(router, room)}
      style={styles.replayRow}
    >
      <View style={styles.replayThumbWrap}>
        <LiveArtwork uri={mediaImageForRoom(room)} title={title} style={styles.replayThumb} />
        <View style={styles.durationPill}><Text style={styles.durationText}>Replay</Text></View>
      </View>
      <View style={styles.replayCopy}>
        <Text style={styles.replayTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.replayHost} numberOfLines={1}>{roomHost(room)}</Text>
        <View style={styles.replayMetaRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={active && isPlaying ? `Pause ${title}` : `Play ${title}`} onPress={(event) => { event.stopPropagation(); void play(); }} style={styles.replayPlay}>
            <MaterialIcons name={active && isPlaying ? 'pause' : 'play-arrow'} size={18} color={COLORS.canvas} />
          </Pressable>
          <Text style={styles.replayViews}>{viewerLabel(room)}</Text>
        </View>
      </View>
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

function EmptyInline({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyInline}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function LiveCultureScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const roomsQuery = useLiveRooms();
  const eventsQuery = useEventLayer(12);
  const backstageQuery = useBackstage();
  const homeQuery = useHomeFeed();
  const remindersQuery = useQuery({ queryKey: ['culture', 'reminders'], queryFn: loadReminderState });
  const [activeFilter, setActiveFilter] = useState<LiveFilter>('Live Now');
  const [following, setFollowing] = useState<Set<string>>(() => new Set());

  const rooms = roomsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const communities = backstageQuery.data?.communities ?? [];
  const liveNow = rooms.filter((room) => room.status === 'live');
  const upcomingRooms = rooms.filter((room) => room.status !== 'live' && room.status !== 'replay');
  const replays = rooms.filter((room) => room.status === 'replay');
  const creators = useMemo(() => mapCreators(homeQuery.data, rooms), [homeQuery.data, rooms]);
  const hero = useMemo(() => pickHero(activeFilter, rooms, events), [activeFilter, events, rooms]);
  const loading = roomsQuery.isLoading || eventsQuery.isLoading || backstageQuery.isLoading || homeQuery.isLoading;
  const refreshing = roomsQuery.isRefetching || eventsQuery.isRefetching || backstageQuery.isRefetching || homeQuery.isRefetching || remindersQuery.isRefetching;
  const heroHeight = Math.min(520, Math.max(430, width * 1.08));
  const bottomPadding = Math.max(insets.bottom + 154, 176);

  const refresh = () => {
    void roomsQuery.refetch();
    void eventsQuery.refetch();
    void backstageQuery.refetch();
    void homeQuery.refetch();
    void remindersQuery.refetch();
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
      const notification = await scheduleEventLocalReminder({
        eventId: event.id,
        title: event.title,
        startsAt: event.starts_at,
      });
      if (!notification.success) {
        Alert.alert('Reminder saved', 'Your RSVP was saved in PLUGGD. Enable notifications in iOS Settings to receive a local alert.');
      }
    }
    void remindersQuery.refetch();
    void eventsQuery.refetch();
  };

  const unavailableLiveReminder = () => {
    impactHaptic();
    Alert.alert(
      'Live reminder unavailable',
      'This live room is not backed by the current scheduled-session reminder contract yet. Event reminders are available where an event is attached.',
    );
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

  const toggleRoomReminder = async (room: LiveRoomItem) => {
    impactHaptic();
    if (room.source !== 'scheduled_session' && room.source !== 'session_room') {
      unavailableLiveReminder();
      return;
    }
    const reminded = remindersQuery.data?.liveSessionIds.includes(room.id) ?? false;
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
      const notification = await scheduleLiveSessionLocalReminder({
        sessionId: room.id,
        title: roomTitle(room),
        startsAt: room.scheduled_for,
      });
      if (!notification.success) {
        Alert.alert('Reminder saved', 'Your live reminder was saved in PLUGGD. Enable notifications in iOS Settings to receive a local alert.');
      }
    }
    void remindersQuery.refetch();
  };

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
        {loading ? (
          <PremiumSkeleton compact label="Loading Live data..." style={styles.loadingBlock} />
        ) : null}

        <View style={[styles.heroWrap, { height: heroHeight }]}>
          <FeaturedLiveHero source={hero} />
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="LIVE NOW" action="VIEW ALL" onAction={() => setActiveFilter('Live Now')} />
          {liveNow.length === 0 ? (
            <EmptyInline title="No one is live right now." body="Approved creator broadcasts will appear here when they start." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveShelf}>
              {liveNow.map((room) => <LiveNowCard key={room.id} room={room} />)}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="UPCOMING LIVE EVENTS" />
          {upcomingRooms.length === 0 && events.length === 0 ? (
            <EmptyInline title="No upcoming live events yet." body="Scheduled sessions and event streams from Supabase will appear here." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingShelf}>
              {upcomingRooms.slice(0, 4).map((room) => (
                <UpcomingCard key={`room-${room.id}`} room={room} reminded={remindersQuery.data?.liveSessionIds.includes(room.id) ?? false} onToggleReminder={() => { void toggleRoomReminder(room); }} />
              ))}
              {events.slice(0, 8).map((event) => (
                <UpcomingCard key={`event-${event.id}`} event={event} reminded={['interested', 'going'].includes(remindersQuery.data?.eventStatuses[event.id] ?? 'none')} onToggleReminder={() => { void toggleEventReminder(event); }} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="COMMUNITY LIVE ROOMS" />
          {communities.length === 0 ? (
            <EmptyInline title="No community live rooms yet." body="Backstage communities will surface here when room data is available." />
          ) : (
            <View style={styles.communityGrid}>
              {communities.slice(0, 4).map((community) => <CommunityRoomCard key={community.id} community={community} />)}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="REPLAYS + CLIPS" />
          {replays.length === 0 ? (
            <EmptyInline title="No replays yet." body="Live replay URLs and clips will appear here when creators publish them." />
          ) : (
            <View style={styles.replayList}>
              {replays.slice(0, 5).map((room) => <ReplayRow key={room.id} room={room} />)}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="FEATURED LIVE CREATORS" />
          {creators.length === 0 ? (
            <EmptyInline title="No featured live creators yet." body="Creator profiles and active hosts will appear here when available." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorShelf}>
              {creators.map((creator) => (
                <CreatorCardView
                  key={creator.id}
                  creator={creator}
                  following={following.has(creator.id)}
                  onToggle={() => toggleFollow(creator.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(31,31,46,0.84)',
    backgroundColor: 'rgba(8,8,12,0.92)',
    zIndex: 3,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(18,18,26,0.72)',
  },
  notificationBadge: {
    position: 'absolute',
    right: 4,
    top: 4,
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
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  avatarInitials: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  scrollContent: {
    paddingTop: 14,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 8,
  },
  filterPill: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(31,31,46,0.72)',
  },
  filterPillActive: {
    borderColor: 'rgba(255,90,0,0.72)',
    backgroundColor: 'rgba(255,90,0,0.15)',
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
  },
  filterTextActive: {
    color: COLORS.orange,
  },
  loadingBlock: {
    marginHorizontal: 16,
    marginBottom: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  heroWrap: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  heroCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.coral,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  artworkBase: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
  fallbackInitials: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
  },
  heroContent: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(18,18,26,0.68)',
  },
  liveBadgeOn: {
    backgroundColor: COLORS.coral,
    borderColor: COLORS.coral,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dim,
  },
  liveDotOn: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  liveBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  heroTitle: {
    marginTop: 18,
    color: COLORS.white,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heroHost: {
    marginTop: 6,
    color: COLORS.soft,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroMetric: {
    marginTop: 16,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 12,
    color: COLORS.soft,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  heroActions: {
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  joinHero: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  joinHeroText: {
    color: COLORS.canvas,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  backstageHero: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(18,18,26,0.62)',
  },
  backstageHeroText: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  heroEmpty: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sectionBlock: {
    marginBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionAction: {
    color: COLORS.orange,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  liveShelf: {
    paddingHorizontal: 16,
    gap: 12,
  },
  liveNowCard: {
    width: 176,
    height: 268,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.28)',
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.coral,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  liveNowImage: {
    width: '100%',
    height: '100%',
  },
  liveNowTopBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    height: 26,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.coral,
  },
  liveNowBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  liveNowCopy: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  liveNowHost: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  liveNowTitle: {
    marginTop: 8,
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  liveNowMeta: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  liveNowButton: {
    marginTop: 12,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.coral,
  },
  liveNowButtonText: {
    color: COLORS.canvas,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  upcomingShelf: {
    paddingHorizontal: 16,
    gap: 12,
  },
  upcomingCard: {
    width: 220,
    height: 296,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  upcomingImage: {
    width: '100%',
    height: 140,
  },
  upcomingCopy: {
    flex: 1,
    padding: 12,
  },
  upcomingTitle: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  upcomingHost: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  countdownRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countdownText: {
    color: COLORS.soft,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  reminderButton: {
    marginTop: 'auto',
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(31,31,46,0.7)',
  },
  reminderButtonOn: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255,90,0,0.16)',
  },
  reminderButtonText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  reminderButtonTextOn: {
    color: COLORS.orange,
  },
  communityGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  communityRoomCard: {
    width: '48%',
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 13,
    justifyContent: 'center',
  },
  communityTitle: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  communityMeta: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  replayList: {
    marginHorizontal: 16,
    gap: 10,
  },
  replayRow: {
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
  },
  replayThumbWrap: {
    width: 118,
    height: 92,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
  },
  replayThumb: {
    width: '100%',
    height: '100%',
  },
  durationPill: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    height: 22,
    borderRadius: 7,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,12,0.76)',
  },
  durationText: {
    color: COLORS.white,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  replayCopy: {
    flex: 1,
    minWidth: 0,
  },
  replayTitle: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  replayHost: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  replayMetaRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replayPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  replayViews: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  creatorShelf: {
    paddingHorizontal: 16,
    gap: 12,
  },
  creatorCard: {
    width: 132,
    minHeight: 190,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 12,
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: COLORS.surface2,
  },
  creatorAvatarLive: {
    borderColor: COLORS.coral,
    borderWidth: 2,
  },
  creatorInitials: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  creatorLivePill: {
    position: 'absolute',
    bottom: -1,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.coral,
  },
  creatorLiveText: {
    color: COLORS.white,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
  },
  creatorName: {
    marginTop: 12,
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  creatorHandle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  followButton: {
    marginTop: 12,
    height: 32,
    alignSelf: 'stretch',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(31,31,46,0.48)',
  },
  followButtonOn: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255,90,0,0.14)',
  },
  followText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  followTextOn: {
    color: COLORS.orange,
  },
  emptyInline: {
    marginHorizontal: 16,
    minHeight: 104,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
});
