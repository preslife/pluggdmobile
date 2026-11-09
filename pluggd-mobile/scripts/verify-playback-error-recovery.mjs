import assert from 'node:assert/strict';
import { releaseAgeCatalog } from './fixtures/releaseAgeCatalog.mjs';
import { releasePlayableUrl } from './fixtures/releasePlayableUrl.mjs';
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
  'PlaybackError', 'PlaybackState', 'PlaybackActiveTrackChanged', 'PlaybackQueueEnded',
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
    module, exports: module.exports, URL, Error, Set, Map, Promise, Date: timers.Date || Date, performance: { now: () => (timers.Date || Date).now() }, process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co' } }, console: { ...console, warn() {} },
    setTimeout: timers.set, clearTimeout: timers.clear,
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      assert.ok(Object.hasOwn(mocks, name), `Unmocked ${name} in ${path}`);
      return mocks[name];
    },
  }, { filename: path });
  return module.exports;
}

async function fixture({ strict = false, realProgress = false, constrained = false } = {}) {
  const scheduled = new Map();
  let nextTimer = 0;
  const timers = {
    set(callback, delay) { const id = ++nextTimer; scheduled.set(id, { callback, delay, at: f.now + delay }); return id; },
    clear(id) { scheduled.delete(id); },
  };
  const f = {
    nativeQueue: [], index: 0, state: State.None, wantsPlayback: false,
    progress: { position: 0, duration: 180, buffered: 60 },
    calls: [], alerts: [], appListeners: new Set(), progressReads: 0,
    retryImpl: async () => undefined,
    loadImpl: async () => undefined,
    resolve: async (track) => track,
    now: Date.now(),
    activeImpl: null,
    actor: null, ageDOB: '1990-01-01', authListeners: new Set(),
    removeImpl: async () => undefined,
    addImpl: async () => undefined,
    metadataImpl: async () => undefined, metadataUpdates: [], artworkCalls: [],
    serviceListeners: new Map(), nativeRepeat: 'off', repeatChanges: [], repeatReadImpl: null,
  };
  timers.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [f.now])); }
    static now() { return f.now; }
  };
  const player = {
    setupPlayer: async () => undefined,
    updateOptions: async () => undefined,
    getQueue: async () => [...f.nativeQueue],
    reset: async () => { f.calls.push('reset'); f.nativeQueue = []; f.index = 0; f.progress.position = 0; f.progressHandler?.({ type: Event.PlaybackActiveTrackChanged }); },
    add: async (tracks) => { f.nativeQueue.push(...(Array.isArray(tracks) ? tracks : [tracks])); return f.addImpl(tracks); },
    play: async () => { f.calls.push('play'); f.wantsPlayback = true; f.state = State.Playing; },
    pause: async () => { f.calls.push('pause'); f.wantsPlayback = false; f.state = State.Paused; },
    stop: async () => { f.calls.push('stop'); f.wantsPlayback = false; f.state = State.Stopped; },
    retry: async () => { f.calls.push('retry'); return f.retryImpl(); },
    load: (track) => { f.calls.push('load'); f.nativeQueue[f.index] = track; f.progress.position = 0; return f.loadImpl(); },
    getProgress: async () => { f.progressReads++; return { ...f.progress }; },
    getActiveTrackIndex: async () => f.index,
    getActiveTrack: async () => f.activeImpl ? f.activeImpl() : f.nativeQueue[f.index],
    getPlayWhenReady: async () => f.wantsPlayback,
    getPlaybackState: async () => ({ state: f.state }),
    skipToNext: async () => { f.index = Math.min(f.index + 1, f.nativeQueue.length - 1); },
    skipToPrevious: async () => { f.index = Math.max(f.index - 1, 0); },
    skip: async (index) => { f.index = index; },
    seekTo: async (position) => { f.calls.push('seek'); f.progress.position = position; },
    updateMetadataForTrack: async (index, metadata) => {
      f.metadataUpdates.push({ index, metadata });
      await f.metadataImpl(index, metadata);
      if (f.nativeQueue[index]) f.nativeQueue[index] = { ...f.nativeQueue[index], ...metadata };
    },
    getRepeatMode: async () => f.repeatReadImpl ? f.repeatReadImpl() : f.nativeRepeat,
    setRepeatMode: async mode => { f.nativeRepeat = mode; f.repeatChanges.push(mode); },
    addEventListener: (type, callback) => {
      const listeners = f.serviceListeners.get(type) || new Set();
      listeners.add(callback); f.serviceListeners.set(type, listeners);
      return { remove: () => { listeners.delete(callback); } };
    },
    remove: async (indexes) => {
      f.calls.push('remove');
      await f.removeImpl(indexes);
      const active = f.nativeQueue[f.index];
      const removedActive = indexes.includes(f.index);
      f.nativeQueue = f.nativeQueue.filter((_, index) => !indexes.includes(index));
      const retainedIndex = f.nativeQueue.indexOf(active);
      f.index = retainedIndex >= 0 ? retainedIndex : 0;
      if (removedActive) f.progress.position = 0;
    },
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
  const progressHook = realProgress ? load('../node_modules/react-native-track-player/src/hooks/useProgress.ts', {
    '../trackPlayer': player,
    '../constants': { Event },
    './useTrackPlayerEvents': { useTrackPlayerEvents: (_events, listener) => { f.progressHandler = listener; } },
  }, timers).useProgress : () => f.progress;
  const sessionModule = load('../src/features/playback/mixAccessSession.ts', {
    'expo-crypto': { randomUUID: require('node:crypto').randomUUID },
  }, timers);
  f.mixSession = sessionModule.mixAccessSession;
  timers.mixSessionModule = sessionModule;
  const protection = load('../src/features/playback/protectedMixPlayback.ts', { './mixAccessSession': sessionModule }, timers);
  const actorAuth = {
    getSession: async () => ({ data: { session: f.actor ? { user: { id: f.actor }, access_token: 'actor-token-' + f.actor } : null } }),
    onAuthStateChange: callback => {
      f.authListeners.add(callback);
      return { data: { subscription: { unsubscribe: () => f.authListeners.delete(callback) } } };
    },
  };
  f.ageRelease = { id: 'published-release-fixture', user_id: 'canonical-owner', explicit: false };
  f.ageTrack = { id: 'published-track-fixture', release_id: f.ageRelease.id, explicit: false,
    audio_url: 'https://project.supabase.co/storage/v1/object/sign/audio-files/original.mp3?token=old' };
  const ageDb = releaseAgeCatalog({ dob: () => f.ageDOB, releaseRows: [f.ageRelease], trackRows: [f.ageTrack], session: () => f.actor ? { user: { id: f.actor } } : null });
  ageDb.auth = actorAuth;
  const age = load('../src/features/playback/releaseAgeAccess.ts', {
    '../../lib/supabase': { supabase: ageDb }, 'expo-crypto': { randomUUID: require('node:crypto').randomUUID },
  }, timers);
  const feedback = load('../src/features/playback/releaseAccessFeedback.ts', { './releaseAgeAccess': age, 'react-native': { Alert: { alert: (...args) => f.alerts.push(args) } }, 'expo-web-browser': { openBrowserAsync: async url => { f.recoveryUrl = url; } } }, timers);
  const playbackAccess = load('../src/features/playback/playbackAccess.ts', { './protectedMixPlayback': protection, './releaseAgeAccess': age }, timers);
  timers.releaseAgeModule = age; timers.releaseAgeDb = ageDb;
  f.age = age;
  const observer = load('../src/features/playback/observeMixActor.ts', {
    '../../lib/supabase': { supabase: { auth: actorAuth } }, './mixAccessSession': sessionModule,
  }, timers);
  const mutation = load('../src/features/playback/nativeQueueMutation.ts', {}, timers);
  const control = load('../src/features/playback/nativePlaybackControl.ts', {
    './mixAccessSession': sessionModule, './protectedMixPlayback': protection, './playbackAccess': playbackAccess, './releaseAgeAccess': age,
    './resolvePlaybackSource': { resolvePlaybackTrack: (track, options) => f.resolve(track, options) },
    './nativeQueueMutation': mutation,
  }, timers);
  const ownership = load('../src/features/playback/playbackServiceOwnership.ts', {}, timers);
  const service = load('../src/features/playback/nativePlaybackService.ts', {
    'react-native-track-player': { default: player, Event },
    './mixAccessSession': sessionModule, './observeMixActor': observer,
    './protectedMixPlayback': protection, './nativePlaybackControl': control, './playbackAccess': playbackAccess, './releaseAgeAccess': age,
    './playbackServiceOwnership': ownership,
  }, timers);
  const imagePolicy = load('../src/components/lowMemoryImagePolicy.ts', {}, timers);
  const imageUri = load('../src/lib/imageUri.ts', {}, timers);
  const images = load('../src/components/PluggdImage.tsx', {
    'react-native': { Platform: { OS: constrained ? 'android' : 'ios', Version: constrained ? 25 : 27 }, Image: {}, Animated: {} },
    './lowMemoryImagePolicy': imagePolicy, '../lib/imageUri': imageUri,
  }, timers);
  const accessBoundary = { nativeMixAccess: {
    presentation: (...args) => timers.accessClient?.presentation(...args),
    refreshPresentation: (...args) => { assert.ok(timers.accessClient, 'A scoped client fixture is required'); return timers.accessClient.refreshPresentation(...args); },
  }, NATIVE_MIX_METADATA_MAX_AGE_MS: 200000 };
  const pausedPresentation = load('../src/features/playback/pausedMixPresentation.ts', {
    './mixAccessSession': sessionModule, './nativeMixAccess': accessBoundary,
    './protectedMixPlayback': protection, './nativeQueueMutation': mutation,
  }, timers);
  const provider = load('../src/context/PlaybackProvider.tsx', {
    'react-native': { Alert: { alert: (...args) => f.alerts.push(args) }, AppState: appState, Platform: { OS: 'ios', Version: 27 } },
    'react-native-track-player': {
      default: player, Event, State, Capability: {}, RepeatMode: { Off: 'off', Queue: 'queue', Track: 'track' },
      IOSCategory: { Playback: 'playback' }, AppKilledPlaybackBehavior: {},
      usePlaybackState: () => ({ state: f.state }),
      useProgress: progressHook,
      useActiveTrack: () => f.nativeQueue[f.index],
      useTrackPlayerEvents: (events, listener) => { f.events = events; f.handler = listener; },
    },
    '../components/PluggdImage': { transformedUri: (value, width) => { f.artworkCalls.push({ value, width }); return images.transformedUri(value, width); } },
    '../components/lowMemoryImagePolicy': { isConstrainedAndroidRuntime: () => constrained },
    '../features/playback/resolvePlaybackSource': {
      resolvePlaybackTrack: (track, options) => f.resolve(track, options),
      playbackSourceNeedsRefresh: (track) => Boolean(track.playbackSource && (!track.playbackSource.expiresAt || track.playbackSource.expiresAt <= f.now + 30000)),
    },
    '../features/playback/playbackErrorRecovery': recovery,
    '../features/playback/mixAccessSession': sessionModule,
    '../features/playback/protectedMixPlayback': protection,
    '../features/playback/releaseAccessFeedback': feedback,
    '../features/playback/playbackAccess': playbackAccess, '../features/playback/releaseAgeAccess': age,
    '../features/playback/observeMixActor': observer,
    '../features/playback/nativeQueueMutation': mutation,
    '../features/playback/nativePlaybackControl': control,
    '../features/playback/playbackServiceOwnership': ownership,
    '../features/playback/nativeMixAccess': accessBoundary,
    '../features/playback/pausedMixPresentation': pausedPresentation,
  }, timers);
  function Probe() { f.value = provider.usePlayback(); return null; }
  function LayoutProbe() { f.layoutRenders = (f.layoutRenders || 0) + 1; f.hasTrack = provider.useHasPlaybackTrack(); return null; }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const render = () => {
    const tree = React.createElement(provider.PlaybackProvider, null, React.createElement(Probe), React.createElement(LayoutProbe));
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
    await act(async () => {
      if (!f.unmounted) f.handler(event);
      for (const callback of f.serviceListeners.get(event.type) || []) await callback(event);
      if (!f.unmounted) render();
    });
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
  f.startService = async () => { await act(async () => { f.stopService = service.installNativePlaybackService(player); }); };
  f.unmountUI = async () => { await act(async () => { if (!f.unmounted) { f.unmounted = true; root.unmount(); } }); };
  f.close = async () => { await act(async () => { f.stopService?.(); if (!f.unmounted) { f.unmounted = true; root.unmount(); } }); container.remove(); };
  f.auth = async (actor, event = actor ? 'SIGNED_IN' : 'SIGNED_OUT') => {
    f.actor = actor;
    await act(async () => {
      for (const callback of f.authListeners) callback(event, actor ? { user: { id: actor }, access_token: 'actor-token-' + actor } : null);
      if (!f.unmounted) render();
    });
  };
  f.render = async () => { await act(async () => render()); };
  f.scheduled = scheduled;
  f.timers = timers;
  return f;
}

function sourceFixture(timers) {
  const source = {
    calls: [], metadataCalls: [], battleCalls: [],
    result: { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/audio-files/current.mp3?token=fresh-1', expiresIn: 300 }, error: null },
    battleResult: { data: { signedUrl: 'https://project.supabase.co/storage/v1/object/sign/battle-audio/owner/battle/file.mp3?token=fresh-1' }, error: null },
    invoke: null,
  };
  const supabase = { ...timers.releaseAgeDb,
    functions: { invoke: (name, options) => { (options.body.action === 'read' ? source.metadataCalls : source.calls).push({ name, ...options }); return source.invoke ? source.invoke(name, options) : Promise.resolve(source.result); } },
    storage: { from: (bucket) => ({ createSignedUrl: async (path, expiresIn) => { source.battleCalls.push({ bucket, path, expiresIn }); return source.battleResult; } }) },
  };
  const battle = load('../src/features/live/battleService.ts', {
    '../../lib/supabase': { supabase },
    '../../lib/storageUpload': { uploadFileToSupabaseStorage: () => { throw new Error('No upload is allowed in these tests'); } },
  }, timers);
  const sessionModule = timers.mixSessionModule || load('../src/features/playback/mixAccessSession.ts', {
    'expo-crypto': { randomUUID: require('node:crypto').randomUUID },
  }, timers);
  const access = load('../src/features/playback/nativeMixAccess.ts', {
    '../../lib/supabase': { supabase }, './mixAccessSession': sessionModule,
  }, timers);
  const protection = load('../src/features/playback/protectedMixPlayback.ts', { './mixAccessSession': sessionModule }, timers);
  source.access = access.nativeMixAccess;
  timers.accessClient = source.access;
  source.api = load('../src/features/playback/resolvePlaybackSource.ts', {
    '../../lib/supabase': { supabase }, '../live/battleService': battle,
    './mixAccessSession': sessionModule, './nativeMixAccess': access, './protectedMixPlayback': protection,
    './releaseAgeAccess': timers.releaseAgeModule, '../../lib/mobileContent': { releasePlayableUrl },
  }, timers);
  return source;
}

const protectedTrack = {
  ...trackA, sourceType: 'release', trackId: 'published-track-fixture',
  url: 'https://project.supabase.co/storage/v1/object/sign/audio-files/original.mp3?token=old',
};

async function protectedQueue(f) {
  const source = sourceFixture(f.timers);
  f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
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
  f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
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
  f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  let starting;
  await act(async () => { starting = f.value.playTrack(protectedTrack); });
  await act(async () => f.value.pause());
  await act(async () => { read.resolve(source.result); await starting; });
  assert.deepEqual(f.calls, ['pause']);
}));

