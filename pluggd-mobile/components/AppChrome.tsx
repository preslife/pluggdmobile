import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  isAppChromeHidden,
  isBottomChromeHidden,
  normalizeChromePath,
} from '../src/lib/appChromeVisibility';
import MiniPlayer from './MiniPlayer';
import { MobileHeader } from './MobileHeader';
import { PluggdDock } from './PluggdDock';

export function AppChrome() {
  const pathname = usePathname() || '/';
  const normalized = normalizeChromePath(pathname);
  const ownsHeader =
    normalized === '/' ||
    normalized === '/discover' ||
    normalized === '/community' ||
    normalized === '/events' ||
    normalized === '/mixes' ||
    normalized === '/soundboards' ||
    normalized === '/library' ||
    // Market and Releases render DiscoveryHeader themselves, like the other
    // public hubs. Without these, AppChrome would stack a second header on top.
    normalized === '/market' ||
    normalized === '/store' ||
    normalized === '/releases' ||
    normalized === '/create' ||
    normalized === '/create-post' ||
    normalized === '/profile' ||
    normalized === '/live' ||
    normalized === '/stage' ||
    normalized === '/backstage' ||
    normalized === '/my-pluggd' ||
    normalized === '/search' ||
    normalized === '/membership' ||
    normalized === '/plug' ||
    normalized.startsWith('/membership/') ||
    normalized.startsWith('/events/') ||
    normalized.startsWith('/release/') ||
    normalized.startsWith('/mixes/') ||
    normalized.startsWith('/product/') ||
    normalized.startsWith('/beat/') ||
    normalized.startsWith('/sample-pack/') ||
    normalized.startsWith('/soundboards/') ||
    normalized === '/following' ||
    normalized === '/settings' ||
    normalized.startsWith('/settings/') ||
    normalized.startsWith('/commerce/') ||
    normalized.startsWith('/genre/') ||
    normalized.startsWith('/u/') ||
    normalized.startsWith('/user/') ||
    normalized.startsWith('/creator/') ||
    normalized === '/creator/events' ||
    normalized === '/creator/onboarding' ||
    normalized === '/playlists/new';
  const hidden = isAppChromeHidden(normalized);
  const bottomHidden = isBottomChromeHidden(normalized);

  if (hidden) return null;

  return (
    <>
      {ownsHeader ? null : <MobileHeader />}
      {bottomHidden ? null : (
        <View pointerEvents="box-none" style={styles.bottomWrap}>
          <MiniPlayer />
          <PluggdDock />
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
});
