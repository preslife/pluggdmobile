import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { edFonts } from '../src/design/editorial';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import { usePlayback } from '../src/context/PlaybackProvider';
import { useListeningRoomOrientation } from '../src/lib/orientation';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { formatDuration } from '../src/lib/mobileContent';
import { toggleSavedContent } from '../src/features/culture/mobileServices';

const ORANGE = '#ff6600';

export default function PlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
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

  // The player is a listening room: rotating the phone enters the wide layout.
  useListeningRoomOrientation();
  const title = String(currentTrack?.title || params.title || 'No track selected');
  const artist = String(currentTrack?.artist || params.artist || 'PLUGGD');
  const cover = String(currentTrack?.artwork || params.cover || '');
  const progressPercent = progress.duration > 0 ? Math.min((progress.position / progress.duration) * 100, 100) : 0;
  const scrubberWidth = Math.max(width - 32, 1);
  const scrollRef = useRef<ScrollView>(null);
  const queueOffset = useRef(0);
  const sourceRoute = currentTrack?.releaseId
    ? `/release/${currentTrack.releaseId}`
    : currentTrack?.mixId
      ? `/mixes/${currentTrack.mixId}`
      : currentTrack?.beatId
        ? `/beat/${currentTrack.beatId}`
        : null;
  const sourceLabel = currentTrack?.mixId ? 'mix' : currentTrack?.beatId ? 'beat' : 'release';

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

  if (isLandscape) {
    return (
      <View style={styles.roomScreen}>
        <StatusBar style="light" hidden />
        <Stack.Screen options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
        <View style={styles.roomArtPane}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.roomArt} resizeMode="cover" />
          ) : (
            <MaterialIcons name="music-note" size={72} color="#3F2417" />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close player"
            onPress={() => router.back()}
            style={styles.roomBack}
          >
            <MaterialIcons name="expand-more" size={28} color="#FFFFFF" />
          </Pressable>
        </View>
        <View style={styles.roomPane}>
          <Text style={styles.topTitle}>NOW PLAYING</Text>
          <Text style={styles.roomTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{artist}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Seek playback" style={styles.progressWrap} onPress={handleScrub}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatDuration(progress.position)}</Text>
            <Text style={styles.timeText}>{formatDuration(progress.duration)}</Text>
          </View>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Toggle shuffle" accessibilityState={{ selected: shuffleMode === 'on' }} onPress={toggleShuffle} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86 }]}>
              <MaterialIcons name="shuffle" size={22} color={shuffleMode === 'on' ? ORANGE : '#B3B3B3'} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous track" onPress={skipToPrevious} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86 }]}>
              <MaterialIcons name="skip-previous" size={34} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause media' : 'Play media'}
              onPress={() => {
                impactHaptic();
                togglePlayPause();
              }}
              style={({ pressed }) => [styles.roomPlayButton, pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }]}
            >
              <MaterialIcons name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'} size={40} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next track" onPress={skipToNext} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86 }]}>
              <MaterialIcons name="skip-next" size={34} color="#FFFFFF" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Toggle repeat" accessibilityState={{ selected: repeatMode !== RepeatMode.Off }} onPress={toggleRepeat} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86 }]}>
              <MaterialIcons name={repeatMode === RepeatMode.Track ? 'repeat-one' : 'repeat'} size={22} color={repeatMode !== RepeatMode.Off ? ORANGE : '#B3B3B3'} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#0a0806', '#120d08', '#0a0806']} style={StyleSheet.absoluteFill} />
      {cover ? <Image source={{ uri: cover }} style={styles.backdrop} blurRadius={46} /> : null}
      <LinearGradient colors={['rgba(8,8,8,0.7)', '#0a0806']} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 46), paddingBottom: insets.bottom + 34 }]}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close player" style={({ pressed }) => [styles.topButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]} onPress={() => router.back()}>
            <MaterialIcons name="expand-more" size={30} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>Now Playing</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Share current track" style={({ pressed }) => [styles.topButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]} onPress={handleShare}>
            <MaterialIcons name="ios-share" size={21} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.heroArt}>
          {cover ? <Image source={{ uri: cover }} style={styles.fill} /> : <MaterialIcons name="music-note" size={78} color="#3F2417" />}
        </View>

        <View style={styles.trackHeader}>
          <View style={styles.trackCopy}>
            <Text style={styles.trackTitle} numberOfLines={2}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${artist}`} onPress={() => currentTrack?.releaseId && router.push(`/release/${currentTrack.releaseId}` as any)}>
              <Text style={styles.trackArtist} numberOfLines={1}>{artist}</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Save current track" style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]} onPress={handleSave}>
            <MaterialIcons name="bookmark-border" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Seek playback" style={styles.progressWrap} onPress={handleScrub}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(progress.position)}</Text>
          <Text style={styles.timeText}>{formatDuration(progress.duration)}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle shuffle" accessibilityState={{ selected: shuffleMode === 'on' }} onPress={toggleShuffle} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name="shuffle" size={23} color={shuffleMode === 'on' ? ORANGE : '#B3B3B3'} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous track" onPress={skipToPrevious} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name="skip-previous" size={38} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause media' : 'Play media'}
            onPress={() => {
              impactHaptic();
              togglePlayPause();
            }}
            style={({ pressed }) => [styles.playButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}
          >
            <MaterialIcons name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'} size={44} color="#FFFFFF" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next track" onPress={skipToNext} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name="skip-next" size={38} color="#FFFFFF" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle repeat" accessibilityState={{ selected: repeatMode !== RepeatMode.Off }} onPress={toggleRepeat} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name={repeatMode === RepeatMode.Track ? 'repeat-one' : 'repeat'} size={23} color={repeatMode !== RepeatMode.Off ? ORANGE : '#B3B3B3'} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <PlayerAction icon="forum" label="Scene" accessibilityLabel="Community" onPress={() => router.push('/backstage' as any)} />
          <PlayerAction icon="chat-bubble-outline" label="Talk" accessibilityLabel="Comments" onPress={() => router.push('/backstage' as any)} />
          <PlayerAction icon="playlist-add" label="Queue" onPress={() => scrollRef.current?.scrollTo({ y: queueOffset.current, animated: true })} />
        </View>

        <View
          style={styles.queueSection}
          onLayout={(event) => {
            queueOffset.current = event.nativeEvent.layout.y;
            if (String(params.focus || '') === 'queue') {
              requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({ y: Math.max(0, queueOffset.current - 12), animated: true });
              });
            }
          }}
        >
          <View style={styles.sectionHead}><Text style={styles.sectionKicker}>UP NEXT</Text><Text style={styles.queueCount}>{String(queue.length).padStart(2, '0')} TRACKS</Text></View>
          <Text style={styles.infoTitle}>Keep the signal moving</Text>
          {queue.length === 0 ? <Text style={styles.infoBody}>Queue will appear here as you keep listening.</Text> : null}
          {queue.slice(0, 8).map((track, index) => (
            <View key={track.id} style={styles.queueRow}>
              <Text style={styles.queueIndex}>{String(index + 1).padStart(2, '0')}</Text>
              {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.queueArt} /> : <View style={[styles.queueArt, styles.queueArtFallback]}><MaterialIcons name="music-note" size={18} color={ORANGE} /></View>}
              <View style={styles.queueCopy}>
                <Text style={styles.queueTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.queueArtist} numberOfLines={1}>{track.artist}</Text>
              </View>
              {currentTrack?.id === track.id ? <MaterialIcons name="graphic-eq" size={18} color={ORANGE} /> : null}
            </View>
          ))}
        </View>

        {sourceRoute ? <Pressable accessibilityRole="button" accessibilityLabel={`Open source for ${title}`} onPress={() => router.push(sourceRoute as any)} style={styles.sourceCard}>{cover ? <Image source={{ uri: cover }} style={styles.sourceImage} /> : null}<LinearGradient colors={['rgba(6,5,4,0.25)', 'rgba(6,5,4,0.94)']} style={StyleSheet.absoluteFill} /><Text style={styles.sourceKicker}>FROM THE CATALOGUE</Text><View><Text style={styles.sourceTitle}>Go deeper into this {sourceLabel}</Text><Text style={styles.sourceMeta}>Support, track context and creator details →</Text></View></Pressable> : null}
      </ScrollView>
    </View>
  );
}

function PlayerAction({ icon, label, accessibilityLabel, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; accessibilityLabel?: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [styles.playerAction, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
    >
      <MaterialIcons name={icon} size={22} color={ORANGE} />
      <Text style={styles.playerActionText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },
  roomScreen: { flex: 1, flexDirection: 'row', backgroundColor: '#070605' },
  roomArtPane: { width: '44%', backgroundColor: '#171310', alignItems: 'center', justifyContent: 'center' },
  roomArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  roomBack: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(7,6,5,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomPane: { flex: 1, paddingHorizontal: 26, paddingVertical: 18, justifyContent: 'center', gap: 6 },
  roomPlayButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { ...StyleSheet.absoluteFillObject, opacity: 0.28 },
  content: { paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  topButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: 'rgba(255,248,237,0.72)', fontSize: 10.5, fontFamily: edFonts.mono, letterSpacing: 2, textTransform: 'uppercase' },
  heroArt: { aspectRatio: 1, borderRadius: 6, backgroundColor: '#171310', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  trackHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 22 },
  trackCopy: { flex: 1, minWidth: 0 },
  roomTitle: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontFamily: pluggdFonts.displayExtraBold, letterSpacing: -0.8 },
  trackTitle: { color: '#FFFFFF', fontSize: 31, lineHeight: 36, fontFamily: pluggdFonts.displayExtraBold, letterSpacing: -0.9 },
  trackArtist: { color: '#B3B3B3', fontSize: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  saveButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  progressWrap: { height: 28, justifyContent: 'center', marginTop: 22 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 999, backgroundColor: ORANGE },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: 'rgba(255,248,237,0.5)', fontSize: 10.5, fontFamily: edFonts.mono, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 18 },
  controlButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  skipButton: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 76, height: 76, borderRadius: 38, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  actionRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#302B25', marginBottom: 22 },
  playerAction: { width: 82, minHeight: 70, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 5 },
  playerActionText: { width: '100%', color: '#FFFFFF', fontSize: 11, lineHeight: 14, textAlign: 'center', fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  queueSection: { marginBottom: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionKicker: { color: ORANGE, fontSize: 9, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.3 },
  queueCount: { color: '#756E64', fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.1 },
  infoTitle: { color: '#fff8ed', fontSize: 21, fontFamily: pluggdFonts.displayBold, marginBottom: 7 },
  infoBody: { color: '#B3B3B3', fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, borderTopWidth: 1, borderColor: '#29251F' },
  queueIndex: { width: 19, color: '#756E64', fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack },
  queueArt: { width: 42, height: 42, borderRadius: 3, backgroundColor: '#211C17' },
  queueArtFallback: { alignItems: 'center', justifyContent: 'center' },
  queueCopy: { flex: 1, minWidth: 0 },
  queueTitle: { color: '#FFFFFF', fontSize: 13.5, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  queueArtist: { color: '#737373', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 2 },
  sourceCard: { height: 184, borderRadius: 6, overflow: 'hidden', padding: 14, justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#211C17' },
  sourceImage: { ...StyleSheet.absoluteFillObject },
  sourceKicker: { color: ORANGE, fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.2, zIndex: 2 },
  sourceTitle: { color: '#FFFFFF', fontSize: 19, fontFamily: pluggdFonts.displayBold, zIndex: 2 },
  sourceMeta: { color: '#D7CFC4', fontSize: 11, fontFamily: pluggdFonts.satoshiMedium, marginTop: 4, zIndex: 2 },
});
