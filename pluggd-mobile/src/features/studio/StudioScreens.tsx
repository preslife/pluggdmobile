import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { PluggdImage } from '../../components/PluggdImage';
import { selectionHaptic } from '../../design/haptics';
import { pluggdFonts, pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { formatCompact } from '../../lib/mobileContent';
import {
  loadStudioData,
  setStudioModulePlugged,
  studioCreatorName,
  type StudioAction,
  type StudioCatalogItem,
  type StudioData,
  type StudioModuleSection,
  type StudioModuleState,
} from './studio-data';

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
  { key: 'action', label: 'Action', route: '/studio/action', icon: 'add-circle' },
  { key: 'analytics', label: 'Analytics', route: '/studio/analytics', icon: 'insights' },
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
          <MaterialIcons name="view-sidebar" size={17} color={STUDIO.text} />
          <Text style={styles.studioMenuText}>Menu</Text>
        </View>
      )}
    </Pressable>
  );
}

function StudioTopBar({ data, title }: { data: StudioData; title: string }) {
  return (
    <View style={styles.topBar}>
      <StudioMenuButton />
      <View style={styles.studioBrand}>
        <Text style={styles.studioBrandPlug}>PLUGGD</Text>
        <Text style={styles.studioBrandTitle} numberOfLines={1}>STUDIO</Text>
      </View>
      <View style={styles.studioAccountPill}>
        <HeaderAvatar data={data} />
        <Text style={styles.studioAccountText} numberOfLines={1}>
          {data.profile?.username ? `@${data.profile.username}` : 'Personal'}
        </Text>
        <MaterialIcons name="expand-more" size={15} color={STUDIO.textMid} />
      </View>
    </View>
  );
}

function StudioDock({ active }: { active: StudioRouteKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.dockWrap, { paddingBottom: Math.max(8, insets.bottom + 4) }]}>
      <View style={styles.dock}>
        {DOCK_ITEMS.map((item) => {
          const isActive = item.key === active;
          const isAction = item.key === 'action';
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={`Studio ${item.label}`}
              onPress={() => routePush(router, item.route)}
              style={({ pressed }) => [
                styles.dockItem,
                isActive && styles.dockItemActiveWrap,
                isAction && styles.dockActionWrap,
                pressed && { opacity: 0.76 },
              ]}
            >
              <LinearGradient
                colors={
                  isActive
                    ? ['rgba(255,106,0,0.62)', 'rgba(96,44,15,0.98)', 'rgba(35,17,8,0.98)']
                    : isAction
                      ? ['rgba(255,106,0,0.22)', 'rgba(5,5,6,0.98)', 'rgba(0,0,0,0.99)']
                      : ['rgba(255,255,255,0.015)', 'rgba(255,255,255,0.01)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.dockItemInner,
                  isActive && styles.dockItemActive,
                  isAction && styles.dockActionItem,
                ]}
              >
                <View style={[styles.dockIconShell, isAction && styles.dockActionIcon, isActive && styles.dockIconActive]}>
                  <MaterialIcons
                    name={iconName(item.icon)}
                    size={isAction ? 27 : 24}
                    color={isActive || isAction ? STUDIO.orange : 'rgba(255,255,255,0.78)'}
                  />
                </View>
                <Text style={[styles.dockLabel, { color: isActive ? STUDIO.orangeSoft : 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </LinearGradient>
            </Pressable>
          );
        })}
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
}: {
  active: StudioRouteKey;
  title: string;
  children: ReactNode;
  data: StudioData;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: STUDIO.bg }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(10, insets.top + 8), paddingBottom: Math.max(146, insets.bottom + 132) }]}
      >
        <StudioTopBar data={data} title={title} />
        {children}
      </ScrollView>
      <StudioDock active={active} />
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
    <StudioShell active={active} title={title} data={data} refreshing={false} onRefresh={() => undefined}>
      <View style={[styles.accessCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <MaterialIcons name={iconName(action.icon)} size={32} color={theme.colors.accent} />
        <Text style={[styles.accessTitle, { color: theme.colors.text }]}>
          {data.signedIn ? 'Creator access needed' : 'Open Studio'}
        </Text>
        <Text style={[styles.accessText, { color: theme.colors.textMuted }]}>
          {data.signedIn
            ? 'Studio is available for artist, producer, DJ, promoter, venue, curator, service, or manager roles.'
            : 'Sign in with a creator account to use PLUGGD Studio.'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => routePush(router, action.route)} style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.primaryButtonText}>{action.label}</Text>
        </Pressable>
      </View>
    </StudioShell>
  );
}

