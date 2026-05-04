export const PLUGGD_ORANGE = '#FF5200';

export const pluggdRadii = {
  compact: 8,
  control: 12,
  chrome: 18,
  sheet: 24,
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
    heavy: '700' as const,
  },
};

export const pluggdDark = {
  scheme: 'dark' as const,
  colors: {
    accent: PLUGGD_ORANGE,
    background: '#080808',
    backgroundElevated: '#0B0B0B',
    surface: '#151515',
    surfaceAlt: '#111111',
    surfaceStrong: '#1D120C',
    surfacePressed: '#20140F',
    border: '#262626',
    borderSubtle: '#171717',
    borderAccent: '#3A261A',
    text: '#FFFFFF',
    textMuted: '#AFAFAF',
    textSubtle: '#777777',
    danger: '#FF5C5C',
    success: '#41D17D',
    glassTint: 'rgba(8,8,8,0.58)',
    glassFallback: 'rgba(11,11,11,0.88)',
    shadow: '#000000',
    artworkBase: '#24120C',
  },
};

export const pluggdLight = {
  scheme: 'light' as const,
  colors: {
    accent: PLUGGD_ORANGE,
    background: '#F7F7F5',
    backgroundElevated: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F1EF',
    surfaceStrong: '#FFF0E8',
    surfacePressed: '#FFE6D8',
    border: '#DADADA',
    borderSubtle: '#E6E6E3',
    borderAccent: '#FFB58A',
    text: '#080808',
    textMuted: '#5F5F5F',
    textSubtle: '#858585',
    danger: '#D92D20',
    success: '#0E8E4D',
    glassTint: 'rgba(255,255,255,0.62)',
    glassFallback: 'rgba(255,255,255,0.9)',
    shadow: '#B8B8B8',
    artworkBase: '#FFE4D4',
  },
};

export type PluggdTheme = typeof pluggdDark | typeof pluggdLight;
