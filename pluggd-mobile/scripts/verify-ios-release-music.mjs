import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name] ?? require(name), fetch: (...args) => http(...args), process, URL, AbortController, Uint8Array, Date, Map, Set, JSON, Error }, { filename: path });
  return module.exports;
}
let http = () => { throw new Error('Unexpected request'); };
const model = load('../src/features/social-music/model.ts', {});
const route = { draftActorId: 'qa-user', releaseId: 'release', trackId: 'track', content: 'Private caption', destinations: '[{"destination_type":"creator_community","destination_id":"private"}]', mediaUri: 'file:///private/photo.jpg', mediaKind: 'photo', mimeType: 'image/jpeg' };
assert.equal(model.actorMusicRouteParams(route, 'qa-user'), route);
for (const actor of ['other-user', undefined]) {
  const safe = model.actorMusicRouteParams(route, actor);
  assert.equal(safe.releaseId, 'release'); assert.equal(safe.trackId, 'track');
  for (const field of ['content', 'destinations', 'mediaUri', 'mediaKind', 'mimeType', 'draftActorId']) assert.equal(safe[field], undefined);
}
assert.equal(model.actorMusicRouteParams({ ...route, draftActorId: undefined }, 'qa-user').mediaUri, undefined);
assert.equal(model.formatMusicTime(15.1 - 15, true), '0:00.1');
assert.equal(model.formatMusicTime(4.6, true), '0:04.6');
assert.equal(model.formatMusicTime(59.99, true), '1:00.0');
for (let trackDuration = 1; trackDuration <= 240; trackDuration += 7) {
  for (const contentDuration of [1, 5, 12.3, 15, 30]) {
    const edit = model.fitRecipe({ startSeconds: 999, durationSeconds: 99, timelineOffsetSeconds: 999, contentDurationSeconds: contentDuration, musicGain: 2, originalGain: -1 }, trackDuration);
    assert.ok(edit.startSeconds + edit.durationSeconds <= trackDuration + 0.00001);
    assert.ok(edit.timelineOffsetSeconds + edit.durationSeconds <= contentDuration + 0.00001);
    assert.ok(edit.durationSeconds >= 1 && edit.durationSeconds <= 30);
    assert.equal(edit.musicGain, 1); assert.equal(edit.originalGain, 0);
  }
}
const postId = '00000000-0000-4000-8000-000000000001';
assert.equal(model.musicPostId(`https://pluggd.fm/api/social-music-playback?postId=${postId}`), postId);
for (const uri of [`http://pluggd.fm/api/social-music-playback?postId=${postId}`, `https://other.example/api/social-music-playback?postId=${postId}`, 'https://pluggd.fm/api/social-music-playback?postId=no', 'file:///preview.mp4']) assert.equal(model.musicPostId(uri), null);

