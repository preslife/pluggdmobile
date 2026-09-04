import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { RecoveryState } from '../../components/ContentUI';
import { PluggdImage } from '../../src/components/PluggdImage';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { impactHaptic } from '../../src/design/haptics';
import { loadPlaylistDetail, togglePlaylistFollow } from '../../src/features/culture/mobileServices';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function PlaylistDetailRoute() {
  const theme = usePluggdTheme();
  const styles = usePlaylistStyles();
  const bottomInset = useBottomChromeInset();
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
  const hasPlayableTracks = playableTracks.length > 0;

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
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/library' as any))}>
          <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
        </Pressable>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentFill} />
          </View>
        ) : null}

        {!query.isLoading && !playlist ? (
          <RecoveryState
            eyebrow="PLAYLIST OFFLINE"
            title="This sequence is out of rotation"
            body="It may be private, archived or available under a new link. Keep listening with another hand-picked selection."
            icon="playlist-play"
            primaryLabel="Open library"
            onPrimary={() => router.replace('/library' as any)}
            secondaryLabel="Go back"
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/library' as any))}
          />
        ) : null}

        {playlist ? (
          <>
            <View style={styles.hero}>
              {playlist.cover_url ? (
                <PluggdImage uri={playlist.cover_url} style={styles.heroImage} />
              ) : (
                <LinearGradient colors={['#2B1E18', '#171310']} style={StyleSheet.absoluteFill} />
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hasPlayableTracks ? 'Play playlist' : 'Playlist audio unavailable'}
                accessibilityState={{ disabled: !hasPlayableTracks }}
                style={[styles.primaryButton, !hasPlayableTracks && styles.disabled]}
                disabled={!hasPlayableTracks}
                onPress={playAll}
              >
                <MaterialIcons name="play-arrow" size={22} color={theme.colors.onAccent} />
                <Text style={styles.primaryText}>Play</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={follow}>
                <MaterialIcons name={playlist.followed ? 'check' : 'add'} size={20} color={theme.colors.accentText} />
                <Text style={styles.secondaryText}>{playlist.followed ? 'Following' : 'Follow'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Share playlist" style={styles.iconButton} onPress={() => Share.share({ message: `PLUGGD playlist: ${playlist.name}` })}>
                <MaterialIcons name="ios-share" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Tracks</Text>
            {playlist.tracks?.length ? (
              playlist.tracks.map((track, index) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${track.title}`} key={track.id} style={styles.trackRow} onPress={() => router.push(track.route as any)}>
                  <Text style={styles.trackIndex}>{index + 1}</Text>
                  <View style={styles.trackArtwork}>
                    {track.image_url ? <PluggdImage uri={track.image_url} style={styles.trackImage} /> : <MaterialIcons name="music-note" size={22} color={theme.colors.accentText} />}
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
                    <MaterialIcons name="play-arrow" size={18} color={theme.colors.onAccent} />
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

function usePlaylistStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingTop: 54, paddingBottom: 180 },
  backButton: { width: 44, height: 44, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loading: { minHeight: 360, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: theme.colors.text, fontSize: 24, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  hero: { height: 360, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.colors.artworkBase, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroCopy: { padding: 18 },
  eyebrow: { color: theme.colors.accentFill, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: theme.colors.mediaText, fontSize: 34, lineHeight: 38, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 5 },
  subtitle: { color: theme.colors.mediaTextMuted, fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 6 },
  description: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  primaryButton: { flex: 1, height: 48, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryText: { color: theme.colors.onAccent, fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondaryButton: { flex: 1, height: 48, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryText: { color: theme.colors.accentText, fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  iconButton: { width: 48, height: 48, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: theme.colors.text, fontSize: 22, fontFamily: pluggdFonts.displayBold, fontWeight: '700', marginTop: 26, marginBottom: 12 },
  trackRow: { minHeight: 68, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10, marginBottom: 9 },
  trackIndex: { width: 22, color: theme.colors.textMuted, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textAlign: 'center' },
  trackArtwork: { width: 46, height: 46, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center' },
  trackImage: { width: '100%', height: '100%' },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { color: theme.colors.text, fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  trackMeta: { color: theme.colors.textMuted, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 3 },
  trackPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.36 },
  emptyCard: { borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 16 },
  emptyCardText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  }), [theme]);
}
