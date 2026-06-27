import type { ViewStyle } from 'react-native';

export const liquidGlassColors = {
  backgroundTop: '#34334F',
  backgroundMid: '#272840',
  backgroundDeep: '#05070F',

  surfaceSubtle: 'rgba(8,10,20,0.26)',
  surfaceDefault: 'rgba(10,12,24,0.36)',
  surfaceStrong: 'rgba(12,14,27,0.48)',

  surfaceDark: 'rgba(5,7,15,0.62)',
  surfacePressed: 'rgba(255,255,255,0.075)',

  borderTop: 'rgba(255,255,255,0.36)',
  borderLeft: 'rgba(255,255,255,0.16)',
  borderSoft: 'rgba(255,255,255,0.09)',
  borderDark: 'rgba(0,0,0,0.56)',

  textPrimary: 'rgba(255,255,255,0.96)',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.46)',
  textSubtle: 'rgba(255,255,255,0.30)',

  accent: '#FF5200',
  accentGlow: 'rgba(255,82,0,0.75)',

  violetGlow: 'rgba(126,106,255,0.24)',
  blueGlow: 'rgba(83,112,230,0.14)',
};

export const liquidGlassRadii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 26,
  pill: 999,
};

export const liquidGlassElevation = {
  low: {
    shadowColor: '#000',
    shadowOpacity: 0.62,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  normal: {
    shadowColor: '#000',
    shadowOpacity: 0.72,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 28 },
    elevation: 16,
  },
  high: {
    shadowColor: '#000',
    shadowOpacity: 0.84,
    shadowRadius: 64,
    shadowOffset: { width: 0, height: 42 },
    elevation: 24,
  },
} satisfies Record<'low' | 'normal' | 'high', ViewStyle>;

export type GlassIntensity = 'subtle' | 'default' | 'strong';

export const liquidGlassIntensity: Record<
  GlassIntensity,
  { backgroundColor: string; blurIntensity: number }
> = {
  subtle: {
    backgroundColor: liquidGlassColors.surfaceSubtle,
    blurIntensity: 18,
  },
  default: {
    backgroundColor: liquidGlassColors.surfaceDefault,
    blurIntensity: 24,
  },
  strong: {
    backgroundColor: liquidGlassColors.surfaceStrong,
    blurIntensity: 32,
  },
};

export type LiquidGlassTone = 'violet' | 'blue' | 'amber' | 'rose' | 'purple' | 'accent';

export const liquidGlassToneColors: Record<LiquidGlassTone, readonly [string, string]> = {
  violet: ['rgba(126,106,255,0.48)', 'rgba(53,45,107,0.14)'],
  blue: ['rgba(83,112,230,0.42)', 'rgba(25,47,115,0.14)'],
  amber: ['rgba(255,174,74,0.42)', 'rgba(107,66,21,0.14)'],
  rose: ['rgba(255,112,166,0.42)', 'rgba(105,35,69,0.14)'],
  purple: ['rgba(173,91,255,0.42)', 'rgba(76,35,107,0.14)'],
  accent: ['rgba(255,82,0,0.44)', 'rgba(102,39,12,0.14)'],
};
