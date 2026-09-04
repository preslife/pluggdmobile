import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import type { PluggdTheme } from '../../src/design/tokens';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
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
  return <BrandLogo width={122} height={44} />;
}

export default function CreatorOnboarding() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.accentText} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
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
              <MaterialIcons name="check" size={13} color={theme.colors.accentText} />
            </View>

            <View style={[styles.progressStep, styles.progressDone, styles.progressMiddle]}>
              <MaterialIcons name="check" size={13} color={theme.colors.accentText} />
            </View>

            <View style={[styles.progressStep, styles.progressActive, { right: 0 }]}>
              <Text style={styles.progressActiveText} maxFontSizeMultiplier={1.25}>3</Text>
            </View>
          </View>

          <Text style={styles.stepText} maxFontSizeMultiplier={1.35}>Step 3 of 3</Text>
        </View>

        <Text style={styles.title} maxFontSizeMultiplier={1.3}>Set up your PLUGGD space</Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.45}>Complete the basics for your primary role.</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit your creator roles"
          style={styles.roleSummaryCard}
          onPress={() => router.push('/profile' as any)}
        >
          <View style={styles.roleAvatar}>
            <MaterialIcons
              name={ROLE_ICONS[primaryRole] ?? 'person-outline'}
              size={34}
              color={theme.colors.accentText}
            />
          </View>

          <View style={styles.roleSummaryContent}>
            <Text style={styles.overline} maxFontSizeMultiplier={1.3}>Your roles</Text>

            <View style={styles.roleSummaryRow}>
              <View style={styles.roleSummaryBlock}>
                <Text style={styles.roleSummaryLabel} maxFontSizeMultiplier={1.3}>Primary role</Text>
                <Text style={styles.primaryRole} maxFontSizeMultiplier={1.3}>{primaryRoleLabel}</Text>
              </View>

              <View style={styles.roleSummaryBlock}>
                <Text style={styles.roleSummaryLabel} maxFontSizeMultiplier={1.3}>Secondary roles</Text>
                <Text style={styles.secondaryRoles} maxFontSizeMultiplier={1.35}>
                  {secondaryRoleLabels || 'None yet'}
                </Text>
              </View>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={25} color={theme.colors.textMuted} />
        </Pressable>

        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.35}>Setup checklist</Text>

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
            <MaterialIcons name="info-outline" size={22} color={theme.colors.accentText} />
          </View>
          <Text style={styles.helperText} maxFontSizeMultiplier={1.4}>
            You can update roles, profile fields, and tools later in{' '}
            <Text style={styles.helperLink} maxFontSizeMultiplier={1.4}>Settings.</Text>
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" accessibilityLabel={saving ? 'Saving creator profile' : 'Continue creator setup'} style={styles.cta} onPress={handleContinue} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <Text style={styles.ctaText} maxFontSizeMultiplier={1.35}>Continue setup</Text>
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
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      ? theme.colors.success
      : item.status === 'In progress'
        ? theme.colors.accentText
        : theme.colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.status}. ${item.subtitle}`}
      style={[styles.checklistRow, !isLast && styles.checklistBorder]}
      onPress={onPress}
    >
      <View style={styles.checklistIconBox}>
        <MaterialIcons name={item.icon} size={24} color={iconColor} />
      </View>

      <View style={styles.checklistTextWrap}>
        <Text style={styles.checklistTitle} maxFontSizeMultiplier={1.3}>{item.title}</Text>
        <Text style={styles.checklistDescription} maxFontSizeMultiplier={1.4}>{item.subtitle}</Text>
      </View>

      <View style={styles.checklistRight}>
        <View style={[styles.statusPill, statusStyle]}>
          <Text style={[styles.statusText, statusTextStyle]} maxFontSizeMultiplier={1.25}>{item.status}</Text>
        </View>

        <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 44,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    letterSpacing: 1,
  },
  logoAccent: {
    color: theme.colors.accentText,
  },
  progressWrap: {
    marginTop: 16,
    marginBottom: 28,
    alignItems: 'center',
  },
  progressTrack: {
    width: '84%',
    height: 2,
    backgroundColor: theme.colors.borderStrong,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.accentFill,
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
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.accentFill,
  },
  progressActive: {
    backgroundColor: theme.colors.accentFill,
  },
  progressActiveText: {
    color: theme.colors.onAccent,
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  stepText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginTop: 28,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    letterSpacing: -1.2,
    fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginTop: 10,
    marginBottom: 24,
  },
  roleSummaryCard: {
    minHeight: 116,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  roleAvatar: {
    width: 60,
    height: 60,
    borderRadius: 5,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  roleSummaryContent: {
    flex: 1,
    minWidth: 0,
  },
  overline: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    color: theme.colors.textMuted,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginBottom: 4,
  },
  primaryRole: {
    color: theme.colors.text,
    fontSize: 22,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
  },
  secondaryRoles: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
    marginBottom: 12,
  },
  checklist: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
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
    borderBottomColor: theme.colors.divider,
  },
  checklistIconBox: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.text,
    fontSize: 17,
    fontFamily: pluggdFonts.displayBold, fontWeight: '700',
  },
  checklistDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
    marginTop: 4,
  },
  checklistRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  statusPill: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusProgress: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.borderAccent,
  },
  statusNotStarted: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.controlBorder,
  },
  statusDone: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.success,
  },
  statusText: {
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  statusProgressText: {
    color: theme.colors.accentText,
  },
  statusNotStartedText: {
    color: theme.colors.textMuted,
  },
  statusDoneText: {
    color: theme.colors.success,
  },
  helperCard: {
    marginTop: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  helperIcon: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helperText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
  },
  helperLink: {
    color: theme.colors.accentText,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: theme.colors.headerGlass,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cta: {
    height: 58,
    borderRadius: 5,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: theme.colors.onAccent,
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
  },
  });
}
