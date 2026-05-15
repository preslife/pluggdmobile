import { pluggdFonts } from './typography';

export const PLUGGD_ORANGE = '#FF5A00';
export const PLUGGD_VIOLET = '#7C3AED';

export const pluggdRadii = {
  compact: 8,
  control: 12,
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
};

export const pluggdTypography = {
  fonts: pluggdFonts,
  micro: 10,
  caption: 11,
  meta: 12,
  body: 13,
  control: 14,
  lead: 16,
  section: 18,
  heading: 22,
  title: 26,
  hero: 32,
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
    background: '#08080C',
    backgroundElevated: '#0D0D11',
    surface: '#12121A',
    surfaceAlt: '#1F1F2E',
    surfaceStrong: '#171724',
    surfacePressed: '#1B1B2A',
    border: '#1F1F2E',
    borderSubtle: '#181824',
    borderAccent: '#3B281D',
    text: '#FFFFFF',
    textMuted: '#AFAFAF',
    textSubtle: '#777777',
    danger: '#FF5C5C',
    success: '#41D17D',
    glassTint: 'rgba(8,8,8,0.62)',
    glassFallback: 'rgba(12,12,12,0.9)',
    shadow: '#000000',
    artworkBase: '#111827',
  },
};

export const pluggdLight = {
  scheme: 'light' as const,
  colors: {
    accent: PLUGGD_ORANGE,
    background: '#F7F6F2',
    backgroundElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F2F1ED',
    surfaceStrong: '#FFF1E8',
    surfacePressed: '#FFE7D9',
    border: '#DEDDD8',
    borderSubtle: '#E9E7E1',
    borderAccent: '#FFB58A',
    text: '#080808',
    textMuted: '#62605C',
    textSubtle: '#858585',
    danger: '#D92D20',
    success: '#0E8E4D',
    glassTint: 'rgba(255,255,255,0.7)',
    glassFallback: 'rgba(255,255,255,0.94)',
    shadow: '#9B9690',
    artworkBase: '#FFE4D4',
  },
};

export type PluggdTheme = typeof pluggdDark | typeof pluggdLight;
