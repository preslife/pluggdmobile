import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text as NativeText,
  TextInput,
  type TextProps,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { AccountMenuButton } from '../../../components/AccountMenuButton';
import { PluggdGlassSurface } from '../../../components/PluggdPrimitives';
import { GlassPanel } from '../../../components/liquid-glass';
import { PluggdImage } from '../../components/PluggdImage';
import { usePlayback } from '../../context/PlaybackProvider';
import { selectionHaptic } from '../../design/haptics';
import { pluggdFonts, pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { formatCompact } from '../../lib/mobileContent';
import { PLATFORM_PLANS, usePlatformPlanEntitlement } from '../../hooks/usePlatformSubscription';
import { SplitEngineListPanel } from './SplitEngineScreens';
import {
  loadStudioAnalytics,
  type StudioAnalyticsOverview,
  type StudioAnalyticsRange,
} from './studioAnalyticsService';
import { STUDIO } from './studio-tokens';
import {
  loadStudioData,
  buildEmbeddedStudioRoute,
  createStudioPreviewData,
  setStudioModulePlugged,
  studioCreatorName,
  type StudioAction,
  type StudioCatalogItem,
  type StudioData,
  type StudioModuleSection,
  type StudioModuleState,
} from './studio-data';
import {
  loadOwnedReleaseLyricsWorkspace,
  parseLrcLyrics,
  plainLyricLines,
  publishOwnedTrackLyrics,
  savePrivateTrackLyricsDraft,
  tapSyncLines,
  type LyricSource,
  type OwnedLyricsTrack,
  type TimedLyricLine,
} from './trackLyricsAuthoring';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';

type StudioRouteKey = 'home' | 'apps' | 'action' | 'analytics' | 'my-pluggd' | 'connect-card' | 'more';
type MyPluggdSectionId = 'overview' | 'profile' | 'page' | 'connect-card' | 'embeds' | 'settings';
type MyPluggdSection = {
  id: Exclude<MyPluggdSectionId, 'overview'>;
  title: string;
  shortTitle: string;
  route: string;
  icon: string;
  complete: boolean;
  missing: string[];
  progressLabel: string;
  cta: string;
  summary: string;
};

type MobileCommandAction = {
  id: string;
  title: string;
  route: string;
  icon: string;
  primary?: boolean;
};

type StudioMenuItem = {
  id: string;
  title: string;
  route: string;
  icon: string;
};

type StudioMenuSection = {
  section: StudioModuleSection;
  title: string;
  items: StudioMenuItem[];
};

const QUERY_KEY = ['studio', 'native-command'] as const;

/**
 * Studio is intentionally information-dense. Keep Dynamic Type useful without
 * allowing one label to consume an entire operational surface at the largest
 * accessibility settings.
 */
function Text({ maxFontSizeMultiplier = 1.25, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

const SECTION_LABELS: Record<StudioModuleSection, string> = {
  create: 'Create',
  catalog: 'Catalog',
  growth: 'Growth',
  connect: 'Connect',
  money: 'Money',
  operations: 'Operations',
  commerce: 'Commerce',
  account: 'Account',
};

const SECTION_ORDER: StudioModuleSection[] = [
  'create',
  'catalog',
  'growth',
  'connect',
  'money',
  'operations',
  'commerce',
  'account',
];

const ROLE_LABELS: Record<string, string> = {
  artist: 'Artist',
  producer: 'Producer',
  dj: 'DJ',
  promoter: 'Promoter',
  venue: 'Venue',
  curator: 'Curator',
  service_provider: 'Service',
  manager: 'Manager',
  fan: 'Fan',
};

const DOCK_ITEMS: Array<{ key: StudioRouteKey; label: string; route: string; icon: string }> = [
  { key: 'home', label: 'Home', route: '/studio', icon: 'home' },
  { key: 'apps', label: 'Apps', route: '/studio/apps', icon: 'apps' },
  { key: 'action', label: 'Create', route: '/studio/action', icon: 'add' },
  { key: 'analytics', label: 'Insights', route: '/studio/analytics', icon: 'insights' },
  { key: 'more', label: 'More', route: '/studio/more', icon: 'more-horiz' },
];

const STUDIO_MENU_NATIVE_ROUTE_PATHS = new Set([
  '/creator/events',
  '/creator/upload',
  '/live/create',
  '/market',
  '/market/store',
  '/membership',
  '/profile',
  '/sample-packs',
  '/settings/privacy',
  '/studio/analytics',
  '/studio/browser',
  '/studio/catalog',
  '/studio/commerce',
  '/studio/connect-card',
  '/studio/connect-card/edit',
  '/studio/financials',
  '/studio/my-pluggd',
  '/studio/splits',
  '/studio/videos',
  '/wallet',
]);

const MY_PLUGGD_TABS: Array<{ id: MyPluggdSectionId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'page', label: 'Page' },
  { id: 'connect-card', label: 'Card' },
  { id: 'embeds', label: 'Embeds' },
  { id: 'settings', label: 'Settings' },
];

function primaryUploadModuleId(role: StudioData['primaryRole']) {
  if (role === 'producer') return 'upload_beat';
  if (role === 'dj') return 'upload_mix';
  return 'upload_release';
}

function primaryCatalogModuleId(role: StudioData['primaryRole']) {
  if (role === 'producer') return 'beats';
  if (role === 'dj') return 'mixes';
  return 'releases';
}

function buildMobileCommandActions(data: StudioData): MobileCommandAction[] {
  const modulesById = new Map(data.modules.map((module) => [module.id, module]));
  const primaryModule = modulesById.get(primaryUploadModuleId(data.primaryRole));
  return [
    {
      id: 'primary-upload',
      title: primaryModule?.title || 'Upload Release',
      route: primaryModule?.route || '/studio/apps',
      icon: primaryModule?.icon || 'cloud-upload',
      primary: true,
    },
    {
      id: 'cash',
      title: 'Check cash',
      route: '/wallet',
      icon: 'attach-money',
    },
    {
      id: 'live',
      title: 'Go live',
      route: '/live/create',
      icon: 'radio',
    },
    {
      id: 'apps',
      title: 'Apps',
      route: '/studio/apps',
      icon: 'power',
    },
  ];
}

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

function initials(value?: string | null) {
  return (value || 'PL')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function routePush(router: ReturnType<typeof useRouter>, route?: string) {
  if (!route) return;
  selectionHaptic();
  router.push(route as any);
}

function studioMenuRoutePath(route: string) {
  return route.split('?')[0]?.split('#')[0] || route;
}

export function buildNativeStudioMenuSections(data: StudioData): StudioMenuSection[] {
  const seenRoutes = new Set<string>();

  return SECTION_ORDER.flatMap((section) => {
    const items = data.modules
      .filter((module) => module.section === section)
      .filter((module) => Boolean(module.route))
      .filter((module) => module.plugged || module.alwaysVisible)
      .filter((module) => module.id !== 'studio_apps')
      .flatMap((module) => {
        const route = module.route as string;
        const routePath = studioMenuRoutePath(route);
        if (!STUDIO_MENU_NATIVE_ROUTE_PATHS.has(routePath) || seenRoutes.has(route)) return [];
        seenRoutes.add(route);
        return [{ id: module.id, title: module.title, route, icon: module.icon }];
      });

    return items.length > 0
      ? [{ section, title: SECTION_LABELS[section], items }]
      : [];
  });
}

function hasText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function recordValue(record: unknown, key: string) {
  return typeof record === 'object' && record !== null && !Array.isArray(record)
    ? (record as Record<string, unknown>)[key]
    : undefined;
}

function buildMyPluggdSections(data: StudioData): MyPluggdSection[] {
  const profile = data.profile;
  const embedSettings = recordValue(profile?.embed_settings, 'storefront');
  const socials = recordValue(profile?.embed_settings, 'socials');
  const sectionOrder = recordValue(embedSettings, 'sectionOrder');
  const customLinks = recordValue(embedSettings, 'customLinks');
  const profileMissing = [
    !hasText(profile?.username) && !hasText(profile?.display_name) && !hasText(profile?.full_name) ? 'name' : null,
    !hasText(profile?.bio) ? 'bio' : null,
    !hasText(profile?.avatar_url) ? 'avatar' : null,
    !hasText(profile?.cover_image_url) ? 'cover' : null,
  ].filter(Boolean) as string[];
  const hasPageUrl = hasText(profile?.custom_url) || hasText(profile?.username);
  const hasPageAppearance = hasText(profile?.cover_image_url) || hasText(profile?.avatar_url);
  const hasPageSections = data.stats.catalogCount > 0 || (Array.isArray(sectionOrder) && sectionOrder.length > 0);
  const pageMissing = [
    !hasPageUrl ? 'public URL' : null,
    !hasPageAppearance ? 'appearance' : null,
    !hasPageSections ? 'sections' : null,
  ].filter(Boolean) as string[];
  const hasShareContact =
    hasText(profile?.website_url) ||
    hasText(profile?.instagram_url) ||
    hasText(profile?.twitter_url) ||
    hasText(profile?.youtube_url) ||
    hasText(profile?.tiktok_url) ||
    hasText(profile?.soundcloud_url) ||
    hasText(profile?.spotify_url) ||
    (typeof socials === 'object' && socials !== null && Object.values(socials as Record<string, unknown>).some(hasText));
  const embedsMissing = [
    !hasShareContact ? 'share contact' : null,
    !(Array.isArray(customLinks) && customLinks.length > 0) ? 'custom links' : null,
  ].filter(Boolean) as string[];
  return [
    {
      id: 'profile',
      title: 'Profile',
      shortTitle: 'Profile',
      route: '/edit-profile',
      icon: 'person',
      complete: profileMissing.length === 0,
      missing: profileMissing,
      progressLabel: `${4 - profileMissing.length}/4 core signals`,
      cta: profileMissing.length === 0 ? 'Review profile' : 'Finish profile',
      summary: 'Identity, bio, avatar, cover, socials, gallery, and SEO.',
    },
    {
      id: 'page',
      title: 'Page',
      shortTitle: 'Page',
      route: buildEmbeddedStudioRoute('/studio/my-pluggd/page', 'Public Page Builder', '/studio/my-pluggd'),
      icon: 'storefront',
      complete: pageMissing.length === 0,
      missing: pageMissing,
      progressLabel: `${3 - pageMissing.length}/3 page signals`,
      cta: pageMissing.length === 0 ? 'Edit page' : 'Build page',
      summary: 'Theme, sections, banner, featured presentation, and public storefront.',
    },
    {
      id: 'connect-card',
      title: 'Connect Card',
      shortTitle: 'Card',
      route: '/studio/connect-card/edit',
      icon: 'badge',
      complete: Boolean(data.connectProfile?.slug),
      missing: data.connectProfile?.slug ? [] : ['connect identity'],
      progressLabel: data.connectProfile?.slug ? 'Card profile ready' : 'Not configured',
      cta: data.connectProfile?.slug ? 'Edit card' : 'Set up card',
      summary: 'Public, business, rates, collaborator, and private sharing views.',
    },
    {
      id: 'embeds',
      title: 'Embeds & Share Tools',
      shortTitle: 'Embeds',
      route: buildEmbeddedStudioRoute('/studio/my-pluggd/embeds', 'Embeds & Share Tools', '/studio/my-pluggd'),
      icon: 'ios-share',
      complete: embedsMissing.length === 0,
      missing: embedsMissing,
      progressLabel: `${2 - embedsMissing.length}/2 share signals`,
      cta: embedsMissing.length === 0 ? 'Review embeds' : 'Finish share setup',
      summary: 'Player embeds, share links, preview, and external distribution surfaces.',
    },
    {
      id: 'settings',
      title: 'Studio Settings',
      shortTitle: 'Settings',
      route: buildEmbeddedStudioRoute('/studio/my-pluggd/settings', 'Studio Settings', '/studio/my-pluggd'),
      icon: 'settings',
      complete: true,
      missing: [],
      progressLabel: 'Operational settings available',
      cta: 'Review settings',
      summary: 'Team, legal vault, release docs, rewards, defaults, notifications, and integrations.',
    },
  ];
}

function useStudioQuery() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: loadStudioData,
    staleTime: 1000 * 45,
  });
}

function HeaderAvatar({ data }: { data: StudioData }) {
  const theme = usePluggdTheme();
  const name = studioCreatorName(data);
  const avatar = data.connectProfile?.avatar_url || data.profile?.avatar_url;
  if (avatar) {
    return <PluggdImage uri={avatar} style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt }]} accessibilityLabel={name} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.avatarText, { color: theme.colors.text }]}>{initials(name)}</Text>
    </View>
  );
}

function StudioExitButton() {
  const router = useRouter();
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Exit Studio"
      accessibilityHint="Returns to the PLUGGD home screen"
      onPress={() => {
        selectionHaptic();
        router.replace('/' as any);
      }}
      style={[
        styles.studioExitButton,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.controlBorder,
        },
      ]}
    >
      <MaterialIcons name="arrow-back" size={20} color={theme.colors.text} />
    </Pressable>
  );
}

