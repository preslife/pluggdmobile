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
import {
  contentInitials,
  formatCompact,
  formatDate,
  type BeatItem,
  type EventItem,
  type FeedBundle,
  type ProfileItem,
  type SocialPostItem,
} from '../../lib/mobileContent';
import {
  useBackstage,
  useEventLayer,
  useHomeFeed,
  useLiveRooms,
  type BackstageCommunity,
  type BackstageRoom,
  type BackstageThread,
  type LiveRoomItem,
} from '../culture/useCultureData';
import { loadUnreadNotifications } from '../culture/mobileServices';

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

const FILTERS = ['My Circles', 'Event Hubs', 'Rooms', 'Threads', 'Producers'] as const;
type BackstageFilter = (typeof FILTERS)[number];

type CommunityMoment = {
  id: string;
  title: string;
  imageUrl?: string | null;
  route: string;
};

type ProducerLoungeItem = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  replies?: number | null;
  route: string;
};

type CreatorIdentity = {
  id: string;
  name: string;
  label: string;
  imageUrl?: string | null;
  route: string;
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

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'PLUGGD Creator';
}

function profileLabel(profile: ProfileItem) {
  return profile.city || profile.user_type || profile.profile_type || 'Creator circle';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/profile/${profile.user_id}`;
  return '/search';
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

function routeForCommunity(community: BackstageCommunity) {
  return `/backstage/${community.slug || community.id}`;
}

function isLiveRoomItem(item: LiveRoomItem | BackstageRoom | BackstageCommunity): item is LiveRoomItem | BackstageRoom {
  return 'status' in item || 'scheduled_for' in item || 'viewer_count' in item;
}

function communityOnline(community: BackstageCommunity) {
  return Number(community.online_count ?? community.member_count ?? 0);
}

function hasTicketSignal(event: EventItem) {
  return Number(event.price_cents ?? 0) > 0;
}

function threadHasTicketSignal(thread: BackstageThread) {
  return /ticket|rsvp|going|entry|guestlist|guest list/i.test(`${thread.title} ${thread.body} ${thread.category}`);
}

function mapCreatorIdentities(bundle?: FeedBundle): CreatorIdentity[] {
  if (!bundle) return [];
  const creators: CreatorIdentity[] = [];
  const seen = new Set<string>();

  bundle.profiles.forEach((profile) => {
    const name = profileName(profile);
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    creators.push({
      id: profile.user_id || profile.id || profile.username || name,
      name,
      label: profileLabel(profile),
      imageUrl: profile.avatar_url,
      route: profileRoute(profile),
    });
  });

  bundle.releases.forEach((release) => {
    const name = release.artist?.trim();
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    creators.push({
      id: `release-${release.id}`,
      name,
      label: release.genre || 'Release circle',
      imageUrl: release.cover_art_url,
      route: `/release/${release.id}`,
    });
  });

  return creators.slice(0, 12);
}

function mapProducerLounge(posts?: SocialPostItem[], beats?: BeatItem[]): ProducerLoungeItem[] {
  const items: ProducerLoungeItem[] = [];

  posts
    ?.filter((post) => {
      const text = `${post.post_type ?? ''} ${post.title ?? ''} ${post.body ?? ''}`.toLowerCase();
      return text.includes('producer') || text.includes('feedback') || text.includes('verse') || text.includes('sample') || text.includes('collab') || text.includes('beat');
    })
    .slice(0, 4)
    .forEach((post) => {
      items.push({
        id: `post-${post.id}`,
        tag: post.post_type?.replace(/_/g, ' ') || 'Thread',
        title: post.title || post.body || 'Producer thread',
        subtitle: post.body || 'Community production discussion',
        replies: post.comments_count,
        route: '/backstage',
      });
    });

  beats?.slice(0, Math.max(0, 4 - items.length)).forEach((beat) => {
    items.push({
      id: `beat-${beat.id}`,
      tag: beat.genre || 'Beat feedback',
      title: beat.title || 'Producer drop',
      subtitle: beat.producer_name || beat.description || 'Producer lounge activity',
      route: `/beat/${beat.id}`,
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
      title: post.title || post.post_type?.replace(/_/g, ' ') || 'Backstage moment',
      imageUrl: image || post.video,
      route: '/backstage',
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
      title: soundboard.title || 'Creator moment',
      imageUrl: soundboard.cover_image_url,
      route: soundboard.slug ? `/soundboards/${soundboard.slug}` : `/soundboards/${soundboard.id}`,
    });
  });

  return moments.slice(0, 12);
}

function participants(creators: CreatorIdentity[], limit = 4) {
  return creators.slice(0, limit);
}

function BackstageArtwork({
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

function AvatarStack({ creators, size = 26 }: { creators: CreatorIdentity[]; size?: number }) {
  return (
    <View style={styles.avatarStack}>
      {creators.map((creator, index) => (
        <View
          key={creator.id}
          style={[
            styles.stackAvatar,
            { width: size, height: size, borderRadius: size / 2 },
            index > 0 && { marginLeft: -8 },
          ]}
        >
          {creator.imageUrl ? <PluggdImage uri={creator.imageUrl} style={styles.imageFill} /> : <Text style={styles.stackInitials}>{contentInitials(creator.name)}</Text>}
        </View>
      ))}
    </View>
  );
}

function BackstageHeader() {
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
      <Text style={styles.headerTitle}>BACKSTAGE</Text>
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
  active: BackstageFilter;
  onChange: (filter: BackstageFilter) => void;
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

function MyCircleCard({
  community,
  liveRoomActive,
  ticketThreadActive,
}: {
  community: BackstageCommunity;
  liveRoomActive: boolean;
  ticketThreadActive: boolean;
}) {
  const router = useRouter();
  const unread = Number(community.member_count ?? 0);
  const online = communityOnline(community);
  const meta =
    community.member_count != null || community.online_count != null
      ? `${formatCompact(unread)} members · ${formatCompact(online)} online`
      : community.hub_type?.replace(/_/g, ' ') || 'Backstage hub';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${community.title}`}
      onPress={() => {
        selectionHaptic();
        router.push(routeForCommunity(community) as any);
      }}
      style={styles.circleCard}
    >
      <BackstageArtwork uri={community.cover_image_url || community.avatar_url} title={community.title} style={styles.circleBanner} />
      <View style={styles.circleBody}>
        <Text style={styles.circleTitle} numberOfLines={2}>{community.title}</Text>
        <Text style={styles.circleMeta} numberOfLines={1}>{meta}</Text>
        {liveRoomActive ? (
          <View style={styles.liveStatusRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveStatusText}>Live room active</Text>
          </View>
        ) : ticketThreadActive ? (
          <View style={styles.ticketStatus}>
            <Text style={styles.ticketStatusText}>Ticket thread active</Text>
          </View>
        ) : null}
        <View style={styles.openCircleButton}>
          <Text style={styles.openCircleText}>Open</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EventHubCard({ event, creators, threads }: { event: EventItem; creators: CreatorIdentity[]; threads: BackstageThread[] }) {
  const router = useRouter();
  const eventThreads = threads.filter((thread) => thread.attached_event_id === event.id || /ticket|event|going|tonight/i.test(`${thread.title} ${thread.body} ${thread.category}`));
  const discussionCount = eventThreads.length;
  const ticketThreadActive = eventThreads.some(threadHasTicketSignal);
  const ticketed = hasTicketSignal(event);
  const going = Number(event.rsvp_count ?? 0);
  const cityDate = [event.location, formatDate(event.starts_at)].filter(Boolean).join(' · ');
  const people = participants(creators, 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open event hub ${event.title}`}
      onPress={() => {
        selectionHaptic();
        router.push(`/events/${event.id}` as any);
      }}
      style={styles.eventHubCard}
    >
      <View style={styles.eventStrip}>
        <BackstageArtwork uri={event.cover_image_url} title={event.title || 'Event hub'} style={styles.eventStripImage} />
        <LinearGradient colors={['rgba(8,8,12,0.02)', 'rgba(8,8,12,0.8)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.eventHubBody}>
        <Text style={styles.eventHubTitle} numberOfLines={2}>{event.title || 'Event hub'}</Text>
        <Text style={styles.eventHubMeta} numberOfLines={1}>{cityDate}</Text>
        <Text style={styles.eventCountdown}>{eventCountdown(event.starts_at)}</Text>
        <View style={styles.eventStatsRow}>
          <Text style={styles.eventStat}>{going > 0 ? `${formatCompact(going)} going` : 'RSVPs open'}</Text>
          <Text style={styles.eventStat}>{discussionCount > 0 ? `${formatCompact(discussionCount)} discussions` : 'Discussion hub'}</Text>
          {ticketThreadActive || ticketed ? (
            <View style={styles.ticketStatus}>
              <Text style={styles.ticketStatusText}>{ticketThreadActive ? 'Ticket thread active' : 'Tickets available'}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.goingRow}>
          <AvatarStack creators={people} />
          <Text style={styles.goingText}>{going > 0 ? `${formatCompact(going)} going` : 'Who’s going opens here'}</Text>
        </View>
        <View style={styles.eventActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Get tickets for ${event.title}`}
            onPress={(pressEvent) => {
              pressEvent.stopPropagation();
              impactHaptic();
              router.push(`/events/${event.id}` as any);
            }}
            style={styles.getTicketsButton}
          >
            <Text style={styles.getTicketsText}>{ticketed ? 'GET TICKETS' : 'VIEW EVENT'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open hub for ${event.title}`}
            onPress={(pressEvent) => {
              pressEvent.stopPropagation();
              selectionHaptic();
              router.push('/backstage' as any);
            }}
            style={styles.openHubButton}
          >
            <Text style={styles.openHubText}>OPEN HUB</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function RoomCard({ room, creators }: { room: LiveRoomItem | BackstageRoom | BackstageCommunity; creators: CreatorIdentity[] }) {
  const router = useRouter();
  const isLiveRoom = isLiveRoomItem(room);
  const id = room.id;
  const title = isLiveRoom ? room.title || room.description || 'Community room' : room.title;
  const communityName = isLiveRoom ? ('category' in room ? room.category : 'room_type' in room ? room.room_type : null) || 'Backstage room' : room.creator_name || room.description || 'Community room';
  const count = isLiveRoom ? Number(('viewer_count' in room ? room.viewer_count : 'active_users' in room ? room.active_users : 0) ?? 0) : communityOnline(room);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Join ${title}`}
      onPress={() => {
        selectionHaptic();
        if (isLiveRoom && 'backstage_id' in room && room.backstage_id) router.push(`/backstage/${room.backstage_id}` as any);
        else if (isLiveRoom) router.push({ pathname: '/live/session', params: { roomId: id } } as any);
        else router.push(routeForCommunity(room) as any);
      }}
      style={styles.roomCard}
    >
      <View style={styles.roomTopRow}>
        <Text style={styles.roomTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.liveDot} />
      </View>
      <Text style={styles.roomCommunity} numberOfLines={1}>{communityName}</Text>
      <View style={styles.roomMetaRow}>
        <AvatarStack creators={participants(creators, 4)} size={24} />
        <Text style={styles.roomUsers}>{count > 0 ? `${formatCompact(count)} active` : 'Room active'}</Text>
      </View>
      <View style={styles.joinRoomButton}>
        <Text style={styles.joinRoomText}>Join Room</Text>
      </View>
    </Pressable>
  );
}

