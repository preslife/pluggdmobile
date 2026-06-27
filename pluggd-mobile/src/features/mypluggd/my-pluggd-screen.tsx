import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumScreenBackdrop, PremiumScreenHeader } from '../../../components/PluggdPrimitives';
import { useAuth } from '../../context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { contentInitials, formatCompact, formatDate } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import { MobileSocialPostCard } from '../culture/MobileSocialPostCard';
import { MobileStoriesRail } from '../culture/MobileStoriesRail';
import {
  createFanMapPlug,
  joinBackstage,
  loadFanMapContext,
  loadInboxThreads,
  loadLibraryBundle,
  loadMobileNotifications,
  loadRecentlyPlayedLibraryItems,
} from '../culture/mobileServices';
import { loadCommunityBoards, loadMobileSocialFeed, type MobileSocialFeedMode } from '../culture/mobileSocial';
import { useBackstage } from '../culture/useCultureData';
import type { BackstageThread, FanMapPlug, MobileNotification, SavedContentItem } from '../culture/mobileTypes';

type MyPluggdTab = 'feed' | 'circles' | 'library' | 'activity';
type ActivityFilter = 'All' | 'Mentions' | 'Replies' | 'Follows' | 'Communities' | 'Events' | 'Rewards';

const MYPLUGGD_TABS: Array<{ key: MyPluggdTab; label: string }> = [
  { key: 'feed', label: 'Feed' },
  { key: 'circles', label: 'Circles' },
  { key: 'library', label: 'Library' },
  { key: 'activity', label: 'Activity' },
];

const FEED_SWITCH: Array<{ key: MobileSocialFeedMode; label: string }> = [
  { key: 'for-you', label: 'For You' },
  { key: 'following', label: 'Following' },
];

const ACTIVITY_FILTERS: ActivityFilter[] = ['All', 'Mentions', 'Replies', 'Follows', 'Communities', 'Events', 'Rewards'];

function savedIcon(kind: SavedContentItem['kind']): keyof typeof MaterialIcons.glyphMap {
  if (kind === 'event') return 'confirmation-number';
  if (kind === 'community') return 'groups';
  if (kind === 'profile') return 'person';
  if (kind === 'playlist') return 'queue-music';
  if (kind === 'beat' || kind === 'mix' || kind === 'release') return 'play-circle-outline';
  if (kind === 'post') return 'chat-bubble-outline';
  if (kind === 'soundboard') return 'dashboard-customize';
  return 'bookmark-border';
}

function includesAny(source: string | null | undefined, terms: string[]) {
  const text = String(source || '').toLowerCase();
  return terms.some((term) => text.includes(term));
}

function threadMatchesTicket(thread: BackstageThread) {
  return Boolean(
    thread.attached_event_id ||
      includesAny(`${thread.title} ${thread.body} ${thread.category}`, ['ticket', 'swap', 'spare', 'sold out', 'meetup', 'afterparty']),
  );
}

function notificationText(item: MobileNotification) {
  return `${item.type || ''} ${item.title || ''} ${item.body || ''}`.toLowerCase();
}

function notificationMatches(item: MobileNotification, filter: ActivityFilter) {
  if (filter === 'All') return true;
  const text = notificationText(item);
  if (filter === 'Mentions') return includesAny(text, ['mention', '@']);
  if (filter === 'Replies') return includesAny(text, ['reply', 'comment', 'thread']);
  if (filter === 'Follows') return includesAny(text, ['follow']);
  if (filter === 'Communities') return includesAny(text, ['community', 'circle', 'board', 'backstage']);
  if (filter === 'Events') return includesAny(text, ['event', 'ticket', 'rsvp', 'reminder']);
  if (filter === 'Rewards') return includesAny(text, ['reward', 'xp', 'badge', 'credit', 'golden', 'founder']);
  return true;
}

function profileRoute(userId?: string | null, username?: string | null) {
  if (username) return `/creator/${username}`;
  if (userId) return `/user/${userId}`;
  return '/profile';
}

function HeaderAction({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number | boolean;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.headerAction}>
      <MaterialIcons name={icon} size={23} color={theme.colors.text} />
      {badge ? <View style={[styles.badgeDot, { backgroundColor: theme.colors.live }]} /> : null}
    </Pressable>
  );
}

