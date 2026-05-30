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

type QueryKey = readonly unknown[];

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
      style={({ pressed }) => [
        styles.cardRow,
        compact && styles.cardRowCompact,
        {
          backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: canOpen || !item.route ? 1 : 0.7,
        },
      ]}
    >
      <Artwork item={item} />
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
    </Pressable>
  );
}

function Hero({ item, fallbackAsset }: { item: ParityCard; fallbackAsset?: ImageSourcePropType }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole={item.route ? 'button' : 'text'}
      accessibilityLabel={item.route ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [
        styles.heroTap,
        pressed && { opacity: 0.78 },
      ]}
    >
      <LinearGradient
        colors={['rgba(255,90,0,0.10)', 'rgba(24,24,28,0.96)', 'rgba(10,10,14,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <Artwork item={item} large fallbackAsset={fallbackAsset} />
          <View style={styles.heroText}>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>{item.eyebrow}</Text>
            <Text style={[styles.heroTitle, { color: theme.colors.text }]} numberOfLines={3}>
              {item.title}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={3}>
              {item.subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.heroFooter}>
          <Text style={[styles.metric, { color: theme.colors.textSecondary }]}>{item.metric || 'Open'}</Text>
          {item.route ? <MaterialIcons name="arrow-forward" size={22} color={theme.colors.accent} /> : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function RailCard({ item, fallbackAsset }: { item: ParityCard; fallbackAsset?: ImageSourcePropType }) {
  const theme = usePluggdTheme();
  const router = useRouter();
  const canOpen = Boolean(item.route);
  const imageUrl = usableImageUrl(item.imageUrl);
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
        styles.railCard,
        {
          backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.railArtwork, { backgroundColor: theme.colors.artworkBase }]}>
        {imageUrl ? (
          <PluggdImage uri={imageUrl} style={styles.railImage} accessibilityLabel={item.title} />
        ) : fallbackAsset ? (
          <RNImage source={fallbackAsset} style={styles.railImage} accessibilityLabel={item.title} />
        ) : (
          <Text style={[styles.artworkInitials, { color: theme.colors.text }]}>{initials(item.title)}</Text>
        )}
        <View style={styles.railScrim} />
        <Text style={styles.railEyebrow} numberOfLines={1}>{item.eyebrow}</Text>
      </View>
      <View style={styles.railCopy}>
        <Text style={[styles.railTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.railSubtitle, { color: theme.colors.textMuted }]} numberOfLines={2}>{item.subtitle}</Text>
        {item.metric ? <Text style={[styles.metric, { color: theme.colors.accent }]} numberOfLines={1}>{item.metric}</Text> : null}
      </View>
    </Pressable>
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
  const useRail = primarySurface && section.items.length > 1;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleGroup}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
          {section.subtitle ? <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{section.subtitle}</Text> : null}
        </View>
      </View>
      {section.items.length ? (
        useRail ? (
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

function ActionPill({ action }: { action: ParityAction }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(action.route);
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
          backgroundColor: canOpen ? (pressed ? theme.colors.surfacePressed : theme.colors.accent) : theme.colors.surface,
          borderColor: canOpen ? theme.colors.accent : theme.colors.border,
        },
      ]}
    >
      <Text style={[styles.actionText, { color: canOpen ? '#08080C' : theme.colors.textSecondary }]} numberOfLines={1}>
        {action.label}
      </Text>
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
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={theme.colors.accent} />}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title, headerShown: false }} />
      <View style={styles.topRow}>
        {primarySurface ? <View style={styles.backButtonPlaceholder} /> : <HeaderBackButton />}
        <Text style={[styles.routeLabel, { color: theme.colors.textMuted }]}>PLUGGD</Text>
      </View>

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

          {payload.hero ? <Hero item={payload.hero} fallbackAsset={fallbackAsset} /> : null}

          {payload.actions?.length ? (
            <View style={styles.actionsWrap}>
              {payload.actions.map((action) => (
                <ActionPill key={action.id} action={action} />
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
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 160,
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
    fontSize: 12,
    fontWeight: '900',
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
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '900',
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
  cardRow: {
    minHeight: 90,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
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
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
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
    fontWeight: '900',
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
