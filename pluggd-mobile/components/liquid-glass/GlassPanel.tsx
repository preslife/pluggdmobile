import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PluggdGlassSurface } from '../PluggdPrimitives';
import {
  liquidGlassColors,
  liquidGlassIntensity,
  liquidGlassRadii,
  type GlassIntensity,
} from '../../src/design/liquidGlassTokens';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

type GlassPanelProps = {
  children?: ReactNode;
  intensity?: GlassIntensity;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function GlassPanel({
  children,
  intensity = 'default',
  radius = liquidGlassRadii.xl,
  style,
  contentStyle,
}: GlassPanelProps) {
  const theme = usePluggdTheme();
  const material = liquidGlassIntensity[intensity];

  return (
    <PluggdGlassSurface
      glassEffectStyle="regular"
      blurIntensity={material.blurIntensity}
      colorScheme={theme.scheme}
      fallbackColor={material.backgroundColor}
      tintColor={material.backgroundColor}
      borderColor={liquidGlassColors.borderSoft}
      style={[
        styles.panel,
        webPanel[intensity],
        intensity === 'strong' && styles.panelStrong,
        {
          borderRadius: radius,
          borderTopColor: liquidGlassColors.borderTop,
          borderLeftColor: liquidGlassColors.borderLeft,
          borderRightColor: 'rgba(0,0,0,0.30)',
          borderBottomColor: liquidGlassColors.borderDark,
        },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(45,45,68,0.36)', 'rgba(14,16,31,0.30)', 'rgba(2,4,11,0.64)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.topWash} />
      <View pointerEvents="none" style={styles.cornerGlowA} />
      <View pointerEvents="none" style={styles.cornerGlowB} />
      <View pointerEvents="none" style={[styles.topRim, { backgroundColor: liquidGlassColors.borderTop }]} />
      <View pointerEvents="none" style={[styles.leftRim, { backgroundColor: liquidGlassColors.borderLeft }]} />
      <View pointerEvents="none" style={styles.rightCavity} />
      <View pointerEvents="none" style={styles.innerGlow} />
      <View pointerEvents="none" style={styles.sheen} />
      <View pointerEvents="none" style={styles.bottomShade} />
      <View pointerEvents="none" style={styles.bottomEdge} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </PluggdGlassSurface>
  );
}

const webPanel = {
  subtle: Platform.select({
    web: {
      backgroundImage: 'linear-gradient(156deg, rgba(38,39,60,0.34) 0%, rgba(10,12,24,0.24) 52%, rgba(4,6,14,0.56) 100%)',
      backdropFilter: 'blur(34px) saturate(1.22)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.58)',
    },
    default: {},
  }) as ViewStyle,
  default: Platform.select({
    web: {
      backgroundImage: 'linear-gradient(156deg, rgba(42,43,66,0.42) 0%, rgba(10,12,24,0.30) 52%, rgba(4,6,14,0.62) 100%)',
      backdropFilter: 'blur(36px) saturate(1.25)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.62)',
    },
    default: {},
  }) as ViewStyle,
  strong: Platform.select({
    web: {
      backgroundImage: 'linear-gradient(156deg, rgba(46,47,72,0.50) 0%, rgba(10,12,24,0.36) 52%, rgba(3,5,13,0.70) 100%)',
      backdropFilter: 'blur(40px) saturate(1.28)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.66), 0 0 50px rgba(177,169,255,0.11)',
    },
    default: {},
  }) as ViewStyle,
};

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  panelStrong: {
    shadowColor: '#B1A9FF',
    shadowOpacity: 0.14,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  topRim: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.86,
  },
  topWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '46%',
    backgroundColor: 'rgba(255,255,255,0.052)',
  },
  cornerGlowA: {
    position: 'absolute',
    left: '-14%',
    top: '-20%',
    width: '58%',
    height: '42%',
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.11)',
    opacity: 0.72,
  },
  cornerGlowB: {
    position: 'absolute',
    right: '-18%',
    top: '-10%',
    width: '56%',
    height: '48%',
    borderRadius: 190,
    backgroundColor: 'rgba(154,140,255,0.12)',
    opacity: 0.72,
  },
  leftRim: {
    position: 'absolute',
    left: 0,
    top: '12%',
    bottom: '14%',
    width: StyleSheet.hairlineWidth,
    opacity: 0.72,
  },
  rightCavity: {
    position: 'absolute',
    right: 0,
    top: '10%',
    bottom: '14%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  innerGlow: {
    position: 'absolute',
    left: '-22%',
    top: '-30%',
    width: '74%',
    height: '62%',
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.072)',
    transform: [{ rotate: '-18deg' }],
  },
  sheen: {
    position: 'absolute',
    left: '-56%',
    top: '-8%',
    width: '52%',
    height: '120%',
    backgroundColor: 'rgba(255,255,255,0.082)',
    transform: [{ rotate: '11deg' }],
    opacity: 0.92,
  },
  bottomShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '46%',
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  bottomEdge: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
});
