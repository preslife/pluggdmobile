import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContextRail, EmptyState, ListCard, PosterCard, ScreenShell, SectionTitle } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { supabase } from '../../src/lib/supabase';
import { MixItem, PLUGGD_ORANGE, formatCompact, formatDuration, toTrack } from '../../src/lib/mobileContent';

const FILTERS = ['All', 'DJ Sets', 'Live', 'Studio', 'Saved'];

export default function MixesScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { playTrack, playQueue } = usePlayback();
  const [filter, setFilter] = useState('All');
  const [mixes, setMixes] = useState<MixItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('mixes')
        .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50);

      if (mounted) {
        setMixes(error || !Array.isArray(data) ? [] : (data as MixItem[]));
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'Live') return mixes.filter((mix) => /live|event|room/i.test(`${mix.recording_type || ''} ${mix.event_name || ''}`));
    if (filter === 'Studio') return mixes.filter((mix) => /studio/i.test(`${mix.recording_type || ''} ${mix.description || ''}`));
    return mixes;
  }, [filter, mixes]);

  const playMix = (mix: MixItem) => {
    const track = toTrack(mix, 'mix');
    if (track) playTrack(track);
  };

  const playAll = () => {
    const tracks = filtered.map((mix) => toTrack(mix, 'mix')).filter(Boolean);
    if (tracks.length) playQueue(tracks as any);
  };

  return (
    <ScreenShell
      title="Mixes"
      subtitle="DJ sets, selector journeys, live recordings, and curator sessions."
      action={
        <Pressable style={styles.actionButton} onPress={playAll}>
          <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Play</Text>
        </Pressable>
      }
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ContextRail tabs={FILTERS} active={filter} onChange={setFilter} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState title="No mixes yet" body="Published DJ mixes and live recordings will appear here." />
      ) : null}

      {filtered.length > 0 ? (
        <>
          <SectionTitle title="Featured mixes" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {filtered.slice(0, 8).map((mix) => (
              <PosterCard
                key={mix.id}
                title={mix.title || 'Untitled mix'}
                subtitle={mix.city || mix.genre_tags?.[0] || 'Pluggd DJ'}
                meta={`${formatDuration(mix.duration_seconds)} · ${formatCompact(mix.play_count)} plays`}
                imageUrl={mix.cover_url}
                onPress={() => router.push(`/mixes/${mix.slug || mix.id}` as any)}
                onPlay={() => playMix(mix)}
              />
            ))}
          </ScrollView>

          <SectionTitle title="All mixes" />
          {filtered.map((mix) => (
            <ListCard
              key={mix.id}
              title={mix.title || 'Untitled mix'}
              subtitle={mix.description || mix.event_name || mix.city || 'DJ mix'}
              meta={[mix.genre_tags?.slice(0, 2).join(', '), formatDuration(mix.duration_seconds), `${formatCompact(mix.play_count)} plays`]
                .filter(Boolean)
                .join(' · ')}
              imageUrl={mix.cover_url}
              onPress={() => router.push(`/mixes/${mix.slug || mix.id}` as any)}
              onPlay={() => playMix(mix)}
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
    borderRadius: 16,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingBottom: 18,
  },
});
