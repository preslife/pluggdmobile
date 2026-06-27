import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthProvider';
import { selectionHaptic } from '../src/design/haptics';
import { pluggdTextStyles } from '../src/design/typography';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import {
  hasCreatorAccess,
  resolveProfileRoles,
  type EcosystemRole,
  type NavProfile,
  type ProfileRoleRow,
} from '../src/lib/mobileNavigation';
import { supabase } from '../src/lib/supabase';
import { loadUnreadNotifications } from '../src/features/culture/mobileServices';
import { BrandLogo } from './BrandLogo';
import { GlassAvatar, GlassIconButton, GlassPanel, GlassSheet } from './liquid-glass';

type AccountItem = {
  label: string;
  route?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  danger?: boolean;
  onPress?: () => void;
};

function initialFor(profile: NavProfile | null, email?: string | null) {
  const name = profile?.display_name || profile?.full_name || profile?.username || email || 'P';
  return name.trim().charAt(0).toUpperCase() || 'P';
}

export function MobileHeader() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NavProfile | null>(null);
  const [roleRows, setRoleRows] = useState<ProfileRoleRow[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const unreadNotifications = useQuery({
    queryKey: ['culture', 'notifications', 'unread'],
    queryFn: loadUnreadNotifications,
    enabled: !!user?.id,
    staleTime: 1000 * 45,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!user?.id) {
        setProfile(null);
        setRoleRows([]);
        return;
      }

      const [profileRes, rolesRes] = await Promise.all([
        (supabase as any)
          .from('profiles')
          .select('user_id,full_name,username,avatar_url,user_type,profile_type,is_creator,is_label,onboarding_progress')
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any).from('profile_roles').select('role,is_primary').eq('user_id', user.id),
      ]);

      if (!mounted) return;
      setProfile((profileRes.data as NavProfile | null) ?? null);
      setRoleRows(Array.isArray(rolesRes.data) ? (rolesRes.data as ProfileRoleRow[]) : []);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const roles = useMemo(() => resolveProfileRoles(profile, roleRows), [profile, roleRows]);
  const creatorAccess = hasCreatorAccess(roles);
  const avatarInitial = initialFor(profile, user?.email);
  const roleSet = new Set<EcosystemRole>(roles);
  const publicProfileRoute = profile?.username
    ? creatorAccess
      ? `/creator/${profile.username}`
      : `/u/${profile.username}`
    : '/edit-profile';

  const closeAccountAndGo = (route: string) => {
    selectionHaptic();
    setAccountOpen(false);
    router.push(route as any);
  };

  const accountItems: AccountItem[] = [
    creatorAccess
      ? { label: 'Studio', route: '/studio', icon: 'space-dashboard' }
      : { label: 'Account hub', route: '/profile', icon: 'space-dashboard' },
    { label: profile?.username ? 'Public page' : 'Edit profile', route: publicProfileRoute, icon: 'person' },
    { label: 'PLUGGD Progress', route: '/badges', icon: 'workspace-premium' },
    creatorAccess
      ? { label: 'Wallet / Earnings', route: '/creator/payouts', icon: 'account-balance-wallet' }
      : { label: 'Wallet / Credits', route: '/wallet', icon: 'account-balance-wallet' },
    { label: 'Library / Purchases', route: '/purchases', icon: 'inventory-2' },
    { label: 'Memberships', route: '/membership', icon: 'card-membership' },
    { label: 'Tickets', route: '/tickets', icon: 'confirmation-number' },
    { label: 'Restore Purchases', route: '/wallet', icon: 'restore' },
    { label: 'Analytics', route: creatorAccess ? '/studio/analytics' : '/notifications', icon: 'query-stats' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  if (roleSet.has('promoter') || roleSet.has('venue')) {
    accountItems.splice(8, 0, { label: 'Ticket Scan', route: '/ticket-scan', icon: 'qr-code-scanner' });
  }

  if (creatorAccess) {
    accountItems.splice(9, 0, { label: 'Connect Card', route: '/studio/connect-card', icon: 'badge' });
  } else {
    accountItems.splice(9, 0, { label: 'Become a Creator', route: '/creator-mode', icon: 'auto-awesome' });
  }

  accountItems.push(
    { label: 'Inbox', route: '/inbox', icon: 'mail-outline' },
    {
      label: unreadNotifications.data ? `Activity (${unreadNotifications.data})` : 'Activity',
      route: '/notifications',
      icon: 'notifications-none',
    },
  );

  if (user) {
    accountItems.push({
      label: 'Sign out',
      icon: 'logout',
      danger: true,
      onPress: async () => {
        setAccountOpen(false);
        await signOut();
        router.replace('/auth/login' as any);
      },
    });
  }

  return (
    <>
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile menu"
              style={styles.avatarTap}
              onPress={() => {
                selectionHaptic();
                if (!user) router.push('/auth/login' as any);
                else setAccountOpen(true);
              }}
            >
              <GlassAvatar
                imageUrl={profile?.avatar_url}
                name={profile?.display_name || profile?.full_name || user?.email || avatarInitial}
                size={32}
                tone="accent"
              />
            </Pressable>
          </View>
        </GlassPanel>
      </View>

      <Modal visible={accountOpen} transparent animationType="slide" onRequestClose={() => setAccountOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAccountOpen(false)}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <GlassSheet
              title="Account"
              subtitle={creatorAccess ? 'Studio, public profile, earnings, analytics and settings.' : 'Dashboard, public profile, credits, progress and settings.'}
            >
              <View style={styles.accountHeader}>
                <GlassAvatar
                  imageUrl={profile?.avatar_url}
                  name={profile?.display_name || profile?.full_name || user?.email || avatarInitial}
                  size={50}
                  tone="accent"
                />
                <View style={styles.accountCopy}>
                  <Text style={[styles.accountName, { color: theme.colors.text }]} numberOfLines={1}>
                    {profile?.display_name || profile?.full_name || user?.email || 'Pluggd'}
                  </Text>
                  <Text style={[styles.accountMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {creatorAccess ? 'Creator account' : 'Fan account'}
                  </Text>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {accountItems.map((item) => (
                  <Pressable
                    key={`${item.label}-${item.route ?? 'action'}`}
                    style={[
                      styles.sheetRow,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: item.label === 'Studio' ? theme.colors.borderAccent : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      selectionHaptic();
                      if (item.onPress) item.onPress();
                      else if (item.route) closeAccountAndGo(item.route);
                    }}
                  >
                    <View
                      style={[
                        styles.rowIcon,
                        {
                          backgroundColor: item.danger ? 'rgba(255,92,92,0.12)' : theme.colors.surfaceStrong,
                        },
                      ]}
                    >
                      <MaterialIcons name={item.icon} size={21} color={item.danger ? theme.colors.danger : theme.colors.accent} />
                    </View>
                    <Text style={[styles.rowLabel, { color: item.danger ? theme.colors.danger : theme.colors.text }]}>
                      {item.label}
                    </Text>
                    {!item.danger ? <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} /> : null}
                  </Pressable>
                ))}
              </ScrollView>
            </GlassSheet>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    borderColor: '#08080C',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    ...pluggdTextStyles.secondaryHeading,
    color: '#FFFFFF',
    fontSize: 18,
  },
  accountMeta: {
    color: '#A7A7A7',
    fontSize: 13,
    marginTop: 3,
  },
  sheetRow: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Satoshi-Bold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
