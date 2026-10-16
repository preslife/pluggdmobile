import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Execute the actual provider and recovery helper with real React hooks.
// Native playback, time and AppState are deterministic local boundaries.
const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch {
  ({ JSDOM } = createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || new URL('../../package.json', import.meta.url))('jsdom'));
}
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
const trackA = { id: 'track-a', title: 'Track A', artist: 'Fixture', url: 'https://local.test/a.mp3' };
const trackB = { id: 'track-b', title: 'Track B', artist: 'Fixture', url: 'https://local.test/b.mp3' };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const Event = Object.fromEntries([
  'PlaybackError', 'PlaybackState', 'PlaybackActiveTrackChanged',
  'RemotePlay', 'RemotePause', 'RemoteStop', 'RemoteNext', 'RemotePrevious', 'RemoteSeek',
].map((name) => [name, name]));
const State = { None: 'none', Playing: 'playing', Paused: 'paused', Stopped: 'stopped', Loading: 'loading', Buffering: 'buffering', Error: 'error' };

function load(path, mocks, timers) {
  const result = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.equal((result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, {
    module, exports: module.exports, URL, Error, Set, Map, Promise, Date: timers.Date || Date, process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' } }, console: { ...console, warn() {} },
    setTimeout: timers.set, clearTimeout: timers.clear,
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      assert.ok(Object.hasOwn(mocks, name), `Unmocked ${name} in ${path}`);
      return mocks[name];
    },
  }, { filename: path });
  return module.exports;
}

