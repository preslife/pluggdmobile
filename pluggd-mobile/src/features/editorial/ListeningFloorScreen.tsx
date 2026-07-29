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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { ReleaseArtwork } from '../../components/ReleaseArtwork';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { ed, edFonts } from '../../design/editorial';
import { usePlayback } from '../../context/PlaybackProvider';
import { safeList, toggleSavedContent } from '../culture/mobileServices';
import { showQuickActions } from '../../lib/quickActions';
import { supabase } from '../../lib/supabase';
import { formatCompact, formatDuration, formatGBP, releasePlayableUrl, toTrack } from '../../lib/mobileContent';
import { Enter, EdPressable } from './EditorialBits';
import { WEB_PARITY_ASSETS } from '../parity/webAssets';

type FloorRelease = {
  id: string;
  title: string | null;
  artist: string | null;
  cover_art_url: string | null;
  preview_url: string | null;
  download_url: string | null;
  genre: string | null;
  release_type: string | null;
  release_date: string | null;
  price: number | null;
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

function priceFor(release: FloorRelease) {
  return release.price ?? release.download_price ?? release.minimum_price ?? 0;
}

function priceLabel(release: FloorRelease) {
  const value = priceFor(release);
  return value > 0 ? formatGBP(value) : 'Free';
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

/** Numbered editorial section header: mono kicker + serif title with italic-orange accent. */
function FloorKicker({ kicker, title, titleEm, action, onAction }: {
  kicker: string;
  title: string;
  titleEm: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.kicker}>{kicker.toUpperCase()}</Text>
      <Text style={styles.kickerTitle}>
        {title}{' '}
        <Text style={styles.kickerTitleEm}>{titleEm}</Text>
      </Text>
      {action ? (
        <EdPressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={{ minHeight: 30, justifyContent: 'center' }}>
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
  const router = useRouter();
  const playback = usePlayback();
  const [deckIndex, setDeckIndex] = useState(0);
  const deck = releases.slice(0, 5);
  const release = deck[Math.min(deckIndex, Math.max(0, deck.length - 1))];
  if (!release) return null;

  const track = toTrack(release as any, 'release');
  const isCurrent = Boolean(track && playback.currentTrack?.id === track.id);
  const playing = isCurrent && playback.isPlaying;
  const position = isCurrent ? playback.progress.position : 0;
  const duration = isCurrent ? playback.progress.duration : 0;
  const playedRatio = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={styles.deck}>
      <View style={styles.deckHeadRow}>
        <View style={styles.deckHeadLeft}>
          <View style={styles.deckDot} />
          <Text style={styles.deckHeadLabel}>THE LISTENING FLOOR</Text>
        </View>
        <Text style={styles.deckHeadRight}>FEATURED DROP</Text>
      </View>
      <EdPressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${release.title || 'featured release'}`}
        onPress={() => router.push(`/release/${release.id}` as any)}
      >
        <View style={styles.deckArtWrap}>
          {release.cover_art_url ? (
            <ReleaseArtwork
              uri={release.cover_art_url}
              fallbackSource={WEB_PARITY_ASSETS.warmListeningRoom}
              style={styles.deckArt}
            />
          ) : (
            <Image source={WEB_PARITY_ASSETS.warmListeningRoom} resizeMode="cover" style={styles.deckArt} />
          )}
          <View pointerEvents="none" style={styles.deckArtShade} />
          <View style={styles.deckFeaturedPill}>
            <Text style={styles.deckFeaturedText}>FEATURED DROP</Text>
          </View>
        </View>
      </EdPressable>
      <View style={styles.deckDotsRow}>
        {deck.map((item, index) => (
          <EdPressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Featured drop ${index + 1}`}
            onPress={() => setDeckIndex(index)}
            hitSlop={8}
          >
            <View style={[styles.deckPage, index === deckIndex && styles.deckPageActive]} />
          </EdPressable>
        ))}
      </View>
      <Text style={styles.deckTitle}>{release.title || 'Untitled release'}</Text>
      <Text style={styles.deckArtist}>
        {[release.artist, release.genre].filter(Boolean).join(' · ').toUpperCase() || 'PLUGGD CREATOR'}
      </Text>
      <View style={styles.deckWaveRow}>
        {Array.from({ length: 48 }).map((_, index) => {
          const wave = Math.abs(Math.sin((index + 3) * 1.35)) * 0.8 + 0.2;
          const played = index / 48 <= playedRatio;
          return (
            <View
              key={index}
              style={{
                width: 3,
                borderRadius: 1.5,
                height: Math.max(4, wave * 30),
                backgroundColor: played ? ed.orange : 'rgba(255,248,237,0.28)',
              }}
            />
          );
        })}
      </View>
      <View style={styles.deckTimesRow}>
        <Text style={styles.deckTime}>{formatDuration(position)}</Text>
        <Text style={styles.deckTime}>{duration > 0 ? formatDuration(duration) : '--:--'}</Text>
      </View>
      <View style={styles.deckTransportRow}>
        <View style={styles.deckTransportLeft}>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Previous featured drop"
            onPress={() => setDeckIndex((index) => (index - 1 + deck.length) % deck.length)}
          >
            <View style={styles.deckSkip}>
              <MaterialIcons name="skip-previous" size={22} color={ed.cream} />
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause featured drop' : 'Play featured drop'}
            onPress={() => {
              if (playing) {
                void playback.pause();
                return;
              }
              if (track) void playback.playTrack(track);
            }}
          >
            <View style={styles.deckPlay}>
              <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={26} color={ed.ink} />
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Next featured drop"
            onPress={() => setDeckIndex((index) => (index + 1) % deck.length)}
          >
            <View style={styles.deckSkip}>
              <MaterialIcons name="skip-next" size={22} color={ed.cream} />
            </View>
          </EdPressable>
        </View>
        <Text style={styles.deckPlays}>{formatCompact(release.total_plays)} PLAYS</Text>
      </View>
      <View style={styles.deckSupportRow}>
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={`Support ${release.title || 'this release'}`}
          onPress={() => router.push(`/release/${release.id}` as any)}
          style={{ flex: 1 }}
        >
          <View style={styles.deckSupport}>
            <Text style={styles.deckSupportText}>
              {priceFor(release) > 0 ? `Support — ${priceLabel(release)}` : 'Listen free'}
            </Text>
          </View>
        </EdPressable>
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel="Save this release"
          onPress={() => router.push(`/release/${release.id}` as any)}
        >
          <View style={styles.deckHeart}>
            <MaterialIcons name="favorite-border" size={20} color={ed.cream} />
          </View>
        </EdPressable>
      </View>
      <View style={styles.deckLedger}>
        <View style={styles.deckLedgerRow}>
          <Text style={styles.deckLedgerLabel}>FORMAT</Text>
          <Text style={styles.deckLedgerValue}>{formatLabel(release)} · 1 TRACKS</Text>
        </View>
        <View style={[styles.deckLedgerRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.deckLedgerLabel}>RELEASED</Text>
          <Text style={styles.deckLedgerValue}>{releasedLabel(release)}</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Wall tile + editors quote                                           */
/* ------------------------------------------------------------------ */

function WallTile({ release }: { release: FloorRelease; tall?: boolean }) {
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
      { label: 'Share', onPress: () => void Share.share({ message: `PLUGGD release: ${release.title || 'Untitled'} by ${release.artist || 'Creator'}` }) },
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
            <View style={[styles.wallArt, { backgroundColor: '#191410' }]} />
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
        <Text style={styles.wallArtist} numberOfLines={2}>{(release.artist || 'PLUGGD CREATOR').toUpperCase()}</Text>
      </View>
    </EdPressable>
  );
}

function EditorsQuoteTile() {
  return (
    <View style={styles.quoteTile}>
      <Text style={styles.quoteKicker}>PINNED BY THE EDITORS</Text>
      <Text style={styles.quoteBody}>“It's bigger than the algorithm.”</Text>
      <Text style={styles.quoteSource}>— THE PLUG</Text>
    </View>
  );
}

function WallGrid({ releases, withQuote = false }: { releases: FloorRelease[]; withQuote?: boolean }) {
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
                <View style={[styles.ledgerThumb, { backgroundColor: '#191410' }]} />
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
                <View style={[styles.chartThumb, { backgroundColor: '#191410' }]} />
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
  const router = useRouter();
  const backed = releases
    .filter((release) => priceFor(release) > 0)
    .map((release) => ({ release, signal: signals.get(release.id) }))
    .sort((a, b) => Number(b.signal?.supporter_count ?? 0) - Number(a.signal?.supporter_count ?? 0))
    .slice(0, 3);
  if (!backed.length) return null;
  const maxSupport = Math.max(1, ...backed.map(({ signal }) => Number(signal?.supporter_count ?? 0)));
  return (
    <View style={{ gap: 14 }}>
      {backed.map(({ release, signal }) => {
        const supporters = Number(signal?.supporter_count ?? 0);
        return (
          <View key={release.id} style={styles.pressingCard}>
            <View style={styles.pressingArtWrap}>
              {release.cover_art_url ? (
                <ReleaseArtwork uri={release.cover_art_url} style={styles.pressingArt} />
              ) : (
                <View style={[styles.pressingArt, { backgroundColor: '#191410' }]} />
              )}
            </View>
            <Text style={styles.pressingTitle} numberOfLines={1}>{release.title || 'Untitled'}</Text>
            <Text style={styles.pressingArtist} numberOfLines={1}>{(release.artist || 'PLUGGD CREATOR').toUpperCase()}</Text>
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
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Listening passes (ticket cards)                                     */
/* ------------------------------------------------------------------ */

function ListeningPasses({ events }: { events: PassEvent[] }) {
  const router = useRouter();
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
    <View style={{ gap: 14 }}>
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
            <View style={styles.ticket}>
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
                      backgroundColor: ed.ink,
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
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function ListeningFloorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_CHIPS)[number]>('All Types');
  const [view, setView] = useState<'wall' | 'ledger'>('wall');
  const [rackLimit, setRackLimit] = useState(12);

  const releasesQuery = useQuery({
    queryKey: ['floor', 'releases'],
    queryFn: () =>
      safeList<FloorRelease>(
        (supabase as any)
          .from('releases')
          .select(
            'id,title,artist,cover_art_url,preview_url,download_url,genre,release_type,release_date,price,download_price,minimum_price,total_plays,is_featured,approved,status,catalogue_mode,visibility_status,created_at',
          )
          .eq('approved', true)
          .eq('status', 'live')
          .eq('catalogue_mode', 'pluggd')
          .eq('visibility_status', 'visible')
          .order('release_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(30),
      ),
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
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(6),
      ),
    staleTime: 1000 * 60 * 3,
  });

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

  const refreshing = releasesQuery.isRefetching || passesQuery.isRefetching;
  const refresh = () => {
    void releasesQuery.refetch();
    void passesQuery.refetch();
    void signalsQuery.refetch();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 76, 96),
          paddingBottom: insets.bottom + 210,
          paddingHorizontal: 20,
          gap: 30,
        }}
      >
        {releasesQuery.isLoading ? (
          <PremiumSkeleton compact label="Loading the listening floor..." />
        ) : (
          <Enter delay={0}>
            <ListeningDeck releases={featuredOrder} />
          </Enter>
        )}

        {/* Search + filters */}
        <View style={{ gap: 12 }}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={19} color={ed.creamSoft} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search creators, releases, genres..."
              placeholderTextColor={ed.creamSoft}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },

  kicker: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,248,237,0.55)' },
  kickerTitle: { fontFamily: edFonts.serif, fontSize: 32, lineHeight: 35, color: ed.cream, letterSpacing: -0.4 },
  kickerTitleEm: { fontFamily: edFonts.serifItalic, color: ed.orange },
  kickerAction: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1.8, color: ed.orange },

  /* Deck */
  deck: { gap: 10 },
  deckHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  deckHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  deckDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ed.orange },
  deckHeadLabel: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,248,237,0.6)' },
  deckHeadRight: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: ed.orange },
  deckArtWrap: { borderRadius: 4, overflow: 'hidden' },
  deckArt: { width: '100%', aspectRatio: 1 },
  deckArtShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,6,5,0.18)',
  },
  deckFeaturedPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(7,6,5,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.35)',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deckFeaturedText: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: ed.cream },
  deckDotsRow: { flexDirection: 'row', gap: 7, marginTop: 2 },
  deckPage: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,248,237,0.25)' },
  deckPageActive: { backgroundColor: ed.orange },
  deckTitle: { fontFamily: edFonts.serif, fontSize: 30, lineHeight: 33, color: ed.cream, marginTop: 6 },
  deckArtist: { fontFamily: edFonts.mono, fontSize: 11, letterSpacing: 2, color: 'rgba(255,248,237,0.6)' },
  deckWaveRow: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 34, marginTop: 8 },
  deckTimesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  deckTime: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1, color: 'rgba(255,248,237,0.55)' },
  deckTransportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  deckTransportLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deckSkip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckPlay: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: ed.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckPlays: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,248,237,0.6)' },
  deckSupportRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  deckSupport: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckSupportText: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: ed.onOrange },
  deckHeart: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckLedger: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,248,237,0.22)',
  },
  deckLedgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,248,237,0.22)',
  },
  deckLedgerLabel: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,248,237,0.5)' },
  deckLedgerValue: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1.6, color: ed.cream },

  /* Search + filters */
  searchBar: {
    minHeight: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: ed.cream, fontFamily: edFonts.bodyMedium, fontSize: 13.5, paddingVertical: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: { backgroundColor: ed.paper, borderColor: ed.paper },
  typeChipText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  typeChipTextActive: { color: ed.ink },
  viewToggleRow: { flexDirection: 'row', gap: 2 },
  viewToggle: {
    minHeight: 38,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  viewToggleActive: { backgroundColor: ed.orange },
  viewToggleText: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 1.6, color: 'rgba(255,248,237,0.6)' },
  viewToggleTextActive: { color: '#ffffff' },

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
  wallAgeText: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.2, color: ed.cream },
  wallTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  wallTitle: { flex: 1, fontFamily: edFonts.serif, fontSize: 17, color: ed.cream },
  wallPriceChip: { backgroundColor: '#241d15', paddingHorizontal: 8, paddingVertical: 4 },
  wallPriceText: { fontFamily: edFonts.mono, fontSize: 10.5, color: ed.cream },
  wallArtist: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, lineHeight: 15, color: 'rgba(255,248,237,0.55)' },

  quoteTile: {
    backgroundColor: ed.paper2,
    padding: 16,
    gap: 14,
    justifyContent: 'center',
    minHeight: 190,
  },
  quoteKicker: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: 'rgba(34,23,15,0.6)' },
  quoteBody: { fontFamily: edFonts.serifItalic, fontSize: 19, lineHeight: 24, color: ed.ink },
  quoteSource: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: 'rgba(34,23,15,0.6)' },

  /* Ledger view */
  ledgerList: { gap: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,248,237,0.2)' },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,248,237,0.2)',
  },
  ledgerThumbWrap: { width: 46, height: 46, overflow: 'hidden', borderRadius: 3 },
  ledgerThumb: { width: '100%', height: '100%' },
  ledgerTitle: { fontFamily: edFonts.serif, fontSize: 16.5, color: ed.cream },
  ledgerArtist: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: 'rgba(255,248,237,0.55)' },
  ledgerPrice: { fontFamily: edFonts.mono, fontSize: 11, color: ed.orange },

  /* Chart */
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,248,237,0.25)',
    gap: 8,
  },
  chartHeadText: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, color: 'rgba(255,248,237,0.5)' },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,248,237,0.16)',
  },
  chartRank: { width: 30, fontFamily: edFonts.serifItalic, fontSize: 19, color: 'rgba(255,248,237,0.5)' },
  chartThumbWrap: { width: 40, height: 40, borderRadius: 3, overflow: 'hidden' },
  chartThumb: { width: '100%', height: '100%' },
  chartTitle: { fontFamily: edFonts.serif, fontSize: 16, color: ed.cream },
  chartArtist: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.2, color: 'rgba(255,248,237,0.5)' },
  chartPlays: { width: 52, textAlign: 'right', fontFamily: edFonts.mono, fontSize: 11, color: ed.cream },
  chartDelta: { width: 44, textAlign: 'right', fontFamily: edFonts.mono, fontSize: 11, color: 'rgba(255,248,237,0.45)' },

  /* Pressing orders */
  pressingCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.22)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    gap: 8,
  },
  pressingArtWrap: { width: 84, height: 84, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  pressingArt: { width: '100%', height: '100%' },
  pressingTitle: { fontFamily: edFonts.serif, fontSize: 24, color: ed.cream },
  pressingArtist: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.8, color: 'rgba(255,248,237,0.55)' },
  pressingBarTrack: { height: 3, backgroundColor: 'rgba(255,248,237,0.16)', marginTop: 10 },
  pressingBarFill: { height: 3, backgroundColor: ed.orange },
  pressingSupporters: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.8, color: 'rgba(255,248,237,0.6)', marginTop: 4 },
  pressingFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pressingPrice: { fontFamily: edFonts.mono, fontSize: 13, color: ed.orange },
  pressingBackPill: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressingBackText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.onOrange },

  /* Passes */
  ticket: {
    flexDirection: 'row',
    backgroundColor: ed.paper2,
    padding: 16,
    gap: 14,
  },
  ticketTitle: { fontFamily: edFonts.serif, fontSize: 21, lineHeight: 24, color: ed.ink },
  ticketVenue: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.4, lineHeight: 15, color: 'rgba(34,23,15,0.62)' },
  ticketDate: { fontFamily: edFonts.serif, fontSize: 34, color: ed.ink, marginTop: 2 },
  ticketPassPill: {
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: '#171310',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ticketPassText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: ed.paper },
  ticketBarcode: { width: 44, justifyContent: 'center' },
  passesEmpty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.22)',
    padding: 18,
    gap: 8,
  },
  passesEmptyTitle: { fontFamily: edFonts.serif, fontSize: 20, color: ed.cream },
  passesEmptyBody: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.62)' },
  passesEmptyCta: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.3)',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  passesEmptyCtaText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.cream },

  /* Racks */
  rackCount: { fontFamily: edFonts.mono, fontSize: 11, letterSpacing: 1.4, color: 'rgba(255,248,237,0.5)' },
  loadMore: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.28)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.cream },

  /* For creators */
  creatorBody: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: 'rgba(255,248,237,0.68)' },
  creatorCta: {
    alignSelf: 'flex-start',
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  creatorCtaText: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: ed.onOrange },
});
