import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { buildHomeSignals } from '../home/homeDiscoveryData';
import { safeList } from '../culture/mobileServices';
import { supabase } from '../../lib/supabase';
import type { EventItem, ProfileItem } from '../../lib/mobileContent';
import { useHomeFeed, useLiveRooms, usePublicActiveEvents } from '../culture/useCultureData';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';
import {
  buildDiscoveryItems,
  buildDiscoveryScenes,
  buildRankedDiscoveryItems,
  discoveryItemMatchesScene,
  normalizeSceneValue,
  isPlayableDiscoveryItem,
  type DiscoveryItem,
} from './discoveryModel';
import { DiscoveryHeader } from './DiscoveryHeader';
import { DiscoveryExperience } from './DiscoveryExperience';
import { PUBLIC_DESTINATIONS } from './publicDestinations';
import { loadPublicDiscoveryFeatures } from './publicDiscoveryFeatures';
import { loadCuratedPublicItems } from './siteCuration';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
const FILTERS = ['For you', 'Scenes', 'Genres', 'Cities', 'Charts'] as const;
const OPPORTUNITIES_ARTWORK = require('../../../assets/opportunities/early-career-promoter-hero.png') as ImageSourcePropType;

function normalizedIdentity(value?: string | null) {
  return value?.trim().toLocaleLowerCase('en-GB').replace(/\s+/g, ' ') || '';
}

function profileRoute(profile: ProfileItem) {
  if (profile.username) return `/creator/${profile.username}`;
  if (profile.user_id) return `/user/${profile.user_id}`;
  return null;
}

function publicDiscoveryReason(value?: string | null) {
  return (value || 'Chosen from current PLUGGD activity')
    .replace(/producer signal/gi, 'producer pick')
    .replace(/signals/gi, 'activity')
    .replace(/signal/gi, 'activity');
}

function formatEventDate(value?: string | null) {
  if (!value) return 'DATE TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'DATE TBA';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
}

export function MusicDiscoveryDiscover() {
  return <DiscoveryExperience />;
}