async function fixture({ strict = false } = {}) {
  const scheduled = new Map();
  let nextTimer = 0;
  const timers = {
    set(callback, delay) { const id = ++nextTimer; scheduled.set(id, { callback, delay, at: f.now + delay }); return id; },
    clear(id) { scheduled.delete(id); },
  };
  const f = {
    nativeQueue: [], index: 0, state: State.None, wantsPlayback: false,
    progress: { position: 0, duration: 180, buffered: 60 },
    calls: [], alerts: [], appListeners: new Set(),
    retryImpl: async () => undefined,
    loadImpl: async () => undefined,
    resolve: async (track) => track,
    now: Date.now(),
    activeImpl: null,
  };
  timers.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [f.now])); }
    static now() { return f.now; }
  };
  const player = {
    setupPlayer: async () => undefined,
    updateOptions: async () => undefined,
    getQueue: async () => [...f.nativeQueue],
    reset: async () => { f.calls.push('reset'); f.nativeQueue = []; f.index = 0; f.progress.position = 0; },
    add: async (tracks) => { f.nativeQueue.push(...(Array.isArray(tracks) ? tracks : [tracks])); },
    play: async () => { f.calls.push('play'); f.wantsPlayback = true; f.state = State.Playing; },
    pause: async () => { f.calls.push('pause'); f.wantsPlayback = false; f.state = State.Paused; },
    retry: async () => { f.calls.push('retry'); return f.retryImpl(); },
    load: (track) => { f.calls.push('load'); f.nativeQueue[f.index] = track; f.progress.position = 0; return f.loadImpl(); },
    getProgress: async () => ({ ...f.progress }),
    getActiveTrackIndex: async () => f.index,
    getActiveTrack: async () => f.activeImpl ? f.activeImpl() : f.nativeQueue[f.index],
    getPlayWhenReady: async () => f.wantsPlayback,
    getPlaybackState: async () => ({ state: f.state }),
    skipToNext: async () => { f.index = Math.min(f.index + 1, f.nativeQueue.length - 1); },
    skipToPrevious: async () => { f.index = Math.max(f.index - 1, 0); },
    skip: async (index) => { f.index = index; },
    seekTo: async (position) => { f.calls.push('seek'); f.progress.position = position; },
    getRepeatMode: async () => 'off', setRepeatMode: async () => undefined,
  };
  const appState = {
    currentState: 'active',
    addEventListener(name, listener) {
      assert.equal(name, 'change');
      f.appListeners.add(listener);
      return { remove: () => f.appListeners.delete(listener) };
    },
  };
  const recovery = load('../src/features/playback/playbackErrorRecovery.ts', {}, timers);
  const provider = load('../src/context/PlaybackProvider.tsx', {
    'react-native': { Alert: { alert: (...args) => f.alerts.push(args) }, AppState: appState, Platform: { OS: 'ios', Version: 27 } },
    'react-native-track-player': {
      default: player, Event, State, Capability: {}, RepeatMode: { Off: 'off', Queue: 'queue', Track: 'track' },
      IOSCategory: { Playback: 'playback' }, AppKilledPlaybackBehavior: {},
      usePlaybackState: () => ({ state: f.state }),
      useProgress: () => f.progress,
      useActiveTrack: () => f.nativeQueue[f.index],
      useTrackPlayerEvents: (events, listener) => { f.events = events; f.handler = listener; },
    },
    '../components/PluggdImage': { transformedUri: (value) => value },
    '../components/lowMemoryImagePolicy': { isConstrainedAndroidRuntime: () => false },
    '../features/playback/resolvePlaybackSource': {
      resolvePlaybackTrack: (track) => f.resolve(track),
      playbackSourceNeedsRefresh: (track) => Boolean(track.playbackSource && (!track.playbackSource.expiresAt || track.playbackSource.expiresAt <= f.now + 30000)),
    },
    '../features/playback/playbackErrorRecovery': recovery,
  }, timers);
  function Probe() { f.value = provider.usePlayback(); return null; }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = () => {
    const tree = React.createElement(provider.PlaybackProvider, null, React.createElement(Probe));
    root.render(strict ? React.createElement(React.StrictMode, null, tree) : tree);
  };
  await act(async () => render());
  await act(async () => { await f.value.playQueue([trackA, trackB]); });
  f.progress.position = 37;
  await act(async () => render());
  f.calls.length = 0;
  f.emit = async (event) => {
    if (event.type === Event.PlaybackState) f.state = event.state;
    if (event.type === Event.PlaybackError) f.state = State.Error;
    await act(async () => { f.handler(event); render(); });
  };
  f.error = (code = 'ios_not_connected_to_internet') => f.emit({ type: Event.PlaybackError, code, message: 'Local fixture playback error' });
  f.advance = async (milliseconds = 1200) => {
    f.now += milliseconds;
    const callbacks = [...scheduled.entries()].filter(([, item]) => item.at <= f.now);
    for (const [id] of callbacks) scheduled.delete(id);
    await act(async () => { for (const [, item] of callbacks) item.callback(); });
  };
  f.app = async (state) => {
    appState.currentState = state;
    await act(async () => { for (const listener of f.appListeners) listener(state); });
  };
  f.close = async () => { await act(async () => root.unmount()); container.remove(); };
  f.render = async () => { await act(async () => render()); };
  f.scheduled = scheduled;
  f.timers = timers;
  return f;
}

