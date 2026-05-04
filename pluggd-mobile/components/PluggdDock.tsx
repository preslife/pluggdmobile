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
  { label: 'Home', route: '/', icon: 'home-filled', aliases: ['/(tabs)'] },
  { label: 'Discover', route: '/explore', icon: 'explore', aliases: ['/(tabs)/explore'] },
  { label: 'Drops', route: '/drops', icon: 'album', aliases: ['/(tabs)/drops', '/release'] },
  { label: 'Market', route: '/marketplace', icon: 'shopping-bag', aliases: ['/(tabs)/marketplace', '/beat', '/sample-pack'] },
  { label: 'Mixes', route: '/mixes', icon: 'headphones', aliases: ['/(tabs)/mixes', '/mix'] },
  { label: 'Events', route: '/events', icon: 'event', aliases: ['/(tabs)/events'] },
  { label: 'Live', route: '/live', icon: 'settings-input-antenna', aliases: ['/(tabs)/live'] },
  { label: 'Community', route: '/community', icon: 'forum', aliases: ['/(tabs)/community', '/social'] },
  { label: 'Boards', route: '/soundboards', icon: 'dashboard-customize', aliases: ['/(tabs)/soundboards', '/soundboard'] },
  { label: 'Profile', route: '/profile', icon: 'person', aliases: ['/(tabs)/profile', '/wallet', '/commerce/orders', '/library'] },
];

const CREATOR_DOCK: DockItem[] = [
  { label: 'Studio', route: '/creator/dashboard', icon: 'space-dashboard', aliases: ['/creator'] },
  { label: 'Catalog', route: '/creator/upload', icon: 'library-music' },
  { label: 'Live', route: '/live', icon: 'settings-input-antenna' },
  { label: 'Events', route: '/creator/events', icon: 'event' },
  { label: 'Analytics', route: '/creator/analytics', icon: 'timeline' },
  { label: 'Wallet', route: '/wallet', icon: 'account-balance-wallet' },
  { label: 'Profile', route: '/profile', icon: 'person' },
  { label: 'Hub', route: '/', icon: 'home-filled' },
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

