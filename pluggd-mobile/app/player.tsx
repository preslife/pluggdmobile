import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { pluggdFonts } from '../src/design/typography';
import { edFonts } from '../src/design/editorial';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AccessibilityInfo, Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import { usePlayback } from '../src/context/PlaybackProvider';
import { PlaybackSeekBar } from '../src/components/PlaybackSeekBar';
import { useListeningRoomOrientation } from '../src/lib/orientation';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { formatDuration } from '../src/lib/mobileContent';
import { toggleSavedContent } from '../src/features/culture/mobileServices';
import { loadPublicPlaybackMetadata, loadPublishedTrackLyrics, loadReleasePlaybackCollection, playbackIdentity } from '../src/features/playback/publicPlaybackService';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

function waveformNumbers(value: unknown): number[] {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? (['peaks', 'samples', 'data', 'waveform']
        .map((key) => (value as Record<string, unknown>)[key])
        .find(Array.isArray) as unknown[] | undefined)
      : undefined;
  if (!source) return [];
  const numbers = source
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.abs(item));
  const maximum = numbers.reduce((highest, item) => Math.max(highest, item), 0);
  return maximum > 0 ? numbers.map((item) => item / maximum) : [];
}

function compactWaveform(value: unknown, target = 64): number[] {
  const numbers = waveformNumbers(value);
  if (numbers.length <= target) return numbers;
  const result: number[] = [];
  for (let index = 0; index < target; index += 1) {
    const start = Math.floor((index * numbers.length) / target);
    const end = Math.max(start + 1, Math.floor(((index + 1) * numbers.length) / target));
    result.push(Math.max(...numbers.slice(start, end)));
  }
  return result;
}

function RealWaveform({
  bars,
  progressPercent,
  width,
  onSeek,
}: {
  bars: number[];
  progressPercent: number;
  width: number;
  onSeek: (ratio: number) => void;
}) {
  const styles = usePlayerStyles();

  return (
    <PlaybackSeekBar
      ratio={progressPercent / 100}
      duration={100}
      position={progressPercent}
      onSeek={onSeek}
      accessibilityLabel="Playback waveform"
      style={styles.waveformShell}
      showDefaultTrack={false}
      thumbStyle={styles.seekThumb}
    >
      {(displayRatio) => <>
        <View style={[styles.waveformBars, { width }]}>
          {bars.map((amplitude, index) => (
            <View key={`wave-${index}`} style={[styles.waveformBar, { height: Math.max(4, Math.round(amplitude * 42)) }]} />
          ))}
        </View>
        <View pointerEvents="none" style={[styles.waveformActiveClip, { width: `${displayRatio * 100}%` }]}>
          <View style={[styles.waveformBars, { width }]}>
            {bars.map((amplitude, index) => (
              <View key={`wave-active-${index}`} style={[styles.waveformBar, styles.waveformBarActive, { height: Math.max(4, Math.round(amplitude * 42)) }]} />
            ))}
          </View>
        </View>
      </>}
    </PlaybackSeekBar>
  );
}

