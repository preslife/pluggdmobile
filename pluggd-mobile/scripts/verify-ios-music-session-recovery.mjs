import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Actual React components; only native/device, storage and network boundaries are mocked.
const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');
const { JSDOM } = createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || new URL('../../package.json', import.meta.url))('jsdom');
const dom = new JSDOM('<html><body></body></html>', { url: 'https://fixture.test' });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let clock = 0, timerId = 0;
const timers = new Map();
const advance = ms => { clock += ms; for (const [id, t] of [...timers]) if (t.at <= clock) { timers.delete(id); t.fn(); } };
const flush = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
function load(path, mocks, expose = '') {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, fileName: path, reportDiagnostics: true });
  assert.equal(output.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(output.outputText + expose, { module, exports: module.exports, console, process, URL, AbortController,
    setTimeout: (fn, ms = 0) => { const id = ++timerId; timers.set(id, { fn, at: clock + ms }); return id; }, clearTimeout: id => timers.delete(id),
    require: name => { if (name === 'react' || name === 'react/jsx-runtime') return require(name); assert.ok(Object.hasOwn(mocks, name), 'Unmocked ' + name); return mocks[name]; },
  }, { filename: path });
  return module.exports;
}
const Box = ({ children }) => React.createElement('div', null, children);
const Button = ({ children, label, accessibilityLabel, disabled, onPress }) => React.createElement('button', { disabled, onClick: onPress, 'aria-label': accessibilityLabel || label }, label || children);
const noop = () => {};
const pauseGlobal = async () => {};
const auth = { user: { id: 'actor-a' }, session: { access_token: 'token-a' } };
const appState = { currentState: 'active', listeners: new Set(), addEventListener(_name, fn) { this.listeners.add(fn); return { remove: () => this.listeners.delete(fn) }; } };
async function background(state) { await act(async () => { appState.currentState = state; for (const fn of [...appState.listeners]) fn(state); await flush(); }); }
const rn = { View: Box, Text: Box, ScrollView: Box, KeyboardAvoidingView: Box, TextInput: Box, Pressable: Button,
  ActivityIndicator: () => React.createElement('span', null, 'Loading'), Modal: ({ visible, children }) => visible ? React.createElement(Box, null, children) : null,
  AppState: appState, Platform: { OS: 'ios' }, StyleSheet: { create: s => s, absoluteFill: {} },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  Alert: { alert: (_title, _copy, buttons) => buttons?.find(b => b.text === 'Continue draft')?.onPress() },
  Animated: { Value: class {}, View: Box, timing: () => ({ start: noop }) },
};
function player() { return { playing: false, pause: noop, play: noop, replaceAsync: async () => {}, addListener: () => ({ remove: noop }) }; }
function videoMock(make) { return { VideoView: () => React.createElement('span', null, 'Video ready'), useVideoPlayer: () => { const ref = React.useRef(); if (!ref.current) ref.current = make(); return ref.current; } }; }
async function mount(Component) {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => { root.render(React.createElement(Component)); await flush(); });
  return { container, render: async () => { await act(async () => { root.render(React.createElement(Component)); await flush(); }); }, close: async () => { await act(async () => root.unmount()); container.remove(); timers.clear(); appState.listeners.clear(); appState.currentState = 'active'; auth.session.access_token = 'token-a'; } };
}
function viewer(make, playback) {
  return load('../src/features/culture/MobileSocialMediaViewer.tsx', {
    '@expo/vector-icons': { MaterialIcons: () => null }, 'expo-status-bar': { StatusBar: () => null }, 'expo-video': videoMock(make),
    'react-native': rn, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../../components/PluggdImage': { Image: Box, PluggdImage: Box }, '../../design/typography': { pluggdFonts: {} },
    '../../context/AuthProvider': { useAuth: () => auth }, '../../context/PlaybackProvider': { usePlayback: () => ({ pause: pauseGlobal }) },
    '../social-music/model': { musicError: e => e.message, musicPostId: () => 'private-post' }, '../social-music/service': { musicPlayback: playback },
  }, '\nmodule.exports.TestVideo = SessionVideo;').TestVideo;
}
const tests = [];
tests.push(['private signer completion after background cannot install its URL', async () => {
  const request = deferred(); const replacements = []; let signal;
  const Video = viewer(() => ({ ...player(), replaceAsync: async uri => { replacements.push(uri); } }), (_id, s) => { signal = s; return request.promise; });
  const view = await mount(() => React.createElement(Video, { uri: 'private' }));
  try {
    await background('background');
    await act(async () => { request.resolve('https://private/old-token'); await flush(); });
    assert.equal(signal.aborted, true); assert.ok(!replacements.includes('https://private/old-token'));
    assert.equal(view.container.textContent.includes('Video ready'), false);
  } finally { await view.close(); }
}]);
tests.push(['pending native replacement clears in order; foreground obtains a fresh URL', async () => {
  const pending = deferred(); const calls = []; let source = null, requests = 0;
  const Video = viewer(() => ({ ...player(), replaceAsync: async uri => { calls.push(uri); if (uri === 'https://private/old') await pending.promise; source = uri; } }), async () => ++requests === 1 ? 'https://private/old' : 'https://private/fresh');
  const view = await mount(() => React.createElement(Video, { uri: 'private' }));
  try {
    await background('background');
    await act(async () => { pending.resolve(); await flush(); });
    assert.equal(source, null); assert.equal(view.container.textContent.includes('Video ready'), false);
    await background('active');
    assert.equal(requests, 2); assert.equal(source, 'https://private/fresh'); assert.match(view.container.textContent, /Video ready/);
    assert.ok(calls.lastIndexOf(null) > calls.indexOf('https://private/old'));
  } finally { await view.close(); }
}]);
function editor(save, files, removed, state) {
  const model = load('../src/features/social-music/model.ts', {});
  const draft = { userId: 'actor-a', uploadId: 'up', requestId: 'req', postId: 'post', content: 'Keep caption', destinations: [],
    media: { uri: 'file:///acknowledged.jpg', localName: 'acknowledged.jpg', kind: 'photo', mimeType: 'image/jpeg', duration: 15 },
    track: null, recipe: { startSeconds: 0, durationSeconds: 15, contentDurationSeconds: 15, timelineOffsetSeconds: 0, musicGain: 0.8, originalGain: 0.6 }, updatedAt: Date.now() };
  const router = { back: () => { state.left = true; }, push: noop, replace: noop };
  return load('../src/features/social-music/MusicPostEditor.tsx', {
    '@expo/vector-icons': { MaterialIcons: () => null }, expo: { useEvent: () => ({ isPlaying: false }) }, 'expo-crypto': { randomUUID: () => 'fresh-id' },
    'expo-image-picker': { requestMediaLibraryPermissionsAsync: async () => ({ granted: true }), launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///original.jpg', type: 'image', mimeType: 'image/jpeg' }] }), VideoExportPreset: { H264_1920x1080: 'fixture' }, UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'fixture' } },
    'expo-linear-gradient': { LinearGradient: Box }, 'expo-status-bar': { StatusBar: () => null }, 'expo-video': videoMock(player),
    'expo-router': { Stack: { Screen: () => null }, useFocusEffect: fn => React.useEffect(fn, [fn]), useLocalSearchParams: () => ({}), useRouter: () => router },
    'react-native': rn, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }, '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    '../../components/PluggdImage': { PluggdImage: ({ uri }) => React.createElement('span', null, uri) }, '../../context/AuthProvider': { useAuth: () => auth },
    '../../context/PlaybackProvider': { usePlayback: () => ({ pause: pauseGlobal }) }, '../../design/haptics': { impactHaptic: noop, selectionHaptic: noop },
    '../../design/typography': { pluggdFonts: {} }, '../../design/usePluggdTheme': { usePluggdTheme: () => ({ colors: { background: '#FFF8ED' } }) },
    './MusicControls': { MusicButton: Button, MusicTool: Button, MusicSlider: Box, MusicWaveform: Box, SoundArtwork: Box }, './SoundPickerSheet': { SoundPickerSheet: () => null }, './model': model,
    './service': { readMusicDraft: async () => draft, saveMusicDraft: save, keepMusicMedia: async () => { files.add('file:///fresh.jpg'); return { ...draft.media, uri: 'file:///fresh.jpg', localName: 'fresh.jpg' }; }, removeMusicMedia: m => { if (m) { removed.push(m.uri); files.delete(m.uri); } }, searchMusic: async () => [], },
  }).MusicPostEditor;
}
for (const delay of [100, 800, 'token-refresh', 'token-refresh-success']) tests.push(['media acknowledgement after ' + delay + ' preserves the correct draft and file, including immediate exit', async () => {
  const pending = deferred(); const files = new Set(['file:///original.jpg', 'file:///acknowledged.jpg']); const removed = [], writes = []; const state = {}; let current;
  const Editor = editor(async next => { writes.push(next.media?.uri); if (next.media?.uri === 'file:///fresh.jpg') { await pending.promise; } current = next; }, files, removed, state);
  const view = await mount(Editor);
  try {
    await act(async () => { advance(400); await flush(); });
    const button = [...view.container.querySelectorAll('button')].find(b => b.textContent === 'Media'); assert.ok(button);
    await act(async () => { button.click(); await flush(); });
    if (typeof delay === 'string') { auth.session.access_token = 'token-b'; await view.render(); }
    await act(async () => { advance(typeof delay === 'number' ? delay : 800); await flush(); });
    await act(async () => { if (delay === 'token-refresh-success') pending.resolve(); else pending.reject(new Error('Device storage full')); await flush(); });
    const close = view.container.querySelector('[aria-label="Close and save draft"]'); assert.ok(close && !close.disabled);
    await act(async () => { close.click(); await flush(); });
    assert.equal(current.content, 'Keep caption'); assert.equal(state.left, true); assert.ok(files.has('file:///original.jpg'));
    if (delay === 'token-refresh-success') {
      assert.equal(current.media.uri, 'file:///fresh.jpg'); assert.ok(files.has('file:///fresh.jpg')); assert.ok(!files.has('file:///acknowledged.jpg'));
      assert.equal(removed.filter(uri => uri === 'file:///acknowledged.jpg').length, 1);
    } else {
      assert.equal(writes.filter(uri => uri === 'file:///fresh.jpg').length, 1, 'No queued second write of rejected/disposed media');
      assert.equal(current.media.uri, 'file:///acknowledged.jpg'); assert.ok(files.has('file:///acknowledged.jpg')); assert.ok(!files.has('file:///fresh.jpg')); assert.ok(!removed.includes('file:///acknowledged.jpg'));
    }
  } finally { await view.close(); }
}]);
let failed = 0;
for (const [name, run] of tests) { try { await run(); console.log('PASS: ' + name); } catch (error) { failed++; console.error('FAIL: ' + name, error); } }
dom.window.close();
assert.equal(failed, 0, failed + ' music session recovery checks failed');
console.log('PASS: 6 actual-component music session recovery scenarios. Native/network/storage boundaries are fixtures; no device or production proof.');
