import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LiveTicker } from '../../../components/LiveTicker';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { ReleaseArtwork } from '../../components/ReleaseArtwork';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { selectionHaptic } from '../../design/haptics';
import { useReducedMotion } from '../../design/useReducedMotion';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { useBackstage, useHomeFeed, useLiveRooms } from '../culture/useCultureData';
import { isCarnivalCampaignActive, loadCarnivalHub } from '../carnival/carnivalService';
import {
  buildBalancedHomePicks,
  buildPlayableDiscoveryItems,
  buildDiscoveryScenes,
  isPlayableDiscoveryItem,
  selectDailyFeature,
  type DiscoveryItem,
} from '../discovery/discoveryModel';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { loadPublicDiscoveryFeatures } from '../discovery/publicDiscoveryFeatures';
import { loadCuratedPublicItems } from '../discovery/siteCuration';
import { EdPressable, Enter } from '../editorial/EditorialBits';
import { isHappeningNowEvent } from '../events/eventDiscoveryData';
import {
  buildHomeSignals,
  buildNextWaveItems,
  loadHomeEditorialStories,
  loadHomeMarketSignals,
  loadHomeRecentlyPlayed,
  type HomeNextWaveItem,
} from './homeDiscoveryData';
import { resolveHomeDestination, type HomeDestination } from './homeDestinations';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
const LINE = '#29251F';
const OPPORTUNITY_FALLBACK = require('../../../assets/opportunities/opportunities-creator-hero.webp') as ImageSourcePropType;
const EVENT_FALLBACK = require('../../../assets/web-parity/events/pluggd-events.jpg') as ImageSourcePropType;

function featuredActionLabel(item: DiscoveryItem) {
  if (item.kind === 'release') return 'View release';
  if (item.kind === 'beat') return 'View licences';
  if (item.kind === 'mix') return 'Open mix';
  return 'Open soundboard';
}

function eventActionLabel(price?: number | null) {
  if (Number(price ?? 0) > 0) return 'Tickets';
  if (price === 0) return 'RSVP';
  return 'Details';
}

