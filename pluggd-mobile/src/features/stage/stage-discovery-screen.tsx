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
  TouchableOpacity,
  useWindowDimensions,
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
  toTrack,
  type BeatItem,
  type FeedBundle,
  type MixItem,
  type ProfileItem,
  type ReleaseItem,
  type SocialPostItem,
} from '../../lib/mobileContent';
import { useHomeFeed, useLiveRooms, type LiveRoomItem } from '../culture/useCultureData';
import { loadLibraryBundle, toggleSavedContent } from '../culture/mobileServices';

const COLORS = {
  canvas: '#08080C',
  surface: '#12121A',
  surface2: '#1F1F2E',
  line: '#262637',
  orange: '#FF5A00',
  coral: '#FF4757',
  white: '#FFFFFF',
  soft: '#E4E4E9',
  muted: '#8E8E9F',
  dim: '#62627A',
};

const FILTERS = ['For You', 'Releases', 'Mixes', 'Videos', 'Beats', 'Challenges'] as const;
type StageFilter = (typeof FILTERS)[number];

type StageItemKind = 'release' | 'mix' | 'beat';

type StageItem = {
  id: string;
  kind: StageItemKind;
  title: string;
  creator: string;
  imageUrl?: string | null;
  route: string;
  metadata: string;
  plays?: number | null;
  release?: ReleaseItem;
  mix?: MixItem;
  beat?: BeatItem;
};

type CreatorCard = {
  id: string;
  name: string;
  handle: string;
  route: string;
  imageUrl?: string | null;
  verified?: boolean | null;
};

type ChallengeCard = {
  id: string;
  title: string;
  meta: string;
  imageUrl?: string | null;
  comments?: number | null;
  route: string;
};

const IMAGE_GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#1F3442', '#14151D', '#07070A'],
  ['#3C1711', '#17121A', '#07070A'],
  ['#25204A', '#14151D', '#07070A'],
  ['#12312A', '#14151D', '#07070A'],
  ['#372116', '#15151D', '#07070A'],
];

