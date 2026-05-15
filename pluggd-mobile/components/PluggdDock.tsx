import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionHaptic } from '../src/design/haptics';

type TabItem = {
  label: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  aliases?: string[];
  primary?: boolean;
};

const CORE_TABS: TabItem[] = [
  { label: 'Home', route: '/', icon: 'home', aliases: ['/(tabs)', '/home'] },
  {
    label: 'Stage',
    route: '/stage',
    icon: 'music-note',
    aliases: [
      '/explore',
      '/(tabs)/explore',
      '/(tabs)/stage',
      '/discover',
      '/music',
      '/releases',
      '/release',
      '/drops',
      '/beat',
      '/sample-pack',
      '/soundboards',
      '/mixes',
      '/membership',
      '/library',
      '/favorites',
    ],
  },
  {
    label: 'Live',
    route: '/live',
    icon: 'videocam',
    aliases: ['/(tabs)/live', '/live/session', '/live/create'],
  },
  {
    label: 'Backstage',
    route: '/backstage',
    icon: 'groups',
    aliases: ['/(tabs)/backstage', '/community', '/social/hub'],
  },
  {
    label: 'Search',
    route: '/search',
    icon: 'search',
    aliases: ['/(tabs)/search'],
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
  const inactiveColor = '#62627A';

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.dockGlass}>
        <View style={styles.tabRow}>
          {CORE_TABS.map((item) => {
            const active = isActive(pathname, item);
            const iconColor = active ? '#FFFFFF' : inactiveColor;

            return (
              <Pressable
                key={item.route}
                onPress={() => {
                  selectionHaptic();
                  router.push(item.route as any);
                }}
                style={styles.tabPressable}
                accessibilityRole="tab"
                accessibilityLabel={`${item.label} tab`}
                accessibilityState={{ selected: active }}
              >
                <View style={styles.tabItem}>
                  <View style={styles.iconShell}>
                    <MaterialIcons name={item.icon} size={21} color={iconColor} />
                  </View>
                  <View style={[styles.activeIndicator, active && styles.activeIndicatorOn]} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 0,
    paddingHorizontal: 0,
    backgroundColor: '#0D0D11',
  },
  dockGlass: {
    backgroundColor: '#0D0D11',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1F1F2E',
    paddingTop: 0,
    paddingHorizontal: 8,
    paddingBottom: 0,
  },
  tabRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  tabPressable: {
    flex: 1,
    height: 56,
  },
  tabItem: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  iconShell: {
    width: 34,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  activeIndicatorOn: {
    backgroundColor: '#FF5A00',
  },
});
