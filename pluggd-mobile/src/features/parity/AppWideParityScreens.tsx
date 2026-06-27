import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image as RNImage,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  useWindowDimensions,
} from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import { selectionHaptic } from '../../design/haptics';
import { pluggdTextStyles } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import {
  loadConnectCardParity,
  loadCommunityParity,
  loadDiscoverParity,
  loadEventsParity,
  loadHashtagParity,
  loadHubsParity,
  loadMapSignalsParity,
  loadMarketParity,
  loadMixesParity,
  loadReleasesParity,
  loadSamplePacksParity,
  loadSoundboardsParity,
  loadStudioParity,
  type ParityAction,
  type ParityCard,
  type ParityPayload,
  type ParitySection,
} from './appWideParityServices';
import { WEB_PARITY_ASSETS } from './webAssets';
import { GlassHeroCard, GlassPanel, GlassRailCard, LiftSurface, LiquidBackground, SectionHeader } from '../../../components/liquid-glass';

type QueryKey = readonly unknown[];

const DISCOVER_CATEGORY_PILLS: Array<{ label: string; route?: string }> = [
  { label: 'All', route: '/discover' },
  { label: 'Music', route: '/releases' },
  { label: 'BeatPlug', route: '/market/beatplug' },
  { label: 'Mixes', route: '/mixes' },
  { label: 'Creators', route: '/search' },
  { label: 'Soundboards', route: '/soundboards' },
  { label: 'Trending', route: '/hashtag/pluggd' },
  { label: 'New', route: '/discover' },
];

const LIST_WEIGHTED_SECTION_IDS = new Set([
  'browse-market',
  'trust',
  'upcoming',
  'event-board',
  'opportunities',
]);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'This surface could not load right now.';
}

