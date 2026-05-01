import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BrandLogo } from '../../components/BrandLogo';
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

type TaskId =
  | 'profile_basics'
  | 'first_role_action'
  | 'connect_stripe'
  | 'install_app'
  | 'role_network_setup';

type ChecklistStatus = 'Not started' | 'In progress' | 'Done';

type OnboardingProgress = {
  version?: number;
  primary_role?: EcosystemRole;
  selected_roles?: EcosystemRole[];
  welcome_seen_at?: string | null;
  completed_tasks?: TaskId[];
  required_tasks?: TaskId[];
  completed_at?: string | null;
  rewards_claimed?: boolean;
  tour_seen_at?: string | null;
};

type ChecklistItem = {
  key: TaskId;
  title: string;
  subtitle: string;
  status: ChecklistStatus;
  icon: keyof typeof MaterialIcons.glyphMap;
  required: boolean;
  route?: string;
  params?: Record<string, string>;
};

const PLUGGD_ORANGE = '#FF5200';
const REQUIRED_TASKS: TaskId[] = ['profile_basics', 'first_role_action'];

const ROLE_LABELS: Record<EcosystemRole, string> = {
  artist: 'Artist',
  producer: 'Producer',
  dj: 'DJ',
  promoter: 'Promoter',
  venue: 'Venue',
  curator: 'Curator',
  service_provider: 'Service Provider',
  manager: 'Manager',
  fan: 'Fan',
};

const ROLE_ICONS: Record<EcosystemRole, keyof typeof MaterialIcons.glyphMap> = {
  artist: 'mic',
  producer: 'tune',
  dj: 'album',
  promoter: 'campaign',
  venue: 'apartment',
  curator: 'star-border',
  service_provider: 'build',
  manager: 'groups',
  fan: 'favorite-border',
};

const LEGACY_ROLE_TO_PRIMARY: Record<string, EcosystemRole> = {
  artist: 'artist',
  producer: 'producer',
  industry: 'promoter',
};

function normalizeProgress(raw: unknown): OnboardingProgress {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return raw as OnboardingProgress;
}

function uniq<T>(items: T[]) {
  return Array.from(new Set(items));
}

function getRoleAction(role: EcosystemRole) {
  switch (role) {
    case 'producer':
      return {
        setupText: 'Upload your first beat',
        actionLabel: 'Upload Beat',
        route: '/creator/upload',
      };
    case 'artist':
      return {
        setupText: 'Publish your first release',
        actionLabel: 'Create Release',
        route: '/creator/upload',
      };
    case 'dj':
      return {
        setupText: 'Upload your first mix',
        actionLabel: 'Open Mixes',
        route: '/creator/dashboard',
      };
    case 'promoter':
      return {
        setupText: 'Create your first event',
        actionLabel: 'Create Event',
        route: '/creator/dashboard',
      };
    case 'venue':
      return {
        setupText: 'Set up your venue profile',
        actionLabel: 'Open Events',
        route: '/creator/dashboard',
      };
    case 'curator':
      return {
        setupText: 'Create your first soundboard',
        actionLabel: 'Open Collaborations',
        route: '/pro/collab',
      };
    case 'service_provider':
      return {
        setupText: 'Create your service listing',
        actionLabel: 'Open Collaborations',
        route: '/pro/collab',
      };
    case 'manager':
      return {
        setupText: 'Add your roster',
        actionLabel: 'Open Collaborations',
        route: '/pro/collab',
      };
    case 'fan':
    default:
      return {
        setupText: 'Personalize your feed',
        actionLabel: 'Personalize Feed',
        route: '/auth/fan-setup',
      };
  }
}

function PluggdWordmark() {
  return <BrandLogo variant="dark" width={122} height={44} />;
}

