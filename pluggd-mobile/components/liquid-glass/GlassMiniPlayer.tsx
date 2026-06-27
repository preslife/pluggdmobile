import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassMiniPlayerProps = {
  title: string;
  artist: string;
  artwork?: string | null;
  locked?: boolean;
  isPlaying?: boolean;
  isBuffering?: boolean;
  progressPercent?: number;
  collapsed?: boolean;
  canLike?: boolean;
  liked?: boolean;
  onOpen?: () => void;
  onToggleCollapse?: () => void;
  onLikePress?: () => void;
  onLyricsPress?: () => void;
  onQueuePress?: () => void;
  onMorePress?: () => void;
  onTogglePlay?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
};

export function GlassMiniPlayer({
  title,
  artist,
  artwork,
  locked,
  isPlaying,
  isBuffering,
  progressPercent = 0,
  collapsed,
  canLike,
  liked,
  onOpen,
  onToggleCollapse,
  onLikePress,
  onLyricsPress,
  onQueuePress,
  onMorePress,
  onTogglePlay,
  onPrevious,
  onNext,
}: GlassMiniPlayerProps) {
  const progressWidth = `${Math.max(0, Math.min(progressPercent, 100))}%` as `${number}%`;

  if (collapsed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Expand mini player"
        onPress={() => {
          selectionHaptic();
          onToggleCollapse?.();
        }}
        style={styles.collapsedPressable}
      >
        <LiftSurface depth="high" style={styles.collapsedLift}>
          <GlassPanel intensity="strong" radius={liquidGlassRadii.pill} style={styles.collapsedCard} contentStyle={styles.collapsedContent}>
            <ArtworkDisc artwork={artwork} locked={locked} spinning={isPlaying} size={42} />
          </GlassPanel>
        </LiftSurface>
      </Pressable>
    );
  }

  return (
    <View style={styles.pressable}>
      <LiftSurface depth="high">
        <GlassPanel intensity="strong" radius={liquidGlassRadii.xl} style={styles.card}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open full player"
              onPress={onOpen}
              style={({ pressed }) => [styles.trackTapTarget, pressed && styles.trackTapPressed]}
            >
              <LiftSurface depth="low" style={styles.discLift}>
                <ArtworkDisc artwork={artwork} locked={locked} spinning={isPlaying} />
              </LiftSurface>

              <View style={styles.trackInfo}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.artist} numberOfLines={1}>{locked ? `${artist} · Locked preview` : artist}</Text>
              </View>
            </Pressable>

            <PlayerIconButton
              accessibilityLabel="Collapse mini player"
              icon="keyboard-arrow-down"
              onPress={onToggleCollapse}
            />
          </View>

          <View style={styles.actionRow}>
            <View style={styles.workflowActions}>
              <PlayerIconButton
                accessibilityLabel={canLike ? (liked ? 'Remove from saved' : 'Save current track') : 'Save unavailable for this track'}
                icon={liked ? 'favorite' : 'favorite-border'}
                active={liked}
                disabled={!canLike}
                onPress={onLikePress}
              />
              <PlayerIconButton accessibilityLabel="Open lyrics and BarFlow" icon="edit" onPress={onLyricsPress} />
              <PlayerIconButton accessibilityLabel="Open queue and playlist" icon="queue-music" onPress={onQueuePress} />
            </View>

            <View style={styles.transportActions}>
              <PlayerIconButton accessibilityLabel="Previous track" icon="skip-previous" quiet onPress={onPrevious} />
              <PlayerIconButton
                accessibilityLabel={isPlaying ? 'Pause media' : 'Play media'}
                icon={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'}
                prominent
                onPress={() => {
                  impactHaptic();
                  onTogglePlay?.();
                }}
              />
              <PlayerIconButton accessibilityLabel="Next track" icon="skip-next" quiet onPress={onNext} />
            </View>

            <PlayerIconButton accessibilityLabel="Open player options" icon="more-horiz" onPress={onMorePress} />
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        </GlassPanel>
      </LiftSurface>
    </View>
  );
}

