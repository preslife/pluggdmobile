import { pluggdFonts } from './typography';
import { liquidGlassColors } from './liquidGlassTokens';

export const PLUGGD_ORANGE = '#FF5A00';
export const PLUGGD_LIGHT_ORANGE = '#E84F00';
export const PLUGGD_VIOLET = '#7C3AED';
export const PLUGGD_BACKSTAGE_VIOLET = PLUGGD_VIOLET;
export const PLUGGD_LIVE_CORAL = '#FF4757';
export const PLUGGD_LIGHT_LIVE_CORAL = '#E63D4C';

export const pluggdRadii = {
  compact: 8,
  control: 12,
  card: 16,
  chrome: 20,
  sheet: 26,
  pill: 999,
};

export const pluggdSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const pluggdTypography = {
  fonts: pluggdFonts,
  micro: 10,
  caption: 11,
  meta: 12,
  body: 14,
  control: 14,
  lead: 16,
  section: 18,
  heading: 22,
  title: 32,
  hero: 34,
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const pluggdDark = {
  scheme: 'dark' as const,
  colors: {
    accent: PLUGGD_ORANGE,
    orange: PLUGGD_ORANGE,
    live: PLUGGD_LIVE_CORAL,
    backstage: PLUGGD_VIOLET,
    background: liquidGlassColors.backgroundDeep,
    canvas: liquidGlassColors.backgroundDeep,
    backgroundDeep: '#05070F',
    backgroundElevated: 'rgba(10,12,24,0.72)',
    shell: 'rgba(10,12,24,0.68)',
    surface: liquidGlassColors.surfaceDefault,
    surfaceAlt: 'rgba(34,35,52,0.72)',
    surfaceStrong: liquidGlassColors.surfaceStrong,
    surfaceRaised: 'rgba(26,27,43,0.72)',
    surfacePressed: liquidGlassColors.surfacePressed,
    border: liquidGlassColors.borderSoft,
    borderSubtle: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.16)',
    borderAccent: '#3B281D',
    divider: liquidGlassColors.borderSoft,
    text: liquidGlassColors.textPrimary,
    textSecondary: liquidGlassColors.textSecondary,
    textMuted: liquidGlassColors.textMuted,
    textSubtle: liquidGlassColors.textSubtle,
    uiMuted: '#8E8E9F',
    inactive: liquidGlassColors.textMuted,
    danger: '#FF5C5C',
    success: '#41D17D',
    glassTint: liquidGlassColors.surfaceDefault,
    glassFallback: liquidGlassColors.surfaceDefault,
    headerGlass: 'rgba(10,12,24,0.58)',
    miniPlayerGlass: liquidGlassColors.surfaceStrong,
    shadow: '#000000',
    artworkBase: '#111827',
  },
};

export const pluggdLight = {
  scheme: 'light' as const,
  colors: {
    accent: PLUGGD_LIGHT_ORANGE,
    orange: PLUGGD_LIGHT_ORANGE,
    live: PLUGGD_LIGHT_LIVE_CORAL,
    backstage: PLUGGD_VIOLET,
    background: '#F7F7F9',
    canvas: '#F7F7F9',
    backgroundDeep: '#F7F7F9',
    backgroundElevated: '#FFFFFF',
    shell: '#FFFFFF',
    surface: '#F0F0F3',
    surfaceAlt: '#E7E7EC',
    surfaceStrong: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfacePressed: '#ECECF1',
    border: '#D9D9E0',
    borderSubtle: '#E7E7EC',
    borderStrong: '#CFCFD8',
    borderAccent: '#F4A06D',
    divider: '#D9D9E0',
    text: '#08080C',
    textSecondary: '#3E3E46',
    textMuted: '#70707A',
    textSubtle: '#70707A',
    uiMuted: '#70707A',
    inactive: '#7D7D88',
    danger: '#D92D20',
    success: '#0E8E4D',
    glassTint: 'rgba(255,255,255,0.72)',
    glassFallback: 'rgba(255,255,255,0.92)',
    headerGlass: 'rgba(255,255,255,0.88)',
    miniPlayerGlass: 'rgba(255,255,255,0.9)',
    shadow: '#B8B8C3',
    artworkBase: '#E8E8EE',
  },
};

export type PluggdTheme = typeof pluggdDark | typeof pluggdLight;
