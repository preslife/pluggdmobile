import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { usePlayback } from '../src/context/PlaybackProvider';
import { PluggdGlassSurface } from './PluggdPrimitives';

const ORANGE = '#FF5A00';
const NOIR = '#08080C';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentTrack, isPlaying, isBuffering, progress, togglePlayPause } = usePlayback();

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

  const progressPercent =
    progress.duration > 0
      ? Math.min((progress.position / progress.duration) * 100, 100)
      : 0;

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open full player" onPress={openPlayer}>
        <PluggdGlassSurface
          interactive
          glassEffectStyle="regular"
          blurIntensity={58}
          borderColor="#1F1F2E"
          fallbackColor="rgba(20,20,28,0.85)"
          tintColor="rgba(20,20,28,0.85)"
          style={styles.card}
        >
          <View style={styles.content}>
            <View style={styles.artwork}>
              {currentTrack.artwork ? (
                <Image source={{ uri: currentTrack.artwork }} style={styles.artworkImage} />
              ) : (
                <View style={styles.artworkFallback}>
                  <MaterialIcons name="music-note" size={18} color="#FFFFFF" />
                </View>
              )}
              {currentTrack.isLocked ? (
                <View style={styles.lockBadge}>
                  <MaterialIcons name="lock" size={10} color={NOIR} />
                </View>
              ) : null}
            </View>

            <View style={styles.trackInfo}>
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack.title} - {currentTrack.artist}
              </Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation?.();
                  selectionHaptic();
                  router.push('/backstage' as any);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.backstageShortcut}
              >
                <Text style={styles.backstageText}>142 backstage</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation?.();
                  impactHaptic();
                  togglePlayPause();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.iconButton}
              >
                <MaterialIcons
                  name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'}
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </PluggdGlassSurface>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
  },
  card: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  content: {
    height: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  artwork: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1F1F2E',
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
    right: 3,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backstageShortcut: {
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1F1F2E',
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  backstageText: {
    color: '#E4E4E9',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: '#1F1F2E',
  },
  progressFill: {
    height: 1,
    backgroundColor: ORANGE,
  },
});
