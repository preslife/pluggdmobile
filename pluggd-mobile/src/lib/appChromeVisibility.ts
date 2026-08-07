/**
 * Single source of truth for which routes render the floating bottom chrome
 * (mini player + dock), and how tall that chrome is.
 *
 * AppChrome renders the chrome absolutely over the page, so every scrolling
 * screen has to reserve room for it. Both sides read these helpers so the
 * reserved space and the rendered chrome can never disagree.
 */

const HIDDEN_PREFIXES = ['/auth', '/player', '/studio', '/connect'];

const HIDDEN_EXACT = new Set([
  '/live/session',
  '/live/feed',
  '/live/create',
  '/ticket-scan',
  '/swipe-beats',
  '/creator/upload',
  '/creator/onboarding',
  '/edit-profile',
]);

const BOTTOM_HIDDEN_EXACT = new Set(['/wallet', '/creator/events']);

/** Strip the expo-router group segment so predicates see the public path. */
export function normalizeChromePath(pathname: string | null | undefined): string {
  return (pathname || '/').replace('/(tabs)', '') || '/';
}

/** True when the route hides all app chrome (header and bottom). */
export function isAppChromeHidden(pathname: string | null | undefined): boolean {
  const normalized = normalizeChromePath(pathname);
  return (
    HIDDEN_EXACT.has(normalized) ||
    normalized.startsWith('/story/') ||
    normalized.startsWith('/plug/') ||
    normalized.startsWith('/mixes/') ||
    HIDDEN_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
  );
}

/** True when the route hides the mini player + dock specifically. */
export function isBottomChromeHidden(pathname: string | null | undefined): boolean {
  const normalized = normalizeChromePath(pathname);
  return (
    isAppChromeHidden(normalized) ||
    BOTTOM_HIDDEN_EXACT.has(normalized) ||
    normalized.startsWith('/commerce/') ||
    (normalized.startsWith('/membership/') && normalized !== '/membership')
  );
}

/**
 * Rendered heights, in points, of the pieces AppChrome stacks at the bottom.
 * Keep in sync with GlassDock and GlassMiniPlayer.
 */
export const BOTTOM_CHROME = {
  /** GlassDock controls: wrap paddingTop (5) + tab row height (60). */
  dock: 65,
  /** GlassDock material extends through this safe-area inset to the screen edge. */
  dockInsetFloor: 18,
  /** GlassMiniPlayer expanded card height. */
  miniPlayer: 122,
  /** AppChrome bottomWrap gap between the mini player and the dock. */
  gap: 5,
  /** Breathing room so the last row never sits flush against the chrome. */
  breathing: 24,
} as const;
