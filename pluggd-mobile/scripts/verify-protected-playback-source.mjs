import assert from 'node:assert/strict';
import { releaseAgeCatalog } from './fixtures/releaseAgeCatalog.mjs';
import { releasePlayableUrl } from './fixtures/releasePlayableUrl.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const requests = [];
const project = 'https://qkwvqmubhyondemhasjp.supabase.co';
const scheduled = new Map();
let now = 1_800_000_000_000;
let timerId = 0;
let invokeOverride;
let response = { data: { signedUrl: 'https://preview.example/stream.mp3?token=short-lived', expiresIn: 300 }, error: null };
const ageCatalog = releaseAgeCatalog({ releaseRows: [
  { id: 'release-1', user_id: 'owner', explicit: false },
  { id: 'release-2', user_id: 'owner', explicit: false, audio_url: 'https://cdn.example/release.mp3' },
], trackRows: [{ id: 'track-1', release_id: 'release-1', explicit: false, audio_url: 'https://storage.example/storage/v1/object/sign/audio-files/muse.mp3?token=expired' }] });
const supabase = { ...ageCatalog,
  functions: {
    invoke: async (name, options) => {
      requests.push({ name, body: options.body });
      return invokeOverride ? invokeOverride() : response;
    },
  },
};
const modules = new Map();
let uuidCounter = 0;
function loadModule(file) {
  if (modules.has(file)) return modules.get(file);
  const source = readFileSync(new URL(`../src/features/playback/${file}.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'Date', 'process', 'setTimeout', 'clearTimeout', compiled)(
  (name) => {
    if (name === '../live/battleService') return { battleAudioUrl: async () => 'https://media.example.test/battle.m4a' };
    if (name === '../../lib/mobileContent') return { releasePlayableUrl };
    if (name === 'expo-crypto') return { randomUUID: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}` };
    if (name.startsWith('./')) return loadModule(name.slice(2));
    assert.equal(name, '../../lib/supabase');
    return { supabase };
  },
  loaded,
  loaded.exports,
  class extends Date { static now() { return now; } },
  { env: { EXPO_PUBLIC_SUPABASE_URL: project } },
  (callback, delay) => { const id = ++timerId; scheduled.set(id, { callback, delay }); return id; },
  (id) => scheduled.delete(id),
);
  modules.set(file, loaded.exports);
  return loaded.exports;
}
const { resolvePlaybackSource, resolvePlaybackTrack, canRefreshPlaybackSource, playbackSourceNeedsRefresh } = loadModule('resolvePlaybackSource');

const beat = {
  id: 'beat-1', beatId: 'beat-1', type: 'beat',
  url: 'beat-license-files/producer/paid-master.wav', title: 'Preview', artist: 'Producer',
};
assert.equal(await resolvePlaybackSource(beat), response.data.signedUrl);
assert.deepEqual(requests.pop(), {
  name: 'resolve-playback-url',
  body: { contentId: 'beat-1', contentType: 'beat' },
});

response = { data: null, error: new Error('signer unavailable') };
assert.equal(await resolvePlaybackSource(beat), null, 'a paid Beat path must never become a fallback playback URL');

response = { data: { signedUrl: 'https://preview.example/channel-one.mp3?token=fresh', expiresIn: 300 }, error: null };
const mix = {
  id: 'mix-1', mixId: 'mix-1', type: 'mix',
  url: 'https://storage.example/storage/v1/object/public/audio-files/channel-one.mp3',
  title: 'Channel One', artist: 'DJ',
};
assert.equal(await resolvePlaybackSource(mix), response.data.signedUrl);
assert.deepEqual(requests.pop(), {
  name: 'resolve-playback-url',
  body: { contentId: 'mix-1', contentType: 'mix' },
});

const privateRelease = {
  id: 'track-1', trackId: 'track-1', releaseId: 'release-1', type: 'release',
  url: 'https://storage.example/storage/v1/object/sign/audio-files/muse.mp3?token=expired',
  title: 'Muse', artist: 'Artist',
};
assert.equal(await resolvePlaybackSource(privateRelease), response.data.signedUrl);
assert.deepEqual(requests.pop(), {
  name: 'resolve-playback-url',
  body: { contentId: 'track-1', contentType: 'release' },
});

const release = { id: 'release-2', type: 'release', url: 'https://cdn.example/release.mp3', title: 'Release', artist: 'Artist' };
const requestCount = requests.length;
assert.equal(await resolvePlaybackSource(release), release.url);
assert.equal(requests.length, requestCount, 'unrelated public release playback must keep its existing source');

console.log('existing Beat/Mix/release/public source controls: PASS');

