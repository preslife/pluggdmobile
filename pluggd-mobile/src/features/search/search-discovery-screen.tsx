import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Linking,
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
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import {
  contentInitials,
  formatCompact,
  formatDate,
  releasePlayableUrl,
  toTrack,
  type BeatItem,
  type EventItem,
  type MixItem,
  type ProfileItem,
  type ReleaseItem,
} from '../../lib/mobileContent';
import {
  useBackstage,
  useEventLayer,
  useHomeFeed,
  useLiveRooms,
  useUniversalSearch,
  type BackstageCommunity,
  type LiveRoomItem,
  type VideoItem,
} from '../culture/useCultureData';

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

const FILTERS = ['Top', 'Creators', 'Tracks', 'Mixes', 'Videos', 'Events', 'Communities', 'Users', 'Beats', 'Live'] as const;
type SearchFilter = (typeof FILTERS)[number];

const GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#251A1A', '#15151D', '#08080C'],
  ['#182B33', '#12121A', '#08080C'],
  ['#2B2248', '#13131B', '#08080C'],
  ['#122E26', '#12121A', '#08080C'],
  ['#3A2116', '#15151D', '#08080C'],
];

function hashIndex(value: string | null | undefined, modulo: number) {
  const source = value || 'pluggd-search';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'PLUGGD user';
}

function profileSubtitle(profile: ProfileItem) {
  if (profile.username) return `@${profile.username}`;
  return profile.city || profile.user_type || profile.profile_type || 'PLUGGD';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/user/${profile.user_id}`;
  return '/search';
}

function communityRoute(community: BackstageCommunity) {
  return `/backstage/${community.slug || community.id}`;
}

function imageSourceForCommunity(community: BackstageCommunity) {
  return community.cover_image_url || community.avatar_url || null;
}

function roomSubtitle(room: LiveRoomItem) {
  const status = room.status ? room.status.replace(/_/g, ' ') : 'Live room';
  const viewers = Number(room.viewer_count ?? 0);
  return viewers > 0 ? `${formatCompact(viewers)} watching` : status;
}

function resultCountLabel(count: number) {
  if (count === 0) return 'No results';
  if (count === 1) return '1 result';
  return `${formatCompact(count)} results`;
}

function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const label = user?.email || 'PLUGGD';

  const go = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };

  return (
    <View style={[styles.header, { height: Math.max(insets.top + 72, 112), paddingTop: insets.top + 18 }]}>
      <Text style={styles.headerTitle}>SEARCH</Text>
      <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => go('/wallet')} style={styles.headerIcon}>
          <MaterialIcons name="account-balance-wallet" size={21} color={COLORS.soft} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => go('/profile')} style={styles.avatarButton}>
          <Text style={styles.avatarInitials}>{contentInitials(label)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SearchInput({
  term,
  onTerm,
}: {
  term: string;
  onTerm: (value: string) => void;
}) {
  return (
    <View style={styles.searchInputShell}>
      <MaterialIcons name="search" size={22} color={COLORS.muted} />
      <TextInput
        value={term}
        onChangeText={onTerm}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Artists, tracks, events, communities"
        placeholderTextColor={COLORS.dim}
        returnKeyType="search"
        style={styles.searchInput}
      />
      {term.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onTerm('')} hitSlop={10}>
          <MaterialIcons name="close" size={20} color={COLORS.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function FilterPills({
  active,
  onChange,
}: {
  active: SearchFilter;
  onChange: (filter: SearchFilter) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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

function Artwork({
  uri,
  title,
  size = 54,
  radius = 12,
}: {
  uri?: string | null;
  title: string;
  size?: number;
  radius?: number;
}) {
  const colors = GRADIENTS[hashIndex(title, GRADIENTS.length)];
  return (
    <LinearGradient colors={colors as any} style={[styles.artwork, { width: size, height: size, borderRadius: radius }]}>
      {uri ? <PluggdImage uri={uri} style={styles.imageFill} resizeMode="cover" /> : null}
      {!uri ? <Text style={styles.artworkInitials}>{contentInitials(title)}</Text> : null}
    </LinearGradient>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof count === 'number' ? <Text style={styles.sectionCount}>{resultCountLabel(count)}</Text> : null}
    </View>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyBlock}>
      <View style={styles.emptyIcon}>
        <MaterialIcons name="travel-explore" size={22} color={COLORS.orange} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function DiscoveryTile({
  title,
  subtitle,
  imageUrl,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.discoveryTile}>
      <Artwork uri={imageUrl} title={title} size={82} radius={16} />
      <View style={styles.discoveryCopy}>
        <View style={styles.discoveryIconRow}>
          <MaterialIcons name={icon} size={15} color={COLORS.orange} />
          <Text style={styles.discoveryMeta} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Text style={styles.discoveryTitle} numberOfLines={2}>{title}</Text>
      </View>
    </Pressable>
  );
}

function ResultRow({
  title,
  subtitle,
  imageUrl,
  icon,
  rightLabel,
  onPress,
  action,
}: {
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  icon: keyof typeof MaterialIcons.glyphMap;
  rightLabel?: string;
  onPress: () => void;
  action?: React.ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.resultRow}>
      <Artwork uri={imageUrl} title={title} size={52} radius={13} />
      <View style={styles.resultCopy}>
        <View style={styles.resultMetaRow}>
          <MaterialIcons name={icon} size={14} color={COLORS.muted} />
          <Text style={styles.resultMeta} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Text style={styles.resultTitle} numberOfLines={1}>{title}</Text>
      </View>
      {rightLabel ? <Text style={styles.rightLabel}>{rightLabel}</Text> : null}
      {action ?? <MaterialIcons name="chevron-right" size={22} color={COLORS.dim} />}
    </Pressable>
  );
}

function ReleaseRow({ release }: { release: ReleaseItem }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const playable = releasePlayableUrl(release);
  return (
    <ResultRow
      title={release.title || 'Untitled release'}
      subtitle={release.artist || release.genre || 'Release'}
      imageUrl={release.cover_art_url}
      icon="music-note"
      onPress={() => router.push(`/release/${release.id}` as any)}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${release.title || 'release'}`}
          disabled={!playable}
          onPress={(event) => {
            event.stopPropagation();
            const track = toTrack(release, 'release');
            if (!track) return;
            impactHaptic();
            playTrack(track);
          }}
          style={[styles.playButton, !playable && styles.disabledButton]}
        >
          <MaterialIcons name="play-arrow" size={21} color={COLORS.canvas} />
        </Pressable>
      }
    />
  );
}

