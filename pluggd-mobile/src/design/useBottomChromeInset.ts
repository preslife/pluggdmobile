import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayback } from '../context/PlaybackProvider';
import { BOTTOM_CHROME, isBottomChromeHidden } from '../lib/appChromeVisibility';

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

  if (isBottomChromeHidden(pathname)) {
    return insets.bottom + BOTTOM_CHROME.breathing;
  }

  const dock = BOTTOM_CHROME.dock + Math.max(insets.bottom, BOTTOM_CHROME.dockInsetFloor);
  const player = currentTrack ? BOTTOM_CHROME.miniPlayer + BOTTOM_CHROME.gap : 0;

  return dock + player + BOTTOM_CHROME.breathing;
}
