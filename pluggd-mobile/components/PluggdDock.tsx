import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';

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
  const isStudioContext = pathname.startsWith('/creator');
  const items = isStudioContext ? CREATOR_DOCK : FAN_DOCK;

  return (
    <View style={styles.wrap}>
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
              onPress={() => router.push(item.route as any)}
              style={[styles.item, active && styles.itemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <MaterialIcons
                name={item.icon}
                size={22}
                color={active ? PLUGGD_ORANGE : '#9B9B9B'}
              />
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(8,8,8,0.98)',
    borderTopWidth: 1,
    borderTopColor: '#202020',
    paddingTop: 8,
    paddingBottom: 16,
  },
  content: {
    paddingHorizontal: 8,
    gap: 7,
  },
  item: {
    width: 76,
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  itemActive: {
    borderColor: '#3A261A',
    backgroundColor: '#1D120C',
  },
  label: {
    color: '#9B9B9B',
    fontSize: 11,
    fontWeight: '800',
  },
  labelActive: {
    color: PLUGGD_ORANGE,
  },
});