test('actual progress polling reduces background work and resumes foreground updates without controlling native playback', async () => {
  const f = await fixture({ realProgress: true });
  try {
    f.calls.length = 0;
    await f.app('background');
    let reads = f.progressReads;
    for (let i = 0; i < 16; i++) {
      f.progress.position += 0.25;
      await f.advance(250);
    }
    const backgroundReads = f.progressReads - reads;
    assert.ok(backgroundReads >= 3 && backgroundReads <= 4, `background reads: ${backgroundReads}`);
    assert.ok(f.value.progress.position >= 40, 'recovery snapshots continue advancing in background');
    await f.app('active');
    reads = f.progressReads;
    for (let i = 0; i < 4; i++) {
      f.progress.position += 0.25;
      await f.advance(250);
    }
    assert.equal(f.progressReads - reads, 4, 'foreground restores smooth progress immediately');
    assert.deepEqual(f.calls, [], 'AppState changes never pause, seek, reset or restart native playback');
    const source = await protectedQueue(f);
    await f.app('background');
    f.progress.position = 73;
    await f.advance(1000);
    assert.equal(f.value.progress.position, 73);
    source.result = { data: { signedUrl: protectedTrack.url + '-fresh-background', expiresIn: 300 }, error: null };
    f.now += 301000;
    f.progress.position = 0;
    await f.error('ios_failed_to_load_resource');
    await f.advance();
    assert.deepEqual(f.calls, ['load', 'seek']);
    assert.equal(f.progress.position, 73, 'failed native zero restores the last background snapshot');
  } finally { await f.close(); }
});

