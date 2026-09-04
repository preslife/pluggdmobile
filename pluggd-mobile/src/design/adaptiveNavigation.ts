import { Platform, useWindowDimensions } from 'react-native';
import {
  navigationModeForPlatformWidth,
  navigationWidthClassForWidth,
  type AdaptiveNavigationMode,
  type AdaptiveNavigationWidthClass,
} from './adaptiveNavigationPolicy';

export {
  EXPANDED_NAV_MIN_WIDTH,
  navigationModeForPlatformWidth,
  navigationModeForWidth,
  navigationWidthClassForWidth,
  TOP_NAV_MIN_WIDTH,
} from './adaptiveNavigationPolicy';
export type {
  AdaptiveNavigationMode,
  AdaptiveNavigationWidthClass,
} from './adaptiveNavigationPolicy';

export type AdaptiveNavigationLayout = {
  mode: AdaptiveNavigationMode;
  widthClass: AdaptiveNavigationWidthClass;
};

export function useAdaptiveNavigationLayout(): AdaptiveNavigationLayout {
  const { width } = useWindowDimensions();
  return {
    mode: navigationModeForPlatformWidth(Platform.OS, width),
    widthClass: navigationWidthClassForWidth(width),
  };
}

export function useAdaptiveNavigationMode(): AdaptiveNavigationMode {
  return useAdaptiveNavigationLayout().mode;
}
