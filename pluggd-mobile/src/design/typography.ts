import type { TextStyle } from 'react-native';

export const pluggdFonts = {
  appTitle: 'Sora-ExtraBold',
  displaySemiBold: 'Sora-SemiBold',
  displayBold: 'Sora-Bold',
  displayExtraBold: 'Sora-ExtraBold',
  brandDisplay: 'PluggdSans5-Regular',
  satoshiLight: 'Satoshi-Light',
  satoshiRegular: 'Satoshi-Regular',
  satoshiMedium: 'Satoshi-Medium',
  satoshiBold: 'Satoshi-Bold',
  satoshiBlack: 'Satoshi-Black',
  // Editorial italic-serif accent (matches the web app's "comes alive" / "what's moving." treatment)
  serifItalic: 'PlayfairDisplay-Italic',
  serifItalicBold: 'PlayfairDisplay-SemiBoldItalic',
  // Roman serif for web-parity section headings ("New From Creators", "Community Pulse")
  serif: 'PlayfairDisplay-SemiBold',
  interSemiBold: 'Inter-SemiBold',
  system: undefined,
} as const;

export const pluggdTextStyles = {
  appTitle: {
    fontFamily: pluggdFonts.appTitle,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0,
  },
  appTitleLarge: {
    fontFamily: pluggdFonts.appTitle,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0,
  },
  heroTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: 0,
  },
  heading: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0,
  },
  sectionTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0,
  },
  secondaryHeading: {
    fontFamily: pluggdFonts.displaySemiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
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
