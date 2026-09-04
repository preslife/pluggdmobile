import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { PlaybackSeekBar } from '../../src/components/PlaybackSeekBar';

type GlassMiniPlayerProps = {
  title: string;
  artist: string;
  artwork?: string | null;
  locked?: boolean;
  isPlaying?: boolean;
  isBuffering?: boolean;
  progressPercent?: number;
  progressLabel?: string;
  collapsed?: boolean;
  canLike?: boolean;
  liked?: boolean;
  onOpen?: () => void;
  onToggleCollapse?: () => void;
  onLikePress?: () => void;
  onMorePress?: () => void;
  onTogglePlay?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek?: (ratio: number) => void;
};

export function GlassMiniPlayer({
  title,
  artist,
  artwork,
  locked,
  isPlaying,
  isBuffering,
  progressPercent = 0,
  progressLabel,
  collapsed,
  canLike,
  liked,
  onOpen,
  onToggleCollapse,
  onLikePress,
  onMorePress,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
}: GlassMiniPlayerProps) {
  const theme = usePluggdTheme();

  if (collapsed) {
    return (
      <View pointerEvents="box-none" style={styles.collapsedWrap}>
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
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.pressable}>
      <LiftSurface depth="high">
        <GlassPanel
          intensity="strong"
          radius={liquidGlassRadii.xl}
          style={styles.card}
          contentStyle={styles.cardContent}
        >
          <View pointerEvents="none" style={[styles.accentRail, { backgroundColor: theme.colors.accentFill, shadowColor: theme.colors.accentFill }]} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open full player for ${title} by ${artist}`}
            testID="mini-player-open"
            onPress={onOpen}
            style={styles.trackIdentity}
          >
            <View style={styles.tileLift}>
              <ArtworkTile artwork={artwork} locked={locked} />
            </View>

            <View style={styles.trackInfo}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.accentFill, shadowColor: theme.colors.accentFill }, !isPlaying && styles.statusDotPaused, !isPlaying && { backgroundColor: theme.colors.textMuted }]} />
                <Text style={[styles.statusLabel, { color: theme.colors.accentText }]}>{isBuffering ? 'BUFFERING' : isPlaying ? 'NOW PLAYING' : 'PAUSED'}</Text>
                {locked ? <Text style={[styles.previewLabel, { color: theme.colors.textMuted, borderLeftColor: theme.colors.border }]}>PREVIEW</Text> : null}
                {progressLabel ? <Text style={[styles.progressLabel, { color: theme.colors.textMuted }]}>{progressLabel}</Text> : null}
              </View>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
              <Text style={[styles.artist, { color: theme.colors.textSecondary }]} numberOfLines={1}>{artist}</Text>
            </View>

          </Pressable>

          <View style={styles.identityActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Collapse mini player"
              onPress={() => {
                selectionHaptic();
                onToggleCollapse?.();
              }}
              style={({ pressed }) => [styles.identityAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && styles.iconButtonPressed]}
            >
              <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <PlaybackSeekBar
            ratio={progressPercent / 100}
            duration={onSeek ? 100 : 0}
            position={progressPercent}
            onSeek={(ratio) => onSeek?.(ratio)}
            accessibilityLabel="Playback progress"
            style={styles.progressSeek}
            trackStyle={[styles.progressTrack, { backgroundColor: theme.colors.borderStrong }]}
            fillStyle={[styles.progressFill, { backgroundColor: theme.colors.accentFill }]}
            thumbStyle={[styles.progressKnob, { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.accentFill, shadowColor: theme.colors.accentFill }]}
          />

          <View style={styles.controlRow}>
            <PlayerIconButton
              accessibilityLabel={canLike ? (liked ? 'Remove from saved' : 'Save current track') : 'Save unavailable for this track'}
              icon={liked ? 'favorite' : 'favorite-border'}
              active={liked}
              disabled={!canLike}
              onPress={onLikePress}
            />
            <PlayerIconButton accessibilityLabel="Previous track" icon="skip-previous" quiet compact onPress={onPrevious} />
            <PlayerIconButton
              accessibilityLabel={isPlaying ? 'Pause media' : 'Play media'}
              icon={isBuffering ? 'hourglass-empty' : isPlaying ? 'pause' : 'play-arrow'}
              prominent
              onPress={() => {
                impactHaptic();
                onTogglePlay?.();
              }}
            />
            <PlayerIconButton accessibilityLabel="Next track" icon="skip-next" quiet compact onPress={onNext} />
            <PlayerIconButton accessibilityLabel="Open player options" icon="more-horiz" onPress={onMorePress} />
          </View>
        </GlassPanel>
      </LiftSurface>
    </View>
  );
}

function ArtworkTile({ artwork, locked }: { artwork?: string | null; locked?: boolean }) {
  return (
    <View style={styles.artworkTile}>
      {artwork ? (
        <PluggdImage uri={artwork} style={styles.fill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#3A241A', '#17100C']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.artworkFallback}
        >
          <MaterialIcons name="music-note" size={24} color={liquidGlassColors.textPrimary} />
        </LinearGradient>
      )}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.18)', 'transparent', 'rgba(0,0,0,0.28)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      {locked ? (
        <View style={styles.tileLockBadge}>
          <MaterialIcons name="lock" size={11} color="#0A0705" />
        </View>
      ) : null}
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
  compact,
  disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  accessibilityLabel: string;
  onPress?: () => void;
  active?: boolean;
  prominent?: boolean;
  quiet?: boolean;
  compact?: boolean;
  disabled?: boolean;
}) {
  const theme = usePluggdTheme();
  const isDisabled = disabled || !onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, selected: !!active }}
      hitSlop={5}
      disabled={isDisabled}
      onPress={(event: GestureResponderEvent) => {
        event.stopPropagation();
        if (!prominent) selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        compact && styles.iconButtonCompact,
        prominent && styles.iconButtonProminentFrame,
        isDisabled && styles.iconButtonDisabled,
        pressed && !isDisabled && styles.iconButtonPressed,
      ]}
    >
      <View
        style={[
          styles.iconButtonSurface,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow },
          quiet && styles.iconButtonQuiet,
          prominent && styles.iconButtonProminent,
          prominent && { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentFill, shadowColor: theme.colors.accentFill },
          active && styles.iconButtonActive,
          active && { borderColor: theme.colors.borderAccent, backgroundColor: theme.scheme === 'light' ? 'rgba(232,79,0,0.10)' : 'rgba(255,102,0,0.10)' },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={prominent ? 29 : 23}
          color={active ? theme.colors.accentText : prominent ? theme.colors.onAccent : theme.colors.textSecondary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 12,
  },
  collapsedWrap: {
    alignSelf: 'flex-end',
    marginRight: 28,
    marginLeft: 28,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedPressable: {
    width: 58,
    height: 58,
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
    height: 122,
    shadowColor: '#000',
    shadowOpacity: 0.82,
    shadowRadius: 54,
    shadowOffset: { width: 0, height: 34 },
  },
  cardContent: {
    width: '100%',
    height: 122,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: liquidGlassColors.accent,
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.82,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  trackTapPressed: {
    opacity: 0.86,
  },
  trackIdentity: {
    width: '100%',
    minWidth: 0,
    height: 70,
    position: 'relative',
  },
  tileLift: {
    position: 'absolute',
    left: 12,
    top: 8,
    width: 54,
    height: 54,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  artworkTile: {
    width: 54,
    height: 54,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#21150F',
    borderWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.34)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderRightColor: 'rgba(0,0,0,0.36)',
    borderBottomColor: 'rgba(0,0,0,0.58)',
  },
  tileLockBadge: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: liquidGlassColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'absolute',
    left: 77,
    right: 104,
    top: 8,
    height: 54,
    minWidth: 0,
    justifyContent: 'center',
    gap: 1,
  },
  statusRow: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: liquidGlassColors.accent,
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  statusDotPaused: {
    backgroundColor: liquidGlassColors.textMuted,
    shadowOpacity: 0,
  },
  statusLabel: {
    color: liquidGlassColors.accent,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 1.2,
  },
  previewLabel: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.22)',
    paddingLeft: 6,
  },
  progressLabel: {
    flexShrink: 1,
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.2,
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  artist: {
    color: liquidGlassColors.textSecondary,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12.5,
    lineHeight: 16,
  },
  identityActions: {
    position: 'absolute',
    right: 9,
    top: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 3,
  },
  identityAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidGlassColors.borderSoft,
  },
  controlRow: {
    height: 49,
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSurface: {
    width: '100%',
    height: '100%',
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
  iconButtonCompact: {
    width: 44,
    height: 44,
  },
  iconButtonProminentFrame: {
    width: 48,
    height: 48,
  },
  iconButtonProminent: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: liquidGlassColors.accent,
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
  },
  iconButtonActive: {
    borderColor: 'rgba(255,102,0,0.36)',
    backgroundColor: 'rgba(255,102,0,0.10)',
  },
  iconButtonDisabled: {
    opacity: 0.36,
  },
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  progressSeek: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 49,
    height: 44,
  },
  progressTrack: {
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  progressFill: {
    height: 4,
    borderRadius: 3,
    backgroundColor: liquidGlassColors.accent,
  },
  progressKnob: {
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: '#FFF7F1',
    borderWidth: 2,
    borderColor: liquidGlassColors.accent,
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
