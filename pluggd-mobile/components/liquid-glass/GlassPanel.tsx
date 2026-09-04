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
  decorative?: boolean;
};

export function GlassPanel({
  children,
  intensity = 'default',
  radius = liquidGlassRadii.xl,
  style,
  contentStyle,
  decorative = true,
}: GlassPanelProps) {
  const theme = usePluggdTheme();
  const material = liquidGlassIntensity[intensity];
  const light = theme.scheme === 'light';
  const fallback = light ? theme.colors.glassFallback : material.backgroundColor;

  return (
    <PluggdGlassSurface
      glassEffectStyle="regular"
      blurIntensity={material.blurIntensity}
      colorScheme={theme.scheme}
      fallbackColor={fallback}
      tintColor={light ? theme.colors.glassTint : material.backgroundColor}
      borderColor={theme.colors.border}
      style={[
        styles.panel,
        !light && decorative && webPanel[intensity],
        intensity === 'strong' && styles.panelStrong,
        {
          borderRadius: radius,
          borderTopColor: light ? 'rgba(255,255,255,0.94)' : liquidGlassColors.borderTop,
          borderLeftColor: light ? 'rgba(255,255,255,0.70)' : liquidGlassColors.borderLeft,
          borderRightColor: light ? theme.colors.border : 'rgba(0,0,0,0.30)',
          borderBottomColor: light ? theme.colors.borderStrong : liquidGlassColors.borderDark,
          shadowColor: theme.colors.shadow,
        },
        style,
      ]}
    >
      {decorative ? <><LinearGradient
        pointerEvents="none"
        colors={light
          ? ['rgba(255,255,255,0.52)', 'rgba(255,248,237,0.22)', 'rgba(244,231,210,0.42)']
          : ['rgba(45,45,68,0.36)', 'rgba(14,16,31,0.30)', 'rgba(2,4,11,0.64)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.topWash, light && styles.topWashLight]} />
      <View pointerEvents="none" style={[styles.cornerGlowA, light && styles.cornerGlowLight]} />
      <View pointerEvents="none" style={[styles.cornerGlowB, light && styles.cornerGlowBLight]} />
      </> : null}
      <View pointerEvents="none" style={[styles.topRim, { backgroundColor: liquidGlassColors.borderTop }]} />
      <View pointerEvents="none" style={[styles.leftRim, { backgroundColor: liquidGlassColors.borderLeft }]} />
      <View pointerEvents="none" style={[styles.rightCavity, light && { backgroundColor: theme.colors.border }]} />
      {decorative ? <><View pointerEvents="none" style={styles.innerGlow} />
      <View pointerEvents="none" style={styles.sheen} />
      <View pointerEvents="none" style={[styles.bottomShade, light && styles.bottomShadeLight]} /></> : null}
      <View pointerEvents="none" style={[styles.bottomEdge, light && { backgroundColor: theme.colors.borderStrong }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </PluggdGlassSurface>
  );
}

const webPanel = {
  subtle: Platform.select({
    web: {
      backgroundImage: 'linear-gradient(156deg, rgba(36,35,38,0.34) 0%, rgba(15,14,16,0.24) 52%, rgba(7,6,8,0.56) 100%)',
      backdropFilter: 'blur(34px) saturate(1.22)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.58)',
    },
    default: {},
  }) as ViewStyle,
  default: Platform.select({
    web: {
      backgroundImage: 'linear-gradient(156deg, rgba(40,39,42,0.42) 0%, rgba(15,14,16,0.30) 52%, rgba(7,6,8,0.62) 100%)',
      backdropFilter: 'blur(36px) saturate(1.25)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.62)',
    },
    default: {},
  }) as ViewStyle,
  strong: Platform.select({
    web: {
      backgroundImage: 'linear-gradient(156deg, rgba(44,43,47,0.50) 0%, rgba(15,14,16,0.36) 52%, rgba(6,5,7,0.70) 100%)',
      backdropFilter: 'blur(40px) saturate(1.28)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.66), 0 0 50px rgba(255,255,255,0.05)',
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
  topWashLight: { backgroundColor: 'rgba(255,255,255,0.24)' },
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
    backgroundColor: 'rgba(255,150,80,0.10)',
    opacity: 0.72,
  },
  cornerGlowLight: { backgroundColor: 'rgba(255,255,255,0.34)', opacity: 0.48 },
  cornerGlowBLight: { backgroundColor: 'rgba(232,79,0,0.045)', opacity: 0.48 },
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
  bottomShadeLight: { backgroundColor: 'rgba(91,56,31,0.035)' },
  bottomEdge: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
});
