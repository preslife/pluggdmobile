import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text as NativeText,
  type TextProps,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { AccountMenuButton } from '../../../components/AccountMenuButton';
import { PluggdGlassSurface } from '../../../components/PluggdPrimitives';
import { PluggdImage } from '../../components/PluggdImage';
import { selectionHaptic } from '../../design/haptics';
import { pluggdFonts, pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { formatCompact } from '../../lib/mobileContent';
import {
  loadStudioData,
  createStudioPreviewData,
  setStudioModulePlugged,
  studioCreatorName,
  type StudioAction,
  type StudioCatalogItem,
  type StudioData,
  type StudioModuleSection,
  type StudioModuleState,
} from './studio-data';
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

const QUERY_KEY = ['studio', 'native-command'] as const;

const STUDIO = {
  bg: '#020202',
  panel: 'rgba(255,255,255,0.065)',
  panelDeep: 'rgba(10,10,14,0.92)',
  panelPressed: 'rgba(255,255,255,0.11)',
  line: 'rgba(255,255,255,0.13)',
  lineHot: 'rgba(255,106,0,0.46)',
  orange: '#ff6a00',
  orangeSoft: '#ffb06f',
  text: '#ffffff',
  textMid: 'rgba(255,255,255,0.70)',
  textSubtle: 'rgba(255,255,255,0.48)',
  chip: 'rgba(255,255,255,0.075)',
  dock: 'rgba(7,7,10,0.985)',
};

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
  const publicRoute = profile?.username ? `/creator/${profile.username}` : '/profile';

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
      route: publicRoute,
      icon: 'storefront',
      complete: pageMissing.length === 0,
      missing: pageMissing,
      progressLabel: `${3 - pageMissing.length}/3 page signals`,
      cta: pageMissing.length === 0 ? 'Review page' : 'Build page',
      summary: 'Theme, sections, banner, featured presentation, and public storefront.',
    },
    {
      id: 'connect-card',
      title: 'Connect Card',
      shortTitle: 'Card',
      route: '/studio/connect-card',
      icon: 'badge',
      complete: Boolean(data.connectProfile?.slug),
      missing: data.connectProfile?.slug ? [] : ['connect identity'],
      progressLabel: data.connectProfile?.slug ? 'Card profile ready' : 'Not configured',
      cta: data.connectProfile?.slug ? 'Open card' : 'Set up card',
      summary: 'Public, business, rates, collaborator, and private sharing views.',
    },
    {
      id: 'embeds',
      title: 'Embeds & Share Tools',
      shortTitle: 'Embeds',
      route: '/studio/connect-card',
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
      route: '/settings/privacy',
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Exit Studio"
      accessibilityHint="Returns to the PLUGGD home screen"
      onPress={() => {
        selectionHaptic();
        router.replace('/' as any);
      }}
      style={({ pressed }) => [styles.studioExitButton, pressed && { backgroundColor: STUDIO.panelPressed }]}
    >
      <MaterialIcons name="arrow-back" size={20} color={STUDIO.text} />
    </Pressable>
  );
}

function StudioMenuButton() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Studio apps"
      onPress={() => {
        selectionHaptic();
        router.push('/studio/apps' as any);
      }}
      style={styles.studioMenuTap}
    >
      {({ pressed }) => (
        <View style={[styles.studioMenuButton, pressed && { backgroundColor: STUDIO.panelPressed }]}>
          <MaterialIcons name="view-sidebar" size={19} color={STUDIO.text} />
        </View>
      )}
    </Pressable>
  );
}

function StudioTopBar({ data, title }: { data: StudioData; title: string }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.studioTopLeft}>
        <StudioExitButton />
        {data.creatorAccess ? <StudioMenuButton /> : null}
      </View>
      <View style={styles.studioBrand}>
        <Text style={styles.studioBrandPlug}>PLUGGD</Text>
        <Text style={styles.studioBrandTitle} numberOfLines={1}>STUDIO</Text>
      </View>
      <AccountMenuButton context="studio" accessibilityLabel="Open Studio account menu" style={styles.studioAccountPill}>
        {() => (
          <>
            <HeaderAvatar data={data} />
            <Text style={styles.studioAccountText} numberOfLines={1}>
              {data.profile?.username ? `@${data.profile.username}` : data.signedIn ? 'Account' : 'Guest'}
            </Text>
            <MaterialIcons name="expand-more" size={15} color={STUDIO.textMid} />
          </>
        )}
      </AccountMenuButton>
    </View>
  );
}

