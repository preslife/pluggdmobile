import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript');
let time = Date.now(), timerId = 0, uuid = 100;
const timers = new Map();
class Clock extends Date { static now() { return time; } }
const timer = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: time + ms }); return id; };
async function settle() { for (let i = 0; i < 35; i++) await Promise.resolve(); }
async function advance(ms) { time += ms; for (const [id, value] of [...timers]) if (value.at <= time) { timers.delete(id); value.fn(); } await settle(); }
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function load(path, mocks) {
  const module = { exports: {} };
  const result = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  vm.runInNewContext(result.outputText, { module, exports: module.exports, require: name => mocks[name] ?? require(name), AbortController, URL, Response, structuredClone, fetch: async (url, options) => { const name = new URL(url).pathname.split('/').pop(); const args = JSON.parse(options.body); const call = { name, args, authorization: options.headers.Authorization }; calls.push(call); const result = await handler(name, args); return Response.json(result.error ?? result.data, { status: result.error ? 400 : 200 }); }, process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-fixture' } }, Object, Date: Clock, Map, Set, JSON, Error, setTimeout: timer, clearTimeout: id => timers.delete(id) }, { filename: path });
  return module.exports;
}
const model = load('../src/features/community-feed/communityRelevanceModel.ts', {});
let session = { user: { id: id(1) }, access_token: 'fixture-token' }, calls = [], handler;
let hydrated = [];
const db = { auth: { getSession: async () => ({ data: { session } }) }, rpc: (name, args) => { calls.push({ name, args }); return handler(name, args); } };
const service = load('../src/features/community-feed/communityRelevanceService.ts', {
  'expo-crypto': { randomUUID: () => id(++uuid) }, '../../lib/supabase': { supabase: db }, './communityRelevanceModel': model,
  '../culture/mobileSocial': { hydrateRankedMobileSocialPosts: async rows => { hydrated = rows; return rows.map(row => ({ id: row.id, user_id: row.user_id })); }, loadMobileSocialFeed: async args => { calls.push({ baseline: args.mode }); return [{ id: id(9), user_id: id(2) }]; } },
});
const interactions = load('../src/features/culture/postInteractionState.ts', {});
const ctrl = load('../src/features/community-feed/communityRelevanceController.ts', { '../culture/postInteractionState': interactions, './communityRelevanceModel': model, './communityRelevanceService': service });
const context = { state: 'live', use_v3: true, shadow: false, personalization_enabled: true, legacy_affinity_allowed: true, epoch: id(3), algorithm_version: 'community-v3.1' };
const rows = [6, 4].map(n => ({ id: id(n), user_id: id(2), recommendation_request_id: id(5), recommendation_reason: 'music', algorithm_version: 'community-v3.1' }));
const cursor = { request_id: id(5), position: 20, score: '12.12345678901234567890', created_at: '2026-10-07 10:22:00.000001+00', post_id: id(4) };
const envelope = { items: rows, request_id: id(5), mode: 'personalized', algorithm_version: 'community-v3.1', shadow: false, has_more: true, cursor };
handler = async (name, args) => ({ data: name === 'get_community_relevance_context' ? context : args?.p_request_id ? { ...envelope, cursor: { ...cursor, position: 40 } } : envelope, error: null });
const api = service.nativeRelevanceApi({ id: id(1), token: session.access_token });
assert.equal((await api.context()).epoch, context.epoch);
const first = await api.page(context);
assert.equal(first.posts.map(post => post.id).join(','), rows.map(row => row.id).join(','));
assert.equal(hydrated[0].id, id(6));
await api.page(context, id(5), first.cursor);
assert.equal(calls.at(-1).args.p_cursor.score, cursor.score);
assert.equal(calls.at(-1).args.p_cursor.created_at, cursor.created_at);
for (const call of calls.filter(call => call.name)) assert.ok(!Object.keys(call.args ?? {}).some(key => /user|actor/.test(key)));
const originalHandler = handler;
handler = async () => ({ data: { ...envelope, items: [], cursor: { ...cursor, position: 40 } }, error: null });
assert.equal((await api.page(context, id(5), cursor)).hasMore, true);
handler = async () => ({ data: { ...envelope, cursor: { ...cursor, request_id: id(80) } }, error: null });
await assert.rejects(api.page(context), /expired/);
handler = async () => ({ data: { ...envelope, items: [{ ...rows[0], recommendation_request_id: id(80) }] }, error: null });
await assert.rejects(api.page(context), /could not load/);
handler = originalHandler;
console.log('PASS actual RPC context, exact opaque cursor, short withdrawn pages, ranked hydration and metadata validation');
let resolve;
handler = () => new Promise(done => resolve = done);
const stale = api.page(context); await settle(); session = { ...session, user: { id: id(88) } }; resolve({ data: envelope }); await assert.rejects(stale, /session changed/);
session = { user: { id: id(1) }, access_token: 'fixture-token' };
const changedToken = api.page(context); await settle(); session.access_token = 'new-token'; resolve({ data: envelope }); await assert.rejects(changedToken, /session changed/);
session.access_token = 'fixture-token';
const abort = new AbortController(); const aborted = api.page(context, null, null, abort.signal); await settle(); abort.abort(); resolve({ data: envelope }); await assert.rejects(aborted, /session changed/);
handler = async () => ({ data: null, error: { message: 'function unavailable' } }); assert.equal(await api.context(), null);
assert.equal(await service.nativeRelevanceApi(null).context(), null);
await assert.rejects(service.nativeRelevanceApi(null).baseline('latest'), /session changed/);
handler = async () => ({ data: 1 });
await api.events([{ event_id: id(71), request_id: id(5), post_id: id(6), kind: 'share', elapsed_ms: 0, url: 'must-not-leave', accessCode: 'must-not-leave', actor_id: id(1) }]);
assert.equal(Object.keys(calls.at(-1).args.p_events[0]).sort().join(','), 'elapsed_ms,event_id,kind,post_id,request_id');
assert.equal(model.recommendationEventPayload([{ event_id: id(71), request_id: id(5), post_id: id(6), kind: 'audio_play', elapsed_ms: 0 }]).length, 0);
console.log('PASS actor/token/abort response discard and missing-context/guest safety');
const originalGetSession = db.auth.getSession;
const mutations = [
  ['preference', (signal) => api.preference(false, signal), { ...context, personalization_enabled: false }],
  ['reset', (signal) => api.reset(signal), context],
  ['suppress', (signal) => api.suppress(id(5), id(6), 'post', signal), id(77)],
  ['undo', (signal) => api.undo(id(77), signal), true],
  ['events', (signal) => api.events([{ event_id: id(73), request_id: id(5), post_id: id(6), kind: 'served', elapsed_ms: 0 }], signal), 1],
];
for (const [name, operation, data] of mutations) {
  session = { user: { id: id(1) }, access_token: 'fixture-token' };
  const initiatingSession = structuredClone(session);
  let releaseSession, reads = 0;
  db.auth.getSession = () => reads++ === 0 ? new Promise(resolve => releaseSession = resolve) : originalGetSession();
  handler = async () => ({ data });
  const before = calls.length;
  const changing = operation(); await settle();
  session = { user: { id: id(88) }, access_token: 'other-actor-token' };
  releaseSession({ data: { session: initiatingSession } });
  await assert.rejects(changing, /session changed/, name);
  assert.equal(calls.length, before + 1, name + ' stale preparation test dispatches captured original actor');
  assert.equal(calls.at(-1).authorization, 'Bearer fixture-token', name + ' must never dispatch with new actor credential');
  assert.ok(!Object.keys(calls.at(-1).args).some(key => /user|actor/.test(key)));
  session = { user: { id: id(1) }, access_token: 'fixture-token' }; reads = 0;
  const cancelled = new AbortController(); const aborting = operation(cancelled.signal); await settle();
  const count = calls.length; cancelled.abort(); session = { user: { id: id(88) }, access_token: 'other-actor-token' }; releaseSession({ data: { session: initiatingSession } });
  await assert.rejects(aborting, /session changed/, name + ' abort'); assert.equal(calls.length, count, name + ' cancelled before dispatch');
  db.auth.getSession = originalGetSession;
}
session = { user: { id: id(1) }, access_token: 'fixture-token' };
console.log('PASS actual mutating RPC dispatch pins original bearer after stale awaited auth; cancelled preference/reset/feedback/Undo/events dispatch nothing into next actor');


function fixture(options = {}) {
  const seen = { baseline: [], pages: [], events: [], suppressed: [], preference: [], reset: 0 };
  let ctx = options.context === undefined ? { ...context } : options.context;
  const page = (more = false) => ({ posts: more ? [] : [{ id: id(6), user_id: id(2) }, { id: id(4), user_id: id(2) }], metadata: Object.fromEntries(rows.map(row => [row.id, { requestId: id(5), reason: 'music', authorId: id(2) }])), requestId: id(5), cursor: { ...cursor, position: more ? 40 : 20 }, hasMore: !more });
  const fake = { context: async () => ctx, baseline: async mode => { seen.baseline.push(mode); return [{ id: id(9) }]; }, page: async (_ctx, request, nextCursor) => { seen.pages.push({ request, cursor: nextCursor }); return page(!!request); }, events: async events => seen.events.push(...events), suppress: async (request, post, scope) => { seen.suppressed.push({ request, post, scope }); return id(77); }, undo: async token => token === id(77), preference: async enabled => { seen.preference.push(enabled); ctx = { ...ctx, personalization_enabled: enabled, epoch: id(81) }; return ctx; }, reset: async () => { seen.reset++; ctx = { ...ctx, epoch: id(82) }; return ctx; }, ...options.api };
  return { seen, api: fake, setContext: value => ctx = value, controller: new ctrl.NativeRelevanceController(options.actor ?? { id: id(1), token: 'fixture-token' }, fake, options.mode ?? 'for-you', options.contextOnly ?? false) };
}
for (const [ctx, expected] of [[null, 'latest'], [{ ...context, state: 'off', use_v3: false }, 'v2'], [{ ...context, legacy_affinity_allowed: false, state: 'off', use_v3: false }, 'latest'], [{ ...context, legacy_affinity_allowed: false, state: 'internal', use_v3: false }, 'latest'], [{ ...context, legacy_affinity_allowed: false, state: 'shadow', use_v3: false, shadow: true }, 'latest'], [{ ...context, state: 'internal', use_v3: false }, 'v2'], [{ ...context, personalization_enabled: false, state: 'off', use_v3: false }, 'latest'], [{ ...context, personalization_enabled: false, state: 'internal', use_v3: false }, 'latest']]) {
  const f = fixture({ context: ctx }); f.controller.setActive(true); await settle(); assert.equal(f.seen.baseline[0], expected); f.controller.visible(id(6), true); f.controller.prepareShare(id(6))?.(); f.controller.audio(id(6), 12_000); await advance(3_000); assert.equal(f.seen.events.length, 0); f.controller.dispose();
}
const shadow = fixture({ context: { ...context, state: 'shadow', use_v3: false, shadow: true } }); shadow.controller.setActive(true); await settle(); assert.equal(shadow.seen.baseline[0], 'v2'); assert.equal(shadow.seen.pages.length, 1); assert.equal(shadow.controller.state.posts[0].id, id(9)); shadow.controller.visible(id(6), true); await advance(3_000); assert.equal(shadow.seen.events.length, 0); shadow.controller.dispose();
const popular = fixture({ context: { ...context, personalization_enabled: false } }); popular.controller.setActive(true); await settle(); popular.controller.visible(id(6), true); popular.controller.audio(id(6), 11_000); popular.controller.prepareShare(id(6))?.(); await advance(3_000); assert.equal(popular.seen.events.length, 0); popular.controller.dispose();
console.log('PASS old-v2/off/internal/shadow/privacy-safe Latest and opted-out Popular without telemetry');
const f = fixture(); f.controller.setActive(true); await settle(); await f.controller.more(); assert.equal(f.seen.pages[1].cursor.score, cursor.score); assert.equal(f.controller.state.posts.length, 2); assert.equal(f.controller.state.hasMore, false);
f.controller.visible(id(6), true); await advance(1_000); assert.deepEqual(f.seen.events.map(event => event.kind), ['served']); await advance(1_000); await advance(1_000); assert.deepEqual(f.seen.events.map(event => event.kind), ['served', 'meaningful_view']);
f.controller.visible(id(6), true); f.controller.prepareShare(id(6))?.(); f.controller.prepareShare(id(6))?.(); f.controller.audio(id(6), 9_999); f.controller.audio(id(6), 10_000); await advance(1_000);
assert.equal(f.seen.events.filter(event => event.kind === 'share').length, 1); assert.equal(f.seen.events.filter(event => event.kind === 'audio_play').length, 1);
for (const event of f.seen.events) assert.equal(Object.keys(event).sort().join(','), 'elapsed_ms,event_id,kind,post_id,request_id');
f.controller.open(id(6)); await ctrl.confirmRecommendationOpen(id(1), id(6)); assert.equal(f.seen.events.filter(event => event.kind === 'open').length, 1);
f.controller.open(id(6)); ctrl.clearRecommendationOpen(); await ctrl.confirmRecommendationOpen(id(1), id(6)); assert.equal(f.seen.events.filter(event => event.kind === 'open').length, 1);
f.controller.open(id(6)); await ctrl.confirmRecommendationOpen(id(99), id(6)); assert.equal(f.seen.events.filter(event => event.kind === 'open').length, 1);
f.controller.open(id(6)); f.setContext({ ...context, epoch: id(99) }); await ctrl.confirmRecommendationOpen(id(1), id(6)); assert.equal(f.seen.events.filter(event => event.kind === 'open').length, 1); f.setContext(context);
console.log('PASS foreground view threshold, delivery-only idempotent payload, qualified audio and real-detail handoff guards');
const q = new model.AudioProgressQualification(); let elapsed = 0; for (let i = 0; i <= 11; i++) elapsed = q.sample('post', i, true, 1, true, i * 1_000); assert.ok(elapsed >= 10_000);
assert.equal(q.sample('post', 90, true, 1, true, 12_000), 0); assert.equal(q.sample('post', 91, true, 0, true, 13_000), 0); assert.equal(q.sample('post', 92, true, 1, false, 14_000), 0); assert.equal(q.sample('other', 1, true, 1, true, 15_000), 0); assert.equal(q.sample('other', 1, true, 1, true, 16_000), 0);
assert.equal(model.confirmedRecommendationShare('android', { action: 'sharedAction' }), false);
assert.equal(model.confirmedRecommendationShare('ios', { action: 'sharedAction' }), true);
assert.equal(model.confirmedRecommendationShare('ios', { action: 'dismissedAction' }), false);
assert.equal(model.confirmedRecommendationShare('web', undefined, true), true);
assert.equal(model.confirmedRecommendationShare('web', { action: 'sharedAction' }, true), false);
console.log('PASS actual-progress qualification excludes seek, muted, hidden, stalled and source-changed samples');
let resolvePage; const late = fixture({ api: { page: () => new Promise(done => resolvePage = done) } }); late.controller.setActive(true); await settle(); late.controller.setActive(false, true); assert.equal(late.controller.state.posts.length, 0); resolvePage({ posts: [{ id: id(55) }], metadata: {}, requestId: id(5), cursor, hasMore: true }); await settle(); assert.equal(late.controller.state.posts.length, 0); late.controller.dispose();
f.controller.visible(id(4), true); f.controller.setActive(false, true); await advance(3_000); assert.equal(f.seen.events.filter(event => event.post_id === id(4)).length, 0); f.controller.setActive(true); await settle(); await f.controller.suppress(id(6), 'author'); assert.equal(f.seen.suppressed[0].scope, 'author'); assert.equal(f.controller.state.undo, id(77)); await f.controller.undo(); assert.equal(f.controller.state.undo, null);
f.controller.visible(id(6), true); await f.controller.preference(false); assert.equal(f.controller.state.context.personalization_enabled, false); assert.equal(f.controller.state.metadata[id(6)].reason, 'music'); const before = f.seen.events.length; await advance(3_000); assert.equal(f.seen.events.length, before); await f.controller.reset(); assert.equal(f.controller.state.context.epoch, id(82)); assert.equal(f.seen.reset, 1); f.controller.dispose();
console.log('PASS page/background invalidation, acknowledged author suppression/Undo/preference/reset and opt-out clears pending events');

function deferred() { let resolve, reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
for (const transition of ['reset', 'background', 'refresh', 'account', 'token']) {
  const previous = fixture(); previous.controller.setActive(true); await settle();
  const share = deferred(); let oldMeasurement;
  const pendingShare = ctrl.shareWithRecommendationConfirmation(() => share.promise, () => previous.controller.prepareShare(id(6)), 'ios');
  const oldVisibility = ctrl.createRecommendationVisibilityGate(previous.controller.prepareVisibility(id(6)));
  oldVisibility.sample(done => oldMeasurement = done);
  let current = previous;
  if (transition === 'reset') await previous.controller.reset();
  else if (transition === 'background') { previous.controller.setActive(false, true); previous.controller.setActive(true); await settle(); }
  else if (transition === 'refresh') await previous.controller.refresh();
  else {
    previous.controller.dispose();
    current = fixture({ actor: { id: transition === 'account' ? id(88) : id(1), token: 'replacement-token' } });
    current.controller.setActive(true); await settle();
  }
  assert.equal(current.controller.state.posts[0].id, id(6), transition + ' has a fresh delivery of the same post');
  // Reused fixture request ids/epochs deliberately require the generation fence after foreground/refresh.
  share.resolve({ action: 'sharedAction' }); oldMeasurement(true); await pendingShare; await advance(3_000); await advance(1_000);
  assert.equal(previous.seen.events.length, 0, transition + ' old Share/measure must not record or start new dwell');
  assert.equal(current.seen.events.length, 0, transition + ' old UI work must not train the next delivery/actor');
  oldVisibility.dispose();
  const freshVisibility = ctrl.createRecommendationVisibilityGate(current.controller.prepareVisibility(id(6)));
  let freshMeasurement; freshVisibility.sample(done => freshMeasurement = done); freshMeasurement(true);
  const freshShare = deferred(); const accepted = ctrl.shareWithRecommendationConfirmation(() => freshShare.promise, () => current.controller.prepareShare(id(6)), 'ios');
  freshShare.resolve({ action: 'sharedAction' }); await accepted; await advance(2_000); await advance(1_000);
  assert.equal(current.seen.events.filter(event => event.kind === 'served').length, 1, transition + ' current delivered impression works');
  assert.equal(current.seen.events.filter(event => event.kind === 'share').length, 1, transition + ' current confirmed Share works');
  assert.equal(current.seen.events.filter(event => event.kind === 'meaningful_view').length, 1, transition + ' current foreground dwell works');
  freshVisibility.dispose(); current.controller.dispose();
}
console.log('PASS deferred actual Share/measure callbacks discard reset, background, refresh, account and token deliveries; fresh delivery events still work');
const layout = fixture(); layout.controller.setActive(true); await settle();
let lateMeasurement;
const disposedVisibility = ctrl.createRecommendationVisibilityGate(layout.controller.prepareVisibility(id(6)));
disposedVisibility.sample(done => lateMeasurement = done); disposedVisibility.dispose(); lateMeasurement(true);
let olderMeasurement, newerMeasurement;
const orderedVisibility = ctrl.createRecommendationVisibilityGate(layout.controller.prepareVisibility(id(6)));
orderedVisibility.sample(done => olderMeasurement = done); orderedVisibility.sample(done => newerMeasurement = done);
newerMeasurement(false); olderMeasurement(true); await advance(3_000); await advance(1_000);
assert.equal(layout.seen.events.length, 0, 'unmounted and older deferred measurements cannot record or create dwell');
orderedVisibility.visible(true); await advance(1_000); orderedVisibility.dispose(); orderedVisibility.visible(true); await advance(2_000); await advance(1_000);
assert.deepEqual(layout.seen.events.map(event => event.kind), ['served'], 'cleanup clears accepted dwell and discards a queued observer callback');
layout.controller.dispose();
console.log('PASS deferred native measurement disposal/order and web observer cleanup cannot revive dwell');
const confirmations = fixture(); confirmations.controller.setActive(true); await settle();
for (const [platform, result, web] of [['ios', { action: 'dismissedAction' }, false], ['android', { action: 'sharedAction' }, false], ['web', { action: 'sharedAction' }, true], ['web', undefined, false]]) {
  const share = deferred(); const pending = ctrl.shareWithRecommendationConfirmation(() => share.promise, () => confirmations.controller.prepareShare(id(6)), platform, web);
  share.resolve(result); await pending;
}
const cancelled = deferred(); const rejected = ctrl.shareWithRecommendationConfirmation(() => cancelled.promise, () => confirmations.controller.prepareShare(id(6)), 'ios');
cancelled.reject(new Error('Share cancelled')); await assert.rejects(rejected, /Share cancelled/);
await advance(1_000); assert.equal(confirmations.seen.events.length, 0, 'cancelled, rejected and chooser-only shares do not confirm delivery');
await ctrl.shareWithRecommendationConfirmation(async () => undefined, () => confirmations.controller.prepareShare(id(6)), 'web', true);
await advance(1_000); assert.deepEqual(confirmations.seen.events.map(event => event.kind), ['served', 'share']);
let ordinaryShares = 0; await ctrl.shareWithRecommendationConfirmation(async () => { ordinaryShares++; return { action: 'sharedAction' }; }, undefined, 'ios');
assert.equal(ordinaryShares, 1, 'canonical Share works without a recommendation delivery'); confirmations.controller.dispose();
console.log('PASS actual Share orchestration preserves cancellation, rejection, Android chooser exclusion, confirmed Web Share and canonical no-delivery sharing');
const settings = fixture({ contextOnly: true }); settings.controller.setActive(true); await settle(); assert.equal(settings.seen.pages.length + settings.seen.baseline.length, 0); await settings.controller.preference(false); assert.equal(settings.controller.state.context.personalization_enabled, false); assert.equal(settings.controller.state.busy, false); settings.controller.dispose();
const batches = [], batch = new model.RecommendationEventBatch(async events => batches.push(events), () => true, () => id(++uuid)); for (let i = 0; i < 200; i++) batch.add(id(5), id(1_000 + i), 'served'); await batch.flush(); assert.equal(batches.flat().length, 100); assert.ok(batches.every(events => events.length <= 25)); batch.clear();
assert.equal(model.parseRelevanceContext({ ...context, use_v3: true, state: 'off' }), null);
assert.equal(model.parseRelevanceContext({ ...context, legacy_affinity_allowed: undefined }).legacy_affinity_allowed, false);
assert.equal(model.parseRelevanceContext({ ...context, personalization_enabled: false, legacy_affinity_allowed: true }).legacy_affinity_allowed, false);
handler = async () => ({ data: { ...envelope, cursor: { ...cursor, position: 5 } } });
await assert.rejects(api.page(context), /expired/);
handler = async () => ({ data: { ...envelope, has_more: false, cursor: { ...cursor, position: 25 } } });
assert.equal((await api.page(context)).cursor.position, 25);
console.log('PASS final reset/opt-out/missing legacy permission cannot revive v2; nonboundary cursor rejected and terminal preserved');
console.log('PASS settings-only context fetch, bounded100/25 batches, parser rejects client promotion');
console.log('PASS native Community Relevance v3 focused checks');