const values = new Map(), files = new Map();
let failCopy = false;
class File {
  constructor(...parts) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); }
  get name() { return this.uri.split('/').pop(); }
  get exists() { return files.has(this.uri); }
  get size() { return files.get(this.uri)?.length || 0; }
  write(bytes) { files.set(this.uri, bytes); }
  copy(to) { files.set(to.uri, files.get(this.uri)); if (failCopy) throw new Error('Partial copy'); }
  delete() { files.delete(this.uri); }
}
class Directory { constructor(...parts) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); } create() {} }
const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { values.set(k, v); }, removeItem: async k => { values.delete(k); } };
let actorId = 'qa-user', sessionToken = 'local-fixture-token';
let uuid = 0, uploadLost = false, prepareLost = false, renderLost = false, publishLost = false, signed = true, status = 'pending';
const calls = { uploads: 0, prepare: [], render: 0, publish: [], list: 0 };
const track = { release_id: 'release', release_title: 'Release', artist: 'Artist', cover_art_url: null, track_id: 'track', track_title: 'Sound', duration: 120 };
const db = {
  auth: { getSession: async () => ({ data: { session: signed ? { access_token: sessionToken, user: { id: actorId } } : null }, error: null }) },
  rpc: async (name, args) => {
    if (name === 'prepare_social_music_render') {
      calls.prepare.push(args);
      if (prepareLost) { prepareLost = false; return { data: null, error: { message: 'Lost response' } }; }
      return { data: 'job', error: null };
    }
    return { data: [track], error: null };
  },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { status }, error: null }) }) }) }),
  storage: { from: () => ({
    list: async () => { calls.list++; return { data: [{ name: 'source.jpg', metadata: { size: 10 } }], error: null }; },
    createSignedUrl: async () => ({ data: { signedUrl: 'https://qa.example/preview.mp4' }, error: null }),
  }) },
};
const service = load('../src/features/social-music/service.ts', {
  '@react-native-async-storage/async-storage': { default: storage, __esModule: true },
  'expo-crypto': { randomUUID: () => `request-${++uuid}` },
  'expo-file-system': { File, Directory, Paths: { cache: 'cache', document: 'documents' } },
  '../../lib/supabase': { supabase: db }, './model': model,
  '../../lib/storageUpload': { uploadFileToSupabaseStorage: async () => { calls.uploads++; if (uploadLost) throw new Error('Lost upload response'); } },
});
http = async (url, options) => {
  assert.equal(options.headers.Authorization, 'Bearer local-fixture-token');
  const body = JSON.parse(options.body);
  if (url.endsWith('social-music-render')) {
    calls.render++; status = 'ready'; if (renderLost) { renderLost = false; throw new Error('Lost render response'); }
    return { ok: true, json: async () => ({ status: 'ready' }) };
  }
  if (url.endsWith('social-music-publish')) {
    calls.publish.push(body); status = 'published'; if (publishLost) { publishLost = false; throw new Error('Lost publish response'); }
    return { ok: true, json: async () => ({ postId: body.postId, status: 'published' }) };
  }
  if (url.endsWith('social-music-playback')) return { ok: true, json: async () => ({ url: 'https://other.example/credential-trap' }) };
  if (url.endsWith('social-music-preview')) return { ok: true, headers: new Headers({ 'content-type': 'audio/mpeg', 'X-PLUGGD-Track-Duration': '120', 'X-PLUGGD-Waveform': JSON.stringify(Array(256).fill(40)) }), arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
  throw new Error('Unexpected endpoint');
};
let draft = service.newMusicDraft('qa-user');
draft.media = { uri: 'fixture.jpg', kind: 'photo', mimeType: 'image/jpeg', duration: 15, fileSize: 10 }; draft.track = track;
const checkpoint = async value => { draft = { ...value }; await service.saveMusicDraft(draft); };
uploadLost = true; prepareLost = true;
await assert.rejects(() => service.renderMusicDraft(draft, checkpoint), /Lost response/);
assert.equal(calls.uploads, 1); assert.equal(calls.list, 1);
assert.equal((await service.readMusicDraft('qa-user')).sourcePath, draft.sourcePath);
const requestId = draft.requestId, stablePostId = draft.postId;
renderLost = true;
await assert.rejects(() => service.renderMusicDraft(draft, checkpoint), /Lost render response/);
const result = await service.renderMusicDraft(draft, checkpoint);
assert.equal(result.published, false); assert.equal(calls.render, 1); assert.equal(calls.uploads, 1);
assert.equal(calls.prepare[0].p_request_id, requestId); assert.equal(calls.prepare[1].p_request_id, requestId);
const approvedHttp = http;
http = async (url, options) => url.endsWith('social-music-publish') ? { ok: true, json: async () => ({ status: 'pending_review', postId: JSON.parse(options.body).postId }) } : approvedHttp(url, options);
const pending = await service.publishMusicDraft(draft);
assert.equal(pending.status, 'pending_review');
await checkpoint({ ...draft, reviewPending: true });
assert.equal((await service.readMusicDraft('qa-user')).reviewPending, true);
assert.equal((await service.readMusicDraft('qa-user')).postId, stablePostId);
assert.equal((await service.publishMusicDraft(draft)).status, 'pending_review');
assert.equal(status, 'ready');
http = async (url, options) => url.endsWith('social-music-publish') ? { ok: false, json: async () => ({ error: 'This content cannot be published' }) } : approvedHttp(url, options);
await assert.rejects(() => service.publishMusicDraft(draft), /cannot be published/);
assert.equal((await service.readMusicDraft('qa-user')).postId, stablePostId);
http = approvedHttp;
publishLost = true;
await assert.rejects(() => service.publishMusicDraft(draft), /Lost publish response/);
assert.equal((await service.publishMusicDraft(draft)).postId, stablePostId);
assert.equal(calls.publish[0].postId, calls.publish[1].postId);
const published = await service.renderMusicDraft(draft, checkpoint);
assert.equal(published.published, true); assert.equal(calls.render, 1);
status = 'processing'; await assert.rejects(() => service.renderMusicDraft(draft, checkpoint), /still being prepared/); assert.equal(calls.render, 1);
signed = false; await assert.rejects(() => service.publishMusicDraft(draft), /Sign in again/); signed = true;
await assert.rejects(() => service.musicPlayback(postId), /unavailable/);
signed = false; assert.equal(await service.musicPlayback(postId), `https://pluggd.fm/api/social-music-playback?postId=${postId}`); signed = true;
const clip = await service.loadMusicAudition('track', 7.3, 15);
assert.equal(clip.waveform.length, 256); assert.equal(clip.trackDuration, 120); assert.ok(files.has(clip.uri)); clip.dispose(); assert.ok(!files.has(clip.uri));
const abort = new AbortController(); abort.abort(); await assert.rejects(() => service.loadMusicAudition('track', 0, 15, abort.signal), /session changed|cancelled/);
await service.rememberMusic('qa-user', 'saved', track);
assert.equal((await service.loadPersonalMusic('qa-user', 'saved')).length, 1);
await service.rememberMusic('qa-user', 'saved', track, true);
assert.equal((await service.loadPersonalMusic('qa-user', 'saved')).length, 0);
const localName = '00000000-0000-4000-8000-000000000016.jpg';
const localUri = `documents/pluggd-music-drafts/${localName}`;
files.set(localUri, new Uint8Array(12));
const movedDraft = service.newMusicDraft('qa-user');
movedDraft.media = { uri: `old-container/pluggd-music-drafts/${localName}`, localName, kind: 'photo', mimeType: 'image/jpeg', duration: 15 };
await service.saveMusicDraft(movedDraft);
const restored = await service.readMusicDraft('qa-user');
assert.equal(restored.media.uri, localUri); assert.equal(restored.media.fileSize, 12);
service.removeMusicMedia(restored.media); assert.ok(!files.has(localUri));
assert.equal((await service.readMusicDraft('qa-user')).media, null);
const unrelated = { uri: 'documents/unrelated.jpg', kind: 'photo', mimeType: 'image/jpeg', duration: 15 };
files.set(unrelated.uri, new Uint8Array(5));
service.removeMusicMedia(unrelated); assert.ok(files.has(unrelated.uri));
await service.clearMusicDraft('qa-user'); assert.equal(await service.readMusicDraft('qa-user'), null);
// Real module, isolated services: account/token changes must discard pending bytes/URLs.
const nextTick = () => new Promise(resolve => setImmediate(resolve));
const signedOrigin = 'https://fixture.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_URL = signedOrigin;
let finishRequest;
http = async () => new Promise(resolve => { finishRequest = resolve; });
const pendingPlayback = service.musicPlayback(postId);
await nextTick();
actorId = 'other-user';
finishRequest({ ok: true, json: async () => ({ url: `${signedOrigin}/storage/v1/object/sign/social-music-published/qa-user/post/video.mp4?token=private-fixture` }) });
await assert.rejects(() => pendingPlayback, /session changed/);
actorId = 'qa-user';
const pendingTokenPlayback = service.musicPlayback(postId);
await nextTick(); sessionToken = 'refreshed-fixture-token';
finishRequest({ ok: true, json: async () => ({ url: `${signedOrigin}/storage/v1/object/sign/social-music-published/qa-user/post/video.mp4?token=private-fixture` }) });
await assert.rejects(() => pendingTokenPlayback, /session changed/);
sessionToken = 'local-fixture-token';
const fileCount = files.size;
const pendingAudition = service.loadMusicAudition('track', 0, 15);
await nextTick(); actorId = 'other-user';
finishRequest({ ok: true, headers: new Headers({ 'content-type': 'audio/mpeg', 'X-PLUGGD-Track-Duration': '120', 'X-PLUGGD-Waveform': JSON.stringify(Array(256).fill(40)) }), arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
await assert.rejects(() => pendingAudition, /session changed/); assert.equal(files.size, fileCount);
const uploadsBefore = calls.uploads, preparesBefore = calls.prepare.length;
await assert.rejects(() => service.renderMusicDraft(draft, checkpoint), /session changed/);
await assert.rejects(() => service.publishMusicDraft(draft), /session changed/);
await assert.rejects(() => service.readyMusicPreview('qa-user', 'job'), /session changed/);
await assert.rejects(() => service.rememberMusic('qa-user', 'saved', track), /session changed/);
assert.equal(calls.uploads, uploadsBefore); assert.equal(calls.prepare.length, preparesBefore);
actorId = 'qa-user';
const abortPlayback = new AbortController();
const pendingAborted = service.musicPlayback(postId, abortPlayback.signal);
await nextTick(); abortPlayback.abort();
finishRequest({ ok: true, json: async () => ({ url: `${signedOrigin}/storage/v1/object/sign/social-music-published/post/video.mp4?token=private-fixture` }) });
await assert.rejects(() => pendingAborted, /session changed/);
for (const denial of ['Session expired', 'Video is unavailable', 'Membership has expired', 'Source withdrawn', 'Blocked creator']) {
  http = async () => ({ ok: false, json: async () => ({ error: denial }) });
  await assert.rejects(() => service.musicPlayback(postId), error => error.message === denial);
  assert.equal(files.size, fileCount);
}
http = async () => ({ ok: true, json: async () => ({ url: `${signedOrigin}/storage/v1/object/sign/social-music-published/post/video.mp4?token=private-fixture` }) });
assert.match(await service.musicPlayback(postId), /object\/sign\/social-music-published/);
// Ready-preview signing is actor-bound even when the storage SDK ignores cancellation.
const storageSigner = db.storage.from;
db.storage.from = () => ({ createSignedUrl: async () => { actorId = 'other-user'; return { data: { signedUrl: 'https://fixture/old-private-preview' }, error: null }; } });
await assert.rejects(() => service.readyMusicPreview('qa-user', 'job'), /session changed/);
db.storage.from = storageSigner; actorId = 'qa-user';
// Expiry deletes only this old draft's owned media; acknowledged other-actor media survives.
const oldName = '00000000-0000-4000-8000-000000000026.jpg';
const otherName = '00000000-0000-4000-8000-000000000027.jpg';
const expiredMedia = `documents/pluggd-music-drafts/${oldName}`, otherMedia = `documents/pluggd-music-drafts/${otherName}`;
files.set(expiredMedia, new Uint8Array(4)); files.set(otherMedia, new Uint8Array(5));
const expiredDraft = { ...service.newMusicDraft('qa-user'), updatedAt: Date.now() - 8 * 86400_000, media: { uri: expiredMedia, localName: oldName, kind: 'photo', mimeType: 'image/jpeg', duration: 15 } };
values.set('pluggd.music.draft.qa-user', JSON.stringify(expiredDraft));
values.set('pluggd.music.draft.other-user', JSON.stringify({ ...service.newMusicDraft('other-user'), media: { uri: otherMedia, localName: otherName, kind: 'photo', mimeType: 'image/jpeg', duration: 15 } }));
assert.equal(await service.readMusicDraft('qa-user'), null); assert.ok(!files.has(expiredMedia)); assert.ok(files.has(otherMedia));
assert.equal((await service.readMusicDraft('other-user')).media.uri, otherMedia);
// A lost actor during native upload or prepare cannot checkpoint a job under another session.
const savedRpc = db.rpc;
const uploadDraft = { ...service.newMusicDraft('qa-user'), media: { uri: 'fixture.jpg', kind: 'photo', mimeType: 'image/jpeg', duration: 15, fileSize: 10 }, track };
let staleCheckpoints = 0;
db.rpc = async (name, args) => { if (name === 'prepare_social_music_render') { actorId = 'other-user'; return { data: 'stale-job', error: null }; } return savedRpc(name, args); };
await assert.rejects(() => service.renderMusicDraft(uploadDraft, async next => { staleCheckpoints++; assert.equal(next.jobId, undefined); }), /session changed/);
assert.equal(staleCheckpoints, 2); // Only owned upload and stable pre-request identity were acknowledged.
db.rpc = savedRpc; actorId = 'qa-user';
// Partially copied fresh files are removed, while the selected original remains untouched.
files.set('fixture-copy.jpg', new Uint8Array(8)); const beforeCopy = files.size; failCopy = true;
await assert.rejects(() => service.keepMusicMedia({ uri: 'fixture-copy.jpg', kind: 'photo', mimeType: 'image/jpeg', duration: 15 }), /could not be kept/);
failCopy = false; assert.equal(files.size, beforeCopy); assert.ok(files.has('fixture-copy.jpg'));
// Saved/current eligibility is re-read from the trusted catalogue; withdrawn history is hidden.
await service.rememberMusic('qa-user', 'saved', track);
db.rpc = async () => ({ data: [], error: null });
assert.equal((await service.loadPersonalMusic('qa-user', 'saved')).length, 0);
db.rpc = savedRpc;
// Cancelled server jobs need a new remote identity while preserving only owned local media.
status = 'cancelled';
await assert.rejects(() => service.renderMusicDraft({ ...draft, sourcePath: 'qa-user/expired/source.jpg', jobId: 'expired-job' }, checkpoint), /expired.*new preview/);
const renewName = '00000000-0000-4000-8000-000000000028.jpg';
const renewUri = `documents/pluggd-music-drafts/${renewName}`; files.set(renewUri, new Uint8Array(6));
const oldJob = { ...draft, sourcePath: 'qa-user/expired/source.jpg', jobId: 'expired-job', content: 'Keep caption', destinations: [{ destination_type: 'creator_community', destination_id: 'private-community' }], media: { uri: renewUri, localName: renewName, kind: 'photo', mimeType: 'image/jpeg', duration: 15 } };
const renewed = await service.renewMusicDraft(oldJob);
assert.equal(renewed.sourcePath, undefined); assert.equal(renewed.jobId, undefined); assert.equal(renewed.media.uri, renewUri);
assert.equal(renewed.content, oldJob.content); assert.equal(renewed.destinations, oldJob.destinations); assert.ok(files.has(renewUri));
for (const field of ['uploadId', 'requestId', 'postId']) assert.notEqual(renewed[field], oldJob[field]);
files.delete(renewUri); assert.equal((await service.renewMusicDraft(oldJob)).media, null);
assert.equal((await service.renewMusicDraft({ ...oldJob, media: { ...oldJob.media, uri: 'documents/unrelated.jpg', localName: undefined } })).media, null);
actorId = 'other-user';
await assert.rejects(() => service.renewMusicDraft(oldJob), /session changed/);
actorId = 'qa-user';
console.log('PASS: native actor/token/abort response boundaries, no stale bytes or signer URL, wrong-owner mutations blocked before upload/RPC, private withdrawal/block/expiry/auth denial and safe retry, per-actor draft expiry preserves other acknowledged media. Fixture services only.');
console.log('PASS: pending/rejected draft retention and approved retry, bounded segment/timeline, trusted playback origin, lost upload/prepare/render/publish retries, stable IDs, processing/auth gates, bounded waveform audition, cancellation, personal saved sounds, sandbox-moved draft recovery and scoped file deletion. Fixture services only; live/native UI evidence is recorded separately.');
