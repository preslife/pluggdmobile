import { MaterialIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme, usePluggdThemeMode, type PluggdThemeMode } from '../src/design/usePluggdTheme';
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
import { PluggdAvatar, PluggdGlassSurface, PluggdSheet } from './PluggdPrimitives';

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
  const theme = usePluggdTheme();
  const { mode, setMode } = usePluggdThemeMode();
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
  const forceDarkChrome = liveActive;
  const chromeText = forceDarkChrome ? '#FFFFFF' : theme.colors.text;
  const chromeFallback = forceDarkChrome ? 'rgba(8,8,8,0.9)' : theme.colors.glassFallback;
  const chromeBorder = forceDarkChrome ? 'rgba(255,255,255,0.1)' : theme.colors.borderSubtle;
  const chromeTint = forceDarkChrome ? 'rgba(8,8,8,0.72)' : theme.colors.glassTint;

  const closeAccountAndGo = (route: string) => {
    selectionHaptic();
    setAccountOpen(false);
    router.push(route as any);
  };

  const closeCreateAndGo = (route: string) => {
    selectionHaptic();
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
        <PluggdGlassSurface
          glassEffectStyle="regular"
          blurIntensity={58}
          borderColor={chromeBorder}
          fallbackColor={chromeFallback}
          tintColor={chromeTint}
          colorScheme={forceDarkChrome ? 'dark' : undefined}
          style={styles.header}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Home"
            style={styles.logoButton}
            onPress={() => {
              selectionHaptic();
              router.push('/' as any);
            }}
          >
            <BrandLogo variant={forceDarkChrome ? 'dark' : 'auto'} width={96} height={29} />
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: liveActive }}
              onPress={() => {
                impactHaptic();
                router.push('/live' as any);
              }}
            >
              <PluggdGlassSurface
                interactive
                glassEffectStyle={liveActive ? 'regular' : 'clear'}
                borderColor={liveActive ? PLUGGD_ORANGE : theme.colors.borderAccent}
                fallbackColor={liveActive ? PLUGGD_ORANGE : theme.colors.glassFallback}
                tintColor={liveActive ? 'rgba(255,82,0,0.7)' : theme.colors.glassTint}
                style={[styles.livePill, liveActive && styles.livePillActive]}
              >
                <MaterialIcons
                  name="settings-input-antenna"
                  size={15}
                  color={liveActive ? '#FFFFFF' : PLUGGD_ORANGE}
                />
                <Text style={[styles.liveText, liveActive && styles.liveTextActive]}>Live</Text>
              </PluggdGlassSurface>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              onPress={() => {
                selectionHaptic();
                router.push('/discover' as any);
              }}
            >
              <PluggdGlassSurface
                interactive
                glassEffectStyle="clear"
                borderColor={forceDarkChrome ? 'rgba(255,255,255,0.12)' : theme.colors.border}
                fallbackColor={forceDarkChrome ? 'rgba(255,255,255,0.04)' : theme.colors.glassFallback}
                tintColor={chromeTint}
                colorScheme={forceDarkChrome ? 'dark' : undefined}
                style={styles.iconButton}
              >
                <MaterialIcons name="search" size={20} color={chromeText} />
              </PluggdGlassSurface>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open account"
              onPress={() => {
                selectionHaptic();
                if (!user) router.push('/auth/login' as any);
                else setAccountOpen(true);
              }}
            >
              <PluggdGlassSurface
                interactive
                glassEffectStyle="clear"
                borderColor={forceDarkChrome ? 'rgba(255,82,0,0.24)' : theme.colors.border}
                fallbackColor={forceDarkChrome ? 'rgba(255,82,0,0.08)' : theme.colors.glassFallback}
                tintColor={chromeTint}
                colorScheme={forceDarkChrome ? 'dark' : undefined}
                style={styles.avatarShell}
              >
                <PluggdAvatar
                  uri={profile?.avatar_url}
                  label={profile?.display_name || profile?.full_name || user?.email || avatarInitial}
                  size={32}
                />
              </PluggdGlassSurface>
            </Pressable>
          </View>
        </PluggdGlassSurface>
      </SafeAreaView>

      {creatorAccess && createActions.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create"
          style={styles.createButtonWrap}
          onPress={() => {
            impactHaptic();
            setCreateOpen(true);
          }}
        >
          <PluggdGlassSurface
            interactive
            glassEffectStyle="regular"
            tintColor="rgba(255,82,0,0.72)"
            fallbackColor="rgba(255,82,0,0.92)"
            borderColor={PLUGGD_ORANGE}
            style={styles.createButton}
          >
            <MaterialIcons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </PluggdGlassSurface>
        </Pressable>
      ) : null}

      <Modal visible={accountOpen} transparent animationType="slide" onRequestClose={() => setAccountOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAccountOpen(false)}>
          <Pressable>
            <PluggdSheet>
            <View style={styles.accountHeader}>
              <PluggdAvatar
                uri={profile?.avatar_url}
                label={profile?.display_name || profile?.full_name || user?.email || avatarInitial}
                size={48}
                style={styles.sheetAvatar}
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

            <View
              style={[
                styles.appearanceBlock,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={[styles.appearanceLabel, { color: theme.colors.textMuted }]}>Appearance</Text>
              <View style={styles.appearanceOptions}>
                {(['system', 'light', 'dark'] as PluggdThemeMode[]).map((item) => {
                  const active = mode === item;
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.appearancePill,
                        {
                          backgroundColor: active ? theme.colors.surfaceStrong : 'transparent',
                          borderColor: active ? theme.colors.borderAccent : 'transparent',
                        },
                      ]}
                      onPress={() => setMode(item)}
                    >
                      <Text style={[styles.appearancePillText, { color: active ? theme.colors.accent : theme.colors.textMuted }]}>
                        {item === 'system' ? 'System' : item === 'light' ? 'Light' : 'Dark'}
                      </Text>
                    </Pressable>
                  );
                })}
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
                      borderColor: theme.colors.border,
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
                    <MaterialIcons name={item.icon} size={21} color={item.danger ? '#FF5C5C' : PLUGGD_ORANGE} />
                  </View>
                  <Text
                    style={[
                      styles.rowLabel,
                      { color: item.danger ? theme.colors.danger : theme.colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {!item.danger ? <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} /> : null}
                </Pressable>
              ))}
            </ScrollView>
            </PluggdSheet>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable>
            <PluggdSheet
              title="Create"
              subtitle="Choose the next thing you want to publish or manage."
            >

            {createActions.map((action) => (
              <Pressable
                key={action.key}
                style={[
                  styles.sheetRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => closeCreateAndGo(action.route)}
              >
                <View style={[styles.rowIcon, { backgroundColor: theme.colors.surfaceStrong }]}>
                  <MaterialIcons name={ACTION_ICONS[action.key]} size={21} color={PLUGGD_ORANGE} />
                </View>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{action.label}</Text>
                <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />
              </Pressable>
            ))}
            </PluggdSheet>
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
  },
  header: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  livePill: {
    height: 34,
    borderRadius: 999,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  livePillActive: {
    shadowColor: PLUGGD_ORANGE,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  liveText: {
    color: PLUGGD_ORANGE,
    fontSize: 12.5,
    fontWeight: '800',
  },
  liveTextActive: {
    color: '#FFFFFF',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonWrap: {
    position: 'absolute',
    right: 14,
    bottom: 154,
    zIndex: 90,
  },
  createButton: {
    height: 46,
    borderRadius: 999,
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
    fontSize: 14,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetAvatar: {
    marginRight: 12,
  },
  appearanceBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
  },
  appearanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  appearanceOptions: {
    flexDirection: 'row',
    gap: 7,
  },
  appearancePill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearancePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  accountMeta: {
    color: '#A7A7A7',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
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
    fontWeight: '700',
  },
  rowLabelDanger: {
    color: '#FF5C5C',
  },
});