function MyPluggdTabRow({ active, onChange }: { active: MyPluggdTab; onChange: (tab: MyPluggdTab) => void }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.tabRow, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.divider }]}>
      {MYPLUGGD_TABS.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected }}
            style={styles.tabButton}
            onPress={() => {
              selectionHaptic();
              onChange(tab.key);
            }}
          >
            <Text style={[styles.tabLabel, { color: selected ? theme.colors.text : theme.colors.textMuted }]}>{tab.label}</Text>
            <View style={[styles.tabUnderline, { backgroundColor: selected ? theme.colors.accent : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function MyPluggdScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<MyPluggdTab>('feed');
  const [feedMode, setFeedMode] = useState<MobileSocialFeedMode>('for-you');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');
  const [fanMapOpen, setFanMapOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const profile = useQuery({
    queryKey: ['my-pluggd', 'profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('user_id,username,full_name,avatar_url')
        .eq('user_id', user?.id)
        .maybeSingle();
      return data || null;
    },
    staleTime: 1000 * 60 * 5,
  });
  const feed = useQuery({
    queryKey: ['my-pluggd', 'feed', feedMode],
    queryFn: () => loadMobileSocialFeed({ mode: feedMode, limit: 30 }),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 35,
  });
  const backstage = useBackstage();
  const boards = useQuery({
    queryKey: ['my-pluggd', 'boards'],
    queryFn: loadCommunityBoards,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60,
  });
  const library = useQuery({
    queryKey: ['culture', 'library'],
    queryFn: loadLibraryBundle,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60,
  });
  const recentlyPlayed = useQuery({
    queryKey: ['culture', 'recently-played', user?.id],
    queryFn: () => loadRecentlyPlayedLibraryItems(12),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60,
  });
  const notifications = useQuery({
    queryKey: ['culture', 'notifications', 'my-pluggd'],
    queryFn: () => loadMobileNotifications(80),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 35,
  });
  const inbox = useQuery({
    queryKey: ['culture', 'inbox-threads', 'my-pluggd'],
    queryFn: () => loadInboxThreads(8),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 45,
  });
  const fanMap = useQuery({
    queryKey: ['my-pluggd', 'fan-map'],
    queryFn: () => loadFanMapContext(120),
    enabled: activeTab === 'circles' || fanMapOpen,
    staleTime: 1000 * 90,
  });
  const joinCircle = useMutation({
    mutationFn: (communityId: string) => joinBackstage(communityId),
    onSuccess: async (result) => {
      if (!result.success) {
        Alert.alert('Circle unavailable', result.error || 'Could not join this circle.');
        return;
      }
      impactHaptic();
      await backstage.refetch();
    },
    onError: (error) => Alert.alert('Circle unavailable', error instanceof Error ? error.message : String(error)),
  });

  const unreadCount = useMemo(() => (notifications.data || []).filter((item) => !item.read_at).length, [notifications.data]);
  const avatarLabel = contentInitials(profile.data?.full_name || profile.data?.username || user?.email || 'P');
  const joinedCommunities = backstage.data?.joinedCommunities || [];
  const recommendedCommunities = (backstage.data?.communities || []).filter((community) => !community.membership).slice(0, 10);
  const activeRooms = (backstage.data?.rooms || []).filter((room) => room.status === 'active' || room.status === 'live' || Number(room.active_users || 0) > 0);
  const unreadThreads = (backstage.data?.threads || []).slice(0, 8);
  const ticketThreads = (backstage.data?.threads || []).filter(threadMatchesTicket).slice(0, 8);
  const followedBoards = (boards.data || []).filter((board) => board.joined);
  const eventHubs = backstage.data?.events || [];
  const savedItems = library.data?.saved || [];
  const purchases = [...(library.data?.purchases || []), ...(library.data?.entitlements || [])];
  const tickets = library.data?.tickets || [];
  const notificationsForFilter = (notifications.data || []).filter((item) => notificationMatches(item, activityFilter));

  const go = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        profile.refetch(),
        feed.refetch(),
        backstage.refetch(),
        boards.refetch(),
        library.refetch(),
        recentlyPlayed.refetch(),
        notifications.refetch(),
        inbox.refetch(),
        fanMap.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PremiumScreenBackdrop tone="community" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.header,
          {
            minHeight: insets.top + 62,
            paddingTop: insets.top,
            backgroundColor: theme.colors.headerGlass,
            borderBottomColor: theme.colors.divider,
          },
        ]}
      >
        <PremiumScreenHeader
          eyebrow="COMMUNITY"
          title="Community"
          subtitle="Feed, Circles, Library and Activity for your culture graph."
          tone="community"
          style={styles.communityHeaderTitle}
        />
        <View style={styles.headerActions}>
          <HeaderAction icon="search" label="Search PLUGGD" onPress={() => go('/search')} />
          <HeaderAction icon="mail-outline" label="Open inbox" onPress={() => go('/inbox')} badge={Boolean(inbox.data?.some((item) => item.unread_count))} />
          <HeaderAction icon="notifications-none" label="Open notifications" onPress={() => go('/notifications')} badge={unreadCount} />
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile menu" style={styles.avatarTap} onPress={() => (user ? setAvatarMenuOpen(true) : go('/auth/login'))}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.divider }]}>
              {profile.data?.avatar_url ? <PluggdImage uri={profile.data.avatar_url} style={styles.avatarImage} /> : <Text style={[styles.avatarText, { color: theme.colors.text }]}>{avatarLabel}</Text>}
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={theme.colors.accent} />}
        contentContainerStyle={{ paddingBottom: 148 + insets.bottom }}
      >
        <MyPluggdTabRow active={activeTab} onChange={setActiveTab} />

        {activeTab === 'feed' ? (
          <View style={styles.feedStack}>
            <MobileStoriesRail compact title="Moments" userAvatarUrl={profile.data?.avatar_url} />
            <CompactComposer
              avatarLabel={avatarLabel}
              avatarUrl={profile.data?.avatar_url}
              onOpen={() => go(user ? '/create-post' : '/auth/login')}
              onImage={() => go(user ? '/create-post?type=post&media=image' : '/auth/login')}
              onMusic={() => go(user ? '/create-post?type=post&media=audio' : '/auth/login')}
              onThread={() => go(user ? '/create-post?type=discussion' : '/auth/login')}
            />
            <FeedSwitch active={feedMode} onChange={setFeedMode} />
            {!user ? (
              <BuildFeedPanel onFind={() => go('/search')} onCircles={() => setActiveTab('circles')} />
            ) : feed.isLoading ? (
              <LoadingRows />
            ) : feed.data?.length ? (
              feed.data.map((post) => (
                <MobileSocialPostCard key={post.id} post={post} variant="timeline" onMutated={() => void feed.refetch()} />
              ))
            ) : (
              <BuildFeedPanel onFind={() => go('/search')} onCircles={() => setActiveTab('circles')} />
            )}
          </View>
        ) : null}

        {activeTab === 'circles' ? (
          <View style={styles.pageStack}>
            <SectionHeader title="My Circles" />
            <HorizontalRail>
              {joinedCommunities.length ? joinedCommunities.map((community) => (
                <CircleCard key={community.id} title={community.title} imageUrl={community.cover_image_url || community.avatar_url} meta={community.online_count ? `${formatCompact(community.online_count)} online` : community.member_count ? `${formatCompact(community.member_count)} members` : 'Joined'} onPress={() => go(`/backstage/${community.slug || community.id}`)} />
              )) : <RailEmpty title="Join circles" body="Your communities and event hubs appear here." />}
            </HorizontalRail>

            <FanMapCard stats={fanMap.data?.stats} onPress={() => setFanMapOpen(true)} />

            <SectionHeader title="Active Now" />
            {activeRooms.length ? activeRooms.slice(0, 6).map((room) => (
              <CompactRow key={room.id} icon="settings-input-antenna" title={room.title} meta={room.active_users ? `${formatCompact(room.active_users)} active` : room.room_type || 'Community room'} cta="Join Room" onPress={() => go(`/live/session?roomId=${room.id}`)} />
            )) : <EmptyPanel title="No active rooms" body="Listening parties, event rooms and producer rooms will appear here when live." />}

            <SectionHeader title="Unread Threads" />
            {unreadThreads.length ? unreadThreads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} onPress={() => go(thread.route || `/post/${thread.id}`)} />
            )) : <EmptyPanel title="No unread threads" body="Threads from your circles and boards will appear here." />}

            <SectionHeader title="Event Hubs I'm In" />
            {eventHubs.length ? eventHubs.slice(0, 5).map((event) => (
              <EventHubRow key={event.id} title={event.title || 'Event hub'} imageUrl={event.cover_image_url} meta={[event.starts_at ? formatDate(event.starts_at) : null, event.location].filter(Boolean).join(' · ') || 'Event hub'} onPress={() => go(`/events/${event.id}`)} />
            )) : <EmptyPanel title="No event hubs yet" body="Saved, RSVP'd and joined event hubs will appear here." />}

            <SectionHeader title="Ticket Threads" />
            {ticketThreads.length ? ticketThreads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} chip="Ticket" onPress={() => go(thread.route || `/post/${thread.id}`)} />
            )) : <EmptyPanel title="No ticket threads" body="Ticket swaps, meetup plans and event discussions appear here when backed by real threads." />}

            <SectionHeader title="Followed Boards" />
            {followedBoards.length ? followedBoards.map((board) => (
              <CompactRow key={board.id} icon="forum" title={board.name} meta={board.description || board.category || 'Followed board'} cta="Open" onPress={() => go(board.route)} />
            )) : <EmptyPanel title="No followed boards" body="Follow boards in communities to make this your forum shortcut." />}

            <SectionHeader title="Recommended Circles" />
            <HorizontalRail>
              {recommendedCommunities.length ? recommendedCommunities.map((community) => (
                <CircleCard key={community.id} title={community.title} imageUrl={community.cover_image_url || community.avatar_url} meta={community.member_count ? `${formatCompact(community.member_count)} members` : community.description || 'Circle'} onPress={() => joinCircle.mutate(community.id)} action={joinCircle.isPending ? 'Joining' : 'Join'} />
              )) : <RailEmpty title="No recommendations" body="Recommended circles will appear from real communities." />}
            </HorizontalRail>
          </View>
        ) : null}

        {activeTab === 'library' ? (
          <LibraryTab recentlyPlayed={recentlyPlayed.data || []} savedItems={savedItems} purchases={purchases as SavedContentItem[]} tickets={tickets} onRoute={go} />
        ) : null}

        {activeTab === 'activity' ? (
          <ActivityTab
            filter={activityFilter}
            onFilter={setActivityFilter}
            notifications={notificationsForFilter}
            allNotifications={notifications.data || []}
            onRoute={go}
          />
        ) : null}
      </ScrollView>

      <FanMapSheet
        open={fanMapOpen}
        onClose={() => setFanMapOpen(false)}
        plugs={fanMap.data?.plugs || []}
        stats={fanMap.data?.stats}
        loading={fanMap.isLoading}
        onRefresh={() => void fanMap.refetch()}
        onOpenProfile={(plug) => {
          setFanMapOpen(false);
          go(profileRoute(plug.user_id || plug.creator_id, plug.profile_slug || plug.username));
        }}
      />
      <AvatarMenuModal
        open={avatarMenuOpen}
        onClose={() => setAvatarMenuOpen(false)}
        onRoute={(route) => {
          setAvatarMenuOpen(false);
          go(route);
        }}
        onSignOut={async () => {
          setAvatarMenuOpen(false);
          await signOut();
          router.replace('/auth/login' as any);
        }}
      />
    </PremiumScreenBackdrop>
  );
}

