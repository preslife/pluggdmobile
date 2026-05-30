import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

type TabItem = {
  label: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  aliases?: string[];
  primary?: boolean;
};

const CORE_TABS: TabItem[] = [
  {
    label: 'Home',
    route: '/',
    icon: 'home',
    aliases: ['/(tabs)', '/home'],
  },
  {
    label: 'Explore',
    route: '/explore',
    icon: 'explore',
    aliases: [
      '/(tabs)/explore',
      '/discover',
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
      '/events',
      '/beat',
      '/beats',
      '/beat-marketplace',
      '/market',
      '/marketplace',
      '/sample-pack',
      '/sample-packs',
      '/store',
      '/product',
    ],
  },
  {
    label: 'Create',
    route: '/create',
    icon: 'add-circle-outline',
    primary: true,
    aliases: [
      '/(tabs)/create',
      '/create-post',
      '/creator-mode',
      '/creator/onboarding',
      '/creator/upload',
      '/creator/events',
      '/upload-clip',
      '/live/create',
      '/studio',
      '/backstage',
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
    label: 'Profile',
    route: '/profile',
    icon: 'person',
    aliases: [
      '/(tabs)/profile',
      '/my-pluggd',
      '/u',
      '/user',
      '/settings',
      '/edit-profile',
      '/wallet',
      '/membership',
      '/tickets',
      '/purchases',
      '/badges',
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
  const theme = usePluggdTheme();
  const inactiveColor = theme.colors.inactive;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.dockGlass, { backgroundColor: theme.colors.shell, borderColor: theme.colors.divider }]}>
        <View style={styles.tabRow}>
          {CORE_TABS.map((item) => {
            const active = isActive(pathname, item);
            const iconColor = active ? theme.colors.text : inactiveColor;

            return (
              <Pressable
                key={item.route}
                onPress={() => {
                  selectionHaptic();
                  router.push(item.route as any);
                }}
                style={[styles.tabPressable, item.primary && styles.primaryPressable]}
                accessibilityRole="tab"
                accessibilityLabel={`${item.label} tab`}
                accessibilityState={{ selected: active }}
              >
                <View
                  style={[
                    styles.tabItem,
                    item.primary && {
                      backgroundColor: active ? theme.colors.accent : theme.colors.surfaceStrong,
                      borderColor: active ? theme.colors.borderAccent : theme.colors.border,
                    },
                  ]}
                >
                  <View style={[styles.iconShell, active && !item.primary && { backgroundColor: theme.colors.surfaceStrong }]}>
                    <MaterialIcons name={item.icon} size={item.primary ? 26 : 24} color={item.primary && active ? '#08080C' : iconColor} />
                  </View>
                  <Text style={[styles.tabLabel, { color: item.primary && active ? '#08080C' : iconColor }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {!item.primary ? <View style={[styles.activeIndicator, active && { backgroundColor: theme.colors.accent }]} /> : null}
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
    paddingTop: 8,
    paddingHorizontal: 14,
  },
  dockGlass: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  tabRow: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  tabPressable: {
    flex: 1,
    height: 70,
  },
  primaryPressable: {
    flex: 1.1,
  },
  tabItem: {
    height: 70,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconShell: {
    width: 38,
    height: 30,
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
  tabLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 14,
  },
});
