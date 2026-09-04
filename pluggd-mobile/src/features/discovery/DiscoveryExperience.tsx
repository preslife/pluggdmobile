import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { supabase } from '../../lib/supabase';
import type { EventItem, ProfileItem } from '../../lib/mobileContent';
import { loadMobileSocialFeed } from '../culture/mobileSocial';
import { safeList } from '../culture/mobileServices';
import type { MobileSocialPost } from '../culture/mobileTypes';
import { useHomeFeed, useLiveRooms, usePublicActiveEvents } from '../culture/useCultureData';
import { NativeSoundboardCanvas } from '../soundboards/NativeSoundboardCanvas';
import type { NativeSoundboardItem } from '../soundboards/nativeSoundboardLayout';
import {
  buildDiscoveryItems,
  buildDiscoveryScenes,
  buildRankedDiscoveryItems,
  discoveryItemMatchesScene,
  isPlayableDiscoveryItem,
  normalizeSceneValue,
  type DiscoveryItem,
} from './discoveryModel';
import { EMPTY_DISCOVERY_TASTE, loadDiscoveryTasteProfile, rankDiscoveryForYou } from './discoveryTaste';
import { DiscoveryHeader } from './DiscoveryHeader';
import { CARNIVAL_HUB_DESTINATION, DISCOVERY_DESTINATION_ART, PUBLIC_DESTINATIONS } from './publicDestinations';
import { loadPublicDiscoveryFeatures } from './publicDiscoveryFeatures';
import {
  loadCuratedPublicItems,
  loadCuratedTickerItems,
  type CuratedPublicItem,
} from './siteCuration';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
const FILTERS = ['For you', 'Scenes', 'Genres', 'Cities', 'Charts'] as const;
const CARNIVAL_2026_FALLBACK_EXPIRES_AT = new Date('2026-09-03T00:00:00+01:00').getTime();

type DiscoveryFeature = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  route: string;
  imageUrl: string | null;
  fallbackSource?: ImageSourcePropType;
};

type DirectoryEntry = {
  label: string;
  detail: string;
  image: string | null;
  route: string;
  kind: 'city' | 'genre';
  canonicalValue: string;
};

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

function uniqueDiscoveryItems(items: DiscoveryItem[]) {
  const unique = new Map<string, DiscoveryItem>();
  items.forEach((item) => {
    if (!unique.has(item.id)) unique.set(item.id, item);
  });
  return [...unique.values()];
}

function directoryEntries(items: DiscoveryItem[], kind: 'city' | 'genre'): DirectoryEntry[] {
  const grouped = new Map<string, { label: string; items: DiscoveryItem[] }>();
  items.forEach((item) => {
    const raw = kind === 'city' ? item.city : item.genre;
    const label = raw?.split(',')[0]?.trim();
    const key = normalizeSceneValue(label || '');
    if (!label || !key) return;
    const current = grouped.get(key);
    if (current) current.items.push(item);
    else grouped.set(key, { label, items: [item] });
  });
  return [...grouped.entries()]
    .sort((a, b) => b[1].items.length - a[1].items.length || a[1].label.localeCompare(b[1].label))
    .map(([canonicalValue, group]) => ({
      label: group.label,
      detail: `${group.items.length} ${group.items.length === 1 ? 'item' : 'items'} · ${kind === 'city' ? 'City' : 'Genre'}`,
      image: group.items.find((item) => item.artwork)?.artwork || null,
      route: `/discover?scene=${encodeURIComponent(group.label)}&sceneValue=${encodeURIComponent(canonicalValue)}&sceneKind=${kind}`,
      kind,
      canonicalValue,
    }));
}

function featureFromCuration(item: CuratedPublicItem, eyebrow: string): DiscoveryFeature {
  return {
    id: item.curationId,
    eyebrow,
    title: item.title,
    subtitle: item.subtitle || item.ctaLabel || 'Open the feature',
    route: item.route,
    imageUrl: item.imageUrl,
  };
}

function postAuthor(post: MobileSocialPost) {
  return post.display_name || (post.username ? `@${post.username}` : 'Community member');
}

function itemCredit(item: DiscoveryItem) {
  return item.creator.trim() ? ` by ${item.creator.trim()}` : '';
}

function itemMeta(item: DiscoveryItem, suffix: string) {
  return [item.creator.trim(), suffix].filter(Boolean).join(' · ');
}

