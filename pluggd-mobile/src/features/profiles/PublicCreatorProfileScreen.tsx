import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../design/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  type TextInputProps,
  TextInput as NativeTextInput,
  type TextProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  SlideInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { impactHaptic, notificationHaptic, selectionHaptic } from '../../design/haptics';
import { useReducedMotion } from '../../design/useReducedMotion';
import { MobileStoriesRail } from '../culture/MobileStoriesRail';
import { loadCreatorProfileBundle } from '../culture/mobileServices';
import type { CreatorConnectCardSummary, CreatorProfilePublicConfig, MembershipSummary } from '../culture/mobileTypes';
import { formatCompact, toTrack } from '../../lib/mobileContent';
import type { PluggdTrack } from '../../context/PlaybackProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { supabase } from '../../lib/supabase';
import { blockUser } from '../safety/accountSafety';
import { showReportActions } from '../safety/reportActions';
import TipModal from '../../components/CommerceTipModal';
import {
  creatorAccentHighlight,
  creatorGenres,
  creatorLocationLabel,
  creatorProfileLinks,
  formatCreatorMoney,
  resolveCreatorAccentColor,
  resolveCreatorCoverUrl,
} from './creatorProfilePresentation';

const PLUGGD_ORANGE = '#ff6600';
const CREATOR_PROFILE_MAX_FONT_MULTIPLIER = 1.25;

function Text(props: TextProps) {
  return <NativeText {...props} maxFontSizeMultiplier={CREATOR_PROFILE_MAX_FONT_MULTIPLIER} />;
}

function TextInput(props: TextInputProps) {
  return <NativeTextInput {...props} maxFontSizeMultiplier={CREATOR_PROFILE_MAX_FONT_MULTIPLIER} />;
}

type ProfileRow = {
  id: string;
  user_id: string;
  username?: string | null;
  slug?: string | null;
  custom_url?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  is_creator?: boolean | null;
  is_verified?: boolean | null;
  user_type?: string | null;
  profile_type?: string | null;
  primary_genre?: string | null;
  genres?: unknown;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  website_url?: string | null;
  presskit_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  soundcloud_url?: string | null;
  spotify_url?: string | null;
  social_links?: unknown;
  embed_settings?: unknown;
  created_at?: string | null;
};

type ContentRow = {
  id: string;
  title: string;
  imageUrl?: string | null;
  meta?: string | null;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description?: string | null;
  badge?: string | null;
  track?: PluggdTrack | null;
  locked?: boolean;
  creator?: string | null;
  genre?: string | null;
  format?: string | null;
  priceLabel?: string | null;
  explicit?: boolean;
  playCount?: number | null;
};

type CreatorAction = {
  key: string;
  label: string;
  description?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

type CreatorProfileTab =
  | 'overview'
  | 'discography'
  | 'beats'
  | 'soundboards'
  | 'gallery'
  | 'video'
  | 'community'
  | 'membership'
  | 'store'
  | 'shows'
  | 'live'
  | 'about';

const WEB_CREATOR_TABS: Array<{ key: CreatorProfileTab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'discography', label: 'Music' },
  { key: 'beats', label: 'Beats' },
  { key: 'soundboards', label: 'Soundboards' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'video', label: 'Videos' },
  { key: 'community', label: 'Community' },
  { key: 'membership', label: 'Membership' },
  { key: 'store', label: 'Shop' },
  { key: 'shows', label: 'Shows' },
  { key: 'live', label: 'Live' },
  { key: 'about', label: 'About' },
];

