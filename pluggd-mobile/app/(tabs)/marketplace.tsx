import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContextRail, EmptyState, ListCard, PosterCard, ScreenShell, SectionTitle } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { supabase } from '../../src/lib/supabase';
import {
  BeatItem,
  PLUGGD_ORANGE,
  SamplePackItem,
  formatCompact,
  formatGBP,
  toTrack,
} from '../../src/lib/mobileContent';

const TABS = ['Beats', 'Sample Packs'];
const GENRES = ['All', 'Hip Hop', 'R&B', 'Drill', 'Afrobeats', 'Trap', 'Electronic'];

export default function MarketplaceScreen() {
  const router = useRouter();
  const { playTrack, playQueue } = usePlayback();
  const [activeTab, setActiveTab] = useState('Beats');
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
  const activeItems = activeTab === 'Beats' ? visibleBeats : visiblePacks;

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
        : visiblePacks.map((pack) => toTrack(pack, 'sample_pack')).filter(Boolean);
    if (tracks.length) playQueue(tracks as any);
  };

  return (
    <ScreenShell
      title="Market"
      subtitle="Beats, licenses, and sample packs for creators building the next record."
      action={
        <Pressable style={styles.actionButton} onPress={playAll}>
          <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Play all</Text>
        </Pressable>
      }
    >
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ContextRail tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <ContextRail tabs={GENRES} active={genre} onChange={setGenre} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!loading && activeItems.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Try another genre or check back as creators upload new market items." />
      ) : null}

      {!loading && activeTab === 'Beats' && visibleBeats.length > 0 ? (
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

          <SectionTitle title="Beats" />
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

      {!loading && activeTab === 'Sample Packs' && visiblePacks.length > 0 ? (
        <>
          <SectionTitle title="Sample pack previews" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {visiblePacks.slice(0, 8).map((pack) => (
              <PosterCard
                key={pack.id}
                title={pack.title || 'Untitled pack'}
                subtitle={pack.genre || 'Sample pack'}
                meta={formatGBP(pack.price)}
                imageUrl={pack.cover_art_url}
                onPress={() => router.push(`/sample-pack/${pack.id}` as any)}
                onPlay={() => playPack(pack)}
              />
            ))}
          </ScrollView>

          <SectionTitle title="Sample packs" />
          {visiblePacks.map((pack) => (
            <ListCard
              key={pack.id}
              title={pack.title || 'Untitled pack'}
              subtitle={pack.description || pack.genre || 'Sample pack'}
              meta={`${pack.sample_count ?? 0} samples · ${pack.bpm_range || 'Any BPM'} · ${formatCompact(pack.total_downloads)} downloads · ${formatGBP(pack.price)}`}
              imageUrl={pack.cover_art_url}
              onPress={() => router.push(`/sample-pack/${pack.id}` as any)}
              onPlay={() => playPack(pack)}
            />
          ))}
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    paddingBottom: 18,
  },
});