function FeedSwitch({ active, onChange }: { active: MobileSocialFeedMode; onChange: (mode: MobileSocialFeedMode) => void }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.feedSwitch, { borderBottomColor: theme.colors.divider }]}>
      {FEED_SWITCH.map((mode) => {
        const selected = active === mode.key;
        return (
          <Pressable key={mode.key} accessibilityRole="button" accessibilityLabel={`${mode.label} feed`} accessibilityState={{ selected }} style={styles.feedSwitchButton} onPress={() => onChange(mode.key)}>
            <Text style={[styles.feedSwitchLabel, { color: selected ? theme.colors.text : theme.colors.textMuted }]}>{mode.label}</Text>
            <View style={[styles.feedUnderline, { backgroundColor: selected ? theme.colors.accent : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function CompactComposer({
  avatarLabel,
  avatarUrl,
  onOpen,
  onImage,
  onMusic,
  onThread,
}: {
  avatarLabel: string;
  avatarUrl?: string | null;
  onOpen: () => void;
  onImage: () => void;
  onMusic: () => void;
  onThread: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open composer" style={[styles.compactComposer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={onOpen}>
      <View style={[styles.composerAvatar, { backgroundColor: theme.colors.surfaceAlt }]}>
        {avatarUrl ? <PluggdImage uri={avatarUrl} style={styles.avatarImage} /> : <Text style={[styles.avatarText, { color: theme.colors.text }]}>{avatarLabel}</Text>}
      </View>
      <Text style={[styles.composerPlaceholder, { color: theme.colors.textMuted }]}>What's happening?</Text>
      <QuickComposerAction icon="image" label="Add image or video" onPress={onImage} />
      <QuickComposerAction icon="graphic-eq" label="Share music or audio" onPress={onMusic} />
      <QuickComposerAction icon="forum" label="Start event or thread" onPress={onThread} />
    </Pressable>
  );
}

function QuickComposerAction({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={styles.quickAction} onPress={(event) => {
      event.stopPropagation();
      onPress();
    }}>
      <MaterialIcons name={icon} size={20} color={theme.colors.accent} />
    </Pressable>
  );
}

function LibraryTab({
  recentlyPlayed,
  savedItems,
  purchases,
  tickets,
  onRoute,
}: {
  recentlyPlayed: SavedContentItem[];
  savedItems: SavedContentItem[];
  purchases: SavedContentItem[];
  tickets: Array<{ id: string; event_id: string; event_title: string; event_image_url?: string | null; status?: string | null }>;
  onRoute: (route: string) => void;
}) {
  const savedMusic = savedItems.filter((item) => ['release', 'beat', 'mix', 'video', 'soundboard'].includes(item.kind));
  const savedPosts = savedItems.filter((item) => item.kind === 'post');
  const savedThreads = savedItems.filter((item) => item.kind === 'community');
  const savedEvents = savedItems.filter((item) => item.kind === 'event');
  return (
    <View style={styles.pageStack}>
      <SectionHeader title="Recently Played" />
      <HorizontalRail>
        {recentlyPlayed.length ? recentlyPlayed.slice(0, 8).map((item) => <LibraryArtCard key={`${item.source}-${item.id}`} item={item} onRoute={onRoute} />) : <RailEmpty title="No recent plays" body="Playback history-backed items will appear here." />}
      </HorizontalRail>

      <SectionHeader title="My Playlists" action="Create Playlist" onPress={() => onRoute('/playlists/new')} />
      <HorizontalRail>
        {savedItems.filter((item) => item.kind === 'playlist').length ? savedItems.filter((item) => item.kind === 'playlist').slice(0, 8).map((item) => <LibraryArtCard key={`${item.source}-${item.id}`} item={item} onRoute={onRoute} />) : <RailEmpty title="No playlists" body="Create, edit, share and add tracks from playlist screens." />}
      </HorizontalRail>

      <SectionHeader title="Saved Music" />
      {savedMusic.length ? savedMusic.slice(0, 8).map((item) => <SavedRow key={`${item.source}-${item.id}`} item={item} onRoute={onRoute} />) : <EmptyPanel title="No saved music" body="Saved releases, beats, mixes, videos and soundboards appear here." />}

      <SectionHeader title="Saved Posts" />
      {savedPosts.length ? savedPosts.slice(0, 6).map((item) => <SavedRow key={`${item.source}-${item.id}`} item={item} onRoute={onRoute} />) : <EmptyPanel title="No saved posts" body="Bookmarked social posts and creator updates appear here." />}

      <SectionHeader title="Saved Threads / Boards" />
      {savedThreads.length ? savedThreads.slice(0, 6).map((item) => <SavedRow key={`${item.source}-${item.id}`} item={item} onRoute={onRoute} />) : <EmptyPanel title="No saved threads" body="Followed boards and bookmarked discussions appear here." />}

      <SectionHeader title="Saved Events" />
      {savedEvents.length ? savedEvents.slice(0, 6).map((item) => <SavedRow key={`${item.source}-${item.id}`} item={item} onRoute={onRoute} />) : <EmptyPanel title="No saved events" body="Saved, RSVP'd and interested events appear here." />}

      <SectionHeader title="Tickets" />
      {tickets.length ? tickets.slice(0, 5).map((ticket) => (
        <CompactRow key={ticket.id} icon="confirmation-number" title={ticket.event_title} meta={ticket.status || 'Ticket'} cta="Open" onPress={() => onRoute(`/events/${ticket.event_id}`)} />
      )) : <EmptyPanel title="No tickets" body="Active and past tickets appear here. QR codes only show on ticket screens when backed by a real payload." />}

      <SectionHeader title="Purchases / Unlocks" />
      {purchases.length ? purchases.slice(0, 8).map((item) => <SavedRow key={`${item.source}-${item.id}`} item={item} onRoute={onRoute} />) : <EmptyPanel title="No purchases yet" body="Beat licenses, downloads, sample packs, merch, memberships and unlocks appear here." />}

      <SectionHeader title="Wallet / Credits Shortcut" />
      <CompactRow icon="account-balance-wallet" title="Wallet and credits" meta="Credit balance, top up, restore purchases and transactions." cta="Open" onPress={() => onRoute('/wallet')} />

      <SectionHeader title="Badges / XP / Rewards" />
      <HorizontalRail>
        <Pressable accessibilityRole="button" accessibilityLabel="Open badges" style={styles.badgeCard} onPress={() => onRoute('/badges')}>
          <MaterialIcons name="workspace-premium" size={30} color="#FF5A00" />
          <Text style={styles.badgeTitle}>Progress</Text>
          <Text style={styles.badgeMeta}>XP, badges and rewards</Text>
        </Pressable>
      </HorizontalRail>
    </View>
  );
}

function ActivityTab({
  filter,
  onFilter,
  notifications,
  allNotifications,
  onRoute,
}: {
  filter: ActivityFilter;
  onFilter: (filter: ActivityFilter) => void;
  notifications: MobileNotification[];
  allNotifications: MobileNotification[];
  onRoute: (route: string) => void;
}) {
  return (
    <View style={styles.pageStack}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {ACTIVITY_FILTERS.map((item) => <ActivityFilterPill key={item} label={item} selected={filter === item} onPress={() => onFilter(item)} />)}
      </ScrollView>
      <ActivitySection title="Mentions / Replies" terms={['mention', '@', 'reply', 'comment', 'thread']} notifications={notifications} onRoute={onRoute} />
      <ActivitySection title="Community Updates" terms={['community', 'circle', 'board', 'backstage']} notifications={notifications} onRoute={onRoute} />
      <ActivitySection title="Event / Ticket Updates" terms={['event', 'ticket', 'rsvp', 'reminder']} notifications={notifications} onRoute={onRoute} />
      <ActivitySection title="Live Updates" terms={['live', 'room', 'replay']} notifications={notifications} onRoute={onRoute} />
      <ActivitySection title="Likes / Reposts / Saves" terms={['like', 'repost', 'save', 'bookmark']} notifications={notifications} onRoute={onRoute} />
      <ActivitySection title="New Followers" terms={['follow']} notifications={notifications} onRoute={onRoute} />
      <ActivitySection title="Rewards / XP / Badges" terms={['reward', 'xp', 'badge', 'credit', 'golden', 'founder']} notifications={notifications} onRoute={onRoute} />
      {!allNotifications.length ? <EmptyPanel title="No activity yet" body="Replies, mentions, likes, reposts, follows, reminders and rewards will appear here." /> : null}
    </View>
  );
}

function ActivitySection({ title, terms, notifications, onRoute }: { title: string; terms: string[]; notifications: MobileNotification[]; onRoute: (route: string) => void }) {
  const rows = notifications.filter((item) => includesAny(notificationText(item), terms)).slice(0, 5);
  return (
    <View style={styles.activitySection}>
      <SectionHeader title={title} />
      {rows.length ? rows.map((item) => <ActivityRow key={item.id} item={item} onRoute={onRoute} />) : <EmptyPanel title={`No ${title.toLowerCase()}`} body="This section fills from real notifications and product activity." compact />}
    </View>
  );
}

function ActivityFilterPill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} activity`} accessibilityState={{ selected }} style={[styles.filterPill, { backgroundColor: selected ? theme.colors.accent : theme.colors.surface, borderColor: selected ? theme.colors.accent : theme.colors.border }]} onPress={onPress}>
      <Text style={[styles.filterPillText, { color: selected ? '#08080C' : theme.colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

function AvatarMenuModal({
  open,
  onClose,
  onRoute,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onRoute: (route: string) => void;
  onSignOut: () => Promise<void>;
}) {
  const theme = usePluggdTheme();
  const menu: Array<{ label: string; icon: keyof typeof MaterialIcons.glyphMap; route?: string; destructive?: boolean }> = [
    { label: 'View Profile', icon: 'person-outline', route: '/profile' },
    { label: 'Edit Profile', icon: 'edit', route: '/edit-profile' },
    { label: 'Inbox', icon: 'mail-outline', route: '/inbox' },
    { label: 'Wallet', icon: 'account-balance-wallet', route: '/wallet' },
    { label: 'Tickets', icon: 'confirmation-number', route: '/tickets' },
    { label: 'Saved', icon: 'bookmark-border', route: '/favorites' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'Creator Mode', icon: 'auto-awesome', route: '/creator-mode' },
    { label: 'Sign Out', icon: 'logout', destructive: true },
  ];
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close profile menu" style={styles.menuOverlay} onPress={onClose}>
        <Pressable style={[styles.menuSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={(event) => event.stopPropagation()}>
          <Text style={[styles.menuTitle, { color: theme.colors.text }]}>COMMUNITY</Text>
          {menu.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={[styles.menuItem, { borderBottomColor: theme.colors.divider }]}
              onPress={() => {
                if (item.destructive) void onSignOut();
                else if (item.route) onRoute(item.route);
              }}
            >
              <MaterialIcons name={item.icon} size={21} color={item.destructive ? theme.colors.live : theme.colors.text} />
              <Text style={[styles.menuItemText, { color: item.destructive ? theme.colors.live : theme.colors.text }]}>{item.label}</Text>
              {!item.destructive ? <MaterialIcons name="chevron-right" size={20} color={theme.colors.textSubtle} /> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FanMapSheet({
  open,
  onClose,
  plugs,
  stats,
  loading,
  onRefresh,
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  plugs: FanMapPlug[];
  stats?: { total: number; countries: number; featured: number };
  loading: boolean;
  onRefresh: () => void;
  onOpenProfile: (plug: FanMapPlug) => void;
}) {
  const theme = usePluggdTheme();
  const { user } = useAuth();
  const [mapSize, setMapSize] = useState({ width: 1, height: 1 });
  const [selected, setSelected] = useState<{ lat: number; lng: number }>({ lat: 51.5072, lng: -0.1276 });
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');

  const createPlug = useMutation({
    mutationFn: () => createFanMapPlug({ displayName, city, country, message, lat: selected.lat, lng: selected.lng }),
    onSuccess: (result) => {
      if (!result.success) {
        Alert.alert('Fan Map', result.error || 'Could not add your plug.');
        return;
      }
      impactHaptic();
      setDisplayName('');
      setCity('');
      setCountry('');
      setMessage('');
      onRefresh();
    },
    onError: (error) => Alert.alert('Fan Map', error instanceof Error ? error.message : String(error)),
  });

  const tapMap = (event: any) => {
    const x = Math.max(0, Math.min(mapSize.width, event.nativeEvent.locationX));
    const y = Math.max(0, Math.min(mapSize.height, event.nativeEvent.locationY));
    setSelected({
      lng: (x / mapSize.width) * 360 - 180,
      lat: 90 - (y / mapSize.height) * 180,
    });
  };

  const markerStyle = (lat: number, lng: number) => ({
    left: `${((lng + 180) / 360) * 100}%` as any,
    top: `${((90 - lat) / 180) * 100}%` as any,
  });

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.mapSheet, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.mapHeader, { borderBottomColor: theme.colors.divider }]}>
          <View>
            <Text style={[styles.mapTitle, { color: theme.colors.text }]}>FAN MAP</Text>
            <Text style={[styles.mapMeta, { color: theme.colors.textMuted }]}>
              {stats ? `${formatCompact(stats.total)} plugs · ${formatCompact(stats.countries)} countries` : 'Plug in publicly with your scene.'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Fan Map" style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.mapContent} showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose your Fan Map location"
            style={[styles.mapCanvas, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onLayout={(event) => setMapSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
            onPress={tapMap}
          >
            <View style={styles.mapGridHorizontal} />
            <View style={styles.mapGridVertical} />
            <Text style={styles.mapWatermark}>PLUGGD MAP</Text>
            {plugs.map((plug) => (
              <Pressable key={plug.id} accessibilityRole="button" accessibilityLabel={`Open ${plug.display_name}`} style={[styles.mapMarker, markerStyle(plug.lat, plug.lng)]} onPress={(event) => {
                event.stopPropagation();
                onOpenProfile(plug);
              }}>
                {plug.avatar_url ? <PluggdImage uri={plug.avatar_url} style={styles.mapMarkerImage} /> : <View style={styles.mapMarkerDot} />}
              </Pressable>
            ))}
            <View style={[styles.selectedMarker, markerStyle(selected.lat, selected.lng)]}>
              <MaterialIcons name="add-location-alt" size={24} color="#08080C" />
            </View>
          </Pressable>

          <View style={[styles.plugForm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.formTitle, { color: theme.colors.text }]}>Plug yourself in</Text>
            <Text style={[styles.formBody, { color: theme.colors.textMuted }]}>Tap the map, add your city and leave your public hello-world comment.</Text>
            <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name" placeholderTextColor={theme.colors.textSubtle} style={[styles.formInput, { color: theme.colors.text, borderColor: theme.colors.border }]} />
            <View style={styles.formRow}>
              <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={theme.colors.textSubtle} style={[styles.formInputHalf, { color: theme.colors.text, borderColor: theme.colors.border }]} />
              <TextInput value={country} onChangeText={setCountry} placeholder="Country" placeholderTextColor={theme.colors.textSubtle} style={[styles.formInputHalf, { color: theme.colors.text, borderColor: theme.colors.border }]} />
            </View>
            <TextInput value={message} onChangeText={setMessage} placeholder="Say hello to the PLUGGD map..." placeholderTextColor={theme.colors.textSubtle} style={[styles.formInput, styles.messageInput, { color: theme.colors.text, borderColor: theme.colors.border }]} multiline maxLength={180} />
            <Pressable accessibilityRole="button" accessibilityLabel="Add my Fan Map plug" disabled={!user?.id || createPlug.isPending} style={[styles.plugButton, { backgroundColor: theme.colors.accent }, (!user?.id || createPlug.isPending) && styles.disabled]} onPress={() => createPlug.mutate()}>
              {createPlug.isPending ? <ActivityIndicator color="#08080C" /> : <Text style={styles.plugButtonText}>{user?.id ? 'Plug In' : 'Sign in to Plug In'}</Text>}
            </Pressable>
          </View>

          {loading ? <LoadingRows /> : plugs.slice(0, 30).map((plug) => (
            <CompactRow key={plug.id} icon="place" title={plug.display_name} meta={`${plug.city}, ${plug.country}${plug.message ? ` · ${plug.message}` : ''}`} cta="Open" onPress={() => onOpenProfile(plug)} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {action && onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} style={styles.sectionAction} onPress={onPress}>
          <Text style={[styles.sectionActionText, { color: theme.colors.accent }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HorizontalRail({ children }: { children: React.ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRail}>{children}</ScrollView>;
}

function CircleCard({ title, imageUrl, meta, onPress, action = 'Open' }: { title: string; imageUrl?: string | null; meta?: string | null; onPress: () => void; action?: string }) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${action} ${title}`} style={[styles.circleCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={onPress}>
      <View style={[styles.circleBanner, { backgroundColor: theme.colors.surfaceAlt }]}>
        {imageUrl ? <PluggdImage uri={imageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[styles.circleInitial, { color: theme.colors.text }]}>{contentInitials(title)}</Text>}
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{title}</Text>
      <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{meta || 'Circle'}</Text>
      <View style={[styles.cardCTA, { borderColor: theme.colors.border }]}>
        <Text style={[styles.cardCTAText, { color: theme.colors.text }]}>{action}</Text>
      </View>
    </Pressable>
  );
}

function FanMapCard({ stats, onPress }: { stats?: { total: number; countries: number; featured: number }; onPress: () => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open Fan Map" style={[styles.fanMapCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={onPress}>
      <View style={[styles.fanMapIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
        <MaterialIcons name="public" size={26} color={theme.colors.accent} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Fan Map</Text>
        <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]}>{stats ? `${formatCompact(stats.total)} plugs · ${formatCompact(stats.countries)} countries` : 'Plug in and leave your public hello-world moment.'}</Text>
      </View>
      <Text style={[styles.rowCTA, { color: theme.colors.accent }]}>OPEN MAP</Text>
    </Pressable>
  );
}

function EventHubRow({ title, imageUrl, meta, onPress }: { title: string; imageUrl?: string | null; meta: string; onPress: () => void }) {
  return <CompactRow icon="confirmation-number" title={title} meta={meta} cta="Open Hub" imageUrl={imageUrl} onPress={onPress} tall />;
}

function ThreadRow({ thread, onPress, chip }: { thread: BackstageThread; onPress: () => void; chip?: string }) {
  const meta = [thread.category, thread.comment_count ? `${formatCompact(thread.comment_count)} replies` : null].filter(Boolean).join(' · ') || 'Thread';
  return <CompactRow icon="forum" title={thread.title} meta={thread.body || meta} cta={chip || meta} onPress={onPress} />;
}

function CompactRow({
  icon,
  title,
  meta,
  cta,
  imageUrl,
  onPress,
  tall = false,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  meta?: string | null;
  cta?: string;
  imageUrl?: string | null;
  onPress: () => void;
  tall?: boolean;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} style={[styles.compactRow, tall && styles.eventHubRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
        {imageUrl ? <PluggdImage uri={imageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <MaterialIcons name={icon} size={20} color={theme.colors.accent} />}
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]} numberOfLines={2}>{meta}</Text> : null}
      </View>
      {cta ? <Text style={[styles.rowCTA, { color: theme.colors.accent }]} numberOfLines={1}>{cta}</Text> : <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />}
    </Pressable>
  );
}

function LibraryArtCard({ item, onRoute }: { item: SavedContentItem; onRoute: (route: string) => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={[styles.libraryArtCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => onRoute(item.route)}>
      <View style={[styles.libraryArtwork, { backgroundColor: theme.colors.surfaceAlt }]}>
        {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <MaterialIcons name={savedIcon(item.kind)} size={28} color={theme.colors.accent} />}
      </View>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
      <Text style={[styles.cardMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.subtitle || item.kind}</Text>
    </Pressable>
  );
}

function SavedRow({ item, onRoute }: { item: SavedContentItem; onRoute: (route: string) => void }) {
  return <CompactRow icon={savedIcon(item.kind)} title={item.title} meta={item.subtitle || item.kind.replace('_', ' ')} imageUrl={item.imageUrl} onPress={() => onRoute(item.route)} />;
}

function ActivityRow({ item, onRoute }: { item: MobileNotification; onRoute: (route: string) => void }) {
  return <CompactRow icon={item.read_at ? 'notifications-none' : 'notifications-active'} title={item.title || 'Activity'} meta={item.body || formatDate(item.created_at)} onPress={() => onRoute(item.route || '/notifications')} />;
}

function BuildFeedPanel({ onFind, onCircles }: { onFind: () => void; onCircles: () => void }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.buildPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Build your feed</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>Follow creators, join circles, and save music to make Community yours.</Text>
      <View style={styles.emptyActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Find creators" style={[styles.primarySmall, { backgroundColor: theme.colors.accent }]} onPress={onFind}>
          <Text style={styles.primarySmallText}>Find creators</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Join circles" style={[styles.secondarySmall, { borderColor: theme.colors.border }]} onPress={onCircles}>
          <Text style={[styles.secondarySmallText, { color: theme.colors.text }]}>Join circles</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyPanel({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.emptyPanel, compact && styles.emptyPanelCompact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text>
    </View>
  );
}

function RailEmpty({ title, body }: { title: string; body: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.railEmpty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text>
    </View>
  );
}

function LoadingRows() {
  const theme = usePluggdTheme();
  return (
    <View style={styles.loadingStack}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={`my-pluggd-loading-${index}`} style={[styles.loadingRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...pluggdTextStyles.appTitle, fontSize: 30, lineHeight: 34 },
  communityHeaderTitle: { flex: 1, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', right: 9, top: 9, width: 7, height: 7, borderRadius: 4 },
  avatarTap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontFamily: 'Satoshi-Bold', fontSize: 12 },
  tabRow: { height: 44, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: 16, zIndex: 10 },
  tabButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontFamily: 'Satoshi-Bold', fontSize: 14 },
  tabUnderline: { position: 'absolute', bottom: 0, width: 26, height: 3, borderRadius: 2 },
  feedStack: { paddingBottom: 10 },
  compactComposer: { marginHorizontal: 16, height: 54, borderRadius: 16, borderWidth: 1, paddingLeft: 10, paddingRight: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  composerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  composerPlaceholder: { flex: 1, fontSize: 15, fontFamily: 'Satoshi-Medium' },
  quickAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  feedSwitch: { height: 44, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: 16, marginTop: 4 },
  feedSwitchButton: { minHeight: 44, marginRight: 28, justifyContent: 'center' },
  feedSwitchLabel: { fontFamily: 'Satoshi-Bold', fontSize: 15 },
  feedUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  pageStack: { padding: 16, gap: 12 },
  sectionHeader: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Satoshi-Black', fontSize: 18, lineHeight: 22 },
  sectionAction: { minHeight: 44, justifyContent: 'center' },
  sectionActionText: { fontFamily: 'Satoshi-Bold', fontSize: 12, textTransform: 'uppercase' },
  horizontalRail: { gap: 10, paddingRight: 16 },
  circleCard: { width: 140, height: 170, borderRadius: 16, borderWidth: 1, padding: 10 },
  circleBanner: { height: 64, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  circleInitial: { fontFamily: 'Satoshi-Black', fontSize: 20 },
  cardTitle: { fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17 },
  cardMeta: { marginTop: 4, fontSize: 11, lineHeight: 14 },
  cardCTA: { position: 'absolute', left: 10, right: 10, bottom: 10, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardCTAText: { fontFamily: 'Satoshi-Bold', fontSize: 11, textTransform: 'uppercase' },
  fanMapCard: { minHeight: 90, borderRadius: 18, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fanMapIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compactRow: { minHeight: 80, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  eventHubRow: { minHeight: 152 },
  rowIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: 'Satoshi-Bold', fontSize: 15, lineHeight: 19 },
  rowMeta: { marginTop: 3, fontSize: 12, lineHeight: 16 },
  rowCTA: { maxWidth: 92, fontFamily: 'Satoshi-Bold', fontSize: 11, textTransform: 'uppercase' },
  libraryArtCard: { width: 132, height: 180, borderRadius: 16, borderWidth: 1, padding: 9 },
  libraryArtwork: { width: '100%', height: 112, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeCard: { width: 148, height: 104, borderRadius: 16, borderWidth: 1, borderColor: '#1F1F2E', backgroundColor: '#12121A', padding: 12, justifyContent: 'center' },
  badgeTitle: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 14, marginTop: 8 },
  badgeMeta: { color: '#8E8E9F', fontSize: 11, marginTop: 3 },
  filterRail: { minHeight: 44, gap: 8, paddingRight: 16 },
  filterPill: { height: 34, minWidth: 70, borderRadius: 17, borderWidth: 1, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  filterPillText: { fontFamily: 'Satoshi-Bold', fontSize: 12 },
  activitySection: { gap: 8 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end', padding: 16 },
  menuSheet: { borderRadius: 24, borderWidth: 1, padding: 12, paddingBottom: 18 },
  menuTitle: { fontFamily: 'Sora-Bold', fontSize: 28, lineHeight: 32, paddingHorizontal: 8, paddingVertical: 10 },
  menuItem: { minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8 },
  menuItemText: { flex: 1, fontFamily: 'Satoshi-Bold', fontSize: 15 },
  buildPanel: { marginHorizontal: 16, marginTop: 12, borderRadius: 18, borderWidth: 1, padding: 16, gap: 9 },
  emptyActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primarySmall: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primarySmallText: { color: '#08080C', fontFamily: 'Satoshi-Bold', fontSize: 13 },
  secondarySmall: { minHeight: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  secondarySmallText: { fontFamily: 'Satoshi-Bold', fontSize: 13 },
  emptyPanel: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 7 },
  emptyPanelCompact: { padding: 12 },
  emptyTitle: { fontFamily: 'Satoshi-Bold', fontSize: 16 },
  emptyBody: { fontSize: 13, lineHeight: 19 },
  railEmpty: { width: 190, minHeight: 150, borderRadius: 16, borderWidth: 1, padding: 14, justifyContent: 'center' },
  loadingStack: { gap: 10 },
  loadingRow: { height: 112, borderRadius: 16, borderWidth: 1, opacity: 0.72 },
  disabled: { opacity: 0.48 },
  mapSheet: { flex: 1 },
  mapHeader: { minHeight: 88, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapTitle: { fontFamily: 'Sora-Bold', fontSize: 32, lineHeight: 36 },
  mapMeta: { marginTop: 2, fontSize: 12 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mapContent: { padding: 16, gap: 12, paddingBottom: 42 },
  mapCanvas: { height: 360, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  mapGridHorizontal: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  mapGridVertical: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  mapWatermark: { position: 'absolute', left: 16, top: 16, color: 'rgba(255,255,255,0.16)', fontFamily: 'Sora-Bold', fontSize: 30 },
  mapMarker: { position: 'absolute', marginLeft: -14, marginTop: -14, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FF5A00', backgroundColor: '#08080C', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  mapMarkerImage: { width: '100%', height: '100%' },
  mapMarkerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF5A00' },
  selectedMarker: { position: 'absolute', marginLeft: -18, marginTop: -18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF5A00', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#08080C' },
  plugForm: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 10 },
  formTitle: { fontFamily: 'Satoshi-Black', fontSize: 18 },
  formBody: { fontSize: 12, lineHeight: 17 },
  formInput: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  formRow: { flexDirection: 'row', gap: 8 },
  formInputHalf: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  messageInput: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  plugButton: { minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  plugButtonText: { color: '#08080C', fontFamily: 'Satoshi-Bold', fontSize: 14 },
});
