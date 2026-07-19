import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  InteractionManager,
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
import { LiveTicker } from '../../../components/LiveTicker';
import { ed, edFonts } from '../../design/editorial';
import {
  EdPressable,
  AudioPill,
  CreamButton,
  Eyebrow,
  GhostButton,
  InkChip,
  OrangeButton,
  Pushpin,
  SectionBody,
  SerifTitle,
  StickyNote,
  TornEdge,
  WaveTicks,
} from '../editorial/EditorialBits';
import { usePlayback, type PluggdTrack } from '../../context/PlaybackProvider';
import {
  loadSoundboardItemDetails,
  safeList,
} from '../culture/mobileServices';
import {
  useBackstage,
  useHomeFeed,
  useLiveRooms,
  type LiveRoomItem,
} from '../culture/useCultureData';
import { supabase } from '../../lib/supabase';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';
import {
  formatCompact,
  formatDate,
  formatGBP,
  priceForRelease,
  releasePlayableUrl,
  toTrack,
  type BeatItem,
  type EventItem,
  type FeedBundle,
  type ProfileItem,
  type ReleaseItem,
  type SamplePackItem,
} from '../../lib/mobileContent';

// Section order mirrors the live web home (NewHome2) mobile view top-to-bottom.
const HOME_SECTION_ORDER = [
  'Top bar',
  'Hero / edition masthead',
  'Realtime ticker',
  'Live now on PLUGGD',
  'The next wave is already here',
  'Featured story',
  'Explore your scene',
  'Soundboards',
  'Tonight on PLUGGD',
  'Drops / Marketplace',
  'Backstage / Communities',
  'Build your world',
  'Platform pulse',
  'Embody the culture',
] as const;

function resolveAssetUri(source: ImageSourcePropType) {
  const resolver = Image.resolveAssetSource;
  const resolved = typeof resolver === 'function' ? resolver(source) : null;
  if (resolved?.uri) return resolved.uri;
  if (source && typeof source === 'object' && 'uri' in source && source.uri) return String(source.uri);
  return undefined;
}

const HOME_HERO_FALLBACK = resolveAssetUri(WEB_PARITY_ASSETS.intimateCrowdHero);

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

type StorePreviewItem = {
  id: string;
  kind: 'beat' | 'sample_pack' | 'store' | 'release';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
  priceLabel?: string | null;
  actionLabel: string;
  track?: PluggdTrack | null;
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

type BlogPostRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  tags: string[] | null;
  created_at: string | null;
};

type SceneCircuit = {
  id: string;
  label: string;
  title: string;
  copy: string;
  imageUrl?: string | null;
  route: string;
};

function profileName(profile?: ProfileItem | null) {
  if (!profile) return null;
  return profile.display_name || profile.full_name || profile.username || null;
}

function locationCity(location?: string | null) {
  if (!location) return 'Location TBA';
  return location.split(',').map((part) => part.trim()).filter(Boolean)[0] || 'Location TBA';
}

function daysAgo(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return 'today';
  return `${days}d ago`;
}

function resolveSpotlight(
  bundle?: FeedBundle,
  liveRooms: LiveRoomItem[] = [],
  communities: Array<{ id: string; title?: string | null; cover_image_url?: string | null; avatar_url?: string | null }> = [],
): Spotlight {
  const release = bundle?.releases.find((item) => releasePlayableUrl(item)) || bundle?.releases[0];
  if (release) {
    const track = toTrack(release, 'release');
    return {
      id: release.id,
      kind: 'release',
      title: release.title || 'New on PLUGGD',
      meta: [release.artist, release.genre].filter(Boolean).join(' - ') || 'Latest release',
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
      title: mix.title || 'New mix on PLUGGD',
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
      title: soundboard.title || 'Active board',
      meta: `${formatCompact(soundboard.item_count)} items`,
      imageUrl: soundboard.cover_image_url,
      route: `/soundboards/${soundboard.slug || soundboard.id}`,
      cta: 'Open Soundboard',
    };
  }

  const liveRoom = liveRooms.find((room) => room.status === 'live');
  if (liveRoom) {
    return {
      id: liveRoom.id,
      kind: 'live',
      title: liveRoom.title || 'Producer room is live',
      meta: liveRoom.category || 'Live now',
      imageUrl: liveRoom.thumbnail_url || liveRoom.creator_avatar_url,
      route: `/live/session?roomId=${liveRoom.id}`,
      cta: 'Join Live',
      live: true,
    };
  }

  const event = bundle?.events[0];
  if (event) {
    return {
      id: event.id,
      kind: 'event',
      title: event.title || 'Event on PLUGGD',
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
      title: profileName(creator) || 'Creator to watch',
      meta: creator.city || 'Creator',
      imageUrl: creator.avatar_url,
      route: creator.username ? `/creator/${creator.username}` : '/search',
      cta: 'Open',
    };
  }

  const community = communities[0];
  if (community) {
    return {
      id: community.id,
      kind: 'community',
      title: community.title || 'Community spotlight',
      meta: 'Community',
      imageUrl: community.cover_image_url || community.avatar_url,
      route: `/backstage/${community.id}`,
      cta: 'Open',
    };
  }

  return {
    id: 'empty',
    kind: 'empty',
    title: 'Where music culture comes alive',
    meta: 'Authentic. Unfiltered. The heartbeat of the scene.',
  };
}