function ThreadCard({ thread, creators }: { thread: BackstageThread; creators: CreatorIdentity[] }) {
  const router = useRouter();
  const category = thread.category || (thread.attached_event_id ? 'Event' : thread.attached_release_id ? 'Audio' : 'Thread');
  const hasTicket = /ticket|spare|going|event/i.test(`${thread.title} ${thread.body} ${category}`);
  const hasAudio = /audio|verse|mix|beat|sample/i.test(`${thread.title} ${thread.body} ${category}`);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open thread ${thread.title}`}
      onPress={() => {
        selectionHaptic();
        router.push('/backstage' as any);
      }}
      style={styles.threadCard}
    >
      <View style={styles.threadHeader}>
        <View style={styles.threadAvatar}>
          <Text style={styles.threadAvatarText}>{contentInitials(thread.author_name || thread.author_handle || category)}</Text>
        </View>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
        <MaterialIcons name="more-horiz" size={19} color={COLORS.dim} style={styles.threadMore} />
      </View>
      <Text style={styles.threadTitle} numberOfLines={2}>{thread.title}</Text>
      <Text style={styles.threadPreview} numberOfLines={2}>{thread.body || 'Latest reply preview will appear here as the discussion moves.'}</Text>
      <View style={styles.threadFooter}>
        <Text style={styles.threadReplies}>{formatCompact(thread.comment_count ?? 0)} replies</Text>
        <AvatarStack creators={participants(creators, 3)} size={22} />
        <View style={styles.threadChips}>
          {hasTicket ? <Chip label="ticket" active /> : null}
          {hasAudio ? <Chip label="audio" /> : null}
          {thread.attached_event_id ? <Chip label="event" /> : null}
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      onPress={() => {
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={styles.producerCard}
    >
      <View style={styles.producerTag}>
        <Text style={styles.producerTagText}>{item.tag}</Text>
      </View>
      <Text style={styles.producerTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.producerSubtitle} numberOfLines={2}>{item.subtitle}</Text>
      <Text style={styles.producerReplies}>{formatCompact(item.replies ?? 0)} replies</Text>
    </Pressable>
  );
}

function MomentTile({ moment }: { moment: CommunityMoment }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open moment ${moment.title}`}
      onPress={() => {
        selectionHaptic();
        router.push(moment.route as any);
      }}
      style={styles.momentTile}
    >
      <BackstageArtwork uri={moment.imageUrl} title={moment.title} style={styles.momentImage} />
      <LinearGradient colors={['rgba(8,8,12,0.03)', 'rgba(8,8,12,0.86)']} style={StyleSheet.absoluteFill} />
      <Text style={styles.momentTitle} numberOfLines={1}>{moment.title}</Text>
    </Pressable>
  );
}

