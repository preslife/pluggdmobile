import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassTrackCardProps = {
  index?: string;
  title: string;
  artist?: string;
  duration?: string;
  imageUrl?: string | null;
  isPlaying?: boolean;
  onPlay?: () => void;
  onMore?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GlassTrackCard({
  index,
  title,
  artist,
  duration,
  imageUrl,
  isPlaying,
  onPlay,
  onMore,
  style,
}: GlassTrackCardProps) {
  return (
    <LiftSurface depth="low" style={style}>
      <GlassPanel intensity="subtle" radius={liquidGlassRadii.lg} style={styles.card} contentStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${isPlaying ? 'Pause' : 'Play'} ${title}`}
          onPress={() => {
            impactHaptic();
            onPlay?.();
          }}
          style={styles.playTarget}
        >
          <View style={styles.artwork}>
            {imageUrl ? <PluggdImage uri={imageUrl} style={styles.fill} resizeMode="cover" /> : null}
            {!imageUrl ? <Text style={styles.index}>{index ?? '01'}</Text> : null}
          </View>
          <View style={styles.playBadge}>
            <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={17} color={liquidGlassColors.backgroundDeep} />
          </View>
        </Pressable>

        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {artist ? <Text style={styles.artist} numberOfLines={1}>{artist}</Text> : null}
        </View>

        {duration ? <Text style={styles.duration}>{duration}</Text> : null}
        {onMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More options for ${title}`}
            onPress={() => {
              selectionHaptic();
              onMore();
            }}
            style={styles.more}
          >
            <MaterialIcons name="more-horiz" size={22} color={liquidGlassColors.textMuted} />
          </Pressable>
        ) : null}
      </GlassPanel>
    </LiftSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
  },
  content: {
    minHeight: 72,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  playTarget: {
    width: 52,
    height: 52,
  },
  artwork: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  index: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Black',
    fontSize: 13,
  },
  playBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: liquidGlassColors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Black',
    fontSize: 14,
    lineHeight: 18,
  },
  artist: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 15,
  },
  duration: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
  },
  more: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
