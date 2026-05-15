import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
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
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import {
  useBackstage,
  useHomeFeed,
  useLiveRooms,
  type BackstageThread,
  type LiveRoomItem,
} from '../culture/useCultureData';
import {
  contentInitials,
  formatCompact,
  formatDate,
  releasePlayableUrl,
  toTrack,
  type EventItem,
  type FeedBundle,
  type MixItem,
  type ProfileItem,
  type ReleaseItem,
} from '../../lib/mobileContent';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  surface2: '#1F1F2E',
  orange: '#FF5A00',
  live: '#FF4757',
  text: '#FFFFFF',
  textSoft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

type DashboardDrop = {
  id: string;
  kind: 'release' | 'mix';
  title: string;
  artist: string;
  imageUrl?: string | null;
  route: string;
  colors: readonly [string, string];
  waveform: number[];
  release?: ReleaseItem;
  mix?: MixItem;
  playable: boolean;
};

type CreatorRecommendation = {
  id: string;
  name: string;
  handle: string;
  route: string;
  imageUrl?: string | null;
};

type HeroContent = {
  title: string;
  badge: string;
  metric: string;
  route: string;
  imageUrl?: string | null;
  colors: readonly [string, string, string];
  live: boolean;
};

const PALETTES: readonly (readonly [string, string])[] = [
  ['#7C3AED', '#FF5A00'],
  ['#FF4757', '#7C3AED'],
  ['#00A3FF', '#FF5A00'],
  ['#1F4D42', '#FF4757'],
  ['#3F2616', '#FF5A00'],
];

const POSTER_PALETTES: readonly (readonly [string, string, string])[] = [
  ['#FF5A00', '#7C3AED', '#12121A'],
  ['#F44C7F', '#FF5A00', '#101016'],
  ['#00A3FF', '#FF5A00', '#111117'],
  ['#2B4D5A', '#151820', '#FF5A00'],
];

function hashIndex(value: string | null | undefined, modulo: number) {
  const source = value || 'pluggd';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function colorsFor(id: string | null | undefined) {
  return PALETTES[hashIndex(id, PALETTES.length)];
}

function posterColorsFor(id: string | null | undefined) {
  return POSTER_PALETTES[hashIndex(id, POSTER_PALETTES.length)];
}

function waveformFor(id: string) {
  const seed = hashIndex(id, 97) + 3;
  return Array.from({ length: 14 }, (_, index) => 10 + ((seed * (index + 5)) % 34));
}

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'Creator';
}

