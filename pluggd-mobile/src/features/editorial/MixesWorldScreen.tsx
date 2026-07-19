/**
 * Mixes — direct mobile port of the web /mixes editorial world:
 * numbered pill tabs (01 Mix of week / 02 DJ spotlight / 03 Scene report),
 * poster hero with serif headline + "Play featured mix", the cream
 * "Find your next mix" filter sheet, then the yellow-eyebrow editorial
 * run — What's happening, Listening rooms, Rising DJs, New & notable
 * mixes, Scene explorer, PLUGGD radio, Upcoming events and the cream
 * Editorial highlights.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
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
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { ed, edFonts } from '../../design/editorial';
import { Enter, EdPressable, TornEdge } from './EditorialBits';
import { usePlayback } from '../../context/PlaybackProvider';
import { safeList } from '../culture/mobileServices';
import { showQuickActions } from '../../lib/quickActions';
import { supabase } from '../../lib/supabase';
import { formatCompact, formatDuration, toTrack, type MixItem } from '../../lib/mobileContent';

/** The /mixes page carries a yellow data-label accent on the live site. */
const MIX_YELLOW = '#ffdf4d';

const HERO_TABS = ['Mix of week', 'DJ spotlight', 'Scene report'] as const;

type BlogRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  tags: string[] | null;
  created_at: string | null;
};

type PassEvent = {
  id: string;
  title: string | null;
  location: string | null;
  cover_image_url: string | null;
  starts_at: string | null;
};

function mixDuration(mix?: MixItem | null) {
  const total = Number(mix?.duration_seconds ?? 0);
  if (!total) return null;
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  return `${minutes}m`;
}

function selectorName(mix?: MixItem | null) {
  return mix?.city ? `${mix.city} selector` : 'PLUGGD selector';
}

