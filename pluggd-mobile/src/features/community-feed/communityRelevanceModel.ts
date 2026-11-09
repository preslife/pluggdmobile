import type { MobileSocialPost } from '../culture/mobileTypes';

export type NativeFeedMode = 'latest' | 'for-you' | 'following';
export type RecommendationMode = 'personalized' | 'popular';
export type RecommendationReason = 'following' | 'mutual' | 'music' | 'interests' | 'popular' | 'recent' | 'discover';
export type RecommendationKind = 'served' | 'meaningful_view' | 'open' | 'audio_play' | 'share';
export type RelevanceContext = { state: 'off' | 'shadow' | 'internal' | 'live'; use_v3: boolean; shadow: boolean; personalization_enabled: boolean; legacy_affinity_allowed: boolean; epoch: string; algorithm_version: 'community-v3.1' };
export type RecommendationCursor = { request_id: string; position: number; score: string; created_at: string; post_id: string };
export type RecommendationMetadata = { requestId: string; reason: RecommendationReason; authorId: string };
export type RecommendationPage = { posts: MobileSocialPost[]; metadata: Record<string, RecommendationMetadata>; requestId: string; cursor: RecommendationCursor | null; hasMore: boolean };
export type RecommendationEvent = { event_id: string; request_id: string; post_id: string; kind: RecommendationKind; elapsed_ms: number };
export const RECOMMENDATION_REASONS: Record<RecommendationReason, string> = {
  following: 'From a creator you follow', mutual: 'From a mutual connection', music: 'More music you enjoy',
  interests: 'Related to your interests', popular: 'Popular in Community', recent: 'Fresh from Community', discover: 'Discover a creator',
};
/** Android sharedAction acknowledges opening its chooser, so it cannot confirm a share. */
export const confirmedRecommendationShare = (platform: string, result: { action?: string } | undefined, webShareAvailable = false) => platform === 'ios' && result?.action === 'sharedAction' || platform === 'web' && webShareAvailable && result === undefined;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function recommendationEventPayload(events: RecommendationEvent[]): RecommendationEvent[] {
  return events.filter(event => isUuid(event.event_id) && isUuid(event.request_id) && isUuid(event.post_id) && ['served', 'meaningful_view', 'open', 'audio_play', 'share'].includes(event.kind) && Number.isInteger(event.elapsed_ms) && event.elapsed_ms >= 0 && event.elapsed_ms <= 3_600_000 && (event.kind !== 'meaningful_view' || event.elapsed_ms >= 2_000) && (event.kind !== 'audio_play' || event.elapsed_ms >= 10_000)).slice(0, 25).map(({ event_id, request_id, post_id, kind, elapsed_ms }) => ({ event_id, request_id, post_id, kind, elapsed_ms }));
}
export const newestCommunityPosts = (posts: MobileSocialPost[]) => [...posts].sort((left, right) => (Date.parse(right.created_at) || 0) - (Date.parse(left.created_at) || 0) || right.id.localeCompare(left.id));
export const nativeFeedMode = (value: unknown): NativeFeedMode | null => value === 'latest' || value === 'for-you' || value === 'following' ? value : null;
export const recommendationMode = (context: RelevanceContext): RecommendationMode => context.personalization_enabled ? 'personalized' : 'popular';
export const canCollectRecommendations = (context: RelevanceContext | null) => !!context?.use_v3 && !context.shadow && context.personalization_enabled;
export const feedSource = (mode: NativeFeedMode, context: RelevanceContext | null) => mode !== 'for-you' ? mode : context?.use_v3 && !context.shadow ? 'v3' : context?.personalization_enabled && context.legacy_affinity_allowed ? 'v2' : 'latest';