function initials(value?: string | null) {
  return (value || 'PL')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function HeaderBackButton() {
  const router = useRouter();
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={() => {
        selectionHaptic();
        router.back();
      }}
      style={[styles.backButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
    </Pressable>
  );
}

function fallbackAssetForTitle(title: string): ImageSourcePropType {
  if (/market/i.test(title)) return WEB_PARITY_ASSETS.marketBeatStore;
  if (/event/i.test(title)) return WEB_PARITY_ASSETS.eventsHero;
  if (/community/i.test(title)) return WEB_PARITY_ASSETS.warmListeningRoom;
  if (/discover|release|mix|soundboard/i.test(title)) return WEB_PARITY_ASSETS.discoverPaperWide;
  return WEB_PARITY_ASSETS.intimateCrowdHero;
}

function usableImageUrl(uri?: string | null) {
  return uri && (/^https?:\/\//i.test(uri) || /^data:image\//i.test(uri) || /^file:\/\//i.test(uri)) ? uri : null;
}

function Artwork({ item, large = false, fallbackAsset }: { item: ParityCard; large?: boolean; fallbackAsset?: ImageSourcePropType }) {
  const theme = usePluggdTheme();
  const size = large ? 112 : 66;
  const imageUrl = usableImageUrl(item.imageUrl);
  if (imageUrl) {
    return (
      <PluggdImage
        uri={imageUrl}
        style={[styles.artwork, { width: size, height: size, borderRadius: large ? 24 : 18, backgroundColor: theme.colors.artworkBase }]}
        accessibilityLabel={item.title}
      />
    );
  }
  if (large && fallbackAsset) {
    return (
      <RNImage
        source={fallbackAsset}
        style={[styles.artwork, { width: size, height: size, borderRadius: large ? 24 : 18, backgroundColor: theme.colors.artworkBase }]}
        accessibilityLabel={item.title}
      />
    );
  }
  return (
    <View style={[styles.artworkFallback, { width: size, height: size, borderRadius: large ? 24 : 18, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <Text style={[styles.artworkInitials, { color: theme.colors.text }]}>{initials(item.title)}</Text>
    </View>
  );
}

function CardRow({ item, compact = false }: { item: ParityCard; compact?: boolean }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  const canOpen = Boolean(item.route);

  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      disabled={!canOpen}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.cardRowTap, pressed && styles.cardPressed, { opacity: canOpen || !item.route ? 1 : 0.7 }]}
    >
      <LiftSurface depth="low">
        <GlassPanel intensity="default" radius={22} contentStyle={[styles.cardRow, compact && styles.cardRowCompact]}>
          <LiftSurface depth="low" style={styles.artworkLift}>
            <Artwork item={item} />
          </LiftSurface>
          <View style={styles.cardBody}>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]} numberOfLines={1}>
              {item.eyebrow}
            </Text>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]} numberOfLines={2}>
              {item.subtitle}
            </Text>
          </View>
          <View style={styles.cardTail}>
            {item.metric ? (
              <Text style={[styles.metric, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {item.metric}
              </Text>
            ) : null}
            {canOpen ? <MaterialIcons name="chevron-right" size={22} color={theme.colors.inactive} /> : null}
          </View>
        </GlassPanel>
      </LiftSurface>
    </Pressable>
  );
}

function Hero({ item, fallbackAsset }: { item: ParityCard; fallbackAsset?: ImageSourcePropType }) {
  const router = useRouter();
  const metadata = item.metric && !item.metric.startsWith('£') ? item.metric : item.eyebrow || 'Open';
  return (
    <GlassHeroCard
      eyebrow={item.eyebrow}
      title={item.title}
      subtitle={item.subtitle}
      image={usableImageUrl(item.imageUrl)}
      metadata={metadata}
      fallbackTone={/event/i.test(item.eyebrow || item.title) ? 'rose' : /market|beat/i.test(item.eyebrow || item.title) ? 'amber' : 'violet'}
      onPress={item.route ? () => router.push(item.route as any) : undefined}
    />
  );
}

function RailCard({ item, fallbackAsset }: { item: ParityCard; fallbackAsset?: ImageSourcePropType }) {
  const router = useRouter();
  const canOpen = Boolean(item.route);
  const metric = item.metric && !item.metric.startsWith('£') ? item.metric : item.eyebrow;
  return (
    <GlassRailCard
      title={item.title}
      subtitle={item.subtitle}
      imageUrl={usableImageUrl(item.imageUrl)}
      metric={metric}
      fallbackTone={/event/i.test(item.eyebrow || item.title) ? 'rose' : /market|beat/i.test(item.eyebrow || item.title) ? 'amber' : 'violet'}
      onPress={canOpen ? () => router.push(item.route as any) : undefined}
    />
  );
}

function SectionBlock({
  section,
  compact,
  primarySurface,
  fallbackAsset,
}: {
  section: ParitySection;
  compact: boolean;
  primarySurface: boolean;
  fallbackAsset?: ImageSourcePropType;
}) {
  const theme = usePluggdTheme();
  const useCompactPills = section.id === 'flavour';
  const useRail = primarySurface && section.items.length > 1 && !LIST_WEIGHTED_SECTION_IDS.has(section.id);
  return (
    <View style={styles.section}>
      <SectionHeader title={section.title} subtitle={section.subtitle} />
      {section.items.length ? (
        useCompactPills ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
            {section.items.map((item) => (
              <FilterChip key={`${section.id}-${item.kind}-${item.id}`} item={item} />
            ))}
          </ScrollView>
        ) : useRail ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {section.items.map((item) => (
              <RailCard key={`${section.id}-${item.kind}-${item.id}`} item={item} fallbackAsset={fallbackAsset} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.sectionList}>
            {section.items.map((item) => (
              <CardRow key={`${section.id}-${item.kind}-${item.id}`} item={item} compact={compact} />
            ))}
          </View>
        )
      ) : (
        <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text selectable style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {section.emptyText || 'Nothing is available here yet.'}
          </Text>
        </View>
      )}
    </View>
  );
}

function FilterChip({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      disabled={!canOpen}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [
        styles.filterChip,
        {
          borderColor: theme.colors.border,
          opacity: pressed ? 0.84 : canOpen ? 1 : 0.72,
        },
      ]}
    >
      <Text style={[styles.filterChipEyebrow, { color: theme.colors.textMuted }]}>{item.eyebrow}</Text>
      <Text style={[styles.filterChipTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
    </Pressable>
  );
}

function SearchSurface() {
  const router = useRouter();
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel="Search PLUGGD"
      onPress={() => {
        selectionHaptic();
        router.push('/search' as any);
      }}
      style={({ pressed }) => [styles.searchTap, pressed && styles.cardPressed]}
    >
      <LiftSurface depth="low">
        <GlassPanel intensity="subtle" radius={22} contentStyle={styles.searchPanel}>
          <MaterialIcons name="search" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.searchText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            Search releases, beats, mixes, creators...
          </Text>
          <MaterialIcons name="tune" size={18} color={theme.colors.inactive} />
        </GlassPanel>
      </LiftSurface>
    </Pressable>
  );
}

function CategoryPillRow() {
  const router = useRouter();
  const theme = usePluggdTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
      {DISCOVER_CATEGORY_PILLS.map((item, index) => {
        const active = index === 0;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${item.label} discovery category`}
            onPress={() => {
              selectionHaptic();
              if (item.route) router.push(item.route as any);
            }}
            style={({ pressed }) => [
              styles.categoryPill,
              active && styles.categoryPillActive,
              pressed && styles.categoryPillPressed,
            ]}
          >
            <Text style={[styles.categoryPillText, { color: active ? theme.colors.text : theme.colors.textSecondary }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SurfaceTopTools({ title }: { title: string }) {
  if (!/discover|explore/i.test(title)) return null;
  return (
    <View style={styles.surfaceTools}>
      <SearchSurface />
      <CategoryPillRow />
    </View>
  );
}

function ActionPill({ action, primary = false }: { action: ParityAction; primary?: boolean }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(action.route);
  const fillColors = canOpen
    ? primary
      ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.045)'] as const
      : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.018)'] as const
    : ['rgba(255,255,255,0.035)', 'rgba(255,255,255,0.012)'] as const;
  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={canOpen ? action.label : `${action.label}. ${action.unavailableReason || 'Unavailable'}`}
      disabled={!canOpen}
      onPress={() => {
        if (!action.route) return;
        selectionHaptic();
        router.push(action.route as any);
      }}
      style={({ pressed }) => [
        styles.actionPill,
        {
          borderColor: canOpen && primary ? 'rgba(255,255,255,0.22)' : theme.colors.border,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <LinearGradient colors={fillColors} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionPillFill}>
        <Text style={[styles.actionText, { color: canOpen ? (primary ? theme.colors.text : theme.colors.textSecondary) : theme.colors.textSecondary }]} numberOfLines={1}>
          {action.label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function StudioDock() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const items: Array<{ label: string; icon: keyof typeof MaterialIcons.glyphMap; route: string }> = [
    { label: 'Home', icon: 'home', route: '/studio' },
    { label: 'Apps', icon: 'apps', route: '/studio/apps' },
    { label: 'Action', icon: 'add-circle-outline', route: '/studio/action' },
    { label: 'Analytics', icon: 'query-stats', route: '/studio/analytics' },
    { label: 'More', icon: 'more-horiz', route: '/studio/more' },
  ];

  return (
    <View style={[styles.studioDock, { backgroundColor: theme.colors.shell, borderColor: theme.colors.borderAccent }]}>
      {items.map((item) => (
        <Pressable
          key={item.route}
          accessibilityRole="button"
          accessibilityLabel={`Studio ${item.label}`}
          onPress={() => {
            selectionHaptic();
            router.push(item.route as any);
          }}
          style={styles.studioDockItem}
        >
          <MaterialIcons name={item.icon} size={21} color={theme.colors.text} />
          <Text style={[styles.studioDockLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ParityScaffold({
  title,
  queryKey,
  queryFn,
  studioDock = false,
  primarySurface = false,
}: {
  title: string;
  queryKey: QueryKey;
  queryFn: () => Promise<ParityPayload>;
  studioDock?: boolean;
  primarySurface?: boolean;
}) {
  const theme = usePluggdTheme();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const query = useQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 60,
  });

  const payload = query.data;
  const fallbackAsset = fallbackAssetForTitle(title);

  return (
    <View style={styles.scaffold}>
      <LiquidBackground
        tone={title === 'Events' ? 'rose' : title === 'Market' ? 'amber' : 'violet'}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={theme.colors.accent} />}
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <Stack.Screen options={{ title, headerShown: false }} />
        {primarySurface ? (
          <View style={styles.primaryTopSpacer} />
        ) : (
          <View style={styles.topRow}>
            <HeaderBackButton />
            <Text style={[styles.routeLabel, { color: theme.colors.textMuted }]}>PLUGGD</Text>
          </View>
        )}

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading {title.toLowerCase()}...</Text>
          </View>
        ) : query.error ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text selectable style={[styles.emptyText, { color: theme.colors.danger }]}>
              {getErrorMessage(query.error)}
            </Text>
          </View>
        ) : payload ? (
          <>
            <View style={styles.pageHeader}>
              <Text style={[styles.kicker, { color: theme.colors.accent }]}>{payload.kicker}</Text>
              <Text style={[styles.title, { color: theme.colors.text }]}>{payload.title}</Text>
              <Text style={[styles.summary, { color: theme.colors.textSecondary }]}>{payload.summary}</Text>
            </View>

            <SurfaceTopTools title={title} />

            {payload.hero ? <Hero item={payload.hero} fallbackAsset={fallbackAsset} /> : null}

            {payload.actions?.length ? (
              <View style={styles.actionsWrap}>
                {payload.actions.map((action, index) => (
                  <ActionPill key={action.id} action={action} primary={index === 0} />
                ))}
              </View>
            ) : null}

            {payload.sections.map((section) => (
              <SectionBlock key={section.id} section={section} compact={compact} primarySurface={primarySurface} fallbackAsset={fallbackAsset} />
            ))}

            {studioDock ? <StudioDock /> : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function DiscoverParityScreen() {
  return <ParityScaffold title="Discover" queryKey={['parity', 'discover']} queryFn={loadDiscoverParity} primarySurface />;
}

export function ExploreParityScreen() {
  return (
    <ParityScaffold
      title="Explore"
      queryKey={['parity', 'explore']}
      queryFn={async () => {
        const payload = await loadDiscoverParity();
        return {
          ...payload,
          title: 'Explore',
          kicker: 'Current PLUGGD culture',
        };
      }}
      primarySurface
    />
  );
}

export function CommunityParityScreen() {
  return <ParityScaffold title="Community" queryKey={['parity', 'community']} queryFn={loadCommunityParity} primarySurface />;
}

export function MarketParityScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  return <ParityScaffold title="Market" queryKey={['parity', 'market', params.section || 'all']} queryFn={() => loadMarketParity(params.section)} primarySurface />;
}

export function ReleasesParityScreen() {
  return <ParityScaffold title="Releases" queryKey={['parity', 'releases']} queryFn={loadReleasesParity} />;
}

export function MixesParityScreen() {
  return <ParityScaffold title="Mixes" queryKey={['parity', 'mixes']} queryFn={loadMixesParity} />;
}

export function SoundboardsParityScreen() {
  return <ParityScaffold title="Soundboards" queryKey={['parity', 'soundboards']} queryFn={loadSoundboardsParity} />;
}

export function SamplePacksParityScreen() {
  return <ParityScaffold title="Sample Packs" queryKey={['parity', 'sample-packs']} queryFn={loadSamplePacksParity} />;
}

export function EventsParityScreen() {
  return <ParityScaffold title="Events" queryKey={['parity', 'events']} queryFn={loadEventsParity} primarySurface />;
}

export function HubsParityScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <ParityScaffold title="Hubs" queryKey={['parity', 'hubs', params.slug || 'all']} queryFn={() => loadHubsParity(params.slug)} />;
}

export function MapSignalsParityScreen() {
  return <ParityScaffold title="Maps" queryKey={['parity', 'maps']} queryFn={loadMapSignalsParity} />;
}

export function HashtagParityScreen() {
  const params = useLocalSearchParams<{ tag?: string }>();
  return <ParityScaffold title="Hashtag" queryKey={['parity', 'hashtag', params.tag || 'pluggd']} queryFn={() => loadHashtagParity(params.tag)} />;
}

export function ConnectCardParityScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  return <ParityScaffold title="Connect Card" queryKey={['parity', 'connect', params.slug || 'missing']} queryFn={() => loadConnectCardParity(params.slug)} />;
}

export function StudioParityScreen() {
  return <ParityScaffold title="Studio" queryKey={['parity', 'studio']} queryFn={loadStudioParity} studioDock />;
}

const styles = StyleSheet.create({
  scaffold: {
    flex: 1,
    backgroundColor: '#05070F',
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 226,
    gap: 18,
  },
  topRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  primaryTopSpacer: {
    height: 44,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  loading: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pageHeader: {
    gap: 8,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  title: {
    ...pluggdTextStyles.appTitleLarge,
    fontSize: 34,
    lineHeight: 38,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  surfaceTools: {
    gap: 10,
  },
  searchTap: {
    borderRadius: 22,
  },
  searchPanel: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  categoryRail: {
    paddingRight: 10,
    gap: 8,
  },
  categoryPill: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.095)',
  },
  categoryPillPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  categoryPillText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  heroTap: {
    borderRadius: 26,
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.34)',
    padding: 16,
    gap: 16,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    gap: 14,
  },
  heroText: {
    flex: 1,
    gap: 7,
  },
  heroTitle: {
    ...pluggdTextStyles.heroTitle,
    fontSize: 24,
    lineHeight: 28,
  },
  heroFooter: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artwork: {
    overflow: 'hidden',
  },
  artworkLift: {
    borderRadius: 18,
  },
  artworkFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkInitials: {
    fontSize: 18,
    fontWeight: '900',
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPill: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actionPillFill: {
    minHeight: 40,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  safetyNote: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
  },
  safetyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitleGroup: {
    flex: 1,
    gap: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  sectionList: {
    gap: 10,
  },
  rail: {
    gap: 12,
    paddingRight: 8,
  },
  filterRail: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    minHeight: 52,
    minWidth: 114,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.036)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
    gap: 3,
  },
  filterChipEyebrow: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  filterChipTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  railCard: {
    width: 176,
    minHeight: 252,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  railArtwork: {
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  railImage: {
    width: '100%',
    height: '100%',
  },
  railScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  railEyebrow: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    maxWidth: 132,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,8,12,0.72)',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  railCopy: {
    minHeight: 118,
    padding: 12,
    gap: 6,
  },
  railTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  railSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  cardRowTap: {
    borderRadius: 22,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  cardRow: {
    minHeight: 90,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardRowCompact: {
    gap: 10,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardTail: {
    maxWidth: 78,
    alignItems: 'flex-end',
    gap: 4,
  },
  metric: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  studioDock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  studioDockItem: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  studioDockLabel: {
    fontSize: 10,
    fontWeight: '900',
  },
});
