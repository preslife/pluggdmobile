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
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
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
  type SamplePackItem,
  type SoundboardContentItem,
  type SoundboardItem,
} from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import {
  loadLibraryBundle,
  loadMobilePlaylists,
  loadRecentlyPlayedLibraryItems,
  safeList,
  toggleSavedContent,
} from '../culture/mobileServices';
import { useHomeFeed } from '../culture/useCultureData';
import type { MobilePlaylist, SavedContentKind, SavedContentItem, VideoItem } from '../culture/mobileTypes';

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
  violet: '#7C3AED',
};

const FILTERS = ['For You', 'Releases', 'Mixes', 'Videos', 'Beats', 'Soundboards', 'Playlists'] as const;
type StageFilter = (typeof FILTERS)[number];
type ChartTab = 'Beats' | 'Releases' | 'Mixes' | 'Creators';
type StageItemKind = 'release' | 'mix' | 'video' | 'beat' | 'soundboard' | 'playlist' | 'sample_pack';

type StageItem = {
  id: string;
  kind: StageItemKind;
  title: string;
  creator: string;
  imageUrl?: string | null;
  route: string;
  metadata?: string | null;
  metric?: string | null;
  release?: ReleaseItem;
  mix?: MixItem;
  video?: VideoItem;
  beat?: BeatItem;
  soundboard?: SoundboardItem;
  playlist?: MobilePlaylist;
  samplePack?: SamplePackItem;
  latestItemType?: string | null;
  backstageRoute?: string | null;
};

type StageExtras = {
  videos: VideoItem[];
  playlists: MobilePlaylist[];
  latestSoundboardItems: Record<string, SoundboardContentItem>;
};

const GENRES = ['Hip-Hop', 'R&B', 'Afrobeats', 'Drill', 'Trap', 'House', 'Amapiano', 'Dancehall', 'Garage', 'Electronic'];
const CHART_TABS: ChartTab[] = ['Beats', 'Releases', 'Mixes', 'Creators'];
const IMAGE_GRADIENTS: readonly (readonly [string, string, string])[] = [
  ['#1D3240', '#11151D', '#07070A'],
  ['#3C1711', '#17121A', '#07070A'],
  ['#241D45', '#14151D', '#07070A'],
  ['#12312A', '#12151B', '#07070A'],
  ['#372116', '#15151D', '#07070A'],
];

function hashIndex(value: string | null | undefined, modulo: number) {
  const source = value || 'pluggd-stage';
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  return hash % modulo;
}

function waveformFor(id: string, bars = 22) {
  const seed = hashIndex(id, 91) + 7;
  return Array.from({ length: bars }, (_, index) => 7 + ((seed * (index + 4)) % 30));
}

