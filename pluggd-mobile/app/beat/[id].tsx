import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { toggleSavedContent } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { BeatItem, PLUGGD_ORANGE, formatGBP, toTrack } from '../../src/lib/mobileContent';

export default function BeatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, addToQueue } = usePlayback();
  const [beat, setBeat] = useState<BeatItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const licenseEntries = Array.isArray(beat?.available_licenses)
    ? beat.available_licenses
    : beat?.license_prices && typeof beat.license_prices === 'object'
      ? Object.entries(beat.license_prices as Record<string, unknown>).map(([label, value]) => ({ label, value }))
      : [];

  const saveBeat = async () => {
    if (!beat || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('beat', beat.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `${beat.title || 'Beat'} library state updated.` : result.error || 'Please try again.');
  };

  const shareBeat = async () => {
    if (!beat) return;
    await Share.share({ message: `PLUGGD beat: ${beat.title || 'Untitled beat'} by ${beat.producer_name || 'Producer'}` });
  };

  return (
    <PremiumScreenBackdrop tone="accent" style={styles.screen}>
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

            <View style={styles.quickActions}>
              <Pressable style={styles.quickActionButton} onPress={saveBeat} disabled={saving}>
                <MaterialIcons name="bookmark-border" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>{saving ? 'Saving' : 'Save'}</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'beat', beatId: beat.id, type: 'beat_feedback' } } as any)}>
                <MaterialIcons name="post-add" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Post</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={shareBeat}>
                <MaterialIcons name="ios-share" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Share</Text>
              </Pressable>
              <Pressable style={styles.quickActionButton} onPress={() => router.push('/market' as any)}>
                <MaterialIcons name="storefront" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Market</Text>
              </Pressable>
            </View>

            <View style={styles.licenseCard}>
              <Text style={styles.cardTitle}>Licensing</Text>
              {licenseEntries.length > 0 ? (
                <View style={styles.licenseList}>
                  {licenseEntries.slice(0, 4).map((entry: any, index) => (
                    <View key={`${entry?.label || entry?.type || index}`} style={styles.licenseRow}>
                      <Text style={styles.licenseName}>{String(entry?.label || entry?.type || `License ${index + 1}`).replace(/_/g, ' ')}</Text>
                      <Text style={styles.licensePrice}>{typeof entry?.value === 'number' ? formatGBP(entry.value) : typeof entry?.price === 'number' ? formatGBP(entry.price) : 'Available'}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.cardBody}>
                  Professional beat licensing is for tracks, campaigns, and projects you make outside PLUGGD. Review the available license types, save the beat, or share it with collaborators before you commit.
                </Text>
              )}
              <Pressable style={styles.licenseButton} onPress={saveBeat} disabled={saving}>
                <Text style={styles.licenseButtonText}>{saving ? 'Saving' : 'Save Beat'}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </PremiumScreenBackdrop>
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
  content: { padding: 16, paddingTop: 122, paddingBottom: 220 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: {
    height: 310,
    borderRadius: 18,
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#262626',
  },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'uppercase', marginTop: 18, letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  metaCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 12 },
  metaLabel: { color: '#8E8E8E', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'uppercase' },
  metaValue: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1, height: 54, borderRadius: 16, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  secondaryButton: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1, borderColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickActionButton: { minHeight: 40, flexGrow: 1, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.08)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickActionText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  licenseCard: { marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 14 },
  cardTitle: { color: '#FFFFFF', fontSize: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  cardBody: { color: '#B8B8B8', fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 6 },
  licenseList: { marginTop: 10, gap: 8 },
  licenseRow: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: '#262626', backgroundColor: '#1F1F2E', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  licenseName: { color: '#FFFFFF', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'capitalize' },
  licensePrice: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  licenseButton: { marginTop: 13, height: 48, borderRadius: 14, backgroundColor: '#21130E', borderWidth: 1, borderColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  licenseButtonText: { color: PLUGGD_ORANGE, fontSize: 15, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
});