function sourceFixture(timers) {
  const source = {
    calls: [], battleCalls: [],
    result: { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/audio-files/current.mp3?token=fresh-1', expiresIn: 300 }, error: null },
    battleResult: { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/battle-audio/owner/battle/file.mp3?token=fresh-1' }, error: null },
    invoke: null,
  };
  const supabase = {
    functions: { invoke: (name, options) => { source.calls.push({ name, ...options }); return source.invoke ? source.invoke() : Promise.resolve(source.result); } },
    storage: { from: (bucket) => ({ createSignedUrl: async (path, expiresIn) => { source.battleCalls.push({ bucket, path, expiresIn }); return source.battleResult; } }) },
  };
  const battle = load('../src/features/live/battleService.ts', {
    '../../lib/supabase': { supabase },
    '../../lib/storageUpload': { uploadFileToSupabaseStorage: () => { throw new Error('No upload is allowed in these tests'); } },
  }, timers);
  source.api = load('../src/features/playback/resolvePlaybackSource.ts', {
    '../../lib/supabase': { supabase }, '../live/battleService': battle,
  }, timers);
  return source;
}

const protectedTrack = {
  ...trackA, sourceType: 'release', trackId: 'published-track-fixture',
  url: 'https://project.supabase.co/storage/v1/object/sign/audio-files/original.mp3?token=old',
};

async function protectedQueue(f) {
  const source = sourceFixture(f.timers);
  f.resolve = (track) => source.api.resolvePlaybackTrack(track);
  await act(async () => f.value.playQueue([protectedTrack, trackB]));
  f.progress.position = 37;
  await f.render();
  f.calls.length = 0;
  return source;
}

const tests = [];
const test = (name, run) => tests.push({ name, run });
const withPlayer = (run, options) => async () => {
  const f = await fixture(options);
  try { await run(f); } finally { await f.close(); }
};
function retained(f) {
  assert.deepEqual(f.nativeQueue.map((track) => track.id), [trackA.id, trackB.id]);
  assert.deepEqual(f.value.queue.map((track) => track.id), [trackA.id, trackB.id]);
  assert.equal(f.progress.position, 37);
  assert.equal(f.calls.filter((call) => call === 'reset').length, 0);
}

test('transient error retains queue/position and retries once; playing recovers without Alert', withPlayer(async (f) => {
  await f.error();
  await f.error();
  retained(f);
  assert.equal(f.scheduled.size, 1, 'duplicate pre-retry events share one attempt');
  await f.advance();
  assert.deepEqual(f.calls, ['retry']);
  retained(f);
  await f.emit({ type: Event.PlaybackState, state: State.Playing });
  assert.equal(f.alerts.length, 0);
  assert.equal(f.scheduled.size, 0);
}));

test('repeat failure exhausts the budget with one foreground recovery message', withPlayer(async (f) => {
  await f.error('ios_failed_to_load_resource');
  await f.advance();
  await f.error('ios_failed_to_load_resource');
  await f.error('ios_playback_failed');
  await f.advance();
  assert.deepEqual(f.calls, ['retry']);
  assert.equal(f.alerts.length, 1);
  assert.match(f.alerts[0][1], /queue has been kept/);
  retained(f);
}));

test('recovery success does not replenish an automatic retry loop', withPlayer(async (f) => {
  await f.error();
  await f.advance();
  await f.emit({ type: Event.PlaybackState, state: State.Playing });
  await f.error();
  await f.advance();
  assert.deepEqual(f.calls, ['retry']);
  assert.equal(f.alerts.length, 1);
  retained(f);
}));

test('native retry rejection keeps queue and reports once', withPlayer(async (f) => {
  f.retryImpl = async () => { throw new Error('reload failed'); };
  await f.error();
  await f.advance();
  await f.error();
  assert.deepEqual(f.calls, ['retry']);
  assert.equal(f.alerts.length, 1);
  retained(f);
}));

test('unplayable source is not retried or discarded', withPlayer(async (f) => {
  await f.error('ios_track_unplayable');
  await f.advance();
  assert.deepEqual(f.calls, []);
  assert.equal(f.alerts.length, 1);
  retained(f);
}));

for (const [name, operation] of [
  ['pause', (value) => value.pause()],
  ['clearQueue', (value) => value.clearQueue()],
  ['closePlayer', (value) => value.closePlayer()],
  ['next', (value) => value.skipToNext()],
  ['previous', (value) => value.skipToPrevious()],
  ['queue index', (value) => value.skipToQueueIndex(1)],
  ['seek', (value) => value.seekTo(59)],
  ['new track', (value) => value.playTrack(trackB)],
  ['new queue', (value) => value.playQueue([trackB])],
  ['shuffle', (value) => value.toggleShuffle()],
]) {
  test(`${name} cancels pending retry without later playback mutation`, withPlayer(async (f) => {
    await f.error();
    await act(async () => operation(f.value));
    const checkpoint = [...f.calls];
    const queue = f.nativeQueue.map((track) => track.id);
    const position = f.progress.position;
    await f.advance();
    assert.deepEqual(f.calls, checkpoint);
    assert.deepEqual(f.nativeQueue.map((track) => track.id), queue);
    assert.equal(f.progress.position, position);
    assert.equal(f.alerts.length, 0);
  }));
}

for (const type of [Event.RemotePause, Event.RemoteStop, Event.RemoteNext, Event.RemotePrevious, Event.RemoteSeek]) {
  test(`${type} cancels pending retry`, withPlayer(async (f) => {
    await f.error();
    await f.emit({ type });
    await f.advance();
    assert.deepEqual(f.calls, []);
    retained(f);
  }));
}

test('active track event invalidates retry even before active-track hook catches up', withPlayer(async (f) => {
  await f.error();
  await f.emit({ type: Event.PlaybackActiveTrackChanged, index: 1, lastIndex: 0, track: trackB, lastTrack: trackA });
  await f.advance();
  assert.deepEqual(f.calls, []);
  assert.equal(f.alerts.length, 0);
}));

test('native snapshot catches an unannounced track change and paused intent', withPlayer(async (f) => {
  await f.error();
  f.index = 1;
  await f.advance();
  assert.deepEqual(f.calls, []);
  f.index = 0;
  await f.error();
  f.wantsPlayback = false;
  await f.advance();
  assert.deepEqual(f.calls, []);
  assert.equal(f.alerts.length, 0);
}));

test('pause while async snapshot is pending makes retry stale', withPlayer(async (f) => {
  const active = deferred();
  f.activeImpl = () => active.promise;
  await f.error();
  await f.advance();
  await act(async () => f.value.pause());
  await act(async () => { active.resolve(trackA); });
  assert.deepEqual(f.calls, ['pause']);
  assert.equal(f.alerts.length, 0);
}));

test('pause after retry dispatch is never followed by automatic play or stale failure', withPlayer(async (f) => {
  const retry = deferred();
  f.retryImpl = () => retry.promise;
  await f.error();
  await f.advance();
  await act(async () => f.value.pause());
  await act(async () => { retry.reject(new Error('late retry failure')); });
  await f.error();
  assert.deepEqual(f.calls, ['retry', 'pause']);
  assert.equal(f.wantsPlayback, false);
  assert.equal(f.alerts.length, 0);
  retained(f);
}));

test('late native errors after explicit pause do not restart recovery or show stale feedback', withPlayer(async (f) => {
  await f.error();
  await act(async () => f.value.pause());
  await f.error('ios_failed_to_load_resource');
  await f.error('ios_track_unplayable');
  await f.advance();
  assert.deepEqual(f.calls, ['pause']);
  assert.equal(f.alerts.length, 0);
  retained(f);
}));

test('background exhaustion has no offscreen Alert; foreground shows retained-queue feedback once', withPlayer(async (f) => {
  await f.app('background');
  await f.error();
  await f.advance();
  await f.error();
  assert.equal(f.alerts.length, 0);
  retained(f);
  await f.app('active');
  assert.equal(f.alerts.length, 1);
  await f.app('background');
  await f.app('active');
  assert.equal(f.alerts.length, 1);
}));

test('explicit pause clears deferred background failure', withPlayer(async (f) => {
  await f.app('background');
  await f.error('ios_invalid_source_url');
  await act(async () => f.value.pause());
  await f.app('active');
  assert.equal(f.alerts.length, 0);
  retained(f);
}));

test('explicit play grants a fresh bounded attempt after exhaustion', withPlayer(async (f) => {
  await f.error();
  await f.advance();
  await f.error();
  await act(async () => f.value.play());
  await f.error();
  await f.advance();
  assert.deepEqual(f.calls, ['retry', 'play', 'retry']);
  assert.equal(f.alerts.length, 1);
}));

test('StrictMode lifecycle retains recovery after effect cleanup/setup', withPlayer(async (f) => {
  await f.error();
  await f.advance();
  assert.deepEqual(f.calls, ['retry']);
}, { strict: true }));

test('unmount cancels pending timer and removes foreground listener', async () => {
  const f = await fixture();
  await f.error();
  await f.close();
  assert.equal(f.scheduled.size, 0);
  assert.equal(f.appListeners.size, 0);
  await f.advance();
  assert.deepEqual(f.calls, []);
});

test('actual resolver retains server TTL and renews only the active item before expiry', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  assert.equal(f.nativeQueue[0].playbackSource.expiresAt, f.now + 300000);
  assert.equal(source.calls[0].name, 'resolve-playback-url');
  assert.equal(source.calls[0].body.contentId, protectedTrack.trackId);
  assert.equal(source.calls[0].body.contentType, 'release');
  assert.ok(!Object.hasOwn(source.calls[0].body, 'source'), 'raw catalogue paths never enter beat/release signing');
  source.result = { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/audio-files/current.mp3?token=fresh-2', expiresIn: 300 }, error: null };
  await f.advance(270000);
  assert.deepEqual(f.calls, ['load', 'seek']);
  assert.equal(f.progress.position, 37);
  assert.equal(f.nativeQueue.length, 2);
  assert.equal(f.nativeQueue[1].url, trackB.url);
  assert.ok(f.nativeQueue[0].url.endsWith('fresh-2'));
  assert.equal(f.value.queue[0].url, f.nativeQueue[0].url);
  assert.equal(f.alerts.length, 0);
}));

test('each fresh credential gets a later expiry schedule without an immediate refresh loop', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  source.result = { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/audio-files/current.mp3?token=fresh-2', expiresIn: 300 }, error: null };
  await f.advance(270000);
  assert.equal(source.calls.length, 2);
  await f.advance(1000);
  assert.equal(source.calls.length, 2);
  source.result = { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/audio-files/current.mp3?token=fresh-3', expiresIn: 300 }, error: null };
  await f.advance(269000);
  assert.equal(source.calls.length, 3);
  assert.deepEqual(f.calls, ['load', 'seek', 'load', 'seek']);
  assert.equal(f.progress.position, 37);
  assert.equal(f.nativeQueue[1].id, trackB.id);
}));

test('expired protected error renews under the existing 1.2s retry backoff', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  source.result = { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/audio-files/current.mp3?token=fresh-2', expiresIn: 300 }, error: null };
  // Simulate JS being asleep past expiry; the native error drives recovery.
  f.now += 301000;
  await f.error('ios_failed_to_load_resource');
  assert.deepEqual(f.calls, []);
  await f.advance(1199);
  assert.deepEqual(f.calls, []);
  await f.advance(1);
  assert.deepEqual(f.calls, ['load', 'seek']);
  assert.equal(f.progress.position, 37);
  assert.equal(f.nativeQueue[1].id, trackB.id);
}));

