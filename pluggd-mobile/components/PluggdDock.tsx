import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassDock } from './liquid-glass';

type TabItem = {
  label: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  aliases?: string[];
};

const CORE_TABS: TabItem[] = [
  {
    label: 'Home',
    route: '/',
    icon: 'home',
    aliases: ['/(tabs)', '/home'],
  },
  {
    label: 'Discover',
    route: '/discover',
    icon: 'explore',
    aliases: [
      '/(tabs)/explore',
      '/(tabs)/discover',
      '/explore',
      '/stage',
      '/music',
      '/releases',
      '/release',
      '/soundboards',
      '/mixes',
      '/search',
      '/directory',
    ],
  },
  {
    label: 'Community',
    route: '/community',
    icon: 'groups',
    aliases: [
      '/(tabs)/community',
      '/backstage',
      '/community/boards',
      '/community/events',
      '/hubs',
      '/social/hub',
      '/post',
      '/story',
      '/inbox',
      '/notifications',
    ],
  },
  {
    label: 'Events',
    route: '/events',
    icon: 'event',
    aliases: ['/(tabs)/events', '/event', '/tickets', '/ticket-scan', '/creator/events'],
  },
  {
    label: 'Market',
    route: '/market',
    icon: 'storefront',
    aliases: [
      '/(tabs)/market',
      '/marketplace',
      '/beat',
      '/beats',
      '/beat-marketplace',
      '/sample-pack',
      '/sample-packs',
      '/store',
      '/product',
    ],
  },
];

function normalize(pathname: string | null) {
  if (!pathname || pathname === '/(tabs)') return '/';
  return pathname.replace('/(tabs)', '') || '/';
}

function isActive(pathname: string, item: TabItem) {
  const target = normalize(item.route);
  if (target === '/') return pathname === '/' || pathname === '';
  const candidates = [target, ...(item.aliases ?? []).map(normalize)];
  return candidates.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
}

export function PluggdDock() {
  const rawPathname = usePathname();
  const pathname = normalize(rawPathname);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <GlassDock
        bottomInset={Math.max(insets.bottom, 18)}
        items={CORE_TABS.map((item) => ({
          label: item.label,
          icon: item.icon,
          active: isActive(pathname, item),
          onPress: () => router.push(item.route as any),
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
