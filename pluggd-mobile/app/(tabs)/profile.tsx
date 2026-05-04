import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { supabase } from '../../src/lib/supabase';
import { Database } from '../../src/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LegacyUserType = 'artist' | 'producer' | 'industry' | null;
type EcosystemRole =
  | 'artist'
  | 'producer'
  | 'dj'
  | 'promoter'
  | 'venue'
  | 'curator'
  | 'service_provider'
  | 'manager'
  | 'fan';

type RoleOption = {
  value: EcosystemRole;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
};

const PLUGGD_ORANGE = '#FF5200';
const ROLE_FALLBACK_CODES = new Set(['42P01', '42703', '42704', 'PGRST204']);

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'artist', label: 'Artist', icon: 'mic' },
  { value: 'producer', label: 'Producer', icon: 'tune' },
  { value: 'dj', label: 'DJ', icon: 'headphones' },
  { value: 'promoter', label: 'Promoter', icon: 'campaign' },
  { value: 'venue', label: 'Venue', icon: 'apartment' },
  { value: 'curator', label: 'Curator', icon: 'star-border' },
  { value: 'service_provider', label: 'Service Provider', icon: 'business-center' },
  { value: 'manager', label: 'Manager', icon: 'groups' },
  { value: 'fan', label: 'Fan', icon: 'favorite-border' },
];

const ROLE_LABELS = ROLE_OPTIONS.reduce(
  (acc, role) => ({ ...acc, [role.value]: role.label }),
  {} as Record<EcosystemRole, string>,
);

const ROLE_ICONS = ROLE_OPTIONS.reduce(
  (acc, role) => ({ ...acc, [role.value]: role.icon }),
  {} as Record<EcosystemRole, keyof typeof MaterialIcons.glyphMap>,
);

const LEGACY_ROLE_TO_PRIMARY: Record<string, EcosystemRole> = {
  artist: 'artist',
  producer: 'producer',
  industry: 'promoter',
};

const uniq = <T,>(items: T[]) => Array.from(new Set(items));

function resolveLegacyProfileFromRoles(
  primaryRole: EcosystemRole,
  selectedRoles: EcosystemRole[],
): { userType: LegacyUserType; isCreator: boolean } {
  const creatorRole =
    primaryRole !== 'fan'
      ? primaryRole
      : selectedRoles.find((role) => role !== 'fan') ?? 'fan';

  switch (creatorRole) {
    case 'artist':
      return { userType: 'artist', isCreator: true };
    case 'producer':
    case 'dj':
      return { userType: 'producer', isCreator: true };
    case 'promoter':
    case 'venue':
    case 'curator':
    case 'service_provider':
    case 'manager':
      return { userType: 'industry', isCreator: true };
    case 'fan':
    default:
      return { userType: null, isCreator: false };
  }
}

function isRole(value: unknown): value is EcosystemRole {
  return typeof value === 'string' && ROLE_OPTIONS.some((role) => role.value === value);
}

function normalizeRoles(values: unknown[], primaryRole: EcosystemRole) {
  const roles = values.filter(isRole);
  return uniq([primaryRole, ...roles]);
}

async function syncRoleSelection(
  userId: string,
  selectedRoles: EcosystemRole[],
  primaryRole: EcosystemRole,
) {
  const db = supabase as any;

  const { error: clearPrimaryError } = await db
    .from('profile_roles')
    .update({ is_primary: false })
    .eq('user_id', userId);

  if (clearPrimaryError && !ROLE_FALLBACK_CODES.has(clearPrimaryError.code)) {
    throw clearPrimaryError;
  }

  const rows = selectedRoles.map((role) => ({
    user_id: userId,
    role,
    is_primary: role === primaryRole,
    is_public: true,
    metadata: {
      source: 'mobile_profile_settings',
    },
  }));

  const { error: upsertError } = await db
    .from('profile_roles')
    .upsert(rows, { onConflict: 'user_id,role' });

  if (upsertError && !ROLE_FALLBACK_CODES.has(upsertError.code)) {
    throw upsertError;
  }
}

