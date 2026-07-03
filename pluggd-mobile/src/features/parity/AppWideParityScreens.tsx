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
import { pluggdFonts, pluggdTextStyles } from '../../design/typography';
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
import { EditorialTitle, type EditorialSegment } from '../../../components/EditorialTitle';
import { SceneReportCard } from '../../../components/SceneReportCard';
import { EventsMap } from '../../../components/EventsMap';

type QueryKey = readonly unknown[];

const DISCOVER_CATEGORY_PILLS: Array<{ label: string; route?: string }> = [
  { label: 'All', route: '/discover' },
  { label: 'Music', route: '/releases' },
  { label: 'BeatPlug', route: '/market/beats' },
  { label: 'Mixes', route: '/mixes' },
  { label: 'Creators', route: '/search' },
  { label: 'Soundboards', route: '/soundboards' },
  { label: 'Trending', route: '/hashtag/pluggd' },
  { label: 'New', route: '/discover' },
];

// Per-surface warm editorial band — the cream "scene report" break that gives
// Discover/Events/Market the web mobile's dark↔cream magazine rhythm instead of
// an unbroken run of dark rails. Copy is web brand-voice, per surface.
const SURFACE_EDITORIAL: Record<string, { eyebrow: string; titleSegments: EditorialSegment[]; body: string; ctaLabel: string; route: string }> = {
  Discover: {
    eyebrow: 'The signal',
    titleSegments: [{ text: 'What the culture is ' }, { text: 'moving', accent: true }, { text: ' right now' }],
    body: 'Fresh drops, BeatPlug picks, mixes, live rooms, and the scenes shaping the sound — pulled from real activity across PLUGGD.',
    ctaLabel: 'Open Live',
    route: '/live',
  },
  Explore: {
    eyebrow: 'The signal',
    titleSegments: [{ text: 'What the culture is ' }, { text: 'moving', accent: true }, { text: ' right now' }],
    body: 'Fresh drops, BeatPlug picks, mixes, live rooms, and the scenes shaping the sound — pulled from real activity across PLUGGD.',
    ctaLabel: 'Open Live',
    route: '/live',
  },
  Events: {
    eyebrow: 'Ticket culture',
    titleSegments: [{ text: 'Find the nights ' }, { text: 'moving', accent: true }, { text: ' around you' }],
    body: 'Listening parties, release nights, showcases, and live-linked rooms from the underground — with the map one tap away.',
    ctaLabel: 'Open the map',
    route: '/maps',
  },
  Market: {
    eyebrow: 'Creator economy',
    titleSegments: [{ text: 'Back the makers behind the ' }, { text: 'sound', accent: true }],
    body: 'Beats, releases, sample packs, and merch — every purchase puts money straight into the creators shaping the culture.',
    ctaLabel: 'Open BeatPlug',
    route: '/market/beats',
  },
  Releases: {
    eyebrow: 'Drop culture',
    titleSegments: [{ text: 'New drops worth ' }, { text: 'hearing', accent: true }],
    body: 'Albums, singles, and mixtapes from the creators moving the scene — fresh, notable, and community-backed.',
    ctaLabel: 'Open BeatPlug',
    route: '/market/beats',
  },
  Mixes: {
    eyebrow: 'DJ culture',
    titleSegments: [{ text: 'Sets that keep the room ' }, { text: 'moving', accent: true }],
    body: 'Radio cuts, live recordings, and event-linked audio from PLUGGD DJs and selectors.',
    ctaLabel: 'Open Live',
    route: '/live',
  },
  Soundboards: {
    eyebrow: 'Sound design',
    titleSegments: [{ text: 'Ideas building in ' }, { text: 'public', accent: true }],
    body: 'Raw references, sketches, and audio notes from creators cooking in the open.',
    ctaLabel: 'Open Community',
    route: '/community',
  },
  'Sample Packs': {
    eyebrow: 'Producer kits',
    titleSegments: [{ text: 'Loops, drums, and stems to ' }, { text: 'build', accent: true }],
    body: 'Producer-ready kits and one-shots to start the next beat — straight from the makers.',
    ctaLabel: 'Open BeatPlug',
    route: '/market/beats',
  },
};

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