function roomMeta(room: { creator_name?: string | null; category?: string | null; scheduled_for?: string | null; status?: string | null; viewer_count?: number | null }) {
  const identity = room.creator_name || (room.category && !room.category.includes('_') ? room.category : null) || 'PLUGGD Live';
  if (room.status === 'live') return `${identity} · ${room.viewer_count || 0} listening`;
  if (room.scheduled_for) {
    const date = new Date(room.scheduled_for);
    if (!Number.isNaN(date.getTime())) {
      return `${identity} · ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
  return identity;
}

function sectionLabelForRecent(count: number) {
  return count === 1 ? 'Resume your last find.' : 'Resume music you recently played.';
}

function deadlineLabel(value: string | null) {
  if (!value) return 'Rolling deadline';
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return 'Deadline listed';
  return `Closes ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

function moneyLabel(value: number | null, currency: string | null) {
  if (!value || !currency) return null;
  try { return `Up to ${new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)}`; }
  catch { return null; }
}

export function MusicDiscoveryHome() {
  const styles = useHomeStyles();
  const theme = usePluggdTheme();
  const router = useRouter();
  const bottomInset = useBottomChromeInset();
  const { fontScale } = useWindowDimensions();
  // Masthead edition line. The number is days since the current volume opened
  // on 1 January — the same day-of-year calculation the web home uses, so the
  // app and pluggd.fm always show the same issue number on the same day.
  const editionLine = useMemo(() => {
    const now = new Date();
    const volumeEpoch = new Date(now.getFullYear(), 0, 1);
    const number = Math.max(1, Math.floor((now.getTime() - volumeEpoch.getTime()) / 86_400_000) + 1);
    const date = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })
      .format(now)
      .toUpperCase()
      .replace(',', ' ·');
    return `EDITION №${number} — ${date}`;
  }, []);
  const accessibilityLayout = fontScale >= 1.5;
  const { user, loading: authLoading } = useAuth();
  const feed = useHomeFeed();
  const live = useLiveRooms();
  const backstage = useBackstage();
  const { playQueue, playTrack } = usePlayback();
  const reducedMotion = useReducedMotion();
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const homepageHero = useQuery({
    queryKey: ['site-curation', 'homepage_hero'],
    queryFn: () => loadCuratedPublicItems('homepage_hero', 12),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const homepageEvents = useQuery({
    queryKey: ['site-curation', 'homepage_event'],
    queryFn: () => loadCuratedPublicItems('homepage_event', 12),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const items = useMemo(() => buildPlayableDiscoveryItems(feed.data), [feed.data]);
  const scenes = useMemo(() => buildDiscoveryScenes(feed.data), [feed.data]);
  // The original Featured Track/Release is its own product module. Homepage
  // curation is rendered separately below as Moving now and must never replace
  // this daily feature again.
  const featured = useMemo(() => selectDailyFeature(items), [items]);
  const movingFeature = useMemo(
    () => homepageHero.data?.find((item) => item.discoveryItem && isPlayableDiscoveryItem(item.discoveryItem))?.discoveryItem
      ?? items.find((item) => item.id !== featured?.id && isPlayableDiscoveryItem(item)),
    [featured?.id, homepageHero.data, items],
  );
  const playbackItems = useMemo(() => {
    const ordered = [featured, movingFeature, ...items].filter((item): item is DiscoveryItem => Boolean(item));
    const unique = new Map<string, DiscoveryItem>();
    ordered.forEach((item) => unique.set(item.id, item));
    return [...unique.values()].filter(isPlayableDiscoveryItem);
  }, [featured, items, movingFeature]);
  const picks = useMemo(
    () => buildBalancedHomePicks(items.filter((item) => item.id !== movingFeature?.id), featured?.id),
    [featured?.id, items, movingFeature?.id],
  );
  const newReleases = feed.data?.releases.slice(0, 6) ?? [];
  const mixes = feed.data?.mixes.slice(0, 5) ?? [];
  const liveRooms = live.data?.slice(0, 4) ?? [];
  const communities = backstage.data?.communities ?? [];
  const releaseIds = useMemo(() => feed.data?.releases.map((release) => release.id) ?? [], [feed.data?.releases]);

  const editorial = useQuery({
    queryKey: ['culture', 'home', 'editorial'],
    queryFn: () => loadHomeEditorialStories(2),
    staleTime: 1000 * 60 * 5,
  });
  const marketSignals = useQuery({
    queryKey: ['culture', 'home', 'market-signals', releaseIds],
    enabled: releaseIds.length > 0,
    queryFn: () => loadHomeMarketSignals(releaseIds),
    staleTime: 1000 * 60 * 3,
  });
  const recent = useQuery({
    queryKey: ['culture', 'home', 'recent', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => loadHomeRecentlyPlayed(6),
    staleTime: 1000 * 60 * 2,
  });
  const carnival = useQuery({
    queryKey: ['carnival-hub', 1],
    queryFn: loadCarnivalHub,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const publicFeatures = useQuery({
    queryKey: ['discovery', 'public-features'],
    queryFn: loadPublicDiscoveryFeatures,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const showCarnival = isCarnivalCampaignActive(carnival.data);

  const signals = useMemo(
    () => buildHomeSignals(feed.data, liveRooms, communities),
    [communities, feed.data, liveRooms],
  );
  const nextWave = useMemo(
    () => buildNextWaveItems(feed.data, communities, marketSignals.data ?? new Map()),
    [communities, feed.data, marketSignals.data],
  );
  const featuredEvent = useMemo(
    () => [
      ...(homepageEvents.data?.flatMap((item) => item.event ? [item.event] : []) ?? []),
      ...(feed.data?.events ?? []),
    ].find((event) => isHappeningNowEvent(event)),
    [feed.data?.events, homepageEvents.data],
  );
  const featuredRoom = useMemo(
    () => liveRooms.find((room) => room.status === 'live'),
    [liveRooms],
  );
  const beatGateway = feed.data?.beats.find((beat) => Boolean(beat.image_url));
  const story = editorial.data?.[0];
  const refreshing =
    feed.isRefetching ||
    live.isRefetching ||
    backstage.isRefetching ||
    editorial.isRefetching ||
    marketSignals.isRefetching ||
    recent.isRefetching ||
    publicFeatures.isRefetching ||
    homepageHero.isRefetching ||
    homepageEvents.isRefetching;

  const refresh = () => {
    void feed.refetch();
    void live.refetch();
    void backstage.refetch();
    void editorial.refetch();
    if (releaseIds.length) void marketSignals.refetch();
    if (user?.id) void recent.refetch();
    void publicFeatures.refetch();
    void homepageHero.refetch();
    void homepageEvents.refetch();
  };

  const openHomeDestination = (destination: HomeDestination) => {
    const action = resolveHomeDestination(destination);
    if (!action) return;
    selectionHaptic();
    if (action.kind === 'creator_gate' && !user) {
      router.push({ pathname: action.signedOutRoute, params: { redirect: action.route } } as any);
      return;
    }
    router.push(action.route as any);
  };

  const play = async (item: DiscoveryItem) => {
    selectionHaptic();
    const queue = playbackItems.map((entry) => entry.track);
    await playQueue(queue, Math.max(0, playbackItems.findIndex((entry) => entry.id === item.id)));
  };

  const featuredParallax = reducedMotion
    ? undefined
    : {
        transform: [
          {
            translateY: scrollY.interpolate({
              inputRange: [0, 220],
              outputRange: [0, 12],
              extrapolate: 'clamp',
            }),
          },
          {
            scale: scrollY.interpolate({
              inputRange: [0, 220],
              outputRange: [1, 1.025],
              extrapolate: 'clamp',
            }),
          },
        ],
      };

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <RNAnimated.ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentText} />}
        onScroll={RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Enter delay={0}>
          {/* The edition line runs full width above the masthead rather than
              inside the title group — beside the editor note it had roughly
              210pt to work with and wrapped mid-date. */}
          <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.eyebrow}>
            {editionLine}
          </Text>
          <View style={[styles.titleRow, accessibilityLayout && styles.titleRowAccessibility]}>
            <View style={[styles.titleGroup, accessibilityLayout && styles.titleGroupAccessibility]}>
              <Text maxFontSizeMultiplier={1.35} style={styles.title}>The Daily Plug</Text>
            </View>
            <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={[styles.editorNote, accessibilityLayout && styles.editorNoteAccessibility]}>
              {featured?.isEditorialPick ? 'Featured by' : 'Your daily'}{`\n`}
              {featured?.isEditorialPick ? 'PLUGGD editors' : 'PLUGGD selection'}
            </Text>
          </View>
        </Enter>

        {/* Search is the primary discovery gesture on a phone. The header icon
            alone was too weak an affordance for it, and the web home puts a
            full-width field at the top for the same reason. */}
        <Enter delay={40}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search creators, scenes and live rooms"
            onPress={() => {
              selectionHaptic();
              router.push('/search' as any);
            }}
            style={styles.search}
          >
            <MaterialIcons name="search" size={21} color={theme.colors.textMuted} />
            <Text style={styles.searchText}>Creators, scenes, live rooms…</Text>
          </Pressable>
        </Enter>

        {signals.length ? <LiveTicker items={signals.map((signal) => signal.label)} variant="home" speed={34} /> : null}

        {feed.isLoading ? <HomeLoading /> : null}
        {!feed.isLoading && !featured ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>The signal is quiet.</Text>
            <Text style={styles.emptyBody}>Fresh playable music will appear here as creators publish it.</Text>
          </View>
        ) : null}

        {featured ? (
          <Enter delay={60}>
            <FeatureSpotlight
              item={featured}
              parallaxStyle={featuredParallax}
              onPlay={() => void play(featured)}
              onOpen={() => router.push((featured.kind === 'release' ? featured.destinationRoute : (featured.supportRoute || featured.destinationRoute)) as any)}
            />
          </Enter>
        ) : null}

        {showCarnival && carnival.data ? (
          <Enter delay={90}>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Open the PLUGGD Carnival Guide"
              onPress={() => openHomeDestination({ kind: 'carnival' })}
              style={styles.carnivalFeature}
            >
              <PluggdImage
                uri={carnival.data.hub.heroImageUrl}
                style={styles.carnivalFeatureImage}
                resizeMode="cover"
                displayWidth={900}
                accessibilityLabel=""
              />
              <LinearGradient colors={['rgba(8,7,6,0.08)', 'rgba(8,7,6,0.94)']} style={StyleSheet.absoluteFill} />
              <View style={styles.carnivalFeatureCopy}>
                <Text style={styles.carnivalFeatureEyebrow}>The PLUGGD Carnival Guide</Text>
                <Text style={styles.carnivalFeatureTitle}>
                  Find your sound.{' '}<Text style={styles.carnivalFeatureTitleEmphasis}>Plan the road.</Text>
                </Text>
                <Text style={styles.carnivalFeatureBody}>Sound systems, mas bands, food, history and the practical stops worth knowing—brought together in one music-first guide.</Text>
                <View style={styles.carnivalFeatureCta}>
                  <Text style={styles.carnivalFeatureCtaText}>Open the Carnival Hub</Text>
                  <MaterialIcons name="arrow-forward" size={17} color="#100B07" />
                </View>
              </View>
            </EdPressable>
          </Enter>
        ) : null}

        {picks.length ? (
          <Enter delay={120}>
            <SectionHeader
              title="Four worth your time"
              action="See all"
              onAction={() => router.push('/discover' as any)}
            />
            <View style={styles.pickGrid}>
              {[picks.slice(0, 2), picks.slice(2, 4)].map((row, rowIndex) => (
                <View key={`pick-row-${rowIndex}`} style={styles.pickRow}>
                  {row.map((item) => (
                    <View key={item.id} style={styles.pick}>
                      <EdPressable
                        haptic={false}
                        accessibilityRole="button"
                        accessibilityLabel={`Play ${item.title} by ${item.creator}`}
                        onPress={() => void play(item)}
                        style={styles.pickArtSurface}
                      >
                        <Artwork item={item} style={styles.pickArt} iconSize={24} />
                        <View style={styles.pickKind}>
                          <Text style={styles.pickKindText}>{item.kind.toUpperCase()}</Text>
                        </View>
                        <View style={styles.smallPlay}>
                          <MaterialIcons name="play-arrow" size={20} color="#100B07" />
                        </View>
                      </EdPressable>
                      <EdPressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${item.title} by ${item.creator}`}
                        onPress={() => router.push(item.destinationRoute as any)}
                        style={styles.pickCopy}
                      >
                        <View style={styles.pickCopyText}>
                          <Text style={styles.pickTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.pickCreator} numberOfLines={1}>{item.creator}</Text>
                        </View>
                      </EdPressable>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </Enter>
        ) : null}

        {movingFeature && movingFeature.id !== featured?.id ? (
          <>
            <SectionHeader title="Moving now" subtitle="A current signal selected for this moment." />
            <FeatureSpotlight
              item={movingFeature}
              onPlay={() => void play(movingFeature)}
              onOpen={() => router.push((movingFeature.kind === 'release' ? movingFeature.destinationRoute : (movingFeature.supportRoute || movingFeature.destinationRoute)) as any)}
            />
          </>
        ) : null}

        {user && recent.data?.length ? (
          <>
            <SectionHeader
              title="Pick up where you left off"
              subtitle={sectionLabelForRecent(recent.data.length)}
              action="Library"
              onAction={() => router.push('/library' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRail}>
              {recent.data.map((item) => (
                <View key={item.id} style={styles.recentCard}>
                  <EdPressable
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Resume ${item.title} by ${item.creator}`}
                    onPress={() => {
                      selectionHaptic();
                      void playTrack(item.track);
                    }}
                    style={styles.recentSurface}
                  >
                    {item.imageUrl ? (
                      <ReleaseArtwork uri={item.imageUrl} style={styles.recentArt} displayWidth={240} />
                    ) : (
                      <View style={[styles.recentArt, styles.artFallback]}><MaterialIcons name="album" size={24} color={theme.colors.accentText} /></View>
                    )}
                    <View style={styles.recentCopy}>
                      <Text style={styles.recentKicker}>CONTINUE LISTENING</Text>
                      <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.recentCreator} numberOfLines={1}>{item.creator}</Text>
                    </View>
                    <View style={styles.recentPlay}>
                      <MaterialIcons name="play-arrow" size={21} color="#100B07" />
                    </View>
                  </EdPressable>
                  <EdPressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                    onPress={() => router.push(item.route as any)}
                    style={styles.recentOpen}
                  >
                    <MaterialIcons name="north-east" size={17} color={theme.colors.text} />
                  </EdPressable>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {!feed.isLoading ? (
          <>
            <SectionHeader title="From the scenes" subtitle="Cities and sounds moving right now." />
            {scenes.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRow}>
                {scenes.map((scene) => (
                  <View key={`${scene.kind}:${scene.canonicalValue}`} style={styles.sceneFrame}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Explore ${scene.label} ${scene.detail.toLowerCase()}`}
                      onPress={() => openHomeDestination({ kind: 'scene', sceneKind: scene.kind, value: scene.canonicalValue, label: scene.label })}
                      style={styles.sceneSurface}
                    >
                      {scene.image ? <PluggdImage uri={scene.image} style={styles.sceneImage} resizeMode="cover" displayWidth={360} /> : <View style={styles.sceneFallback} />}
                      <LinearGradient colors={['rgba(5,4,3,0.05)', 'rgba(5,4,3,0.82)']} style={StyleSheet.absoluteFillObject} />
                      <View style={styles.sceneCopy}>
                        <Text style={styles.sceneLabel}>{scene.label}</Text>
                        <Text style={styles.sceneDetail}>{scene.detail}</Text>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <EdPressable accessibilityRole="button" accessibilityLabel="Retry loading scenes" onPress={() => void feed.refetch()} style={styles.sceneStatus}>
                <MaterialIcons name={feed.isError ? 'refresh' : 'graphic-eq'} size={22} color={theme.colors.accentText} />
                <View style={styles.sceneStatusCopy}>
                  <Text style={styles.sceneStatusTitle}>{feed.isError ? 'Scenes could not load.' : 'Scene signals are reconnecting.'}</Text>
                  <Text style={styles.sceneStatusBody}>Tap to refresh current cities and sounds.</Text>
                </View>
              </EdPressable>
            )}
          </>
        ) : null}

        {mixes.length ? (
          <>
            <SectionHeader
              title="Mixes in rotation"
              subtitle="Full journeys from selectors and scenes."
              action="Enter Mixes"
              onAction={() => router.push('/mixes' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mixRail}>
              {mixes.map((mix, index) => {
                const playable = items.find((item) => item.kind === 'mix' && item.track.mixId === mix.id);
                const route = `/mixes/${mix.slug || mix.id}`;
                return (
                  <View key={mix.id} style={[styles.mixCard, index === 0 && styles.mixCardLead]}>
                    <View style={styles.mixSurfaceFrame}>
                      {mix.cover_url ? (
                        <PluggdImage uri={mix.cover_url} style={styles.mixArt} resizeMode="cover" displayWidth={640} />
                      ) : (
                        <View style={[styles.mixArt, styles.artFallback]}><MaterialIcons name="album" size={34} color={ORANGE} /></View>
                      )}
                      <LinearGradient colors={['rgba(5,4,3,0.02)', 'rgba(5,4,3,0.78)']} style={StyleSheet.absoluteFillObject} />
                      <Text style={styles.mixNumber}>{String(index + 1).padStart(2, '0')}</Text>
                      <View style={styles.mixCopy}>
                        <Text style={styles.mixKicker}>{mix.city || mix.genre_tags?.[0] || 'SELECTOR MIX'}</Text>
                        <Text style={styles.mixTitle} numberOfLines={2}>{mix.title || 'Untitled mix'}</Text>
                        <Text style={styles.mixCreator} numberOfLines={1}>{mix.event_name || mix.city || 'PLUGGD selector'}</Text>
                      </View>
                      <View style={styles.mixPlay}>
                        <MaterialIcons name={playable ? 'play-arrow' : 'arrow-forward'} size={20} color="#100B07" />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${playable ? 'Play' : 'Open'} mix ${mix.title || 'Untitled mix'}`}
                        onPress={() => {
                          if (playable) void play(playable);
                          else {
                            selectionHaptic();
                            router.push(route as any);
                          }
                        }}
                        style={styles.mixSurfaceHit}
                      />
                    </View>
                    <EdPressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open details for ${mix.title || 'mix'}`}
                      onPress={() => router.push(route as any)}
                      style={styles.mixOpen}
                    >
                      <Text style={styles.mixOpenText}>Open mix</Text>
                      <MaterialIcons name="arrow-forward" size={14} color={theme.colors.accentText} />
                    </EdPressable>
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {newReleases.length ? (
          <>
            <SectionHeader
              title="New releases"
              subtitle="Independent music, newly landed."
              action="View all"
              onAction={() => router.push('/releases' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.releaseRail}>
              {newReleases.map((release) => {
                const playable = items.find((entry) => entry.kind === 'release' && entry.track.releaseId === release.id);
                return (
                  <View key={release.id} style={styles.releaseCard}>
                    <EdPressable
                      haptic={false}
                      accessibilityRole="button"
                      accessibilityLabel={`${playable ? 'Play' : 'Open'} ${release.title || 'release'}`}
                      onPress={() => playable ? void play(playable) : router.push(`/release/${release.id}` as any)}
                      style={styles.releaseArtSurface}
                    >
                      {release.cover_art_url ? (
                        <ReleaseArtwork uri={release.cover_art_url} style={styles.releaseArt} displayWidth={420} />
                      ) : (
                        <View style={[styles.releaseArt, styles.artFallback]}><MaterialIcons name="album" size={28} color={theme.colors.accentText} /></View>
                      )}
                      <View style={styles.releasePlay}>
                        <MaterialIcons name={playable ? 'play-arrow' : 'arrow-forward'} size={19} color="#100B07" />
                      </View>
                    </EdPressable>
                    <EdPressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${release.title || 'release'}`}
                      onPress={() => openHomeDestination({ kind: 'release', id: release.id })}
                      style={styles.releaseCopy}
                    >
                      <View style={styles.releaseCopyText}>
                        <Text style={styles.releaseTitle} numberOfLines={1}>{release.title || 'Untitled release'}</Text>
                        <Text style={styles.releaseCreator} numberOfLines={1}>{release.artist || release.genre || 'PLUGGD creator'}</Text>
                      </View>
                    </EdPressable>
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {story ? (
          <>
            <SectionHeader title="From THE PLUG" subtitle="Dispatches from inside the scene." action="Open THE PLUG" onAction={() => router.push('/plug' as any)} />
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`Read ${story.title || 'PLUGGD story'}`}
              onPress={() => openHomeDestination({ kind: 'article', id: story.id })}
              style={styles.storyCard}
            >
              {story.featured_image_url ? (
                <PluggdImage uri={story.featured_image_url} style={styles.storyImage} resizeMode="cover" displayWidth={900} />
              ) : (
                <LinearGradient colors={['#4A1D13', '#21100A', '#090706']} style={[styles.storyImage, styles.storyImageFallback]}>
                  <MaterialIcons name="auto-stories" size={42} color={ORANGE} />
                </LinearGradient>
              )}
              <LinearGradient colors={['rgba(5,4,3,0.04)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.storyCopy}>
                <Text style={styles.storyKicker}>{story.tags?.[0]?.toUpperCase() || 'FEATURED STORY'}</Text>
                <Text style={styles.storyTitle} numberOfLines={2}>{story.title || 'PLUGGD story'}</Text>
                {story.excerpt ? <Text style={styles.storyExcerpt} numberOfLines={2}>{story.excerpt}</Text> : null}
                <View style={styles.storyAction}>
                  <Text style={styles.storyActionText}>Read story</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={INK} />
                </View>
              </View>
            </EdPressable>
          </>
        ) : null}

        {publicFeatures.data?.opportunities.length ? (
          <>
            <SectionHeader
              title="Opportunities"
              subtitle={`${publicFeatures.data.opportunities.length} verified openings${publicFeatures.data.totalListedFundingGBP > 0 ? ` · £${Math.round(publicFeatures.data.totalListedFundingGBP).toLocaleString('en-GB')} listed funding` : ''}.`}
              action="Find your next"
              onAction={() => router.push('/opportunities' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opportunityRail}>
              {publicFeatures.data.opportunities.slice(0, 4).map((opportunity) => (
                <View key={opportunity.id} style={styles.opportunityFrame}>
                  <EdPressable accessibilityRole="button" accessibilityLabel={`Open opportunity ${opportunity.title}`} onPress={() => openHomeDestination({ kind: 'opportunity', id: opportunity.id })} style={styles.opportunitySurface}>
                    <View style={styles.opportunityArt}>
                      <OpportunityArtwork candidates={opportunity.imageCandidates} fallbackSource={opportunity.fallbackSource} />
                      <LinearGradient colors={['rgba(5,4,3,0.08)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
                      <View style={styles.opportunityTag}><Text style={styles.opportunityTagText}>{opportunity.type.replaceAll('_', ' ').toUpperCase()}</Text></View>
                      <View style={styles.opportunityCopy}><Text style={styles.opportunityTitle} numberOfLines={2}>{opportunity.title}</Text><Text style={styles.opportunityOrganiser} numberOfLines={1}>{opportunity.organiser}</Text></View>
                    </View>
                    <View style={styles.opportunityFacts}><Text numberOfLines={1} style={styles.opportunityFact}>{moneyLabel(opportunity.fundingMax, opportunity.currency) || 'Support listed'}</Text><Text numberOfLines={1} style={styles.opportunityDeadline}>{deadlineLabel(opportunity.closesAt)}</Text></View>
                  </EdPressable>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {nextWave.length ? <NextWave items={nextWave} onOpen={openHomeDestination} /> : null}

        {feed.data?.soundboards.length ? (
          <>
            <SectionHeader
              title="Soundboards"
              subtitle="Ideas, demos and worlds in progress."
              action="Open all"
              onAction={() => router.push('/soundboards' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soundboardRail}>
              {feed.data.soundboards.slice(0, 5).map((board) => (
                <View key={board.id} style={styles.soundboardFrame}>
                  <EdPressable
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Open soundboard ${board.title || 'Untitled soundboard'}`}
                    onPress={() => openHomeDestination({ kind: 'soundboard', id: board.slug || board.id })}
                    style={styles.soundboardSurface}
                  >
                    <View style={styles.soundboardPreview}>
                      {board.cover_image_url ? (
                        <PluggdImage uri={board.cover_image_url} style={styles.soundboardImage} resizeMode="cover" displayWidth={520} />
                      ) : (
                        <View style={[styles.soundboardImage, styles.artFallback]}><MaterialIcons name="dashboard-customize" size={32} color={ORANGE} /></View>
                      )}
                      <LinearGradient colors={['rgba(5,4,3,0.03)', 'rgba(5,4,3,0.88)']} style={StyleSheet.absoluteFillObject} />
                      <View style={styles.soundboardCopy}>
                        <Text style={styles.soundboardKicker}>
                          {board.item_count || 0} PIECES · {board.comment_count || 0} COMMENTS
                        </Text>
                        <Text style={styles.soundboardTitle} numberOfLines={2}>{board.title || 'Untitled soundboard'}</Text>
                      </View>
                    </View>
                    <View style={styles.soundboardOpen}>
                      <Text style={styles.soundboardAction}>Open board</Text>
                      <MaterialIcons name="arrow-forward" size={15} color={theme.colors.accentText} />
                    </View>
                  </EdPressable>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {publicFeatures.data?.storeProducts.length ? (
          <>
            <SectionHeader title="New in Store" subtitle="Approved goods and creator products, newly available." action="Open Store" onAction={() => router.push('/market' as any)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeRail}>
              {publicFeatures.data.storeProducts.slice(0, 6).map((product) => (
                <EdPressable key={product.id} accessibilityRole="button" accessibilityLabel={`Open Store item ${product.title}`} onPress={() => openHomeDestination({ kind: 'store_product', id: product.id })} style={styles.storeCard}>
                  {product.imageUrl ? <PluggdImage uri={product.imageUrl} style={styles.storeArt} resizeMode="cover" displayWidth={420} /> : <View style={[styles.storeArt, styles.artFallback]}><MaterialIcons name="shopping-bag" size={30} color={theme.colors.accentText} /></View>}
                  <Text style={styles.storeType}>{product.productType.replaceAll('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.storeTitle} numberOfLines={2}>{product.title}</Text>
                  <Text style={styles.storePrice}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: product.currency }).format(product.price)}</Text>
                </EdPressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <>
            <SectionHeader
              title="Happening now"
              subtitle="Live rooms and events moving through the scene."
              action="Enter Live"
              onAction={() => router.push('/live' as any)}
            />
            {featuredEvent ? (
              <EdPressable
                haptic={false}
                accessibilityRole="button"
                accessibilityLabel={`Open event ${featuredEvent.title || 'PLUGGD event'}`}
                onPress={() => {
                  selectionHaptic();
                  openHomeDestination({ kind: 'event', id: String(featuredEvent.id) });
                }}
                style={styles.eventFrame}
              >
                <View style={styles.eventMedia}>
                  <PluggdImage uri={featuredEvent.cover_image_url || ''} fallbackSource={EVENT_FALLBACK} style={styles.eventImage} resizeMode="cover" displayWidth={900} />
                  <LinearGradient colors={['rgba(5,4,3,0.02)', 'rgba(5,4,3,0.38)']} style={StyleSheet.absoluteFillObject} />
                  <EventDate value={featuredEvent.starts_at} />
                </View>
                <View style={styles.eventCopy}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{featuredEvent.title || 'PLUGGD event'}</Text>
                  <Text style={styles.eventMeta} numberOfLines={1}>
                    {featuredEvent.location || 'Location TBA'} · {featuredEvent.rsvp_count || 0} going
                  </Text>
                  <View style={styles.eventCta}>
                    <Text style={styles.eventCtaText}>{eventActionLabel(featuredEvent.price_cents)}</Text>
                    <MaterialIcons name="arrow-forward" size={15} color="#100B07" />
                  </View>
                </View>
              </EdPressable>
            ) : null}
            {featuredRoom ? (
              <View style={styles.signalFrame}>
                <View style={styles.liveDot} />
                {featuredRoom.thumbnail_url ? (
                  <PluggdImage uri={featuredRoom.thumbnail_url} style={styles.signalThumb} resizeMode="cover" displayWidth={180} />
                ) : (
                  <View style={[styles.signalThumb, styles.artFallback]}><MaterialIcons name="mic" size={20} color={theme.colors.accentText} /></View>
                )}
                <View style={styles.signalCopy}>
                  <Text style={styles.signalKicker}>{featuredRoom.status === 'live' ? 'LIVE NOW' : 'UPCOMING ROOM'}</Text>
                  <Text style={styles.signalTitle} numberOfLines={1}>{featuredRoom.title || 'Live room'}</Text>
                  <Text style={styles.signalMeta} numberOfLines={1}>{roomMeta(featuredRoom)}</Text>
                </View>
                <View style={styles.joinRoomAction}>
                  <Text style={styles.joinRoomText}>Join</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={theme.colors.accentText} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Join ${featuredRoom.title || 'PLUGGD room'}`}
                  onPress={() => {
                    selectionHaptic();
                    openHomeDestination({ kind: 'live_room', id: featuredRoom.id });
                  }}
                  style={({ pressed }) => [styles.signalHit, pressed && styles.pressed]}
                />
              </View>
            ) : (
              <View style={styles.liveGateway}>
                <LinearGradient
                  colors={['#3B140F', '#18100D', '#0B0907']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.liveGatewayPulseOuter}>
                  <View style={styles.liveGatewayPulseInner}>
                    <MaterialIcons name="sensors" size={26} color={INK} />
                  </View>
                </View>
                <View style={styles.liveGatewayCopy}>
                  <View style={styles.liveGatewayKickerRow}>
                    <View style={styles.liveGatewayDot} />
                    <Text style={styles.liveGatewayKicker}>PLUGGD LIVE</Text>
                  </View>
                  <Text style={styles.liveGatewayTitle}>Step into the room.</Text>
                  <Text style={styles.liveGatewayMeta}>Watch creators, join the chat, send gifts or start a session.</Text>
                </View>
                <View style={styles.liveGatewayAction}>
                  <MaterialIcons name="arrow-forward" size={18} color={INK} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enter PLUGGD Live"
                  onPress={() => {
                    selectionHaptic();
                    router.push('/live' as any);
                  }}
                  style={({ pressed }) => [styles.signalHit, pressed && styles.pressed]}
                />
              </View>
            )}
          </>

        <>
          <SectionHeader
            title="Drops & tools"
            subtitle="Listen, create and move your work forward."
          />
          <View style={styles.toolStack}>
            <MarketGateway
              index="01"
              title="PLUGGD DJ"
              meta="Your PLUGGD library, mixes and DJ workspace"
              action="Open PLUGGD DJ"
              icon="graphic-eq"
              onPress={() => openHomeDestination({ kind: 'creator_tool', tool: 'pluggd_dj' })}
            />
            <MarketGateway
              index="02"
              title="BeatPlug"
              meta={`${feed.data?.beats.length || 0} producer beats`}
              action="Open BeatPlug"
              image={beatGateway?.image_url}
              icon="headphones"
              onPress={() => openHomeDestination({ kind: 'creator_tool', tool: 'beatplug' })}
            />
            <MarketGateway
              index="03"
              title="Creator Studio"
              meta="Your releases, audience and creator tools"
              action="Open Creator Studio"
              icon="space-dashboard"
              onPress={() => openHomeDestination({ kind: 'creator_tool', tool: 'studio' })}
            />
          </View>
        </>

        {!authLoading && !user ? (
          <View style={styles.joinPrompt}>
            <Text style={styles.joinKicker}>MAKE IT YOURS</Text>
            <Text style={styles.joinTitle}>Follow the sound before it breaks.</Text>
            <Text style={styles.joinBody}>Save finds, follow creators and keep your scenes close.</Text>
            <View style={styles.joinActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  selectionHaptic();
                  router.push('/auth/signup' as any);
                }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.joinPrimary}>
                  <Text style={styles.joinPrimaryText}>Join PLUGGD</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  selectionHaptic();
                  router.push('/auth/login' as any);
                }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.joinSecondary}>
                  <Text style={styles.joinSecondaryText}>Sign in</Text>
                </View>
              </Pressable>
            </View>
          </View>
        ) : null}
      </RNAnimated.ScrollView>
    </View>
  );
}

function FeatureSpotlight({
  item,
  parallaxStyle,
  onPlay,
  onOpen,
}: {
  item: DiscoveryItem;
  parallaxStyle?: any;
  onPlay: () => void;
  onOpen: () => void;
}) {
  const styles = useHomeStyles();
  const theme = usePluggdTheme();
  return (
    <View style={styles.featured}>
      <View style={styles.featuredArtFrame}>
        <RNAnimated.View style={[styles.featuredArtMotion, parallaxStyle]}>
          <EdPressable
            haptic={false}
            accessibilityRole="button"
            accessibilityLabel={`Play ${item.title} by ${item.creator}`}
            onPress={onPlay}
            style={styles.featuredArtWrap}
          >
            <Artwork item={item} style={styles.featuredArt} iconSize={34} />
            <View style={styles.kindFlag}><Text style={styles.kindFlagText}>{item.kind.toUpperCase()}</Text></View>
            <View style={styles.featuredPlayBadge}>
              <MaterialIcons name="play-arrow" size={25} color="#100B07" />
            </View>
          </EdPressable>
        </RNAnimated.View>
      </View>
      <View style={styles.featuredCopy}>
        <Text maxFontSizeMultiplier={1.45} style={styles.reason}>{item.discoveryReason.toUpperCase()}</Text>
        <Text maxFontSizeMultiplier={1.35} style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.featuredCreator} numberOfLines={1}>{item.creator}</Text>
        <Text maxFontSizeMultiplier={1.55} style={styles.featuredDescription} numberOfLines={3}>{item.description}</Text>
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={`${featuredActionLabel(item)} by ${item.creator}`}
          onPress={onOpen}
          style={styles.supportButton}
        >
          <View style={styles.supportButtonInner}>
            <Text maxFontSizeMultiplier={1.45} style={styles.supportText}>{featuredActionLabel(item)}</Text>
            <MaterialIcons name="arrow-forward" size={15} color={theme.colors.text} />
          </View>
        </EdPressable>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = useHomeStyles();
  const { fontScale } = useWindowDimensions();
  const accessibilityLayout = fontScale >= 1.5;
  return (
    <View style={[styles.sectionHeader, accessibilityLayout && styles.sectionHeaderAccessibility]}>
      <View style={styles.sectionHeading}>
        <Text maxFontSizeMultiplier={1.45} style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text maxFontSizeMultiplier={1.55} style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <EdPressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={[styles.seeAllButton, accessibilityLayout && styles.seeAllButtonAccessibility]}>
          <Text maxFontSizeMultiplier={1.45} style={styles.seeAll}>{action}</Text>
        </EdPressable>
      ) : null}
    </View>
  );
}

function EventDate({ value }: { value?: string | null }) {
  const styles = useHomeStyles();
  return (
    <View style={styles.eventDate}>
      <Text style={styles.eventDateText}>
        {value
          ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
          : 'SOON'}
      </Text>
    </View>
  );
}

function HomeLoading() {
  const styles = useHomeStyles();
  return (
    <View style={styles.loadingStack}>
      <PremiumSkeleton label="Loading the Daily Plug" style={styles.heroSkeleton} />
      <View style={styles.loadingRow}>
        <PremiumSkeleton compact label="Loading music" style={styles.gridSkeleton} />
        <PremiumSkeleton compact label="Loading music" style={styles.gridSkeleton} />
      </View>
    </View>
  );
}

function NextWave({ items, onOpen }: { items: HomeNextWaveItem[]; onOpen: (destination: HomeDestination) => void }) {
  const styles = useHomeStyles();
  const lead = items[0];
  const stack = items.slice(1, 3);
  const foot = items.slice(3, 5);
  if (!lead) return null;
  return (
    <>
      <SectionHeader title="The next wave" subtitle="People, rooms and releases earning real attention." />
      <View style={styles.waveMosaic}>
        <WaveCard item={lead} onPress={() => onOpen(lead.destination)} style={styles.waveLead} lead />
        {stack.length ? (
          <View style={styles.waveStack}>
            {stack.map((item) => (
              <WaveCard key={item.id} item={item} onPress={() => onOpen(item.destination)} style={styles.waveSmall} />
            ))}
          </View>
        ) : null}
      </View>
      {foot.length ? (
        <View style={styles.waveFoot}>
          {foot.map((item) => (
            <WaveCard key={item.id} item={item} onPress={() => onOpen(item.destination)} style={styles.waveFootCard} />
          ))}
        </View>
      ) : null}
    </>
  );
}

function WaveCard({
  item,
  onPress,
  style,
  lead = false,
}: {
  item: HomeNextWaveItem;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  lead?: boolean;
}) {
  const styles = useHomeStyles();
  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}, ${item.label.toLowerCase()}`}
        onPress={onPress}
        style={styles.waveFrame}
      >
        <PluggdImage uri={item.imageUrl} style={styles.waveImage} resizeMode="cover" displayWidth={lead ? 620 : 360} />
        <LinearGradient colors={['rgba(5,4,3,0.04)', 'rgba(5,4,3,0.92)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.waveCopy}>
          <Text style={styles.waveLabel}>{item.label}</Text>
          <Text style={[styles.waveTitle, lead && styles.waveTitleLead]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.waveSubtitle} numberOfLines={lead ? 2 : 1}>{item.subtitle}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function OpportunityArtwork({ candidates, fallbackSource = OPPORTUNITY_FALLBACK }: { candidates: string[]; fallbackSource?: ImageSourcePropType }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const uri = candidates[candidateIndex] || '';
  return (
    <PluggdImage
      key={`${uri}:${candidateIndex}`}
      uri={uri}
      fallbackSource={fallbackSource}
      style={StyleSheet.absoluteFillObject}
      resizeMode="cover"
      displayWidth={520}
      accessibilityLabel=""
      onError={() => setCandidateIndex((index) => Math.min(index + 1, candidates.length))}
    />
  );
}

function MarketGateway({
  index,
  title,
  meta,
  action,
  image,
  icon,
  onPress,
}: {
  index: string;
  title: string;
  meta: string;
  action: string;
  image?: string | null;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  const styles = useHomeStyles();
  return (
    <EdPressable
      haptic={false}
      accessibilityRole="button"
      accessibilityLabel={action}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={styles.worldFrame}
    >
      {image ? <PluggdImage uri={image} style={styles.worldImage} resizeMode="cover" displayWidth={700} /> : (
        <LinearGradient colors={['#32170F', '#17120F', '#0D0B09']} style={StyleSheet.absoluteFillObject} />
      )}
      <LinearGradient colors={['rgba(5,4,3,0.08)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
      <Text style={styles.worldIndex}>{index}</Text>
      <View style={styles.worldIcon}><MaterialIcons name={icon} size={23} color={ORANGE} /></View>
      <View>
        <Text style={styles.worldTitle}>{title}</Text>
        <Text style={styles.worldMeta}>{meta}</Text>
        <View style={styles.worldAction}>
          <Text style={styles.worldActionText}>{action}</Text>
          <MaterialIcons name="arrow-forward" size={14} color={ORANGE} />
        </View>
      </View>
    </EdPressable>
  );
}

function Artwork({ item, style, iconSize }: { item: DiscoveryItem; style: any; iconSize: number }) {
  const styles = useHomeStyles();
  if (item.kind === 'release' && item.artwork) {
    return <ReleaseArtwork uri={item.artwork} style={style} displayWidth={520} />;
  }
  return item.artwork ? (
    <PluggdImage uri={item.artwork} style={style} resizeMode="cover" displayWidth={520} />
  ) : (
    <View style={[style, styles.artFallback]}><MaterialIcons name="graphic-eq" size={iconSize} color={ORANGE} /></View>
  );
}

function useHomeStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => {
    const INK = theme.colors.text;
    const MUTED = theme.colors.textMuted;
    const ORANGE = theme.colors.accentText;
    const LINE = theme.colors.border;
    const MEDIA_INK = theme.colors.mediaText;
    const MEDIA_MUTED = theme.colors.mediaTextMuted;
    const MEDIA_ACCENT = '#FF6600';
    return StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 190 },
  search: { minHeight: 48, marginBottom: 18, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchText: { flex: 1, color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 14 },
  titleRowAccessibility: { flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  titleGroup: { flex: 1, minWidth: 0 },
  titleGroupAccessibility: { flex: 0 },
  eyebrow: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.35, marginTop: 4, marginBottom: 5 },
  title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 32, lineHeight: 36, letterSpacing: -1.1 },
  editorNote: { flexShrink: 1, maxWidth: 96, color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, lineHeight: 14, textAlign: 'right' },
  editorNoteAccessibility: { maxWidth: 220, textAlign: 'left' },
  loadingStack: { gap: 12, paddingBottom: 12 },
  heroSkeleton: { minHeight: 174, borderRadius: 5 },
  loadingRow: { flexDirection: 'row', gap: 10 },
  gridSkeleton: { flex: 1, minHeight: 84, borderRadius: 5 },
  empty: { minHeight: 210, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE, justifyContent: 'center' },
  emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 20 },
  emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 280 },
  featured: { minHeight: 180, flexDirection: 'row', gap: 17, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
  featuredArtFrame: { width: 146, height: 146, alignSelf: 'center', position: 'relative', overflow: 'visible' },
  featuredArtMotion: { width: 146, height: 146 },
  featuredArtWrap: { width: 146, height: 146, position: 'relative', overflow: 'hidden', borderRadius: 4 },
  featuredArt: { width: 146, height: 146, borderRadius: 4, backgroundColor: theme.colors.artworkBase },
  kindFlag: { position: 'absolute', left: 8, top: 8, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(10,9,8,0.82)' },
  kindFlagText: { color: MEDIA_INK, fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1.1 },
  featuredPlayBadge: { position: 'absolute', zIndex: 5, elevation: 5, right: 8, bottom: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  featuredCopy: { flex: 1, paddingVertical: 2, justifyContent: 'center' },
  reason: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9, lineHeight: 12, letterSpacing: 1.1, marginBottom: 7 },
  featuredTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 19, letterSpacing: -0.45 },
  featuredCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13, marginTop: 5 },
  featuredDescription: { color: theme.colors.textSecondary, fontFamily: 'Satoshi-Regular', fontSize: 10.5, lineHeight: 14, marginTop: 8 },
  supportButton: { alignSelf: 'flex-start' },
  supportButtonInner: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, borderBottomWidth: 1, borderColor: theme.colors.borderStrong },
  supportText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 11.5 },
  carnivalFeature: { minHeight: 230, marginTop: 18, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.colors.artworkBase, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,102,0,0.42)' },
  carnivalFeatureImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  carnivalFeatureCopy: { flex: 1, justifyContent: 'flex-end', padding: 18, gap: 7 },
  carnivalFeatureEyebrow: { color: MEDIA_ACCENT, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1.1 },
  carnivalFeatureTitle: { color: MEDIA_INK, fontFamily: 'Sora-ExtraBold', fontSize: 22, lineHeight: 25, letterSpacing: -0.6, maxWidth: 320 },
  carnivalFeatureTitleEmphasis: { fontStyle: 'italic' },
  carnivalFeatureBody: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Regular', fontSize: 11.5, lineHeight: 16, maxWidth: 315 },
  carnivalFeatureCta: { minHeight: 44, alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, backgroundColor: theme.colors.accentFill, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 7 },
  carnivalFeatureCtaText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.35 },
  sectionHeader: { minHeight: 62, marginTop: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 11, gap: 10 },
  sectionHeaderAccessibility: { minHeight: 72, alignItems: 'center', paddingBottom: 8 },
  sectionHeading: { flex: 1, minWidth: 0 },
  sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, letterSpacing: -0.35 },
  sectionSubtitle: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  seeAllButton: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: 1 },
  seeAllButtonAccessibility: { justifyContent: 'center', paddingBottom: 0 },
  seeAll: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  pickGrid: { gap: 10 },
  pickRow: { flexDirection: 'row', gap: 10 },
  pick: { flex: 1, minWidth: 0, minHeight: 178 },
  pickArtSurface: { height: 128, position: 'relative' },
  pickArt: { width: '100%', height: 128, borderRadius: 4, backgroundColor: theme.colors.artworkBase },
  pickKind: { position: 'absolute', left: 7, top: 7, borderRadius: 3, backgroundColor: 'rgba(9,7,5,0.76)', paddingHorizontal: 6, paddingVertical: 3 },
  pickKindText: { color: '#E8E0D5', fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.9 },
  pickCopy: { minHeight: 46, justifyContent: 'center', paddingTop: 5 },
  pickCopyText: { flex: 1, minWidth: 0 },
  pickTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  pickCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  smallPlay: { position: 'absolute', right: 7, bottom: 7, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  recentRail: { gap: 11, paddingRight: 20 },
  recentCard: { width: 246, height: 82, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, position: 'relative', overflow: 'hidden' },
  recentSurface: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 8 },
  recentArt: { width: 66, height: 66, borderRadius: 4, backgroundColor: theme.colors.artworkBase },
  recentCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  recentKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.9 },
  recentTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5, marginTop: 4 },
  recentCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  recentPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  recentOpen: { width: 44, height: 82, borderLeftWidth: 1, borderLeftColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  sceneRow: { gap: 12, paddingRight: 20 },
  sceneFrame: {
    width: 176,
    minWidth: 176,
    maxWidth: 176,
    height: 136,
    minHeight: 136,
    maxHeight: 136,
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sceneSurface: { ...StyleSheet.absoluteFillObject },
  sceneCopy: { position: 'absolute', zIndex: 2, left: 12, right: 12, bottom: 12 },
  sceneImage: { ...StyleSheet.absoluteFillObject },
  sceneFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#26170F' },
  sceneLabel: { color: MEDIA_INK, fontFamily: 'Sora-Bold', fontSize: 17, lineHeight: 21 },
  sceneDetail: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Bold', fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  sceneStatus: { height: 86, minHeight: 86, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sceneStatusCopy: { flex: 1, minWidth: 0 },
  sceneStatusTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 14 },
  sceneStatusBody: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10.5, marginTop: 4 },
  mixRail: { gap: 12, paddingRight: 20, alignItems: 'flex-start' },
  mixCard: {
    width: 208,
    minWidth: 208,
    maxWidth: 208,
    height: 224,
    minHeight: 224,
    maxHeight: 224,
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  mixCardLead: { width: 252, minWidth: 252, maxWidth: 252 },
  mixSurfaceFrame: {
    width: '100%',
    height: 176,
    minHeight: 176,
    maxHeight: 176,
    flexShrink: 0,
    overflow: 'hidden',
  },
  mixSurfaceHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  mixArt: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.artworkBase },
  mixNumber: { position: 'absolute', left: 12, top: 12, zIndex: 2, color: MEDIA_INK, fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 1.2 },
  mixPlay: { position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  mixOpen: { height: 48, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  mixOpenText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 10.5 },
  mixCopy: { position: 'absolute', zIndex: 2, left: 12, right: 12, bottom: 12 },
  mixKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  mixTitle: { color: MEDIA_INK, fontFamily: 'Sora-ExtraBold', fontSize: 18, lineHeight: 21, marginTop: 4 },
  mixCreator: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10.5, marginTop: 4 },
  releaseRail: { gap: 12, paddingRight: 20 },
  releaseCard: { width: 126, position: 'relative' },
  releaseArtSurface: { width: 126, height: 126, position: 'relative' },
  releaseArt: { width: 126, height: 126, borderRadius: 4, backgroundColor: theme.colors.artworkBase },
  releasePlay: { position: 'absolute', bottom: 6, right: 6, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  releaseCopy: { minHeight: 48, justifyContent: 'center' },
  releaseCopyText: { flex: 1, minWidth: 0 },
  releaseTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  releaseCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  storyCard: { minHeight: 238, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  storyImage: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.artworkBase },
  storyImageFallback: { alignItems: 'center', justifyContent: 'center' },
  storyCopy: { padding: 16, maxWidth: 326 },
  storyKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1.15 },
  storyTitle: { color: MEDIA_INK, fontFamily: 'Sora-ExtraBold', fontSize: 22, lineHeight: 26, letterSpacing: -0.55, marginTop: 6 },
  storyExcerpt: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Regular', fontSize: 11.5, lineHeight: 16, marginTop: 7 },
  storyAction: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  storyActionText: { color: MEDIA_INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  opportunityRail: { gap: 12, paddingRight: 20, alignItems: 'flex-start' },
  opportunityFrame: { width: 220, minWidth: 220, maxWidth: 220, height: 230, minHeight: 230, maxHeight: 230, flexShrink: 0 },
  opportunitySurface: { ...StyleSheet.absoluteFillObject, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  opportunityArt: { height: 174, minHeight: 174, maxHeight: 174, position: 'relative', justifyContent: 'flex-end', overflow: 'hidden' },
  opportunityTag: { position: 'absolute', left: 11, top: 11, borderRadius: 3, backgroundColor: ORANGE, paddingHorizontal: 8, paddingVertical: 5 },
  opportunityTagText: { color: '#160B04', fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.9 },
  opportunityCopy: { padding: 13, minWidth: 0 },
  opportunityTitle: { color: MEDIA_INK, fontFamily: 'Sora-ExtraBold', fontSize: 18, lineHeight: 22 },
  opportunityOrganiser: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Bold', fontSize: 10, marginTop: 5 },
  opportunityFacts: { height: 56, minHeight: 56, maxHeight: 56, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, overflow: 'hidden' },
  opportunityFact: { flex: 1, minWidth: 0, color: INK, fontFamily: 'Satoshi-Black', fontSize: 10 },
  opportunityDeadline: { flexShrink: 1, maxWidth: 108, color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9.5, textAlign: 'right' },
  waveMosaic: { height: 224, minHeight: 224, maxHeight: 224, flexDirection: 'row', gap: 8 },
  waveStack: { flex: 0.78, height: 224, minHeight: 224, maxHeight: 224, gap: 8 },
  waveFrame: { ...StyleSheet.absoluteFillObject, borderRadius: 5, overflow: 'hidden' },
  waveLead: { flex: 1.22, height: 224, minHeight: 224, maxHeight: 224 },
  waveSmall: { flex: 1, height: 108, minHeight: 108, maxHeight: 108 },
  waveFoot: { flexDirection: 'row', gap: 8, marginTop: 8 },
  waveFootCard: { flex: 1, height: 132, minHeight: 132, maxHeight: 132 },
  waveImage: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.artworkBase },
  waveCopy: { position: 'absolute', zIndex: 2, left: 10, right: 10, bottom: 10 },
  waveLabel: { alignSelf: 'flex-start', color: '#100B07', backgroundColor: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.8, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 2, overflow: 'hidden' },
  waveTitle: { color: MEDIA_INK, fontFamily: 'Sora-Bold', fontSize: 12.5, lineHeight: 16, marginTop: 6 },
  waveTitleLead: { fontSize: 17, lineHeight: 21 },
  waveSubtitle: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  soundboardRail: { gap: 12, paddingRight: 20, alignItems: 'flex-start' },
  soundboardFrame: { width: 224, minWidth: 224, maxWidth: 224, height: 204, minHeight: 204, maxHeight: 204, flexShrink: 0, position: 'relative', borderRadius: 6, overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  soundboardSurface: { ...StyleSheet.absoluteFillObject, width: 224, minWidth: 224, maxWidth: 224, height: 204, minHeight: 204, maxHeight: 204 },
  soundboardPreview: { height: 158, position: 'relative', overflow: 'hidden' },
  soundboardImage: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.artworkBase },
  soundboardCopy: { position: 'absolute', zIndex: 2, left: 13, right: 13, bottom: 13, minWidth: 0 },
  soundboardKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1 },
  soundboardTitle: { flexShrink: 1, color: MEDIA_INK, fontFamily: 'Sora-Bold', fontSize: 17, lineHeight: 21, marginTop: 4 },
  soundboardOpen: { height: 46, position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface },
  soundboardAction: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 11, lineHeight: 16 },
  storeRail: { gap: 12, paddingRight: 20, alignItems: 'flex-start' },
  storeCard: { width: 154, minHeight: 242, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingBottom: 12, overflow: 'hidden' },
  storeArt: { width: '100%', height: 154, backgroundColor: theme.colors.artworkBase },
  storeType: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 1, marginTop: 10, marginHorizontal: 10 },
  storeTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 13, lineHeight: 17, marginTop: 4, marginHorizontal: 10 },
  storePrice: { color: theme.colors.textSecondary, fontFamily: 'Satoshi-Bold', fontSize: 11, marginTop: 6, marginHorizontal: 10 },
  eventFrame: { height: 244, minHeight: 244, maxHeight: 244, position: 'relative', borderRadius: 5, overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  eventFrameCompact: { height: 150, minHeight: 150, maxHeight: 150, borderColor: theme.colors.border },
  eventMedia: { height: 134, overflow: 'hidden' },
  eventImage: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.artworkBase },
  eventDate: { position: 'absolute', left: 12, top: 12, backgroundColor: theme.colors.accentFill, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 3 },
  eventDateText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
  eventCopy: { minHeight: 110, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, backgroundColor: theme.colors.surface },
  eventCopyCompact: { minHeight: 150, paddingTop: 58 },
  eventTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 18, lineHeight: 22 },
  eventMeta: { color: theme.colors.textSecondary, fontFamily: 'Satoshi-Medium', fontSize: 11, marginTop: 5 },
  eventCta: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.accentFill, borderRadius: 22, paddingHorizontal: 15, marginTop: 12 },
  eventCtaText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 11 },
  signalFrame: { height: 88, minHeight: 88, maxHeight: 88, position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 5, backgroundColor: theme.colors.surface },
  signalHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  liveGateway: { minHeight: 136, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18, borderWidth: 1, borderColor: '#4A261B' },
  liveGatewayPulseOuter: { width: 74, height: 74, borderRadius: 37, borderWidth: 1, borderColor: 'rgba(255,71,87,0.32)', backgroundColor: 'rgba(255,71,87,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  liveGatewayPulseInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FF4757', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF4757', shadowOpacity: 0.38, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
  liveGatewayCopy: { flex: 1, minWidth: 0, zIndex: 2 },
  liveGatewayKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  liveGatewayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4757' },
  liveGatewayKicker: { color: '#FF8B93', fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.35 },
  liveGatewayTitle: { color: MEDIA_INK, fontFamily: 'Sora-Bold', fontSize: 18, lineHeight: 22, letterSpacing: -0.35 },
  liveGatewayMeta: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10.5, lineHeight: 14, marginTop: 4, maxWidth: 205 },
  liveGatewayAction: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(247,242,233,0.24)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  liveDot: { position: 'absolute', left: -1, top: 18, width: 3, height: 28, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: ORANGE },
  signalThumb: { width: 52, height: 52, borderRadius: 4, backgroundColor: theme.colors.artworkBase },
  signalCopy: { flex: 1, minWidth: 0 },
  signalKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.9, marginBottom: 3 },
  signalTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5 },
  signalMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  joinRoomText: { color: INK, fontFamily: 'Satoshi-Black', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  joinRoomAction: { minWidth: 54, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  toolStack: { width: '100%', gap: 10 },
  worldFrame: { width: '100%', height: 142, minHeight: 142, maxHeight: 142, position: 'relative', flexShrink: 0, borderRadius: 6, padding: 14, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: theme.colors.artworkBase, borderWidth: 1, borderColor: theme.colors.border },
  worldImage: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.artworkBase },
  worldIndex: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
  worldIcon: { position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,9,8,0.72)', borderWidth: 1, borderColor: 'rgba(255,102,0,0.34)' },
  worldTitle: { color: MEDIA_INK, fontFamily: 'Sora-Bold', fontSize: 16 },
  worldMeta: { color: MEDIA_MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  worldAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 },
  worldActionText: { color: MEDIA_INK, fontFamily: 'Satoshi-Bold', fontSize: 10.5 },
  joinPrompt: { marginTop: 28, paddingVertical: 26, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
  joinKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1.2 },
  joinTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 21, lineHeight: 26, marginTop: 6 },
  joinBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 18, marginTop: 7, maxWidth: 300 },
  joinActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  joinPrimary: { minHeight: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  joinPrimaryText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 12 },
  joinSecondary: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderStrong, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  joinSecondaryText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
    });
  }, [theme]);
}
