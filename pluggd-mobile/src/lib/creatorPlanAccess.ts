import { supabase } from './supabase';
import { PLAN_FEATURE_MINIMUM_TIER, type PlanFeature } from './planFeatures';

/** Uses the same server rule as saves, including promotional and admin access. */
export async function creatorPlanAllows(userId: string, feature: PlanFeature): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc('plan_allows', { p_user_id: userId, p_feature: feature });
  if (error || typeof data !== 'boolean') throw new Error('Your plan could not be checked. Please try again.');
  return data;
}

export async function requireCreatorPlanFeature(userId: string, feature: PlanFeature) {
  if (await creatorPlanAllows(userId, feature)) return;
  const tier = PLAN_FEATURE_MINIMUM_TIER[feature];
  throw new Error(`Available on the ${tier.charAt(0).toUpperCase()}${tier.slice(1)} plan or above.`);
}

/** Check before uploading files; the database remains the final authority on races. */
export async function requireCreatorMonthlyAllowance(userId: string, kind: 'release' | 'collaboration') {
  const key = kind === 'release' ? 'max_releases_per_month' : 'max_collab_posts_per_month';
  const { data: limit, error } = await (supabase as any).rpc('plan_monthly_limit', { p_user_id: userId, p_key: key });
  if (error || typeof limit !== 'number' || !Number.isInteger(limit) || limit < -1) {
    throw new Error('Your monthly allowance could not be checked. Please try again.');
  }
  if (limit === -1) return;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const table = kind === 'release' ? 'releases' : 'collaboration_projects';
  const { count, error: countError } = await (supabase as any).from(table)
    .select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', monthStart);
  if (countError || typeof count !== 'number') throw new Error('Your monthly allowance could not be checked. Please try again.');
  if (count >= limit) {
    const label = kind === 'release' ? 'release' : 'collaboration post';
    throw new Error(`Your plan includes ${limit} ${label}${limit === 1 ? '' : 's'} a month. Unlimited ${label}s are available on Starter or above.`);
  }
}
