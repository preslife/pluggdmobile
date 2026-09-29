import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/features/playback/resolvePlaybackSource.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const requests = [];
let response = { data: { signedUrl: 'https://preview.example/stream.mp3?token=short-lived' }, error: null };
const supabase = {
  functions: {
    invoke: async (name, options) => {
      requests.push({ name, body: options.body });
      return response;
    },
  },
};
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => {
    assert.equal(name, '../../lib/supabase');
    return { supabase };
  },
  loaded,
  loaded.exports,
);
const { resolvePlaybackSource } = loaded.exports;

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

response = { data: { signedUrl: 'https://preview.example/channel-one.mp3?token=fresh' }, error: null };
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

console.log('protected native playback source scenarios: PASS');