test('denied protected refresh retains source/queue/position and has no retry loop', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  const original = f.nativeQueue[0].url;
  source.result = { data: null, error: new Error('Access denied') };
  await f.advance(270000);
  assert.deepEqual(f.calls, []);
  assert.equal(f.nativeQueue[0].url, original);
  retained(f);
  assert.equal(f.alerts.length, 1);
  await f.advance(600000);
  assert.equal(source.calls.length, 2);
}));

test('source read timeout preserves the old item and drops a late authorized response', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  const read = deferred();
  source.invoke = () => read.promise;
  const original = f.nativeQueue[0].url;
  await f.advance(270000);
  assert.equal(source.calls.length, 2);
  await f.advance(10000);
  assert.equal(f.alerts.length, 1);
  await act(async () => { read.resolve({ data: { signedUrl: original + '-late', expiresIn: 300 }, error: null }); });
  assert.deepEqual(f.calls, []);
  assert.equal(f.nativeQueue[0].url, original);
  retained(f);
}));

for (const [name, operate] of [
  ['pause', async (f) => f.value.pause()],
  ['seek', async (f) => f.value.seekTo(88)],
  ['remote stop', async (f) => f.handler({ type: Event.RemoteStop })],
  ['track change', async (f) => f.value.playTrack(trackB)],
]) {
  test(`${name} while URL renewal awaits auth prevents stale replacement`, withPlayer(async (f) => {
    const source = await protectedQueue(f);
    const read = deferred();
    source.invoke = () => read.promise;
    await f.advance(270000);
    await act(async () => operate(f));
    const checkpoint = [...f.calls];
    const position = f.progress.position;
    const ids = f.nativeQueue.map((track) => track.id);
    await act(async () => { read.resolve({ data: { signedUrl: protectedTrack.url + '-fresh-2', expiresIn: 300 }, error: null }); });
    assert.deepEqual(f.calls, checkpoint);
    assert.deepEqual(f.nativeQueue.map((track) => track.id), ids);
    assert.equal(f.progress.position, position);
    assert.equal(f.alerts.length, 0);
  }));
}

