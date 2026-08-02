import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
import { GlassAvatar, GlassSheet } from './liquid-glass';

type AccountItem = {
  label: string;
  route?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  danger?: boolean;
  emphasis?: boolean;
  onPress?: () => void;
};

export type AccountMenuIdentity = {
  profile: NavProfile | null;
  roles: EcosystemRole[];
  creatorAccess: boolean;
  avatarInitial: string;
  displayName: string;
  signedIn: boolean;
  ready: boolean;
};

type AccountMenuButtonProps = {
  children: (identity: AccountMenuIdentity) => ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  context?: 'app' | 'studio';
};

function initialFor(profile: NavProfile | null, email?: string | null) {
  const name = profile?.display_name || profile?.full_name || profile?.username || email || 'P';
  return name.trim().charAt(0).toUpperCase() || 'P';
}

async function loadAccountIdentity(userId: string) {
  const [profileRes, rolesRes] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('user_id,full_name,username,avatar_url,user_type,profile_type,is_creator,is_label,onboarding_progress')
      .eq('user_id', userId)
      .maybeSingle(),
    (supabase as any).from('profile_roles').select('role,is_primary').eq('user_id', userId),
  ]);

  return {
    profile: (profileRes.data as NavProfile | null) ?? null,
    roleRows: Array.isArray(rolesRes.data) ? (rolesRes.data as ProfileRoleRow[]) : [],
  };
}