function hashIndex(value: string | null | undefined, modulo: number) {
  const source = value || 'pluggd-stage';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function waveformFor(id: string, bars = 18) {
  const seed = hashIndex(id, 91) + 5;
  return Array.from({ length: bars }, (_, index) => 8 + ((seed * (index + 3)) % 32));
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

function formatMixMeta(mix: MixItem) {
  const parts = [mix.city, mix.recording_type, mix.genre_tags?.[0]].filter(Boolean);
  return parts.join(' · ') || 'Mix';
}

function formatBeatMeta(beat: BeatItem) {
  const parts = [beat.genre, beat.bpm ? `${beat.bpm} BPM` : null, beat.key].filter(Boolean);
  return parts.join(' · ') || 'Producer drop';
}

function mapStageItems(bundle?: FeedBundle): StageItem[] {
  if (!bundle) return [];

  const releases = bundle.releases.map<StageItem>((release) => ({
    id: release.id,
    kind: 'release',
    title: release.title || 'Untitled release',
    creator: release.artist || 'PLUGGD Creator',
    imageUrl: release.cover_art_url,
    route: `/release/${release.id}`,
    metadata: release.genre || 'Release',
    release,
  }));

  const mixes = bundle.mixes.map<StageItem>((mix) => ({
    id: mix.id,
    kind: 'mix',
    title: mix.title || 'Untitled mix',
    creator: mix.event_name || mix.city || 'PLUGGD DJ',
    imageUrl: mix.cover_url,
    route: `/mixes/${mix.id}`,
    metadata: formatMixMeta(mix),
    plays: mix.play_count,
    mix,
  }));

  const beats = bundle.beats.map<StageItem>((beat) => ({
    id: beat.id,
    kind: 'beat',
    title: beat.title || 'Untitled producer drop',
    creator: beat.producer_name || 'Producer',
    imageUrl: beat.image_url,
    route: `/beat/${beat.id}`,
    metadata: formatBeatMeta(beat),
    beat,
  }));

  return [...releases, ...mixes, ...beats];
}

function filterStageItems(items: StageItem[], active: StageFilter) {
  if (active === 'Releases') return items.filter((item) => item.kind === 'release');
  if (active === 'Mixes') return items.filter((item) => item.kind === 'mix');
  if (active === 'Beats') return items.filter((item) => item.kind === 'beat');
  if (active === 'Videos') return [];
  if (active === 'Challenges') return [];
  return items.filter((item) => item.kind !== 'beat').concat(items.filter((item) => item.kind === 'beat').slice(0, 2));
}

function mapCreators(bundle?: FeedBundle): CreatorCard[] {
  if (!bundle) return [];

  const creators = bundle.profiles.map<CreatorCard>((profile) => {
    const name = profileName(profile);
    return {
      id: profile.user_id || profile.id || profile.username || name,
      name,
      handle: profileHandle(profile),
      route: profileRoute(profile),
      imageUrl: profile.avatar_url,
      verified: profile.is_verified,
    };
  });

  const seen = new Set(creators.map((creator) => creator.name.toLowerCase()));
  bundle.releases.forEach((release) => {
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

  bundle.beats.forEach((beat) => {
    const name = beat.producer_name?.trim();
    if (!name || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    creators.push({
      id: `beat-${beat.id}`,
      name,
      handle: beat.genre || 'Producer',
      route: `/beat/${beat.id}`,
      imageUrl: beat.image_url,
    });
  });

  return creators.slice(0, 10);
}

function mapChallenges(posts?: SocialPostItem[]): ChallengeCard[] {
  if (!posts) return [];
  return posts
    .filter((post) => {
      const text = `${post.post_type ?? ''} ${post.title ?? ''} ${post.body ?? ''}`.toLowerCase();
      return text.includes('challenge') || text.includes('open verse') || text.includes('feedback') || text.includes('verse');
    })
    .map((post) => ({
      id: post.id,
      title: post.title || post.body || 'Open creator thread',
      meta: post.post_type?.replace(/_/g, ' ') || 'Open now',
      imageUrl: Array.isArray(post.images) ? post.images[0] : null,
      comments: post.comments_count,
      route: '/backstage',
    }))
    .slice(0, 6);
}

function isPlayable(item: StageItem) {
  return Boolean(getItemTrack(item));
}

function getItemTrack(item: StageItem) {
  if (item.release) return toTrack(item.release, 'release');
  if (item.mix) return toTrack(item.mix, 'mix');
  if (item.beat) return toTrack(item.beat, 'beat');
  return null;
}

function sectionTitleForFilter(active: StageFilter) {
  if (active === 'Releases') return 'NEW RELEASES';
  if (active === 'Mixes') return 'MIXES IN ROTATION';
  if (active === 'Videos') return 'VIDEOS';
  if (active === 'Beats') return 'PRODUCER DROPS';
  if (active === 'Challenges') return 'OPEN VERSE CHALLENGES';
  return 'TRENDING NOW';
}

function StageArtwork({
  uri,
  title,
  gradientIndex,
  style,
}: {
  uri?: string | null;
  title: string;
  gradientIndex: number;
  style?: object;
}) {
  const colors = IMAGE_GRADIENTS[gradientIndex % IMAGE_GRADIENTS.length];
  return (
    <LinearGradient colors={colors as any} style={[styles.artworkBase, style]}>
      {uri ? <PluggdImage uri={uri} style={styles.imageFill} resizeMode="cover" /> : null}
      {!uri ? <Text style={styles.fallbackInitials}>{contentInitials(title)}</Text> : null}
    </LinearGradient>
  );
}

function Waveform({ id, active = false, compact = false }: { id: string; active?: boolean; compact?: boolean }) {
  const bars = waveformFor(id, compact ? 18 : 22);
  const activeCount = active ? Math.ceil(bars.length * 0.54) : Math.ceil(bars.length * 0.34);
  return (
    <View style={[styles.waveform, compact && styles.waveformCompact]}>
      {bars.map((height, index) => (
        <View
          key={`${id}-wave-${index}`}
          style={[
            styles.waveBar,
            {
              height: compact ? Math.max(5, height * 0.55) : height,
              backgroundColor: index < activeCount ? COLORS.orange : 'rgba(255,255,255,0.23)',
              opacity: active || index < activeCount ? 1 : 0.62,
            },
          ]}
        />
      ))}
    </View>
  );
}

function StageHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const label = user?.email || 'PLUGGD';

  return (
    <View style={[styles.header, { height: Math.max(insets.top + 72, 112), paddingTop: insets.top + 18 }]}>
      <Text style={styles.headerTitle}>STAGE</Text>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open wallet"
          onPress={() => {
            selectionHaptic();
            router.push('/wallet' as any);
          }}
          style={styles.headerIcon}
        >
          <MaterialIcons name="account-balance-wallet" size={22} color={COLORS.soft} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => {
            selectionHaptic();
            router.push(user ? '/profile' : '/auth/login' as any);
          }}
          style={styles.avatarButton}
        >
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
  active: StageFilter;
  onChange: (filter: StageFilter) => void;
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

function FeaturedHero({
  item,
  onPlay,
  onOpenBackstage,
  onToggleSave,
  saved,
  active,
  playing,
}: {
  item?: StageItem;
  onPlay: (item: StageItem) => void;
  onOpenBackstage: () => void;
  onToggleSave: (id: string) => void;
  saved: boolean;
  active: boolean;
  playing: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 9000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 9000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  if (!item) {
    return (
      <View style={styles.heroEmpty}>
        <Text style={styles.emptyTitle}>Your sound is loading.</Text>
        <Text style={styles.emptyBody}>Published releases and mixes will shape this discovery card.</Text>
      </View>
    );
  }

  const gradientIndex = hashIndex(item.id, IMAGE_GRADIENTS.length);
  const playable = isPlayable(item);

  return (
    <View style={styles.heroCard}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        <StageArtwork uri={item.imageUrl} title={item.title} gradientIndex={gradientIndex} style={styles.heroArtwork} />
      </Animated.View>
      <LinearGradient
        colors={['rgba(8,8,12,0.08)', 'rgba(8,8,12,0.58)', 'rgba(8,8,12,0.94)']}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,90,0,0.18)', 'rgba(124,58,237,0.06)', 'rgba(8,8,12,0)']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroContent}>
        <View style={styles.heroTag}>
          <MaterialIcons name="graphic-eq" size={13} color={COLORS.orange} />
          <Text style={styles.heroTagText}>{item.kind === 'mix' ? 'IMMERSIVE MIX' : item.kind === 'beat' ? 'PRODUCER DROP' : 'FEATURED DISCOVERY'}</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.heroCreator} numberOfLines={1}>
          creator: <Text style={styles.heroCreatorStrong}>{item.creator}</Text>
        </Text>
        <Text style={styles.heroMeta} numberOfLines={1}>
          {item.metadata}
        </Text>
        <View style={styles.heroActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playable ? (active && playing ? `Pause ${item.title}` : `Play ${item.title}`) : `Open ${item.title}`}
            onPress={() => onPlay(item)}
            style={styles.heroPlay}
          >
            <MaterialIcons name={playable ? (active && playing ? 'pause' : 'play-arrow') : 'open-in-new'} size={21} color={COLORS.canvas} />
            <Text style={styles.heroPlayText}>{playable ? (active && playing ? 'Pause' : 'Play') : 'Open'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter Backstage"
            onPress={onOpenBackstage}
            style={styles.backstageButton}
          >
            <Text style={styles.backstageButtonText}>Enter Backstage</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Unsave track' : 'Save track'}
            onPress={() => onToggleSave(item.id)}
            style={styles.saveHero}
          >
            <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={24} color={saved ? COLORS.orange : COLORS.soft} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
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

function TrendingCard({
  item,
  saved,
  active,
  playing,
  onPress,
  onPlay,
  onToggleSave,
}: {
  item: StageItem;
  saved: boolean;
  active: boolean;
  playing: boolean;
  onPress: () => void;
  onPlay: () => void;
  onToggleSave: () => void;
}) {
  const playable = isPlayable(item);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={onPress} style={styles.trendingCard}>
      <StageArtwork uri={item.imageUrl} title={item.title} gradientIndex={hashIndex(item.id, IMAGE_GRADIENTS.length)} style={styles.trendingArtwork} />
      <LinearGradient
        colors={['rgba(8,8,12,0.02)', 'rgba(8,8,12,0.82)', 'rgba(8,8,12,0.96)']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.trendingKind}>
        <Text style={styles.trendingKindText}>{item.kind}</Text>
      </View>
      <View style={styles.trendingCopy}>
        <Text style={styles.trendingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.trendingCreator} numberOfLines={1}>
          {item.creator}
        </Text>
        <Waveform id={item.id} active={active && playing} compact />
        <View style={styles.trendingFooter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playable ? (active && playing ? `Pause ${item.title}` : `Play ${item.title}`) : `Open ${item.title}`}
            onPress={(event) => {
              event.stopPropagation();
              onPlay();
            }}
            style={styles.inlinePlay}
          >
            <MaterialIcons name={playable ? (active && playing ? 'pause' : 'play-arrow') : 'open-in-new'} size={16} color={COLORS.soft} />
            <Text style={styles.inlinePlayText}>{playable ? (item.plays ? `${formatCompact(item.plays)} plays` : 'Play') : 'Open'}</Text>
          </Pressable>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Unsave item' : 'Save item'}
            onPress={(event) => {
              event.stopPropagation();
              onToggleSave();
            }}
            style={styles.saveSmall}
          >
            <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={20} color={saved ? COLORS.orange : COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

function LiveCard({ room }: { room: LiveRoomItem }) {
  const router = useRouter();
  const status = room.status || 'scheduled';
  const isLive = status === 'live';
  const viewers = Number(room.viewer_count ?? 0);
  const title = room.title || room.description || 'Creator session';
  const imageUrl = room.thumbnail_url || room.creator_avatar_url;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Join ${title}`}
      onPress={() => {
        selectionHaptic();
        router.push({ pathname: '/live/session', params: { roomId: room.id } } as any);
      }}
      style={[styles.liveCard, isLive && styles.liveCardActive]}
    >
      <StageArtwork uri={imageUrl} title={title} gradientIndex={hashIndex(room.id, IMAGE_GRADIENTS.length)} style={styles.liveArtwork} />
      <LinearGradient colors={['rgba(8,8,12,0.18)', 'rgba(8,8,12,0.86)']} style={StyleSheet.absoluteFill} />
      <View style={[styles.livePill, isLive && styles.livePillOn]}>
        <View style={[styles.liveDot, isLive && styles.liveDotOn]} />
        <Text style={styles.livePillText}>{isLive ? 'LIVE' : 'SOON'}</Text>
      </View>
      <View style={styles.liveCopy}>
        <Text style={styles.liveTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.liveSubtitle} numberOfLines={1}>
          {room.category || 'Live creator session'}
        </Text>
        <Text style={styles.liveMeta} numberOfLines={1}>
          {viewers > 0 ? `${formatCompact(viewers)} viewers` : formatDate(room.scheduled_for, 'Scheduled')}
        </Text>
        <View style={styles.joinLiveButton}>
          <Text style={styles.joinLiveText}>Join Live</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ProducerRow({
  item,
  active,
  playing,
  onPlay,
}: {
  item: StageItem;
  active: boolean;
  playing: boolean;
  onPlay: () => void;
}) {
  const router = useRouter();
  const playable = isPlayable(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      style={styles.producerRow}
      onPress={() => {
        selectionHaptic();
        router.push(item.route as any);
      }}
    >
      <StageArtwork uri={item.imageUrl} title={item.title} gradientIndex={hashIndex(item.id, IMAGE_GRADIENTS.length)} style={styles.producerArt} />
      <View style={styles.producerCopy}>
        <Text style={styles.producerTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.producerMeta} numberOfLines={1}>
          {item.creator}
        </Text>
      </View>
      <Waveform id={item.id} active={active && playing} compact />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playable ? (active && playing ? `Pause ${item.title}` : `Play ${item.title}`) : `Open ${item.title}`}
        onPress={(event) => {
          event.stopPropagation();
          onPlay();
        }}
        style={styles.producerPlay}
      >
        <MaterialIcons name={playable ? (active && playing ? 'pause' : 'play-arrow') : 'open-in-new'} size={18} color={COLORS.canvas} />
      </Pressable>
    </Pressable>
  );
}

function ChallengeCardView({
  item,
  creators,
}: {
  item: ChallengeCard;
  creators: CreatorCard[];
}) {
  const router = useRouter();
  const visibleCreators = creators.slice(0, 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      onPress={() => {
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={styles.challengeCard}
    >
      <StageArtwork uri={item.imageUrl} title={item.title} gradientIndex={hashIndex(item.id, IMAGE_GRADIENTS.length)} style={styles.challengeArt} />
      <LinearGradient colors={['rgba(8,8,12,0.1)', 'rgba(8,8,12,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.challengeCopy}>
        <Text style={styles.challengeDays} numberOfLines={1}>
          {item.meta || 'Open now'}
        </Text>
        <Text style={styles.challengeTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.challengeMetaRow}>
          <View style={styles.participantStack}>
            {visibleCreators.map((creator, index) => (
              <View key={creator.id} style={[styles.participantAvatar, index > 0 && { marginLeft: -8 }]}>
                {creator.imageUrl ? <PluggdImage uri={creator.imageUrl} style={styles.imageFill} /> : <Text style={styles.participantInitial}>{contentInitials(creator.name)}</Text>}
              </View>
            ))}
          </View>
          <Text style={styles.challengeComments}>{formatCompact(item.comments ?? 0)} comments</Text>
        </View>
        <View style={styles.challengeButton}>
          <Text style={styles.challengeButtonText}>JOIN CHALLENGE</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CreatorRecommendation({ creator }: { creator: CreatorCard }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${creator.name}`}
      onPress={() => {
        selectionHaptic();
        router.push(creator.route as any);
      }}
      style={styles.creatorCard}
    >
      <View style={styles.creatorAvatar}>
        {creator.imageUrl ? <PluggdImage uri={creator.imageUrl} style={styles.imageFill} /> : <Text style={styles.creatorInitials}>{contentInitials(creator.name)}</Text>}
      </View>
      <View style={styles.creatorCopy}>
        <Text style={styles.creatorName} numberOfLines={1}>
          {creator.name}
        </Text>
        <Text style={styles.creatorHandle} numberOfLines={1}>
          {creator.handle}
        </Text>
      </View>
      {creator.verified ? <MaterialIcons name="verified" size={18} color={COLORS.orange} /> : null}
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

export function StageDiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const home = useHomeFeed();
  const live = useLiveRooms();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayback();
  const [activeFilter, setActiveFilter] = useState<StageFilter>('For You');
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const allItems = useMemo(() => mapStageItems(home.data), [home.data]);
  const filteredItems = useMemo(() => filterStageItems(allItems, activeFilter), [activeFilter, allItems]);
  const heroItem = useMemo(() => filteredItems.find((item) => item.imageUrl) ?? filteredItems[0] ?? allItems[0], [allItems, filteredItems]);
  const trending = useMemo(() => filteredItems.filter((item) => item.id !== heroItem?.id).slice(0, 12), [filteredItems, heroItem?.id]);
  const producerDrops = useMemo(() => allItems.filter((item) => item.kind === 'beat').slice(0, 5), [allItems]);
  const creators = useMemo(() => mapCreators(home.data), [home.data]);
  const challenges = useMemo(() => mapChallenges(home.data?.posts), [home.data?.posts]);
  const liveRooms = useMemo(() => (live.data ?? []).slice(0, 8), [live.data]);
  const loading = home.isLoading || live.isLoading;
  const refreshing = home.isRefetching || live.isRefetching;
  const heroSaved = heroItem ? savedIds.has(heroItem.id) : false;
  const bottomPadding = Math.max(insets.bottom + 154, 176);
  const heroHeight = Math.min(260, Math.max(224, width * 0.62));

  useEffect(() => {
    if (!library.data?.saved) return;
    const ids = library.data.saved
      .filter((item) => item.kind === 'beat' || item.kind === 'release')
      .map((item) => item.route.split('/').pop())
      .filter((item): item is string => Boolean(item));
    setSavedIds(new Set(ids));
  }, [library.data?.saved]);

  const currentTrackMatches = (item: StageItem) => {
    return (
      currentTrack?.id === item.id ||
      currentTrack?.releaseId === item.id ||
      currentTrack?.mixId === item.id ||
      currentTrack?.beatId === item.id
    );
  };

  const handlePlay = async (item: StageItem) => {
    const track = getItemTrack(item);
    impactHaptic();
    if (!track) {
      router.push(item.route as any);
      return;
    }

    try {
      if (currentTrack?.id === track.id) {
        await togglePlayPause();
        return;
      }
      await playTrack(track);
    } catch (error) {
      console.warn('[Stage] playback failed', error);
      router.push(item.route as any);
    }
  };

  const toggleSave = async (item: StageItem) => {
    impactHaptic();
    const result = await toggleSavedContent(item.kind === 'beat' ? 'beat' : item.kind === 'mix' ? 'mix' : 'release', item.id);
    if (!result.success) {
      Alert.alert(result.supported === false ? 'Save unavailable' : 'Save failed', result.error || 'This item could not be saved.');
      return;
    }
    setSavedIds((previous) => {
      const next = new Set(previous);
      if (result.saved === false) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    void library.refetch();
  };

  const refetchAll = () => {
    void home.refetch();
    void live.refetch();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.canvas, '#090910', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <StageHeader />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={COLORS.orange} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      >
        <FilterPills active={activeFilter} onChange={setActiveFilter} />

        {loading ? (
          <PremiumSkeleton compact label="Loading Stage data..." style={styles.loadingBlock} />
        ) : null}

        <View style={[styles.heroWrap, { height: heroHeight }]}>
          <FeaturedHero
            item={heroItem}
            onPlay={handlePlay}
            onOpenBackstage={() => {
              selectionHaptic();
              router.push('/backstage' as any);
            }}
            onToggleSave={() => heroItem && void toggleSave(heroItem)}
            saved={heroSaved}
            active={heroItem ? currentTrackMatches(heroItem) : false}
            playing={isPlaying}
          />
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader
            title={sectionTitleForFilter(activeFilter)}
            action="VIEW ALL"
            onAction={() => {
              selectionHaptic();
              router.push('/search' as any);
            }}
          />
          {trending.length === 0 ? (
            <EmptyInline
              title={activeFilter === 'Videos' ? 'No videos available yet.' : 'No Stage media found.'}
              body="Real releases, mixes, videos and producer drops from Supabase will appear here."
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingShelf}>
              {trending.map((item) => {
                const active = currentTrackMatches(item);
                return (
                  <TrendingCard
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    saved={savedIds.has(item.id)}
                    active={active}
                    playing={isPlaying}
                    onPress={() => {
                      selectionHaptic();
                      router.push(item.route as any);
                    }}
                    onPlay={() => handlePlay(item)}
                    onToggleSave={() => void toggleSave(item)}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="LIVE CREATOR SESSIONS" />
          {liveRooms.length === 0 ? (
            <EmptyInline title="No live sessions right now." body="Approved creator livestreams and scheduled rooms will appear here when available." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveShelf}>
              {liveRooms.map((room) => (
                <LiveCard key={room.id} room={room} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.producerHeading}>FEATURED PRODUCER DROPS</Text>
          <Text style={styles.producerSubheading}>Discover premium producers inside the culture ecosystem.</Text>
          {producerDrops.length === 0 ? (
            <EmptyInline title="No producer drops yet." body="Published beats with preview audio will appear here." />
          ) : (
            <View style={styles.producerList}>
              {producerDrops.map((item) => {
                const active = currentTrackMatches(item);
                return (
                  <ProducerRow
                    key={`producer-${item.id}`}
                    item={item}
                    active={active}
                    playing={isPlaying}
                    onPlay={() => handlePlay(item)}
                  />
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="OPEN VERSE CHALLENGES" />
          {challenges.length === 0 ? (
            <EmptyInline title="No open challenges yet." body="Challenge and feedback posts will appear here when the backend has them." />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeShelf}>
              {challenges.map((challenge) => (
                <ChallengeCardView key={challenge.id} item={challenge} creators={creators} />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <SectionHeader title="RECOMMENDED CREATORS" />
          {creators.length === 0 ? (
            <EmptyInline title="No creator recommendations yet." body="Creator profiles from Supabase will appear here when available." />
          ) : (
            <View style={styles.creatorGrid}>
              {creators.slice(0, 6).map((creator) => (
                <CreatorRecommendation key={creator.id} creator={creator} />
              ))}
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
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  avatarInitials: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  scrollContent: {
    paddingTop: 14,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  filterPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: 'rgba(31,31,46,0.72)',
  },
  filterPillActive: {
    borderColor: 'rgba(255,90,0,0.72)',
    backgroundColor: 'rgba(255,90,0,0.16)',
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 16,
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
    marginTop: 6,
    marginBottom: 28,
  },
  heroCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.orange,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  heroArtwork: {
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
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
  },
  heroContent: {
    position: 'absolute',
    left: 18,
    right: 14,
    bottom: 16,
  },
  heroTag: {
    alignSelf: 'flex-start',
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.35)',
    backgroundColor: 'rgba(8,8,12,0.62)',
  },
  heroTagText: {
    color: COLORS.soft,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  heroTitle: {
    marginTop: 14,
    color: COLORS.white,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  heroCreator: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  heroCreatorStrong: {
    color: COLORS.white,
    fontWeight: '900',
  },
  heroMeta: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  heroActions: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroPlay: {
    height: 44,
    minWidth: 122,
    borderRadius: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.white,
  },
  disabledButton: {
    opacity: 0.74,
  },
  heroPlayText: {
    color: COLORS.canvas,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  backstageButton: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(18,18,26,0.62)',
  },
  backstageButtonText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  saveHero: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(8,8,12,0.52)',
  },
  heroEmpty: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sectionBlock: {
    marginBottom: 30,
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
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionAction: {
    color: COLORS.orange,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  trendingShelf: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trendingCard: {
    width: 150,
    height: 252,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: COLORS.surface,
  },
  trendingArtwork: {
    width: '100%',
    height: '100%',
  },
  trendingKind: {
    position: 'absolute',
    left: 10,
    top: 10,
    minHeight: 24,
    borderRadius: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,12,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trendingKindText: {
    color: COLORS.soft,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trendingCopy: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  trendingTitle: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  trendingCreator: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  waveform: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  waveformCompact: {
    height: 28,
    marginTop: 6,
  },
  waveBar: {
    width: 2,
    borderRadius: 2,
  },
  trendingFooter: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlinePlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlinePlayText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  saveSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,12,0.44)',
  },
  liveShelf: {
    paddingHorizontal: 16,
    gap: 12,
  },
  liveCard: {
    width: 176,
    height: 246,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: COLORS.surface,
  },
  liveCardActive: {
    borderColor: 'rgba(255,71,87,0.44)',
    shadowColor: COLORS.coral,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  liveArtwork: {
    width: '100%',
    height: '100%',
  },
  livePill: {
    position: 'absolute',
    left: 10,
    top: 10,
    height: 24,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(8,8,12,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  livePillOn: {
    backgroundColor: 'rgba(255,71,87,0.95)',
    borderColor: 'rgba(255,71,87,1)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.dim,
  },
  liveDotOn: {
    backgroundColor: COLORS.white,
  },
  livePillText: {
    color: COLORS.white,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  liveCopy: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  liveTitle: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  liveSubtitle: {
    marginTop: 7,
    color: COLORS.soft,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  liveMeta: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  joinLiveButton: {
    marginTop: 12,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  joinLiveText: {
    color: COLORS.canvas,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  producerHeading: {
    paddingHorizontal: 16,
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  producerSubheading: {
    marginTop: 8,
    paddingHorizontal: 16,
    maxWidth: 320,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  producerList: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  producerRow: {
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surface2,
  },
  producerArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  producerCopy: {
    flex: 1,
    minWidth: 0,
  },
  producerTitle: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  producerMeta: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  producerPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  challengeShelf: {
    paddingHorizontal: 16,
    gap: 12,
  },
  challengeCard: {
    width: 228,
    height: 226,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: COLORS.surface,
  },
  challengeArt: {
    width: '100%',
    height: '100%',
  },
  challengeCopy: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  challengeDays: {
    color: COLORS.soft,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  challengeTitle: {
    marginTop: 8,
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  challengeMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  participantInitial: {
    color: COLORS.white,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
  },
  challengeComments: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  challengeButton: {
    marginTop: 12,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(18,18,26,0.64)',
  },
  challengeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  creatorGrid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  creatorCard: {
    height: 76,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
  },
  creatorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: COLORS.surface2,
  },
  creatorInitials: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  creatorCopy: {
    flex: 1,
    minWidth: 0,
  },
  creatorName: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  creatorHandle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
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
