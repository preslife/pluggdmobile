import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { supabase } from '../../src/lib/supabase';
import { BeatItem, PLUGGD_ORANGE, formatGBP, toTrack } from '../../src/lib/mobileContent';

export default function BeatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, addToQueue } = usePlayback();
  const [beat, setBeat] = useState<BeatItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('beats')
        .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
        .eq('id', id)
        .maybeSingle();
      if (mounted) {
        setBeat(error ? null : (data as BeatItem | null));
        setLoading(false);
      }
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const track = beat ? toTrack(beat, 'beat') : null;

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

        {!loading && !beat ? (
          <View style={styles.empty}>
            <Text style={styles.title}>Beat unavailable</Text>
          </View>
        ) : null}

        {beat ? (
          <>
            <View style={styles.hero}>
              {beat.image_url ? <Image source={{ uri: beat.image_url }} style={styles.heroImage} /> : null}
              {!beat.image_url ? <MaterialIcons name="headphones" size={58} color={PLUGGD_ORANGE} /> : null}
            </View>
            <Text style={styles.eyebrow}>Market / Beats</Text>
            <Text style={styles.title}>{beat.title || 'Untitled beat'}</Text>
            <Text style={styles.subtitle}>{beat.producer_name || 'Producer'}</Text>

            <View style={styles.metaRow}>
              <Meta label="Price" value={formatGBP(beat.price)} />
              <Meta label="BPM" value={beat.bpm ? String(beat.bpm) : 'Any'} />
              <Meta label="Key" value={beat.key || 'Open'} />
            </View>

            {beat.description ? <Text style={styles.description}>{beat.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => {
                  if (track) playTrack(track);
                }}
              >
                <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Preview</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  if (track) addToQueue(track);
                }}
              >
                <MaterialIcons name="queue-music" size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryButtonText}>Queue</Text>
              </Pressable>
            </View>

            <View style={styles.licenseCard}>
              <Text style={styles.cardTitle}>Licensing</Text>
              <Text style={styles.cardBody}>
                Choose MP3 lease, premium WAV, stems, or exclusive licensing at checkout.
              </Text>
              <Pressable style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Start checkout</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },
  content: { padding: 14, paddingTop: 54, paddingBottom: 220 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: {
    height: 310,
    borderRadius: 8,
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginTop: 18 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 17, fontWeight: '800', marginTop: 5 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  metaCard: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 12 },
  metaLabel: { color: '#8E8E8E', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  metaValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 8, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 8, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontWeight: '900' },
  licenseCard: { marginTop: 16, borderRadius: 8, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 14 },
  cardTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  cardBody: { color: '#B8B8B8', fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 6 },
  buyButton: { marginTop: 13, height: 48, borderRadius: 8, backgroundColor: '#21130E', borderWidth: 1, borderColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  buyButtonText: { color: PLUGGD_ORANGE, fontSize: 15, fontWeight: '900' },
});
