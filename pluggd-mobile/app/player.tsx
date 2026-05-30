import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import { usePlayback } from '../src/context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { formatDuration } from '../src/lib/mobileContent';
import { toggleSavedContent } from '../src/features/culture/mobileServices';

const ORANGE = '#FF5A00';

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    currentTrack,
    queue,
    isPlaying,
    isBuffering,
    progress,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    toggleRepeat,
    toggleShuffle,
    shuffleMode,
    repeatMode,
  } = usePlayback();

  const title = String(currentTrack?.title || params.title || 'No track selected');
  const artist = String(currentTrack?.artist || params.artist || 'PLUGGD');
  const cover = String(currentTrack?.artwork || params.cover || '');
  const progressPercent = progress.duration > 0 ? Math.min((progress.position / progress.duration) * 100, 100) : 0;
  const scrubberWidth = Math.max(width - 32, 1);

  const handleScrub = (event: any) => {
    if (!progress.duration) return;
    const seekPosition = (event.nativeEvent.locationX / scrubberWidth) * progress.duration;
    seekTo(Math.max(0, Math.min(progress.duration, seekPosition)));
  };

  const handleShare = async () => {
    selectionHaptic();
    await Share.share({
      title,
      message: `Listen to ${title} by ${artist} on PLUGGD.`,
    });
  };

  const handleSave = async () => {
    selectionHaptic();

    if (!currentTrack) {
      Alert.alert('Nothing playing', 'Start a track first, then save it from the player.');
      return;
    }

    if (currentTrack.beatId) {
      const result = await toggleSavedContent('beat', currentTrack.beatId);
      if (!result.success) {
        if (result.error?.toLowerCase().includes('sign in')) router.push('/auth/login' as any);
        else Alert.alert('Save failed', result.error || 'This item could not be saved.');
        return;
      }
      Alert.alert(result.saved ? 'Saved' : 'Removed from saved', `${title} ${result.saved ? 'was added to' : 'was removed from'} your saved beats.`);
      return;
    }

    if (currentTrack.releaseId) {
      const result = await toggleSavedContent('release', currentTrack.releaseId);
      if (!result.success) {
        if (result.error?.toLowerCase().includes('sign in')) router.push('/auth/login' as any);
        else Alert.alert('Save failed', result.error || 'This release could not be saved.');
        return;
      }
      Alert.alert(result.saved ? 'Saved' : 'Removed from saved', `${title} ${result.saved ? 'was added to' : 'was removed from'} your saved releases.`);
      return;
    }

    if (currentTrack.mixId) {
      const result = await toggleSavedContent('mix', currentTrack.mixId);
      Alert.alert('Save unavailable', result.error || 'Open the mix page for library actions.');
      router.push(`/mixes/${currentTrack.mixId}` as any);
      return;
    }

    router.push('/library' as any);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#080808', '#0B0B0B', '#080808']} style={StyleSheet.absoluteFill} />
      {cover ? <Image source={{ uri: cover }} style={styles.backdrop} blurRadius={46} /> : null}
      <LinearGradient colors={['rgba(8,8,8,0.7)', '#080808']} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 46), paddingBottom: insets.bottom + 34 }]}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.topButton} onPress={() => router.back()}>
            <MaterialIcons name="expand-more" size={30} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>Now Playing</Text>
          <Pressable style={styles.topButton} onPress={handleShare}>
            <MaterialIcons name="ios-share" size={21} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.heroArt}>
          {cover ? <Image source={{ uri: cover }} style={styles.fill} /> : <MaterialIcons name="music-note" size={78} color="#3F2417" />}
        </View>

        <View style={styles.trackHeader}>
          <View style={styles.trackCopy}>
            <Text style={styles.trackTitle} numberOfLines={2}>{title}</Text>
            <Pressable onPress={() => currentTrack?.releaseId && router.push(`/release/${currentTrack.releaseId}` as any)}>
              <Text style={styles.trackArtist} numberOfLines={1}>{artist}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <MaterialIcons name="bookmark-border" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable style={styles.progressWrap} onPress={handleScrub}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(progress.position)}</Text>
          <Text style={styles.timeText}>{formatDuration(progress.duration)}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={toggleShuffle} style={styles.controlButton}>
            <MaterialIcons name="shuffle" size={23} color={shuffleMode === 'on' ? ORANGE : '#B3B3B3'} />
          </Pressable>
          <Pressable onPress={skipToPrevious} style={styles.skipButton}>
            <MaterialIcons name="skip-previous" size={38} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => {
              impactHaptic();
              togglePlayPause();
            }}
            style={styles.playButton}
          >
            <MaterialIcons name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'} size={44} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={skipToNext} style={styles.skipButton}>
            <MaterialIcons name="skip-next" size={38} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={toggleRepeat} style={styles.controlButton}>
            <MaterialIcons name={repeatMode === RepeatMode.Track ? 'repeat-one' : 'repeat'} size={23} color={repeatMode !== RepeatMode.Off ? ORANGE : '#B3B3B3'} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <PlayerAction icon="forum" label="Community" onPress={() => router.push('/backstage' as any)} />
          <PlayerAction icon="chat-bubble-outline" label="Comments" onPress={() => router.push('/backstage' as any)} />
          <PlayerAction icon="playlist-add" label="Queue" />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Queue</Text>
          {queue.length === 0 ? <Text style={styles.infoBody}>Queue will appear here as you keep listening.</Text> : null}
          {queue.slice(0, 8).map((track) => (
            <View key={track.id} style={styles.queueRow}>
              <View style={styles.queueDot} />
              <View style={styles.queueCopy}>
                <Text style={styles.queueTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.queueArtist} numberOfLines={1}>{track.artist}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Related culture</Text>
          <Text style={styles.infoBody}>
            Related releases, mixes, event threads, and community discussions will appear here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function PlayerAction({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress?: () => void }) {
  return (
    <Pressable
      style={styles.playerAction}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
    >
      <MaterialIcons name={icon} size={22} color={ORANGE} />
      <Text style={styles.playerActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080808' },
  backdrop: { ...StyleSheet.absoluteFillObject, opacity: 0.28 },
  content: { paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  topButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  heroArt: { aspectRatio: 1, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', backgroundColor: '#151515', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  trackHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 22 },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontWeight: '900' },
  trackArtist: { color: '#B3B3B3', fontSize: 17, fontWeight: '700', marginTop: 5 },
  saveButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  progressWrap: { height: 28, justifyContent: 'center', marginTop: 22 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 999, backgroundColor: ORANGE },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: '#737373', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 18 },
  controlButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  skipButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 76, height: 76, borderRadius: 38, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  playerAction: { flex: 1, minHeight: 70, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', alignItems: 'center', justifyContent: 'center', gap: 6 },
  playerActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  infoCard: { borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 14, marginBottom: 12 },
  infoTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginBottom: 7 },
  infoBody: { color: '#B3B3B3', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  queueDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  queueCopy: { flex: 1, minWidth: 0 },
  queueTitle: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  queueArtist: { color: '#737373', fontSize: 12, fontWeight: '700', marginTop: 2 },
});
