import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthProvider';
import { selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { loadUnreadNotifications } from '../src/features/culture/mobileServices';
import { AccountMenuButton } from './AccountMenuButton';
import { BrandLogo } from './BrandLogo';
import { GlassAvatar, GlassIconButton, GlassPanel } from './liquid-glass';

export function MobileHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const unreadNotifications = useQuery({
    queryKey: ['culture', 'notifications', 'unread'],
    queryFn: loadUnreadNotifications,
    enabled: !!user?.id,
    staleTime: 1000 * 45,
  });

  return (
    <View pointerEvents="box-none" style={[styles.safeArea, { paddingTop: insets.top }]}>
      <GlassPanel intensity="subtle" radius={22} style={styles.header} contentStyle={styles.headerContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Home"
            style={styles.wordmarkButton}
            onPress={() => {
              selectionHaptic();
              router.push('/' as any);
            }}
          >
            <BrandLogo variant={theme.scheme} width={94} height={24} />
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open PLUGGD Live"
              onPress={() => {
                selectionHaptic();
                router.push('/live' as any);
              }}
              style={({ pressed }) => [styles.livePill, pressed && styles.livePillPressed]}
            >
              <View style={styles.livePillDot} />
              <Text style={styles.livePillText}>LIVE</Text>
            </Pressable>
            <GlassIconButton quiet icon="search" accessibilityLabel="Search PLUGGD" size={34} onPress={() => router.push('/search' as any)} />
            <View>
              <GlassIconButton
                quiet
                icon="notifications-none"
                accessibilityLabel="Open notifications"
                size={34}
                onPress={() => router.push('/notifications' as any)}
              />
              {unreadNotifications.data ? <View style={[styles.notificationDot, { backgroundColor: theme.colors.live }]} /> : null}
            </View>

            <AccountMenuButton accessibilityLabel="Open account menu" style={styles.avatarTap}>
              {(identity) => (
                <GlassAvatar imageUrl={identity.profile?.avatar_url} name={identity.displayName} size={32} tone="accent" />
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
    paddingHorizontal: 16,
  },
  header: {
    height: 60,
  },
  headerContent: {
    height: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmarkButton: {
    height: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  livePill: {
    minWidth: 56,
    height: 44,
    paddingHorizontal: 9,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.38)',
    backgroundColor: 'rgba(255,71,87,0.09)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  livePillPressed: { transform: [{ scale: 0.96 }], opacity: 0.86 },
  livePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4757' },
  livePillText: { color: '#FF8B93', fontFamily: 'Satoshi-Black', fontSize: 8.5, letterSpacing: 1 },
  avatarTap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: '#0a0806',
  },
});
