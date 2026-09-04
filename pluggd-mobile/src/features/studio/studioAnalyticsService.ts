import { supabase } from '../../lib/supabase';

export type StudioAnalyticsRange = 7 | 30 | 90;

export type StudioAnalyticsPoint = {
  date: string;
  plays: number;
  revenueCents: number;
  engagement: number;
  newFollowers: number;
};

export type StudioAnalyticsOverview = {
  range: StudioAnalyticsRange;
  points: StudioAnalyticsPoint[];
  summary: {
    plays: number;
    revenueCents: number;
    engagement: number;
    activeMembers: number;
    totalFollowers: number;
    newFollowers: number;
    trackedSaves: number;
    cardViews: number;
  };
  audience: {
    retention30d: number | null;
    newFans30d: number | null;
    churn30d: number | null;
    topRegions: Array<{ label: string; value: number }>;
  };
  coverageNotes: string[];
  hasMetrics: boolean;
};

type MetricRow = {
  metric_date: string;
  sales_revenue_cents?: number | null;
  battle_revenue_cents?: number | null;
  event_revenue_cents?: number | null;
  revenue_cents?: number | null;
  subs_active?: number | null;
  post_likes?: number | null;
  post_comments?: number | null;
  plays_count?: number | null;
  audience_geo?: unknown;
  retention_30d?: number | null;
  new_fans_30d?: number | null;
  churn_30d?: number | null;
};

type OptionalRows<T> = { rows: T[]; error: string | null };

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dateSequence(range: StudioAnalyticsRange) {
  const result: string[] = [];
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  for (let offset = range - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    result.push(dateKey(date));
  }
  return result;
}

