import { postInteractionRevision, reconcilePostInteractions } from '../culture/postInteractionState';
import { RecommendationEventBatch, canCollectRecommendations, confirmedRecommendationShare, feedSource, type NativeFeedMode, type RelevanceContext, type RecommendationCursor, type RecommendationMetadata } from './communityRelevanceModel';
import { nativeRelevanceApi, relevanceUuid, type NativeRelevanceApi, type RelevanceActor } from './communityRelevanceService';
import type { MobileSocialPost } from '../culture/mobileTypes';

export type RelevanceState = { mode: NativeFeedMode; posts: MobileSocialPost[]; context: RelevanceContext | null; metadata: Record<string, RecommendationMetadata>; loading: boolean; loadingMore: boolean; hasMore: boolean; error: string | null; notice: string | null; undo: string | null; busy: boolean };
const controllers = new Set<NativeRelevanceController>();

export function removeLoadedCommunityPosts(actorId: string | null, token: string | null, target: { postId?: string; authorId?: string }) {
  for (const controller of controllers) {
    if (controller.actor?.id === actorId && controller.actor?.token === token) controller.removeLoadedPosts(target);
  }
}

let openRevision = 0;
let openAbort = new AbortController();
let pendingOpen: { actor: RelevanceActor; epoch: string; postId: string; requestId: string; expires: number; api: NativeRelevanceApi } | null = null;
export const clearRecommendationOpen = () => { ++openRevision; openAbort.abort(); openAbort = new AbortController(); pendingOpen = null; };

/** Consume only after the actual detail has loaded for this actor; no route/query persistence. */
export async function confirmRecommendationOpen(actorId: string | null, postId: string) {
  const pending = pendingOpen;
  const revision = openRevision;
  const signal = openAbort.signal;
  pendingOpen = null;
  if (!pending || pending.actor.id !== actorId || pending.postId !== postId || pending.expires < Date.now()) return;
  try {
    const context = await pending.api.context(signal);
    if (revision !== openRevision || !canCollectRecommendations(context) || context?.epoch !== pending.epoch) return;
    await pending.api.events(['served', 'open'].map(kind => ({ event_id: relevanceUuid(), request_id: pending.requestId, post_id: pending.postId, kind: kind as 'served' | 'open', elapsed_ms: 0 })), signal);
  } catch { /* Best effort; the detail itself stays usable. */ }
}

/** A Share result confirms only the delivery captured before the native/web chooser opens. */
export async function shareWithRecommendationConfirmation(
  share: () => Promise<{ action?: string } | undefined>,
  prepare: (() => (() => void) | undefined) | undefined,
  platform: string,
  webShareAvailable = false,
) {
  const confirm = prepare?.();
  const result = await share();
  if (confirmedRecommendationShare(platform, result, webShareAvailable)) confirm?.();
  return result;
}

/** Native layout callbacks can arrive after cleanup or out of order. Never revive an old observation. */
export function createRecommendationVisibilityGate(report: (visible: boolean) => void) {
  let disposed = false;
  let revision = 0;
  return {
    sample(read: (done: (visible: boolean) => void) => void) {
      if (disposed) return;
      const turn = ++revision;
      read(visible => { if (!disposed && turn === revision) report(visible); });
    },
    visible(visible: boolean) { if (!disposed) report(visible); },
    dispose() { if (disposed) return; disposed = true; ++revision; report(false); },
  };
}