export function DiscoveryExperience() {
  const styles = useDiscoveryStyles();
  const theme = usePluggdTheme();
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const bottomInset = useBottomChromeInset();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ scene?: string; sceneValue?: string; sceneKind?: 'city' | 'genre' }>();
  const selectedScene = typeof params.scene === 'string' ? decodeURIComponent(params.scene).trim() : '';
  const selectedSceneValue = typeof params.sceneValue === 'string'
    ? decodeURIComponent(params.sceneValue).trim()
    : selectedScene;
  const selectedSceneKind = params.sceneKind === 'city' ? 'city' : 'genre';
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(selectedScene ? 'Scenes' : 'For you');
  const feed = useHomeFeed();
  const live = useLiveRooms();
  const publicEvents = usePublicActiveEvents();
  const { playQueue } = usePlayback();

  useEffect(() => {
    if (selectedScene) setFilter('Scenes');
  }, [selectedScene]);

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
  const forYouCuration = useQuery({
    queryKey: ['site-curation', 'discover_for_you'],
    queryFn: () => loadCuratedPublicItems('discover_for_you', 24),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const seasonalCuration = useQuery({
    queryKey: ['site-curation', 'seasonal_spotlight'],
    queryFn: () => loadCuratedPublicItems('seasonal_spotlight', 6),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const tickerCuration = useQuery({
    queryKey: ['site-curation', 'discover-ticker'],
    queryFn: () => loadCuratedTickerItems(12),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const featuredEventCuration = useQuery({
    queryKey: ['site-curation', 'featured_event'],
    queryFn: () => loadCuratedPublicItems('featured_event', 60),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
  const tasteQuery = useQuery({
    queryKey: ['discovery', 'taste', user?.id || 'signed-out'],
    enabled: Boolean(user?.id),
    queryFn: () => loadDiscoveryTasteProfile(user!.id),
    staleTime: 1000 * 60 * 3,
    retry: 1,
  });
  const communityPulse = useQuery({
    queryKey: ['discovery', 'community-pulse'],
    queryFn: () => loadMobileSocialFeed({ mode: 'trending', limit: 6 }),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const navigate = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };
  const chooseFilter = (next: (typeof FILTERS)[number]) => {
    if (next !== filter) selectionHaptic();
    setFilter(next);
  };

  const organicItems = useMemo(() => buildDiscoveryItems(feed.data), [feed.data]);
  const curatedOpeningItems = useMemo(
    () => heroRotation.data?.flatMap((item) => item.discoveryItem ? [item.discoveryItem] : []) ?? [],
    [heroRotation.data],
  );
  const curatedForYouItems = useMemo(
    () => forYouCuration.data?.flatMap((item) => item.discoveryItem ? [item.discoveryItem] : []) ?? [],
    [forYouCuration.data],
  );
  const openingItems = useMemo(
    () => uniqueDiscoveryItems(curatedOpeningItems.length ? curatedOpeningItems : organicItems),
    [curatedOpeningItems, organicItems],
  );
  const allItems = useMemo(
    () => uniqueDiscoveryItems([...organicItems, ...curatedOpeningItems, ...curatedForYouItems]),
    [curatedForYouItems, curatedOpeningItems, organicItems],
  );
  const playableItems = useMemo(() => allItems.filter(isPlayableDiscoveryItem), [allItems]);
  const chartItems = useMemo(() => buildRankedDiscoveryItems(playableItems, 10), [playableItems]);
  const scenes = useMemo(() => {
    const grouped = new Map<string, ReturnType<typeof buildDiscoveryScenes>[number]>();
    for (const scene of buildDiscoveryScenes(feed.data)) {
      const label = scene.label.split(',')[0]?.trim() || scene.label.trim();
      const key = normalizedIdentity(label);
      if (!key || grouped.has(key)) continue;
      grouped.set(key, {
        ...scene,
        label,
        route: `/discover?scene=${encodeURIComponent(label)}&sceneValue=${encodeURIComponent(scene.canonicalValue)}&sceneKind=${scene.kind}`,
      });
    }
    return [...grouped.values()];
  }, [feed.data]);
  const genreDirectory = useMemo(() => directoryEntries(allItems, 'genre'), [allItems]);
  const cityDirectory = useMemo(() => directoryEntries(allItems, 'city'), [allItems]);
  const selectedSceneItems = useMemo(() => {
    if (!selectedScene) return [];
    return allItems.filter((item) => discoveryItemMatchesScene(item, {
      kind: selectedSceneKind,
      canonicalValue: normalizeSceneValue(selectedSceneValue),
    }));
  }, [allItems, selectedScene, selectedSceneKind, selectedSceneValue]);

  const rankedForYou = useMemo(() => rankDiscoveryForYou({
    items: organicItems,
    curated: curatedForYouItems,
    editorialFallback: organicItems,
    taste: tasteQuery.data ?? EMPTY_DISCOVERY_TASTE,
    limit: 16,
  }), [curatedForYouItems, organicItems, tasteQuery.data]);
  const moreForYouItems = useMemo(() => {
    const openingDisplayed = new Set(openingItems.slice(0, 8).map((item) => item.id));
    return rankedForYou.filter((item) => !openingDisplayed.has(item.id)).slice(0, 8);
  }, [openingItems, rankedForYou]);
  const newItems = useMemo(() => allItems.slice().sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime || a.id.localeCompare(b.id);
  }).slice(0, 8), [allItems]);
  const racks = useMemo(() => allItems
    .filter((item) => item.kind === 'release')
    .slice()
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime || a.id.localeCompare(b.id);
    })
    .slice(0, 6), [allItems]);

  const liveRoom = live.data?.find((room) => room.status === 'live') ?? null;
  const liveRooms = useMemo(
    () => (live.data ?? []).filter((room) => room.status === 'live').slice(0, 4),
    [live.data],
  );
  const nearYou = useMemo(() => {
    const bySeries = new Map<string, { event: EventItem; upcoming: number }>();
    const curatedEvents = featuredEventCuration.data?.flatMap((item) => item.event ? [item.event] : []) ?? [];
    const eventById = new Map<string, EventItem>();
    [...curatedEvents, ...(publicEvents.data ?? []), ...(feed.data?.events ?? [])].forEach((event) => {
      if (!eventById.has(event.id)) eventById.set(event.id, event);
    });
    const dated = [...eventById.values()]
      .filter((event) => Boolean(event.location))
      .sort((a, b) => new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime());
    for (const event of dated) {
      const key = `${(event.title || '').trim().toLowerCase()}|${(event.location || '').trim().toLowerCase()}`;
      const existing = bySeries.get(key);
      if (existing) existing.upcoming += 1;
      else bySeries.set(key, { event, upcoming: 1 });
    }
    return [...bySeries.values()].slice(0, 6);
  }, [featuredEventCuration.data, feed.data?.events, publicEvents.data]);

  const movingFeature = useMemo<DiscoveryFeature | null>(() => {
    const curated = movingCuration.data?.[0];
    if (curated) return featureFromCuration(curated, "WHAT'S MOVING NOW");
    if (liveRoom) {
      return {
        id: `live-${liveRoom.id}`,
        eyebrow: "WHAT'S MOVING NOW · LIVE",
        title: liveRoom.title || 'PLUGGD Live',
        subtitle: `${liveRoom.creator_name || 'PLUGGD creator'} · ${liveRoom.viewer_count || 0} listening now`,
        route: `/live/session?roomId=${encodeURIComponent(liveRoom.id)}`,
        imageUrl: liveRoom.thumbnail_url || liveRoom.creator_avatar_url || null,
        fallbackSource: DISCOVERY_DESTINATION_ART.live,
      };
    }
    const event = nearYou[0]?.event;
    if (event) {
      return {
        id: `event-${event.id}`,
        eyebrow: "WHAT'S MOVING NOW · NEXT UP",
        title: event.title || 'Upcoming event',
        subtitle: `${formatEventDate(event.starts_at)} · ${event.location || 'Location TBA'}`,
        route: `/events/${event.id}`,
        imageUrl: event.cover_image_url || null,
        fallbackSource: DISCOVERY_DESTINATION_ART.events,
      };
    }
    const item = openingItems[0];
    return item ? {
      id: item.id,
      eyebrow: "WHAT'S MOVING NOW",
      title: item.title,
      subtitle: itemMeta(item, publicDiscoveryReason(item.discoveryReason)),
      route: item.destinationRoute,
      imageUrl: item.artwork,
    } : null;
  }, [liveRoom, movingCuration.data, nearYou, openingItems]);

  const seasonalFeature = useMemo<DiscoveryFeature | null>(() => {
    const curated = seasonalCuration.data?.[0];
    if (curated) return featureFromCuration(curated, 'SEASONAL SPOTLIGHT');
    if (Date.now() >= CARNIVAL_2026_FALLBACK_EXPIRES_AT) return null;
    return {
      id: CARNIVAL_HUB_DESTINATION.id,
      eyebrow: 'CARNIVAL 2026',
      title: CARNIVAL_HUB_DESTINATION.title,
      subtitle: CARNIVAL_HUB_DESTINATION.defaultMeta,
      route: CARNIVAL_HUB_DESTINATION.route,
      imageUrl: CARNIVAL_HUB_DESTINATION.imageUrl,
    };
  }, [seasonalCuration.data]);

  const tickerItems = useMemo(() => {
    const organic = [
      movingFeature ? { id: movingFeature.id, label: movingFeature.title, route: movingFeature.route } : null,
      liveRoom ? { id: `ticker-live-${liveRoom.id}`, label: `${liveRoom.title || 'PLUGGD Live'} is live`, route: `/live/session?roomId=${encodeURIComponent(liveRoom.id)}` } : null,
      nearYou[0]?.event ? { id: `ticker-event-${nearYou[0].event.id}`, label: `${nearYou[0].event.title || 'Event'} · ${formatEventDate(nearYou[0].event.starts_at)}`, route: `/events/${nearYou[0].event.id}` } : null,
      newItems[0] ? { id: `ticker-new-${newItems[0].id}`, label: `${newItems[0].title} · new on PLUGGD`, route: newItems[0].destinationRoute } : null,
    ].filter(Boolean) as Array<{ id: string; label: string; route: string }>;
    const unique = new Map<string, { id: string; label: string; route: string }>();
    [...(tickerCuration.data ?? []), ...organic].forEach((item) => {
      if (!unique.has(item.route)) unique.set(item.route, item);
    });
    return [...unique.values()].slice(0, 6);
  }, [liveRoom, movingFeature, nearYou, newItems, tickerCuration.data]);

  const creditedCreatorNames = useMemo(() => Array.from(new Set(
    allItems
      .filter((item) => item.kind === 'release' || item.kind === 'beat')
      .map((item) => item.creator.trim())
      .filter((name) => Boolean(name) && !/^pluggd (creator|producer)$/i.test(name)),
  )).slice(0, 40), [allItems]);
  const creditedCreatorIds = useMemo(() => Array.from(new Set(
    allItems
      .filter((item) => item.kind === 'release' || item.kind === 'beat')
      .map((item) => item.creatorId?.trim())
      .filter((id): id is string => Boolean(id)),
  )).slice(0, 40), [allItems]);
  const actualProfiles = useQuery({
    queryKey: ['discover', 'credited-creators', creditedCreatorIds.join('|'), creditedCreatorNames.join('|')],
    enabled: creditedCreatorIds.length > 0 || creditedCreatorNames.length > 0,
    queryFn: async () => {
      const columns = ['full_name', 'username'] as const;
      const lookups: Array<Promise<ProfileItem[]>> = [];
      if (creditedCreatorIds.length) {
        lookups.push(
          safeList<ProfileItem>((supabase as any).from('public_profiles').select('*').in('user_id', creditedCreatorIds).limit(40)),
          safeList<ProfileItem>((supabase as any).from('public_profiles').select('*').in('id', creditedCreatorIds).limit(40)),
        );
      }
      if (creditedCreatorNames.length) {
        columns.forEach((column) => {
          lookups.push(safeList<ProfileItem>(
            (supabase as any)
              .from('public_profiles')
              .select('*')
              .in(column, creditedCreatorNames)
              .limit(40),
          ));
        });
      }
      const batches = await Promise.all(lookups);
      const profiles = new Map<string, ProfileItem>();
      batches.flat().forEach((profile) => {
        const key = profile.user_id || profile.id || profile.username;
        if (key) profiles.set(key, profile);
      });
      return [...profiles.values()];
    },
    staleTime: 1000 * 60 * 5,
  });
  const creators = useMemo(() => {
    const profilesById = new Map<string, ProfileItem>();
    const profilesByName = new Map<string, ProfileItem>();
    (actualProfiles.data ?? []).forEach((profile) => {
      [profile.user_id, profile.id].forEach((value) => {
        if (value) profilesById.set(value, profile);
      });
      [profile.display_name, profile.full_name, profile.username].forEach((value) => {
        const key = normalizedIdentity(value);
        if (key) profilesByName.set(key, profile);
      });
    });
    const seen = new Map<string, { name: string; artwork: string | null; meta: string; route: string }>();
    allItems.forEach((item) => {
      if (item.kind !== 'release' && item.kind !== 'beat') return;
      const profile = (item.creatorId ? profilesById.get(item.creatorId) : null)
        || profilesByName.get(normalizedIdentity(item.creator));
      const route = profile ? profileRoute(profile) : null;
      const key = profile?.user_id || profile?.id || normalizedIdentity(item.creator);
      if (!profile || !route || !key || seen.has(key)) return;
      seen.set(key, {
        name: profile.display_name || profile.full_name || profile.username || item.creator,
        artwork: profile.avatar_url || item.artwork,
        meta: profile.primary_genre || profile.city || item.genre || 'Independent creator',
        route,
      });
    });
    return [...seen.values()].slice(0, 8);
  }, [actualProfiles.data, allItems]);

  const soundboards = useMemo(() => (feed.data?.soundboards ?? []).slice(0, 3), [feed.data?.soundboards]);
  const soundboardIds = useMemo(() => soundboards.map((board) => board.id), [soundboards]);
  const soundboardItems = useQuery({
    queryKey: ['discover', 'soundboard-preview-items', soundboardIds.join(':')],
    enabled: soundboardIds.length > 0,
    queryFn: () => safeList<NativeSoundboardItem>(
      (supabase as any)
        .from('soundboard_items')
        .select('*')
        .in('soundboard_id', soundboardIds)
        .order('is_pinned', { ascending: false })
        .order('position', { ascending: true })
        .limit(Math.max(24, soundboardIds.length * 9)),
    ),
    staleTime: 1000 * 60 * 2,
  });
  const soundboardItemsByBoard = useMemo(() => (soundboardItems.data ?? []).reduce<Record<string, NativeSoundboardItem[]>>((groups, item) => {
    groups[item.soundboard_id] = [...(groups[item.soundboard_id] || []), item];
    return groups;
  }, {}), [soundboardItems.data]);
  const soundboardCardWidth = Math.min(292, Math.max(246, viewportWidth - 76));

  const worlds = useMemo(() => PUBLIC_DESTINATIONS.map((destination) => {
    let meta = destination.defaultMeta;
    if (destination.id === 'mixes') meta = `${feed.data?.mixes.length || 0} selector worlds`;
    if (destination.id === 'soundboards') meta = `${feed.data?.soundboards.length || 0} ideas in progress`;
    if (destination.id === 'releases') meta = `${feed.data?.releases.length || 0} fresh pressings`;
    if (destination.id === 'live' && liveRooms.length) meta = `${liveRooms.length} ${liveRooms.length === 1 ? 'room' : 'rooms'} live now`;
    if (destination.id === 'beatplug') meta = `${feed.data?.beats.length || 0} beats ready to hear`;
    if (destination.id === 'events') meta = `${publicEvents.data?.length ?? feed.data?.events.length ?? 0} live and upcoming events`;
    return { ...destination, meta, icon: destination.icon as keyof typeof MaterialIcons.glyphMap };
  }), [feed.data, liveRooms.length, publicEvents.data?.length]);

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

  const directory = filter === 'Genres' ? genreDirectory : filter === 'Cities' ? cityDirectory : scenes;

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.kicker}>FOLLOW THE CULTURE</Text>
            <Text style={styles.title}>Discover</Text>
            <Text style={styles.subtitle}>Find the next sound through scenes, cities and independent tastemakers.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open PLUGGD Live" onPress={() => navigate('/live')} style={({ pressed }) => [styles.signalMark, pressed && styles.signalMarkPressed]}>
            {liveRooms.length ? <View style={styles.signalLiveDot} /> : null}
            <MaterialIcons name="graphic-eq" size={24} color={theme.colors.accentText} />
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Search music and scenes" onPress={() => navigate('/search')} style={styles.search}>
          <MaterialIcons name="search" size={21} color={theme.colors.textMuted} />
          <Text style={styles.searchText}>Artists, tracks, scenes, cities</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === item }} key={item} onPress={() => chooseFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {filter !== 'For you' ? (
          <DiscoveryModeView
            filter={filter}
            directory={directory}
            selectedScene={selectedScene}
            selectedItems={selectedSceneItems}
            chartItems={chartItems}
            onNavigate={navigate}
            onOpen={open}
            onPlay={(item) => { void play(item); }}
          />
        ) : (
          <>
            {tickerItems.length ? (
              <View style={styles.tickerShell}>
                <View style={styles.tickerIcon}><MaterialIcons name="bolt" size={18} color={theme.colors.onAccent} /></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tickerRail}>
                  {tickerItems.map((item) => (
                    <Pressable accessibilityRole="link" accessibilityLabel={`Open ${item.label}`} key={item.id} onPress={() => navigate(item.route)} style={styles.tickerChip}>
                      <Text style={styles.tickerChipText} numberOfLines={1}>{item.label}</Text>
                      <MaterialIcons name="north-east" size={15} color={theme.colors.accentText} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {seasonalFeature ? <FeatureSpotlight feature={seasonalFeature} onPress={() => navigate(seasonalFeature.route)} /> : null}

            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionEyebrow}>EXPLORE PLUGGD</Text><Text style={styles.sectionTitle}>Every way into the culture</Text></View>
            </View>
            <View style={styles.worldsGrid}>
              {worlds.map((world) => <WorldGateway key={world.id} world={world} onPress={() => navigate(world.route)} />)}
            </View>

            {movingFeature ? <FeatureSpotlight feature={movingFeature} onPress={() => navigate(movingFeature.route)} /> : null}

            {feed.isLoading && !openingItems.length ? <ActivityIndicator color={theme.colors.accentText} style={styles.loader} /> : null}
            {feed.isError && !openingItems.length ? (
              <View style={styles.emptyRow}>
                <Text style={styles.liveEmptyTitle}>Discovery did not load.</Text>
                <Text style={styles.emptyCopy}>Your destinations still work. Retry the live catalogue when your connection is ready.</Text>
                <Pressable accessibilityRole="button" onPress={() => { void feed.refetch(); }} style={styles.emptyPrimary}><Text style={styles.emptyPrimaryText}>Try again</Text></Pressable>
              </View>
            ) : null}

            {openingItems.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>START SOMEWHERE UNEXPECTED</Text><Text style={styles.sectionTitle}>An opening, not an algorithm</Text></View>
                  <Text style={styles.liveCount}>{openingItems.length} PICKS</Text>
                </View>
                <View style={styles.mosaic}>
                  <SignalTile item={openingItems[0]} variant="lead" onOpen={() => open(openingItems[0])} onPlay={() => { void play(openingItems[0]); }} />
                  <View style={styles.mosaicStack}>
                    {openingItems.slice(1, 3).map((item) => <SignalTile key={item.id} item={item} variant="small" onOpen={() => open(item)} onPlay={() => { void play(item); }} />)}
                  </View>
                </View>
                <View style={styles.whyRow}><View style={styles.whyLine} /><Text style={styles.whyText}>{publicDiscoveryReason(openingItems[0]?.discoveryReason)}. The full opening is controlled through the PLUGGD Discover desk.</Text></View>
                {openingItems.length > 3 ? (
                  <>
                    <Text style={styles.openingRailLabel}>MORE FROM THIS OPENING</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRail}>
                      {openingItems.slice(3, 8).map((item) => <DiscoveryRailCard key={`opening-${item.id}`} item={item} onOpen={() => open(item)} onPlay={() => { void play(item); }} />)}
                    </ScrollView>
                  </>
                ) : null}
              </>
            ) : null}

            {moreForYouItems.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>MORE FOR YOU</Text><Text style={styles.sectionTitle}>{tasteQuery.data?.hasSignal ? 'Following your listening' : 'Selected beyond the opening'}</Text></View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRail}>
                  {moreForYouItems.map((item) => <DiscoveryRailCard key={`for-you-${item.id}`} item={item} onOpen={() => open(item)} onPlay={() => { void play(item); }} />)}
                </ScrollView>
              </>
            ) : null}

            {publicFeatures.data?.opportunities.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>OPPORTUNITIES</Text><Text style={styles.sectionTitle}>Open doors for your next move</Text></View>
                  <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => navigate('/opportunities')}><Text style={styles.seeAll}>View all</Text></Pressable>
                </View>
                <View style={styles.opportunityFeature}>
                  <View style={styles.opportunityMetric}><Text style={styles.opportunityMetricValue}>{publicFeatures.data.opportunities.length}</Text><Text style={styles.opportunityMetricLabel}>VERIFIED OPENINGS</Text></View>
                  <View style={styles.opportunityMetric}><Text style={styles.opportunityMetricValue}>{publicFeatures.data.totalListedFundingGBP > 0 ? `£${Math.round(publicFeatures.data.totalListedFundingGBP).toLocaleString('en-GB')}` : 'LIVE'}</Text><Text style={styles.opportunityMetricLabel}>{publicFeatures.data.totalListedFundingGBP > 0 ? 'LISTED FUNDING' : 'CURRENTLY OPEN'}</Text></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Find your next opportunity" onPress={() => navigate('/opportunities')} style={styles.opportunityMetricAction}><MaterialIcons name="arrow-forward" size={21} color="#100B07" /></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opportunityRail}>
                  {publicFeatures.data.opportunities.slice(0, 5).map((opportunity) => (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Open opportunity ${opportunity.title}`} key={opportunity.id} onPress={() => navigate(opportunity.route)} style={styles.opportunityCard}>
                      <OpportunityArtwork candidates={opportunity.imageCandidates} />
                      <LinearGradient colors={['rgba(5,4,3,0.02)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
                      <View style={styles.opportunityCopy}><Text style={styles.opportunityType}>{opportunity.type.replaceAll('_', ' ').toUpperCase()}</Text><Text style={styles.opportunityTitle} numberOfLines={2}>{opportunity.title}</Text><Text style={styles.opportunityMeta} numberOfLines={1}>{opportunity.organiser}</Text></View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionEyebrow}>LIVE</Text><Text style={styles.sectionTitle}>Rooms open right now</Text></View>
              <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => navigate('/live')}><Text style={styles.seeAll}>All rooms</Text></Pressable>
            </View>
            {liveRooms.length ? liveRooms.map((room) => (
              <Pressable accessibilityRole="button" accessibilityLabel={`Open live room ${room.title || 'PLUGGD Live'}`} key={`live-${room.id}`} onPress={() => navigate(`/live/session?roomId=${encodeURIComponent(room.id)}`)} style={styles.chartRow}>
                <View style={[styles.liveDot, styles.liveDotOn]} />
                <View style={styles.chartCopy}><Text style={styles.chartTitle} numberOfLines={1}>{room.title || 'PLUGGD Live'}</Text><Text style={styles.chartMeta} numberOfLines={1}>{room.creator_name || 'PLUGGD Live'} · {room.viewer_count || 0} listening</Text></View>
                <MaterialIcons name="north-east" size={18} color={theme.colors.accentText} />
              </Pressable>
            )) : (
              <View style={styles.emptyRow}>
                <Text style={styles.liveEmptyTitle}>No rooms open right now.</Text>
                <Text style={styles.emptyCopy}>{nearYou[0]?.event ? `${nearYou[0].event.title || 'The next event'} is coming up. Nothing queued is being labelled live.` : 'Check Events while the next creator opens a room.'}</Text>
                <View style={styles.emptyActions}>
                  <Pressable accessibilityRole="button" onPress={() => navigate('/events')} style={styles.emptyPrimary}><Text style={styles.emptyPrimaryText}>View events</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => navigate('/live/create')} style={styles.emptySecondary}><Text style={styles.emptySecondaryText}>Start a room</Text></Pressable>
                </View>
              </View>
            )}

            {scenes.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>TRENDING SCENES</Text><Text style={styles.sectionTitle}>Tune into a world</Text></View>
                  <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => chooseFilter('Scenes')}><Text style={styles.seeAll}>Browse all</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRail}>
                  {scenes.slice(0, 6).map((scene, index) => <SceneCard key={`${scene.kind}-${scene.canonicalValue}`} scene={scene} index={index} onPress={() => navigate(scene.route)} />)}
                </ScrollView>
              </>
            ) : null}

            {newItems.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>NEW FROM CREATORS</Text><Text style={styles.sectionTitle}>Fresh on PLUGGD</Text></View>
                  <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => navigate('/releases')}><Text style={styles.seeAll}>View releases</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radarRail}>
                  {newItems.map((item) => <RadarCard key={`new-${item.id}`} item={item} onOpen={() => open(item)} onPlay={() => { void play(item); }} />)}
                </ScrollView>
              </>
            ) : null}

            {racks.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>FROM THE RACKS</Text><Text style={styles.sectionTitle}>Worth pulling forward again</Text></View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radarRail}>
                  {racks.map((item) => <RadarCard key={`rack-${item.id}`} item={item} onOpen={() => open(item)} onPlay={() => { void play(item); }} />)}
                </ScrollView>
              </>
            ) : null}

            <DjPromoCard onPress={() => navigate('/dj')} />

            {soundboards.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>SOUNDBOARDS WORTH OPENING</Text><Text style={styles.sectionTitle}>See how ideas are taking shape</Text></View>
                  <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => navigate('/soundboards')}><Text style={styles.seeAll}>All boards</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soundboardRail}>
                  {soundboards.map((board) => (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${board.title || 'soundboard'}`} key={board.id} onPress={() => navigate(`/soundboards/${board.slug || board.id}`)} style={[styles.soundboardCard, { width: soundboardCardWidth }]}>
                      <View pointerEvents="none" style={styles.soundboardCanvas}>
                        <NativeSoundboardCanvas items={soundboardItemsByBoard[board.id] || []} boardMetadata={(board as any).metadata || null} boardArtwork={board.cover_image_url} width={soundboardCardWidth} height={168} mode="preview" />
                      </View>
                      <View style={styles.soundboardCopy}><View style={styles.soundboardText}><Text style={styles.soundboardTitle} numberOfLines={2}>{board.title || 'Untitled board'}</Text><Text style={styles.soundboardMeta}>{board.item_count || 0} pieces · {board.comment_count || 0} comments</Text></View><View style={styles.soundboardOpen}><MaterialIcons name="arrow-forward" size={18} color="#100B07" /></View></View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {nearYou.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>NEAR YOU</Text><Text style={styles.sectionTitle}>Happening around the scene</Text></View>
                  <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => navigate('/events')}><Text style={styles.seeAll}>All events</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRail}>
                  {nearYou.map(({ event, upcoming }) => (
                    <Pressable accessibilityRole="button" accessibilityLabel={upcoming > 1 ? `Open ${event.title || 'event'}, next of ${upcoming} dates` : `Open ${event.title || 'event'}`} key={`near-${event.id}`} onPress={() => navigate(`/events/${event.id}`)} style={styles.nearCard}>
                      {event.cover_image_url ? <PluggdImage uri={event.cover_image_url} style={styles.nearArt} displayWidth={320} /> : <PluggdImage uri="" fallbackSource={DISCOVERY_DESTINATION_ART.events} style={styles.nearArt} />}
                      <Text style={styles.nearDate}>{formatEventDate(event.starts_at)}{upcoming > 1 ? `  ·  +${upcoming - 1} MORE DATES` : ''}</Text>
                      <Text style={styles.chartTitle} numberOfLines={2}>{event.title || 'Untitled event'}</Text>
                      <Text style={styles.chartMeta} numberOfLines={1}>{event.location || 'Location TBA'}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {creators.length ? (
              <>
                <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>CREATORS TO WATCH</Text><Text style={styles.sectionTitle}>Shaping the feed</Text></View></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRail}>
                  {creators.map((creator) => (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${creator.name}`} key={`creator-${creator.route}`} onPress={() => navigate(creator.route)} style={styles.creatorCard}>
                      {creator.artwork ? <PluggdImage uri={creator.artwork} style={styles.creatorArt} displayWidth={180} /> : <PluggdImage uri="" fallbackSource={DISCOVERY_DESTINATION_ART.creators} style={styles.creatorArt} />}
                      <Text style={styles.creatorName} numberOfLines={1}>{creator.name}</Text>
                      <Text style={styles.chartMeta} numberOfLines={1}>{creator.meta}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {communityPulse.data?.length ? (
              <>
                <View style={styles.sectionHeader}>
                  <View><Text style={styles.sectionEyebrow}>COMMUNITY PULSE</Text><Text style={styles.sectionTitle}>What people are actually saying</Text></View>
                  <Pressable accessibilityRole="button" style={styles.seeAllButton} onPress={() => navigate('/community')}><Text style={styles.seeAll}>Open community</Text></Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityRail}>
                  {communityPulse.data.slice(0, 6).map((post) => (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Open post by ${postAuthor(post)}`} key={post.id} onPress={() => navigate(`/post/${post.id}`)} style={styles.communityCard}>
                      {post.images[0] ? <PluggdImage uri={post.images[0]} style={styles.communityImage} displayWidth={480} /> : null}
                      <View style={styles.communityAuthorRow}>
                        {post.avatar_url ? <PluggdImage uri={post.avatar_url} style={styles.communityAvatar} displayWidth={120} /> : <View style={[styles.communityAvatar, styles.fallback]}><MaterialIcons name="person" size={17} color={theme.colors.accentText} /></View>}
                        <Text style={styles.communityAuthor} numberOfLines={1}>{postAuthor(post)}</Text>
                      </View>
                      <Text style={styles.communityText} numberOfLines={3}>{post.content || 'Open this community post'}</Text>
                      <View style={styles.communityStats}><Text style={styles.communityStat}>{post.likes_count} likes</Text><Text style={styles.communityStat}>{post.comments_count} replies</Text><MaterialIcons name="north-east" size={16} color={theme.colors.accentText} /></View>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function DiscoveryModeView({
  filter,
  directory,
  selectedScene,
  selectedItems,
  chartItems,
  onNavigate,
  onOpen,
  onPlay,
}: {
  filter: (typeof FILTERS)[number];
  directory: DirectoryEntry[];
  selectedScene: string;
  selectedItems: DiscoveryItem[];
  chartItems: DiscoveryItem[];
  onNavigate: (route: string) => void;
  onOpen: (item: DiscoveryItem) => void;
  onPlay: (item: DiscoveryItem) => void;
}) {
  const styles = useDiscoveryStyles();
  if (filter === 'Charts') {
    return (
      <>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>PLUGGD CHARTS</Text><Text style={styles.sectionTitle}>Measured movement</Text></View><Text style={styles.liveCount}>{chartItems.length} RANKED</Text></View>
        {chartItems.length ? <ChartList items={chartItems} onOpen={onOpen} onPlay={onPlay} /> : <ModeEmpty title="No chart movement yet." body="Charts only show real measured engagement. They will not be padded with invented ranks." />}
      </>
    );
  }

  if (filter === 'Scenes' && selectedScene) {
    if (!selectedItems.length) return <ModeEmpty title={`Nothing published in ${selectedScene} yet.`} body="Choose another scene. This view will never substitute unrelated results." />;
    return (
      <>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>SCENE</Text><Text style={styles.sectionTitle}>Inside {selectedScene}</Text></View><Text style={styles.liveCount}>{selectedItems.length} ITEMS</Text></View>
        <View style={styles.mosaic}>
          <SignalTile item={selectedItems[0]} variant="lead" onOpen={() => onOpen(selectedItems[0])} onPlay={() => onPlay(selectedItems[0])} />
          <View style={styles.mosaicStack}>{selectedItems.slice(1, 3).map((item) => <SignalTile key={item.id} item={item} variant="small" onOpen={() => onOpen(item)} onPlay={() => onPlay(item)} />)}</View>
        </View>
        {selectedItems.length > 3 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryRail}>{selectedItems.slice(3).map((item) => <DiscoveryRailCard key={item.id} item={item} onOpen={() => onOpen(item)} onPlay={() => onPlay(item)} />)}</ScrollView> : null}
      </>
    );
  }

  const label = filter === 'Scenes' ? 'Scenes' : filter;
  return (
    <>
      <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>{label.toUpperCase()}</Text><Text style={styles.sectionTitle}>Browse real {label.toLowerCase()}</Text></View><Text style={styles.liveCount}>{directory.length} DESTINATIONS</Text></View>
      {directory.length ? (
        <View style={styles.directoryGrid}>
          {directory.map((entry, index) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${entry.label}`} key={`${entry.kind}-${entry.canonicalValue}`} onPress={() => onNavigate(entry.route)} style={styles.directoryCard}>
              {entry.image ? <PluggdImage uri={entry.image} style={styles.directoryImage} displayWidth={420} /> : <View style={[styles.directoryImage, styles.fallback]} />}
              <LinearGradient colors={['rgba(5,4,3,0.08)', 'rgba(5,4,3,0.95)']} style={StyleSheet.absoluteFillObject} />
              <Text style={styles.directoryIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.directoryCopy}><Text style={styles.directoryTitle} numberOfLines={2}>{entry.label}</Text><Text style={styles.directoryMeta} numberOfLines={1}>{entry.detail}</Text></View>
            </Pressable>
          ))}
        </View>
      ) : <ModeEmpty title={`No ${label.toLowerCase()} yet.`} body="This directory only appears when current public music supplies a real destination." />}
    </>
  );
}

function ModeEmpty({ title, body }: { title: string; body: string }) {
  const styles = useDiscoveryStyles();
  return <View style={styles.modeEmpty}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

function FeatureSpotlight({ feature, onPress }: { feature: DiscoveryFeature; onPress: () => void }) {
  const styles = useDiscoveryStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${feature.title}`} onPress={onPress} style={styles.featureCard}>
      {feature.imageUrl || feature.fallbackSource ? <PluggdImage uri={feature.imageUrl || ''} fallbackSource={feature.fallbackSource} style={styles.featureImage} displayWidth={780} /> : <View style={[styles.featureImage, styles.fallback]} />}
      <LinearGradient colors={['rgba(4,3,2,0.04)', 'rgba(4,3,2,0.94)']} locations={[0.08, 1]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.featureCopy}><Text style={styles.featureEyebrow}>{feature.eyebrow}</Text><Text style={styles.featureTitle} numberOfLines={3}>{feature.title}</Text><Text style={styles.featureSubtitle} numberOfLines={2}>{feature.subtitle}</Text></View>
      <View style={styles.featureArrow}><MaterialIcons name="north-east" size={20} color="#100B07" /></View>
    </Pressable>
  );
}

function DjPromoCard({ onPress }: { onPress: () => void }) {
  const styles = useDiscoveryStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Explore PLUGGD DJ for Mac" onPress={onPress} style={styles.djPromoCard}>
      <Image source={DISCOVERY_DESTINATION_ART.dj} resizeMode="cover" style={styles.djPromoImage} />
      <View style={styles.djPromoCopy}>
        <View style={styles.djPromoEyebrowRow}>
          <MaterialIcons name="album" size={16} color="#D84F00" />
          <Text style={styles.djPromoEyebrow}>PLUGGD DJ FOR MAC</Text>
        </View>
        <Text style={styles.djPromoTitle}>Your library.{`\n`}On deck.</Text>
        <Text style={styles.djPromoBody}>Mix the releases, beats and sample packs you own on PLUGGD with two decks, stems, effects and recording built in.</Text>
        <View style={styles.djPromoButton}>
          <Text style={styles.djPromoButtonText}>Explore PLUGGD DJ</Text>
          <MaterialIcons name="north-east" size={18} color="#100B07" />
        </View>
      </View>
    </Pressable>
  );
}

function OpportunityArtwork({ candidates }: { candidates: string[] }) {
  const styles = useDiscoveryStyles();
  const [candidateIndex, setCandidateIndex] = useState(0);
  const uri = candidates[candidateIndex] || '';

  return (
    <View style={styles.opportunityArt}>
      <PluggdImage uri="" fallbackSource={DISCOVERY_DESTINATION_ART.opportunities} style={StyleSheet.absoluteFillObject} />
      {uri ? (
        <PluggdImage
          key={`${uri}:${candidateIndex}`}
          uri={uri}
          style={StyleSheet.absoluteFillObject}
          displayWidth={440}
          onError={() => setCandidateIndex((index) => Math.min(index + 1, candidates.length))}
        />
      ) : null}
    </View>
  );
}

function WorldGateway({ world, onPress }: { world: { id: string; title: string; meta: string; artwork: ImageSourcePropType; icon: keyof typeof MaterialIcons.glyphMap; index: string; wide?: boolean }; onPress: () => void }) {
  const styles = useDiscoveryStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${world.title}`} onPress={onPress} style={[styles.worldLink, world.wide && styles.worldLinkWide]}>
      <View pointerEvents="none" style={[styles.worldArtworkFrame, world.wide && styles.worldArtworkFrameWide]}>
        <Image source={world.artwork} style={styles.worldImage} resizeMode="contain" />
      </View>
      <LinearGradient
        colors={['rgba(6,5,4,0)', 'rgba(6,5,4,0.14)', 'rgba(6,5,4,0.84)']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.worldTop}><Text style={styles.worldIndex}>{world.index}</Text><MaterialIcons name="north-east" size={17} color={INK} /></View>
      <View style={styles.worldCopy}><Text style={styles.worldLinkTitle}>{world.title}</Text><Text style={styles.worldLinkMeta} numberOfLines={2}>{world.meta}</Text></View>
    </Pressable>
  );
}

function SceneCard({ scene, index, onPress }: { scene: DirectoryEntry; index: number; onPress: () => void }) {
  const styles = useDiscoveryStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${scene.label}`} onPress={onPress} style={[styles.sceneCard, index % 2 === 1 && styles.sceneCardTall]}>
      {scene.image ? <PluggdImage uri={scene.image} style={styles.fill} displayWidth={480} /> : <View style={[styles.fill, styles.fallback]} />}
      <View style={styles.sceneShade} /><Text style={styles.sceneNumber}>{String(index + 1).padStart(2, '0')}</Text><View><Text style={styles.sceneLabel}>{scene.label}</Text><Text style={styles.sceneDetail}>{scene.detail}</Text></View>
    </Pressable>
  );
}

function SignalTile({ item, variant, onOpen, onPlay }: { item: DiscoveryItem; variant: 'lead' | 'small'; onOpen: () => void; onPlay: () => void }) {
  const styles = useDiscoveryStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}${itemCredit(item)}. ${publicDiscoveryReason(item.discoveryReason)}`} onPress={onOpen} style={variant === 'lead' ? styles.leadTile : styles.smallTile}>
      {item.artwork ? <PluggdImage uri={item.artwork} style={styles.fill} displayWidth={720} /> : <View style={[styles.fill, styles.fallback]}><MaterialIcons name="graphic-eq" size={34} color={ORANGE} /></View>}
      <View style={styles.tileShade} />
      <Pressable accessibilityRole="button" accessibilityLabel={item.isPlayable ? `Play ${item.title}` : `Open ${item.title}`} onPress={(event) => { event.stopPropagation(); onPlay(); }} style={variant === 'lead' ? styles.tilePlayLead : styles.tilePlaySmall}><MaterialIcons name={item.isPlayable ? 'play-arrow' : 'north-east'} size={variant === 'lead' ? 24 : 18} color="#100B07" /></Pressable>
      <View style={styles.tileCopy}><Text style={styles.tileKind}>{item.kind.toUpperCase()} · {item.genre || item.city || 'INDEPENDENT'}</Text><Text style={variant === 'lead' ? styles.leadTitle : styles.smallTitle} numberOfLines={2}>{item.title}</Text>{item.creator ? <Text style={styles.tileCreator} numberOfLines={1}>{item.creator}</Text> : null}</View>
    </Pressable>
  );
}

function DiscoveryRailCard({ item, onOpen, onPlay }: { item: DiscoveryItem; onOpen: () => void; onPlay: () => void }) {
  const styles = useDiscoveryStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}${itemCredit(item)}`} onPress={onOpen} style={styles.discoveryRailCard}>
      {item.artwork ? <PluggdImage uri={item.artwork} style={styles.discoveryRailArt} displayWidth={360} /> : <View style={[styles.discoveryRailArt, styles.fallback]} />}
      <Pressable accessibilityRole="button" accessibilityLabel={item.isPlayable ? `Play ${item.title}` : `Open ${item.title}`} onPress={(event) => { event.stopPropagation(); onPlay(); }} style={styles.discoveryRailAction}><MaterialIcons name={item.isPlayable ? 'play-arrow' : 'north-east'} size={18} color="#100B07" /></Pressable>
      <Text style={styles.radarTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.radarMeta} numberOfLines={1}>{itemMeta(item, item.kind)}</Text>
    </Pressable>
  );
}

function RadarCard({ item, onOpen, onPlay }: { item: DiscoveryItem; onOpen: () => void; onPlay: () => void }) {
  const styles = useDiscoveryStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}${itemCredit(item)}`} onPress={onOpen} style={styles.radarCard}>
      {item.artwork ? <PluggdImage uri={item.artwork} style={styles.radarArt} displayWidth={420} /> : <View style={[styles.radarArt, styles.fallback]}><MaterialIcons name="graphic-eq" size={30} color={ORANGE} /></View>}
      <Pressable accessibilityRole="button" accessibilityLabel={item.isPlayable ? `Play ${item.title}` : `Open ${item.title}`} onPress={(event) => { event.stopPropagation(); onPlay(); }} style={styles.radarPlay}><MaterialIcons name={item.isPlayable ? 'play-arrow' : 'north-east'} size={18} color="#100B07" /></Pressable>
      <Text style={styles.radarTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.radarMeta} numberOfLines={1}>{itemMeta(item, item.kind)}</Text>
    </Pressable>
  );
}

function ChartList({ items, onOpen, onPlay }: { items: DiscoveryItem[]; onOpen: (item: DiscoveryItem) => void; onPlay: (item: DiscoveryItem) => void }) {
  const styles = useDiscoveryStyles();
  const theme = usePluggdTheme();
  return <>{items.map((item, index) => (
    <View key={`chart-${item.id}`} style={styles.chartRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open chart item ${item.title}${itemCredit(item)}`} onPress={() => onOpen(item)} style={styles.chartOpen}>
        <Text style={styles.chartRank}>{String(index + 1).padStart(2, '0')}</Text>
        {item.artwork ? <PluggdImage uri={item.artwork} style={styles.chartArt} displayWidth={180} /> : <View style={[styles.chartArt, styles.fallback]} />}
        <View style={styles.chartCopy}><Text style={styles.chartTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.chartMeta} numberOfLines={1}>{itemMeta(item, publicDiscoveryReason(item.discoveryReason))}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.title}`} style={styles.chartPlay} onPress={() => onPlay(item)}><MaterialIcons name="play-arrow" size={22} color={index < 3 ? theme.colors.accentText : theme.colors.textMuted} /></Pressable>
    </View>
  ))}</>;
}

function useDiscoveryStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 184 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 5 },
  headingCopy: { flex: 1 },
  kicker: { color: theme.colors.accentText, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.7 },
  title: { color: theme.colors.text, fontFamily: 'Sora-ExtraBold', fontSize: 32, lineHeight: 36, letterSpacing: -1.1, marginTop: 3 },
  subtitle: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19, maxWidth: 310, marginTop: 6 },
  signalMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  signalMarkPressed: { transform: [{ scale: 0.96 }], opacity: 0.88 },
  signalLiveDot: { position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.live, borderWidth: 1, borderColor: theme.colors.background },
  search: { minHeight: 48, marginTop: 18, borderWidth: 1, borderColor: theme.colors.controlBorder, borderRadius: 5, backgroundColor: theme.colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchText: { flex: 1, color: theme.colors.textMuted, fontFamily: 'Satoshi-Medium', fontSize: 13 },
  filters: { gap: 8, paddingVertical: 14 },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: theme.colors.surface },
  filterActive: { backgroundColor: theme.colors.accentFill },
  filterText: { color: theme.colors.textSecondary, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  filterTextActive: { color: theme.colors.onAccent },
  tickerShell: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, marginBottom: 14 },
  tickerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  tickerRail: { alignItems: 'center', gap: 8, paddingRight: 20 },
  tickerChip: { minHeight: 44, maxWidth: 254, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.controlBorder, borderRadius: 22, paddingHorizontal: 12 },
  tickerChipText: { maxWidth: 214, color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 11.5 },
  featureCard: { height: 196, marginBottom: 14, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end', padding: 16, backgroundColor: theme.colors.artworkBase },
  featureImage: { ...StyleSheet.absoluteFillObject },
  featureCopy: { zIndex: 2, maxWidth: '84%' },
  featureEyebrow: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 8.5, letterSpacing: 1.25 },
  featureTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 22, lineHeight: 26, marginTop: 4 },
  featureSubtitle: { color: '#D9D1C7', fontFamily: 'Satoshi-Medium', fontSize: 11, lineHeight: 15, marginTop: 4 },
  featureArrow: { position: 'absolute', right: 14, bottom: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  djPromoCard: { marginBottom: 18, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)', backgroundColor: '#FFFFFF' },
  // Explicit native height keeps React Native from falling back to the source
  // asset's intrinsic Web export height inside the vertical discovery flow.
  djPromoImage: { width: '100%', height: 190 },
  djPromoCopy: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 },
  djPromoEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  djPromoEyebrow: { color: '#D84F00', fontFamily: 'Satoshi-Black', fontSize: 10.5, letterSpacing: 2.1 },
  djPromoTitle: { marginTop: 16, color: '#090909', fontFamily: 'Sora-ExtraBold', fontSize: 38, lineHeight: 38, letterSpacing: -1.8 },
  djPromoBody: { marginTop: 16, color: 'rgba(0,0,0,0.62)', fontFamily: 'Satoshi-Medium', fontSize: 14, lineHeight: 21 },
  djPromoButton: { alignSelf: 'flex-start', minHeight: 48, marginTop: 22, borderRadius: 999, paddingHorizontal: 20, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  djPromoButtonText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 13.5 },
  sectionHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 11 },
  sectionEyebrow: { color: theme.colors.accentText, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.3, marginBottom: 3 },
  sectionTitle: { color: theme.colors.text, fontFamily: 'Sora-Bold', fontSize: 17, letterSpacing: -0.35 },
  liveCount: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1 },
  seeAllButton: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'flex-end' },
  seeAll: { color: theme.colors.accentText, fontFamily: 'Satoshi-Bold', fontSize: 11 },
  worldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  worldLink: { flexBasis: '47.5%', flexGrow: 1, maxWidth: '48.8%', height: 116, borderRadius: 5, overflow: 'hidden', justifyContent: 'space-between', padding: 10, backgroundColor: theme.colors.artworkBase },
  worldLinkWide: { flexBasis: '100%', maxWidth: '100%', height: 98 },
  worldArtworkFrame: { position: 'absolute', top: 6, right: 6, bottom: 6, left: 6, overflow: 'hidden' },
  worldArtworkFrameWide: { top: 4, right: 6, bottom: 4, left: '54%' },
  worldImage: { width: '100%', height: '100%' },
  worldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  worldIndex: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 8.5, letterSpacing: 1 },
  worldCopy: { zIndex: 2 },
  worldLinkTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15.5, letterSpacing: -0.3 },
  worldLinkMeta: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 9.5, lineHeight: 12.5, marginTop: 2 },
  loader: { minHeight: 160 },
  emptyRow: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised, borderRadius: 6, padding: 16, gap: 6 },
  liveEmptyTitle: { color: theme.colors.text, fontFamily: 'Sora-Bold', fontSize: 14 },
  emptyCopy: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Regular', fontSize: 12.5, lineHeight: 18 },
  emptyActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  emptyPrimary: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  emptyPrimaryText: { color: theme.colors.onAccent, fontFamily: 'Satoshi-Bold', fontSize: 12.5 },
  emptySecondary: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  emptySecondaryText: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 12.5 },
  modeEmpty: { minHeight: 190, justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider },
  emptyTitle: { color: theme.colors.text, fontFamily: 'Sora-Bold', fontSize: 18 },
  emptyBody: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19, marginTop: 6 },
  mosaic: { height: 238, flexDirection: 'row', gap: 8 },
  leadTile: { flex: 1.72, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', padding: 13 },
  mosaicStack: { flex: 1, gap: 8 },
  smallTile: { flex: 1, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', padding: 9 },
  fill: { ...StyleSheet.absoluteFillObject },
  fallback: { backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center' },
  tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.36)' },
  tileCopy: { zIndex: 2 },
  tileKind: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 7.5, letterSpacing: 0.8, marginBottom: 3 },
  leadTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 20, lineHeight: 23 },
  smallTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 11.5, lineHeight: 14 },
  tileCreator: { color: '#E0D8CD', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  tilePlayLead: { position: 'absolute', right: 12, top: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  tilePlaySmall: { position: 'absolute', right: 7, top: 7, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  whyRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: theme.colors.divider },
  whyLine: { width: 24, height: 2, backgroundColor: theme.colors.accentFill },
  whyText: { flex: 1, color: theme.colors.textMuted, fontFamily: 'Satoshi-Regular', fontSize: 10, lineHeight: 14 },
  openingRailLabel: { color: theme.colors.accentText, fontFamily: 'Satoshi-Black', fontSize: 8, letterSpacing: 1.15, marginTop: 14 },
  discoveryRail: { gap: 10, paddingTop: 12, paddingRight: 20 },
  discoveryRailCard: { width: 142, position: 'relative', paddingBottom: 4 },
  discoveryRailArt: { width: 142, height: 112, borderRadius: 5, backgroundColor: theme.colors.artworkBase },
  discoveryRailAction: { position: 'absolute', right: 7, top: 68, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  opportunityFeature: { minHeight: 92, borderRadius: 7, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceRaised, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  opportunityMetric: { flex: 1 },
  opportunityMetricValue: { color: theme.colors.text, fontFamily: 'Sora-ExtraBold', fontSize: 22 },
  opportunityMetricLabel: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Black', fontSize: 7, letterSpacing: 0.8, marginTop: 3 },
  opportunityMetricAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  opportunityRail: { gap: 10, paddingTop: 11, paddingRight: 20 },
  opportunityCard: { width: 194, height: 196, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  opportunityArt: { ...StyleSheet.absoluteFillObject },
  opportunityCopy: { zIndex: 2, padding: 12 },
  opportunityType: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 1 },
  opportunityTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15, lineHeight: 19, marginTop: 5 },
  opportunityMeta: { color: '#D9D0C6', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 4 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: theme.colors.inactive },
  liveDotOn: { backgroundColor: theme.colors.accentFill },
  sceneRail: { gap: 10, paddingRight: 20, alignItems: 'flex-start' },
  sceneCard: { width: 166, height: 138, borderRadius: 6, overflow: 'hidden', justifyContent: 'space-between', padding: 11 },
  sceneCardTall: { height: 166 },
  sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,3,2,0.43)' },
  sceneNumber: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
  sceneLabel: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17 },
  sceneDetail: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  radarRail: { gap: 10, paddingRight: 20 },
  radarCard: { width: 148, position: 'relative', marginBottom: 6 },
  radarArt: { width: 148, height: 148, borderRadius: 5, backgroundColor: theme.colors.artworkBase },
  radarPlay: { position: 'absolute', right: 8, top: 104, width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  radarTitle: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 12.5, lineHeight: 16, marginTop: 7 },
  radarMeta: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 2, textTransform: 'capitalize' },
  chartRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: theme.colors.divider },
  chartOpen: { flex: 1, minWidth: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartPlay: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chartRank: { width: 20, color: theme.colors.textSubtle, fontFamily: 'Satoshi-Bold', fontSize: 9 },
  chartArt: { width: 48, height: 48, borderRadius: 3, backgroundColor: theme.colors.artworkBase },
  chartCopy: { flex: 1, minWidth: 0 },
  chartTitle: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 12.5, lineHeight: 16 },
  chartMeta: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  chartRankText: { color: theme.colors.textMuted },
  nearCard: { width: 176, gap: 5 },
  nearArt: { width: 176, height: 108, borderRadius: 6, backgroundColor: theme.colors.artworkBase },
  nearDate: { color: theme.colors.accentText, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.2, marginTop: 3 },
  creatorCard: { width: 104, gap: 5 },
  creatorArt: { width: 104, height: 104, borderRadius: 52, backgroundColor: theme.colors.artworkBase },
  creatorName: { color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 12.5, marginTop: 3 },
  soundboardRail: { gap: 12, paddingRight: 20 },
  soundboardCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 7, backgroundColor: theme.colors.surfaceRaised, overflow: 'hidden' },
  soundboardCanvas: { height: 168, overflow: 'hidden' },
  soundboardCopy: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  soundboardText: { flex: 1, minWidth: 0 },
  soundboardTitle: { color: theme.colors.text, fontFamily: 'Sora-Bold', fontSize: 14, lineHeight: 18 },
  soundboardMeta: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 4 },
  soundboardOpen: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  communityRail: { gap: 12, paddingRight: 20 },
  communityCard: { width: 258, minHeight: 172, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 7, backgroundColor: theme.colors.surfaceRaised, padding: 13, overflow: 'hidden' },
  communityImage: { width: '100%', height: 122, borderRadius: 5, marginBottom: 11 },
  communityAuthorRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 },
  communityAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.artworkBase },
  communityAuthor: { flex: 1, color: theme.colors.text, fontFamily: 'Satoshi-Bold', fontSize: 11.5 },
  communityText: { color: theme.colors.textSecondary, fontFamily: 'Satoshi-Regular', fontSize: 12.5, lineHeight: 18, marginTop: 8 },
  communityStats: { minHeight: 36, flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 'auto' },
  communityStat: { color: theme.colors.textMuted, fontFamily: 'Satoshi-Medium', fontSize: 9.5 },
  directoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  directoryCard: { flexBasis: '47.5%', flexGrow: 1, maxWidth: '48.8%', height: 152, borderRadius: 6, overflow: 'hidden', justifyContent: 'space-between', padding: 11 },
  directoryImage: { ...StyleSheet.absoluteFillObject },
  directoryIndex: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1, zIndex: 2 },
  directoryCopy: { zIndex: 2 },
  directoryTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, lineHeight: 21 },
  directoryMeta: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  }), [theme]);
}