function MixRow({ mix }: { mix: MixItem }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const playable = Boolean(mix.audio_url);
  return (
    <ResultRow
      title={mix.title || 'Untitled mix'}
      subtitle={mix.city || mix.event_name || 'Mix'}
      imageUrl={mix.cover_url}
      icon="graphic-eq"
      onPress={() => router.push(`/mixes/${mix.slug || mix.id}` as any)}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${mix.title || 'mix'}`}
          disabled={!playable}
          onPress={(event) => {
            event.stopPropagation();
            const track = toTrack(mix, 'mix');
            if (!track) return;
            impactHaptic();
            playTrack(track);
          }}
          style={[styles.playButton, !playable && styles.disabledButton]}
        >
          <MaterialIcons name="play-arrow" size={21} color={COLORS.canvas} />
        </Pressable>
      }
    />
  );
}

function BeatRow({ beat }: { beat: BeatItem }) {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const playable = Boolean(beat.tagged_url || beat.audio_url);
  return (
    <ResultRow
      title={beat.title || 'Untitled beat'}
      subtitle={beat.producer_name || beat.genre || 'Producer drop'}
      imageUrl={beat.image_url}
      icon="album"
      onPress={() => router.push(`/beat/${beat.id}` as any)}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${beat.title || 'beat'}`}
          disabled={!playable}
          onPress={(event) => {
            event.stopPropagation();
            const track = toTrack(beat, 'beat');
            if (!track) return;
            impactHaptic();
            playTrack(track);
          }}
          style={[styles.playButton, !playable && styles.disabledButton]}
        >
          <MaterialIcons name="play-arrow" size={21} color={COLORS.canvas} />
        </Pressable>
      }
    />
  );
}

