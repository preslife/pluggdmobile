import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { impactHaptic } from '../../src/design/haptics';
import { loadPlaylistDetail, togglePlaylistFollow } from '../../src/features/culture/mobileServices';
import { PLUGGD_ORANGE } from '../../src/lib/mobileContent';

export default function PlaylistDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { playQueue, playTrack } = usePlayback();
  const query = useQuery({
    queryKey: ['culture', 'playlist-detail', id],
    queryFn: () => loadPlaylistDetail(String(id)),
    enabled: Boolean(id),
  });
  const playlist = query.data;
  const playableTracks = (playlist?.tracks || []).filter((track) => track.audio_url);

  const playAll = () => {
    if (!playableTracks.length) {
      Alert.alert('Playback unavailable', 'This playlist does not expose playable mobile audio yet.');
      return;
    }
    impactHaptic();
    playQueue(
      playableTracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.creator || playlist?.owner_name || 'PLUGGD',
        artwork: track.image_url || playlist?.cover_url || undefined,
        url: track.audio_url || '',
        kind: 'release',
      })) as any,
    );
  };

  const follow = async () => {
    if (!playlist) return;
    const result = await togglePlaylistFollow(playlist.id);
    if (!result.success) {
      Alert.alert('Follow unavailable', result.error || 'Playlist follows are not available yet.');
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['culture', 'playlist-detail', id] });
    Alert.alert(result.followed ? 'Following playlist' : 'Playlist removed', `${playlist.name} library state updated.`);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
          </View>
        ) : null}

        {!query.isLoading && !playlist ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Playlist unavailable</Text>
            <Text style={styles.emptyText}>This playlist is private, removed, or unavailable.</Text>
          </View>
        ) : null}

        {playlist ? (
          <>
            <View style={styles.hero}>
              {playlist.cover_url ? (
                <PluggdImage uri={playlist.cover_url} style={styles.heroImage} />
              ) : (
                <LinearGradient colors={['#2B1E18', '#12121A']} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={StyleSheet.absoluteFill} />
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>PLAYLIST</Text>
                <Text style={styles.title}>{playlist.name}</Text>
                <Text style={styles.subtitle}>
                  {playlist.owner_name || 'PLUGGD'} · {playlist.tracks?.length ?? playlist.track_count ?? 0} tracks
                </Text>
              </View>
            </View>

            {playlist.description ? <Text style={styles.description}>{playlist.description}</Text> : null}

            <View style={styles.actions}>
              <Pressable style={styles.primaryButton} onPress={playAll}>
                <MaterialIcons name="play-arrow" size={22} color="#08080C" />
                <Text style={styles.primaryText}>Play</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={follow}>
                <MaterialIcons name={playlist.followed ? 'check' : 'add'} size={20} color={PLUGGD_ORANGE} />
                <Text style={styles.secondaryText}>{playlist.followed ? 'Following' : 'Follow'}</Text>
              </Pressable>
              <Pressable style={styles.iconButton} onPress={() => Share.share({ message: `PLUGGD playlist: ${playlist.name}` })}>
                <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Tracks</Text>
            {playlist.tracks?.length ? (
              playlist.tracks.map((track, index) => (
                <Pressable key={track.id} style={styles.trackRow} onPress={() => router.push(track.route as any)}>
                  <Text style={styles.trackIndex}>{index + 1}</Text>
                  <View style={styles.trackArtwork}>
                    {track.image_url ? <PluggdImage uri={track.image_url} style={styles.trackImage} /> : <MaterialIcons name="music-note" size={22} color={PLUGGD_ORANGE} />}
                  </View>
                  <View style={styles.trackCopy}>
                    <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.trackMeta} numberOfLines={1}>{track.creator || 'PLUGGD'}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${track.title}`}
                    style={[styles.trackPlay, !track.audio_url && styles.disabled]}
                    disabled={!track.audio_url}
                    onPress={(event) => {
                      event.stopPropagation();
                      if (!track.audio_url) return;
                      impactHaptic();
                      playTrack({
                        id: track.id,
                        title: track.title,
                        artist: track.creator || playlist.owner_name || 'PLUGGD',
                        artwork: track.image_url || playlist.cover_url || undefined,
                        url: track.audio_url,
                        kind: 'release',
                      } as any);
                    }}
                  >
                    <MaterialIcons name="play-arrow" size={18} color="#08080C" />
                  </Pressable>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardText}>Tracks will appear here when this playlist has items.</Text>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080C' },
  content: { padding: 16, paddingTop: 54, paddingBottom: 180 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loading: { minHeight: 360, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: '#FFFFFF', fontSize: 24, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  emptyText: { color: '#B3B3B3', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  hero: { height: 360, borderRadius: 22, overflow: 'hidden', backgroundColor: '#12121A', borderWidth: 1, borderColor: '#262626', justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroCopy: { padding: 18 },
  eyebrow: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 5 },
  subtitle: { color: '#B3B3B3', fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 6 },
  description: { color: '#DADAE0', fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  primaryButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: PLUGGD_ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryText: { color: '#08080C', fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondaryButton: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,90,0,0.5)', backgroundColor: 'rgba(255,90,0,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryText: { color: PLUGGD_ORANGE, fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 26, marginBottom: 12 },
  trackRow: { minHeight: 68, borderRadius: 18, backgroundColor: '#12121A', borderWidth: 1, borderColor: '#262626', flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, marginBottom: 9 },
  trackIndex: { width: 22, color: '#737373', fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textAlign: 'center' },
  trackArtwork: { width: 46, height: 46, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  trackImage: { width: '100%', height: '100%' },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  trackMeta: { color: '#8E8E9F', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 3 },
  trackPlay: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.36 },
  emptyCard: { borderRadius: 16, backgroundColor: '#12121A', borderWidth: 1, borderColor: '#262626', padding: 16 },
  emptyCardText: { color: '#B3B3B3', fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