test('newer seek while native load awaits completion wins over retained-position seek', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  const loading = deferred();
  f.loadImpl = () => loading.promise;
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-2', expiresIn: 300 }, error: null };
  await f.advance(270000);
  assert.deepEqual(f.calls, ['load', 'seek']);
  assert.equal(f.progress.position, 37);
  await act(async () => f.value.seekTo(88));
  await act(async () => { loading.resolve(undefined); });
  assert.deepEqual(f.calls, ['load', 'seek', 'seek']);
  assert.equal(f.progress.position, 88);
  assert.equal(f.nativeQueue[1].id, trackB.id);
  assert.equal(f.alerts.length, 0);
}));

test('newer pause while native load awaits completion is never followed by play', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  const loading = deferred();
  f.loadImpl = () => loading.promise;
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-2', expiresIn: 300 }, error: null };
  await f.advance(270000);
  await act(async () => f.value.pause());
  await act(async () => { loading.resolve(undefined); });
  assert.deepEqual(f.calls, ['load', 'seek', 'pause']);
  assert.equal(f.progress.position, 37);
  assert.equal(f.wantsPlayback, false);
  assert.equal(f.alerts.length, 0);
}));

test('background renewal denial never presents an offscreen Alert', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  await f.app('background');
  source.result = { data: null, error: new Error('Access denied') };
  await f.advance(270000);
  assert.equal(f.alerts.length, 0);
  retained(f);
  await f.app('active');
  assert.equal(f.alerts.length, 1);
}));