export function parseRelevanceContext(value: any): RelevanceContext | null {
  if (!value || !['off', 'shadow', 'internal', 'live'].includes(value.state) || typeof value.use_v3 !== 'boolean' || typeof value.shadow !== 'boolean' || typeof value.personalization_enabled !== 'boolean' || !isUuid(value.epoch) || value.algorithm_version !== 'community-v3.1') return null;
  if (value.use_v3 && (value.shadow || !['live', 'internal'].includes(value.state)) || value.shadow !== (value.state === 'shadow')) return null;
  return { state: value.state, use_v3: value.use_v3, shadow: value.shadow, personalization_enabled: value.personalization_enabled, legacy_affinity_allowed: value.personalization_enabled && value.legacy_affinity_allowed === true, epoch: value.epoch, algorithm_version: value.algorithm_version };
}
export function parseRecommendationCursor(value: any, requestId: string): RecommendationCursor | null {
  if (!value) return null;
  if (value.request_id !== requestId || !Number.isInteger(value.position) || value.position < 1 || !isUuid(value.post_id) || typeof value.score !== 'string' || !value.score || value.score.length > 128 || typeof value.created_at !== 'string' || !value.created_at || value.created_at.length > 128) throw new Error('This feed has expired. Refresh to continue.');
  return { request_id: value.request_id, position: value.position, score: value.score, created_at: value.created_at, post_id: value.post_id };
}

/** Delivery identifiers only, never persisted or retried in a later actor/epoch. */
export class RecommendationEventBatch {
  private queue: RecommendationEvent[] = [];
  private seen = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private flushing = false;
  constructor(private send: (events: RecommendationEvent[]) => Promise<unknown>, private current: () => boolean, private uuid: () => string) {}
  add(requestId: string, postId: string, kind: RecommendationKind, elapsedMs = 0) {
    if (!this.current() || !isUuid(requestId) || !isUuid(postId) || !Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > 3_600_000) return;
    if (kind === 'audio_play' && elapsedMs < 10_000 || kind === 'meaningful_view' && elapsedMs < 2_000) return;
    const key = `${requestId}:${postId}:${kind}`;
    if (this.seen.has(key) || this.seen.size >= 500 || this.queue.length >= 100) return;
    this.seen.add(key);
    this.queue.push({ event_id: this.uuid(), request_id: requestId, post_id: postId, kind, elapsed_ms: Math.floor(elapsedMs) });
    if (!this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 1_000);
  }
  async flush() {
    if (this.flushing || !this.current()) return;
    this.flushing = true;
    const generation = this.generation;
    try {
      while (this.queue.length && this.current() && generation === this.generation) {
        const events = this.queue.splice(0, 25);
        await this.send(events).catch(() => undefined);
      }
    } finally { this.flushing = false; if (this.queue.length && this.current() && !this.timer) this.timer = setTimeout(() => { this.timer = undefined; void this.flush(); }, 1_000); }
  }
  clear() { ++this.generation; this.queue = []; this.seen.clear(); if (this.timer) clearTimeout(this.timer); this.timer = undefined; }
}

/** Count media progress, with bounded foreground samples; seeks/stalls/mute reset qualification. */
export class AudioProgressQualification {
  private previous: { source: string; position: number; at: number } | null = null;
  private elapsed = 0;
  sample(source: string, position: number, playing: boolean, volume: number, foreground: boolean, at = Date.now()): number {
    if (!foreground || !playing || !(volume > 0) || !Number.isFinite(position)) { this.reset(); return 0; }
    const previous = this.previous;
    this.previous = { source, position, at };
    if (!previous || previous.source !== source) { this.elapsed = 0; return 0; }
    const wall = (at - previous.at) / 1_000;
    const progress = position - previous.position;
    if (wall <= 0 || wall > 2.5 || progress <= 0 || progress > wall * 1.5 + 0.2) { this.elapsed = 0; return 0; }
    this.elapsed += Math.min(progress, wall) * 1_000;
    return Math.floor(this.elapsed);
  }
  reset() { this.previous = null; this.elapsed = 0; }
}
