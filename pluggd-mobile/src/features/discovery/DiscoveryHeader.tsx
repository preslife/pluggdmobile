import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountMenuButton } from '../../../components/AccountMenuButton';
import { BrandLogo } from '../../../components/BrandLogo';
import { GlassAvatar } from '../../../components/liquid-glass';
import { useAdaptiveNavigationMode } from '../../design/adaptiveNavigation';
import { selectionHaptic } from '../../design/haptics';
import { useAuth } from '../../context/AuthProvider';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { loadUnreadNotifications } from '../culture/mobileServices';
import { DiscoveryReturnBar } from './DiscoveryReturnBar';

export function DiscoveryHeader({
  backToDiscovery = false,
  compactReturn = false,
  showReturnLabel = true,
}: {
  backToDiscovery?: boolean;
  compactReturn?: boolean;
  showReturnLabel?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const navigationMode = useAdaptiveNavigationMode();
  const unreadNotifications = useQuery({
    queryKey: ['culture', 'notifications', 'unread'],
    queryFn: loadUnreadNotifications,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 45,
  });

  // AppChrome owns the full horizontal navigation on Android tablets and
  // unfolded devices. Keep an exact-height spacer here so editorial content
  // starts below that absolute overlay without rendering a second masthead.
  if (navigationMode === 'top') {
    return (
      <>
        <View pointerEvents="none" style={{ height: insets.top + 70 }} />
        {backToDiscovery ? <DiscoveryReturnBar compact={compactReturn} showLabel={showReturnLabel} style={compactReturn ? styles.compactReturn : undefined} /> : null}
      </>
    );
  }

  return (
    <>
      <View style={[styles.wrap, { height: Math.max(94, insets.top + 56), paddingTop: insets.top + 4, backgroundColor: theme.colors.background }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go to Home" style={styles.logoButton} onPress={() => router.push('/' as any)}>
          <BrandLogo variant="auto" width={94} height={26} />
        </Pressable>
        <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open PLUGGD Live"
          style={({ pressed }) => [styles.livePill, { borderColor: `${theme.colors.accent}66`, backgroundColor: `${theme.colors.accent}1F` }, pressed && styles.livePillPressed]}
          onPress={() => {
            selectionHaptic();
            router.push('/live' as any);
          }}
        >
          <MaterialIcons name="sensors" size={18} color={theme.colors.accentText} />
          <Text style={[styles.liveText, { color: theme.colors.accentText }]}>Live</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search PLUGGD"
          style={styles.action}
          onPress={() => {
            selectionHaptic();
            router.push('/search' as any);
          }}
        >
          <MaterialIcons name="search" size={27} color={theme.colors.text} />
        </Pressable>
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unreadNotifications.data ? `Open notifications, ${unreadNotifications.data} unread` : 'Open notifications'}
            style={styles.action}
            onPress={() => {
              selectionHaptic();
              router.push('/notifications' as any);
            }}
          >
            <MaterialIcons name="notifications-none" size={26} color={theme.colors.text} />
          </Pressable>
          {unreadNotifications.data ? <View style={[styles.notificationDot, { backgroundColor: theme.colors.live, borderColor: theme.colors.background }]} /> : null}
        </View>
        <AccountMenuButton accessibilityLabel="Open account menu" style={[styles.action, styles.account, { borderColor: theme.colors.controlBorder }]}>
          {(identity) => (
            <GlassAvatar imageUrl={identity.profile?.avatar_url} name={identity.displayName} size={36} tone="accent" />
          )}
          </AccountMenuButton>
        </View>
      </View>
      {backToDiscovery ? <DiscoveryReturnBar compact={compactReturn} showLabel={showReturnLabel} style={compactReturn ? styles.compactReturn : undefined} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 94,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0908',
  },
  logoButton: { minWidth: 94, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  livePill: { width: 52, height: 48, borderRadius: 15, paddingHorizontal: 0, borderWidth: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 },
  livePillPressed: { transform: [{ scale: 0.96 }], opacity: 0.86 },
  liveText: { width: '100%', textAlign: 'center', fontFamily: 'Satoshi-Black', fontSize: 12, letterSpacing: 0.2 },
  compactReturn: { minHeight: 36, paddingVertical: 0, marginTop: -9 },
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  account: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(247,242,233,0.28)' },
  notificationDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#0A0908' },
});
