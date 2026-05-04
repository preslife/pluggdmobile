import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthProvider';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { useWallet } from '../../src/hooks/useWallet';
import { supabase } from '../../src/lib/supabase';

const PLUGGD_ORANGE = '#FF5200';

type RoleKey =
  | 'artist'
  | 'producer'
  | 'dj'
  | 'promoter'
  | 'venue'
  | 'curator'
  | 'service_provider'
  | 'manager'
  | 'fan';

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  profile_type: string | null;
  user_type: string | null;
  is_creator: boolean | null;
};

type ProfileRoleRow = {
  role: RoleKey;
  is_primary: boolean | null;
};

type KpiEventRow = {
  metric_date: string;
  kpi_key: string;
  kpi_value: number;
  occurred_at: string;
};

type CreatorMetricRow = {
  metric_date: string;
  revenue_cents: number | null;
  plays_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  sales_count: number | null;
  sales_revenue_cents: number | null;
  subs_active: number | null;
  subs_mrr_cents: number | null;
  new_fans_30d: number | null;
};

type ReleaseRow = {
  id: string;
  title: string;
  status: string | null;
  total_plays: number | null;
  total_revenue: number | null;
  release_date: string | null;
  scheduled_publish_date: string | null;
  created_at: string;
};

type BeatRow = {
  id: string;
  title: string;
  is_published: boolean;
  price: number | null;
  created_at: string;
};

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  rsvp_count: number | null;
  created_at: string;
};

type SessionRoomRow = {
  id: string;
  title: string;
  status: string;
  live_mode: string | null;
  scheduled_for: string | null;
  created_at: string;
  participant_count: number | null;
};

type MembershipTierRow = {
  id: string;
  name: string;
  status: string;
  current_members: number | null;
  price_monthly: number | null;
};

type LedgerRow = {
  id: string;
  kind: string;
  amount_credits: number;
  ref_type: string | null;
  created_at: string;
};

type StudioData = {
  profile: ProfileRow | null;
  roles: ProfileRoleRow[];
  kpis: KpiEventRow[];
  metrics: CreatorMetricRow[];
  releases: ReleaseRow[];
  beats: BeatRow[];
  events: EventRow[];
  rooms: SessionRoomRow[];
  tiers: MembershipTierRow[];
  ledger: LedgerRow[];
  counts: {
    releases: number;
    beats: number;
    events: number;
    rooms: number;
    tiers: number;
  };
};

const EMPTY_DATA: StudioData = {
  profile: null,
  roles: [],
  kpis: [],
  metrics: [],
  releases: [],
  beats: [],
  events: [],
  rooms: [],
  tiers: [],
  ledger: [],
  counts: {
    releases: 0,
    beats: 0,
    events: 0,
    rooms: 0,
    tiers: 0,
  },
};

const ROLE_LABELS: Record<RoleKey, string> = {
  artist: 'Artist',
  producer: 'Producer',
  dj: 'DJ',
  promoter: 'Promoter',
  venue: 'Venue',
  curator: 'Curator',
  service_provider: 'Services',
  manager: 'Manager',
  fan: 'Fan',
};

