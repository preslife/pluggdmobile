import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import MiniPlayer from './MiniPlayer';
import { PluggdDock } from './PluggdDock';

const HIDDEN_PREFIXES = ['/auth', '/player'];
const HIDDEN_EXACT = new Set(['/live/session']);

export function AppChrome() {
  const pathname = usePathname() || '/';
  const normalized = pathname.replace('/(tabs)', '') || '/';
  const hidden =
    HIDDEN_EXACT.has(normalized) ||
    HIDDEN_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));

  if (hidden) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <MiniPlayer />
      <PluggdDock />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
  },
});

