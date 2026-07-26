/**
 * PLUGGD selected mobile discovery system.
 *
 * Display: Sora
 * Data labels: Satoshi Black (uppercase, tracked)
 * UI/body: Satoshi
 * Brand accent: #ff6600
 */

export const ed = {
  /** --ed-orange / --pvs-orange */
  orange: '#ff6600',
  orangeSoft: 'rgba(255, 102, 0, 0.14)',
  /** --pvs-ink — warm near-black used on paper surfaces */
  ink: '#22170f',
  inkMuted: 'rgba(34, 23, 15, 0.80)',
  inkSoft: 'rgba(34, 23, 15, 0.62)',
  /** --pvs-paper — cream page */
  paper: '#fff8ed',
  /** --pvs-paper-2 — deeper cream for panels */
  paper2: '#f4e7d2',
  /** --pvs-line — hairline on paper */
  paperLine: 'rgba(91, 56, 31, 0.16)',
  /** --pvs-night — warm near-black page */
  night: '#070605',
  night2: '#111318',
  nightCard: 'rgba(255, 255, 255, 0.06)',
  nightLine: 'rgba(255, 255, 255, 0.12)',
  /** --pvs-muted — cream text at 68% on night */
  cream: '#fff8ed',
  creamMuted: 'rgba(255, 248, 237, 0.68)',
  creamSoft: 'rgba(255, 248, 237, 0.48)',
  /** CTA text on orange */
  onOrange: '#180a02',
  /** Sticky-note yellow used across soundboards / corkboards */
  note: '#f5eeae',
  noteEdge: '#e5d97f',
  /** radius: 0.75rem web / 0.9rem mobile */
  radius: 14,
  radiusSm: 10,
} as const;

export const edFonts = {
  /** Compatibility names retained while every surface moves to the selected system. */
  serif: 'Sora-SemiBold',
  serifItalic: 'Sora-Bold',
  displayBold: 'Sora-Bold',
  displayExtraBold: 'Sora-ExtraBold',
  /** Satoshi Black — tracked uppercase data labels */
  mono: 'Satoshi-Black',
  body: 'Satoshi-Regular',
  bodyMedium: 'Satoshi-Medium',
  bodyBold: 'Satoshi-Bold',
  bodyBlack: 'Satoshi-Black',
} as const;

/** pvs-eyebrow: orange, small, heavy, uppercase (Satoshi Black on web). */
export const edEyebrow = {
  color: ed.orange,
  fontFamily: edFonts.bodyBlack,
  fontSize: 12,
  letterSpacing: 1.6,
  textTransform: 'uppercase' as const,
};

/** Tracked Satoshi variant used for ledger/data labels. */
export const edMonoLabel = {
  fontFamily: edFonts.mono,
  fontSize: 11,
  letterSpacing: 1.8,
  textTransform: 'uppercase' as const,
};

/** Selected display title: Sora, tight leading. */
export function edSerifTitle(size: number) {
  return {
    fontFamily: edFonts.serif,
    fontSize: size,
    lineHeight: Math.round(size * 1.02),
    letterSpacing: -0.5,
  };
}

export function edSerifItalic(size: number) {
  return {
    fontFamily: edFonts.serifItalic,
    fontSize: size,
    lineHeight: Math.round(size * 1.02),
    letterSpacing: -0.5,
  };
}
