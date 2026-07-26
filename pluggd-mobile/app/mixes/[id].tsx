import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ListCard } from '../../components/ContentUI';
import { DetailTitle } from '../../components/DetailTitle';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { useListeningRoomOrientation } from '../../src/lib/orientation';
import { ed, edFonts } from '../../src/design/editorial';
import { toggleSavedContent } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { MixItem, MixTrackItem, PLUGGD_ORANGE, formatCompact, formatDuration, toTrack } from '../../src/lib/mobileContent';

export default function MixDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, seekTo, currentTrack, isPlaying, togglePlayPause, progress } = usePlayback();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  // Turning the phone sideways enters the wide listening-room layout.
  useListeningRoomOrientation();
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

  const isThisMixPlaying = Boolean(mix && currentTrack?.mixId === mix.id);
  const playedRatio =
    isThisMixPlaying && progress.duration > 0 ? Math.min(1, progress.position / progress.duration) : 0;

  if (isLandscape && mix) {
    return (
      <View style={styles.roomScreen}>
        <StatusBar style="light" hidden />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.roomArtPane}>
          {mix.cover_url ? (
            <Image source={{ uri: mix.cover_url }} style={styles.roomArt} resizeMode="cover" />
          ) : (
            <MaterialIcons name="headphones" size={64} color={PLUGGD_ORANGE} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.roomBack}
          >
            <MaterialIcons name="chevron-left" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.roomPane}>
          <Text style={styles.roomEyebrow}>LISTENING ROOM</Text>
          <Text style={styles.roomTitle} numberOfLines={2}>{mix.title || 'Untitled mix'}</Text>
          <Text style={styles.roomMeta}>
            {[mix.city, formatDuration(mix.duration_seconds), `${formatCompact(mix.play_count)} plays`]
              .filter(Boolean)
              .join('  ·  ')
              .toUpperCase()}
          </Text>
          <View style={styles.roomWaveRow}>
            {Array.from({ length: 52 }).map((_, index) => {
              const wave = Math.abs(Math.sin((index + 4) * 1.35)) * 0.82 + 0.18;
              const played = index / 52 <= playedRatio;
              return (
                <View
                  key={index}
                  style={{
                    width: 3,
                    borderRadius: 1.5,
                    height: Math.max(5, wave * 44),
                    backgroundColor: played ? PLUGGD_ORANGE : 'rgba(255,248,237,0.24)',
                  }}
                />
              );
            })}
          </View>
          <View style={styles.roomTimeRow}>
            <Text style={styles.roomTime}>{isThisMixPlaying ? formatDuration(progress.position) : '0:00'}</Text>
            <Text style={styles.roomTime}>{formatDuration(mix.duration_seconds)}</Text>
          </View>
          <View style={styles.roomControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isThisMixPlaying && isPlaying ? 'Pause mix' : 'Play mix'}
              onPress={() => {
                if (isThisMixPlaying) togglePlayPause();
                else playMix();
              }}
              style={({ pressed }) => [styles.roomPlay, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}
            >
              <MaterialIcons name={isThisMixPlaying && isPlaying ? 'pause' : 'play-arrow'} size={38} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save mix"
              onPress={saveMix}
              style={({ pressed }) => [styles.roomGhost, pressed && { opacity: 0.86 }]}
            >
              <MaterialIcons name="library-music" size={22} color={ed.cream} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share mix"
              onPress={shareMix}
              style={({ pressed }) => [styles.roomGhost, pressed && { opacity: 0.86 }]}
            >
              <MaterialIcons name="ios-share" size={21} color={ed.cream} />
            </Pressable>
          </View>
          {tracklist.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomTracklist}
            >
              {tracklist.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${item.raw_title || `track ${item.position}`}`}
                  onPress={() => {
                    playMix();
                    if (item.start_seconds) setTimeout(() => seekTo(item.start_seconds || 0), 500);
                  }}
                  style={({ pressed }) => [styles.roomTrackChip, pressed && { opacity: 0.86 }]}
                >
                  <Text style={styles.roomTrackNumber}>{String(item.position).padStart(2, '0')}</Text>
                  <Text style={styles.roomTrackTitle} numberOfLines={1}>
                    {item.raw_title || `Track ${item.position}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
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

        {mix ? (
          <>
            <View style={styles.hero}>
              {mix.cover_url ? <Image source={{ uri: mix.cover_url }} style={styles.heroImage} /> : null}
              {!mix.cover_url ? <MaterialIcons name="headphones" size={58} color={PLUGGD_ORANGE} /> : null}
            </View>
            <Text style={styles.eyebrow}>Mix</Text>
            <DetailTitle title={mix.title || 'Untitled mix'} accentColor={PLUGGD_ORANGE} style={{ marginTop: 5 }} />
            <Text style={styles.subtitle}>
              {[mix.city, formatDuration(mix.duration_seconds), `${formatCompact(mix.play_count)} plays`].filter(Boolean).join(' · ')}
            </Text>
            {mix.description ? <Text style={styles.description}>{mix.description}</Text> : null}

            <View style={styles.buttonRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Play ${mix.title || 'mix'}`} accessibilityState={{ disabled: !mix.audio_url }} disabled={!mix.audio_url} style={styles.primaryButton} onPress={playMix}>
                <MaterialIcons name="play-arrow" size={22} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Play mix</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Save mix" accessibilityState={{ busy: saving }} style={styles.secondaryButton} onPress={saveMix} disabled={saving}>
                <MaterialIcons name="library-music" size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryButtonText}>{saving ? 'Saving' : 'Save'}</Text>
              </Pressable>
            </View>

            <View style={styles.quickActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Post mix to community" style={styles.quickActionButton} onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'mix', mixId: mix.id, type: 'post' } } as any)}>
                <MaterialIcons name="post-add" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Post</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Share mix" style={styles.quickActionButton} onPress={shareMix}>
                <MaterialIcons name="ios-share" size={19} color={PLUGGD_ORANGE} />
                <Text style={styles.quickActionText}>Share</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Open library" style={styles.quickActionButton} onPress={() => router.push('/library' as any)}>
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
  screen: { flex: 1, backgroundColor: '#0a0806' },
  roomScreen: { flex: 1, flexDirection: 'row', backgroundColor: '#070605' },
  roomArtPane: { width: '42%', backgroundColor: '#171310', alignItems: 'center', justifyContent: 'center' },
  roomArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  roomBack: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(7,6,5,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomPane: { flex: 1, paddingHorizontal: 28, paddingVertical: 20, justifyContent: 'center', gap: 8 },
  roomEyebrow: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 2.2, color: PLUGGD_ORANGE },
  roomTitle: { fontFamily: edFonts.serif, fontSize: 32, lineHeight: 35, color: ed.cream, letterSpacing: -0.5 },
  roomMeta: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: 'rgba(255,248,237,0.55)' },
  roomWaveRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 48, marginTop: 12, overflow: 'hidden' },
  roomTimeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  roomTime: { fontFamily: edFonts.mono, fontSize: 10, color: 'rgba(255,248,237,0.5)', fontVariant: ['tabular-nums'] },
  roomControls: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  roomPlay: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomGhost: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomTracklist: { gap: 8, paddingTop: 14, paddingRight: 20 },
  roomTrackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 13,
    maxWidth: 230,
  },
  roomTrackNumber: { fontFamily: edFonts.mono, fontSize: 9.5, color: PLUGGD_ORANGE },
  roomTrackTitle: { fontFamily: 'Satoshi-Bold', fontSize: 12.5, color: ed.cream, flexShrink: 1 },
  content: { padding: 14, paddingTop: 54, paddingBottom: 220 },
  backButton: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#171310', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 310, borderRadius: 6, backgroundColor: '#171310', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textTransform: 'uppercase', marginTop: 18 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#B8B8B8', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  description: { color: '#D4D4D4', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 18 },
  buttonRow: { flexDirection: 'row', gap: 9, marginTop: 20 },
  primaryButton: { flex: 1.25, height: 54, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  secondaryButton: { flex: 0.75, height: 54, borderRadius: 5, borderWidth: 1, borderColor: '#54463C', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryButtonText: { color: PLUGGD_ORANGE, fontSize: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  quickActions: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2B2723' },
  quickActionButton: { minHeight: 48, flex: 1, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  quickActionText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: pluggdFonts.displayBold, fontWeight: '700', marginTop: 24, marginBottom: 11 },
  emptyText: { color: '#AFAFAF', fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