type Props = {
  username?: string | string[];
  userId?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(value?: string | null) {
  if (!value) return 'Creator';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function creatorRoleLabel(profile?: ProfileRow | null) {
  const profileType = profile?.profile_type?.trim().toLowerCase();
  const value = !profileType || profileType === 'creator' || profileType === 'user'
    ? profile?.user_type
    : profile?.profile_type;
  return roleLabel(value);
}

function profileLinkIcon(platform: string): keyof typeof MaterialIcons.glyphMap {
  const icons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    website: 'language',
    presskit: 'article',
    instagram: 'photo-camera',
    twitter: 'alternate-email',
    youtube: 'smart-display',
    tiktok: 'music-note',
    soundcloud: 'graphic-eq',
    spotify: 'headphones',
    link: 'link',
  };
  return icons[platform] || 'link';
}

function profileTabIcon(tab: CreatorProfileTab): keyof typeof MaterialIcons.glyphMap {
  const icons: Record<CreatorProfileTab, keyof typeof MaterialIcons.glyphMap> = {
    overview: 'space-dashboard',
    discography: 'library-music',
    beats: 'headphones',
    soundboards: 'dashboard-customize',
    gallery: 'photo-library',
    video: 'smart-display',
    community: 'groups',
    membership: 'workspace-premium',
    store: 'storefront',
    shows: 'confirmation-number',
    live: 'settings-input-antenna',
    about: 'info-outline',
  };
  return icons[tab];
}

function normalizeProfileTab(value?: string | null): CreatorProfileTab | null {
  if (!value) return null;
  return WEB_CREATOR_TABS.some((tab) => tab.key === value) ? (value as CreatorProfileTab) : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function shouldShowPublicPlayCounts(embedSettings: unknown) {
  const profileVisibility = asRecord(asRecord(embedSettings).profile_visibility);
  return profileVisibility.show_play_counts !== false;
}

export function PublicCreatorProfileScreen({ username, userId }: Props) {
  const bottomInset = useBottomChromeInset();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const safeContentWidth = Math.max(0, windowWidth - 32);
  const compactHeight = windowHeight < 760;
  const playback = usePlayback();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ tab?: string | string[]; galleryItem?: string | string[] }>();
  const theme = usePluggdTheme();
  const reducedMotion = useReducedMotion();
  const scrollY = useSharedValue(0);
  const lookupUsername = firstParam(username);
  const lookupUserId = firstParam(userId);
  const requestedTab = normalizeProfileTab(firstParam(routeParams.tab));
  const galleryItemId = firstParam(routeParams.galleryItem);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [releases, setReleases] = useState<ContentRow[]>([]);
  const [beats, setBeats] = useState<ContentRow[]>([]);
  const [mixes, setMixes] = useState<ContentRow[]>([]);
  const [samplePacks, setSamplePacks] = useState<ContentRow[]>([]);
  const [soundboards, setSoundboards] = useState<ContentRow[]>([]);
  const [events, setEvents] = useState<ContentRow[]>([]);
  const [liveRooms, setLiveRooms] = useState<ContentRow[]>([]);
  const [communities, setCommunities] = useState<ContentRow[]>([]);
  const [gallery, setGallery] = useState<ContentRow[]>([]);
  const [videos, setVideos] = useState<ContentRow[]>([]);
  const [playlists, setPlaylists] = useState<ContentRow[]>([]);
  const [storefront, setStorefront] = useState<ContentRow[]>([]);
  const [memberships, setMemberships] = useState<ContentRow[]>([]);
  const [membershipDetails, setMembershipDetails] = useState<MembershipSummary[]>([]);
  const [pageConfig, setPageConfig] = useState<CreatorProfilePublicConfig | null>(null);
  const [connectCard, setConnectCard] = useState<CreatorConnectCardSummary | null>(null);
  const [achievementCount, setAchievementCount] = useState(0);
  const [catalogDiagnostics, setCatalogDiagnostics] = useState<string[]>([]);
  const [storyCount, setStoryCount] = useState(0);
  const [activeTab, setActiveTab] = useState<CreatorProfileTab>(requestedTab ?? 'overview');
  const appliedRequestedTabRef = useRef<CreatorProfileTab | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [sectionMenuVisible, setSectionMenuVisible] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');

  const displayName = profile?.display_name || profile?.full_name || profile?.username || profile?.slug || 'PLUGGD creator';
  const handle = profile?.custom_url || profile?.username || profile?.slug || '';
  const accent = resolveCreatorAccentColor(profile, pageConfig?.accentColor, theme.colors.accent || PLUGGD_ORANGE);
  const accentHighlight = creatorAccentHighlight(accent);
  const creatorImagery = pageConfig?.imagery ?? 'cinematic';
  const creatorDensity = pageConfig?.density ?? 'comfortable';
  const creatorTypography = pageConfig?.typography ?? 'modern';
  const creatorMotion = pageConfig?.motion ?? 'subtle';
  const compactDensity = creatorDensity === 'compact';
  const motionEnabled = !reducedMotion && creatorMotion !== 'minimal';
  const signatureMotion = motionEnabled && creatorMotion === 'signature';
  const creatorHeadingFontFamily = creatorTypography === 'display'
    ? pluggdFonts.brandDisplay
    : creatorTypography === 'editorial'
      ? pluggdFonts.displayBold
      : pluggdFonts.displayExtraBold;
  const coverScrimColors = creatorImagery === 'clean'
    ? ['rgba(10,8,6,0.01)', 'rgba(10,8,6,0.08)', theme.colors.background]
    : creatorImagery === 'editorial'
      ? ['rgba(10,8,6,0.18)', 'rgba(10,8,6,0.34)', theme.colors.background]
      : ['rgba(10,8,6,0.05)', 'rgba(10,8,6,0.12)', theme.colors.background];
  const onProfileScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const coverMotionStyle = useAnimatedStyle(() => {
    if (!signatureMotion) {
      return { transform: [{ translateY: 0 }, { scale: 1 }] };
    }
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-160, 0, 260],
            [-24, 0, 26],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            scrollY.value,
            [-160, 0, 260],
            [1.12, 1, 1.02],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, [signatureMotion]);
  const heroEntering = motionEnabled
    ? FadeInDown.duration(signatureMotion ? 520 : 360).springify().damping(20).stiffness(165)
    : undefined;
  const tabContentEntering = motionEnabled
    ? FadeInDown.duration(220).easing(Easing.out(Easing.cubic))
    : undefined;
  const isOwner = Boolean(currentUserId && profile?.user_id === currentUserId);
  const isMember = membershipDetails.some((membership) => membership.is_member);
  const catalogueCount = releases.length + mixes.length + beats.length + samplePacks.length + soundboards.length + playlists.length;
  const featuredSettings = pageConfig?.modules.find((module) => module.id === 'featured')?.settings;
  const featuredPreference = featuredSettings?.featuredContentType || 'automatic';
  const featuredContentId = featuredSettings?.featuredContentId || null;
  const featuredRelease = releases.find((item) => item.badge === 'FEATURED') || releases[0] || null;
  const featuredBeat = beats.find((item) => item.badge === 'FEATURED') || beats[0] || null;
  const featuredMix = mixes.find((item) => item.badge === 'FEATURED') || mixes[0] || null;
  const featuredSoundboard = soundboards.find((item) => item.badge === 'FEATURED') || soundboards[0] || null;
  const explicitFeaturedItem = [...releases, ...mixes, ...beats].find((item) => item.badge === 'FEATURED') || null;
  const selectedFeaturedItem = featuredContentId
    ? featuredPreference === 'release'
      ? releases.find((item) => item.id === featuredContentId) || null
      : featuredPreference === 'beat'
        ? beats.find((item) => item.id === featuredContentId) || null
        : featuredPreference === 'soundboard'
          ? soundboards.find((item) => item.id === featuredContentId) || null
          : null
    : null;
  const isBeatFirstCreator = Boolean(featuredBeat) && (
    creatorRoleLabel(profile).toLowerCase() === 'producer'
    || releases.length === 0
    || beats.length > releases.length
  );
  const configuredFeaturedItem = featuredPreference === 'beat' && featuredBeat
    ? featuredBeat
    : featuredPreference === 'release' && featuredRelease
      ? featuredRelease
      : featuredPreference === 'soundboard' && featuredSoundboard
        ? featuredSoundboard
        : null;
  const featuredItem = selectedFeaturedItem
    || configuredFeaturedItem
    || (isBeatFirstCreator ? featuredBeat : explicitFeaturedItem)
    || featuredRelease
    || featuredMix
    || featuredBeat
    || featuredSoundboard
    || null;
  const primaryPlayable = [...releases, ...mixes, ...beats, ...samplePacks].find((item) => item.track)?.track ?? null;
  const primaryCommunity = communities[0] ?? null;
  const primaryMembership = memberships[0] ?? null;
  const profileCoverUrl = resolveCreatorCoverUrl(profile);
  const locationLabel = creatorLocationLabel(profile);
  const profileGenres = creatorGenres(profile);
  const heroIdentityPills = Array.from(new Set(
    (profileGenres.length ? profileGenres : [creatorRoleLabel(profile), locationLabel])
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim()),
  )).slice(0, 4);
  const profileLinks = creatorProfileLinks(profile);
  const totalPlays = [...releases, ...mixes].reduce((sum, item) => sum + Number(item.playCount || 0), 0);
  const showPlayCounts = shouldShowPublicPlayCounts(profile?.embed_settings);
  const latestCatalogue = [...releases, ...mixes, ...beats].slice(0, 6);
  const fallbackModuleOrder = useMemo(() => {
    const role = String(profile?.profile_type || '').toLowerCase().replace(/[\s_-]+/g, '');
    if (['producer', 'engineer', 'songwriter', 'serviceprovider'].includes(role)) {
      return ['featured', 'beats', 'discography', 'soundboards', 'gallery', 'community', 'membership', 'store', 'video', 'shows', 'live', 'about'];
    }
    if (['dj', 'selector', 'radiohost'].includes(role)) {
      return ['featured', 'live', 'shows', 'community', 'membership', 'soundboards', 'discography', 'gallery', 'video', 'store', 'beats', 'about'];
    }
    if (['venue', 'promoter', 'festival'].includes(role)) {
      return ['featured', 'shows', 'live', 'gallery', 'community', 'membership', 'video', 'store', 'discography', 'soundboards', 'beats', 'about'];
    }
    if (['label', 'curator', 'media', 'brand', 'manager'].includes(role)) {
      return ['featured', 'discography', 'community', 'membership', 'video', 'gallery', 'store', 'shows', 'live', 'soundboards', 'beats', 'about'];
    }
    return ['featured', 'discography', 'gallery', 'video', 'community', 'membership', 'store', 'shows', 'live', 'beats', 'soundboards', 'about'];
  }, [profile?.profile_type]);

  const moduleVisible = useCallback((moduleId: string) => {
    if (!pageConfig?.modules.length) return true;
    const module = pageConfig.modules.find((candidate) => candidate.id === moduleId);
    return module ? module.visible : true;
  }, [pageConfig]);
  const supportVisible = Boolean(profile && !isOwner && moduleVisible('support'));

  const moduleOrder = useCallback((moduleId: string, fallback: number) => {
    const module = pageConfig?.modules.find((candidate) => candidate.id === moduleId);
    const fallbackIndex = fallbackModuleOrder.indexOf(moduleId);
    return module?.order ?? (fallbackIndex >= 0 ? fallbackIndex : fallback);
  }, [fallbackModuleOrder, pageConfig]);

  type ProfileSection = { moduleId: string; title: string; items: ContentRow[]; empty: string };
  const sectionMap = useMemo<Record<CreatorProfileTab, ProfileSection[]>>(
    () => ({
      overview: [
        { moduleId: 'featured', title: 'Featured Music', items: [...releases.slice(0, 6), ...mixes.slice(0, 3), ...beats.slice(0, 3)], empty: 'No featured music published yet.' },
        { moduleId: 'membership', title: 'Membership', items: memberships.slice(0, 2), empty: 'No membership tiers are available yet.' },
        { moduleId: 'community', title: 'Community', items: communities.slice(0, 3), empty: 'No creator community is available yet.' },
        { moduleId: 'shows', title: 'Live / Shows', items: [...liveRooms.slice(0, 3), ...events.slice(0, 4)], empty: 'No live sessions or shows yet.' },
        { moduleId: 'store', title: 'Store / Support', items: storefront.slice(0, 4), empty: 'No storefront items are available yet.' },
        { moduleId: 'video', title: 'Videos', items: videos.slice(0, 4), empty: 'No videos are available yet.' },
        { moduleId: 'gallery', title: 'Gallery', items: gallery.slice(0, 4), empty: 'No gallery moments are available yet.' },
      ].filter((section) => moduleVisible(section.moduleId) && section.items.length > 0)
        .sort((first, second) => moduleOrder(first.moduleId, 50) - moduleOrder(second.moduleId, 50)),
      discography: [
        { moduleId: 'discography', title: 'Releases', items: releases, empty: 'No releases published yet.' },
        { moduleId: 'discography', title: 'Mixes', items: mixes, empty: 'No mixes published yet.' },
        { moduleId: 'discography', title: 'Playlists', items: playlists, empty: 'No public playlists yet.' },
        { moduleId: 'discography', title: 'Sample Packs', items: samplePacks, empty: 'No sample packs listed yet.' },
      ],
      beats: [{ moduleId: 'beats', title: 'Beats', items: beats, empty: 'No beats listed yet.' }],
      soundboards: [{ moduleId: 'soundboards', title: 'Soundboards', items: soundboards, empty: 'No soundboards published yet.' }],
      gallery: [{ moduleId: 'gallery', title: 'Gallery', items: gallery, empty: 'No gallery moments yet.' }],
      video: [{ moduleId: 'video', title: 'Videos', items: videos, empty: 'No videos published yet.' }],
      community: [{ moduleId: 'community', title: 'Community', items: communities, empty: 'No creator community is available yet.' }],
      membership: [{ moduleId: 'membership', title: 'Membership', items: memberships, empty: 'No membership tiers are available yet.' }],
      store: [{ moduleId: 'store', title: 'Store / Support', items: storefront, empty: 'No storefront items are available yet.' }],
      shows: [{ moduleId: 'shows', title: 'Shows', items: events, empty: 'No public shows yet.' }],
      live: [{ moduleId: 'live', title: 'Live', items: liveRooms, empty: 'No upcoming live rooms yet.' }],
      about: [],
    }),
    [beats, communities, events, gallery, liveRooms, memberships, mixes, moduleOrder, moduleVisible, playlists, releases, samplePacks, soundboards, storefront, videos],
  );
  const activeSections = sectionMap[activeTab];

  const availableTabs = useMemo(() => {
    const counts: Record<CreatorProfileTab, number> = {
      overview: 1,
      discography: releases.length + mixes.length + playlists.length + samplePacks.length,
      beats: beats.length,
      soundboards: soundboards.length,
      gallery: gallery.length,
      video: videos.length,
      community: communities.length,
      membership: memberships.length,
      store: storefront.length,
      shows: events.length,
      live: liveRooms.length,
      about: 1,
    };
    const tabModules: Partial<Record<CreatorProfileTab, string>> = {
      discography: 'discography', beats: 'beats', soundboards: 'soundboards', gallery: 'gallery',
      video: 'video', community: 'community', membership: 'membership', store: 'store',
      shows: 'shows', live: 'live', about: 'about',
    };
    return WEB_CREATOR_TABS
      .filter((tab) => tab.key === 'overview' || tab.key === 'about' || (counts[tab.key] > 0 && moduleVisible(tabModules[tab.key] || tab.key)))
      .sort((first, second) => {
        if (first.key === 'overview') return -1;
        if (second.key === 'overview') return 1;
        return moduleOrder(tabModules[first.key] || first.key, WEB_CREATOR_TABS.indexOf(first))
          - moduleOrder(tabModules[second.key] || second.key, WEB_CREATOR_TABS.indexOf(second));
      })
      .map((tab) => ({ ...tab, count: counts[tab.key] }));
  }, [beats.length, communities.length, events.length, gallery.length, liveRooms.length, memberships.length, mixes.length, moduleOrder, moduleVisible, playlists.length, releases.length, samplePacks.length, soundboards.length, storefront.length, videos.length]);
  const primaryTabs = useMemo(() => {
    const byKey = new Map(availableTabs.map((tab) => [tab.key, tab]));
    return (['overview', 'discography', 'community', 'video'] as CreatorProfileTab[])
      .map((key) => byKey.get(key))
      .filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));
  }, [availableTabs]);
  const overflowTabs = useMemo(() => {
    const primaryKeys = new Set(primaryTabs.map((tab) => tab.key));
    return availableTabs.filter((tab) => !primaryKeys.has(tab.key));
  }, [availableTabs, primaryTabs]);
  const activeIsOverflow = overflowTabs.some((tab) => tab.key === activeTab);
  const filteredActiveSections = useMemo(() => {
    const normalizedQuery = musicQuery.trim().toLowerCase();
    if (activeTab !== 'discography' || !normalizedQuery) return activeSections;
    return activeSections.map((section) => ({
      ...section,
      items: section.items.filter((item) => [item.title, item.meta, item.creator, item.genre, item.description, item.format]
        .some((value) => String(value || '').toLowerCase().includes(normalizedQuery))),
    }));
  }, [activeSections, activeTab, musicQuery]);
  const selectedGalleryItem = useMemo(
    () => (activeTab === 'gallery' && galleryItemId ? gallery.find((item) => item.id === galleryItemId) ?? null : null),
    [activeTab, gallery, galleryItemId],
  );

  useEffect(() => {
    const available = new Set(availableTabs.map((tab) => tab.key));
    if (!requestedTab) {
      appliedRequestedTabRef.current = null;
    } else if (available.has(requestedTab) && appliedRequestedTabRef.current !== requestedTab) {
      appliedRequestedTabRef.current = requestedTab;
      setActiveTab(requestedTab);
      return;
    }
    if (!available.has(activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, availableTabs, requestedTab]);

  const loadProfile = useCallback(async () => {
    if (!lookupUsername && !lookupUserId) {
      setError('Profile not found.');
      setLoading(false);
      return;
    }

    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const viewerId = auth.user?.id ?? null;
    setCurrentUserId(viewerId);

    const profileQuery = supabase.from('profiles').select('*').limit(1);
    const { data: profileRows, error: profileError } = lookupUserId
      ? await profileQuery.eq('user_id', lookupUserId)
      : await profileQuery.or(`username.eq.${lookupUsername},slug.eq.${lookupUsername},custom_url.eq.${lookupUsername}`);

    if (profileError) throw profileError;

    let nextProfile = Array.isArray(profileRows) ? (profileRows[0] as ProfileRow | undefined) : undefined;

    // Some established creator accounts pre-date the private `profiles` row
    // used by the Studio. They are still valid public creators and appear in
    // search through `public_profiles`, so resolve that same canonical view as
    // a fallback instead of sending a valid search result to the unavailable
    // screen.
    if (!nextProfile) {
      const publicProfileQuery = (supabase as any).from('public_profiles').select('*').limit(1);
      const { data: publicProfileRows, error: publicProfileError } = lookupUserId
        ? await publicProfileQuery.eq('user_id', lookupUserId)
        : await publicProfileQuery.ilike('username', lookupUsername);

      if (publicProfileError) throw publicProfileError;
      nextProfile = Array.isArray(publicProfileRows)
        ? (publicProfileRows[0] as ProfileRow | undefined)
        : undefined;
    }

    const publicLookupHandle = nextProfile?.custom_url || nextProfile?.username || nextProfile?.slug || lookupUsername;
    if (publicLookupHandle) {
      const { data: publicRpcData, error: publicRpcError } = await (supabase as any).rpc('get_public_profile_by_slug', {
        p_slug: publicLookupHandle,
      });
      const publicRpcProfile = Array.isArray(publicRpcData) ? publicRpcData[0] : publicRpcData;
      if (publicRpcProfile && typeof publicRpcProfile === 'object') {
        const existingProfile = nextProfile || {} as Partial<ProfileRow>;
        nextProfile = {
          ...publicRpcProfile,
          ...existingProfile,
          cover_image_url: existingProfile.cover_image_url || publicRpcProfile.cover_image_url || null,
          avatar_url: existingProfile.avatar_url || publicRpcProfile.avatar_url || null,
          logo_url: existingProfile.logo_url || publicRpcProfile.logo_url || null,
          location: existingProfile.location || publicRpcProfile.location || null,
          social_links: existingProfile.social_links || publicRpcProfile.social_links || null,
          embed_settings: existingProfile.embed_settings || publicRpcProfile.embed_settings || null,
        } as ProfileRow;
      } else if (publicRpcError && !nextProfile) {
        console.warn('[PublicCreatorProfile] public profile RPC unavailable', publicRpcError);
      }
    }

    if (!nextProfile) {
      setProfile(null);
      setError('Profile not found.');
      return;
    }

    const ownerId = nextProfile.user_id;
    const profileHandle = nextProfile.custom_url || nextProfile.username || nextProfile.slug || nextProfile.user_id;
    const profileDisplayName = nextProfile.display_name || nextProfile.full_name || nextProfile.username || nextProfile.slug || 'PLUGGD creator';
    setProfile(nextProfile);

    const bundle = await loadCreatorProfileBundle({ userId: ownerId });
    const membershipActive = (bundle.memberships ?? []).some((membership) => membership.is_member);

    setReleases(
      (bundle.releases ?? []).map((item) => {
        const access = String(item.perk_access || 'public').trim().toLowerCase();
        const locked = Boolean(item.is_exclusive || item.is_premium_content || !['', 'public', 'free'].includes(access)) && !membershipActive;
        const creditsRequired = Math.ceil(Number(item.credits_price ?? 0));
        return {
          id: item.id,
          title: item.title || 'Untitled release',
          imageUrl: item.cover_art_url,
          meta: item.artist || 'Release',
          description: item.description,
          route: locked ? `/membership/${ownerId}` : `/release/${item.id}`,
          icon: 'album',
          badge: locked ? 'MEMBER DROP' : item.is_featured ? 'FEATURED' : null,
          track: toTrack(item, 'release'),
          locked,
          creator: item.artist,
          genre: item.genre,
          format: /\bEP\b/i.test(item.title || '') ? 'EP' : 'Release',
          priceLabel: creditsRequired > 0 ? `${creditsRequired.toLocaleString('en-GB')} credits` : null,
          explicit: Boolean(item.explicit),
          playCount: item.total_plays,
        };
      }),
    );
    setMixes(
      (bundle.mixes ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled mix',
        imageUrl: item.cover_url,
        meta: item.city || item.event_name || 'Mix',
        route: `/mixes/${item.slug || item.id}`,
        icon: 'graphic-eq',
        description: item.description,
        track: toTrack(item, 'mix'),
        creator: profileDisplayName,
        genre: item.genre_tags?.[0] || null,
        format: 'Mix',
        playCount: item.play_count,
      })),
    );
    setBeats(
      (bundle.beats ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled beat',
        imageUrl: item.image_url,
        meta: item.genre || 'Beat',
        route: `/beat/${item.id}`,
        icon: 'headphones',
        description: item.description,
        track: toTrack(item, 'beat'),
        badge: item.is_featured ? 'FEATURED' : null,
        creator: item.producer_name || profileDisplayName,
        genre: item.genre,
        format: 'Beat',
        priceLabel: item.price ? formatCreatorMoney(item.price) : null,
      })),
    );
    setSamplePacks(
      (bundle.samplePacks ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled sample pack',
        imageUrl: item.cover_art_url,
        meta: item.genre || 'Sample pack',
        route: `/sample-pack/${item.id}`,
        icon: 'inventory-2',
        description: item.description,
        track: toTrack(item, 'sample_pack'),
        creator: profileDisplayName,
        genre: item.genre,
        format: item.sample_count ? `${item.sample_count} samples` : 'Sample pack',
        priceLabel: item.price ? formatCreatorMoney(item.price) : null,
      })),
    );
    setSoundboards(
      (bundle.soundboards ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.cover_image_url,
        meta: `${item.item_count ?? 0} sounds`,
        route: `/soundboards/${item.id}`,
        icon: 'dashboard-customize',
      })),
    );
    setEvents(
      (bundle.events ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Untitled event',
        imageUrl: item.cover_image_url,
        meta: item.location || 'Event',
        route: `/events/${item.id}`,
        icon: 'confirmation-number',
      })),
    );
    setLiveRooms(
      (bundle.liveRooms ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Live room',
        imageUrl: item.thumbnail_url || item.creator_avatar_url,
        meta: item.status || 'Live',
        route: `/live/session?roomId=${item.id}`,
        icon: 'settings-input-antenna',
      })),
    );
    setCommunities(
      (bundle.communities ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.cover_image_url || item.avatar_url,
        meta: item.member_count ? `${item.member_count} members` : 'Community',
        description: item.description,
        route: `/backstage/${item.slug || item.id}`,
        icon: 'groups',
      })),
    );
    setGallery(
      (bundle.galleryItems ?? []).map((item) => ({
        id: item.id,
        title: item.title || item.caption || 'Gallery image',
        imageUrl: item.image_url,
        meta: item.caption || item.category || 'Gallery',
        route: `/creator/${encodeURIComponent(profileHandle)}?tab=gallery&galleryItem=${encodeURIComponent(item.id)}`,
        icon: 'photo-library',
      })),
    );
    setVideos(
      (bundle.clips ?? []).map((item) => ({
        id: item.id,
        title: item.title || 'Video',
        imageUrl: item.thumbnail_url,
        meta: item.is_featured ? 'Featured video' : item.view_count ? `${formatCompact(item.view_count)} views` : 'Video',
        description: item.description,
        route: item.route || `/videos/${item.id}`,
        icon: 'smart-display',
        badge: item.is_featured ? 'FEATURED' : null,
        format: item.source_type === 'release_video' ? 'Release video' : 'Video',
      })),
    );
    setPlaylists(
      (bundle.playlists ?? []).map((item) => ({
        id: item.id,
        title: item.name,
        imageUrl: item.cover_url,
        meta: `${item.track_count ?? 0} tracks`,
        route: item.route,
        icon: 'queue-music',
      })),
    );
    setStorefront(
      (bundle.storefront ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: item.image_url,
        meta: item.kind || 'Support',
        description: item.description,
        route: item.route || '/wallet',
        icon: 'storefront',
        format: item.kind || 'Store item',
        priceLabel: item.price_cents ? formatCreatorMoney(item.price_cents, item.currency || 'GBP', true) : null,
      })),
    );
    setMemberships(
      (bundle.memberships ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        imageUrl: null,
        meta: [
          item.price_cents ? `${formatCreatorMoney(item.price_cents, item.currency || 'GBP', true)}/mo` : null,
          item.member_count ? `${item.member_count} member${item.member_count === 1 ? '' : 's'}` : null,
        ].filter(Boolean).join(' · ') || item.features?.[0] || 'Membership',
        description: item.description || item.features?.slice(0, 3).join(' · ') || null,
        route: item.route || `/membership/${ownerId}`,
        icon: 'workspace-premium',
        badge: item.is_member ? 'YOUR MEMBERSHIP' : 'MEMBER ACCESS',
      })),
    );
    setMembershipDetails(bundle.memberships ?? []);
    setPageConfig(bundle.pageConfig ?? null);
    setConnectCard(bundle.connectCard ?? null);
    setAchievementCount(bundle.achievementCount ?? 0);
    setCatalogDiagnostics(bundle.diagnostics ?? []);
    setStoryCount((bundle.stories ?? []).filter((story) => story.media_url || story.thumbnail_url).length);
    setFollowerCount(bundle.followerCount);
    setIsFollowing(bundle.isFollowing);
  }, [lookupUserId, lookupUsername]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadProfile()
      .catch((loadError) => {
        console.error('[PublicCreatorProfile] load failed:', loadError);
        if (mounted) setError(loadError?.message ?? 'Profile unavailable.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const selectProfileTab = useCallback((tab: CreatorProfileTab, emitHaptic = true) => {
    if (tab === activeTab) return;
    if (emitHaptic) selectionHaptic();
    setActiveTab(tab);
  }, [activeTab]);

  const openProfileMenu = useCallback(() => {
    selectionHaptic();
    setProfileMenuVisible(true);
  }, []);

  const openSectionMenu = useCallback(() => {
    selectionHaptic();
    setSectionMenuVisible(true);
  }, []);

  const playContent = useCallback(async (item: ContentRow) => {
    if (item.locked) {
      selectionHaptic();
      router.push(item.route as any);
      return;
    }
    if (!item.track) {
      selectionHaptic();
      router.push(item.route as any);
      return;
    }
    impactHaptic();
    if (playback.currentTrack?.id === item.track.id) {
      await playback.togglePlayPause();
      return;
    }
    await playback.playTrack(item.track);
  }, [playback, router]);

  const playCreator = useCallback(async () => {
    const catalogue = [...releases, ...mixes, ...beats, ...samplePacks];
    const orderedCatalogue = featuredItem?.track
      ? [featuredItem, ...catalogue.filter((item) => item.track?.id !== featuredItem.track?.id)]
      : catalogue;
    const queue = orderedCatalogue
      .map((item) => item.track)
      .filter((track): track is PluggdTrack => Boolean(track));
    if (!queue.length) return;
    impactHaptic();
    await playback.playQueue(queue, 0);
  }, [beats, featuredItem, mixes, playback, releases, samplePacks]);

  const profilePath = handle ? `/creator/${encodeURIComponent(handle)}` : `/profile/${profile?.user_id || ''}`;

  const openSupport = useCallback(() => {
    if (!profile || isOwner) return;
    if (!currentUserId) {
      router.push(`/auth/login?redirect=${encodeURIComponent(profilePath)}` as any);
      return;
    }
    setProfileMenuVisible(false);
    setTipVisible(true);
  }, [currentUserId, isOwner, profile, profilePath, router]);

  const openExternalProfileLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Unsupported link');
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link unavailable', 'This creator link could not be opened safely.');
    }
  }, []);

  const openHeroPrimaryAction = useCallback(() => {
    if (primaryPlayable) {
      void playCreator();
      return;
    }
    const destination = primaryMembership?.route || primaryCommunity?.route || storefront[0]?.route;
    if (destination) {
      impactHaptic();
      router.push(destination as any);
    }
  }, [playCreator, primaryCommunity?.route, primaryMembership?.route, primaryPlayable, router, storefront]);

  const heroPrimaryLabel = primaryPlayable
    ? 'Listen now'
    : primaryMembership
      ? isMember ? 'Member access' : 'Explore membership'
      : primaryCommunity
        ? 'Open Community'
        : storefront[0]
          ? 'Visit shop'
          : null;
  const heroPrimaryIcon: keyof typeof MaterialIcons.glyphMap = primaryPlayable
    ? 'play-arrow'
    : primaryMembership
      ? 'workspace-premium'
      : primaryCommunity
        ? 'groups'
        : 'storefront';

  const shareProfile = useCallback(async () => {
    const destination = handle ? `https://pluggd.fm/${encodeURIComponent(handle)}` : 'https://pluggd.fm';
    await Share.share({ message: `${displayName} on PLUGGD — music, membership and Community: ${destination}` });
  }, [displayName, handle]);

  const toggleFollow = async () => {
    if (!profile || followBusy) return;
    if (!currentUserId) {
      router.push('/auth/login' as any);
      return;
    }
    if (currentUserId === profile.user_id) {
      router.push('/studio/my-pluggd' as any);
      return;
    }

    const previous = isFollowing;
    setFollowBusy(true);
    setIsFollowing(!previous);
    setFollowerCount((count) => Math.max(0, count + (previous ? -1 : 1)));

    try {
      if (previous) {
        const { error: deleteError } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.user_id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase.from('user_follows').insert({
          follower_id: currentUserId,
          following_id: profile.user_id,
        });
        if (insertError) throw insertError;
      }
      notificationHaptic();
    } catch (followError) {
      console.error('[PublicCreatorProfile] follow failed:', followError);
      setIsFollowing(previous);
      setFollowerCount((count) => Math.max(0, count + (previous ? 1 : -1)));
    } finally {
      setFollowBusy(false);
    }
  };

  const openSafetyMenu = () => {
    if (!profile || currentUserId === profile.user_id) return;
    Alert.alert(displayName, 'Community safety', [
      {
        text: 'Report profile',
        onPress: () => showReportActions({
          targetType: 'profile',
          targetId: profile.id,
          label: 'profile',
        }),
      },
      {
        text: 'Block account',
        style: 'destructive',
        onPress: () => Alert.alert(`Block ${displayName}?`, 'You will no longer see each other’s profiles or community posts.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                await blockUser(profile.user_id, 'Blocked from public profile');
                router.replace('/community' as any);
                Alert.alert('Account blocked', `${displayName} has been blocked.`);
              } catch (error: any) {
                Alert.alert('Could not block account', error?.message ?? 'Please try again.');
              }
            },
          },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const profileActions: CreatorAction[] = isOwner
    ? [
        { key: 'edit-profile', label: 'Edit public profile', description: 'Identity, bio, artwork and links', icon: 'edit', onPress: () => router.push('/edit-profile' as any) },
        { key: 'catalogue', label: 'Manage catalogue', description: 'Releases, mixes, beats and products', icon: 'library-music', onPress: () => router.push('/studio/catalog' as any) },
        { key: 'upload', label: 'Upload new music', description: 'Publish a release, mix or beat', icon: 'upload', onPress: () => router.push('/creator/upload' as any) },
        { key: 'videos', label: 'Manage videos', description: 'Publish visuals and release video', icon: 'video-library', onPress: () => router.push('/studio/videos' as any) },
        { key: 'membership', label: 'Memberships', description: 'Tiers, exclusives and member access', icon: 'workspace-premium', onPress: () => router.push('/studio/commerce?tab=memberships' as any) },
        { key: 'store', label: 'Store and support', description: 'Products, sales and supporter tools', icon: 'storefront', onPress: () => router.push('/studio/commerce?tab=store' as any) },
        { key: 'connect', label: 'Connect Card', description: 'Bookings, services and enquiries', icon: 'contact-page', onPress: () => router.push('/studio/connect-card/edit' as any) },
        { key: 'studio', label: 'Open Creator Studio', description: 'Audience, publishing and community', icon: 'space-dashboard', onPress: () => router.push('/studio/my-pluggd' as any) },
        { key: 'share', label: 'Share public profile', icon: 'ios-share', onPress: () => void shareProfile() },
      ]
    : [
        ...(moduleVisible('support') ? [{ key: 'support', label: `Support ${displayName}`, description: 'Send creator-support credits directly', icon: 'favorite' as const, onPress: openSupport }] : []),
        ...(primaryMembership ? [{ key: 'membership', label: isMember ? 'Member access' : 'Explore membership', description: primaryMembership.meta || undefined, icon: 'workspace-premium' as const, onPress: () => router.push(primaryMembership.route as any) }] : []),
        ...(primaryCommunity ? [{ key: 'community', label: 'Join Community', description: primaryCommunity.meta || undefined, icon: 'groups' as const, onPress: () => router.push(primaryCommunity.route as any) }] : []),
        ...(connectCard ? [{ key: 'connect', label: connectCard.label, description: connectCard.bookingAvailable ? 'Bookings, services and paid collaboration enquiries' : 'Open this creator’s public Connect Card', icon: 'contact-page' as const, onPress: () => router.push(connectCard.route as any) }] : []),
        ...(storefront.length ? [{ key: 'shop', label: 'Shop creator store', description: `${storefront.length} available item${storefront.length === 1 ? '' : 's'}`, icon: 'shopping-bag' as const, onPress: () => selectProfileTab('store', false) }] : []),
        ...profileLinks.map((link) => ({ key: link.key, label: link.label, description: 'Open external creator link', icon: profileLinkIcon(link.platform), onPress: () => void openExternalProfileLink(link.url) })),
        { key: 'share', label: 'Share profile', icon: 'ios-share', onPress: () => void shareProfile() },
        { key: 'safety', label: 'Safety options', description: 'Report or block this profile', icon: 'shield', onPress: openSafetyMenu },
      ];

  const sectionActions: CreatorAction[] = overflowTabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    description: tab.key === 'about' ? `About ${displayName}` : `${tab.count} available`,
    icon: profileTabIcon(tab.key),
    onPress: () => selectProfileTab(tab.key, false),
  }));

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={profile ? 'light' : theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={theme.scheme === 'dark' ? ['#0a0806', '#0C0C0C', '#0a0806'] : ['#FAFAF8', '#FFFFFF', '#F4F2EE']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
        onScroll={onProfileScroll}
        scrollEventThrottle={16}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>Loading profile...</Text>
          </View>
        ) : error || !profile ? (
          <View style={styles.unavailableScreen}>
            <View style={styles.unavailableCopy}>
              <Text style={[styles.unavailableEyebrow, { color: theme.colors.accent }]}>OFF THE AIR</Text>
              <Text style={[styles.unavailableTitle, { color: theme.colors.text }]}>
                This profile isn’t in the signal.
              </Text>
              <Text style={[styles.unavailableBody, { color: theme.colors.textMuted }]}>
                It may have moved, changed handle or not be public yet. There is still plenty worth hearing.
              </Text>
            </View>

            <View
              style={[
                styles.unavailableSignal,
                { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={[styles.unavailableSignalIcon, { backgroundColor: theme.colors.accentFill }]}>
                <MaterialIcons name="graphic-eq" size={27} color={theme.colors.onAccent} />
              </View>
              <View style={styles.unavailableSignalCopy}>
                <Text style={[styles.unavailableSignalTitle, { color: theme.colors.text }]}>
                  Find your next artist
                </Text>
                <Text style={[styles.unavailableSignalBody, { color: theme.colors.textMuted }]}>
                  Explore releases, scenes and creators selected for discovery.
                </Text>
              </View>
            </View>

            <View style={styles.unavailableActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Explore creators"
                onPress={() => router.replace('/discover' as any)}
                style={[styles.unavailablePrimary, { backgroundColor: theme.colors.accentFill }]}
              >
                <Text style={[styles.unavailablePrimaryText, { color: theme.colors.onAccent }]}>Explore creators</Text>
                <MaterialIcons name="arrow-forward" size={20} color={theme.colors.onAccent} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to home"
                onPress={() => router.replace('/(tabs)' as any)}
                style={[styles.unavailableSecondary, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.unavailableSecondaryText, { color: theme.colors.text }]}>Back home</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.cover,
                compactHeight && styles.coverCompact,
                !profileCoverUrl && styles.coverWithoutArtwork,
                compactHeight && !profileCoverUrl && styles.coverWithoutArtworkCompact,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Animated.View pointerEvents="none" style={[styles.coverMotionLayer, coverMotionStyle]}>
                {profileCoverUrl ? (
                  <Image source={{ uri: profileCoverUrl }} style={styles.coverImage} />
                ) : (
                  <LinearGradient colors={[`${accent}55`, '#17100B', '#0A0806']} style={StyleSheet.absoluteFill} />
                )}
              </Animated.View>
              <LinearGradient colors={coverScrimColors as [string, string, string]} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFill} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
                style={[styles.backButton, { top: insets.top + 10, backgroundColor: theme.colors.glassFallback, borderColor: theme.colors.border }]}
              >
                <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
              </Pressable>
            </View>

            <Animated.View
              entering={heroEntering}
              style={[
                styles.profileBlock,
                { width: windowWidth },
                compactDensity && styles.profileBlockCompact,
                !profileCoverUrl && styles.profileBlockWithoutArtwork,
              ]}
            >
              <View style={styles.identityRow}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.artworkBase, borderColor: accent }]}>
                  {profile.avatar_url || profile.logo_url ? (
                    <Image source={{ uri: profile.avatar_url || profile.logo_url || undefined }} style={styles.avatarImage} />
                  ) : (
                    <Text style={[styles.avatarInitials, { color: theme.colors.text }]}>{initials(displayName)}</Text>
                  )}
                </View>

                <View style={styles.titleTextWrap}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: theme.colors.text, fontFamily: creatorHeadingFontFamily }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {profile.is_verified ? <MaterialIcons name="verified" size={20} color={accent} /> : null}
                  </View>
                  {handle ? (
                    <Text style={[styles.handle, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      @{handle} · {creatorRoleLabel(profile)}
                    </Text>
                  ) : null}
                  {locationLabel ? (
                    <View style={styles.locationRow}>
                      <MaterialIcons name="location-on" size={15} color={theme.colors.textMuted} />
                      <Text style={[styles.locationText, { color: theme.colors.textMuted }]} numberOfLines={1}>{locationLabel}</Text>
                    </View>
                  ) : null}

                  <View style={styles.profileSignals}>
                    <Text style={[styles.profileSignalText, { color: theme.colors.text }]}>
                      {releases.length} release{releases.length === 1 ? '' : 's'}
                    </Text>
                    <View style={[styles.signalDot, { backgroundColor: theme.colors.textSubtle }]} />
                    <Text style={[styles.profileSignalText, { color: theme.colors.textMuted }]}>
                      {followerCount.toLocaleString()} follower{followerCount === 1 ? '' : 's'}
                    </Text>
                    {showPlayCounts && totalPlays > 0 ? (
                      <>
                        <View style={[styles.signalDot, { backgroundColor: theme.colors.textSubtle }]} />
                        <Text style={[styles.profileSignalText, { color: theme.colors.textMuted }]}>{formatCompact(totalPlays)} plays</Text>
                      </>
                    ) : null}
                  </View>
                </View>
              </View>

              {profile.bio?.trim() ? (
                <Text style={[styles.heroBio, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                  {profile.bio.trim()}
                </Text>
              ) : null}

              {heroIdentityPills.length ? (
                <View style={styles.heroIdentityPills}>
                  {heroIdentityPills.map((item) => (
                    <View key={item} style={[styles.heroIdentityPill, { backgroundColor: `${accent}18`, borderColor: `${accent}55` }]}>
                      <Text style={[styles.heroIdentityPillText, { color: theme.colors.textSecondary }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={[styles.primaryActions, { width: safeContentWidth }]}>
                {heroPrimaryLabel ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${heroPrimaryLabel} with ${displayName}`}
                    onPress={openHeroPrimaryAction}
                    style={styles.listenButton}
                  >
                    {({ pressed }) => (
                      <LinearGradient
                        colors={[accent, accentHighlight]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[styles.listenButtonFill, pressed && styles.actionPressed]}
                      >
                        <MaterialIcons name={heroPrimaryIcon} size={20} color="#0A0806" />
                        <Text style={styles.listenButtonText}>{heroPrimaryLabel}</Text>
                      </LinearGradient>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isOwner ? 'Manage creator page' : isFollowing ? `Unfollow ${displayName}` : `Follow ${displayName}`}
                  accessibilityState={{ selected: !isOwner && isFollowing, busy: !isOwner && followBusy, disabled: !isOwner && followBusy }}
                  disabled={!isOwner && followBusy}
                  onPress={isOwner ? openProfileMenu : toggleFollow}
                  style={[
                    styles.followButton,
                    { flexGrow: heroPrimaryLabel ? 0.9 : 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong },
                    !isOwner && followBusy && styles.actionDisabled,
                  ]}
                >
                  {({ pressed }) => (
                    <View style={[styles.actionInlineContent, pressed && styles.actionPressed]}>
                      {!isOwner && followBusy
                        ? <ActivityIndicator size="small" color={theme.colors.text} />
                        : <MaterialIcons name={isOwner ? 'tune' : isFollowing ? 'check' : 'add'} size={19} color={theme.colors.text} />}
                      <Text style={[styles.followText, { color: theme.colors.text }]}>
                        {isOwner ? 'Manage' : followBusy ? 'Updating' : isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${displayName} profile actions`}
                  accessibilityHint="Support, connect, share or manage this creator profile"
                  onPress={openProfileMenu}
                  style={[
                    styles.moreButton,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong },
                  ]}
                >
                  {({ pressed }) => (
                    <View style={[styles.actionInlineContent, pressed && styles.actionPressed]}>
                      <MaterialIcons name="more-horiz" size={24} color={theme.colors.text} />
                    </View>
                  )}
                </Pressable>
              </View>
            </Animated.View>

            <View style={[styles.tabRail, { width: windowWidth }, compactDensity && styles.tabRailCompact, { borderBottomColor: theme.colors.border }]}>
              {primaryTabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <CreatorProfileTabButton
                    key={tab.key}
                    active={active}
                    accent={accent}
                    label={`${tab.label}${tab.key === 'discography' || tab.key === 'video' ? ` ${tab.count}` : ''}`}
                    accessibilityLabel={`${tab.label} profile tab`}
                    accessibilityHint={`Show ${tab.label} on this creator profile`}
                    nativeID={`creator-profile-tab-${tab.key}`}
                    testID={`creator-profile-tab-${tab.key}`}
                    motionEnabled={motionEnabled}
                    textColor={theme.colors.textSecondary}
                    onPress={() => selectProfileTab(tab.key)}
                  />
                );
              })}
              {overflowTabs.length ? (
                <CreatorProfileTabButton
                  active={activeIsOverflow}
                  accent={accent}
                  expanded={sectionMenuVisible}
                  accessibilityLabel="More profile sections"
                  accessibilityHint="Shows the rest of this creator profile"
                  nativeID="creator-profile-tab-more"
                  testID="creator-profile-tab-more"
                  icon="chevron-right"
                  label="More"
                  more
                  motionEnabled={motionEnabled}
                  textColor={theme.colors.textSecondary}
                  onPress={openSectionMenu}
                />
              ) : null}
            </View>

            <Animated.View
              key={`creator-profile-content-${activeTab}`}
              entering={tabContentEntering}
              style={compactDensity && styles.tabContentCompact}
            >
            {catalogDiagnostics.length > 0 ? (
              <View style={[styles.catalogNotice, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <MaterialIcons name="sync-problem" size={22} color={accent} />
                <View style={styles.catalogNoticeCopy}>
                  <Text style={[styles.catalogNoticeTitle, { color: theme.colors.text }]}>Some creator content did not load</Text>
                  <Text style={[styles.catalogNoticeBody, { color: theme.colors.textMuted }]}>Pull to refresh this page. The available catalogue is still shown below.</Text>
                </View>
              </View>
            ) : null}

            {activeTab === 'about' ? (
              <CreatorAboutSection
                creatorName={displayName}
                bio={profile.bio}
                handle={handle}
                role={creatorRoleLabel(profile)}
                location={locationLabel}
                genres={profileGenres}
                links={profileLinks}
                createdAt={profile.created_at}
                accent={accent}
                stats={[
                  { label: 'Followers', value: followerCount },
                  ...(showPlayCounts ? [{ label: 'Total plays', value: totalPlays }] : []),
                  { label: 'Releases', value: releases.length },
                  { label: 'Beats', value: beats.length },
                  { label: 'Videos', value: videos.length },
                  { label: 'Achievements', value: achievementCount },
                ]}
                showZeroStats={isOwner}
                onOpenLink={(url) => void openExternalProfileLink(url)}
              />
            ) : (
              <>
                {activeTab === 'overview' && featuredItem && moduleVisible('featured') ? (
                  <CreatorFeatureCard
                    item={featuredItem}
                    creatorName={displayName}
                    accent={accent}
                    isPlaying={Boolean(featuredItem.track && playback.currentTrack?.id === featuredItem.track.id && playback.isPlaying)}
                    onOpen={() => router.push(featuredItem.route as any)}
                    onPlay={() => void playContent(featuredItem)}
                  />
                ) : null}

                {activeTab === 'overview' && primaryPlayable ? (
                  <CreatorListeningBar
                    item={featuredItem}
                    accent={accent}
                    isPlaying={Boolean(playback.currentTrack && playback.isPlaying)}
                    onPlayAll={() => void playCreator()}
                    onSearch={() => selectProfileTab('discography')}
                  />
                ) : null}

                {activeTab === 'discography' ? (
                  <CreatorMusicToolbar
                    creatorName={displayName}
                    item={featuredItem}
                    query={musicQuery}
                    accent={accent}
                    isPlaying={Boolean(playback.currentTrack && playback.isPlaying)}
                    onChangeQuery={setMusicQuery}
                    onPlayAll={() => void playCreator()}
                  />
                ) : null}

                {activeTab === 'overview' && (primaryCommunity || supportVisible) ? (
                  <CreatorFanActionPair
                    community={moduleVisible('community') ? primaryCommunity : null}
                    creatorName={displayName}
                    accent={accent}
                    showSupport={supportVisible}
                    onCommunity={() => primaryCommunity && router.push(primaryCommunity.route as any)}
                    onSupport={openSupport}
                  />
                ) : null}

                {activeTab === 'community' && primaryCommunity && moduleVisible('community') ? (
                  <CreatorCommunityCallout
                    item={primaryCommunity}
                    creatorName={displayName}
                    accent={accent}
                    onPress={() => router.push(primaryCommunity.route as any)}
                  />
                ) : null}

                {activeTab === 'overview' && (storyCount > 0 || isOwner) ? (
                  <View style={styles.storyRailWrap}>
                    <MobileStoriesRail creatorId={profile.user_id} title="Creator moments" />
                  </View>
                ) : null}

                {activeTab === 'overview' && latestCatalogue.length ? (
                  <CreatorContentSection
                    title={`Latest from ${displayName}`}
                    items={latestCatalogue}
                    accent={accent}
                    listMode
                    currentTrackId={playback.currentTrack?.id}
                    isPlaying={playback.isPlaying}
                    onOpen={(item) => router.push(item.route as any)}
                    onPlay={(item) => void playContent(item)}
                    actionLabel="View all"
                    onAction={() => selectProfileTab('discography')}
                  />
                ) : null}

                {(activeTab === 'overview' || activeTab === 'membership') && primaryMembership && moduleVisible('membership') ? (
                  <CreatorMembershipPanel
                    membership={membershipDetails[0]}
                    item={primaryMembership}
                    creatorName={displayName}
                    accent={accent}
                    onPress={() => router.push(primaryMembership.route as any)}
                  />
                ) : null}

                {selectedGalleryItem ? (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Selected Gallery Image</Text>
                    <View style={[styles.selectedGalleryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      {selectedGalleryItem.imageUrl ? <Image source={{ uri: selectedGalleryItem.imageUrl }} style={[styles.selectedGalleryImage, { backgroundColor: theme.colors.artworkBase }]} /> : null}
                      <Text style={[styles.selectedGalleryTitle, { color: theme.colors.text }]}>{selectedGalleryItem.title}</Text>
                      {selectedGalleryItem.meta ? <Text style={[styles.selectedGalleryMeta, { color: theme.colors.textMuted }]}>{selectedGalleryItem.meta}</Text> : null}
                    </View>
                  </View>
                ) : null}
                {filteredActiveSections
                  .filter((section) => !(activeTab === 'overview' && ['featured', 'membership', 'community'].includes(section.moduleId)))
                  .filter((section) => !(activeTab === 'membership' && section.moduleId === 'membership'))
                  .filter((section) => !(activeTab === 'community' && section.moduleId === 'community'))
                  .map((section) => (
                    <CreatorContentSection
                      key={`${section.moduleId}-${section.title}`}
                      title={section.title}
                      items={section.items}
                      accent={accent}
                      listMode={activeTab === 'discography' || activeTab === 'membership'}
                      currentTrackId={playback.currentTrack?.id}
                      isPlaying={playback.isPlaying}
                      onOpen={(item) => router.push(item.route as any)}
                      onPlay={(item) => void playContent(item)}
                    />
                  ))}
                {activeTab === 'discography' && filteredActiveSections.every((section) => section.items.length === 0) ? (
                  <View style={[styles.searchEmpty, { borderColor: theme.colors.border }]}>
                    <MaterialIcons name="search-off" size={24} color={theme.colors.textMuted} />
                    <Text style={[styles.searchEmptyTitle, { color: theme.colors.text }]}>No catalogue matches</Text>
                    <Text style={[styles.searchEmptyBody, { color: theme.colors.textMuted }]}>Try an artist, title, genre or format.</Text>
                  </View>
                ) : null}
              </>
            )}
            </Animated.View>
          </>
        )}
      </Animated.ScrollView>
      <CreatorActionSheet
        visible={profileMenuVisible}
        title={isOwner ? 'Manage creator page' : displayName}
        eyebrow={isOwner ? 'CREATOR TOOLS' : 'SUPPORT · CONNECT · SHARE'}
        actions={profileActions}
        accent={accent}
        motionStyle={creatorMotion}
        onClose={() => setProfileMenuVisible(false)}
      />
      <CreatorActionSheet
        visible={sectionMenuVisible}
        title="More from this creator"
        eyebrow="PROFILE SECTIONS"
        actions={sectionActions}
        accent={accent}
        selectedKey={activeIsOverflow ? activeTab : undefined}
        motionStyle={creatorMotion}
        onClose={() => setSectionMenuVisible(false)}
      />
      {profile && !isOwner ? (
        <TipModal
          visible={tipVisible}
          onClose={() => setTipVisible(false)}
          artistName={displayName}
          artistId={profile.user_id}
        />
      ) : null}
      {profile ? <View pointerEvents="none" style={[styles.statusScrim, { height: insets.top, backgroundColor: 'rgba(10,8,6,0.82)' }]} /> : null}
    </View>
  );
}

function CreatorProfileTabButton({
  active,
  accent,
  expanded,
  accessibilityLabel,
  accessibilityHint,
  nativeID,
  testID,
  icon,
  label,
  more = false,
  motionEnabled,
  textColor,
  onPress,
}: {
  active: boolean;
  accent: string;
  expanded?: boolean;
  accessibilityLabel: string;
  accessibilityHint: string;
  nativeID: string;
  testID: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  label: string;
  more?: boolean;
  motionEnabled: boolean;
  textColor: string;
  onPress: () => void;
}) {
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = motionEnabled
      ? withTiming(active ? 1 : 0, { duration: 190, easing: Easing.out(Easing.cubic) })
      : active ? 1 : 0;
  }, [active, activeProgress, motionEnabled]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
    transform: [{ scaleX: 0.58 + activeProgress.value * 0.42 }],
  }));

  return (
    <Pressable
      accessible
      focusable
      accessibilityRole="button"
      accessibilityState={expanded === undefined ? { selected: active } : { selected: active, expanded }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      nativeID={nativeID}
      testID={testID}
      hitSlop={6}
      onPress={onPress}
      style={[styles.profileTab, more && styles.moreTab]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.profileTabContent, pressed && styles.actionPressed]}>
            <Text numberOfLines={1} style={[styles.profileTabText, { color: active ? accent : textColor }]}>{label}</Text>
            {icon ? <MaterialIcons name={icon} size={17} color={active ? accent : textColor} /> : null}
          </View>
          <Animated.View
            pointerEvents="none"
            style={[styles.profileTabIndicator, { backgroundColor: accent }, indicatorStyle]}
          />
        </>
      )}
    </Pressable>
  );
}

function CreatorActionSheet({
  visible,
  title,
  eyebrow,
  actions,
  accent,
  motionStyle,
  selectedKey,
  onClose,
}: {
  visible: boolean;
  title: string;
  eyebrow: string;
  actions: CreatorAction[];
  accent: string;
  motionStyle: CreatorProfilePublicConfig['motion'];
  selectedKey?: string;
  onClose: () => void;
}) {
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const sheetMotionEnabled = !reducedMotion && motionStyle !== 'minimal';
  const sheetEntering = sheetMotionEnabled
    ? SlideInDown.duration(motionStyle === 'signature' ? 320 : 240).springify().damping(22).stiffness(180)
    : undefined;
  return (
    <Modal visible={visible} transparent animationType={sheetMotionEnabled ? 'fade' : 'none'} statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.actionSheetRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} style={StyleSheet.absoluteFill} />
        <Animated.View
          key={visible ? 'creator-action-sheet-open' : 'creator-action-sheet-closed'}
          entering={visible ? sheetEntering : undefined}
          style={[styles.actionSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: Math.max(18, insets.bottom + 8) }]}
        >
          <View style={[styles.actionSheetHandle, { backgroundColor: theme.colors.textSubtle }]} />
          <View style={styles.actionSheetHeading}>
            <View style={styles.actionSheetHeadingCopy}>
              <Text style={[styles.actionSheetEyebrow, { color: accent }]}>{eyebrow}</Text>
              <Text style={[styles.actionSheetTitle, { color: theme.colors.text }]} numberOfLines={2}>{title}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} style={[styles.actionSheetClose, { borderColor: theme.colors.border }]}>
              <MaterialIcons name="close" size={21} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.actionSheetScroll} contentContainerStyle={styles.actionSheetActions}>
            {actions.map((action) => {
              const selected = action.key === selectedKey;
              return (
                <Pressable
                  key={action.key}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    selectionHaptic();
                    onClose();
                    action.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.actionSheetRow,
                    { borderTopColor: theme.colors.divider },
                    pressed && styles.actionPressed,
                  ]}
                >
                  <View style={[styles.actionSheetIcon, { backgroundColor: selected ? accent : theme.colors.surfaceAlt }]}>
                    <MaterialIcons name={action.icon} size={21} color={selected ? '#0A0806' : action.destructive ? '#F25F5C' : accent} />
                  </View>
                  <View style={styles.actionSheetCopy}>
                    <Text style={[styles.actionSheetLabel, { color: action.destructive ? '#F25F5C' : theme.colors.text }]}>{action.label}</Text>
                    {action.description ? <Text style={[styles.actionSheetDescription, { color: theme.colors.textMuted }]} numberOfLines={2}>{action.description}</Text> : null}
                  </View>
                  {selected ? <MaterialIcons name="check" size={20} color={accent} /> : <MaterialIcons name="chevron-right" size={21} color={theme.colors.textSubtle} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function CreatorListeningBar({
  item,
  accent,
  isPlaying,
  onPlayAll,
  onSearch,
}: {
  item: ContentRow | null;
  accent: string;
  isPlaying: boolean;
  onPlayAll: () => void;
  onSearch: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.listeningBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.listeningArtwork, { backgroundColor: theme.colors.surfaceAlt }]}>
        {item?.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.artworkImage} /> : <MaterialIcons name="graphic-eq" size={23} color={accent} />}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Restart creator catalogue' : 'Play all creator music'} onPress={onPlayAll} style={styles.listeningAction}>
        <View style={[styles.listeningPlay, { backgroundColor: accent }]}>
          <MaterialIcons name="play-arrow" size={22} color="#0A0806" />
        </View>
        <Text style={[styles.listeningActionText, { color: theme.colors.text }]}>Play all</Text>
      </Pressable>
      <View style={[styles.listeningDivider, { backgroundColor: theme.colors.divider }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Search creator catalogue" onPress={onSearch} style={styles.listeningSearch}>
        <MaterialIcons name="search" size={24} color={theme.colors.text} />
        <Text style={[styles.listeningSearchText, { color: theme.colors.text }]}>Search</Text>
      </Pressable>
    </View>
  );
}

function CreatorMusicToolbar({
  creatorName,
  item,
  query,
  accent,
  isPlaying,
  onChangeQuery,
  onPlayAll,
}: {
  creatorName: string;
  item: ContentRow | null;
  query: string;
  accent: string;
  isPlaying: boolean;
  onChangeQuery: (query: string) => void;
  onPlayAll: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.musicToolbarSection}>
      <View style={styles.musicToolbarHeading}>
        <View>
          <Text style={[styles.musicToolbarEyebrow, { color: accent }]}>CREATOR CATALOGUE</Text>
          <Text style={[styles.musicToolbarTitle, { color: theme.colors.text }]} numberOfLines={1}>{creatorName}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Restart creator catalogue' : 'Play all creator music'} onPress={onPlayAll} style={[styles.musicToolbarPlay, { backgroundColor: accent }]}>
          <MaterialIcons name="play-arrow" size={23} color="#0A0806" />
          <Text style={styles.musicToolbarPlayText}>Play all</Text>
        </Pressable>
      </View>
      <View style={[styles.searchField, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {item?.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.searchFieldArtwork} /> : <MaterialIcons name="library-music" size={20} color={accent} />}
        <MaterialIcons name="search" size={21} color={theme.colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search title, artist, genre or format"
          placeholderTextColor={theme.colors.textSubtle}
          accessibilityLabel="Search creator catalogue"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.searchInput, { color: theme.colors.text }]}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear catalogue search" onPress={() => onChangeQuery('')} hitSlop={8}>
            <MaterialIcons name="cancel" size={20} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CreatorFanActionPair({
  community,
  creatorName,
  accent,
  showSupport,
  onCommunity,
  onSupport,
}: {
  community: ContentRow | null;
  creatorName: string;
  accent: string;
  showSupport: boolean;
  onCommunity: () => void;
  onSupport: () => void;
}) {
  const theme = usePluggdTheme();
  const { width: viewportWidth } = useWindowDimensions();
  const actionCount = (community ? 1 : 0) + (showSupport ? 1 : 0);
  const actionCardWidth = actionCount > 0
    ? Math.max(0, Math.floor((viewportWidth - 32 - ((actionCount - 1) * 8)) / actionCount))
    : 0;
  const actionCardLayout = {
    width: actionCardWidth,
    minWidth: actionCardWidth,
    maxWidth: actionCardWidth,
    flexBasis: actionCardWidth,
    flexGrow: 0,
    flexShrink: 0,
  } as const;
  if (!community && !showSupport) return null;
  return (
    <View style={[styles.fanActionRow, { width: viewportWidth }]}>
      {community ? (
        <View style={[styles.fanActionSlot, actionCardLayout]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${community.title} Community`}
            onPress={() => {
              impactHaptic();
              onCommunity();
            }}
            style={({ pressed }) => [
              styles.fanActionCard,
              { backgroundColor: theme.colors.surface, borderColor: `${accent}66` },
              pressed && styles.actionPressed,
            ]}
          >
            <View style={styles.fanActionCardTop}>
              <View style={[styles.fanActionIcon, { borderColor: accent, backgroundColor: `${accent}14` }]}>
                <MaterialIcons name="groups" size={23} color={accent} />
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={accent} />
            </View>
            <Text style={[styles.fanActionTitle, { color: theme.colors.text }]} numberOfLines={2}>Join Community</Text>
            <Text style={[styles.fanActionBody, { color: theme.colors.textMuted }]} numberOfLines={2}>
              {community.description || `Connect with ${creatorName} and other fans`}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {showSupport ? (
        <View style={[styles.fanActionSlot, actionCardLayout]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Support ${creatorName}`}
            accessibilityHint="Send creator-support credits directly"
            onPress={() => {
              impactHaptic();
              onSupport();
            }}
            style={({ pressed }) => [
              styles.fanActionCard,
              { backgroundColor: `${accent}0D`, borderColor: `${accent}66` },
              pressed && styles.actionPressed,
            ]}
          >
            <View style={styles.fanActionCardTop}>
              <View style={[styles.fanActionIcon, { borderColor: accent, backgroundColor: `${accent}14` }]}>
                <MaterialIcons name="favorite-border" size={23} color={accent} />
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={accent} />
            </View>
            <Text style={[styles.fanActionTitle, { color: theme.colors.text }]} numberOfLines={2}>Support creator</Text>
            <Text style={[styles.fanActionBody, { color: theme.colors.textMuted }]} numberOfLines={2}>
              Keep {creatorName} creating
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CreatorCommunityCallout({
  item,
  creatorName,
  accent,
  onPress,
}: {
  item: ContentRow;
  creatorName: string;
  accent: string;
  onPress: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title} Community`}
      onPress={() => {
        impactHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.communityCallout,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed && styles.actionPressed,
      ]}
    >
      <View style={[styles.communityIcon, { borderColor: accent, backgroundColor: `${accent}14` }]}>
        <MaterialIcons name="groups" size={27} color={accent} />
      </View>
      <View style={styles.communityCalloutCopy}>
        <Text style={[styles.communityCalloutTitle, { color: theme.colors.text }]}>Join Community</Text>
        <Text style={[styles.communityCalloutBody, { color: theme.colors.textMuted }]} numberOfLines={2}>
          {item.description || `Connect with ${creatorName} and other fans`}
        </Text>
        {item.meta ? <Text style={[styles.communityCalloutMeta, { color: accent }]}>{item.meta}</Text> : null}
      </View>
      <MaterialIcons name="arrow-forward" size={24} color={theme.colors.text} />
    </Pressable>
  );
}

function CreatorAboutSection({
  creatorName,
  bio,
  handle,
  role,
  location,
  genres,
  links,
  createdAt,
  accent,
  stats,
  showZeroStats,
  onOpenLink,
}: {
  creatorName: string;
  bio?: string | null;
  handle: string;
  role: string;
  location: string | null;
  genres: string[];
  links: Array<{ key: string; label: string; platform: string; url: string }>;
  createdAt?: string | null;
  accent: string;
  stats: Array<{ label: string; value: number }>;
  showZeroStats: boolean;
  onOpenLink: (url: string) => void;
}) {
  const theme = usePluggdTheme();
  const visibleStats = showZeroStats ? stats : stats.filter((entry) => entry.value > 0);
  const createdYear = createdAt && Number.isFinite(new Date(createdAt).getTime()) ? new Date(createdAt).getFullYear() : null;
  return (
    <View style={styles.aboutSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About {creatorName}</Text>
      <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.aboutCopy, { color: theme.colors.textMuted }]}>{bio?.trim() || 'No bio has been added yet.'}</Text>
        {genres.length ? (
          <View style={styles.genrePills}>
            {genres.slice(0, 6).map((genre) => <View key={genre} style={[styles.genrePill, { backgroundColor: theme.colors.surfaceAlt }]}><Text style={[styles.genrePillText, { color: theme.colors.text }]}>{genre}</Text></View>)}
          </View>
        ) : null}
        <View style={styles.aboutRows}>
          <AboutRow label="Handle" value={handle ? `@${handle}` : 'Not set'} />
          <AboutRow label="Role" value={role} />
          {location ? <AboutRow label="Based in" value={location} /> : null}
          {createdYear ? <AboutRow label="On PLUGGD since" value={String(createdYear)} /> : null}
        </View>
      </View>
      {visibleStats.length ? (
        <View>
          <Text style={[styles.aboutSubheading, { color: theme.colors.text }]}>Quick stats</Text>
          <View style={styles.aboutStatsGrid}>
            {visibleStats.map((entry) => (
              <View key={entry.label} style={[styles.aboutStat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.aboutStatValue, { color: theme.colors.text }]}>{formatCompact(entry.value)}</Text>
                <Text style={[styles.aboutStatLabel, { color: theme.colors.textMuted }]}>{entry.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {links.length ? (
        <View>
          <Text style={[styles.aboutSubheading, { color: theme.colors.text }]}>Links</Text>
          <View style={[styles.profileLinks, { borderColor: theme.colors.border }]}>
            {links.map((link) => (
              <Pressable
                key={link.key}
                accessibilityRole="button"
                accessibilityLabel={`Open ${link.label}`}
                accessibilityHint="Opens this creator link outside PLUGGD"
                nativeID={`creator-profile-link-${link.key}`}
                testID={`creator-profile-link-${link.key}`}
                onPress={() => onOpenLink(link.url)}
                style={[styles.profileLinkRow, { borderTopColor: theme.colors.divider }]}
              >
                <MaterialIcons name={profileLinkIcon(link.platform)} size={20} color={accent} />
                <Text style={[styles.profileLinkLabel, { color: theme.colors.text }]}>{link.label}</Text>
                <MaterialIcons name="open-in-new" size={18} color={theme.colors.textSubtle} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function CreatorFeatureCard({
  item,
  creatorName,
  accent,
  isPlaying,
  onOpen,
  onPlay,
}: {
  item: ContentRow;
  creatorName: string;
  accent: string;
  isPlaying: boolean;
  onOpen: () => void;
  onPlay: () => void;
}) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.featureSection}>
      <Text style={[styles.featureSectionLabel, { color: theme.colors.textMuted }]}>CREATOR PICK</Text>
      <View style={[styles.featureCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={onOpen} style={[styles.featureArtworkWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.featureArtwork} /> : <MaterialIcons name={item.icon} size={38} color={accent} />}
          {item.badge ? <View style={[styles.featureArtworkBadge, { backgroundColor: accent }]}><Text style={styles.featureArtworkBadgeText}>{item.badge}</Text></View> : null}
        </Pressable>
        <View style={styles.featureBody}>
          <Text style={[styles.featureEyebrow, { color: accent }]}>CREATOR PICK</Text>
          <Text style={[styles.featureTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
          <Text style={[styles.featureMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.creator || item.meta || creatorName}</Text>
          <View style={styles.featurePills}>
            {item.genre ? <View style={[styles.featurePill, { backgroundColor: theme.colors.surfaceAlt }]}><Text style={[styles.featurePillText, { color: theme.colors.text }]}>{item.genre}</Text></View> : null}
            {item.format ? <Text style={[styles.featureFormat, { color: theme.colors.textMuted }]}>{item.format}</Text> : null}
            {item.explicit ? <View style={styles.explicitPill}><Text style={styles.explicitPillText}>18+</Text></View> : null}
          </View>
          <View style={styles.featureActions}>
            {item.track || item.locked ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.locked ? `Unlock ${item.title}` : isPlaying ? `Pause ${item.title}` : `Play ${item.title}`}
                onPress={onPlay}
                style={[styles.featurePlay, { backgroundColor: accent }]}
              >
                <MaterialIcons name={item.locked ? 'lock' : isPlaying ? 'pause' : 'play-arrow'} size={22} color="#0A0806" />
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={onOpen} style={styles.featureViewAction}>
              <View style={styles.featureViewCopy}>
                <Text style={[styles.featureViewText, { color: theme.colors.text }]}>View</Text>
                {item.priceLabel ? <Text style={[styles.featurePrice, { color: accent }]}>{item.priceLabel}</Text> : null}
              </View>
              <MaterialIcons name="chevron-right" size={21} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function CreatorMembershipPanel({
  membership,
  item,
  creatorName,
  accent,
  onPress,
}: {
  membership?: MembershipSummary;
  item: ContentRow;
  creatorName: string;
  accent: string;
  onPress: () => void;
}) {
  const theme = usePluggdTheme();
  const features = membership?.features?.slice(0, 3) || [];
  const priceLabel = membership?.price_cents
    ? `${formatCreatorMoney(membership.price_cents, membership.currency || 'GBP', true)}/mo`
    : null;
  return (
    <View style={styles.membershipSection}>
      <LinearGradient
        colors={[`${accent}32`, theme.colors.surface, theme.colors.surface]}
        style={[styles.membershipPanel, { borderColor: `${accent}75` }]}
      >
        <View style={styles.membershipHeader}>
          <View style={[styles.membershipIcon, { backgroundColor: accent }]}>
            <MaterialIcons name="workspace-premium" size={25} color="#0A0806" />
          </View>
          <View style={styles.membershipHeaderCopy}>
            <Text style={[styles.membershipEyebrow, { color: accent }]}>{membership?.is_member ? 'YOUR MEMBERSHIP' : `GET CLOSER TO ${creatorName.toUpperCase()}`}</Text>
            <Text style={[styles.membershipTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
          </View>
        </View>
        <Text style={[styles.membershipBody, { color: theme.colors.textMuted }]}>
          {membership?.description || item.description || 'Unlock creator-approved drops, early access and member-only experiences.'}
        </Text>
        {priceLabel || membership?.member_count ? (
          <View style={styles.membershipEvidence}>
            {priceLabel ? <Text style={[styles.membershipPrice, { color: theme.colors.text }]}>{priceLabel}</Text> : null}
            {priceLabel && membership?.member_count ? <View style={[styles.membershipEvidenceDot, { backgroundColor: theme.colors.textSubtle }]} /> : null}
            {membership?.member_count ? (
              <Text style={[styles.membershipMembers, { color: theme.colors.textMuted }]}>{membership.member_count} member{membership.member_count === 1 ? '' : 's'}</Text>
            ) : null}
          </View>
        ) : null}
        {features.length ? (
          <View style={styles.membershipFeatures}>
            {features.map((feature) => (
              <View key={feature} style={styles.membershipFeatureRow}>
                <MaterialIcons name="check-circle" size={17} color={accent} />
                <Text style={[styles.membershipFeatureText, { color: theme.colors.text }]}>{feature}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title} membership`}
          onPress={() => {
            impactHaptic();
            onPress();
          }}
          style={({ pressed }) => [styles.membershipButton, { backgroundColor: accent }, pressed && styles.actionPressed]}
        >
          <Text style={styles.membershipButtonText}>{membership?.is_member ? 'View membership' : 'Explore membership'}</Text>
          <MaterialIcons name="arrow-forward" size={19} color="#0A0806" />
        </Pressable>
      </LinearGradient>
    </View>
  );
}

function CreatorContentSection({
  title,
  items,
  accent,
  listMode,
  currentTrackId,
  isPlaying,
  onOpen,
  onPlay,
  actionLabel,
  onAction,
}: {
  title: string;
  items: ContentRow[];
  accent: string;
  listMode: boolean;
  currentTrackId?: string;
  isPlaying: boolean;
  onOpen: (item: ContentRow) => void;
  onPlay: (item: ContentRow) => void;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = usePluggdTheme();
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadingRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${actionLabel} ${title}`} onPress={onAction} hitSlop={8} style={styles.sectionAction}>
            <Text style={[styles.sectionActionText, { color: accent }]}>{actionLabel}</Text>
            <MaterialIcons name="chevron-right" size={19} color={accent} />
          </Pressable>
        ) : <Text style={[styles.sectionCount, { color: theme.colors.textMuted }]}>{items.length}</Text>}
      </View>
      {listMode ? (
        <View style={[styles.contentList, { borderColor: theme.colors.border }]}>
          {items.map((item) => {
            const active = Boolean(item.track && item.track.id === currentTrackId);
            return (
              <View key={item.id} style={[styles.contentListRow, { borderTopColor: theme.colors.divider }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => onOpen(item)} style={styles.contentListMain}>
                  <View style={[styles.listArtwork, { backgroundColor: theme.colors.surfaceAlt }]}>
                    {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.artworkImage} /> : <MaterialIcons name={item.icon} size={25} color={accent} />}
                  </View>
                  <View style={styles.listCopy}>
                    {item.badge ? <Text style={[styles.contentBadge, { color: accent }]}>{item.badge}</Text> : null}
                    <Text style={[styles.listTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.contentMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.creator || item.meta}</Text>
                    <View style={styles.contentDetails}>
                      {item.genre ? <View style={[styles.contentGenrePill, { backgroundColor: theme.colors.surfaceAlt }]}><Text style={[styles.contentGenreText, { color: theme.colors.text }]}>{item.genre}</Text></View> : null}
                      {item.format ? <Text style={[styles.contentDetailText, { color: theme.colors.textMuted }]}>{item.format}</Text> : null}
                      {item.explicit ? <View style={styles.contentExplicitPill}><Text style={styles.contentExplicitText}>18+</Text></View> : null}
                      {item.priceLabel ? <Text style={[styles.contentPrice, { color: accent }]}>{item.priceLabel}</Text> : null}
                    </View>
                  </View>
                </Pressable>
                {item.track || item.locked ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={item.locked ? `Unlock ${item.title}` : active && isPlaying ? `Pause ${item.title}` : `Play ${item.title}`} hitSlop={1} onPress={() => onPlay(item)} style={[styles.rowPlay, { backgroundColor: accent }]}>
                    <MaterialIcons name={item.locked ? 'lock' : active && isPlaying ? 'pause' : 'play-arrow'} size={21} color="#0A0806" />
                  </Pressable>
                ) : <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />}
              </View>
            );
          })}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contentRail}>
          {items.map((item) => {
            const active = Boolean(item.track && item.track.id === currentTrackId);
            return (
              <View key={item.id} style={styles.contentCard}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => onOpen(item)}>
                  <View style={[styles.artwork, { backgroundColor: theme.colors.surfaceAlt }]}>
                    {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.artworkImage} /> : <MaterialIcons name={item.icon} size={30} color={accent} />}
                    {item.badge ? <View style={[styles.cardBadge, { backgroundColor: accent }]}><Text style={styles.cardBadgeText}>{item.badge}</Text></View> : null}
                  </View>
                  <Text style={[styles.contentTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                  <Text style={[styles.contentMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.creator || item.meta}</Text>
                  {item.priceLabel ? <Text style={[styles.contentPrice, { color: accent }]}>{item.priceLabel}</Text> : null}
                </Pressable>
                {item.track || item.locked ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={item.locked ? `Unlock ${item.title}` : active && isPlaying ? `Pause ${item.title}` : `Play ${item.title}`} hitSlop={3} onPress={() => onPlay(item)} style={[styles.cardPlay, { backgroundColor: accent }]}>
                    <MaterialIcons name={item.locked ? 'lock' : active && isPlaying ? 'pause' : 'play-arrow'} size={20} color="#0A0806" />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.aboutRow, { borderTopColor: theme.colors.divider }]}>
      <Text style={[styles.aboutLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.aboutValue, { color: theme.colors.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  statusScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: 176,
    alignItems: 'stretch',
  },
  centerState: {
    minHeight: 520,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  stateTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 21,
    fontWeight: '800',
  },
  stateText: { fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '600',
  },
  unavailableScreen: {
    minHeight: 710,
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 44,
  },
  unavailableCopy: {
    maxWidth: 335,
  },
  unavailableEyebrow: {
    color: PLUGGD_ORANGE,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  unavailableTitle: {
    marginTop: 9,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 36,
    lineHeight: 41,
    fontWeight: '900',
    letterSpacing: -1.25,
  },
  unavailableBody: {
    marginTop: 13,
    maxWidth: 325,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  unavailableSignal: {
    minHeight: 106,
    marginTop: 34,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  unavailableSignalIcon: {
    width: 54,
    height: 54,
    borderRadius: 5,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableSignalCopy: {
    flex: 1,
    minWidth: 0,
  },
  unavailableSignalTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
  },
  unavailableSignalBody: {
    marginTop: 4,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  unavailableActions: {
    marginTop: 24,
    gap: 10,
  },
  unavailablePrimary: {
    minHeight: 52,
    borderRadius: 5,
    paddingHorizontal: 17,
    backgroundColor: PLUGGD_ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unavailablePrimaryText: {
    color: '#0A0806',
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 15,
    fontWeight: '900',
  },
  unavailableSecondary: {
    minHeight: 48,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableSecondaryText: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 14,
    fontWeight: '800',
  },
  cover: {
    height: 238,
    overflow: 'hidden',
  },
  coverCompact: {
    height: 198,
  },
  coverWithoutArtwork: {
    height: 178,
  },
  coverWithoutArtworkCompact: {
    height: 154,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverMotionLayer: {
    position: 'absolute',
    top: -24,
    right: -8,
    bottom: -24,
    left: -8,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 54,
    width: 44,
    height: 44,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyButton: {
    position: 'absolute',
    right: 16,
    top: 54,
    width: 44,
    height: 44,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBlock: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginTop: -52,
  },
  profileBlockCompact: {
    paddingBottom: 2,
  },
  profileBlockWithoutArtwork: {
    marginTop: -40,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 13,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 27,
    fontWeight: '800',
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: { fontFamily: pluggdFonts.displayExtraBold,
    flexShrink: 1,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  handle: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  locationText: { flexShrink: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 17 },
  profileSignals: { minHeight: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 },
  profileSignalText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11.5, lineHeight: 16 },
  signalDot: { width: 3, height: 3, borderRadius: 2 },
  heroBio: {
    maxWidth: 460,
    marginTop: 15,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  heroIdentityPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  heroIdentityPill: {
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIdentityPillText: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
  },
  followButton: {
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 14,
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 17,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bio: { fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 11,
  },
  primaryActions: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 18,
  },
  listenButton: {
    flexGrow: 1.12,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: 999,
    overflow: 'hidden',
  },
  listenButtonFill: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  listenButtonText: {
    color: '#0A0806',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 13.5,
    fontWeight: '900',
  },
  actionInlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  actionDisabled: { opacity: 0.54 },
  moreButton: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 26,
    gap: 10,
  },
  storyRailWrap: {
    marginTop: 22,
  },
  tabRail: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  tabRailCompact: { marginTop: 6 },
  tabContentCompact: { marginTop: -4 },
  profileTab: {
    flexGrow: 1,
    flexBasis: 0,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  moreTab: { flexGrow: 0.78 },
  profileTabContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  profileTabIndicator: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: -1,
    height: 2,
    borderRadius: 1,
  },
  profileTabText: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11.5,
  },
  sectionTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 23,
    fontWeight: '800',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionAction: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 },
  sectionActionText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  sectionCount: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12,
  },
  contentRail: {
    gap: 12,
    paddingRight: 16,
  },
  contentCard: {
    width: 156,
    paddingBottom: 9,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  contentTitle: { fontFamily: pluggdFonts.displayBold,
    marginTop: 9,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  contentMeta: { fontFamily: pluggdFonts.satoshiBold,
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  contentDetails: { minHeight: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 6 },
  contentGenrePill: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  contentGenreText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5 },
  contentDetailText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10 },
  contentExplicitPill: { borderWidth: 1, borderColor: '#F04444', borderRadius: 9, paddingHorizontal: 5, paddingVertical: 1 },
  contentExplicitText: { color: '#F04444', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8 },
  contentPrice: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 10.5, marginTop: 4 },
  contentBadge: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  cardBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  cardBadgeText: {
    color: '#0A0806',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 8,
    letterSpacing: 0.55,
  },
  cardPlay: {
    position: 'absolute',
    right: 7,
    top: 112,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0A0806',
  },
  contentList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  contentListRow: {
    minHeight: 94,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
  },
  contentListMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listArtwork: {
    width: 72,
    height: 72,
    borderRadius: 5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCopy: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 16,
    lineHeight: 20,
  },
  rowPlay: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogNotice: {
    minHeight: 76,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 5,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  catalogNoticeCopy: { flex: 1, minWidth: 0 },
  catalogNoticeTitle: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  catalogNoticeBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17, marginTop: 3 },
  featureSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  featureSectionLabel: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.35, marginBottom: 7 },
  featureCard: {
    minHeight: 180,
    borderRadius: 7,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 10,
    flexDirection: 'row',
    gap: 13,
  },
  featureArtworkWrap: { width: 124, height: 160, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  featureArtwork: {
    width: '100%',
    height: '100%',
  },
  featureArtworkBadge: { position: 'absolute', left: 7, top: 7, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 4 },
  featureArtworkBadgeText: { color: '#0A0806', fontFamily: pluggdFonts.satoshiBlack, fontSize: 7.5, letterSpacing: 0.55 },
  featureBody: { flex: 1, minWidth: 0, paddingVertical: 5 },
  featureEyebrow: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.05,
  },
  featureTitle: {
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 23,
    lineHeight: 26,
    marginTop: 5,
  },
  featureMeta: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  featurePills: { minHeight: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 },
  featurePill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  featurePillText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10 },
  featureFormat: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5 },
  explicitPill: { borderWidth: 1, borderColor: '#F04444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  explicitPillText: { color: '#F04444', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9 },
  featureActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 'auto', paddingTop: 8 },
  featurePlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureViewAction: { minHeight: 44, flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  featureViewCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  featureViewText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  featurePrice: { fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5, marginTop: 1 },
  membershipSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  membershipPanel: {
    borderRadius: 7,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 18,
    minHeight: 344,
  },
  membershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  membershipIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipHeaderCopy: { flex: 1, minWidth: 0 },
  membershipEyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, lineHeight: 12, letterSpacing: 0.9 },
  membershipTitle: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 23, lineHeight: 27, marginTop: 3 },
  membershipBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20, marginTop: 14 },
  membershipEvidence: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  membershipPrice: { fontFamily: pluggdFonts.displayBold, fontSize: 18 },
  membershipEvidenceDot: { width: 3, height: 3, borderRadius: 2 },
  membershipMembers: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  membershipFeatures: { marginTop: 14, gap: 9 },
  membershipFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  membershipFeatureText: { flex: 1, fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 18 },
  membershipButton: { minHeight: 50, borderRadius: 5, marginTop: 26, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  membershipButtonText: { color: '#0A0806', fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  actionSheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  actionSheet: { maxHeight: '82%', borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10 },
  actionSheetHandle: { width: 42, height: 4, borderRadius: 2, opacity: 0.48, alignSelf: 'center' },
  actionSheetHeading: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12 },
  actionSheetHeadingCopy: { flex: 1, minWidth: 0 },
  actionSheetEyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.3 },
  actionSheetTitle: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 25, lineHeight: 29, marginTop: 3 },
  actionSheetClose: { width: 44, height: 44, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  actionSheetScroll: { flexGrow: 0 },
  actionSheetActions: { paddingBottom: 6 },
  actionSheetRow: { minHeight: 70, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  actionSheetIcon: { width: 42, height: 42, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  actionSheetCopy: { flex: 1, minWidth: 0 },
  actionSheetLabel: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, lineHeight: 18 },
  actionSheetDescription: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  listeningBar: { minHeight: 72, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', padding: 8 },
  listeningArtwork: { width: 52, height: 52, borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  listeningAction: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  listeningPlay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  listeningActionText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  listeningDivider: { width: StyleSheet.hairlineWidth, height: 36 },
  listeningSearch: { flex: 0.86, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  listeningSearchText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  musicToolbarSection: { marginTop: 20, paddingHorizontal: 16 },
  musicToolbarHeading: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  musicToolbarEyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.25 },
  musicToolbarTitle: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 23, lineHeight: 27, marginTop: 2 },
  musicToolbarPlay: { minHeight: 46, borderRadius: 5, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
  musicToolbarPlayText: { color: '#0A0806', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  searchField: { height: 54, borderWidth: 1, borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, marginTop: 10 },
  searchFieldArtwork: { width: 34, height: 34, borderRadius: 3 },
  searchInput: { flex: 1, minWidth: 0, height: 52, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13 },
  fanActionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 18 },
  fanActionSlot: { overflow: 'hidden' },
  fanActionCard: { width: '100%', minHeight: 128, borderWidth: 1, borderRadius: 7, padding: 12, overflow: 'hidden' },
  fanActionCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fanActionIcon: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  fanActionTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 15.5, lineHeight: 19, marginTop: 10 },
  fanActionBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  communityCallout: { minHeight: 96, marginHorizontal: 16, marginTop: 18, borderWidth: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  communityIcon: { width: 54, height: 54, borderWidth: 1, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  communityCalloutCopy: { flex: 1, minWidth: 0 },
  communityCalloutTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 22 },
  communityCalloutBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  communityCalloutMeta: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 0.35, marginTop: 5 },
  searchEmpty: { minHeight: 126, marginHorizontal: 16, marginTop: 20, borderTopWidth: 1, borderBottomWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  searchEmptyTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 17, marginTop: 8 },
  searchEmptyBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, marginTop: 4 },
  selectedGalleryCard: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  selectedGalleryImage: {
    width: '100%',
    aspectRatio: 1.18,
    borderRadius: 5,
    backgroundColor: '#171717',
  },
  selectedGalleryTitle: { fontFamily: pluggdFonts.displayBold,
    marginTop: 12,
    fontSize: 18,
    fontWeight: '900',
  },
  selectedGalleryMeta: { fontFamily: pluggdFonts.satoshiBold,
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  emptyCard: {
    minHeight: 58,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 14,
  },
  emptyText: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  aboutSection: { paddingHorizontal: 16, marginTop: 24, gap: 18 },
  aboutCard: { borderWidth: 1, borderRadius: 7, padding: 16 },
  aboutCopy: {
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 14,
    lineHeight: 21,
  },
  genrePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  genrePill: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
  genrePillText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5 },
  aboutRows: {
    marginTop: 14,
  },
  aboutRow: {
    minHeight: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aboutLabel: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    fontWeight: '700',
  },
  aboutValue: { fontFamily: pluggdFonts.satoshiBold,
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '800',
  },
  aboutSubheading: { fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 22, marginBottom: 9 },
  aboutStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aboutStat: { width: '31.7%', minHeight: 76, borderWidth: 1, borderRadius: 5, padding: 10, justifyContent: 'center' },
  aboutStatValue: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 20, lineHeight: 23 },
  aboutStatLabel: { fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5, lineHeight: 13, textTransform: 'uppercase', marginTop: 4 },
  profileLinks: { borderTopWidth: 1, borderBottomWidth: 1 },
  profileLinkRow: { minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 11 },
  profileLinkLabel: { flex: 1, fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
});