function count(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function revenueFor(row: MetricRow) {
  return count(row.sales_revenue_cents) + count(row.battle_revenue_cents) + count(row.event_revenue_cents) + count(row.revenue_cents);
}

async function optionalRows<T>(label: string, promise: PromiseLike<any>): Promise<OptionalRows<T>> {
  try {
    const response = await promise;
    return response.error
      ? { rows: [], error: `${label} is temporarily unavailable.` }
      : { rows: (response.data || []) as T[], error: null };
  } catch {
    return { rows: [], error: `${label} is temporarily unavailable.` };
  }
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in again to view Creator Studio insights.');
  return data.user;
}

function topRegions(value: unknown) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return [];
  return Object.entries(value as Record<string, unknown>)
    .map(([label, rawValue]) => ({ label: label.trim(), value: count(rawValue) }))
    .filter((item) => item.label && item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export async function loadStudioAnalytics(range: StudioAnalyticsRange): Promise<StudioAnalyticsOverview> {
  const user = await currentUser();
  const db = supabase as any;
  const dates = dateSequence(range);
  const startDate = dates[0];
  const startTimestamp = `${startDate}T00:00:00.000Z`;

  const metricsResult = await db
    .from('creator_metrics')
    .select('metric_date,sales_revenue_cents,battle_revenue_cents,event_revenue_cents,revenue_cents,subs_active,post_likes,post_comments,plays_count,audience_geo,retention_30d,new_fans_30d,churn_30d')
    .eq('creator_id', user.id)
    .gte('metric_date', startDate)
    .order('metric_date', { ascending: true });
  if (metricsResult.error) throw metricsResult.error;
  const metrics = (metricsResult.data || []) as MetricRow[];

  const [newFollowers, followerCountResult, cardViews, releases, beats, mixes, soundboards, videos] = await Promise.all([
    optionalRows<{ created_at: string }>('New follower history', db.from('user_follows').select('created_at').eq('following_id', user.id).gte('created_at', startTimestamp).order('created_at', { ascending: true }).limit(5000)),
    db.from('user_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', user.id),
    optionalRows<{ created_at: string }>('Connect Card views', db.from('connect_card_events').select('created_at').eq('connect_user_id', user.id).eq('event_type', 'view_card').gte('created_at', startTimestamp).limit(5000)),
    optionalRows<{ id: string }>('Release save coverage', db.from('releases').select('id').eq('user_id', user.id).limit(250)),
    optionalRows<{ id: string }>('Beat save coverage', db.from('beats').select('id').eq('user_id', user.id).limit(250)),
    optionalRows<{ id: string }>('Mix save coverage', db.from('mixes').select('id').eq('owner_user_id', user.id).limit(250)),
    optionalRows<{ id: string }>('Soundboard save coverage', db.from('soundboards').select('id').eq('creator_id', user.id).limit(250)),
    optionalRows<{ id: string }>('Video save coverage', db.from('creator_videos').select('id').eq('user_id', user.id).limit(250)),
  ]);

  const ownerEntityIds = [...releases.rows, ...beats.rows, ...soundboards.rows, ...videos.rows].map((row) => row.id);
  const [entitySaves, mixSaves] = await Promise.all([
    ownerEntityIds.length
      ? optionalRows<{ created_at: string }>('Tracked catalogue saves', db.from('entity_saves').select('created_at').in('entity_id', ownerEntityIds).gte('created_at', startTimestamp).limit(5000))
      : Promise.resolve<OptionalRows<{ created_at: string }>>({ rows: [], error: null }),
    mixes.rows.length
      ? optionalRows<{ created_at: string }>('Tracked mix saves', db.from('mix_saves').select('created_at').in('mix_id', mixes.rows.map((row) => row.id)).gte('created_at', startTimestamp).limit(5000))
      : Promise.resolve<OptionalRows<{ created_at: string }>>({ rows: [], error: null }),
  ]);

  const metricsByDate = new Map<string, StudioAnalyticsPoint>();
  for (const row of metrics) {
    const existing = metricsByDate.get(row.metric_date) || { date: row.metric_date, plays: 0, revenueCents: 0, engagement: 0, newFollowers: 0 };
    existing.plays += count(row.plays_count);
    existing.revenueCents += revenueFor(row);
    existing.engagement += count(row.post_likes) + count(row.post_comments);
    metricsByDate.set(row.metric_date, existing);
  }
  for (const row of newFollowers.rows) {
    const key = String(row.created_at || '').slice(0, 10);
    if (!metricsByDate.has(key)) metricsByDate.set(key, { date: key, plays: 0, revenueCents: 0, engagement: 0, newFollowers: 0 });
    metricsByDate.get(key)!.newFollowers += 1;
  }
  const points = dates.map((date) => metricsByDate.get(date) || { date, plays: 0, revenueCents: 0, engagement: 0, newFollowers: 0 });
  const latest = metrics[metrics.length - 1];
  const coverageNotes = [newFollowers.error, cardViews.error, releases.error, beats.error, mixes.error, soundboards.error, videos.error, entitySaves.error, mixSaves.error].filter((value): value is string => Boolean(value));
  if (followerCountResult.error) coverageNotes.push('Total follower count is temporarily unavailable.');

  return {
    range,
    points,
    summary: {
      plays: points.reduce((total, point) => total + point.plays, 0),
      revenueCents: points.reduce((total, point) => total + point.revenueCents, 0),
      engagement: points.reduce((total, point) => total + point.engagement, 0),
      activeMembers: count(latest?.subs_active),
      totalFollowers: followerCountResult.error ? 0 : count(followerCountResult.count),
      newFollowers: newFollowers.rows.length,
      trackedSaves: entitySaves.rows.length + mixSaves.rows.length,
      cardViews: cardViews.rows.length,
    },
    audience: {
      retention30d: latest ? count(latest.retention_30d) : null,
      newFans30d: latest ? count(latest.new_fans_30d) : null,
      churn30d: latest ? count(latest.churn_30d) : null,
      topRegions: topRegions(latest?.audience_geo),
    },
    coverageNotes,
    hasMetrics: metrics.length > 0 || newFollowers.rows.length > 0 || cardViews.rows.length > 0 || entitySaves.rows.length > 0 || mixSaves.rows.length > 0,
  };
}