const ROLE_ICONS: Record<RoleKey, keyof typeof MaterialIcons.glyphMap> = {
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

const LEGACY_TO_ROLE: Record<string, RoleKey> = {
  artist: 'artist',
  producer: 'producer',
  industry: 'promoter',
};

function isRole(value: unknown): value is RoleKey {
  return typeof value === 'string' && value in ROLE_LABELS;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return Math.round(value).toLocaleString();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function creditsToGBP(credits: number) {
  return credits / 100;
}

function displayName(profile: ProfileRow | null, fallback?: string | null) {
  return profile?.full_name?.trim() || profile?.username?.trim() || fallback?.split('@')[0] || 'Creator';
}

function roleFromProfile(profile: ProfileRow | null): RoleKey {
  if (isRole(profile?.profile_type)) return profile.profile_type;
  const legacy = profile?.user_type ? LEGACY_TO_ROLE[profile.user_type] : null;
  if (legacy) return legacy;
  return profile?.is_creator ? 'artist' : 'fan';
}

function dateLabel(value?: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function timeLabel(value?: string | null) {
  if (!value) return 'No time set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time set';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function sumKpi(rows: KpiEventRow[], keys: string[]) {
  const allowed = new Set(keys);
  return rows.reduce((sum, row) => sum + (allowed.has(row.kpi_key) ? Number(row.kpi_value ?? 0) : 0), 0);
}

function trendForKpi(rows: KpiEventRow[], keys: string[]) {
  const allowed = new Set(keys);
  const daily: Record<string, number> = {};

  rows.forEach((row) => {
    if (!allowed.has(row.kpi_key)) return;
    daily[row.metric_date] = (daily[row.metric_date] ?? 0) + Number(row.kpi_value ?? 0);
  });

  const dates = Object.keys(daily).sort();
  if (dates.length === 0) return 0;
  const recent = dates.slice(-7).reduce((sum, date) => sum + (daily[date] ?? 0), 0);
  const previous = dates.slice(-14, -7).reduce((sum, date) => sum + (daily[date] ?? 0), 0);
  if (previous === 0) return recent > 0 ? 100 : 0;
  return ((recent - previous) / previous) * 100;
}

function kpiSeries(rows: KpiEventRow[], keys: string[]) {
  const allowed = new Set(keys);
  const daily: Record<string, number> = {};

  rows.forEach((row) => {
    if (!allowed.has(row.kpi_key)) return;
    daily[row.metric_date] = (daily[row.metric_date] ?? 0) + Number(row.kpi_value ?? 0);
  });

  return Object.keys(daily)
    .sort()
    .map((date) => daily[date] ?? 0);
}

function scaleBars(values: number[], minHeight = 6, maxHeight = 28, size = 7) {
  const trimmed = values.slice(-size);
  const padded = Array.from({ length: Math.max(size - trimmed.length, 0) }, () => 0).concat(trimmed);
  const max = Math.max(...padded, 0);

  if (max <= 0) {
    return padded.map(() => minHeight);
  }

  return padded.map((value) => minHeight + (Number(value || 0) / max) * (maxHeight - minHeight));
}

function routeForAction(action: string) {
  switch (action) {
    case 'upload':
    case 'release':
      return '/creator/upload';
    case 'live':
      return '/live/create';
    case 'events':
      return '/creator/events';
    case 'post':
      return '/social/hub';
    case 'wallet':
      return '/wallet';
    case 'analytics':
      return '/creator/analytics';
    case 'audience':
      return '/creator/audience';
    case 'payouts':
      return '/creator/payouts';
    case 'memberships':
      return '/creator/memberships';
    case 'licensing':
      return '/creator/licensing';
    case 'soundboards':
      return '/soundboards';
    case 'settings':
      return '/profile';
    case 'profile':
      return '/profile';
    default:
      return null;
  }
}

export default function CreatorDashboard() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const isDark = theme.scheme === 'dark';
  const { user, loading: authLoading } = useAuth();
  const { balance, refreshBalance, refreshLedger } = useWallet();
  const [data, setData] = useState<StudioData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleKey>('artist');

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setData(EMPTY_DATA);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      const startDate = start.toISOString().slice(0, 10);

      const nowIso = new Date().toISOString();

      const [
        profileRes,
        rolesRes,
        kpiRes,
        metricsRes,
        releasesRes,
        beatsRes,
        eventsRes,
        roomsRes,
        tiersRes,
        ledgerRes,
      ] = await Promise.all([
        (supabase as any)
          .from('profiles')
          .select('user_id, full_name, username, profile_type, user_type, is_creator')
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any)
          .from('profile_roles')
          .select('role, is_primary')
          .eq('user_id', user.id),
        (supabase as any)
          .from('creator_kpi_events')
          .select('metric_date, kpi_key, kpi_value, occurred_at')
          .eq('creator_id', user.id)
          .gte('metric_date', startDate)
          .order('metric_date', { ascending: true }),
        (supabase as any)
          .from('creator_metrics')
          .select('metric_date, revenue_cents, plays_count, likes_count, comments_count, sales_count, sales_revenue_cents, subs_active, subs_mrr_cents, new_fans_30d')
          .eq('creator_id', user.id)
          .gte('metric_date', startDate)
          .order('metric_date', { ascending: false })
          .limit(30),
        (supabase as any)
          .from('releases')
          .select('id, title, status, total_plays, total_revenue, release_date, scheduled_publish_date, created_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        (supabase as any)
          .from('beats')
          .select('id, title, is_published, price, created_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
        (supabase as any)
          .from('events')
          .select('id, title, starts_at, location, rsvp_count, created_at', { count: 'exact' })
          .eq('created_by', user.id)
          .gte('starts_at', nowIso)
          .order('starts_at', { ascending: true })
          .limit(8),
        (supabase as any)
          .from('session_rooms')
          .select('id, title, status, live_mode, scheduled_for, created_at, participant_count', { count: 'exact' })
          .eq('host_id', user.id)
          .in('status', ['idle', 'live'])
          .order('created_at', { ascending: false })
          .limit(8),
        (supabase as any)
          .from('membership_tiers')
          .select('id, name, status, current_members, price_monthly', { count: 'exact' })
          .eq('owner_type', 'profile')
          .eq('owner_id', user.id)
          .order('tier_order', { ascending: true })
          .limit(8),
        (supabase as any)
          .from('wallet_ledger')
          .select('id, kind, amount_credits, ref_type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      const profile = profileRes.error ? null : (profileRes.data as ProfileRow | null);
      const roleRows = rolesRes.error ? [] : ((rolesRes.data ?? []) as ProfileRoleRow[]);
      const fallbackRole = roleFromProfile(profile);
      const validRoles = roleRows.filter((row) => isRole(row.role));
      const primaryRole = validRoles.find((row) => row.is_primary)?.role ?? fallbackRole;
      let roomsData = roomsRes.error ? [] : ((roomsRes.data ?? []) as SessionRoomRow[]);
      let roomsCount = roomsRes.count ?? 0;

      if (roomsRes.error && /column|live_mode|scheduled_for|participant_count/i.test(roomsRes.error.message ?? '')) {
        const fallbackRoomsRes = await (supabase as any)
          .from('session_rooms')
          .select('id, title, status, created_at', { count: 'exact' })
          .eq('host_id', user.id)
          .in('status', ['idle', 'live'])
          .order('created_at', { ascending: false })
          .limit(8);

        if (!fallbackRoomsRes.error) {
          roomsData = ((fallbackRoomsRes.data ?? []) as Array<{
            id: string;
            title: string;
            status: string;
            created_at: string;
          }>).map((room) => ({
            ...room,
            live_mode: null,
            scheduled_for: null,
            participant_count: null,
          }));
          roomsCount = fallbackRoomsRes.count ?? roomsData.length;
        }
      }

      setData({
        profile,
        roles: validRoles.length > 0 ? validRoles : [{ role: fallbackRole, is_primary: true }],
        kpis: kpiRes.error ? [] : ((kpiRes.data ?? []) as KpiEventRow[]),
        metrics: metricsRes.error ? [] : ((metricsRes.data ?? []) as CreatorMetricRow[]),
        releases: releasesRes.error ? [] : ((releasesRes.data ?? []) as ReleaseRow[]),
        beats: beatsRes.error ? [] : ((beatsRes.data ?? []) as BeatRow[]),
        events: eventsRes.error ? [] : ((eventsRes.data ?? []) as EventRow[]),
        rooms: roomsData,
        tiers: tiersRes.error ? [] : ((tiersRes.data ?? []) as MembershipTierRow[]),
        ledger: ledgerRes.error ? [] : ((ledgerRes.data ?? []) as LedgerRow[]),
        counts: {
          releases: releasesRes.count ?? 0,
          beats: beatsRes.count ?? 0,
          events: eventsRes.count ?? 0,
          rooms: roomsCount,
          tiers: tiersRes.count ?? 0,
        },
      });
      setSelectedRole((current) =>
        validRoles.some((row) => row.role === current) ? current : primaryRole,
      );
      await refreshBalance();
      await refreshLedger();
    } catch (error: any) {
      console.error('[CreatorDashboard] load failed:', error);
      Alert.alert('Studio unavailable', error?.message ?? 'We could not load your Studio dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, refreshBalance, refreshLedger]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const roleTabs = useMemo(() => {
    const seen = new Set<RoleKey>();
    const roles = data.roles
      .map((row) => row.role)
      .filter((role) => {
        if (seen.has(role)) return false;
        seen.add(role);
        return true;
      });

    if (!roles.includes(selectedRole)) roles.unshift(selectedRole);
    return roles;
  }, [data.roles, selectedRole]);

  const latestMetric = data.metrics[0];
  const streams =
    sumKpi(data.kpis, ['total_streams']) ||
    data.metrics.reduce((sum, row) => sum + Number(row.plays_count ?? 0), 0) ||
    data.releases.reduce((sum, release) => sum + Number(release.total_plays ?? 0), 0);
  const views = sumKpi(data.kpis, ['total_views']);
  const likes =
    sumKpi(data.kpis, ['total_likes']) ||
    data.metrics.reduce((sum, row) => sum + Number(row.likes_count ?? 0), 0);
  const comments =
    sumKpi(data.kpis, ['total_comments']) ||
    data.metrics.reduce((sum, row) => sum + Number(row.comments_count ?? 0), 0);
  const fanRevenueCents =
    sumKpi(data.kpis, ['fan_revenue_cents', 'battle_revenue_cents', 'event_revenue_cents']) ||
    data.metrics.reduce((sum, row) => sum + Number(row.revenue_cents ?? 0), 0);
  const positiveLedgerCredits = data.ledger
    .filter((entry) => entry.amount_credits > 0)
    .reduce((sum, entry) => sum + entry.amount_credits, 0);
  const estimatedEarnings = fanRevenueCents > 0 ? fanRevenueCents / 100 : creditsToGBP(positiveLedgerCredits);
  const activeSupporters =
    Number(latestMetric?.subs_active ?? 0) ||
    data.tiers.reduce((sum, tier) => sum + Number(tier.current_members ?? 0), 0);
  const topTrend = trendForKpi(data.kpis, ['total_streams', 'fan_revenue_cents', 'total_views']);
  const engagement =
    streams > 0
      ? ((likes + comments) / streams) * 100
      : latestMetric?.likes_count || latestMetric?.comments_count
        ? 4.8
        : 0;
  const streamsSeries = kpiSeries(data.kpis, ['total_streams']);
  const viewsSeries = kpiSeries(data.kpis, ['total_views']);
  const revenueSeries = kpiSeries(data.kpis, [
    'fan_revenue_cents',
    'battle_revenue_cents',
    'event_revenue_cents',
  ]);
  const engagementSeries = kpiSeries(data.kpis, ['total_likes', 'total_comments']);
  const supporterSeries = kpiSeries(data.kpis, ['active_subscriptions', 'new_fans']);
  const streamBars = scaleBars(
    streamsSeries.length > 0
      ? streamsSeries
      : data.metrics.map((row) => Number(row.plays_count ?? 0)).reverse(),
    5,
    18,
  );
  const viewsBars = scaleBars(viewsSeries, 5, 18);
  const engagementBars = scaleBars(
    engagementSeries.length > 0
      ? engagementSeries
      : data.metrics
          .map((row) => Number(row.likes_count ?? 0) + Number(row.comments_count ?? 0))
          .reverse(),
    5,
    18,
  );
  const supporterBars = scaleBars(
    supporterSeries.length > 0
      ? supporterSeries
      : data.metrics.map((row) => Number(row.subs_active ?? 0) + Number(row.new_fans_30d ?? 0)).reverse(),
    5,
    18,
  );
  const revenueBars = scaleBars(
    revenueSeries.length > 0
      ? revenueSeries
      : data.metrics.map((row) => Number(row.revenue_cents ?? 0)).reverse(),
    8,
    30,
  );
  const revenueChartBars = scaleBars(
    revenueSeries.length > 0
      ? revenueSeries
      : data.metrics.map((row) => Number(row.revenue_cents ?? 0)).reverse(),
    16,
    52,
  );

  const nextAction = useMemo(() => {
    if (data.counts.releases === 0 && data.counts.beats === 0) {
      return {
        icon: 'file-upload' as const,
        eyebrow: 'Next best action',
        title: selectedRole === 'producer' ? 'Upload your first beat' : 'Create your first drop',
        subtitle: 'Add audio, artwork, credits, pricing, and release details.',
        label: 'Start upload',
        route: 'upload',
        progress: 1,
      };
    }
    if (data.rooms.length === 0) {
      return {
        icon: 'settings-input-antenna' as const,
        eyebrow: 'Next best action',
        title: 'Start or schedule a live room',
        subtitle: 'Bring fans into a live session, collab room, class, or audio room.',
        label: 'Open live',
        route: 'live',
        progress: 2,
      };
    }
    if (data.tiers.length === 0) {
      return {
        icon: 'workspace-premium' as const,
        eyebrow: 'Next best action',
        title: 'Create a membership offer',
        subtitle: 'Turn your most active supporters into recurring revenue.',
        label: 'Memberships',
        route: 'memberships',
        progress: 3,
      };
    }
    return {
      icon: 'timeline' as const,
      eyebrow: 'Next best action',
      title: 'Review your audience signals',
      subtitle: 'Check what is growing, where fans are coming from, and what to post next.',
      label: 'View analytics',
      route: 'analytics',
      progress: 4,
    };
  }, [data.counts.beats, data.counts.releases, data.rooms.length, data.tiers.length, selectedRole]);

  const recentActivity = useMemo(() => {
    const rows = [
      ...data.releases.slice(0, 3).map((release) => ({
        id: `release-${release.id}`,
        title: release.title,
        subtitle: `Release - ${release.status ?? 'draft'}`,
        value: release.total_plays ? formatNumber(release.total_plays) : '',
        valueLabel: release.total_plays ? 'plays' : '',
        icon: 'album' as keyof typeof MaterialIcons.glyphMap,
        accent: '#7C3AED',
        created_at: release.created_at,
      })),
      ...data.beats.slice(0, 2).map((beat) => ({
        id: `beat-${beat.id}`,
        title: beat.title,
        subtitle: beat.is_published ? 'Beat live in Market' : 'Beat draft',
        value: beat.price ? formatCurrency(Number(beat.price)) : '',
        valueLabel: beat.price ? 'price' : '',
        icon: 'headphones' as keyof typeof MaterialIcons.glyphMap,
        accent: PLUGGD_ORANGE,
        created_at: beat.created_at,
      })),
      ...data.ledger.slice(0, 3).map((entry) => ({
        id: `ledger-${entry.id}`,
        title: entry.amount_credits > 0 ? 'Credits received' : 'Credits spent',
        subtitle: entry.kind.replace(/_/g, ' '),
        value: `${entry.amount_credits > 0 ? '+' : ''}${formatNumber(entry.amount_credits)}`,
        valueLabel: 'credits',
        icon: (entry.amount_credits > 0
          ? 'card-giftcard'
          : 'account-balance-wallet') as keyof typeof MaterialIcons.glyphMap,
        accent: entry.amount_credits > 0 ? '#22C55E' : '#BDBDBD',
        created_at: entry.created_at,
      })),
    ];

    return rows
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [data.beats, data.ledger, data.releases]);

  const upcoming = useMemo(() => {
    const release = data.releases.find((item) => item.scheduled_publish_date || item.release_date);
    return [
      release
        ? {
            id: `release-${release.id}`,
            eyebrow: 'Next drop',
            title: release.title,
            date: dateLabel(release.scheduled_publish_date ?? release.release_date),
            icon: 'album' as keyof typeof MaterialIcons.glyphMap,
            accent: '#7C3AED',
          }
        : null,
      data.rooms[0]
        ? {
            id: `room-${data.rooms[0].id}`,
            eyebrow: data.rooms[0].status === 'live' ? 'Live now' : 'Live room',
            title: data.rooms[0].title,
            date: data.rooms[0].status === 'live' ? 'Live now' : timeLabel(data.rooms[0].scheduled_for ?? data.rooms[0].created_at),
            icon: 'settings-input-antenna' as keyof typeof MaterialIcons.glyphMap,
            accent: PLUGGD_ORANGE,
          }
        : null,
      data.events[0]
        ? {
            id: `event-${data.events[0].id}`,
            eyebrow: 'Event',
            title: data.events[0].title,
            date: dateLabel(data.events[0].starts_at),
            icon: 'event' as keyof typeof MaterialIcons.glyphMap,
            accent: '#22C55E',
          }
        : null,
    ].filter(Boolean) as Array<{
      id: string;
      eyebrow: string;
      title: string;
      date: string;
      icon: keyof typeof MaterialIcons.glyphMap;
      accent: string;
    }>;
  }, [data.events, data.releases, data.rooms]);

  const roleTools = getRoleTools(selectedRole, data.counts, activeSupporters);

  const navigateAction = (action: string) => {
    const route = routeForAction(action);
    if (!route) {
      Alert.alert('Coming soon', 'This Studio tool is available on the web dashboard for now.');
      return;
    }
    router.push(route as any);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Opening Studio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyState}>
          <MaterialIcons name="lock-outline" size={42} color={theme.colors.accent} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Sign in to open Studio</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
            <Text style={styles.primaryButtonText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cardChrome = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
  };
  const insetChrome = {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.border,
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#080808', '#0C0C0C', '#080808'] : ['#FAFAF8', '#FFFFFF', '#F4F2EE']}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PLUGGD_ORANGE} />
        }
      >
        <View style={styles.topBar}>
          <Pressable style={[styles.headerIconButton, insetChrome]} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={27} color={theme.colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.pageTitle, { color: theme.colors.text }]}>Studio</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={[styles.headerIconButton, insetChrome]} onPress={() => router.push('/social/notifications' as any)}>
              <MaterialIcons name="notifications-none" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable style={[styles.headerIconButton, insetChrome]} onPress={() => navigateAction('profile')}>
              <MaterialIcons name="settings" size={21} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.studioRail}
        >
          <StudioRailItem label="Dashboard" icon="space-dashboard" onPress={() => router.push('/creator/dashboard' as any)} />
          <StudioRailItem label="Releases" icon="album" onPress={() => navigateAction('release')} />
          <StudioRailItem label="Beats" icon="headphones" onPress={() => navigateAction('upload')} />
          <StudioRailItem label="Mixes" icon="graphic-eq" onPress={() => navigateAction('upload')} />
          <StudioRailItem label="Soundboards" icon="dashboard-customize" onPress={() => navigateAction('soundboards')} />
          <StudioRailItem label="Events" icon="event" onPress={() => navigateAction('events')} />
          <StudioRailItem label="Live" icon="settings-input-antenna" onPress={() => navigateAction('live')} />
          <StudioRailItem label="Memberships" icon="workspace-premium" onPress={() => navigateAction('memberships')} />
          <StudioRailItem label="Wallet" icon="account-balance-wallet" onPress={() => navigateAction('payouts')} />
          <StudioRailItem label="Analytics" icon="timeline" onPress={() => navigateAction('analytics')} />
          <StudioRailItem label="Contracts" icon="description" onPress={() => navigateAction('licensing')} />
          <StudioRailItem label="Settings" icon="settings" onPress={() => navigateAction('settings')} />
        </ScrollView>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading Studio...</Text>
          </View>
        ) : (
          <>
            <View style={styles.identityRow}>
              <View>
                <Text style={[styles.greeting, { color: theme.colors.text }]}>
                  Hi, {displayName(data.profile, user.email)}
                </Text>
                <Text style={[styles.subGreeting, { color: theme.colors.textMuted }]}>
                  {ROLE_LABELS[selectedRole]} workspace - {data.counts.releases + data.counts.beats} catalog items
                </Text>
              </View>
              <Pressable
                style={[
                  styles.compactButton,
                  { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
                ]}
                onPress={() => navigateAction('analytics')}
              >
                <MaterialIcons name="timeline" size={16} color={theme.colors.accent} />
                <Text style={[styles.compactButtonText, { color: theme.colors.accent }]}>Insights</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roleSwitcher}
            >
              {roleTabs.map((role) => {
                const selected = selectedRole === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => setSelectedRole(role)}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: selected ? theme.colors.surfaceStrong : theme.colors.surfaceAlt,
                        borderColor: selected ? theme.colors.accent : theme.colors.border,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={ROLE_ICONS[role]}
                      size={16}
                      color={selected ? theme.colors.accent : theme.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: selected ? theme.colors.accent : theme.colors.textMuted },
                      ]}
                    >
                      {ROLE_LABELS[role]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.summaryCard, cardChrome]}>
              <View style={styles.summaryColumn}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Estimated earnings</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                  {formatCurrency(estimatedEarnings)}
                </Text>
                <Text style={styles.positiveText}>
                  {topTrend >= 0 ? '+' : ''}
                  {topTrend.toFixed(0)}% vs prior period
                </Text>
                <SparkBars values={revenueBars} />
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />

              <View style={styles.summaryColumn}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Available credits</Text>
                <View style={styles.creditRow}>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {formatNumber(balance.available_credits)}
                  </Text>
                  <Text style={[styles.creditText, { color: theme.colors.textMuted }]}>credits</Text>
                </View>
                <Pressable style={styles.walletLink} onPress={() => navigateAction('wallet')}>
                  <Text style={styles.walletLinkText}>View wallet</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={theme.colors.accent} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.quickActionsCard, cardChrome]}>
              <QuickAction label="New Release" icon="music-note" onPress={() => navigateAction('release')} />
              <QuickAction label="Upload" icon="file-upload" onPress={() => navigateAction('upload')} />
              <QuickAction label="Start Live" icon="settings-input-antenna" onPress={() => navigateAction('live')} />
              <QuickAction label="Post" icon="edit" onPress={() => navigateAction('post')} />
            </View>

            <View style={[styles.nextActionCard, cardChrome]}>
              <View
                style={[
                  styles.nextActionIcon,
                  { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.borderAccent },
                ]}
              >
                <MaterialIcons name={nextAction.icon} size={27} color={theme.colors.accent} />
              </View>
              <View style={styles.nextActionContent}>
                <Text style={[styles.nextActionEyebrow, { color: theme.colors.textMuted }]}>{nextAction.eyebrow}</Text>
                <Text style={[styles.nextActionTitle, { color: theme.colors.text }]}>{nextAction.title}</Text>
                <Text style={[styles.nextActionSubtitle, { color: theme.colors.textMuted }]}>{nextAction.subtitle}</Text>
                <ProgressBlocks value={nextAction.progress} total={5} />
              </View>
              <Pressable style={styles.continueButton} onPress={() => navigateAction(nextAction.route)}>
                <Text style={styles.continueButtonText}>{nextAction.label}</Text>
              </Pressable>
            </View>

            <View style={[styles.performanceCard, cardChrome]}>
              <SectionHeader title="Performance snapshot" icon="timeline" action="View all" onPress={() => navigateAction('analytics')} />
              <View style={styles.performanceGrid}>
                <PerformanceTile icon="headset" label="Streams" value={formatNumber(streams)} bars={streamBars} />
                <PerformanceTile icon="visibility" label="Views" value={formatNumber(views)} bars={viewsBars} />
                <PerformanceTile icon="favorite-border" label="Engagement" value={`${engagement.toFixed(1)}%`} bars={engagementBars} />
                <PerformanceTile icon="groups" label="Supporters" value={formatNumber(activeSupporters)} bars={supporterBars} />
              </View>
            </View>

            <View style={[styles.roleToolsCard, cardChrome]}>
              <SectionHeader title={`${ROLE_LABELS[selectedRole]} tools`} icon={ROLE_ICONS[selectedRole]} />
              <View style={styles.toolGrid}>
                {roleTools.map((tool) => (
                  <Pressable
                    key={tool.label}
                    style={[styles.toolTile, insetChrome]}
                    onPress={() => navigateAction(tool.route)}
                  >
                    <MaterialIcons name={tool.icon} size={20} color={theme.colors.accent} />
                    <Text style={[styles.toolLabel, { color: theme.colors.text }]}>{tool.label}</Text>
                    <Text style={[styles.toolValue, { color: theme.colors.textMuted }]}>{tool.value}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.twoColumnGrid}>
              <MiniStatCard
                title="Content"
                icon="library-music"
                rows={[
                  ['Releases', formatNumber(data.counts.releases)],
                  ['Beats', formatNumber(data.counts.beats)],
                  ['Live rooms', formatNumber(data.counts.rooms)],
                  ['Memberships', formatNumber(data.counts.tiers)],
                ]}
              />
              <MiniStatCard
                title="Audience"
                icon="groups"
                rows={[
                  ['New fans', formatNumber(Number(latestMetric?.new_fans_30d ?? 0))],
                  ['Supporters', formatNumber(activeSupporters)],
                  ['Comments', formatNumber(comments)],
                  ['Likes', formatNumber(likes)],
                ]}
              />
            </View>

            <View style={[styles.card, cardChrome]}>
              <SectionHeader title="Recent activity" icon="history" action="View all" onPress={() => navigateAction('analytics')} />
              {recentActivity.length === 0 ? (
                <EmptyCardText text="Activity will appear after uploads, sales, gifts, or live rooms." />
              ) : (
                recentActivity.map((item, index) => (
                  <ActivityRow key={item.id} item={item} isLast={index === recentActivity.length - 1} />
                ))
              )}
            </View>

            <View style={[styles.revenueCard, cardChrome]}>
              <SectionHeader title="Revenue" icon="monetization-on" action="Payouts" onPress={() => navigateAction('payouts')} />
              <View style={styles.revenueBody}>
                <View style={styles.revenueLeft}>
                  <Text style={[styles.revenueValue, { color: theme.colors.text }]}>
                    {formatCurrency(estimatedEarnings)}
                  </Text>
                  <Text style={styles.positiveText}>
                    {formatNumber(positiveLedgerCredits)} positive credits logged
                  </Text>
                  <View style={styles.revenueChart}>
                    {revenueChartBars.map((height, index) => (
                      <View key={index} style={[styles.revenueBar, { height }]} />
                    ))}
                  </View>
                </View>
                <View style={[styles.revenueBreakdown, { borderLeftColor: theme.colors.border }]}>
                  <RevenueRow label="Fan revenue" value={formatCurrency(fanRevenueCents / 100)} active />
                  <RevenueRow label="Sales" value={formatNumber(Number(latestMetric?.sales_count ?? 0))} />
                  <RevenueRow label="Subs MRR" value={formatCurrency(Number(latestMetric?.subs_mrr_cents ?? 0) / 100)} />
                  <RevenueRow label="Credits" value={formatNumber(positiveLedgerCredits)} />
                </View>
              </View>
            </View>

            <View style={[styles.card, cardChrome]}>
              <SectionHeader title="Upcoming" icon="event" action="Live" onPress={() => navigateAction('live')} />
              {upcoming.length === 0 ? (
                <EmptyCardText text="No upcoming releases, rooms, or events yet." />
              ) : (
                <View style={styles.upcomingList}>
                  {upcoming.map((item, index) => (
                    <View key={item.id} style={[styles.upcomingItem, index !== upcoming.length - 1 && styles.upcomingDivider]}>
                      <View style={[styles.upcomingIcon, { borderColor: item.accent }]}>
                        <MaterialIcons name={item.icon} size={19} color={item.accent} />
                      </View>
                      <Text style={[styles.upcomingEyebrow, { color: theme.colors.textMuted }]}>{item.eyebrow}</Text>
                      <Text style={[styles.upcomingTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                      <Text style={[styles.upcomingDate, { color: theme.colors.textMuted }]}>{item.date}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getRoleTools(
  role: RoleKey,
  counts: StudioData['counts'],
  activeSupporters: number,
) {
  if (role === 'promoter' || role === 'venue') {
    return [
      { label: 'Events', value: formatNumber(counts.events), icon: 'event' as const, route: 'events' },
      { label: 'Live rooms', value: formatNumber(counts.rooms), icon: 'settings-input-antenna' as const, route: 'live' },
      { label: 'Audience', value: formatNumber(activeSupporters), icon: 'groups' as const, route: 'audience' },
      { label: 'Payouts', value: 'Open', icon: 'account-balance-wallet' as const, route: 'payouts' },
    ];
  }

  if (role === 'producer') {
    return [
      { label: 'Beats', value: formatNumber(counts.beats), icon: 'headphones' as const, route: 'upload' },
      { label: 'Licenses', value: 'Edit', icon: 'verified' as const, route: 'licensing' },
      { label: 'Live rooms', value: formatNumber(counts.rooms), icon: 'settings-input-antenna' as const, route: 'live' },
      { label: 'Revenue', value: 'Track', icon: 'monetization-on' as const, route: 'payouts' },
    ];
  }

  if (role === 'dj') {
    return [
      { label: 'Mixes', value: formatNumber(counts.releases), icon: 'album' as const, route: 'upload' },
      { label: 'Live sets', value: formatNumber(counts.rooms), icon: 'settings-input-antenna' as const, route: 'live' },
      { label: 'Audience', value: formatNumber(activeSupporters), icon: 'groups' as const, route: 'audience' },
      { label: 'Posts', value: 'Create', icon: 'edit' as const, route: 'post' },
    ];
  }

  if (role === 'curator') {
    return [
      { label: 'Releases', value: formatNumber(counts.releases), icon: 'library-music' as const, route: 'upload' },
      { label: 'Audience', value: formatNumber(activeSupporters), icon: 'groups' as const, route: 'audience' },
      { label: 'Live rooms', value: formatNumber(counts.rooms), icon: 'settings-input-antenna' as const, route: 'live' },
      { label: 'Insights', value: 'Open', icon: 'timeline' as const, route: 'analytics' },
    ];
  }

  return [
    { label: 'Releases', value: formatNumber(counts.releases), icon: 'album' as const, route: 'upload' },
    { label: 'Memberships', value: formatNumber(counts.tiers), icon: 'workspace-premium' as const, route: 'memberships' },
    { label: 'Live rooms', value: formatNumber(counts.rooms), icon: 'settings-input-antenna' as const, route: 'live' },
    { label: 'Audience', value: formatNumber(activeSupporters), icon: 'groups' as const, route: 'audience' },
  ];
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  const theme = usePluggdTheme();

  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={theme.colors.accent} />
      <Text style={[styles.quickActionText, { color: theme.colors.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function StudioRailItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  const theme = usePluggdTheme();

  return (
    <Pressable
      style={[
        styles.studioRailItem,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
      ]}
      onPress={onPress}
    >
      <MaterialIcons name={icon} size={18} color={theme.colors.accent} />
      <Text style={[styles.studioRailLabel, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  icon,
  action,
  onPress,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  action?: string;
  onPress?: () => void;
}) {
  const theme = usePluggdTheme();

  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <MaterialIcons name={icon} size={20} color={theme.colors.accent} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={onPress}>
          <Text style={styles.cardLink}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PerformanceTile({
  icon,
  label,
  value,
  bars,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  bars: number[];
}) {
  const theme = usePluggdTheme();

  return (
    <View
      style={[
        styles.performanceTile,
        { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.performanceLabelRow}>
        <MaterialIcons name={icon} size={16} color={theme.colors.textMuted} />
        <Text style={[styles.performanceLabel, { color: theme.colors.textMuted }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.performanceValue, { color: theme.colors.text }]}>{value}</Text>
      <SparkBars values={bars} small />
    </View>
  );
}

function MiniStatCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  rows: string[][];
}) {
  const theme = usePluggdTheme();

  return (
    <View
      style={[
        styles.miniCard,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.miniHeader}>
        <View style={styles.cardHeaderLeft}>
          <MaterialIcons name={icon} size={19} color={theme.colors.accent} />
          <Text style={[styles.miniTitle, { color: theme.colors.text }]}>{title}</Text>
        </View>
      </View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.miniRow}>
          <Text style={[styles.miniRowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
          <Text style={[styles.miniRowValue, { color: theme.colors.text }]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ActivityRow({
  item,
  isLast,
}: {
  item: {
    title: string;
    subtitle: string;
    value: string;
    valueLabel: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    accent: string;
  };
  isLast: boolean;
}) {
  const theme = usePluggdTheme();

  return (
    <View
      style={[
        styles.activityRow,
        !isLast && styles.activityBorder,
        !isLast && { borderBottomColor: theme.colors.borderSubtle },
      ]}
    >
      <View style={[styles.activityIconBox, { borderColor: item.accent, backgroundColor: theme.colors.surfaceAlt }]}>
        <MaterialIcons name={item.icon} size={20} color={item.accent} />
      </View>
      <View style={styles.activityText}>
        <Text style={[styles.activityTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.activitySubtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      {item.value ? (
        <View style={styles.activityValueWrap}>
          <Text style={[styles.activityValue, { color: theme.colors.text }]}>{item.value}</Text>
          {item.valueLabel ? <Text style={[styles.activityValueLabel, { color: theme.colors.textMuted }]}>{item.valueLabel}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function RevenueRow({ label, value, active }: { label: string; value: string; active?: boolean }) {
  const theme = usePluggdTheme();

  return (
    <View style={styles.revenueRow}>
      <View style={styles.revenueRowLeft}>
        <View style={[styles.revenueDot, active ? styles.revenueDotActive : styles.revenueDotMuted]} />
        <Text style={[styles.revenueRowLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.revenueRowValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
  );
}

function ProgressBlocks({ value, total }: { value: number; total: number }) {
  return (
    <View style={styles.releaseProgressTrack}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={index < value ? styles.releaseProgressActive : styles.releaseProgressInactive}
        />
      ))}
    </View>
  );
}

function SparkBars({ values, small }: { values: number[]; small?: boolean }) {
  return (
    <View style={small ? styles.tinySparkline : styles.miniSparkline}>
      {values.map((height, index) => (
        <View
          key={index}
          style={[
            small ? styles.tinySparkBar : styles.sparkBar,
            { height },
          ]}
        />
      ))}
    </View>
  );
}

function EmptyCardText({ text }: { text: string }) {
  const theme = usePluggdTheme();
  return <Text style={[styles.emptyCardText, { color: theme.colors.textMuted }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 82,
    paddingBottom: 180,
  },
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studioRail: {
    gap: 8,
    paddingBottom: 13,
  },
  studioRailItem: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  studioRailLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  identityRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subGreeting: {
    color: '#AFAFAF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  compactButton: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#343434',
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 5,
  },
  compactButtonText: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '700',
  },
  roleSwitcher: {
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 12,
  },
  roleChip: {
    height: 38,
    minWidth: 86,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  roleChipSelected: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1D120C',
  },
  roleChipText: {
    color: '#AFAFAF',
    fontSize: 14,
    fontWeight: '700',
  },
  roleChipTextSelected: {
    color: PLUGGD_ORANGE,
  },
  summaryCard: {
    minHeight: 122,
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 8,
  },
  summaryColumn: {
    flex: 1,
    minWidth: 0,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#313131',
    marginHorizontal: 12,
  },
  summaryLabel: {
    color: '#A6A6A6',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 10,
  },
  positiveText: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  creditText: {
    color: '#C7C7C7',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  walletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  walletLinkText: {
    color: PLUGGD_ORANGE,
    fontSize: 14,
    fontWeight: '700',
  },
  miniSparkline: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    opacity: 0.65,
  },
  sparkBar: {
    width: 4,
    borderRadius: 4,
    backgroundColor: PLUGGD_ORANGE,
  },
  quickActionsCard: {
    height: 58,
    borderRadius: 8,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAction: {
    flex: 1,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: '#262626',
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  nextActionCard: {
    minHeight: 132,
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextActionIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#21130E',
    borderWidth: 1,
    borderColor: '#3A261A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextActionContent: {
    flex: 1,
    minWidth: 0,
  },
  nextActionEyebrow: {
    color: '#DADADA',
    fontSize: 13,
    fontWeight: '700',
  },
  nextActionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  nextActionSubtitle: {
    color: '#A8A8A8',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  releaseProgressTrack: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 9,
  },
  releaseProgressActive: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: PLUGGD_ORANGE,
  },
  releaseProgressInactive: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#2E2E2E',
  },
  continueButton: {
    minWidth: 96,
    height: 48,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginLeft: 12,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  performanceCard: {
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  cardLink: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '700',
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  performanceTile: {
    flex: 1,
    minHeight: 76,
    borderRadius: 8,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#262626',
    padding: 8,
  },
  performanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  performanceLabel: {
    color: '#BDBDBD',
    fontSize: 10,
    fontWeight: '700',
  },
  performanceValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 7,
  },
  tinySparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: 7,
  },
  tinySparkBar: {
    width: 6,
    borderRadius: 5,
    backgroundColor: PLUGGD_ORANGE,
  },
  roleToolsCard: {
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
    marginBottom: 8,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolTile: {
    width: '48.6%',
    minHeight: 78,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#101010',
    padding: 10,
    justifyContent: 'space-between',
  },
  toolLabel: {
    color: '#D8D8D8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  toolValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 3,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 12,
  },
  miniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  miniTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  miniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  miniRowLabel: {
    color: '#A8A8A8',
    fontSize: 12,
    fontWeight: '700',
  },
  miniRowValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
    marginBottom: 8,
  },
  emptyCardText: {
    color: '#9D9D9D',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    paddingVertical: 8,
  },
  activityRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  activityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#101010',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityText: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  activitySubtitle: {
    color: '#9D9D9D',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  activityValueWrap: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  activityValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activityValueLabel: {
    color: '#A0A0A0',
    fontSize: 10,
    fontWeight: '700',
  },
  revenueCard: {
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
    marginBottom: 8,
  },
  revenueBody: {
    flexDirection: 'row',
    gap: 12,
  },
  revenueLeft: {
    flex: 1,
  },
  revenueValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  revenueChart: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 8,
  },
  revenueBar: {
    width: 10,
    borderRadius: 7,
    backgroundColor: PLUGGD_ORANGE,
  },
  revenueBreakdown: {
    width: 124,
    borderLeftWidth: 1,
    borderLeftColor: '#303030',
    paddingLeft: 11,
    gap: 7,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  revenueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  revenueDotActive: {
    backgroundColor: PLUGGD_ORANGE,
  },
  revenueDotMuted: {
    backgroundColor: '#8F8F8F',
  },
  revenueRowLabel: {
    color: '#A8A8A8',
    fontSize: 11,
    fontWeight: '700',
  },
  revenueRowValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  upcomingList: {
    flexDirection: 'row',
  },
  upcomingItem: {
    flex: 1,
    paddingHorizontal: 7,
  },
  upcomingDivider: {
    borderRightWidth: 1,
    borderRightColor: '#303030',
  },
  upcomingIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  upcomingEyebrow: {
    color: '#A0A0A0',
    fontSize: 10,
    fontWeight: '700',
  },
  upcomingTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    minHeight: 29,
  },
  upcomingDate: {
    color: '#AFAFAF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  loadingWrap: {
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#AFAFAF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
