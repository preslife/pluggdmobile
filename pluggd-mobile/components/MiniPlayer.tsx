import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayback } from '../src/context/PlaybackProvider';
import { PLUGGD_ORANGE, formatGBP } from '../src/lib/mobileContent';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { PluggdGlassSurface } from './PluggdPrimitives';

export default function MiniPlayer() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    progress,
    togglePlayPause,
    skipToPrevious,
    skipToNext,
  } = usePlayback();

  // Don't render if nothing is playing
  if (!currentTrack) return null;

  const openPlayer = () => {
    selectionHaptic();
    router.push({
      pathname: '/player',
      params: {
        title: currentTrack.title,
        artist: currentTrack.artist,
        cover: currentTrack.artwork ?? '',
      },
    });
  };

  // Progress percentage for the bar
  const progressPercent =
    progress.duration > 0
      ? Math.min((progress.position / progress.duration) * 100, 100)
      : 0;
  const highContrast = theme.scheme === 'light';
  const playerSurface = highContrast ? 'rgba(14,14,14,0.96)' : theme.colors.glassFallback;
  const playerTint = highContrast ? 'rgba(16,16,16,0.72)' : theme.colors.glassTint;
  const playerBorder = highContrast ? 'rgba(255,82,0,0.32)' : theme.colors.border;
  const playerText = highContrast ? '#FFFFFF' : theme.colors.text;
  const playerMuted = highContrast ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted;
  const playerTrack = highContrast ? 'rgba(255,255,255,0.18)' : theme.colors.border;

  return (
    <View style={styles.wrap}>
      <Pressable onPress={openPlayer}>
        <PluggdGlassSurface
          interactive
          glassEffectStyle="regular"
          blurIntensity={58}
          borderColor={playerBorder}
          fallbackColor={playerSurface}
          tintColor={playerTint}
          style={[styles.card, { shadowColor: theme.colors.shadow }]}
        >
          {/* Progress bar at top of mini player */}
          <View style={[styles.progressTrack, { backgroundColor: playerTrack }]}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.content}>
            {/* Cover Art */}
            <View style={[styles.artwork, { backgroundColor: theme.colors.surfaceAlt }]}>
              {currentTrack.artwork ? (
                <Image source={{ uri: currentTrack.artwork }} style={styles.artworkImage} />
              ) : (
                <View style={[styles.artworkFallback, { backgroundColor: theme.colors.artworkBase }]}>
                  <MaterialIcons name="music-note" size={20} color="#FFFFFF" />
                </View>
              )}
              {currentTrack.isLocked ? (
                <View style={styles.lockBadge}>
                  <MaterialIcons name="lock" size={10} color="#080808" />
                </View>
              ) : null}
            </View>

            {/* Track Info */}
            <View style={styles.trackInfo}>
              <Text style={[styles.title, { color: playerText }]} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={[styles.subtitle, { color: playerMuted }]} numberOfLines={1}>
                {currentTrack.artist}
                {currentTrack.price ? ` · ${formatGBP(currentTrack.price)}` : ''}
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  selectionHaptic();
                  skipToPrevious();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.iconButton}
              >
                <MaterialIcons name="skip-previous" size={21} color={playerMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  impactHaptic();
                  togglePlayPause();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.playButton, { backgroundColor: PLUGGD_ORANGE, borderColor: PLUGGD_ORANGE }]}
              >
                <MaterialIcons
                  name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'}
                  size={23}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  selectionHaptic();
                  skipToNext();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.iconButton}
              >
                <MaterialIcons name="skip-next" size={21} color={playerMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </PluggdGlassSurface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 2,
  },
  card: {
    borderRadius: 18,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  progressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: '#303030',
  },
  progressFill: {
    height: 3,
    backgroundColor: PLUGGD_ORANGE,
  },
  content: {
    minHeight: 58,
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  artwork: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#242424',
    position: 'relative',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1711',
  },
  lockBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PLUGGD_ORANGE,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