const sampleId = '10000000-0000-4000-8000-000000000001';
const packId = '20000000-0000-4000-8000-000000000001';
const privateFile = `${project}/storage/v1/object/public/sample-pack-files/synthetic/preview.wav`;
const signed = 'https://media.example.test/verified.wav?token=synthetic';
const sample = { id: sampleId, sampleId, samplePackId: packId, type: 'sample', url: privateFile, title: 'Preview', artist: 'Fixture' };
const pack = { id: packId, samplePackId: packId, type: 'sample_pack', url: privateFile, title: 'Pack preview', artist: 'Fixture' };
let scenarios = 4;
async function check(name, run) {
  requests.length = 0; now = 1_800_000_000_000; invokeOverride = undefined;
  response = { data: { url: signed, expiresIn: 900, access: 'preview' }, error: null };
  await run(); assert.equal(scheduled.size, 0, name + ': timeout leaked');
  scenarios++; console.log('PASS ' + name);
}
await check('existing battle-audio renewal stays on its own authenticated path', async () => {
  const track = { ...sample, type: 'preview', url: `${project}/storage/v1/object/sign/battle-audio/room/clip.m4a?token=synthetic` };
  assert.equal(await resolvePlaybackSource(track), 'https://media.example.test/battle.m4a');
  assert.equal(requests.length, 0);
});
await check('private sample asks for its identities, never a raw storage path', async () => {
  const track = await resolvePlaybackTrack(sample);
  assert.equal(track.url, signed); assert.equal(canRefreshPlaybackSource(sample), true);
  assert.deepEqual(requests, [{ name: 'get-sample-pack-sample-url', body: { sampleId, samplePackId: packId, intent: 'stream' } }]);
  assert.equal(track.playbackSource.originalUrl, privateFile);
});
await check('pack preview cannot become an archive or caller-selected sample request', async () => {
  assert.equal(await resolvePlaybackSource({ ...pack, sampleId }), signed);
  assert.deepEqual(requests, [{ name: 'get-sample-pack-sample-url', body: { samplePackId: packId, intent: 'stream' } }]);
});
for (const mode of ['public', 'sign', 'authenticated']) {
  await check(mode + ' locator uses the sample endpoint', async () => {
    assert.equal(await resolvePlaybackSource({ ...sample, url: `${project}/storage/v1/object/${mode}/sample-pack-files/synthetic/preview.wav?token=old` }), signed);
    assert.equal(requests.length, 1);
  });
}
await check('sample ID fallback works without an optional pack ID', async () => {
  assert.equal(await resolvePlaybackSource({ ...sample, sampleId: undefined, samplePackId: undefined }), signed);
  assert.deepEqual(requests[0].body, { sampleId, intent: 'stream' });
});
await check('pack ID fallback uses the native track ID', async () => {
  assert.equal(await resolvePlaybackSource({ ...pack, samplePackId: undefined }), signed);
  assert.deepEqual(requests[0].body, { samplePackId: packId, intent: 'stream' });
});
await check('missing sample ID cannot downgrade to a different pack preview', async () => {
  assert.equal(await resolvePlaybackTrack({ ...sample, id: '', sampleId: '' }), null); assert.equal(requests.length, 0);
});
await check('missing pack ID fails before a request', async () => {
  assert.equal(await resolvePlaybackTrack({ ...pack, id: '', samplePackId: '' }), null); assert.equal(requests.length, 0);
});
await check('TTL includes request latency and the existing queue refresh margin', async () => {
  const start = now; invokeOverride = async () => { now += 8000; return response; };
  const track = await resolvePlaybackTrack(sample);
  assert.equal(track.playbackSource.expiresAt, start + 900_000);
  assert.equal(playbackSourceNeedsRefresh(track, start + 869_999), false);
  assert.equal(playbackSourceNeedsRefresh(track, start + 870_000), true);
  assert.equal(playbackSourceNeedsRefresh(sample), true);
});
await check('expired queued sample retains its identity and original locator', async () => {
  const first = await resolvePlaybackTrack(sample); now += 901_000;
  response.data.url = 'https://media.example.test/renewed.wav';
  const second = await resolvePlaybackTrack(first);
  assert.equal(second.url, response.data.url); assert.equal(second.playbackSource.originalUrl, privateFile);
  assert.equal(second.playbackSource.expiresAt, now + 900_000); assert.equal(requests.length, 2);
});
await check('sample stream cache age is capped conservatively', async () => {
  response.data.expiresIn = 86400;
  assert.equal((await resolvePlaybackTrack(pack)).playbackSource.expiresAt, now + 900_000);
});
for (const expiresIn of [0, -1, null, 'not-a-duration', Infinity]) {
  await check('invalid TTL ' + String(expiresIn), async () => {
    response.data.expiresIn = expiresIn; assert.equal(await resolvePlaybackTrack(sample), null);
  });
}
for (const url of [null, '', 'http://media.example.test/preview.wav', 'javascript:alert(1)', 'https://user:password@media.example.test/preview.wav']) {
  await check('reject malformed/non-HTTPS/credentialed URL ' + String(url), async () => {
    response.data.url = url; assert.equal(await resolvePlaybackTrack(pack), null);
  });
}
await check('denial/network failure never falls back to private media', async () => {
  response = { data: null, error: Error('Synthetic forbidden') };
  assert.equal(await resolvePlaybackSource(sample), null);
  invokeOverride = async () => { throw Error('Synthetic network error'); };
  assert.equal(await resolvePlaybackSource(pack), null);
});
await check('bounded timeout applies to sample reads', async () => {
  invokeOverride = () => new Promise(() => {});
  const pending = resolvePlaybackTrack(sample);
  const timer = [...scheduled.values()].find(timer => timer.delay === 10_000); assert.ok(timer);
  timer.callback(); assert.equal(await pending, null);
});
for (const track of [
  { ...sample, url: `${project}/storage/v1/object/public/audio-files/legacy.wav` },
  { ...sample, url: 'https://other.supabase.co/storage/v1/object/public/sample-pack-files/legacy.wav' },
  { ...pack, url: 'https://cdn.example.test/public-preview.wav' },
]) {
  await check('preserve legacy/external direct source ' + track.url, async () => {
    assert.equal(await resolvePlaybackSource(track), track.url); assert.equal(requests.length, 0);
    assert.equal(canRefreshPlaybackSource(track), false);
  });
}
await check('sourceType keeps its existing precedence over presentation type', async () => {
  assert.equal(await resolvePlaybackSource({ ...sample, type: 'preview', sourceType: 'sample' }), signed);
  assert.equal(requests[0].name, 'get-sample-pack-sample-url');
});
console.log(JSON.stringify({ status: 'PASS', scenarios, hostedCalls: 0, nativeBuilds: 0 }));