function StudioMenuButton({ data }: { data: StudioData }) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const sections = useMemo(() => buildNativeStudioMenuSections(data), [data]);
  const closeMenu = () => setOpen(false);

  const navigate = (route: string) => {
    closeMenu();
    routePush(router, route);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Studio menu"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          selectionHaptic();
          setOpen(true);
        }}
        style={styles.studioMenuTap}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.studioMenuButton,
              {
                backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.accentSoft,
                borderColor: theme.colors.borderAccent,
              },
            ]}
          >
            <MaterialIcons name="view-sidebar" size={19} color={theme.colors.text} />
          </View>
        )}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <View style={[styles.studioMenuOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Pressable
            accessible={false}
            importantForAccessibility="no"
            onPress={closeMenu}
            style={styles.studioMenuBackdrop}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.studioMenuDrawer,
              {
                width: Math.min(width * 0.88, 380),
                paddingTop: Math.max(insets.top, 18),
                paddingBottom: Math.max(insets.bottom, 16),
                backgroundColor: theme.colors.backgroundDeep,
                borderRightColor: theme.colors.borderStrong,
                shadowColor: theme.colors.shadow,
              },
            ]}
          >
            <View style={[styles.studioMenuHeader, { borderBottomColor: theme.colors.divider }]}>
              <View>
                <Text style={[styles.studioMenuEyebrow, { color: theme.colors.accent }]}>PLUGGD STUDIO</Text>
                <Text style={[styles.studioMenuTitle, { color: theme.colors.text }]}>Workspace menu</Text>
              </View>
              <Pressable
                accessible
                accessibilityRole="button"
                accessibilityLabel="Close Studio menu"
                accessibilityHint="Closes the Studio section menu without leaving this screen"
                onPress={closeMenu}
                style={[
                  styles.studioMenuClose,
                  {
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.controlBorder,
                  },
                ]}
              >
                <MaterialIcons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.studioMenuScroll}
              contentContainerStyle={styles.studioMenuScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Studio Home"
                accessibilityState={{ selected: pathname === '/studio' }}
                onPress={() => navigate('/studio')}
                style={[
                  styles.studioMenuItem,
                  pathname === '/studio' && styles.studioMenuItemActive,
                  pathname === '/studio' && {
                    backgroundColor: theme.colors.accentSoft,
                    borderColor: theme.colors.borderAccent,
                  },
                ]}
              >
                <View
                  style={[
                    styles.studioMenuItemIcon,
                    { backgroundColor: theme.colors.surfaceAlt },
                    pathname === '/studio' && styles.studioMenuItemIconActive,
                    pathname === '/studio' && { backgroundColor: theme.colors.accentFill },
                  ]}
                >
                  <MaterialIcons name="home" size={20} color={pathname === '/studio' ? theme.colors.onAccent : theme.colors.textMuted} />
                </View>
                <Text
                  style={[
                    styles.studioMenuItemLabel,
                    { color: theme.colors.text },
                    pathname === '/studio' && styles.studioMenuItemLabelActive,
                    pathname === '/studio' && { color: theme.colors.accent },
                  ]}
                >
                  Home
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={theme.colors.textSubtle} />
              </Pressable>
              {sections.map((section) => (
                <View key={section.section} style={styles.studioMenuSection}>
                  <Text style={[styles.studioMenuSectionLabel, { color: theme.colors.textSubtle }]}>{section.title}</Text>
                  {section.items.map((item) => {
                    const active = pathname === studioMenuRoutePath(item.route);
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={item.title}
                        accessibilityState={{ selected: active }}
                        onPress={() => navigate(item.route)}
                        style={[
                          styles.studioMenuItem,
                          active && styles.studioMenuItemActive,
                          active && {
                            backgroundColor: theme.colors.accentSoft,
                            borderColor: theme.colors.borderAccent,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.studioMenuItemIcon,
                            { backgroundColor: theme.colors.surfaceAlt },
                            active && styles.studioMenuItemIconActive,
                            active && { backgroundColor: theme.colors.accentFill },
                          ]}
                        >
                          <MaterialIcons name={iconName(item.icon)} size={20} color={active ? theme.colors.onAccent : theme.colors.textMuted} />
                        </View>
                        <Text
                          style={[
                            styles.studioMenuItemLabel,
                            { color: theme.colors.text },
                            active && styles.studioMenuItemLabelActive,
                            active && { color: theme.colors.accent },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <MaterialIcons name="chevron-right" size={20} color={theme.colors.textSubtle} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function StudioTopBar({ data, title }: { data: StudioData; title: string }) {
  const theme = usePluggdTheme();
  const accountMenuLabel = data.profile?.username
    ? `Open Studio account menu for @${data.profile.username}`
    : 'Open Studio account menu';
  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: theme.colors.headerGlass,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      <View style={styles.studioTopLeft}>
        <StudioExitButton />
        {data.creatorAccess ? <StudioMenuButton data={data} /> : null}
      </View>
      <View style={styles.studioBrand}>
        <Text style={[styles.studioBrandPlug, { color: theme.colors.accent }]}>PLUGGD</Text>
        <Text style={{ color: theme.colors.text }} numberOfLines={1}>
          <Text style={styles.studioBrandTitle} numberOfLines={1}>STUDIO</Text>
        </Text>
      </View>
      {/* The handle used to render beside the avatar in a fixed 116pt pill, so
          even a short username clipped to "@ju…" on every Studio screen. The
          avatar already identifies the account and the chevron already says it
          opens; the name lives in the menu itself. */}
      <AccountMenuButton context="studio"
        accessibilityLabel={accountMenuLabel}
        style={[
          styles.studioAccountPill,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.controlBorder,
          },
        ]}
      >
        {() => (
          <>
            <HeaderAvatar data={data} />
            <MaterialIcons name="expand-more" size={16} color={theme.colors.textMuted} />
          </>
        )}
      </AccountMenuButton>
    </View>
  );
}

function StudioDock({ active }: { active: StudioRouteKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  return (
    <View
      pointerEvents="box-none"
      accessible={false}
      collapsable={false}
      style={[styles.dockWrap, { paddingBottom: Math.max(8, insets.bottom + 4) }]}
    >
      <View style={styles.dock}>
        <PluggdGlassSurface
          glassEffectStyle="regular"
          colorScheme={theme.scheme}
          blurIntensity={64}
          tintColor={theme.colors.glassTint}
          fallbackColor={theme.colors.glassFallback}
          borderColor={theme.colors.controlBorder}
          disabled={false}
          style={styles.dockGlass}
        />
        <View accessible={false} collapsable={false} style={styles.dockInner}>
          {DOCK_ITEMS.map((item) => {
          const isActive = item.key === active;
          const isAction = item.key === 'action';
          if (isAction) {
            return (
              <Pressable
                key={item.key}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Studio Create"
                accessibilityHint="Opens creator actions"
                accessibilityState={{ selected: isActive }}
                onPress={() => routePush(router, item.route)}
                style={styles.dockCreateTap}
              >
                <LinearGradient
                  colors={[theme.colors.accentFill, theme.colors.accentFill]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dockCreateButton}
                >
                  <View style={styles.dockCreateIcon}>
                    <MaterialIcons name="add" size={24} color={theme.colors.onAccent} />
                  </View>
                  <Text style={[styles.dockCreateLabel, { color: theme.colors.onAccent }]}>Create</Text>
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={item.key}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Studio ${item.label}`}
              accessibilityHint={`Opens the ${item.label} Studio section`}
              accessibilityState={{ selected: isActive }}
              onPress={() => routePush(router, item.route)}
              style={styles.dockItem}
            >
              <View
                style={[
                  styles.dockItemInner,
                  isActive && styles.dockItemActive,
                  isActive && { backgroundColor: theme.colors.accentSoft },
                ]}
              >
                <View
                  style={[
                    styles.dockIconShell,
                    isActive && styles.dockIconActive,
                    isActive && { backgroundColor: theme.colors.accentSoft },
                  ]}
                >
                  <MaterialIcons name={iconName(item.icon)} size={22} color={isActive ? theme.colors.accent : theme.colors.textMuted} />
                </View>
                <Text style={[styles.dockLabel, { color: isActive ? theme.colors.accent : theme.colors.textMuted }]} numberOfLines={1}>
                  {item.label}
                </Text>
                {isActive ? <View style={[styles.dockActiveSignal, { backgroundColor: theme.colors.accentFill }]} /> : null}
              </View>
            </Pressable>
          );
          })}
        </View>
      </View>
    </View>
  );
}

function StudioShell({
  active,
  title,
  children,
  data,
  refreshing,
  onRefresh,
  showDock = true,
}: {
  active: StudioRouteKey;
  title: string;
  children: ReactNode;
  data: StudioData;
  refreshing: boolean;
  onRefresh: () => void;
  showDock?: boolean;
}) {
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        key={pathname}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(10, insets.top + 8),
            paddingBottom: showDock ? Math.max(146, insets.bottom + 132) : Math.max(32, insets.bottom + 24),
          },
        ]}
      >
        <StudioTopBar data={data} title={title} />
        {__DEV__ && data.userId === 'studio-preview' ? (
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel="Simulator preview data. Not your account."
            style={styles.previewDataNotice}
          >
            <MaterialIcons name="visibility" size={15} color={STUDIO.orangeSoft} />
            <Text style={styles.previewDataNoticeText}>PREVIEW DATA · NOT YOUR ACCOUNT</Text>
          </View>
        ) : null}
        {children}
      </ScrollView>
      {showDock ? <StudioDock active={active} /> : null}
    </View>
  );
}

function LoadingState({ title }: { title: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.root, styles.centered, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={[styles.stateText, { color: theme.colors.textMuted }]}>Loading Studio...</Text>
    </View>
  );
}

function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.root, styles.centered, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <MaterialIcons name="error-outline" size={28} color={theme.colors.danger} />
      <Text selectable style={[styles.stateTitle, { color: theme.colors.text }]}>Studio unavailable</Text>
      <Text selectable style={[styles.stateText, { color: theme.colors.textMuted }]}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.primaryButton, { backgroundColor: theme.colors.accentFill }]}>
        <Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

function AccessState({ data, active, title }: { data: StudioData; active: StudioRouteKey; title: string }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  const action = data.signedIn
    ? { label: 'Choose roles', route: '/auth/role', icon: 'admin-panel-settings' }
    : { label: 'Sign in', route: '/auth/login', icon: 'login' };
  return (
    <StudioShell active={active} title={title} data={data} refreshing={false} onRefresh={() => undefined} showDock={false}>
      <LinearGradient
        colors={['rgba(255,106,0,0.28)', 'rgba(255,255,255,0.075)', 'rgba(4,4,5,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.accessHero}
      >
        <View pointerEvents="none" style={styles.accessGlow} />
        <View style={styles.accessHeroTop}>
          <View style={styles.accessHeroIcon}>
            <MaterialIcons name="graphic-eq" size={26} color={STUDIO.orange} />
          </View>
          <StatusChip label="Creator workspace" tone="limited" />
        </View>
        <Text style={styles.accessEyebrow}>YOUR WORK, IN MOTION</Text>
        <Text style={styles.accessHeroTitle}>
          Build, read the signal,{'\n'}move the catalog.
        </Text>
        <Text style={styles.accessHeroBody}>
          Upload drafts, catalog health, audience signals and launch controls in one focused mobile workspace.
        </Text>
        <View style={styles.accessHeroActions}>
          <Pressable accessibilityRole="button" onPress={() => routePush(router, action.route)} style={styles.accessPrimary}>
            <Text style={styles.accessPrimaryText}>{action.label}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#130A04" />
          </Pressable>
          {!data.signedIn ? (
            <Pressable accessibilityRole="button" onPress={() => routePush(router, '/auth/signup')} style={styles.accessSecondary}>
              <Text style={styles.accessSecondaryText}>Create account</Text>
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>

      <View>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionKicker}>STUDIO ON MOBILE</Text>
            <Text style={styles.sectionTitle}>Close to the work.</Text>
          </View>
          <Text style={styles.accessSectionMeta}>4 CORE TOOLS</Text>
        </View>
        <View style={styles.accessCapabilityGrid}>
          {[
            { icon: 'cloud-upload', title: 'Upload drafts', body: 'Release, beat and mix preparation.' },
            { icon: 'library-music', title: 'Catalog', body: 'Your work, status and next moves.' },
            { icon: 'insights', title: 'Signals', body: 'Audience and catalog health.' },
            { icon: 'bolt', title: 'Actions', body: 'Live, events, wallet and launch tools.' },
          ].map((item) => (
            <View key={item.title} style={styles.accessCapability}>
              <View style={styles.accessCapabilityIcon}>
                <MaterialIcons name={iconName(item.icon)} size={20} color={STUDIO.orange} />
              </View>
              <Text style={styles.accessCapabilityTitle}>{item.title}</Text>
              <Text style={styles.accessCapabilityBody}>{item.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.accessTrustBand}>
        <MaterialIcons name="verified-user" size={19} color={STUDIO.orangeSoft} />
        <Text style={styles.accessTrustText}>
          Creator access keeps private drafts, business signals and account controls behind your sign-in.
        </Text>
      </View>
    </StudioShell>
  );
}

function withStudioData(active: StudioRouteKey, title: string, render: (data: StudioData, query: ReturnType<typeof useStudioQuery>) => React.ReactNode) {
  const params = useLocalSearchParams<{ preview?: string }>();
  const query = useStudioQuery();
  const previewData = __DEV__ && params.preview === 'creator' ? createStudioPreviewData() : null;
  if (previewData) return render(previewData, query);
  if (query.isLoading) return <LoadingState title={title} />;
  if (query.error) {
    const message = query.error instanceof Error ? query.error.message : 'Studio could not load.';
    return <ErrorState title={title} message={message} onRetry={() => query.refetch()} />;
  }
  if (!query.data) return <LoadingState title={title} />;
  if (!query.data.creatorAccess) return <AccessState data={query.data} active={active} title={title} />;
  return render(query.data, query);
}

function HealthRing({ percent }: { percent: number }) {
  const radius = 27;
  const stroke = 6;
  const size = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  return (
    <View style={styles.healthWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={STUDIO.orange}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.healthCenter}>
        <Text style={[styles.healthPercent, { color: STUDIO.text }]}>{percent}%</Text>
        <Text style={[styles.healthLabel, { color: STUDIO.textSubtle }]}>Health</Text>
      </View>
    </View>
  );
}

function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: 'native' | 'limited' | 'web' | 'neutral' }) {
  const theme = usePluggdTheme();
  const colors = {
    native: { bg: 'rgba(65,209,125,0.14)', fg: theme.colors.success, border: 'rgba(65,209,125,0.32)' },
    limited: { bg: 'rgba(255,102,0,0.13)', fg: theme.colors.accent, border: 'rgba(255,102,0,0.32)' },
    web: { bg: theme.colors.surfaceAlt, fg: theme.colors.textMuted, border: theme.colors.border },
    neutral: { bg: theme.colors.surfaceAlt, fg: theme.colors.textSecondary, border: theme.colors.border },
  }[tone];
  return (
    <View style={[styles.statusChip, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.statusChipText, { color: colors.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function CommandCard({ data }: { data: StudioData }) {
  const router = useRouter();
  const name = studioCreatorName(data);
  const commandActions = buildMobileCommandActions(data);
  const primaryAction = commandActions.find((action) => action.primary) || commandActions[0];
  const quickActions = commandActions.filter((action) => action.id !== primaryAction?.id).slice(0, 3);
  const heroImage = data.profile?.cover_image_url || data.catalogItems.find((item) => item.imageUrl)?.imageUrl;
  return (
    <View style={styles.commandCard}>
      {heroImage ? (
        <PluggdImage uri={heroImage} style={styles.commandBackdrop} resizeMode="cover" />
      ) : (
        <Image source={WEB_PARITY_ASSETS.bedroomStudio} style={styles.commandBackdrop} resizeMode="cover" />
      )}
      <LinearGradient
        pointerEvents="none"
        // The quick-action row (Check cash / Go live / Apps) sits around the
        // midpoint of this card, where the old ramp was still only ~68% opaque.
        // Over a bright cover — a pale sky, a light building — those small
        // labels were unreadable. Ramping earlier and harder keeps the artwork
        // present at the top while every label below it stays legible.
        colors={['rgba(0,0,0,0.30)', 'rgba(3,3,5,0.86)', 'rgba(2,2,3,0.98)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,106,0,0.28)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.75, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.commandContent}>
        <View style={styles.commandTop}>
          <View style={styles.commandCopy}>
            <Text style={styles.commandKicker}>Today in your studio</Text>
            <Text style={styles.commandTitle} numberOfLines={2}>
              Welcome back,{'\n'}{name}.
            </Text>
            <Text style={styles.commandBody} numberOfLines={2}>
              Your catalogue, audience and next release—ready to move.
            </Text>
          </View>
          <HealthRing percent={data.stats.healthPercent} />
        </View>

        <View style={styles.commandActionDeck}>
          {primaryAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={primaryAction.title}
              onPress={() => routePush(router, primaryAction.route)}
              style={styles.commandPrimaryTap}
            >
              <LinearGradient colors={['#ff9b50', '#ff6500']} style={styles.commandPrimaryAction}>
                <View style={styles.commandPrimaryIcon}>
                  <MaterialIcons name={iconName(primaryAction.icon)} size={20} color="#170A03" />
                </View>
                <Text style={styles.commandPrimaryText} numberOfLines={1}>{primaryAction.title}</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#170A03" />
              </LinearGradient>
            </Pressable>
          ) : null}
          <View style={styles.commandQuickRow}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={action.title}
                onPress={() => routePush(router, action.route)}
                style={styles.commandQuickAction}
              >
                <MaterialIcons name={iconName(action.icon)} size={17} color={STUDIO.orangeSoft} />
                <Text style={styles.commandQuickText} numberOfLines={1}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Next move ${data.nextMove.title}`}
          onPress={() => routePush(router, data.nextMove.route)}
          style={styles.nextMove}
        >
          <View style={styles.nextMoveText}>
            <Text style={styles.nextMoveKicker}>Next Move</Text>
            <Text style={styles.nextMoveTitle} numberOfLines={1}>
              {data.nextMove.title}
            </Text>
            <Text style={styles.nextMoveDetail} numberOfLines={1}>
              {data.nextMove.detail}
            </Text>
          </View>
          <View style={styles.roundIcon}>
            <MaterialIcons name="arrow-outward" size={18} color={STUDIO.orange} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function PlatformPlanCard() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { entitlement, loading } = usePlatformPlanEntitlement();
  const plan = PLATFORM_PLANS.find((candidate) => candidate.tier === entitlement.tier) || PLATFORM_PLANS[0];
  const actionLabel = entitlement.tier === 'pro' ? 'Manage plan' : entitlement.tier === 'creator' ? 'Compare with Pro' : 'Explore plans';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${actionLabel}. Current plan ${plan.name}`}
      onPress={() => routePush(router, '/plans')}
      style={({ pressed }) => [
        styles.platformPlanCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed && styles.platformPlanCardPressed,
      ]}
    >
      <View style={[styles.platformPlanIcon, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.borderAccent }]}>
        <MaterialIcons name="workspace-premium" size={22} color={theme.colors.accent} />
      </View>
      <View style={styles.platformPlanCopy}>
        <Text style={[styles.platformPlanKicker, { color: theme.colors.accent }]}>Your PLUGGD plan</Text>
        <Text style={[styles.platformPlanTitle, { color: theme.colors.text }]}>{loading ? 'Loading plan' : plan.name}</Text>
        <Text style={[styles.platformPlanBody, { color: theme.colors.textMuted }]} numberOfLines={2}>
          {loading ? 'Checking your creator access.' : plan.summary}
        </Text>
      </View>
      <View style={styles.platformPlanAction}>
        <Text style={[styles.platformPlanActionText, { color: theme.colors.text }]}>{actionLabel}</Text>
        <MaterialIcons name="arrow-forward" size={18} color={theme.colors.accent} />
      </View>
    </Pressable>
  );
}

/**
 * The creator's own artwork, keyed by the module it belongs to.
 *
 * Studio's launcher surfaces were entirely icons and gradients — the one place a
 * creator's work never appeared. Where a module maps to something they have
 * actually published, the newest cover backs its tile. Modules with no content
 * behind them keep the plain treatment rather than borrowing someone's art, so
 * the presence of a cover is itself information: that shelf has something on it.
 *
 * `catalogItems` arrives newest-first, so the first hit per module wins.
 */
const CATALOG_KIND_MODULE: Record<StudioCatalogItem['kind'], string> = {
  release: 'releases',
  beat: 'beats',
  mix: 'mixes',
  soundboard: 'soundboards',
  event: 'events',
};

function artworkByModule(items: StudioCatalogItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    const moduleId = CATALOG_KIND_MODULE[item.kind];
    if (!moduleId || map[moduleId] || !item.imageUrl) continue;
    map[moduleId] = item.imageUrl;
  }
  return map;
}

/**
 * Module copy includes a complete management explanation. At half-screen tile
 * width the second sentence
 * cannot fit and gets clipped mid-word, which is the loudest unfinished-looking
 * thing in the Studio. The status chip already says where the rest of the work
 * happens, so a tile shows the first sentence and stops.
 */
function leadSentence(text?: string | null): string {
  const value = (text ?? '').trim();
  if (!value) return '';
  const end = value.search(/\.\s/);
  return end === -1 ? value : value.slice(0, end + 1);
}

/**
 * Tile-width copy: lead sentence, then clipped on a word boundary if it is
 * still too long. Some descriptions are a single comma-spliced sentence with no
 * full stop to cut at, and React Native's own ellipsis breaks mid-word — which
 * is what produced "links, rates, services, a…".
 */
function tileCopy(text?: string | null, maxChars = 58): string {
  const value = leadSentence(text);
  if (value.length <= maxChars) return value;
  const clipped = value.slice(0, maxChars);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 20 ? clipped.slice(0, lastSpace) : clipped).replace(/[,;:]$/, '')}…`;
}

/**
 * One chip per card, and only when it says something the card does not already
 * show. "Ready" was on almost every tile and carried no information; plugged-in
 * state is already visible in the icon tint and the tile's accent gradient.
 * Precedence matters: where a module is both suggested and advanced, the
 * presentation mode is what a creator needs first.
 */
function moduleChip(module: StudioModuleState): { label: string; tone: 'native' | 'limited' | 'web' | 'neutral' } | null {
  if (module.status === 'web_only') return { label: 'Advanced', tone: 'web' };
  if (['releases', 'beats', 'mixes', 'soundboards'].includes(module.id)) return null;
  if (module.status === 'limited') return { label: 'Mobile', tone: 'neutral' };
  if (module.recommendedForRole && !module.plugged && !module.alwaysVisible) return { label: 'Suggested', tone: 'limited' };
  return null;
}

/**
 * Compact page header for Studio surfaces whose opening block was pure copy.
 *
 * Studio is a workspace: the first screenful belongs to the tools, not to a
 * restatement of what the page is for. Pages whose hero carries a primary
 * action (Home, Connect Card, My PLUGGD, Split Engine) keep their hero — the
 * action earns the space. Pages that only introduced themselves (Apps, Create,
 * More) use this instead, which costs ~90pt where the hero cost ~190-280.
 */
function StudioPageHeader({
  icon,
  kicker,
  title,
  meta,
}: {
  icon: string;
  kicker: string;
  title: string;
  meta?: string;
}) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderTop}>
        <View style={[styles.pageHeaderIcon, { backgroundColor: theme.colors.accentSoft }]}>
          <MaterialIcons name={iconName(icon)} size={16} color={theme.colors.accent} />
        </View>
        <Text style={[styles.pageHeaderKicker, { color: theme.colors.accent }]}>{kicker}</Text>
      </View>
      <Text style={[styles.pageHeaderTitle, { color: theme.colors.text }]}>{title}</Text>
      {meta ? <Text style={[styles.pageHeaderMeta, { color: theme.colors.textMuted }]}>{meta}</Text> : null}
    </View>
  );
}

function ActionBoard({ data }: { data: StudioData }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addingModuleId, setAddingModuleId] = useState<string | null>(null);
  const artwork = useMemo(() => artworkByModule(data.catalogItems), [data.catalogItems]);
  const actionDescriptions = useMemo(
    () => new Map<string, string>(data.modules.map((module) => [module.id, module.description])),
    [data.modules],
  );
  const actionRows = Array.from({ length: Math.ceil(data.nativeActions.length / 2) }, (_, index) =>
    data.nativeActions.slice(index * 2, index * 2 + 2),
  );
  const openAction = (action: StudioAction) => {
    const module = data.modules.find((candidate) => candidate.id === action.id);
    const optionalAndUnplugged = Boolean(module && !module.plugged && !module.defaultForRole && !module.alwaysVisible);
    if (!module || !optionalAndUnplugged) {
      routePush(router, action.route);
      return;
    }

    Alert.alert(
      `Add ${module.title} to Studio?`,
      `${module.description} You can remove optional modules later from Studio Apps.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Studio',
          onPress: () => {
            setAddingModuleId(module.id);
            void setStudioModulePlugged(data.userId, module.id, true)
              .then(() => queryClient.invalidateQueries({ queryKey: QUERY_KEY }))
              .then(() => routePush(router, module.route))
              .catch(() => Alert.alert('Could not add module', `${module.title} was not changed. Try again.`))
              .finally(() => setAddingModuleId(null));
          },
        },
      ],
    );
  };
  return (
    <>
      <StudioPageHeader
        icon="bolt"
        kicker="Creator actions"
        title="What are you moving today?"
        meta="Publish, go live, build your audience or prepare the next drop."
      />
      <View style={styles.actionBoardGrid}>
        {actionRows.map((row, rowIndex) => (
          <View key={`action-row-${rowIndex}`} style={styles.actionBoardRow}>
            {row.map((action, columnIndex) => (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={`${action.id === 'live' || action.id === 'events' ? 'Open' : 'Manage'} ${action.title}`}
                accessibilityState={{ busy: addingModuleId === action.id }}
                disabled={addingModuleId === action.id}
                onPress={() => openAction(action)}
                style={styles.actionBoardTile}
              >
                <LinearGradient
                  colors={rowIndex === 0 && columnIndex === 0 ? ['rgba(255,106,0,0.24)', 'rgba(19,19,23,0.98)'] : ['rgba(255,255,255,0.09)', 'rgba(14,14,18,0.98)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.actionBoardTileInner}
                >
                  {artwork[action.id] ? (
                    <>
                      <PluggdImage
                        uri={artwork[action.id]}
                        style={styles.tileArtwork}
                        resizeMode="cover"
                        accessibilityLabel=""
                      />
                      <LinearGradient
                        colors={['rgba(6,6,8,0.30)', 'rgba(6,6,8,0.80)', 'rgba(6,6,8,0.96)']}
                        locations={[0, 0.52, 1]}
                        style={styles.tileArtwork}
                        pointerEvents="none"
                      />
                    </>
                  ) : null}
                  <View style={styles.actionBoardTileTop}>
                    <View style={styles.actionBoardIcon}>
                      <MaterialIcons name={iconName(action.icon)} size={22} color={STUDIO.orangeSoft} />
                    </View>
                    <MaterialIcons name="north-east" size={18} color={STUDIO.textSubtle} />
                  </View>
                  <Text style={styles.actionBoardTileTitle} numberOfLines={2}>{action.title}</Text>
                  <Text style={styles.actionBoardTileBody} numberOfLines={2}>{tileCopy(actionDescriptions.get(action.id) || action.detail)}</Text>
                  {/* Only flag what is not fully here. "Ready" was on most tiles
                      and told a creator nothing they could act on. */}
                  {action.status === 'web_only' ? (
                    <StatusChip label="Advanced" tone="web" />
                  ) : null}
                </LinearGradient>
              </Pressable>
            ))}
            {row.length === 1 ? <View style={styles.actionBoardTileSpacer} /> : null}
          </View>
        ))}
      </View>
    </>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon,
  route,
  cardWidth,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  route?: string;
  cardWidth?: number;
}) {
  const router = useRouter();
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole={route ? 'button' : 'text'}
      disabled={!route}
      onPress={() => routePush(router, route)}
      style={[styles.kpiCardTap, cardWidth ? { flex: 0, width: cardWidth } : null]}
    >
      <GlassPanel
        intensity="subtle"
        style={[styles.kpiCard, cardWidth ? { width: cardWidth } : null]}
        contentStyle={styles.kpiCardContent}
      >
        <View style={styles.kpiHead}>
          <MaterialIcons name={iconName(icon)} size={16} color={theme.colors.accent} />
          <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={[styles.kpiValue, { color: theme.colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        {/* A decorative bar sat here. It was bound to nothing, so it implied a
            measurement against a target that does not exist. */}
        <Text style={[styles.kpiDetail, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {detail}
        </Text>
      </GlassPanel>
    </Pressable>
  );
}

function KpiGrid({ data }: { data: StudioData }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(320, Math.floor(width - 24));
  const cardWidth = Math.floor((contentWidth - 18) / 3);
  return (
    <View style={[styles.kpiGrid, { width: contentWidth }]}>
      <KpiCard cardWidth={cardWidth} label="Catalog" value={formatCompact(data.stats.catalogCount)} detail={`${formatCompact(data.stats.releaseCount)} releases`} icon="library-music" route="/studio/catalog?tab=releases" />
      <KpiCard cardWidth={cardWidth} label="Audience" value={formatCompact(data.stats.audienceCount)} detail="Followers" icon="groups" route="/studio/analytics" />
      <KpiCard cardWidth={cardWidth} label="Live" value={formatCompact(data.stats.liveCount + data.stats.eventCount)} detail="Rooms and events" icon="radio" route="/live/create" />
    </View>
  );
}

function ZoneGrid({ data }: { data: StudioData }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(320, Math.floor(width - 24));
  const zoneCardWidth = Math.floor((contentWidth - 9) / 2);
  const modulesById = new Map(data.modules.map((module) => [module.id, module]));
  const catalogModule = modulesById.get(primaryCatalogModuleId(data.primaryRole));
  const zones = [
    {
      title: 'Launch',
      detail: catalogModule?.title || (data.stats.catalogCount > 0 ? `${formatCompact(data.stats.catalogCount)} assets` : 'Choose catalog tools'),
      tag: catalogModule?.title || ROLE_LABELS[data.primaryRole] || 'Creator',
      route: catalogModule?.route || '/studio/apps',
      icon: 'rocket-launch',
    },
    {
      title: 'Collect',
      detail: 'Payouts',
      tag: 'Money',
      route: '/wallet',
      icon: 'account-balance-wallet',
    },
    {
      title: 'Grow',
      detail: data.stats.audienceCount > 0 ? `${formatCompact(data.stats.audienceCount)} followers` : 'Audience signals',
      tag: 'Audience',
      route: '/studio/analytics',
      icon: 'trending-up',
    },
    {
      title: 'Operate',
      detail: `${data.stats.completedTasks}/${data.stats.totalTasks} setup`,
      tag: 'Ops',
      route: '/studio/my-pluggd',
      icon: 'task-alt',
    },
  ];
  const router = useRouter();
  const theme = usePluggdTheme();
  const rows = [zones.slice(0, 2), zones.slice(2, 4)];
  return (
    <View style={[styles.zoneGrid, { width: contentWidth }]}>
      {rows.map((row, index) => (
        <View key={`zone-row-${index}`} style={[styles.zoneRow, { width: contentWidth }]}>
          {row.map((zone) => (
            <Pressable
              key={zone.title}
              accessibilityRole="button"
              accessibilityLabel={zone.title}
              onPress={() => routePush(router, zone.route)}
              style={[styles.zoneCardTap, { flex: 0, width: zoneCardWidth }]}
            >
              <GlassPanel
                intensity="subtle"
                style={[styles.zoneCard, { width: zoneCardWidth }]}
                contentStyle={styles.zoneCardContent}
              >
                <View style={[styles.zoneIcon, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
                  <MaterialIcons name={iconName(zone.icon)} size={18} color={theme.colors.text} />
                </View>
                <View style={styles.zoneCardCopy}>
                  <Text style={[styles.zoneTitle, { color: theme.colors.text }]} numberOfLines={1}>{zone.title}</Text>
                  <Text style={[styles.zoneDetail, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {zone.detail}
                  </Text>
                  <StatusChip label={zone.tag} />
                </View>
                <MaterialIcons name="arrow-outward" size={19} color={theme.colors.textMuted} />
              </GlassPanel>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function ProgressRow({ label, detail, value, icon, route }: { label: string; detail: string; value: number; icon: string; route?: string }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  return (
    <Pressable accessibilityRole={route ? 'button' : 'text'} disabled={!route} onPress={() => routePush(router, route)} style={styles.progressRow}>
      <View style={[styles.progressIcon, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
        <MaterialIcons name={iconName(icon)} size={18} color={theme.colors.textSecondary} />
      </View>
      <View style={styles.progressCopy}>
        <Text style={[styles.progressLabel, { color: theme.colors.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.progressDetail, { color: theme.colors.textMuted }]} numberOfLines={1}>{detail}</Text>
      </View>
      {/* A 6% floor meant zero rendered as a small orange nub, which reads as a
          rendering fault rather than "none yet". Zero now shows an empty track;
          the floor only applies once there is something to show. */}
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
        {value > 0 ? (
          <View style={[styles.progressFill, { width: `${Math.max(5, Math.min(100, value))}%`, backgroundColor: theme.colors.accentFill }]} />
        ) : null}
      </View>
    </Pressable>
  );
}

function PublishingActivity({ data }: { data: StudioData }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
        count: 0,
      };
    });
  }, []);

  const activity = useMemo(() => {
    const byMonth = new Map(months.map((month) => [month.key, { ...month }]));
    data.catalogItems.forEach((item) => {
      if (!item.createdAt) return;
      const date = new Date(item.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const month = byMonth.get(key);
      if (month) month.count += 1;
    });
    return months.map((month) => byMonth.get(month.key) || month);
  }, [data.catalogItems, months]);

  const maximum = Math.max(1, ...activity.map((month) => month.count));
  const total = activity.reduce((sum, month) => sum + month.count, 0);
  return (
    <LinearGradient
      colors={['rgba(255,106,0,0.16)', 'rgba(22,22,27,0.96)', 'rgba(5,5,7,0.98)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.activityCard}
    >
      <View style={styles.activityHead}>
        <View>
          <Text style={styles.activityKicker}>Publishing activity</Text>
          <Text style={styles.activityTitle}>{total ? `${total} items in six months` : 'Your cadence starts here'}</Text>
        </View>
        {/* A "REAL DATA" badge used to sit here. Creators assume the numbers are
            real; saying so out loud only invites the opposite thought. */}
      </View>
      <View style={styles.activityChart}>
        {activity.map((month) => (
          <View key={month.key} style={styles.activityColumn}>
            <Text style={styles.activityValue}>{month.count || '–'}</Text>
            <View style={styles.activityTrack}>
              <LinearGradient
                colors={month.count ? [STUDIO.orangeSoft, STUDIO.orange] : ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.10)']}
                style={[styles.activityBar, { height: month.count ? Math.max(12, Math.round((month.count / maximum) * 74)) : 5 }]}
              />
            </View>
            <Text style={styles.activityMonth}>{month.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.activityNote}>Based on releases, beats, mixes, soundboards and events added to your Studio.</Text>
    </LinearGradient>
  );
}

function CatalogStrip({ items }: { items: StudioCatalogItem[] }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  if (!items.length) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No catalog rows yet</Text>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
          Studio will show real releases, beats, mixes, events, and soundboards once they exist.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogStrip}>
      {items.slice(0, 8).map((item) => (
        <Pressable key={`${item.kind}-${item.id}`} accessibilityRole="button" onPress={() => routePush(router, item.route)} style={styles.catalogCard}>
          {item.imageUrl ? (
            <PluggdImage uri={item.imageUrl} style={[styles.catalogArt, { backgroundColor: theme.colors.artworkBase }]} accessibilityLabel={item.title} />
          ) : (
            <View style={[styles.catalogArt, styles.catalogArtFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
              <Text style={[styles.catalogInitial, { color: theme.colors.text }]}>{initials(item.title)}</Text>
            </View>
          )}
          <Text style={[styles.catalogKind, { color: theme.colors.accent }]}>{item.kind}</Text>
          <Text style={[styles.catalogTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.catalogSubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SectionTitle({ title, actionLabel, actionRoute }: { title: string; actionLabel?: string; actionRoute?: string }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {actionLabel && actionRoute ? (
        <Pressable accessibilityRole="button" onPress={() => routePush(router, actionRoute)}>
          <Text style={[styles.sectionAction, { color: theme.colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ActionRow({ action, compact = false }: { action: StudioAction; compact?: boolean }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  const canOpen = Boolean(action.route);
  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : 'text'}
      disabled={!canOpen}
      onPress={() => routePush(router, action.route)}
      style={[
        styles.actionRow,
        compact && styles.actionRowCompact,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: canOpen ? 1 : 0.7,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
        <MaterialIcons name={iconName(action.icon)} size={20} color={action.status === 'web_only' ? theme.colors.textMuted : theme.colors.accent} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color: theme.colors.text }]} numberOfLines={1}>{action.title}</Text>
        <Text style={[styles.actionDetail, { color: theme.colors.textMuted }]} numberOfLines={compact ? 1 : 2}>
          {action.detail}
        </Text>
      </View>
      <StatusChip label={action.status === 'web_only' ? 'Advanced' : action.status === 'limited' ? 'Mobile' : 'Ready'} tone={action.status === 'web_only' ? 'web' : action.status === 'limited' ? 'neutral' : action.status} />
    </Pressable>
  );
}

function ModuleCard({
  module,
  onOpen,
  onToggle,
  busy,
}: {
  module: StudioModuleState;
  onOpen: (module: StudioModuleState) => void;
  onToggle: (module: StudioModuleState) => void;
  busy: boolean;
}) {
  const theme = usePluggdTheme();
  const canToggle = !module.defaultForRole && !module.alwaysVisible;
  const chip = moduleChip(module);
  const canOpen = Boolean(module.route);
  const showPrimaryAction = canOpen || (canToggle && !module.plugged);
  const primaryLabel = module.plugged || module.alwaysVisible ? 'Manage' : canOpen ? 'Add' : 'Plug in';
  return (
    <View style={[styles.moduleCard, { backgroundColor: theme.colors.surface, borderColor: module.plugged ? theme.colors.borderAccent : theme.colors.border }]}>
      <View style={styles.moduleTop}>
        <View style={[styles.moduleIcon, { backgroundColor: theme.colors.surfaceAlt, borderColor: module.plugged ? theme.colors.borderAccent : theme.colors.border }]}>
          <MaterialIcons name={iconName(module.icon)} size={22} color={module.plugged ? theme.colors.accent : theme.colors.textSecondary} />
          {/* Apps exists to answer "what is in my Studio", so plugged state needs
              an affirmative mark — but as an affordance on the icon rather than
              another chip competing with the actionable module state. */}
          {module.plugged ? (
            <View style={[styles.modulePluggedMark, { borderColor: theme.colors.surface }]}>
              <MaterialIcons name="check" size={10} color="#140A03" />
            </View>
          ) : null}
        </View>
        <View style={styles.moduleCopy}>
          <View style={styles.moduleTitleRow}>
            <Text style={[styles.moduleTitle, { color: theme.colors.text }]} numberOfLines={2}>{module.title}</Text>
            {chip ? <StatusChip label={chip.label} tone={chip.tone} /> : null}
          </View>
          {/* description says what the tool is; addsToStudio restated it in
              advanced-parity terms, so the card carried two paragraphs saying
              nearly the same thing. The chip covers the parity half. */}
          <Text style={[styles.moduleDetail, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {module.description}
          </Text>
        </View>
        {showPrimaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${primaryLabel} ${module.title}`}
            disabled={busy}
            onPress={() => canOpen ? onOpen(module) : onToggle(module)}
            style={[
              styles.modulePrimaryAction,
              module.plugged || module.alwaysVisible
                ? { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }
                : { borderColor: theme.colors.accentFill, backgroundColor: theme.colors.accentFill },
            ]}
          >
            <Text style={[styles.modulePrimaryActionText, { color: module.plugged || module.alwaysVisible ? theme.colors.text : theme.colors.onAccent }]}>
              {busy ? 'Saving' : primaryLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {canToggle && module.plugged ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Unplug ${module.title}`}
          accessibilityHint="Removes this optional module from your Studio navigation"
          disabled={busy}
          onPress={() => onToggle(module)}
          style={styles.moduleRemoveAction}
        >
          <MaterialIcons name="remove-circle-outline" size={17} color={theme.colors.textMuted} />
          <Text style={[styles.moduleRemoveActionText, { color: theme.colors.textMuted }]}>{busy ? 'Saving' : 'Unplug'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ComplianceNote() {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.noteCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <MaterialIcons name="verified-user" size={18} color={theme.colors.accent} />
      <Text style={[styles.noteText, { color: theme.colors.textMuted }]}>
        Everyday tools are ready here. Distribution, tax, exports, rights, and payout settings open securely inside Studio.
      </Text>
    </View>
  );
}

export function StudioHomeScreen() {
  return withStudioData('home', 'Studio', (data, query) => (
    <StudioShell active="home" title="Studio" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <CommandCard data={data} />
      <PlatformPlanCard />
      <KpiGrid data={data} />
      <ZoneGrid data={data} />
      <View>
        <SectionTitle title="Your catalogue" actionLabel="Apps" actionRoute="/studio/apps" />
        <CatalogStrip items={data.catalogItems} />
      </View>
      <View>
        <SectionTitle title="Next Up" actionLabel="Action" actionRoute="/studio/action" />
        <View style={styles.stack}>
          <ActionRow action={data.nextMove} compact />
          {data.setupTasks
            .filter((task) => !task.complete && task.id !== data.nextMove.id)
            .slice(0, 2)
            .map((task) => (
              <ActionRow
                key={task.id}
                compact
                action={{ id: task.id, title: task.title, detail: task.detail, route: task.route, icon: task.id === 'connect-card' ? 'badge' : 'task-alt', status: 'native' }}
              />
            ))}
        </View>
      </View>
    </StudioShell>
  ));
}

export function StudioAppsScreen() {
  const [section, setSection] = useState<StudioModuleSection | 'all'>('all');
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ data, module }: { data: StudioData; module: StudioModuleState }) =>
      setStudioModulePlugged(data.userId, module.id, !module.plugged),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return withStudioData('apps', 'Studio Apps', (data, query) => {
    const visibleModules = data.modules.filter((module) => section === 'all' || module.section === section);
    const pluggedCount = data.modules.filter((module) => module.plugged).length;
    const recommendedCount = data.modules.filter((module) => module.recommendedForRole && !module.plugged).length;
    const openModule = (module: StudioModuleState) => {
      if (module.plugged || module.defaultForRole || module.alwaysVisible) {
        routePush(router, module.route);
        return;
      }
      Alert.alert(
        `Add ${module.title} to Studio?`,
        `${module.description} You can remove it later from Studio Apps.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add to Studio',
            onPress: () => mutation.mutate(
              { data, module },
              {
                onSuccess: () => routePush(router, module.route),
                onError: () => Alert.alert('Could not add module', `${module.title} was not changed. Try again.`),
              },
            ),
          },
        ],
      );
    };
    return (
      <StudioShell active="apps" title="Studio Apps" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
        <StudioPageHeader
          icon="widgets"
          kicker="Your creator toolkit"
          title="Pick the tools you actually use."
          meta={`${formatCompact(pluggedCount)} plugged in · ${formatCompact(recommendedCount)} suggested for ${ROLE_LABELS[data.primaryRole] ?? 'you'}`}
        />

        <View style={styles.segmentStrip}>
          {(['all', ...SECTION_ORDER] as Array<StudioModuleSection | 'all'>).map((item) => {
            const active = item === section;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => setSection(item)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {item === 'all' ? 'All' : SECTION_LABELS[item]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View>
          <SectionTitle title={section === 'all' ? 'Your toolkit' : SECTION_LABELS[section]} />
          <View style={styles.stack}>
          {visibleModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              busy={mutation.isPending}
              onOpen={openModule}
              onToggle={(nextModule) => mutation.mutate({ data, module: nextModule })}
            />
          ))}
          </View>
        </View>
        <ComplianceNote />
      </StudioShell>
    );
  });
}

type StudioCatalogTab = 'releases' | 'beats' | 'mixes' | 'soundboards';

const STUDIO_CATALOG_TABS: Array<{ id: StudioCatalogTab; label: string; kind: StudioCatalogItem['kind']; icon: string; createRoute: string }> = [
  { id: 'releases', label: 'Releases', kind: 'release', icon: 'library-music', createRoute: '/creator/upload?type=release' },
  { id: 'beats', label: 'Beats', kind: 'beat', icon: 'headset', createRoute: '/creator/upload?type=beat' },
  { id: 'mixes', label: 'Mixes', kind: 'mix', icon: 'album', createRoute: '/creator/upload?type=mix' },
  { id: 'soundboards', label: 'Soundboards', kind: 'soundboard', icon: 'view-list', createRoute: '/studio/soundboards/new' },
];

function normalizeStudioCatalogTab(value?: string | string[]): StudioCatalogTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return STUDIO_CATALOG_TABS.some((tab) => tab.id === candidate) ? candidate as StudioCatalogTab : 'releases';
}

function catalogFallback(tab: StudioCatalogTab) {
  if (tab === 'beats') return WEB_PARITY_ASSETS.bedroomStudio;
  if (tab === 'mixes') return WEB_PARITY_ASSETS.warmListeningRoom;
  if (tab === 'soundboards') return WEB_PARITY_ASSETS.phoneMoment;
  return WEB_PARITY_ASSETS.intimateVocalist;
}

function catalogManagementActions(item: StudioCatalogItem) {
  const id = encodeURIComponent(item.id);
  if (item.kind === 'release') {
    return [
      { label: 'Promote release', detail: 'Create a community post with this release attached.', icon: 'campaign', route: `/create-post?attachmentType=release&releaseId=${id}&type=post` },
      { label: 'Review rights & splits', detail: 'Open the Studio split and agreement workspace.', icon: 'account-tree', route: '/studio/splits' },
      { label: 'Prepare next release', detail: 'Start another release draft inside the creator workflow.', icon: 'add-circle-outline', route: '/creator/upload?type=release' },
    ];
  }
  if (item.kind === 'beat') {
    return [
      { label: 'Post for feedback', detail: 'Create a community feedback post with this beat attached.', icon: 'forum', route: `/create-post?attachmentType=beat&beatId=${id}&type=beat_feedback` },
      { label: 'Review rights & splits', detail: 'Open the Studio split and agreement workspace.', icon: 'account-tree', route: '/studio/splits' },
      { label: 'Prepare next beat', detail: 'Start another beat draft inside the creator workflow.', icon: 'add-circle-outline', route: '/creator/upload?type=beat' },
    ];
  }
  if (item.kind === 'mix') {
    return [
      { label: 'Promote mix', detail: 'Create a community post with this mix attached.', icon: 'campaign', route: `/create-post?attachmentType=mix&mixId=${id}&type=post` },
      { label: 'Prepare next mix', detail: 'Start another mix draft inside the creator workflow.', icon: 'add-circle-outline', route: '/creator/upload?type=mix' },
    ];
  }
  return [];
}

function StudioCatalogContent({ data, query }: { data: StudioData; query: ReturnType<typeof useStudioQuery> }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const params = useLocalSearchParams<{ tab?: string | string[]; item?: string | string[] }>();
  const activeTab = normalizeStudioCatalogTab(params.tab);
  const selectedId = Array.isArray(params.item) ? params.item[0] : params.item;
  const tab = STUDIO_CATALOG_TABS.find((candidate) => candidate.id === activeTab) || STUDIO_CATALOG_TABS[0];
  const module = data.modules.find((candidate) => candidate.id === activeTab);
  const availableTabs = STUDIO_CATALOG_TABS.filter((candidate) => {
    const candidateModule = data.modules.find((entry) => entry.id === candidate.id);
    return candidate.id === activeTab || Boolean(candidateModule?.plugged || candidateModule?.alwaysVisible);
  });
  const items = data.catalogItems.filter((item) => item.kind === tab.kind);
  const selectedItem = items.find((item) => item.id === selectedId) || null;
  const selectedActions = selectedItem ? catalogManagementActions(selectedItem) : [];
  const canCreate = true;
  const [lyricsEditorItem, setLyricsEditorItem] = useState<StudioCatalogItem | null>(null);

  const openLyricsEditor = (item: StudioCatalogItem) => {
    setLyricsEditorItem(item);
  };

  if (module && !module.plugged && !module.alwaysVisible) {
    return (
      <StudioShell active="apps" title="Studio Catalog" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
        <StudioPageHeader icon={module.icon} kicker="Studio module" title={`Add ${module.title} to your Studio?`} meta={module.description} />
        <View style={[styles.catalogManagerEmpty, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.catalogManagerEmptyTitle, { color: theme.colors.text }]}>{module.title} is not connected yet.</Text>
          <Text style={[styles.catalogManagerEmptyText, { color: theme.colors.textSecondary }]}>{module.description}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open Studio Apps to add ${module.title}`} onPress={() => routePush(router, '/studio/apps')} style={[styles.catalogManagerPrimary, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceRaised }]}>
            <Text style={[styles.catalogManagerPrimaryText, { color: theme.colors.accentText }]}>Open Studio Apps</Text>
            <MaterialIcons name="arrow-forward" size={18} color={theme.colors.accentText} />
          </Pressable>
        </View>
      </StudioShell>
    );
  }

  return (
    <StudioShell active="apps" title="Studio Catalog" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <StudioPageHeader
        icon={tab.icon}
        kicker="Creator management"
        title={`${tab.label} in your Studio`}
        meta={`${formatCompact(items.length)} owned ${items.length === 1 ? tab.kind : tab.label.toLowerCase()} · public discovery stays separate`}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogManagerTabs}>
        {availableTabs.map((candidate) => {
          const active = candidate.id === activeTab;
          return (
            <Pressable
              key={candidate.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Manage ${candidate.label}`}
              onPress={() => router.replace({ pathname: '/studio/catalog', params: { tab: candidate.id } } as any)}
              style={[
                styles.catalogManagerTab,
                { borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
                active && styles.catalogManagerTabActive,
                active && { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
              ]}
            >
              <MaterialIcons name={iconName(candidate.icon)} size={17} color={active ? theme.colors.onAccent : theme.colors.textMuted} />
              <Text style={[styles.catalogManagerTabText, { color: theme.colors.textMuted }, active && styles.catalogManagerTabTextActive, active && { color: theme.colors.onAccent }]}>{candidate.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedItem ? (
        <LinearGradient colors={['rgba(255,106,0,0.24)', 'rgba(18,18,22,0.98)']} style={styles.catalogManagerSelected}>
          <View style={styles.catalogManagerSelectedHeader}>
            {selectedItem.imageUrl ? (
              <PluggdImage uri={selectedItem.imageUrl} style={styles.catalogManagerSelectedArtwork} resizeMode="cover" accessibilityLabel="" />
            ) : (
              <Image source={catalogFallback(activeTab)} style={styles.catalogManagerSelectedArtwork} resizeMode="cover" />
            )}
            <View style={styles.catalogManagerSelectedCopy}>
              <Text style={styles.catalogManagerEyebrow}>{tab.label.slice(0, -1)} workspace</Text>
              <Text style={styles.catalogManagerSelectedTitle}>{selectedItem.title}</Text>
              <Text style={styles.catalogManagerSelectedMeta}>{selectedItem.subtitle}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close catalog workspace" hitSlop={8} onPress={() => router.replace({ pathname: '/studio/catalog', params: { tab: activeTab } } as any)} style={styles.catalogManagerClose}>
              <MaterialIcons name="close" size={20} color={STUDIO.text} />
            </Pressable>
          </View>

          {selectedItem.managementFacts?.length ? (
            <View style={styles.catalogManagerFacts}>
              {selectedItem.managementFacts.map((fact) => (
                <View key={`${fact.label}-${fact.value}`} style={styles.catalogManagerFact}>
                  <Text style={styles.catalogManagerFactLabel}>{fact.label}</Text>
                  <Text style={styles.catalogManagerFactValue} numberOfLines={2}>{fact.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {selectedItem.kind === 'release' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Manage per-track lyrics for ${selectedItem.title}`}
              accessibilityHint="Opens Lyrics Studio for this release without leaving Creator Studio"
              onPress={() => openLyricsEditor(selectedItem)}
              style={[styles.catalogManagerAction, styles.catalogManagerActionPrimary]}
            >
              <View style={styles.catalogManagerActionIcon}>
                <MaterialIcons name="lyrics" size={20} color="#170A03" />
              </View>
              <View style={styles.catalogManagerActionCopy}>
                <Text style={[styles.catalogManagerActionTitle, styles.catalogManagerActionTitlePrimary]}>
                  Manage track lyrics
                </Text>
                <Text style={[styles.catalogManagerActionDetail, styles.catalogManagerActionDetailPrimary]}>
                  Choose a track, save a private draft, import LRC or tap-sync timed lyrics.
                </Text>
              </View>
              <MaterialIcons name="arrow-forward" size={18} color="#170A03" />
            </Pressable>
          ) : null}

          {selectedActions.length ? (
            <View style={styles.catalogManagerActions}>
              {selectedActions.map((action, index) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${action.label} for ${selectedItem.title}`}
                  accessibilityHint={action.detail}
                  onPress={() => routePush(router, action.route)}
                  style={[styles.catalogManagerAction, index === 0 && styles.catalogManagerActionPrimary]}
                >
                  <View style={styles.catalogManagerActionIcon}>
                    <MaterialIcons name={iconName(action.icon)} size={20} color={index === 0 ? '#170A03' : STUDIO.orangeSoft} />
                  </View>
                  <View style={styles.catalogManagerActionCopy}>
                    <Text style={[styles.catalogManagerActionTitle, index === 0 && styles.catalogManagerActionTitlePrimary]}>{action.label}</Text>
                    <Text style={[styles.catalogManagerActionDetail, index === 0 && styles.catalogManagerActionDetailPrimary]}>{action.detail}</Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={18} color={index === 0 ? '#170A03' : STUDIO.orangeSoft} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </LinearGradient>
      ) : null}

      <View style={styles.catalogManagerHeadingRow}>
        <View>
          <Text style={[styles.catalogManagerEyebrow, { color: theme.colors.accentText }]}>Your catalogue</Text>
          <Text style={[styles.catalogManagerHeading, { color: theme.colors.text }]}>{tab.label}</Text>
        </View>
        {canCreate ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Create new ${tab.kind}`} onPress={() => routePush(router, tab.createRoute)} style={[styles.catalogManagerPrimaryCompact, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceRaised }]}>
            <MaterialIcons name="add" size={18} color={theme.colors.accentText} />
            <Text style={[styles.catalogManagerPrimaryText, { color: theme.colors.accentText }]}>New</Text>
          </Pressable>
        ) : null}
      </View>

      {items.length ? (
        <View style={styles.catalogManagerList}>
          {items.map((item) => {
            const opensEditor = item.kind === 'soundboard';
            return (
              <Pressable
                key={`${item.kind}-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Manage ${item.title} in Studio`}
                onPress={() => routePush(router, item.route)}
                style={[styles.catalogManagerRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
              >
                {item.imageUrl ? (
                  <PluggdImage uri={item.imageUrl} style={styles.catalogManagerArtwork} resizeMode="cover" accessibilityLabel="" />
                ) : (
                  <Image source={catalogFallback(activeTab)} style={styles.catalogManagerArtwork} resizeMode="cover" />
                )}
                <View style={styles.catalogManagerRowCopy}>
                  <Text style={[styles.catalogManagerRowKicker, { color: theme.colors.accentText }]}>{opensEditor ? 'Canvas workspace' : `${tab.label.slice(0, -1)} workspace`}</Text>
                  <Text style={[styles.catalogManagerRowTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                  <Text style={[styles.catalogManagerRowMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
                </View>
                <View style={styles.catalogManagerArrow}>
                  <MaterialIcons name={opensEditor ? 'edit' : 'chevron-right'} size={20} color={STUDIO.orangeSoft} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={[styles.catalogManagerEmpty, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.catalogManagerEmptyTitle, { color: theme.colors.text }]}>No {tab.label.toLowerCase()} in your Studio yet.</Text>
          <Text style={[styles.catalogManagerEmptyText, { color: theme.colors.textSecondary }]}>
            {activeTab === 'soundboards' ? 'Create a private canvas, then add and arrange your real notes, images, video and audio.' : `Start a ${tab.kind} draft and it will stay connected to this management view.`}
          </Text>
          {canCreate ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Create first ${tab.kind}`} onPress={() => routePush(router, tab.createRoute)} style={[styles.catalogManagerPrimary, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceRaised }]}>
              <Text style={[styles.catalogManagerPrimaryText, { color: theme.colors.accentText }]}>Create {tab.kind}</Text>
              <MaterialIcons name="arrow-forward" size={18} color={theme.colors.accentText} />
            </Pressable>
          ) : null}
        </View>
      )}
      <TrackLyricsEditor
        release={lyricsEditorItem}
        onClose={() => setLyricsEditorItem(null)}
        onPublished={async () => {
          await query.refetch();
          setLyricsEditorItem(null);
        }}
      />
      <ComplianceNote />
    </StudioShell>
  );
}

function TrackLyricsEditor({
  release,
  onClose,
  onPublished,
}: {
  release: StudioCatalogItem | null;
  onClose: () => void;
  onPublished: () => Promise<void>;
}) {
  const { currentTrack, isPlaying, progress, playTrack, togglePlayPause, seekTo } = usePlayback();
  const [tracks, setTracks] = useState<OwnedLyricsTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [lyricsText, setLyricsText] = useState('');
  const [timedLines, setTimedLines] = useState<TimedLyricLine[]>([]);
  const [source, setSource] = useState<LyricSource>('manual');
  const [language, setLanguage] = useState('en');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [syncIndex, setSyncIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedTrack = tracks.find((track) => track.id === selectedTrackId) || null;
  const activeTrackMatches = Boolean(selectedTrack && currentTrack?.trackId === selectedTrack.id);
  const lyricLines = plainLyricLines(lyricsText);
  const syncComplete = source !== 'tap_sync' || (timedLines.length === lyricLines.length && timedLines.every((line) => line.start_ms >= 0));
  const timingReady = source === 'manual' || (source === 'lrc' ? timedLines.length > 0 : syncComplete);

  const applyTrack = (track: OwnedLyricsTrack) => {
    const initialText = track.draftText || track.publishedText;
    setSelectedTrackId(track.id);
    setLyricsText(initialText);
    setTimedLines(track.timedLines);
    setSource(track.timedLines.length ? track.source : 'manual');
    setLanguage(track.language || 'en');
    setRightsConfirmed(false);
    setSyncIndex(Math.max(0, track.timedLines.findIndex((line) => line.start_ms < 0)));
  };

  useEffect(() => {
    if (!release) {
      setTracks([]);
      setSelectedTrackId(null);
      setLoadError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    void loadOwnedReleaseLyricsWorkspace(release.id)
      .then((nextTracks) => {
        if (!active) return;
        setTracks(nextTracks);
        applyTrack(nextTracks[0]);
      })
      .catch((error: any) => {
        if (active) setLoadError(error?.message || 'Lyrics could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [release?.id]);

  const updateLyricsText = (value: string) => {
    setLyricsText(value);
    if (source !== 'manual') {
      setSource('manual');
      setTimedLines([]);
      setSyncIndex(0);
    }
    setRightsConfirmed(false);
  };

  const importLrc = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['text/plain', 'application/octet-stream'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]?.uri) return;
    try {
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const parsed = parseLrcLyrics(raw);
      if (!parsed.length) throw new Error('No timestamped lyric lines were found in that LRC file.');
      setLyricsText(parsed.map((line) => line.text).join('\n'));
      setTimedLines(parsed);
      setSource('lrc');
      setSyncIndex(0);
      setRightsConfirmed(false);
    } catch (error: any) {
      Alert.alert('LRC not imported', error?.message || 'Choose a valid timestamped LRC text file.');
    }
  };

  const startTapSync = async () => {
    if (!selectedTrack) return;
    if (!lyricsText.trim()) {
      Alert.alert('Add lyrics first', 'Paste or type the complete lyrics before synchronising each line.');
      return;
    }
    if (!selectedTrack.playbackUrl) {
      Alert.alert('Audio unavailable', 'This track needs accessible uploaded audio before tap-to-sync can start.');
      return;
    }
    const nextLines = tapSyncLines(lyricsText, source === 'tap_sync' ? timedLines : []);
    setTimedLines(nextLines);
    setSource('tap_sync');
    setSyncIndex(Math.max(0, nextLines.findIndex((line) => line.start_ms < 0)));
    setRightsConfirmed(false);
    await playTrack({
      id: selectedTrack.id,
      url: selectedTrack.playbackUrl,
      title: selectedTrack.title,
      artist: selectedTrack.artist,
      artwork: selectedTrack.artwork || undefined,
      duration: selectedTrack.duration || undefined,
      releaseId: selectedTrack.releaseId,
      trackId: selectedTrack.id,
      type: 'release',
      sourceType: 'release',
    });
  };

  const recordCurrentLine = () => {
    if (!selectedTrack || !activeTrackMatches || source !== 'tap_sync' || syncIndex >= timedLines.length) return;
    const time = Math.max(0, Math.round(progress.position * 1000));
    setTimedLines((current) => current.map((line, index) => index === syncIndex ? { ...line, start_ms: time } : line));
    setSyncIndex((current) => Math.min(timedLines.length, current + 1));
    setRightsConfirmed(false);
  };

  const resetTapSync = () => {
    setTimedLines(tapSyncLines(lyricsText));
    setSyncIndex(0);
    setRightsConfirmed(false);
    if (activeTrackMatches) void seekTo(0);
  };

  const saveDraft = async () => {
    if (!selectedTrack || saving) return;
    setSaving('draft');
    try {
      await savePrivateTrackLyricsDraft(selectedTrack, lyricsText);
      setTracks((current) => current.map((track) => track.id === selectedTrack.id ? { ...track, draftText: lyricsText.trim() } : track));
      Alert.alert('Private lyrics draft saved', `Your working lyrics for ${selectedTrack.title} remain visible only in Creator Studio.`);
    } catch (error: any) {
      Alert.alert('Draft not saved', error?.message || 'Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const publishLyrics = async () => {
    if (!selectedTrack || saving) return;
    if (!timingReady) {
      Alert.alert('Finish the timing', source === 'tap_sync' ? 'Tap every lyric line while the track plays before publishing timed lyrics.' : 'Import a valid timestamped LRC file before publishing.');
      return;
    }
    setSaving('publish');
    try {
      await publishOwnedTrackLyrics({ track: selectedTrack, plainText: lyricsText, timedLines, language, source, rightsConfirmed });
      Alert.alert('Track lyrics published', `${selectedTrack.title} now has its own ${source === 'manual' ? 'plain' : 'timed'} lyrics in the release player.`);
      await onPublished();
    } catch (error: any) {
      Alert.alert('Lyrics not published', error?.message || 'Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal visible={Boolean(release)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => !saving && onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.trackLyricsScreen}>
        <View style={styles.trackLyricsHeader}>
          <View style={styles.trackLyricsHeaderCopy}>
            <Text style={styles.catalogManagerEyebrow}>Per-track lyrics</Text>
            <Text accessibilityRole="header" style={styles.trackLyricsTitle}>Lyrics Studio</Text>
            <Text style={styles.trackLyricsRelease} numberOfLines={1}>{release?.title}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Lyrics Studio" disabled={Boolean(saving)} style={styles.catalogManagerClose} onPress={onClose}><MaterialIcons name="close" size={21} color={STUDIO.text} /></Pressable>
        </View>

        {loading ? <View style={styles.trackLyricsLoading}><ActivityIndicator color={STUDIO.orange} /><Text style={styles.trackLyricsLoadingText}>Loading owned release tracks…</Text></View> : loadError ? (
          <View style={styles.trackLyricsLoading}><MaterialIcons name="error-outline" size={31} color="#F6B36B" /><Text style={styles.trackLyricsError}>{loadError}</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.trackLyricsContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trackLyricsTrackList}>
              {tracks.map((track) => {
                const active = track.id === selectedTrackId;
                return <Pressable key={track.id} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`Edit lyrics for track ${track.trackNumber}, ${track.title}`} onPress={() => applyTrack(track)} style={[styles.trackLyricsTrack, active && styles.trackLyricsTrackActive]}><Text style={[styles.trackLyricsTrackNumber, active && styles.trackLyricsTrackNumberActive]}>{String(track.trackNumber).padStart(2, '0')}</Text><Text style={[styles.trackLyricsTrackTitle, active && styles.trackLyricsTrackTitleActive]} numberOfLines={1}>{track.title}</Text></Pressable>;
              })}
            </ScrollView>

            <View style={styles.trackLyricsModeRow}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: source === 'manual' }} onPress={() => { setSource('manual'); setTimedLines([]); setRightsConfirmed(false); }} style={[styles.trackLyricsMode, source === 'manual' && styles.trackLyricsModeActive]}><MaterialIcons name="subject" size={18} color={source === 'manual' ? '#170A03' : STUDIO.textMid} /><Text style={[styles.trackLyricsModeText, source === 'manual' && styles.trackLyricsModeTextActive]}>Plain</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: source === 'lrc' }} onPress={() => void importLrc()} style={[styles.trackLyricsMode, source === 'lrc' && styles.trackLyricsModeActive]}><MaterialIcons name="upload-file" size={18} color={source === 'lrc' ? '#170A03' : STUDIO.textMid} /><Text style={[styles.trackLyricsModeText, source === 'lrc' && styles.trackLyricsModeTextActive]}>Import LRC</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: source === 'tap_sync' }} onPress={() => void startTapSync()} style={[styles.trackLyricsMode, source === 'tap_sync' && styles.trackLyricsModeActive]}><MaterialIcons name="touch-app" size={18} color={source === 'tap_sync' ? '#170A03' : STUDIO.textMid} /><Text style={[styles.trackLyricsModeText, source === 'tap_sync' && styles.trackLyricsModeTextActive]}>Tap sync</Text></Pressable>
            </View>

            {source === 'tap_sync' ? (
              <View style={styles.tapSyncPanel}>
                <View style={styles.tapSyncPlayer}>
                  <Pressable accessibilityRole="button" accessibilityLabel={activeTrackMatches && isPlaying ? 'Pause track' : 'Play track for lyric timing'} style={styles.tapSyncPlay} onPress={() => activeTrackMatches ? void togglePlayPause() : void startTapSync()}><MaterialIcons name={activeTrackMatches && isPlaying ? 'pause' : 'play-arrow'} size={26} color="#FFFFFF" /></Pressable>
                  <View style={styles.tapSyncPlayerCopy}><Text style={styles.tapSyncTrack} numberOfLines={1}>{selectedTrack?.title}</Text><Text style={styles.tapSyncTime}>{Math.floor(progress.position / 60)}:{String(Math.floor(progress.position % 60)).padStart(2, '0')}</Text></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Reset lyric timing" style={styles.tapSyncReset} onPress={resetTapSync}><MaterialIcons name="restart-alt" size={20} color={STUDIO.textMid} /></Pressable>
                </View>
                <View style={styles.tapSyncCurrent}>
                  <Text style={styles.tapSyncKicker}>{syncIndex >= timedLines.length ? 'TIMING COMPLETE' : `LINE ${syncIndex + 1} OF ${timedLines.length}`}</Text>
                  <Text style={styles.tapSyncCurrentText}>{timedLines[syncIndex]?.text || 'All lines have a timestamp.'}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Set current lyric line timestamp" accessibilityState={{ disabled: !activeTrackMatches || syncIndex >= timedLines.length }} disabled={!activeTrackMatches || syncIndex >= timedLines.length} onPress={recordCurrentLine} style={[styles.tapSyncButton, (!activeTrackMatches || syncIndex >= timedLines.length) && { opacity: 0.45 }]}><MaterialIcons name="touch-app" size={22} color="#170A03" /><Text style={styles.tapSyncButtonText}>Tap on the line</Text></Pressable>
                <View style={styles.tapSyncLineList}>{timedLines.map((line, index) => <Pressable key={`${index}-${line.text}`} accessibilityRole="button" accessibilityLabel={`Select line ${index + 1}, ${line.text}`} onPress={() => setSyncIndex(index)} style={[styles.tapSyncLine, index === syncIndex && styles.tapSyncLineActive]}><Text style={styles.tapSyncLineTime}>{line.start_ms >= 0 ? `${(line.start_ms / 1000).toFixed(1)}s` : '—'}</Text><Text style={styles.tapSyncLineText} numberOfLines={1}>{line.text}</Text></Pressable>)}</View>
              </View>
            ) : null}

            <View>
              <Text style={styles.trackLyricsFieldLabel}>LYRICS</Text>
              <TextInput accessibilityLabel={`Lyrics for ${selectedTrack?.title || 'selected track'}`} multiline textAlignVertical="top" value={lyricsText} onChangeText={updateLyricsText} placeholder={'[Verse 1]\nEnter the exact lyrics here…\n\n[Chorus]\n…'} placeholderTextColor={STUDIO.textSubtle} editable={!saving} style={styles.trackLyricsInput} />
              <Text style={styles.trackLyricsCount}>{lyricLines.length} non-empty lines · {lyricsText.trim().length} characters</Text>
            </View>

            <View style={styles.trackLyricsMetaRow}>
              <View style={styles.trackLyricsLanguageWrap}><Text style={styles.trackLyricsFieldLabel}>LANGUAGE</Text><TextInput accessibilityLabel="Lyric language code" value={language} onChangeText={(value) => { setLanguage(value); setRightsConfirmed(false); }} autoCapitalize="none" placeholder="en" placeholderTextColor={STUDIO.textSubtle} style={styles.trackLyricsLanguage} maxLength={16} /></View>
              <View style={styles.trackLyricsSourceSummary}><Text style={styles.trackLyricsFieldLabel}>FORMAT</Text><Text style={styles.trackLyricsSourceValue}>{source === 'manual' ? 'Plain lyrics' : source === 'lrc' ? `${timedLines.length} LRC lines` : syncComplete ? 'Timing complete' : `${Math.min(syncIndex, timedLines.length)}/${timedLines.length} synced`}</Text></View>
            </View>

            <View style={styles.trackLyricsRights}>
              <View style={styles.trackLyricsRightsCopy}><Text style={styles.trackLyricsRightsTitle}>I control the lyric display rights</Text><Text style={styles.trackLyricsRightsDetail}>Publishing makes these exact words available with this track. Confirm only if you wrote them or have permission to display them.</Text></View>
              <Switch value={rightsConfirmed} onValueChange={setRightsConfirmed} trackColor={{ false: '#39333F', true: '#B5500A' }} thumbColor={rightsConfirmed ? STUDIO.orange : '#8F8996'} />
            </View>

            <View style={styles.trackLyricsActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Save private lyrics draft" accessibilityState={{ disabled: Boolean(saving) || !lyricsText.trim() }} disabled={Boolean(saving) || !lyricsText.trim()} onPress={() => void saveDraft()} style={[styles.trackLyricsDraftButton, (saving || !lyricsText.trim()) && { opacity: 0.45 }]}>{saving === 'draft' ? <ActivityIndicator color={STUDIO.text} /> : <><MaterialIcons name="lock-outline" size={19} color={STUDIO.text} /><Text style={styles.trackLyricsDraftButtonText}>Save private draft</Text></>}</Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Publish lyrics for ${selectedTrack?.title || 'selected track'}`} accessibilityState={{ disabled: Boolean(saving) || !rightsConfirmed || !lyricsText.trim() || !timingReady }} disabled={Boolean(saving) || !rightsConfirmed || !lyricsText.trim() || !timingReady} onPress={() => void publishLyrics()} style={[styles.trackLyricsPublishButton, (saving || !rightsConfirmed || !lyricsText.trim() || !timingReady) && { opacity: 0.45 }]}>{saving === 'publish' ? <ActivityIndicator color="#170A03" /> : <><Text style={styles.trackLyricsPublishButtonText}>Publish track lyrics</Text><MaterialIcons name="publish" size={20} color="#170A03" /></>}</Pressable>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function StudioCatalogScreen() {
  return withStudioData('apps', 'Studio Catalog', (data, query) => <StudioCatalogContent data={data} query={query} />);
}

export function StudioActionScreen() {
  return withStudioData('action', 'Action', (data, query) => (
    <StudioShell active="action" title="Action" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <ActionBoard data={data} />
      <View>
        <SectionTitle title="More creator tools" />
        <View style={styles.stack}>
          {data.webOnlyActions.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </View>
      </View>
      <ComplianceNote />
    </StudioShell>
  ));
}

type AnalyticsTrendKey = 'plays' | 'revenueCents' | 'engagement' | 'newFollowers';

const ANALYTICS_TRENDS: Array<{ id: AnalyticsTrendKey; label: string }> = [
  { id: 'plays', label: 'Plays' },
  { id: 'revenueCents', label: 'Revenue' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'newFollowers', label: 'Followers' },
];

function formatPounds(cents: number) {
  const value = cents / 100;
  return `£${value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value.toFixed(value % 1 === 0 ? 0 : 2)}`;
}

function AnalyticsMetric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.analyticsMetric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessible accessibilityLabel={`${label}: ${value}. ${detail}`}>
      <View style={styles.analyticsMetricTop}><Text style={[styles.analyticsMetricLabel, { color: theme.colors.textMuted }]}>{label}</Text><MaterialIcons name={icon as any} size={18} color={theme.colors.accent} /></View>
      <Text style={[styles.analyticsMetricValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.analyticsMetricDetail, { color: theme.colors.textSubtle }]}>{detail}</Text>
    </View>
  );
}

function AnalyticsTrend({ overview, metric }: { overview: StudioAnalyticsOverview; metric: AnalyticsTrendKey }) {
  const theme = usePluggdTheme();
  const values = overview.points.map((point) => point[metric]);
  const maximum = Math.max(1, ...values);
  const stride = overview.range === 90 ? 3 : 1;
  const visible = overview.points.filter((_, index) => index % stride === 0 || index === overview.points.length - 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  const valueLabel = metric === 'revenueCents' ? formatPounds(total) : formatCompact(total);
  return (
    <View style={[styles.analyticsTrendCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessible accessibilityLabel={`${ANALYTICS_TRENDS.find((item) => item.id === metric)?.label} trend for the last ${overview.range} days, total ${valueLabel}`}>
      <View style={styles.analyticsTrendHeading}><View><Text style={[styles.analyticsEyebrow, { color: theme.colors.accent }]}>LAST {overview.range} DAYS</Text><Text style={[styles.analyticsTrendValue, { color: theme.colors.text }]}>{valueLabel}</Text></View><Text style={[styles.analyticsTrendMeta, { color: theme.colors.textSubtle }]}>Daily verified totals</Text></View>
      <View style={[styles.analyticsBars, { borderBottomColor: theme.colors.border }]}>{visible.map((point) => {
        const value = point[metric];
        const height = value > 0 ? Math.max(8, Math.round((value / maximum) * 92)) : 3;
        return <View key={`${metric}-${point.date}`} style={styles.analyticsBarSlot}><View style={[styles.analyticsBar, { height, backgroundColor: value === 0 ? theme.colors.borderStrong : theme.colors.accentFill }]} /></View>;
      })}</View>
      <View style={styles.analyticsAxis}><Text style={[styles.analyticsAxisText, { color: theme.colors.textSubtle }]}>{overview.points[0]?.date.slice(5)}</Text><Text style={[styles.analyticsAxisText, { color: theme.colors.textSubtle }]}>{overview.points[overview.points.length - 1]?.date.slice(5)}</Text></View>
    </View>
  );
}

function createStudioAnalyticsPreview(range: StudioAnalyticsRange): StudioAnalyticsOverview {
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const points = Array.from({ length: range }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (range - 1 - index));
    return { date: date.toISOString().slice(0, 10), plays: 0, revenueCents: 0, engagement: 0, newFollowers: 0 };
  });
  return {
    range,
    points,
    summary: { plays: 0, revenueCents: 0, engagement: 0, activeMembers: 0, totalFollowers: 0, newFollowers: 0, trackedSaves: 0, cardViews: 0 },
    audience: { retention30d: null, newFans30d: null, churn30d: null, topRegions: [] },
    coverageNotes: [],
    hasMetrics: false,
  };
}

function StudioAnalyticsContent({ data, query }: { data: StudioData; query: ReturnType<typeof useStudioQuery> }) {
  const theme = usePluggdTheme();
  const [range, setRange] = useState<StudioAnalyticsRange>(30);
  const [metric, setMetric] = useState<AnalyticsTrendKey>('plays');
  const [overview, setOverview] = useState<StudioAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshAnalytics = async () => {
    setLoading(true);
    setLoadError(null);
    if (__DEV__ && data.userId === 'studio-preview') {
      setOverview(createStudioAnalyticsPreview(range));
      setLoading(false);
      return;
    }
    try { setOverview(await loadStudioAnalytics(range)); }
    catch (error: any) { setLoadError(error?.message || 'Creator analytics could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refreshAnalytics(); }, [range]);

  const total = Math.max(1, data.stats.catalogCount);
  return (
    <StudioShell active="analytics" title="Insights" data={data} refreshing={query.isRefetching || loading} onRefresh={() => { void query.refetch(); void refreshAnalytics(); }}>
      <StudioPageHeader icon="insights" kicker="Studio insights" title="Know what is moving." />
      <View style={[styles.analyticsRangeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityRole="tablist">
        {([7, 30, 90] as StudioAnalyticsRange[]).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: range === value }} onPress={() => setRange(value)} style={[styles.analyticsRange, range === value && { backgroundColor: theme.colors.accentFill }]}><Text style={[styles.analyticsRangeText, { color: range === value ? theme.colors.onAccent : theme.colors.textMuted }, range === value && styles.analyticsRangeTextActive]}>{value} days</Text></Pressable>)}
      </View>

      {loading && !overview ? <View style={[styles.analyticsState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><ActivityIndicator color={theme.colors.accent} /><Text style={[styles.analyticsStateText, { color: theme.colors.textMuted }]}>Loading your insights…</Text></View> : loadError ? <View style={[styles.analyticsState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><MaterialIcons name="error-outline" size={34} color={theme.colors.danger} /><Text style={[styles.analyticsStateTitle, { color: theme.colors.text }]}>Insights unavailable</Text><Text style={[styles.analyticsStateText, { color: theme.colors.textMuted }]}>{loadError}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry loading Studio insights" style={[styles.analyticsRetry, { backgroundColor: theme.colors.accentFill }]} onPress={() => void refreshAnalytics()}><Text style={[styles.analyticsRetryText, { color: theme.colors.onAccent }]}>Try again</Text></Pressable></View> : overview ? <>
        <View style={styles.analyticsMetricGrid}>
          <View style={styles.analyticsMetricRow}><AnalyticsMetric label="Plays" value={formatCompact(overview.summary.plays)} detail={`in ${range} days`} icon="graphic-eq" /><AnalyticsMetric label="Revenue" value={formatPounds(overview.summary.revenueCents)} detail="recorded creator revenue" icon="paid" /></View>
          <View style={styles.analyticsMetricRow}><AnalyticsMetric label="Followers" value={formatCompact(overview.summary.totalFollowers)} detail={`+${formatCompact(overview.summary.newFollowers)} in range`} icon="groups" /><AnalyticsMetric label="Engagement" value={formatCompact(overview.summary.engagement)} detail="likes and comments" icon="favorite" /></View>
          <View style={styles.analyticsMetricRow}><AnalyticsMetric label="Tracked saves" value={formatCompact(overview.summary.trackedSaves)} detail="supported catalogue saves" icon="bookmark" /><AnalyticsMetric label="Card views" value={formatCompact(overview.summary.cardViews)} detail="Connect Card views" icon="visibility" /></View>
        </View>

        <View><SectionTitle title="Movement" /><View style={styles.analyticsTrendTabs}>{ANALYTICS_TRENDS.map((item) => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: metric === item.id }} onPress={() => setMetric(item.id)} style={[styles.analyticsTrendTab, { borderColor: metric === item.id ? theme.colors.borderAccent : theme.colors.border, backgroundColor: metric === item.id ? theme.colors.accentSoft : theme.colors.surface }]}><Text style={[styles.analyticsTrendTabText, { color: metric === item.id ? theme.colors.accent : theme.colors.textMuted }, metric === item.id && styles.analyticsTrendTabTextActive]}>{item.label}</Text></Pressable>)}</View><AnalyticsTrend overview={overview} metric={metric} /></View>

        <View><SectionTitle title="Audience" /><View style={[styles.analyticsAudienceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.analyticsAudienceRow}><View><Text style={[styles.analyticsAudienceValue, { color: theme.colors.text }]}>{overview.audience.retention30d == null ? '—' : `${overview.audience.retention30d}%`}</Text><Text style={[styles.analyticsAudienceLabel, { color: theme.colors.textSubtle }]}>30-DAY RETENTION</Text></View><View><Text style={[styles.analyticsAudienceValue, { color: theme.colors.text }]}>{overview.audience.newFans30d == null ? '—' : formatCompact(overview.audience.newFans30d)}</Text><Text style={[styles.analyticsAudienceLabel, { color: theme.colors.textSubtle }]}>NEW FANS · 30D</Text></View><View><Text style={[styles.analyticsAudienceValue, { color: theme.colors.text }]}>{overview.audience.churn30d == null ? '—' : formatCompact(overview.audience.churn30d)}</Text><Text style={[styles.analyticsAudienceLabel, { color: theme.colors.textSubtle }]}>CHURN · 30D</Text></View></View>
          {overview.audience.topRegions.length ? <View style={[styles.analyticsRegions, { borderTopColor: theme.colors.border }]}><Text style={[styles.analyticsEyebrow, { color: theme.colors.accent }]}>TOP REGIONS</Text>{overview.audience.topRegions.map((region) => <View key={region.label} style={[styles.analyticsRegion, { borderBottomColor: theme.colors.border }]}><Text style={[styles.analyticsRegionLabel, { color: theme.colors.textMuted }]}>{region.label}</Text><Text style={[styles.analyticsRegionValue, { color: theme.colors.text }]}>{formatCompact(region.value)}</Text></View>)}</View> : <View style={[styles.analyticsEmptyInline, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}><MaterialIcons name="public" size={20} color={theme.colors.textMuted} /><Text style={[styles.analyticsEmptyText, { color: theme.colors.textMuted }]}>Regional audience data will appear when verified metrics are available.</Text></View>}
        </View></View>

        {!overview.hasMetrics ? <View style={[styles.analyticsEmptyInline, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}><MaterialIcons name="query-stats" size={22} color={theme.colors.accent} /><Text style={[styles.analyticsEmptyText, { color: theme.colors.textMuted }]}>No verified activity exists in this window yet. Your real data will appear here as people listen, follow, save and view your work.</Text></View> : null}
        {overview.coverageNotes.length ? <View style={[styles.analyticsCoverage, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderAccent }]}><Text style={[styles.analyticsCoverageTitle, { color: theme.colors.accent }]}>PARTIAL DATA</Text><Text style={[styles.analyticsCoverageText, { color: theme.colors.textMuted }]}>{Array.from(new Set(overview.coverageNotes)).join(' ')}</Text></View> : null}

        <View><SectionTitle title="Catalog Mix" /><View style={styles.stack}>
          <ProgressRow label="Releases" detail={`${formatCompact(data.stats.releaseCount)} owned`} value={(data.stats.releaseCount / total) * 100} icon="library-music" route="/studio/catalog?tab=releases" />
          <ProgressRow label="Beats" detail={`${formatCompact(data.stats.beatCount)} owned`} value={(data.stats.beatCount / total) * 100} icon="headset" route="/studio/catalog?tab=beats" />
          <ProgressRow label="Mixes" detail={`${formatCompact(data.stats.mixCount)} owned`} value={(data.stats.mixCount / total) * 100} icon="album" route="/studio/catalog?tab=mixes" />
          <ProgressRow label="Soundboards" detail={`${formatCompact(data.stats.soundboardCount)} boards`} value={(data.stats.soundboardCount / total) * 100} icon="view-list" route="/studio/catalog?tab=soundboards" />
          <ProgressRow label="Videos" detail={`${formatCompact(data.stats.videoCount)} videos`} value={(data.stats.videoCount / total) * 100} icon="videocam" route="/studio/videos" />
        </View></View>
        <View><SectionTitle title="Advanced insight" /><View style={styles.stack}><ActionRow action={{ id: 'advanced-analytics', title: 'Revenue and attribution', detail: 'Open advanced sources, revenue drilldowns and exports in secure Studio.', route: buildEmbeddedStudioRoute('/studio/analytics/revenue', 'Revenue Analytics', '/studio/analytics'), icon: 'monitoring', status: 'web_only' }} /><ActionRow action={{ id: 'wallet', title: 'Wallet and payouts', detail: 'Review balances and payout status in Wallet.', route: '/wallet', icon: 'account-balance-wallet', status: 'limited' }} /></View></View>
      </> : null}
    </StudioShell>
  );
}

export function StudioAnalyticsScreen() {
  return withStudioData('analytics', 'Analytics', (data, query) => <StudioAnalyticsContent data={data} query={query} />);
}

function StudioIdentityContent({
  data,
  query,
}: {
  data: StudioData;
  query: ReturnType<typeof useStudioQuery>;
}) {
  const theme = usePluggdTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(320, Math.floor(width - 24));
  const tabWidth = Math.floor((contentWidth - 16) / 3);
  const sections = useMemo(() => buildMyPluggdSections(data), [data]);
  const readyCount = sections.filter((section) => section.complete).length;
  const nextSection = sections.find((section) => !section.complete) || sections[0];
  return (
    <StudioShell active="more" title="My PLUGGD" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <LinearGradient
        colors={['rgba(255,106,0,0.19)', 'rgba(255,255,255,0.075)', 'rgba(8,8,10,0.96)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.myPluggdHero}
      >
        <View style={styles.myPluggdHeroTop}>
          <View style={styles.myPluggdHeroCopy}>
            <View style={styles.kickerRow}>
              <MaterialIcons name="auto-awesome" size={15} color={STUDIO.orange} />
              <Text style={styles.kicker}>Creator setup hub</Text>
            </View>
            <Text style={styles.myPluggdTitle}>My PLUGGD</Text>
            <Text style={styles.myPluggdBody}>
              Identity, page, share tools, and settings in one compact setup surface.
            </Text>
          </View>
        </View>

        <View style={styles.myPluggdHeroActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open share tools"
            onPress={() => routePush(router, '/studio/connect-card')}
            style={styles.myPluggdPrimaryPill}
          >
            <MaterialIcons name="ios-share" size={16} color={STUDIO.text} />
            <Text style={styles.myPluggdPrimaryText}>Share Tools</Text>
          </Pressable>
          <View style={styles.myPluggdReadyPill}>
            <MaterialIcons name="task-alt" size={16} color={STUDIO.orangeSoft} />
            <Text style={styles.myPluggdReadyText}>{readyCount}/{sections.length} ready</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.myPluggdTabs}>
        {MY_PLUGGD_TABS.map((tab) => {
          const active = tab.id === 'overview';
          const section = sections.find((item) => item.id === tab.id);
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="button"
              onPress={() => {
                if (section) routePush(router, section.route);
              }}
              style={[styles.myPluggdTab, { width: tabWidth }, active && styles.myPluggdTabActive]}
            >
              <Text style={[styles.myPluggdTabText, active && styles.myPluggdTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.myPluggdStatusCard}>
        <View style={styles.myPluggdStatusTop}>
          <View>
            <Text style={styles.myPluggdStatusLabel}>My PLUGGD status</Text>
            <Text style={styles.myPluggdStatusTitle}>
              {readyCount}/{sections.length} setup areas ready.
            </Text>
          </View>
          <StatusChip label="Hub" tone="limited" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Next up ${nextSection.title}`}
          onPress={() => routePush(router, nextSection.route)}
          style={styles.myPluggdNextCard}
        >
          <View style={styles.myPluggdNextTop}>
            <View style={styles.myPluggdNextIcon}>
              <MaterialIcons name={iconName(nextSection.icon)} size={20} color={STUDIO.orangeSoft} />
            </View>
            <View style={styles.myPluggdNextCopy}>
              <Text style={styles.myPluggdNextKicker}>Next up</Text>
              <Text style={styles.myPluggdNextTitle} numberOfLines={1}>{nextSection.title}</Text>
              <Text style={styles.myPluggdNextDetail} numberOfLines={1}>
                {nextSection.complete ? nextSection.progressLabel : `Missing ${nextSection.missing[0]}`}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={STUDIO.textSubtle} />
          </View>
          <View style={styles.myPluggdNextButton}>
            <Text style={styles.myPluggdNextButtonText}>{nextSection.cta}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.myPluggdSectionStack}>
        {sections.map((section) => (
          <Pressable
            key={section.id}
            accessibilityRole="button"
            accessibilityLabel={section.title}
            onPress={() => routePush(router, section.route)}
            style={[
              styles.myPluggdSectionCard,
              {
                backgroundColor: 'rgba(255,255,255,0.055)',
                borderColor: section.complete ? 'rgba(65,209,125,0.25)' : theme.colors.border,
              },
            ]}
          >
            <View style={styles.myPluggdSectionTop}>
              <View style={[styles.myPluggdSectionIcon, { borderColor: section.complete ? 'rgba(65,209,125,0.25)' : theme.colors.border }]}>
                <MaterialIcons name={iconName(section.icon)} size={21} color={section.complete ? theme.colors.success : theme.colors.accent} />
              </View>
              <View style={styles.myPluggdSectionTitleRow}>
                <Text style={styles.myPluggdSectionTitle} numberOfLines={1}>{section.title}</Text>
                <StatusChip label={section.complete ? 'Ready' : 'Setup'} tone={section.complete ? 'native' : 'limited'} />
              </View>
              <MaterialIcons name="chevron-right" size={22} color={STUDIO.textSubtle} />
            </View>
            <Text style={styles.myPluggdSectionSummary} numberOfLines={2}>{section.summary}</Text>
            <Text style={styles.myPluggdSectionMeta} numberOfLines={1}>
              {section.complete ? section.progressLabel : `Missing ${section.missing.join(', ')}`}
            </Text>
          </Pressable>
        ))}
      </View>

      <View>
        <SectionTitle title="Quick Links" />
        <View style={styles.stack}>
          {sections.slice(0, 3).map((section) => (
            <ActionRow
              key={`quick-${section.id}`}
              compact
              action={{
                id: `quick-${section.id}`,
                title: section.title,
                detail: section.cta,
                route: section.route,
                icon: section.icon,
                status: section.id === 'page' || section.id === 'settings' ? 'limited' : 'native',
              }}
            />
          ))}
        </View>
      </View>
    </StudioShell>
  );
}

export function StudioMyPluggdScreen() {
  return withStudioData('more', 'My PLUGGD', (data, query) => <StudioIdentityContent data={data} query={query} />);
}

function StudioConnectCardContent({
  data,
  query,
}: {
  data: StudioData;
  query: ReturnType<typeof useStudioQuery>;
}) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const params = useLocalSearchParams<{ preview?: string }>();
  const previewQuery = __DEV__ && params.preview === 'creator' ? '?preview=creator' : '';
  const publicRoute = data.connectProfile?.slug ? `/connect/${data.connectProfile.slug}` : undefined;
  const creatorName = data.connectProfile?.display_name || studioCreatorName(data);
  const slug = data.connectProfile?.slug || (__DEV__ && params.preview === 'creator' ? 'arivale' : '');
  const cardViews = [
    {
      id: 'public',
      label: 'Connect',
      eyebrow: 'PUBLIC',
      detail: 'Your public identity for fans, rooms and instant contact exchange.',
      icon: 'language',
      route: slug ? `/connect/${slug}${previewQuery}` : '/studio/connect-card/edit',
      image: WEB_PARITY_ASSETS.intimateVocalist,
      tone: ['rgba(255,106,0,0.08)', 'rgba(4,4,5,0.94)'] as [string, string],
    },
    {
      id: 'business',
      label: 'Work With Me',
      eyebrow: 'BUSINESS + RATES',
      detail: 'Bookings, availability, services, rates and your portfolio.',
      icon: 'business-center',
      route: slug ? `/connect/${slug}/business${previewQuery}` : '/studio/connect-card/edit',
      image: WEB_PARITY_ASSETS.bedroomStudio,
      tone: ['rgba(52,28,14,0.18)', 'rgba(4,4,5,0.96)'] as [string, string],
    },
    {
      id: 'collab',
      label: 'Collaborate',
      eyebrow: 'SPLIT-READY',
      detail: 'Share the right identity, then start a split sheet together.',
      icon: 'group-work',
      route: '/studio/splits',
      image: WEB_PARITY_ASSETS.warmListeningRoom,
      tone: ['rgba(31,75,61,0.20)', 'rgba(4,4,5,0.96)'] as [string, string],
    },
    {
      id: 'contract',
      label: 'Advanced',
      eyebrow: 'SECURE',
      detail: 'Protected company, representative and legal details.',
      icon: 'verified-user',
      route: slug ? `/connect/${slug}/contract${previewQuery}` : '/studio/connect-card/edit',
      image: WEB_PARITY_ASSETS.brickRoomShow,
      tone: ['rgba(43,45,71,0.22)', 'rgba(4,4,5,0.96)'] as [string, string],
    },
  ];
  const identityIsLive = Boolean(data.connectProfile?.slug);

  return (
    <StudioShell active="more" title="Connect Card" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <View style={styles.connectOwnerHero}>
        <View style={styles.connectOwnerCover}>
          <PluggdImage
            uri={data.profile?.cover_image_url || ''}
            fallbackSource={WEB_PARITY_ASSETS.intimateVocalist}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={`${creatorName} Connect Card cover`}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'rgba(4,4,5,0.35)', 'rgba(4,4,5,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.connectOwnerTop}>
            <View style={styles.connectOwnerProduct}>
              <MaterialIcons name="contact-page" size={16} color={STUDIO.orangeSoft} />
              <Text style={styles.connectOwnerProductText}>PLUGGD CONNECT</Text>
            </View>
            <StatusChip label={publicRoute || slug ? 'Live' : 'Setup'} tone={publicRoute || slug ? 'native' : 'limited'} />
          </View>
        </View>
        <View style={styles.connectOwnerIdentity}>
          <View style={styles.connectOwnerAvatar}>
            {data.profile?.avatar_url ? (
              <PluggdImage uri={data.profile.avatar_url} style={StyleSheet.absoluteFill} accessibilityLabel={studioCreatorName(data)} />
            ) : (
              <PluggdImage
                uri=""
                fallbackSource={WEB_PARITY_ASSETS.intimateVocalist}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityLabel={creatorName}
              />
            )}
          </View>
          <View style={styles.connectOwnerCopy}>
            <Text style={styles.connectOwnerEyebrow}>YOUR DIGITAL IDENTITY</Text>
            <Text style={styles.connectOwnerName}>{creatorName}</Text>
            <Text style={styles.connectOwnerRole}>
              {data.connectProfile?.headline || 'Creator · independent · PLUGGD'}
            </Text>
          </View>
        </View>
        <View style={styles.connectOwnerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={publicRoute || slug ? 'Edit Connect Card' : 'Set up Connect Card'}
            onPress={() => routePush(router, '/studio/connect-card/edit')}
            style={[
              styles.connectOwnerPrimary,
              { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.borderAccent },
            ]}
          >
            <MaterialIcons name="edit" size={19} color={theme.colors.accent} />
            <Text style={[styles.connectOwnerPrimaryText, { color: theme.colors.text }]}>{publicRoute || slug ? 'Edit Card' : 'Start setup'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color={theme.colors.accent} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share Connect Card"
            onPress={() => {
              if (!slug) {
                routePush(router, '/studio/connect-card/edit');
                return;
              }
              void Share.share({
                title: `${creatorName} on PLUGGD`,
                message: `https://pluggd.fm/connect/${slug}`,
                url: `https://pluggd.fm/connect/${slug}`,
              });
            }}
            style={styles.connectOwnerSecondary}
          >
            <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.connectOwnerAddress}>
          <MaterialIcons name="link" size={16} color={STUDIO.orangeSoft} />
          <Text style={styles.connectOwnerAddressText} numberOfLines={1}>
            {slug ? `pluggd.fm/connect/${slug}` : 'Choose your Connect Card address'}
          </Text>
        </View>
      </View>

      <View style={styles.connectHealth}>
        <View style={styles.connectHealthCopy}>
          <Text style={styles.connectHealthEyebrow}>CARD SYSTEM</Text>
          <Text style={styles.connectHealthTitle}>{identityIsLive ? 'Core identity live' : 'Build your core identity'}</Text>
          <Text style={styles.connectHealthText}>
            One permanent profile, shaped into the right view for every introduction.
          </Text>
        </View>
        <View style={styles.connectHealthRing}>
          <MaterialIcons name={identityIsLive ? 'verified' : 'person-add-alt-1'} size={28} color={STUDIO.orangeSoft} />
        </View>
      </View>

      <View>
        <SectionTitle title="Choose what you need" />
        <Text style={styles.privateViewsIntro}>
          Each mode reveals only what that moment requires. Private details stay protected.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.connectViewRail}>
          {cardViews.map((view) => (
            <Pressable
              key={view.id}
              accessibilityRole="button"
              accessibilityLabel={`Preview ${view.label} card`}
              onPress={() => routePush(router, view.route)}
              style={styles.connectViewCard}
            >
              <PluggdImage
                uri=""
                fallbackSource={view.image}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityLabel=""
              />
              <LinearGradient colors={view.tone} style={StyleSheet.absoluteFill} />
              {/* view.tone starts near-transparent at the top, so the eyebrow and
                  icon sat straight on the photography — "PUBLIC" was barely
                  readable over a bright frame. This scrim only darkens the band
                  they occupy and leaves the image itself alone. */}
              <LinearGradient
                colors={['rgba(0,0,0,0.58)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0)']}
                locations={[0, 0.34, 0.62]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.connectViewCardTop}>
                <View style={styles.connectViewIcon}>
                  <MaterialIcons name={iconName(view.icon)} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.connectViewEyebrow}>{view.eyebrow}</Text>
              </View>
              <View style={styles.connectViewCardBottom}>
                <Text style={styles.connectViewLabel}>{view.label}</Text>
                <Text style={styles.connectViewDetail}>{view.detail}</Text>
                <View style={styles.connectViewFooter}>
                  <Text style={styles.connectViewOpen}>{view.id === 'collab' ? 'Start together' : view.id === 'contract' ? 'Secure preview' : 'Open preview'}</Text>
                  <MaterialIcons name="north-east" size={17} color={STUDIO.orangeSoft} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.connectSplitPanel,
          { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.connectSplitTop}>
          <View style={styles.connectSplitIcon}>
            <MaterialIcons name="account-tree" size={24} color="#170A03" />
          </View>
          <View style={[styles.connectSplitBadge, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <Text style={[styles.connectSplitBadgeText, { color: theme.colors.accentText }]}>COLLABORATOR MODE</Text>
          </View>
        </View>
        <Text style={[styles.connectSplitTitle, { color: theme.colors.text }]}>From introduction to agreed splits.</Text>
        <Text style={[styles.connectSplitText, { color: theme.colors.textSecondary }]}>
          Share your collaborator card, invite everyone on the work, agree percentages and keep one signed record.
        </Text>
        <View style={styles.connectSplitActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start a split sheet"
            onPress={() => routePush(router, '/studio/splits')}
            style={styles.connectSplitPrimary}
          >
            <Text style={styles.connectSplitPrimaryText}>Start a split sheet</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#170A03" />
          </Pressable>
          {slug ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Preview collaborator card"
              onPress={() => routePush(router, `/connect/${slug}/collab${previewQuery}`)}
              style={styles.connectSplitSecondary}
            >
              <MaterialIcons name="badge" size={20} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View>
        <SectionTitle title="Exchange tools" />
        <View style={styles.connectToolGrid}>
          {[
            { id: 'qr', icon: 'qr-code-2', title: 'Room-ready QR', detail: 'Open your card and show a full-screen code.', route: slug ? `/connect/${slug}${previewQuery}` : '/studio/connect-card/edit' },
            { id: 'wallet', icon: 'wallet', title: 'Apple Wallet', detail: 'Keep your identity one tap from the Lock Screen.', route: buildEmbeddedStudioRoute('/studio/connect-card', 'Connect Card', '/studio/connect-card') },
            { id: 'access', icon: 'shield', title: 'Private access', detail: 'Control collaborator and legal sharing links.', route: buildEmbeddedStudioRoute('/studio/connect-card', 'Connect Card', '/studio/connect-card') },
            { id: 'analytics', icon: 'insights', title: 'Card signals', detail: 'Review views, saves, shares and requests.', route: '/studio/analytics' },
          ].map((tool) => (
            <Pressable
              key={tool.id}
              accessibilityRole="button"
              accessibilityLabel={tool.title}
              onPress={() => routePush(router, tool.route)}
              style={styles.connectToolCard}
            >
              <View style={styles.connectToolIcon}>
                <MaterialIcons name={iconName(tool.icon)} size={21} color={STUDIO.orangeSoft} />
              </View>
              <Text style={styles.connectToolTitle}>{tool.title}</Text>
              <Text style={styles.connectToolDetail}>{tool.detail}</Text>
              <MaterialIcons name="arrow-forward" size={17} color={STUDIO.textSubtle} />
            </Pressable>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.connectFinishPanel,
          { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border },
        ]}
      >
        <View style={[styles.connectFinishIcon, { backgroundColor: theme.colors.accentSoft }]}>
          <MaterialIcons name="tune" size={22} color={theme.colors.accent} />
        </View>
        <View style={styles.connectFinishCopy}>
          <Text style={[styles.connectFinishTitle, { color: theme.colors.text }]}>Make every introduction count</Text>
          <Text style={[styles.connectFinishText, { color: theme.colors.textSecondary }]}>
            Complete the five views, choose exactly what each audience can see, and keep one permanent creator link.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open advanced Connect Card controls"
          onPress={() => routePush(router, buildEmbeddedStudioRoute('/studio/connect-card', 'Connect Card', '/studio/connect-card'))}
          style={styles.connectFinishButton}
        >
          <Text style={styles.connectFinishButtonText}>Advanced controls</Text>
          <MaterialIcons name="open-in-new" size={16} color="#170A03" />
        </Pressable>
      </View>
    </StudioShell>
  );
}

export function StudioConnectCardScreen() {
  return withStudioData('more', 'Connect Card', (data, query) => <StudioConnectCardContent data={data} query={query} />);
}

function StudioSplitGatewayContent({
  data,
  query,
}: {
  data: StudioData;
  query: ReturnType<typeof useStudioQuery>;
}) {
  const slug = data.connectProfile?.slug || '';
  const creatorName = data.connectProfile?.display_name || studioCreatorName(data);

  return (
    <StudioShell active="more" title="Split Engine" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <SplitEngineListPanel
        connectSlug={slug}
        creatorName={creatorName}
        avatarUrl={data.connectProfile?.avatar_url || data.profile?.avatar_url || null}
      />
    </StudioShell>
  );
}

export function StudioSplitGatewayScreen() {
  return withStudioData('more', 'Split Engine', (data, query) => <StudioSplitGatewayContent data={data} query={query} />);
}

function ModuleTileGrid({ modules, artwork, onOpen }: { modules: StudioModuleState[]; artwork: Record<string, string>; onOpen: (module: StudioModuleState) => void }) {
  const rows: StudioModuleState[][] = [];
  for (let index = 0; index < modules.length; index += 2) {
    rows.push(modules.slice(index, index + 2));
  }
  // A section holding a single module never establishes a grid rhythm, so the
  // half-width tile plus a dead half read as a layout fault. Let it run full
  // width instead. A trailing odd tile in a longer section keeps its gap, which
  // is ordinary grid behaviour and reads correctly.
  const soleModule = modules.length === 1 ? modules[0] : null;
  if (soleModule) {
    return (
      <View style={styles.moduleTileGrid}>
        <MoreModuleTile module={soleModule} artwork={artwork[soleModule.id]} onOpen={onOpen} />
      </View>
    );
  }
  return (
    <View style={styles.moduleTileGrid}>
      {rows.map((row, index) => (
        <View key={`module-tile-row-${index}`} style={styles.moduleTileRow}>
          {row.map((module) => (
            <MoreModuleTile key={module.id} module={module} artwork={artwork[module.id]} onOpen={onOpen} />
          ))}
          {row.length === 1 ? <View style={styles.moduleTileSpacer} /> : null}
        </View>
      ))}
    </View>
  );
}

function MoreModuleTile({ module, artwork, onOpen }: { module: StudioModuleState; artwork?: string; onOpen: (module: StudioModuleState) => void }) {
  const canOpen = Boolean(module.route);
  const chip = moduleChip(module);
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : 'text'}
      disabled={!canOpen}
      onPress={() => onOpen(module)}
      style={styles.moduleTileTap}
    >
      <GlassPanel
        intensity="subtle"
        decorative={false}
        style={styles.moduleTile}
        contentStyle={styles.moduleTileContent}
      >
        {artwork ? (
          <>
            <PluggdImage uri={artwork} style={styles.tileArtwork} resizeMode="cover" accessibilityLabel="" />
            <LinearGradient
              colors={['rgba(5,5,7,0.34)', 'rgba(5,5,7,0.82)', 'rgba(5,5,7,0.96)']}
              locations={[0, 0.5, 1]}
              style={styles.tileArtwork}
              pointerEvents="none"
            />
          </>
        ) : null}
        <View style={styles.moduleTileTop}>
          <View style={[styles.moduleTileIcon, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
            <MaterialIcons name={iconName(module.icon)} size={21} color={module.plugged || module.alwaysVisible ? theme.colors.accent : theme.colors.textMuted} />
          </View>
          {canOpen ? <MaterialIcons name="arrow-outward" size={18} color={theme.colors.textMuted} /> : null}
        </View>
        <Text style={[styles.moduleTileTitle, { color: artwork ? STUDIO.text : theme.colors.text }]} numberOfLines={2}>{module.title}</Text>
        <Text style={[styles.moduleTileDetail, { color: artwork ? STUDIO.textMid : theme.colors.textMuted }]} numberOfLines={2}>
          {tileCopy(module.status === 'web_only' ? module.unavailableReason || module.description : module.description)}
        </Text>
        {chip ? (
          <View style={styles.moduleTileChips}>
            <StatusChip label={chip.label} tone={chip.tone} />
          </View>
        ) : null}
      </GlassPanel>
    </Pressable>
  );
}

function StudioMoreContent({
  data,
  query,
}: {
  data: StudioData;
  query: ReturnType<typeof useStudioQuery>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, setAddingModuleId] = useState<string | null>(null);
  const sections = SECTION_ORDER.map((section) => ({
    section,
    modules: data.modules.filter((module) => module.section === section && (module.plugged || module.alwaysVisible || module.recommendedForRole)),
  })).filter((group) => group.modules.length > 0);
  const pluggedCount = data.modules.filter((module) => module.plugged || module.alwaysVisible).length;
  const advancedCount = data.modules.filter((module) => module.status === 'web_only' && (module.plugged || module.recommendedForRole)).length;
  const artwork = artworkByModule(data.catalogItems);
  const openModule = (module: StudioModuleState) => {
    if (!module.route) return;
    if (module.plugged || module.defaultForRole || module.alwaysVisible) {
      routePush(router, module.route);
      return;
    }
    Alert.alert(
      `Add ${module.title} to Studio?`,
      `${module.description} You can remove it later from Studio Apps.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Studio',
          onPress: () => {
            setAddingModuleId(module.id);
            void setStudioModulePlugged(data.userId, module.id, true)
              .then(() => queryClient.invalidateQueries({ queryKey: QUERY_KEY }))
              .then(() => routePush(router, module.route))
              .catch(() => Alert.alert('Could not add module', `${module.title} was not changed. Try again.`))
              .finally(() => setAddingModuleId(null));
          },
        },
      ],
    );
  };
  return (
    <StudioShell active="more" title="More" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <StudioPageHeader
        icon="more-horiz"
        kicker="More Studio"
        title="Everything else in your Studio."
        meta={`${pluggedCount} active · ${advancedCount} advanced tools`}
      />
      {sections.map((group) => (
        <View key={group.section}>
          <SectionTitle title={SECTION_LABELS[group.section]} />
          <ModuleTileGrid modules={group.modules} artwork={artwork} onOpen={openModule} />
        </View>
      ))}
    </StudioShell>
  );
}

export function StudioMoreScreen() {
  return withStudioData('more', 'More', (data, query) => <StudioMoreContent data={data} query={query} />);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 12,
    gap: 12,
  },
  previewDataNotice: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.42)',
    backgroundColor: 'rgba(255,106,0,0.1)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  previewDataNoticeText: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  topBar: {
    minHeight: 78,
    marginHorizontal: -12,
    marginBottom: -10,
    paddingHorizontal: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(4,4,5,0.92)',
  },
  studioMenuTap: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
  studioMenuButton: {
    width: 44,
    height: 44,
    // Sat beside the back button as a second 44pt circle, separated only by ring
    // colour — two near-identical controls doing unrelated jobs. A rounded square
    // reads as a tile, which is what it opens, and tells them apart at a glance.
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255,106,0,0.62)',
    backgroundColor: 'rgba(255,106,0,0.11)',
    paddingHorizontal: 0,
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  studioMenuOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.26)',
  },
  studioMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  studioMenuDrawer: {
    height: '100%',
    backgroundColor: '#09090B',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000000',
    shadowOpacity: 0.48,
    shadowRadius: 24,
    shadowOffset: { width: 8, height: 0 },
    elevation: 18,
  },
  studioMenuHeader: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.11)',
  },
  studioMenuEyebrow: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  studioMenuTitle: {
    marginTop: 3,
    color: STUDIO.text,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 21,
    lineHeight: 25,
  },
  studioMenuClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  studioMenuScroll: {
    flex: 1,
  },
  studioMenuScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 14,
  },
  studioMenuSection: {
    gap: 4,
  },
  studioMenuSectionLabel: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 5,
    color: STUDIO.textSubtle,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    letterSpacing: 1.05,
    textTransform: 'uppercase',
  },
  studioMenuItem: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  studioMenuItemActive: {
    backgroundColor: 'rgba(255,106,0,0.11)',
    borderColor: 'rgba(255,106,0,0.34)',
  },
  studioMenuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.065)',
  },
  studioMenuItemIconActive: {
    backgroundColor: STUDIO.orangeSoft,
  },
  studioMenuItemLabel: {
    flex: 1,
    color: STUDIO.text,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  studioMenuItemLabelActive: {
    color: STUDIO.orangeSoft,
  },
  studioTopLeft: {
    width: 96,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioExitButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  studioBrandPlug: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orangeSoft,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  studioBrandTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  studioAccountPill: {
    width: 78,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingLeft: 6,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioAccountText: { fontFamily: pluggdFonts.satoshiBold,
    flex: 1,
    minWidth: 0,
    color: STUDIO.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
  },
  topBarCenter: {
    flex: 1,
    minWidth: 0,
  },
  topBarKicker: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  topBarTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 31,
    height: 31,
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    fontWeight: '900',
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  dock: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 68,
    borderRadius: 26,
    padding: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  dockGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
  dockInner: {
    flex: 1,
    width: '100%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 3,
  },
  dockItem: {
    width: 55,
    flexGrow: 0,
    flexShrink: 0,
    height: 54,
    borderRadius: 18,
  },
  dockItemInner: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  dockItemActive: {
    backgroundColor: 'rgba(255,106,0,0.11)',
  },
  dockIconShell: {
    width: 32,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconActive: {
    backgroundColor: 'rgba(255,106,0,0.12)',
  },
  dockActiveSignal: {
    position: 'absolute',
    bottom: 4,
    width: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: STUDIO.orange,
  },
  dockCreateTap: {
    width: 76,
    height: 58,
    marginHorizontal: 1,
    borderRadius: 21,
  },
  dockCreateButton: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: STUDIO.orange,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  dockCreateIcon: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCreateLabel: {
    color: '#160A03',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '900',
  },
  dockLabel: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  stateTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 21,
    fontWeight: '900',
  },
  stateText: { fontFamily: pluggdFonts.satoshiBold,
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontFamily: pluggdFonts.satoshiBlack,
    color: '#0a0806',
    fontSize: 14,
    fontWeight: '900',
  },
  accessHero: {
    minHeight: 342,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.34)',
    borderRadius: 28,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  accessGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -96,
    top: -84,
    backgroundColor: 'rgba(255,106,0,0.18)',
  },
  accessHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accessHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.42)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessEyebrow: {
    marginTop: 24,
    color: STUDIO.orange,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9.5,
    letterSpacing: 1.5,
  },
  accessHeroTitle: {
    marginTop: 8,
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1,
  },
  accessHeroBody: {
    maxWidth: 310,
    marginTop: 11,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 13.5,
    lineHeight: 20,
  },
  accessHeroActions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 9,
  },
  accessPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: STUDIO.orange,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  accessPrimaryText: {
    color: '#130A04',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 13.5,
  },
  accessSecondary: {
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: STUDIO.line,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessSecondaryText: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 13,
  },
  accessSectionMeta: {
    color: STUDIO.textSubtle,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 8.5,
    letterSpacing: 1.25,
  },
  accessCapabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  accessCapability: {
    width: '48.5%',
    minHeight: 128,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panel,
    padding: 14,
  },
  accessCapabilityIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,106,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessCapabilityTitle: {
    marginTop: 12,
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 14,
  },
  accessCapabilityBody: {
    marginTop: 4,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  accessTrustBand: {
    minHeight: 70,
    borderLeftWidth: 2,
    borderLeftColor: STUDIO.orange,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  accessTrustText: {
    flex: 1,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  commandCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.19)',
    borderRadius: 26,
    minHeight: 438,
    overflow: 'hidden',
    position: 'relative',
  },
  platformPlanCard: {
    minHeight: 126,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  platformPlanCardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.995 }],
  },
  platformPlanIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformPlanCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  platformPlanKicker: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  platformPlanTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 19,
    lineHeight: 23,
  },
  platformPlanBody: {
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  platformPlanAction: {
    maxWidth: 74,
    alignItems: 'flex-end',
    gap: 4,
  },
  platformPlanActionText: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'right',
  },
  commandBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  commandContent: {
    minHeight: 438,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 14,
  },
  commandTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  commandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  commandKicker: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kicker: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orange,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  commandTitle: {
    ...pluggdTextStyles.heroTitle,
    color: STUDIO.text,
    fontSize: 35,
    lineHeight: 37,
    letterSpacing: 0,
  },
  commandBody: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  liveChip: {
    alignSelf: 'flex-start',
    minHeight: 26,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.25)',
    backgroundColor: 'rgba(255,106,0,0.10)',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveChipText: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orangeSoft,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  liveChipDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: STUDIO.orange,
  },
  healthWrap: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthPercent: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  healthLabel: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  commandActionDeck: {
    gap: 8,
  },
  commandPrimaryTap: {
    minHeight: 48,
    borderRadius: 17,
    overflow: 'hidden',
  },
  commandPrimaryAction: {
    minHeight: 48,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    gap: 9,
  },
  commandPrimaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandPrimaryText: {
    flex: 1,
    color: '#170A03',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  commandQuickRow: {
    flexDirection: 'row',
    gap: 7,
  },
  commandQuickAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(8,8,11,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 5,
  },
  commandQuickText: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  nextMove: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingTop: 12,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextMoveText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nextMoveTitle: { fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  nextMoveKicker: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  nextMoveDetail: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textSubtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  roundIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeader: {
    gap: 7,
    paddingTop: 2,
    paddingBottom: 4,
  },
  pageHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageHeaderIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(255,106,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeaderKicker: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  pageHeaderTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 23,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  pageHeaderMeta: {
    color: STUDIO.textSubtle,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '700',
  },
  actionBoardHero: {
    minHeight: 188,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.34)',
    padding: 17,
    overflow: 'hidden',
  },
  actionBoardSignal: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: STUDIO.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionBoardKicker: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  actionBoardTitle: {
    marginTop: 5,
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '900',
  },
  actionBoardBody: {
    marginTop: 8,
    maxWidth: 310,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  actionBoardGrid: {
    gap: 10,
  },
  actionBoardRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBoardTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 176,
    borderRadius: 22,
    overflow: 'hidden',
  },
  actionBoardTileSpacer: {
    flex: 1,
  },
  actionBoardTileInner: {
    flex: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 13,
    alignItems: 'flex-start',
  },
  actionBoardTileTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionBoardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBoardTileTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  actionBoardTileBody: {
    minHeight: 32,
    marginTop: 5,
    marginBottom: 10,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  kpiGrid: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'row',
    gap: 9,
  },
  kpiCardTap: {
    flex: 1,
    minWidth: 0,
  },
  kpiCard: {
    width: '100%',
    minHeight: 108,
    borderRadius: 18,
    overflow: 'hidden',
  },
  kpiCardContent: {
    flex: 1,
    minHeight: 108,
    padding: 10,
    justifyContent: 'space-between',
  },
  kpiHead: {
    alignItems: 'flex-start',
    gap: 5,
  },
  kpiLabel: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  kpiValue: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.text,
    fontSize: 23,
    lineHeight: 25,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  kpiDetail: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textSubtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  kpiSpark: {
    height: 11,
    borderRadius: 999,
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  activityCard: {
    minHeight: 250,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.28)',
    padding: 16,
    overflow: 'hidden',
  },
  activityHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  activityKicker: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orangeSoft,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityTitle: {
    fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '900',
    marginTop: 3,
  },
  activityBadge: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.28)',
    backgroundColor: 'rgba(0,0,0,0.26)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activityBadgeText: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textMid,
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activityChart: {
    height: 118,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  activityColumn: {
    flex: 1,
    height: 118,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  activityValue: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textMid,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    marginBottom: 5,
    fontVariant: ['tabular-nums'],
  },
  activityTrack: {
    width: '72%',
    height: 74,
    borderRadius: 7,
    // Deliberately unfilled. With a background, a month holding nothing rendered
    // as a full-height dark bar, so five quiet months read as five real bars.
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  activityBar: {
    width: '100%',
    borderRadius: 7,
  },
  activityMonth: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textSubtle,
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: '900',
    marginTop: 6,
  },
  activityNote: {
    fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textSubtle,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  zoneGrid: {
    alignSelf: 'stretch',
    width: '100%',
    gap: 9,
  },
  zoneRow: {
    alignSelf: 'stretch',
    width: '100%',
    flexDirection: 'row',
    gap: 9,
  },
  zoneCardTap: {
    flex: 1,
    minWidth: 0,
  },
  zoneCard: {
    width: '100%',
    minHeight: 84,
    borderRadius: 18,
    overflow: 'hidden',
  },
  zoneCardContent: {
    flex: 1,
    minHeight: 84,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(0,0,0,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneCardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  zoneTitle: { fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },
  zoneDetail: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textSubtle,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  statusChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionKicker: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textMid,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  progressRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
  },
  progressLabel: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  progressDetail: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  progressTrack: {
    width: 96,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
  },
  sectionTitleRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: pluggdFonts.displayBold,
    // Had no colour, so it fell back to the platform default — black text on
    // the Studio's dark ground. "Close to the work." was rendering invisible.
    color: STUDIO.text,
    // Sized to sit clearly under StudioPageHeader's title. At the previous 22 it
    // matched the page title, so every screen read as two competing headlines.
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  sectionAction: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  catalogStrip: {
    gap: 12,
    paddingRight: 8,
  },
  catalogCard: {
    width: 150,
  },
  catalogArt: {
    width: 150,
    height: 112,
    borderRadius: 20,
    overflow: 'hidden',
  },
  catalogArtFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogInitial: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 22,
    fontWeight: '900',
  },
  catalogKind: { fontFamily: pluggdFonts.satoshiBlack,
    marginTop: 9,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  catalogTitle: { fontFamily: pluggdFonts.displayBold,
    marginTop: 2,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  catalogSubtitle: { fontFamily: pluggdFonts.satoshiBold,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  catalogManagerTabs: {
    gap: 8,
    paddingRight: 12,
  },
  catalogManagerTab: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  catalogManagerTabActive: {
    borderColor: STUDIO.orange,
    backgroundColor: STUDIO.orangeSoft,
  },
  catalogManagerTabText: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  catalogManagerTabTextActive: {
    color: '#170A03',
  },
  catalogManagerSelected: {
    minHeight: 104,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.lineHot,
    padding: 16,
    gap: 14,
  },
  catalogManagerSelectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catalogManagerSelectedArtwork: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: STUDIO.panelDeep,
  },
  catalogManagerSelectedCopy: {
    flex: 1,
    gap: 3,
  },
  catalogManagerSelectedTitle: {
    fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
  },
  catalogManagerSelectedMeta: {
    fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  catalogManagerFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catalogManagerFact: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 2,
  },
  catalogManagerFactLabel: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textSubtle,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  catalogManagerFactValue: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  catalogManagerActions: {
    gap: 8,
  },
  catalogManagerAction: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(0,0,0,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catalogManagerActionPrimary: {
    borderColor: STUDIO.orangeSoft,
    backgroundColor: STUDIO.orangeSoft,
  },
  catalogManagerActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogManagerActionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  catalogManagerActionTitle: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  catalogManagerActionTitlePrimary: {
    color: '#170A03',
  },
  catalogManagerActionDetail: {
    fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  catalogManagerActionDetailPrimary: {
    color: 'rgba(23,10,3,0.72)',
  },
  trackLyricsScreen: { flex: 1, backgroundColor: '#0B0A0E' },
  trackLyricsHeader: { minHeight: 92, paddingTop: 20, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: STUDIO.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackLyricsHeaderCopy: { flex: 1, minWidth: 0 },
  trackLyricsTitle: { color: STUDIO.text, fontFamily: pluggdFonts.displayBold, fontSize: 27, lineHeight: 31, fontWeight: '900' },
  trackLyricsRelease: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 12, lineHeight: 16, fontWeight: '700', marginTop: 2 },
  trackLyricsLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  trackLyricsLoadingText: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  trackLyricsError: { color: STUDIO.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  trackLyricsContent: { padding: 18, paddingBottom: 64, gap: 18 },
  trackLyricsTrackList: { gap: 8, paddingRight: 12 },
  trackLyricsTrack: { minWidth: 132, maxWidth: 210, minHeight: 54, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackLyricsTrackActive: { borderColor: STUDIO.orange, backgroundColor: STUDIO.orange },
  trackLyricsTrackNumber: { color: STUDIO.orangeSoft, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 0.8 },
  trackLyricsTrackNumberActive: { color: '#170A03' },
  trackLyricsTrackTitle: { flex: 1, color: STUDIO.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  trackLyricsTrackTitleActive: { color: '#170A03' },
  trackLyricsModeRow: { flexDirection: 'row', gap: 8 },
  trackLyricsMode: { flex: 1, minHeight: 50, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, alignItems: 'center', justifyContent: 'center', gap: 3 },
  trackLyricsModeActive: { borderColor: STUDIO.orange, backgroundColor: STUDIO.orange },
  trackLyricsModeText: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5 },
  trackLyricsModeTextActive: { color: '#170A03' },
  tapSyncPanel: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: '#583B74', backgroundColor: '#15111C', padding: 13, gap: 12 },
  tapSyncPlayer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tapSyncPlay: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED' },
  tapSyncPlayerCopy: { flex: 1, minWidth: 0 },
  tapSyncTrack: { color: STUDIO.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  tapSyncTime: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, marginTop: 2 },
  tapSyncReset: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line, alignItems: 'center', justifyContent: 'center' },
  tapSyncCurrent: { minHeight: 96, borderRadius: 15, backgroundColor: 'rgba(124,58,237,0.14)', padding: 14, justifyContent: 'center' },
  tapSyncKicker: { color: '#C4B5FD', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1 },
  tapSyncCurrentText: { color: STUDIO.text, fontFamily: pluggdFonts.displayBold, fontSize: 22, lineHeight: 27, marginTop: 5 },
  tapSyncButton: { minHeight: 54, borderRadius: 15, backgroundColor: STUDIO.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tapSyncButtonText: { color: '#170A03', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  tapSyncLineList: { maxHeight: 210, gap: 5 },
  tapSyncLine: { minHeight: 44, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.035)' },
  tapSyncLineActive: { backgroundColor: 'rgba(167,139,250,0.16)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)' },
  tapSyncLineTime: { width: 44, color: '#A78BFA', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5 },
  tapSyncLineText: { flex: 1, color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 11.5 },
  trackLyricsFieldLabel: { color: STUDIO.orangeSoft, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, lineHeight: 12, letterSpacing: 1.1, marginBottom: 7 },
  trackLyricsInput: { minHeight: 300, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line, backgroundColor: 'rgba(0,0,0,0.34)', padding: 14, color: STUDIO.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 16, lineHeight: 24 },
  trackLyricsCount: { color: STUDIO.textSubtle, fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5, marginTop: 6 },
  trackLyricsMetaRow: { flexDirection: 'row', gap: 10 },
  trackLyricsLanguageWrap: { width: 112 },
  trackLyricsLanguage: { minHeight: 52, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, color: STUDIO.text, paddingHorizontal: 13, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  trackLyricsSourceSummary: { flex: 1, minHeight: 74, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, padding: 13 },
  trackLyricsSourceValue: { color: STUDIO.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, marginTop: 5 },
  trackLyricsRights: { minHeight: 92, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,101,0,0.28)', backgroundColor: 'rgba(255,101,0,0.08)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackLyricsRightsCopy: { flex: 1, minWidth: 0 },
  trackLyricsRightsTitle: { color: STUDIO.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  trackLyricsRightsDetail: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  trackLyricsActions: { gap: 9 },
  trackLyricsDraftButton: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: STUDIO.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  trackLyricsDraftButtonText: { color: STUDIO.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12.5 },
  trackLyricsPublishButton: { minHeight: 56, borderRadius: 16, backgroundColor: STUDIO.orange, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackLyricsPublishButtonText: { color: '#170A03', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13.5 },
  catalogManagerClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(0,0,0,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogManagerHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  catalogManagerEyebrow: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orangeSoft,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  catalogManagerHeading: {
    marginTop: 3,
    fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
  },
  catalogManagerList: {
    gap: 10,
  },
  catalogManagerRow: {
    minHeight: 112,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panel,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catalogManagerArtwork: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: STUDIO.panelDeep,
  },
  catalogManagerRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  catalogManagerRowKicker: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orangeSoft,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  catalogManagerRowTitle: {
    fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
  },
  catalogManagerRowMeta: {
    fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  catalogManagerArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogManagerEmpty: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panel,
    padding: 18,
    gap: 9,
  },
  catalogManagerEmptyTitle: {
    fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  catalogManagerEmptyText: {
    fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  catalogManagerPrimary: {
    alignSelf: 'flex-start',
    minHeight: 46,
    marginTop: 4,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: STUDIO.orangeSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  catalogManagerPrimaryCompact: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: STUDIO.orangeSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  catalogManagerPrimaryText: {
    fontFamily: pluggdFonts.satoshiBlack,
    color: '#170A03',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 6,
  },
  emptyTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  stack: {
    gap: 10,
  },
  actionRow: {
    minHeight: 86,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  actionRowCompact: {
    minHeight: 72,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  actionTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  actionDetail: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  appsHero: {
    minHeight: 276,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.31)',
    padding: 17,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  appsHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: STUDIO.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appsEyebrow: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orangeSoft,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  appsTitle: { fontFamily: pluggdFonts.displayExtraBold,
    marginTop: 6,
    color: '#FFFFFF',
    maxWidth: 320,
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '900',
    letterSpacing: 0,
  },
  appsBody: { fontFamily: pluggdFonts.satoshiBold,
    marginTop: 6,
    color: '#A9A9B6',
    maxWidth: 325,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  appsStats: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 48,
  },
  appsStat: {
    flex: 1,
    justifyContent: 'center',
  },
  appsStatDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  appsStatValue: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  appsStatLabel: {
    marginTop: 2,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
  },
  segmentStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15151D',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a221a',
  },
  segmentActive: {
    backgroundColor: '#ff6600',
    borderColor: '#ff6600',
  },
  segmentText: { fontFamily: pluggdFonts.satoshiBlack,
    color: '#A9A9B6',
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#0a0806',
  },
  moduleCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 2,
  },
  moduleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modulePluggedMark: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    backgroundColor: STUDIO.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  moduleTitle: { fontFamily: pluggdFonts.displayBold,
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  moduleDetail: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '700',
  },
  modulePrimaryAction: {
    minWidth: 70,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modulePrimaryActionText: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 11,
    fontWeight: '900',
  },
  moduleRemoveAction: {
    minHeight: 44,
    alignSelf: 'flex-end',
    marginBottom: -7,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  moduleRemoveActionText: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10.5,
    fontWeight: '900',
  },
  moduleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleAdds: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  moduleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 12,
    fontWeight: '900',
  },
  noteCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: { fontFamily: pluggdFonts.satoshiBold,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  myPluggdHero: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    borderRadius: 24,
    padding: 14,
    gap: 14,
    overflow: 'hidden',
  },
  myPluggdHeroTop: {
    gap: 7,
  },
  myPluggdHeroCopy: {
    gap: 7,
  },
  myPluggdTitle: { fontFamily: pluggdFonts.displayExtraBold,
    color: STUDIO.text,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0,
  },
  myPluggdBody: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  myPluggdAvatarStack: {
    width: 104,
    minHeight: 102,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(0,0,0,0.28)',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  myPluggdAvatarName: { fontFamily: pluggdFonts.displayBold,
    alignSelf: 'stretch',
    color: STUDIO.text,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  myPluggdAvatarHandle: { fontFamily: pluggdFonts.satoshiBold,
    alignSelf: 'stretch',
    color: STUDIO.textSubtle,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
  myPluggdHeroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  myPluggdPrimaryPill: {
    width: 152,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  myPluggdPrimaryText: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.text,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  myPluggdReadyPill: {
    width: 142,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.lineHot,
    backgroundColor: 'rgba(255,106,0,0.13)',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  myPluggdReadyText: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.orangeSoft,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  myPluggdTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  myPluggdTab: {
    minHeight: 44,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.chip,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myPluggdTabActive: {
    borderColor: STUDIO.orange,
    backgroundColor: STUDIO.orange,
  },
  myPluggdTabText: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  myPluggdTabTextActive: {
    color: '#0a0806',
  },
  myPluggdStatusCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panelDeep,
    padding: 14,
    gap: 12,
  },
  myPluggdStatusTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  myPluggdStatusLabel: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  myPluggdStatusTitle: { fontFamily: pluggdFonts.displayBold,
    marginTop: 4,
    color: STUDIO.text,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  myPluggdNextCard: {
    minHeight: 96,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.11)',
    backgroundColor: 'rgba(255,255,255,0.065)',
    padding: 11,
    gap: 10,
  },
  myPluggdNextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myPluggdNextIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.lineHot,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myPluggdNextCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  myPluggdNextKicker: { fontFamily: pluggdFonts.satoshiBlack,
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  myPluggdNextTitle: { fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  myPluggdNextDetail: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  myPluggdNextButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: STUDIO.orange,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myPluggdNextButtonText: { fontFamily: pluggdFonts.satoshiBlack,
    color: '#0a0806',
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
  },
  myPluggdSectionStack: {
    gap: 9,
  },
  myPluggdSectionCard: {
    minHeight: 104,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  myPluggdSectionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myPluggdSectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myPluggdSectionTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  myPluggdSectionTitle: { fontFamily: pluggdFonts.displayBold,
    flex: 1,
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  myPluggdSectionSummary: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  myPluggdSectionMeta: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textSubtle,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  identityCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  identityName: { fontFamily: pluggdFonts.displayBold,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
  },
  identityHandle: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  roleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  taskRow: {
    minHeight: 66,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskCopy: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: { fontFamily: pluggdFonts.displayBold,
    fontSize: 15,
    fontWeight: '900',
  },
  taskDetail: { fontFamily: pluggdFonts.satoshiBold,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  connectOwnerHero: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.36)',
    backgroundColor: '#08080A',
    overflow: 'hidden',
  },
  connectOwnerCover: {
    height: 186,
    overflow: 'hidden',
  },
  connectOwnerTop: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectOwnerProduct: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.38)',
    backgroundColor: 'rgba(6,6,8,0.80)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  connectOwnerProductText: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.1,
  },
  connectOwnerIdentity: {
    minHeight: 104,
    marginTop: -46,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 13,
  },
  connectOwnerAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: STUDIO.orange,
    backgroundColor: STUDIO.bg,
    overflow: 'hidden',
  },
  connectOwnerCopy: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 7,
    gap: 3,
  },
  connectOwnerEyebrow: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.25,
  },
  connectOwnerName: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 24,
    lineHeight: 28,
  },
  connectOwnerRole: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11,
    lineHeight: 15,
  },
  connectOwnerActions: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 9,
  },
  connectOwnerPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  connectOwnerPrimaryText: {
    flex: 1,
    color: '#170A03',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 12,
  },
  connectOwnerSecondary: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectOwnerAddress: {
    minHeight: 44,
    margin: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectOwnerAddressText: {
    flex: 1,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11,
  },
  connectHealth: {
    minHeight: 124,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panelDeep,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectHealthCopy: {
    flex: 1,
    gap: 4,
  },
  connectHealthEyebrow: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.3,
  },
  connectHealthTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 20,
  },
  connectHealthText: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 11,
    lineHeight: 16,
  },
  connectHealthRing: {
    width: 67,
    height: 67,
    borderRadius: 34,
    borderWidth: 6,
    borderColor: STUDIO.orange,
    backgroundColor: 'rgba(255,106,0,0.08)',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingTop: 17,
  },
  connectHealthRingValue: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 20,
  },
  connectHealthRingUnit: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
  },
  connectViewRail: {
    gap: 11,
    paddingRight: 4,
  },
  connectViewCard: {
    width: 248,
    height: 224,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.17)',
    overflow: 'hidden',
    padding: 15,
    justifyContent: 'space-between',
  },
  connectViewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectViewIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(4,4,5,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectViewEyebrow: {
    color: '#FFFFFF',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  connectViewCardBottom: {
    gap: 5,
  },
  connectViewLabel: {
    color: '#FFFFFF',
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 22,
    lineHeight: 26,
  },
  connectViewDetail: {
    minHeight: 34,
    color: 'rgba(255,255,255,0.76)',
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 11,
    lineHeight: 16,
  },
  connectViewFooter: {
    marginTop: 4,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectViewOpen: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
  },
  connectToolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  connectToolCard: {
    width: '48%',
    minHeight: 165,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panelDeep,
    padding: 14,
    gap: 8,
  },
  connectToolIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectToolTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 14,
    lineHeight: 18,
  },
  connectToolDetail: {
    flex: 1,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 10.5,
    lineHeight: 15,
  },
  connectFinishPanel: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.34)',
    padding: 16,
    gap: 13,
  },
  connectFinishIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectFinishCopy: {
    gap: 5,
  },
  connectFinishTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 20,
    lineHeight: 24,
  },
  connectFinishText: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 12,
    lineHeight: 18,
  },
  connectFinishButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: STUDIO.orange,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectFinishButtonText: {
    color: '#170A03',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 11,
  },
  connectSplitPanel: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.42)',
    padding: 17,
    gap: 10,
    overflow: 'hidden',
  },
  connectSplitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectSplitIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: STUDIO.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectSplitBadge: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,176,111,0.42)',
    backgroundColor: 'rgba(4,4,5,0.52)',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectSplitBadgeText: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 8.5,
    letterSpacing: 1.1,
  },
  connectSplitTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 25,
    lineHeight: 29,
    maxWidth: 320,
  },
  connectSplitText: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  connectSplitActions: {
    marginTop: 3,
    flexDirection: 'row',
    gap: 9,
  },
  connectSplitPrimary: {
    minHeight: 49,
    flex: 1,
    borderRadius: 15,
    backgroundColor: STUDIO.orange,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectSplitPrimaryText: {
    color: '#170A03',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 12,
  },
  connectSplitSecondary: {
    width: 49,
    height: 49,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(4,4,5,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitHero: {
    minHeight: 348,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.42)',
    padding: 18,
    justifyContent: 'flex-end',
    gap: 10,
    overflow: 'hidden',
  },
  splitHeroTop: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: STUDIO.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitEyebrow: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  splitHeroTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 32,
    lineHeight: 35,
    maxWidth: 330,
  },
  splitHeroText: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 12.5,
    lineHeight: 19,
  },
  splitHeroButton: {
    minHeight: 51,
    marginTop: 3,
    borderRadius: 16,
    backgroundColor: STUDIO.orange,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitHeroButtonText: {
    color: '#170A03',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 13,
  },
  splitStepStack: {
    gap: 8,
  },
  splitStep: {
    minHeight: 92,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panelDeep,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  splitStepNumber: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitStepNumberText: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 16,
  },
  splitStepCopy: {
    flex: 1,
    gap: 5,
  },
  splitStepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  splitStepTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 15,
  },
  splitStepText: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 11,
    lineHeight: 16,
  },
  splitIdentityPanel: {
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.lineHot,
    backgroundColor: 'rgba(255,106,0,0.065)',
    padding: 15,
    gap: 14,
  },
  splitIdentityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  splitIdentityAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: STUDIO.orange,
    backgroundColor: STUDIO.panelDeep,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitIdentityInitials: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 17,
  },
  splitIdentityCopy: {
    flex: 1,
    gap: 2,
  },
  splitIdentityEyebrow: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 8.5,
    letterSpacing: 1.15,
  },
  splitIdentityName: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 18,
  },
  splitIdentityStatus: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 10.5,
  },
  splitIdentityButton: {
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitIdentityButtonText: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 11,
  },
  splitToolGrid: {
    gap: 8,
  },
  splitTool: {
    minHeight: 82,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panelDeep,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  splitToolIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitToolCopy: {
    flex: 1,
    gap: 3,
  },
  splitToolTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 14,
  },
  splitToolText: {
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 10.5,
    lineHeight: 15,
  },
  connectHero: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,106,0,0.34)',
    padding: 18,
    gap: 16,
    overflow: 'hidden',
  },
  connectHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectKicker: {
    color: STUDIO.orangeSoft,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  connectIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  connectAvatar: {
    width: 74,
    height: 74,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  connectAvatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectAvatarText: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 24,
    fontWeight: '900',
  },
  connectIdentityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  connectTitle: { fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  connectText: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  connectRouteBand: {
    minHeight: 42,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.30)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectRouteText: {
    flex: 1,
    minWidth: 0,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  connectPrimaryButton: {
    minHeight: 48,
    borderRadius: 17,
    backgroundColor: STUDIO.orange,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectPrimaryText: {
    color: '#170A03',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  privateViewsIntro: {
    marginTop: -2,
    marginBottom: 10,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  privateViewGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  privateViewCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 168,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panelDeep,
    padding: 13,
  },
  privateViewIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,106,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  privateViewTitle: {
    color: STUDIO.text,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  privateViewDetail: {
    minHeight: 47,
    marginTop: 5,
    color: STUDIO.textMid,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '700',
  },
  privateViewFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  privateViewStatus: {
    color: STUDIO.textSubtle,
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  moreHero: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  moreHeroTitle: { fontFamily: pluggdFonts.displayExtraBold,
    color: STUDIO.text,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  moreHeroBody: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  moreHeroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleTileGrid: {
    gap: 9,
  },
  moduleTileRow: {
    flexDirection: 'row',
    gap: 9,
  },
  moduleTileTap: {
    flex: 1,
  },
  moduleTileSpacer: {
    flex: 1,
  },
  moduleTile: {
    minHeight: 162,
    borderRadius: 20,
    overflow: 'hidden',
  },
  moduleTileContent: {
    flex: 1,
    minHeight: 162,
    padding: 12,
    gap: 8,
    overflow: 'hidden',
  },
  // Sits under the tile's padding so artwork bleeds to the rounded edge. Both
  // the image and its scrim use it, so they stay in register.
  tileArtwork: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  moduleTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleTileIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(0,0,0,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTileTitle: { fontFamily: pluggdFonts.displayBold,
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  moduleTileDetail: { fontFamily: pluggdFonts.satoshiBold,
    color: STUDIO.textMid,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  moduleTileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  analyticsRangeRow: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 17, backgroundColor: STUDIO.panel, borderWidth: 1, borderColor: STUDIO.line },
  analyticsRange: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  analyticsRangeActive: { backgroundColor: STUDIO.orange },
  analyticsRangeText: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  analyticsRangeTextActive: { color: '#170A03', fontFamily: pluggdFonts.satoshiBlack },
  analyticsState: { minHeight: 260, borderRadius: 22, borderWidth: 1, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  analyticsStateTitle: { color: STUDIO.text, fontFamily: pluggdFonts.displayBold, fontSize: 21 },
  analyticsStateText: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  analyticsRetry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 14, backgroundColor: STUDIO.orange, alignItems: 'center', justifyContent: 'center' },
  analyticsRetryText: { color: '#170A03', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  analyticsMetricGrid: { gap: 9 },
  analyticsMetricRow: { flexDirection: 'row', gap: 9 },
  analyticsMetric: { flex: 1, minHeight: 124, borderRadius: 20, borderWidth: 1, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, padding: 15 },
  analyticsMetricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analyticsMetricLabel: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  analyticsMetricValue: { color: STUDIO.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 28, lineHeight: 32, marginTop: 10 },
  analyticsMetricDetail: { color: STUDIO.textSubtle, fontFamily: pluggdFonts.satoshiRegular, fontSize: 10, lineHeight: 14, marginTop: 4 },
  analyticsTrendTabs: { flexDirection: 'row', gap: 6, marginBottom: 9 },
  analyticsTrendTab: { minHeight: 44, flex: 1, borderRadius: 12, borderWidth: 1, borderColor: STUDIO.line, alignItems: 'center', justifyContent: 'center' },
  analyticsTrendTabActive: { backgroundColor: '#3B1B0A', borderColor: '#8A3D0C' },
  analyticsTrendTabText: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 10 },
  analyticsTrendTabTextActive: { color: STUDIO.orange },
  analyticsTrendCard: { borderRadius: 22, borderWidth: 1, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, padding: 17 },
  analyticsTrendHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  analyticsEyebrow: { color: STUDIO.orange, fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1.3 },
  analyticsTrendValue: { color: STUDIO.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 31, marginTop: 4 },
  analyticsTrendMeta: { color: STUDIO.textSubtle, fontFamily: pluggdFonts.satoshiRegular, fontSize: 10 },
  analyticsBars: { height: 104, flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: STUDIO.line },
  analyticsBarSlot: { flex: 1, height: 100, justifyContent: 'flex-end' },
  analyticsBar: { width: '100%', minWidth: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: STUDIO.orange },
  analyticsBarEmpty: { backgroundColor: '#3C3536' },
  analyticsAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  analyticsAxisText: { color: STUDIO.textSubtle, fontFamily: pluggdFonts.satoshiRegular, fontSize: 9 },
  analyticsAudienceCard: { borderRadius: 22, borderWidth: 1, borderColor: STUDIO.line, backgroundColor: STUDIO.panel, padding: 17, gap: 18 },
  analyticsAudienceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  analyticsAudienceValue: { color: STUDIO.text, fontFamily: pluggdFonts.displayBold, fontSize: 22, textAlign: 'center' },
  analyticsAudienceLabel: { color: STUDIO.textSubtle, fontFamily: pluggdFonts.satoshiBold, fontSize: 8, letterSpacing: 0.8, marginTop: 4, textAlign: 'center' },
  analyticsRegions: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: STUDIO.line, paddingTop: 15, gap: 9 },
  analyticsRegion: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: STUDIO.line },
  analyticsRegionLabel: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  analyticsRegionValue: { color: STUDIO.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  analyticsEmptyInline: { minHeight: 78, borderRadius: 18, borderWidth: 1, borderColor: STUDIO.line, backgroundColor: '#141216', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  analyticsEmptyText: { flex: 1, color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiRegular, fontSize: 12, lineHeight: 18 },
  analyticsCoverage: { borderRadius: 17, borderWidth: 1, borderColor: '#594229', backgroundColor: '#20170E', padding: 14 },
  analyticsCoverageTitle: { color: '#F5A268', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
  analyticsCoverageText: { color: STUDIO.textMid, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11, lineHeight: 17, marginTop: 5 },
});