test('a seek followed by backgrounding retains later progress when the first confirmation sample has advanced', async () => {
  const f = await fixture({ realProgress: true });
  try {
    const source = await protectedQueue(f);
    await act(async () => f.value.seekTo(30));
    f.now += 1000;
    f.progress.position = 31;
    await f.app('background');
    f.progress.position = 73;
    await f.advance(42000);
    assert.equal(f.value.progress.position, 73);
    f.calls.length = 0;
    source.result = { data: { signedUrl: protectedTrack.url + '-fresh-after-seek', expiresIn: 300 }, error: null };
    f.now += 301000;
    f.progress.position = 0;
    await f.error('ios_failed_to_load_resource');
    await f.advance();
    assert.deepEqual(f.calls, ['load', 'seek']);
    assert.equal(f.progress.position, 73, 'recovery uses later playback, not the old seek target');
  } finally { await f.close(); }
});

test('a far stale pre-seek sample cannot overwrite the requested recovery position', async () => {
  const f = await fixture({ realProgress: true });
  try {
    const source = await protectedQueue(f);
    await act(async () => f.value.seekTo(30));
    f.now += 1000;
    f.progress.position = 100;
    await f.app('background');
    f.calls.length = 0;
    source.result = { data: { signedUrl: protectedTrack.url + '-fresh-stale-rejected', expiresIn: 300 }, error: null };
    f.now += 301000;
    f.progress.position = 0;
    await f.error('ios_failed_to_load_resource');
    await f.advance();
    assert.deepEqual(f.calls, ['load', 'seek']);
    assert.equal(f.progress.position, 30, 'the far stale sample never confirms the pending seek');
  } finally { await f.close(); }
});

test('track-presence layout consumers ignore progress ticks but follow player appearance and removal', async () => {
  const f = await fixture({ realProgress: true });
  try {
    assert.equal(f.hasTrack, true);
    const renders = f.layoutRenders;
    for (let i = 0; i < 8; i++) {
      f.progress.position += 0.25;
      await f.advance(250);
    }
    assert.ok(f.value.progress.position > 37, 'full playback subscribers still receive progress');
    assert.equal(f.layoutRenders, renders, 'clock ticks do not rerender layout-only subscribers');
    await act(async () => f.value.closePlayer());
    assert.equal(f.hasTrack, false, 'removing the player releases its layout space');
    assert.ok(f.layoutRenders > renders);
    await act(async () => f.value.playQueue([trackB]));
    assert.equal(f.hasTrack, true, 'a new player reserves its layout space');
  } finally { await f.close(); }
});
const privateMixId = '10000000-0000-4000-8000-000000000001';
const privateOwner = '20000000-0000-4000-8000-000000000001';
const nextActor = '20000000-0000-4000-8000-000000000002';
function privateMixFor(f, session = f.mixSession) {
  return { id: privateMixId, mixId: privateMixId, type: 'mix', sourceType: 'mix',
    title: 'Private fixture', artist: 'Owner', url: 'https://local.test/private.mp3', mixMetadataReadAt: f.now,
    mixAccess: session.authorize(session.scope(), privateMixId) };
}

test('account switch removes active private audio/metadata but retains public queue without reset', withPlayer(async f => {
  await f.auth(privateOwner);
  await act(async () => f.value.playQueue([privateMixFor(f), trackB]));
  f.progress.position = 37; await f.render(); f.calls.length = 0;
  await f.auth(nextActor);
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]);
  assert.deepEqual(f.value.queue.map(t => t.id), [trackB.id]);
  assert.equal(f.value.currentTrack?.id, trackB.id);
  assert.equal(f.wantsPlayback, false);
  assert.deepEqual(f.calls, ['pause', 'remove']);
  assert.equal(f.alerts.length, 0);
}));

test('account switch removes only queued private items while public recovery and position survive', withPlayer(async f => {
  await f.auth(privateOwner);
  await act(async () => f.value.playQueue([trackA, privateMixFor(f), trackB]));
  f.progress.position = 37; await f.render(); f.calls.length = 0;
  await f.error();
  await f.auth(nextActor);
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackA.id, trackB.id]);
  assert.equal(f.progress.position, 37);
  assert.equal(f.wantsPlayback, true);
  assert.deepEqual(f.calls, ['remove']);
  await f.advance(); assert.deepEqual(f.calls, ['remove', 'retry']);
  assert.equal(f.alerts.length, 0);
}));

test('late private resolve after logout cannot replace a newer public selection', withPlayer(async f => {
  await f.auth(privateOwner);
  const privateTrack = privateMixFor(f); const pending = deferred();
  f.resolve = track => track.mixAccess ? pending.promise : Promise.resolve(track);
  let old;
  await act(async () => { old = f.value.playTrack(privateTrack); });
  await f.auth(null);
  await act(async () => f.value.playTrack(trackB));
  f.calls.length = 0;
  await act(async () => { pending.resolve(privateTrack); assert.equal(await old, null); });
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]);
  assert.deepEqual(f.calls, []);
  assert.equal(f.alerts.length, 0);
}));

test('actor fence during a pending native add is serialized before the next public replacement', withPlayer(async f => {
  await f.auth(privateOwner);
  const nativeAdd = deferred();
  f.addImpl = tracks => (Array.isArray(tracks) ? tracks : [tracks]).some(t => t.mixAccess) ? nativeAdd.promise : Promise.resolve();
  let old, next;
  await act(async () => { old = f.value.playTrack(privateMixFor(f)); });
  await f.auth(nextActor);
  await act(async () => { next = f.value.playTrack(trackB); });
  await act(async () => { nativeAdd.resolve(); assert.equal(await old, null); await next; });
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]);
  assert.equal(f.value.currentTrack?.id, trackB.id);
  assert.equal(f.wantsPlayback, true);
}));

test('actual private Mix resolver reauthorizes by ID and a denied renewal stops only that mix', withPlayer(async f => {
  await f.auth(privateOwner);
  const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  const url = `https://project.supabase.co/storage/v1/object/sign/mix-media/${privateOwner}/${privateMixId}/audio/set.mp3?token=fresh-private`;
  source.result = { data: { url, expiresIn: 300 }, error: null };
  await act(async () => f.value.playQueue([privateMixFor(f), trackB]));
  f.progress.position = 37; await f.render(); f.calls.length = 0;
  assert.equal(source.calls[0].name, 'mix-access');
  assert.equal(source.calls[0].body.action, 'play');
  assert.equal(source.calls[0].body.reference, privateMixId);
  assert.equal(f.nativeQueue[0].playbackSource.originalUrl, `mix:${privateMixId}`);
  source.result = { data: null, error: { context: { status: 404 } } };
  await f.advance(270000);
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]);
  assert.deepEqual(f.calls, ['pause', 'remove']);
  assert.equal(f.wantsPlayback, false);
  assert.equal(f.alerts.length, 1);
  assert.ok(!JSON.stringify(f.alerts).includes(url));
}));