function DiscoverCard({ community, creator }: { community?: BackstageCommunity; creator?: CreatorIdentity }) {
  const router = useRouter();
  const title = community?.title || creator?.name || 'Backstage community';
  const imageUrl = community?.cover_image_url || community?.avatar_url || creator?.imageUrl;
  const route = community ? routeForCommunity(community) : creator?.route || '/search';
  const label = community?.description || creator?.label || 'Genre/local scene';
  const members = community?.member_count;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Join ${title}`}
      onPress={() => {
        selectionHaptic();
        router.push(route as any);
      }}
      style={styles.discoverCard}
    >
      <BackstageArtwork uri={imageUrl} title={title} style={styles.discoverBanner} />
      <View style={styles.discoverBody}>
        <View style={styles.discoverAvatar}>
          {imageUrl ? <PluggdImage uri={imageUrl} style={styles.imageFill} /> : <Text style={styles.discoverInitials}>{contentInitials(title)}</Text>}
        </View>
        <View style={styles.discoverCopy}>
          <Text style={styles.discoverTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.discoverMeta} numberOfLines={1}>{label}{members ? ` · ${formatCompact(members)} members` : ''}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Join ${title}`}
          onPress={(event) => {
            event.stopPropagation();
            impactHaptic();
            router.push(route as any);
          }}
          style={styles.joinDiscoverButton}
        >
          <Text style={styles.joinDiscoverText}>JOIN</Text>
        </Pressable>
      </View>
    </Pressable>
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