function withStudioData(active: StudioRouteKey, title: string, render: (data: StudioData, query: ReturnType<typeof useStudioQuery>) => React.ReactNode) {
  const query = useStudioQuery();
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
    limited: { bg: 'rgba(255,90,0,0.13)', fg: theme.colors.accent, border: 'rgba(255,90,0,0.32)' },
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
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.105)', 'rgba(14,14,18,0.92)', 'rgba(0,0,0,0.95)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.commandCard}
    >
      <View pointerEvents="none" style={styles.commandOrbit} />
      <View pointerEvents="none" style={styles.commandGlow} />
      <View style={styles.commandTop}>
        <View style={styles.commandCopy}>
          <Text style={styles.commandTitle} numberOfLines={2}>
            Welcome back,{'\n'}{name}.
          </Text>
          <Text style={styles.commandBody} numberOfLines={3}>
            Your studio is live. Revenue, catalog, audience and setup in one command center.
          </Text>
        </View>
        <HealthRing percent={data.stats.healthPercent} />
      </View>

      <View style={styles.commandActions}>
        {commandActions.map((action, index) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            onPress={() => routePush(router, action.route)}
            style={({ pressed }) => [
              styles.commandPillTap,
              action.primary ? styles.commandPillPrimary : styles.commandPillSecondary,
              index === 3 && styles.commandPillSmall,
              pressed && { opacity: 0.78 },
            ]}
          >
            <LinearGradient
              colors={
                action.primary
                  ? ['rgba(255,106,0,0.44)', 'rgba(74,30,8,0.92)']
                  : ['rgba(38,38,43,0.96)', 'rgba(18,18,22,0.96)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.commandPillInner, action.primary ? styles.commandPillInnerPrimary : styles.commandPillInnerSecondary]}
            >
              <MaterialIcons name={iconName(action.icon)} size={17} color={action.primary ? STUDIO.orangeSoft : STUDIO.textMid} />
              <Text style={[styles.commandPillText, { color: action.primary ? STUDIO.orangeSoft : STUDIO.text }]} numberOfLines={1}>
                {action.title}
              </Text>
            </LinearGradient>
          </Pressable>
        ))}
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
    </LinearGradient>
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
  const theme = usePluggdTheme();
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

function StudioPulse({ data }: { data: StudioData }) {
  const theme = usePluggdTheme();
  const rows = [
    {
      label: 'Catalog',
      detail: data.stats.catalogCount > 0 ? `${formatCompact(data.stats.catalogCount)} visible assets` : 'No catalog assets yet',
      value: data.stats.catalogCount > 0 ? Math.min(100, 24 + data.stats.catalogCount * 9) : 8,
      icon: 'inventory-2',
      route: '/releases',
    },
    {
      label: 'Audience',
      detail: data.stats.audienceCount > 0 ? `${formatCompact(data.stats.audienceCount)} followers` : 'Waiting for fan movement',
      value: data.stats.audienceCount > 0 ? Math.min(100, 28 + Math.log10(data.stats.audienceCount + 1) * 24) : 8,
      icon: 'groups',
      route: '/studio/analytics',
    },
    {
      label: 'Setup',
      detail: `${data.stats.completedTasks} of ${data.stats.totalTasks} complete`,
      value: data.stats.healthPercent,
      icon: 'task-alt',
      route: '/studio/my-pluggd',
    },
  ];
  return (
    <View style={styles.pulseCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionRule} />
        <Text style={styles.sectionKicker}>Studio Pulse</Text>
      </View>
      {rows.map((row) => (
        <ProgressRow key={row.label} {...row} />
      ))}
    </View>
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
            <Text style={[styles.secondaryButtonText, { color: module.plugged ? theme.colors.text : '#08080C' }]}>
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
      <StudioPulse data={data} />
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
        <View style={styles.appsHero}>
          <View>
            <Text style={styles.appsEyebrow}>Studio Apps</Text>
            <Text style={styles.appsTitle}>Plug modules into your workspace.</Text>
            <Text style={styles.appsBody}>Choose the modules you want close at hand. Desktop tools stay visible for planning.</Text>
          </View>
          <View style={styles.appsStats}>
            <KpiCard label="Plugged" value={formatCompact(pluggedCount)} detail="Modules" icon="apps" />
            <KpiCard label="Suggested" value={formatCompact(recommendedCount)} detail={ROLE_LABELS[data.primaryRole] ?? 'Role'} icon="auto-awesome" />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentStrip}>
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
        </ScrollView>

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
        <ComplianceNote />
      </StudioShell>
    );
  });
}

