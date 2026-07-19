/**
 * BeatPlug — direct mobile port of the web /market/beats audition floor
 * (.bp-floor night-press voice): numbered discovery tabs, serif "Find
 * the beat that starts the record." hero with the featured audition
 * track, search + sort, the four buyer benefits, BeatPlug picks,
 * Browse BeatPlug grid, license cards, top producers, From Soundboards,
 * and the For Creators / For Hitmakers close.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Alert,
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
import { Enter, EdPressable, WaveTicks } from './EditorialBits';
import { usePlayback } from '../../context/PlaybackProvider';
import { safeList, toggleSavedContent } from '../culture/mobileServices';
import { showQuickActions } from '../../lib/quickActions';
import { supabase } from '../../lib/supabase';
import { formatCompact, formatGBP, toTrack, type BeatItem, type SoundboardItem } from '../../lib/mobileContent';

const DISCOVERY_TABS = ['Audition floor', 'Trending', 'Producers'] as const;
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

function beatDate(beat: BeatItem) {
  if (!beat.created_at) return null;
  const date = new Date(beat.created_at);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function BeatPlugScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const playback = usePlayback();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>('Trending');
  const [gridLimit, setGridLimit] = useState(8);

  const beatsQuery = useQuery({
    queryKey: ['beatplug', 'beats'],
    queryFn: () =>
      safeList<BeatItem>(
        (supabase as any)
          .from('beats')
          .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(40),
      ),
    staleTime: 1000 * 60 * 2,
  });
  const boardsQuery = useQuery({
    queryKey: ['beatplug', 'boards'],
    queryFn: () =>
      safeList<SoundboardItem>(
        (supabase as any)
          .from('soundboards')
          .select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
          .eq('is_published', true)
          .in('visibility', ['public', 'link'])
          .order('last_activity_at', { ascending: false })
          .limit(4),
      ),
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
      const name = beat.producer_name || 'PLUGGD Producer';
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

  const heroTrack = hero ? toTrack(hero, 'beat') : null;
  const heroPlaying = Boolean(heroTrack && playback.currentTrack?.id === heroTrack.id && playback.isPlaying);

  const refreshing = beatsQuery.isRefetching || boardsQuery.isRefetching;
  const refresh = () => {
    void beatsQuery.refetch();
    void boardsQuery.refetch();
  };

  const playBeat = (beat: BeatItem) => {
    const track = toTrack(beat, 'beat');
    if (track) {
      void playback.playTrack(track);
      return;
    }
    router.push(`/beat/${beat.id}` as any);
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
          gap: 28,
        }}
      >
        {/* Discovery tabs + hero */}
        <Enter delay={0}>
        <View style={{ gap: 14 }}>
          <View style={styles.tabsRow}>
            {DISCOVERY_TABS.map((label, index) => (
              <EdPressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => setTab(index)}>
                <View style={[styles.tab, index === tab && styles.tabActive]}>
                  <Text style={[styles.tabIndex, index === tab && { color: ed.onOrange }]}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.tabText, index === tab && { color: ed.onOrange }]}>{label.toUpperCase()}</Text>
                </View>
              </EdPressable>
            ))}
          </View>
          <View style={styles.heroKickerRow}>
            <View style={styles.heroDot} />
            <Text style={styles.heroKicker}>BeatPlug</Text>
          </View>
          <Text style={styles.heroTitle}>
            Find the beat <Text style={styles.heroTitleAccent}>that starts the record.</Text>
          </Text>
          <Text style={styles.heroLede}>
            A focused audition floor for producer-owned beats, clear licensing and instant creative decisions.
          </Text>

          {beatsQuery.isLoading ? (
            <PremiumSkeleton compact label="Loading the audition floor..." />
          ) : hero ? (
            <View style={styles.heroTrack}>
              <View style={styles.heroArtWrap}>
                {hero.image_url ? (
                  <PluggdImage uri={hero.image_url} style={styles.heroArt} />
                ) : (
                  <View style={[styles.heroArt, { backgroundColor: '#191410' }]} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={styles.heroMono}>FEATURED AUDITION</Text>
                <Text style={styles.heroTrackTitle} numberOfLines={1}>{hero.title || 'Untitled beat'}</Text>
                <Text style={styles.heroProducer} numberOfLines={1}>{hero.producer_name || 'PLUGGD Producer'}</Text>
                <WaveTicks bars={26} color={heroPlaying ? ed.orange : 'rgba(255,248,237,0.35)'} height={22} />
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {[
                    hero.bpm ? `${hero.bpm} BPM` : 'Open tempo',
                    hero.key || 'Open key',
                    hero.genre || 'Open genre',
                    beatPrice(hero),
                    beatDate(hero),
                  ]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              </View>
            </View>
          ) : null}

          {hero ? (
            <View style={styles.heroActions}>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel={heroPlaying ? 'Pause featured beat' : 'Play featured beat'}
                onPress={() => {
                  if (heroPlaying) {
                    void playback.pause();
                    return;
                  }
                  playBeat(hero);
                }}
                style={{ flex: 1 }}
              >
                <View style={styles.heroPrimary}>
                  <MaterialIcons name={heroPlaying ? 'pause' : 'play-arrow'} size={20} color={ed.onOrange} />
                  <Text style={styles.heroPrimaryText}>{heroPlaying ? 'Pause audition' : 'Play audition'}</Text>
                </View>
              </EdPressable>
              <EdPressable
                accessibilityRole="button"
                accessibilityLabel="View licenses and buy"
                onPress={() => router.push(`/beat/${hero.id}` as any)}
                style={{ flex: 1 }}
              >
                <View style={styles.heroSecondary}>
                  <Text style={styles.heroSecondaryText}>View Licenses & Buy</Text>
                </View>
              </EdPressable>
            </View>
          ) : null}
        </View>
        </Enter>

        {/* Search + sort */}
        <View style={{ gap: 10 }}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color="rgba(255,248,237,0.45)" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search beats, producers, moods, genres..."
              placeholderTextColor="rgba(255,248,237,0.45)"
              style={styles.searchInput}
            />
          </View>
          <Text style={styles.searchHint}>Search, sort, then jump straight into the beat grid.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            {SORT_OPTIONS.map((option) => (
              <EdPressable key={option} accessibilityRole="button" accessibilityLabel={`Sort ${option}`} onPress={() => setSort(option)}>
                <View style={[styles.sortChip, sort === option && styles.sortChipActive]}>
                  <Text style={[styles.sortChipText, sort === option && { color: ed.onOrange }]}>{option}</Text>
                </View>
              </EdPressable>
            ))}
          </ScrollView>
        </View>

        {/* Benefits */}
        <View style={styles.benefitGrid}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefitCard}>
              <MaterialIcons name={benefit.icon as any} size={18} color={ed.orange} />
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitCopy}>{benefit.copy}</Text>
            </View>
          ))}
        </View>

        {/* BeatPlug picks now */}
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionEyebrow}>TRENDING</Text>
          <Text style={styles.sectionTitle}>BeatPlug picks now</Text>
          {filtered.slice(0, 3).map((beat) => {
            const track = toTrack(beat, 'beat');
            const playing = Boolean(track && playback.currentTrack?.id === track.id && playback.isPlaying);
            return (
              <View key={beat.id} style={styles.pickRow}>
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
                      <View style={[styles.pickArt, { backgroundColor: '#191410' }]} />
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.pickTitle} numberOfLines={1}>{beat.title || 'Untitled beat'}</Text>
                    <Text style={styles.pickMeta} numberOfLines={1}>
                      {[beat.producer_name || 'PLUGGD Producer', beat.bpm ? `${beat.bpm} BPM` : null, beat.key].filter(Boolean).join(' · ')}
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
                    <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={20} color={ed.ink} />
                  </View>
                </EdPressable>
              </View>
            );
          })}
        </View>

        {/* Browse BeatPlug */}
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionEyebrow}>BROWSE BEATPLUG</Text>
          <View style={styles.browseHeadRow}>
            <Text style={styles.sectionTitle}>Browse BeatPlug</Text>
            <Text style={styles.beatCount}>{filtered.length} beats available</Text>
          </View>
          {filtered.length ? (
            <View style={styles.beatGrid}>
              {filtered.slice(0, gridLimit).map((beat) => (
                <EdPressable
                  key={beat.id}
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
                      { label: 'Share', onPress: () => void Share.share({ message: `PLUGGD beat: ${beat.title || 'Untitled'} by ${beat.producer_name || 'Producer'}` }) },
                      { label: 'View licenses', onPress: () => router.push(`/beat/${beat.id}` as any) },
                    ])
                  }
                  style={styles.beatCard}
                >
                  <View style={styles.beatArtWrap}>
                    {beat.image_url ? (
                      <PluggdImage uri={beat.image_url} style={styles.beatArt} />
                    ) : (
                      <View style={[styles.beatArt, { backgroundColor: '#191410' }]} />
                    )}
                    <View style={styles.beatPriceChip}>
                      <Text style={styles.beatPriceText}>{beatPrice(beat)}</Text>
                    </View>
                  </View>
                  <Text style={styles.beatTitle} numberOfLines={1}>{beat.title || 'Untitled beat'}</Text>
                  <Text style={styles.beatMeta} numberOfLines={1}>
                    {[beat.producer_name || 'Producer', beat.bpm ? `${beat.bpm} BPM` : null].filter(Boolean).join(' · ')}
                  </Text>
                </EdPressable>
              ))}
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

        {/* License cards */}
        <View style={{ gap: 12 }}>
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
            {producers.map((producer) => (
              <EdPressable
                key={producer.name}
                accessibilityRole="button"
                accessibilityLabel={`Search beats by ${producer.name}`}
                onPress={() => setSearch(producer.name)}
              >
                <View style={styles.producerRow}>
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
                  <MaterialIcons name="chevron-right" size={20} color="rgba(255,248,237,0.5)" />
                </View>
              </EdPressable>
            ))}
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
                      <View style={[styles.boardArt, { backgroundColor: '#191410' }]} />
                    )}
                    <Text style={styles.boardTitle} numberOfLines={1}>{board.title || 'Untitled board'}</Text>
                    <Text style={styles.boardMeta}>{formatCompact(board.item_count)} sounds · {formatCompact(board.like_count)} likes</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },

  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.22)',
    paddingHorizontal: 12,
  },
  tabActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  tabIndex: { fontFamily: edFonts.mono, fontSize: 9.5, color: ed.orange },
  tabText: { fontFamily: edFonts.bodyBlack, fontSize: 10.5, letterSpacing: 1.1, color: ed.cream },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ed.orange },
  heroKicker: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.cream },
  heroTitle: { fontFamily: edFonts.serif, fontSize: 36, lineHeight: 38, letterSpacing: -0.7, color: ed.cream },
  heroTitleAccent: { fontFamily: edFonts.serifItalic, color: ed.orange },
  heroLede: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: 'rgba(255,248,237,0.68)' },

  heroTrack: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.25)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 12,
    alignItems: 'center',
  },
  heroArtWrap: { width: 92, height: 92, borderRadius: 4, overflow: 'hidden' },
  heroArt: { width: '100%', height: '100%' },
  heroMono: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.6, color: 'rgba(255,248,237,0.55)' },
  heroTrackTitle: { fontFamily: edFonts.serif, fontSize: 21, color: ed.cream },
  heroProducer: { fontFamily: edFonts.bodyBold, fontSize: 12.5, color: ed.orange },
  heroMeta: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 0.6, color: 'rgba(255,248,237,0.6)', marginTop: 2 },
  heroActions: { flexDirection: 'row', gap: 10 },
  heroPrimary: {
    minHeight: 50,
    borderRadius: 6,
    backgroundColor: ed.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroPrimaryText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.onOrange },
  heroSecondary: {
    minHeight: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSecondaryText: { fontFamily: edFonts.bodyBold, fontSize: 13, color: ed.cream },

  searchBar: {
    minHeight: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: ed.cream, paddingVertical: 0 },
  searchHint: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.5)' },
  sortChip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.2)',
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  sortChipText: { fontFamily: edFonts.bodyBold, fontSize: 12, color: ed.cream },

  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  benefitCard: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 13,
    gap: 4,
  },
  benefitTitle: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.cream, marginTop: 4 },
  benefitCopy: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,248,237,0.6)' },

  sectionEyebrow: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 2, color: ed.orange },
  sectionTitle: { fontFamily: edFonts.serif, fontSize: 26, lineHeight: 29, color: ed.cream },
  browseHeadRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  beatCount: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 1, color: 'rgba(255,248,237,0.55)' },

  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
  },
  pickMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickArtWrap: { width: 56, height: 56, borderRadius: 4, overflow: 'hidden' },
  pickArt: { width: '100%', height: '100%' },
  pickTitle: { fontFamily: edFonts.serif, fontSize: 17, color: ed.cream },
  pickMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.6)' },
  pickPrice: { fontFamily: edFonts.mono, fontSize: 10.5, color: ed.orange },
  pickPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ed.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },

  beatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  beatCard: { width: '47.5%', flexGrow: 1, gap: 4 },
  beatArtWrap: { borderRadius: 4, overflow: 'hidden' },
  beatArt: { width: '100%', height: 150 },
  beatPriceChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(7,6,5,0.82)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  beatPriceText: { fontFamily: edFonts.mono, fontSize: 10, color: ed.cream },
  beatTitle: { fontFamily: edFonts.serif, fontSize: 16.5, color: ed.cream, marginTop: 4 },
  beatMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.6)' },
  emptyText: { fontFamily: edFonts.bodyMedium, fontSize: 13.5, color: 'rgba(255,248,237,0.62)' },
  loadMore: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loadMoreText: { fontFamily: edFonts.bodyBlack, fontSize: 13.5, color: ed.cream },

  licenseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  licenseCard: {
    width: '47.5%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    gap: 5,
  },
  licenseTitle: { fontFamily: edFonts.serif, fontSize: 19, color: ed.cream },
  licenseSubtitle: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: ed.orange },
  licenseCopy: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,248,237,0.62)' },
  licensePrice: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 0.8, color: 'rgba(255,248,237,0.75)', marginTop: 3 },

  producerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
  },
  producerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#1d1712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  producerInitials: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.cream },
  producerName: { fontFamily: edFonts.bodyBold, fontSize: 15, color: ed.cream },
  producerMeta: { fontFamily: edFonts.bodyMedium, fontSize: 12, color: 'rgba(255,248,237,0.6)' },

  boardCard: { width: 190, gap: 5 },
  boardArt: { width: '100%', height: 120, borderRadius: 4 },
  boardTitle: { fontFamily: edFonts.serif, fontSize: 16, color: ed.cream, marginTop: 4 },
  boardMeta: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.6)' },

  creatorPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.22)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 18,
    gap: 8,
  },
  creatorEyebrow: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.8, color: ed.orange },
  creatorTitle: { fontFamily: edFonts.serif, fontSize: 25, lineHeight: 28, color: ed.cream },
  creatorBody: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.66)' },
  creatorCards: { gap: 10, marginTop: 8 },
  creatorCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.18)',
    padding: 14,
    gap: 5,
  },
  creatorCardTitle: { fontFamily: edFonts.bodyBlack, fontSize: 15.5, color: ed.cream },
  creatorCardBody: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,248,237,0.62)' },
  startSelling: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  startSellingText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.onOrange },
});
