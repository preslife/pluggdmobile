import type { MobileSocialPostPreview } from './mobileTypes';

export type PostAction = 'like' | 'bookmark' | 'repost';
type Scope = { actor: string | null; token: string | null };
type Override = { flag: boolean; count: number; revision: number; server?: boolean };
type Value = Pick<MobileSocialPostPreview, 'liked' | 'bookmarked' | 'reposted' | 'likes_count' | 'bookmarks_count' | 'reposts_count' | 'poll' | 'poll_vote_option_id'> & { liked: boolean; bookmarked: boolean; reposted: boolean; likePending: boolean; bookmarkPending: boolean; repostPending: boolean };
type Operation = { scope: Scope; id: string; action: PostAction; before: boolean; count: number; revision: number; previous?: Override };
type Entry = { overrides: Partial<Record<PostAction, Override>>; pending: Partial<Record<PostAction, Operation>>; revision: number; snapshots: WeakMap<object, { revision: number; seed: string; poll: unknown; value: Value }>; poll?: Pick<Value, 'poll' | 'poll_vote_option_id'> };
let scope: Scope = { actor: null, token: null };
let mutationRevision = 0;
export const postInteractionRevision = () => mutationRevision;
const entries = new Map<string, Entry>(), listeners = new Set<() => void>();
const fields = { like: ['liked', 'likes_count', 'likePending'], bookmark: ['bookmarked', 'bookmarks_count', 'bookmarkPending'], repost: ['reposted', 'reposts_count', 'repostPending'] } as const;
const actions = Object.keys(fields) as PostAction[];
const notify = () => listeners.forEach(listener => listener());
export const canonicalPostId = (post: MobileSocialPostPreview) => post.is_repost && post.original_post_id ? post.original_post_id : post.id;
function record(id: string): Entry {
  let value = entries.get(id);
  if (!value) {
    value = { overrides: {}, pending: {}, revision: 0, snapshots: new WeakMap() }; entries.set(id, value);
    if (entries.size > 1000) for (const [key, item] of entries) if (key !== id && !Object.keys(item.pending).length) { entries.delete(key); break; }
  }
  return value;
}
/** Completed actions survive same-account credential rotation; pending work rolls back. */
export function bindPostInteractionScope(actor: string | null, token: string | null): Scope {
  if (scope.actor === actor && scope.token === token) return scope;
  if (scope.actor !== actor) entries.clear();
  else for (const item of entries.values()) {
    for (const action of actions) { const operation = item.pending[action]; if (operation) { if (operation.previous) item.overrides[action] = operation.previous; else delete item.overrides[action]; } }
    item.pending = {}; item.revision++;
  }
  scope = { actor, token }; return scope;
}
export const currentPostInteractionScope = (expected: Scope) => scope === expected;
export const subscribePostInteractions = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function seed(post: MobileSocialPostPreview): Value {
  const originalPost = (post as MobileSocialPostPreview & { original_post?: MobileSocialPostPreview | null }).original_post;
  const original = post.is_repost && originalPost ? originalPost : post;
  return { liked: Boolean(post.liked), bookmarked: Boolean(post.bookmarked), reposted: Boolean(post.reposted), likes_count: Math.max(0, Number(original.likes_count) || 0), bookmarks_count: Math.max(0, Number(original.bookmarks_count) || 0), reposts_count: Math.max(0, Number(original.reposts_count) || 0), poll: original.poll, poll_vote_option_id: post.poll_vote_option_id, likePending: false, bookmarkPending: false, repostPending: false };
}
/** Only mutations override props. Untouched fields always follow fresh server props. */
export function postInteractionSnapshot(post: MobileSocialPostPreview): Value {
  const item = record(canonicalPostId(post)), base = seed(post);
  const signature = JSON.stringify([base.liked, base.bookmarked, base.reposted, base.likes_count, base.bookmarks_count, base.reposts_count, base.poll_vote_option_id]);
  const cached = item.snapshots.get(post);
  if (cached?.revision === item.revision && cached.seed === signature && cached.poll === base.poll) return cached.value;
  const value = { ...base, ...item.poll };
  for (const action of actions) {
    const override = item.overrides[action], [flag, count, pending] = fields[action];
    if (override) { value[flag] = override.flag; value[count] = !override.server && !item.pending[action] && base[flag] === override.flag ? base[count] : override.count; }
    value[pending] = Boolean(item.pending[action]);
  }
  item.snapshots.set(post, { revision: item.revision, seed: signature, poll: base.poll, value }); return value;
}
export function beginPostInteraction(expected: Scope, post: MobileSocialPostPreview, action: PostAction): Operation | null {
  if (!expected.actor || !currentPostInteractionScope(expected)) return null;
  const item = record(canonicalPostId(post)); if (item.pending[action]) return null;
  const value = postInteractionSnapshot(post), [flag, count] = fields[action];
  const operation = { scope: expected, id: canonicalPostId(post), action, before: value[flag], count: value[count], revision: ++mutationRevision, previous: item.overrides[action] };
  item.pending[action] = operation; item.overrides[action] = { flag: !operation.before, count: Math.max(0, operation.count + (operation.before ? -1 : 1)), revision: operation.revision };
  item.revision++; notify(); return operation;
}
export function finishPostInteraction(operation: Operation, succeeded: boolean, acknowledged?: boolean) {
  if (!currentPostInteractionScope(operation.scope)) return;
  const item = entries.get(operation.id); if (!item || item.pending[operation.action] !== operation) return;
  delete item.pending[operation.action];
  if (succeeded) { const flag = acknowledged ?? !operation.before; item.overrides[operation.action] = { flag, count: Math.max(0, operation.count + Number(flag) - Number(operation.before)), revision: ++mutationRevision }; }
  else if (operation.previous) item.overrides[operation.action] = operation.previous;
  else delete item.overrides[operation.action];
  item.revision++; notify();
}
export function updatePollInPlace(expected: Scope, post: MobileSocialPostPreview, poll: MobileSocialPostPreview['poll'] | undefined, selected: string) {
  if (!currentPostInteractionScope(expected)) return;
  const item = record(canonicalPostId(post)); item.poll = { poll: poll ?? postInteractionSnapshot(post).poll, poll_vote_option_id: selected }; item.revision++; notify();
}
const isPost = (value: any): value is MobileSocialPostPreview => value && typeof value === 'object' && typeof value.id === 'string' && ('liked' in value || 'bookmarked' in value) && 'likes_count' in value;
function postsIn(value: any, visit: (post: MobileSocialPostPreview) => void, depth = 0) {
  if (!value || depth > 7) return;
  if (Array.isArray(value)) { value.forEach(item => postsIn(item, visit, depth + 1)); return; }
  if (isPost(value)) visit(value);
  if (typeof value === 'object') for (const key of ['post', 'posts', 'threadPosts', 'original_post', 'items', 'pages', 'data', 'results']) if (value[key]) postsIn(value[key], visit, depth + 1);
}
export function reconcilePostInteractions(actor: string | null, token: string | null, value: unknown, requestRevision: number) {
  if (scope.actor !== actor || scope.token !== token) return;
  let changed = false;
  postsIn(value, post => {
    const item = entries.get(canonicalPostId(post)); if (!item) return;
    const next = seed(post);
    for (const action of actions) if (item.overrides[action] && !item.pending[action] && item.overrides[action]!.revision <= requestRevision) { const [flag, count] = fields[action]; item.overrides[action] = { flag: next[flag], count: next[count], revision: item.overrides[action]!.revision, server: true }; changed = true; }
    if (item.poll) { item.poll = { poll: next.poll, poll_vote_option_id: next.poll_vote_option_id }; changed = true; }
    item.revision++;
  });
  if (changed) notify();
}
function relevantQuery(key: readonly unknown[]) {
  const actor = scope.actor ?? 'guest';
  if (key[0] === 'profile' && key[1] === 'posts') return key[2] === actor;
  if (key[0] === 'community-feed') return key[1] !== 'bundle' || key[2] === actor;
  if (key[0] === 'culture') return key[1] !== 'post-detail' || key.length < 4 || key[3] === actor;
  return false;
}
const observed = new WeakMap<object, { count: number; stop: () => void }>();
/** Reconcile only real fetches begun in this credential scope, never old-account results. */
export function observePostInteractionQueries(client: any): () => void {
  const cache = client.getQueryCache?.(); if (!cache) return () => {};
  const existing = observed.get(client); if (existing) { existing.count++; return () => { if (--existing.count === 0) { existing.stop(); observed.delete(client); } }; }
  const fetching = new WeakMap<object, { scope: Scope; revision: number }>();
  const item = { count: 1, stop: cache.subscribe((event: any) => {
    if (event.type !== 'updated' || !relevantQuery(event.query.queryKey)) return;
    if (event.action.type === 'fetch') fetching.set(event.query, { scope, revision: mutationRevision });
    if (event.action.type === 'success') { const expected = fetching.get(event.query); fetching.delete(event.query); if (expected && currentPostInteractionScope(expected.scope)) reconcilePostInteractions(expected.scope.actor, expected.scope.token, event.query.state.data, expected.revision); }
  }) };
  observed.set(client, item); return () => { if (--item.count === 0) { item.stop(); observed.delete(client); } };
}
/** Remove only confirmed deleted/blocked rows; a later fetch/unblock can restore them. */
export async function removePostQuerySnapshots(client: any, expected: Scope, target: { postId?: string; authorId?: string }) {
  if (!currentPostInteractionScope(expected) || !client.setQueriesData) return;
  const matches = (post: MobileSocialPostPreview) => target.postId ? post.id === target.postId : post.user_id === target.authorId;
  const patch = (value: any, depth = 0): any => {
    if (!value || depth > 7) return value;
    if (Array.isArray(value)) { const next = value.filter(item => !isPost(item) || !matches(item)).map(item => patch(item, depth + 1)); return next.length === value.length && next.every((item, index) => item === value[index]) ? value : next; }
    if (typeof value !== 'object') return value;
    if (isPost(value) && matches(value)) return null;
    let next = value;
    for (const key of ['post', 'posts', 'threadPosts', 'original_post', 'items', 'pages', 'data', 'results']) if (value[key]) { const child = patch(value[key], depth + 1); if (child !== value[key]) { if (next === value) next = { ...value }; next[key] = child; } }
    return next;
  };
  await client.cancelQueries?.({ predicate: (query: any) => relevantQuery(query.queryKey) });
  if (!currentPostInteractionScope(expected)) return;
  client.setQueriesData({ predicate: (query: any) => relevantQuery(query.queryKey) }, patch);
}