function profileName(profile: ProfileItem) {
  return profile.display_name || profile.full_name || profile.username || 'PLUGGD Creator';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/user/${profile.user_id}`;
  return '/search';
}

function profileMeta(profile: ProfileItem) {
  return profile.primary_genre || profile.city || profile.user_type || profile.profile_type || 'Creator';
}

function formatDuration(seconds?: number | null) {
  const value = Number(seconds || 0);
  if (!value) return null;
  const minutes = Math.floor(value / 60);
  const remaining = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function formatBeatMeta(beat: BeatItem) {
  return [beat.bpm ? `${beat.bpm} BPM` : null, beat.key, beat.genre].filter(Boolean).join(' · ') || 'Producer drop';
}

function formatPrice(value?: number | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Free';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(numeric);
}

async function loadStageExtras(soundboardIds: string[]): Promise<StageExtras> {
  const [videos, playlists, soundboardItems] = await Promise.all([
    safeList<VideoItem>(
      (supabase as any)
        .from('videos')
        .select('id,title,description,thumbnail_url,youtube_url,artist_id,created_at')
        .order('created_at', { ascending: false })
        .limit(18),
    ),
    loadMobilePlaylists(null, 18),
    soundboardIds.length
      ? safeList<SoundboardContentItem>(
          (supabase as any)
            .from('soundboard_items')
            .select('id,soundboard_id,item_type,title,description,content_text,media_url,external_url,duration_seconds,is_pinned,plays_count,likes_count,comments_count,position,created_at')
            .in('soundboard_id', soundboardIds)
            .order('created_at', { ascending: false })
            .limit(80),
        )
      : Promise.resolve([]),
  ]);

  const latestSoundboardItems = soundboardItems.reduce<Record<string, SoundboardContentItem>>((map, item) => {
    if (item.soundboard_id && !map[item.soundboard_id]) map[item.soundboard_id] = item;
    return map;
  }, {});

  return { videos, playlists, latestSoundboardItems };
}

function mapReleases(bundle?: FeedBundle): StageItem[] {
  return (bundle?.releases || []).map((release) => ({
    id: release.id,
    kind: 'release',
    title: release.title || 'Untitled release',
    creator: release.artist || 'PLUGGD Creator',
    imageUrl: release.cover_art_url,
    route: `/release/${release.id}`,
    metadata: [release.genre, release.created_at ? formatDate(release.created_at) : null].filter(Boolean).join(' · ') || 'Release',
    release,
  }));
}

function mapMixes(bundle?: FeedBundle): StageItem[] {
  return (bundle?.mixes || []).map((mix) => ({
    id: mix.id,
    kind: 'mix',
    title: mix.title || 'Untitled mix',
    creator: mix.event_name || mix.city || 'PLUGGD DJ',
    imageUrl: mix.cover_url,
    route: `/mixes/${mix.slug || mix.id}`,
    metadata: [formatDuration(mix.duration_seconds), mix.genre_tags?.[0], mix.city].filter(Boolean).join(' · ') || 'Mix',
    metric: mix.play_count ? `${formatCompact(mix.play_count)} plays` : null,
    mix,
  }));
}

function mapBeats(bundle?: FeedBundle): StageItem[] {
  return (bundle?.beats || []).map((beat) => ({
    id: beat.id,
    kind: 'beat',
    title: beat.title || 'Untitled beat',
    creator: beat.producer_name || 'Producer',
    imageUrl: beat.image_url,
    route: `/beat/${beat.id}`,
    metadata: formatBeatMeta(beat),
    beat,
  }));
}

function mapVideos(videos: VideoItem[]): StageItem[] {
  return videos.map((video) => ({
    id: video.id,
    kind: 'video',
    title: video.title || 'Untitled video',
    creator: video.description || 'PLUGGD video',
    imageUrl: video.thumbnail_url,
    route: `/videos/${video.id}`,
    metadata: video.created_at ? formatDate(video.created_at) : 'Video',
    video,
  }));
}

function mapSoundboards(bundle: FeedBundle | undefined, latest: Record<string, SoundboardContentItem>): StageItem[] {
  return (bundle?.soundboards || []).map((soundboard) => {
    const latestItem = latest[soundboard.id];
    return {
      id: soundboard.id,
      kind: 'soundboard',
      title: soundboard.title || 'Untitled soundboard',
      creator: soundboard.description || 'Soundboard',
      imageUrl: soundboard.cover_image_url,
      route: `/soundboards/${soundboard.slug || soundboard.id}`,
      metadata: [latestItem?.item_type ? `Latest: ${latestItem.item_type}` : null, soundboard.item_count ? `${formatCompact(soundboard.item_count)} items` : null].filter(Boolean).join(' · ') || 'Soundboard',
      metric: soundboard.comment_count ? `${formatCompact(soundboard.comment_count)} comments` : null,
      latestItemType: latestItem?.item_type || null,
      soundboard,
    };
  });
}

function mapPlaylists(playlists: MobilePlaylist[]): StageItem[] {
  return playlists.map((playlist) => ({
    id: playlist.id,
    kind: 'playlist',
    title: playlist.name || 'Untitled playlist',
    creator: playlist.owner_name || 'PLUGGD',
    imageUrl: playlist.cover_url,
    route: playlist.route,
    metadata: [playlist.track_count ? `${formatCompact(playlist.track_count)} tracks` : null, playlist.is_public ? 'Public playlist' : null].filter(Boolean).join(' · ') || 'Playlist',
    metric: playlist.follower_count ? `${formatCompact(playlist.follower_count)} followers` : null,
    playlist,
  }));
}

function mapSamplePacks(bundle?: FeedBundle): StageItem[] {
  return (bundle?.samplePacks || []).map((pack) => ({
    id: pack.id,
    kind: 'sample_pack',
    title: pack.title || 'Untitled sample pack',
    creator: pack.genre || 'Sample pack',
    imageUrl: pack.cover_art_url,
    route: `/sample-pack/${pack.id}`,
    metadata: [pack.sample_count ? `${formatCompact(pack.sample_count)} files` : null, pack.bpm_range, formatPrice(pack.price)].filter(Boolean).join(' · ') || 'Sample pack',
    metric: pack.total_downloads ? `${formatCompact(pack.total_downloads)} downloads` : null,
    samplePack: pack,
  }));
}

function kindLabel(kind: StageItemKind) {
  if (kind === 'sample_pack') return 'Sample Pack';
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function getItemTrack(item: StageItem) {
  if (item.release) return toTrack(item.release, 'release');
  if (item.mix) return toTrack(item.mix, 'mix');
  if (item.beat) return toTrack(item.beat, 'beat');
  if (item.samplePack) return toTrack(item.samplePack, 'sample_pack');
  return null;
}

function isPlayable(item: StageItem) {
  return Boolean(getItemTrack(item));
}

function filterItems(active: StageFilter, groups: Record<StageItemKind, StageItem[]>) {
  if (active === 'Releases') return groups.release;
  if (active === 'Mixes') return groups.mix;
  if (active === 'Videos') return groups.video;
  if (active === 'Beats') return groups.beat;
  if (active === 'Soundboards') return groups.soundboard;
  if (active === 'Playlists') return groups.playlist;
  return [
    ...groups.release.slice(0, 4),
    ...groups.mix.slice(0, 4),
    ...groups.video.slice(0, 3),
    ...groups.soundboard.slice(0, 3),
    ...groups.beat.slice(0, 2),
  ];
}

function heroFor(active: StageFilter, groups: Record<StageItemKind, StageItem[]>) {
  const pool = filterItems(active, groups);
  return pool.find((item) => item.imageUrl) || pool[0] || filterItems('For You', groups)[0];
}

function Waveform({ id, compact = false }: { id: string; compact?: boolean }) {
  const bars = waveformFor(id, compact ? 18 : 24);
  const activeCount = Math.ceil(bars.length * 0.42);
  return (
    <View style={[styles.waveform, compact && styles.waveformCompact]}>
      {bars.map((height, index) => (
        <View
          key={`${id}-wave-${index}`}
          style={[
            styles.waveBar,
            {
              height: compact ? Math.max(5, height * 0.54) : height,
              backgroundColor: index < activeCount ? COLORS.orange : 'rgba(255,255,255,0.22)',
            },
          ]}
        />
      ))}
    </View>
  );
}

function StageArtwork({ item, style }: { item: Pick<StageItem, 'id' | 'title' | 'imageUrl'>; style: object }) {
  const colors = IMAGE_GRADIENTS[hashIndex(item.id, IMAGE_GRADIENTS.length)];
  return (
    <LinearGradient colors={colors as any} style={[styles.artworkBase, style]}>
      {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.imageFill} resizeMode="cover" /> : null}
      {!item.imageUrl ? <Text style={styles.fallbackInitials}>{contentInitials(item.title)}</Text> : null}
    </LinearGradient>
  );
}

function StageHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  const label = user?.email || 'PLUGGD';
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
      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>STAGE</Text>
      <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Search PLUGGD" style={styles.headerIcon} onPress={() => router.push('/search' as any)}>
          <MaterialIcons name="search" size={23} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" style={styles.headerIcon} onPress={() => router.push('/notifications' as any)}>
          <MaterialIcons name="notifications-none" size={23} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" style={[styles.avatarButton, { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface }]} onPress={() => router.push(user ? '/profile' : '/auth/login' as any)}>
          <Text style={[styles.avatarInitials, { color: theme.colors.text }]}>{contentInitials(label)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterPills({ active, onChange }: { active: StageFilter; onChange: (filter: StageFilter) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {FILTERS.map((filter) => {
        const selected = filter === active;
        return (
          <Pressable
            key={filter}
            accessibilityRole="button"
            accessibilityLabel={`${filter} Stage filter`}
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

function ContinueListening({ item, onOpen }: { item?: SavedContentItem; onOpen: () => void }) {
  if (!item) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Continue ${item.title}`} style={styles.continueCard} onPress={onOpen}>
      <View style={styles.continueArt}>
        {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.imageFill} /> : <MaterialIcons name="graphic-eq" size={24} color={COLORS.orange} />}
      </View>
      <View style={styles.continueCopy}>
        <Text style={styles.continueKicker}>CONTINUE</Text>
        <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.continueMeta} numberOfLines={1}>{item.subtitle || 'Recently played'}</Text>
        <View style={styles.continueProgress}><View style={styles.continueProgressFill} /></View>
      </View>
      <View style={styles.continueButton}>
        <MaterialIcons name="play-arrow" size={22} color={COLORS.canvas} />
      </View>
    </Pressable>
  );
}

