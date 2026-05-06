import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ListCard } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { supabase } from '../../src/lib/supabase';
import { PLUGGD_ORANGE, SampleItem, SamplePackItem, formatGBP, toTrack } from '../../src/lib/mobileContent';

export default function SamplePackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, playQueue } = usePlayback();
  const [pack, setPack] = useState<SamplePackItem | null>(null);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [packRes, samplesRes] = await Promise.all([
        (supabase as any)
          .from('sample_packs')
          .select('id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at')
          .eq('id', id)
          .maybeSingle(),
        (supabase as any)
          .from('sample_pack_samples')
          .select('id,sample_pack_id,title,file_url,category,bpm,musical_key,duration_seconds,is_preview,sort_order')
          .eq('sample_pack_id', id)
          .order('sort_order', { ascending: true })
          .limit(80),
      ]);
      if (!mounted) return;
      setPack(packRes.error ? null : (packRes.data as SamplePackItem | null));
      setSamples(Array.isArray(samplesRes.data) ? (samplesRes.data as SampleItem[]) : []);
      setLoading(false);
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const playPreview = () => {
    if (!pack) return;
    const packTrack = toTrack(pack, 'sample_pack');
    if (packTrack) {
      playTrack(packTrack);
      return;
    }
    const sampleTracks = samples.map((sample) => toTrack(sample, 'sample')).filter(Boolean);
    if (sampleTracks.length) playQueue(sampleTracks as any);
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

        {pack ? (
          <>
            <View style={styles.hero}>
              {pack.cover_art_url ? <Image source={{ uri: pack.cover_art_url }} style={styles.heroImage} /> : null}
              {!pack.cover_art_url ? <MaterialIcons name="graphic-eq" size={58} color={PLUGGD_ORANGE} /> : null}
            </View>
            <Text style={styles.eyebrow}>Sample Pack</Text>
            <Text style={styles.title}>{pack.title || 'Untitled pack'}</Text>
            <Text style={styles.subtitle}>
              {pack.genre || 'Samples'} · {pack.bpm_range || 'Any BPM'} · {formatGBP(pack.price)}
            </Text>
            {pack.description ? <Text style={styles.description}>{pack.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable style={styles.primaryButton} onPress={playPreview}>
                <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Preview pack</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton}>
                <MaterialIcons name="shopping-bag" size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryButtonText}>{pack.price ? 'Buy pack' : 'Claim pack'}</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Samples</Text>
            {samples.length === 0 ? <Text style={styles.emptyText}>No public sample previews yet.</Text> : null}
            {samples.map((sample) => (
              <ListCard
                key={sample.id}
                title={sample.title}
                subtitle={[sample.category, sample.bpm ? `${sample.bpm} BPM` : null, sample.musical_key].filter(Boolean).join(' · ')}
                meta={sample.is_preview ? 'Preview available' : 'Pack purchase required'}
                onPlay={() => {
                  const track = toTrack(sample, 'sample');
                  if (track) playTrack(track);
                }}
              />
            ))}
          </>
        ) : !loading ? (
          <View style={styles.empty}>
            <Text style={styles.title}>Pack unavailable</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 16, paddingTop: 122, paddingBottom: 220 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 310, borderRadius: 18, backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#262626' },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 18, letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 16, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontWeight: '800' },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 24, marginBottom: 11 },
  emptyText: { color: '#AFAFAF', fontSize: 14, fontWeight: '700' },
});