function StudioDock({ active }: { active: StudioRouteKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
          colorScheme="dark"
          blurIntensity={64}
          tintColor="rgba(12,12,16,0.44)"
          fallbackColor="rgba(7,7,10,0.92)"
          borderColor="rgba(255,255,255,0.13)"
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
                  colors={isActive ? ['#ffb06f', '#ff6a00'] : ['#ff7a1a', '#e95300']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dockCreateButton}
                >
                  <View style={styles.dockCreateIcon}>
                    <MaterialIcons name="add" size={24} color="#160A03" />
                  </View>
                  <Text style={styles.dockCreateLabel}>Create</Text>
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
              style={({ pressed }) => [
                styles.dockItem,
                pressed && { opacity: 0.76 },
              ]}
            >
              <View style={[styles.dockItemInner, isActive && styles.dockItemActive]}>
                <View style={[styles.dockIconShell, isActive && styles.dockIconActive]}>
                  <MaterialIcons name={iconName(item.icon)} size={22} color={isActive ? STUDIO.orange : 'rgba(255,255,255,0.72)'} />
                </View>
                <Text style={[styles.dockLabel, { color: isActive ? STUDIO.orangeSoft : 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                  {item.label}
                </Text>
                {isActive ? <View style={styles.dockActiveSignal} /> : null}
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
  return (
    <View style={[styles.root, { backgroundColor: STUDIO.bg }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        key={active}
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
      <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}>
        <Text style={styles.primaryButtonText}>Retry</Text>
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
              style={({ pressed }) => [styles.commandPrimaryTap, pressed && { transform: [{ scale: 0.985 }] }]}
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
                style={({ pressed }) => [styles.commandQuickAction, pressed && { backgroundColor: 'rgba(255,255,255,0.16)' }]}
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
          style={({ pressed }) => [styles.nextMove, { opacity: pressed ? 0.74 : 1 }]}
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

function ActionBoard({ data }: { data: StudioData }) {
  const router = useRouter();
  const actionRows = Array.from({ length: Math.ceil(data.nativeActions.length / 2) }, (_, index) =>
    data.nativeActions.slice(index * 2, index * 2 + 2),
  );
  return (
    <>
      <LinearGradient
        colors={['rgba(255,106,0,0.27)', 'rgba(32,17,10,0.96)', 'rgba(7,7,10,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionBoardHero}
      >
        <View style={styles.actionBoardSignal}>
          <MaterialIcons name="bolt" size={18} color="#160A03" />
        </View>
        <Text style={styles.actionBoardKicker}>Creator actions</Text>
        <Text style={styles.actionBoardTitle}>What are you moving today?</Text>
        <Text style={styles.actionBoardBody}>Publish, go live, build your audience or prepare the next drop.</Text>
      </LinearGradient>
      <View style={styles.actionBoardGrid}>
        {actionRows.map((row, rowIndex) => (
          <View key={`action-row-${rowIndex}`} style={styles.actionBoardRow}>
            {row.map((action, columnIndex) => (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={action.title}
                onPress={() => routePush(router, action.route)}
                style={({ pressed }) => [styles.actionBoardTile, pressed && { transform: [{ scale: 0.985 }] }]}
              >
                <LinearGradient
                  colors={rowIndex === 0 && columnIndex === 0 ? ['rgba(255,106,0,0.24)', 'rgba(19,19,23,0.98)'] : ['rgba(255,255,255,0.09)', 'rgba(14,14,18,0.98)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBoardTileInner}
                >
                  <View style={styles.actionBoardTileTop}>
                    <View style={styles.actionBoardIcon}>
                      <MaterialIcons name={iconName(action.icon)} size={22} color={STUDIO.orangeSoft} />
                    </View>
                    <MaterialIcons name="north-east" size={18} color={STUDIO.textSubtle} />
                  </View>
                  <Text style={styles.actionBoardTileTitle} numberOfLines={2}>{action.title}</Text>
                  <Text style={styles.actionBoardTileBody} numberOfLines={2}>{action.detail}</Text>
                  <StatusChip
                    label={action.status === 'web_only' ? 'Desktop' : action.status === 'limited' ? 'Preview' : 'Ready'}
                    tone={action.status === 'native' ? 'native' : 'limited'}
                  />
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
  return (
    <Pressable
      accessibilityRole={route ? 'button' : 'text'}
      disabled={!route}
      onPress={() => routePush(router, route)}
      style={({ pressed }) => [
        styles.kpiCardTap,
        cardWidth ? { flex: 0, width: cardWidth } : null,
        pressed && { opacity: 0.78 },
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.115)', 'rgba(17,17,21,0.92)', 'rgba(2,2,3,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.kpiCard, cardWidth ? { width: cardWidth } : null]}
      >
        <View style={styles.kpiHead}>
          <MaterialIcons name={iconName(icon)} size={16} color={STUDIO.orange} />
          <Text style={styles.kpiLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={styles.kpiValue} numberOfLines={1}>
          {value}
        </Text>
        <View style={styles.kpiSpark} />
        <Text style={styles.kpiDetail} numberOfLines={1}>
          {detail}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function KpiGrid({ data }: { data: StudioData }) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(320, Math.floor(width - 24));
  const cardWidth = Math.floor((contentWidth - 18) / 3);
  return (
    <View style={[styles.kpiGrid, { width: contentWidth }]}>
      <KpiCard cardWidth={cardWidth} label="Catalog" value={formatCompact(data.stats.catalogCount)} detail={`${formatCompact(data.stats.releaseCount)} releases`} icon="library-music" route="/releases" />
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
      detail: 'Payouts and wallet',
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
              style={({ pressed }) => [
                styles.zoneCardTap,
                { flex: 0, width: zoneCardWidth },
                pressed && { opacity: 0.78 },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.13)', 'rgba(25,25,29,0.94)', 'rgba(5,5,7,0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.zoneCard, { width: zoneCardWidth }]}
              >
                <View style={styles.zoneIcon}>
                  <MaterialIcons name={iconName(zone.icon)} size={18} color={STUDIO.text} />
                </View>
                <View style={styles.zoneCardCopy}>
                  <Text style={styles.zoneTitle} numberOfLines={1}>{zone.title}</Text>
                  <Text style={styles.zoneDetail} numberOfLines={1}>
                    {zone.detail}
                  </Text>
                  <StatusChip label={zone.tag} />
                </View>
                <MaterialIcons name="arrow-outward" size={19} color={STUDIO.textMid} />
              </LinearGradient>
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
      <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View style={[styles.progressFill, { width: `${Math.max(6, Math.min(100, value))}%`, backgroundColor: theme.colors.accent }]} />
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
        <View style={styles.activityBadge}>
          <MaterialIcons name="insights" size={16} color={STUDIO.orangeSoft} />
          <Text style={styles.activityBadgeText}>REAL DATA</Text>
        </View>
      </View>
      <View style={styles.activityChart}>
        {activity.map((month) => (
          <View key={month.key} style={styles.activityColumn}>
            <Text style={styles.activityValue}>{month.count || '–'}</Text>
            <View style={styles.activityTrack}>
              <LinearGradient
                colors={month.count ? [STUDIO.orangeSoft, STUDIO.orange] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
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
      style={({ pressed }) => [
        styles.actionRow,
        compact && styles.actionRowCompact,
        {
          backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
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
      <StatusChip label={action.status === 'web_only' ? 'Desktop' : action.status === 'limited' ? 'Preview' : 'Ready'} tone={action.status === 'web_only' ? 'web' : action.status} />
    </Pressable>
  );
}

function ModuleCard({
  module,
  onToggle,
  busy,
}: {
  module: StudioModuleState;
  onToggle: (module: StudioModuleState) => void;
  busy: boolean;
}) {
  const theme = usePluggdTheme();
  const router = useRouter();
  const canToggle = !module.defaultForRole && !module.alwaysVisible;
  const statusTone = module.status === 'web_only' ? 'web' : module.status;
  const statusLabel = module.status === 'web_only' ? 'Desktop' : module.status === 'limited' ? 'Preview' : 'Ready';
  return (
    <View style={[styles.moduleCard, { backgroundColor: theme.colors.surface, borderColor: module.plugged ? theme.colors.borderAccent : theme.colors.border }]}>
      <View style={styles.moduleTop}>
        <View style={[styles.moduleIcon, { backgroundColor: theme.colors.surfaceAlt, borderColor: module.plugged ? theme.colors.borderAccent : theme.colors.border }]}>
          <MaterialIcons name={iconName(module.icon)} size={22} color={module.plugged ? theme.colors.accent : theme.colors.textSecondary} />
        </View>
        <View style={styles.moduleCopy}>
          <View style={styles.moduleTitleRow}>
            <Text style={[styles.moduleTitle, { color: theme.colors.text }]} numberOfLines={1}>{module.title}</Text>
            {module.recommendedForRole ? <StatusChip label="Recommended" tone="limited" /> : null}
          </View>
          <Text style={[styles.moduleDetail, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {module.description}
          </Text>
        </View>
      </View>

      <View style={styles.moduleMetaRow}>
        <StatusChip label={module.plugged ? 'Plugged in' : 'Available'} tone={module.plugged ? 'native' : 'neutral'} />
        <StatusChip label={statusLabel} tone={statusTone} />
      </View>

      <Text style={[styles.moduleAdds, { color: theme.colors.textSecondary }]} numberOfLines={2}>
        {module.addsToStudio}
      </Text>

      <View style={styles.moduleButtons}>
        {module.route ? (
          <Pressable accessibilityRole="button" onPress={() => routePush(router, module.route)} style={[styles.secondaryButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
              {module.status === 'limited' ? 'Preview' : 'Open'}
            </Text>
          </Pressable>
        ) : null}
        {canToggle ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onToggle(module)}
            style={[styles.secondaryButton, module.plugged ? { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt } : { borderColor: theme.colors.accent, backgroundColor: theme.colors.accent }]}
          >
            <Text style={[styles.secondaryButtonText, { color: module.plugged ? theme.colors.text : '#0a0806' }]}>
              {busy ? 'Saving' : module.plugged ? 'Unplug' : 'Plug in'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ComplianceNote() {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.noteCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <MaterialIcons name="verified-user" size={18} color={theme.colors.accent} />
      <Text style={[styles.noteText, { color: theme.colors.textMuted }]}>
        Mobile is for quick checks and lightweight actions. Use desktop Studio for distribution, tax, exports, rights, and payout operations.
      </Text>
    </View>
  );
}

export function StudioHomeScreen() {
  return withStudioData('home', 'Studio', (data, query) => (
    <StudioShell active="home" title="Studio" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <CommandCard data={data} />
      <KpiGrid data={data} />
      <ZoneGrid data={data} />
      <View>
        <SectionTitle title="Recent Studio Rows" actionLabel="Apps" actionRoute="/studio/apps" />
        <CatalogStrip items={data.catalogItems} />
      </View>
      <View>
        <SectionTitle title="Next Up" actionLabel="Action" actionRoute="/studio/action" />
        <View style={styles.stack}>
          <ActionRow action={data.nextMove} compact />
          {data.setupTasks
            .filter((task) => !task.complete)
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
    return (
      <StudioShell active="apps" title="Studio Apps" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
        <LinearGradient
          colors={['rgba(255,106,0,0.24)', 'rgba(26,15,10,0.96)', 'rgba(8,8,11,0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.appsHero}
        >
          <View style={styles.appsHeroIcon}>
            <MaterialIcons name="widgets" size={22} color="#180B04" />
          </View>
          <Text style={styles.appsEyebrow}>Your creator toolkit</Text>
          <Text style={styles.appsTitle}>Build the Studio around your work.</Text>
          <Text style={styles.appsBody}>Keep the tools you use daily close. Specialist desktop modules remain visible when a bigger workflow is needed.</Text>
          <View style={styles.appsStats}>
            <View style={styles.appsStat}>
              <Text style={styles.appsStatValue}>{formatCompact(pluggedCount)}</Text>
              <Text style={styles.appsStatLabel}>Plugged in</Text>
            </View>
            <View style={styles.appsStatDivider} />
            <View style={styles.appsStat}>
              <Text style={styles.appsStatValue}>{formatCompact(recommendedCount)}</Text>
              <Text style={styles.appsStatLabel}>Suggested for {ROLE_LABELS[data.primaryRole] ?? 'you'}</Text>
            </View>
          </View>
        </LinearGradient>

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

export function StudioActionScreen() {
  return withStudioData('action', 'Action', (data, query) => (
    <StudioShell active="action" title="Action" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <ActionBoard data={data} />
      <View>
        <SectionTitle title="Desktop Tools" />
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

export function StudioAnalyticsScreen() {
  return withStudioData('analytics', 'Analytics', (data, query) => {
    const total = Math.max(1, data.stats.catalogCount);
    return (
      <StudioShell active="analytics" title="Analytics" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
        <KpiGrid data={data} />
        <PublishingActivity data={data} />
        <View>
          <SectionTitle title="Catalog Mix" />
          <View style={styles.stack}>
            <ProgressRow label="Releases" detail={`${formatCompact(data.stats.releaseCount)} published`} value={(data.stats.releaseCount / total) * 100} icon="library-music" route="/releases" />
            <ProgressRow label="Beats" detail={`${formatCompact(data.stats.beatCount)} listed`} value={(data.stats.beatCount / total) * 100} icon="headset" route="/market/beats" />
            <ProgressRow label="Mixes" detail={`${formatCompact(data.stats.mixCount)} published`} value={(data.stats.mixCount / total) * 100} icon="album" route="/mixes" />
            <ProgressRow label="Soundboards" detail={`${formatCompact(data.stats.soundboardCount)} boards`} value={(data.stats.soundboardCount / total) * 100} icon="view-list" route="/soundboards" />
          </View>
        </View>
        <View>
          <SectionTitle title="Business Signals" />
          <View style={styles.stack}>
            <ActionRow action={{ id: 'wallet', title: 'Wallet and credits', detail: 'Review credits, balance, and wallet activity.', route: '/wallet', icon: 'account-balance-wallet', status: 'limited' }} />
            <ActionRow action={{ id: 'payouts', title: 'Payouts and exports', detail: 'Manage statements, tax, cash-out operations, and exports in desktop Studio.', icon: 'receipt-long', status: 'web_only' }} />
          </View>
        </View>
      </StudioShell>
    );
  });
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
            style={({ pressed }) => [
              styles.myPluggdPrimaryPill,
              pressed && { backgroundColor: 'rgba(255,255,255,0.16)' },
            ]}
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
          style={({ pressed }) => [
            styles.myPluggdNextCard,
            pressed && { backgroundColor: 'rgba(255,255,255,0.10)' },
          ]}
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
            style={({ pressed }) => [
              styles.myPluggdSectionCard,
              {
                backgroundColor: pressed ? STUDIO.panelPressed : 'rgba(255,255,255,0.055)',
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
      route: slug ? `/connect/${slug}${previewQuery}` : '/edit-profile',
      image: WEB_PARITY_ASSETS.intimateVocalist,
      tone: ['rgba(255,106,0,0.08)', 'rgba(4,4,5,0.94)'] as [string, string],
    },
    {
      id: 'business',
      label: 'Work With Me',
      eyebrow: 'BUSINESS + RATES',
      detail: 'Bookings, availability, services, rates and your portfolio.',
      icon: 'business-center',
      route: slug ? `/connect/${slug}/business${previewQuery}` : '/edit-profile',
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
      route: slug ? `/connect/${slug}/contract${previewQuery}` : '/edit-profile',
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
            <View style={styles.connectOwnerVerified}>
              <MaterialIcons name="check" size={17} color="#FFFFFF" />
            </View>
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
            accessibilityLabel={publicRoute || slug ? 'Open public card' : 'Set up Connect Card'}
            onPress={() => routePush(router, publicRoute ? `${publicRoute}${previewQuery}` : slug ? `/connect/${slug}${previewQuery}` : '/edit-profile')}
            style={styles.connectOwnerPrimary}
          >
            <MaterialIcons name="visibility" size={19} color="#170A03" />
            <Text style={styles.connectOwnerPrimaryText}>{publicRoute || slug ? 'Preview live card' : 'Start setup'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#170A03" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share Connect Card"
            onPress={() => {
              if (!slug) {
                routePush(router, '/edit-profile');
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
              style={({ pressed }) => [styles.connectViewCard, pressed && { opacity: 0.82 }]}
            >
              <PluggdImage
                uri=""
                fallbackSource={view.image}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                accessibilityLabel=""
              />
              <LinearGradient colors={view.tone} style={StyleSheet.absoluteFill} />
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

      <LinearGradient
        colors={['rgba(255,106,0,0.24)', 'rgba(255,106,0,0.07)', 'rgba(9,9,12,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.connectSplitPanel}
      >
        <View style={styles.connectSplitTop}>
          <View style={styles.connectSplitIcon}>
            <MaterialIcons name="account-tree" size={24} color="#170A03" />
          </View>
          <View style={styles.connectSplitBadge}>
            <Text style={styles.connectSplitBadgeText}>COLLABORATOR MODE</Text>
          </View>
        </View>
        <Text style={styles.connectSplitTitle}>From introduction to agreed splits.</Text>
        <Text style={styles.connectSplitText}>
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
      </LinearGradient>

      <View>
        <SectionTitle title="Exchange tools" />
        <View style={styles.connectToolGrid}>
          {[
            { id: 'qr', icon: 'qr-code-2', title: 'Room-ready QR', detail: 'Open your card and show a full-screen code.', route: slug ? `/connect/${slug}${previewQuery}` : '/edit-profile' },
            { id: 'wallet', icon: 'wallet', title: 'Apple Wallet', detail: 'Keep your identity one tap from the Lock Screen.', route: 'https://pluggd.fm/studio' },
            { id: 'access', icon: 'shield', title: 'Private access', detail: 'Control collaborator and legal sharing links.', route: 'https://pluggd.fm/studio' },
            { id: 'analytics', icon: 'insights', title: 'Card signals', detail: 'Review views, saves, shares and requests.', route: '/studio/analytics' },
          ].map((tool) => (
            <Pressable
              key={tool.id}
              accessibilityRole="button"
              accessibilityLabel={tool.title}
              onPress={() => tool.route.startsWith('http') ? void Linking.openURL(tool.route) : routePush(router, tool.route)}
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

      <LinearGradient
        colors={['rgba(255,106,0,0.18)', 'rgba(255,106,0,0.03)']}
        style={styles.connectFinishPanel}
      >
        <View style={styles.connectFinishIcon}>
          <MaterialIcons name="tune" size={22} color={STUDIO.orangeSoft} />
        </View>
        <View style={styles.connectFinishCopy}>
          <Text style={styles.connectFinishTitle}>Make every introduction count</Text>
          <Text style={styles.connectFinishText}>
            Complete the five views, choose exactly what each audience can see, and keep one permanent creator link.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full Connect Card editor"
          onPress={() => void Linking.openURL('https://pluggd.fm/studio')}
          style={styles.connectFinishButton}
        >
          <Text style={styles.connectFinishButtonText}>Open full editor</Text>
          <MaterialIcons name="open-in-new" size={16} color="#170A03" />
        </Pressable>
      </LinearGradient>
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
  const router = useRouter();
  const slug = data.connectProfile?.slug || '';
  const creatorName = data.connectProfile?.display_name || studioCreatorName(data);
  const steps = [
    {
      number: '01',
      icon: 'library-music',
      title: 'Choose the work',
      detail: 'Start with the release, beat or session everyone contributed to.',
    },
    {
      number: '02',
      icon: 'group-add',
      title: 'Invite collaborators',
      detail: 'Use verified Connect identities so names and contact details stay consistent.',
    },
    {
      number: '03',
      icon: 'draw',
      title: 'Agree and lock',
      detail: 'Confirm percentages, collect approvals and preserve the signed record.',
    },
  ];

  return (
    <StudioShell active="more" title="Split Engine" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <LinearGradient
        colors={['rgba(255,106,0,0.30)', 'rgba(42,20,8,0.38)', 'rgba(5,5,7,0.99)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.splitHero}
      >
        <View style={styles.splitHeroTop}>
          <View style={styles.splitHeroIcon}>
            <MaterialIcons name="account-tree" size={27} color="#170A03" />
          </View>
          <StatusChip label="Secure workflow" tone="native" />
        </View>
        <Text style={styles.splitEyebrow}>PLUGGD SPLIT ENGINE</Text>
        <Text style={styles.splitHeroTitle}>Clear credits before the release moves.</Text>
        <Text style={styles.splitHeroText}>
          Create one shared source of truth for collaborators, percentages, approvals and signatures.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open secure Split Engine"
          onPress={() => void Linking.openURL('https://pluggd.fm/studio/splits')}
          style={styles.splitHeroButton}
        >
          <Text style={styles.splitHeroButtonText}>Open Split Engine</Text>
          <MaterialIcons name="open-in-new" size={18} color="#170A03" />
        </Pressable>
      </LinearGradient>

      <View>
        <SectionTitle title="Three steps. One record." />
        <View style={styles.splitStepStack}>
          {steps.map((step) => (
            <View key={step.number} style={styles.splitStep}>
              <View style={styles.splitStepNumber}>
                <Text style={styles.splitStepNumberText}>{step.number}</Text>
              </View>
              <View style={styles.splitStepCopy}>
                <View style={styles.splitStepTitleRow}>
                  <MaterialIcons name={iconName(step.icon)} size={19} color={STUDIO.orangeSoft} />
                  <Text style={styles.splitStepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.splitStepText}>{step.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.splitIdentityPanel}>
        <View style={styles.splitIdentityTop}>
          <View style={styles.splitIdentityAvatar}>
            {data.profile?.avatar_url ? (
              <PluggdImage uri={data.profile.avatar_url} style={StyleSheet.absoluteFill} accessibilityLabel={creatorName} />
            ) : (
              <Text style={styles.splitIdentityInitials}>{initials(creatorName)}</Text>
            )}
          </View>
          <View style={styles.splitIdentityCopy}>
            <Text style={styles.splitIdentityEyebrow}>YOUR COLLABORATOR IDENTITY</Text>
            <Text style={styles.splitIdentityName}>{creatorName}</Text>
            <Text style={styles.splitIdentityStatus}>{slug ? 'Ready to share' : 'Complete Connect Card setup first'}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={slug ? 'Preview collaborator identity' : 'Set up collaborator identity'}
          onPress={() => routePush(router, slug ? `/connect/${slug}/collab` : '/studio/connect-card')}
          style={styles.splitIdentityButton}
        >
          <Text style={styles.splitIdentityButtonText}>{slug ? 'Preview collaborator card' : 'Set up Connect Card'}</Text>
          <MaterialIcons name="arrow-forward" size={17} color="#FFFFFF" />
        </Pressable>
      </View>

      <View>
        <SectionTitle title="Keep every decision close" />
        <View style={styles.splitToolGrid}>
          {[
            { icon: 'pending-actions', title: 'Approvals', detail: 'See who has agreed and who still needs to respond.' },
            { icon: 'history-edu', title: 'Agreements', detail: 'Return to signed records without hunting through messages.' },
            { icon: 'groups', title: 'Participants', detail: 'Reuse trusted collaborator identities on the next work.' },
          ].map((tool) => (
            <Pressable
              key={tool.title}
              accessibilityRole="button"
              accessibilityLabel={`Open ${tool.title}`}
              onPress={() => void Linking.openURL('https://pluggd.fm/studio/splits')}
              style={styles.splitTool}
            >
              <View style={styles.splitToolIcon}>
                <MaterialIcons name={iconName(tool.icon)} size={21} color={STUDIO.orangeSoft} />
              </View>
              <View style={styles.splitToolCopy}>
                <Text style={styles.splitToolTitle}>{tool.title}</Text>
                <Text style={styles.splitToolText}>{tool.detail}</Text>
              </View>
              <MaterialIcons name="north-east" size={17} color={STUDIO.textSubtle} />
            </Pressable>
          ))}
        </View>
      </View>
    </StudioShell>
  );
}

export function StudioSplitGatewayScreen() {
  return withStudioData('more', 'Split Engine', (data, query) => <StudioSplitGatewayContent data={data} query={query} />);
}

function ModuleTileGrid({ modules }: { modules: StudioModuleState[] }) {
  const rows: StudioModuleState[][] = [];
  for (let index = 0; index < modules.length; index += 2) {
    rows.push(modules.slice(index, index + 2));
  }
  return (
    <View style={styles.moduleTileGrid}>
      {rows.map((row, index) => (
        <View key={`module-tile-row-${index}`} style={styles.moduleTileRow}>
          {row.map((module) => (
            <MoreModuleTile key={module.id} module={module} />
          ))}
          {row.length === 1 ? <View style={styles.moduleTileSpacer} /> : null}
        </View>
      ))}
    </View>
  );
}

function MoreModuleTile({ module }: { module: StudioModuleState }) {
  const router = useRouter();
  const canOpen = Boolean(module.route);
  const statusTone = module.status === 'web_only' ? 'web' : module.status;
  const statusLabel = module.status === 'web_only' ? 'Desktop' : module.status === 'limited' ? 'Preview' : 'Ready';
  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : 'text'}
      disabled={!canOpen}
      onPress={() => routePush(router, module.route)}
      style={({ pressed }) => [styles.moduleTileTap, pressed && { opacity: 0.78 }]}
    >
      <LinearGradient
        colors={module.plugged || module.alwaysVisible ? ['rgba(255,106,0,0.16)', 'rgba(22,22,27,0.94)', 'rgba(5,5,7,0.98)'] : ['rgba(255,255,255,0.11)', 'rgba(18,18,23,0.93)', 'rgba(4,4,6,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.moduleTile}
      >
        <View style={styles.moduleTileTop}>
          <View style={styles.moduleTileIcon}>
            <MaterialIcons name={iconName(module.icon)} size={21} color={module.plugged || module.alwaysVisible ? STUDIO.orange : STUDIO.textMid} />
          </View>
          {canOpen ? <MaterialIcons name="arrow-outward" size={18} color={STUDIO.textMid} /> : null}
        </View>
        <Text style={styles.moduleTileTitle} numberOfLines={1}>{module.title}</Text>
        <Text style={styles.moduleTileDetail} numberOfLines={2}>
          {module.status === 'web_only' ? module.unavailableReason || module.addsToStudio : module.addsToStudio}
        </Text>
        <View style={styles.moduleTileChips}>
          <StatusChip label={module.plugged || module.alwaysVisible ? 'Active' : 'Suggested'} tone={module.plugged || module.alwaysVisible ? 'native' : 'limited'} />
          <StatusChip label={statusLabel} tone={statusTone} />
        </View>
      </LinearGradient>
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
  const sections = SECTION_ORDER.map((section) => ({
    section,
    modules: data.modules.filter((module) => module.section === section && (module.plugged || module.alwaysVisible || module.recommendedForRole)),
  })).filter((group) => group.modules.length > 0);
  const pluggedCount = data.modules.filter((module) => module.plugged || module.alwaysVisible).length;
  const desktopCount = data.modules.filter((module) => module.status === 'web_only' && (module.plugged || module.recommendedForRole)).length;
  return (
    <StudioShell active="more" title="More" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <LinearGradient
        colors={['rgba(255,106,0,0.18)', 'rgba(255,255,255,0.075)', 'rgba(7,7,10,0.96)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.moreHero}
      >
        <View style={styles.kickerRow}>
          <MaterialIcons name="more-horiz" size={16} color={STUDIO.orange} />
          <Text style={styles.kicker}>More Studio</Text>
        </View>
        <Text style={styles.moreHeroTitle}>Modules, account surfaces, and business tools.</Text>
        <Text style={styles.moreHeroBody}>
          Keep My PLUGGD, wallet, live, settings, and plugged modules close without turning them into primary tabs.
        </Text>
        <View style={styles.moreHeroStats}>
          <StatusChip label={`${pluggedCount} active`} tone="native" />
          <StatusChip label={`${desktopCount} desktop tools`} tone="web" />
        </View>
      </LinearGradient>
      {sections.map((group) => (
        <View key={group.section}>
          <SectionTitle title={SECTION_LABELS[group.section]} />
          <ModuleTileGrid modules={group.modules} />
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
    height: 42,
    flexShrink: 0,
  },
  studioMenuButton: {
    width: 44,
    height: 42,
    borderRadius: 999,
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
  studioTopLeft: {
    width: 96,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioExitButton: {
    width: 44,
    height: 42,
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
    color: STUDIO.text,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  studioAccountPill: {
    width: 116,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    padding: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.045)',
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
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
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0,
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
    minHeight: 38,
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
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  moduleTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleTitle: { fontFamily: pluggdFonts.displayBold,
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  moduleDetail: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
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
    minHeight: 38,
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
  connectOwnerVerified: {
    position: 'absolute',
    right: -2,
    bottom: 5,
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#08080A',
    backgroundColor: STUDIO.orange,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 14,
    backgroundColor: STUDIO.orange,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 12,
    gap: 8,
    overflow: 'hidden',
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
});