function profileHandle(profile: ProfileItem) {
  return profile.username ? `@${profile.username}` : profile.primary_genre || profile.city || 'PLUGGD';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/user/${profile.user_id}`;
  return '/search';
}

function mapCreators(bundle?: FeedBundle): CreatorRecommendation[] {
  if (!bundle) return [];
  const fromProfiles = bundle.profiles.map<CreatorRecommendation>((profile) => {
    const name = profileName(profile);
    return {
      id: profile.user_id || profile.id || profile.username || name,
      name,
      handle: profileHandle(profile),
      route: profileRoute(profile),
      imageUrl: profile.avatar_url,
    };
  });

  const seen = new Set(fromProfiles.map((creator) => creator.name.toLowerCase()));
  const fromReleases = bundle.releases.reduce<CreatorRecommendation[]>((items, release) => {
    const artist = release.artist?.trim();
    if (!artist || seen.has(artist.toLowerCase())) return items;
    seen.add(artist.toLowerCase());
    items.push({
      id: `release-artist-${release.id}`,
      name: artist,
      handle: release.genre || 'Release artist',
      route: `/release/${release.id}`,
      imageUrl: release.cover_art_url,
    });
    return items;
  }, []);

  return [...fromProfiles, ...fromReleases].slice(0, 10);
}


function eventCountdown(startsAt?: string | null) {
  if (!startsAt) return 'Date TBA';
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return 'Date TBA';
  const diffMs = start - Date.now();
  if (diffMs <= 0) return 'Happening now';
  const minutes = Math.floor(diffMs / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return `${days.toString().padStart(2, '0')}d : ${hours.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m`;
}

function locationSummary(location?: string | null) {
  if (!location) return 'Location TBA';
  return location.split(',').map((part) => part.trim()).filter(Boolean).slice(0, 2).join(', ');
}

function liveViewerLabel(room: LiveRoomItem) {
  const count = Number(room.viewer_count ?? 0);
  if (Number.isFinite(count) && count > 0) return formatCompact(count);
  return null;
}

function mapDrops(bundle?: FeedBundle): DashboardDrop[] {
  if (!bundle) return [];
  const releases = bundle.releases.slice(0, 4).map<DashboardDrop>((release) => {
    const url = releasePlayableUrl(release);
    return {
      id: release.id,
      kind: 'release',
      title: release.title || 'Untitled release',
      artist: release.artist || 'Creator',
      imageUrl: release.cover_art_url,
      route: `/release/${release.id}`,
      colors: colorsFor(release.id),
      waveform: waveformFor(release.id),
      release,
      playable: Boolean(url),
    };
  });

  const mixes = bundle.mixes.slice(0, 3).map<DashboardDrop>((mix) => ({
    id: mix.id,
    kind: 'mix',
    title: mix.title || 'Untitled mix',
    artist: mix.city || mix.event_name || 'Mix',
    imageUrl: mix.cover_url,
    route: `/mixes/${mix.id}`,
    colors: colorsFor(mix.id),
    waveform: waveformFor(mix.id),
    mix,
    playable: Boolean(mix.audio_url),
  }));

  return [...releases, ...mixes].slice(0, 3);
}

function resolveHero(liveRooms: LiveRoomItem[], bundle?: FeedBundle, drops: DashboardDrop[] = []): HeroContent {
  const live = liveRooms.find((room) => room.status === 'live') ?? liveRooms[0];
  if (live) {
    const viewers = liveViewerLabel(live);
    return {
      title: live.title || 'Live room',
      badge: live.status === 'live' ? 'LIVE BROADCAST' : 'UPCOMING LIVE',
      metric: viewers ? `${viewers} TUNED IN` : live.status === 'live' ? 'LIVE NOW' : formatDate(live.scheduled_for, 'Scheduled'),
      route: '/live',
      imageUrl: live.thumbnail_url || live.creator_avatar_url,
      colors: posterColorsFor(live.id),
      live: live.status === 'live',
    };
  }

  const event = bundle?.events[0];
  if (event) {
    return {
      title: event.title || 'Upcoming event',
      badge: 'UPCOMING EVENT',
      metric: `${formatDate(event.starts_at)} · ${locationSummary(event.location)}`,
      route: `/events/${event.id}`,
      imageUrl: event.cover_image_url,
      colors: posterColorsFor(event.id),
      live: false,
    };
  }

  const drop = drops[0];
  if (drop) {
    return {
      title: drop.title,
      badge: 'NEW AUDIO DROP',
      metric: drop.artist,
      route: drop.route,
      imageUrl: drop.imageUrl,
      colors: [drop.colors[0], COLORS.canvas, drop.colors[1]],
      live: false,
    };
  }

  return {
    title: 'Follow creators to shape your feed',
    badge: 'PLUGGD LIVE',
    metric: 'Real live, event and audio data will appear here.',
    route: '/search',
    colors: ['#1A2B32', COLORS.canvas, '#2B1811'],
    live: false,
  };
}

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon} size={17} color={COLORS.muted} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function HeroBanner({ hero }: { hero: HeroContent }) {
  const router = useRouter();
  const zoom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, {
          toValue: 1,
          duration: 8500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(zoom, {
          toValue: 0,
          duration: 8500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [zoom]);

  const scale = zoom.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${hero.title}`}
      onPress={() => {
        selectionHaptic();
        router.push(hero.route as any);
      }}
      style={styles.hero}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={hero.colors as any}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {hero.imageUrl ? <PluggdImage uri={hero.imageUrl} style={styles.coverImage} /> : null}
        <View style={[styles.stageLight, styles.stageLightLeft]} />
        <View style={[styles.stageLight, styles.stageLightRight]} />
        <View style={styles.crowdLine}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View
              key={`crowd-${index}`}
              style={[
                styles.crowdSilhouette,
                { height: 22 + ((index * 7) % 24), opacity: 0.18 + (index % 5) * 0.05 },
              ]}
            />
          ))}
        </View>
      </Animated.View>
      <LinearGradient
        colors={['rgba(8,8,12,0.02)', 'rgba(8,8,12,0.54)', 'rgba(8,8,12,0.94)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.heroCopy}>
        <View style={styles.liveBadge}>
          <View style={[styles.liveDot, !hero.live && styles.liveDotMuted]} />
          <Text style={styles.liveBadgeText}>{hero.badge}</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {hero.title.toUpperCase()}
        </Text>
        <Text style={styles.heroMetric} numberOfLines={1}>
          {hero.metric.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

function LiveNowShelf({ rooms, loading }: { rooms: LiveRoomItem[]; loading: boolean }) {
  const router = useRouter();
  const liveRooms = rooms.filter((room) => room.status === 'live').slice(0, 8);

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader icon="settings-input-antenna" title="LIVE NOW ON THE STAGE" />
      {loading ? <InlineLoading /> : null}
      {!loading && liveRooms.length === 0 ? (
        <EmptyCard title="No live rooms right now." body="Upcoming creator sessions will appear here as soon as they are scheduled." />
      ) : null}
      {liveRooms.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveShelf}>
          {liveRooms.map((item) => {
            const viewers = liveViewerLabel(item);
            const colors = posterColorsFor(item.id);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Join ${item.title || 'live room'}`}
                style={styles.liveCard}
                onPress={() => {
                  selectionHaptic();
                  router.push('/live' as any);
                }}
              >
                <LinearGradient colors={colors as any} style={StyleSheet.absoluteFillObject} />
                {item.thumbnail_url || item.creator_avatar_url ? (
                  <PluggdImage uri={item.thumbnail_url || item.creator_avatar_url || ''} style={styles.coverImage} />
                ) : null}
                <View style={styles.liveAvatarMark}>
                  <Text style={styles.initialsText}>{contentInitials(item.creator_name || item.title)}</Text>
                </View>
                {viewers ? (
                  <View style={styles.liveViewerPill}>
                    <View style={styles.tinyLiveDot} />
                    <Text style={styles.liveViewerText}>{viewers}</Text>
                  </View>
                ) : null}
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
                  style={styles.liveCardFade}
                />
                <View style={styles.liveCardText}>
                  <Text style={styles.liveCardTitle} numberOfLines={1}>
                    {item.title || 'Live room'}
                  </Text>
                  <Text style={styles.liveCardHandle} numberOfLines={1}>
                    {item.creator_name || item.category || 'Live'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function PosterArt({
  colors,
  imageUrl,
  title,
}: {
  colors: readonly [string, string, string];
  imageUrl?: string | null;
  title: string;
}) {
  return (
    <View style={styles.poster}>
      <LinearGradient colors={colors as any} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      {imageUrl ? <PluggdImage uri={imageUrl} style={styles.coverImage} /> : null}
      {!imageUrl ? (
        <>
          <View style={styles.posterSun} />
          <View style={styles.posterMic}>
            <MaterialIcons name="settings-input-antenna" size={34} color={COLORS.text} />
          </View>
          <View style={styles.posterCrowd}>
            {Array.from({ length: 9 }).map((_, index) => (
              <View key={`poster-${index}`} style={[styles.posterCrowdBar, { height: 18 + ((index * 5) % 22) }]} />
            ))}
          </View>
          <Text style={styles.posterInitials}>{contentInitials(title)}</Text>
        </>
      ) : null}
    </View>
  );
}

function EventsShelf({ events, loading }: { events: EventItem[]; loading: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader icon="confirmation-number" title="EVENTS NEAR YOU" />
      {loading ? <InlineLoading /> : null}
      {!loading && events.length === 0 ? (
        <EmptyCard title="No upcoming events yet." body="Local shows, ticket drops and livestream tie-ins will appear here when the backend has events." />
      ) : null}
      {events.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventShelf}>
          {events.slice(0, 8).map((event) => {
            const title = event.title || 'Upcoming event';
            return (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${title}`}
                style={styles.eventCard}
                onPress={() => {
                  selectionHaptic();
                  router.push(`/events/${event.id}` as any);
                }}
              >
                <PosterArt colors={posterColorsFor(event.id)} imageUrl={event.cover_image_url} title={title} />
                <View style={styles.eventCopy}>
                  <Text style={styles.eventSeries} numberOfLines={1}>
                    {locationSummary(event.location)}
                  </Text>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {title.toUpperCase()}
                  </Text>
                  <View style={styles.countdownRow}>
                    <MaterialIcons name="access-time" size={15} color={COLORS.muted} />
                    <Text style={styles.countdown}>{eventCountdown(event.starts_at)}</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open tickets for ${title}`}
                  style={styles.ticketButton}
                  onPress={(eventPress) => {
                    eventPress.stopPropagation();
                    impactHaptic();
                    router.push(`/events/${event.id}` as any);
                  }}
                >
                  <Text style={styles.ticketButtonText}>GET TICKETS</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function Waveform({ values, active }: { values: number[]; active: boolean }) {
  const played = Math.ceil(values.length * 0.46);

  return (
    <View style={styles.waveform} accessibilityElementsHidden>
      {values.map((height, index) => (
        <View
          key={`wave-${index}`}
          style={[
            styles.waveBar,
            {
              height,
              backgroundColor: index < played || active ? COLORS.orange : 'rgba(255,255,255,0.2)',
              opacity: active || index < played ? 1 : 0.62,
            },
          ]}
        />
      ))}
    </View>
  );
}

function AudioDrops({ drops, loading }: { drops: DashboardDrop[]; loading: boolean }) {
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayback();

  const handlePlay = async (drop: DashboardDrop) => {
    const track = drop.release ? toTrack(drop.release, 'release') : drop.mix ? toTrack(drop.mix, 'mix') : null;
    if (!track) {
      router.push(drop.route as any);
      return;
    }

    try {
      if (currentTrack?.id === track.id) {
        await togglePlayPause();
      } else {
        await playTrack(track);
      }
    } catch (error) {
      console.warn('[Home] playback failed', error);
      router.push(drop.route as any);
    }
  };

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader icon="headset" title="EXCLUSIVE AUDIO DROPS" />
      {loading ? <InlineLoading /> : null}
      {!loading && drops.length === 0 ? (
        <EmptyCard title="No audio drops yet." body="Published releases and mixes with playable media will appear here." />
      ) : null}
      {drops.length > 0 ? (
        <View style={styles.audioList}>
          {drops.map((drop) => {
            const active = currentTrack?.id === drop.id || currentTrack?.releaseId === drop.id || currentTrack?.mixId === drop.id;
            return (
              <Pressable
                key={`${drop.kind}-${drop.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Open ${drop.title}`}
                style={styles.audioRow}
                onPress={() => {
                  selectionHaptic();
                  router.push(drop.route as any);
                }}
              >
                <LinearGradient colors={drop.colors as any} style={styles.albumArt}>
                  {drop.imageUrl ? <PluggdImage uri={drop.imageUrl} style={styles.coverImage} /> : null}
                  {!drop.imageUrl ? <MaterialIcons name="graphic-eq" size={20} color={COLORS.text} /> : null}
                </LinearGradient>
                <View style={styles.audioCopy}>
                  <Text style={styles.audioTitle} numberOfLines={2}>
                    {drop.title}
                  </Text>
                  <Text style={styles.audioArtist} numberOfLines={1}>
                    {drop.artist}
                  </Text>
                </View>
                <Waveform values={drop.waveform} active={active && isPlaying} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={active && isPlaying ? `Pause ${drop.title}` : `Play ${drop.title}`}
                  style={[styles.playButton, !drop.playable && styles.playButtonDisabled]}
                  onPress={(pressEvent) => {
                    pressEvent.stopPropagation();
                    impactHaptic();
                    handlePlay(drop);
                  }}
                >
                  <MaterialIcons
                    name={active && isPlaying ? 'pause' : drop.playable ? 'play-arrow' : 'chevron-right'}
                    size={20}
                    color={COLORS.text}
                  />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function BackstageBuzz({ threads, loading }: { threads: BackstageThread[]; loading: boolean }) {
  const router = useRouter();
  const visibleThreads = threads.slice(0, 2);

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderOuter}>
        <SectionHeader icon="forum" title="TRENDING BACKSTAGE BUZZ" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Backstage"
          style={styles.viewAllLink}
          onPress={() => {
            selectionHaptic();
            router.push('/backstage' as any);
          }}
        >
          <Text style={styles.viewAllText}>VIEW ALL</Text>
        </Pressable>
      </View>
      {loading ? <InlineLoading /> : null}
      {!loading && visibleThreads.length === 0 ? (
        <EmptyCard title="No backstage buzz yet." body="Community threads, social posts and event discussions will appear here." />
      ) : null}
      {visibleThreads.length > 0 ? (
        <View style={styles.buzzList}>
          {visibleThreads.map((item, index) => {
            const comments = Number(item.comment_count ?? 0);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.title}`}
                style={[styles.buzzRow, index > 0 && styles.buzzDivider]}
                onPress={() => {
                  selectionHaptic();
                  router.push((item.route || `/post/${item.id}`) as any);
                }}
              >
                <View style={styles.buzzTextBlock}>
                  <Text style={styles.buzzText} numberOfLines={3}>
                    <Text style={styles.buzzCommunity}>{item.category || item.author_name || 'Backstage'}: </Text>
                    {item.title || item.body || 'Community update'}
                  </Text>
                </View>
                {comments > 0 ? (
                  <View style={styles.commentPill}>
                    <Text style={styles.commentPillText}>{formatCompact(comments)} comments</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function RecommendedCreators({ creators, loading }: { creators: CreatorRecommendation[]; loading: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.creatorSectionTitle}>RECOMMENDED CREATORS</Text>
      {loading ? <InlineLoading /> : null}
      {!loading && creators.length === 0 ? (
        <EmptyCard title="No recommended creators yet." body="Creator profiles from Supabase will appear here when available." />
      ) : null}
      {creators.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorShelf}>
          {creators.map((creator) => (
              <View key={creator.id} style={styles.creatorCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${creator.name}`}
                  onPress={() => {
                    selectionHaptic();
                    router.push(creator.route as any);
                  }}
                >
                  <LinearGradient colors={colorsFor(creator.id) as any} style={styles.creatorAvatar}>
                    {creator.imageUrl ? <PluggdImage uri={creator.imageUrl} style={styles.avatarImage} /> : null}
                    {!creator.imageUrl ? <Text style={styles.initialsText}>{contentInitials(creator.name)}</Text> : null}
                  </LinearGradient>
                </Pressable>
                <Text style={styles.creatorName} numberOfLines={1}>
                  {creator.name}
                </Text>
                <Text style={styles.creatorHandle} numberOfLines={1}>
                  {creator.handle}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${creator.name}`}
                  style={styles.joinButton}
                  onPress={() => {
                    impactHaptic();
                    router.push(creator.route as any);
                  }}
                >
                  <Text style={styles.joinButtonText}>JOIN</Text>
                </Pressable>
              </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function InlineLoading() {
  return <PremiumSkeleton compact label="Loading live PLUGGD data..." style={styles.loadingInline} />;
}

export function LiveMusicDashboardHome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentPaddingTop = useMemo(() => Math.max(insets.top + 72, 84), [insets.top]);
  const narrow = width < 360;
  const home = useHomeFeed();
  const live = useLiveRooms();
  const backstage = useBackstage();
  const drops = useMemo(() => mapDrops(home.data), [home.data]);
  const creators = useMemo(() => mapCreators(home.data), [home.data]);
  const hero = useMemo(() => resolveHero(live.data ?? [], home.data, drops), [drops, home.data, live.data]);
  const refreshing = home.isRefetching || live.isRefetching || backstage.isRefetching;
  const initialLoading = home.isLoading || live.isLoading || backstage.isLoading;

  const refresh = () => {
    home.refetch();
    live.refetch();
    backstage.refetch();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.orange} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: contentPaddingTop,
            paddingBottom: insets.bottom + 148,
          },
          narrow && styles.contentNarrow,
        ]}
      >
        <HeroBanner hero={hero} />
        {initialLoading ? <InlineLoading /> : null}
        <LiveNowShelf rooms={live.data ?? []} loading={live.isLoading} />
        <EventsShelf events={home.data?.events ?? []} loading={home.isLoading} />
        <AudioDrops drops={drops} loading={home.isLoading} />
        <BackstageBuzz threads={backstage.data?.threads ?? []} loading={backstage.isLoading} />
        <RecommendedCreators creators={creators} loading={home.isLoading} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },
  contentNarrow: {
    paddingHorizontal: 14,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    minHeight: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surface2,
  },
  stageLight: {
    position: 'absolute',
    top: -38,
    width: 150,
    height: 190,
    borderRadius: 90,
    opacity: 0.28,
    backgroundColor: '#B6F0FF',
    transform: [{ rotate: '-18deg' }],
  },
  stageLightLeft: {
    left: 18,
  },
  stageLightRight: {
    right: -22,
    backgroundColor: COLORS.orange,
    opacity: 0.16,
    transform: [{ rotate: '20deg' }],
  },
  crowdLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 22,
    height: 52,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  crowdSilhouette: {
    width: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#000000',
  },
  heroCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  liveBadge: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live,
  },
  liveDotMuted: {
    backgroundColor: COLORS.orange,
  },
  liveBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  heroTitle: {
    maxWidth: 292,
    color: COLORS.text,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
    marginTop: 2,
  },
  heroMetric: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  sectionBlock: {
    marginTop: 24,
  },
  sectionHeaderOuter: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  viewAllLink: {
    minHeight: 22,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  viewAllText: {
    color: COLORS.orange,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  loadingInline: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(18,18,26,0.72)',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  emptyCard: {
    minHeight: 96,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    padding: 14,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  emptyBody: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 5,
  },
  liveShelf: {
    gap: 8,
    paddingRight: 16,
  },
  liveCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surface2,
  },
  liveAvatarMark: {
    position: 'absolute',
    left: 10,
    top: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  initialsText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  liveViewerPill: {
    position: 'absolute',
    right: 8,
    top: 8,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  tinyLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.live,
  },
  liveViewerText: {
    color: COLORS.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  liveCardFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
  },
  liveCardText: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
  },
  liveCardTitle: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
  },
  liveCardHandle: {
    color: COLORS.textSoft,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  eventShelf: {
    gap: 12,
    paddingRight: 16,
  },
  eventCard: {
    width: 220,
    height: 280,
    borderRadius: 12,
    padding: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surface2,
  },
  poster: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.surface2,
  },
  posterInitials: {
    position: 'absolute',
    left: 10,
    bottom: 8,
    color: COLORS.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
  posterSun: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  posterMic: {
    position: 'absolute',
    top: 32,
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,12,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  posterCrowd: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    height: 38,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  posterCrowdBar: {
    width: 9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(8,8,12,0.76)',
  },
  eventCopy: {
    flex: 1,
    paddingTop: 10,
  },
  eventSeries: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  countdown: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  ticketButton: {
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
  },
  ticketButtonText: {
    color: COLORS.canvas,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  audioList: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  audioRow: {
    minHeight: 64,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface2,
  },
  albumArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  audioCopy: {
    flex: 1,
    minWidth: 96,
  },
  audioTitle: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  audioArtist: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    marginTop: 1,
  },
  waveform: {
    width: 92,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 3,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.46)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  playButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.2)',
    opacity: 0.7,
  },
  buzzList: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  buzzRow: {
    minHeight: 70,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buzzDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surface2,
  },
  buzzTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  buzzText: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  buzzCommunity: {
    color: COLORS.text,
    fontWeight: '900',
  },
  commentPill: {
    minWidth: 86,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    backgroundColor: COLORS.surface2,
  },
  commentPillText: {
    color: COLORS.textSoft,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  creatorSectionTitle: {
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  creatorShelf: {
    gap: 14,
    paddingTop: 12,
    paddingRight: 16,
  },
  creatorCard: {
    width: 82,
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  creatorName: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    marginTop: 7,
    maxWidth: 82,
  },
  creatorHandle: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    maxWidth: 82,
  },
  joinButton: {
    minWidth: 56,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    marginTop: 6,
  },
  joinButtonText: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
});
