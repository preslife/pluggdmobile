import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
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
            <BrandLogo variant={theme.scheme} width={98} height={26} />
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open PLUGGD Live"
              onPress={() => {
                selectionHaptic();
                router.push('/live' as any);
              }}
              style={({ pressed }) => [styles.livePill, { borderColor: `${theme.colors.accent}66`, backgroundColor: `${theme.colors.accent}1F` }, pressed && styles.livePillPressed]}
            >
              <MaterialIcons name="sensors" size={18} color={theme.colors.accentText} />
              <Text style={[styles.livePillText, { color: theme.colors.accentText }]}>Live</Text>
            </Pressable>
            <GlassIconButton quiet icon="search" accessibilityLabel="Search PLUGGD" size={44} onPress={() => router.push('/search' as any)} />
            <View>
              <GlassIconButton
                quiet
                icon="notifications-none"
                accessibilityLabel={unreadNotifications.data ? `Open notifications, ${unreadNotifications.data} unread` : 'Open notifications'}
                size={44}
                onPress={() => router.push('/notifications' as any)}
              />
              {unreadNotifications.data ? <View style={[styles.notificationDot, { backgroundColor: theme.colors.live, borderColor: theme.colors.background }]} /> : null}
            </View>

            <AccountMenuButton accessibilityLabel="Open account menu" style={styles.avatarTap}>
              {(identity) => (
                <View style={styles.avatarVisual}>
                  <GlassAvatar imageUrl={identity.profile?.avatar_url} name={identity.displayName} size={36} tone="accent" />
                  <View pointerEvents="none" style={[styles.avatarOutline, { borderColor: theme.colors.accent }]} />
                </View>
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
    paddingHorizontal: 12,
  },
  header: {
    height: 64,
  },
  headerContent: {
    height: 64,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmarkButton: {
    height: 64,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  livePill: {
    width: 52,
    height: 48,
    paddingHorizontal: 0,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.38)',
    backgroundColor: 'rgba(255,71,87,0.09)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  livePillPressed: { transform: [{ scale: 0.96 }], opacity: 0.86 },
  livePillText: { width: '100%', textAlign: 'center', fontFamily: 'Satoshi-Black', fontSize: 12, letterSpacing: 0.2 },
  avatarTap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarVisual: {
    width: 36,
    height: 36,
  },
  avatarOutline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#0a0806',
  },
});
