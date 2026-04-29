import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';

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

type LegacyUserType = 'artist' | 'producer' | 'industry' | null;
type RoleCategory = 'Creator' | 'Industry' | 'Support' | 'Fan';

type RoleOption = {
  value: EcosystemRole;
  label: string;
  description: string;
  category: RoleCategory;
  icon: keyof typeof MaterialIcons.glyphMap;
  modules: string[];
};

const PLUGGD_ORANGE = '#FF5200';
const REQUIRED_TASK_IDS = ['profile_basics', 'first_role_action'];
const ROLE_FALLBACK_CODES = new Set(['42P01', '42703', '42704', 'PGRST204']);

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'artist',
    label: 'Artist',
    description: 'Vocalist, rapper, songwriter, performer',
    category: 'Creator',
    icon: 'mic',
    modules: ['Drops', 'Memberships', 'Split Engine'],
  },
  {
    value: 'producer',
    label: 'Producer',
    description: 'Beatmaker, composer, studio creator',
    category: 'Creator',
    icon: 'tune',
    modules: ['Beats', 'Sound Packs', 'Licensing'],
  },
  {
    value: 'dj',
    label: 'DJ',
    description: 'Selector, mix curator, live DJ performer',
    category: 'Creator',
    icon: 'album',
    modules: ['Mixes', 'Tracklists', 'Live'],
  },
  {
    value: 'promoter',
    label: 'Promoter',
    description: 'Runs shows, lineups, and event campaigns',
    category: 'Industry',
    icon: 'campaign',
    modules: ['My Events', 'Venues', 'Applications'],
  },
  {
    value: 'venue',
    label: 'Venue',
    description: 'Hosts events, nights, and live sessions',
    category: 'Industry',
    icon: 'apartment',
    modules: ['Venue Profile', 'Events', 'Bookings'],
  },
  {
    value: 'curator',
    label: 'Curator',
    description: 'Builds playlists, selections, and editorial picks',
    category: 'Creator',
    icon: 'star-border',
    modules: ['Soundboards', 'Editorial', 'Collaborations'],
  },
  {
    value: 'service_provider',
    label: 'Service Provider',
    description: 'Engineer, designer, marketer, or specialist',
    category: 'Support',
    icon: 'build',
    modules: ['Collaborations', 'CRM', 'Revenue'],
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Represents talent and coordinates operations',
    category: 'Industry',
    icon: 'groups',
    modules: ['Roster', 'CRM', 'Revenue'],
  },
  {
    value: 'fan',
    label: 'Fan',
    description: 'Discovers and supports creators',
    category: 'Fan',
    icon: 'favorite-border',
    modules: ['Directory', 'Events', 'Live'],
  },
];

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
      source: 'mobile_onboarding_v1',
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
  return (
    <View style={styles.logoTextRow}>
      <Text style={styles.logoText}>PL</Text>
      <Text style={[styles.logoText, styles.logoAccent]}>U</Text>
      <Text style={styles.logoText}>GGD</Text>
    </View>
  );
}