test('a restored native item from an earlier app instance has no current private permission', withPlayer(async f => {
  const old = new f.mixSession.constructor(); old.bindActor(privateOwner);
  f.nativeQueue = [trackA, privateMixFor(f, old)]; f.index = 0;
  f.progress.position = 37; f.calls.length = 0;
  await f.auth(privateOwner);
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackA.id]);
  assert.equal(f.progress.position, 37);
  assert.deepEqual(f.calls, ['remove']);
}));

test('late INITIAL_SESSION cannot restore the previous actor after a real identity change', withPlayer(async f => {
  await f.auth(privateOwner); await f.auth(nextActor); await f.auth(privateOwner, 'INITIAL_SESSION');
  assert.equal(f.mixSession.scope().actor, nextActor);
}));

test('delayed shuffle snapshot cannot replace a newer public playback selection', withPlayer(async f => {
  const snapshot = deferred(); let first = true;
  f.activeImpl = () => { if (first) { first = false; return snapshot.promise; } return f.nativeQueue[f.index]; };
  let shuffle;
  await act(async () => { shuffle = f.value.toggleShuffle(); });
  await act(async () => f.value.playTrack(trackB));
  f.calls.length = 0;
  await act(async () => { snapshot.resolve(trackA); await shuffle; });
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]);
  assert.deepEqual(f.calls, []);
}));

test('denied initial private source gives feedback while preserving already playing public audio', withPlayer(async f => {
  await f.auth(privateOwner);
  const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  source.result = { data: null, error: { context: { status: 404 } } };
  await act(async () => { assert.equal(await f.value.playTrack(privateMixFor(f)), null); });
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackA.id, trackB.id]);
  assert.equal(f.progress.position, 37);
  assert.equal(f.wantsPlayback, true);
  assert.deepEqual(f.calls, []);
  assert.equal(f.alerts.length, 1);
}));

test('native removal failure pauses safely, retains public recovery material and reports a generic error', withPlayer(async f => {
  await f.auth(privateOwner);
  await act(async () => f.value.playQueue([trackA, privateMixFor(f), trackB]));
  f.progress.position = 37; await f.render(); f.calls.length = 0;
  f.removeImpl = async () => { throw new Error('Synthetic native bridge failure'); };
  await f.auth(nextActor);
  assert.deepEqual(f.value.queue.map(t => t.id), [trackA.id, trackB.id]);
  assert.equal(f.nativeQueue.length, 3, 'failed native removal retains recoverable queue');
  assert.equal(f.wantsPlayback, false);
  assert.deepEqual(f.calls, ['remove', 'pause']);
  assert.equal(f.alerts.length, 1);
  assert.ok(!JSON.stringify(f.alerts).includes('Synthetic native'));
}));

async function privateControlFixture(f, { publicFirst = false, paused = false } = {}) {
  await f.auth(privateOwner);
  const source = sourceFixture(f.timers);
  let sequence = 0;
  const response = () => ({ data: { url: `https://project.supabase.co/storage/v1/object/sign/mix-media/${privateOwner}/${privateMixId}/audio/set.mp3?token=private-${++sequence}`, expiresIn: 300 }, error: null });
  source.metadataResponse = () => ({
    data: { version: 1, mix: { id: privateMixId, owner_user_id: privateOwner, title: 'Private fixture', city: 'Owner',
      audio_url: `mix:${privateMixId}`, cover_url: null, status: 'published', visibility: 'private', allow_download: false }, owner: true, public: false, tracklist: [] }, error: null,
  });
  source.invoke = async (_, options) => options?.body.action === 'read' ? source.metadataResponse() : response();
  source.freshResponse = response;
  f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  await act(async () => f.value.playQueue(publicFirst ? [trackA, privateMixFor(f), trackB] : [privateMixFor(f), trackB]));
  f.progress.position = 37; await f.render();
  if (paused) await act(async () => f.value.pause());
  f.calls.length = 0; source.calls.length = 0;
  return source;
}

test('private resume gets fresh scoped authority and keeps position/public queue', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true });
  await act(async () => f.value.play());
  assert.equal(source.calls.length, 1); assert.equal(source.calls[0].name, 'mix-access');
  assert.deepEqual(f.calls, ['load', 'seek', 'play']); assert.equal(f.progress.position, 37);
  assert.equal(f.nativeQueue[1].id, trackB.id); assert.equal(f.wantsPlayback, true);
}));

test('private seek reauthorizes and applies the requested position without reset', withPlayer(async f => {
  const source = await privateControlFixture(f);
  await act(async () => f.value.seekTo(91));
  assert.equal(source.calls.length, 1); assert.deepEqual(f.calls, ['load', 'seek']);
  assert.equal(f.progress.position, 91); assert.equal(f.wantsPlayback, true);
  assert.equal(f.nativeQueue[1].id, trackB.id);
}));

test('private previous/restart reauthorizes while preserving paused intent', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true });
  await act(async () => f.value.skipToPrevious());
  assert.equal(source.calls.length, 1); assert.equal(f.progress.position, 0);
  assert.equal(f.wantsPlayback, false); assert.deepEqual(f.calls, ['load', 'seek']);
}));

test('next into a private queue item reauthorizes; next out to public has no private request', withPlayer(async f => {
  const source = await privateControlFixture(f, { publicFirst: true });
  await act(async () => f.value.skipToNext());
  assert.equal(source.calls.length, 1); assert.equal(f.nativeQueue[f.index].id, privateMixId);
  assert.equal(f.progress.position, 0); assert.equal(f.wantsPlayback, true);
  source.calls.length = 0;
  await act(async () => f.value.skipToNext());
  assert.equal(source.calls.length, 0); assert.equal(f.nativeQueue[f.index].id, trackB.id);
}));

test('queue selection of private audio reauthorizes before explicit play', withPlayer(async f => {
  const source = await privateControlFixture(f, { publicFirst: true, paused: true });
  await act(async () => f.value.skipToQueueIndex(1));
  assert.equal(source.calls.length, 1); assert.equal(f.nativeQueue[f.index].id, privateMixId);
  assert.equal(f.wantsPlayback, true); assert.deepEqual(f.calls, ['load', 'seek', 'play']);
}));

test('private repeat reauthorizes without restarting the timeline', withPlayer(async f => {
  const source = await privateControlFixture(f);
  await act(async () => f.value.toggleRepeat());
  assert.equal(source.calls.length, 1); assert.equal(f.nativeRepeat, 'queue');
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true);
}));

test('denied private repeat does not enable looping or retain private audio', withPlayer(async f => {
  const source = await privateControlFixture(f);
  source.invoke = async () => ({ data: null, error: { context: { status: 404 } } });
  await act(async () => f.value.toggleRepeat());
  assert.equal(f.nativeRepeat, 'off'); assert.equal(f.repeatChanges.length, 0);
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
}));

test('private shuffle refreshes queued authority and preserves position and paused intent', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true });
  await act(async () => f.value.toggleShuffle());
  assert.equal(source.calls.length, 1); assert.equal(f.progress.position, 37);
  assert.equal(f.wantsPlayback, false); assert.equal(f.value.shuffleMode, 'on');
  assert.deepEqual(f.calls, ['reset', 'seek']); assert.equal(f.nativeQueue[f.index].id, privateMixId);
}));

test('denied queued private shuffle leaves current public audio/position unchanged', withPlayer(async f => {
  const source = await privateControlFixture(f, { publicFirst: true });
  source.invoke = async () => ({ data: null, error: { context: { status: 404 } } });
  await act(async () => f.value.toggleShuffle());
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackA.id, trackB.id]);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true);
  assert.equal(f.value.shuffleMode, 'off'); assert.deepEqual(f.calls, ['remove']);
  assert.equal(f.alerts.length, 1);
}));

