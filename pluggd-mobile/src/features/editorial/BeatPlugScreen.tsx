/**
 * BeatPlug — current mobile-web Beat Bench translation: numbered discovery
 * tabs, featured audition, search/filter floor, large BeatPlug picks, compact
 * crate rows, buyer guarantees, the cream audition bench, licensing, producer
 * and Soundboard discovery, and the existing creator close.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { edFonts } from '../../design/editorial';
import { Enter, EdPressable } from './EditorialBits';
import { DiscoveryReturnBar } from '../discovery/DiscoveryReturnBar';
import { usePlayback } from '../../context/PlaybackProvider';
import { safeList, toggleSavedContent } from '../culture/mobileServices';
import { showQuickActions } from '../../lib/quickActions';
import { supabase } from '../../lib/supabase';
import { formatCompact, formatGBP, toTrack, type BeatItem, type SoundboardItem } from '../../lib/mobileContent';
import { loadPublicCreatorIdentityMap } from '../culture/publicCreatorIdentity';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { PlaybackSeekBar } from '../../components/PlaybackSeekBar';

const DISCOVERY_TABS = ['Featured Beat', 'Hot Leases', 'Crates', 'Licenses'] as const;
const SORT_OPTIONS = ['Trending', 'Newest', 'Most played', 'Price low', 'Price high', 'A-Z'] as const;

const BENEFITS = [
  { icon: 'volunteer-activism', title: 'Direct support', copy: 'Straight to the producer.' },
  { icon: 'assignment-turned-in', title: 'Clear terms', copy: 'Licensing stays readable.' },
  { icon: 'bolt', title: 'Instant files', copy: 'Checkout then download.' },
  { icon: 'graphic-eq', title: 'Studio quality', copy: 'WAV, MP3, and stems.' },
] as const;

const LICENSE_CARDS = [
  { title: 'Lease', subtitle: 'MP3', copy: 'For drafts, mixtapes, social posts, and non-exclusive use.', price: 'from entry price' },
  { title: 'Premium WAV', subtitle: 'High quality', copy: 'WAV delivery for polished releases and professional sessions.', price: 'higher tier' },
  { title: 'WAV + Stems', subtitle: 'Full control', copy: 'Stems for editing, arrangement, and larger release plans.', price: 'pro tier' },
  { title: 'Exclusive', subtitle: 'One buyer', copy: 'Take the beat off the market with a direct rights deal.', price: 'custom' },
] as const;

function beatPrice(beat: BeatItem) {
  const value = Number(beat.price ?? 0);
  return value > 0 ? formatGBP(value) : 'Free';
}

function hasConfiguredLicenceValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => item !== null && item !== undefined && String(item).trim().length > 0);
  }
  return Boolean(value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0);
}

function beatHasLicenceOptions(beat: BeatItem) {
  return hasConfiguredLicenceValue(beat.available_licenses)
    || hasConfiguredLicenceValue(beat.license_prices)
    || Number(beat.price ?? 0) > 0;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function beatProducer(beat: BeatItem) {
  return beat.producer_name?.trim() || null;
}

function boardCreator(board: SoundboardItem) {
  if (board.creator_username) return `@${board.creator_username.replace(/^@/, '')}`;
  return board.creator_display_name?.trim() || null;
}

export function BeatPlugScreen() {
  const theme = usePluggdTheme();
  const styles = useBeatPlugStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const playback = usePlayback();
  const bottomInset = useBottomChromeInset();
  const scrollRef = useRef<ScrollView>(null);
  const picksY = useRef(0);
  const browseY = useRef(0);
  const licensesY = useRef(0);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>('Trending');
  const [gridLimit, setGridLimit] = useState(8);
  const pickCardWidth = Math.min(344, Math.max(274, width - 72));
  const producerCardWidth = Math.min(284, Math.max(232, width - 126));

  const beatsQuery = useQuery({
    queryKey: ['beatplug', 'beats'],
    queryFn: async () => {
      const rows = await safeList<BeatItem>(
        (supabase as any)
          .from('beats')
          .select('id,user_id,owner_id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(40),
      );
      const identityMap = await loadPublicCreatorIdentityMap(rows.map((beat) => beat.user_id || beat.owner_id));
      return rows.map((beat) => {
        if (beat.producer_name?.trim()) return beat;
        const identity = identityMap.get(beat.user_id || beat.owner_id || '');
        return {
          ...beat,
          producer_name: identity?.username ? `@${identity.username}` : identity?.full_name || null,
        };
      });
    },
    staleTime: 1000 * 60 * 2,
  });
  const boardsQuery = useQuery({
    queryKey: ['beatplug', 'boards'],
    queryFn: async () => {
      const rows = await safeList<SoundboardItem>(
        (supabase as any)
          .from('soundboards')
          .select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
          .eq('is_published', true)
          .in('visibility', ['public', 'link'])
          .order('last_activity_at', { ascending: false })
          .limit(4),
      );
      const identityMap = await loadPublicCreatorIdentityMap(rows.map((board) => board.creator_id));
      return rows.map((board) => {
        const identity = board.creator_id ? identityMap.get(board.creator_id) : null;
        return {
          ...board,
          creator_display_name: identity?.full_name || null,
          creator_username: identity?.username || null,
        };
      });
    },
    staleTime: 1000 * 60 * 3,
  });

  const beats = useMemo(() => beatsQuery.data ?? [], [beatsQuery.data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = beats.filter((beat) => {
      if (!query) return true;
      return (
        (beat.title || '').toLowerCase().includes(query) ||
        (beat.producer_name || '').toLowerCase().includes(query) ||
        (beat.genre || '').toLowerCase().includes(query) ||
        (beat.moods || []).some((mood) => mood.toLowerCase().includes(query))
      );
    });
    switch (sort) {
      case 'Newest':
        return [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'Price low':
        return [...list].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
      case 'Price high':
        return [...list].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
      case 'A-Z':
        return [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      default:
        return list;
    }
  }, [beats, search, sort]);

  const hero = useMemo(() => {
    const pool = filtered.length ? filtered : beats;
    if (tab === 1) return pool[1] || pool[0];
    if (tab === 2) return pool.find((beat) => beat.producer_name) || pool[0];
    return pool.find((beat) => beat.tagged_url || beat.audio_url) || pool[0];
  }, [beats, filtered, tab]);

  const producers = useMemo(() => {
    const byName = new Map<string, { name: string; count: number; plays: number; imageUrl?: string | null }>();
    beats.forEach((beat) => {
      const name = beatProducer(beat);
      if (!name) return;
      const existing = byName.get(name);
      byName.set(name, {
        name,
        count: (existing?.count || 0) + 1,
        plays: existing?.plays || 0,
        imageUrl: existing?.imageUrl || beat.image_url,
      });
    });
    return Array.from(byName.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [beats]);

  const freshCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return beats.filter((beat) => {
      const created = new Date(beat.created_at || 0).getTime();
      return Number.isFinite(created) && created >= cutoff;
    }).length;
  }, [beats]);
  const producerCount = useMemo(() => new Set(beats.map((beat) => beatProducer(beat)).filter(Boolean)).size, [beats]);
  const benchBeat = useMemo(
    () => beats.find((beat) => toTrack(beat, 'beat')?.id === playback.currentTrack?.id) || hero || beats[0] || null,
    [beats, hero, playback.currentTrack?.id],
  );
  const benchTrack = benchBeat ? toTrack(benchBeat, 'beat') : null;
  const benchIsCurrent = Boolean(benchTrack && playback.currentTrack?.id === benchTrack.id);
  const benchPlaying = benchIsCurrent && playback.isPlaying;
  const benchDuration = benchIsCurrent ? playback.progress.duration : 0;
  const benchPosition = benchIsCurrent ? playback.progress.position : 0;
  const benchProgress = benchDuration > 0 ? Math.min(1, Math.max(0, benchPosition / benchDuration)) : 0;
  const benchWave = useMemo(
    () => Array.from({ length: 42 }, (_, index) => 7 + Math.abs(((index * 19 + (benchBeat?.id.length || 7)) % 26) - 13)),
    [benchBeat?.id],
  );

  const refreshing = beatsQuery.isRefetching || boardsQuery.isRefetching;
  const refresh = () => {
    void beatsQuery.refetch();
    void boardsQuery.refetch();
  };

  const playBeat = (beat: BeatItem) => {
    const track = toTrack(beat, 'beat');
    if (track) {
      const queue = beats.map((item) => toTrack(item, 'beat')).filter((item): item is NonNullable<typeof item> => Boolean(item));
      const startIndex = queue.findIndex((item) => item.id === track.id);
      if (startIndex >= 0) {
        void playback.playQueue(queue, startIndex);
      } else {
        void playback.playTrack(track);
      }
      return;
    }
    router.push(`/beat/${beat.id}` as any);
  };

  const jumpTo = (index: number) => {
    setTab(index);
    const y = index === 1 ? picksY.current : index === 2 ? browseY.current : index === 3 ? licensesY.current : 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 88), animated: true });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} translucent />
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentFill} />}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 76, 96),
          paddingBottom: bottomInset,
          paddingHorizontal: 20,
          gap: 28,
        }}
      >
        <DiscoveryReturnBar tone={theme.scheme === 'light' ? 'paper' : 'dark'} style={styles.returnBar} />
        {/* Discovery tabs + hero */}
        <Enter delay={0}>
        <View style={styles.heroZone}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
            {DISCOVERY_TABS.map((label, index) => (
              <EdPressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => jumpTo(index)}>
                <View style={[styles.tab, index === tab && styles.tabActive]}>
                  <Text style={[styles.tabIndex, index === tab && { color: theme.colors.onAccent }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.tabText, index === tab && { color: theme.colors.onAccent }]}>{label.toUpperCase()}</Text>
                </View>
              </EdPressable>
            ))}
          </ScrollView>
          <View style={styles.heroKickerRow}>
            <View style={styles.heroDot} />
            <Text style={styles.heroKicker}>BeatPlug</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>Find your next beat.</Text>
          <Text style={styles.heroLede}>
            A focused audition floor for producer-owned beats, clear licensing and instant creative decisions.
          </Text>

          {beatsQuery.isLoading ? (
            <PremiumSkeleton compact label="Loading the audition floor..." />
          ) : null}

          {/* The functional Listening Bench is the featured audition. */}
          {benchBeat ? (
            <LinearGradient colors={['#f8efdc', '#efe5d1']} style={styles.bench}>
              <View style={styles.benchStrip}>
                <View style={styles.benchStripLabel}><View style={styles.benchDot} /><Text style={styles.benchMono}>LISTENING BENCH</Text></View>
                <Text style={[styles.benchMono, benchPlaying && styles.benchLive]}>{benchIsCurrent ? 'NOW AUDITIONING' : 'FEATURED BEAT'}</Text>
              </View>
              <View style={styles.benchStage}>
                <View style={styles.benchVinyl}>
                  <View style={styles.benchVinylRingA} />
                  <View style={styles.benchVinylRingB} />
                  <View style={styles.benchVinylLabel} />
                  <View style={styles.benchVinylHole} />
                </View>
                <View style={styles.benchSleeve}>
                  {benchBeat.image_url ? <PluggdImage uri={benchBeat.image_url} style={styles.benchSleeveArt} /> : <LinearGradient colors={['#a64c20', '#5c2917', '#15100c']} style={styles.benchSleeveArt} />}
                </View>
              </View>
              <Text style={styles.benchTitle}>{benchBeat.title || 'Untitled beat'}</Text>
              <Text style={styles.benchProducer}>{beatProducer(benchBeat) || 'Independent producer'}</Text>
              <View style={styles.benchMeta}>
                <View style={styles.benchMetaCell}><Text style={styles.benchMetaLabel}>BPM</Text><Text style={styles.benchMetaValue}>{benchBeat.bpm || '—'}</Text></View>
                <View style={styles.benchMetaCell}><Text style={styles.benchMetaLabel}>KEY</Text><Text style={styles.benchMetaValue}>{benchBeat.key || '—'}</Text></View>
                <View style={[styles.benchMetaCell, styles.benchMetaLast]}><Text style={styles.benchMetaLabel}>GENRE</Text><Text style={styles.benchMetaValue} numberOfLines={1}>{benchBeat.genre || 'Open'}</Text></View>
              </View>
              <PlaybackSeekBar
                ratio={benchProgress}
                duration={benchDuration}
                position={benchPosition}
                onSeek={(ratio) => void playback.seekTo(ratio * benchDuration)}
                accessibilityLabel={`Seek ${benchBeat.title || 'featured beat'}`}
                style={styles.benchSeek}
                showDefaultTrack={false}
                thumbStyle={styles.benchSeekThumb}
              >
                {(displayRatio) => (
                  <View style={styles.benchWave}>
                    {benchWave.map((height, index) => <View key={`${benchBeat.id}-wave-${index}`} style={[styles.benchWaveBar, { height }, index / benchWave.length <= displayRatio && styles.benchWavePlayed]} />)}
                  </View>
                )}
              </PlaybackSeekBar>
              <View style={styles.benchTimes}><Text style={styles.benchTime}>{formatTime(benchPosition)}</Text><Text style={styles.benchTime}>{benchDuration > 0 ? formatTime(benchDuration) : '--:--'}</Text></View>
              <View style={styles.benchTransport}>
                <EdPressable accessibilityRole="button" accessibilityLabel="Previous beat" onPress={() => void playback.skipToPrevious()}><View style={styles.benchSkip}><MaterialIcons name="skip-previous" size={20} color="#5f584d" /></View></EdPressable>
                <EdPressable accessibilityRole="button" accessibilityLabel={benchPlaying ? 'Pause beat on the bench' : 'Play beat on the bench'} onPress={() => {
                  if (benchPlaying) void playback.pause();
                  else if (benchIsCurrent) void playback.play();
                  else playBeat(benchBeat);
                }}><View style={styles.benchPlay}><MaterialIcons name={benchPlaying ? 'pause' : 'play-arrow'} size={24} color="#efe5d1" /></View></EdPressable>
                <EdPressable accessibilityRole="button" accessibilityLabel="Next beat" onPress={() => void playback.skipToNext()}><View style={styles.benchSkip}><MaterialIcons name="skip-next" size={20} color="#5f584d" /></View></EdPressable>
                <Text style={styles.benchReady}>{benchPlaying ? 'LIVE SIGNAL' : 'READY TO AUDITION'}</Text>
              </View>
              <View style={styles.benchLicence}>
                <View style={styles.benchPriceRow}><Text style={styles.benchMono}>LICENCES FROM</Text><Text style={styles.benchPrice}>{beatPrice(benchBeat)}</Text></View>
                <View style={styles.benchTiers}>{['Lease', 'WAV', 'Stems', 'Exclusive'].map((tier) => <Text key={tier} style={styles.benchTier}>{tier.toUpperCase()}</Text>)}</View>
                <EdPressable accessibilityRole="button" accessibilityLabel="View licenses and buy" onPress={() => router.push(`/beat/${benchBeat.id}` as any)}><View style={styles.benchBuy}><Text style={styles.benchBuyText}>{beatHasLicenceOptions(benchBeat) ? 'View licences & buy' : 'View beat details'}</Text></View></EdPressable>
              </View>
              {(benchBeat.tags || []).length ? <View style={styles.benchTags}>{(benchBeat.tags || []).slice(0, 5).map((tag) => <Text key={tag} style={styles.benchTag}>{tag}</Text>)}</View> : null}
              <View style={styles.benchUpNext}>
                <Text style={styles.benchUpNextHead}>ON THE BENCH NEXT</Text>
                {beats.filter((beat) => beat.id !== benchBeat.id).slice(0, 3).map((beat) => (
                  <EdPressable key={beat.id} accessibilityRole="button" accessibilityLabel={`Audition ${beat.title || 'beat'} next`} onPress={() => playBeat(beat)}><View style={styles.benchNextRow}>
                    {beat.image_url ? <PluggdImage uri={beat.image_url} style={styles.benchNextArt} /> : <View style={[styles.benchNextArt, styles.benchNextFallback]} />}
                    <View style={styles.benchNextCopy}><Text style={styles.benchNextTitle} numberOfLines={1}>{beat.title || 'Untitled beat'}</Text><Text style={styles.benchNextProducer} numberOfLines={1}>{beatProducer(beat) || 'Independent producer'}</Text></View>
                    <Text style={styles.benchNextPrice}>{beatPrice(beat)}</Text>
                  </View></EdPressable>
                ))}
              </View>
            </LinearGradient>
          ) : null}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{beats.length}</Text><Text style={styles.heroStatLabel}>beats on the wall</Text></View>
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{freshCount}</Text><Text style={styles.heroStatLabel}>fresh this week</Text></View>
            <View style={[styles.heroStat, styles.heroStatLast]}><Text style={styles.heroStatValue}>{producerCount}</Text><Text style={styles.heroStatLabel}>active producers</Text></View>
          </View>
        </View>
        </Enter>

        {/* Search + sort */}
        <View style={styles.discoveryPanel}>
          <Text style={styles.sectionEyebrow}>FIND YOUR NEXT BEAT</Text>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search beats, producers, moods, genres..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            {SORT_OPTIONS.map((option) => (
              <EdPressable key={option} accessibilityRole="button" accessibilityLabel={`Sort ${option}`} onPress={() => setSort(option)}>
                <View style={[styles.sortChip, sort === option && styles.sortChipActive]}>
                  <Text style={[styles.sortChipText, sort === option && { color: theme.colors.onAccent }]}>{option}</Text>
                </View>
              </EdPressable>
            ))}
          </ScrollView>
          <View style={styles.signalStrip}>
            <MaterialIcons name="verified" size={17} color="#ff7417" />
            <Text style={styles.signalStripText}>Producer-owned beats · clear licence routes · instant auditions</Text>
          </View>
        </View>

        {/* BeatPlug picks now */}
        <View style={{ gap: 12 }} onLayout={(event) => { picksY.current = event.nativeEvent.layout.y; }}>
          <View style={styles.sectionHeadRow}>
            <View>
              <Text style={styles.sectionEyebrow}>TRENDING</Text>
              <Text style={styles.sectionTitle}>BeatPlug picks now</Text>
            </View>
            <EdPressable accessibilityRole="button" accessibilityLabel="Browse all beats" onPress={() => jumpTo(2)}>
              <Text style={styles.sectionLink}>Browse all</Text>
            </EdPressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={pickCardWidth + 12} decelerationRate="fast" contentContainerStyle={styles.horizontalRail}>
            {filtered.slice(0, 4).map((beat) => {
              const track = toTrack(beat, 'beat');
              const playing = Boolean(track && playback.currentTrack?.id === track.id && playback.isPlaying);
              return (
                <View key={beat.id} style={[styles.pickCard, { width: pickCardWidth }]}>
                <EdPressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${beat.title || 'beat'}`}
                  onPress={() => router.push(`/beat/${beat.id}` as any)}
                  style={styles.pickMain}
                >
                  <View style={styles.pickArtWrap}>
                    {beat.image_url ? (
                      <PluggdImage uri={beat.image_url} style={styles.pickArt} />
                    ) : (
                      <View style={[styles.pickArt, { backgroundColor: theme.colors.artworkBase }]} />
                    )}
                  </View>
                  <View style={styles.pickCopy}>
                    <Text style={styles.pickIndex}>FEATURED PICK</Text>
                    <Text style={styles.pickTitle} numberOfLines={1}>{beat.title || 'Untitled beat'}</Text>
                    <Text style={styles.pickMeta} numberOfLines={1}>
                      {[beatProducer(beat), beat.bpm ? `${beat.bpm} BPM` : null, beat.key].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={styles.pickPrice}>{beatPrice(beat)}</Text>
                  </View>
                </EdPressable>
                <EdPressable
                  accessibilityRole="button"
                  accessibilityLabel={playing ? `Pause ${beat.title || 'beat'}` : `Play ${beat.title || 'beat'}`}
                  onPress={() => {
                    if (playing) {
                      void playback.pause();
                      return;
                    }
                    playBeat(beat);
                  }}
                >
                  <View style={styles.pickPlay}>
                    <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={20} color={theme.colors.onAccent} />
                  </View>
                </EdPressable>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Browse BeatPlug */}
        <View style={{ gap: 12 }} onLayout={(event) => { browseY.current = event.nativeEvent.layout.y; }}>
          <Text style={styles.sectionEyebrow}>BROWSE BEATPLUG</Text>
          <View style={styles.browseHeadRow}>
            <Text style={styles.sectionTitle}>Browse BeatPlug</Text>
            <Text style={styles.beatCount}>{filtered.length} beats available</Text>
          </View>
          <View style={styles.browseControls}>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel="Play all beats"
              onPress={() => {
                const queue = filtered.map((beat) => toTrack(beat, 'beat')).filter((item): item is NonNullable<typeof item> => Boolean(item));
                if (queue.length) void playback.playQueue(queue, 0);
              }}
              style={styles.browseControlWrap}
            >
              <View style={styles.browseControlPrimary}><MaterialIcons name="play-arrow" size={18} color={theme.colors.accentText} /><Text style={styles.browseControlPrimaryText}>Play all</Text></View>
            </EdPressable>
            <View style={styles.browseSortBadge}><MaterialIcons name="sort" size={16} color={theme.colors.textMuted} /><Text style={styles.browseSortText}>{sort}</Text></View>
          </View>
          {filtered.length ? (
            <View style={styles.beatList}>
              {filtered.slice(0, gridLimit).map((beat, index) => {
                const track = toTrack(beat, 'beat');
                const playing = Boolean(track && playback.currentTrack?.id === track.id && playback.isPlaying);
                return (
                <View key={beat.id} style={styles.beatRow}>
                  <Text style={styles.beatIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={styles.beatMainWrap}>
                    <EdPressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${beat.title || 'beat'}`}
                      onPress={() => router.push(`/beat/${beat.id}` as any)}
                      onLongPress={() =>
                        showQuickActions(beat.title || 'Beat', [
                          { label: 'Play audition', onPress: () => playBeat(beat) },
                          {
                            label: 'Save beat',
                            onPress: () => {
                              void toggleSavedContent('beat', beat.id).then((result) => {
                                if (!result.success) Alert.alert('Save unavailable', result.error || 'Please try again.');
                              });
                            },
                          },
                          { label: 'Share', onPress: () => void Share.share({ message: `PLUGGD beat: ${beat.title || 'Untitled'}${beatProducer(beat) ? ` by ${beatProducer(beat)}` : ''}` }) },
                          { label: 'View licenses', onPress: () => router.push(`/beat/${beat.id}` as any) },
                        ])
                      }
                    >
                      <View style={styles.beatMain}>
                        <View style={styles.beatArtWrap}>
                          {beat.image_url ? (
                            <PluggdImage uri={beat.image_url} style={styles.beatArt} />
                          ) : (
                            <View style={[styles.beatArt, { backgroundColor: theme.colors.artworkBase }]} />
                          )}
                        </View>
                        <View style={styles.beatCopy}>
                          <Text style={styles.beatTitle} numberOfLines={1}>{beat.title || 'Untitled beat'}</Text>
                          <Text style={styles.beatMeta} numberOfLines={1}>{beatProducer(beat) || 'Independent producer'}</Text>
                          <Text style={styles.beatDetail} numberOfLines={1}>{[beat.bpm ? `${beat.bpm} BPM` : 'Open tempo', beat.key || 'Open key', beat.genre || 'Open genre'].join(' · ')}</Text>
                        </View>
                      </View>
                    </EdPressable>
                  </View>
                  <View style={styles.beatEnd}>
                    <Text style={styles.beatPriceText}>{beatPrice(beat)}</Text>
                    <EdPressable
                      accessibilityRole="button"
                      accessibilityLabel={playing ? `Pause ${beat.title || 'beat'}` : `Play ${beat.title || 'beat'}`}
                      onPress={() => {
                        if (playing) void playback.pause();
                        else playBeat(beat);
                      }}
                    >
                      <View style={styles.beatPlay}><MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={18} color="#1c0d02" /></View>
                    </EdPressable>
                  </View>
                </View>
              );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No beats match your filters.</Text>
          )}
          {filtered.length > gridLimit ? (
            <EdPressable accessibilityRole="button" accessibilityLabel="Load more beats" onPress={() => setGridLimit((limit) => limit + 8)}>
              <View style={styles.loadMore}>
                <Text style={styles.loadMoreText}>Load more beats</Text>
              </View>
            </EdPressable>
          ) : null}
        </View>

        {/* Mobile buyer guarantees follow the crate, matching current web order. */}
        <View style={styles.benefitGrid}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefitCard}>
              <View style={styles.benefitIcon}><MaterialIcons name={benefit.icon as any} size={19} color="#ff7417" /></View>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitCopy}>{benefit.copy}</Text>
            </View>
          ))}
        </View>

        {/* License cards */}
        <View style={{ gap: 12 }} onLayout={(event) => { licensesY.current = event.nativeEvent.layout.y; }}>
          <Text style={styles.sectionTitle}>Choose the Right BeatPlug License</Text>
          <View style={styles.licenseGrid}>
            {LICENSE_CARDS.map((license) => (
              <View key={license.title} style={styles.licenseCard}>
                <Text style={styles.licenseTitle}>{license.title}</Text>
                <Text style={styles.licenseSubtitle}>{license.subtitle.toUpperCase()}</Text>
                <Text style={styles.licenseCopy}>{license.copy}</Text>
                <Text style={styles.licensePrice}>{license.price}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top producers */}
        {producers.length ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Top Producers on BeatPlug</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={producerCardWidth + 12} decelerationRate="fast" contentContainerStyle={styles.horizontalRail}>
              {producers.map((producer) => (
                <EdPressable
                  key={producer.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Search beats by ${producer.name}`}
                  onPress={() => setSearch(producer.name)}
                >
                  <View style={[styles.producerRow, { width: producerCardWidth }]}>
                  <View style={styles.producerAvatar}>
                    {producer.imageUrl ? (
                      <PluggdImage uri={producer.imageUrl} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={styles.producerInitials}>{producer.name.slice(0, 2).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.producerName} numberOfLines={1}>{producer.name}</Text>
                    <Text style={styles.producerMeta}>{producer.count} beat{producer.count === 1 ? '' : 's'}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
                  </View>
                </EdPressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* From Soundboards */}
        {(boardsQuery.data ?? []).length ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>From Soundboards</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={202} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
              {(boardsQuery.data ?? []).map((board) => (
                <EdPressable
                  key={board.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${board.title || 'soundboard'}`}
                  onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)}
                >
                  <View style={styles.boardCard}>
                    {board.cover_image_url ? (
                      <PluggdImage uri={board.cover_image_url} style={styles.boardArt} />
                    ) : (
                      <View style={[styles.boardArt, { backgroundColor: theme.colors.artworkBase }]} />
                    )}
                    <Text style={styles.boardTitle} numberOfLines={1}>{board.title || 'Untitled board'}</Text>
                    <Text style={styles.boardMeta}>{[boardCreator(board), `${formatCompact(board.item_count)} sounds`, `${formatCompact(board.like_count)} likes`].filter(Boolean).join(' · ')}</Text>
                  </View>
                </EdPressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* For creators / hitmakers */}
        <View style={styles.creatorPanel}>
          <Text style={styles.creatorEyebrow}>FOR CREATORS. FOR HITMAKERS.</Text>
          <Text style={styles.creatorTitle}>Keep the beat pipeline moving.</Text>
          <Text style={styles.creatorBody}>
            Whether you're buying your next hit or selling to the world, PLUGGD keeps the flow clear.
          </Text>
          <View style={styles.creatorCards}>
            <View style={styles.creatorCard}>
              <Text style={styles.creatorCardTitle}>I'm a Buyer</Text>
              <Text style={styles.creatorCardBody}>Open a beat above to review licenses, save it, or start playback.</Text>
            </View>
            <View style={styles.creatorCard}>
              <Text style={styles.creatorCardTitle}>I'm a Producer</Text>
              <Text style={styles.creatorCardBody}>Upload your beats, grow your audience, and get paid.</Text>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel="Start selling"
                onPress={() => router.push('/creator/onboarding' as any)}
              >
                <View style={styles.startSelling}>
                  <Text style={styles.startSellingText}>Start Selling</Text>
                </View>
              </EdPressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function useBeatPlugStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  returnBar: { paddingHorizontal: 0, marginBottom: -14 },
  horizontalRail: { gap: 12, paddingRight: 20 },
  heroZone: { position: 'relative', gap: 14, marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26, overflow: 'hidden' },

  tabsRow: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  tabActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  tabIndex: { fontFamily: edFonts.mono, fontSize: 9.5, color: theme.colors.accentText },
  tabText: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 1.1, color: theme.colors.text },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accentFill },
  heroKicker: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: theme.colors.accentText },
  heroTitle: { width: '100%', paddingTop: 2, fontFamily: edFonts.serif, fontSize: 38, lineHeight: 43, letterSpacing: -0.8, color: theme.colors.text },
  heroTitleAccent: { fontFamily: edFonts.serifItalic, color: theme.colors.accentText },
  heroLede: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary },

  heroStats: { minHeight: 62, flexDirection: 'row', marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider },
  heroStat: { flex: 1, minWidth: 0, paddingVertical: 9, paddingHorizontal: 8, justifyContent: 'center', borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.colors.divider },
  heroStatLast: { borderRightWidth: 0 },
  heroStatValue: { fontFamily: edFonts.serif, fontSize: 22, lineHeight: 23, color: theme.colors.text },
  heroStatLabel: { marginTop: 2, fontFamily: edFonts.mono, fontSize: 7.5, lineHeight: 10, letterSpacing: 0.45, color: theme.colors.textMuted },

  discoveryPanel: { gap: 12, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 26, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, backgroundColor: 'rgba(255,246,232,0.035)' },
  searchBar: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: theme.colors.text, paddingVertical: 0 },
  sortChip: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  sortChipText: { fontFamily: edFonts.bodyBold, fontSize: 12, color: theme.colors.text },
  signalStrip: { minHeight: 42, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.divider, borderRadius: 8, backgroundColor: 'rgba(255,116,23,0.07)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  signalStripText: { flex: 1, fontFamily: edFonts.mono, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.8, color: theme.colors.textSecondary },

  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  benefitCard: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    minHeight: 142,
    padding: 14,
    gap: 4,
  },
  benefitIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,116,23,0.1)', marginBottom: 4 },
  benefitTitle: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: theme.colors.text, marginTop: 4 },
  benefitCopy: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: theme.colors.textSecondary },

  sectionEyebrow: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 2, color: theme.colors.accentText },
  sectionTitle: { fontFamily: edFonts.serif, fontSize: 26, lineHeight: 29, color: theme.colors.text },
  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  sectionLink: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.accentText, paddingBottom: 3 },
  browseHeadRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  beatCount: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1, color: theme.colors.textMuted },

  pickCard: {
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 11,
    gap: 10,
  },
  pickMain: { minWidth: 0, gap: 10 },
  pickArtWrap: { width: '100%', height: 212, borderRadius: 6, overflow: 'hidden' },
  pickArt: { width: '100%', height: '100%' },
  pickCopy: { gap: 3, paddingRight: 50 },
  pickIndex: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.5, color: theme.colors.accentText },
  pickTitle: { fontFamily: edFonts.serif, fontSize: 23, lineHeight: 25, color: theme.colors.text },
  pickMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: theme.colors.textSecondary },
  pickPrice: { fontFamily: edFonts.mono, fontSize: 11, color: theme.colors.accentText, marginTop: 2 },
  pickPlay: {
    position: 'absolute',
    right: 13,
    bottom: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  browseControls: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  browseControlWrap: { flexShrink: 0 },
  browseControlPrimary: { minWidth: 126, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  browseControlPrimaryText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: theme.colors.text },
  browseSortBadge: { flex: 1, minHeight: 44, borderRadius: 7, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  browseSortText: { fontFamily: edFonts.bodyBold, fontSize: 12, color: theme.colors.textSecondary },
  beatList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  beatRow: { width: '100%', alignSelf: 'stretch', minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, paddingVertical: 10 },
  beatIndex: { width: 20, fontFamily: edFonts.mono, fontSize: 9, color: theme.colors.textMuted },
  beatMainWrap: { flex: 1, minWidth: 0 },
  beatMain: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 9 },
  beatArtWrap: { width: 58, height: 58, borderRadius: 3, overflow: 'hidden' },
  beatArt: { width: '100%', height: '100%' },
  beatCopy: { flex: 1, minWidth: 0, gap: 2 },
  beatEnd: { width: 52, alignItems: 'flex-end', gap: 7 },
  beatPriceText: { fontFamily: edFonts.mono, fontSize: 9.5, color: theme.colors.accentText },
  beatTitle: { fontFamily: edFonts.serif, fontSize: 17, lineHeight: 18, color: theme.colors.text },
  beatMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: theme.colors.textSecondary },
  beatDetail: { fontFamily: edFonts.mono, fontSize: 7.5, letterSpacing: 0.35, color: theme.colors.textMuted },
  beatPlay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  emptyText: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: theme.colors.textSecondary },
  loadMore: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loadMoreText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: theme.colors.text },

  bench: { marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 28, overflow: 'hidden' },
  benchStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingBottom: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(17,16,13,0.18)' },
  benchStripLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  benchDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff7417' },
  benchMono: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.5, color: 'rgba(17,16,13,0.62)' },
  benchLive: { color: '#d85b0d' },
  benchStage: { position: 'relative', width: '100%', aspectRatio: 1.05, marginTop: 22, overflow: 'hidden' },
  benchVinyl: { position: 'absolute', width: '76%', aspectRatio: 1, borderRadius: 999, top: '6%', left: '24%', backgroundColor: '#0a0805', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  benchVinylRingA: { position: 'absolute', top: 12, right: 12, bottom: 12, left: 12, borderRadius: 999, borderWidth: 2, borderColor: '#1d1812' },
  benchVinylRingB: { position: 'absolute', top: 35, right: 35, bottom: 35, left: 35, borderRadius: 999, borderWidth: 2, borderColor: '#1d1812' },
  benchVinylLabel: { position: 'absolute', width: '30%', aspectRatio: 1, borderRadius: 999, left: '35%', top: '35%', backgroundColor: '#ff7417' },
  benchVinylHole: { position: 'absolute', width: 7, height: 7, borderRadius: 4, left: '49%', top: '49%', backgroundColor: '#efe5d1' },
  benchSleeve: { position: 'absolute', width: '80%', aspectRatio: 1, left: 0, top: '4%', overflow: 'hidden', backgroundColor: '#b4561f', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 26, shadowOffset: { width: 0, height: 14 } },
  benchSleeveArt: { width: '100%', height: '100%' },
  benchTitle: { marginTop: 2, fontFamily: edFonts.serif, fontSize: 34, lineHeight: 34, color: '#11100d' },
  benchProducer: { marginTop: 5, fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.1, color: 'rgba(17,16,13,0.62)' },
  benchMeta: { flexDirection: 'row', marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(17,16,13,0.18)' },
  benchMetaCell: { flex: 1, minWidth: 0, marginTop: 10, marginRight: 10, paddingRight: 8, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(17,16,13,0.12)' },
  benchMetaLast: { marginRight: 0, paddingRight: 0, borderRightWidth: 0 },
  benchMetaLabel: { fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 1.2, color: 'rgba(17,16,13,0.52)' },
  benchMetaValue: { marginTop: 3, fontFamily: edFonts.bodyMedium, fontSize: 12, color: '#11100d' },
  benchSeek: { height: 52, marginTop: 8 },
  benchWave: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 2 },
  benchWaveBar: { flex: 1, minWidth: 2, backgroundColor: 'rgba(17,16,13,0.18)' },
  benchWavePlayed: { backgroundColor: '#ff7417' },
  benchSeekThumb: { width: 15, height: 15, marginLeft: -7.5, marginTop: -7.5, borderRadius: 7.5, backgroundColor: '#f8efdc', borderColor: '#c14a0a' },
  benchTimes: { flexDirection: 'row', justifyContent: 'space-between' },
  benchTime: { fontFamily: edFonts.mono, fontSize: 8.5, color: 'rgba(17,16,13,0.44)' },
  benchTransport: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 13 },
  benchSkip: { width: 38, height: 38, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,16,13,0.2)', alignItems: 'center', justifyContent: 'center' },
  benchPlay: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11100d' },
  benchReady: { marginLeft: 'auto', fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 1.1, color: 'rgba(17,16,13,0.56)' },
  benchLicence: { marginTop: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,16,13,0.18)', backgroundColor: 'rgba(17,16,13,0.055)', padding: 14 },
  benchPriceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  benchPrice: { fontFamily: edFonts.serif, fontSize: 25, color: '#11100d' },
  benchTiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 11 },
  benchTier: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,16,13,0.18)', paddingHorizontal: 7, paddingVertical: 5, fontFamily: edFonts.mono, fontSize: 7.5, letterSpacing: 0.8, color: 'rgba(17,16,13,0.62)' },
  benchBuy: { minHeight: 48, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff7417' },
  benchBuyText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: '#1c0d02' },
  benchTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  benchTag: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(17,16,13,0.18)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, fontFamily: edFonts.mono, fontSize: 7.5, color: 'rgba(17,16,13,0.62)' },
  benchUpNext: { marginTop: 19, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(17,16,13,0.18)', paddingTop: 12 },
  benchUpNextHead: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.3, color: 'rgba(17,16,13,0.62)', marginBottom: 3 },
  benchNextRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(17,16,13,0.1)', paddingVertical: 8 },
  benchNextArt: { width: 36, height: 36 },
  benchNextFallback: { backgroundColor: '#b4561f' },
  benchNextCopy: { flex: 1, minWidth: 0 },
  benchNextTitle: { fontFamily: edFonts.serif, fontSize: 15, color: '#11100d' },
  benchNextProducer: { marginTop: 2, fontFamily: edFonts.mono, fontSize: 7.5, color: 'rgba(17,16,13,0.48)' },
  benchNextPrice: { fontFamily: edFonts.mono, fontSize: 8.5, color: 'rgba(17,16,13,0.62)' },

  licenseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  licenseCard: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    gap: 5,
  },
  licenseTitle: { fontFamily: edFonts.serif, fontSize: 19, color: theme.colors.text },
  licenseSubtitle: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: theme.colors.accentText },
  licenseCopy: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: theme.colors.textSecondary },
  licensePrice: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 0.8, color: theme.colors.textSecondary, marginTop: 3 },

  producerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 12,
  },
  producerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: theme.colors.artworkBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  producerInitials: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.mediaText },
  producerName: { fontFamily: edFonts.bodyBold, fontSize: 15, color: theme.colors.text },
  producerMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: theme.colors.textSecondary },

  boardCard: { width: 190, gap: 5 },
  boardArt: { width: '100%', height: 120, borderRadius: 4 },
  boardTitle: { fontFamily: edFonts.serif, fontSize: 16, color: theme.colors.text, marginTop: 4 },
  boardMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: theme.colors.textSecondary },

  creatorPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 8,
  },
  creatorEyebrow: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.8, color: theme.colors.accentText },
  creatorTitle: { fontFamily: edFonts.serif, fontSize: 25, lineHeight: 28, color: theme.colors.text },
  creatorBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary },
  creatorCards: { gap: 10, marginTop: 8 },
  creatorCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
    padding: 14,
    gap: 5,
  },
  creatorCardTitle: { fontFamily: edFonts.bodyBlack, fontSize: 15.5, color: theme.colors.text },
  creatorCardBody: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  startSelling: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  startSellingText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.onAccent },
  }), [theme]);
}
