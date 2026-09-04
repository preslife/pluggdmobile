import { pluggdFonts } from './typography';
import { liquidGlassColors } from './liquidGlassTokens';

export const PLUGGD_ORANGE = '#ff6600';
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
    accentFill: PLUGGD_ORANGE,
    accentText: PLUGGD_ORANGE,
    accentSoft: 'rgba(255,102,0,0.14)',
    onAccent: '#180A02',
    orange: PLUGGD_ORANGE,
    live: PLUGGD_LIVE_CORAL,
    backstage: PLUGGD_VIOLET,
    background: liquidGlassColors.backgroundDeep,
    canvas: liquidGlassColors.backgroundDeep,
    backgroundDeep: '#070605',
    backgroundElevated: 'rgba(18,13,8,0.72)',
    shell: 'rgba(18,13,8,0.68)',
    surface: liquidGlassColors.surfaceDefault,
    surfaceAlt: 'rgba(36,29,21,0.82)',
    surfaceStrong: liquidGlassColors.surfaceStrong,
    surfaceRaised: 'rgba(31,24,17,0.86)',
    surfacePressed: liquidGlassColors.surfacePressed,
    border: liquidGlassColors.borderSoft,
    borderSubtle: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.16)',
    controlBorder: '#716B74',
    borderAccent: '#3B281D',
    divider: liquidGlassColors.borderSoft,
    text: liquidGlassColors.textPrimary,
    textSecondary: liquidGlassColors.textSecondary,
    textMuted: liquidGlassColors.textMuted,
    textSubtle: 'rgba(255,255,255,0.56)',
    uiMuted: '#8E8E9F',
    inactive: liquidGlassColors.textMuted,
    danger: '#FF5C5C',
    success: '#41D17D',
    glassTint: liquidGlassColors.surfaceDefault,
    glassFallback: liquidGlassColors.surfaceDefault,
    headerGlass: 'rgba(18,13,8,0.58)',
    miniPlayerGlass: liquidGlassColors.surfaceStrong,
    shadow: '#000000',
    artworkBase: '#171310',
    mediaText: '#FFFFFF',
    mediaTextMuted: 'rgba(255,255,255,0.76)',
    mediaScrim: 'rgba(5,4,3,0.86)',
    overlay: 'rgba(0,0,0,0.62)',
  },
};

export const pluggdLight = {
  scheme: 'light' as const,
  colors: {
    accent: '#B13A00',
    accentFill: PLUGGD_LIGHT_ORANGE,
    accentText: '#B13A00',
    accentSoft: 'rgba(177,58,0,0.11)',
    onAccent: '#180A02',
    orange: PLUGGD_LIGHT_ORANGE,
    live: PLUGGD_LIGHT_LIVE_CORAL,
    backstage: PLUGGD_VIOLET,
    background: '#FFF8ED',
    canvas: '#FFF8ED',
    backgroundDeep: '#FFF8ED',
    backgroundElevated: '#FFFCF7',
    shell: '#FFFCF7',
    surface: '#F4E7D2',
    surfaceAlt: '#ECDDCA',
    surfaceStrong: '#FFFCF7',
    surfaceRaised: '#FFFFFF',
    surfacePressed: '#EAD9C0',
    border: 'rgba(91,56,31,0.22)',
    borderSubtle: 'rgba(91,56,31,0.13)',
    borderStrong: 'rgba(91,56,31,0.34)',
    controlBorder: '#956E52',
    borderAccent: '#C96A32',
    divider: 'rgba(91,56,31,0.22)',
    text: '#22170F',
    textSecondary: '#49382C',
    textMuted: '#6B584A',
    textSubtle: '#745E4F',
    uiMuted: '#6B584A',
    inactive: '#745E4F',
    danger: '#B42318',
    success: '#08713B',
    glassTint: 'rgba(255,248,237,0.82)',
    glassFallback: 'rgba(255,252,247,0.94)',
    headerGlass: 'rgba(255,248,237,0.94)',
    miniPlayerGlass: 'rgba(255,252,247,0.96)',
    shadow: '#6B584A',
    artworkBase: '#E7D7C1',
    mediaText: '#FFFFFF',
    mediaTextMuted: 'rgba(255,255,255,0.78)',
    mediaScrim: 'rgba(5,4,3,0.86)',
    overlay: 'rgba(34,23,15,0.46)',
  },
};

export type PluggdTheme = typeof pluggdDark | typeof pluggdLight;