test('public shuffle also preserves its current timeline and paused state', withPlayer(async f => {
  await act(async () => f.value.pause()); f.calls.length = 0;
  await act(async () => f.value.toggleShuffle());
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, false);
  assert.equal(f.nativeQueue[f.index].id, trackA.id); assert.deepEqual(f.calls, ['reset', 'seek']);
}));

test('pause cancels a pending private resume and clears its loading state immediately', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); const read = deferred();
  source.invoke = () => read.promise; let pending;
  await act(async () => { pending = f.value.play(); }); assert.equal(f.value.isBuffering, true);
  await act(async () => f.value.pause()); assert.equal(f.value.isBuffering, false);
  await act(async () => { read.resolve(source.freshResponse()); await pending; });
  assert.deepEqual(f.calls, ['pause']); assert.equal(f.wantsPlayback, false);
}));

test('public selection cancels a pending private seek without a stale native load', withPlayer(async f => {
  const source = await privateControlFixture(f); const read = deferred(); source.invoke = () => read.promise;
  let pending; await act(async () => { pending = f.value.seekTo(88); });
  await act(async () => f.value.playTrack(trackB)); f.calls.length = 0;
  await act(async () => { read.resolve(source.freshResponse()); await pending; });
  assert.deepEqual(f.calls, []); assert.equal(f.nativeQueue[f.index].id, trackB.id);
  assert.equal(f.wantsPlayback, true); assert.equal(f.value.isBuffering, false);
}));

for (const [type, position, expectedPosition] of [[Event.RemotePlay, undefined, 37], [Event.RemoteSeek, 84, 84], [Event.RemotePrevious, undefined, 0]]) {
  test(`${type} uses actual private guard with current scoped authority`, withPlayer(async f => {
    const source = await privateControlFixture(f, { paused: type === Event.RemotePlay });
    await f.startService(); f.calls.length = 0; source.calls.length = 0;
    await f.emit({ type, ...(position !== undefined ? { position } : {}) });
    assert.equal(source.calls.length, 1); assert.equal(source.calls[0].name, 'mix-access');
    assert.equal(f.progress.position, expectedPosition); assert.equal(f.wantsPlayback, true);
    assert.ok(!f.calls.includes('reset'));
  }));
}

test('remote next reauthorizes a private target and preserves unrelated public entries', withPlayer(async f => {
  const source = await privateControlFixture(f, { publicFirst: true }); await f.startService();
  await f.emit({ type: Event.RemoteNext });
  assert.equal(source.calls.length, 1); assert.equal(f.nativeQueue[f.index].id, privateMixId);
  assert.deepEqual(f.nativeQueue.filter(t => !t.mixAccess).map(t => t.id), [trackA.id, trackB.id]);
}));

for (const type of [Event.RemotePause, Event.RemoteStop]) {
  test(`${type} defeats an older unresolved remote private play`, withPlayer(async f => {
    const source = await privateControlFixture(f, { paused: true }); await f.startService();
    const read = deferred(); source.invoke = () => read.promise; let pending;
    await act(async () => {
      f.handler({ type: Event.RemotePlay });
      pending = Promise.all([...f.serviceListeners.get(Event.RemotePlay)].map(callback => callback({ type: Event.RemotePlay })));
    });
    await f.emit({ type });
    await act(async () => { read.resolve(source.freshResponse()); await pending; });
    assert.deepEqual(f.calls, [type === Event.RemotePause ? 'pause' : 'stop']);
    assert.equal(f.wantsPlayback, false);
  }));
}

test('service takes sole private expiry ownership and renews without resetting or replaying', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  assert.equal(f.scheduled.size, 1, 'provider and service must not retain duplicate expiry timers');
  await f.advance(270000);
  assert.equal(source.calls.length, 1); assert.deepEqual(f.calls, ['load', 'seek']);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true); assert.equal(f.scheduled.size, 1);
}));

test('service detach returns private expiry ownership to mounted provider', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  await act(async () => f.stopService());
  assert.equal(f.scheduled.size, 1);
  await f.advance(270000);
  assert.equal(source.calls.length, 1); assert.deepEqual(f.calls, ['load', 'seek']);
}));

test('private renewal and actor fencing survive actual React UI unmount', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService(); await f.unmountUI();
  assert.equal(f.authListeners.size, 2); assert.equal(f.appListeners.size, 0);
  await f.advance(270000); assert.equal(source.calls.length, 1); assert.equal(f.progress.position, 37);
  assert.equal(f.wantsPlayback, true);
  await f.auth(nextActor);
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
  assert.equal(f.alerts.length, 0);
}));

test('revoked service grant after UI unmount is removed without hidden Alert or replay', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService(); await f.unmountUI();
  source.invoke = async () => ({ data: null, error: { context: { status: 404 } } });
  await f.advance(270000);
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
  assert.deepEqual(f.calls, ['pause', 'remove']); assert.equal(f.alerts.length, 0); assert.equal(f.scheduled.size, 0);
}));

test('pause during service renewal cannot be followed by automatic play/load', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  const read = deferred(); const originalInvoke = source.invoke;
  source.invoke = (name, options) => options.body.action === 'read' ? originalInvoke(name, options) : read.promise;
  await f.advance(270000); await f.emit({ type: Event.RemotePause });
  await act(async () => { read.resolve(source.freshResponse()); });
  assert.deepEqual(f.calls, ['pause']); assert.equal(f.wantsPlayback, false); assert.equal(f.scheduled.size, 1, 'only foreground paused metadata remains scheduled');
  await f.advance(0); assert.ok([...f.scheduled.values()].every(timer => timer.delay === 200000));
}));

test('a public native transition during private renewal is never overwritten', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  const read = deferred(); const originalInvoke = source.invoke;
  source.invoke = (name, options) => options.body.action === 'read' ? originalInvoke(name, options) : read.promise;
  await f.advance(270000);
  f.index = 1; f.progress.position = 12;
  await act(async () => { read.resolve(source.freshResponse()); });
  assert.deepEqual(f.calls, []); assert.equal(f.nativeQueue[f.index].id, trackB.id);
  assert.equal(f.progress.position, 12); assert.equal(f.wantsPlayback, true);
}));

test('fresh service cannot revive private metadata from a previous JS session', withPlayer(async f => {
  await f.auth(privateOwner);
  const old = new f.mixSession.constructor(); old.bindActor(privateOwner);
  await f.unmountUI();
  f.nativeQueue = [privateMixFor(f, old), trackB]; f.index = 0; f.wantsPlayback = true;
  await f.startService();
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
  assert.deepEqual(f.calls, ['pause', 'remove']);
}));

test('persistent private native-read failure is bounded and stops the known private stream', withPlayer(async f => {
  await privateControlFixture(f); await f.startService();
  f.activeImpl = async () => { throw new Error('Synthetic bridge read failure'); };
  await f.emit({ type: Event.PlaybackState, state: State.Playing });
  await f.advance(1000); await f.advance(1000);
  assert.equal(f.wantsPlayback, false);
  assert.ok(f.calls.includes('pause')); assert.ok(!f.calls.includes('play'));
  assert.equal(f.value.currentTrack, null);
  assert.ok(!JSON.stringify(f.alerts).includes('Synthetic bridge'));
}));

test('unknown/public native-read failure does not stop public music or retry forever', withPlayer(async f => {
  await f.startService();
  f.activeImpl = async () => { throw new Error('Synthetic bridge read failure'); };
  await f.emit({ type: Event.PlaybackState, state: State.Playing });
  await f.advance(1000); await f.advance(1000); await f.advance(5000);
  assert.equal(f.wantsPlayback, true); assert.deepEqual(f.calls, []);
  assert.equal(f.scheduled.size, 0); assert.equal(f.alerts.length, 0);
}));