function EventRow({ event }: { event: EventItem }) {
  const router = useRouter();
  const ticketed = Number(event.price_cents ?? 0) > 0;
  return (
    <ResultRow
      title={event.title || 'Untitled event'}
      subtitle={`${formatDate(event.starts_at)} · ${event.location || 'Location TBA'}`}
      imageUrl={event.cover_image_url}
      icon="confirmation-number"
      rightLabel={ticketed ? 'Tickets' : 'RSVP'}
      onPress={() => router.push(`/events/${event.id}` as any)}
    />
  );
}

function ProfileRow({ profile, userMode = false }: { profile: ProfileItem; userMode?: boolean }) {
  const router = useRouter();
  const name = profileName(profile);
  return (
    <ResultRow
      title={name}
      subtitle={profileSubtitle(profile)}
      imageUrl={profile.avatar_url}
      icon={userMode ? 'person' : 'verified'}
      onPress={() => router.push(profileRoute(profile) as any)}
    />
  );
}

function CommunityRow({ community }: { community: BackstageCommunity }) {
  const router = useRouter();
  return (
    <ResultRow
      title={community.title}
      subtitle={community.description || community.hub_type || 'Backstage community'}
      imageUrl={imageSourceForCommunity(community)}
      icon="groups"
      onPress={() => router.push(communityRoute(community) as any)}
    />
  );
}

function LiveRow({ room }: { room: LiveRoomItem }) {
  const router = useRouter();
  return (
    <ResultRow
      title={room.title || 'Live room'}
      subtitle={roomSubtitle(room)}
      imageUrl={room.thumbnail_url || room.creator_avatar_url}
      icon="videocam"
      rightLabel={room.status === 'live' ? 'Live' : undefined}
      onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
    />
  );
}

function VideoRow({ video }: { video: VideoItem }) {
  return (
    <ResultRow
      title={video.title || 'Untitled video'}
      subtitle={video.description || 'Video'}
      imageUrl={video.thumbnail_url}
      icon="smart-display"
      onPress={() => {
        if (video.youtube_url) void Linking.openURL(video.youtube_url);
      }}
    />
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.resultSection}>
      <SectionHeader title={title} count={count} />
      <View style={styles.resultList}>{children}</View>
    </View>
  );
}