function PluggdWordmark() {
  return <BrandLogo variant="dark" width={112} height={34} />;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(false);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [primaryRole, setPrimaryRole] = useState<EcosystemRole>('fan');
  const [secondaryRoles, setSecondaryRoles] = useState<EcosystemRole[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const selectedRoles = useMemo(
    () => normalizeRoles(secondaryRoles, primaryRole),
    [primaryRole, secondaryRoles],
  );

  const secondaryRoleLabels = secondaryRoles.map((role) => ROLE_LABELS[role] ?? role);
  const username = profile?.username || profile?.slug || 'user';
  const displayName = fullName.trim() || profile?.username || 'Pluggd user';
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'P';

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const [{ data, error }, { data: roleRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any)
          .from('profile_roles')
          .select('role,is_primary')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false }),
      ]);

      if (error) throw error;

      const profileRow = data as Profile | null;
      const onboardingProgress =
        profileRow?.onboarding_progress && typeof profileRow.onboarding_progress === 'object'
          ? (profileRow.onboarding_progress as Record<string, any>)
          : {};
      const rows = Array.isArray(roleRows)
        ? (roleRows as Array<{ role: EcosystemRole; is_primary: boolean }>)
        : [];
      const rowPrimary = rows.find((row) => row.is_primary)?.role;
      const fallbackPrimary =
        (isRole(onboardingProgress.primary_role) ? onboardingProgress.primary_role : null) ??
        rowPrimary ??
        (isRole(profileRow?.profile_type) ? profileRow?.profile_type : null) ??
        LEGACY_ROLE_TO_PRIMARY[String(profileRow?.user_type ?? '')] ??
        (profileRow?.is_creator ? 'artist' : 'fan');
      const selectedFromProgress = Array.isArray(onboardingProgress.selected_roles)
        ? onboardingProgress.selected_roles
        : [];
      const resolvedRoles = normalizeRoles(
        [...selectedFromProgress, ...rows.map((row) => row.role)],
        fallbackPrimary,
      );

      setProfile(profileRow);
      setFullName(profileRow?.full_name || (user.user_metadata?.full_name as string | undefined) || '');
      setBio(profileRow?.bio || '');
      setLocation(((profileRow as any)?.location as string | null) || '');
      setPrimaryRole(fallbackPrimary);
      setSecondaryRoles(resolvedRoles.filter((role) => role !== fallbackPrimary));
      setPrivateAccount(Boolean(onboardingProgress.mobile_profile_settings?.private_account));
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Profile unavailable', 'We could not load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const choosePrimaryRole = (role: EcosystemRole) => {
    setPrimaryRole(role);
    setSecondaryRoles((current) => current.filter((item) => item !== role));
    setShowPrimaryPicker(false);
  };

  const toggleSecondaryRole = (role: EcosystemRole) => {
    if (role === primaryRole) return;
    setSecondaryRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : uniq([...current, role]),
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const legacyProfile = resolveLegacyProfileFromRoles(primaryRole, selectedRoles);
      const onboardingProgress =
        profile?.onboarding_progress && typeof profile.onboarding_progress === 'object'
          ? (profile.onboarding_progress as Record<string, any>)
          : {};
      const nextProgress = {
        ...onboardingProgress,
        version: 3,
        primary_role: primaryRole,
        selected_roles: selectedRoles,
        mobile_profile_settings: {
          ...(onboardingProgress.mobile_profile_settings ?? {}),
          private_account: privateAccount,
        },
      };
      const basePayload = {
        user_id: user.id,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        user_type: legacyProfile.userType,
        is_creator: legacyProfile.isCreator,
        profile_type: primaryRole,
        onboarding_progress: nextProgress,
        updated_at: new Date().toISOString(),
      };
      const payloads: Array<Record<string, unknown>> = [
        {
          ...basePayload,
          location: location.trim() || null,
        },
        basePayload,
      ];

      let savedProfile: Profile | null = null;
      let lastError: any = null;

      for (const payload of payloads) {
        const { data, error } = await ((supabase as any)
          .from('profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .select('*')
          .single() as any);

        if (!error) {
          savedProfile = data as Profile;
          break;
        }

        lastError = error;
        if (!['PGRST204', '42703'].includes(error.code)) break;
      }

      if (!savedProfile && lastError) throw lastError;

      await syncRoleSelection(user.id, selectedRoles, primaryRole);

      setProfile(savedProfile);
      Alert.alert('Profile saved', 'Your profile changes have been saved.');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Could not save profile', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="light" />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={PLUGGD_ORANGE} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </Pressable>

          <View style={styles.titleLogoWrap}>
            <Text style={styles.topBarTitle}>Profile</Text>
            <PluggdWordmark />
          </View>

          <Pressable style={styles.iconButton} onPress={() => router.push('/settings/privacy')}>
            <MaterialIcons name="settings" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            )}
            <View style={styles.cameraBadge}>
              <MaterialIcons name="photo-camera" size={13} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.username}>@{username}</Text>

            <View style={styles.roleChipRow}>
              <View style={styles.primaryChip}>
                <MaterialIcons name="star" size={14} color={PLUGGD_ORANGE} />
                <Text style={styles.primaryChipText}>{ROLE_LABELS[primaryRole]}</Text>
              </View>

              {secondaryRoleLabels.slice(0, 2).map((label) => (
                <View key={label} style={styles.secondaryChipSmall}>
                  <Text style={styles.secondaryChipSmallText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={25} color="#8E8E8E" />
        </View>

        <Section title="Account hub">
          <HubGrid>
            <HubAction icon="account-balance-wallet" label="Wallet" value="Credits and activity" onPress={() => router.push('/wallet' as any)} />
            <HubAction icon="library-music" label="Library" value="Owned music and packs" onPress={() => router.push('/library' as any)} />
            <HubAction icon="favorite-border" label="Favorites" value="Saved content" onPress={() => router.push('/favorites' as any)} />
            <HubAction icon="receipt-long" label="Orders" value="Purchases and receipts" onPress={() => router.push('/commerce/orders' as any)} />
            <HubAction icon="workspace-premium" label="Memberships" value="Creator subscriptions" onPress={() => router.push('/membership' as any)} />
            <HubAction icon="notifications-none" label="Notifications" value="Activity and alerts" onPress={() => router.push('/social/notifications' as any)} />
            <HubAction icon="mail-outline" label="Inbox" value="Messages" onPress={() => router.push('/social/inbox' as any)} />
            <HubAction icon="space-dashboard" label="Studio" value="Creator tools" onPress={() => router.push('/creator/dashboard' as any)} />
          </HubGrid>
        </Section>

        <Section title="Profile basics">
          <EditableRow icon="person-outline" label="Name" value={fullName} onChangeText={setFullName} />
          <EditableRow icon="edit" label="Bio" value={bio} onChangeText={setBio} multiline />
          <EditableRow icon="location-on" label="City" value={location} onChangeText={setLocation} />
          <SettingsRow icon="link" label="Links" value="Instagram, X, YouTube" />
        </Section>

        <Section title="Roles">
          <View style={styles.primaryRoleSelector}>
            <View style={styles.rowIconBox}>
              <MaterialIcons
                name={ROLE_ICONS[primaryRole] ?? 'star-border'}
                size={22}
                color={PLUGGD_ORANGE}
              />
            </View>

            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Primary role</Text>
              <Text style={styles.rowValue}>{ROLE_LABELS[primaryRole]}</Text>
            </View>

            <Pressable
              style={styles.dropdownPill}
              onPress={() => setShowPrimaryPicker((current) => !current)}
            >
              <Text style={styles.dropdownText}>Change</Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color={PLUGGD_ORANGE} />
            </Pressable>
          </View>

          {showPrimaryPicker && (
            <View style={styles.primaryPickerGrid}>
              {ROLE_OPTIONS.map((role) => {
                const selected = primaryRole === role.value;

                return (
                  <Pressable
                    key={role.value}
                    onPress={() => choosePrimaryRole(role.value)}
                    style={[styles.roleChip, selected && styles.roleChipSelected]}
                  >
                    <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                      {role.label}
                    </Text>
                    {selected ? (
                      <MaterialIcons name="check-circle" size={16} color={PLUGGD_ORANGE} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={styles.multiSelectLabel}>Secondary roles</Text>

          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map((role) => {
              const selected = role.value === primaryRole || secondaryRoles.includes(role.value);
              const locked = role.value === primaryRole;

              return (
                <Pressable
                  key={role.value}
                  onPress={() => toggleSecondaryRole(role.value)}
                  style={[
                    styles.roleChip,
                    selected && styles.roleChipSelected,
                    locked && styles.roleChipLocked,
                  ]}
                >
                  <MaterialIcons
                    name={role.icon}
                    size={17}
                    color={selected ? PLUGGD_ORANGE : '#D4D4D4'}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.roleChipText, selected && styles.roleChipTextSelected]}
                  >
                    {role.label}
                  </Text>

                  {selected ? (
                    <MaterialIcons name="check-circle" size={16} color={PLUGGD_ORANGE} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Privacy">
          <Pressable
            style={styles.toggleRow}
            onPress={() => setPrivateAccount((value) => !value)}
          >
            <View style={styles.rowIconBox}>
              <MaterialIcons name="lock-outline" size={22} color={PLUGGD_ORANGE} />
            </View>

            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Private account</Text>
              <Text style={styles.rowValue}>Only approved users can follow you</Text>
            </View>

            <View style={[styles.switchTrack, privateAccount && styles.switchTrackOn]}>
              <View style={[styles.switchThumb, privateAccount && styles.switchThumbOn]} />
            </View>
          </Pressable>
        </Section>

        <Section title="Data">
          <SettingsRow
            icon="download"
            label="Export data"
            value="Download a copy of your data"
            onPress={() => router.push('/settings/data-export' as any)}
          />
        </Section>

        <Section title="Account">
          <SettingsRow
            icon="logout"
            label="Sign out"
            value="Sign out of your account"
            danger
            onPress={handleSignOut}
          />
        </Section>
      </ScrollView>

      <View style={styles.bottomArea}>
        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function HubGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.hubGrid}>{children}</View>;
}

function HubAction({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.hubAction} onPress={onPress}>
      <View style={styles.hubIconBox}>
        <MaterialIcons name={icon} size={21} color={PLUGGD_ORANGE} />
      </View>
      <Text style={styles.hubLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.hubValue} numberOfLines={2}>
        {value}
      </Text>
    </Pressable>
  );
}

function EditableRow({
  icon,
  label,
  value,
  onChangeText,
  multiline,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.settingsRow, multiline && styles.settingsRowTall]}>
      <View style={styles.rowIconBox}>
        <MaterialIcons name={icon} size={22} color={PLUGGD_ORANGE} />
      </View>

      <View style={styles.rowTextWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={label === 'City' ? 'London, UK' : label}
          placeholderTextColor="#686868"
          multiline={multiline}
          style={[styles.rowInput, multiline && styles.rowInputMultiline]}
        />
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  danger,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.rowIconBox}>
        <MaterialIcons name={icon} size={22} color={danger ? '#FF5C5C' : PLUGGD_ORANGE} />
      </View>

      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>

      <MaterialIcons name="chevron-right" size={24} color="#737373" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 146,
  },
  topBar: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: -3,
  },
  titleLogoWrap: {
    alignItems: 'center',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    minHeight: 118,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#2A1711',
    borderWidth: 1.5,
    borderColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
    overflow: 'visible',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PLUGGD_ORANGE,
    borderWidth: 2,
    borderColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  username: {
    color: '#AFAFAF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  roleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 11,
  },
  primaryChip: {
    borderRadius: 8,
    backgroundColor: '#24150E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryChipText: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryChipSmall: {
    borderRadius: 8,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#343434',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryChipSmallText: {
    color: '#DADADA',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#8E8E8E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    overflow: 'hidden',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
  },
  hubAction: {
    width: '48.7%',
    minHeight: 104,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#101010',
    padding: 11,
  },
  hubIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#21130E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  hubLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  hubValue: {
    color: '#A5A5A5',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  settingsRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  settingsRowTall: {
    alignItems: 'flex-start',
  },
  rowIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  rowValue: {
    color: '#A5A5A5',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  rowInput: {
    color: '#A5A5A5',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    paddingVertical: 0,
  },
  rowInputMultiline: {
    minHeight: 44,
    textAlignVertical: 'top',
  },
  dangerText: {
    color: '#FF5C5C',
  },
  primaryRoleSelector: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  dropdownPill: {
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1C120E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 3,
  },
  dropdownText: {
    color: PLUGGD_ORANGE,
    fontSize: 13,
    fontWeight: '900',
  },
  primaryPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  multiSelectLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 9,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 13,
    paddingBottom: 14,
  },
  roleChip: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#343434',
    backgroundColor: '#101010',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  roleChipSelected: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1A120E',
  },
  roleChipLocked: {
    opacity: 0.8,
  },
  roleChipText: {
    color: '#D4D4D4',
    fontSize: 13,
    fontWeight: '800',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  toggleRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  switchTrack: {
    width: 52,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#2C2C2C',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: PLUGGD_ORANGE,
  },
  switchThumb: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#BEBEBE',
  },
  switchThumbOn: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 84,
    backgroundColor: 'rgba(8,8,8,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#171717',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  saveButton: {
    height: 54,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});
