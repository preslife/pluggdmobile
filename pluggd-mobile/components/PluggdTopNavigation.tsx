import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionHaptic } from '../src/design/haptics';
import type { AdaptiveNavigationWidthClass } from '../src/design/adaptiveNavigation';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { AccountMenuButton } from './AccountMenuButton';
import { BrandLogo } from './BrandLogo';
import { GlassAvatar, GlassIconButton, GlassPanel } from './liquid-glass';
import {
  CORE_TABS,
  isCoreNavigationItemActive,
  normalizeCoreNavigationPath,
} from './PluggdDock';

/** Horizontal navigation primitive for Android tablets and unfolded devices. */
export function PluggdTopNavigation({
  widthClass = 'expanded',
}: {
  widthClass?: AdaptiveNavigationWidthClass;
}) {
  const rawPathname = usePathname();
  const pathname = normalizeCoreNavigationPath(rawPathname);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const medium = widthClass === 'medium';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.safeArea, medium && styles.safeAreaMedium, { paddingTop: insets.top }]}
    >
      <GlassPanel
        intensity="subtle"
        radius={22}
        style={styles.header}
        contentStyle={[styles.headerContent, medium && styles.headerContentMedium]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          onPress={() => {
            selectionHaptic();
            router.push('/' as any);
          }}
          style={[styles.logoButton, medium && styles.logoButtonMedium]}
        >
          <BrandLogo variant="auto" width={medium ? 76 : 88} height={23} />
        </Pressable>

        <View accessibilityRole="tablist" style={styles.tabs}>
          {CORE_TABS.map((item) => {
            const active = isCoreNavigationItemActive(pathname, item);
            return (
              <Pressable
                key={item.label}
                accessibilityRole="tab"
                accessibilityLabel={`${item.label} tab`}
                accessibilityHint={`Open ${item.label}`}
                accessibilityState={{ selected: active }}
                testID={`top-nav-tab-${item.label.toLowerCase()}`}
                onPress={() => {
                  selectionHaptic();
                  router.push(item.route as any);
                }}
                style={({ pressed }) => [
                  styles.tab,
                  medium && styles.tabMedium,
                  active && [styles.tabActive, { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.borderAccent }],
                  pressed && styles.tabPressed,
                ]}
              >
                <MaterialIcons
                  name={item.icon}
                  size={18}
                  color={active ? theme.colors.text : theme.colors.textMuted}
                />
                <Text
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1.2}
                  minimumFontScale={0.82}
                  numberOfLines={1}
                  style={[styles.tabLabel, { color: theme.colors.textMuted }, medium && styles.tabLabelMedium, active && [styles.tabLabelActive, { color: theme.colors.text }]]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <GlassIconButton
            quiet
            icon="search"
            accessibilityLabel="Search PLUGGD"
            size={44}
            onPress={() => router.push('/search' as any)}
          />
          <GlassIconButton
            quiet
            icon="notifications-none"
            accessibilityLabel="Open notifications"
            size={44}
            onPress={() => router.push('/notifications' as any)}
          />
          <AccountMenuButton accessibilityLabel="Open account menu" style={styles.accountButton}>
            {(identity) => (
              <GlassAvatar
                imageUrl={identity.profile?.avatar_url}
                name={identity.displayName}
                size={30}
                tone="accent"
              />
            )}
          </AccountMenuButton>
        </View>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  safeAreaMedium: {
    paddingHorizontal: 10,
  },
  header: {
    width: '100%',
    maxWidth: 1040,
    height: 60,
  },
  headerContent: {
    height: 60,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerContentMedium: {
    paddingHorizontal: 10,
    gap: 6,
  },
  logoButton: {
    height: 48,
    minWidth: 92,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  tab: {
    minWidth: 74,
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  tabMedium: {
    minWidth: 54,
    paddingHorizontal: 3,
    flexDirection: 'column',
    gap: 1,
  },
  tabActive: {
    borderWidth: 1,
  },
  tabPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  tabLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
  },
  tabLabelActive: {
    fontFamily: 'Satoshi-Black',
  },
  tabLabelMedium: {
    fontSize: 10,
  },
  logoButtonMedium: {
    minWidth: 80,
  },
});