/** Port of the web home's buildScenes — city rooms from events, genre circuits from drops. */
function buildSceneCircuits(bundle?: FeedBundle): SceneCircuit[] {
  if (!bundle) return [];
  const map = new Map<string, SceneCircuit & { score: number }>();

  bundle.events.forEach((event) => {
    const city = locationCity(event.location);
    if (!city || city === 'Location TBA') return;
    const key = `city-${city.toLowerCase()}`;
    const existing = map.get(key);
    map.set(key, {
      id: key,
      label: 'City',
      title: `${city} rooms`,
      copy: event.description || `${event.title || 'Underground events'} and nearby underground events.`,
      imageUrl: event.cover_image_url,
      route: '/events',
      score: (existing?.score || 0) + 3,
    });
  });

  [...bundle.releases, ...bundle.beats].forEach((item) => {
    const genre = (item as ReleaseItem).genre;
    if (!genre) return;
    const key = `genre-${genre.toLowerCase()}`;
    if (map.has(key)) return;
    map.set(key, {
      id: key,
      label: 'Sound',
      title: `${genre} circuit`,
      copy: 'Artists, producers, rooms, and drops moving through this sound.',
      imageUrl: 'cover_art_url' in item ? (item as ReleaseItem).cover_art_url : (item as BeatItem).image_url,
      route: `/genre/${encodeURIComponent(genre)}`,
      score: 2,
    });
  });

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function buildMarketplaceItems(bundle: FeedBundle | undefined, storeProducts: StoreProductRow[]): StorePreviewItem[] {
  if (!bundle) return [];
  const releases = bundle.releases.slice(0, 2).map<StorePreviewItem>((release) => ({
    id: `release-${release.id}`,
    kind: 'release',
    title: release.title || 'Untitled release',
    subtitle: [release.artist, release.genre].filter(Boolean).join(' - ') || 'Release',
    imageUrl: release.cover_art_url,
    route: `/release/${release.id}`,
    priceLabel: formatGBP(priceForRelease(release)),
    actionLabel: 'Listen',
    track: toTrack(release, 'release'),
  }));
  const beats = bundle.beats.slice(0, 2).map<StorePreviewItem>((beat) => ({
    id: `beat-${beat.id}`,
    kind: 'beat',
    title: beat.title || 'Untitled beat',
    subtitle: [beat.producer_name, beat.genre].filter(Boolean).join(' - ') || 'Beat license',
    imageUrl: beat.image_url,
    route: `/beat/${beat.id}`,
    priceLabel: formatGBP(beat.price),
    actionLabel: 'License',
    track: toTrack(beat, 'beat'),
  }));
  const samplePacks = bundle.samplePacks.slice(0, 1).map<StorePreviewItem>((pack: SamplePackItem) => ({
    id: `pack-${pack.id}`,
    kind: 'sample_pack',
    title: pack.title || 'Sample pack',
    subtitle: pack.genre || `${formatCompact(pack.sample_count)} samples`,
    imageUrl: pack.cover_art_url,
    route: `/sample-pack/${pack.id}`,
    priceLabel: formatGBP(pack.price),
    actionLabel: 'License',
  }));
  const products = storeProducts.slice(0, 1).map<StorePreviewItem>((product) => ({
    id: `store-${product.id}`,
    kind: 'store',
    title: product.title || product.name || 'Store item',
    subtitle: product.kind || product.product_type || 'Creator store',
    imageUrl: product.image_url || product.cover_image_url,
    route: product.route || `/product/${product.id}?source=${product.source || 'store_products'}`,
    priceLabel: product.price_cents != null ? formatGBP(product.price_cents, { cents: true }) : product.price != null ? formatGBP(product.price) : null,
    actionLabel: 'Open',
  }));
  return [...beats, ...releases, ...samplePacks, ...products].slice(0, 5);
}

function InlineLoading() {
  return <PremiumSkeleton compact label="Loading PLUGGD data..." style={{ marginVertical: 4 }} />;
}

/* ------------------------------------------------------------------ */
/* Hero — edition masthead                                             */
/* ------------------------------------------------------------------ */

function HomeHero({ spotlight, boardTitle, boardCount, boardImage, boardRoute }: {
  spotlight: Spotlight;
  boardTitle?: string | null;
  boardCount?: number | null;
  boardImage?: string | null;
  boardRoute?: string | null;
}) {
  const router = useRouter();
  const heroImage = spotlight.imageUrl || HOME_HERO_FALLBACK;
  const polaroidImage = boardImage || spotlight.imageUrl || HOME_HERO_FALLBACK;
  return (
    <View style={styles.hero}>
      {heroImage ? <PluggdImage uri={heroImage} style={styles.heroImage} /> : null}
      <LinearGradient
        colors={['rgba(7,6,5,0.62)', 'rgba(7,6,5,0.86)', ed.night]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>
          Where music culture{'\n'}comes <Text style={styles.heroTitleAccent}>alive</Text>
        </Text>
        <Text style={styles.heroSub}>Authentic. Unfiltered. The heartbeat of the scene.</Text>
        <Text style={styles.heroQuote}>
          "Live music communities, creator drops, soundboards, and underground scenes - all in one place."
        </Text>
        {boardTitle || spotlight.kind !== 'empty' ? (
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${boardTitle || spotlight.title}`}
            onPress={() => {
              const target = boardRoute || spotlight.route;
              if (target) router.push(target as any);
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            <View style={styles.heroPolaroid}>
              <View style={styles.heroPolaroidImageWrap}>
                {polaroidImage ? (
                  <PluggdImage uri={polaroidImage} style={styles.heroPolaroidImage} />
                ) : (
                  <View style={[styles.heroPolaroidImage, { backgroundColor: '#1a1611' }]} />
                )}
              </View>
              <Text style={styles.heroPolaroidTitle} numberOfLines={2}>
                {boardTitle || spotlight.title}
              </Text>
              <Text style={styles.heroPolaroidMeta}>
                {boardCount != null ? `${boardCount} items` : spotlight.meta}
              </Text>
            </View>
          </EdPressable>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Live now on PLUGGD                                                  */
/* ------------------------------------------------------------------ */

function LiveNowOnPluggd({ rooms, loading }: { rooms: LiveRoomItem[]; loading: boolean }) {
  const router = useRouter();
  const liveRooms = rooms.filter((room) => room.status === 'live');
  return (
    <View style={styles.nightSection}>
      <SerifTitle text="Live now on PLUGGD" caps size={28} />
      {loading ? (
        <InlineLoading />
      ) : liveRooms.length ? (
        <View style={{ gap: 12 }}>
          {liveRooms.slice(0, 3).map((room) => (
            <EdPressable
              key={room.id}
              accessibilityRole="button"
              accessibilityLabel={`Join ${room.title || 'live room'}`}
              onPress={() => router.push({ pathname: '/live/session', params: { roomId: room.id } } as any)}
              style={styles.liveRoomCard}
            >
              {room.thumbnail_url ? (
                <PluggdImage uri={room.thumbnail_url} style={StyleSheet.absoluteFillObject as any} />
              ) : null}
              <LinearGradient colors={['rgba(7,6,5,0.15)', 'rgba(7,6,5,0.9)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.liveRoomBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveRoomBadgeText}>LIVE</Text>
              </View>
              <View style={{ gap: 4 }}>
                <Text style={styles.liveRoomTitle} numberOfLines={2}>{room.title || 'Live room'}</Text>
                <Text style={styles.liveRoomMeta}>{room.category || 'Live on PLUGGD'}</Text>
              </View>
            </EdPressable>
          ))}
        </View>
      ) : (
        <View style={styles.nightPanel}>
          <Text style={styles.nightPanelBody}>No live rooms open right now. See what is coming up.</Text>
          <View style={styles.buttonRow}>
            <OrangeButton label="View Live" onPress={() => router.push('/live' as any)} />
            <GhostButton label="View Events" onPress={() => router.push('/events' as any)} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The next wave is already here (paper)                               */
/* ------------------------------------------------------------------ */

function NextWave({ bundle, loading }: { bundle?: FeedBundle; loading: boolean }) {
  const router = useRouter();
  const cards = (bundle?.releases ?? []).slice(0, 6).map((release) => ({
    id: release.id,
    name: release.artist || 'PLUGGD creator',
    meta: [release.title, release.genre].filter(Boolean).join(' - ') || 'New release',
    imageUrl: release.cover_art_url,
    route: `/release/${release.id}`,
  }));
  return (
    <View style={styles.paperSection}>
      <SerifTitle text="The next wave is already here" caps size={28} onPaper />
      <SectionBody text="Meet the artists, producers, collectives, and scenes shaping what comes next." onPaper />
      {loading ? (
        <InlineLoading />
      ) : cards.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.waveRail}>
          {cards.map((card) => (
            <EdPressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${card.name}`}
              onPress={() => router.push(card.route as any)}
            >
              <View style={styles.waveCard}>
                <View style={styles.waveCardImageWrap}>
                  {card.imageUrl ? (
                    <PluggdImage uri={card.imageUrl} style={styles.waveCardImage} />
                  ) : (
                    <View style={[styles.waveCardImage, { backgroundColor: '#e7d9c1' }]} />
                  )}
                </View>
                <InkChip text="Support this scene" style={{ marginTop: 12 }} />
                <Text style={styles.waveCardName} numberOfLines={1}>{card.name}</Text>
                <Text style={styles.waveCardMeta} numberOfLines={1}>{card.meta}</Text>
              </View>
            </EdPressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.paperEmpty}>Featured creators will appear when public releases, beats, or rooms are available.</Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Featured story (paper)                                              */
/* ------------------------------------------------------------------ */

function FeaturedStory({ posts, fallbackImage }: { posts: BlogPostRow[]; fallbackImage?: string | null }) {
  const router = useRouter();
  const [first, second] = posts;
  return (
    <View style={[styles.paperSection, { gap: 14 }]}>
      <Eyebrow text="Featured story" />
      {first ? (
        <>
          <SerifTitle text={first.title || 'PLUGGD story'} size={30} onPaper />
          <Text style={styles.storyPublished}>Published PLUGGD story.</Text>
          <CreamButton label="Read story" onPress={() => router.push(`/plug/${first.id}` as any)} />
          {first.featured_image_url || fallbackImage ? (
            <View style={styles.storyLeadImageWrap}>
              <PluggdImage uri={first.featured_image_url || fallbackImage || ''} style={styles.storyLeadImage} />
            </View>
          ) : null}
          {second ? (
            <View style={styles.storyDarkCard}>
              {second.featured_image_url ? (
                <View style={styles.storyDarkImageWrap}>
                  <PluggdImage uri={second.featured_image_url} style={styles.storyDarkImage} />
                </View>
              ) : null}
              <Text style={styles.storyDarkTitle}>{second.title}</Text>
              {second.excerpt ? <Text style={styles.storyDarkExcerpt} numberOfLines={4}>{second.excerpt}</Text> : null}
              {second.tags?.[0] ? <Text style={styles.storyDarkTag}>{second.tags[0]}</Text> : null}
              <CreamButton label="Read story" onPress={() => router.push(`/plug/${second.id}` as any)} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <SerifTitle text="Editorial stories will appear here." size={26} onPaper />
          <Text style={styles.paperEmpty}>No published THE PLUG articles are available yet.</Text>
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Explore your scene (night circuits)                                 */
/* ------------------------------------------------------------------ */

function ExploreYourScene({ circuits, loading }: { circuits: SceneCircuit[]; loading: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.nightSection}>
      <Eyebrow text="Explore your scene" />
      <SerifTitle text="Find the rooms, crews, and sounds moving around you." caps size={27} />
      <SectionBody text="Jump from a late-night listening room to a collective page, a producer drop, or a backstage archive without losing the thread." />
      {loading ? (
        <InlineLoading />
      ) : circuits.length ? (
        <View style={{ gap: 14 }}>
          {circuits.map((circuit) => (
            <EdPressable
              key={circuit.id}
              accessibilityRole="button"
              accessibilityLabel={`Enter ${circuit.title}`}
              onPress={() => router.push(circuit.route as any)}
              style={styles.circuitCard}
            >
              {circuit.imageUrl ? (
                <PluggdImage uri={circuit.imageUrl} style={StyleSheet.absoluteFillObject as any} />
              ) : null}
              <LinearGradient colors={['rgba(7,6,5,0.05)', 'rgba(7,6,5,0.55)', 'rgba(7,6,5,0.92)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.circuitBody}>
                <InkChip text={circuit.label} tone="cream" />
                <Text style={styles.circuitTitle}>{circuit.title}</Text>
                <Text style={styles.circuitCopy} numberOfLines={2}>{circuit.copy}</Text>
                <View style={styles.circuitEnterPill}>
                  <Text style={styles.circuitEnterText}>Enter scene</Text>
                </View>
              </View>
            </EdPressable>
          ))}
        </View>
      ) : (
        <View style={styles.nightPanel}>
          <Text style={styles.nightPanelBody}>Scene cards will appear when events, cities, genres, or public drops are available.</Text>
          <View style={styles.buttonRow}>
            <OrangeButton label="Explore" onPress={() => router.push('/explore' as any)} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Soundboards (paper corkboard)                                       */
/* ------------------------------------------------------------------ */

type SoundboardDetailBundle = Awaited<ReturnType<typeof loadSoundboardItemDetails>>;

function SoundboardsBoard({
  board,
  detail,
  creatorName,
  loading,
}: {
  board?: FeedBundle['soundboards'][number];
  detail?: SoundboardDetailBundle;
  creatorName?: string | null;
  loading: boolean;
}) {
  const router = useRouter();
  const playback = usePlayback();
  const items = detail?.items ?? [];
  const audioItem = items.find((item) => item.item_type === 'audio' && item.media_url);
  const imageItem = items.find((item) => item.item_type === 'image' && item.media_url);
  const noteItem = items.find((item) => item.item_type === 'note');
  const latestComment = detail?.boardComments?.[0];
  const boardRoute = board ? `/soundboards/${board.slug || board.id}` : '/soundboards';
  const updatedLabel = daysAgo(board?.last_activity_at || board?.created_at);
  const audioTrack = audioItem ? toTrack(audioItem as any, 'soundboard') : null;
  const audioPlaying = Boolean(audioTrack && playback.currentTrack?.id === audioTrack.id && playback.isPlaying);

  return (
    <View style={styles.paperSection}>
      <SerifTitle text="Soundboards" caps size={30} onPaper />
      <SectionBody text="Raw ideas, references, comments, and audio sketches from creators building in public." onPaper />
      {loading ? (
        <InlineLoading />
      ) : board ? (
        <View style={styles.corkboard}>
          <View style={styles.corkCenterLine} />
          <View style={styles.corkStickyWrap}>
            <Pushpin style={styles.corkPinCentered} />
            <StickyNote title={board.title || 'Untitled board'} body={board.description} rotate="-2.5deg" showLabel={false} style={styles.corkTitleNote} />
          </View>
          {audioItem ? (
            <AudioPill
              light
              label="audio"
              playing={audioPlaying}
              onPress={() => {
                if (audioTrack) void playback.playTrack(audioTrack);
              }}
              style={{ marginTop: 18 }}
            />
          ) : null}
          {imageItem?.media_url ? (
            <View style={styles.corkPolaroidWrap}>
              <Pushpin style={styles.corkPinCentered} />
              <View style={styles.corkPolaroid}>
                <PluggdImage uri={imageItem.media_url} style={styles.corkPolaroidImage} />
                <Text style={styles.corkPolaroidCaption} numberOfLines={1}>{imageItem.title || board.title}</Text>
              </View>
            </View>
          ) : null}
          {noteItem?.content_text || noteItem?.title ? (
            <StickyNote
              title={noteItem.title || 'Note'}
              body={noteItem.content_text}
              rotate="2deg"
              style={{ alignSelf: 'flex-end', marginTop: 16 }}
            />
          ) : null}
          <Text style={styles.corkOpenLine}>
            Open <Text style={{ fontFamily: edFonts.bodyBlack }}>{board.title || 'this board'}</Text> and follow the latest public additions.
          </Text>
          <View style={styles.chipWrapRow}>
            {updatedLabel ? <InkChip text={`Updated ${updatedLabel}`} /> : null}
            <InkChip text={`${formatCompact(board.item_count)} items`} />
            <InkChip text="Comments open" />
            {creatorName ? <InkChip text={creatorName} /> : null}
          </View>
          {latestComment?.content ? (
            <StickyNote title={latestComment.content} rotate="-1.5deg" showLabel={false} style={{ marginTop: 14, maxWidth: 240 }} />
          ) : (
            <StickyNote title="No public comments yet." rotate="-1.5deg" showLabel={false} style={{ marginTop: 14, maxWidth: 220 }} />
          )}
          <OrangeButton label="Open Soundboard" onPress={() => router.push(boardRoute as any)} style={{ marginTop: 16 }} />
          <View style={styles.corkWavePaper}>
            <Pushpin style={styles.corkPinCentered} />
            <WaveTicks bars={34} color="rgba(34,23,15,0.55)" height={44} />
            <StickyNote
              title={`${formatCompact(board.like_count)} likes`}
              rotate="-3deg"
              showLabel={false}
              style={styles.corkLikesSticky}
            />
          </View>
        </View>
      ) : (
        <Text style={styles.paperEmpty}>Public soundboards will appear here once creators publish them.</Text>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Tonight on PLUGGD (events)                                          */
/* ------------------------------------------------------------------ */

function TonightOnPluggd({ events, loading }: { events: EventItem[]; loading: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.nightSection}>
      <Eyebrow text="Events from the underground" />
      <SerifTitle text="Tonight on PLUGGD" caps size={30} />
      <SectionBody text="Listening parties, release nights, showcases, pop-ups, and live rooms from the underground." />
      {loading ? (
        <InlineLoading />
      ) : events.length ? (
        <View style={{ gap: 12 }}>
          {events.slice(0, 3).map((event) => {
            const starts = event.starts_at ? new Date(event.starts_at) : null;
            return (
              <EdPressable
                key={event.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${event.title || 'event'}`}
                onPress={() => router.push(`/events/${event.id}` as any)}
              >
                <View style={styles.eventRow}>
                <View style={styles.eventDateBlock}>
                  <Text style={styles.eventDateDay}>{starts ? starts.getDate().toString().padStart(2, '0') : '--'}</Text>
                  <Text style={styles.eventDateMonth}>
                    {starts ? starts.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : 'TBA'}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text style={styles.eventRowTitle} numberOfLines={2}>{event.title || 'Underground event'}</Text>
                  <Text style={styles.eventRowMeta} numberOfLines={1}>{locationCity(event.location)}</Text>
                </View>
                <View style={styles.eventViewPill}>
                  <Text style={styles.eventViewText}>{event.price_cents ? formatGBP(event.price_cents, { cents: true }) : 'RSVP'}</Text>
                </View>
                </View>
              </EdPressable>
            );
          })}
        </View>
      ) : (
        <View style={[styles.nightPanel, styles.nightPanelDashed]}>
          <Text style={styles.nightPanelBody}>No discoverable events are scheduled right now.</Text>
          <View style={styles.buttonRow}>
            <OrangeButton label="Open Events" onPress={() => router.push('/events' as any)} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Drops / Marketplace (paper)                                         */
/* ------------------------------------------------------------------ */

function DropsMarketplace({ items, loading }: { items: StorePreviewItem[]; loading: boolean }) {
  const router = useRouter();
  const playback = usePlayback();
  return (
    <View style={styles.paperSection}>
      <Eyebrow text="Drops / Marketplace" />
      <SerifTitle text="New sounds, merch, tickets, and moments before they disappear." caps size={26} onPaper />
      <SectionBody text="Real releases, beats, store drops, tickets, and access moments from the PLUGGD ecosystem." onPaper />
      {loading ? (
        <InlineLoading />
      ) : items.length ? (
        <View style={{ gap: 16 }}>
          {items.map((item) => (
            <View key={item.id} style={styles.dropCard}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.title}`}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.dropImageWrap}>
                  {item.imageUrl ? (
                    <PluggdImage uri={item.imageUrl} style={styles.dropImage} />
                  ) : (
                    <View style={[styles.dropImage, { backgroundColor: '#171310' }]} />
                  )}
                </View>
                <InkChip text={item.kind === 'sample_pack' ? 'Pack' : item.kind} tone="orange" style={{ marginTop: 12 }} />
                <Text style={styles.dropTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.dropMeta} numberOfLines={1}>{item.subtitle}</Text>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`${item.actionLabel} ${item.title}`}
                onPress={() => {
                  if (item.track && item.actionLabel === 'Listen') {
                    void playback.playTrack(item.track);
                    return;
                  }
                  router.push(item.route as any);
                }}
              >
                <View style={styles.dropAction}>
                  <Text style={styles.dropActionText}>{item.actionLabel}</Text>
                </View>
              </EdPressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.paperEmpty}>Drops will appear when releases, beats, products, or event passes are available.</Text>
      )}
      <GhostButton label="Open Store" onPaper onPress={() => router.push('/market' as any)} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Backstage / Communities (night)                                     */
/* ------------------------------------------------------------------ */

type CommunityCardData = {
  id: string;
  title?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  avatar_url?: string | null;
  member_count?: number | null;
};

function BackstageCommunities({ communities, loading }: { communities: CommunityCardData[]; loading: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.nightSection}>
      <Eyebrow text="Backstage / Communities" />
      <SerifTitle text="Follow the people behind the sound." caps size={27} />
      <SectionBody text="Backstage rooms turn loose clips, voice notes, photos, and fan conversations into living scene archives." />
      {loading ? (
        <InlineLoading />
      ) : communities.length ? (
        <View style={{ gap: 14 }}>
          {communities.slice(0, 3).map((community) => (
            <EdPressable
              key={community.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${community.title || 'community'}`}
              onPress={() => router.push(`/backstage/${community.id}` as any)}
              style={styles.communityCard}
            >
              {community.cover_image_url || community.avatar_url ? (
                <PluggdImage
                  uri={community.cover_image_url || community.avatar_url || ''}
                  style={[StyleSheet.absoluteFillObject as any, { opacity: 0.45 }]}
                 
                />
              ) : null}
              <LinearGradient colors={['rgba(7,6,5,0.2)', 'rgba(7,6,5,0.88)']} style={StyleSheet.absoluteFillObject} />
              <View style={{ gap: 6 }}>
                <InkChip text={`${formatCompact(community.member_count)} members`} tone="orange" />
                <Text style={styles.communityTitle} numberOfLines={1}>{community.title || 'PLUGGD community'}</Text>
                <Text style={styles.communityCopy} numberOfLines={3}>
                  {community.description || 'Fan circles, room updates, and backstage context.'}
                </Text>
              </View>
            </EdPressable>
          ))}
        </View>
      ) : (
        <View style={styles.nightPanel}>
          <Text style={styles.nightPanelBody}>Public communities will appear here when rooms and fan circles are available.</Text>
          <View style={styles.buttonRow}>
            <OrangeButton label="Open Community" onPress={() => router.push('/community' as any)} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Build your world (paper, creator tools)                             */
/* ------------------------------------------------------------------ */

const CREATOR_TOOLS = [
  {
    id: 'listening-parties',
    title: 'Listening Parties',
    copy: 'Ticketed rooms and community funding for the moments fans already want.',
    route: '/live/create',
  },
  {
    id: 'co-production',
    title: 'Co-production',
    copy: 'Secure rights and collaborate without losing the story behind the sound.',
    route: '/pro/collab',
  },
  {
    id: 'transparent-splits',
    title: 'Transparent Splits',
    copy: 'Retain master rights and make who owns what visible from day one.',
    route: '/creator/onboarding',
  },
] as const;

function BuildYourWorldSection() {
  const router = useRouter();
  return (
    <View style={styles.paperSection}>
      <SerifTitle text="Build your world" caps size={30} onPaper />
      <SectionBody text="Run listening parties, collaborations, rights, and revenue without losing the culture around them." onPaper />
      <View style={{ gap: 14 }}>
        {CREATOR_TOOLS.map((tool) => (
          <EdPressable
            key={tool.id}
            accessibilityRole="button"
            accessibilityLabel={tool.title}
            onPress={() => router.push(tool.route as any)}
            style={styles.toolCard}
          >
            <LinearGradient
              colors={['rgba(30, 22, 14, 0.98)', 'rgba(10, 9, 7, 0.99)']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.toolGlow} />
            <InkChip text="Creator tool" tone="cream" />
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolCopy}>{tool.copy}</Text>
          </EdPressable>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Platform pulse (night stats)                                        */
/* ------------------------------------------------------------------ */

function PlatformPulse({
  liveCount,
  boardCount,
  eventCount,
  dropCount,
}: {
  liveCount: number;
  boardCount: number;
  eventCount: number;
  dropCount: number;
}) {
  const router = useRouter();
  const stats = [
    { id: 'live', value: liveCount, label: 'Live rooms open', copy: 'Upcoming rooms appear in Live and Events' },
    { id: 'boards', value: boardCount, label: 'Soundboards active', copy: 'Collaborations moving in public' },
    { id: 'events', value: eventCount, label: 'Events tonight', copy: 'Listening parties, release nights, and live rooms' },
    { id: 'drops', value: dropCount, label: 'Drops available', copy: 'Releases, beats, tickets, and products' },
  ];
  return (
    <View style={styles.nightSection}>
      <Eyebrow text="Platform pulse" />
      <SerifTitle text="What is moving right now" caps size={28} />
      <SectionBody text="A live signal layer for scenes, rooms, fan activity, drops, and community energy across PLUGGD." />
      <CreamButton label="Join the movement" onPress={() => router.push('/auth/signup' as any)} />
      <View style={{ gap: 12, marginTop: 6 }}>
        {stats.map((stat, index) => (
          <View key={stat.id} style={styles.pulseCard}>
            <Text style={styles.pulseValue}>{stat.value > 0 ? formatCompact(stat.value) : 'None'}</Text>
            <WaveTicks bars={30} color="rgba(255,248,237,0.22)" height={28} seed={index * 5 + 3} />
            <Text style={styles.pulseLabel}>{stat.label.toUpperCase()}</Text>
            <Text style={styles.pulseCopy}>{stat.copy}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Embody the culture (closing CTA)                                    */
/* ------------------------------------------------------------------ */

function EmbodyCulture() {
  const router = useRouter();
  return (
    <View style={styles.embody}>
      <Text style={styles.embodyTitle}>EMBODY THE{'\n'}CULTURE.{'\n'}FUEL YOUR PATH.</Text>
      <Text style={styles.embodyBody}>
        Join the rooms where music starts, follow the scenes before they break, and build your world on PLUGGD.
      </Text>
      <View style={[styles.buttonRow, { justifyContent: 'center' }]}>
        <CreamButton label="Enter live rooms" onPress={() => router.push('/live' as any)} />
        <GhostButton label="Explore drops" onPress={() => router.push('/market' as any)} />
      </View>
      <View style={styles.footerBrandRow}>
        <Image
          source={require('../../../assets/brand/pluggd-logo-dark.png')}
          style={styles.footerWordmark}
          resizeMode="contain"
        />
        <Text style={styles.footerTagline}>The independent music ecosystem for creators, scenes, and fans.</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function LiveMusicDashboardHome() {
  const insets = useSafeAreaInsets();
  // First paint renders the masthead instantly; the below-fold sections
  // mount right after interactions settle so opening the app feels
  // immediate even with thirteen sections of imagery.
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const reveal = () => {
      if (mounted) setBelowFoldReady(true);
    };
    const task = InteractionManager.runAfterInteractions(reveal);
    // Hard fallback: the below-fold content must never stay unmounted if
    // the interaction queue stalls (observed on web).
    const fallback = setTimeout(reveal, 250);
    return () => {
      mounted = false;
      task.cancel();
      clearTimeout(fallback);
    };
  }, []);
  const home = useHomeFeed();
  const live = useLiveRooms();
  const backstage = useBackstage();

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

  const stories = useQuery({
    queryKey: ['culture', 'home', 'plug-stories'],
    queryFn: () =>
      safeList<BlogPostRow>(
        (supabase as any)
          .from('blog_posts')
          .select('id,title,excerpt,featured_image_url,tags,created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),
      ),
    staleTime: 1000 * 60 * 5,
  });

  const firstBoard = home.data?.soundboards?.[0];
  const boardDetail = useQuery({
    queryKey: ['culture', 'home', 'board-detail', firstBoard?.id],
    queryFn: () => loadSoundboardItemDetails(firstBoard!.id),
    enabled: Boolean(firstBoard?.id),
    staleTime: 1000 * 60 * 3,
  });

  const liveRooms = live.data ?? [];
  const spotlight = useMemo(
    () => resolveSpotlight(home.data, liveRooms, backstage.data?.communities ?? []),
    [backstage.data?.communities, home.data, liveRooms],
  );
  const circuits = useMemo(() => buildSceneCircuits(home.data), [home.data]);
  const marketItems = useMemo(() => buildMarketplaceItems(home.data, store.data ?? []), [home.data, store.data]);

  const tickerItems = useMemo(() => {
    const bundle = home.data;
    const items: string[] = [];
    liveRooms.filter((room) => room.status === 'live').slice(0, 3).forEach((room) => items.push(`${room.title} is live now`));
    (bundle?.releases ?? []).slice(0, 4).forEach((release) => items.push(`${release.artist || 'A creator'} dropped ${release.title}`));
    (bundle?.soundboards ?? []).slice(0, 2).forEach((board) => items.push(`${board.title} soundboard updated`));
    (bundle?.mixes ?? []).slice(0, 2).forEach((mix) => items.push(`New mix — ${mix.title}`));
    (bundle?.events ?? []).slice(0, 2).forEach((event) => items.push(`${event.title} just announced`));
    if (items.length < 3) items.push('Authentic, unfiltered — real signals moving across the scene');
    return items;
  }, [home.data, liveRooms]);

  const boardCreatorName = useMemo(() => {
    if (!firstBoard?.creator_id) return null;
    const profile = (home.data?.profiles ?? []).find(
      (candidate) => candidate.user_id === firstBoard.creator_id || candidate.id === firstBoard.creator_id,
    );
    return profileName(profile);
  }, [firstBoard?.creator_id, home.data?.profiles]);

  const eventsTonight = useMemo(() => {
    const events = home.data?.events ?? [];
    const now = new Date();
    return events.filter((event) => {
      if (!event.starts_at) return false;
      const starts = new Date(event.starts_at);
      return starts.toDateString() === now.toDateString();
    });
  }, [home.data?.events]);

  const refreshing = home.isRefetching || live.isRefetching || backstage.isRefetching || store.isRefetching || stories.isRefetching;
  const refresh = () => {
    void home.refetch();
    void live.refetch();
    void backstage.refetch();
    void store.refetch();
    void stories.refetch();
    if (firstBoard?.id) void boardDetail.refetch();
  };

  const dropCount =
    (home.data?.releases?.length ?? 0) +
    (home.data?.beats?.length ?? 0) +
    (home.data?.samplePacks?.length ?? 0) +
    (store.data?.length ?? 0);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 210 }}
      >
        <HomeHero
          spotlight={spotlight}
          boardTitle={firstBoard?.title}
          boardCount={firstBoard?.item_count}
          boardImage={
            boardDetail.data?.items?.find((item) => item.item_type === 'image' && item.media_url)?.media_url ||
            firstBoard?.cover_image_url ||
            spotlight.imageUrl
          }
          boardRoute={firstBoard ? `/soundboards/${firstBoard.slug || firstBoard.id}` : spotlight.route}
        />
        <LiveTicker items={tickerItems} variant="paper" />
        <LiveNowOnPluggd rooms={liveRooms} loading={live.isLoading} />
        {belowFoldReady ? (
        <>
        <TornEdge color={ed.paper2} />
        <NextWave bundle={home.data} loading={home.isLoading} />
        <FeaturedStory posts={stories.data ?? []} fallbackImage={home.data?.events?.[0]?.cover_image_url} />
        <TornEdge flip color={ed.paper2} />
        <ExploreYourScene circuits={circuits} loading={home.isLoading} />
        <TornEdge color={ed.paper2} />
        <SoundboardsBoard
          board={firstBoard}
          detail={boardDetail.data}
          creatorName={boardCreatorName}
          loading={home.isLoading || boardDetail.isLoading}
        />
        <TornEdge flip color={ed.paper2} />
        <TonightOnPluggd events={eventsTonight.length ? eventsTonight : home.data?.events ?? []} loading={home.isLoading} />
        <TornEdge color={ed.paper2} />
        <DropsMarketplace items={marketItems} loading={home.isLoading || store.isLoading} />
        <TornEdge flip color={ed.paper2} />
        <BackstageCommunities communities={backstage.data?.communities ?? []} loading={backstage.isLoading} />
        <TornEdge color={ed.paper2} />
        <BuildYourWorldSection />
        <TornEdge flip color={ed.paper2} />
        <PlatformPulse
          liveCount={liveRooms.filter((room) => room.status === 'live').length}
          boardCount={home.data?.soundboards?.length ?? 0}
          eventCount={eventsTonight.length}
          dropCount={dropCount}
        />
        <EmbodyCulture />
        </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const HEADER_CLEARANCE = 96;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ed.night },
  scroll: { flex: 1, backgroundColor: ed.night },

  /* Hero */
  hero: { minHeight: 560, justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroContent: { paddingHorizontal: 20, paddingTop: HEADER_CLEARANCE + 24, paddingBottom: 30, gap: 14 },
  heroTitle: {
    fontFamily: edFonts.serif,
    fontSize: 40,
    lineHeight: 42,
    color: ed.cream,
    letterSpacing: -0.8,
  },
  heroTitleAccent: { fontFamily: edFonts.serifItalic, color: ed.orange },
  heroSub: { fontFamily: edFonts.bodyMedium, fontSize: 15.5, lineHeight: 22, color: 'rgba(255,248,237,0.86)' },
  heroQuote: { fontFamily: edFonts.bodyMedium, fontSize: 14.5, lineHeight: 21, color: 'rgba(255,248,237,0.72)' },
  heroPolaroid: {
    marginTop: 8,
    width: 172,
    backgroundColor: ed.paper,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    transform: [{ rotate: '-1.5deg' }],
  },
  heroPolaroidImageWrap: { borderRadius: 6, overflow: 'hidden', backgroundColor: '#181410' },
  heroPolaroidImage: { width: '100%', height: 132 },
  heroPolaroidTitle: { fontFamily: edFonts.bodyBold, fontSize: 13, lineHeight: 17, color: ed.ink, marginTop: 8 },
  heroPolaroidMeta: { fontFamily: edFonts.bodyBlack, fontSize: 11, color: 'rgba(34,23,15,0.68)', marginTop: 2 },

  /* Section shells */
  nightSection: { backgroundColor: ed.night, paddingHorizontal: 20, paddingVertical: 40, gap: 14 },
  paperSection: { backgroundColor: ed.paper2, paddingHorizontal: 20, paddingVertical: 40, gap: 14 },
  paperEmpty: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.inkSoft },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },

  nightPanel: {
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 18,
    gap: 14,
  },
  nightPanelDashed: { borderStyle: 'dashed' },
  nightPanelBody: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: ed.creamMuted },

  /* Live rooms */
  liveRoomCard: {
    minHeight: 150,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: ed.nightCard,
  },
  liveRoomBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(7,6,5,0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ff3b30' },
  liveRoomBadgeText: { fontFamily: edFonts.bodyBlack, fontSize: 10, letterSpacing: 1.2, color: ed.cream },
  liveRoomTitle: { fontFamily: edFonts.bodyBold, fontSize: 17, lineHeight: 22, color: ed.cream },
  liveRoomMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: ed.creamMuted },

  /* Next wave */
  waveRail: { gap: 14, paddingRight: 20, paddingVertical: 6 },
  waveCard: {
    width: 280,
    backgroundColor: '#fffdf7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,56,31,0.22)',
    padding: 12,
    paddingBottom: 16,
    shadowColor: '#5b381f',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    transform: [{ rotate: '-0.4deg' }],
  },
  waveCardImageWrap: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#e7d9c1' },
  waveCardImage: { width: '100%', height: 172 },
  waveCardName: { fontFamily: edFonts.bodyBold, fontSize: 19, lineHeight: 24, color: ed.ink, marginTop: 10 },
  waveCardMeta: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: ed.inkSoft, marginTop: 2 },

  /* Featured story */
  storyPublished: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: ed.inkSoft },
  storyLeadImageWrap: { borderRadius: ed.radius, overflow: 'hidden', marginTop: 6 },
  storyLeadImage: { width: '100%', height: 220 },
  storyDarkCard: {
    borderRadius: 18,
    backgroundColor: '#241d15',
    padding: 18,
    gap: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  storyDarkImageWrap: { borderRadius: 12, overflow: 'hidden' },
  storyDarkImage: { width: '100%', height: 180 },
  storyDarkTitle: { fontFamily: edFonts.serif, fontSize: 26, lineHeight: 29, color: ed.cream },
  storyDarkExcerpt: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: ed.creamMuted },
  storyDarkTag: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#f4c890' },

  /* Circuits */
  circuitCard: {
    minHeight: 320,
    borderRadius: ed.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ed.nightLine,
    justifyContent: 'flex-end',
    backgroundColor: ed.nightCard,
  },
  circuitBody: { padding: 18, gap: 8 },
  circuitTitle: { fontFamily: edFonts.bodyMedium, fontSize: 24, lineHeight: 29, color: ed.cream, textTransform: 'capitalize' },
  circuitCopy: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.creamMuted },
  circuitEnterPill: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: ed.paper2,
    borderWidth: 1,
    borderColor: 'rgba(239, 224, 200, 0.5)',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  circuitEnterText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.ink },

  /* Corkboard */
  corkboard: {
    borderRadius: 6,
    backgroundColor: '#efe6d2',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,56,31,0.24)',
    paddingHorizontal: 16,
    paddingVertical: 22,
    marginTop: 6,
  },
  corkCenterLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(91,56,31,0.18)',
  },
  corkStickyWrap: { alignItems: 'center' },
  corkPinCentered: { alignSelf: 'center', zIndex: 2, marginBottom: -8 },
  corkTitleNote: { maxWidth: 300, minWidth: 240, paddingVertical: 18 },
  corkPolaroidWrap: { marginTop: 18, alignSelf: 'flex-start' },
  corkPolaroid: {
    backgroundColor: '#fffdf7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,56,31,0.25)',
    padding: 8,
    paddingBottom: 10,
    width: 168,
    shadowColor: '#4d3b12',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    transform: [{ rotate: '1.6deg' }],
  },
  corkPolaroidImage: { width: '100%', height: 128 },
  corkPolaroidCaption: { fontFamily: edFonts.bodyBold, fontSize: 12, color: ed.ink, marginTop: 6, backgroundColor: '#efe9dc', paddingHorizontal: 6, paddingVertical: 3 },
  corkOpenLine: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: ed.inkMuted, marginTop: 18 },
  chipWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  corkWavePaper: {
    marginTop: 22,
    backgroundColor: '#fffdf7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,56,31,0.25)',
    paddingVertical: 22,
    paddingHorizontal: 18,
    shadowColor: '#4d3b12',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  corkLikesSticky: { position: 'absolute', bottom: -12, alignSelf: 'center' },

  /* Events */
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 12,
  },
  eventDateBlock: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#1d1712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDateDay: { fontFamily: edFonts.bodyBlack, fontSize: 17, color: ed.cream },
  eventDateMonth: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.2, color: ed.orange, marginTop: 1 },
  eventRowTitle: { fontFamily: edFonts.bodyBold, fontSize: 14.5, lineHeight: 19, color: ed.cream },
  eventRowMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: ed.creamMuted },
  eventViewPill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.55)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventViewText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: ed.orange },

  /* Drops */
  dropCard: {
    backgroundColor: '#fffdf7',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,56,31,0.2)',
    padding: 14,
    shadowColor: '#5b381f',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  dropImageWrap: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#171310' },
  dropImage: { width: '100%', height: 190 },
  dropTitle: { fontFamily: edFonts.bodyBold, fontSize: 20, lineHeight: 25, color: ed.ink, marginTop: 8 },
  dropMeta: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: ed.inkSoft, marginTop: 2 },
  dropAction: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: ed.paper2,
    borderWidth: 1,
    borderColor: 'rgba(239, 224, 200, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropActionText: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: ed.ink },

  /* Communities */
  communityCard: {
    minHeight: 168,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    overflow: 'hidden',
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: ed.nightCard,
  },
  communityTitle: { fontFamily: edFonts.bodyBold, fontSize: 19, color: ed.cream, marginTop: 6 },
  communityCopy: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.creamMuted },

  /* Creator tools */
  toolCard: {
    minHeight: 210,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 18,
    justifyContent: 'flex-end',
    gap: 8,
  },
  toolGlow: {
    position: 'absolute',
    top: -30,
    left: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,102,0,0.16)',
  },
  toolTitle: { fontFamily: edFonts.bodyBold, fontSize: 21, color: '#ffffff', marginTop: 4 },
  toolCopy: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.78)' },

  /* Pulse */
  pulseCard: {
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.nightLine,
    backgroundColor: ed.nightCard,
    padding: 18,
    gap: 8,
  },
  pulseValue: { fontFamily: edFonts.bodyBlack, fontSize: 30, color: ed.paper },
  pulseLabel: { fontFamily: edFonts.serif, fontSize: 19, letterSpacing: 0.6, color: ed.paper },
  pulseCopy: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 17, color: ed.creamMuted },

  /* Embody CTA + footer */
  embody: { backgroundColor: '#0a0806', paddingHorizontal: 24, paddingTop: 56, paddingBottom: 44, gap: 18, alignItems: 'center' },
  embodyTitle: {
    fontFamily: edFonts.body,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 1.2,
    color: '#f8ecd4',
    textAlign: 'center',
  },
  embodyBody: {
    fontFamily: edFonts.bodyMedium,
    fontSize: 14.5,
    lineHeight: 21,
    color: ed.creamMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  footerBrandRow: { alignItems: 'center', gap: 10, marginTop: 26 },
  footerWordmark: { width: 128, height: 34 },
  footerTagline: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: 'rgba(255,248,237,0.5)', textAlign: 'center' },
});

export { HOME_SECTION_ORDER, resolveSpotlight, buildMarketplaceItems, buildSceneCircuits };
export type { Spotlight, StorePreviewItem };