export class NativeRelevanceController {
  private listeners = new Set<() => void>();
  private generation = 0;
  private active = false;
  private abort = new AbortController();
  private requestId: string | null = null;
  private cursor: RecommendationCursor | null = null;
  private views = new Map<string, ReturnType<typeof setTimeout>>();
  private batch: RecommendationEventBatch;
  private selected = false;
  private lifecycle = 0;
  private hidden: { token: string; rows: Array<{ post: MobileSocialPost; index: number }> } | null = null;
  state: RelevanceState;
  constructor(readonly actor: RelevanceActor | null, readonly api: NativeRelevanceApi = nativeRelevanceApi(actor), mode: NativeFeedMode = 'latest', private contextOnly = false) {
    this.state = { mode, posts: [], context: null, metadata: {}, loading: true, loadingMore: false, hasMore: false, error: null, notice: null, undo: null, busy: false };
    this.batch = new RecommendationEventBatch(events => this.api.events(events, this.abort.signal), () => this.collecting(), relevanceUuid);
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.state;
  private update(next: Partial<RelevanceState>) { this.state = { ...this.state, ...next }; this.listeners.forEach(listener => listener()); }
  private collecting() { return this.active && this.state.mode === 'for-you' && canCollectRecommendations(this.state.context); }
  private clearViews() { this.views.forEach(clearTimeout); this.views.clear(); }
  invalidate(clearContext = true) {
    ++this.generation;
    this.hidden = null;
    this.abort.abort(); this.abort = new AbortController();
    this.batch.clear(); this.clearViews(); this.requestId = null; this.cursor = null;
    this.update({ posts: [], metadata: {}, hasMore: false, loadingMore: false, loading: this.active, busy: false, error: null, ...(clearContext ? { context: null, undo: null, notice: null } : {}) });
  }
  setActive(active: boolean, background = false) {
    if (background) clearRecommendationOpen();
    if (this.active === active) return;
    ++this.lifecycle;
    this.active = active;
    if (active) { controllers.add(this); void this.refresh(); }
    else { this.invalidate(); controllers.delete(this); }
  }
  dispose() { ++this.lifecycle; this.active = false; this.invalidate(); controllers.delete(this); if (pendingOpen?.actor.id === this.actor?.id) clearRecommendationOpen(); this.listeners.clear(); }
  selectMode(mode: NativeFeedMode) { ++this.lifecycle; this.selected = true; if (mode !== this.state.mode) { clearRecommendationOpen(); this.update({ mode }); void this.refresh(); } }
  restoreMode(mode: NativeFeedMode) { if (!this.selected && mode !== this.state.mode) { this.update({ mode }); if (this.active) void this.refresh(); } }
  async refresh(context?: RelevanceContext, preserveUndo = false, preserveBusy = false) {
    if (!this.active) return;
    const interactionRevision = postInteractionRevision();
    this.invalidate(false);
    this.update({ loading: true, busy: preserveBusy, ...(preserveUndo ? {} : { undo: null, notice: null }) });
    const generation = this.generation;
    const signal = this.abort.signal;
    try {
      const next = context ?? await this.api.context(signal);
      if (!this.current(generation)) return;
      this.update({ context: next });
      if (this.contextOnly) return;
      const source = feedSource(this.state.mode, next);
      if (source === 'v3' && next) {
        const page = await this.api.page(next, null, null, signal);
        if (!this.current(generation)) return;
        this.requestId = page.requestId; this.cursor = page.cursor;
        this.update({ posts: page.posts, metadata: page.metadata, hasMore: page.hasMore });
        reconcilePostInteractions(this.actor?.id ?? null, this.actor?.token ?? null, page.posts, interactionRevision);
      } else {
        const posts = await this.api.baseline(source === 'following' ? 'following' : source === 'v2' ? 'v2' : 'latest', signal);
        if (!this.current(generation)) return;
        this.update({ posts, metadata: {}, hasMore: false });
        reconcilePostInteractions(this.actor?.id ?? null, this.actor?.token ?? null, posts, interactionRevision);
        if (this.state.mode === 'for-you' && next?.shadow) void this.api.page(next, null, null, signal).catch(() => undefined); // Compute/discard unseen shadow; no telemetry.
      }
    } catch (error) { if (this.current(generation)) this.update({ error: error instanceof Error ? error.message : 'Community could not load. Please try again.' }); }
    finally { if (this.current(generation)) this.update({ loading: false }); }
  }
  private current(generation: number) { return this.active && generation === this.generation && !this.abort.signal.aborted; }
  removeLoadedPosts(target: { postId?: string; authorId?: string }) {
    // Retire stale page reads without losing the delivery/cursor/Undo snapshot.
    ++this.generation; this.abort.abort(); this.abort = new AbortController(); this.clearViews();
    const matches = (post: MobileSocialPost) => target.postId ? post.id === target.postId : post.user_id === target.authorId;
    const redact = (post: MobileSocialPost) => post.original_post && matches(post.original_post as MobileSocialPost) ? { ...post, original_post: null } : post;
    if (this.hidden) this.hidden.rows = this.hidden.rows.filter(row => !matches(row.post)).map(row => ({ ...row, post: redact(row.post) }));
    this.update({ posts: this.state.posts.filter(post => !matches(post)).map(redact), loading: false, loadingMore: false, busy: false });
  }
  async more() {
    if (!this.active || this.state.loading || this.state.loadingMore || !this.state.hasMore || !this.state.context || !this.requestId || !this.cursor) return;
    const generation = this.generation;
    this.update({ loadingMore: true, error: null });
    try {
      const page = await this.api.page(this.state.context, this.requestId, this.cursor, this.abort.signal);
      if (!this.current(generation)) return;
      this.cursor = page.cursor;
      const seen = new Set(this.state.posts.map(post => post.id));
      this.update({ posts: [...this.state.posts, ...page.posts.filter(post => !seen.has(post.id))].slice(0, 500), metadata: { ...this.state.metadata, ...page.metadata }, hasMore: page.hasMore && this.state.posts.length < 500 });
    } catch (error) { if (this.current(generation)) this.update({ error: error instanceof Error ? error.message : 'More posts could not load.' }); }
    finally { if (this.current(generation)) this.update({ loadingMore: false }); }
  }
  visible(postId: string, visible: boolean) {
    const meta = this.state.metadata[postId];
    if (!visible || !meta || !this.collecting()) { const timer = this.views.get(postId); if (timer) clearTimeout(timer); this.views.delete(postId); return; }
    this.batch.add(meta.requestId, postId, 'served');
    if (this.views.has(postId)) return;
    const generation = this.generation;
    this.views.set(postId, setTimeout(() => {
      if (this.current(generation) && this.views.has(postId) && this.collecting()) this.batch.add(meta.requestId, postId, 'meaningful_view', 2_000);
    }, 2_000));
  }
  /** Delivery identity is captured before asynchronous UI work, never rebound after refresh/reset. */
  private delivery(postId: string) {
    const meta = this.state.metadata[postId];
    const epoch = this.state.context?.epoch;
    if (!meta || !epoch || !this.actor || !this.collecting()) return null;
    const generation = this.generation, requestId = meta.requestId;
    const current = () => this.current(generation) && this.collecting() && this.state.context?.epoch === epoch && this.state.metadata[postId]?.requestId === requestId;
    return { requestId, current };
  }
  prepareShare(postId: string): (() => void) | undefined {
    const delivery = this.delivery(postId);
    if (!delivery) return;
    return () => {
      if (!delivery.current()) return;
      this.batch.add(delivery.requestId, postId, 'served');
      this.batch.add(delivery.requestId, postId, 'share');
    };
  }
  prepareVisibility(postId: string): (visible: boolean) => void {
    const delivery = this.delivery(postId);
    return visible => { if (delivery?.current()) this.visible(postId, visible); };
  }
  audio(postId: string, elapsedMs: number) { const meta = this.state.metadata[postId]; if (meta && this.collecting()) { this.batch.add(meta.requestId, postId, 'served'); this.batch.add(meta.requestId, postId, 'audio_play', elapsedMs); } }
  open(postId: string) {
    const meta = this.state.metadata[postId];
    if (!this.actor || !meta || !this.collecting() || !this.state.context) return;
    clearRecommendationOpen();
    pendingOpen = { actor: this.actor, epoch: this.state.context.epoch, postId, requestId: meta.requestId, expires: Date.now() + 90_000, api: this.api };
  }
  async suppress(postId: string, scope: 'post' | 'author') {
    const meta = this.state.metadata[postId];
    if (!this.active || this.state.busy || !this.state.context?.use_v3 || this.state.context.shadow || !meta) return;
    const generation = this.generation;
    this.update({ busy: true, error: null });
    try {
      const token = await this.api.suppress(meta.requestId, postId, scope, this.abort.signal);
      if (!this.current(generation)) return;
      this.hidden = { token, rows: this.state.posts.flatMap((post, index) => (scope === 'author' ? post.user_id === meta.authorId : post.id === postId) ? [{ post, index }] : []) };
      this.update({ posts: this.state.posts.filter(post => scope === 'author' ? post.user_id !== meta.authorId : post.id !== postId), undo: token, notice: scope === 'author' ? 'You’ll see fewer posts from this creator.' : 'Recommendation hidden.' });

    } catch (error) { if (this.current(generation)) this.update({ error: error instanceof Error ? error.message : 'Your choice could not be saved.' }); }
    finally { if (this.current(generation)) this.update({ busy: false }); }
  }
  async undo() {
    const token = this.state.undo;
    if (!token || this.state.busy || !this.active) return;
    const generation = this.generation;
    this.update({ busy: true, error: null });
    try {
      const result = await this.api.undo(token, this.abort.signal);
      if (!this.current(generation)) return;
      if (result && this.hidden?.token === token) {
        const posts = [...this.state.posts];
        for (const row of this.hidden.rows) if (!posts.some(post => post.id === row.post.id)) posts.splice(Math.min(row.index, posts.length), 0, row.post);
        this.update({ posts });
      }
      this.hidden = null;
      this.update({ undo: null, notice: result ? 'Your choice was undone.' : 'This choice has expired. Refresh for current recommendations.' });

    } catch (error) { if (this.current(generation)) this.update({ error: error instanceof Error ? error.message : 'Your choice could not be undone.' }); }
    finally { if (this.current(generation)) this.update({ busy: false }); }
  }
  async preference(enabled: boolean) { await this.changePreference(signal => this.api.preference(enabled, signal), enabled ? 'Personalization is on.' : 'Personalization is off. Popular uses public Community activity.'); }
  async reset() { await this.changePreference(signal => this.api.reset(signal), 'Recommendation history reset. Your follows, posts and saved items are kept.'); }
  private async changePreference(change: (signal: AbortSignal) => Promise<RelevanceContext>, notice: string) {
    if (!this.actor || !this.active || this.state.busy || !this.state.context) return;
    clearRecommendationOpen();
    const lifecycle = ++this.lifecycle;
    const affected = [...controllers].filter(controller => controller.actor?.id === this.actor?.id);
    affected.forEach(controller => controller.invalidate());
    this.update({ busy: true });
    const generation = this.generation;
    try {
      const context = await change(this.abort.signal);
      if (!this.current(generation)) return;
      await Promise.all(affected.map(controller => controller.refresh(context, false, controller === this)));
      if (this.active && lifecycle === this.lifecycle) this.update({ notice, busy: false });
    } catch (error) {
      if (!this.current(generation)) return;
      await Promise.all(affected.map(controller => controller.refresh(undefined, false, controller === this)));
      if (this.active && lifecycle === this.lifecycle) this.update({ error: error instanceof Error ? error.message : 'Your change was not saved.', busy: false });
    }
  }
}