test('battle renewal reuses actual authenticated helper only for exact-origin signed bucket URLs', withPlayer(async (f) => {
  const source = sourceFixture(f.timers);
  const battle = { ...trackA, url: 'https://project.supabase.co/storage/v1/object/sign/battle-audio/owner/battle/file.mp3?token=old' };
  const result = await source.api.resolvePlaybackTrack(battle);
  assert.equal(source.battleCalls.length, 1);
  assert.equal(source.battleCalls[0].bucket, 'battle-audio');
  assert.equal(source.battleCalls[0].path, 'owner/battle/file.mp3');
  assert.equal(source.battleCalls[0].expiresIn, 300);
  assert.equal(result.playbackSource.expiresAt, f.now + 300000);
  for (const url of [
    'owner/battle/file.mp3',
    'https://foreign.test/storage/v1/object/sign/battle-audio/owner/file.mp3?token=anything',
    'https://project.supabase.co/storage/v1/object/public/battle-audio/owner/file.mp3',
    'https://project.supabase.co/storage/v1/object/sign/audio-files/owner/master.wav?token=anything',
    'https://project.supabase.co/storage/v1/object/sign/battle-audio/owner/file.mp3',
    'https://project.supabase.co/storage/v1/object/sign/battle-audio/owner/%2e%2e%2fsecret.mp3?token=anything',
  ]) {
    await source.api.resolvePlaybackTrack({ ...trackA, url });
  }
  assert.equal(source.battleCalls.length, 1, 'arbitrary paths/origins/buckets are not signed');
  assert.equal(source.calls.length, 0);
}));

