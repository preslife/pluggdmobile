export const TOP_NAV_MIN_WIDTH = 600;
export const EXPANDED_NAV_MIN_WIDTH = 840;

export type AdaptiveNavigationMode = 'compact' | 'top';
export type AdaptiveNavigationWidthClass = 'compact' | 'medium' | 'expanded';

export function navigationWidthClassForWidth(width: number): AdaptiveNavigationWidthClass {
  if (width < TOP_NAV_MIN_WIDTH) return 'compact';
  return width < EXPANDED_NAV_MIN_WIDTH ? 'medium' : 'expanded';
}

export function navigationModeForWidth(width: number): AdaptiveNavigationMode {
  return navigationWidthClassForWidth(width) === 'compact' ? 'compact' : 'top';
}

export function navigationModeForPlatformWidth(
  platform: string,
  width: number,
): AdaptiveNavigationMode {
  return platform === 'android' ? navigationModeForWidth(width) : 'compact';
}