function FeaturedHero({
  item,
  saved,
  onPlay,
  onOpen,
  onBackstage,
  onSave,
}: {
  item?: StageItem;
  saved: boolean;
  onPlay: () => void;
  onOpen: () => void;
  onBackstage: () => void;
  onSave: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.07, duration: 9500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 9500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  if (!item) {
    return (
      <View style={styles.heroEmpty}>
        <Text style={styles.emptyTitle}>Stage is loading.</Text>
        <Text style={styles.emptyBody}>Published PLUGGD media will shape this editorial feature.</Text>
      </View>
    );
  }

  const playable = isPlayable(item);
  const backstageRoute = item.backstageRoute;
  return (
    <View style={styles.heroCard}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        <StageArtwork item={item} style={styles.heroArtwork} />
      </Animated.View>
      <LinearGradient colors={['rgba(8,8,12,0.03)', 'rgba(8,8,12,0.54)', 'rgba(8,8,12,0.96)']} locations={[0, 0.44, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.heroContent}>
        <View style={styles.heroTag}>
          <Text style={styles.heroTagText}>{kindLabel(item.kind)}</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.heroCreator} numberOfLines={1}>{item.creator}</Text>
        {item.metadata ? <Text style={styles.heroMeta} numberOfLines={1}>{item.metadata}</Text> : null}
        <View style={styles.heroActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={playable ? `Play ${item.title}` : `Open ${item.title}`} style={styles.heroPlay} onPress={playable ? onPlay : onOpen}>
            <MaterialIcons name={playable ? 'play-arrow' : 'open-in-new'} size={21} color={COLORS.canvas} />
            <Text style={styles.heroPlayText}>{playable ? 'Play' : 'Open'}</Text>
          </Pressable>
          {backstageRoute ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Open community" style={styles.backstageButton} onPress={onBackstage}>
              <Text style={styles.backstageButtonText}>Community</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave media' : 'Save media'} style={styles.saveHero} onPress={onSave}>
            <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={24} color={saved ? COLORS.orange : COLORS.soft} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SwipeBeatsPromo() {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Start Swipe Beats" style={styles.swipeCard} onPress={() => router.push('/swipe-beats' as any)}>
      <LinearGradient colors={['rgba(255,90,0,0.22)', 'rgba(18,18,26,0.96)']} style={StyleSheet.absoluteFill} />
      <View style={styles.swipeCopy}>
        <Text style={styles.swipeTitle}>Swipe Beats</Text>
        <Text style={styles.swipeBody}>Find beats fast. Save, skip, license.</Text>
        <View style={styles.swipeCTA}><Text style={styles.swipeCTAText}>Start Swiping</Text></View>
      </View>
      <View style={styles.swipeStack}>
        {[0, 1, 2].map((index) => (
          <View key={`swipe-preview-${index}`} style={[styles.swipePreview, { right: 18 + index * 24, transform: [{ rotate: `${index * -7}deg` }] }]}>
            <MaterialIcons name="graphic-eq" size={22} color={index === 0 ? COLORS.orange : COLORS.soft} />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} style={styles.sectionActionTap} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MediaCard({ item, saved, onOpen, onPlay, onSave }: { item: StageItem; saved: boolean; onOpen: () => void; onPlay: () => void; onSave: () => void }) {
  const playable = isPlayable(item);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.mediaCard} onPress={onOpen}>
      <StageArtwork item={item} style={styles.mediaArtwork} />
      <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.mediaMeta} numberOfLines={1}>{item.creator}</Text>
      <View style={styles.mediaFooter}>
        <Pressable accessibilityRole="button" accessibilityLabel={playable ? `Play ${item.title}` : `Open ${item.title}`} style={styles.inlineAction} onPress={(event) => { event.stopPropagation(); playable ? onPlay() : onOpen(); }}>
          <MaterialIcons name={playable ? 'play-arrow' : 'open-in-new'} size={16} color={COLORS.soft} />
          <Text style={styles.inlineActionText}>{item.metric || (playable ? 'Play' : 'Open')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave item' : 'Save item'} style={styles.saveSmall} onPress={(event) => { event.stopPropagation(); onSave(); }}>
          <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={20} color={saved ? COLORS.orange : COLORS.muted} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function VideoCard({ item, onOpen }: { item: StageItem; onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.videoCard} onPress={onOpen}>
      <StageArtwork item={item} style={styles.videoArtwork} />
      <View style={styles.videoPlay}><MaterialIcons name="play-arrow" size={22} color={COLORS.canvas} /></View>
      <Text style={styles.videoTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.videoMeta} numberOfLines={1}>{item.metadata || item.creator}</Text>
    </Pressable>
  );
}

function SoundboardCard({ item, onOpen }: { item: StageItem; onOpen: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.soundboardCard} onPress={onOpen}>
      <View style={styles.soundboardIcon}><MaterialIcons name="dashboard-customize" size={23} color={COLORS.orange} /></View>
      <View style={styles.soundboardCopy}>
        <Text style={styles.soundboardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.soundboardMeta} numberOfLines={2}>{item.metadata || 'Soundboard'}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={COLORS.muted} />
    </Pressable>
  );
}

function BeatRow({ item, saved, onOpen, onPlay, onSave }: { item: StageItem; saved: boolean; onOpen: () => void; onPlay: () => void; onSave: () => void }) {
  const playable = isPlayable(item);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.beatRow} onPress={onOpen}>
      <StageArtwork item={item} style={styles.beatArt} />
      <View style={styles.beatCopy}>
        <Text style={styles.beatTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.beatMeta} numberOfLines={1}>{item.creator} · {item.metadata}</Text>
      </View>
      <Waveform id={item.id} compact />
      <Pressable accessibilityRole="button" accessibilityLabel={playable ? `Play ${item.title}` : `Open ${item.title}`} style={styles.beatPlay} onPress={(event) => { event.stopPropagation(); playable ? onPlay() : onOpen(); }}>
        <MaterialIcons name={playable ? 'play-arrow' : 'open-in-new'} size={18} color={COLORS.canvas} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Unsave beat' : 'Save beat'} style={styles.beatSave} onPress={(event) => { event.stopPropagation(); onSave(); }}>
        <MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={20} color={saved ? COLORS.orange : COLORS.muted} />
      </Pressable>
    </Pressable>
  );
}

function ChartRow({ rank, title, meta, imageUrl, route }: { rank: number; title: string; meta?: string | null; imageUrl?: string | null; route: string }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} style={styles.chartRow} onPress={() => router.push(route as any)}>
      <Text style={styles.chartRank}>{rank}</Text>
      <View style={styles.chartArt}>{imageUrl ? <PluggdImage uri={imageUrl} style={styles.imageFill} /> : <Text style={styles.chartInitial}>{contentInitials(title)}</Text>}</View>
      <View style={styles.chartCopy}>
        <Text style={styles.chartTitle} numberOfLines={1}>{title}</Text>
        {meta ? <Text style={styles.chartMeta} numberOfLines={1}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

function GenreHubs() {
  const router = useRouter();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRail}>
      {GENRES.map((genre) => (
        <Pressable key={genre} accessibilityRole="button" accessibilityLabel={`Open ${genre}`} style={styles.genreChip} onPress={() => router.push(`/genre/${encodeURIComponent(genre)}` as any)}>
          <Text style={styles.genreText}>{genre}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function CreatorRow({ creator, live }: { creator: ProfileItem; live: boolean }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${profileName(creator)}`} style={styles.creatorRow} onPress={() => router.push(profileRoute(creator) as any)}>
      <View style={styles.creatorAvatar}>{creator.avatar_url ? <PluggdImage uri={creator.avatar_url} style={styles.imageFill} /> : <Text style={styles.creatorInitial}>{contentInitials(profileName(creator))}</Text>}</View>
      <View style={styles.creatorCopy}>
        <Text style={styles.creatorName} numberOfLines={1}>{profileName(creator)}</Text>
        <Text style={styles.creatorMeta} numberOfLines={1}>{profileMeta(creator)}</Text>
      </View>
      {live ? <View style={styles.creatorLive}><Text style={styles.creatorLiveText}>LIVE</Text></View> : null}
      <View style={styles.followButton}><Text style={styles.followText}>Follow</Text></View>
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
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = usePlayback();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const recentlyPlayed = useQuery({ queryKey: ['culture', 'stage-recently-played'], queryFn: () => loadRecentlyPlayedLibraryItems(8) });
  const soundboardIds = useMemo(() => (home.data?.soundboards || []).map((item) => item.id), [home.data?.soundboards]);
  const extras = useQuery({ queryKey: ['culture', 'stage-extras', soundboardIds.join(',')], queryFn: () => loadStageExtras(soundboardIds), enabled: Boolean(home.data) });
  const [activeFilter, setActiveFilter] = useState<StageFilter>('For You');
  const [chartTab, setChartTab] = useState<ChartTab>('Beats');
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const groups = useMemo<Record<StageItemKind, StageItem[]>>(() => ({
    release: mapReleases(home.data),
    mix: mapMixes(home.data),
    video: mapVideos(extras.data?.videos || []),
    beat: mapBeats(home.data),
    soundboard: mapSoundboards(home.data, extras.data?.latestSoundboardItems || {}),
    playlist: mapPlaylists(extras.data?.playlists || []),
    sample_pack: mapSamplePacks(home.data),
  }), [extras.data?.latestSoundboardItems, extras.data?.playlists, extras.data?.videos, home.data]);

  const mixedItems = useMemo(() => filterItems(activeFilter, groups), [activeFilter, groups]);
  const heroItem = useMemo(() => heroFor(activeFilter, groups), [activeFilter, groups]);
  const recentlyPlayedItem = recentlyPlayed.data?.[0];
  const loading = home.isLoading || extras.isLoading;
  const refreshing = home.isRefetching || extras.isRefetching || recentlyPlayed.isRefetching;
  const bottomPadding = Math.max(insets.bottom + 154, 176);
  const heroHeight = Math.min(270, Math.max(230, width * 0.64));
  const liveCreatorIds = new Set<string>();

  useEffect(() => {
    if (!library.data?.saved) return;
    setSavedIds(new Set(library.data.saved.map((item) => item.route.split('/').pop()).filter((id): id is string => Boolean(id))));
  }, [library.data?.saved]);

  const currentTrackMatches = (item: StageItem) => {
    return currentTrack?.id === item.id || currentTrack?.releaseId === item.id || currentTrack?.mixId === item.id || currentTrack?.beatId === item.id || currentTrack?.samplePackId === item.id;
  };

  const openItem = (item: StageItem) => {
    selectionHaptic();
    router.push(item.route as any);
  };

  const playItem = async (item: StageItem) => {
    const track = getItemTrack(item);
    impactHaptic();
    if (!track) {
      openItem(item);
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
      openItem(item);
    }
  };

  const saveItem = async (item: StageItem) => {
    impactHaptic();
    const result = await toggleSavedContent(item.kind as SavedContentKind, item.id);
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
    void extras.refetch();
    void recentlyPlayed.refetch();
    void library.refetch();
  };

  const renderMediaShelf = (title: string, items: StageItem[], variant: 'card' | 'video' | 'soundboard' = 'card') => {
    if (!items.length) return <EmptyInline title={`No ${title.toLowerCase()} yet.`} body="Fresh media will appear here soon." />;
    return (
      <>
        <SectionHeader title={title} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaShelf}>
          {items.map((item) => {
            if (variant === 'video') return <VideoCard key={`${item.kind}-${item.id}`} item={item} onOpen={() => openItem(item)} />;
            if (variant === 'soundboard') return <SoundboardCard key={`${item.kind}-${item.id}`} item={item} onOpen={() => openItem(item)} />;
            return (
              <MediaCard
                key={`${item.kind}-${item.id}`}
                item={item}
                saved={savedIds.has(item.id)}
                onOpen={() => openItem(item)}
                onPlay={() => playItem(item)}
                onSave={() => saveItem(item)}
              />
            );
          })}
        </ScrollView>
      </>
    );
  };

  const renderFiltered = () => {
    if (activeFilter === 'Releases') return renderMediaShelf('NEW DROPS / RELEASES', groups.release);
    if (activeFilter === 'Mixes') return renderMediaShelf('MIXES', groups.mix);
    if (activeFilter === 'Videos') return renderMediaShelf('VIDEOS', groups.video, 'video');
    if (activeFilter === 'Soundboards') return renderMediaShelf('SOUNDBOARDS', groups.soundboard, 'soundboard');
    if (activeFilter === 'Playlists') return renderMediaShelf('PLAYLISTS', groups.playlist);
    if (activeFilter === 'Beats') {
      return (
        <>
          <SwipeBeatsPromo />
          <SectionHeader title="BEATS / PRODUCER DROPS" />
          <View style={styles.rowList}>{groups.beat.map((item) => <BeatRow key={item.id} item={item} saved={savedIds.has(item.id)} onOpen={() => openItem(item)} onPlay={() => playItem(item)} onSave={() => saveItem(item)} />)}</View>
        </>
      );
    }
    return null;
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
        <ContinueListening item={recentlyPlayedItem} onOpen={() => recentlyPlayedItem && router.push(recentlyPlayedItem.route as any)} />
        {loading ? <PremiumSkeleton compact label="Loading Stage media..." style={styles.loadingBlock} /> : null}

        <View style={[styles.heroWrap, { height: heroHeight }]}>
          <FeaturedHero
            item={heroItem}
            saved={heroItem ? savedIds.has(heroItem.id) : false}
            onPlay={() => heroItem && playItem(heroItem)}
            onOpen={() => heroItem && openItem(heroItem)}
            onBackstage={() => heroItem?.backstageRoute && router.push(heroItem.backstageRoute as any)}
            onSave={() => heroItem && saveItem(heroItem)}
          />
        </View>

        {activeFilter !== 'For You' ? (
          <View style={styles.sectionBlock}>{renderFiltered()}</View>
        ) : (
          <>
            <View style={styles.sectionBlock}>
              <SwipeBeatsPromo />
            </View>
            <View style={styles.sectionBlock}>{renderMediaShelf('TRENDING NOW', mixedItems.slice(0, 12))}</View>
            <View style={styles.sectionBlock}>{renderMediaShelf('NEW DROPS / RELEASES', groups.release)}</View>
            <View style={styles.sectionBlock}>{renderMediaShelf('MIXES', groups.mix)}</View>
            <View style={styles.sectionBlock}>{renderMediaShelf('VIDEOS', groups.video, 'video')}</View>
            <View style={styles.sectionBlock}>{renderMediaShelf('SOUNDBOARDS', groups.soundboard, 'soundboard')}</View>
            <View style={styles.sectionBlock}>
              <SectionHeader title="BEATS / PRODUCER DROPS" />
              <View style={styles.rowList}>{groups.beat.slice(0, 6).map((item) => <BeatRow key={item.id} item={item} saved={savedIds.has(item.id)} onOpen={() => openItem(item)} onPlay={() => playItem(item)} onSave={() => saveItem(item)} />)}</View>
            </View>
            <View style={styles.sectionBlock}>
              <SectionHeader title="CHARTS" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartTabs}>
                {CHART_TABS.map((tab) => (
                  <Pressable key={tab} style={[styles.chartTab, chartTab === tab && styles.chartTabActive]} onPress={() => setChartTab(tab)}>
                    <Text style={[styles.chartTabText, chartTab === tab && styles.chartTabTextActive]}>{tab}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.chartList}>
                {(chartTab === 'Beats' ? groups.beat : chartTab === 'Releases' ? groups.release : chartTab === 'Mixes' ? groups.mix : []).slice(0, 5).map((item, index) => (
                  <ChartRow key={`${chartTab}-${item.id}`} rank={index + 1} title={item.title} meta={[item.creator, item.metric || item.metadata].filter(Boolean).join(' · ')} imageUrl={item.imageUrl} route={item.route} />
                ))}
                {chartTab === 'Creators' ? (home.data?.profiles || []).slice(0, 5).map((profile, index) => (
                  <ChartRow key={`creator-chart-${profile.user_id || index}`} rank={index + 1} title={profileName(profile)} meta={profileMeta(profile)} imageUrl={profile.avatar_url} route={profileRoute(profile)} />
                )) : null}
              </View>
            </View>
            <View style={styles.sectionBlock}>
              <SectionHeader title="GENRE HUBS" />
              <GenreHubs />
            </View>
            <View style={styles.sectionBlock}>{renderMediaShelf('PLAYLISTS', groups.playlist)}</View>
            <View style={styles.sectionBlock}>{renderMediaShelf('SAMPLE PACKS', groups.sample_pack)}</View>
            <View style={styles.sectionBlock}>
              <SectionHeader title="RECOMMENDED CREATORS" />
              {(home.data?.profiles || []).length ? (
                <View style={styles.creatorList}>
                  {(home.data?.profiles || []).slice(0, 8).map((profile) => (
                    <CreatorRow key={profile.user_id || profile.username || profile.full_name || Math.random().toString()} creator={profile} live={Boolean(profile.user_id && liveCreatorIds.has(profile.user_id))} />
                  ))}
                </View>
              ) : <EmptyInline title="No creator recommendations yet." body="Creator profiles will appear here when available." />}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  header: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 3 },
  headerTitle: { ...pluggdTextStyles.appTitle, fontSize: 32, lineHeight: 36 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  avatarInitials: { fontFamily: 'Satoshi-Bold', fontSize: 12 },
  scrollContent: { paddingTop: 12 },
  filters: { minHeight: 44, paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' },
  filterPill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
  filterPillActive: {},
  filterText: { height: 32, paddingHorizontal: 14, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(31,31,46,0.72)', borderWidth: 1, borderColor: COLORS.surface2, color: COLORS.muted, fontFamily: 'Satoshi-Medium', fontSize: 13, lineHeight: 31 },
  filterTextActive: { color: COLORS.orange, borderColor: 'rgba(255,90,0,0.72)', backgroundColor: 'rgba(255,90,0,0.16)' },
  continueCard: { height: 84, marginHorizontal: 16, marginTop: 4, marginBottom: 14, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  continueArt: { width: 58, height: 58, borderRadius: 13, overflow: 'hidden', backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  continueCopy: { flex: 1, minWidth: 0 },
  continueKicker: { color: COLORS.orange, fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 0.7 },
  continueTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15, marginTop: 2 },
  continueMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  continueProgress: { height: 3, borderRadius: 2, backgroundColor: COLORS.surface2, marginTop: 7, overflow: 'hidden' },
  continueProgressFill: { width: '42%', height: '100%', backgroundColor: COLORS.orange },
  continueButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  loadingBlock: { marginHorizontal: 16, marginBottom: 12, height: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { marginHorizontal: 16, marginTop: 4, marginBottom: 22 },
  heroCard: { flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: COLORS.surface, shadowColor: COLORS.orange, shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
  heroArtwork: { width: '100%', height: '100%' },
  heroContent: { position: 'absolute', left: 18, right: 14, bottom: 16 },
  heroTag: { alignSelf: 'flex-start', minHeight: 24, borderRadius: 12, paddingHorizontal: 9, justifyContent: 'center', backgroundColor: 'rgba(8,8,12,0.66)', borderWidth: 1, borderColor: 'rgba(255,90,0,0.34)' },
  heroTagText: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 10, textTransform: 'uppercase' },
  heroTitle: { ...pluggdTextStyles.heroTitle, marginTop: 12, color: COLORS.white, fontSize: 29, lineHeight: 32 },
  heroCreator: { marginTop: 5, color: COLORS.soft, fontFamily: 'Satoshi-Bold', fontSize: 14 },
  heroMeta: { marginTop: 5, color: COLORS.muted, fontSize: 12 },
  heroActions: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroPlay: { height: 44, minWidth: 118, borderRadius: 22, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: COLORS.white },
  heroPlayText: { fontFamily: 'Satoshi-Bold', color: COLORS.canvas, fontSize: 15 },
  backstageButton: { height: 44, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(18,18,26,0.62)' },
  backstageButtonText: { fontFamily: 'Satoshi-Bold', color: COLORS.white, fontSize: 13 },
  saveHero: { marginLeft: 'auto', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(8,8,12,0.52)' },
  heroEmpty: { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: COLORS.surface2, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  artworkBase: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  imageFill: { width: '100%', height: '100%' },
  fallbackInitials: { color: 'rgba(255,255,255,0.86)', fontFamily: 'Satoshi-Black', fontSize: 34 },
  sectionBlock: { marginBottom: 26 },
  sectionHeader: { paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...pluggdTextStyles.sectionTitle, color: COLORS.white, fontSize: 18, lineHeight: 22 },
  sectionActionTap: { minHeight: 44, justifyContent: 'center' },
  sectionAction: { color: COLORS.orange, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  mediaShelf: { paddingHorizontal: 16, gap: 12 },
  mediaCard: { width: 158, height: 232, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 8 },
  mediaArtwork: { width: 140, height: 140, borderRadius: 13, marginBottom: 8 },
  mediaTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14, lineHeight: 17 },
  mediaMeta: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  mediaFooter: { position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineActionText: { color: COLORS.muted, fontSize: 11, fontFamily: 'Satoshi-Bold' },
  saveSmall: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  videoCard: { width: 240, height: 166, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  videoArtwork: { width: '100%', height: 112 },
  videoPlay: { position: 'absolute', top: 39, left: 99, width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  videoTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14, marginHorizontal: 10, marginTop: 8 },
  videoMeta: { color: COLORS.muted, fontSize: 11, marginHorizontal: 10, marginTop: 2 },
  soundboardCard: { width: 206, height: 144, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  soundboardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  soundboardCopy: { flex: 1, minWidth: 0 },
  soundboardTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14 },
  soundboardMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },
  swipeCard: { height: 136, marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,90,0,0.28)', backgroundColor: COLORS.surface },
  swipeCopy: { position: 'absolute', left: 16, top: 14, bottom: 14, width: '62%', justifyContent: 'center' },
  swipeTitle: { color: COLORS.white, fontFamily: 'Satoshi-Black', fontSize: 21 },
  swipeBody: { color: COLORS.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  swipeCTA: { alignSelf: 'flex-start', minHeight: 34, borderRadius: 17, paddingHorizontal: 13, justifyContent: 'center', backgroundColor: COLORS.orange, marginTop: 12 },
  swipeCTAText: { color: COLORS.canvas, fontFamily: 'Satoshi-Bold', fontSize: 12, textTransform: 'uppercase' },
  swipeStack: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 150, justifyContent: 'center' },
  swipePreview: { position: 'absolute', width: 74, height: 92, borderRadius: 16, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  rowList: { paddingHorizontal: 16, gap: 8 },
  beatRow: { minHeight: 82, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  beatArt: { width: 58, height: 58, borderRadius: 13 },
  beatCopy: { flex: 1, minWidth: 0 },
  beatTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14 },
  beatMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  waveform: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveformCompact: { width: 72 },
  waveBar: { width: 2, borderRadius: 2 },
  beatPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  beatSave: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chartTabs: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  chartTab: { minHeight: 34, borderRadius: 17, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chartTabActive: { backgroundColor: 'rgba(255,90,0,0.16)', borderColor: 'rgba(255,90,0,0.62)' },
  chartTabText: { color: COLORS.muted, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  chartTabTextActive: { color: COLORS.orange },
  chartList: { paddingHorizontal: 16, gap: 7 },
  chartRow: { minHeight: 64, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartRank: { width: 24, textAlign: 'center', color: COLORS.orange, fontFamily: 'Satoshi-Black', fontSize: 15 },
  chartArt: { width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.surface2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  chartInitial: { color: COLORS.white, fontFamily: 'Satoshi-Black', fontSize: 14 },
  chartCopy: { flex: 1, minWidth: 0 },
  chartTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 14 },
  chartMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  genreRail: { paddingHorizontal: 16, gap: 8 },
  genreChip: { minHeight: 38, borderRadius: 19, paddingHorizontal: 15, justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  genreText: { color: COLORS.soft, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  creatorList: { paddingHorizontal: 16, gap: 8 },
  creatorRow: { minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  creatorAvatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  creatorInitial: { color: COLORS.white, fontFamily: 'Satoshi-Black', fontSize: 14 },
  creatorCopy: { flex: 1, minWidth: 0 },
  creatorName: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 15 },
  creatorMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  creatorLive: { minHeight: 22, borderRadius: 11, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: COLORS.coral },
  creatorLiveText: { color: COLORS.white, fontFamily: 'Satoshi-Black', fontSize: 10 },
  followButton: { minWidth: 74, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  followText: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  emptyInline: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 16 },
  emptyTitle: { color: COLORS.white, fontFamily: 'Satoshi-Bold', fontSize: 16 },
  emptyBody: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
});
