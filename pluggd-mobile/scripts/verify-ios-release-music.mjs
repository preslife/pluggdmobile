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
class File {
  constructor(...parts) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); }
  get name() { return this.uri.split('/').pop(); }
  get exists() { return files.has(this.uri); }
  get size() { return files.get(this.uri)?.length || 0; }
  write(bytes) { files.set(this.uri, bytes); }
  copy(to) { files.set(to.uri, files.get(this.uri)); }
  delete() { files.delete(this.uri); }
}
class Directory { constructor(...parts) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); } create() {} }
const storage = { getItem: async k => values.get(k) ?? null, setItem: async (k, v) => { values.set(k, v); }, removeItem: async k => { values.delete(k); } };
let uuid = 0, uploadLost = false, prepareLost = false, renderLost = false, publishLost = false, signed = true, status = 'pending';
const calls = { uploads: 0, prepare: [], render: 0, publish: [], list: 0 };
const track = { release_id: 'release', release_title: 'Release', artist: 'Artist', cover_art_url: null, track_id: 'track', track_title: 'Sound', duration: 120 };
const db = {
  auth: { getSession: async () => ({ data: { session: signed ? { access_token: 'local-fixture-token' } : null }, error: null }) },
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
publishLost = true;
await assert.rejects(() => service.publishMusicDraft(draft), /Lost publish response/);
assert.equal(await service.publishMusicDraft(draft), stablePostId);
assert.equal(calls.publish[0].postId, calls.publish[1].postId);
const published = await service.renderMusicDraft(draft, checkpoint);
assert.equal(published.published, true); assert.equal(calls.render, 1);
status = 'processing'; await assert.rejects(() => service.renderMusicDraft(draft, checkpoint), /still being prepared/); assert.equal(calls.render, 1);
signed = false; await assert.rejects(() => service.publishMusicDraft(draft), /Sign in again/); signed = true;
await assert.rejects(() => service.musicPlayback(postId), /unavailable/);
signed = false; assert.equal(await service.musicPlayback(postId), `https://pluggd.fm/api/social-music-playback?postId=${postId}`); signed = true;
const clip = await service.loadMusicAudition('track', 7.3, 15);
assert.equal(clip.waveform.length, 256); assert.equal(clip.trackDuration, 120); assert.ok(files.has(clip.uri)); clip.dispose(); assert.ok(!files.has(clip.uri));
const abort = new AbortController(); abort.abort(); await assert.rejects(() => service.loadMusicAudition('track', 0, 15, abort.signal), /cancelled/);
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
console.log('PASS: bounded segment/timeline, trusted playback origin, lost upload/prepare/render/publish retries, stable IDs, processing/auth gates, bounded waveform audition, cancellation, personal saved sounds, sandbox-moved draft recovery and scoped file deletion. Fixture services only; live/native UI evidence is recorded separately.');