/** Preserved while the repaired screen is visually accepted in Simulator. */
export function LegacyMusicDiscoveryDiscover() {
  const router = useRouter();
  const bottomInset = useBottomChromeInset();
  const params = useLocalSearchParams<{ scene?: string; sceneValue?: string; sceneKind?: 'city' | 'genre' }>();
  const selectedScene = typeof params.scene === 'string' ? decodeURIComponent(params.scene).trim() : '';
  const selectedSceneValue = typeof params.sceneValue === 'string'
    ? decodeURIComponent(params.sceneValue).trim()
    : selectedScene;
  const selectedSceneKind = params.sceneKind === 'city' ? 'city' : 'genre';
  const feed = useHomeFeed();
  const live = useLiveRooms();
  const publicFeatures = useQuery({
    queryKey: ['discovery', 'public-features'],
    queryFn: loadPublicDiscoveryFeatures,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  const heroRotation = useQuery({
    queryKey: ['site-curation', 'hero_rotation'],
    queryFn: () => loadCuratedPublicItems('hero_rotation', 36),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const movingCuration = useQuery({
    queryKey: ['site-curation', 'what_moving_now'],
    queryFn: () => loadCuratedPublicItems('what_moving_now', 24),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const featuredEventCuration = useQuery({
    queryKey: ['site-curation', 'featured_event'],
    queryFn: () => loadCuratedPublicItems('featured_event', 60),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const publicEvents = usePublicActiveEvents();
  const { playQueue } = usePlayback();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(params.scene ? 'Scenes' : 'For you');
  const navigate = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };
  const chooseFilter = (next: (typeof FILTERS)[number]) => {
    if (next !== filter) selectionHaptic();
    setFilter(next);
  };
  const organicItems = useMemo(() => buildDiscoveryItems(feed.data), [feed.data]);
  const allItems = useMemo(() => {
    const curated = heroRotation.data?.flatMap((item) => item.discoveryItem ? [item.discoveryItem] : []) ?? [];
    const unique = new Map<string, DiscoveryItem>();
    [...curated, ...organicItems].forEach((item) => {
      if (!unique.has(item.id)) unique.set(item.id, item);
    });
    return [...unique.values()];
  }, [heroRotation.data, organicItems]);
  const playableItems = useMemo(() => allItems.filter(isPlayableDiscoveryItem), [allItems]);
  const chartItems = useMemo(() => {
    const measured = buildRankedDiscoveryItems(playableItems, 10);
    if (measured.length >= 10) return measured;
    const measuredIds = new Set(measured.map((item) => item.id));
    // Keep real engagement leaders first, then complete the Top 10 with real
    // playable feed entries in their existing stable order. No score is made up.
    return [...measured, ...playableItems.filter((item) => !measuredIds.has(item.id))].slice(0, 10);
  }, [playableItems]);
  const scenes = useMemo(() => {
    const grouped = new Map<string, ReturnType<typeof buildDiscoveryScenes>[number]>();
    for (const scene of buildDiscoveryScenes(feed.data)) {
      const label = scene.label.split(',')[0]?.trim() || scene.label.trim();
      const key = normalizedIdentity(label);
      if (!key || grouped.has(key)) continue;
      grouped.set(key, {
        ...scene,
        label,
        detail: scene.detail.toLocaleLowerCase('en-GB').includes('city') ? 'City' : scene.detail.toLocaleLowerCase('en-GB').includes('genre') ? 'Genre' : scene.detail,
        route: `/discover?scene=${encodeURIComponent(label)}&sceneValue=${encodeURIComponent(scene.canonicalValue)}&sceneKind=${scene.kind}`,
      });
    }
    return [...grouped.values()];
  }, [feed.data]);
  const items = useMemo(() => {
    if (filter === 'For you') return allItems;
    if (filter === 'Charts') return chartItems;
    if (filter === 'Cities') return allItems.filter((item) => item.city);
    if (filter === 'Genres') return allItems.filter((item) => item.genre);
    if (selectedScene) {
      return allItems.filter((item) => discoveryItemMatchesScene(item, {
        kind: selectedSceneKind,
        canonicalValue: normalizeSceneValue(selectedSceneValue),
      }));
    }
    return allItems.filter((item) => item.kind === 'mix');
  }, [allItems, chartItems, filter, selectedScene, selectedSceneKind, selectedSceneValue]);
  const hasSelectedSceneMatches = filter === 'Scenes' && Boolean(selectedScene) && items.length > 0;
  const visible = filter === 'Scenes' && selectedScene
    ? items
    : (items.length ? items : allItems);
  const liveRoom = live.data?.find((room) => room.status === 'live') ?? live.data?.[0];
  // Live rooms come back mixed; surface open rooms before queued ones so the
  // section leads with something the listener can actually enter.
  const liveRooms = useMemo(() => {
    const rooms = live.data ?? [];
    return [...rooms].sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live')).slice(0, 4);
  }, [live.data]);
  // A recurring series is stored as one row per date, so an unfiltered list
  // shows the same night four or five times. Collapse to the soonest instance
  // per title+venue and carry a count, so the series reads as one card.
  const nearYou = useMemo(() => {
    const bySeries = new Map<string, { event: EventItem; upcoming: number }>();
    const curatedEvents = featuredEventCuration.data?.flatMap((item) => item.event ? [item.event] : []) ?? [];
    const eventById = new Map<string, EventItem>();
    [...curatedEvents, ...(publicEvents.data ?? []), ...(feed.data?.events ?? [])].forEach((event) => {
      if (!eventById.has(event.id)) eventById.set(event.id, event);
    });
    const dated = [...eventById.values()]
      .filter((event) => Boolean(event.location))
      .slice()
      .sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime());

    for (const event of dated) {
      const key = `${(event.title || '').trim().toLowerCase()}|${(event.location || '').trim().toLowerCase()}`;
      const existing = bySeries.get(key);
      if (existing) existing.upcoming += 1;
      else bySeries.set(key, { event, upcoming: 1 });
    }
    return [...bySeries.values()].slice(0, 6);
  }, [featuredEventCuration.data, feed.data?.events, publicEvents.data]);
  const creditedCreatorNames = useMemo(() => Array.from(new Set(
    allItems
      .filter((item) => item.kind === 'release' || item.kind === 'beat')
      .map((item) => item.creator.trim())
      .filter((name) => Boolean(name) && !/^pluggd (creator|producer)$/i.test(name)),
  )).slice(0, 40), [allItems]);
  const actualProfiles = useQuery({
    queryKey: ['discover', 'credited-creators', creditedCreatorNames.join('|')],
    enabled: creditedCreatorNames.length > 0,
    queryFn: async () => {
      const columns = ['display_name', 'full_name', 'username'] as const;
      const batches = await Promise.all(columns.map((column) => safeList<ProfileItem>(
        (supabase as any)
          .from('public_profiles')
          .select('user_id,id,display_name,full_name,username,avatar_url,primary_genre,city')
          .in(column, creditedCreatorNames)
          .limit(40),
      )));
      const profiles = new Map<string, ProfileItem>();
      for (const profile of batches.flat()) {
        const key = profile.user_id || profile.id || profile.username;
        if (key) profiles.set(key, profile);
      }
      return [...profiles.values()];
    },
    staleTime: 1000 * 60 * 5,
  });
  // Credited artist/producer names must resolve to a public creator identity.
  // Uploader and label owner IDs are deliberately not used as creator routes.
  const creators = useMemo(() => {
    const profilesByName = new Map<string, ProfileItem>();
    for (const profile of actualProfiles.data ?? []) {
      for (const value of [profile.display_name, profile.full_name, profile.username]) {
        const key = normalizedIdentity(value);
        if (key) profilesByName.set(key, profile);
      }
    }
    const seen = new Map<string, { name: string; artwork: string | null; meta: string; route: string }>();
    for (const item of allItems) {
      if (item.kind !== 'release' && item.kind !== 'beat') continue;
      const creditedName = item.creator?.trim();
      const profile = profilesByName.get(normalizedIdentity(creditedName));
      const route = profile ? profileRoute(profile) : null;
      const key = profile?.user_id || profile?.id || normalizedIdentity(creditedName);
      if (!creditedName || !profile || !route || !key || seen.has(key)) continue;
      seen.set(key, {
        name: profile.display_name || profile.full_name || profile.username || creditedName,
        artwork: profile.avatar_url || item.artwork,
        meta: profile.primary_genre || profile.city || item.genre || 'Independent creator',
        route,
      });
    }
    return [...seen.values()].slice(0, 8);
  }, [actualProfiles.data, allItems]);
  const movingNow = useMemo(() => {
    const curated = movingCuration.data?.map((item) => publicDiscoveryReason(
      item.subtitle ? `${item.title} — ${item.subtitle}` : item.title,
    )) ?? [];
    const organic = buildHomeSignals(feed.data, live.data ?? [], [])
      .map((entry) => publicDiscoveryReason(entry.label));
    return [...new Set([...curated, ...organic])].slice(0, 5);
  }, [feed.data, live.data, movingCuration.data]);
  const featuredDiscoverArticle = heroRotation.data?.find((item) => item.article);
  const worlds = useMemo(() => PUBLIC_DESTINATIONS.map((destination) => {
    const base = { ...destination, icon: destination.icon as keyof typeof MaterialIcons.glyphMap };
    switch (destination.id) {
      case 'carnival':
        return { ...base, meta: destination.defaultMeta, image: 'https://www.pluggd.fm/carnival-2026/assets/mas/notting-hill-mas-2023.webp' };
      case 'mixes':
        return { ...base, meta: `${feed.data?.mixes.length || 0} selector worlds`, image: feed.data?.mixes.find((item) => item.cover_url)?.cover_url || null, fallbackSource: WEB_PARITY_ASSETS.mixesHero };
      case 'soundboards':
        return { ...base, meta: `${feed.data?.soundboards.length || 0} ideas in progress`, image: feed.data?.soundboards.find((item) => item.cover_image_url)?.cover_image_url || null, fallbackSource: WEB_PARITY_ASSETS.discoverPaperCard };
      case 'releases':
        return { ...base, meta: `${feed.data?.releases.length || 0} fresh pressings`, image: feed.data?.releases.find((item) => item.cover_art_url)?.cover_art_url || null, fallbackSource: WEB_PARITY_ASSETS.discoverPaperWide };
      case 'live':
        return { ...base, meta: liveRoom?.status === 'live' ? 'Creators broadcasting now' : destination.defaultMeta, image: liveRoom?.thumbnail_url || liveRoom?.creator_avatar_url || null, fallbackSource: WEB_PARITY_ASSETS.liveHero };
      case 'the_plug':
        return {
          ...base,
          route: featuredDiscoverArticle?.route || base.route,
          meta: featuredDiscoverArticle?.title || destination.defaultMeta,
          image: featuredDiscoverArticle?.imageUrl || null,
          fallbackSource: WEB_PARITY_ASSETS.discoverPaperWide,
        };
      case 'beatplug':
        return { ...base, meta: `${feed.data?.beats.length || 0} beats ready to hear`, image: feed.data?.beats.find((item) => item.image_url)?.image_url || null, fallbackSource: WEB_PARITY_ASSETS.marketBeatStore };
      case 'opportunities':
        return { ...base, meta: destination.defaultMeta, image: null, fallbackSource: OPPORTUNITIES_ARTWORK };
      case 'creators':
        return { ...base, meta: destination.defaultMeta, image: creators[0]?.artwork || null, fallbackSource: WEB_PARITY_ASSETS.intimateVocalist };
      case 'community':
        return { ...base, meta: destination.defaultMeta, image: null, fallbackSource: WEB_PARITY_ASSETS.intimateCrowdHero };
      case 'events':
        return {
          ...base,
          meta: `${publicEvents.data?.length ?? feed.data?.events.length ?? 0} live and upcoming events`,
          image: featuredEventCuration.data?.find((item) => item.event?.cover_image_url)?.event?.cover_image_url
            || publicEvents.data?.find((item) => item.cover_image_url)?.cover_image_url
            || feed.data?.events.find((item) => item.cover_image_url)?.cover_image_url
            || null,
          fallbackSource: WEB_PARITY_ASSETS.eventsHero,
        };
      case 'store':
        return { ...base, meta: destination.defaultMeta, image: null, fallbackSource: WEB_PARITY_ASSETS.marketBeatStore };
    }
  }), [creators, featuredDiscoverArticle, featuredEventCuration.data, feed.data, liveRoom?.creator_avatar_url, liveRoom?.status, liveRoom?.thumbnail_url, publicEvents.data]);

  const play = async (item: DiscoveryItem) => {
    if (!isPlayableDiscoveryItem(item)) {
      selectionHaptic();
      router.push(item.destinationRoute as any);
      return;
    }
    impactHaptic();
    await playQueue(
      playableItems.map((entry) => entry.track),
      Math.max(0, playableItems.findIndex((entry) => entry.id === item.id)),
    );
  };

  const open = (item: DiscoveryItem) => {
    selectionHaptic();
    router.push(item.destinationRoute as any);
  };

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}><Text style={styles.kicker}>FOLLOW THE CULTURE</Text><Text style={styles.title}>Discover</Text><Text style={styles.subtitle}>Find the next sound through scenes, cities and independent tastemakers.</Text></View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open PLUGGD Live"
            onPress={() => navigate('/live')}
            style={({ pressed }) => [styles.signalMark, pressed && styles.signalMarkPressed]}
          >
            <View style={styles.signalLiveDot} />
            <MaterialIcons name="graphic-eq" size={24} color={ORANGE} />
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Search music and scenes" onPress={() => navigate('/search')} style={styles.search}>
          <MaterialIcons name="search" size={21} color={MUTED} /><Text style={styles.searchText}>Artists, tracks, scenes, cities</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === item }} key={item} onPress={() => chooseFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}
        </ScrollView>

        <View style={styles.worldsGrid}>
          {worlds.map((world) => <WorldGateway key={world.title} world={world} onPress={() => navigate(world.route)} />)}
        </View>

        {feed.isLoading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {!feed.isLoading && !visible.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>{selectedScene && filter === 'Scenes' ? `Nothing published in ${selectedScene} yet.` : 'No playable music yet.'}</Text><Text style={styles.emptyBody}>{selectedScene && filter === 'Scenes' ? 'Choose another scene. This view will never substitute unrelated results.' : 'Try another filter or return when creators publish more music.'}</Text></View> : null}

        {visible.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>{filter === 'For you' ? 'FOR YOU' : filter.toUpperCase()}</Text>
                <Text style={styles.sectionTitle}>
                  {filter === 'For you'
                    ? 'Start somewhere unexpected'
                    : hasSelectedSceneMatches
                      ? `Inside ${selectedScene}`
                      : `Inside ${filter.toLowerCase()}`}
                </Text>
              </View>
              <Text style={styles.liveCount}>{visible.length} ITEMS</Text>
            </View>
            <View style={styles.mosaic}>
              {visible[0] ? <SignalTile item={visible[0]} variant="lead" onOpen={() => open(visible[0])} onPlay={() => play(visible[0])} /> : null}
              <View style={styles.mosaicStack}>
                {visible.slice(1, 3).map((item) => <SignalTile key={item.id} item={item} variant="small" onOpen={() => open(item)} onPlay={() => play(item)} />)}
              </View>
            </View>
            <View style={styles.whyRow}><View style={styles.whyLine} /><Text style={styles.whyText}>{publicDiscoveryReason(visible[0]?.discoveryReason)}. Chosen from current creator and scene activity—not popularity alone.</Text></View>
            {visible.length > 3 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRail}>
                {visible.slice(3, 8).map((item) => (
                  <DiscoveryRailCard key={`more-${item.id}`} item={item} onOpen={() => open(item)} onPlay={() => play(item)} />
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        {publicFeatures.data?.opportunities.length ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>OPPORTUNITIES</Text><Text style={styles.sectionTitle}>Open doors for your next move</Text></View><Pressable accessibilityRole="button" onPress={() => navigate('/opportunities')}><Text style={styles.seeAll}>View all</Text></Pressable></View>
            <View style={styles.opportunityFeature}>
              <View style={styles.opportunityMetric}><Text style={styles.opportunityMetricValue}>{publicFeatures.data.opportunities.length}</Text><Text style={styles.opportunityMetricLabel}>VERIFIED OPENINGS</Text></View>
              <View style={styles.opportunityMetric}><Text style={styles.opportunityMetricValue}>{publicFeatures.data.totalListedFundingGBP > 0 ? `£${Math.round(publicFeatures.data.totalListedFundingGBP).toLocaleString('en-GB')}` : 'LIVE'}</Text><Text style={styles.opportunityMetricLabel}>{publicFeatures.data.totalListedFundingGBP > 0 ? 'LISTED FUNDING' : 'CURRENTLY OPEN'}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Find your next opportunity" onPress={() => navigate('/opportunities')} style={styles.opportunityMetricAction}><MaterialIcons name="arrow-forward" size={21} color="#100B07" /></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opportunityRail}>
              {publicFeatures.data.opportunities.slice(0, 5).map((opportunity) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Open opportunity ${opportunity.title}`} key={opportunity.id} onPress={() => navigate(opportunity.route)} style={styles.opportunityCard}>
                  {opportunity.imageUrl ? <PluggdImage uri={opportunity.imageUrl} style={styles.opportunityArt} displayWidth={440} /> : <LinearGradient colors={['#4A1D13', '#171018', '#09090B']} style={styles.opportunityArt} />}
                  <LinearGradient colors={['rgba(5,4,3,0.02)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.opportunityCopy}><Text style={styles.opportunityType}>{opportunity.type.replaceAll('_', ' ').toUpperCase()}</Text><Text style={styles.opportunityTitle} numberOfLines={2}>{opportunity.title}</Text><Text style={styles.opportunityMeta} numberOfLines={1}>{opportunity.organiser}</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {scenes.length ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>SCENE DIAL</Text><Text style={styles.sectionTitle}>Tune into a world</Text></View><Pressable accessibilityRole="button" onPress={() => chooseFilter('Scenes')}><Text style={styles.seeAll}>Browse all</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRail}>
              {scenes.map((scene, index) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${scene.label}`} key={scene.label} onPress={() => navigate(scene.route)} style={[styles.sceneCard, index % 2 === 1 && styles.sceneCardTall]}>
                  {scene.image ? <PluggdImage uri={scene.image} style={styles.fill} displayWidth={480} /> : <View style={[styles.fill, styles.fallback]} />}
                  <View style={styles.sceneShade} /><Text style={styles.sceneNumber}>0{index + 1}</Text><View><Text style={styles.sceneLabel}>{scene.label}</Text><Text style={styles.sceneDetail}>{scene.detail} · enter</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {allItems.length > 3 ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>NEW ON PLUGGD</Text><Text style={styles.sectionTitle}>Fresh from creators</Text></View><Pressable accessibilityRole="button" onPress={() => navigate('/releases')}><Text style={styles.seeAll}>View releases</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radarRail}>
              {allItems.slice(3, 9).map((item) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title} by ${item.creator}`} key={item.id} onPress={() => open(item)} style={styles.radarCard}>
                  {item.artwork ? <PluggdImage uri={item.artwork} style={styles.radarArt} displayWidth={420} /> : <View style={[styles.radarArt, styles.fallback]}><MaterialIcons name="graphic-eq" size={30} color={ORANGE} /></View>}
                  <Pressable accessibilityRole="button" accessibilityLabel={item.isPlayable ? `Play ${item.title}` : `Open ${item.title}`} onPress={(event) => { event.stopPropagation(); void play(item); }} style={styles.radarPlay}><MaterialIcons name={item.isPlayable ? 'play-arrow' : 'north-east'} size={18} color="#100B07" /></Pressable>
                  <Text style={styles.radarTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.radarMeta} numberOfLines={1}>{item.creator} · {item.kind}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {chartItems.length ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>PLUGGD TOP 10</Text><Text style={styles.sectionTitle}>Moving without the machine</Text></View></View>
            {chartItems.map((item, index) => (
              <View key={`chart-${item.id}`} style={styles.chartRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open chart item ${item.title} by ${item.creator}`} onPress={() => open(item)} style={styles.chartOpen}>
                  <Text style={styles.chartRank}>{String(index + 1).padStart(2, '0')}</Text>
                  {item.artwork ? <PluggdImage uri={item.artwork} style={styles.chartArt} displayWidth={180} /> : <View style={[styles.chartArt, styles.fallback]} />}
                  <View style={styles.chartCopy}><Text style={styles.chartTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.chartMeta} numberOfLines={1}>{item.creator} · {publicDiscoveryReason(item.discoveryReason)}</Text></View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.title}`} hitSlop={8} onPress={() => { void play(item); }}><MaterialIcons name="play-arrow" size={22} color={index < 3 ? ORANGE : MUTED} /></Pressable>
              </View>
            ))}
          </>
        ) : null}

        {/* Live Now — public rooms first, upcoming events when nothing is live,
            so the section is never an empty shelf. Mirrors web /discover. */}
        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionEyebrow}>LIVE NOW</Text><Text style={styles.sectionTitle}>Rooms open right now</Text></View>
          <Pressable accessibilityRole="button" onPress={() => navigate('/live')}><Text style={styles.seeAll}>All rooms</Text></Pressable>
        </View>
        {liveRooms.length ? (
          liveRooms.map((room) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open live room ${room.title || 'PLUGGD Live'}`}
              key={`live-${room.id}`}
              onPress={() => navigate(`/live/session?roomId=${encodeURIComponent(room.id)}`)}
              style={styles.chartRow}
            >
              <View style={[styles.liveDot, room.status === 'live' && styles.liveDotOn]} />
              <View style={styles.chartCopy}>
                <Text style={styles.chartTitle} numberOfLines={1}>{room.title || 'PLUGGD Live'}</Text>
                <Text style={styles.chartMeta} numberOfLines={1}>
                  {room.status === 'live'
                    ? `${room.creator_name || 'PLUGGD Live'} · ${room.viewer_count || 0} listening`
                    : `${room.creator_name || 'PLUGGD Live'} · queued`}
                </Text>
              </View>
              <MaterialIcons name="north-east" size={18} color={room.status === 'live' ? ORANGE : MUTED} />
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyRow}>
            <Text style={styles.liveEmptyTitle}>No rooms open right now.</Text>
            <Text style={styles.emptyCopy}>Upcoming events are still moving — jump into one while the next room opens.</Text>
            <View style={styles.emptyActions}>
              <Pressable accessibilityRole="button" onPress={() => navigate('/events')} style={styles.emptyPrimary}><Text style={styles.emptyPrimaryText}>View events</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => navigate('/live/create')} style={styles.emptySecondary}><Text style={styles.emptySecondaryText}>Start a room</Text></Pressable>
            </View>
          </View>
        )}

        {nearYou.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionEyebrow}>NEAR YOU</Text><Text style={styles.sectionTitle}>Happening around the scene</Text></View>
              <Pressable accessibilityRole="button" onPress={() => navigate('/events')}><Text style={styles.seeAll}>All events</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRail}>
              {nearYou.map(({ event, upcoming }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    upcoming > 1
                      ? `Open ${event.title || 'event'}, next of ${upcoming} dates`
                      : `Open ${event.title || 'event'}`
                  }
                  key={`near-${event.id}`}
                  onPress={() => navigate(`/events/${event.id}`)}
                  style={styles.nearCard}
                >
                  {event.cover_image_url ? (
                    <PluggdImage uri={event.cover_image_url} style={styles.nearArt} displayWidth={320} />
                  ) : (
                    <View style={[styles.nearArt, styles.fallback]} />
                  )}
                  <Text style={styles.nearDate}>
                    {formatEventDate(event.starts_at)}
                    {upcoming > 1 ? `  ·  +${upcoming - 1} MORE DATES` : ''}
                  </Text>
                  <Text style={styles.chartTitle} numberOfLines={2}>{event.title || 'Untitled event'}</Text>
                  <Text style={styles.chartMeta} numberOfLines={1}>{event.location || 'Location TBA'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {creators.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionEyebrow}>CREATORS TO WATCH</Text><Text style={styles.sectionTitle}>Shaping the feed</Text></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRail}>
              {creators.map((creator) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${creator.name}`}
                  key={`creator-${creator.name}`}
                  onPress={() => navigate(creator.route)}
                  style={styles.creatorCard}
                >
                  {creator.artwork ? (
                    <PluggdImage uri={creator.artwork} style={styles.creatorArt} displayWidth={180} />
                  ) : (
                    <View style={[styles.creatorArt, styles.fallback]} />
                  )}
                  <Text style={styles.creatorName} numberOfLines={1}>{creator.name}</Text>
                  <Text style={styles.chartMeta} numberOfLines={1}>{creator.meta}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {publicFeatures.data?.storeProducts.length ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>STORE RACK</Text><Text style={styles.sectionTitle}>New goods on PLUGGD</Text></View><Pressable accessibilityRole="button" onPress={() => navigate('/market')}><Text style={styles.seeAll}>Open Store</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storeRail}>
              {publicFeatures.data.storeProducts.slice(0, 6).map((product) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Open Store item ${product.title}`} key={product.id} onPress={() => navigate(product.route)} style={styles.storeCard}>
                  {product.imageUrl ? <PluggdImage uri={product.imageUrl} style={styles.storeArt} displayWidth={360} /> : <View style={[styles.storeArt, styles.fallback]}><MaterialIcons name="shopping-bag" size={30} color={ORANGE} /></View>}
                  <Text style={styles.storeType}>{product.productType.replaceAll('_', ' ').toUpperCase()}</Text><Text style={styles.storeTitle} numberOfLines={2}>{product.title}</Text><Text style={styles.storePrice}>{new Intl.NumberFormat('en-GB', { style: 'currency', currency: product.currency }).format(product.price)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable accessibilityRole="button" accessibilityLabel="Open your Library" onPress={() => navigate('/library')} style={styles.libraryGateway}><View style={styles.libraryIcon}><MaterialIcons name="bookmarks" size={24} color={ORANGE} /></View><View style={styles.libraryCopy}><Text style={styles.libraryKicker}>YOUR PLUGGD</Text><Text style={styles.libraryTitle}>Return to your Library</Text><Text style={styles.libraryMeta}>Saved music, owned releases, tickets and finds in one place.</Text></View><MaterialIcons name="arrow-forward" size={22} color={INK} /></Pressable>
          </>
        ) : null}

        {movingNow.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionEyebrow}>COMMUNITY</Text><Text style={styles.sectionTitle}>What's moving</Text></View>
              <Pressable accessibilityRole="button" onPress={() => navigate('/community')}><Text style={styles.seeAll}>Open community</Text></Pressable>
            </View>
            {movingNow.map((line, index) => (
              <View key={`moving-${index}`} style={styles.movingRow}>
                <View style={styles.movingDot} />
                <Text style={styles.movingText} numberOfLines={2}>{line}</Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.contextGrid}>
          <Pressable accessibilityRole="button" onPress={() => navigate('/live')} style={styles.contextCard}><Text style={styles.contextKicker}>LIVE</Text><MaterialIcons name="sensors" size={27} color={ORANGE} /><Text style={styles.contextTitle}>Enter the room</Text><Text style={styles.contextMeta}>Broadcasts, parties and replays</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open BeatPlug" onPress={() => navigate('/market/beats')} style={styles.contextCard}><Text style={styles.contextKicker}>BEATPLUG</Text><MaterialIcons name="headphones" size={27} color={ORANGE} /><Text style={styles.contextTitle}>Find your next beat</Text><Text style={styles.contextMeta}>Hear real previews from PLUGGD producers</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Browse Opportunities" onPress={() => navigate('/opportunities')} style={styles.contextFeature}>
            <PluggdImage uri="" fallbackSource={OPPORTUNITIES_ARTWORK} style={styles.fill} resizeMode="cover" />
            <LinearGradient colors={['rgba(6,5,4,0.18)', 'rgba(6,5,4,0.94)']} locations={[0.05, 1]} style={StyleSheet.absoluteFillObject} />
            <View style={styles.contextFeatureCopy}><Text style={styles.contextKicker}>OPPORTUNITIES</Text><Text style={styles.contextFeatureTitle}>Find your next opportunity</Text><Text style={styles.contextFeatureMeta}>Funding, festivals, showcases and programmes for creators</Text></View>
            <MaterialIcons name="north-east" size={22} color={INK} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function WorldGateway({ world, onPress }: { world: { title: string; meta: string; image: string | null; fallbackSource?: ImageSourcePropType; icon: keyof typeof MaterialIcons.glyphMap; index: string; wide?: boolean }; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${world.title}`} onPress={onPress} style={[styles.worldLink, world.wide && styles.worldLinkWide]}>
      {world.image || world.fallbackSource ? <PluggdImage uri={world.image || ''} fallbackSource={world.fallbackSource} style={styles.worldImage} displayWidth={520} /> : <View style={[styles.worldImage, styles.worldFallback]}><MaterialIcons name={world.icon} size={30} color={ORANGE} /></View>}
      <LinearGradient colors={['rgba(6,5,4,0.08)', 'rgba(6,5,4,0.92)']} locations={[0.05, 1]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.worldTop}><Text style={styles.worldIndex}>{world.index}</Text><MaterialIcons name="north-east" size={17} color={INK} /></View>
      <View style={styles.worldCopy}><Text style={styles.worldLinkTitle}>{world.title}</Text><Text style={styles.worldLinkMeta}>{world.meta}</Text></View>
    </Pressable>
  );
}

function SignalTile({ item, variant, onOpen, onPlay }: { item: DiscoveryItem; variant: 'lead' | 'small'; onOpen: () => void; onPlay: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title} by ${item.creator}. ${publicDiscoveryReason(item.discoveryReason)}`} onPress={onOpen} style={variant === 'lead' ? styles.leadTile : styles.smallTile}>
    {item.artwork ? <PluggdImage uri={item.artwork} style={styles.fill} displayWidth={720} /> : <View style={[styles.fill, styles.fallback]}><MaterialIcons name="graphic-eq" size={34} color={ORANGE} /></View>}
    <View style={styles.tileShade} /><Pressable accessibilityRole="button" accessibilityLabel={item.isPlayable ? `Play ${item.title}` : `Open ${item.title}`} onPress={(event) => { event.stopPropagation(); onPlay(); }} style={variant === 'lead' ? styles.tilePlayLead : styles.tilePlaySmall}><MaterialIcons name={item.isPlayable ? 'play-arrow' : 'north-east'} size={variant === 'lead' ? 24 : 18} color="#100B07" /></Pressable>
    <View style={styles.tileCopy}><Text style={styles.tileKind}>{item.kind.toUpperCase()} · {item.genre || item.city || 'INDEPENDENT'}</Text><Text style={variant === 'lead' ? styles.leadTitle : styles.smallTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.tileCreator} numberOfLines={1}>{item.creator}</Text></View>
  </Pressable>;
}

function DiscoveryRailCard({ item, onOpen, onPlay }: { item: DiscoveryItem; onOpen: () => void; onPlay: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title} by ${item.creator}`} onPress={onOpen} style={styles.discoveryRailCard}>
      {item.artwork ? <PluggdImage uri={item.artwork} style={styles.discoveryRailArt} displayWidth={360} /> : <View style={[styles.discoveryRailArt, styles.fallback]} />}
      <Pressable accessibilityRole="button" accessibilityLabel={item.isPlayable ? `Play ${item.title}` : `Open ${item.title}`} onPress={(event) => { event.stopPropagation(); onPlay(); }} style={styles.discoveryRailAction}>
        <MaterialIcons name={item.isPlayable ? 'play-arrow' : 'north-east'} size={18} color="#100B07" />
      </Pressable>
      <Text style={styles.radarTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.radarMeta} numberOfLines={1}>{item.creator} · {item.kind}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' }, content: { paddingHorizontal: 20, paddingBottom: 184 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 5 }, headingCopy: { flex: 1 },
  kicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.7 }, title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 32, lineHeight: 36, letterSpacing: -1.1, marginTop: 3 },
  subtitle: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19, maxWidth: 310, marginTop: 6 },
  signalMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#5B3B25', backgroundColor: '#18120E', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  signalMarkPressed: { transform: [{ scale: 0.96 }], opacity: 0.88 },
  signalLiveDot: { position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4757', borderWidth: 1, borderColor: '#0A0908' },
  search: { minHeight: 48, marginTop: 18, borderWidth: 1, borderColor: '#39332C', borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchText: { flex: 1, color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#4A443C' },
  liveDotOn: { backgroundColor: ORANGE },
  emptyRow: { borderWidth: 1, borderColor: '#29251F', borderRadius: 6, padding: 16, gap: 6 },
  liveEmptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 14 },
  emptyCopy: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 12.5, lineHeight: 18 },
  emptyActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  emptyPrimary: { minHeight: 38, paddingHorizontal: 16, borderRadius: 999, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  emptyPrimaryText: { color: '#0A0908', fontFamily: 'Satoshi-Bold', fontSize: 12.5 },
  emptySecondary: { minHeight: 38, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: '#39332C', alignItems: 'center', justifyContent: 'center' },
  emptySecondaryText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5 },
  nearCard: { width: 176, gap: 5 },
  nearArt: { width: 176, height: 108, borderRadius: 6, backgroundColor: '#17130F' },
  nearDate: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.2, marginTop: 3 },
  creatorCard: { width: 104, gap: 5 },
  creatorArt: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#17130F' },
  creatorName: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5, marginTop: 3 },
  storeRail: { gap: 10, paddingRight: 20 },
  storeCard: { width: 146, minHeight: 226, borderRadius: 6, borderWidth: 1, borderColor: '#302A24', backgroundColor: '#151311', paddingBottom: 10, overflow: 'hidden' },
  storeArt: { width: '100%', height: 146, backgroundColor: '#211C17' },
  storeType: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7, letterSpacing: 0.9, marginTop: 9, marginHorizontal: 9 },
  storeTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 12.5, lineHeight: 16, marginTop: 3, marginHorizontal: 9 },
  storePrice: { color: '#D9D1C7', fontFamily: 'Satoshi-Bold', fontSize: 10.5, marginTop: 5, marginHorizontal: 9 },
  libraryGateway: { minHeight: 108, marginTop: 12, borderRadius: 7, borderWidth: 1, borderColor: '#352E28', backgroundColor: '#161310', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  libraryIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,102,0,0.11)', alignItems: 'center', justifyContent: 'center' },
  libraryCopy: { flex: 1 },
  libraryKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 1.1 },
  libraryTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 16, marginTop: 3 },
  libraryMeta: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  movingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#29251F' },
  movingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 6 },
  movingText: { flex: 1, color: INK, fontFamily: 'Satoshi-Medium', fontSize: 13, lineHeight: 19 },
  filters: { gap: 8, paddingVertical: 14 }, filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#181512' }, filterActive: { backgroundColor: ORANGE }, filterText: { color: '#CBC4B9', fontFamily: 'Satoshi-Bold', fontSize: 12 }, filterTextActive: { color: '#110B07' },
  worldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  // Start below half width so two cards plus the 8dp gap can wrap together on
  // 360dp Android phones. Flex growth then closes the small remaining space,
  // while maxWidth keeps an unpaired card from stretching full width.
  worldLink: { flexBasis: '47.5%', flexGrow: 1, maxWidth: '48.8%', height: 112, borderRadius: 5, overflow: 'hidden', justifyContent: 'space-between', padding: 10, backgroundColor: '#151310' },
  worldLinkWide: { flexBasis: '100%', maxWidth: '100%', height: 94 },
  worldImage: { ...StyleSheet.absoluteFillObject },
  worldFallback: { backgroundColor: '#211C17', alignItems: 'center', justifyContent: 'center' },
  worldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  worldIndex: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 8.5, letterSpacing: 1 },
  worldCopy: { zIndex: 2 },
  worldLinkTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15.5, letterSpacing: -0.3 },
  worldLinkMeta: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 2 },
  loader: { minHeight: 220 }, empty: { minHeight: 190, justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F' }, emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 18 }, emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, marginTop: 6 },
  sectionHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 }, sectionEyebrow: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.3, marginBottom: 3 }, sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, letterSpacing: -0.35 }, liveCount: { color: MUTED, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1 }, seeAll: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 11 },
  mosaic: { height: 238, flexDirection: 'row', gap: 8 }, leadTile: { flex: 1.72, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', padding: 13 }, mosaicStack: { flex: 1, gap: 8 }, smallTile: { flex: 1, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', padding: 9 },
  fill: { ...StyleSheet.absoluteFillObject }, fallback: { backgroundColor: '#211C17', alignItems: 'center', justifyContent: 'center' }, tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.36)' },
  tileCopy: { zIndex: 2 }, tileKind: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 7.5, letterSpacing: 0.8, marginBottom: 3 }, leadTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 20, lineHeight: 23 }, smallTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 11.5, lineHeight: 14 }, tileCreator: { color: '#E0D8CD', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  tilePlayLead: { position: 'absolute', right: 12, top: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', zIndex: 3 }, tilePlaySmall: { position: 'absolute', right: 7, top: 7, width: 29, height: 29, borderRadius: 15, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  whyRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#29251F' }, whyLine: { width: 24, height: 2, backgroundColor: ORANGE }, whyText: { flex: 1, color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10, lineHeight: 14 },
  discoveryRail: { gap: 10, paddingTop: 12, paddingRight: 20 },
  discoveryRailCard: { width: 142, position: 'relative' },
  discoveryRailArt: { width: 142, height: 112, borderRadius: 5, backgroundColor: '#211C17' },
  discoveryRailAction: { position: 'absolute', right: 7, top: 72, width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  opportunityFeature: { minHeight: 92, borderRadius: 7, borderWidth: 1, borderColor: '#4B2B1D', backgroundColor: '#1A100C', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  opportunityMetric: { flex: 1 },
  opportunityMetricValue: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 22 },
  opportunityMetricLabel: { color: MUTED, fontFamily: 'Satoshi-Black', fontSize: 7, letterSpacing: 0.8, marginTop: 3 },
  opportunityMetricAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  opportunityRail: { gap: 10, paddingTop: 11, paddingRight: 20 },
  opportunityCard: { width: 194, height: 196, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  opportunityArt: { ...StyleSheet.absoluteFillObject },
  opportunityCopy: { zIndex: 2, padding: 12 },
  opportunityType: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 1 },
  opportunityTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15, lineHeight: 19, marginTop: 5 },
  opportunityMeta: { color: '#D9D0C6', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 4 },
  sceneRail: { gap: 10, paddingRight: 20, alignItems: 'flex-start' }, sceneCard: { width: 166, height: 138, borderRadius: 6, overflow: 'hidden', justifyContent: 'space-between', padding: 11 }, sceneCardTall: { height: 166 }, sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,3,2,0.43)' }, sceneNumber: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 }, sceneLabel: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17 }, sceneDetail: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  radarRail: { gap: 10, paddingRight: 20 }, radarCard: { width: 148, position: 'relative', marginBottom: 6 }, radarArt: { width: 148, height: 148, borderRadius: 5, backgroundColor: '#211C17' }, radarPlay: { position: 'absolute', right: 8, top: 108, width: 34, height: 34, borderRadius: 17, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }, radarTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5, marginTop: 7 }, radarMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 2, textTransform: 'capitalize' },
  chartRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: '#29251F' }, chartOpen: { flex: 1, minWidth: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10 }, chartRank: { width: 20, color: '#756E64', fontFamily: 'Satoshi-Bold', fontSize: 9 }, chartArt: { width: 48, height: 48, borderRadius: 3, backgroundColor: '#211C17' }, chartCopy: { flex: 1, minWidth: 0 }, chartTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5 }, chartMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 26 }, contextCard: { flexBasis: '47.5%', flexGrow: 1, minHeight: 148, backgroundColor: '#171411', borderRadius: 6, padding: 14, justifyContent: 'space-between' }, contextKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1.3 }, contextTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15, lineHeight: 18 }, contextMeta: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10 },
  contextFeature: { flexBasis: '100%', minHeight: 176, borderRadius: 6, overflow: 'hidden', padding: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  contextFeatureCopy: { flex: 1, zIndex: 2, paddingRight: 20 },
  contextFeatureTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 22, lineHeight: 25, marginTop: 5 },
  contextFeatureMeta: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 11, lineHeight: 16, marginTop: 5 },
});
