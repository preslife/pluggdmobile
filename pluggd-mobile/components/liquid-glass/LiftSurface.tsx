import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { liquidGlassElevation } from '../../src/design/liquidGlassTokens';

type LiftSurfaceProps = {
  children: ReactNode;
  depth?: 'low' | 'normal' | 'high';
  style?: StyleProp<ViewStyle>;
};

export function LiftSurface({ children, depth = 'normal', style }: LiftSurfaceProps) {
  return <View style={[styles.base, liquidGlassElevation[depth], webLift[depth], style]}>{children}</View>;
}

const webLift = {
  low: Platform.select({
    web: {
      filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.86)) drop-shadow(0px 4px 8px rgba(0,0,0,0.62)) drop-shadow(0px 14px 24px rgba(0,0,0,0.36))',
    },
    default: {},
  }) as ViewStyle,
  normal: Platform.select({
    web: {
      filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.90)) drop-shadow(0px 7px 11px rgba(0,0,0,0.78)) drop-shadow(0px 20px 30px rgba(0,0,0,0.58)) drop-shadow(0px 42px 54px rgba(0,0,0,0.36))',
    },
    default: {},
  }) as ViewStyle,
  high: Platform.select({
    web: {
      filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.96)) drop-shadow(0px 12px 18px rgba(0,0,0,0.82)) drop-shadow(0px 30px 42px rgba(0,0,0,0.62)) drop-shadow(0px 62px 80px rgba(0,0,0,0.38))',
    },
    default: {},
  }) as ViewStyle,
};

const styles = StyleSheet.create({
  base: {
    position: 'relative',
  },
});