export function useAccountMenuIdentity(): AccountMenuIdentity {
  const { user } = useAuth();
  const account = useQuery({
    queryKey: ['mobile', 'account-identity', user?.id],
    queryFn: () => loadAccountIdentity(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });

  const profile = account.data?.profile ?? null;
  const roles = resolveProfileRoles(profile, account.data?.roleRows ?? []);
  const creatorAccess = hasCreatorAccess(roles);
  const avatarInitial = initialFor(profile, user?.email);
  const displayName = profile?.display_name || profile?.full_name || profile?.username || user?.email || 'PLUGGD';
  return {
    profile,
    roles,
    creatorAccess,
    avatarInitial,
    displayName,
    signedIn: Boolean(user?.id),
    ready: !user?.id || !account.isPending,
  };
}

export function AccountMenuButton({
  children,
  style,
  accessibilityLabel = 'Open account menu',
  context = 'app',
}: AccountMenuButtonProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const theme = usePluggdTheme();
  const [open, setOpen] = useState(false);
  const identity = useAccountMenuIdentity();
  const { profile, roles, creatorAccess, avatarInitial, displayName } = identity;
  const roleSet = new Set<EcosystemRole>(roles);
  const publicProfileRoute = profile?.username
    ? creatorAccess
      ? `/creator/${profile.username}`
      : `/u/${profile.username}`
    : '/edit-profile';

  const closeAndGo = (route: string, replace = false) => {
    setOpen(false);
    if (replace) router.replace(route as any);
    else router.push(route as any);
  };

  const accountItems: AccountItem[] = [];
  if (context === 'studio') {
    accountItems.push(
      { label: 'Back to PLUGGD', route: '/', icon: 'arrow-back', emphasis: true },
      { label: 'My PLUGGD', route: '/my-pluggd', icon: 'space-dashboard' },
    );
  } else {
    accountItems.push({ label: 'My PLUGGD', route: '/my-pluggd', icon: 'space-dashboard' });
  }

  accountItems.push(
    creatorAccess
      ? { label: 'Go Live', route: '/live/create', icon: 'sensors' }
      : { label: 'Live', route: '/live', icon: 'sensors' },
  );

  if (creatorAccess) {
    accountItems.push(
      { label: 'Create', route: '/create', icon: 'add-circle-outline' },
      { label: 'Studio', route: '/studio', icon: 'space-dashboard', emphasis: context !== 'studio' },
    );
  }

  accountItems.push(
    { label: profile?.username ? 'Public page' : 'Edit profile', route: publicProfileRoute, icon: 'person' },
    { label: 'PLUGGD Progress', route: '/badges', icon: 'workspace-premium' },
    creatorAccess
      ? { label: 'Wallet / Earnings', route: '/creator/payouts', icon: 'account-balance-wallet' }
      : { label: 'Wallet / Credits', route: '/wallet', icon: 'account-balance-wallet' },
    { label: 'Library', route: '/library', icon: 'library-music' },
    { label: 'Purchases & Access', route: '/purchases', icon: 'inventory-2' },
    { label: 'Memberships', route: '/membership', icon: 'card-membership' },
    { label: 'Tickets', route: '/tickets', icon: 'confirmation-number' },
    { label: 'Restore Purchases', route: '/wallet', icon: 'restore' },
  );

  if (roleSet.has('promoter') || roleSet.has('venue')) {
    accountItems.push({ label: 'Ticket Scan', route: '/ticket-scan', icon: 'qr-code-scanner' });
  }

  if (creatorAccess) {
    accountItems.push(
      { label: 'Analytics', route: '/studio/analytics', icon: 'query-stats' },
      { label: 'Connect Card', route: '/studio/connect-card', icon: 'badge' },
    );
  } else {
    accountItems.push({ label: 'Become a Creator', route: '/auth/role', icon: 'auto-awesome', emphasis: true });
  }

  accountItems.push(
    { label: 'Settings', route: '/settings', icon: 'settings' },
    { label: 'Inbox', route: '/inbox', icon: 'mail-outline' },
    { label: 'Activity', route: '/notifications', icon: 'notifications-none' },
    {
      label: 'Sign out',
      icon: 'logout',
      danger: true,
      onPress: async () => {
        setOpen(false);
        await signOut();
        router.replace('/auth/login' as any);
      },
    },
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={user?.id ? 'Opens profile, wallet and account actions' : 'Opens sign in'}
        style={style}
        onPress={() => {
          selectionHaptic();
          if (!user?.id) router.push('/auth/login' as any);
          else setOpen(true);
        }}
      >
        {children(identity)}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable accessible={false} style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable accessible={false} onPress={(event) => event.stopPropagation()}>
            <GlassSheet
              title="Account"
              subtitle={creatorAccess ? 'Your creator tools, public presence and account.' : 'Your profile, collection, access and account.'}
              scroll
            >
              <View style={styles.accountHeader}>
                <GlassAvatar imageUrl={profile?.avatar_url} name={displayName || avatarInitial} size={50} tone="accent" />
                <View style={styles.accountCopy}>
                  <Text style={[styles.accountName, { color: theme.colors.text }]} numberOfLines={1}>{displayName}</Text>
                  <Text style={[styles.accountMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {creatorAccess ? 'Creator account' : 'Fan account'}
                  </Text>
                </View>
              </View>

              {accountItems.map((item) => (
                <Pressable
                  key={`${item.label}-${item.route ?? 'action'}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={[
                    styles.sheetRow,
                    {
                      backgroundColor: item.emphasis ? theme.colors.surfaceStrong : theme.colors.surface,
                      borderColor: item.emphasis ? theme.colors.borderAccent : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    selectionHaptic();
                    if (item.onPress) void item.onPress();
                    else if (item.route) closeAndGo(item.route, item.label === 'Back to PLUGGD');
                  }}
                >
                  <View style={[styles.rowIcon, { backgroundColor: item.danger ? 'rgba(255,92,92,0.12)' : theme.colors.surfaceStrong }]}>
                    <MaterialIcons name={item.icon} size={21} color={item.danger ? theme.colors.danger : theme.colors.accent} />
                  </View>
                  <Text style={[styles.rowLabel, { color: item.danger ? theme.colors.danger : theme.colors.text }]}>{item.label}</Text>
                  {!item.danger ? <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} /> : null}
                </Pressable>
              ))}
            </GlassSheet>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  accountCopy: { flex: 1, minWidth: 0 },
  accountName: { ...pluggdTextStyles.secondaryHeading, fontSize: 18 },
  accountMeta: { fontFamily: 'Satoshi-Medium', fontSize: 13, marginTop: 3 },
  sheetRow: {
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rowLabel: { flex: 1, fontFamily: 'Satoshi-Bold', fontSize: 15 },
});
