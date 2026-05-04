import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthProvider';
import {
  CreateAction,
  PLUGGD_ORANGE,
  getCreateActions,
  hasCreatorAccess,
  resolveProfileRoles,
  type EcosystemRole,
  type NavProfile,
  type ProfileRoleRow,
} from '../src/lib/mobileNavigation';
import { supabase } from '../src/lib/supabase';
import { BrandLogo } from './BrandLogo';

type AccountItem = {
  label: string;
  route?: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  danger?: boolean;
  onPress?: () => void;
};

const ACTION_ICONS: Record<CreateAction['key'], keyof typeof MaterialIcons.glyphMap> = {
  release: 'library-music',
  beat: 'headphones',
  mix: 'graphic-eq',
  soundboard: 'dashboard-customize',
  event: 'event',
  live: 'settings-input-antenna',
  studio: 'space-dashboard',
};

function initialFor(profile: NavProfile | null, email?: string | null) {
  const name = profile?.display_name || profile?.full_name || profile?.username || email || 'P';
  return name.trim().charAt(0).toUpperCase() || 'P';
}

export function MobileHeader() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<NavProfile | null>(null);
  const [roleRows, setRoleRows] = useState<ProfileRoleRow[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

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
          .select('user_id,full_name,display_name,username,avatar_url,user_type,profile_type,is_creator,is_label,onboarding_progress')
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any)
          .from('profile_roles')
          .select('role,is_primary')
          .eq('user_id', user.id),
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
  const createActions = useMemo(() => getCreateActions(roles), [roles]);
  const avatarInitial = initialFor(profile, user?.email);
  const liveActive = pathname.startsWith('/live') || pathname.startsWith('/(tabs)/live');

  const closeAccountAndGo = (route: string) => {
    setAccountOpen(false);
    router.push(route as any);
  };

  const closeCreateAndGo = (route: string) => {
    setCreateOpen(false);
    router.push(route as any);
  };

  const roleSet = new Set<EcosystemRole>(roles);
  const accountItems: AccountItem[] = [
    { label: 'My Profile', route: '/profile', icon: 'person' },
    { label: 'Wallet / Credits', route: '/wallet', icon: 'account-balance-wallet' },
    { label: 'Saved', route: '/favorites', icon: 'bookmark-border' },
    { label: 'Notifications', route: '/social/notifications', icon: 'notifications-none' },
    { label: 'Settings', route: '/settings/privacy', icon: 'settings' },
  ];

  if (creatorAccess) {
    accountItems.splice(1, 0, { label: 'Creator Studio', route: '/creator/dashboard', icon: 'space-dashboard' });
    accountItems.splice(2, 0, { label: 'Earnings', route: '/creator/payouts', icon: 'paid' });
    accountItems.splice(3, 0, { label: 'Analytics', route: '/creator/analytics', icon: 'timeline' });
  }

  if (roleSet.has('promoter')) {
    accountItems.splice(1, 0, { label: 'Promoter Dashboard', route: '/creator/events', icon: 'campaign' });
  }

  if (roleSet.has('venue')) {
    accountItems.splice(1, 0, { label: 'Venue Dashboard', route: '/creator/events', icon: 'apartment' });
  }

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
      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.logoButton} onPress={() => router.push('/' as any)}>
            <BrandLogo variant="dark" width={106} height={32} />
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              style={[styles.livePill, liveActive && styles.livePillActive]}
              onPress={() => router.push('/live' as any)}
            >
              <MaterialIcons
                name="settings-input-antenna"
                size={16}
                color={liveActive ? '#080808' : PLUGGD_ORANGE}
              />
              <Text style={[styles.liveText, liveActive && styles.liveTextActive]}>Live</Text>
            </Pressable>

            <Pressable style={styles.iconButton} onPress={() => router.push('/discover' as any)}>
              <MaterialIcons name="search" size={22} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.avatarButton}
              onPress={() => {
                if (!user) router.push('/auth/login' as any);
                else setAccountOpen(true);
              }}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {creatorAccess && createActions.length > 0 ? (
        <Pressable style={styles.createButton} onPress={() => setCreateOpen(true)}>
          <MaterialIcons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create</Text>
        </Pressable>
      ) : null}

      <Modal visible={accountOpen} transparent animationType="slide" onRequestClose={() => setAccountOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAccountOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.accountHeader}>
              <View style={styles.sheetAvatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.sheetAvatarText}>{avatarInitial}</Text>
                )}
              </View>
              <View style={styles.accountCopy}>
                <Text style={styles.accountName} numberOfLines={1}>
                  {profile?.display_name || profile?.full_name || user?.email || 'Pluggd'}
                </Text>
                <Text style={styles.accountMeta} numberOfLines={1}>
                  {creatorAccess ? 'Creator account' : 'Fan account'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {accountItems.map((item) => (
                <Pressable
                  key={`${item.label}-${item.route ?? 'action'}`}
                  style={styles.sheetRow}
                  onPress={() => {
                    if (item.onPress) item.onPress();
                    else if (item.route) closeAccountAndGo(item.route);
                  }}
                >
                  <View style={[styles.rowIcon, item.danger && styles.rowIconDanger]}>
                    <MaterialIcons name={item.icon} size={21} color={item.danger ? '#FF5C5C' : PLUGGD_ORANGE} />
                  </View>
                  <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>{item.label}</Text>
                  {!item.danger ? <MaterialIcons name="chevron-right" size={22} color="#777777" /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Create</Text>
            <Text style={styles.sheetSubtitle}>Choose the next thing you want to publish or manage.</Text>

            {createActions.map((action) => (
              <Pressable key={action.key} style={styles.sheetRow} onPress={() => closeCreateAndGo(action.route)}>
                <View style={styles.rowIcon}>
                  <MaterialIcons name={ACTION_ICONS[action.key]} size={21} color={PLUGGD_ORANGE} />
                </View>
                <Text style={styles.rowLabel}>{action.label}</Text>
                <MaterialIcons name="chevron-right" size={22} color="#777777" />
              </Pressable>
            ))}
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
    backgroundColor: 'rgba(8,8,8,0.97)',
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  header: {
    height: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePill: {
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A261A',
    backgroundColor: '#151515',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  livePillActive: {
    backgroundColor: PLUGGD_ORANGE,
    borderColor: PLUGGD_ORANGE,
  },
  liveText: {
    color: PLUGGD_ORANGE,
    fontSize: 13,
    fontWeight: '900',
  },
  liveTextActive: {
    color: '#080808',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#3A261A',
    backgroundColor: '#20130E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  createButton: {
    position: 'absolute',
    right: 14,
    bottom: 154,
    zIndex: 90,
    height: 48,
    borderRadius: 999,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: PLUGGD_ORANGE,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0B0B0B',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 26,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#3A3A3A',
    marginBottom: 14,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#20130E',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  sheetAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  accountMeta: {
    color: '#A7A7A7',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  sheetSubtitle: {
    color: '#A7A7A7',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  sheetRow: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242424',
    backgroundColor: '#151515',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#21130E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowIconDanger: {
    backgroundColor: '#261111',
  },
  rowLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  rowLabelDanger: {
    color: '#FF5C5C',
  },
});