/** Yellow tracked eyebrow + serif title — the /mixes section voice. */
function MixSectionHead({ eyebrow, title, subtitle, action, onAction }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.mixEyebrow}>{eyebrow.toUpperCase()}</Text>
      <Text style={styles.mixSectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.mixSectionSub}>{subtitle}</Text> : null}
      {action ? (
        <EdPressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction}>
          <View style={styles.mixActionPill}>
            <Text style={styles.mixActionText}>{action.toUpperCase()} →</Text>
          </View>
        </EdPressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function MixesHero({ mixes }: { mixes: MixItem[] }) {
  const router = useRouter();
  const playback = usePlayback();
  const [tab, setTab] = useState(0);

  const heroPool = useMemo(() => {
    if (!mixes.length) return [] as MixItem[];
    const byPlays = [...mixes].sort((a, b) => Number(b.play_count ?? 0) - Number(a.play_count ?? 0));
    const byRecency = [...mixes].sort(
      (a, b) => new Date(b.published_at || b.created_at || 0).getTime() - new Date(a.published_at || a.created_at || 0).getTime(),
    );
    const byLikes = [...mixes].sort((a, b) => Number(b.like_count ?? 0) - Number(a.like_count ?? 0));
    const picks: MixItem[] = [];
    [byPlays[0], byRecency.find((mix) => mix.id !== byPlays[0]?.id) || byRecency[0], byLikes.find((mix) => !picks.some((p) => p?.id === mix.id) && mix.id !== byPlays[0]?.id) || byLikes[0]]
      .forEach((mix) => { if (mix) picks.push(mix); });
    return picks;
  }, [mixes]);

  const hero = heroPool[Math.min(tab, Math.max(0, heroPool.length - 1))];
  if (!hero) return null;
  const track = toTrack(hero, 'mix');
  const playing = Boolean(track && playback.currentTrack?.id === track.id && playback.isPlaying);

  return (
    <View style={{ gap: 0 }}>
      <View style={styles.heroTabsRow}>
        {HERO_TABS.map((label, index) => (
          <EdPressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => setTab(index)}
          >
            <View style={[styles.heroTab, index === tab && styles.heroTabActive]}>
              <Text style={[styles.heroTabNumber, index === tab && { color: '#3a1c04' }]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Text style={[styles.heroTabText, index === tab && { color: '#3a1c04' }]}>{label.toUpperCase()}</Text>
            </View>
          </EdPressable>
        ))}
      </View>
      <View style={styles.heroPosterWrap}>
        {hero.cover_url ? (
          <PluggdImage uri={hero.cover_url} style={styles.heroPoster} />
        ) : (
          <View style={[styles.heroPoster, { backgroundColor: '#221329' }]} />
        )}
        <LinearGradient colors={['rgba(7,6,5,0.1)', 'rgba(7,6,5,0.92)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.heroPosterBody}>
          <Text style={styles.heroKicker}>
            {`${selectorName(hero)}${hero.city ? ` - ${hero.city}` : ''}`.toUpperCase()}
          </Text>
          <Text style={styles.heroTitle}>{hero.title || 'The sound of tomorrow'}</Text>
          {hero.description ? (
            <Text style={styles.heroDescription} numberOfLines={2}>{hero.description}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.heroCtas}>
        <EdPressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause featured mix' : 'Play featured mix'}
          onPress={() => {
            if (playing) {
              void playback.pause();
              return;
            }
            if (track) {
              void playback.playTrack(track);
              return;
            }
            router.push(`/mixes/${hero.id}` as any);
          }}
        >
          <View style={styles.heroPlay}>
            <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={20} color="#3a1c04" />
            <Text style={styles.heroPlayText}>{playing ? 'Pause featured mix' : 'Play featured mix'}</Text>
          </View>
        </EdPressable>
        <View style={styles.heroCtaRow}>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Enter Listening Room"
            onPress={() => router.push(`/mixes/${hero.id}` as any)}
            style={{ flex: 1 }}
          >
            <View style={styles.heroGhost}>
              <MaterialIcons name="album" size={16} color={ed.cream} />
              <Text style={styles.heroGhostText}>Enter Listening Room</Text>
            </View>
          </EdPressable>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Browse latest"
            onPress={() => router.push('/mixes' as any)}
            style={{ flex: 1 }}
          >
            <View style={styles.heroGhost}>
              <Text style={styles.heroGhostText}>Browse latest</Text>
            </View>
          </EdPressable>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Find your next mix (cream filter sheet)                             */
/* ------------------------------------------------------------------ */

type MixFilters = {
  search: string;
  genre: string | null;
  scene: string | null;
  mood: string | null;
  length: string | null;
};

const EMPTY_FILTERS: MixFilters = { search: '', genre: null, scene: null, mood: null, length: null };
const LENGTH_BUCKETS = ['Under 30m', '30m – 1h', 'Over 1h'] as const;

function lengthBucket(mix: MixItem) {
  const total = Number(mix.duration_seconds ?? 0);
  if (!total) return null;
  if (total < 1800) return 'Under 30m';
  if (total <= 3600) return '30m – 1h';
  return 'Over 1h';
}

function FilterCycleRow({ label, value, options, onChange }: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (next: string | null) => void;
}) {
  const cycle = () => {
    if (!options.length) return;
    if (value == null) {
      onChange(options[0]);
      return;
    }
    const index = options.indexOf(value);
    onChange(index === options.length - 1 ? null : options[index + 1]);
  };
  return (
    <EdPressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'any'}`} onPress={cycle}>
      <View style={styles.filterRow}>
        <Text style={[styles.filterRowText, value ? { color: ed.ink, fontFamily: edFonts.bodyBold } : null]}>
          {value || label}
        </Text>
        <MaterialIcons name="unfold-more" size={17} color="rgba(34,23,15,0.55)" />
      </View>
    </EdPressable>
  );
}

function FindYourNextMix({ mixes, filters, setFilters, matchCount }: {
  mixes: MixItem[];
  filters: MixFilters;
  setFilters: (next: MixFilters) => void;
  matchCount: number;
}) {
  const genres = useMemo(
    () => Array.from(new Set(mixes.flatMap((mix) => mix.genre_tags || []))).slice(0, 8),
    [mixes],
  );
  const scenes = useMemo(
    () => Array.from(new Set(mixes.map((mix) => mix.city).filter(Boolean) as string[])).slice(0, 8),
    [mixes],
  );
  const moods = useMemo(
    () => Array.from(new Set(mixes.flatMap((mix) => mix.mood_tags || []))).slice(0, 8),
    [mixes],
  );

  return (
    <View style={styles.finderSheet}>
      <Text style={styles.finderTitle}>Find your next mix</Text>
      <Text style={styles.finderSub}>Search by sound, scene, pace or energy, not just genre.</Text>
      <View style={styles.finderSearch}>
        <MaterialIcons name="search" size={18} color="rgba(34,23,15,0.5)" />
        <TextInput
          value={filters.search}
          onChangeText={(next) => setFilters({ ...filters, search: next })}
          placeholder="Search title, DJ or tracklist..."
          placeholderTextColor="rgba(34,23,15,0.45)"
          style={styles.finderSearchInput}
        />
      </View>
      <FilterCycleRow label="All genres" value={filters.genre} options={genres} onChange={(genre) => setFilters({ ...filters, genre })} />
      <FilterCycleRow label="All scenes" value={filters.scene} options={scenes} onChange={(scene) => setFilters({ ...filters, scene })} />
      <FilterCycleRow label="Any mood" value={filters.mood} options={moods} onChange={(mood) => setFilters({ ...filters, mood })} />
      <FilterCycleRow label="Any length" value={filters.length} options={[...LENGTH_BUCKETS]} onChange={(length) => setFilters({ ...filters, length })} />
      <EdPressable accessibilityRole="button" accessibilityLabel="Reset filters" onPress={() => setFilters(EMPTY_FILTERS)}>
        <View style={styles.finderReset}>
          <Text style={styles.finderResetText}>Reset</Text>
        </View>
      </EdPressable>
      <Text style={styles.finderMatch}>
        {matchCount} of {mixes.length} mixes match your sound.
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* What's happening                                                    */
/* ------------------------------------------------------------------ */

const HAPPENING_PILLS = ['Lead story', 'DJ spotlight', 'Scene report'] as const;

function WhatsHappening({ mixes }: { mixes: MixItem[] }) {
  const router = useRouter();
  const playback = usePlayback();
  const cards = mixes.slice(0, 3);
  if (!cards.length) return null;
  return (
    <View style={{ gap: 14 }}>
      {cards.map((mix, index) => {
        const track = toTrack(mix, 'mix');
        const playing = Boolean(track && playback.currentTrack?.id === track.id && playback.isPlaying);
        return (
          <View key={mix.id} style={styles.happeningCard}>
            {mix.cover_url ? (
              <PluggdImage uri={mix.cover_url} style={StyleSheet.absoluteFillObject as any} />
            ) : null}
            <LinearGradient colors={['rgba(7,6,5,0.42)', 'rgba(7,6,5,0.94)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.happeningBody}>
              <View style={styles.happeningPill}>
                <MaterialIcons name="auto-awesome" size={11} color={ed.cream} />
                <Text style={styles.happeningPillText}>{HAPPENING_PILLS[index].toUpperCase()}</Text>
              </View>
              <Text style={styles.happeningTitle} numberOfLines={2}>{mix.title || 'Untitled mix'}</Text>
              <Text style={styles.happeningMeta}>
                {[selectorName(mix), mix.city, mixDuration(mix)].filter(Boolean).join('  ')}
              </Text>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={playing ? `Pause ${mix.title || 'mix'}` : `Play ${mix.title || 'mix'}`}
                onPress={() => {
                  if (playing) {
                    void playback.pause();
                    return;
                  }
                  if (track) void playback.playTrack(track);
                }}
              >
                <View style={styles.happeningPlay}>
                  <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={18} color="#3a1c04" />
                  <Text style={styles.happeningPlayText}>{playing ? 'Pause' : 'Play'}</Text>
                </View>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Open listening room for ${mix.title || 'mix'}`}
                onPress={() => router.push(`/mixes/${mix.id}` as any)}
              >
                <View style={styles.happeningRoom}>
                  <MaterialIcons name="album" size={15} color={ed.cream} />
                  <Text style={styles.happeningRoomText}>Listening Room</Text>
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
/* Listening rooms                                                     */
/* ------------------------------------------------------------------ */

function ListeningRooms({ mixes }: { mixes: MixItem[] }) {
  const router = useRouter();
  const rooms = mixes.slice(0, 3);
  if (!rooms.length) return null;
  return (
    <View style={{ gap: 14 }}>
      {rooms.map((mix) => (
        <View key={mix.id} style={styles.roomCard}>
          {mix.cover_url ? (
            <PluggdImage uri={mix.cover_url} style={StyleSheet.absoluteFillObject as any} />
          ) : null}
          <LinearGradient colors={['rgba(7,6,5,0.4)', 'rgba(7,6,5,0.92)']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.roomBody}>
            <View style={styles.roomOpenPill}>
              <View style={styles.roomOpenDot} />
              <Text style={styles.roomOpenText}>ROOM OPEN</Text>
            </View>
            <Text style={styles.roomTitle} numberOfLines={2}>{mix.title || 'Untitled mix'}</Text>
            <Text style={styles.roomMeta}>
              {[selectorName(mix), `${formatCompact(mix.play_count)} plays`, mix.recording_type === 'live' ? 'Live Set' : 'Studio Mix'].join('  ')}
            </Text>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`Join room for ${mix.title || 'mix'}`}
              onPress={() => router.push(`/mixes/${mix.id}` as any)}
            >
              <View style={styles.roomJoin}>
                <Text style={styles.roomJoinText}>Join room</Text>
                <MaterialIcons name="arrow-forward" size={16} color={ed.cream} />
              </View>
            </EdPressable>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Rising DJs                                                          */
/* ------------------------------------------------------------------ */

type Selector = {
  id: string;
  name: string;
  mixCount: number;
  score: number;
  genres: string[];
  imageUrl?: string | null;
  firstMixId?: string | null;
};

function buildSelectors(mixes: MixItem[]): Selector[] {
  const byCity = new Map<string, Selector>();
  mixes.forEach((mix) => {
    const city = mix.city || 'PLUGGD';
    const key = city.toLowerCase();
    const existing = byCity.get(key);
    const genres = Array.from(new Set([...(existing?.genres || []), ...(mix.genre_tags || [])]));
    byCity.set(key, {
      id: key,
      name: `${city} selector`,
      mixCount: (existing?.mixCount || 0) + 1,
      score: (existing?.score || 0) + Number(mix.play_count ?? 0) + Number(mix.like_count ?? 0),
      genres,
      imageUrl: existing?.imageUrl || mix.cover_url,
      firstMixId: existing?.firstMixId || mix.id,
    });
  });
  return Array.from(byCity.values()).sort((a, b) => b.score - a.score).slice(0, 3);
}

function RisingDJs({ selectors }: { selectors: Selector[] }) {
  const router = useRouter();
  if (!selectors.length) return null;
  return (
    <View style={{ gap: 14 }}>
      {selectors.map((selector) => (
        <View key={selector.id} style={styles.djCard}>
          <View style={styles.djImageWrap}>
            {selector.imageUrl ? (
              <PluggdImage uri={selector.imageUrl} style={styles.djImage} />
            ) : (
              <View style={[styles.djImage, { backgroundColor: '#191410' }]} />
            )}
          </View>
          <View style={styles.djSelectorPill}>
            <MaterialIcons name="person-outline" size={12} color={ed.cream} />
            <Text style={styles.djSelectorText}>SELECTOR</Text>
          </View>
          <Text style={styles.djName}>{selector.name}</Text>
          <Text style={styles.djStat}>{selector.mixCount} mixes</Text>
          <Text style={styles.djStatMuted}>{formatCompact(selector.score)} discovery score</Text>
          {selector.genres.length ? (
            <Text style={styles.djGenres} numberOfLines={1}>{selector.genres.slice(0, 4).join(' / ')}</Text>
          ) : null}
          <View style={{ gap: 8, marginTop: 10 }}>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`View mixes from ${selector.name}`}
              onPress={() => router.push('/mixes' as any)}
            >
              <View style={styles.djProfile}>
                <Text style={styles.djProfileText}>Profile</Text>
              </View>
            </EdPressable>
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`Open room from ${selector.name}`}
              onPress={() => selector.firstMixId && router.push(`/mixes/${selector.firstMixId}` as any)}
            >
              <View style={styles.djRoom}>
                <Text style={styles.djRoomText}>Room</Text>
              </View>
            </EdPressable>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* New & notable mixes                                                 */
/* ------------------------------------------------------------------ */

function FreshUploads({ mixes }: { mixes: MixItem[] }) {
  const router = useRouter();
  const playback = usePlayback();
  if (!mixes.length) {
    return <Text style={styles.nightEmpty}>Fresh mixes land here as selectors publish them.</Text>;
  }
  return (
    <View style={styles.freshGrid}>
      {mixes.slice(0, 6).map((mix) => (
        <EdPressable
          key={mix.id}
          accessibilityRole="button"
          accessibilityLabel={`Open ${mix.title || 'mix'}`}
          onPress={() => router.push(`/mixes/${mix.id}` as any)}
          onLongPress={() => {
            const track = toTrack(mix, 'mix');
            showQuickActions(mix.title || 'Mix', [
              ...(track ? [{ label: 'Play mix', onPress: () => void playback.playTrack(track) }] : []),
              { label: 'Open listening room', onPress: () => router.push(`/mixes/${mix.id}` as any) },
              { label: 'Share', onPress: () => void Share.share({ message: `PLUGGD mix: ${mix.title || 'Untitled mix'}` }) },
            ]);
          }}
          style={styles.freshCard}
        >
          <View style={styles.freshArtWrap}>
            {mix.cover_url ? (
              <PluggdImage uri={mix.cover_url} style={styles.freshArt} />
            ) : (
              <View style={[styles.freshArt, { backgroundColor: '#191410' }]} />
            )}
          </View>
          <View style={styles.freshChipRow}>
            <View style={styles.freshChipWhite}>
              <Text style={styles.freshChipWhiteText}>BPM TBC</Text>
            </View>
            {mix.mood_tags?.[0] ? (
              <View style={styles.freshChipYellow}>
                <Text style={styles.freshChipYellowText}>{mix.mood_tags[0].toUpperCase()}</Text>
              </View>
            ) : null}
            {mix.audio_url ? (
              <View style={styles.freshChipPurple}>
                <Text style={styles.freshChipPurpleText}>PLAYABLE</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.freshTitle} numberOfLines={2}>{mix.title || 'Untitled mix'}</Text>
          <Text style={styles.freshMeta} numberOfLines={1}>
            {[mix.city, mixDuration(mix)].filter(Boolean).join(' · ') || 'PLUGGD mix'}
          </Text>
        </EdPressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Scene explorer                                                      */
/* ------------------------------------------------------------------ */

function SceneExplorer({ mixes }: { mixes: MixItem[] }) {
  const router = useRouter();
  const cities = useMemo(() => {
    const byCity = new Map<string, { city: string; count: number; lead: MixItem; genres: string[] }>();
    mixes.forEach((mix) => {
      if (!mix.city) return;
      const key = mix.city.toLowerCase();
      const existing = byCity.get(key);
      byCity.set(key, {
        city: mix.city,
        count: (existing?.count || 0) + 1,
        lead: existing?.lead || mix,
        genres: Array.from(new Set([...(existing?.genres || []), ...(mix.genre_tags || [])])).slice(0, 2),
      });
    });
    return Array.from(byCity.values()).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [mixes]);
  if (!cities.length) return null;
  return (
    <View style={{ gap: 14 }}>
      {cities.map((entry) => (
        <View key={entry.city} style={styles.sceneCard}>
          {entry.lead.cover_url ? (
            <PluggdImage uri={entry.lead.cover_url} style={StyleSheet.absoluteFillObject as any} />
          ) : null}
          <LinearGradient colors={['rgba(7,6,5,0.45)', 'rgba(7,6,5,0.93)']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.sceneBody}>
            <View style={styles.sceneCountPill}>
              <MaterialIcons name="place" size={12} color={ed.ink} />
              <Text style={styles.sceneCountText}>{entry.count} MIXES</Text>
            </View>
            <Text style={styles.sceneCity}>{entry.city}</Text>
            <Text style={styles.sceneLead} numberOfLines={2}>
              Led by <Text style={{ fontFamily: edFonts.bodyBold, color: ed.cream }}>{entry.lead.title || 'a PLUGGD selector'}</Text>, with sets from selectors moving through the city.
            </Text>
            {entry.genres.length ? (
              <Text style={styles.sceneGenres}>{entry.genres.join('   ')}</Text>
            ) : null}
            <View style={styles.sceneCtaRow}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Filter mixes from ${entry.city}`}
                onPress={() => router.push('/mixes' as any)}
                style={{ flex: 1 }}
              >
                <View style={styles.sceneFilter}>
                  <Text style={styles.sceneFilterText}>Filter scene</Text>
                </View>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Open the ${entry.city} room`}
                onPress={() => router.push(`/mixes/${entry.lead.id}` as any)}
                style={{ flex: 1 }}
              >
                <View style={styles.sceneRoom}>
                  <Text style={styles.sceneRoomText}>Room</Text>
                </View>
              </EdPressable>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* PLUGGD radio                                                        */
/* ------------------------------------------------------------------ */

const RADIO_TINTS: readonly (readonly [string, string])[] = [
  ['#2c2140', '#151021'],
  ['#33231a', '#171009'],
  ['#1d2733', '#0d131b'],
];

function PluggdRadio({ mixes }: { mixes: MixItem[] }) {
  const router = useRouter();
  const playback = usePlayback();
  const channels = useMemo(() => {
    const byGenre = new Map<string, MixItem[]>();
    mixes.forEach((mix) => {
      (mix.genre_tags || []).forEach((genre) => {
        byGenre.set(genre, [...(byGenre.get(genre) || []), mix]);
      });
    });
    return Array.from(byGenre.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .map(([genre, list]) => ({ genre, list }));
  }, [mixes]);
  if (!channels.length) return null;
  return (
    <View style={{ gap: 14 }}>
      {channels.map(({ genre, list }, index) => {
        const nowPlaying = list[0];
        const nextUp = list[1] || list[0];
        const track = nowPlaying ? toTrack(nowPlaying, 'mix') : null;
        const playing = Boolean(track && playback.currentTrack?.id === track.id && playback.isPlaying);
        return (
          <LinearGradient
            key={genre}
            colors={[...RADIO_TINTS[index % RADIO_TINTS.length]]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.radioCard}
          >
            <View style={styles.radioHeadRow}>
              <View style={styles.radioOnAir}>
                <View style={styles.radioOnAirDot} />
                <Text style={styles.radioOnAirText}>ON AIR</Text>
              </View>
              <Text style={styles.radioNumber}>{String(index + 1).padStart(2, '0')}</Text>
            </View>
            <Text style={styles.radioTitle}>PLUGGD {genre.toUpperCase()}</Text>
            <Text style={styles.radioBody} numberOfLines={2}>
              {genre} transmissions{nowPlaying?.city ? ` from ${nowPlaying.city}` : ''}, led by {selectorName(nowPlaying)} and refreshed with new sets.
            </Text>
            <View style={styles.radioDivider} />
            <Text style={styles.radioRowLabel}>
              {`NOW PLAYING · ${nowPlaying?.recording_type === 'live' ? 'LIVE SET' : 'STUDIO MIX'}${nowPlaying?.city ? ` · ${nowPlaying.city.toUpperCase()}` : ''}${mixDuration(nowPlaying) ? ` · ${mixDuration(nowPlaying)!.toUpperCase()}` : ''}`}
            </Text>
            <Text style={styles.radioRowValue} numberOfLines={1}>{nowPlaying?.title || 'Untitled mix'}</Text>
            <View style={styles.radioDivider} />
            <View style={styles.radioNextRow}>
              <Text style={styles.radioRowLabel}>NEXT UP</Text>
              {mixDuration(nextUp) ? <Text style={styles.radioRowLabel}>{mixDuration(nextUp)!.toUpperCase()}</Text> : null}
            </View>
            <Text style={styles.radioRowValue} numberOfLines={1}>{nextUp?.title || 'Untitled mix'}</Text>
            <View style={styles.radioCtaRow}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={playing ? `Pause PLUGGD ${genre}` : `Listen live to PLUGGD ${genre}`}
                onPress={() => {
                  if (playing) {
                    void playback.pause();
                    return;
                  }
                  if (track) void playback.playTrack(track);
                }}
                style={{ flex: 1 }}
              >
                <View style={styles.radioListen}>
                  <Text style={styles.radioListenText}>{playing ? 'Pause' : 'Listen live'}</Text>
                </View>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={`Open the PLUGGD ${genre} room`}
                onPress={() => nowPlaying && router.push(`/mixes/${nowPlaying.id}` as any)}
                style={{ flex: 1 }}
              >
                <View style={styles.radioRoom}>
                  <Text style={styles.radioRoomText}>Room</Text>
                </View>
              </EdPressable>
            </View>
          </LinearGradient>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming events + editorial highlights                              */
/* ------------------------------------------------------------------ */

function UpcomingEvents({ events }: { events: PassEvent[] }) {
  const router = useRouter();
  if (!events.length) return null;
  return (
    <View style={{ gap: 14 }}>
      {events.slice(0, 3).map((event) => {
        const starts = event.starts_at ? new Date(event.starts_at) : null;
        return (
          <EdPressable
            key={event.id}
            accessibilityRole="button"
            accessibilityLabel={`View ${event.title || 'event'}`}
            onPress={() => router.push(`/events/${event.id}` as any)}
          >
            <View style={styles.eventCard}>
              {event.cover_image_url ? (
                <PluggdImage uri={event.cover_image_url} style={StyleSheet.absoluteFillObject as any} />
              ) : null}
              <LinearGradient colors={['rgba(7,6,5,0.35)', 'rgba(7,6,5,0.9)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.eventDateBlock}>
                <Text style={styles.eventDateDay}>{starts ? starts.getDate().toString().padStart(2, '0') : '--'}</Text>
                <Text style={styles.eventDateMonth}>
                  {starts ? starts.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() : 'TBA'}
                </Text>
              </View>
              <View style={styles.eventBody}>
                {event.location ? (
                  <View style={styles.eventVenuePill}>
                    <MaterialIcons name="place" size={11} color={ed.cream} />
                    <Text style={styles.eventVenueText} numberOfLines={1}>
                      {event.location.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title || 'Underground event'}</Text>
                <Text style={styles.eventMeta}>
                  {starts ? starts.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBA'}  Event
                </Text>
              </View>
            </View>
          </EdPressable>
        );
      })}
    </View>
  );
}

const HIGHLIGHT_EYEBROWS = ['Scene reports', 'Culture notes', 'Dispatches'] as const;

function EditorialHighlights({ posts }: { posts: BlogRow[] }) {
  const router = useRouter();
  if (!posts.length) return null;
  return (
    <View style={styles.highlightSheet}>
      <Text style={styles.highlightHead}>EDITORIAL HIGHLIGHTS</Text>
      {posts.slice(0, 3).map((post, index) => (
        <EdPressable
          key={post.id}
          accessibilityRole="button"
          accessibilityLabel={`Read ${post.title || 'story'}`}
          onPress={() => router.push(`/plug/${post.id}` as any)}
        >
          <View style={styles.highlightRow}>
            <View style={styles.highlightThumbWrap}>
              {post.featured_image_url ? (
                <PluggdImage uri={post.featured_image_url} style={styles.highlightThumb} />
              ) : (
                <View style={[styles.highlightThumb, { backgroundColor: '#1d1712' }]} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.highlightEyebrow}>{HIGHLIGHT_EYEBROWS[index % HIGHLIGHT_EYEBROWS.length].toUpperCase()}</Text>
              <Text style={styles.highlightTitle} numberOfLines={2}>{post.title || 'PLUGGD story'}</Text>
              <Text style={styles.highlightMeta} numberOfLines={1}>
                {post.tags?.slice(0, 3).join(' · ') || 'PLUGGD editorial'}
              </Text>
            </View>
          </View>
        </EdPressable>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function MixesWorldScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filters, setFilters] = useState<MixFilters>(EMPTY_FILTERS);

  const mixesQuery = useQuery({
    queryKey: ['mixes-world', 'mixes'],
    queryFn: () =>
      safeList<MixItem>(
        (supabase as any)
          .from('mixes')
          .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at')
          .eq('visibility', 'public')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(20),
      ),
    staleTime: 1000 * 60 * 2,
  });
  const eventsQuery = useQuery({
    queryKey: ['mixes-world', 'events'],
    queryFn: () =>
      safeList<PassEvent>(
        (supabase as any)
          .from('events')
          .select('id,title,location,cover_image_url,starts_at')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(4),
      ),
    staleTime: 1000 * 60 * 3,
  });
  const storiesQuery = useQuery({
    queryKey: ['mixes-world', 'stories'],
    queryFn: () =>
      safeList<BlogRow>(
        (supabase as any)
          .from('blog_posts')
          .select('id,title,excerpt,featured_image_url,tags,created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),
      ),
    staleTime: 1000 * 60 * 5,
  });

  const mixes = useMemo(() => mixesQuery.data ?? [], [mixesQuery.data]);
  const selectors = useMemo(() => buildSelectors(mixes), [mixes]);

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return mixes.filter((mix) => {
      if (filters.genre && !(mix.genre_tags || []).includes(filters.genre)) return false;
      if (filters.scene && mix.city !== filters.scene) return false;
      if (filters.mood && !(mix.mood_tags || []).includes(filters.mood)) return false;
      if (filters.length && lengthBucket(mix) !== filters.length) return false;
      if (!query) return true;
      return (
        (mix.title || '').toLowerCase().includes(query) ||
        (mix.city || '').toLowerCase().includes(query) ||
        (mix.description || '').toLowerCase().includes(query)
      );
    });
  }, [mixes, filters]);

  const refreshing = mixesQuery.isRefetching || eventsQuery.isRefetching || storiesQuery.isRefetching;
  const refresh = () => {
    void mixesQuery.refetch();
    void eventsQuery.refetch();
    void storiesQuery.refetch();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 76, 96), paddingBottom: insets.bottom + 210 }}
      >
        {mixesQuery.isLoading ? (
          <View style={{ paddingHorizontal: 20 }}>
            <PremiumSkeleton compact label="Loading the mix world..." />
          </View>
        ) : mixes.length ? (
          <>
            <View style={{ paddingHorizontal: 20 }}>
              <Enter delay={0}>
                <MixesHero mixes={filtered.length ? filtered : mixes} />
              </Enter>
            </View>

            <View style={{ marginTop: 28 }}>
              <TornEdge color={ed.paper2} />
              <View style={styles.finderWrap}>
                <FindYourNextMix mixes={mixes} filters={filters} setFilters={setFilters} matchCount={filtered.length} />
              </View>
              <TornEdge flip color={ed.paper2} />
            </View>

            <View style={styles.section}>
              <MixSectionHead
                eyebrow="Editorial surface"
                title="What's happening"
                subtitle="The stories, rooms and track moments moving through the mix catalogue right now."
              />
              <WhatsHappening mixes={filtered.length ? filtered : mixes} />
            </View>

            <View style={styles.section}>
              <MixSectionHead
                eyebrow="Open rooms"
                title="Listening rooms"
                subtitle="Step into the most active mix rooms, play the set, save it, share it, and join the thread at the right timestamp."
              />
              <ListeningRooms mixes={filtered.length ? filtered : mixes} />
            </View>

            <View style={styles.section}>
              <MixSectionHead eyebrow="Selector directory" title="Rising DJs" action="View all DJs" onAction={() => router.push('/search' as any)} />
              <RisingDJs selectors={selectors} />
            </View>

            <View style={styles.section}>
              <MixSectionHead eyebrow="Fresh uploads" title="New & notable mixes" />
              <FreshUploads mixes={filtered} />
            </View>

            <View style={styles.section}>
              <MixSectionHead
                eyebrow="Scene explorer"
                title="Scene explorer"
                subtitle="Follow the cities shaping the current rotation, from late-night club recordings to radio sessions."
              />
              <SceneExplorer mixes={mixes} />
            </View>

            <View style={styles.section}>
              <MixSectionHead
                eyebrow="Broadcast energy"
                title="PLUGGD radio"
                subtitle="Always-on genre channels from the strongest public mixes. Tune in or open the room around the lead set."
              />
              <PluggdRadio mixes={mixes} />
            </View>

            <View style={styles.section}>
              <MixSectionHead eyebrow="Calendar" title="Upcoming events" action="All events" onAction={() => router.push('/events' as any)} />
              <UpcomingEvents events={eventsQuery.data ?? []} />
            </View>

            <View style={{ marginTop: 28 }}>
              <TornEdge color={ed.paper2} />
              <EditorialHighlights posts={storiesQuery.data ?? []} />
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <Text style={styles.mixSectionTitle}>The rotation is warming up</Text>
            <Text style={styles.nightEmpty}>Published mixes, live recordings, and event-linked audio from PLUGGD DJs land here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ed.night },
  section: { paddingHorizontal: 20, paddingTop: 34, gap: 16 },
  nightEmpty: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.creamMuted },

  mixEyebrow: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: MIX_YELLOW },
  mixSectionTitle: { fontFamily: edFonts.serif, fontSize: 28, lineHeight: 31, color: ed.cream },
  mixSectionSub: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: ed.creamMuted },
  mixActionPill: {
    alignSelf: 'flex-start',
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.3)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  mixActionText: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1.6, color: ed.cream },

  /* Hero */
  heroTabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  heroTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    paddingHorizontal: 13,
  },
  heroTabActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  heroTabNumber: { fontFamily: edFonts.mono, fontSize: 9.5, color: MIX_YELLOW },
  heroTabText: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 1.2, color: ed.cream },
  heroPosterWrap: { borderRadius: 6, overflow: 'hidden', minHeight: 330, justifyContent: 'flex-end' },
  heroPoster: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroPosterBody: { padding: 18, gap: 8 },
  heroKicker: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 2, color: MIX_YELLOW },
  heroTitle: { fontFamily: edFonts.serif, fontSize: 36, lineHeight: 38, color: ed.cream, letterSpacing: -0.5 },
  heroDescription: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,248,237,0.8)' },
  heroCtas: { gap: 10, marginTop: 14 },
  heroPlay: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: ed.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroPlayText: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: '#3a1c04' },
  heroCtaRow: { flexDirection: 'row', gap: 10 },
  heroGhost: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.22)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  heroGhostText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },

  /* Finder */
  finderWrap: { backgroundColor: ed.paper2, paddingHorizontal: 20, paddingVertical: 26 },
  finderSheet: {
    backgroundColor: '#171310',
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  finderTitle: { fontFamily: edFonts.serif, fontSize: 25, color: ed.cream },
  finderSub: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: 'rgba(255,248,237,0.62)' },
  finderSearch: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#fffdf7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  finderSearchInput: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: ed.ink, paddingVertical: 0 },
  filterRow: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#fffdf7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  filterRowText: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: 'rgba(34,23,15,0.75)' },
  finderReset: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finderResetText: { fontFamily: edFonts.bodyBold, fontSize: 13.5, color: ed.cream },
  finderMatch: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.62)' },

  /* What's happening */
  happeningCard: { borderRadius: 8, overflow: 'hidden', minHeight: 250 },
  happeningBody: { padding: 16, gap: 8, justifyContent: 'flex-end', flex: 1 },
  happeningPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(7,6,5,0.8)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  happeningPillText: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: ed.cream },
  happeningTitle: { fontFamily: edFonts.serif, fontSize: 25, lineHeight: 28, color: ed.cream },
  happeningMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.72)' },
  happeningPlay: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: ed.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  happeningPlayText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: '#3a1c04' },
  happeningRoom: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    backgroundColor: 'rgba(7,6,5,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  happeningRoomText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },

  /* Listening rooms */
  roomCard: { borderRadius: 8, overflow: 'hidden', minHeight: 210 },
  roomBody: { padding: 16, gap: 7, justifyContent: 'flex-end', flex: 1 },
  roomOpenPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ff3b4e',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  roomOpenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' },
  roomOpenText: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.2, color: '#ffffff' },
  roomTitle: { fontFamily: edFonts.bodyBold, fontSize: 19, lineHeight: 24, color: ed.cream },
  roomMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.72)' },
  roomJoin: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.3)',
    backgroundColor: 'rgba(7,6,5,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  roomJoinText: { fontFamily: edFonts.bodyBold, fontSize: 13, color: ed.cream },

  /* Rising DJs */
  djCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
  },
  djImageWrap: { borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  djImage: { width: '100%', height: 150 },
  djSelectorPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#171310',
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  djSelectorText: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: ed.cream },
  djName: { fontFamily: edFonts.bodyBlack, fontSize: 19, color: ed.cream, marginTop: 8, textTransform: 'capitalize' },
  djStat: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: ed.cream, marginTop: 4 },
  djStatMuted: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.55)' },
  djGenres: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.62)', marginTop: 4 },
  djProfile: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.22)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  djProfileText: { fontFamily: edFonts.bodyBold, fontSize: 13, color: ed.cream },
  djRoom: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  djRoomText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: '#3a1c04' },

  /* Fresh uploads */
  freshGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  freshCard: { width: '47.5%', flexGrow: 1, gap: 5 },
  freshArtWrap: { borderRadius: 8, overflow: 'hidden' },
  freshArt: { width: '100%', height: 130 },
  freshChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  freshChipWhite: { backgroundColor: '#fffdf7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3 },
  freshChipWhiteText: { fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 0.8, color: ed.ink },
  freshChipYellow: { backgroundColor: MIX_YELLOW, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3 },
  freshChipYellowText: { fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 0.8, color: '#3a2f04' },
  freshChipPurple: { backgroundColor: '#7c5cff', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3 },
  freshChipPurpleText: { fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 0.8, color: '#ffffff' },
  freshTitle: { fontFamily: edFonts.bodyBold, fontSize: 14, lineHeight: 18, color: ed.cream },
  freshMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.6)' },

  /* Scene explorer */
  sceneCard: { borderRadius: 10, overflow: 'hidden', minHeight: 250 },
  sceneBody: { flex: 1, padding: 16, gap: 7, justifyContent: 'flex-end' },
  sceneCountPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffdf7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sceneCountText: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.2, color: ed.ink },
  sceneCity: { fontFamily: edFonts.bodyBlack, fontSize: 24, color: ed.cream },
  sceneLead: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.8)' },
  sceneGenres: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.55)' },
  sceneCtaRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  sceneFilter: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.3)',
    backgroundColor: 'rgba(7,6,5,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneFilterText: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.cream },
  sceneRoom: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneRoomText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: '#3a1c04' },

  /* Radio */
  radioCard: { borderRadius: 12, padding: 16, gap: 6 },
  radioHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radioOnAir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioOnAirDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ff3b4e' },
  radioOnAirText: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: '#ff6b7a' },
  radioNumber: { fontFamily: edFonts.bodyBlack, fontSize: 24, color: 'rgba(255,248,237,0.28)' },
  radioTitle: { fontFamily: edFonts.bodyBlack, fontSize: 24, lineHeight: 28, color: ed.paper, letterSpacing: 0.5 },
  radioBody: { fontFamily: edFonts.bodyMedium, fontSize: 12, lineHeight: 17, color: 'rgba(255,248,237,0.7)' },
  radioDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,248,237,0.22)', marginVertical: 8 },
  radioRowLabel: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.3, color: 'rgba(255,248,237,0.55)' },
  radioRowValue: { fontFamily: edFonts.bodyBold, fontSize: 13, color: ed.cream, marginTop: 3 },
  radioNextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  radioCtaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  radioListen: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: ed.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioListenText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: '#3a1c04' },
  radioRoom: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    backgroundColor: 'rgba(7,6,5,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioRoomText: { fontFamily: edFonts.bodyBold, fontSize: 13, color: ed.cream },

  /* Events */
  eventCard: { borderRadius: 10, overflow: 'hidden', minHeight: 190, justifyContent: 'flex-end' },
  eventDateBlock: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 52,
    borderRadius: 8,
    backgroundColor: 'rgba(20,14,8,0.9)',
    alignItems: 'center',
    paddingVertical: 7,
  },
  eventDateDay: { fontFamily: edFonts.bodyBlack, fontSize: 17, color: ed.cream },
  eventDateMonth: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.1, color: MIX_YELLOW },
  eventBody: { padding: 14, gap: 6 },
  eventVenuePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(7,6,5,0.75)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: '95%',
  },
  eventVenueText: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1, color: ed.cream, flexShrink: 1 },
  eventTitle: { fontFamily: edFonts.bodyBold, fontSize: 18, lineHeight: 23, color: ed.cream },
  eventMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.65)' },

  /* Editorial highlights */
  highlightSheet: { backgroundColor: ed.paper, paddingHorizontal: 20, paddingVertical: 26, gap: 14 },
  highlightHead: { fontFamily: edFonts.mono, fontSize: 10.5, letterSpacing: 2, color: ed.ink },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  highlightThumbWrap: { width: 58, height: 58, borderRadius: 6, overflow: 'hidden' },
  highlightThumb: { width: '100%', height: '100%' },
  highlightEyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.2, color: '#8a4fd3' },
  highlightTitle: { fontFamily: edFonts.bodyBold, fontSize: 14.5, lineHeight: 19, color: ed.ink },
  highlightMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(34,23,15,0.6)' },
});
