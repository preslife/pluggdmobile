import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { PremiumScreenBackdrop } from '../../../components/PluggdPrimitives';
import { GlassRailCard } from '../../../components/liquid-glass';
import { PremiumHeroCard } from '../../../components/liquid-glass/PremiumHeroCard';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback, type PluggdTrack } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import {
  loadFanIdentitySummary,
  loadMobilePlaylists,
  safeList,
  toggleProfileFollow,
} from '../culture/mobileServices';
import {
  useBackstage,
  useHomeFeed,
  useLiveRooms,
  type BackstageThread,
  type LiveRoomItem,
} from '../culture/useCultureData';
import type { FanIdentitySummary, MobilePlaylist, VideoItem } from '../culture/mobileTypes';
import { supabase } from '../../lib/supabase';
import { pluggdFonts } from '../../design/typography';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';
import {
  contentInitials,
  formatCompact,
  formatDate,
  formatGBP,
  releasePlayableUrl,
  toTrack,
  type BeatItem,
  type EventItem,
  type FeedBundle,
  type MixItem,
  type ProfileItem,
  type ReleaseItem,
  type SamplePackItem,
  type SoundboardItem,
} from '../../lib/mobileContent';

const HOME_SECTION_ORDER = [
  'Top bar',
  'Lead platform spotlight',
  'Today on PLUGGD',
  'Live now',
  'Creators to follow',
  'New in Explore',
  'Events and ticket culture',
  'Community activity preview',
  'Market preview',
  'Progress / rewards teaser',
] as const;

function resolveAssetUri(source: ImageSourcePropType) {
  const resolver = Image.resolveAssetSource;
  const resolved = typeof resolver === 'function' ? resolver(source) : null;
  if (resolved?.uri) return resolved.uri;
  if (source && typeof source === 'object' && 'uri' in source && source.uri) return String(source.uri);
  return undefined;
}

const HOME_HERO_FALLBACK = resolveAssetUri(WEB_PARITY_ASSETS.intimateCrowdHero);

const COLORS = {
  canvas: '#08080C',
  shell: '#0D0D11',
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262626',
  orange: '#FF5A00',
  live: '#FF4757',
  violet: '#7C3AED',
  text: '#FFFFFF',
  textSoft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

type SpotlightKind = 'release' | 'mix' | 'soundboard' | 'live' | 'event' | 'creator' | 'community' | 'campaign' | 'empty';

type Spotlight = {
  id: string;
  kind: SpotlightKind;
  title: string;
  meta: string;
  imageUrl?: string | null;
  route?: string | null;
  cta?: 'Listen' | 'Open' | 'Join Live' | 'View Event' | 'Open Soundboard';
  track?: PluggdTrack | null;
  live?: boolean;
};

type CreatorRecommendation = {
  id: string;
  userId?: string | null;
  name: string;
  handle: string;
  role: string;
  route: string;
  imageUrl?: string | null;
  live: boolean;
};

type DiscoverPreviewItem = {
  id: string;
  kind: 'release' | 'mix' | 'video' | 'beat' | 'soundboard' | 'playlist';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
};

type StorePreviewItem = {
  id: string;
  kind: 'beat' | 'sample_pack' | 'store';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
  priceLabel?: string | null;
};

type StoreProductRow = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  price_cents?: number | null;
  price?: number | null;
  kind?: string | null;
  product_type?: string | null;
  route?: string | null;
  slug?: string | null;
  source?: 'store_products' | 'creator_merchandise';
};

type VideoPreview = VideoItem;

type CampaignMoment = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  route: string;
};

const SPOTLIGHT_GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#1E2029', '#0D0D11', '#3B190C'],
  ['#12121A', '#241330', '#0D0D11'],
  ['#1C251F', '#0D0D11', '#311508'],
  ['#101722', '#12121A', '#3A1B11'],
];