test('identity change during a pending repeat-mode snapshot cannot alter the next actor playback', withPlayer(async f => {
  await privateControlFixture(f);
  const mode = deferred(); f.repeatReadImpl = () => mode.promise;
  let pending; await act(async () => { pending = f.value.toggleRepeat(); });
  await f.auth(nextActor);
  await act(async () => { mode.resolve('off'); await pending; });
  assert.deepEqual(f.repeatChanges, []); assert.equal(f.nativeRepeat, 'off');
  assert.deepEqual(f.nativeQueue.map(t => t.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
}));

test('payload-free native remote play still goes through private authority', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); await f.startService();
  await act(async () => {
    f.handler({ type: Event.RemotePlay });
    for (const callback of f.serviceListeners.get(Event.RemotePlay)) await callback(undefined);
  });
  assert.equal(source.calls.length, 1); assert.deepEqual(f.calls, ['load', 'seek', 'play']);
  assert.equal(f.wantsPlayback, true); assert.equal(f.progress.position, 37);
}));

test('failed public selection cannot abandon the private stream renewal watcher', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  const resolve = f.resolve; f.resolve = track => track.id === trackB.id ? Promise.resolve(null) : resolve(track);
  await act(async () => { assert.equal(await f.value.playTrack(trackB), null); });
  await f.advance(270000);
  assert.ok([...f.scheduled.values()].some(timer => timer.delay === 0), 'current stream renewal is rearmed for the next event-loop turn');
  await f.advance(0);
  assert.equal(source.calls.length, 1); assert.equal(f.nativeQueue[f.index].id, privateMixId);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true); assert.equal(f.scheduled.size, 1);
}));

test('renewal watcher follows a newer seek grant even without a redundant native event', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  await f.advance(100000); await act(async () => f.value.seekTo(92)); source.calls.length = 0;
  await f.advance(170000); assert.equal(source.calls.length, 0, 'new grant is not expired at old timer');
  await f.advance(100000); assert.equal(source.calls.length, 1);
  assert.equal(f.progress.position, 92); assert.equal(f.wantsPlayback, true); assert.equal(f.scheduled.size, 1);
}));

test('a newer failed selection cannot strand a pending native-read retry', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  let once = true;
  f.activeImpl = async () => { if (once) { once = false; throw new Error('Transient read fixture'); } return f.nativeQueue[f.index]; };
  await f.emit({ type: Event.PlaybackState, state: State.Playing });
  const resolve = f.resolve; f.resolve = track => track.id === trackB.id ? Promise.resolve(null) : resolve(track);
  await act(async () => f.value.playTrack(trackB));
  await f.advance(1000); await f.advance(269000);
  assert.equal(source.calls.length, 1); assert.equal(f.nativeQueue[f.index].id, privateMixId);
  assert.equal(f.wantsPlayback, true); assert.equal(f.scheduled.size, 1);
}));

test('initial track timestamp seeks before any audio and becomes the retained position', withPlayer(async f => {
  await act(async () => f.value.playTrack(trackB, 84));
  assert.deepEqual(f.calls, ['reset', 'seek', 'play']);
  assert.equal(f.progress.position, 84); assert.equal(f.nativeQueue[f.index].id, trackB.id);
}));

test('invalid initial timestamps leave the current native timeline untouched', withPlayer(async f => {
  for (const value of [-1, NaN, Infinity]) await act(async () => { assert.equal(await f.value.playTrack(trackB, value), null); });
  assert.deepEqual(f.calls, []); retained(f);
}));

test('pause during a pending positioned selection prevents later seek or autoplay', withPlayer(async f => {
  const pending = deferred(); f.addImpl = () => pending.promise;
  let selected; await act(async () => { selected = f.value.playTrack(trackB, 84); });
  await act(async () => f.value.pause());
  await act(async () => { pending.resolve(); await selected; });
  assert.ok(!f.calls.includes('seek')); assert.ok(!f.calls.includes('play')); assert.equal(f.wantsPlayback, false);
}));

test('private permission loss in background defers generic feedback until foreground once', withPlayer(async f => {
  await privateControlFixture(f); await f.app('background');
  const access = f.nativeQueue[f.index].mixAccess;
  await act(async () => f.mixSession.invalidateAuthorization(access.authorizationId));
  assert.equal(f.alerts.length, 0); assert.equal(f.wantsPlayback, false);
  await f.app('active'); assert.equal(f.alerts.length, 1);
  assert.ok(!JSON.stringify(f.alerts).includes('Synthetic private'));
  await f.app('background'); await f.app('active'); assert.equal(f.alerts.length, 1);
}));

test('a new public selection clears deferred private failure feedback', withPlayer(async f => {
  await privateControlFixture(f); await f.app('background');
  await act(async () => f.mixSession.invalidateAuthorization(f.nativeQueue[f.index].mixAccess.authorizationId));
  await act(async () => f.value.playTrack(trackA));
  await f.app('active'); assert.equal(f.alerts.length, 0); assert.equal(f.nativeQueue[f.index].id, trackA.id);
}));

test('long private playback renews artwork and native metadata after the UI unmounts', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService(); await f.unmountUI();
  const cover = `https://project.supabase.co/storage/v1/object/sign/mix-media/${privateOwner}/${privateMixId}/cover/fresh.jpg?token=cover`;
  const metadata = source.metadataResponse;
  source.metadataResponse = () => { const result = metadata(); result.data.mix.title = 'Fresh private title'; result.data.mix.cover_url = cover; return result; };
  await f.advance(270000);
  const actual = f.nativeQueue[f.index];
  assert.equal(actual.artwork, cover); assert.equal(actual.title, 'Fresh private title');
  assert.equal(source.metadataCalls.length, 1); assert.equal(source.calls.length, 1);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true);
  assert.equal(actual.playbackSource.expiresAt, f.now + 300000);
}));

test('recent detail metadata is reused and the earlier cover expiry controls the next renewal', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  await f.advance(200000); await act(async () => source.access.read(privateMixId));
  const readAt = f.now; assert.equal(source.metadataCalls.length, 1);
  await f.advance(70000);
  assert.equal(source.metadataCalls.length, 1, 'recent scoped detail read is reused');
  assert.equal(f.nativeQueue[f.index].playbackSource.expiresAt, readAt + 300000);
  const timer = [...f.scheduled.values()][0]; assert.equal(timer.delay, 200000);
  await f.advance(200000); assert.equal(source.metadataCalls.length, 2);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true);
}));

test('private metadata denial removes stale artwork/audio while preserving the public queue', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService();
  const originalInvoke = source.invoke;
  source.invoke = (name, options) => options.body.action === 'read' ? Promise.resolve({ data: null, error: { status: 404 } }) : originalInvoke(name, options);
  await f.advance(270000);
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
  assert.equal(source.calls.length, 0, 'denied metadata cannot continue to audio signing');
}));

test('late valid private metadata after pause cannot reload or autoplay', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService(); const pending = deferred();
  const originalInvoke = source.invoke;
  source.invoke = (name, options) => options.body.action === 'read' ? pending.promise : originalInvoke(name, options);
  await f.advance(270000); await f.emit({ type: Event.RemotePause });
  await act(async () => pending.resolve(source.metadataResponse()));
  assert.deepEqual(f.calls, ['pause']); assert.equal(f.wantsPlayback, false); assert.equal(f.scheduled.size, 1, 'only foreground paused metadata remains scheduled');
  await f.advance(0); assert.ok([...f.scheduled.values()].every(timer => timer.delay === 200000));
}));

test('verified private-to-public transition retains public TTL and removes protected metadata marker', withPlayer(async f => {
  const source = await privateControlFixture(f); await f.startService(); const metadata = source.metadataResponse;
  source.metadataResponse = () => { const result = metadata(); result.data.mix.visibility = 'public'; result.data.public = true; return result; };
  const originalInvoke = source.invoke;
  source.invoke = (name, options) => options.body.action === 'play' ? Promise.resolve({ data: { url: 'https://project.supabase.co/storage/v1/object/sign/audio-files/public.mp3?token=fresh', expiresIn: 14400 }, error: null }) : originalInvoke(name, options);
  await f.advance(270000);
  assert.equal(f.nativeQueue[f.index].mixAccess, undefined); assert.equal(f.nativeQueue[f.index].playbackSource.expiresAt, f.now + 14400000);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true); assert.equal(f.scheduled.size, 0);
}));

