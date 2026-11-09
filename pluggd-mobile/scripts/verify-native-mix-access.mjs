import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const project = 'https://qkwvqmubhyondemhasjp.supabase.co';
const compiled = new Map();
let handleCounter = 0;
let now = 1_800_000_000_000;
let timerId = 0;
const timers = new Map();
function load(name) {
  if (compiled.has(name)) return compiled.get(name);
  const source = readFileSync(new URL(`../src/features/playback/${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'setTimeout', 'clearTimeout', 'Date', code)(
    (id) => {
      if (id === 'expo-crypto') return { randomUUID: () => `00000000-0000-4000-8000-${String(++handleCounter).padStart(12, '0')}` };
      if (id === '../../lib/supabase') return { supabase: { functions: { invoke: () => { throw new Error('Unexpected singleton invocation'); } } } };
      if (id === './mixAccessSession') return load('mixAccessSession');
      throw new Error(`Unexpected module: ${id}`);
    }, loaded, loaded.exports,
    { env: { EXPO_PUBLIC_SUPABASE_URL: project } },
    (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    (id) => timers.delete(id),
    class extends Date { static now() { return now; } },
  );
  compiled.set(name, loaded.exports);
  return loaded.exports;
}
const { MixAccessSession, MixSessionUnavailable } = load('mixAccessSession');
const { createNativeMixAccessClient, NativeMixAccessError } = load('nativeMixAccess');
const mixId = '10000000-0000-4000-8000-000000000001';
const otherMix = '10000000-0000-4000-8000-000000000002';
const owner = '20000000-0000-4000-8000-000000000001';
const other = '20000000-0000-4000-8000-000000000002';
const token = 'a'.repeat(64);
const signed = `${project}/storage/v1/object/sign/mix-media/${owner}/${mixId}/audio/set.mp3?token=synthetic`;
function envelope(visibility = 'unlisted', owns = false) {
  return { version: 1, mix: { id: mixId, slug: 'night-set', owner_user_id: owner,
    title: 'Synthetic mix', description: 'Fixture', audio_url: `mix:${mixId}`, cover_url: null,
    status: 'published', visibility, allow_download: false }, owner: owns, public: visibility === 'public',
    tracklist: [{ id: '30000000-0000-4000-8000-000000000001', position: 0, start_seconds: 0, raw_title: 'Opening', raw_artist: null, end_seconds: null }] };
}
function fixture(actor = null) {
  const session = new MixAccessSession();
  session.bindActor(actor);
  const calls = [];
  let response = { data: envelope(), error: null };
  let override;
  const client = createNativeMixAccessClient({ projectUrl: project, session,
    invoke: async (name, options) => { calls.push({ name, ...options }); return override ? override() : response; } });
  return { session, calls, client, set(value) { response = value; }, pending(value) { override = value; } };
}
let passed = 0;
async function check(name, run) {
  await run();
  assert.equal(timers.size, 0, `${name}: leaked request deadline`);
  passed++;
  console.log(`PASS ${name}`);
}

await check('cold fragment link becomes a memory-only opaque handle and binds after auth hydration', async () => {
  const session = new MixAccessSession();
  const path = session.rewriteLink(`https://pluggd.fm/mixes/${mixId}#token=${token}`);
  assert.ok(!path.includes(token) && !path.includes('#') && !path.includes('token='));
  const handle = new URL(path, project).searchParams.get('access');
  assert.throws(() => session.scope(), MixSessionUnavailable);
  session.bindActor(null);
  assert.equal(session.token(session.scope(), mixId, handle), token);
});
await check('warm native and alternate production host links retain scoped capability', async () => {
  for (const url of [`pluggd://mixes/${mixId}#token=${token}`, `pluggd:///mixes/${mixId}#token=${token}`, `https://pluggd.live/mixes/${mixId}#token=${token}`]) {
    const session = new MixAccessSession(); session.bindActor(owner);
    const path = session.rewriteLink(url);
    const key = new URL(path, project).searchParams.get('access');
    assert.equal(session.token(session.scope(), mixId, key), token);
    assert.ok(!path.includes(token));
  }
});
await check('ordinary Mix/auth/foreign links remain unchanged', async () => {
  const session = new MixAccessSession();
  for (const path of [`/mixes/${mixId}`, 'pluggd://auth/callback#access_token=synthetic', 'https://pluggd.fm/auth/callback?code=synthetic', `https://foreign.invalid/mixes/${mixId}#token=${token}`]) assert.equal(session.rewriteLink(path), path);
});
await check('query, duplicate, malformed and encoded-path capabilities fail closed without echoing secrets', async () => {
  const session = new MixAccessSession();
  for (const path of [`/mixes/${mixId}?token=${token}`, `/mixes/${mixId}#token=${token}&token=${token}`, `/mixes/${mixId}#token=malformed`, `https://pluggd.fm/mixes/%ZZ#token=${token}`, `/mixes/%2Fprivate#token=${token}`]) {
    const rewritten = session.rewriteLink(path);
    assert.ok(rewritten.includes('access=invalid') && !rewritten.includes(token) && !rewritten.includes('malformed'));
  }
});
await check('malformed trusted-host Mix origins remove the capability without changing unrelated auth links', async () => {
  const session = new MixAccessSession();
  for (const origin of ['http://pluggd.fm', 'https://user:password@pluggd.fm', 'https://pluggd.fm:444']) {
    const path = `${origin}/mixes/${mixId}#token=${token}`;
    const rewritten = session.rewriteLink(path);
    assert.ok(rewritten.includes('access=invalid') && !rewritten.includes(token) && !rewritten.includes('password'));
    const callback = `${origin}/auth/callback#access_token=synthetic`;
    assert.equal(session.rewriteLink(callback), callback);
  }
});
await check('capabilities are scoped to reference and session; actor changes notify and clear', async () => {
  const session = new MixAccessSession(); session.bindActor(null);
  const key = session.remember(mixId, token); const scope = session.scope();
  assert.throws(() => session.token(scope, otherMix, key), MixSessionUnavailable);
  assert.throws(() => session.token(scope, mixId, 'invalid'), MixSessionUnavailable);
  let changes = 0; const unsubscribe = session.subscribe(() => changes++);
  session.bindActor(owner); assert.equal(changes, 1);
  assert.throws(() => session.token(scope, mixId, key), MixSessionUnavailable);
  assert.throws(() => session.token(session.scope(), mixId, key), MixSessionUnavailable);
  session.bindActor(owner); assert.equal(changes, 1);
  unsubscribe(); session.bindActor(null); assert.equal(changes, 1);
});
await check('logout and return to same actor cannot revive old scope', async () => {
  const session = new MixAccessSession(); session.bindActor(owner);
  const scope = session.scope(); const key = session.remember(mixId, token);
  session.bindActor(null); session.bindActor(owner);
  assert.equal(session.current(scope), false);
  assert.throws(() => session.token(session.scope(), mixId, key), MixSessionUnavailable);
});
await check('session restart and bounded vault evict capabilities without disk state', async () => {
  const session = new MixAccessSession(); session.bindActor(null);
  const key = session.remember(mixId, token);
  for (let i = 0; i < 64; i++) session.remember(mixId, token);
  assert.throws(() => session.token(session.scope(), mixId, key), MixSessionUnavailable);
  const fresh = new MixAccessSession(); fresh.bindActor(null);
  assert.throws(() => fresh.token(fresh.scope(), mixId, key), MixSessionUnavailable);
});
await check('private owner permissions are bound to this exact app instance and canonical mix', async () => {
  const session = new MixAccessSession(); session.bindActor(owner);
  const access = session.authorize(session.scope(), mixId);
  assert.equal(session.authorized(mixId, access), true);
  assert.equal(session.authorized(otherMix, access), false);
  const restarted = new MixAccessSession(); restarted.bindActor(owner);
  assert.equal(restarted.current(access.scope), false);
  assert.equal(restarted.authorized(mixId, access), false);
});
await check('revoking one memory permission preserves other private permissions', async () => {
  const session = new MixAccessSession(); session.bindActor(owner);
  const access = session.authorize(session.scope(), mixId);
  const second = session.authorize(session.scope(), otherMix);
  const changes = []; session.subscribe(reason => changes.push(reason));
  session.invalidateAuthorization(access.authorizationId);
  assert.deepEqual(changes, ['authorization']);
  assert.equal(session.authorized(mixId, access), false);
  assert.equal(session.authorized(otherMix, second), true);
  const retry = session.authorize(session.scope(), mixId);
  assert.notEqual(retry.authorizationId, access.authorizationId);
});
await check('forgetting or evicting a bearer also invalidates its native playback permission', async () => {
  for (const evict of [false, true]) {
    const session = new MixAccessSession(); session.bindActor(null);
    const key = session.remember(mixId, token); const access = session.authorize(session.scope(), mixId, key);
    const changes = []; session.subscribe(reason => changes.push(reason));
    if (evict) for (let i = 0; i < 64; i++) session.remember(mixId, token);
    else session.forget(key);
    assert.equal(session.authorized(mixId, access), false);
    assert.deepEqual(changes, ['authorization']);
  }
});
await check('unlisted read sends identity/capability only and returns no hidden server extras', async () => {
  const f = fixture(); const key = f.session.remember('night-set', token);
  const data = envelope(); data.mix.token = token; data.mix.storage_path = 'secret/file'; data.token = token;
  f.set({ data, error: null }); const result = await f.client.read('night-set', key);
  assert.deepEqual(f.calls, [{ name: 'mix-access', body: { action: 'read', reference: 'night-set', token } }]);
  assert.equal(result.tracklist[0].mix_id, mixId);
  assert.ok(!JSON.stringify(result).includes(token) && !JSON.stringify(result).includes('secret/file'));
  assert.equal(f.session.token(f.session.scope(), mixId, key), token);
});
await check('public reads need no capability and retain public envelope', async () => {
  const f = fixture(); f.set({ data: envelope('public'), error: null });
  assert.equal((await f.client.read(mixId)).public, true);
  assert.deepEqual(f.calls[0].body, { action: 'read', reference: mixId });
});
await check('owner private read succeeds only under matching actor', async () => {
  const f = fixture(owner); f.set({ data: envelope('private', true), error: null });
  assert.equal((await f.client.read(mixId)).owner, true);
});
await check('owner public draft retains its existing public artwork but is protected metadata', async () => {
  const f = fixture(owner); const data = envelope('public', true);
  data.mix.status = 'draft'; data.public = false; data.mix.cover_url = 'https://public.example.test/legacy-cover.jpg';
  f.set({ data, error: null }); const result = await f.client.read(mixId);
  assert.equal(result.public, false); assert.equal(result.mix.cover_url, data.mix.cover_url);
});
await check('guest and wrong actor cannot treat an owner response as private access', async () => {
  for (const actor of [null, other]) {
    const f = fixture(actor); f.set({ data: envelope('private', true), error: null });
    await assert.rejects(() => f.client.read(mixId), NativeMixAccessError);
  }
});
await check('unlisted without current capability and private capability-only reads fail', async () => {
  const f = fixture(); await assert.rejects(() => f.client.read(mixId), NativeMixAccessError);
  const key = f.session.remember(mixId, token); f.set({ data: envelope('private'), error: null });
  await assert.rejects(() => f.client.read(mixId, key), NativeMixAccessError);
});
await check('wrong identities, protocol, public flags, audio pointers and track parents are rejected', async () => {
  for (const mutate of [d => d.mix.id = otherMix, d => d.version = 2, d => d.public = true,
    d => d.mix.audio_url = signed, d => d.tracklist[0].mix_id = otherMix, d => d.tracklist[0].start_seconds = -1]) {
    const f = fixture(); const key = f.session.remember(mixId, token); const data = envelope(); mutate(data); f.set({ data, error: null });
    await assert.rejects(() => f.client.read(mixId, key), NativeMixAccessError);
  }
});
await check('protected covers accept only project-signed protected media', async () => {
  for (const cover of ['https://foreign.invalid/image.jpg', `${project}/storage/v1/object/public/mix-media/image.jpg`, `${project}/storage/v1/object/sign/audio-files/private.jpg?token=synthetic`]) {
    const f = fixture(); const key = f.session.remember(mixId, token); const data = envelope(); data.mix.cover_url = cover; f.set({ data, error: null });
    await assert.rejects(() => f.client.read(mixId, key), NativeMixAccessError);
  }
  const f = fixture(); const key = f.session.remember(mixId, token); const data = envelope(); data.mix.cover_url = signed.replace('/audio/set.mp3', '/cover/art.jpg'); f.set({ data, error: null });
  assert.equal((await f.client.read(mixId, key)).mix.cover_url, data.mix.cover_url);
});
await check('capability converted to public retains ordinary public playback path', async () => {
  const f = fixture(); const key = f.session.remember(mixId, token); f.set({ data: envelope('public'), error: null });
  assert.equal((await f.client.read(mixId, key)).accessKey, undefined);
});
await check('protected playback uses scoped endpoint and conservative short expiry', async () => {
  const f = fixture(); const key = f.session.remember(mixId, token); now = 1_800_000_000_000;
  f.pending(() => { now += 1000; return { data: { url: signed, expiresIn: 300 }, error: null }; });
  assert.deepEqual(await f.client.play(mixId, key), { url: signed, expiresAt: 1_800_000_300_000 });
  assert.deepEqual(f.calls[0], { name: 'mix-access', body: { action: 'play', reference: mixId, token } });
});
await check('public playback retains four-hour grant without a capability', async () => {
  const f = fixture(); f.set({ data: { url: signed, expiresIn: 14400 }, error: null });
  assert.equal((await f.client.play(mixId)).expiresAt, now + 14_400_000);
});
await check('invalid grant durations and long capability grants fail closed', async () => {
  for (const expiresIn of [0, -1, 301, '300', Infinity, 14400]) {
    const f = fixture(); const key = f.session.remember(mixId, token); f.set({ data: { url: signed, expiresIn }, error: null });
    await assert.rejects(() => f.client.play(mixId, key), NativeMixAccessError);
  }
});
await check('private owner playback cannot accept a long public grant', async () => {
  const f = fixture(owner); f.set({ data: { url: signed, expiresIn: 14400 }, error: null });
  await assert.rejects(() => f.client.play(mixId, undefined, true), NativeMixAccessError);
});
await check('foreign, raw, credentialed and unsigned playback URLs cannot become fallback', async () => {
  for (const url of ['file:///private/set.wav', 'mix-media/private/set.wav', 'http://media.invalid/set.mp3', 'https://foreign.invalid/set.mp3', `${project}/storage/v1/object/public/mix-media/set.mp3`, signed.replace('https://', 'https://user:pass@'), signed.split('?')[0]]) {
    const f = fixture(); const key = f.session.remember(mixId, token); f.set({ data: { url, expiresIn: 300 }, error: null });
    await assert.rejects(() => f.client.play(mixId, key), NativeMixAccessError);
  }
});
await check('download uses same scoped authority and rejects unsafe filenames', async () => {
  const f = fixture(); const key = f.session.remember(mixId, token); f.set({ data: { url: signed, fileName: 'night-set.mp3' }, error: null });
  assert.deepEqual(await f.client.download(mixId, key), { url: signed, fileName: 'night-set.mp3' });
  assert.equal(f.calls[0].body.action, 'download');
  for (const fileName of ['', '../private.wav', 'folder\\private.wav', 'bad\u0000.wav']) {
    f.set({ data: { url: signed, fileName }, error: null }); await assert.rejects(() => f.client.download(mixId, key), NativeMixAccessError);
  }
});
await check('provider errors are classified without leaking bodies, token or URL', async () => {
  for (const [status, reason] of [[401, 'authentication'], [404, 'notFound'], [503, 'unavailable']]) {
    const f = fixture(); f.set({ data: null, error: { context: { status }, secret: token, url: signed } });
    await assert.rejects(() => f.client.read(mixId), error => error.reason === reason && !String(error).includes(token) && !String(error).includes(signed));
  }
});
await check('actor switch while read is in flight suppresses old private result', async () => {
  const f = fixture(owner); let finish; f.pending(() => new Promise(resolve => finish = resolve));
  const pending = f.client.read(mixId); f.session.bindActor(other); finish({ data: envelope('private', true), error: null });
  await assert.rejects(() => pending, NativeMixAccessError);
});
await check('logout while playback grant is in flight cannot return old source', async () => {
  const f = fixture(owner); let finish; f.pending(() => new Promise(resolve => finish = resolve));
  const pending = f.client.play(mixId); f.session.bindActor(null); finish({ data: { url: signed, expiresIn: 300 }, error: null });
  await assert.rejects(() => pending, NativeMixAccessError);
});
await check('timeout clears request deadline and never exposes a late source', async () => {
  const f = fixture(); let finish; f.pending(() => new Promise(resolve => finish = resolve));
  const pending = f.client.play(mixId);
  assert.equal(timers.size, 1); const timer = [...timers.values()][0]; assert.equal(timer.delay, 8000); timer.callback();
  await assert.rejects(() => pending, NativeMixAccessError);
  finish({ data: { url: signed, expiresIn: 14400 }, error: null });
});
await check('expired/restarted handle fails before any network request', async () => {
  const f = fixture(); await assert.rejects(() => f.client.read(mixId, 'invalid'), NativeMixAccessError);
  assert.equal(f.calls.length, 0);
});
await check('public fallback decoder rejects private/draft/stale rows and strips raw asset pointers', async () => {
  const f = fixture(owner); const scope = f.session.scope();
  const raw = envelope('public', true).mix; raw.audio_url = 'foreign/raw.mp3'; raw.token = token;
  const detail = f.client.publicEnvelope(mixId, raw, [], scope);
  assert.equal(detail.mix.audio_url, `mix:${mixId}`); assert.equal(detail.owner, true);
  assert.equal(detail.playbackAccess, undefined); assert.ok(!JSON.stringify(detail).includes(token));
  for (const changed of [{ ...raw, visibility: 'private' }, { ...raw, status: 'draft' }]) assert.throws(() => f.client.publicEnvelope(mixId, changed, [], scope), NativeMixAccessError);
  f.session.bindActor(other); assert.throws(() => f.client.publicEnvelope(mixId, raw, [], scope), MixSessionUnavailable);
});
await check('owner permission does not depend on an incoming capability after verified owner read', async () => {
  const f = fixture(owner); const key = f.session.remember(mixId, token);
  f.set({ data: envelope('unlisted', true), error: null });
  const detail = await f.client.read(mixId, key);
  f.session.forget(key);
  assert.equal(detail.accessKey, undefined); assert.equal(detail.playbackAccess.accessKey, undefined);
  assert.equal(f.session.authorized(mixId, detail.playbackAccess), true);
});
await check('metadata freshness starts at request rather than late response time', async () => {
  const f = fixture(owner); f.set({ data: envelope('private', true), error: null });
  const started = now; f.pending(async () => { now += 2000; return { data: envelope('private', true), error: null }; });
  const detail = await f.client.read(mixId); assert.equal(detail.metadataReadAt, started);
});
await check('observable revision changes on single permission loss without changing actor identity', async () => {
  const f = fixture(owner); const identity = f.session.identityKey(); const revision = f.session.version();
  const access = f.session.authorize(f.session.scope(), mixId);
  f.session.invalidateAuthorization(access.authorizationId);
  assert.equal(f.session.identityKey(), identity); assert.equal(f.session.version(), revision + 1);
});
await check('presentation cache is memory/permission bound and returns only copied presentation fields', async () => {
  const f = fixture(owner); const data = envelope('private', true); data.mix.cover_url = signed.replace('/audio/set.mp3', '/cover/art.jpg');
  f.set({ data, error: null }); const detail = await f.client.read(mixId);
  const value = f.client.presentation(mixId, detail.playbackAccess);
  assert.equal(value.artwork, data.mix.cover_url); assert.equal(value.mixMetadataReadAt, now);
  value.title = 'Changed copy'; assert.equal(f.client.presentation(mixId, detail.playbackAccess).title, 'Synthetic mix');
  assert.equal(f.client.presentation(otherMix, detail.playbackAccess), undefined);
  assert.ok(!JSON.stringify(value).includes(token));
  f.session.invalidateAuthorization(detail.playbackAccess.authorizationId);
  assert.equal(f.client.presentation(mixId, detail.playbackAccess), undefined);
});
await check('actor change invalidates cached private presentation', async () => {
  const f = fixture(owner); f.set({ data: envelope('private', true), error: null });
  const detail = await f.client.read(mixId); f.session.bindActor(other);
  assert.equal(f.client.presentation(mixId, detail.playbackAccess), undefined);
});
await check('presentation refresh requires existing permission and preserves a verified public transition', async () => {
  const f = fixture(owner); f.set({ data: envelope('private', true), error: null });
  const detail = await f.client.read(mixId); f.set({ data: envelope('public', true), error: null });
  const value = await f.client.refreshPresentation(mixId, detail.playbackAccess);
  assert.equal(value.public, true); assert.equal(f.client.presentation(mixId, detail.playbackAccess).public, true);
  const count = f.calls.length; f.session.invalidateAuthorization(detail.playbackAccess.authorizationId);
  await assert.rejects(() => f.client.refreshPresentation(mixId, detail.playbackAccess), NativeMixAccessError);
  assert.equal(f.calls.length, count, 'lost permission cannot start a metadata request');
});
await check('owner link actions accept only the exact Mix response and put the capability in a fragment',async()=>{
  const f=fixture(owner);f.set({data:{mixId,token},error:null});const link=await f.client.createLink(mixId);
  assert.equal(link,`https://pluggd.fm/mixes/${mixId}#token=${token}`);assert.deepEqual(f.calls[0].body,{action:'createLink',reference:mixId});
  f.set({data:{mixId:otherMix,token},error:null});await assert.rejects(f.client.createLink(mixId),NativeMixAccessError);
  f.set({data:{revoked:true},error:null});await f.client.revokeLink(mixId);assert.equal(f.calls.at(-1).body.action,'revokeLink');
});
await check('owner link handoff is rejected after actor change and guests cannot create links',async()=>{
  const guest=fixture(null);await assert.rejects(guest.client.createLink(mixId),NativeMixAccessError);assert.equal(guest.calls.length,0);
  const f=fixture(owner);let finish;f.pending(()=>new Promise(resolve=>{finish=resolve;}));const work=f.client.createLink(mixId);
  f.session.bindActor(other);finish({data:{mixId,token},error:null});await assert.rejects(work,NativeMixAccessError);
});
console.log(`PASS: ${passed} actual-source native Mix access/link scenarios; no hosted calls, device or UI acceptance.`);