function hashIndex(value: string | null | undefined, modulo: number) {
  const source = value || 'pluggd';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function gradientFor(id?: string | null) {
  return SPOTLIGHT_GRADIENTS[hashIndex(id, SPOTLIGHT_GRADIENTS.length)];
}

function routeForProfile(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/user/${profile.user_id}`;
  return '/search';
}

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'Creator';
}

function profileRole(profile: ProfileItem) {
  return profile.primary_genre || profile.profile_type || profile.user_type || profile.city || 'Creator';
}

function locationCity(location?: string | null) {
  if (!location) return 'Location TBA';
  return location.split(',').map((part) => part.trim()).filter(Boolean)[0] || 'Location TBA';
}

function eventCountdown(startsAt?: string | null) {
  if (!startsAt) return null;
  const start = new Date(startsAt).getTime();
  if (Number.isNaN(start)) return null;
  const diffMs = start - Date.now();
  if (diffMs <= 0) return 'Happening now';
  const minutes = Math.floor(diffMs / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function liveViewerLabel(room: LiveRoomItem) {
  const count = Number(room.viewer_count ?? 0);
  return Number.isFinite(count) && count > 0 ? formatCompact(count) : null;
}

function mapCreators(bundle: FeedBundle | undefined, liveRooms: LiveRoomItem[]): CreatorRecommendation[] {
  if (!bundle) return [];
  const liveCreatorIds = new Set(
    liveRooms
      .filter((room) => room.status === 'live' && room.creator_id)
      .map((room) => room.creator_id as string),
  );

  return bundle.profiles.slice(0, 12).map((profile) => {
    const name = profileName(profile);
    const userId = profile.user_id || profile.id || null;
    return {
      id: userId || profile.username || name,
      userId,
      name,
      handle: profile.username ? `@${profile.username}` : profile.city || 'PLUGGD',
      role: profileRole(profile),
      route: routeForProfile(profile),
      imageUrl: profile.avatar_url,
      live: Boolean(userId && liveCreatorIds.has(userId)),
    };
  });
}

function resolveSpotlight(
  bundle?: FeedBundle,
  liveRooms: LiveRoomItem[] = [],
  communities: Array<{ id: string; title?: string | null; cover_image_url?: string | null; avatar_url?: string | null }> = [],
  campaigns: CampaignMoment[] = [],
): Spotlight {
  const release = bundle?.releases.find((item) => releasePlayableUrl(item)) || bundle?.releases[0];
  if (release) {
    const track = toTrack(release, 'release');
    return {
      id: release.id,
      kind: 'release',
      title: release.artist ? `New from ${release.artist}` : release.title || 'New on PLUGGD',
      meta: release.title || release.genre || 'Latest release',
      imageUrl: release.cover_art_url,
      route: `/release/${release.id}`,
      cta: track ? 'Listen' : 'Open',
      track,
    };
  }

  const mix = bundle?.mixes.find((item) => item.audio_url) || bundle?.mixes[0];
  if (mix) {
    const track = toTrack(mix, 'mix');
    return {
      id: mix.id,
      kind: 'mix',
      title: mix.title ? `New mix: ${mix.title}` : 'New mix on PLUGGD',
      meta: [mix.city, mix.event_name].filter(Boolean).join(' · ') || 'Fresh mix',
      imageUrl: mix.cover_url,
      route: `/mixes/${mix.id}`,
      cta: track ? 'Listen' : 'Open',
      track,
    };
  }

  const soundboard = bundle?.soundboards[0];
  if (soundboard) {
    return {
      id: soundboard.id,
      kind: 'soundboard',
      title: `Soundboard: ${soundboard.title || 'Active board'}`,
      meta: `${formatCompact(soundboard.item_count)} items${soundboard.comment_count ? ` · ${formatCompact(soundboard.comment_count)} comments` : ''}`,
      imageUrl: soundboard.cover_image_url,
      route: `/soundboards/${soundboard.slug || soundboard.id}`,
      cta: 'Open Soundboard',
    };
  }

  const live = liveRooms.find((room) => room.status === 'live');
  if (live) {
    return {
      id: live.id,
      kind: 'live',
      title: live.title || 'Producer room is live',
      meta: liveViewerLabel(live) ? `${liveViewerLabel(live)} tuned in` : live.category || 'Live now',
      imageUrl: live.thumbnail_url || live.creator_avatar_url,
      route: `/live/session?roomId=${live.id}`,
      cta: 'Join Live',
      live: true,
    };
  }

  const event = bundle?.events[0];
  if (event) {
    return {
      id: event.id,
      kind: 'event',
      title: event.starts_at && new Date(event.starts_at).toDateString() === new Date().toDateString()
        ? `Tonight in ${locationCity(event.location)}`
        : event.title || 'Event on PLUGGD',
      meta: `${formatDate(event.starts_at)} · ${locationCity(event.location)}`,
      imageUrl: event.cover_image_url,
      route: `/events/${event.id}`,
      cta: 'View Event',
    };
  }

  const creator = bundle?.profiles[0];
  if (creator) {
    return {
      id: creator.user_id || creator.id || creator.username || 'creator',
      kind: 'creator',
      title: `Creator to watch: ${profileName(creator)}`,
      meta: profileRole(creator),
      imageUrl: creator.avatar_url,
      route: routeForProfile(creator),
      cta: 'Open',
    };
  }

  const community = communities[0];
  if (community) {
    return {
      id: community.id,
      kind: 'campaign',
      title: community.title || 'Community spotlight',
      meta: 'Community',
      imageUrl: community.cover_image_url || community.avatar_url,
      route: `/backstage/${community.id}`,
      cta: 'Open',
    };
  }

  const campaign = campaigns[0];
  if (campaign) {
    return {
      id: campaign.id,
      kind: 'community',
      title: campaign.title,
      meta: campaign.subtitle || 'Campaign / membership moment',
      imageUrl: campaign.imageUrl,
      route: campaign.route,
      cta: 'Open',
    };
  }

  return {
    id: 'empty',
    kind: 'empty',
    title: 'PLUGGD moments will appear here',
    meta: 'Publish releases, lives, events and communities to fill the front door.',
  };
}

function buildDiscoverItems(bundle: FeedBundle | undefined, videos: VideoPreview[], playlists: MobilePlaylist[]): DiscoverPreviewItem[] {
  if (!bundle) return [];
  const releases = bundle.releases.slice(0, 4).map<DiscoverPreviewItem>((release) => ({
    id: release.id,
    kind: 'release',
    title: release.title || 'Untitled release',
    subtitle: release.artist || release.genre || 'Release',
    imageUrl: release.cover_art_url,
    route: `/release/${release.id}`,
  }));
  const mixes = bundle.mixes.slice(0, 3).map<DiscoverPreviewItem>((mix) => ({
    id: mix.id,
    kind: 'mix',
    title: mix.title || 'Untitled mix',
    subtitle: mix.city || mix.event_name || 'Mix',
    imageUrl: mix.cover_url,
    route: `/mixes/${mix.id}`,
  }));
  const videoItems = videos.slice(0, 3).map<DiscoverPreviewItem>((video) => ({
    id: video.id,
    kind: 'video',
    title: video.title || 'Untitled video',
    subtitle: 'Video',
    imageUrl: video.thumbnail_url,
    route: `/videos/${video.id}`,
  }));
  const beats = bundle.beats.slice(0, 3).map<DiscoverPreviewItem>((beat) => ({
    id: beat.id,
    kind: 'beat',
    title: beat.title || 'Untitled beat',
    subtitle: beat.producer_name || beat.genre || 'Beat',
    imageUrl: beat.image_url,
    route: `/beat/${beat.id}`,
  }));
  const soundboards = bundle.soundboards.slice(0, 3).map<DiscoverPreviewItem>((soundboard) => ({
    id: soundboard.id,
    kind: 'soundboard',
    title: soundboard.title || 'Soundboard',
    subtitle: `${formatCompact(soundboard.item_count)} items`,
    imageUrl: soundboard.cover_image_url,
    route: `/soundboards/${soundboard.slug || soundboard.id}`,
  }));
  const playlistItems = playlists.slice(0, 3).map<DiscoverPreviewItem>((playlist) => ({
    id: playlist.id,
    kind: 'playlist',
    title: playlist.name,
    subtitle: playlist.owner_name || `${formatCompact(playlist.track_count)} tracks`,
    imageUrl: playlist.cover_url,
    route: playlist.route,
  }));

  return [...releases, ...mixes, ...videoItems, ...beats, ...soundboards, ...playlistItems].slice(0, 16);
}

function buildMarketplaceItems(bundle: FeedBundle | undefined, storeProducts: StoreProductRow[]): StorePreviewItem[] {
  if (!bundle) return [];
  const beats = bundle.beats.slice(0, 4).map<StorePreviewItem>((beat) => ({
    id: beat.id,
    kind: 'beat',
    title: beat.title || 'Untitled beat',
    subtitle: beat.producer_name || beat.genre || 'Beat license',
    imageUrl: beat.image_url,
    route: `/beat/${beat.id}`,
    priceLabel: formatGBP(beat.price),
  }));
  const samplePacks = bundle.samplePacks.slice(0, 4).map<StorePreviewItem>((pack) => ({
    id: pack.id,
    kind: 'sample_pack',
    title: pack.title || 'Sample pack',
    subtitle: pack.genre || `${formatCompact(pack.sample_count)} samples`,
    imageUrl: pack.cover_art_url,
    route: `/sample-pack/${pack.id}`,
    priceLabel: formatGBP(pack.price),
  }));
  const products = storeProducts.slice(0, 4).map<StorePreviewItem>((product) => ({
    id: product.id,
    kind: 'store',
    title: product.title || product.name || 'Store item',
    subtitle: product.kind || product.product_type || 'Creator store',
    imageUrl: product.image_url || product.cover_image_url,
    route: product.route || `/product/${product.id}?source=${product.source || 'store_products'}`,
    priceLabel: product.price_cents != null ? formatGBP(product.price_cents, { cents: true }) : product.price != null ? formatGBP(product.price) : null,
  }));
  return [...beats, ...samplePacks, ...products].slice(0, 12);
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} style={styles.sectionAction} onPress={onPress}>
          <Text style={styles.sectionActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function InlineLoading() {
  return <PremiumSkeleton compact label="Loading PLUGGD data..." style={styles.loadingInline} />;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function HomeEditorialHeader() {
  return (
    <View style={styles.editorialHeader}>
      <Text style={styles.editorialKicker}>Home</Text>
      <Text style={styles.editorialTitle}>Plug into what is moving now</Text>
      <Text style={styles.editorialSummary}>
        A live front door for drops, rooms, events, creators, and market signals.
      </Text>
    </View>
  );
}

function SpotlightCard({ spotlight }: { spotlight: Spotlight }) {
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayback();
  const active = Boolean(spotlight.track && (currentTrack?.id === spotlight.track.id || currentTrack?.releaseId === spotlight.track.releaseId || currentTrack?.mixId === spotlight.track.mixId));

  const open = async () => {
    selectionHaptic();
    if (spotlight.cta === 'Listen' && spotlight.track) {
      if (active) await togglePlayPause();
      else await playTrack(spotlight.track);
      return;
    }
    if (spotlight.route) router.push(spotlight.route as any);
  };

  const canPlay = spotlight.cta === 'Listen' && Boolean(spotlight.track);
  const playingNow = active && isPlaying;
  const statusLabel = spotlight.live ? 'Live now' : playingNow ? 'Playing now' : 'Fresh on PLUGGD';

  return (
    <PremiumHeroCard
      style={styles.spotlight}
      image={spotlight.imageUrl || HOME_HERO_FALLBACK || ''}
      eyebrow="Lead platform spotlight"
      title={spotlight.title}
      meta={spotlight.meta}
      statusLabel={statusLabel}
      statusColor={spotlight.live ? COLORS.live : COLORS.orange}
      canPlay={canPlay}
      playing={playingNow}
      onPress={spotlight.route || spotlight.track ? open : undefined}
      onPlay={spotlight.route || spotlight.track ? open : undefined}
    />
  );
}

function TodayOnPluggd({ bundle, liveRooms, creators }: { bundle?: FeedBundle; liveRooms: LiveRoomItem[]; creators: CreatorRecommendation[] }) {
  const router = useRouter();
  const upcomingLive = liveRooms.filter((room) => room.status === 'scheduled' || room.scheduled_for);
  const rows = [
    {
      key: 'new-drops',
      title: 'New drops',
      value: bundle ? formatCompact(bundle.releases.length + bundle.mixes.length) : '0',
      meta: bundle?.releases[0]?.title || bundle?.mixes[0]?.title || 'No drops yet',
      route: bundle?.releases[0] ? `/release/${bundle.releases[0].id}` : bundle?.mixes[0] ? `/mixes/${bundle.mixes[0].id}` : '/explore',
      icon: 'album' as const,
    },
    {
      key: 'live-soon',
      title: 'Live soon',
      value: formatCompact(upcomingLive.length),
      meta: upcomingLive[0]?.title || 'No sessions scheduled',
      route: upcomingLive[0] ? `/live/session?roomId=${upcomingLive[0].id}` : '/live',
      icon: 'settings-input-antenna' as const,
    },
    {
      key: 'events-near-you',
      title: 'Events near you',
      value: formatCompact(bundle?.events.length),
      meta: bundle?.events[0] ? `${formatDate(bundle.events[0].starts_at)} · ${locationCity(bundle.events[0].location)}` : 'No events yet',
      route: bundle?.events[0] ? `/events/${bundle.events[0].id}` : '/search',
      icon: 'confirmation-number' as const,
    },
    {
      key: 'soundboards-active',
      title: 'Soundboards active',
      value: formatCompact(bundle?.soundboards.length),
      meta: bundle?.soundboards[0]?.title || 'No soundboards yet',
      route: bundle?.soundboards[0] ? `/soundboards/${bundle.soundboards[0].slug || bundle.soundboards[0].id}` : '/community',
      icon: 'graphic-eq' as const,
    },
    {
      key: 'creator-to-watch',
      title: 'Creator to watch',
      value: creators[0] ? 'Open' : '0',
      meta: creators[0]?.name || 'No creator yet',
      route: creators[0]?.route || '/search',
      icon: 'person-add-alt' as const,
    },
  ];

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Today on PLUGGD" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.todayRail}>
        {rows.map((row) => (
          <Pressable
            key={row.key}
            accessibilityRole="button"
            accessibilityLabel={`Open ${row.title}`}
            style={styles.todayCard}
            onPress={() => {
              selectionHaptic();
              router.push(row.route as any);
            }}
          >
            <View style={styles.todayTop}>
              <MaterialIcons name={row.icon} size={20} color={COLORS.orange} />
              <Text style={styles.todayValue}>{row.value}</Text>
            </View>
            <Text style={styles.todayTitle} numberOfLines={1}>{row.title}</Text>
            <Text style={styles.todayMeta} numberOfLines={2}>{row.meta}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function NewInDiscover({ items, loading }: { items: DiscoverPreviewItem[]; loading: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="New in Explore" action="OPEN EXPLORE" onPress={() => router.push('/explore' as any)} />
      {loading ? <InlineLoading /> : null}
      {!loading && !items.length ? <EmptyState title="Explore is waiting for drops." body="Releases, mixes, videos, beats, soundboards and playlists will appear here as they go live." /> : null}
      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageRail}>
          {items.map((item) => (
            <GlassRailCard
              key={`${item.kind}-${item.id}`}
              title={item.title}
              subtitle={item.subtitle}
              imageUrl={item.imageUrl}
              metric={item.kind.replace('_', ' ')}
              fallbackTone={item.kind === 'beat' ? 'amber' : item.kind === 'video' ? 'rose' : 'violet'}
              onPress={() => {
                router.push(item.route as any);
              }}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function CreatorsToFollow({ creators, loading }: { creators: CreatorRecommendation[]; loading: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localFollowing, setLocalFollowing] = useState<Set<string>>(new Set());
  const followMutation = useMutation({
    mutationFn: (profileId: string) => toggleProfileFollow(profileId),
    onSuccess: (result, profileId) => {
      if (!result.success) {
        Alert.alert('Follow unavailable', result.error || 'Could not update follow state.');
        return;
      }
      setLocalFollowing((current) => {
        const next = new Set(current);
        if (result.saved) next.add(profileId);
        else next.delete(profileId);
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'home-feed'] });
    },
  });

  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Creators to follow" />
      {loading ? <InlineLoading /> : null}
      {!loading && !creators.length ? <EmptyState title="No creator recommendations yet." body="Creator profiles will appear here as the scene grows." /> : null}
      {creators.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRail}>
          {creators.map((creator) => {
            const following = creator.userId ? localFollowing.has(creator.userId) : false;
            return (
              <View key={creator.id} style={styles.creatorCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${creator.name}`}
                  style={styles.creatorAvatarWrap}
                  onPress={() => {
                    selectionHaptic();
                    router.push(creator.route as any);
                  }}
                >
                  <LinearGradient colors={gradientFor(creator.id) as any} style={styles.creatorAvatar}>
                    {creator.imageUrl ? <PluggdImage uri={creator.imageUrl} style={styles.avatarImage} /> : <Text style={styles.creatorInitial}>{contentInitials(creator.name)}</Text>}
                  </LinearGradient>
                  {creator.live ? <View style={styles.creatorLiveDot} /> : null}
                </Pressable>
                <Text style={styles.creatorName} numberOfLines={1}>{creator.name}</Text>
                <Text style={styles.creatorRole} numberOfLines={1}>{creator.role}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${following ? 'Open' : 'Follow'} ${creator.name}`}
                  style={styles.followTouch}
                  onPress={() => {
                    impactHaptic();
                    if (!creator.userId || creator.userId === user?.id) {
                      router.push(creator.route as any);
                      return;
                    }
                    if (!user?.id) {
                      router.push('/auth/login' as any);
                      return;
                    }
                    followMutation.mutate(creator.userId);
                  }}
                >
                  <View style={[styles.followButton, following && styles.followButtonActive]}>
                    <Text style={[styles.followText, following && styles.followTextActive]}>{following ? 'OPEN' : 'FOLLOW'}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function LiveNowPreview({ rooms, loading }: { rooms: LiveRoomItem[]; loading: boolean }) {
  const router = useRouter();
  const liveRooms = rooms.filter((room) => room.status === 'live').slice(0, 8);
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Live now" action="OPEN LIVE" onPress={() => router.push('/live' as any)} />
      {loading ? <InlineLoading /> : null}
      {!loading && !liveRooms.length ? <EmptyState title="No one is live right now." body="Active creator sessions and rooms will appear here as soon as they start." /> : null}
      {liveRooms.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveRail}>
          {liveRooms.map((room) => {
            const viewers = liveViewerLabel(room);
            return (
              <Pressable
                key={room.id}
                accessibilityRole="button"
                accessibilityLabel={`Join ${room.title || 'live room'}`}
                style={styles.liveCard}
                onPress={() => {
                  selectionHaptic();
                  router.push({ pathname: '/live/session', params: { roomId: room.id } } as any);
                }}
              >
                <View style={styles.livePreview}>
                  <LinearGradient colors={gradientFor(room.id) as any} style={StyleSheet.absoluteFillObject} />
                  {room.thumbnail_url || room.creator_avatar_url ? <PluggdImage uri={room.thumbnail_url || room.creator_avatar_url || ''} style={styles.coverImage} /> : null}
                  <View style={styles.liveStatePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveStateText}>LIVE</Text>
                  </View>
                </View>
                <View style={styles.liveCopy}>
                  <Text style={styles.liveTitle} numberOfLines={2}>{room.title || 'Live session'}</Text>
                  <Text style={styles.liveMeta} numberOfLines={1}>{viewers ? `${viewers} tuned in` : room.category || 'Live room'}</Text>
                  <View style={styles.joinLiveButton}>
                    <Text style={styles.joinLiveText}>JOIN LIVE</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function EventsTicketCulture({ events, loading }: { events: EventItem[]; loading: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Events and ticket culture" />
      {loading ? <InlineLoading /> : null}
      {!loading && !events.length ? <EmptyState title="No upcoming events." body="Ticket drops, RSVPs and event culture cards will appear when events go live." /> : null}
      {events.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRail}>
          {events.slice(0, 8).map((event) => {
            const countdown = eventCountdown(event.starts_at);
            const ticketLabel = event.price_cents && event.price_cents > 0 ? 'Get Tickets' : 'RSVP';
            return (
              <Pressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${event.title || 'event'}`}
                style={styles.eventCard}
                onPress={() => {
                  selectionHaptic();
                  router.push(`/events/${event.id}` as any);
                }}
              >
                <View style={styles.eventImageStrip}>
                  <LinearGradient colors={gradientFor(event.id) as any} style={StyleSheet.absoluteFillObject} />
                  {event.cover_image_url ? <PluggdImage uri={event.cover_image_url} style={styles.coverImage} /> : null}
                </View>
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title || 'Upcoming event'}</Text>
                  <Text style={styles.eventMeta} numberOfLines={1}>{formatDate(event.starts_at)} · {locationCity(event.location)}</Text>
                  <Text style={styles.eventState} numberOfLines={1}>
                    {event.rsvp_count ? `${formatCompact(event.rsvp_count)} interested` : countdown || 'Ticket status pending'}
                  </Text>
                  <View style={styles.eventCTA}>
                    <Text style={styles.eventCTAText}>{ticketLabel}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function CommunityActivityPreview({ threads, loading }: { threads: BackstageThread[]; loading: boolean }) {
  const router = useRouter();
  const visible = threads.slice(0, 3);
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Community activity preview" action="OPEN COMMUNITY" onPress={() => router.push('/community' as any)} />
      {loading ? <InlineLoading /> : null}
      {!loading && !visible.length ? <EmptyState title="No community activity yet." body="Community threads, ticket discussions and event hub updates will appear here." /> : null}
      {visible.length ? (
        <View style={styles.backstageList}>
          {visible.map((thread) => {
            const replies = Number(thread.comment_count ?? 0);
            return (
              <Pressable
                key={thread.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${thread.title}`}
                style={styles.backstageRow}
                onPress={() => {
                  selectionHaptic();
                  router.push((thread.route || `/post/${thread.id}`) as any);
                }}
              >
                <View style={styles.backstageIcon}>
                  <MaterialIcons name={thread.attached_event_id ? 'confirmation-number' : thread.attached_release_id ? 'album' : 'forum'} size={20} color={COLORS.orange} />
                </View>
                <View style={styles.backstageCopy}>
                  <Text style={styles.backstageHub} numberOfLines={1}>{thread.category || thread.author_name || 'Community'}</Text>
                  <Text style={styles.backstageTitle} numberOfLines={1}>{thread.title}</Text>
                  <Text style={styles.backstagePreview} numberOfLines={1}>{thread.body || 'Latest discussion activity'}</Text>
                </View>
                <View style={styles.replyPill}>
                  <Text style={styles.replyText}>{replies ? formatCompact(replies) : '0'}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function MarketplacePreview({ items, loading }: { items: StorePreviewItem[]; loading: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.sectionBlock}>
      <SectionHeader title="Market preview" action="OPEN MARKET" onPress={() => router.push('/market' as any)} />
      {loading ? <InlineLoading /> : null}
      {!loading && !items.length ? <EmptyState title="No marketplace drops yet." body="Beats, sample packs and creator store products will appear here when available." /> : null}
      {items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marketRail}>
          {items.map((item) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              style={styles.marketCard}
              onPress={() => {
                selectionHaptic();
                router.push(item.route as any);
              }}
            >
              <View style={styles.marketImage}>
                <LinearGradient colors={gradientFor(item.id) as any} style={StyleSheet.absoluteFillObject} />
                {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.coverImage} /> : <Text style={styles.artInitial}>{contentInitials(item.title)}</Text>}
              </View>
              <Text style={styles.marketKind}>{item.kind.replace('_', ' ')}</Text>
              <Text style={styles.marketTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.marketMeta} numberOfLines={1}>{item.priceLabel || item.subtitle}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ProgressRewardsTeaser({ identity, loading }: { identity: FanIdentitySummary | null | undefined; loading: boolean }) {
  if (!loading && !identity) return null;
  const latestBadge = identity?.badges[0];
  const latestReward = identity?.rewards[0];
  const communityCount = identity?.joinedCommunities.length ?? 0;
  const eventCount = identity?.attendedEvents.length ?? 0;
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.rewardCard}>
        {loading ? (
          <InlineLoading />
        ) : (
          <>
            <View style={styles.rewardIcon}>
              <MaterialIcons name="workspace-premium" size={22} color={COLORS.orange} />
            </View>
            <View style={styles.rewardCopy}>
              <Text style={styles.rewardTitle} numberOfLines={1}>
                {latestBadge ? `Badge earned: ${latestBadge.title}` : latestReward ? latestReward.title : 'Your PLUGGD progress'}
              </Text>
              <Text style={styles.rewardMeta} numberOfLines={2}>
                {communityCount || eventCount
                  ? `${formatCompact(communityCount)} communities · ${formatCompact(eventCount)} attended events`
                  : 'Badges, quests, credits and rewards will appear as your activity grows.'}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export function LiveMusicDashboardHome() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const home = useHomeFeed();
  const live = useLiveRooms();
  const backstage = useBackstage();
  const videos = useQuery({
    queryKey: ['culture', 'home', 'videos'],
    queryFn: () =>
      safeList<VideoPreview>(
        (supabase as any)
          .from('videos')
          .select('id,title,description,thumbnail_url,youtube_url,artist_id,created_at')
          .order('created_at', { ascending: false })
          .limit(6),
      ),
    staleTime: 1000 * 60 * 3,
  });
  const playlists = useQuery({
    queryKey: ['culture', 'home', 'playlists'],
    queryFn: () => loadMobilePlaylists(null, 6),
    staleTime: 1000 * 60 * 3,
  });
  const store = useQuery({
    queryKey: ['culture', 'home', 'store-products'],
    queryFn: async () => {
      const [storeProducts, merchProducts] = await Promise.all([
        safeList<StoreProductRow>(
          (supabase as any)
            .from('store_products')
            .select('id,title,description,image_url,price,product_type,created_at,is_active,stock_quantity')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(8),
        ),
        safeList<StoreProductRow>(
          (supabase as any)
            .from('creator_merchandise')
            .select('id,title,description,image_url,gallery_images,price,product_type,category,status,created_at,stock_quantity')
            .in('status', ['approved', 'active', 'published', 'live'])
            .order('created_at', { ascending: false })
            .limit(8),
        ),
      ]);
      return [
        ...storeProducts.map((item) => ({ ...item, source: 'store_products' as const })),
        ...merchProducts.map((item) => ({ ...item, source: 'creator_merchandise' as const })),
      ].slice(0, 8);
    },
    staleTime: 1000 * 60 * 3,
  });
  const campaigns = useQuery({
    queryKey: ['culture', 'home', 'campaign-moments'],
    queryFn: async (): Promise<CampaignMoment[]> => {
      const [campaignRows, membershipRows] = await Promise.all([
        safeList<any>(
          (supabase as any)
            .from('campaigns')
            .select('id,title,cover_url,slug,status,created_at,ends_at')
            .eq('status', 'live')
            .order('created_at', { ascending: false })
            .limit(4),
        ),
        safeList<any>(
          (supabase as any)
            .from('membership_tiers')
            .select('id,name,description,owner_id,image_url,status,created_at')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(4),
        ),
      ]);
      return [
        ...campaignRows.map((row) => ({
          id: row.id,
          title: row.title || 'Campaign on PLUGGD',
          subtitle: row.ends_at ? `Ends ${formatDate(row.ends_at)}` : 'Campaign moment',
          imageUrl: row.cover_url || null,
          route: '/commerce/crowdfunding',
        })),
        ...membershipRows.map((row) => ({
          id: row.id,
          title: row.name || 'Membership on PLUGGD',
          subtitle: row.description || 'Membership moment',
          imageUrl: row.image_url || null,
          route: row.owner_id ? `/membership/${row.owner_id}` : '/membership',
        })),
      ].slice(0, 6);
    },
    staleTime: 1000 * 60 * 3,
  });
  const identity = useQuery({
    queryKey: ['culture', 'home', 'fan-identity', user?.id],
    queryFn: () => loadFanIdentitySummary(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 3,
  });

  const liveRooms = live.data ?? [];
  const creators = useMemo(() => mapCreators(home.data, liveRooms), [home.data, liveRooms]);
  const spotlight = useMemo(
    () => resolveSpotlight(home.data, liveRooms, backstage.data?.communities ?? [], campaigns.data ?? []),
    [backstage.data?.communities, campaigns.data, home.data, liveRooms],
  );
  const discoverItems = useMemo(
    () => buildDiscoverItems(home.data, videos.data ?? [], playlists.data ?? []),
    [home.data, playlists.data, videos.data],
  );
  const marketItems = useMemo(
    () => buildMarketplaceItems(home.data, store.data ?? []),
    [home.data, store.data],
  );
  const refreshing =
    home.isRefetching ||
    live.isRefetching ||
    backstage.isRefetching ||
    videos.isRefetching ||
    playlists.isRefetching ||
    store.isRefetching ||
    campaigns.isRefetching ||
    identity.isRefetching;

  const refresh = () => {
    void home.refetch();
    void live.refetch();
    void backstage.refetch();
    void videos.refetch();
    void playlists.refetch();
    void store.refetch();
    void campaigns.refetch();
    if (user?.id) void identity.refetch();
  };

  return (
    <PremiumScreenBackdrop tone="accent" style={styles.screen}>
      <StatusBar style="light" translucent />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.orange} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 76, 88),
            paddingBottom: insets.bottom + 226,
          },
        ]}
      >
        <HomeEditorialHeader />
        <SpotlightCard spotlight={spotlight} />
        <TodayOnPluggd bundle={home.data} liveRooms={liveRooms} creators={creators} />
        <LiveNowPreview rooms={liveRooms} loading={live.isLoading} />
        <CreatorsToFollow creators={creators} loading={home.isLoading} />
        <NewInDiscover items={discoverItems} loading={home.isLoading || videos.isLoading || playlists.isLoading} />
        <EventsTicketCulture events={home.data?.events ?? []} loading={home.isLoading} />
        <CommunityActivityPreview threads={backstage.data?.threads ?? []} loading={backstage.isLoading} />
        <MarketplacePreview items={marketItems} loading={home.isLoading || store.isLoading} />
        {user?.id ? <ProgressRewardsTeaser identity={identity.data} loading={identity.isLoading} /> : null}
      </ScrollView>
    </PremiumScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  scroll: { flex: 1, backgroundColor: COLORS.canvas },
  content: { paddingHorizontal: 16, gap: 22 },
  coverImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  avatarImage: { width: '100%', height: '100%' },
  loadingInline: { marginVertical: 4 },
  sectionBlock: { gap: 12 },
  sectionHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: COLORS.text, fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 22 },
  sectionAction: { minHeight: 44, justifyContent: 'center' },
  sectionActionText: { color: COLORS.muted, fontFamily: 'Satoshi-Bold', fontSize: 11, letterSpacing: 0.8 },
  emptyState: { minHeight: 88, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(10,12,24,0.34)', padding: 14, justifyContent: 'center' },
  emptyTitle: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 14 },
  emptyBody: { color: COLORS.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  editorialHeader: { gap: 6, paddingTop: 2, paddingBottom: 2 },
  editorialKicker: { color: COLORS.orange, fontFamily: 'Satoshi-Black', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  editorialTitle: { color: COLORS.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  editorialSummary: { color: COLORS.muted, fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 18 },

  spotlight: {
    height: 206,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  todayRail: { gap: 10, paddingRight: 16 },
  todayCard: { width: 148, height: 116, borderRadius: 16, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.22)', borderLeftColor: 'rgba(255,255,255,0.10)', borderRightColor: 'rgba(0,0,0,0.28)', borderBottomColor: 'rgba(0,0,0,0.46)', backgroundColor: 'rgba(10,12,24,0.34)', padding: 12, justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 22, shadowOffset: { width: 0, height: 14 } },
  todayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayValue: { color: COLORS.text, fontFamily: 'Satoshi-Black', fontSize: 18, fontVariant: ['tabular-nums'] },
  todayTitle: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  todayMeta: { color: COLORS.muted, fontSize: 11, lineHeight: 15 },

  stageRail: { gap: 12, paddingRight: 16 },
  stageCard: { width: 150, height: 210 },
  stageArtwork: { width: 150, height: 150, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surface2 },
  stageKind: { marginTop: 8, color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 10, textTransform: 'uppercase' },
  stageTitle: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 17, marginTop: 2 },
  stageSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  artInitial: { color: COLORS.text, fontFamily: 'PluggdSans5-Regular', fontSize: 30 },

  creatorRail: { gap: 10, paddingRight: 16 },
  creatorCard: { width: 140, height: 180, borderRadius: 18, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.20)', borderLeftColor: 'rgba(255,255,255,0.10)', borderRightColor: 'rgba(0,0,0,0.28)', borderBottomColor: 'rgba(0,0,0,0.44)', backgroundColor: 'rgba(10,12,24,0.34)', padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.38, shadowRadius: 22, shadowOffset: { width: 0, height: 14 } },
  creatorAvatarWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  creatorAvatar: { width: 82, height: 82, borderRadius: 41, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  creatorInitial: { color: COLORS.text, fontFamily: 'Satoshi-Black', fontSize: 18 },
  creatorLiveDot: { position: 'absolute', right: 4, bottom: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.live, borderWidth: 2, borderColor: COLORS.surface },
  creatorName: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 13, marginTop: 8, maxWidth: '100%' },
  creatorRole: { color: COLORS.muted, fontSize: 11, marginTop: 2, maxWidth: '100%' },
  followTouch: { minHeight: 44, minWidth: 92, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  followButton: { height: 32, minWidth: 82, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  followButtonActive: { backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  followText: { color: COLORS.text, fontFamily: 'Satoshi-Black', fontSize: 11 },
  followTextActive: { color: COLORS.text },

  liveRail: { gap: 12, paddingRight: 16 },
  liveCard: { width: 160, height: 198, borderRadius: 18, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.20)', borderLeftColor: 'rgba(255,255,255,0.10)', borderRightColor: 'rgba(0,0,0,0.28)', borderBottomColor: 'rgba(0,0,0,0.44)', backgroundColor: 'rgba(10,12,24,0.34)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.40, shadowRadius: 24, shadowOffset: { width: 0, height: 16 } },
  livePreview: { height: 112, overflow: 'hidden' },
  liveStatePill: { position: 'absolute', top: 8, left: 8, minHeight: 24, borderRadius: 12, backgroundColor: 'rgba(8,8,12,0.72)', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.live },
  liveStateText: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 10 },
  liveCopy: { padding: 10, gap: 5 },
  liveTitle: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 17 },
  liveMeta: { color: COLORS.muted, fontSize: 11 },
  joinLiveButton: { height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  joinLiveText: { color: COLORS.text, fontFamily: 'Satoshi-Black', fontSize: 11 },

  eventRail: { gap: 12, paddingRight: 16 },
  eventCard: { width: 240, height: 166, borderRadius: 18, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.20)', borderLeftColor: 'rgba(255,255,255,0.10)', borderRightColor: 'rgba(0,0,0,0.28)', borderBottomColor: 'rgba(0,0,0,0.44)', backgroundColor: 'rgba(10,12,24,0.34)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.38, shadowRadius: 24, shadowOffset: { width: 0, height: 16 } },
  eventImageStrip: { height: 72, overflow: 'hidden' },
  eventBody: { height: 94, padding: 11, gap: 4 },
  eventTitle: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 14 },
  eventMeta: { color: COLORS.textSoft, fontSize: 11 },
  eventState: { color: COLORS.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  eventCTA: { position: 'absolute', right: 10, bottom: 10, height: 30, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 12, justifyContent: 'center' },
  eventCTAText: { color: COLORS.text, fontFamily: 'Satoshi-Black', fontSize: 10 },

  backstageList: { gap: 8 },
  backstageRow: { minHeight: 86, borderRadius: 16, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', borderLeftColor: 'rgba(255,255,255,0.09)', borderRightColor: 'rgba(0,0,0,0.26)', borderBottomColor: 'rgba(0,0,0,0.42)', backgroundColor: 'rgba(10,12,24,0.32)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backstageIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  backstageCopy: { flex: 1, minWidth: 0 },
  backstageHub: { color: COLORS.muted, fontFamily: 'Satoshi-Bold', fontSize: 11 },
  backstageTitle: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 14, marginTop: 2 },
  backstagePreview: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  replyPill: { minWidth: 36, height: 28, borderRadius: 14, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  replyText: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 11, fontVariant: ['tabular-nums'] },

  marketRail: { gap: 12, paddingRight: 16 },
  marketCard: { width: 164, height: 202, borderRadius: 18, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.20)', borderLeftColor: 'rgba(255,255,255,0.10)', borderRightColor: 'rgba(0,0,0,0.28)', borderBottomColor: 'rgba(0,0,0,0.44)', backgroundColor: 'rgba(10,12,24,0.34)', padding: 10, shadowColor: '#000', shadowOpacity: 0.38, shadowRadius: 24, shadowOffset: { width: 0, height: 16 } },
  marketImage: { height: 116, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  marketKind: { color: COLORS.muted, fontFamily: 'Satoshi-Bold', fontSize: 10, textTransform: 'uppercase', marginTop: 8 },
  marketTitle: { color: COLORS.text, fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 17, marginTop: 2 },
  marketMeta: { color: COLORS.muted, fontSize: 11, marginTop: 3 },

  rewardCard: { height: 100, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.08)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  rewardCopy: { flex: 1, minWidth: 0 },
  rewardTitle: { color: COLORS.text, fontFamily: 'Satoshi-Black', fontSize: 15 },
  rewardMeta: { color: COLORS.textSoft, fontSize: 12, lineHeight: 17, marginTop: 4 },
});