export default function RoleSelection() {
  const router = useRouter();
  const [primaryRole, setPrimaryRole] = useState<EcosystemRole | null>(null);
  const [secondaryRoles, setSecondaryRoles] = useState<EcosystemRole[]>([]);
  const [loading, setLoading] = useState(false);

  const secondaryOptions = useMemo(
    () => ROLE_OPTIONS.filter((role) => role.value !== primaryRole),
    [primaryRole],
  );

  const selectedRoles = useMemo(() => {
    if (!primaryRole) return [];
    return uniq([primaryRole, ...secondaryRoles.filter((role) => role !== primaryRole)]);
  }, [primaryRole, secondaryRoles]);

  const hasCreatorAccess = selectedRoles.some((role) => role !== 'fan');

  const choosePrimaryRole = (role: EcosystemRole) => {
    setPrimaryRole(role);
    setSecondaryRoles((current) => current.filter((item) => item !== role));
  };

  const toggleSecondaryRole = (role: EcosystemRole) => {
    if (role === primaryRole) return;
    setSecondaryRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : uniq([...current, role]),
    );
  };

  const handleContinue = async () => {
    if (!primaryRole) return;
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const legacyProfile = resolveLegacyProfileFromRoles(primaryRole, selectedRoles);
      const onboardingProgress = {
        version: 3,
        primary_role: primaryRole,
        selected_roles: selectedRoles,
        welcome_seen_at: null,
        completed_tasks: [],
        required_tasks: REQUIRED_TASK_IDS,
        completed_at: null,
        rewards_claimed: false,
        tour_seen_at: null,
      };

      const profilePayload = {
        user_id: user.id,
        user_type: legacyProfile.userType,
        is_creator: legacyProfile.isCreator,
        profile_type: primaryRole,
        onboarding_completed: false,
        onboarding_progress: onboardingProgress,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await (supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'user_id' }) as any);

      if (profileError) throw profileError;

      await syncRoleSelection(user.id, selectedRoles, primaryRole);

      router.replace(hasCreatorAccess ? '/creator/onboarding' : '/auth/fan-setup');
    } catch (error: any) {
      console.error('Error updating roles:', error);
      Alert.alert(
        'Could not save roles',
        error?.message ?? 'Please try again in a moment.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.logoWrap}>
          <PluggdWordmark />
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, { left: '50%', marginLeft: -6 }]} />
            <View style={[styles.progressDot, { right: 0 }]} />
          </View>
          <Text style={styles.stepText}>Step 1 of 3</Text>
        </View>

        <Text style={styles.title}>What do you do on Pluggd?</Text>
        <Text style={styles.subtitle}>
          Pick one primary role, then add any secondary roles you also operate as.
        </Text>

        <Text style={styles.sectionTitle}>Primary role</Text>

        <View style={styles.primaryList}>
          {ROLE_OPTIONS.map((role) => {
            const selected = primaryRole === role.value;

            return (
              <Pressable
                key={role.value}
                onPress={() => choosePrimaryRole(role.value)}
                style={[styles.roleCard, selected && styles.roleCardSelected]}
              >
                <View style={styles.roleIconBox}>
                  <MaterialIcons
                    name={role.icon}
                    size={24}
                    color={selected ? PLUGGD_ORANGE : '#F5F5F5'}
                  />
                </View>

                <View style={styles.roleTextWrap}>
                  <Text style={styles.roleName}>{role.label}</Text>
                  <Text style={styles.roleDescription} numberOfLines={1}>
                    {role.description}
                  </Text>
                </View>

                <View style={styles.roleRight}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{role.category}</Text>
                  </View>

                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && (
                      <MaterialIcons name="check" size={18} color="#080808" />
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {primaryRole && (
          <>
            <View style={styles.secondaryHeader}>
              <Text style={styles.sectionTitle}>Secondary roles</Text>
              <Text style={styles.helperText}>
                Optional. These unlock extra profile and studio areas after setup.
              </Text>
            </View>

            <View style={styles.secondaryGrid}>
              {secondaryOptions.map((role) => {
                const selected = secondaryRoles.includes(role.value);

                return (
                  <Pressable
                    key={role.value}
                    onPress={() => toggleSecondaryRole(role.value)}
                    style={[
                      styles.secondaryChip,
                      selected && styles.secondaryChipSelected,
                    ]}
                  >
                    <MaterialIcons
                      name={role.icon}
                      size={18}
                      color={selected ? PLUGGD_ORANGE : '#D8D8D8'}
                    />
                    <Text
                      style={[
                        styles.secondaryChipText,
                        selected && styles.secondaryChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {role.label}
                    </Text>

                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected && (
                        <MaterialIcons name="check" size={14} color="#080808" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, (!primaryRole || loading) && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={!primaryRole || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 112,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  progressWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  progressTrack: {
    width: 118,
    height: 2,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    width: 40,
    height: 2,
    backgroundColor: PLUGGD_ORANGE,
    borderRadius: 2,
  },
  progressDot: {
    position: 'absolute',
    top: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A4A4A',
  },
  progressDotActive: {
    left: 0,
    backgroundColor: '#080808',
    borderWidth: 2,
    borderColor: PLUGGD_ORANGE,
  },
  stepText: {
    color: '#9B9B9B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#B8B8B8',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
    paddingHorizontal: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  primaryList: {
    gap: 7,
  },
  roleCard: {
    minHeight: 56,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1A120E',
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 7,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  roleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  roleName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  roleDescription: {
    color: '#B8B8B8',
    fontSize: 13,
    lineHeight: 17,
  },
  roleRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginLeft: 8,
  },
  categoryBadge: {
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#111111',
  },
  categoryBadgeText: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '800',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#7A7A7A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: PLUGGD_ORANGE,
    borderColor: PLUGGD_ORANGE,
  },
  secondaryHeader: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  helperText: {
    flex: 1,
    color: '#9A9A9A',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryChip: {
    width: '48.8%',
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#151515',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    gap: 8,
  },
  secondaryChipSelected: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1A120E',
  },
  secondaryChipText: {
    flex: 1,
    color: '#E5E5E5',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryChipTextSelected: {
    color: '#FFFFFF',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: PLUGGD_ORANGE,
    borderColor: PLUGGD_ORANGE,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: 'rgba(8,8,8,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#151515',
  },
  cta: {
    height: 56,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#2A2A2A',
    opacity: 0.65,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