test('RLS-denied battle renewal keeps native source/queue/position untouched', withPlayer(async (f) => {
  const source = sourceFixture(f.timers);
  f.resolve = (track) => source.api.resolvePlaybackTrack(track);
  const battle = { ...trackA, url: 'https://project.supabase.co/storage/v1/object/sign/battle-audio/owner/battle/file.mp3?token=old' };
  await act(async () => f.value.playQueue([battle, trackB]));
  f.progress.position = 37;
  f.calls.length = 0;
  const original = f.nativeQueue[0].url;
  source.battleResult = { data: null, error: new Error('new row violates row-level security policy') };
  await f.advance(270000);
  assert.equal(f.nativeQueue[0].url, original);
  assert.deepEqual(f.calls, []);
  retained(f);
  assert.equal(f.alerts.length, 1);
}));

test('native self-replacement event retains the next expiry watch', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  const previous = f.nativeQueue[0];
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-2', expiresIn: 300 }, error: null };
  await f.advance(270000);
  await f.emit({ type: Event.PlaybackActiveTrackChanged, index: 0, lastIndex: 0, track: f.nativeQueue[0], lastTrack: previous });
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-3', expiresIn: 300 }, error: null };
  await f.advance(270000);
  assert.equal(source.calls.length, 3);
  assert.deepEqual(f.calls, ['load', 'seek', 'load', 'seek']);
}));

test('error during native replacement retries the fresh source without cancelling later renewal', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  const loading = deferred();
  f.loadImpl = () => loading.promise;
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-2', expiresIn: 300 }, error: null };
  await f.advance(270000);
  await f.error('ios_failed_to_load_resource');
  await act(async () => { loading.resolve(undefined); });
  await f.advance(1200);
  assert.deepEqual(f.calls, ['load', 'seek', 'retry']);
  await f.emit({ type: Event.PlaybackState, state: State.Playing });
  f.loadImpl = async () => undefined;
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-3', expiresIn: 300 }, error: null };
  await f.advance(270000);
  assert.equal(source.calls.length, 3);
  assert.deepEqual(f.calls, ['load', 'seek', 'retry', 'load', 'seek']);
}));

test('error-zero native progress restores retained position, while explicit seek to zero stays zero', withPlayer(async (f) => {
  const source = await protectedQueue(f);
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-2', expiresIn: 300 }, error: null };
  f.now += 301000;
  f.progress.position = 0;
  await f.error('ios_failed_to_load_resource');
  await f.advance();
  assert.equal(f.progress.position, 37);
  await f.emit({ type: Event.PlaybackState, state: State.Playing });
  await act(async () => f.value.seekTo(0));
  await f.render();
  source.result = { data: { signedUrl: protectedTrack.url + '-fresh-3', expiresIn: 300 }, error: null };
  f.now += 301000;
  await f.error('ios_failed_to_load_resource');
  await f.advance();
  assert.equal(f.progress.position, 0);
  assert.equal(f.alerts.length, 0);
}));

test('pause during initial protected source resolution cannot later start playback', withPlayer(async (f) => {
  const source = sourceFixture(f.timers);
  const read = deferred();
  source.invoke = () => read.promise;
  f.resolve = (track) => source.api.resolvePlaybackTrack(track);
  let starting;
  await act(async () => { starting = f.value.playTrack(protectedTrack); });
  await act(async () => f.value.pause());
  await act(async () => { read.resolve(source.result); await starting; });
  assert.deepEqual(f.calls, ['pause']);
}));

let failures = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack || error}`); }
}
dom.window.close();
assert.equal(failures, 0, `${failures}/${tests.length} playback recovery cases failed`);
console.log(`PASS ${tests.length} actual-source React playback recovery cases. Local native-boundary fixtures; no physical-device or live protected-source renewal proof.`);
