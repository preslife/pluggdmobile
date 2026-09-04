/**
 * Releases — selected mobile "Listening Floor" system:
 * featured listening deck (art, Sora title, tracked artist·genre, waveform
 * scrubber, transport, support pill, format/released ledger), search +
 * type chips + Wall/Ledger toggle, then the numbered editorial sections —
 * 01 Fresh pressings, 02 The chart, 03 Pressing orders, 05 Listening
 * passes (ticket cards), 06 The racks — with the editors' pinned quote.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { PluggdImage } from '../../components/PluggdImage';
import { ReleaseArtwork } from '../../components/ReleaseArtwork';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { usePlayback } from '../../context/PlaybackProvider';
import { safeList, toggleSavedContent } from '../culture/mobileServices';
import { showQuickActions } from '../../lib/quickActions';
import { supabase } from '../../lib/supabase';
import { formatCompact, formatDuration, releasePlayableUrl, toTrack } from '../../lib/mobileContent';
import { Enter, EdPressable } from './EditorialBits';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';
import { loadHomeEditorialStories } from '../home/homeDiscoveryData';
import { loadPublicCreatorIdentityMap } from '../culture/publicCreatorIdentity';

type FloorRelease = {
  id: string;
  user_id: string | null;
  owner_id: string | null;
  title: string | null;
  artist: string | null;
  cover_art_url: string | null;
  preview_url: string | null;
  genre: string | null;
  release_type: string | null;
  release_date: string | null;
  price: number | null;
  credits_price: number | null;
  download_price: number | null;
  minimum_price: number | null;
  total_plays: number | null;
  is_featured: boolean | null;
  created_at: string | null;
};

type MarketSignal = {
  release_id: string;
  supporter_count: number;
  recent_supporter_count: number;
  preorder_count: number;
};

type PassEvent = {
  id: string;
  title: string | null;
  location: string | null;
  starts_at: string | null;
  price_cents: number | null;
};

const TYPE_CHIPS = ['All Types', 'Album', 'EP', 'Single'] as const;
const RELEASE_MODES = ['Lead Drop', 'This Week', 'Moving Now', 'Listening Passes'] as const;
const FLOOR_INK = '#20180f';
const FLOOR_PAPER = '#f5ead7';

function priceFor(release: FloorRelease) {
  if (Number(release.credits_price) > 0) return Math.ceil(Number(release.credits_price));
  const cashReference = release.price ?? release.download_price ?? release.minimum_price ?? 0;
  return cashReference > 0 ? Math.ceil(cashReference * 100) : 0;
}

function releaseCreator(release: FloorRelease) {
  return release.artist?.trim() || null;
}

function priceLabel(release: FloorRelease) {
  const value = priceFor(release);
  return value > 0 ? `${value.toLocaleString('en-GB')} credits` : 'Free';
}

function daysAgoLabel(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  const days = Math.max(0, Math.floor((Date.now() - time) / 86400000));
  if (days === 0) return 'TODAY';
  return `${days}D AGO`;
}

function releasedLabel(release: FloorRelease) {
  const value = release.release_date || release.created_at;
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBA';
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

function formatLabel(release: FloorRelease) {
  return (release.release_type || 'Single').toUpperCase();
}

function ReleaseDiscoveryHero({ release, releaseCount, genreCount, passCount, onBrowse }: {
  release?: FloorRelease;
  releaseCount: number;
  genreCount: number;
  passCount: number;
  onBrowse: () => void;
}) {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const router = useRouter();
  const playback = usePlayback();
  if (!release) return null;
  const track = toTrack(release as any, 'release');
  const playing = Boolean(track && playback.currentTrack?.id === track.id && playback.isPlaying);
  return (
    <LinearGradient
      colors={['#2a1004', '#140b06', '#070605']}
      locations={[0, 0.48, 1]}
      style={styles.discoveryHero}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoveryTabs}>
        {RELEASE_MODES.map((mode, index) => (
          <View key={mode} style={[styles.discoveryTab, index === 0 && styles.discoveryTabActive]}>
            <Text style={[styles.discoveryTabIndex, index === 0 && styles.discoveryTabTextActive]}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={[styles.discoveryTabText, index === 0 && styles.discoveryTabTextActive]}>{mode}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.discoveryKickerRow}><View style={styles.discoveryDot} /><Text style={styles.discoveryKicker}>PLUGGD RELEASES</Text></View>
      <Text style={styles.discoveryTitle}>New music discovery starts here.</Text>
      <Text style={styles.discoveryLede}>Fresh drops, community-backed records and creator-first releases curated into one focused listening floor.</Text>
      <View style={styles.featuredReleaseCard}>
        {release.cover_art_url ? <ReleaseArtwork uri={release.cover_art_url} style={styles.featuredReleaseArt} /> : <Image source={WEB_PARITY_ASSETS.warmListeningRoom} style={styles.featuredReleaseArt} />}
        <View style={styles.featuredReleaseCopy}>
          <Text style={styles.featuredReleaseLabel}>FEATURED DROP</Text>
          <Text style={styles.featuredReleaseTitle} numberOfLines={2}>{release.title || 'Untitled release'}</Text>
          {releaseCreator(release) ? <Text style={styles.featuredReleaseArtist} numberOfLines={1}>{releaseCreator(release)}</Text> : null}
          <View style={styles.featuredReleaseMetaRow}>
            <Text style={styles.featuredReleaseMeta}>{formatLabel(release)}</Text>
            <Text style={styles.featuredReleaseMeta}>{release.genre || 'Open genre'}</Text>
            <Text style={styles.featuredReleaseMeta}>{releasedLabel(release)}</Text>
            <Text style={styles.featuredReleaseMeta}>{priceLabel(release)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.discoveryActions}>
        <EdPressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause featured release' : 'Play featured release'} onPress={() => {
          if (playing) void playback.pause();
          else if (track) void playback.playTrack(track);
        }} style={{ width: '100%' }}><View style={styles.discoveryPrimary}><MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={19} color={theme.colors.onAccent} /><Text style={styles.discoveryPrimaryText}>{playing ? 'Playing now' : track ? 'Play featured release' : 'Preview unavailable'}</Text></View></EdPressable>
        <EdPressable accessibilityRole="button" accessibilityLabel={`Open ${release.title || 'featured release'}`} onPress={() => router.push(`/release/${release.id}` as any)} style={{ width: '100%' }}><View style={styles.discoverySecondary}><Text style={styles.discoverySecondaryText}>{priceFor(release) > 0 ? 'Support release' : 'Open release'}</Text><MaterialIcons name="arrow-forward" size={16} color={theme.colors.text} /></View></EdPressable>
      </View>
      <EdPressable accessibilityRole="button" accessibilityLabel="Browse the release floor" onPress={onBrowse}><View style={styles.discoveryBrowse}><MaterialIcons name="search" size={18} color={theme.colors.text} /><Text style={styles.discoveryBrowseText}>Browse the floor</Text></View></EdPressable>
      <View style={styles.discoveryStats}>
        <View style={styles.discoveryStat}><Text style={styles.discoveryStatValue}>{releaseCount}</Text><Text style={styles.discoveryStatLabel}>releases on the floor</Text></View>
        <View style={styles.discoveryStat}><Text style={styles.discoveryStatValue}>{genreCount}</Text><Text style={styles.discoveryStatLabel}>genres to explore</Text></View>
        <View style={[styles.discoveryStat, styles.discoveryStatLast]}><Text style={styles.discoveryStatValue}>{passCount}</Text><Text style={styles.discoveryStatLabel}>live listening passes</Text></View>
      </View>
    </LinearGradient>
  );
}

/** Numbered editorial section header matching the current web Listening Floor. */
function FloorKicker({ kicker, title, titleEm, action, onAction }: {
  kicker: string;
  title: string;
  titleEm: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = useListeningFloorStyles();
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.kicker}>{kicker.toUpperCase()}</Text>
      <Text style={styles.kickerTitle}>
        {title}{' '}
        <Text style={styles.kickerTitleEm}>{titleEm}</Text>
      </Text>
      {action ? (
        <EdPressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={styles.kickerAction}>{action.toUpperCase()} →</Text>
        </EdPressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Listening deck                                                      */
/* ------------------------------------------------------------------ */

function ListeningDeck({ releases }: { releases: FloorRelease[] }) {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const router = useRouter();
  const playback = usePlayback();
  const [deckIndex, setDeckIndex] = useState(0);
  const { width } = useWindowDimensions();
  const deck = releases.slice(0, 5);
  const release = deck[Math.min(deckIndex, Math.max(0, deck.length - 1))];
  if (!release) return null;

  const track = toTrack(release as any, 'release');
  const isCurrent = Boolean(track && playback.currentTrack?.id === track.id);
  const playing = isCurrent && playback.isPlaying;
  const position = isCurrent ? playback.progress.position : 0;
  const duration = isCurrent ? playback.progress.duration : 0;
  const playedRatio = duration > 0 ? Math.min(1, position / duration) : 0;
  const artSize = Math.min(300, Math.max(252, width - 90));
  const recordSize = artSize * 0.88;

  return (
    <View style={styles.deck}>
      <View style={styles.deckHeadRow}>
        <View style={styles.deckHeadLeft}>
          <View style={styles.deckDot} />
          <Text style={styles.deckHeadLabel}>THE LISTENING FLOOR</Text>
        </View>
        <Text style={styles.deckHeadRight}>FEATURED RELEASE</Text>
      </View>
      <View style={styles.deckDesk}>
        <View style={[styles.deckSleeveShadow, {
          width: recordSize,
          height: recordSize,
          borderRadius: recordSize / 2,
          left: artSize * 0.28,
          top: 18 + ((artSize - recordSize) / 2),
        }]} />
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${release.title || 'featured release'}`}
          onPress={() => router.push(`/release/${release.id}` as any)}
          style={[styles.deckArtWrap, { width: artSize, height: artSize }]}
        >
          {release.cover_art_url ? (
            <ReleaseArtwork uri={release.cover_art_url} fallbackSource={WEB_PARITY_ASSETS.warmListeningRoom} style={[styles.deckArt, { width: artSize, height: artSize }]} />
          ) : (
            <Image source={WEB_PARITY_ASSETS.warmListeningRoom} resizeMode="cover" style={[styles.deckArt, { width: artSize, height: artSize }]} />
          )}
          <View pointerEvents="none" style={styles.deckArtShade} />
        </EdPressable>
        <View style={styles.deckCopy}>
          <Text style={styles.deckFeaturedText}>EDITOR'S LISTEN</Text>
          <Text style={styles.deckTitle} numberOfLines={3}>{release.title || 'Untitled release'}</Text>
          {[releaseCreator(release), release.genre].filter(Boolean).length ? (
            <Text style={styles.deckArtist} numberOfLines={2}>
              {[releaseCreator(release), release.genre].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
          ) : null}
          <View style={styles.deckStatRow}>
            <Text style={styles.deckPlays}>{formatCompact(release.total_plays)} PLAYS</Text>
            <Text style={styles.deckFormat}>{formatLabel(release)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.deckPlaybackRail}>
        <MaterialIcons name="graphic-eq" size={20} color="#d84f00" />
        <View style={styles.deckProgressTrack}>
          <View style={[styles.deckProgressFill, { width: `${Math.max(2, playedRatio * 100)}%` }]} />
        </View>
      </View>
      {duration > 0 ? (
        <View style={styles.deckTimesRow}>
          <Text style={styles.deckTime}>{formatDuration(position)}</Text>
          <Text style={styles.deckTime}>{formatDuration(duration)}</Text>
        </View>
      ) : null}
      <View style={styles.deckTransportRow}>
        <View style={styles.deckTransportLeft}>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Previous featured release"
            onPress={() => setDeckIndex((index) => (index - 1 + deck.length) % deck.length)}
          >
            <View style={styles.deckSkip}>
              <MaterialIcons name="skip-previous" size={22} color={FLOOR_INK} />
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause featured release' : 'Play featured release'}
            onPress={() => {
              if (playing) {
                void playback.pause();
                return;
              }
              if (track) void playback.playTrack(track);
            }}
          >
            <View style={styles.deckPlay}>
              <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={26} color={FLOOR_PAPER} />
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Next featured release"
            onPress={() => setDeckIndex((index) => (index + 1) % deck.length)}
          >
            <View style={styles.deckSkip}>
              <MaterialIcons name="skip-next" size={22} color={FLOOR_INK} />
            </View>
          </EdPressable>
        </View>
      </View>
      <View style={styles.deckActionRow}>
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${release.title || 'this release'}`}
          onPress={() => router.push(`/release/${release.id}` as any)}
          style={{ flex: 1 }}
        >
          <View style={styles.deckSupport}>
            <Text style={styles.deckSupportText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>Open release</Text>
            <MaterialIcons name="arrow-forward" size={16} color={theme.colors.onAccent} />
          </View>
        </EdPressable>
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={`Save ${release.title || 'this release'}`}
          onPress={() => {
            void toggleSavedContent('release', release.id).then((result) => {
              Alert.alert(
                result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable',
                result.success ? `${release.title || 'Release'} library state updated.` : result.error || 'Please try again.',
              );
            });
          }}
        >
          <View style={styles.deckHeart}>
            <MaterialIcons name="favorite-border" size={21} color={FLOOR_INK} />
          </View>
        </EdPressable>
      </View>
      <View style={styles.deckDotsRow}>
        {deck.map((item, index) => (
          <EdPressable key={item.id} accessibilityRole="button" accessibilityLabel={`Featured release ${index + 1}`} accessibilityState={{ selected: index === deckIndex }} onPress={() => setDeckIndex(index)} hitSlop={8}>
            <View style={[styles.deckPage, index === deckIndex && styles.deckPageActive]} />
          </EdPressable>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Wall tile + editors quote                                           */
/* ------------------------------------------------------------------ */

function WallTile({ release }: { release: FloorRelease; tall?: boolean }) {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const router = useRouter();
  const playback = usePlayback();
  const quickActions = () => {
    const track = releasePlayableUrl(release as any) ? toTrack(release as any, 'release') : null;
    showQuickActions(release.title || 'Release', [
      ...(track ? [{ label: 'Play', onPress: () => void playback.playTrack(track) }] : []),
      {
        label: 'Save to library',
        onPress: () => {
          void toggleSavedContent('release', release.id).then((result) => {
            if (!result.success) Alert.alert('Save unavailable', result.error || 'Please try again.');
          });
        },
      },
      { label: 'Share', onPress: () => void Share.share({ message: `PLUGGD release: ${release.title || 'Untitled'}${releaseCreator(release) ? ` by ${releaseCreator(release)}` : ''}` }) },
      { label: 'Open release', onPress: () => router.push(`/release/${release.id}` as any) },
    ]);
  };
  return (
    <EdPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${release.title || 'release'}`}
      onPress={() => router.push(`/release/${release.id}` as any)}
      onLongPress={quickActions}
      style={{ flex: 1 }}
    >
      <View style={styles.wallTile}>
        <View style={styles.wallArtWrap}>
          {release.cover_art_url ? (
            <ReleaseArtwork uri={release.cover_art_url} style={styles.wallArt} />
          ) : (
            <View style={[styles.wallArt, { backgroundColor: theme.colors.artworkBase }]} />
          )}
          {daysAgoLabel(release.created_at) ? (
            <View style={styles.wallAgeChip}>
              <Text style={styles.wallAgeText}>{daysAgoLabel(release.created_at)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.wallTitleRow}>
          <Text style={styles.wallTitle} numberOfLines={1}>{release.title || 'Untitled'}</Text>
          <View style={styles.wallPriceChip}>
            <Text style={styles.wallPriceText}>{priceLabel(release)}</Text>
          </View>
        </View>
        {releaseCreator(release) ? <Text style={styles.wallArtist} numberOfLines={2}>{releaseCreator(release)!.toUpperCase()}</Text> : null}
      </View>
    </EdPressable>
  );
}

function EditorsQuoteTile() {
  const styles = useListeningFloorStyles();
  return (
    <View style={styles.quoteTile}>
      <Text style={styles.quoteKicker}>PINNED BY THE EDITORS</Text>
      <Text style={styles.quoteBody}>“It's bigger than the algorithm.”</Text>
      <Text style={styles.quoteSource}>— THE PLUG</Text>
    </View>
  );
}

function WallGrid({ releases, withQuote = false }: { releases: FloorRelease[]; withQuote?: boolean }) {
  const styles = useListeningFloorStyles();
  const left: Array<{ kind: 'release'; release: FloorRelease } | { kind: 'quote' }> = [];
  const right: Array<{ kind: 'release'; release: FloorRelease } | { kind: 'quote' }> = [];
  releases.forEach((release, index) => {
    (index % 2 === 0 ? left : right).push({ kind: 'release', release });
    if (withQuote && index === 2) right.push({ kind: 'quote' });
  });
  if (withQuote && releases.length <= 2) right.push({ kind: 'quote' });
  return (
    <View style={styles.wallGrid}>
      <View style={styles.wallColumn}>
        {left.map((item, index) =>
          item.kind === 'quote' ? <EditorsQuoteTile key={`quote-${index}`} /> : (
            <WallTile key={item.release.id} release={item.release} tall={index % 3 === 0} />
          ),
        )}
      </View>
      <View style={styles.wallColumn}>
        {right.map((item, index) =>
          item.kind === 'quote' ? <EditorsQuoteTile key={`quote-${index}`} /> : (
            <WallTile key={item.release.id} release={item.release} tall={index % 3 === 1} />
          ),
        )}
      </View>
    </View>
  );
}

function LedgerRows({ releases }: { releases: FloorRelease[] }) {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const router = useRouter();
  return (
    <View style={styles.ledgerList}>
      {releases.map((release) => (
        <EdPressable
          key={release.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${release.title || 'release'}`}
          onPress={() => router.push(`/release/${release.id}` as any)}
        >
          <View style={styles.ledgerRow}>
            <View style={styles.ledgerThumbWrap}>
              {release.cover_art_url ? (
                <ReleaseArtwork uri={release.cover_art_url} style={styles.ledgerThumb} />
              ) : (
                <View style={[styles.ledgerThumb, { backgroundColor: theme.colors.artworkBase }]} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.ledgerTitle} numberOfLines={1}>{release.title || 'Untitled'}</Text>
              <Text style={styles.ledgerArtist} numberOfLines={1}>
                {[release.artist, release.genre].filter(Boolean).join(' · ').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.ledgerPrice}>{priceLabel(release)}</Text>
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Chart                                                               */
/* ------------------------------------------------------------------ */

function ChartTable({ releases }: { releases: FloorRelease[] }) {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const router = useRouter();
  const rows = [...releases]
    .sort((a, b) => Number(b.total_plays ?? 0) - Number(a.total_plays ?? 0))
    .slice(0, 6);
  if (!rows.length) return null;
  return (
    <View style={{ gap: 0 }}>
      <View style={styles.chartHead}>
        <Text style={[styles.chartHeadText, { width: 30 }]}>#</Text>
        <Text style={[styles.chartHeadText, { flex: 1 }]}>TITLE / ARTIST</Text>
        <Text style={[styles.chartHeadText, { width: 52, textAlign: 'right' }]}>PLAYS</Text>
        <Text style={[styles.chartHeadText, { width: 44, textAlign: 'right' }]}>Δ WK</Text>
      </View>
      {rows.map((release, index) => (
        <EdPressable
          key={release.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${release.title || 'release'}`}
          onPress={() => router.push(`/release/${release.id}` as any)}
        >
          <View style={styles.chartRow}>
            <Text style={styles.chartRank}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.chartThumbWrap}>
              {release.cover_art_url ? (
                <ReleaseArtwork uri={release.cover_art_url} style={styles.chartThumb} />
              ) : (
                <View style={[styles.chartThumb, { backgroundColor: theme.colors.artworkBase }]} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.chartTitle} numberOfLines={1}>{release.title || 'Untitled'}</Text>
              <Text style={styles.chartArtist} numberOfLines={1}>{(release.artist || '').toUpperCase()}</Text>
            </View>
            <Text style={styles.chartPlays}>{formatCompact(release.total_plays)}</Text>
            <Text style={styles.chartDelta}>–</Text>
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pressing orders                                                     */
/* ------------------------------------------------------------------ */

function PressingOrders({ releases, signals }: { releases: FloorRelease[]; signals: Map<string, MarketSignal> }) {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(352, Math.max(282, width - 68));
  const backed = releases
    .filter((release) => priceFor(release) > 0)
    .map((release) => ({ release, signal: signals.get(release.id) }))
    .sort((a, b) => Number(b.signal?.supporter_count ?? 0) - Number(a.signal?.supporter_count ?? 0))
    .slice(0, 3);
  if (!backed.length) return null;
  const maxSupport = Math.max(1, ...backed.map(({ signal }) => Number(signal?.supporter_count ?? 0)));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast" contentContainerStyle={styles.horizontalRail}>
      {backed.map(({ release, signal }) => {
        const supporters = Number(signal?.supporter_count ?? 0);
        return (
          <View key={release.id} style={[styles.pressingCard, { width: cardWidth }]}>
            <View style={styles.pressingArtWrap}>
              {release.cover_art_url ? (
                <ReleaseArtwork uri={release.cover_art_url} style={styles.pressingArt} />
              ) : (
                <View style={[styles.pressingArt, { backgroundColor: theme.colors.artworkBase }]} />
              )}
            </View>
            <Text style={styles.pressingTitle} numberOfLines={1}>{release.title || 'Untitled'}</Text>
            {releaseCreator(release) ? <Text style={styles.pressingArtist} numberOfLines={1}>{releaseCreator(release)!.toUpperCase()}</Text> : null}
            <View style={styles.pressingBarTrack}>
              <View style={[styles.pressingBarFill, { width: `${Math.max(8, (supporters / maxSupport) * 100)}%` }]} />
            </View>
            <Text style={styles.pressingSupporters}>
              {supporters} SUPPORTER{supporters === 1 ? '' : 'S'}
            </Text>
            <View style={styles.pressingFootRow}>
              <Text style={styles.pressingPrice}>{priceLabel(release)}</Text>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Back ${release.title || 'this pressing'}`}
                onPress={() => router.push(`/release/${release.id}` as any)}
              >
                <View style={styles.pressingBackPill}>
                  <Text style={styles.pressingBackText}>Back this pressing</Text>
                </View>
              </EdPressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Listening passes (ticket cards)                                     */
/* ------------------------------------------------------------------ */

function ListeningPasses({ events }: { events: PassEvent[] }) {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(344, Math.max(274, width - 76));
  if (!events.length) {
    return (
      <View style={styles.passesEmpty}>
        <Text style={styles.passesEmptyTitle}>No listening moments on sale yet</Text>
        <Text style={styles.passesEmptyBody}>
          Passes land here when creators announce listening parties, shows and backstage moments.
        </Text>
        <EdPressable accessibilityRole="button" accessibilityLabel="Browse events" onPress={() => router.push('/events' as any)}>
          <View style={styles.passesEmptyCta}>
            <Text style={styles.passesEmptyCtaText}>Browse events</Text>
          </View>
        </EdPressable>
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardWidth + 12} decelerationRate="fast" contentContainerStyle={styles.horizontalRail}>
      {events.slice(0, 3).map((event) => {
        const starts = event.starts_at ? new Date(event.starts_at) : null;
        const dateLabel = starts
          ? starts.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          : 'TBA';
        const [venueLine] = (event.location || 'Venue TBA').split(',');
        return (
          <EdPressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`Get a pass for ${event.title || 'this event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
          >
            <View style={[styles.ticket, { width: cardWidth }]}>
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <Text style={styles.ticketTitle} numberOfLines={2}>{event.title || 'Listening moment'}</Text>
                <Text style={styles.ticketVenue} numberOfLines={2}>
                  {(event.location || 'Venue TBA').toUpperCase()}
                </Text>
                <Text style={styles.ticketDate}>{dateLabel}</Text>
                <View style={styles.ticketPassPill}>
                  <Text style={styles.ticketPassText}>Get Pass</Text>
                </View>
              </View>
              <View style={styles.ticketBarcode}>
                {Array.from({ length: 26 }).map((_, index) => (
                  <View
                    key={index}
                    style={{
                      height: index % 4 === 0 ? 2.5 : 1.5,
                      backgroundColor: theme.colors.text,
                      marginVertical: 1.1,
                      width: '100%',
                    }}
                  />
                ))}
              </View>
            </View>
          </EdPressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function ListeningFloorScreen() {
  const theme = usePluggdTheme();
  const styles = useListeningFloorStyles();
  const bottomInset = useBottomChromeInset();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_CHIPS)[number]>('All Types');
  const [view, setView] = useState<'wall' | 'ledger'>('wall');
  const [rackLimit, setRackLimit] = useState(12);
  const scrollRef = useRef<ScrollView>(null);
  const browseY = useRef(0);

  const releasesQuery = useQuery({
    queryKey: ['floor', 'releases'],
    queryFn: async () => {
      const rows = await safeList<FloorRelease>(
        (supabase as any)
          .from('releases')
          .select(
            'id,user_id,owner_id,title,artist,cover_art_url,preview_url,genre,release_type,release_date,price,credits_price,download_price,minimum_price,total_plays,is_featured,approved,status,catalogue_mode,visibility_status,created_at',
          )
          .eq('approved', true)
          .eq('status', 'live')
          .eq('catalogue_mode', 'pluggd')
          .eq('visibility_status', 'visible')
          .order('release_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(30),
      );
      const identityMap = await loadPublicCreatorIdentityMap(rows.map((release) => release.user_id || release.owner_id));
      return rows.map((release) => {
        if (release.artist?.trim()) return release;
        const identity = identityMap.get(release.user_id || release.owner_id || '');
        return {
          ...release,
          artist: identity?.username ? `@${identity.username}` : identity?.full_name || null,
        };
      });
    },
    staleTime: 1000 * 60 * 2,
  });

  const releases = useMemo(() => releasesQuery.data ?? [], [releasesQuery.data]);

  const signalsQuery = useQuery({
    queryKey: ['floor', 'market-signals', releases.length],
    enabled: releases.length > 0,
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).rpc('get_public_release_market_signals', {
          p_release_ids: releases.map((release) => release.id),
        });
        if (error || !Array.isArray(data)) return new Map<string, MarketSignal>();
        return new Map<string, MarketSignal>(
          data.map((row: any) => [
            row.release_id,
            {
              release_id: row.release_id,
              supporter_count: Number(row.supporter_count ?? 0),
              recent_supporter_count: Number(row.recent_supporter_count ?? 0),
              preorder_count: Number(row.preorder_count ?? 0),
            },
          ]),
        );
      } catch {
        return new Map<string, MarketSignal>();
      }
    },
    staleTime: 1000 * 60 * 3,
  });

  const passesQuery = useQuery({
    queryKey: ['floor', 'passes'],
    queryFn: () =>
      safeList<PassEvent>(
        (supabase as any)
          .from('events')
          .select('id,title,location,starts_at,price_cents')
          .eq('discoverable', true)
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(6),
      ),
    staleTime: 1000 * 60 * 3,
  });

  const featuredStoryQuery = useQuery({
    queryKey: ['floor', 'featured-story'],
    queryFn: () => loadHomeEditorialStories(1),
    staleTime: 1000 * 60 * 5,
  });
  const featuredStory = featuredStoryQuery.data?.[0];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return releases.filter((release) => {
      if (typeFilter !== 'All Types') {
        const type = (release.release_type || 'single').toLowerCase();
        if (type !== typeFilter.toLowerCase()) return false;
      }
      if (!query) return true;
      return (
        (release.title || '').toLowerCase().includes(query) ||
        (release.artist || '').toLowerCase().includes(query) ||
        (release.genre || '').toLowerCase().includes(query)
      );
    });
  }, [releases, search, typeFilter]);

  const featuredOrder = useMemo(() => {
    const playable = filtered.filter((release) => releasePlayableUrl(release as any));
    const rest = filtered.filter((release) => !releasePlayableUrl(release as any));
    const ordered = [...playable, ...rest];
    const featured = ordered.filter((release) => release.is_featured);
    const others = ordered.filter((release) => !release.is_featured);
    return [...featured, ...others];
  }, [filtered]);

  const weekAgo = Date.now() - 7 * 86400000;
  const fresh = useMemo(() => {
    const recent = filtered.filter((release) => {
      const time = release.created_at ? new Date(release.created_at).getTime() : 0;
      return time >= weekAgo;
    });
    return (recent.length ? recent : filtered).slice(0, 6);
  }, [filtered, weekAgo]);

  const refreshing = releasesQuery.isRefetching || passesQuery.isRefetching || featuredStoryQuery.isRefetching;
  const refresh = () => {
    void releasesQuery.refetch();
    void passesQuery.refetch();
    void signalsQuery.refetch();
    void featuredStoryQuery.refetch();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} translucent />
      <DiscoveryHeader backToDiscovery />
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentFill} />}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: bottomInset,
          paddingHorizontal: 20,
          gap: 30,
        }}
      >
        <ReleaseDiscoveryHero
          release={featuredOrder[0]}
          releaseCount={releases.length}
          genreCount={new Set(releases.map((release) => release.genre).filter(Boolean)).size}
          passCount={passesQuery.data?.length ?? 0}
          onBrowse={() => scrollRef.current?.scrollTo({ y: Math.max(0, browseY.current - 10), animated: true })}
        />
        {releasesQuery.isLoading ? (
          <PremiumSkeleton compact label="Loading the listening floor..." />
        ) : (
          <Enter delay={0}>
            <ListeningDeck releases={featuredOrder} />
          </Enter>
        )}

        {/* Search + filters */}
        <View onLayout={(event) => { browseY.current = event.nativeEvent.layout.y; }} style={{ gap: 12 }}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={19} color={theme.colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search creators, releases, genres..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.chipRow}>
            {TYPE_CHIPS.map((chip) => (
              <EdPressable
                key={chip}
                accessibilityRole="button"
                accessibilityLabel={`Filter ${chip}`}
                onPress={() => setTypeFilter(chip)}
              >
                <View style={[styles.typeChip, typeFilter === chip && styles.typeChipActive]}>
                  <Text style={[styles.typeChipText, typeFilter === chip && styles.typeChipTextActive]}>{chip}</Text>
                </View>
              </EdPressable>
            ))}
          </View>
          <View style={styles.viewToggleRow}>
            {(['wall', 'ledger'] as const).map((mode) => (
              <EdPressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={`${mode} view`}
                onPress={() => setView(mode)}
              >
                <View style={[styles.viewToggle, view === mode && styles.viewToggleActive]}>
                  <Text style={[styles.viewToggleText, view === mode && styles.viewToggleTextActive]}>
                    {mode.toUpperCase()}
                  </Text>
                </View>
              </EdPressable>
            ))}
          </View>
        </View>

        {/* 01 — Fresh pressings */}
        <View style={{ gap: 16 }}>
          <FloorKicker
            kicker="01 — Fresh pressings"
            title="Dropped"
            titleEm="this week."
            action="View all"
            onAction={() => setRackLimit(30)}
          />
          {view === 'wall' ? <WallGrid releases={fresh} withQuote /> : <LedgerRows releases={fresh} />}
        </View>

        {/* 02 — The chart */}
        <View style={{ gap: 16 }}>
          <FloorKicker kicker="02 — The chart" title="Moving" titleEm="right now." />
          <ChartTable releases={filtered} />
        </View>

        {/* 03 — Pressing orders */}
        <View style={{ gap: 16 }}>
          <FloorKicker kicker="03 — Pressing orders" title="Back the" titleEm="next run." />
          <PressingOrders releases={filtered} signals={signalsQuery.data ?? new Map()} />
        </View>

        {featuredStory?.featured_image_url ? (
          <View style={{ gap: 16 }}>
            <FloorKicker kicker="04 — From THE PLUG" title="Hear the" titleEm="bigger story." action="Open THE PLUG" onAction={() => router.push('/plug' as any)} />
            <EdPressable accessibilityRole="button" accessibilityLabel={`Read ${featuredStory.title || 'featured story'}`} onPress={() => router.push(`/plug/${featuredStory.id}` as any)} style={styles.floorStory}>
              <PluggdImage uri={featuredStory.featured_image_url} style={styles.floorStoryImage} resizeMode="cover" displayWidth={760} />
              <View style={styles.floorStoryShade} />
              <View style={styles.floorStoryCopy}>
                <Text style={styles.floorStoryLabel}>FEATURED STORY</Text>
                <Text style={styles.floorStoryTitle} numberOfLines={3}>{featuredStory.title}</Text>
                <Text style={styles.floorStoryAction}>Read inside PLUGGD →</Text>
              </View>
            </EdPressable>
          </View>
        ) : null}

        {/* 05 — Listening passes */}
        <View style={{ gap: 16 }}>
          <FloorKicker
            kicker="05 — Listening passes"
            title="Get closer to"
            titleEm="the music."
            action="All events"
            onAction={() => router.push('/events' as any)}
          />
          <ListeningPasses events={passesQuery.data ?? []} />
        </View>

        {/* 06 — The racks */}
        <View style={{ gap: 16 }}>
          <FloorKicker kicker="06 — The racks" title="Browse" titleEm="everything." />
          <Text style={styles.rackCount}>{filtered.length}</Text>
          {view === 'wall' ? (
            <WallGrid releases={filtered.slice(0, rackLimit)} />
          ) : (
            <LedgerRows releases={filtered.slice(0, rackLimit)} />
          )}
          {filtered.length > rackLimit ? (
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Load the next crate"
              onPress={() => setRackLimit((limit) => limit + 12)}
            >
              <View style={styles.loadMore}>
                <Text style={styles.loadMoreText}>Load the next crate</Text>
              </View>
            </EdPressable>
          ) : null}
        </View>

        {/* For creators */}
        <View style={{ gap: 10 }}>
          <FloorKicker kicker="For creators" title="Press" titleEm="your own." />
          <Text style={styles.creatorBody}>
            Releases, beats, mixes, packs — sell direct to the culture. Keep your masters, split your royalties.
          </Text>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Become a creator"
            onPress={() => router.push('/creator/onboarding' as any)}
          >
            <View style={styles.creatorCta}>
              <Text style={styles.creatorCtaText}>Become a Creator</Text>
            </View>
          </EdPressable>
        </View>
      </ScrollView>
    </View>
  );
}

function useListeningFloorStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#070605' },
  horizontalRail: { gap: 12, paddingRight: 20 },

  floorIntro: { paddingTop: 6, gap: 7 },
  floorIntroKicker: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.8, color: theme.colors.accentText },
  floorIntroTitle: { maxWidth: 340, fontFamily: edFonts.serif, fontSize: 35, lineHeight: 38, letterSpacing: -0.65, color: theme.colors.text },
  floorIntroBody: { maxWidth: 340, fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary },

  discoveryHero: { gap: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  discoveryTabs: { gap: 10, paddingRight: 20 },
  discoveryTab: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,248,237,0.22)', borderRadius: 23, backgroundColor: 'rgba(7,6,5,0.34)' },
  discoveryTabActive: { borderColor: '#ff6600', backgroundColor: '#ff6600', shadowColor: '#ff6600', shadowOpacity: 0.38, shadowRadius: 13, shadowOffset: { width: 0, height: 6 } },
  discoveryTabIndex: { fontFamily: edFonts.mono, fontSize: 9.5, color: 'rgba(255,248,237,0.55)' },
  discoveryTabText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: '#fff8ed' },
  discoveryTabTextActive: { color: '#201006' },
  discoveryKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  discoveryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accentFill },
  discoveryKicker: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.8, color: '#ff7a24' },
  discoveryTitle: { maxWidth: 340, fontFamily: edFonts.serif, fontSize: 38, lineHeight: 40, letterSpacing: -1.1, color: '#fff8ed' },
  discoveryLede: { maxWidth: 342, fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 21, color: 'rgba(255,248,237,0.68)' },
  featuredReleaseCard: { minHeight: 130, padding: 12, flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: 'rgba(255,248,237,0.22)', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.035)' },
  featuredReleaseArt: { width: 104, height: 104, borderRadius: 3 },
  featuredReleaseCopy: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 5 },
  featuredReleaseLabel: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.4, color: '#ff7a24' },
  featuredReleaseTitle: { fontFamily: edFonts.serif, fontSize: 20, lineHeight: 22, color: '#fff8ed' },
  featuredReleaseArtist: { fontFamily: edFonts.bodyBold, fontSize: 12, color: '#ff7a24' },
  featuredReleaseMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  featuredReleaseMeta: { minHeight: 25, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,248,237,0.22)', borderRadius: 13, fontFamily: edFonts.mono, fontSize: 7.5, letterSpacing: 0.35, color: 'rgba(255,248,237,0.72)' },
  discoveryActions: { gap: 9 },
  discoveryPrimary: { minHeight: 48, paddingHorizontal: 12, borderRadius: 7, backgroundColor: '#ff6600', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  discoveryPrimaryText: { flexShrink: 1, fontFamily: edFonts.bodyBlack, fontSize: 12, color: theme.colors.onAccent, textAlign: 'center' },
  discoverySecondary: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,248,237,0.22)', borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.025)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  discoverySecondaryText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#fff8ed' },
  discoveryBrowse: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,248,237,0.22)', borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  discoveryBrowseText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#fff8ed' },
  discoveryStats: { minHeight: 62, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,248,237,0.18)' },
  discoveryStat: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 9, justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,248,237,0.16)' },
  discoveryStatLast: { borderRightWidth: 0 },
  discoveryStatValue: { fontFamily: edFonts.serif, fontSize: 22, lineHeight: 23, color: '#fff8ed' },
  discoveryStatLabel: { marginTop: 2, fontFamily: edFonts.bodyMedium, fontSize: 8.5, lineHeight: 11, color: 'rgba(255,248,237,0.55)' },

  kicker: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: theme.colors.textMuted },
  kickerTitle: { fontFamily: edFonts.serif, fontSize: 32, lineHeight: 35, color: theme.colors.text, letterSpacing: -0.4 },
  kickerTitleEm: { fontFamily: edFonts.serifItalic, color: theme.colors.text },
  kickerAction: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1.8, color: theme.colors.accentText },

  /* Deck */
  deck: { gap: 14, marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, backgroundColor: FLOOR_PAPER },
  deckHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  deckHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  deckDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ff6600' },
  deckHeadLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.5, color: 'rgba(32,24,15,0.62)' },
  deckHeadRight: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: '#d84f00' },
  deckDesk: { minHeight: 410, paddingTop: 18, gap: 18, overflow: 'hidden' },
  deckSleeveShadow: { position: 'absolute', backgroundColor: '#15120e', borderWidth: 11, borderColor: '#241f19', opacity: 0.98 },
  deckArtWrap: { borderRadius: 2, overflow: 'hidden', transform: [{ rotate: '-0.6deg' }], zIndex: 1, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 9 } },
  deckArt: { backgroundColor: '#d8c9b4' },
  deckArtShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,6,5,0.18)',
  },
  deckCopy: { minWidth: 0, gap: 6, zIndex: 2 },
  deckFeaturedText: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.35, color: '#d84f00' },
  deckDotsRow: { flexDirection: 'row', gap: 7, marginTop: 2 },
  deckPage: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'rgba(32,24,15,0.18)' },
  deckPageActive: { backgroundColor: '#d84f00' },
  deckTitle: { fontFamily: edFonts.serif, fontSize: 26, lineHeight: 29, color: FLOOR_INK, marginTop: 3 },
  deckArtist: { fontFamily: edFonts.mono, fontSize: 8.5, lineHeight: 13, letterSpacing: 1.15, color: 'rgba(32,24,15,0.64)', marginTop: 2 },
  deckStatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 7 },
  deckFormat: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.2, color: '#d84f00' },
  deckPlaybackRail: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 28, marginTop: 2 },
  deckProgressTrack: { flex: 1, height: 5, borderRadius: 999, backgroundColor: 'rgba(32,24,15,0.14)', overflow: 'hidden' },
  deckProgressFill: { height: '100%', borderRadius: 999, backgroundColor: '#d84f00' },
  deckTimesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  deckTime: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1, color: 'rgba(32,24,15,0.55)' },
  deckTransportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  deckTransportLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  deckSkip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(32,24,15,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckPlay: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#17130f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckPlays: { flexShrink: 1, fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.1, color: 'rgba(32,24,15,0.62)' },
  deckActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deckSupport: {
    minHeight: 44,
    borderRadius: 7,
    backgroundColor: '#ff6600',
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckSupportText: {
    fontFamily: edFonts.bodyBlack,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.onAccent,
    textAlign: 'center',
  },
  deckHeart: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(32,24,15,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckLedger: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.divider,
  },
  deckLedgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  deckLedgerLabel: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: theme.colors.textMuted },
  deckLedgerValue: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1.6, color: theme.colors.text },

  floorStory: { minHeight: 238, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#171310' },
  floorStoryImage: { ...StyleSheet.absoluteFillObject },
  floorStoryShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,6,5,0.5)' },
  floorStoryCopy: { padding: 17, gap: 6 },
  floorStoryLabel: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.5, color: theme.colors.accentFill },
  floorStoryTitle: { maxWidth: 310, fontFamily: edFonts.serif, fontSize: 25, lineHeight: 29, color: theme.colors.mediaText },
  floorStoryAction: { minHeight: 44, paddingTop: 10, fontFamily: edFonts.bodyBlack, fontSize: 12, color: theme.colors.mediaText },

  /* Search + filters */
  searchBar: {
    minHeight: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: theme.colors.text, fontFamily: edFonts.bodyMedium, fontSize: 13.5, paddingVertical: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  typeChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: theme.colors.text },
  typeChipTextActive: { color: theme.colors.onAccent },
  viewToggleRow: { flexDirection: 'row', gap: 2 },
  viewToggle: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  viewToggleActive: { backgroundColor: theme.colors.accentFill },
  viewToggleText: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1.6, color: theme.colors.textSecondary },
  viewToggleTextActive: { color: theme.colors.onAccent },

  /* Wall */
  wallGrid: { flexDirection: 'row', gap: 12 },
  wallColumn: { flex: 1, gap: 18 },
  wallTile: { gap: 6 },
  wallArtWrap: { borderRadius: 3, overflow: 'hidden' },
  wallArt: { width: '100%', aspectRatio: 1 },
  wallAgeChip: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(7,6,5,0.8)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  wallAgeText: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.2, color: theme.colors.mediaText },
  wallTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wallTitle: { flex: 1, fontFamily: edFonts.serif, fontSize: 17, color: theme.colors.text },
  wallPriceChip: { backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4 },
  wallPriceText: { fontFamily: edFonts.mono, fontSize: 10.5, color: theme.colors.text },
  wallArtist: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, lineHeight: 15, color: theme.colors.textMuted },

  quoteTile: {
    backgroundColor: theme.colors.surfaceAlt,
    padding: 16,
    gap: 14,
    justifyContent: 'center',
    minHeight: 190,
  },
  quoteKicker: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: theme.colors.textSecondary },
  quoteBody: { fontFamily: edFonts.serifItalic, fontSize: 19, lineHeight: 24, color: theme.colors.text },
  quoteSource: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: theme.colors.textSecondary },

  /* Ledger view */
  ledgerList: { gap: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  ledgerThumbWrap: { width: 46, height: 46, overflow: 'hidden', borderRadius: 3 },
  ledgerThumb: { width: '100%', height: '100%' },
  ledgerTitle: { fontFamily: edFonts.serif, fontSize: 16.5, color: theme.colors.text },
  ledgerArtist: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: theme.colors.textMuted },
  ledgerPrice: { fontFamily: edFonts.mono, fontSize: 11, color: theme.colors.accentText },

  /* Chart */
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
    gap: 8,
  },
  chartHeadText: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: theme.colors.textMuted },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  chartRank: { width: 30, fontFamily: edFonts.serifItalic, fontSize: 19, color: theme.colors.textMuted },
  chartThumbWrap: { width: 40, height: 40, borderRadius: 3, overflow: 'hidden' },
  chartThumb: { width: '100%', height: '100%' },
  chartTitle: { fontFamily: edFonts.serif, fontSize: 16, color: theme.colors.text },
  chartArtist: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.2, color: theme.colors.textMuted },
  chartPlays: { width: 52, textAlign: 'right', fontFamily: edFonts.mono, fontSize: 11, color: theme.colors.text },
  chartDelta: { width: 44, textAlign: 'right', fontFamily: edFonts.mono, fontSize: 11, color: theme.colors.textMuted },

  /* Pressing orders */
  pressingCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 16,
    gap: 8,
  },
  pressingArtWrap: { width: 84, height: 84, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  pressingArt: { width: '100%', height: '100%' },
  pressingTitle: { fontFamily: edFonts.serif, fontSize: 24, color: theme.colors.text },
  pressingArtist: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.8, color: theme.colors.textMuted },
  pressingBarTrack: { height: 3, backgroundColor: theme.colors.border, marginTop: 10 },
  pressingBarFill: { height: 3, backgroundColor: theme.colors.accentFill },
  pressingSupporters: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.8, color: theme.colors.textSecondary, marginTop: 4 },
  pressingFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pressingPrice: { fontFamily: edFonts.mono, fontSize: 13, color: theme.colors.accentText },
  pressingBackPill: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressingBackText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.onAccent },

  /* Passes */
  ticket: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceAlt,
    padding: 16,
    gap: 14,
  },
  ticketTitle: { fontFamily: edFonts.serif, fontSize: 21, lineHeight: 24, color: theme.colors.text },
  ticketVenue: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, lineHeight: 15, color: theme.colors.textSecondary },
  ticketDate: { fontFamily: edFonts.serif, fontSize: 34, color: theme.colors.text, marginTop: 2 },
  ticketPassPill: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ticketPassText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: theme.colors.onAccent },
  ticketBarcode: { width: 44, justifyContent: 'center' },
  passesEmpty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 8,
  },
  passesEmptyTitle: { fontFamily: edFonts.serif, fontSize: 20, color: theme.colors.text },
  passesEmptyBody: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: theme.colors.textSecondary },
  passesEmptyCta: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  passesEmptyCtaText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.text },

  /* Racks */
  rackCount: { fontFamily: edFonts.mono, fontSize: 11, letterSpacing: 1.4, color: theme.colors.textMuted },
  loadMore: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: theme.colors.text },

  /* For creators */
  creatorBody: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary },
  creatorCta: {
    alignSelf: 'flex-start',
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  creatorCtaText: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: theme.colors.onAccent },
}), [theme]);
}
