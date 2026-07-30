import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { EditorialTitle, type EditorialSegment } from '../../components/EditorialTitle';
import { RecoveryState } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { toggleSavedContent } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { BeatItem, PLUGGD_ORANGE, formatGBP, toTrack } from '../../src/lib/mobileContent';

function accentLastWord(value?: string | null): EditorialSegment[] {
  const trimmed = (value || '').trim();
  if (!trimmed) return [{ text: value || '' }];
  const idx = trimmed.lastIndexOf(' ');
  if (idx < 0) return [{ text: trimmed, accent: true }];
  return [{ text: trimmed.slice(0, idx + 1) }, { text: trimmed.slice(idx + 1), accent: true }];
}

export default function BeatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, addToQueue } = usePlayback();
  const [beat, setBeat] = useState<BeatItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseOptions, setLicenseOptions] = useState<Array<{
    id: string;
    license_type: string;
    price: number;
  }>>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data, error }, { data: options }] = await Promise.all([
        supabase
          .from('beats')
          .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('licensing_options')
          .select('id,license_type,price')
          .eq('beat_id', id)
          .eq('is_available', true)
          .order('price', { ascending: true }),
      ]);
      if (mounted) {
        setBeat(error ? null : (data as BeatItem | null));
        setLicenseOptions((options ?? []) as Array<{ id: string; license_type: string; price: number }>);
        setLoading(false);
      }
    };
    if (id) load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const track = beat ? toTrack(beat, 'beat') : null;

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
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
          </View>
        ) : null}

        {!loading && !beat ? (
          <RecoveryState
            eyebrow="BEAT NOT FOUND"
            title="This beat has left the market"
            body="It may have been sold, archived or moved. Explore the current catalogue for another sound that fits."
            icon="queue-music"
            primaryLabel="Explore beats"
            onPrimary={() => router.replace('/market' as any)}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        ) : null}

        {beat ? (
          <>
            <View style={styles.hero}>
              {beat.image_url ? <Image source={{ uri: beat.image_url }} style={styles.heroImage} /> : null}
              {!beat.image_url ? <MaterialIcons name="headphones" size={58} color={PLUGGD_ORANGE} /> : null}
            </View>
            <Text style={styles.eyebrow}>Market / Beats</Text>
            <EditorialTitle segments={accentLastWord(beat.title || 'Untitled beat')} size={34} lineHeight={39} color="#FFFFFF" accentColor={PLUGGD_ORANGE} style={{ marginTop: 5 }} />
            <Text style={styles.subtitle}>{beat.producer_name || 'Producer'}</Text>

            <View style={styles.metaRow}>
              <Meta label="Price" value={formatGBP(beat.price)} />
              <Meta label="BPM" value={beat.bpm ? String(beat.bpm) : 'Any'} />
              <Meta label="Key" value={beat.key || 'Open'} />
            </View>

            {beat.description ? <Text style={styles.description}>{beat.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={track ? `Preview ${beat.title || 'beat'}` : 'Beat preview unavailable'}
                accessibilityState={{ disabled: !track }}
                disabled={!track}
                style={styles.primaryButton}
                onPress={() => {
                  if (track) playTrack(track);
                }}
              >
                <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Preview</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={track ? `Add ${beat.title || 'beat'} to queue` : 'Beat preview unavailable'}
                accessibilityState={{ disabled: !track }}
                disabled={!track}
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
              <Pressable accessibilityRole="button" accessibilityLabel="Save beat" accessibilityState={{ busy: saving }} style={styles.quickActionButton} onPress={saveBeat} disabled={saving}>
                <MaterialIcons name="bookmark-border" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>{saving ? 'Saving' : 'Save'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Post beat to community" style={styles.quickActionButton} onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'beat', beatId: beat.id, type: 'beat_feedback' } } as any)}>
                <MaterialIcons name="post-add" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Post</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Share beat" style={styles.quickActionButton} onPress={shareBeat}>
                <MaterialIcons name="ios-share" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Share</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Open Market" style={styles.quickActionButton} onPress={() => router.push('/market' as any)}>
                <MaterialIcons name="storefront" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Market</Text>
              </Pressable>
            </View>

            <View style={styles.licenseCard}>
              <Text style={styles.licenseEyebrow}>PROFESSIONAL USE</Text>
              <Text style={styles.cardTitle}>Choose the rights your project needs.</Text>
              <Text style={styles.cardBody}>
                Every tier is priced and validated by PLUGGD. You will review usage rights, restrictions, files, territory, term and licence terms before payment.
              </Text>
              {licenseOptions.length > 0 ? (
                <View style={styles.licenseList}>
                  {licenseOptions.map((option, index) => (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Review ${option.license_type.replace(/_/g, ' ')} licence, ${formatGBP(option.price)}`}
                      style={styles.licenseRow}
                      onPress={() => router.push({
                        pathname: '/commerce/license-preview',
                        params: { beatId: beat.id, licenseOptionId: option.id },
                      } as any)}
                    >
                      <Text style={styles.licenseIndex}>{String(index + 1).padStart(2, '0')}</Text>
                      <View style={styles.licenseCopy}>
                        <Text style={styles.licenseName}>{option.license_type.replace(/_/g, ' ')}</Text>
                        <Text style={styles.licenseHint}>Review rights and licence agreement</Text>
                      </View>
                      <Text style={styles.licensePrice}>{formatGBP(option.price)}</Text>
                      <MaterialIcons name="arrow-forward" size={18} color={PLUGGD_ORANGE} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.cardBody}>
                  This producer has not published a licence tier for this beat. Save it to your library and check back later.
                </Text>
              )}
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
  screen: { flex: 1, backgroundColor: '#0a0806' },
  content: { padding: 16, paddingTop: 54, paddingBottom: 220 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: '#171310',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: {
    height: 310,
    borderRadius: 6,
    backgroundColor: '#171310',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'uppercase', marginTop: 18, letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  metaRow: { flexDirection: 'row', marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2723' },
  metaCard: { flex: 1, paddingVertical: 13, paddingRight: 8 },
  metaLabel: { color: '#8E8E8E', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'uppercase' },
  metaValue: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1.35, height: 54, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  secondaryButton: { flex: 0.65, height: 54, borderRadius: 5, borderWidth: 1, borderColor: '#54463C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  quickActions: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2723' },
  quickActionButton: { minHeight: 48, flex: 1, paddingHorizontal: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickActionText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  licenseCard: { marginTop: 28, borderTopWidth: 1, borderColor: '#2B2723', paddingTop: 18 },
  licenseEyebrow: { color: PLUGGD_ORANGE, fontSize: 10, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  cardTitle: { color: '#FFFFFF', fontSize: 23, lineHeight: 28, fontFamily: pluggdFonts.displayBold, marginTop: 7 },
  cardBody: { color: '#B8B8B8', fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 6 },
  licenseList: { marginTop: 16, borderTopWidth: 1, borderColor: '#2B2723' },
  licenseRow: { minHeight: 70, borderBottomWidth: 1, borderColor: '#2B2723', flexDirection: 'row', alignItems: 'center', gap: 10 },
  licenseIndex: { width: 22, color: '#716961', fontSize: 9, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  licenseCopy: { flex: 1, minWidth: 0 },
  licenseName: { color: '#FFFFFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'capitalize' },
  licenseHint: { color: '#8E8782', fontSize: 11, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  licensePrice: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
});
