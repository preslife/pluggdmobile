import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { ListCard } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { toggleSavedContent } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { MixItem, MixTrackItem, PLUGGD_ORANGE, formatCompact, formatDuration, toTrack } from '../../src/lib/mobileContent';

export default function MixDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, seekTo } = usePlayback();
  const [mix, setMix] = useState<MixItem | null>(null);
  const [tracklist, setTracklist] = useState<MixTrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [mixRes, trackRes] = await Promise.all([
        (supabase as any)
          .from('mixes')
          .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at')
          .or(`id.eq.${id},slug.eq.${id}`)
          .maybeSingle(),
        (supabase as any)
          .from('mix_tracklist_items')
          .select('id,mix_id,position,start_seconds,end_seconds,raw_title,raw_artist')
          .order('position', { ascending: true }),
      ]);

      if (!mounted) return;
      const nextMix = mixRes.error ? null : (mixRes.data as MixItem | null);
      setMix(nextMix);
      setTracklist(
        Array.isArray(trackRes.data) && nextMix
          ? (trackRes.data as MixTrackItem[]).filter((item) => item.mix_id === nextMix.id)
          : [],
      );
      setLoading(false);
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const playMix = () => {
    if (!mix) return;
    const track = toTrack(mix, 'mix');
    if (track) playTrack(track);
  };

  const saveMix = async () => {
    if (!mix || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('mix', mix.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `${mix.title || 'Mix'} library state updated.` : result.error || 'Please try again.');
  };

  const shareMix = async () => {
    if (!mix) return;
    await Share.share({ message: `PLUGGD mix: ${mix.title || 'Untitled mix'}` });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
          </View>
        ) : null}

        {mix ? (
          <>
            <View style={styles.hero}>
              {mix.cover_url ? <Image source={{ uri: mix.cover_url }} style={styles.heroImage} /> : null}
              {!mix.cover_url ? <MaterialIcons name="headphones" size={58} color={PLUGGD_ORANGE} /> : null}
            </View>
            <Text style={styles.eyebrow}>Mix</Text>
            <Text style={styles.title}>{mix.title || 'Untitled mix'}</Text>
            <Text style={styles.subtitle}>
              {[mix.city, formatDuration(mix.duration_seconds), `${formatCompact(mix.play_count)} plays`].filter(Boolean).join(' · ')}
            </Text>
            {mix.description ? <Text style={styles.description}>{mix.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton} onPress={playMix}>
                <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Play mix</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={saveMix} disabled={saving}>
                <MaterialIcons name="library-music" size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryButtonText}>{saving ? 'Saving' : 'Save'}</Text>
              </Pressable>
            </View>

            <View style={styles.quickActions}>
              <Pressable style={styles.quickActionButton} onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'mix', mixId: mix.id, type: 'post' } } as any)}>
                <MaterialIcons name="post-add" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Post</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={shareMix}>
                <MaterialIcons name="ios-share" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Share</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={() => router.push('/library' as any)}>
                <MaterialIcons name="library-music" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Library</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Tracklist</Text>
            {tracklist.length === 0 ? <Text style={styles.emptyText}>No public tracklist yet.</Text> : null}
            {tracklist.map((item) => (
              <ListCard
                key={item.id}
                title={item.raw_title || `Track ${item.position}`}
                subtitle={item.raw_artist || 'Unknown artist'}
                meta={`Starts at ${formatDuration(item.start_seconds)}`}
                onPress={() => {
                  playMix();
                  if (item.start_seconds) setTimeout(() => seekTo(item.start_seconds || 0), 500);
                }}
              />
            ))}
          </>
        ) : !loading ? (
          <View style={styles.empty}>
            <Text style={styles.title}>Mix unavailable</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 14, paddingTop: 54, paddingBottom: 220 },
  backButton: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 310, borderRadius: 8, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#262626' },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 8, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 8, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickActionButton: { minHeight: 40, flexGrow: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.08)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickActionText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 24, marginBottom: 11 },
  emptyText: { color: '#AFAFAF', fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
