import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassDock } from './liquid-glass';

export type TabItem = {
  label: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  aliases?: string[];
};

export const CORE_TABS: TabItem[] = [
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
      '/hubs',
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
    aliases: [
      '/(tabs)/events',
      '/event',
      '/tickets',
      '/ticket-scan',
      '/creator/events',
    ],
  },
  {
    label: 'Store',
    route: '/market',
    icon: 'storefront',
    aliases: [
      '/(tabs)/market',
      '/store',
      '/marketplace',
      '/beat-marketplace',
      '/beat',
      '/beats',
      '/product',
      '/sample-packs',
      '/sample-pack',
      '/drops',
    ],
  },
];

export function normalizeCoreNavigationPath(pathname: string | null) {
  if (!pathname || pathname === '/(tabs)') return '/';
  return pathname.replace('/(tabs)', '') || '/';
}

export function isCoreNavigationItemActive(pathname: string, item: TabItem) {
  const target = normalizeCoreNavigationPath(item.route);
  if (target === '/') return pathname === '/' || pathname === '';
  const candidates = [target, ...(item.aliases ?? []).map(normalizeCoreNavigationPath)];
  return candidates.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
}

export function PluggdDock() {
  const rawPathname = usePathname();
  const pathname = normalizeCoreNavigationPath(rawPathname);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <GlassDock
        bottomInset={Math.max(insets.bottom, 18)}
        items={CORE_TABS.map((item) => ({
          label: item.label,
          icon: item.icon,
          active: isCoreNavigationItemActive(pathname, item),
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
