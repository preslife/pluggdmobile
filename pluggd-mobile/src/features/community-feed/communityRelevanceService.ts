import * as Crypto from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import { hydrateRankedMobileSocialPosts, loadMobileSocialFeed } from '../culture/mobileSocial';
import { isUuid, newestCommunityPosts, parseRelevanceContext, parseRecommendationCursor, recommendationMode, recommendationEventPayload, RECOMMENDATION_REASONS, type NativeFeedMode, type RelevanceContext, type RecommendationCursor, type RecommendationPage, type RecommendationEvent } from './communityRelevanceModel';

export type RelevanceActor = Readonly<{ id: string; token: string }>;
export const relevanceUuid = () => Crypto.randomUUID();
export const STALE_RELEVANCE = 'This feed session changed.';
export async function assertRelevanceActor(actor: RelevanceActor, signal?: AbortSignal) {
  if (signal?.aborted) throw new Error(STALE_RELEVANCE);
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== actor.id || data.session?.access_token !== actor.token || signal?.aborted) throw new Error(STALE_RELEVANCE);
}
type RelevanceRpc = 'get_community_relevance_context' | 'fn_for_you_feed_v2' | 'fn_community_feed_v3' | 'set_community_personalization' | 'reset_community_recommendation_history' | 'suppress_community_recommendation' | 'undo_community_recommendation_suppression' | 'record_community_relevance_events';
async function rpc(actor: RelevanceActor, name: RelevanceRpc, args?: Record<string, unknown>, signal?: AbortSignal) {
  await assertRelevanceActor(actor, signal);
  const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!configuredUrl || !anonKey || new URL(configuredUrl).protocol !== 'https:') throw new Error('Recommendation settings are unavailable. Please try again.');
  // The shared SDK can change auth while preparing a request. This dispatch keeps
  // the initiating actor's credential, never whichever account signs in next.
  const response = await fetch(`${configuredUrl.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${actor.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args ?? {}), signal,
  });
  await assertRelevanceActor(actor, signal);
  const body = await response.json();
  await assertRelevanceActor(actor, signal);
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Please try again.');
  return body;
}
export const nativeRelevanceApi = (input: RelevanceActor | null) => {
  const actor: RelevanceActor | null = input ? Object.freeze({ id: input.id, token: input.token }) : null;
  return {
  async context(signal?: AbortSignal): Promise<RelevanceContext | null> {
    if (!actor) return null;
    try { return parseRelevanceContext(await rpc(actor, 'get_community_relevance_context', undefined, signal)); }
    catch (error) { if (signal?.aborted || error instanceof Error && error.message === STALE_RELEVANCE) throw error; return null; }
  },
  async baseline(mode: Exclude<NativeFeedMode, 'for-you'> | 'v2', signal?: AbortSignal) {
    if (actor) await assertRelevanceActor(actor, signal);
    else { const auth = await supabase.auth.getSession(); if (auth.error || auth.data.session || signal?.aborted) throw new Error(STALE_RELEVANCE); }
    let posts;
    if (mode === 'v2' && actor) {
      const rows = await rpc(actor, 'fn_for_you_feed_v2', { p_limit: 36, p_before: null, p_ranked_at: new Date().toISOString(), p_cursor_score: null, p_cursor_created_at: null, p_cursor_id: null }, signal);
      if (!Array.isArray(rows)) throw new Error('Recommendations could not load. Please try again.');
      posts = await hydrateRankedMobileSocialPosts(rows, actor.id);
    } else posts = await loadMobileSocialFeed({ mode: mode === 'following' ? 'following' : 'latest', limit: 36 });
    if (actor) await assertRelevanceActor(actor, signal);
    else { const auth = await supabase.auth.getSession(); if (auth.error || auth.data.session || signal?.aborted) throw new Error(STALE_RELEVANCE); }
    if (signal?.aborted) throw new Error(STALE_RELEVANCE);
    return mode === 'latest' ? newestCommunityPosts(posts) : posts;
  },
  async page(context: RelevanceContext, requestId: string | null = null, cursor: RecommendationCursor | null = null, signal?: AbortSignal): Promise<RecommendationPage> {
    if (!actor) throw new Error(STALE_RELEVANCE);
    const data = await rpc(actor, 'fn_community_feed_v3', { p_mode: recommendationMode(context), p_limit: 20, p_request_id: requestId, p_cursor: cursor }, signal);
    if (!data || !isUuid(data.request_id) || requestId && data.request_id !== requestId || data.mode !== recommendationMode(context) || data.algorithm_version !== context.algorithm_version || data.shadow !== context.shadow || !Array.isArray(data.items) || data.items.length > 20 || typeof data.has_more !== 'boolean') throw new Error('This feed has expired. Refresh to continue.');
    const nextCursor = parseRecommendationCursor(data.cursor, data.request_id);
    if (data.has_more && (!nextCursor || nextCursor.position % 20 !== 0) || cursor && nextCursor && nextCursor.position <= cursor.position) throw new Error('This feed has expired. Refresh to continue.');
    const rows = data.items;
    if (rows.some((row: any) => !isUuid(row.id) || !isUuid(row.user_id) || row.recommendation_request_id !== data.request_id || !Object.hasOwn(RECOMMENDATION_REASONS, row.recommendation_reason) || row.algorithm_version !== context.algorithm_version)) throw new Error('Recommendations could not load. Please refresh.');
    const posts = await hydrateRankedMobileSocialPosts(rows, actor.id);
    await assertRelevanceActor(actor, signal);
    const metadata = Object.fromEntries(rows.map((row: any) => [row.id, { requestId: data.request_id, reason: row.recommendation_reason, authorId: row.user_id }]));
    return { posts, metadata, requestId: data.request_id, cursor: nextCursor, hasMore: data.has_more };
  },
  async preference(enabled: boolean, signal?: AbortSignal) {
    if (!actor) throw new Error('Sign in to manage recommendations.');
    const result = parseRelevanceContext(await rpc(actor, 'set_community_personalization', { p_enabled: enabled }, signal));
    if (!result || result.personalization_enabled !== enabled) throw new Error('Your preference was not confirmed. Please try again.');
    return result;
  },
  async reset(signal?: AbortSignal) {
    if (!actor) throw new Error('Sign in to reset recommendations.');
    const result = parseRelevanceContext(await rpc(actor, 'reset_community_recommendation_history', undefined, signal));
    if (!result) throw new Error('Your reset was not confirmed. Please try again.');
    return result;
  },
  async suppress(requestId: string, postId: string, scope: 'post' | 'author', signal?: AbortSignal) {
    if (!actor || !isUuid(requestId) || !isUuid(postId)) throw new Error(STALE_RELEVANCE);
    const token = await rpc(actor, 'suppress_community_recommendation', { p_request_id: requestId, p_post_id: postId, p_scope: scope }, signal);
    if (!isUuid(token)) throw new Error('Your choice was not confirmed. Please try again.');
    return token;
  },
  async undo(token: string, signal?: AbortSignal) {
    if (!actor || !isUuid(token)) throw new Error(STALE_RELEVANCE);
    return await rpc(actor, 'undo_community_recommendation_suppression', { p_token: token }, signal) === true;
  },
  async events(events: RecommendationEvent[], signal?: AbortSignal) {
    const payload = recommendationEventPayload(events);
    if (!actor || !payload.length) return;
    await rpc(actor, 'record_community_relevance_events', { p_events: payload }, signal);
  },
  };
};
export type NativeRelevanceApi = ReturnType<typeof nativeRelevanceApi>;