test('foreground paused Mix refresh updates shared UI/queue/native artwork without playback commands', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); await f.render();
  const metadata = source.metadataResponse;
  const cover = `https://project.supabase.co/storage/v1/object/sign/mix-media/${privateOwner}/${privateMixId}/cover/paused.jpg?token=cover`;
  source.metadataResponse = () => { const result = metadata(); result.data.mix.title = 'Refreshed paused mix'; result.data.mix.cover_url = cover; return result; };
  await f.advance(200000);
  assert.equal(source.metadataCalls.length, 1); assert.equal(source.calls.length, 0);
  assert.equal(f.value.currentTrack.title, 'Refreshed paused mix'); assert.equal(f.value.currentTrack.artwork, cover);
  assert.equal(f.value.queue[0].title, 'Refreshed paused mix'); assert.equal(f.value.queue[0].artwork, cover);
  assert.equal(f.metadataUpdates.length, 1); assert.equal(f.metadataUpdates[0].metadata.artwork, cover);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, false); assert.deepEqual(f.calls, []);
  assert.equal(f.value.mixMetadataRefreshing, false);
}));

test('paused metadata suspends in background and foreground checks hide expired presentation until refreshed', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); await f.render();
  await f.app('background'); await f.advance(310000);
  assert.equal(source.metadataCalls.length, 0); assert.equal(f.metadataUpdates.length, 0);
  await f.render(); assert.equal(f.value.currentTrack.title, 'Private mix'); assert.equal(f.value.currentTrack.artwork, undefined);
  await f.app('active'); await f.advance(0);
  assert.equal(source.metadataCalls.length, 1); assert.equal(f.wantsPlayback, false); assert.equal(f.progress.position, 37);
}));

test('paused metadata denial clears private labels and leaves a scoped recovery destination', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); await f.render();
  source.invoke = async () => ({ data: null, error: { status: 404 } });
  await f.advance(200000);
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
  assert.equal(f.value.mixRecovery.mixId, privateMixId); assert.ok(!JSON.stringify(f.value.mixRecovery).includes('Private fixture'));
  await act(async () => f.value.playTrack(trackA)); assert.equal(f.value.mixRecovery, null);
}));

test('account switch during paused metadata cannot update native or recover the old actor', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); await f.render(); const pending = deferred();
  source.invoke = () => pending.promise; await f.advance(200000); assert.equal(f.value.mixMetadataRefreshing, true);
  await f.auth(nextActor); await act(async () => pending.resolve(source.metadataResponse()));
  assert.equal(f.metadataUpdates.length, 0); assert.equal(f.value.mixRecovery, null);
  assert.ok(!JSON.stringify(f.value.queue).includes('Private fixture')); assert.equal(f.wantsPlayback, false);
}));

test('new public selection while paused metadata is pending cannot receive its metadata', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); await f.render(); const pending = deferred();
  const originalInvoke = source.invoke;
  source.invoke = (name, options) => options.body.action === 'read' ? pending.promise : originalInvoke(name, options);
  await f.advance(200000); await act(async () => f.value.playTrack(trackA));
  assert.equal(f.value.mixMetadataRefreshing, false, 'old metadata busy state clears on a new selection');
  await act(async () => pending.resolve(source.metadataResponse()));
  assert.equal(f.nativeQueue[f.index].id, trackA.id); assert.equal(f.metadataUpdates.length, 0);
  assert.equal(f.value.mixRecovery, null); assert.equal(f.value.currentTrack.title, trackA.title);
}));

test('paused native metadata failure is reported without a false successful OS update', withPlayer(async f => {
  await privateControlFixture(f, { paused: true }); await f.render();
  f.metadataImpl = async () => { throw new Error('Native metadata fixture failure'); };
  await f.advance(200000);
  assert.equal(f.metadataUpdates.length, 1); assert.equal(f.value.mixRecovery.mixId, privateMixId);
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
}));

test('paused private-to-public metadata refresh preserves public playback and full TTL on resume', withPlayer(async f => {
  const source = await privateControlFixture(f, { paused: true }); await f.render(); const metadata = source.metadataResponse;
  source.metadataResponse = () => { const result = metadata(); result.data.mix.visibility = 'public'; result.data.public = true; return result; };
  const originalInvoke = source.invoke;
  source.invoke = (name, options) => options.body.action === 'play' ? Promise.resolve({ data: { url: 'https://project.supabase.co/storage/v1/object/sign/audio-files/public.mp3?token=fresh', expiresIn: 14400 }, error: null }) : originalInvoke(name, options);
  await f.advance(200000); assert.equal(f.wantsPlayback, false); assert.equal(source.metadataCalls.length, 1);
  await act(async () => f.value.play());
  assert.equal(source.metadataCalls.length, 1, 'resume reuses the checked public transition');
  assert.equal(f.nativeQueue[f.index].mixAccess, undefined); assert.equal(f.nativeQueue[f.index].playbackSource.expiresAt, f.now + 14400000);
  assert.equal(f.wantsPlayback, true); assert.equal(f.progress.position, 37);
}));

test('manual artwork retry refreshes only native metadata while the Mix keeps playing', withPlayer(async f => {
  const source = await privateControlFixture(f); const before = f.nativeQueue[f.index].url;
  const metadata = source.metadataResponse;
  source.metadataResponse = () => { const result = metadata(); result.data.mix.cover_url = `https://project.supabase.co/storage/v1/object/sign/mix-media/${privateOwner}/${privateMixId}/cover/retry.jpg?token=fresh`; return result; };
  await act(async () => f.value.refreshMixPresentation());
  assert.equal(source.metadataCalls.length, 1); assert.equal(source.calls.length, 0);
  assert.equal(f.nativeQueue[f.index].url, before); assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true);
  assert.equal(f.metadataUpdates.length, 1); assert.deepEqual(f.calls, []); assert.equal(f.value.mixMetadataRefreshing, false);
}));

test('paused native artwork keeps the existing Android low-memory transformation', async () => {
  const f = await fixture({ constrained: true });
  try {
    const source = await privateControlFixture(f, { paused: true }); await f.render();
    const metadata = source.metadataResponse;
    source.metadataResponse = () => { const result = metadata(); result.data.mix.cover_url = `https://project.supabase.co/storage/v1/object/sign/mix-media/${privateOwner}/${privateMixId}/cover/mobile.jpg?token=fresh`; return result; };
    await f.advance(200000);
    assert.equal(f.artworkCalls.at(-1).width, 192); assert.equal(f.metadataUpdates[0].metadata.artwork, '', 'untransformable signed artwork is omitted on constrained Android');
    assert.ok(f.value.currentTrack.artwork.includes('/object/sign/'), 'UI retains its validated metadata');
    source.metadataResponse = () => { const result = metadata(); result.data.mix.visibility = 'public'; result.data.mix.status = 'draft'; result.data.mix.cover_url = 'https://project.supabase.co/storage/v1/object/public/covers/mobile.jpg'; return result; };
    await act(async () => f.value.refreshMixPresentation());
    assert.ok(f.metadataUpdates.at(-1).metadata.artwork.includes('/render/image/public/covers/mobile.jpg?width=192&resize=contain'));
  } finally { await f.close(); }
});

test('queue selection remains on the chosen public item while invalid private removal is pending', withPlayer(async f => {
  await privateControlFixture(f);
  await act(async () => f.value.playQueue([privateMixFor(f), trackA, trackB])); await f.render();
  const removal = deferred(); f.removeImpl = () => removal.promise;
  try {
    await act(async () => f.mixSession.invalidateAuthorization(f.nativeQueue[0].mixAccess.authorizationId));
    assert.deepEqual(f.value.queue.map(track => track.id), [trackA.id, trackB.id]);
    let selected; await act(async () => { selected = f.value.skipToQueueIndex(1); });
    await act(async () => { removal.resolve(); await selected; });
    assert.equal(f.nativeQueue[f.index].id, trackB.id); assert.equal(f.value.currentTrack.id, trackB.id);
  } finally { removal.resolve(); }
}));

