import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayback } from '../context/PlaybackProvider';
import {
  bottomChromeInsetForLayout,
  isBottomChromeHidden,
  shouldUseWideTopNavigation,
} from '../lib/appChromeVisibility';
import { useAdaptiveNavigationMode } from './adaptiveNavigation';

/**
 * Space a scrolling screen must reserve at the bottom so its last row clears
 * the floating mini player and dock.
 *
 * Use it on the scroll container, not on the screen wrapper — the chrome floats
 * over the page, so the padding belongs inside the scrollable content:
 *
 *   const bottomInset = useBottomChromeInset();
 *   <ScrollView contentContainerStyle={{ paddingBottom: bottomInset }}>
 *
 * Sizes for the expanded mini player. A collapsed player leaves a little extra
 * room, which is the right way to be wrong — under-reserving hides content.
 */
export function useBottomChromeInset(): number {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { currentTrack } = usePlayback();
  const navigationMode = useAdaptiveNavigationMode();
  const bottomHidden = isBottomChromeHidden(pathname);
  const wideTopNavigation = shouldUseWideTopNavigation(pathname, navigationMode);

  return bottomChromeInsetForLayout({
    safeBottom: insets.bottom,
    bottomHidden,
    wideTopNavigation,
    hasCurrentTrack: Boolean(currentTrack),
  });
}