export function BackstageWorldScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<BackstageFilter, number>>({
    'My Circles': 0,
    'Event Hubs': 0,
    Rooms: 0,
    Threads: 0,
    Producers: 0,
  });
  const backstage = useBackstage();
  const events = useEventLayer(12);
  const home = useHomeFeed();
  const live = useLiveRooms();
  const [activeFilter, setActiveFilter] = useState<BackstageFilter>('My Circles');

  const allCommunities = backstage.data?.communities ?? [];
  const communities = backstage.data?.joinedCommunities?.length ? backstage.data.joinedCommunities : allCommunities;
  const threads = backstage.data?.threads ?? [];
  const eventRows = events.data?.length ? events.data : backstage.data?.events ?? [];
  const rooms = [...(backstage.data?.rooms ?? []), ...(live.data ?? [])];
  const creators = useMemo(() => mapCreatorIdentities(home.data), [home.data]);
  const producerItems = useMemo(() => mapProducerLounge(home.data?.posts, home.data?.beats), [home.data?.beats, home.data?.posts]);
  const moments = useMemo(() => mapMoments(home.data, eventRows), [eventRows, home.data]);
  const recommendations = allCommunities.filter((community) => !community.membership || community.membership.status === 'left').slice(0, 4);
  const refreshing = backstage.isRefetching || events.isRefetching || home.isRefetching || live.isRefetching;
  const loading = backstage.isLoading || events.isLoading || home.isLoading || live.isLoading;
  const bottomPadding = Math.max(insets.bottom + 154, 176);

  const refresh = () => {
    void backstage.refetch();
    void events.refetch();
    void home.refetch();
    void live.refetch();
  };

  const onFilter = (filter: BackstageFilter) => {
    setActiveFilter(filter);
    const y = sectionOffsets.current[filter] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
  };

  const sectionLayout = (filter: BackstageFilter) => (event: { nativeEvent: { layout: { y: number } } }) => {
    sectionOffsets.current[filter] = event.nativeEvent.layout.y;
  };

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
        {loading ? (
          <PremiumSkeleton compact label="Opening Backstage..." style={styles.loadingBlock} />
        ) : null}

        <View style={styles.sectionBlock} onLayout={sectionLayout('My Circles')}>
          <SectionHeader title="MY BACKSTAGE" />
          {communities.length === 0 ? (
            <EmptyInline title="Join creator communities to enter the conversation." body="Your circles, event hubs and producer rooms will appear here." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleShelf}>
              {communities.slice(0, 10).map((community, index) => (
                <MyCircleCard
                  key={community.id}
                  community={community}
                  liveRoomActive={rooms[index % Math.max(rooms.length, 1)]?.status === 'live'}
                  ticketThreadActive={threads.some(threadHasTicketSignal)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Event Hubs')}>
          <SectionHeader title="EVENT HUBS" />
          {eventRows.length === 0 ? (
            <EmptyInline title="No event hubs yet." body="Event discussions, ticket threads and who’s-going activity will appear here." />
          ) : (
            <View style={styles.eventHubList}>
              {eventRows.slice(0, 4).map((event) => (
                <EventHubCard key={event.id} event={event} creators={creators} threads={threads} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Rooms')}>
          <SectionHeader title="ACTIVE COMMUNITY ROOMS" />
          {rooms.length === 0 && communities.length === 0 ? (
            <EmptyInline title="No active community rooms." body="Backstage rooms open when creator communities start moving." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomShelf}>
              {rooms.slice(0, 4).map((room) => <RoomCard key={`room-${room.id}`} room={room} creators={creators} />)}
              {communities.slice(0, Math.max(0, 5 - rooms.length)).map((community) => <RoomCard key={`community-${community.id}`} room={community} creators={creators} />)}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Threads')}>
          <SectionHeader title="HOT THREADS" />
          {threads.length === 0 ? (
            <EmptyInline title="No hot threads yet." body="Ticket questions, event plans and music discussions will appear here." />
          ) : (
            <View style={styles.threadList}>
              {threads.slice(0, 5).map((thread) => <ThreadCard key={thread.id} thread={thread} creators={creators} />)}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock} onLayout={sectionLayout('Producers')}>
          <SectionHeader title="PRODUCER LOUNGE" />
          {producerItems.length === 0 ? (
            <EmptyInline title="No producer lounge activity yet." body="Sample flips, collab requests and feedback rooms will appear here." />
          ) : (
            <View style={styles.producerGrid}>
              {producerItems.map((item) => <ProducerItemCard key={item.id} item={item} />)}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="COMMUNITY MOMENTS" />
          {moments.length === 0 ? (
            <EmptyInline title="No community moments yet." body="Fan clips, event photos and backstage snippets will appear here." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentShelf}>
              {moments.map((moment) => <MomentTile key={moment.id} moment={moment} />)}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="DISCOVER MORE BACKSTAGES" />
          {recommendations.length === 0 && creators.length === 0 ? (
            <EmptyInline title="No recommendations yet." body="More creator communities will appear here when available." />
          ) : (
            <View style={styles.discoverList}>
              {recommendations.slice(0, 3).map((community) => <DiscoverCard key={`community-${community.id}`} community={community} />)}
              {creators.slice(0, Math.max(0, 3 - recommendations.length)).map((creator) => <DiscoverCard key={`creator-${creator.id}`} creator={creator} />)}
            </View>
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
    fontSize: 29,
    lineHeight: 33,
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
    color: COLORS.white,
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
    color: 'rgba(255,255,255,0.84)',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  circleShelf: {
    paddingHorizontal: 16,
    gap: 10,
  },
  circleCard: {
    width: 132,
    minHeight: 198,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  circleBanner: {
    height: 62,
    width: '100%',
  },
  circleBody: {
    flex: 1,
    padding: 10,
  },
  circleTitle: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  circleMeta: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  liveStatusRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.coral,
  },
  liveStatusText: {
    color: COLORS.coral,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  ticketStatus: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 22,
    borderRadius: 7,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,90,0,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.22)',
  },
  ticketStatusText: {
    color: '#FFB08A',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  openCircleButton: {
    marginTop: 'auto',
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  openCircleText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  eventHubList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  eventHubCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  eventStrip: {
    height: 112,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
  },
  eventStripImage: {
    width: '100%',
    height: '100%',
  },
  eventHubBody: {
    padding: 14,
  },
  eventHubTitle: {
    color: COLORS.white,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  eventHubMeta: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  eventCountdown: {
    marginTop: 8,
    color: COLORS.white,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  eventStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventStat: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  goingRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  stackInitials: {
    color: COLORS.white,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
  },
  goingText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  eventActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  getTicketsButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
  },
  getTicketsText: {
    color: COLORS.canvas,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  openHubButton: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  openHubText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  roomShelf: {
    paddingHorizontal: 16,
    gap: 10,
  },
  roomCard: {
    width: 188,
    minHeight: 164,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 13,
  },
  roomTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  roomTitle: {
    flex: 1,
    color: COLORS.white,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  roomCommunity: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  roomMetaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomUsers: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  joinRoomButton: {
    marginTop: 'auto',
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  joinRoomText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  threadList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  threadCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 13,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  threadAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  threadAvatarText: {
    color: COLORS.white,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  categoryPill: {
    minHeight: 26,
    borderRadius: 9,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  categoryText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  threadMore: {
    marginLeft: 'auto',
  },
  threadTitle: {
    marginTop: 11,
    color: COLORS.white,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  threadPreview: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  threadFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  threadReplies: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  threadChips: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 5,
  },
  chip: {
    height: 24,
    borderRadius: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(255,90,0,0.16)',
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  chipTextActive: {
    color: '#FFB08A',
  },
  producerGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  producerCard: {
    width: '48%',
    minHeight: 126,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 12,
  },
  producerTag: {
    alignSelf: 'flex-start',
    minHeight: 24,
    borderRadius: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  producerTagText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  producerTitle: {
    marginTop: 9,
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  producerSubtitle: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  producerReplies: {
    marginTop: 'auto',
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  momentShelf: {
    paddingHorizontal: 16,
    gap: 10,
  },
  momentTile: {
    width: 128,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  momentImage: {
    width: '100%',
    height: '100%',
  },
  momentTitle: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 8,
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  discoverList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  discoverCard: {
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  discoverBanner: {
    height: 82,
    width: '100%',
  },
  discoverBody: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  discoverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  discoverInitials: {
    color: COLORS.white,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  discoverCopy: {
    flex: 1,
    minWidth: 0,
  },
  discoverTitle: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  discoverMeta: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  joinDiscoverButton: {
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  joinDiscoverText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
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