test('a removed rendered queue target cannot be replaced by another native item', withPlayer(async f => {
  await act(async () => f.value.pause()); await f.render();
  f.nativeQueue = [trackA]; f.index = 0; f.calls.length = 0;
  await act(async () => f.value.skipToQueueIndex(1));
  assert.equal(f.nativeQueue[f.index].id, trackA.id); assert.equal(f.wantsPlayback, false); assert.ok(!f.calls.includes('play'));
}));

test('explicit release and explicit child denial preserve the current queue and never select a different song', withPlayer(async f => {
  for (const level of ['ageRelease', 'ageTrack']) {
    f[level].explicit = true;
    const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
    f.calls.length = 0;
    await act(async () => { assert.equal(await f.value.playQueue([protectedTrack, trackB]), null); });
    assert.equal(f.nativeQueue[f.index].id, trackA.id); assert.equal(f.calls.includes('play'), false);
    assert.equal(source.calls.length, 0); assert.match(f.alerts.at(-1)[1], /Sign in/);
    f[level].explicit = false;
  }
}));

test('canonical metadata defeats caller-supplied clean flags and a foreign playback URL', withPlayer(async f => {
  const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  await f.auth('adult'); f.ageTrack.explicit = true;
  let active; await act(async () => { active = await f.value.playTrack({ ...protectedTrack, explicit: false, url: 'https://foreign.test/paid-master.mp3' }); });
  assert.ok(active?.releaseAccess); assert.equal(active.releaseId, f.ageRelease.id);
  assert.equal(active.url, source.result.data.signedUrl);
  assert.equal(active.playbackSource.originalUrl, f.ageTrack.audio_url);
  assert.equal(source.calls[0].body.contentId, f.ageTrack.id);
}));

test('canonical imported parent and subscriber parent cannot expose a child master', withPlayer(async f => {
  const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  f.ageRelease.catalogue_mode = 'reference';
  await act(async () => { assert.equal(await f.value.playTrack(protectedTrack), null); });
  assert.equal(source.calls.length, 0); assert.equal(f.nativeQueue[f.index].id, trackA.id);
  f.ageRelease.catalogue_mode = 'pluggd'; f.ageRelease.is_premium_content = true;
  await act(async () => { assert.equal(await f.value.playTrack(protectedTrack), null); });
  assert.equal(source.calls.length, 0); assert.equal(f.nativeQueue[f.index].id, trackA.id);
  f.ageRelease.preview_url = 'https://project.supabase.co/storage/v1/object/public/audio-files/parent-preview.mp3';
  await act(async () => { assert.ok(await f.value.playTrack(protectedTrack)); });
  assert.equal(source.calls.at(-1).body.contentId, f.ageRelease.id, 'parent preview signer must not resolve child master');
}));

test('account switch stops active release audio and removes its grant while keeping unrelated public entries', withPlayer(async f => {
  await f.auth('adult'); f.ageTrack.explicit = true;
  await protectedQueue(f); f.calls.length = 0;
  await f.auth(null);
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackB.id]);
  assert.equal(f.wantsPlayback, false); assert.ok(!f.calls.includes('reset')); assert.ok(!f.calls.includes('play'));
}));

test('queued release account revocation leaves public recovery position and retry intact', withPlayer(async f => {
  await f.auth('adult'); const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  await act(async () => f.value.playQueue([trackA, protectedTrack])); await f.render();
  f.progress.position = 41; await f.render(); f.calls.length = 0;
  await f.error(); await f.auth(null); await f.advance(1200);
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackA.id]);
  assert.equal(f.progress.position, 41); assert.deepEqual(f.calls, ['remove', 'retry']);
}));

test('expired queued release rechecks current explicit policy before skip and never resumes denied audio', withPlayer(async f => {
  await f.auth('adult'); const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  await act(async () => f.value.playQueue([trackA, protectedTrack])); await f.render();
  f.now += 301000; f.ageTrack.explicit = true; f.ageDOB = '2015-11-09'; f.calls.length = 0;
  await act(async () => f.value.skipToQueueIndex(1));
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackA.id]); assert.equal(f.nativeQueue[f.index].id, trackA.id);
  assert.ok(!f.calls.includes('load')); assert.ok(!f.calls.includes('play'));
}));

test('release background renewal and actor invalidation survive UI unmount without an extra timer', withPlayer(async f => {
  await f.auth('adult'); const source = await protectedQueue(f); await f.startService(); await f.unmountUI();
  assert.equal(f.scheduled.size, 1); f.calls.length = 0;
  await f.advance(270000); assert.equal(source.calls.length, 2); assert.deepEqual(f.calls, ['load', 'seek']);
  assert.equal(f.progress.position, 37); assert.equal(f.wantsPlayback, true);
  await f.auth(null); assert.deepEqual(f.nativeQueue.map(track => track.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
}));

test('active release fails closed when refreshed private demographics no longer authorise it', withPlayer(async f => {
  await f.auth('adult'); await protectedQueue(f); f.ageTrack.explicit = true; f.ageDOB = '2015-11-09'; f.calls.length = 0;
  await f.advance(270000);
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
  assert.ok(f.calls.includes('pause')); assert.ok(!f.calls.includes('play')); assert.equal(f.alerts.length, 1);
}));

test('native release seek rechecks age policy and cannot resume newly denied music', withPlayer(async f => {
  await f.auth('adult'); await protectedQueue(f); await f.startService();
  f.ageTrack.explicit = true; f.ageDOB = '2015-11-09'; f.calls.length = 0;
  await f.emit({ type: Event.RemoteSeek, position: 88 });
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackB.id]); assert.equal(f.wantsPlayback, false);
  assert.ok(!f.calls.includes('seek')); assert.ok(!f.calls.includes('play'));
}));

test('natural advancement pauses a stale queued release before its age-policy read', withPlayer(async f => {
  await f.auth('adult'); const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  await act(async () => f.value.playQueue([trackA, protectedTrack])); await f.render(); await f.startService();
  f.now += 6000; f.ageTrack.explicit = true; f.ageDOB = '2015-11-09'; f.index = 1; f.calls.length = 0;
  const originalFrom = f.timers.releaseAgeDb.from;
  f.timers.releaseAgeDb.from = table => { if (table === 'tracks') assert.equal(f.wantsPlayback, false, 'stale native release must pause before policy data is read'); return originalFrom(table); };
  await f.emit({ type: Event.PlaybackActiveTrackChanged, track: f.nativeQueue[1] });
  assert.equal(f.calls[0], 'pause'); assert.ok(!f.calls.includes('play'));
  assert.deepEqual(f.nativeQueue.map(track => track.id), [trackA.id]); assert.equal(f.wantsPlayback, false);
}));

test('missing DOB offers the existing private account website flow and retries after completion', withPlayer(async f => {
  await f.auth('adult'); f.ageTrack.explicit = true; f.ageDOB = null;
  const source = sourceFixture(f.timers); f.resolve = (track, options) => source.api.resolvePlaybackTrack(track, options);
  await act(async () => { assert.equal(await f.value.playTrack(protectedTrack), null); });
  const feedback = f.alerts.at(-1);
  assert.match(feedback[1], /Optional personal details/);
  const open = feedback[2].find(button => button.text === 'Open account on web'); assert.ok(open);
  await act(async () => open.onPress());
  assert.equal(f.recoveryUrl, 'https://pluggd.fm/dashboard/settings/account');
  f.ageDOB = '1990-01-01'; await act(async () => { assert.ok(await f.value.playTrack(protectedTrack)); });
}));

let failures = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack || error}`); }
}
dom.window.close();
assert.equal(failures, 0, `${failures}/${tests.length} playback recovery cases failed`);
console.log(`PASS ${tests.length} actual-source React playback recovery cases. Local native-boundary fixtures; no physical-device or live protected-source renewal proof.`);
