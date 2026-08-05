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
  // Compatibility aliases. The selected mobile redesign uses the concept-1
  // Sora/Satoshi typography system everywhere, including older call sites.
  serifItalic: 'Sora-SemiBold',
  serifItalicBold: 'Sora-Bold',
  serif: 'Sora-SemiBold',
  interSemiBold: 'Satoshi-Bold',
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
  /**
   * The masthead on an index or hub screen — Home, Discover, Events, Store,
   * Mixes, Soundboards, BeatPlug, THE PLUG.
   *
   * These had drifted to eight different sizes across the app (29, 30, 31, 32,
   * 34, 36, 48 and 62) in two different families; "PLUGGD Store" at 62 wrapped
   * onto two lines at 375pt. Every page title uses this, so it can only drift
   * again on purpose. Screens layer their own colour on top.
   */
  pageTitle: {
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.1,
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
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    fontFamily: pluggdFonts.satoshiMedium,
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