export function SearchDiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [term, setTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('Top');
  const normalized = term.trim();
  const hasSearch = normalized.length >= 2;
  const search = useUniversalSearch(normalized);
  const home = useHomeFeed();
  const events = useEventLayer(12);
  const backstage = useBackstage();
  const live = useLiveRooms();

  const discoveryEvents = events.data?.length ? events.data : home.data?.events ?? [];
  const discoveryCreators = home.data?.profiles ?? [];
  const discoveryTracks = home.data?.releases ?? [];
  const discoveryBeats = home.data?.beats ?? [];
  const discoveryCommunities = backstage.data?.communities ?? [];
  const discoveryLive = live.data ?? [];

  const results = search.data;
  const totals = useMemo(() => {
    if (!results) return 0;
    return (
      results.creators.length +
      results.tracks.length +
      results.mixes.length +
      results.videos.length +
      results.events.length +
      results.communities.length +
      results.users.length +
      results.beats.length +
      results.liveStreams.length
    );
  }, [results]);

  const refreshing = home.isRefetching || events.isRefetching || backstage.isRefetching || live.isRefetching || search.isRefetching;
  const bottomPadding = Math.max(insets.bottom + 154, 176);

  const refresh = () => {
    void home.refetch();
    void events.refetch();
    void backstage.refetch();
    void live.refetch();
    if (hasSearch) void search.refetch();
  };

  const show = (filter: SearchFilter, count?: number) => activeFilter === 'Top' || activeFilter === filter || Boolean(count && activeFilter === filter);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.canvas, '#0A0A10', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.orange} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchBlock}>
          <SearchInput term={term} onTerm={setTerm} />
          <FilterPills active={activeFilter} onChange={setActiveFilter} />
        </View>

        {!hasSearch ? (
          <>
            <View style={styles.intentPanel}>
              <Text style={styles.intentEyebrow}>UNIVERSAL DISCOVERY</Text>
              <Text style={styles.intentTitle}>Find the people, tracks, events and rooms moving PLUGGD right now.</Text>
              <View style={styles.intentChips}>
                <Text style={styles.intentChip}>Events</Text>
                <Text style={styles.intentChip}>Creators</Text>
                <Text style={styles.intentChip}>Backstage</Text>
                <Text style={styles.intentChip}>Live</Text>
              </View>
            </View>

            <ResultSection title="Happening Near The Culture">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRail}>
                {discoveryEvents.slice(0, 6).map((event) => (
                  <DiscoveryTile
                    key={`event-${event.id}`}
                    title={event.title || 'Untitled event'}
                    subtitle={`${formatDate(event.starts_at)} · ${event.location || 'Event'}`}
                    imageUrl={event.cover_image_url}
                    icon="confirmation-number"
                    onPress={() => router.push(`/events/${event.id}` as any)}
                  />
                ))}
                {discoveryLive.slice(0, 4).map((room) => (
                  <DiscoveryTile
                    key={`live-${room.id}`}
                    title={room.title || 'Live room'}
                    subtitle={roomSubtitle(room)}
                    imageUrl={room.thumbnail_url || room.creator_avatar_url}
                    icon="videocam"
                    onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
                  />
                ))}
              </ScrollView>
              {discoveryEvents.length === 0 && discoveryLive.length === 0 ? (
                <EmptyBlock title="Search artists, tracks, events, communities and fans." body="Live events and active rooms will appear here when available." />
              ) : null}
            </ResultSection>

            <ResultSection title="Sounds And Producers">
              <View style={styles.resultList}>
                {discoveryTracks.slice(0, 3).map((release) => <ReleaseRow key={`release-${release.id}`} release={release} />)}
                {discoveryBeats.slice(0, 2).map((beat) => <BeatRow key={`beat-${beat.id}`} beat={beat} />)}
              </View>
              {discoveryTracks.length === 0 && discoveryBeats.length === 0 ? (
                <EmptyBlock title="Your sound is loading." body="Tracks, mixes and producer drops will appear as creators publish them." />
              ) : null}
            </ResultSection>

            <ResultSection title="Communities And Creators">
              <View style={styles.resultList}>
                {discoveryCommunities.slice(0, 3).map((community) => <CommunityRow key={`community-${community.id}`} community={community} />)}
                {discoveryCreators.slice(0, 4).map((profile) => <ProfileRow key={`profile-${profile.user_id || profile.id || profile.username}`} profile={profile} />)}
              </View>
              {discoveryCommunities.length === 0 && discoveryCreators.length === 0 ? (
                <EmptyBlock title="No communities surfaced yet." body="Creator backstages and profiles will appear here when the backend returns them." />
              ) : null}
            </ResultSection>
          </>
        ) : null}

        {hasSearch && search.isLoading ? (
          <PremiumSkeleton compact label="Searching PLUGGD..." style={styles.loadingBlock} />
        ) : null}

        {hasSearch && !search.isLoading && totals === 0 ? (
          <EmptyBlock title="No results yet." body="Try another artist, track, city, event, community, beat or fan handle." />
        ) : null}

        {hasSearch && results ? (
          <>
            <View style={styles.summaryBar}>
              <Text style={styles.summaryTitle}>{resultCountLabel(totals)}</Text>
              <Text style={styles.summaryBody} numberOfLines={1}>Grouped across music, events, live, communities and people.</Text>
            </View>

            {show('Events', results.events.length) && results.events.length > 0 ? (
              <ResultSection title="Events" count={results.events.length}>
                {results.events.slice(0, activeFilter === 'Events' ? 12 : 4).map((event) => <EventRow key={event.id} event={event} />)}
              </ResultSection>
            ) : null}

            {show('Creators', results.creators.length) && results.creators.length > 0 ? (
              <ResultSection title="Creators" count={results.creators.length}>
                {results.creators.slice(0, activeFilter === 'Creators' ? 12 : 4).map((profile) => (
                  <ProfileRow key={`creator-${profile.user_id || profile.id || profile.username}`} profile={profile} />
                ))}
              </ResultSection>
            ) : null}

            {show('Tracks', results.tracks.length) && results.tracks.length > 0 ? (
              <ResultSection title="Tracks" count={results.tracks.length}>
                {results.tracks.slice(0, activeFilter === 'Tracks' ? 12 : 4).map((release) => <ReleaseRow key={release.id} release={release} />)}
              </ResultSection>
            ) : null}

            {show('Mixes', results.mixes.length) && results.mixes.length > 0 ? (
              <ResultSection title="Mixes" count={results.mixes.length}>
                {results.mixes.slice(0, activeFilter === 'Mixes' ? 12 : 4).map((mix) => <MixRow key={mix.id} mix={mix} />)}
              </ResultSection>
            ) : null}

            {show('Videos', results.videos.length) && results.videos.length > 0 ? (
              <ResultSection title="Videos" count={results.videos.length}>
                {results.videos.slice(0, activeFilter === 'Videos' ? 12 : 4).map((video) => <VideoRow key={video.id} video={video} />)}
              </ResultSection>
            ) : null}

            {show('Communities', results.communities.length) && results.communities.length > 0 ? (
              <ResultSection title="Communities" count={results.communities.length}>
                {results.communities.slice(0, activeFilter === 'Communities' ? 12 : 4).map((community) => (
                  <CommunityRow key={community.id} community={community} />
                ))}
              </ResultSection>
            ) : null}

            {show('Beats', results.beats.length) && results.beats.length > 0 ? (
              <ResultSection title="Beats / Producers" count={results.beats.length}>
                {results.beats.slice(0, activeFilter === 'Beats' ? 12 : 4).map((beat) => <BeatRow key={beat.id} beat={beat} />)}
              </ResultSection>
            ) : null}

            {show('Live', results.liveStreams.length) && results.liveStreams.length > 0 ? (
              <ResultSection title="Live Streams" count={results.liveStreams.length}>
                {results.liveStreams.slice(0, activeFilter === 'Live' ? 12 : 4).map((room) => <LiveRow key={room.id} room={room} />)}
              </ResultSection>
            ) : null}

            {show('Users', results.users.length) && results.users.length > 0 ? (
              <ResultSection title="Users" count={results.users.length}>
                {results.users.slice(0, activeFilter === 'Users' ? 12 : 4).map((profile) => (
                  <ProfileRow key={`user-${profile.user_id || profile.id || profile.username}`} profile={profile} userMode />
                ))}
              </ResultSection>
            ) : null}
          </>
        ) : null}
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
    backgroundColor: 'rgba(8,8,12,0.94)',
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
  searchBlock: {
    gap: 14,
  },
  searchInputShell: {
    marginHorizontal: 16,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(18,18,26,0.94)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    height: 54,
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(31,31,46,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    borderColor: 'rgba(255,90,0,0.74)',
    backgroundColor: 'rgba(255,90,0,0.15)',
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  intentPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 26,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(18,18,26,0.92)',
    padding: 16,
    gap: 10,
  },
  intentEyebrow: {
    color: COLORS.orange,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  intentTitle: {
    color: COLORS.white,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  intentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  intentChip: {
    overflow: 'hidden',
    color: COLORS.soft,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surface2,
  },
  resultSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  discoveryRail: {
    paddingHorizontal: 16,
    gap: 12,
  },
  discoveryTile: {
    width: 212,
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 10,
    flexDirection: 'row',
    gap: 11,
  },
  discoveryCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  discoveryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  discoveryMeta: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  discoveryTitle: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  resultList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  resultRow: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  resultCopy: {
    flex: 1,
    gap: 5,
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resultMeta: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  resultTitle: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  rightLabel: {
    overflow: 'hidden',
    color: '#FFB08A',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(255,90,0,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.24)',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  disabledButton: {
    opacity: 0.36,
  },
  artwork: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
  artworkInitials: {
    color: COLORS.soft,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  emptyBlock: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(18,18,26,0.82)',
    padding: 16,
    gap: 8,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,90,0,0.12)',
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  emptyBody: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  loadingBlock: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
    height: 54,
    borderRadius: 16,
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
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
  },
  summaryBar: {
    marginHorizontal: 16,
    marginBottom: 24,
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(18,18,26,0.86)',
    padding: 12,
    gap: 5,
  },
  summaryTitle: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  summaryBody: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
});