export function StudioActionScreen() {
  return withStudioData('action', 'Action', (data, query) => (
    <StudioShell active="action" title="Action" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <CommandCard data={data} />
      <View>
        <SectionTitle title="Available Now" />
        <View style={styles.stack}>
          {data.nativeActions.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </View>
      </View>
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
  return withStudioData('analytics', 'Analytics', (data, query) => (
    <StudioShell active="analytics" title="Analytics" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <KpiGrid data={data} />
      <StudioPulse data={data} />
      <View>
        <SectionTitle title="Catalog Breakdown" />
        <View style={styles.stack}>
          <ProgressRow label="Releases" detail={`${formatCompact(data.stats.releaseCount)} rows`} value={data.stats.releaseCount ? Math.min(100, 22 + data.stats.releaseCount * 12) : 6} icon="library-music" route="/releases" />
          <ProgressRow label="Beats" detail={`${formatCompact(data.stats.beatCount)} rows`} value={data.stats.beatCount ? Math.min(100, 22 + data.stats.beatCount * 12) : 6} icon="headset" route="/market/beats" />
          <ProgressRow label="Mixes" detail={`${formatCompact(data.stats.mixCount)} rows`} value={data.stats.mixCount ? Math.min(100, 22 + data.stats.mixCount * 12) : 6} icon="album" route="/mixes" />
          <ProgressRow label="Soundboards" detail={`${formatCompact(data.stats.soundboardCount)} boards`} value={data.stats.soundboardCount ? Math.min(100, 22 + data.stats.soundboardCount * 12) : 6} icon="view-list" route="/soundboards" />
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
  ));
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myPluggdTabs}>
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
              style={[styles.myPluggdTab, active && styles.myPluggdTabActive]}
            >
              <Text style={[styles.myPluggdTabText, active && styles.myPluggdTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
  const theme = usePluggdTheme();
  const publicRoute = data.connectProfile?.slug ? `/connect/${data.connectProfile.slug}` : undefined;
  return (
    <StudioShell active="more" title="Connect Card" data={data} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <View style={[styles.connectHero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={[styles.connectIcon, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          <MaterialIcons name="badge" size={32} color={theme.colors.accent} />
        </View>
        <Text style={[styles.connectTitle, { color: theme.colors.text }]}>
          {data.connectProfile?.display_name || studioCreatorName(data)}
        </Text>
        <Text style={[styles.connectText, { color: theme.colors.textMuted }]}>
          {data.connectProfile?.headline || 'Public business card, links, rates, and private collaboration details.'}
        </Text>
        <View style={styles.moduleButtons}>
          {publicRoute ? (
            <ActionRow action={{ id: 'public-card', title: 'Public card', detail: data.connectProfile?.slug ? `/connect/${data.connectProfile.slug}` : 'Public route', route: publicRoute, icon: 'open-in-new', status: 'native' }} />
          ) : (
            <ActionRow action={{ id: 'setup-card', title: 'Set up card', detail: 'Add public contact and profile fields first.', route: '/edit-profile', icon: 'edit', status: 'native' }} />
          )}
        </View>
      </View>

      <View>
        <SectionTitle title="Private Views" />
        <View style={styles.stack}>
          <ActionRow action={{ id: 'collab-token', title: 'Private collab view', detail: 'Only invited collaborators can see private collaboration fields.', icon: 'lock', status: 'web_only' }} />
          <ActionRow action={{ id: 'contract-token', title: 'Private deal view', detail: 'Private deal details stay separate from the public card.', icon: 'lock', status: 'web_only' }} />
        </View>
      </View>
    </StudioShell>
  );
}

export function StudioConnectCardScreen() {
  return withStudioData('more', 'Connect Card', (data, query) => <StudioConnectCardContent data={data} query={query} />);
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
    width: 92,
    height: 42,
    flexShrink: 0,
  },
  studioMenuButton: {
    width: 92,
    height: 42,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(255,106,0,0.62)',
    backgroundColor: 'rgba(255,106,0,0.11)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    overflow: 'hidden',
  },
  studioMenuText: {
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  studioBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  studioBrandPlug: {
    color: STUDIO.orangeSoft,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  studioBrandTitle: {
    color: STUDIO.text,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
  studioAccountPill: {
    maxWidth: 144,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: STUDIO.line,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingLeft: 6,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioAccountText: {
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
  topBarKicker: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  topBarTitle: {
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
  avatarText: {
    fontSize: 10,
    fontWeight: '900',
  },
  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.86)',
  },
  dock: {
    minHeight: 80,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.dock,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  dockItem: {
    flex: 1,
    minHeight: 62,
    borderRadius: 22,
  },
  dockActionWrap: {
    flex: 1.18,
  },
  dockItemActiveWrap: {
    flex: 1.32,
  },
  dockItemInner: {
    flex: 1,
    minHeight: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    overflow: 'hidden',
  },
  dockItemActive: {
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.34)',
  },
  dockActionItem: {
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.55)',
  },
  dockIconShell: {
    width: 31,
    height: 27,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIconActive: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  dockActionIcon: {
    width: 35,
    height: 35,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: STUDIO.lineHot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLabel: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  stateTitle: {
    fontSize: 21,
    fontWeight: '900',
  },
  stateText: {
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
  primaryButtonText: {
    color: '#08080C',
    fontSize: 14,
    fontWeight: '900',
  },
  accessCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  accessTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  accessText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  commandCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    borderRadius: 22,
    padding: 13,
    gap: 11,
    overflow: 'hidden',
    position: 'relative',
  },
  commandOrbit: {
    position: 'absolute',
    top: -84,
    right: -64,
    width: 190,
    height: 190,
    borderRadius: 999,
    borderWidth: 38,
    borderColor: 'rgba(255,106,0,0.19)',
    opacity: 0.9,
  },
  commandGlow: {
    position: 'absolute',
    right: -42,
    bottom: -62,
    width: 190,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  commandTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  commandCopy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kicker: {
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
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: 0,
  },
  commandBody: {
    color: STUDIO.textMid,
    fontSize: 14,
    lineHeight: 19,
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
  liveChipText: {
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
  healthPercent: {
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  healthLabel: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  commandActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  commandPillTap: {
    minHeight: 42,
    borderRadius: 999,
    overflow: 'hidden',
  },
  commandPillPrimary: {
    minWidth: 144,
  },
  commandPillSecondary: {
    minWidth: 104,
  },
  commandPillSmall: {
    minWidth: 88,
  },
  commandPillInner: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  commandPillInnerPrimary: {
    borderColor: 'rgba(255,106,0,0.86)',
  },
  commandPillInnerSecondary: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  commandPillText: {
    maxWidth: 150,
    fontSize: 13,
    fontWeight: '900',
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
  nextMoveTitle: {
    color: STUDIO.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  nextMoveKicker: {
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  nextMoveDetail: {
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
  kpiLabel: {
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  kpiValue: {
    color: STUDIO.text,
    fontSize: 23,
    lineHeight: 25,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  kpiDetail: {
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
  zoneTitle: {
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },
  zoneDetail: {
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
  statusChipText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  pulseCard: {
    marginTop: 28,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.panelDeep,
    padding: 14,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionKicker: {
    color: STUDIO.textMid,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  sectionRule: {
    width: 20,
    height: 1,
    backgroundColor: STUDIO.orange,
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
  progressLabel: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  progressDetail: {
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
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 0,
  },
  sectionAction: {
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
  catalogInitial: {
    fontSize: 22,
    fontWeight: '900',
  },
  catalogKind: {
    marginTop: 9,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  catalogTitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
  },
  catalogSubtitle: {
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
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
  actionTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  actionDetail: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  appsHero: {
    gap: 14,
  },
  appsEyebrow: {
    color: '#FF5A00',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  appsTitle: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0,
  },
  appsBody: {
    marginTop: 6,
    color: '#A9A9B6',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  appsStats: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentStrip: {
    gap: 8,
    paddingRight: 8,
  },
  segment: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15151D',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#262637',
  },
  segmentActive: {
    backgroundColor: '#FF5A00',
    borderColor: '#FF5A00',
  },
  segmentText: {
    color: '#A9A9B6',
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#08080C',
  },
  moduleCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  moduleTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
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
  moduleTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  moduleDetail: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  moduleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleAdds: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  moduleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
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
  noteText: {
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
  myPluggdTitle: {
    color: STUDIO.text,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0,
  },
  myPluggdBody: {
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
  myPluggdAvatarName: {
    alignSelf: 'stretch',
    color: STUDIO.text,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
  },
  myPluggdAvatarHandle: {
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
  myPluggdPrimaryText: {
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
  myPluggdReadyText: {
    color: STUDIO.orangeSoft,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  myPluggdTabs: {
    gap: 8,
    paddingRight: 8,
  },
  myPluggdTab: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    backgroundColor: STUDIO.chip,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myPluggdTabActive: {
    borderColor: STUDIO.orange,
    backgroundColor: STUDIO.orange,
  },
  myPluggdTabText: {
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  myPluggdTabTextActive: {
    color: '#08080C',
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
  myPluggdStatusLabel: {
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  myPluggdStatusTitle: {
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
  myPluggdNextKicker: {
    color: STUDIO.textSubtle,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  myPluggdNextTitle: {
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  myPluggdNextDetail: {
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
  myPluggdNextButtonText: {
    color: '#08080C',
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
  myPluggdSectionTitle: {
    flex: 1,
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  myPluggdSectionSummary: {
    color: STUDIO.textMid,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  myPluggdSectionMeta: {
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
  identityName: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
  },
  identityHandle: {
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
  taskTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  taskDetail: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  connectHero: {
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    alignItems: 'center',
    gap: 12,
  },
  connectIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  connectText: {
    maxWidth: 280,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  moreHero: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  moreHeroTitle: {
    color: STUDIO.text,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  moreHeroBody: {
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
  moduleTileTitle: {
    color: STUDIO.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
  },
  moduleTileDetail: {
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
