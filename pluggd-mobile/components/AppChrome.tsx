import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import MiniPlayer from './MiniPlayer';
import { MobileHeader } from './MobileHeader';
import { PluggdDock } from './PluggdDock';

const HIDDEN_PREFIXES = ['/auth', '/player', '/studio', '/connect'];
const HIDDEN_EXACT = new Set([
  '/live/session',
  '/live/feed',
  '/live/create',
  '/ticket-scan',
  '/swipe-beats',
  '/creator/upload',
  '/creator/onboarding',
]);
const BOTTOM_HIDDEN_EXACT = new Set([
  '/wallet',
  '/creator/events',
]);

export function AppChrome() {
  const pathname = usePathname() || '/';
  const normalized = pathname.replace('/(tabs)', '') || '/';
  const ownsHeader =
    normalized === '/' ||
    normalized === '/discover' ||
    normalized === '/community' ||
    normalized === '/events' ||
    normalized === '/mixes' ||
    normalized === '/soundboards' ||
    normalized === '/library' ||
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
  const hidden =
    HIDDEN_EXACT.has(normalized) ||
    normalized.startsWith('/story/') ||
    normalized.startsWith('/plug/') ||
    normalized.startsWith('/mixes/') ||
    HIDDEN_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
  const bottomHidden =
    hidden ||
    BOTTOM_HIDDEN_EXACT.has(normalized) ||
    normalized.startsWith('/commerce/') ||
    (normalized.startsWith('/membership/') && normalized !== '/membership');

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
