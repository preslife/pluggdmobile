import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { PluggdGlassSurface } from './PluggdPrimitives';

type DockItem = {
  label: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  aliases?: string[];
};

const FAN_DOCK: DockItem[] = [
  { label: 'Home', route: '/', icon: 'home-filled', aliases: ['/(tabs)', '/home'] },
  {
    label: 'Discover',
    route: '/discover',
    icon: 'explore',
    aliases: [
      '/explore',
      '/(tabs)/explore',
      '/music',
      '/drops',
      '/(tabs)/drops',
      '/release',
      '/mixes',
      '/(tabs)/mixes',
      '/soundboards',
      '/(tabs)/soundboards',
      '/membership',
    ],
  },
  { label: 'Community', route: '/community', icon: 'forum', aliases: ['/(tabs)/community', '/social', '/gamification', '/pro/collab'] },
  { label: 'Events', route: '/events', icon: 'event', aliases: ['/(tabs)/events'] },
  { label: 'Market', route: '/market', icon: 'storefront', aliases: ['/(tabs)/marketplace', '/marketplace', '/beat', '/sample-pack', '/commerce'] },
];

const CREATOR_DOCK: DockItem[] = [
  { label: 'Dashboard', route: '/creator/dashboard', icon: 'space-dashboard', aliases: ['/creator/dashboard'] },
  { label: 'Releases', route: '/creator/upload', icon: 'library-music' },
  { label: 'Beats', route: '/creator/upload?action=beat', icon: 'headphones' },
  { label: 'Mixes', route: '/creator/upload?action=mix', icon: 'graphic-eq' },
  { label: 'Soundboards', route: '/soundboards', icon: 'dashboard-customize' },
  { label: 'Events', route: '/creator/events', icon: 'event' },
  { label: 'Live', route: '/live/create', icon: 'settings-input-antenna' },
  { label: 'Members', route: '/creator/memberships', icon: 'workspace-premium' },
  { label: 'Wallet', route: '/wallet', icon: 'account-balance-wallet' },
  { label: 'Analytics', route: '/creator/analytics', icon: 'timeline' },
  { label: 'Contracts', route: '/creator/licensing', icon: 'description' },
  { label: 'Settings', route: '/profile', icon: 'settings' },
];

function normalize(pathname: string | null) {
  if (!pathname || pathname === '/(tabs)') return '/';
  return pathname.replace('/(tabs)', '') || '/';
}

function isActive(pathname: string, item: DockItem) {
  const target = normalize(item.route);
  if (target === '/') return pathname === '/' || pathname === '';
  const candidates = [target, ...(item.aliases ?? []).map(normalize)];
  return candidates.some((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
}

export function PluggdDock() {
  const rawPathname = usePathname();
  const pathname = normalize(rawPathname);
  const router = useRouter();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const isStudioContext = pathname.startsWith('/creator');
  const forceDarkChrome = pathname.startsWith('/live');
  const inactiveColor = forceDarkChrome ? 'rgba(255,255,255,0.62)' : theme.colors.textMuted;
  const items = isStudioContext ? CREATOR_DOCK : FAN_DOCK;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 7) }]}>
      <PluggdGlassSurface
        glassEffectStyle="regular"
        blurIntensity={58}
        borderColor={forceDarkChrome ? 'rgba(255,255,255,0.1)' : theme.colors.borderSubtle}
        fallbackColor={forceDarkChrome ? 'rgba(8,8,8,0.92)' : theme.colors.glassFallback}
        tintColor={forceDarkChrome ? 'rgba(8,8,8,0.72)' : theme.colors.glassTint}
        colorScheme={forceDarkChrome ? 'dark' : undefined}
        style={styles.dockGlass}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {items.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Pressable
                key={`${isStudioContext ? 'creator' : 'fan'}-${item.route}`}
                onPress={() => {
                  selectionHaptic();
                  router.push(item.route as any);
                }}
                style={styles.itemPressable}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.item, active && styles.itemActive]}>
                  <MaterialIcons
                    name={item.icon}
                    size={19}
                    color={active ? PLUGGD_ORANGE : inactiveColor}
                  />
                  <Text style={[styles.label, { color: inactiveColor }, active && styles.labelActive]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {active ? <View style={styles.activeBar} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </PluggdGlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 2,
  },
  dockGlass: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    paddingTop: 5,
    paddingBottom: 0,
  },
  content: {
    paddingHorizontal: 8,
    gap: 3,
  },
  itemPressable: {
    borderRadius: 12,
  },
  item: {
    width: 67,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemActive: {
    shadowColor: PLUGGD_ORANGE,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: PLUGGD_ORANGE,
    fontWeight: '700',
  },
  activeBar: {
    width: 20,
    height: 2,
    borderRadius: 999,
    backgroundColor: PLUGGD_ORANGE,
    marginTop: 1,
  },
});
