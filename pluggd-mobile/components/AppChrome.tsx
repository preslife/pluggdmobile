import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CreateActionSheet } from './CreateActionSheet';
import MiniPlayer from './MiniPlayer';
import { MobileHeader } from './MobileHeader';
import { PluggdDock } from './PluggdDock';

const HIDDEN_PREFIXES = ['/auth', '/player', '/studio'];
const HIDDEN_EXACT = new Set(['/live/session']);

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
    normalized === '/profile' ||
    normalized === '/live' ||
    normalized === '/stage' ||
    normalized === '/backstage' ||
    normalized === '/my-pluggd' ||
    normalized === '/search' ||
    normalized === '/membership' ||
    normalized.startsWith('/membership/') ||
    normalized.startsWith('/events/') ||
    normalized.startsWith('/release/') ||
    normalized.startsWith('/mixes/') ||
    normalized.startsWith('/product/') ||
    normalized.startsWith('/beat/') ||
    normalized.startsWith('/sample-pack/') ||
    normalized.startsWith('/soundboards/') ||
    normalized === '/purchases' ||
    normalized === '/following';
  const hidden =
    HIDDEN_EXACT.has(normalized) ||
    normalized.startsWith('/mixes/') ||
    HIDDEN_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));

  if (hidden) return null;

  return (
    <>
      {ownsHeader ? null : <MobileHeader />}
      <CreateActionSheet />
      <View pointerEvents="box-none" style={styles.bottomWrap}>
        <MiniPlayer />
        <PluggdDock />
      </View>
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
    gap: 9,
  },
});
