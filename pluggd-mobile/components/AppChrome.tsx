import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdaptiveNavigationMode } from '../src/design/adaptiveNavigation';
import {
  BOTTOM_CHROME,
  hasDedicatedAppHeader,
  isAppChromeHidden,
  isBottomChromeHidden,
  normalizeChromePath,
  shouldUseWideTopNavigation,
} from '../src/lib/appChromeVisibility';
import { AdaptivePluggdNavigation } from './AdaptivePluggdNavigation';
import MiniPlayer from './MiniPlayer';
import { MobileHeader } from './MobileHeader';

export function AppChrome() {
  const pathname = usePathname() || '/';
  const insets = useSafeAreaInsets();
  const navigationMode = useAdaptiveNavigationMode();
  const normalized = normalizeChromePath(pathname);
  const ownsHeader = hasDedicatedAppHeader(normalized);
  const hidden = isAppChromeHidden(normalized);
  const bottomHidden = isBottomChromeHidden(normalized);
  const wideTopNavigation = shouldUseWideTopNavigation(normalized, navigationMode);

  if (hidden) return null;

  return (
    <>
      {wideTopNavigation ? (
        <AdaptivePluggdNavigation mode="top" />
      ) : ownsHeader ? null : (
        <MobileHeader />
      )}
      {bottomHidden ? null : (
        <View
          pointerEvents="box-none"
          style={[
            styles.bottomWrap,
            wideTopNavigation && styles.bottomWrapWide,
            wideTopNavigation && {
              paddingBottom: Math.max(insets.bottom, BOTTOM_CHROME.playerInsetFloor),
            },
          ]}
        >
          {wideTopNavigation ? (
            <View style={styles.widePlayerWrap}>
              <MiniPlayer />
            </View>
          ) : (
            <MiniPlayer />
          )}
          {wideTopNavigation ? null : <AdaptivePluggdNavigation mode="compact" />}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bottomWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    gap: 5,
  },
  bottomWrapWide: {
    alignItems: 'center',
    gap: 0,
  },
  widePlayerWrap: {
    width: '100%',
    maxWidth: 720,
  },
});
