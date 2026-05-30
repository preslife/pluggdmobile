import type { TextStyle } from 'react-native';

export const pluggdFonts = {
  appTitle: 'PluggdSans5-Regular',
  satoshiLight: 'Satoshi-Light',
  satoshiRegular: 'Satoshi-Regular',
  satoshiMedium: 'Satoshi-Medium',
  satoshiBold: 'Satoshi-Bold',
  satoshiBlack: 'Satoshi-Black',
  interSemiBold: 'Inter-SemiBold',
  system: undefined,
} as const;

export const pluggdTextStyles = {
  appTitle: {
    fontFamily: pluggdFonts.appTitle,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.64,
    textTransform: 'uppercase',
  },
  appTitleLarge: {
    fontFamily: pluggdFonts.appTitle,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.68,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.48,
  },
  heading: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.24,
  },
  secondaryHeading: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.16,
  },
  pill: {
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 13,
    lineHeight: 16,
  },
  cta: {
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
  },
  backstageActivity: {
    fontFamily: pluggdFonts.interSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
} satisfies Record<string, TextStyle>;

export function configurePluggdTypography() {
  // Kept as a compatibility no-op while older imports are migrated.
  // Typography is now applied through explicit primitives and styles.
}
