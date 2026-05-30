import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { usePlayback } from '../src/context/PlaybackProvider';
import { PluggdGlassSurface } from './PluggdPrimitives';

export default function MiniPlayer() {
  const router = useRouter();
  const theme = usePluggdTheme();
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
  const hasBackstageLink = Boolean(currentTrack.backstageRoute || currentTrack.backstageId);
  const backstageRoute = currentTrack.backstageRoute || (currentTrack.backstageId ? `/backstage/${currentTrack.backstageId}` : undefined);
  const backstageLabel =
    typeof currentTrack.backstageActiveCount === 'number' && currentTrack.backstageActiveCount > 0
      ? `${currentTrack.backstageActiveCount} community`
      : 'Community';

  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open full player" onPress={openPlayer}>
        <PluggdGlassSurface
          interactive
          glassEffectStyle="regular"
          blurIntensity={58}
          borderColor={theme.colors.divider}
          fallbackColor={theme.colors.miniPlayerGlass}
          tintColor={theme.colors.miniPlayerGlass}
          colorScheme={theme.scheme}
          style={styles.card}
        >
          <View style={styles.content}>
            <View style={styles.artwork}>
              {currentTrack.artwork ? (
                <Image source={{ uri: currentTrack.artwork }} style={styles.artworkImage} />
              ) : (
                <View style={styles.artworkFallback}>
                  <MaterialIcons name="music-note" size={18} color={theme.colors.text} />
                </View>
              )}
              {currentTrack.isLocked ? (
                <View style={[styles.lockBadge, { backgroundColor: theme.colors.accent }]}>
                  <MaterialIcons name="lock" size={10} color={theme.colors.background} />
                </View>
              ) : null}
            </View>

            <View style={styles.trackInfo}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {currentTrack.title} - {currentTrack.artist}
              </Text>
            </View>

            <View style={styles.controls}>
              {hasBackstageLink ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Open track community"
                  onPress={(event) => {
                    event.stopPropagation?.();
                    selectionHaptic();
                    if (backstageRoute) router.push(backstageRoute as any);
                  }}
                  style={[
                    styles.backstageShortcut,
                    { borderColor: theme.colors.divider, backgroundColor: theme.colors.surfaceAlt },
                  ]}
                >
                  <Text style={[styles.backstageText, { color: theme.colors.textSecondary }]}>{backstageLabel}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause media' : 'Play media'}
                onPress={(event) => {
                  event.stopPropagation?.();
                  impactHaptic();
                  togglePlayPause();
                }}
                style={[
                  styles.iconButton,
                  {
                    borderColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(8,8,12,0.16)',
                    backgroundColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(8,8,12,0.04)',
                  },
                ]}
              >
                <MaterialIcons
                  name={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'}
                  size={22}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.colors.divider }]}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: theme.colors.accent }]} />
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
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backstageShortcut: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  backstageText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  progressFill: {
    height: 1,
  },
});
