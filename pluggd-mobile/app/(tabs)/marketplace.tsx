import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContextRail, EmptyState, ListCard, PosterCard, ScreenShell, SectionTitle } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { supabase } from '../../src/lib/supabase';
import {
  BeatItem,
  PLUGGD_ORANGE,
  SamplePackItem,
  formatCompact,
  formatGBP,
  toTrack,
} from '../../src/lib/mobileContent';

const TABS = ['All', 'Beats', 'Samples', 'Services', 'Licenses', 'Offers'];
const SAMPLE_FILTERS = ['All', 'Sample Packs', 'Drum Kits', 'Loop Packs', 'One-Shots', 'MIDI Kits', 'Vocal Packs', 'Presets'];
const GENRES = ['All', 'Hip Hop', 'R&B', 'Drill', 'Afrobeats', 'Trap', 'Electronic'];

export default function MarketplaceScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { playTrack, playQueue } = usePlayback();
  const [activeTab, setActiveTab] = useState('All');
  const [sampleFilter, setSampleFilter] = useState('All');
  const [genre, setGenre] = useState('All');
  const [beats, setBeats] = useState<BeatItem[]>([]);
  const [packs, setPacks] = useState<SamplePackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [beatRes, packRes] = await Promise.all([
        supabase
          .from('beats')
          .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(60),
        (supabase as any)
          .from('sample_packs')
          .select('id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at')
          .order('created_at', { ascending: false })
          .limit(60),
      ]);

      if (!mounted) return;
      setBeats(Array.isArray(beatRes.data) ? (beatRes.data as BeatItem[]) : []);
      setPacks(Array.isArray(packRes.data) ? (packRes.data as SamplePackItem[]) : []);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const visibleBeats = useMemo(
    () => (genre === 'All' ? beats : beats.filter((beat) => (beat.genre || '').toLowerCase() === genre.toLowerCase())),
    [beats, genre],
  );
  const visiblePacks = useMemo(
    () => (genre === 'All' ? packs : packs.filter((pack) => (pack.genre || '').toLowerCase() === genre.toLowerCase())),
    [packs, genre],
  );
  const hasCommerceItems = activeTab === 'All'
    ? visibleBeats.length + visiblePacks.length > 0
    : activeTab === 'Beats'
      ? visibleBeats.length > 0
      : activeTab === 'Samples'
        ? visiblePacks.length > 0
        : true;

  const playBeat = (beat: BeatItem) => {
    const track = toTrack(beat, 'beat');
    if (track) playTrack(track);
  };

  const playPack = (pack: SamplePackItem) => {
    const track = toTrack(pack, 'sample_pack');
    if (track) playTrack(track);
  };

  const playAll = () => {
    const tracks =
      activeTab === 'Beats'
        ? visibleBeats.map((beat) => toTrack(beat, 'beat')).filter(Boolean)
        : activeTab === 'Samples'
          ? visiblePacks.map((pack) => toTrack(pack, 'sample_pack')).filter(Boolean)
          : [
              ...visibleBeats.map((beat) => toTrack(beat, 'beat')).filter(Boolean),
              ...visiblePacks.map((pack) => toTrack(pack, 'sample_pack')).filter(Boolean),
            ];
    if (tracks.length) playQueue(tracks as any);
  };

  return (
    <ScreenShell
      title="Market"
      subtitle="Commerce, licensing, services and creator tools: beats, samples, licenses and offers."
      action={
        <Pressable accessibilityRole="button" accessibilityLabel="Play all market previews" style={styles.actionButton} onPress={playAll}>
          <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Play all</Text>
        </Pressable>
      }
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ContextRail tabs={TABS} active={activeTab} onChange={setActiveTab} />
      {['All', 'Beats', 'Samples'].includes(activeTab) ? (
        <ContextRail tabs={GENRES} active={genre} onChange={setGenre} />
      ) : null}
      {activeTab === 'Samples' ? (
        <ContextRail tabs={SAMPLE_FILTERS} active={sampleFilter} onChange={setSampleFilter} />
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!loading && !hasCommerceItems ? (
        <EmptyState title="Nothing here yet" body="Try another genre or check back as creators upload new market items." />
      ) : null}

      {!loading && (activeTab === 'All' || activeTab === 'Beats') && visibleBeats.length > 0 ? (
        <>
          <SectionTitle title="Featured beats" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {visibleBeats.slice(0, 8).map((beat) => (
              <PosterCard
                key={beat.id}
                title={beat.title || 'Untitled beat'}
                subtitle={beat.producer_name || 'Producer'}
                meta={formatGBP(beat.price)}
                imageUrl={beat.image_url}
                onPress={() => router.push(`/beat/${beat.id}` as any)}
                onPlay={() => playBeat(beat)}
              />
            ))}
          </ScrollView>

          {activeTab === 'Beats' ? <SectionTitle title="Beats" /> : null}
          {visibleBeats.map((beat) => (
            <ListCard
              key={beat.id}
              title={beat.title || 'Untitled beat'}
              subtitle={beat.producer_name || 'Producer'}
              meta={[beat.genre, beat.bpm ? `${beat.bpm} BPM` : null, beat.key, formatGBP(beat.price)]
                .filter(Boolean)
                .join(' · ')}
              imageUrl={beat.image_url}
              onPress={() => router.push(`/beat/${beat.id}` as any)}
              onPlay={() => playBeat(beat)}
            />
          ))}
        </>
      ) : null}

      {!loading && (activeTab === 'All' || activeTab === 'Samples') && visiblePacks.length > 0 ? (
        <>
          <SectionTitle title={activeTab === 'All' ? 'Sample previews' : `${sampleFilter === 'All' ? 'Samples' : sampleFilter}`} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {visiblePacks.slice(0, 8).map((pack) => (
              <PosterCard
                key={pack.id}
                title={pack.title || 'Untitled pack'}
                subtitle={pack.genre || 'Samples'}
                meta={formatGBP(pack.price)}
                imageUrl={pack.cover_art_url}
                onPress={() => router.push(`/sample-pack/${pack.id}` as any)}
                onPlay={() => playPack(pack)}
              />
            ))}
          </ScrollView>

          {activeTab === 'Samples' ? <SectionTitle title="Samples" /> : null}
          {visiblePacks.map((pack) => (
            <ListCard
              key={pack.id}
              title={pack.title || 'Untitled pack'}
              subtitle={pack.description || pack.genre || 'Samples'}
              meta={`${pack.sample_count ?? 0} samples · ${pack.bpm_range || 'Any BPM'} · ${formatCompact(pack.total_downloads)} downloads · ${formatGBP(pack.price)}`}
              imageUrl={pack.cover_art_url}
              onPress={() => router.push(`/sample-pack/${pack.id}` as any)}
              onPlay={() => playPack(pack)}
            />
          ))}
        </>
      ) : null}

      {!loading && activeTab === 'Services' ? (
        <>
          <SectionTitle title="Services" />
          <ListCard title="Find a service provider" subtitle="Engineers, designers, marketers and specialists" meta="Creator services" icon="chevron-right" onPress={() => router.push('/discover' as any)} />
          <ListCard title="Offer your services" subtitle="Set up your profile and accept work" meta="Studio setup" icon="chevron-right" onPress={() => router.push('/creator/dashboard' as any)} />
        </>
      ) : null}

      {!loading && activeTab === 'Licenses' ? (
        <>
          <SectionTitle title="Licenses" />
          <ListCard title="Beat licenses" subtitle="Usage rights for leases, exclusives and custom terms" meta="Market licensing" icon="chevron-right" onPress={() => router.push('/creator/licensing' as any)} />
          <ListCard title="Contract tools" subtitle="Review rights, split terms and license records" meta="Creator tools" icon="chevron-right" onPress={() => router.push('/creator/licensing' as any)} />
        </>
      ) : null}

      {!loading && activeTab === 'Offers' ? (
        <>
          <SectionTitle title="Creator offers" />
          <ListCard title="Limited creator bundles" subtitle="Campaigns, services and unlockable fan offers" meta="Coming into Market" icon="chevron-right" />
          <ListCard title="Membership offers" subtitle="Exclusive access from creators you follow" meta="Creator offers" icon="chevron-right" onPress={() => router.push('/membership' as any)} />
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    paddingBottom: 12,
  },
});
