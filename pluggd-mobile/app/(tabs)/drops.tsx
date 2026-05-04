import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContextRail, EmptyState, ListCard, PosterCard, ScreenShell, SectionTitle } from '../../components/ContentUI';
import { supabase } from '../../src/lib/supabase';
import {
  PLUGGD_ORANGE,
  ReleaseItem,
  formatGBP,
  formatDate,
  priceForRelease,
  toTrack,
} from '../../src/lib/mobileContent';
import { usePlayback } from '../../src/context/PlaybackProvider';

const FILTERS = ['All', 'New', 'Paid', 'Free'];

export default function MusicScreen() {
  const router = useRouter();
  const { playTrack, playQueue } = usePlayback();
  const [activeFilter, setActiveFilter] = useState('All');
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('releases')
        .select('id,title,artist,cover_art_url,audio_url,genre,price,download_price,minimum_price,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (mounted) {
        setReleases(error || !Array.isArray(data) ? [] : (data as ReleaseItem[]));
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'Paid') return releases.filter((item) => priceForRelease(item) > 0);
    if (activeFilter === 'Free') return releases.filter((item) => priceForRelease(item) <= 0);
    return releases;
  }, [activeFilter, releases]);

  const playable = filtered.map((item) => toTrack(item, 'release')).filter(Boolean);

  const playRelease = (item: ReleaseItem) => {
    const track = toTrack(item, 'release');
    if (track) playTrack(track);
    else router.push(`/release/${item.id}` as any);
  };

  return (
    <ScreenShell
      title="Music"
      subtitle="Singles, EPs, albums and tracks from Pluggd artists, producers, DJs and curators."
      action={
        <Pressable style={styles.actionButton} onPress={() => playable.length && playQueue(playable as any)}>
          <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Play</Text>
        </Pressable>
      }
    >
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ContextRail tabs={FILTERS} active={activeFilter} onChange={setActiveFilter} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState title="No music found" body="Fresh releases will appear here as creators publish them." />
      ) : null}

      {filtered.length > 0 ? (
        <>
          <SectionTitle title="Featured music" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {filtered.slice(0, 8).map((release) => (
              <PosterCard
                key={release.id}
                title={release.title || 'Untitled release'}
                subtitle={release.artist || 'Pluggd Creator'}
                meta={formatGBP(priceForRelease(release))}
                imageUrl={release.cover_art_url}
                onPress={() => router.push(`/release/${release.id}` as any)}
                onPlay={() => playRelease(release)}
              />
            ))}
          </ScrollView>

          <SectionTitle title="All releases" />
          {filtered.map((release) => (
            <ListCard
              key={release.id}
              title={release.title || 'Untitled release'}
              subtitle={release.artist || 'Pluggd Creator'}
              meta={`${release.genre || 'Release'} · ${formatDate(release.created_at)} · ${formatGBP(priceForRelease(release))}`}
              imageUrl={release.cover_art_url}
              onPress={() => router.push(`/release/${release.id}` as any)}
              onPlay={() => playRelease(release)}
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
