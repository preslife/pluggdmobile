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
import { PLUGGD_ORANGE, SampleItem, SamplePackItem, formatGBP, toTrack } from '../../src/lib/mobileContent';

export default function SamplePackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, playQueue } = usePlayback();
  const [pack, setPack] = useState<SamplePackItem | null>(null);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handlePackAccess = async () => {
    if (!pack || claiming) return;

    const price = Number(pack.price ?? 0);

    if (price > 0) {
      Alert.alert(
        'Use PLUGGD credits',
        'Add credits in Wallet, then return here to unlock eligible sample packs.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Wallet', onPress: () => router.push('/wallet' as any) },
        ],
      );
      return;
    }

    setClaiming(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login' as any);
        return;
      }

      const { data: existing, error: existingError } = await (supabase as any)
        .from('sample_pack_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('sample_pack_id', pack.id)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') throw existingError;

      if (!existing) {
        const { error } = await (supabase as any).from('sample_pack_purchases').insert({
          user_id: user.id,
          sample_pack_id: pack.id,
          amount_paid: 0,
          download_url: pack.download_url ?? null,
        });

        if (error) throw error;
      }

      Alert.alert('Pack added', 'This free sample pack is now in your purchases.', [
        { text: 'View Purchases', onPress: () => router.push('/purchases' as any) },
        { text: 'Done', style: 'cancel' },
      ]);
    } catch (error: any) {
      Alert.alert('Pack unavailable', error?.message ?? 'Could not claim this pack right now.');
    } finally {
      setClaiming(false);
    }
  };

  const savePack = async () => {
    if (!pack || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('sample_pack', pack.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `${pack.title || 'Sample pack'} library state updated.` : result.error || 'Please try again.');
  };

  const sharePack = async () => {
    if (!pack) return;
    await Share.share({ message: `PLUGGD sample pack: ${pack.title || 'Untitled pack'}` });
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
              <Pressable style={[styles.secondaryButton, claiming && styles.disabledButton]} onPress={handlePackAccess} disabled={claiming}>
                {claiming ? <ActivityIndicator color={PLUGGD_ORANGE} /> : <MaterialIcons name="shopping-bag" size={20} color={PLUGGD_ORANGE} />}
                <Text style={styles.secondaryButtonText}>{pack.price ? 'Use credits' : 'Claim pack'}</Text>
              </Pressable>
            </View>

            <View style={styles.quickActions}>
              <Pressable style={styles.quickActionButton} onPress={savePack} disabled={saving}>
                <MaterialIcons name="bookmark-border" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>{saving ? 'Saving' : 'Save'}</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={() => router.push('/create-post' as any)}>
                <MaterialIcons name="post-add" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Post</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={sharePack}>
                <MaterialIcons name="ios-share" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Share</Text>
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
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'uppercase', marginTop: 18, letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 16, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickActionButton: { minHeight: 40, flexGrow: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.08)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickActionText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  disabledButton: { opacity: 0.62 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 24, marginBottom: 11 },
  emptyText: { color: '#AFAFAF', fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