function ArtworkDisc({
  artwork,
  locked,
  spinning,
  size = 42,
}: {
  artwork?: string | null;
  locked?: boolean;
  spinning?: boolean;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.artwork,
        webDiscLift,
        { width: size, height: size, borderRadius: size / 2 },
        spinning && styles.artworkPlaying,
      ]}
    >
      {artwork ? (
        <PluggdImage uri={artwork} style={styles.fill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#3A3842', '#27252E']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.artworkFallback}
        >
          <MaterialIcons name="music-note" size={18} color={liquidGlassColors.textPrimary} />
        </LinearGradient>
      )}
      <View pointerEvents="none" style={styles.discTopRim} />
      <View pointerEvents="none" style={styles.discInnerGlow} />
      {locked ? (
        <View style={styles.lockBadge}>
          <MaterialIcons name="lock" size={10} color={liquidGlassColors.backgroundDeep} />
        </View>
      ) : null}
    </View>
  );
}

const webDiscLift = Platform.select({
  web: {
    filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.86)) drop-shadow(0px 8px 14px rgba(0,0,0,0.62))',
  },
  default: {},
}) as ViewStyle;

function PlayerIconButton({
  icon,
  accessibilityLabel,
  onPress,
  active,
  prominent,
  quiet,
  disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
  active?: boolean;
  prominent?: boolean;
  quiet?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || !onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, selected: !!active }}
      disabled={isDisabled}
      onPress={(event: GestureResponderEvent) => {
        event.stopPropagation();
        if (!prominent) selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        quiet && styles.iconButtonQuiet,
        prominent && styles.iconButtonProminent,
        active && styles.iconButtonActive,
        isDisabled && styles.iconButtonDisabled,
        pressed && !isDisabled && styles.iconButtonPressed,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={prominent ? 22 : 17}
        color={active ? liquidGlassColors.accent : prominent ? liquidGlassColors.textPrimary : liquidGlassColors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 28,
  },
  collapsedPressable: {
    alignSelf: 'flex-end',
    marginRight: 28,
    marginLeft: 28,
  },
  collapsedLift: {
    borderRadius: liquidGlassRadii.pill,
  },
  collapsedCard: {
    width: 58,
    height: 58,
  },
  collapsedContent: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minHeight: 76,
    shadowColor: '#000',
    shadowOpacity: 0.74,
    shadowRadius: 46,
    shadowOffset: { width: 0, height: 30 },
  },
  topRow: {
    minHeight: 42,
    paddingHorizontal: 11,
    paddingTop: 7,
    paddingBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  trackTapTarget: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackTapPressed: {
    opacity: 0.86,
  },
  actionRow: {
    paddingHorizontal: 11,
    paddingBottom: 6,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  workflowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  transportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discLift: {
    borderRadius: 999,
  },
  artwork: {
    overflow: 'hidden',
    backgroundColor: '#27252E',
    position: 'relative',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.42)',
    shadowColor: '#000',
    shadowOpacity: 0.52,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  artworkPlaying: {
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  discTopRim: {
    position: 'absolute',
    left: 5,
    right: 5,
    top: 2,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  discInnerGlow: {
    position: 'absolute',
    left: 7,
    top: 6,
    width: '42%',
    height: '36%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  artworkFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1711',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  lockBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: liquidGlassColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 16,
  },
  artist: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  iconButton: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidGlassColors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.045)',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
  },
  iconButtonQuiet: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  iconButtonProminent: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderColor: liquidGlassColors.borderTop,
    backgroundColor: 'rgba(255,255,255,0.085)',
    shadowColor: '#000',
    shadowOpacity: 0.48,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 9 },
  },
  iconButtonActive: {
    borderColor: 'rgba(255,82,0,0.36)',
    backgroundColor: 'rgba(255,82,0,0.10)',
  },
  iconButtonDisabled: {
    opacity: 0.36,
  },
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  progressTrack: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.11)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: liquidGlassColors.accent,
  },
});
