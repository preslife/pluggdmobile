import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { liquidGlassColors, type LiquidGlassTone } from '../../src/design/liquidGlassTokens';

type LiquidBackgroundProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: LiquidGlassTone;
};

function bottomGlowForTone(tone: LiquidGlassTone) {
  if (tone === 'blue') return 'rgba(83,112,230,0.12)';
  if (tone === 'violet' || tone === 'purple') return 'rgba(126,106,255,0.13)';
  if (tone === 'rose') return 'rgba(255,112,166,0.10)';
  if (tone === 'amber') return 'rgba(255,174,74,0.10)';
  return 'rgba(255,82,0,0.09)';
}

export function LiquidBackground({ children, style, tone = 'accent' }: LiquidBackgroundProps) {
  return (
    <View pointerEvents="box-none" style={[styles.wrap, style]}>
      <LinearGradient
        colors={[
          liquidGlassColors.backgroundTop,
          liquidGlassColors.backgroundMid,
          '#0C0B0F',
          liquidGlassColors.backgroundDeep,
        ]}
        locations={[0, 0.32, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.violetWash, { backgroundColor: liquidGlassColors.violetGlow }]} />
      <View pointerEvents="none" style={[styles.blueWash, { backgroundColor: liquidGlassColors.blueGlow }]} />
      <View pointerEvents="none" style={[styles.bottomWash, { backgroundColor: bottomGlowForTone(tone) }]} />
      <View pointerEvents="none" style={styles.vignette} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: liquidGlassColors.backgroundDeep,
  },
  violetWash: {
    position: 'absolute',
    left: '-28%',
    top: '-16%',
    width: '92%',
    height: '48%',
    borderRadius: 220,
    opacity: 0.72,
    transform: [{ rotate: '-12deg' }],
  },
  blueWash: {
    position: 'absolute',
    right: '-24%',
    top: '-18%',
    width: '78%',
    height: '42%',
    borderRadius: 200,
    opacity: 0.66,
    transform: [{ rotate: '10deg' }],
  },
  bottomWash: {
    position: 'absolute',
    right: '-22%',
    bottom: '-24%',
    width: '86%',
    height: '44%',
    borderRadius: 220,
    opacity: 0.72,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
});