function accentLastWord(title?: string | null): EditorialSegment[] {
  const trimmed = (title || '').trim();
  if (!trimmed) return [{ text: title || '' }];
  const idx = trimmed.lastIndexOf(' ');
  if (idx < 0) return [{ text: trimmed, accent: true }];
  return [{ text: trimmed.slice(0, idx + 1) }, { text: trimmed.slice(idx + 1), accent: true }];
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

// ---------------------------------------------------------------------------
// Section variants — each content class gets a purpose-built layout instead of
// every section collapsing into the same horizontal rail. This is what gives
// Discover / Events / Market real editorial variety: a cinematic featured lead,
// image-forward posters, circular creators, a hashtag cloud, ticketed event
// rows, and quote cards for community signal.
// ---------------------------------------------------------------------------

type SectionVariant =
  | 'featured'
  | 'posters'
  | 'creators'
  | 'hashtags'
  | 'events'
  | 'quotes'
  | 'list'
  | 'rail'
  | 'playRows'
  | 'creatorRows'
  | 'pulseRows'
  | 'corkboard';

function dominantKind(section: ParitySection): string {
  const counts = new Map<string, number>();
  for (const item of section.items) counts.set(item.kind, (counts.get(item.kind) || 0) + 1);
  let best = '';
  let bestN = 0;
  for (const [kind, n] of counts) {
    if (n > bestN) {
      best = kind;
      bestN = n;
    }
  }
  return best;
}

function resolveVariant(section: ParitySection): SectionVariant {
  const id = section.id;
  const kind = dominantKind(section);
  if (id === 'moving-now' || id === 'crate') return 'playRows';
  if (kind === 'soundboard') return 'corkboard';
  if (kind === 'hashtag' || /trending|hashtag/i.test(id)) return 'hashtags';
  if (kind === 'profile' || /creator|follow|who-to/i.test(id)) return 'creatorRows';
  if (kind === 'post' || /pulse|the-plug|from-the-plug|radio|thread/i.test(id)) return 'pulseRows';
  if (kind === 'event' || kind === 'live' || /event|live|upcoming|gig|tour|lineup/i.test(id)) return 'events';
  if (/featured|spotlight|lead/i.test(id)) return 'featured';
  if (LIST_WEIGHTED_SECTION_IDS.has(id)) return 'list';
  if (['release', 'beat', 'mix', 'sample_pack'].includes(kind)) return 'posters';
  return 'rail';
}

/**
 * The web surfaces draw from a deep catalog; the mobile pool can be thin, so the
 * same release would otherwise surface in the highlight reel AND its dedicated
 * lane — reading as "the rail just repeats". We let the first section to show an
 * item own it and drop any section that ends up empty (whether it started empty
 * or was emptied by de-dup) so the page only ever shows populated, distinct
 * lanes — the way a premium discovery surface reads, with no "nothing here yet"
 * boxes stacked mid-scroll.
 */
function dedupeSections(sections: ParitySection[]): ParitySection[] {
  const seen = new Set<string>();
  const out: ParitySection[] = [];
  for (const section of sections) {
    if (!section.items.length) continue;
    const items = section.items.filter((item) => {
      const key = `${item.kind}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!items.length) continue;
    out.push(items.length === section.items.length ? section : { ...section, items });
  }
  return out;
}

function PosterCard({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'image'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.posterTap, pressed && styles.cardPressed]}
    >
      <View style={[styles.posterArt, { backgroundColor: theme.colors.artworkBase, borderColor: theme.colors.border }]}>
        {img ? (
          <PluggdImage uri={img} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={item.title} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.mediaFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Text style={[styles.mediaInitials, { color: theme.colors.text }]}>{initials(item.title)}</Text>
          </View>
        )}
        <LinearGradient
          colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.28)', 'rgba(8,8,12,0.9)']}
          locations={[0.4, 0.66, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.posterTopRow}>
          <View style={styles.posterChip}>
            <Text style={styles.posterChipText} numberOfLines={1}>{item.eyebrow}</Text>
          </View>
          {item.metric ? (
            <View style={styles.posterMetric}>
              <Text style={styles.posterMetricText} numberOfLines={1}>{item.metric}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.posterCopy}>
          <Text style={styles.posterTitle} numberOfLines={2}>{item.title}</Text>
          {item.subtitle ? <Text style={styles.posterSubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

function PosterRail({ items }: { items: ParityCard[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRail}>
      {items.map((item) => (
        <PosterCard key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </ScrollView>
  );
}

function FeaturedLead({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'image'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.featuredCard, { backgroundColor: theme.colors.artworkBase }, pressed && styles.cardPressed]}
    >
      {img ? (
        <PluggdImage uri={img} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={item.title} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mediaFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={[styles.mediaInitials, { color: theme.colors.text }]}>{initials(item.title)}</Text>
        </View>
      )}
      <LinearGradient
        colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.4)', 'rgba(8,8,12,0.96)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.featuredTopRow}>
        <View style={styles.posterChip}>
          <Text style={styles.posterChipText} numberOfLines={1}>{item.eyebrow}</Text>
        </View>
        {item.metric ? (
          <View style={styles.posterMetric}>
            <Text style={styles.posterMetricText} numberOfLines={1}>{item.metric}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.featuredFoot}>
        <View style={styles.featuredCopy}>
          <EditorialTitle
            segments={accentLastWord(item.title)}
            size={26}
            color="#FFFFFF"
            accentColor={theme.colors.accent}
            numberOfLines={2}
          />
          {item.subtitle ? <Text style={styles.featuredSub} numberOfLines={1}>{item.subtitle}</Text> : null}
        </View>
        <View style={styles.featuredPlay}>
          <MaterialIcons name={canOpen ? 'arrow-forward' : 'play-arrow'} size={24} color="#0E0E12" />
        </View>
      </View>
    </Pressable>
  );
}

function FeaturedSection({ items }: { items: ParityCard[] }) {
  const [lead, ...rest] = items;
  return (
    <View style={styles.featuredWrap}>
      {lead ? <FeaturedLead item={lead} /> : null}
      {rest.length ? <PosterRail items={rest} /> : null}
    </View>
  );
}

function CreatorCard({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'image'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.creatorCard, pressed && styles.cardPressed]}
    >
      <View style={[styles.creatorAvatar, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceAlt }]}>
        {img ? (
          <PluggdImage uri={img} style={styles.creatorAvatarImg} resizeMode="cover" accessibilityLabel={item.title} />
        ) : (
          <Text style={[styles.mediaInitials, { color: theme.colors.text }]}>{initials(item.title)}</Text>
        )}
      </View>
      <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[styles.creatorMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {item.subtitle || item.eyebrow}
      </Text>
    </Pressable>
  );
}

function CreatorRail({ items }: { items: ParityCard[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRail}>
      {items.map((item) => (
        <CreatorCard key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </ScrollView>
  );
}

function HashtagCloud({ items }: { items: ParityCard[] }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  return (
    <View style={styles.hashtagWrap}>
      {items.map((item) => {
        const canOpen = Boolean(item.route);
        const label = item.title.replace(/^#/, '');
        return (
          <Pressable
            key={`${item.kind}-${item.id}`}
            disabled={!canOpen}
            accessibilityRole={canOpen ? 'button' : 'text'}
            accessibilityLabel={item.title}
            onPress={() => {
              if (!item.route) return;
              selectionHaptic();
              router.push(item.route as any);
            }}
            style={({ pressed }) => [
              styles.hashtagPill,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              pressed && styles.cardPressed,
            ]}
          >
            <Text style={[styles.hashtagHash, { color: theme.colors.accent }]}>#</Text>
            <Text style={[styles.hashtagText, { color: theme.colors.text }]} numberOfLines={1}>{label}</Text>
            {item.metric ? <Text style={[styles.hashtagMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.metric}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function EventRow({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  const segments = (item.subtitle || '').split('·').map((part) => part.trim()).filter(Boolean);
  const dateChunk = segments[0] || item.eyebrow;
  const meta = segments.slice(1).join(' · ');
  const live = item.kind === 'live' || /live/i.test(item.eyebrow);
  // Web-parity date block on the thumbnail: "30" over "JUN".
  const dateMatch = dateChunk.match(/(\d{1,2})\s+([A-Za-z]{3})/);
  const dateDay = dateMatch?.[1] ?? null;
  const dateMonth = dateMatch?.[2]?.toUpperCase() ?? null;
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.eventRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && styles.cardPressed]}
    >
      <View style={[styles.eventThumbWrap, { backgroundColor: theme.colors.surfaceAlt }]}>
        {img ? (
          <PluggdImage uri={img} style={styles.fillMedia} resizeMode="cover" accessibilityLabel={item.title} />
        ) : (
          <View style={[styles.fillMedia, styles.mediaFallback]}>
            <MaterialIcons name={live ? 'sensors' : 'event'} size={20} color={theme.colors.accent} />
          </View>
        )}
        {dateDay && dateMonth ? (
          <View style={styles.eventDateBlock}>
            <Text style={styles.eventDateDay}>{dateDay}</Text>
            <Text style={styles.eventDateMonth}>{dateMonth}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.eventBody}>
        <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.eventEyebrow, { color: theme.colors.textSecondary }]} numberOfLines={1}>{dateChunk}</Text>
        {meta ? <Text style={[styles.eventMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <View style={styles.eventTail}>
        {item.metric ? <Text style={[styles.eventPrice, { color: theme.colors.text }]} numberOfLines={1}>{item.metric}</Text> : null}
        {canOpen ? (
          <View style={styles.eventView}>
            <Text style={styles.eventViewText}>{live ? 'Join' : 'View'}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function QuoteCard({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.quoteCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && styles.cardPressed]}
    >
      <Text style={[styles.quoteMark, { color: theme.colors.accent }]}>{'“'}</Text>
      <Text style={[styles.quoteText, { color: theme.colors.text }]} numberOfLines={4}>{item.title}</Text>
      <View style={styles.quoteFoot}>
        <View style={[styles.quoteAvatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
          {img ? (
            <PluggdImage uri={img} style={styles.quoteAvatarImg} resizeMode="cover" accessibilityLabel={item.eyebrow} />
          ) : (
            <Text style={[styles.quoteInitials, { color: theme.colors.text }]}>{initials(item.eyebrow)}</Text>
          )}
        </View>
        <Text style={[styles.quoteAuthor, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {item.metric || item.eyebrow}
        </Text>
      </View>
    </Pressable>
  );
}

function QuoteRail({ items }: { items: ParityCard[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quoteRail}>
      {items.map((item) => (
        <QuoteCard key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </ScrollView>
  );
}

// ---- web-parity Discover rows ----------------------------------------------

/** "New From Creators" row: thumb, orange kind eyebrow, title, meta chips, play circle. */
function PlayRow({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.playRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && styles.cardPressed]}
    >
      {img ? (
        <PluggdImage uri={img} style={styles.playThumb} resizeMode="cover" accessibilityLabel={item.title} />
      ) : (
        <View style={[styles.playThumb, styles.mediaFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={[styles.mediaInitials, { color: theme.colors.text, fontSize: 16 }]}>{initials(item.title)}</Text>
        </View>
      )}
      <View style={styles.playBody}>
        <Text style={[styles.playKind, { color: theme.colors.accent }]} numberOfLines={1}>{item.eyebrow}</Text>
        <Text style={[styles.playTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.playMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.subtitle}</Text>
        {item.metric ? (
          <View style={styles.playChips}>
            <View style={[styles.playChip, { borderColor: theme.colors.border }]}>
              <Text style={[styles.playChipText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.metric}</Text>
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.playCircle}>
        <MaterialIcons name="play-arrow" size={22} color="#0E0E12" />
      </View>
    </Pressable>
  );
}

/** "Creators to Watch" row: round avatar, name, role, orange View pill. */
function CreatorRow({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.creatorRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && styles.cardPressed]}
    >
      <View style={[styles.creatorRowAvatar, { backgroundColor: theme.colors.surfaceAlt }]}>
        {img ? (
          <PluggdImage uri={img} style={styles.fillMedia} resizeMode="cover" accessibilityLabel={item.title} />
        ) : (
          <Text style={[styles.mediaInitials, { color: theme.colors.text, fontSize: 16 }]}>{initials(item.title)}</Text>
        )}
      </View>
      <View style={styles.creatorRowBody}>
        <Text style={[styles.creatorRowName, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.creatorRowRole, { color: theme.colors.textMuted }]} numberOfLines={1}>{(item.subtitle || item.eyebrow).toLowerCase()}</Text>
      </View>
      {canOpen ? (
        <View style={styles.viewPill}>
          <Text style={styles.viewPillText}>View</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** "Community Pulse" row: compact activity line with orange timestamp/metric. */
function PulseRow({ item }: { item: ParityCard }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.pulseRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && styles.cardPressed]}
    >
      {img ? (
        <PluggdImage uri={img} style={styles.pulseThumb} resizeMode="cover" accessibilityLabel={item.eyebrow} />
      ) : (
        <View style={[styles.pulseThumb, styles.mediaFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
          <MaterialIcons name="chat-bubble-outline" size={15} color={theme.colors.accent} />
        </View>
      )}
      <Text style={[styles.pulseText, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
      {item.metric ? <Text style={[styles.pulseWhen, { color: theme.colors.accent }]} numberOfLines={1}>{item.metric}</Text> : null}
    </Pressable>
  );
}

/** Corkboard soundboard: pinned audio card, polaroid, and sticky note on a board. */
function CorkboardCard({ item }: { item: ParityCard }) {
  const router = useRouter();
  const canOpen = Boolean(item.route);
  const img = usableImageUrl(item.imageUrl);
  const note = (item.subtitle || '').trim();
  return (
    <Pressable
      disabled={!canOpen}
      accessibilityRole={canOpen ? 'button' : 'text'}
      accessibilityLabel={canOpen ? `Open ${item.title}` : item.title}
      onPress={() => {
        if (!item.route) return;
        selectionHaptic();
        router.push(item.route as any);
      }}
      style={({ pressed }) => [styles.board, pressed && styles.cardPressed]}
    >
      <LinearGradient colors={['#241407', '#160D05']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.boardHead}>
        <View style={styles.boardHeadCopy}>
          <Text style={styles.boardEyebrow}>SOUNDBOARD</Text>
          <Text style={styles.boardTitle} numberOfLines={2}>{item.title}</Text>
          {item.metric ? <Text style={styles.boardMeta} numberOfLines={1}>{item.metric}</Text> : null}
        </View>
        <View style={styles.boardOpen}>
          <Text style={styles.boardOpenText}>Open Soundboard</Text>
        </View>
      </View>

      {/* pinned audio-note card */}
      <View style={styles.pinnedAudio}>
        <View style={styles.tape} />
        <View style={styles.audioTop}>
          <View style={styles.audioPlay}>
            <MaterialIcons name="play-arrow" size={17} color="#FFFFFF" />
          </View>
          <View style={styles.audioCopy}>
            <Text style={styles.audioTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.audioKind}>Audio</Text>
          </View>
        </View>
        <View style={styles.waveform}>
          {WAVEFORM_BARS.map((height, index) => (
            <View key={index} style={[styles.waveBar, { height }]} />
          ))}
        </View>
      </View>

      <View style={styles.boardRow}>
        {img ? (
          <View style={styles.polaroid}>
            <View style={styles.tapeSmall} />
            <View style={styles.polaroidImage}>
              <PluggdImage uri={img} style={styles.fillMedia} resizeMode="cover" accessibilityLabel={item.title} />
            </View>
            <Text style={styles.polaroidCaption} numberOfLines={1}>{item.title}</Text>
          </View>
        ) : null}
        {note ? (
          <View style={[styles.sticky, !img && styles.stickyWide]}>
            <View style={styles.tapeSmall} />
            <Text style={styles.stickyLabel}>NOTE</Text>
            <Text style={styles.stickyText} numberOfLines={4}>{note}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const WAVEFORM_BARS = [8, 14, 20, 11, 16, 22, 13, 18, 9, 15, 21, 12, 17, 10, 19, 14, 8, 16, 11, 20, 13, 9, 15, 18, 10, 14, 7];

function SectionBlock({
  section,
  compact,
  fallbackAsset,
}: {
  section: ParitySection;
  compact: boolean;
  primarySurface: boolean;
  fallbackAsset?: ImageSourcePropType;
}) {
  const theme = usePluggdTheme();

  if (!section.items.length) {
    return (
      <View style={styles.section}>
        <SectionHeader title={section.title} subtitle={section.subtitle} />
        <View style={[styles.emptyBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text selectable style={[styles.emptyText, { color: theme.colors.textMuted }]}>
            {section.emptyText || 'Nothing is available here yet.'}
          </Text>
        </View>
      </View>
    );
  }

  if (section.id === 'flavour') {
    return (
      <View style={styles.section}>
        <SectionHeader title={section.title} subtitle={section.subtitle} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {section.items.map((item) => (
            <FilterChip key={`${section.id}-${item.kind}-${item.id}`} item={item} />
          ))}
        </ScrollView>
      </View>
    );
  }

  const variant = resolveVariant(section);

  return (
    <View style={styles.section}>
      <SectionHeader
        title={section.title}
        subtitle={section.subtitle}
        icon={section.icon as any}
        serif={section.serif}
      />
      {variant === 'featured' ? (
        <FeaturedSection items={section.items} />
      ) : variant === 'posters' ? (
        <PosterRail items={section.items} />
      ) : variant === 'creators' ? (
        <CreatorRail items={section.items} />
      ) : variant === 'playRows' ? (
        <View style={styles.sectionList}>
          {section.items.slice(0, 6).map((item) => (
            <PlayRow key={`${section.id}-${item.kind}-${item.id}`} item={item} />
          ))}
        </View>
      ) : variant === 'creatorRows' ? (
        <View style={styles.sectionList}>
          {section.items.map((item) => (
            <CreatorRow key={`${section.id}-${item.kind}-${item.id}`} item={item} />
          ))}
        </View>
      ) : variant === 'pulseRows' ? (
        <View style={styles.sectionList}>
          {section.items.map((item) => (
            <PulseRow key={`${section.id}-${item.kind}-${item.id}`} item={item} />
          ))}
        </View>
      ) : variant === 'corkboard' ? (
        <View style={styles.sectionList}>
          {section.items.slice(0, 4).map((item) => (
            <CorkboardCard key={`${section.id}-${item.kind}-${item.id}`} item={item} />
          ))}
        </View>
      ) : variant === 'hashtags' ? (
        <HashtagCloud items={section.items} />
      ) : variant === 'events' ? (
        <View style={styles.sectionList}>
          {section.items.map((item) => (
            <EventRow key={`${section.id}-${item.kind}-${item.id}`} item={item} />
          ))}
        </View>
      ) : variant === 'quotes' ? (
        <QuoteRail items={section.items} />
      ) : variant === 'list' ? (
        <View style={styles.sectionList}>
          {section.items.map((item) => (
            <CardRow key={`${section.id}-${item.kind}-${item.id}`} item={item} compact={compact} />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {section.items.map((item) => (
            <RailCard key={`${section.id}-${item.kind}-${item.id}`} item={item} fallbackAsset={fallbackAsset} />
          ))}
        </ScrollView>
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
  const router = useRouter();
  const editorial = SURFACE_EDITORIAL[title];
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
              <EditorialTitle
                segments={accentLastWord(payload.title)}
                size={32}
                color={theme.colors.text}
                accentColor={theme.colors.accent}
                style={styles.editorialTitle}
              />
              <Text style={[styles.summary, { color: theme.colors.textSecondary }]}>{payload.summary}</Text>
            </View>

            <SurfaceTopTools title={title} />

            {payload.mapPoints ? (
              <EventsMap points={payload.mapPoints} onPress={() => router.push('/events' as any)} />
            ) : null}

            {payload.hero ? <Hero item={payload.hero} fallbackAsset={fallbackAsset} /> : null}

            {payload.actions?.length ? (
              <View style={styles.actionsWrap}>
                {payload.actions.map((action, index) => (
                  <ActionPill key={action.id} action={action} primary={index === 0} />
                ))}
              </View>
            ) : null}

            {dedupeSections(payload.sections).flatMap((section, index) => [
              <SectionBlock key={section.id} section={section} compact={compact} primarySurface={primarySurface} fallbackAsset={fallbackAsset} />,
              editorial && index === 0 ? (
                <SceneReportCard
                  key="surface-editorial-band"
                  eyebrow={editorial.eyebrow}
                  titleSegments={editorial.titleSegments}
                  body={editorial.body}
                  ctaLabel={editorial.ctaLabel}
                  onPress={() => router.push(editorial.route as any)}
                />
              ) : null,
            ])}

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
  routeLabel: { fontFamily: pluggdFonts.satoshiBlack,
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
  loadingText: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    fontWeight: '700',
  },
  pageHeader: {
    gap: 8,
  },
  kicker: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    ...pluggdTextStyles.appTitleLarge,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  editorialTitle: { marginTop: 1, marginBottom: 1 },
  summary: {
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 14,
    lineHeight: 20,
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
  searchText: { fontFamily: pluggdFonts.satoshiBold,
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
  categoryPillText: { fontFamily: pluggdFonts.satoshiBlack,
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
  artworkInitials: { fontFamily: pluggdFonts.satoshiBlack,
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
  actionText: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    fontWeight: '800',
  },
  safetyNote: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
  },
  safetyText: { fontFamily: pluggdFonts.satoshiBold,
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
  sectionTitle: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionSubtitle: { fontFamily: pluggdFonts.satoshiMedium,
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
  // ---- poster variant (music / mixes / beats / soundboards) ----
  posterRail: {
    gap: 12,
    paddingRight: 8,
  },
  posterTap: {
    borderRadius: 20,
  },
  posterArt: {
    width: 158,
    height: 206,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  posterTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 10,
    gap: 6,
  },
  posterChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(8,8,12,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  posterChipText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  posterMetric: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,90,0,0.92)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  posterMetricText: {
    color: '#0E0E12',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  posterCopy: {
    padding: 12,
    gap: 3,
  },
  posterTitle: {
    color: '#FFFFFF',
    fontFamily: pluggdFonts.displayBold,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  posterSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Satoshi-Medium',
    fontSize: 11.5,
    lineHeight: 15,
  },
  mediaFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaInitials: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 22,
    fontWeight: '900',
  },
  fillMedia: {
    width: '100%',
    height: '100%',
  },
  // ---- "New From Creators" play rows ----
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  playThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  playKind: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  playTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 15.5,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  playMeta: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  playChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
  },
  playChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  playChipText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10,
  },
  playCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ---- "Creators to Watch" rows ----
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  creatorRowAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorRowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  creatorRowName: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  creatorRowRole: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
  viewPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,90,0,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,90,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  viewPillText: {
    color: '#FF8A4C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
  // ---- "Community Pulse" rows ----
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  pulseThumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pulseText: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12.5,
    lineHeight: 17,
  },
  pulseWhen: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10.5,
    maxWidth: 82,
  },
  // ---- corkboard soundboards ----
  board: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,170,90,0.18)',
    padding: 14,
    gap: 12,
  },
  boardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  boardHeadCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  boardEyebrow: {
    color: '#FF5A00',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
    letterSpacing: 1.4,
  },
  boardTitle: {
    color: '#FFFFFF',
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  boardMeta: {
    color: 'rgba(255,235,210,0.6)',
    fontFamily: 'Satoshi-Medium',
    fontSize: 11.5,
  },
  boardOpen: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  boardOpenText: {
    color: '#17130C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 11.5,
  },
  tape: {
    position: 'absolute',
    top: -6,
    alignSelf: 'center',
    width: 34,
    height: 11,
    borderRadius: 2,
    backgroundColor: 'rgba(150,110,70,0.85)',
  },
  tapeSmall: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 26,
    height: 9,
    borderRadius: 2,
    backgroundColor: 'rgba(150,110,70,0.85)',
    zIndex: 2,
  },
  pinnedAudio: {
    borderRadius: 14,
    backgroundColor: '#FBF6EC',
    padding: 12,
    gap: 9,
    marginTop: 4,
  },
  audioTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  audioPlay: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF5A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioCopy: {
    flex: 1,
    minWidth: 0,
  },
  audioTitle: {
    color: '#17130C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
  },
  audioKind: {
    color: '#8A7B66',
    fontFamily: 'Satoshi-Medium',
    fontSize: 10.5,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#FF7A33',
  },
  boardRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  polaroid: {
    width: 128,
    borderRadius: 8,
    backgroundColor: '#FBF6EC',
    padding: 7,
    paddingBottom: 9,
    transform: [{ rotate: '-2deg' }],
  },
  polaroidImage: {
    height: 96,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#241407',
  },
  polaroidCaption: {
    color: '#17130C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 10.5,
    marginTop: 6,
  },
  sticky: {
    flex: 1,
    minWidth: 0,
    borderRadius: 6,
    backgroundColor: '#F2E48A',
    padding: 11,
    gap: 4,
    transform: [{ rotate: '1.6deg' }],
  },
  stickyWide: {
    transform: [{ rotate: '0deg' }],
  },
  stickyLabel: {
    color: '#6E6222',
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  stickyText: {
    color: '#3C3512',
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  // ---- featured variant (lead spotlight + poster rail) ----
  featuredWrap: {
    gap: 14,
  },
  featuredCard: {
    height: 212,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'space-between',
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  featuredFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  featuredCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  featuredSub: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 17,
  },
  featuredPlay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  // ---- creators variant (circular avatars) ----
  creatorRail: {
    gap: 14,
    paddingRight: 8,
  },
  creatorCard: {
    width: 92,
    alignItems: 'center',
    gap: 8,
  },
  creatorAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorAvatarImg: {
    width: '100%',
    height: '100%',
  },
  creatorName: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 12.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  creatorMeta: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10.5,
    lineHeight: 13,
    textAlign: 'center',
  },
  // ---- hashtags variant (pill cloud) ----
  hashtagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
  },
  hashtagHash: {
    fontFamily: pluggdFonts.serifItalicBold,
    fontSize: 15,
  },
  hashtagText: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  hashtagMeta: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 10.5,
    marginLeft: 2,
  },
  // ---- events variant (ticketed rows) ----
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  eventThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventDateBlock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,8,12,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDateDay: {
    color: '#FFFFFF',
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 17,
    lineHeight: 19,
  },
  eventDateMonth: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  eventBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eventEyebrow: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  eventTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  eventMeta: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  eventTail: {
    alignItems: 'flex-end',
    gap: 6,
  },
  eventPrice: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 13,
  },
  eventView: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  eventViewText: {
    color: '#FF8A4C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  // ---- quotes variant (community signal) ----
  quoteRail: {
    gap: 12,
    paddingRight: 8,
  },
  quoteCard: {
    width: 264,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
    justifyContent: 'space-between',
  },
  quoteMark: {
    fontFamily: pluggdFonts.serifItalicBold,
    fontSize: 34,
    lineHeight: 30,
    height: 24,
  },
  quoteText: {
    fontFamily: pluggdFonts.serifItalic,
    fontSize: 16,
    lineHeight: 22,
  },
  quoteFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  quoteAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteAvatarImg: {
    width: '100%',
    height: '100%',
  },
  quoteInitials: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 11,
    fontWeight: '900',
  },
  quoteAuthor: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11.5,
  },
  filterRail: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  filterChipTitle: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
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
  railEyebrow: { fontFamily: pluggdFonts.satoshiBlack,
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
  railTitle: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  railSubtitle: { fontFamily: pluggdFonts.satoshiBold,
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
  eyebrow: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  cardTitle: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  cardSubtitle: { fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardTail: {
    maxWidth: 78,
    alignItems: 'flex-end',
    gap: 4,
  },
  metric: { fontFamily: pluggdFonts.satoshiBold,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
  },
  emptyText: { fontFamily: pluggdFonts.satoshiBold,
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
  studioDockLabel: { fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 10,
    fontWeight: '900',
  },
});