export default function CreatorOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryRole, setPrimaryRole] = useState<EcosystemRole>('artist');
  const [selectedRoles, setSelectedRoles] = useState<EcosystemRole[]>(['artist']);
  const [completedTasks, setCompletedTasks] = useState<TaskId[]>([]);
  const [progress, setProgress] = useState<OnboardingProgress>({});

  const loadOnboarding = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_type,is_creator,onboarding_progress,onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any)
          .from('profile_roles')
          .select('role,is_primary')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false }),
      ]);

      const normalized = normalizeProgress((profile as any)?.onboarding_progress);
      const rows = Array.isArray(roleRows)
        ? (roleRows as Array<{ role: EcosystemRole; is_primary: boolean }>)
        : [];
      const explicitPrimary = rows.find((row) => row.is_primary)?.role;
      const rowRoles = rows.map((row) => row.role).filter(Boolean);
      const fallbackPrimary =
        normalized.primary_role ??
        explicitPrimary ??
        LEGACY_ROLE_TO_PRIMARY[String((profile as any)?.user_type ?? '')] ??
        ((profile as any)?.is_creator ? 'artist' : 'fan');
      const resolvedSelectedRoles = uniq([
        fallbackPrimary,
        ...(normalized.selected_roles ?? []),
        ...rowRoles,
      ]).filter(Boolean) as EcosystemRole[];

      if (fallbackPrimary === 'fan' && resolvedSelectedRoles.every((role) => role === 'fan')) {
        router.replace('/auth/fan-setup');
        return;
      }

      setPrimaryRole(fallbackPrimary);
      setSelectedRoles(resolvedSelectedRoles.length > 0 ? resolvedSelectedRoles : [fallbackPrimary]);
      setCompletedTasks((normalized.completed_tasks ?? []).filter(Boolean));
      setProgress(normalized);
    } catch (error) {
      console.error('Failed to load onboarding:', error);
      Alert.alert('Setup unavailable', 'We could not load your setup checklist.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOnboarding();
  }, [loadOnboarding]);

  const roleAction = useMemo(() => getRoleAction(primaryRole), [primaryRole]);

  const items = useMemo<ChecklistItem[]>(() => {
    const orderedKeys: TaskId[] = [
      'profile_basics',
      'first_role_action',
      'connect_stripe',
      'install_app',
    ];
    const firstIncompleteIndex = orderedKeys.findIndex((task) => !completedTasks.includes(task));

    const base: Array<Omit<ChecklistItem, 'status'>> = [
      {
        key: 'profile_basics',
        title: 'Complete profile basics',
        subtitle: 'Photo, bio, city, links.',
        icon: 'person-outline',
        required: true,
        route: '/(tabs)/profile',
      },
      {
        key: 'first_role_action',
        title: 'Publish your first role action',
        subtitle: roleAction.setupText,
        icon: 'cloud-upload',
        required: true,
        route: roleAction.route,
      },
      {
        key: 'connect_stripe',
        title: 'Connect payouts',
        subtitle: 'Add your payout details',
        icon: 'credit-card',
        required: false,
        route: '/creator/payouts',
      },
      {
        key: 'install_app',
        title: 'Enable notifications',
        subtitle: 'Stay updated on activity',
        icon: 'notifications-none',
        required: false,
      },
    ];

    return base.map((item, index) => ({
      ...item,
      status: completedTasks.includes(item.key)
        ? 'Done'
        : index === Math.max(firstIncompleteIndex, 0)
          ? 'In progress'
          : 'Not started',
    }));
  }, [completedTasks, roleAction]);

  const primaryRoleLabel = ROLE_LABELS[primaryRole] ?? 'Creator';
  const secondaryRoleLabels = selectedRoles
    .filter((role) => role !== primaryRole)
    .map((role) => ROLE_LABELS[role] ?? role)
    .join(', ');

  const markTaskDone = async (taskId: TaskId) => {
    const nextCompleted = uniq([...completedTasks, taskId]);
    setCompletedTasks(nextCompleted);

    const requiredComplete = REQUIRED_TASKS.every((id) => nextCompleted.includes(id));
    const nextProgress: OnboardingProgress = {
      ...progress,
      version: 3,
      primary_role: primaryRole,
      selected_roles: selectedRoles,
      completed_tasks: nextCompleted,
      required_tasks: progress.required_tasks ?? REQUIRED_TASKS,
      completed_at: requiredComplete
        ? progress.completed_at ?? new Date().toISOString()
        : null,
    };

    setProgress(nextProgress);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        onboarding_progress: nextProgress as any,
        onboarding_completed: requiredComplete,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('user_id', user.id);
  };

  const handleContinue = async () => {
    const activeItem = items.find((item) => item.status === 'In progress') ?? items[0];
    if (!activeItem) return;

    if (activeItem.route) {
      router.push({ pathname: activeItem.route as any, params: activeItem.params });
      return;
    }

    setSaving(true);
    try {
      await markTaskDone(activeItem.key);
    } catch (error: any) {
      Alert.alert('Could not update setup', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={PLUGGD_ORANGE} />
      </View>
    );
  }

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

            <View style={[styles.progressStep, styles.progressDone, { left: 0 }]}>
              <MaterialIcons name="check" size={13} color={PLUGGD_ORANGE} />
            </View>

            <View style={[styles.progressStep, styles.progressDone, styles.progressMiddle]}>
              <MaterialIcons name="check" size={13} color={PLUGGD_ORANGE} />
            </View>

            <View style={[styles.progressStep, styles.progressActive, { right: 0 }]}>
              <Text style={styles.progressActiveText}>3</Text>
            </View>
          </View>

          <Text style={styles.stepText}>Step 3 of 3</Text>
        </View>

        <Text style={styles.title}>Set up your Pluggd space</Text>
        <Text style={styles.subtitle}>Complete the basics for your primary role.</Text>

        <Pressable
          style={styles.roleSummaryCard}
          onPress={() => router.push('/(tabs)/profile' as any)}
        >
          <View style={styles.roleAvatar}>
            <MaterialIcons
              name={ROLE_ICONS[primaryRole] ?? 'person-outline'}
              size={34}
              color={PLUGGD_ORANGE}
            />
          </View>

          <View style={styles.roleSummaryContent}>
            <Text style={styles.overline}>Your roles</Text>

            <View style={styles.roleSummaryRow}>
              <View style={styles.roleSummaryBlock}>
                <Text style={styles.roleSummaryLabel}>Primary role</Text>
                <Text style={styles.primaryRole}>{primaryRoleLabel}</Text>
              </View>

              <View style={styles.roleSummaryBlock}>
                <Text style={styles.roleSummaryLabel}>Secondary roles</Text>
                <Text style={styles.secondaryRoles}>
                  {secondaryRoleLabels || 'None yet'}
                </Text>
              </View>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={25} color="#8E8E8E" />
        </Pressable>

        <Text style={styles.sectionTitle}>Setup checklist</Text>

        <View style={styles.checklist}>
          {items.map((item, index) => (
            <ChecklistRow
              key={item.key}
              item={item}
              isLast={index === items.length - 1}
              onPress={() => {
                if (item.route) {
                  router.push({ pathname: item.route as any, params: item.params });
                  return;
                }
                markTaskDone(item.key).catch((error: any) => {
                  Alert.alert('Could not update setup', error?.message ?? 'Please try again.');
                });
              }}
            />
          ))}
        </View>

        <View style={styles.helperCard}>
          <View style={styles.helperIcon}>
            <MaterialIcons name="info-outline" size={22} color={PLUGGD_ORANGE} />
          </View>
          <Text style={styles.helperText}>
            You can update roles, profile fields, and tools later in{' '}
            <Text style={styles.helperLink}>Settings.</Text>
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={handleContinue} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Continue setup</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ChecklistRow({
  item,
  isLast,
  onPress,
}: {
  item: ChecklistItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const statusStyle =
    item.status === 'Done'
      ? styles.statusDone
      : item.status === 'In progress'
        ? styles.statusProgress
        : styles.statusNotStarted;

  const statusTextStyle =
    item.status === 'Done'
      ? styles.statusDoneText
      : item.status === 'In progress'
        ? styles.statusProgressText
        : styles.statusNotStartedText;

  const iconColor =
    item.status === 'Done'
      ? '#41D17D'
      : item.status === 'In progress'
        ? PLUGGD_ORANGE
        : '#BDBDBD';

  return (
    <Pressable
      style={[styles.checklistRow, !isLast && styles.checklistBorder]}
      onPress={onPress}
    >
      <View style={styles.checklistIconBox}>
        <MaterialIcons name={item.icon} size={24} color={iconColor} />
      </View>

      <View style={styles.checklistTextWrap}>
        <Text style={styles.checklistTitle}>{item.title}</Text>
        <Text style={styles.checklistDescription}>{item.subtitle}</Text>
      </View>

      <View style={styles.checklistRight}>
        <View style={[styles.statusPill, statusStyle]}>
          <Text style={[styles.statusText, statusTextStyle]}>{item.status}</Text>
        </View>

        <MaterialIcons name="chevron-right" size={24} color="#737373" />
      </View>
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
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 122,
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
    marginTop: 16,
    marginBottom: 28,
    alignItems: 'center',
  },
  progressTrack: {
    width: '84%',
    height: 2,
    backgroundColor: '#323232',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 2,
    backgroundColor: PLUGGD_ORANGE,
  },
  progressStep: {
    position: 'absolute',
    top: -16,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressMiddle: {
    left: '50%',
    marginLeft: -17,
  },
  progressDone: {
    backgroundColor: '#080808',
    borderWidth: 2,
    borderColor: PLUGGD_ORANGE,
  },
  progressActive: {
    backgroundColor: PLUGGD_ORANGE,
  },
  progressActiveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  stepText: {
    color: '#A9A9A9',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
  },
  subtitle: {
    color: '#B3B3B3',
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '500',
    marginTop: 14,
    marginBottom: 24,
  },
  roleSummaryCard: {
    minHeight: 116,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  roleAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#20130E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  roleSummaryContent: {
    flex: 1,
    minWidth: 0,
  },
  overline: {
    color: '#8E8E8E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  roleSummaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  roleSummaryBlock: {
    flex: 1,
    minWidth: 0,
  },
  roleSummaryLabel: {
    color: '#9F9F9F',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  primaryRole: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  secondaryRoles: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
  },
  checklist: {
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  checklistRow: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  checklistBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  checklistIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  checklistTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  checklistTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
  },
  checklistDescription: {
    color: '#A8A8A8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  checklistRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusProgress: {
    backgroundColor: '#24150E',
    borderColor: PLUGGD_ORANGE,
  },
  statusNotStarted: {
    backgroundColor: '#101010',
    borderColor: '#414141',
  },
  statusDone: {
    backgroundColor: '#0E2418',
    borderColor: '#41D17D',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statusProgressText: {
    color: PLUGGD_ORANGE,
  },
  statusNotStartedText: {
    color: '#BDBDBD',
  },
  statusDoneText: {
    color: '#41D17D',
  },
  helperCard: {
    marginTop: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helperIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#21130E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helperText: {
    flex: 1,
    color: '#B9B9B9',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  helperLink: {
    color: PLUGGD_ORANGE,
    fontWeight: '900',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: 'rgba(8,8,8,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#151515',
  },
  cta: {
    height: 58,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
});
