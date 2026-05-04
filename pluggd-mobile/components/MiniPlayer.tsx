import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayback } from '../src/context/PlaybackProvider';
import { PLUGGD_ORANGE, formatGBP } from '../src/lib/mobileContent';

export default function MiniPlayer() {
  const router = useRouter();
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

  return (
    <View style={styles.wrap}>
      <Pressable onPress={openPlayer} style={styles.card}>
        {/* Progress bar at top of mini player */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.content}>
          {/* Cover Art */}
          <View style={styles.artwork}>
            {currentTrack.artwork ? (
              <Image source={{ uri: currentTrack.artwork }} style={styles.artworkImage} />
            ) : (
              <View style={styles.artworkFallback}>
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
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {currentTrack.artist}
              {currentTrack.price ? ` · ${formatGBP(currentTrack.price)}` : ''}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                skipToPrevious();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.iconButton}
            >
              <MaterialIcons name="skip-previous" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                togglePlayPause();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.playButton}
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
                skipToNext();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.iconButton}
            >
              <MaterialIcons name="skip-next" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: 'rgba(8,8,8,0.96)',
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#292929',
    backgroundColor: '#151515',
    overflow: 'hidden',
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
    minHeight: 62,
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  artwork: {
    width: 46,
    height: 46,
    borderRadius: 8,
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    color: '#A4A4A4',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