export default function PlayerScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = usePlayerStyles();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isCompactPortrait = !isLandscape && width <= 400 && height <= 700;
  const {
    currentTrack,
    queue,
    isPlaying,
    isBuffering,
    progress,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    skipToQueueIndex,
    playQueue,
    seekTo,
    toggleRepeat,
    toggleShuffle,
    shuffleMode,
    repeatMode,
    closePlayer,
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
  const lyricsOffset = useRef(0);
  const lyricLineOffsets = useRef<number[]>([]);
  const [lyricsFocused, setLyricsFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const playbackSource = playbackIdentity(currentTrack);
  const playbackMetadataQuery = useQuery({
    queryKey: ['player', 'public-playback-metadata', playbackSource?.type, playbackSource?.id],
    queryFn: () => currentTrack ? loadPublicPlaybackMetadata(currentTrack) : null,
    enabled: Boolean(currentTrack && playbackSource),
    staleTime: 1000 * 60 * 5,
  });
  const lyricsQuery = useQuery({
    queryKey: ['player', 'published-track-lyrics', currentTrack?.trackId],
    queryFn: () => loadPublishedTrackLyrics(currentTrack!.trackId!),
    enabled: Boolean(currentTrack?.trackId),
    staleTime: 1000 * 60 * 5,
  });
  const releaseCollectionQuery = useQuery({
    queryKey: ['player', 'release-playback-collection', currentTrack?.releaseId],
    queryFn: () => loadReleasePlaybackCollection(currentTrack!.releaseId!),
    enabled: Boolean(currentTrack?.releaseId),
    staleTime: 1000 * 60 * 5,
  });
  const releaseTracks = releaseCollectionQuery.data?.tracks ?? [];
  const waveformBars = useMemo(() => compactWaveform(playbackMetadataQuery.data?.waveformData), [playbackMetadataQuery.data?.waveformData]);
  const publishedLyrics = String(lyricsQuery.data?.plainText || currentTrack?.legacyLyrics || '').trim();
  const timedLyrics = lyricsQuery.data?.timedLines ?? [];
  const lyricsLines = useMemo(() => timedLyrics.length
    ? timedLyrics.map((line) => line.text)
    : publishedLyrics.split(/\r?\n/), [publishedLyrics, timedLyrics]);
  const activeLyricIndex = useMemo(() => {
    if (!timedLyrics.length) return -1;
    const positionMs = progress.position * 1000;
    let active = -1;
    for (let index = 0; index < timedLyrics.length; index += 1) {
      const line = timedLyrics[index];
      const nextStart = timedLyrics[index + 1]?.startMs ?? Number.POSITIVE_INFINITY;
      if (positionMs >= line.startMs && positionMs < (line.endMs ?? nextStart)) active = index;
    }
    return active;
  }, [progress.position, timedLyrics]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!lyricsFocused || activeLyricIndex < 0) return;
    const lineOffset = lyricLineOffsets.current[activeLyricIndex];
    if (!Number.isFinite(lineOffset)) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, lyricsOffset.current + lineOffset - height * 0.34), animated: !reduceMotion });
  }, [activeLyricIndex, height, lyricsFocused, reduceMotion]);
  const sourceRoute = currentTrack?.releaseId
    ? `/release/${currentTrack.releaseId}`
    : currentTrack?.mixId
      ? `/mixes/${currentTrack.mixId}`
      : currentTrack?.beatId
        ? `/beat/${currentTrack.beatId}`
        : null;
  const sourceLabel = currentTrack?.mixId ? 'mix' : currentTrack?.beatId ? 'beat' : 'release';
  const sceneRoute = currentTrack?.backstageRoute
    || (currentTrack?.backstageId ? `/backstage/${currentTrack.backstageId}` : '/community');
  const talkRoute = currentTrack?.releaseId
    ? `/release/${currentTrack.releaseId}?focus=comments`
    : '/community?filter=threads';

  const minimisePlayer = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/discover' as any);
  };

  const dismissPlayer = async () => {
    selectionHaptic();
    await closePlayer();
    if (router.canGoBack()) router.back();
    else router.replace('/discover' as any);
  };

  const handleScrub = (ratio: number) => {
    if (!progress.duration) return;
    seekTo(Math.max(0, Math.min(progress.duration, ratio * progress.duration)));
  };

  const focusTimedLyric = (index: number) => {
    const line = timedLyrics[index];
    if (!line) return;
    setLyricsFocused(true);
    void seekTo(line.startMs / 1000);
    const lineOffset = lyricLineOffsets.current[index] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, lyricsOffset.current + lineOffset - height * 0.34), animated: !reduceMotion });
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

  const openPlayerOptions = () => {
    selectionHaptic();
    Alert.alert(
      'Player options',
      'Closing the player stops playback and clears the current queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(currentTrack ? [{ text: 'Share track', onPress: () => void handleShare() }] : []),
        { text: 'Close player', style: 'destructive', onPress: () => void dismissPlayer() },
      ],
    );
  };

  if (isLandscape) {
    return (
      <View style={styles.roomScreen}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} hidden />
        <Stack.Screen options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
        <View style={styles.roomArtPane}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.roomArt} resizeMode="cover" />
          ) : (
            <MaterialIcons name="music-note" size={72} color={theme.colors.accentText} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minimise player"
            onPress={minimisePlayer}
            style={[styles.roomBack, cover && styles.roomBackMedia]}
          >
            <MaterialIcons name="expand-more" size={28} color={cover ? '#FFFFFF' : theme.colors.text} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open player options"
          onPress={openPlayerOptions}
          style={styles.roomClose}
        >
          <MaterialIcons name="more-horiz" size={25} color={theme.colors.text} />
        </Pressable>
        <View style={styles.roomPane}>
          {!currentTrack ? (
            <View style={styles.roomEmpty}>
              <Text style={[styles.topTitle, { color: theme.colors.textMuted }]}>PLUGGD LISTENING ROOM</Text>
              <Text style={[styles.roomTitle, { color: theme.colors.text }]}>Choose the next signal.</Text>
              <Text style={[styles.roomEmptyBody, { color: theme.colors.textMuted }]}>Start a release, beat or mix. The player keeps your place as you move through PLUGGD.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Discover music to play" onPress={() => router.replace('/discover' as any)} style={styles.roomEmptyPrimary}>
                <Text style={styles.emptyPrimaryText}>Discover music</Text>
                <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
              </Pressable>
            </View>
          ) : <>
            <Text style={styles.topTitle}>NOW PLAYING</Text>
            <Text style={styles.roomTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.trackArtist} numberOfLines={1}>{artist}</Text>
            <PlaybackSeekBar
              ratio={progressPercent / 100}
              duration={progress.duration}
              position={progress.position}
              onSeek={handleScrub}
              accessibilityLabel="Seek playback"
              style={styles.progressWrap}
              trackStyle={styles.progressTrack}
              fillStyle={styles.progressFill}
              thumbStyle={styles.seekThumb}
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatDuration(progress.position)}</Text>
              <Text style={styles.timeText}>{formatDuration(progress.duration)}</Text>
            </View>
            <View style={styles.controls}>
              <Pressable accessibilityRole="button" accessibilityLabel="Toggle shuffle" accessibilityState={{ selected: shuffleMode === 'on' }} onPress={toggleShuffle} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86 }]}>
                <MaterialIcons name="shuffle" size={22} color={shuffleMode === 'on' ? theme.colors.accentText : theme.colors.textMuted} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous track" onPress={skipToPrevious} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86 }]}>
                <MaterialIcons name="skip-previous" size={34} color={theme.colors.text} />
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
                <MaterialIcons name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'} size={40} color={theme.colors.onAccent} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next track" onPress={skipToNext} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86 }]}>
                <MaterialIcons name="skip-next" size={34} color={theme.colors.text} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Toggle repeat" accessibilityState={{ selected: repeatMode !== RepeatMode.Off }} onPress={toggleRepeat} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86 }]}>
                <MaterialIcons name={repeatMode === RepeatMode.Track ? 'repeat-one' : 'repeat'} size={22} color={repeatMode !== RepeatMode.Off ? theme.colors.accentText : theme.colors.textMuted} />
              </Pressable>
            </View>
          </>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[theme.colors.background, theme.colors.surface, theme.colors.background]} style={StyleSheet.absoluteFill} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isCompactPortrait && styles.compactContent,
          {
            paddingTop: isCompactPortrait ? Math.max(insets.top + 8, 38) : Math.max(insets.top + 12, 46),
            paddingBottom: insets.bottom + 34,
          },
        ]}
      >
        <View style={[styles.topBar, isCompactPortrait && styles.compactTopBar]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Minimise player" style={({ pressed }) => [styles.topButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]} onPress={minimisePlayer}>
            <MaterialIcons name="expand-more" size={30} color={theme.colors.text} />
          </Pressable>
          <Text pointerEvents="none" style={[styles.topTitle, styles.playerTopTitle]}>Now Playing</Text>
          <View style={styles.topActions}>
            {currentTrack ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Share current track" style={({ pressed }) => [styles.topButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]} onPress={handleShare}>
                <MaterialIcons name="ios-share" size={21} color={theme.colors.text} />
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Open player options" style={({ pressed }) => [styles.topButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]} onPress={openPlayerOptions}>
              <MaterialIcons name="more-horiz" size={25} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        {!currentTrack ? (
          <View style={styles.emptyPlayer}>
            <View style={styles.emptyArtwork}>
              <MaterialIcons name="headphones" size={68} color={theme.colors.accentText} />
              <Text style={styles.emptyArtKicker}>PLUGGD LISTENING ROOM</Text>
            </View>
            <Text style={styles.emptyTitle}>Choose the next signal.</Text>
            <Text style={styles.emptyBody}>Start a release, beat or mix and the player will carry it across every part of PLUGGD without losing your place.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Discover music to play" onPress={() => router.replace('/discover' as any)} style={styles.emptyPrimary}>
              <Text style={styles.emptyPrimaryText}>Discover music</Text>
              <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Return to previous screen" onPress={() => router.back()} style={styles.emptySecondary}>
              <Text style={styles.emptySecondaryText}>Return to PLUGGD</Text>
            </Pressable>
          </View>
        ) : <>
        <View style={[styles.heroArt, isCompactPortrait && styles.compactHeroArt]}>
          {cover ? <Image source={{ uri: cover }} style={styles.fill} /> : <MaterialIcons name="music-note" size={78} color={theme.colors.accentText} />}
        </View>

        <View style={[styles.trackHeader, isCompactPortrait && styles.compactTrackHeader]}>
          <View style={styles.trackCopy}>
            <Text style={[styles.trackTitle, isCompactPortrait && styles.compactTrackTitle]} numberOfLines={2}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${artist}`} onPress={() => currentTrack?.releaseId && router.push(`/release/${currentTrack.releaseId}` as any)}>
              <Text style={[styles.trackArtist, isCompactPortrait && styles.compactTrackArtist]} numberOfLines={1}>{artist}</Text>
            </Pressable>
          </View>
        </View>

        {waveformBars.length > 0 ? (
          <RealWaveform bars={waveformBars} progressPercent={progressPercent} width={scrubberWidth} onSeek={handleScrub} />
        ) : (
          <PlaybackSeekBar
            ratio={progressPercent / 100}
            duration={progress.duration}
            position={progress.position}
            onSeek={handleScrub}
            accessibilityLabel={playbackMetadataQuery.isFetching ? 'Seek playback. Waveform is processing.' : 'Seek playback'}
            style={[styles.progressWrap, isCompactPortrait && styles.compactProgressWrap]}
            trackStyle={styles.progressTrack}
            fillStyle={styles.progressFill}
            thumbStyle={styles.seekThumb}
          />
        )}
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(progress.position)}</Text>
          <Text style={styles.timeText}>{formatDuration(progress.duration)}</Text>
        </View>

        <View style={[styles.controls, isCompactPortrait && styles.compactControls]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle shuffle" accessibilityState={{ selected: shuffleMode === 'on' }} onPress={toggleShuffle} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name="shuffle" size={23} color={shuffleMode === 'on' ? theme.colors.accentText : theme.colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous track" onPress={skipToPrevious} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name="skip-previous" size={38} color={theme.colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause media' : 'Play media'}
            onPress={() => {
              impactHaptic();
              togglePlayPause();
            }}
            style={({ pressed }) => [styles.playButton, isCompactPortrait && styles.compactPlayButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}
          >
            <View pointerEvents="none" style={[styles.playButtonFace, isCompactPortrait && styles.compactPlayButtonFace]}>
              <MaterialIcons name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'} size={44} color="#120803" />
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next track" onPress={skipToNext} style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name="skip-next" size={38} color={theme.colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle repeat" accessibilityState={{ selected: repeatMode !== RepeatMode.Off }} onPress={toggleRepeat} style={({ pressed }) => [styles.controlButton, pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] }]}>
            <MaterialIcons name={repeatMode === RepeatMode.Track ? 'repeat-one' : 'repeat'} size={23} color={repeatMode !== RepeatMode.Off ? theme.colors.accentText : theme.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <PlayerAction icon="favorite-border" label="Like" accessibilityLabel="Like current track" onPress={handleSave} />
          <PlayerAction icon="send" label="Share" accessibilityLabel="Share current track" onPress={handleShare} />
          <PlayerAction icon="groups" label="Scene" accessibilityLabel="Open track community" onPress={() => router.push(sceneRoute as any)} />
          <PlayerAction icon="chat-bubble-outline" label="Talk" accessibilityLabel="Open track comments" onPress={() => router.push(talkRoute as any)} />
          <PlayerAction icon="playlist-add" label="Queue" onPress={() => scrollRef.current?.scrollTo({ y: queueOffset.current, animated: true })} />
          {publishedLyrics ? <PlayerAction icon="notes" label="Lyrics" onPress={() => { setLyricsFocused(true); scrollRef.current?.scrollTo({ y: lyricsOffset.current, animated: !reduceMotion }); }} /> : null}
        </View>

        {releaseTracks.length > 1 ? (
          <View style={styles.releaseSection}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionKicker}>THIS RELEASE</Text>
              <Text style={styles.queueCount}>{String(releaseTracks.length).padStart(2, '0')} TRACKS</Text>
            </View>
            <Text style={styles.infoTitle} numberOfLines={2}>{releaseCollectionQuery.data?.title || 'Complete release'}</Text>
            {releaseTracks.map((track, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play track ${index + 1}, ${track.title}`}
                accessibilityState={{ selected: currentTrack?.id === track.id }}
                key={track.id}
                onPress={() => void playQueue(releaseTracks, index)}
                style={styles.queueRow}
              >
                <Text style={styles.queueIndex}>{String(index + 1).padStart(2, '0')}</Text>
                <View style={styles.releaseTrackCopy}>
                  <Text style={styles.queueTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.queueArtist} numberOfLines={1}>{track.artist}</Text>
                </View>
                {track.duration ? <Text style={styles.releaseDuration}>{formatDuration(track.duration)}</Text> : null}
                {currentTrack?.id === track.id ? <MaterialIcons name="graphic-eq" size={18} color={theme.colors.accentText} /> : <MaterialIcons name="play-arrow" size={18} color={theme.colors.textMuted} />}
              </Pressable>
            ))}
          </View>
        ) : null}
        {currentTrack?.releaseId && releaseCollectionQuery.isError ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Retry loading release tracks" onPress={() => void releaseCollectionQuery.refetch()} style={styles.releaseRetry}>
            <MaterialIcons name="refresh" size={18} color={theme.colors.accentText} />
            <Text style={styles.releaseRetryText}>Release tracks couldn’t load. Tap to try again.</Text>
          </Pressable>
        ) : null}

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
            <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title} by ${track.artist}`} key={track.id} onPress={() => void skipToQueueIndex(index)} style={styles.queueRow}>
              <Text style={styles.queueIndex}>{String(index + 1).padStart(2, '0')}</Text>
              {track.artwork ? <Image source={{ uri: track.artwork }} style={styles.queueArt} /> : <View style={[styles.queueArt, styles.queueArtFallback]}><MaterialIcons name="music-note" size={18} color={theme.colors.accentText} /></View>}
              <View style={styles.queueCopy}>
                <Text style={styles.queueTitle} numberOfLines={1}>{track.title}</Text>
                <Text style={styles.queueArtist} numberOfLines={1}>{track.artist}</Text>
              </View>
              {currentTrack?.id === track.id ? <MaterialIcons name="graphic-eq" size={18} color={theme.colors.accentText} /> : null}
            </Pressable>
          ))}
        </View>

        {currentTrack.releaseId ? (
          <View
            style={styles.lyricsSection}
            onLayout={(event) => {
              lyricsOffset.current = event.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.sectionKicker}>PUBLISHED LYRICS</Text>
            <Text style={styles.lyricsTitle}>Lyrics</Text>
            {lyricsQuery.isLoading ? <Text style={styles.lyricsStatus}>Loading published lyrics…</Text> : null}
            {lyricsQuery.isError ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Retry loading lyrics" onPress={() => void lyricsQuery.refetch()} style={styles.lyricsRetry}>
                <Text style={styles.lyricsStatus}>Lyrics could not be loaded. Tap to try again.</Text>
              </Pressable>
            ) : null}
            {!lyricsQuery.isLoading && !lyricsQuery.isError && !publishedLyrics ? (
              <Text style={styles.lyricsStatus}>Lyrics haven’t been published for this release.</Text>
            ) : null}
            {publishedLyrics ? (
              <View style={styles.lyricsBody}>
                {timedLyrics.length ? (
                  <>
                    <View style={styles.lyricsNavigation}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Previous lyric line" disabled={activeLyricIndex <= 0} onPress={() => focusTimedLyric(Math.max(0, activeLyricIndex - 1))} style={[styles.lyricsNavButton, activeLyricIndex <= 0 && styles.lyricsNavDisabled]}><MaterialIcons name="keyboard-arrow-up" size={23} color={theme.colors.text} /></Pressable>
                      <Text style={styles.lyricsSyncedLabel}>TIME-SYNCED · {lyricsQuery.data?.language.toUpperCase()}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel="Next lyric line" disabled={activeLyricIndex >= timedLyrics.length - 1} onPress={() => focusTimedLyric(Math.min(timedLyrics.length - 1, Math.max(0, activeLyricIndex + 1)))} style={[styles.lyricsNavButton, activeLyricIndex >= timedLyrics.length - 1 && styles.lyricsNavDisabled]}><MaterialIcons name="keyboard-arrow-down" size={23} color={theme.colors.text} /></Pressable>
                    </View>
                    {lyricsLines.map((line, index) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Seek to lyric: ${line}`}
                        accessibilityState={{ selected: index === activeLyricIndex }}
                        key={`lyric-${index}`}
                        onLayout={(event) => { lyricLineOffsets.current[index] = event.nativeEvent.layout.y; }}
                        onPress={() => focusTimedLyric(index)}
                        style={styles.timedLyricHit}
                      >
                        <Text style={[styles.lyricsLine, styles.timedLyricsLine, index === activeLyricIndex && styles.lyricsLineActive]}>{line}</Text>
                      </Pressable>
                    ))}
                  </>
                ) : lyricsLines.map((line, index) => (
                  line.trim()
                    ? <Text key={`lyric-${index}`} style={styles.lyricsLine}>{line}</Text>
                    : <View key={`lyric-${index}`} style={styles.lyricsBreak} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {sourceRoute ? <Pressable accessibilityRole="button" accessibilityLabel={`Open source for ${title}`} onPress={() => router.push(sourceRoute as any)} style={styles.sourceCard}>{cover ? <Image source={{ uri: cover }} style={styles.sourceImage} /> : null}<LinearGradient colors={['rgba(6,5,4,0.25)', 'rgba(6,5,4,0.94)']} style={StyleSheet.absoluteFill} /><Text style={styles.sourceKicker}>FROM THE CATALOGUE</Text><View><Text style={styles.sourceTitle}>Go deeper into this {sourceLabel}</Text><Text style={styles.sourceMeta}>Support, track context and creator details →</Text></View></Pressable> : null}
        </>}
      </ScrollView>
    </View>
  );
}

function PlayerAction({ icon, label, accessibilityLabel, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; accessibilityLabel?: string; onPress?: () => void }) {
  const theme = usePluggdTheme();
  const styles = usePlayerStyles();
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
      <MaterialIcons name={icon} size={22} color={theme.colors.accentText} />
      <Text style={styles.playerActionText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{label}</Text>
    </Pressable>
  );
}

function usePlayerStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  roomScreen: { flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background },
  roomArtPane: { width: '44%', backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  roomArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  roomBack: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBackMedia: {
    backgroundColor: 'rgba(7,6,5,0.6)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  roomClose: {
    position: 'absolute',
    zIndex: 5,
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomPane: { flex: 1, paddingHorizontal: 26, paddingVertical: 18, justifyContent: 'center', gap: 6, backgroundColor: theme.colors.background },
  roomEmpty: { maxWidth: 460, gap: 12 },
  roomEmptyBody: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', maxWidth: 420 },
  roomEmptyPrimary: { minHeight: 52, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 10, maxWidth: 260 },
  roomPlayButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 16 },
  compactContent: { paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  compactTopBar: { marginBottom: 12 },
  topButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: theme.colors.textMuted, fontSize: 10.5, fontFamily: edFonts.mono, letterSpacing: 2, textTransform: 'uppercase' },
  playerTopTitle: { position: 'absolute', left: 96, right: 96, textAlign: 'center' },
  emptyPlayer: { minHeight: 660, justifyContent: 'center', paddingBottom: 54 },
  emptyArtwork: { height: 248, borderRadius: 6, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center', gap: 20 },
  emptyArtKicker: { color: theme.colors.textMuted, fontSize: 9, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 1.5 },
  emptyTitle: { color: theme.colors.text, fontSize: 34, lineHeight: 39, letterSpacing: -1, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 26 },
  emptyBody: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 10 },
  emptyPrimary: { minHeight: 56, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 26 },
  emptyPrimaryText: { color: theme.colors.onAccent, fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  emptySecondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emptySecondaryText: { color: theme.colors.textSecondary, fontSize: 13, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  heroArt: { aspectRatio: 1, borderRadius: 6, backgroundColor: theme.colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  compactHeroArt: { width: 210, height: 210, aspectRatio: undefined, alignSelf: 'center' },
  fill: { width: '100%', height: '100%' },
  trackHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 22 },
  compactTrackHeader: { marginTop: 14 },
  trackCopy: { flex: 1, minWidth: 0 },
  roomTitle: { color: theme.colors.text, fontSize: 30, lineHeight: 34, fontFamily: pluggdFonts.displayExtraBold, letterSpacing: -0.8 },
  trackTitle: { color: theme.colors.text, fontSize: 31, lineHeight: 36, fontFamily: pluggdFonts.displayExtraBold, letterSpacing: -0.9 },
  compactTrackTitle: { fontSize: 25, lineHeight: 29, letterSpacing: -0.6 },
  trackArtist: { color: theme.colors.textSecondary, fontSize: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5 },
  compactTrackArtist: { fontSize: 15, marginTop: 3 },
  saveButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  progressWrap: { height: 44, justifyContent: 'center', marginTop: 6 },
  compactProgressWrap: { marginTop: 0 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 999, backgroundColor: theme.colors.accentFill },
  seekThumb: { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.accentFill },
  waveformShell: { height: 52, justifyContent: 'center', marginTop: 16, overflow: 'hidden' },
  waveformBars: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waveformBar: { width: 2.5, borderRadius: 999, backgroundColor: theme.colors.controlBorder },
  waveformActiveClip: { position: 'absolute', left: 0, top: 2, height: 48, overflow: 'hidden' },
  waveformBarActive: { backgroundColor: theme.colors.accentFill },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: theme.colors.textMuted, fontSize: 10.5, fontFamily: edFonts.mono, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 18 },
  compactControls: { marginTop: 10, marginBottom: 10 },
  controlButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  skipButton: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  compactPlayButton: { width: 64, height: 64, borderRadius: 32 },
  playButtonFace: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FF6600', borderWidth: 2, borderColor: '#FFB27F', alignItems: 'center', justifyContent: 'center' },
  compactPlayButtonFace: { width: 64, height: 64, borderRadius: 32 },
  actionRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.controlBorder, marginBottom: 22 },
  playerAction: { flex: 1, minWidth: 0, minHeight: 70, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 2 },
  playerActionText: { width: '100%', color: theme.colors.text, fontSize: 11, lineHeight: 14, textAlign: 'center', fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  queueSection: { marginBottom: 20 },
  releaseSection: { marginBottom: 22 },
  releaseTrackCopy: { flex: 1, minWidth: 0 },
  releaseDuration: { color: theme.colors.textMuted, fontSize: 10, fontFamily: edFonts.mono, fontVariant: ['tabular-nums'] },
  releaseRetry: { minHeight: 48, marginBottom: 18, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  releaseRetryText: { flex: 1, color: theme.colors.textSecondary, fontSize: 12.5, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionKicker: { color: theme.colors.accentText, fontSize: 9, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.3 },
  queueCount: { color: theme.colors.textMuted, fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.1 },
  infoTitle: { color: theme.colors.text, fontSize: 21, fontFamily: pluggdFonts.displayBold, marginBottom: 7 },
  infoBody: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, borderTopWidth: 1, borderColor: theme.colors.border },
  queueIndex: { width: 19, color: theme.colors.textMuted, fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack },
  queueArt: { width: 42, height: 42, borderRadius: 3, backgroundColor: theme.colors.surfaceAlt },
  queueArtFallback: { alignItems: 'center', justifyContent: 'center' },
  queueCopy: { flex: 1, minWidth: 0 },
  queueTitle: { color: theme.colors.text, fontSize: 13.5, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  queueArtist: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 2 },
  lyricsSection: { marginBottom: 24, paddingTop: 4 },
  lyricsTitle: { color: theme.colors.text, fontSize: 30, lineHeight: 35, fontFamily: pluggdFonts.displayBold, marginTop: 5, marginBottom: 16 },
  lyricsBody: { paddingVertical: 20, paddingHorizontal: 18, borderRadius: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder },
  lyricsLine: { color: theme.colors.textSecondary, fontSize: 17, lineHeight: 28, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  lyricsNavigation: { minHeight: 48, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  lyricsNavButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  lyricsNavDisabled: { opacity: 0.28 },
  lyricsSyncedLabel: { color: theme.colors.accentText, fontSize: 9, letterSpacing: 1.25, fontFamily: pluggdFonts.satoshiBlack },
  timedLyricHit: { minHeight: 48, justifyContent: 'center', paddingVertical: 5 },
  timedLyricsLine: { color: theme.colors.textMuted, fontSize: 18, lineHeight: 26 },
  lyricsLineActive: { color: theme.colors.text, fontSize: 22, lineHeight: 30, fontFamily: pluggdFonts.satoshiBlack },
  lyricsBreak: { height: 16 },
  lyricsStatus: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600' },
  lyricsRetry: { minHeight: 48, justifyContent: 'center', paddingVertical: 8 },
  sourceCard: { height: 184, borderRadius: 6, overflow: 'hidden', padding: 14, justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#211C17' },
  sourceImage: { ...StyleSheet.absoluteFillObject },
  sourceKicker: { color: '#FF6600', fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.2, zIndex: 2 },
  sourceTitle: { color: '#FFFFFF', fontSize: 19, fontFamily: pluggdFonts.displayBold, zIndex: 2 },
  sourceMeta: { color: '#D7CFC4', fontSize: 11, fontFamily: pluggdFonts.satoshiMedium, marginTop: 4, zIndex: 2 },
  }), [theme]);
}
