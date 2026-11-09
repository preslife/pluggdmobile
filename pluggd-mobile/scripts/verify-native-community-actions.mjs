import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript'), React = require('react'), { act } = React;
let JSDOM;
try { ({ JSDOM } = require('jsdom')); } catch { ({ JSDOM } = createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || '/Users/apple/PLUGGD_NEW/package.json')('jsdom')); }
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://fixture.test', pretendToBeVisual: true });
globalThis.ShadowRoot = dom.window.ShadowRoot; globalThis.HTMLElement = dom.window.HTMLElement; globalThis.Node = dom.window.Node; globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const { createRoot } = require('react-dom/client');
const rn = require('react-native-web');
const base = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, base), 'utf8');
function load(name, mocks = {}, source = read(name), globals = {}) {
  const output = ts.transpileModule(source, { fileName: name, reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  assert.equal(output.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(output.outputText, { module, exports: module.exports, require: key => Object.hasOwn(mocks, key) ? mocks[key] : require(key), AbortController, URL, Promise, Object, Map, Set, Error, console, setTimeout, clearTimeout, process, ...globals }, { filename: name });
  return module.exports;
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tests = []; const test = (name, run) => tests.push({ name, run });
const fixtureRelease = { id: uuid(1), title: 'The Album', artist: 'The Artist', audio_url: 'https://audio/master.mp3', cover_art_url: 'https://image/art.jpg', catalogue_mode: 'pluggd' };
const mobile = load('src/lib/mobileContent.ts', {}, read('src/lib/mobileContent.ts').slice(read('src/lib/mobileContent.ts').indexOf('export function releasePlayableUrl('), read('src/lib/mobileContent.ts').indexOf('export function toTrack(')));
function loaderFixture() {
  const f = { session: { access_token: 'actor-a' }, release: fixtureRelease, tracks: [{ id: uuid(2), title: 'First', audio_url: 'https://audio/first.mp3', duration: 99, playable_on_pluggd: true }], calls: [], ageCalls: [] };
  const db = { auth: { getSession: async () => ({ data: { session: f.session } }) }, from(table) {
    const call = { table, filters: [] }; f.calls.push(call);
    const chain = { select(value) { call.columns = value; if (table === 'tracks') assert.ok(!value.split(',').includes('preview_url'), 'tracks.preview_url does not exist in hosted schema'); return chain; }, eq(...args) { call.filters.push(args); return chain; }, in(...args) { call.filters.push(args); return chain; }, order(...args) { call.order = args; return chain; }, abortSignal(signal) { call.signal = signal; return chain; }, maybeSingle() { return chain; }, then(resolve, reject) { return Promise.resolve(f.readWait?.promise).then(() => ({ data: table === 'releases' ? f.release : f.tracks, error: f.error })).then(resolve, reject); } };
    return chain;
  } };
  f.api = load('src/features/community-feed/releasePostPlayback.ts', {
    '../../lib/supabase': { supabase: db }, '../../lib/mobileContent': mobile,
    '../playback/releaseAgeAccess': { assertReleaseAccess: async identity => { f.ageCalls.push(identity); if (f.ageError) throw Error(f.ageError); if (f.ageWait) await f.ageWait.promise; } },
  });
  return f;
}
test('canonical links resolve only genuine release routes', () => {
  const f = loaderFixture(), id = uuid(1);
  for (const url of [`/release/${id}`, `https://pluggd.fm/release/${id}?track=song`, `https://www.pluggd.live/release/${id}`]) assert.equal(f.api.releaseIdForPost({ url }), id);
  assert.equal(f.api.releaseIdForPost({url:'https://www.pluggd.fm/release/omo-ita-1'}), 'omo-ita-1');
  for (const url of [`https://pluggd.fm:444/release/${id}`, `https://user@pluggd.fm/release/${id}`, `/release/space%20key`, `https://evil.example/release/${id}`, `javascript:alert(1)`, `/release/${id}/other`, `https://pluggd.fm.evil.example/release/${id}`]) assert.equal(f.api.releaseIdForPost({ url }), null);
});
test('track queue retains actual identities, metadata and published visibility guards', async () => {
  const f = loaderFixture(), queue = await f.api.loadPostReleaseQueue(uuid(1));
  assert.equal(queue.length, 1); assert.equal(queue[0].trackId, uuid(2)); assert.equal(queue[0].releaseId, uuid(1)); assert.equal(queue[0].url, 'https://audio/first.mp3'); assert.equal(queue[0].duration, 99);
  assert.equal(f.ageCalls[0].releaseId, uuid(1));
  assert.ok(f.calls[0].filters.some(([key, val]) => key === 'approved' && val === true)); assert.ok(f.calls[0].filters.some(([key, val]) => key === 'visibility_status' && val === 'visible'));
});
test('no denied or unavailable track can silently fall back to the album master', async () => {
  for (const restriction of [{ playable_on_pluggd: false }, { audio_rights_status: 'unlicensed' }, { audio_rights_status: 'takedown' }, { audio_url: null }]) {
    const f = loaderFixture(); f.tracks = [{ ...f.tracks[0], ...restriction }]; await assert.rejects(f.api.loadPostReleaseQueue(uuid(1)), /no playable audio/);
  }
  const f = loaderFixture(); f.tracks = []; assert.equal((await f.api.loadPostReleaseQueue(uuid(1)))[0].url, fixtureRelease.audio_url);
});
test('restricted parent supplies only public preview and cannot fall back to child/master', async () => {
 for (const restriction of [{ is_exclusive: true }, { is_premium_content: true }, { perk_access: 'members' }]) {
  const f = loaderFixture(); f.release = { ...f.release, ...restriction, preview_url: 'https://audio/public-preview.mp3' };
  const queue = await f.api.loadPostReleaseQueue(uuid(1)); assert.equal(queue.length, 1); assert.equal(queue[0].url, 'https://audio/public-preview.mp3'); assert.equal(queue[0].trackId, undefined);
  f.release.preview_url = null; await assert.rejects(f.api.loadPostReleaseQueue(uuid(1)), /no public preview/);
 }
});
test('imports, age denial, read failure and aborted/stale actor reads fail closed', async () => {
  for (const change of [{ catalogue_mode: 'imported' }, { catalogue_import_job_id: 'import' }]) { const f = loaderFixture(); f.release = { ...f.release, ...change }; await assert.rejects(f.api.loadPostReleaseQueue(uuid(1)), /not available/); }
  const age = loaderFixture(); age.ageError = 'age blocked'; await assert.rejects(age.api.loadPostReleaseQueue(uuid(1)), /age blocked/); assert.equal(age.calls.filter(call=>call.table==='tracks').length, 0);
  const error = loaderFixture(); error.error = { message: 'private provider detail' }; await assert.rejects(error.api.loadPostReleaseQueue(uuid(1)), /could not load/);
  for (const transition of ['actor', 'abort']) {
    const f = loaderFixture(); f.readWait = deferred(); const abort = new AbortController(); const pending = f.api.loadPostReleaseQueue(uuid(1), abort.signal); await settle();
    if (transition === 'actor') f.session = { access_token: 'actor-b' }; else abort.abort();
    f.readWait.resolve(); await assert.rejects(pending, /account changed/);
  }
});
const typography = load('src/design/typography.ts');
const liquidGlass = load('src/design/liquidGlassTokens.ts');
const tokens = load('src/design/tokens.ts', { './typography': typography, './liquidGlassTokens': liquidGlass });
let theme = tokens.pluggdDark;
const icon = props => React.createElement('span', { 'data-icon': props.name, 'aria-hidden': true, style: {fontSize: props.size, color: props.color} }, ({'play-arrow':'▶','pause':'Ⅱ','album':'◉','arrow-back':'←','check-circle':'✓','chevron-left':'‹','repeat':'↻','format-quote':'❞','more-horiz':'⋯'})[props.name] || '·');
const image = props => React.createElement('img', { src: props.uri, alt: '' });
const themeMocks = { '../../design/usePluggdTheme': { usePluggdTheme: () => theme }, '../../design/typography': { pluggdFonts: typography.pluggdFonts } };
async function mount(Component, props) {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const f = { container, render: async next => act(async () => { root.render(React.createElement(Component, next ?? props)); await settle(); }), close: async () => { await act(async () => root.unmount()); container.remove(); } };
  f.find = label => [...container.querySelectorAll('[aria-label]')].find(el => el.getAttribute('aria-label') === label);
  f.click = async label => { const element = f.find(label); assert.ok(element, `Missing ${label}: ${container.textContent}`); await act(async () => { element.click(); await settle(); }); };
  await f.render(); return f;
}
async function playerFixture() {
  const f = { session: { access_token: 'actor-a' }, playback: { currentTrack: null, isPlaying: false, isBuffering: false }, starts: [], toggles: 0, routes: [], loads: 0 };
  f.age = load('src/features/playback/releaseAgeAccess.ts', { 'expo-crypto': {randomUUID:()=>uuid(99)}, '../../lib/supabase': {supabase:{}} });
  f.opened=[];
  f.control = load('src/features/playback/nativePlaybackControl.ts', { './mixAccessSession': {}, './playbackAccess': {}, './resolvePlaybackSource': {}, './releaseAgeAccess': {}, './nativeQueueMutation': {} });
  const Component = load('src/features/community-feed/CommunityReleasePlayer.tsx', {
    '../playback/nativePlaybackControl': f.control,
    '../playback/releaseAgeAccess': f.age,
    ...themeMocks, react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': {...rn,Linking:{openURL:async()=>{throw Error('Web account recovery must use explicit browser, not Android app link');}}},
    'expo-web-browser': {openBrowserAsync:async url=>{f.opened.push(url);if(f.openError)throw Error('Open failed');}}, '@expo/vector-icons': { MaterialIcons: icon },
    'expo-router': { useRouter: () => ({ push: path => f.routes.push(path) }) }, '../../components/PluggdImage': { PluggdImage: image },
    '../../context/AuthProvider': { useAuth: () => ({ session: f.session }) },
    '../../context/PlaybackProvider': { usePlayback: () => ({ ...f.playback, playQueue: async (...args) => { f.starts.push(args); if (f.startWait) return f.startWait.promise; if (f.startError) throw Error(f.startError); return { releaseId: uuid(1) }; }, togglePlayPause: async () => { f.toggles++; } }) },
    './releasePostPlayback': { loadPostReleaseQueue: async (_id, signal) => { f.loads++; f.signal = signal; if (f.wait) await f.wait.promise; if (f.loadError) throw (f.loadError instanceof Error ? f.loadError : Error(f.loadError)); return [{ id: uuid(2), releaseId: uuid(1), url: 'https://audio/first.mp3' }]; } },
  }).CommunityReleasePlayer;
  f.props = { releaseId: uuid(1), title: 'Album title', artist: 'Artist' }; f.ui = await mount(Component, f.props); return f;
}
test('actual release player loads shared queue once on duplicate taps and exposes retry', async () => {
  const f = await playerFixture(); try {
    f.wait = deferred(); await f.ui.click('Play Album title'); const play = f.ui.find('Play Album title'); await act(async () => { play.click(); }); assert.equal(f.loads, 1);
    f.loadError = 'Network failed'; await act(async () => { f.wait.resolve(); await settle(); }); assert.ok(f.ui.container.querySelector('[role="alert"]')); assert.ok(f.ui.find('Retry playing Album title')); assert.equal(f.starts.length, 0);
    f.wait = null; f.loadError = ''; await f.ui.click('Retry playing Album title'); assert.equal(f.starts.length, 1); assert.equal(f.starts[0][1], 0);
    const button = f.ui.find('Play Album title'); assert.ok(parseFloat(window.getComputedStyle(button).minHeight) >= 44);
    await f.ui.click('Open release Album title'); assert.equal(f.routes.at(-1), `/release/${uuid(1)}`);
  } finally { await f.ui.close(); }
});
test('actual active release uses existing play/pause and reports a rejected shared-player start', async () => {
  const f = await playerFixture(); try {
    f.playback = { currentTrack: { releaseId: uuid(1) }, isPlaying: true, isBuffering: false }; await f.ui.render(f.props); await f.ui.click('Pause Album title'); assert.equal(f.toggles, 1); assert.equal(f.loads, 0);
    f.playback.currentTrack = null; f.startWait = deferred(); await f.ui.render(f.props); await f.ui.click('Play Album title'); await act(async () => { f.startWait.resolve(null); await settle(); }); assert.match(f.ui.container.textContent, /did not start/);
  } finally { await f.ui.close(); }
});
test('actual release player discards loader completion after account change or unmount', async () => {
  for (const transition of ['actor', 'unmount']) {
    const f = await playerFixture(); f.wait = deferred(); await f.ui.click('Play Album title');
    if (transition === 'actor') { f.session = { access_token: 'actor-b' }; await f.ui.render(f.props); } else await f.ui.close();
    await act(async () => { f.wait.resolve(); await settle(); }); assert.equal(f.starts.length, 0); assert.equal(f.signal.aborted, true);
    if (transition === 'actor') await f.ui.close();
  }
});
const post = { id: uuid(10), user_id: uuid(20), content: 'An original thought', display_name: 'Original Artist', username: 'artist', images: [], video: null, audio: null, music: null, destinations: [], link_preview: null, hashtags: [], mentions: [], created_at: '2026-11-09T00:00:00Z', likes_count: 0, comments_count: 0, reposts_count: 0, bookmarks_count: 0, reposted: false, is_repost: false, is_quote: false, original_post: null };
async function cardFixture(input = post) {
 const f = { auth: { user: { id: uuid(1) } }, alerts: [], routes: [], reposts: [] };
 const native = { ...rn, Platform: { OS: 'ios' }, Alert: { alert: (...args) => f.alerts.push(args) }, Share: { share: async () => ({ action: 'dismissedAction' }) } };
 const Panel = p => React.createElement(rn.View, null, p.children);
 const Component = load('src/features/culture/MobileSocialPostCard.tsx', {
  ...themeMocks, react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'react-native': native, '@expo/vector-icons': { MaterialIcons: icon },
  '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: () => {} }) }, 'expo-linear-gradient': { LinearGradient: Panel }, 'expo-router': { useRouter: () => ({ push: path => f.routes.push(path) }) },
  '../../components/PluggdImage': { PluggdImage: image, Image: { getSize: () => {} } }, '../../context/PlaybackProvider': { usePlayback: () => ({}) }, '../social-music/PostMusicAttribution': { PostMusicAttribution: () => null }, '../../design/haptics': { impactHaptic() {}, selectionHaptic() {} },
  '../../lib/mobileContent': { contentInitials: () => 'OA', formatCompact: n => String(n), formatDate: () => 'Today' }, '../../../components/liquid-glass': { GlassAvatar: Panel, GlassPanel: Panel },
  './mobileSocial': { toggleSocialRepost: async id => { f.reposts.push({ id, actor: f.auth.user?.id }); if (f.wait) await f.wait.promise; return { success: true }; }, toggleSocialLike: async () => ({ success: true }), toggleSocialBookmark: async () => ({ success: true }) },
  '../safety/accountSafety': {}, '../safety/reportActions': {}, './MobileSocialMediaViewer': { MobileSocialMediaViewer: () => null }, '../../context/AuthProvider': { useAuth: () => f.auth },
  './MobileSocialInlineVideo': { MobileSocialInlineVideo: () => null }, './useInlineVideoVisibility': { useSuspendInlineVideos: () => {} }, '../community-feed/communityRelevanceController': { shareWithRecommendationConfirmation: async share => share() },
  '../community-feed/CommunityReleasePlayer': { CommunityReleasePlayer: () => null }, '../community-feed/releasePostPlayback': { releaseIdForPost: () => null },
 }).MobileSocialPostCard;
 f.props = { post: input }; f.ui = await mount(Component, f.props); return f;
}
test('actual Repost menu offers direct, Quote and Cancel; Quote preserves original repost identity', async () => {
 const f = await cardFixture({ ...post, is_repost: true, original_post_id: uuid(30), original_post: { ...post, id: uuid(30) } }); try {
  await f.ui.click('Repost or quote post'); const actions = f.alerts.at(-1)[2]; assert.equal(actions.map(a => a.text).join(','), 'Repost,Quote post,Cancel');
  const cancel = actions.find(a => a.text === 'Cancel'); if (cancel.onPress) await cancel.onPress(); assert.equal(f.reposts.length + f.routes.length, 0);
  await act(async () => actions.find(a => a.text === 'Quote post').onPress()); assert.equal(f.routes.at(-1).params.quotePostId, uuid(30));
 } finally { await f.ui.close(); }
});
test('actual direct repost and Undo invoke the existing persistence action on original identity', async () => {
 for (const reposted of [false, true]) { const f = await cardFixture({ ...post, reposted, is_repost: true, original_post_id: uuid(30) }); try {
   await f.ui.click('Repost or quote post'); const action = f.alerts.at(-1)[2].find(a => a.text === (reposted ? 'Undo repost' : 'Repost')); await act(async () => action.onPress()); assert.equal(f.reposts[0].id, uuid(30));
 } finally { await f.ui.close(); } }
});
test('actual repost action rejects duplicate menu callbacks', async () => {
 const f = await cardFixture(); try {
  await f.ui.click('Repost or quote post'); f.wait = deferred(); const action = f.alerts.at(-1)[2].find(a => a.text === 'Repost');
  await act(async () => { action.onPress(); action.onPress(); await settle(); }); assert.equal(f.reposts.length, 1);
  await act(async () => { f.wait.resolve(); await settle(); });
 } finally { if (f.wait) f.wait.resolve(); await f.ui.close(); }
});
test('actual stale repost menu callback cannot mutate a replacement account', async () => {
 const f = await cardFixture(); try {
  await f.ui.click('Repost or quote post'); const action = f.alerts.at(-1)[2].find(a => a.text === 'Repost');
  f.auth = { user: { id: uuid(2) } }; await f.ui.render(f.props); await act(async () => action.onPress()); assert.equal(f.reposts.length, 0);
 } finally { await f.ui.close(); }
});
function postPersistenceFixture({ actualSafety = false } = {}) {
 const f = { actor: uuid(1), inserts: [], moderationCalls: [] };
 const db = { auth: { getSession: async () => { if (f.sessionWait) { const wait=f.sessionWait;f.sessionWait=null;return wait.promise; } return { data: { session: f.actor ? { user:{id:f.actor},access_token:f.token || 'fixture-token-'+f.actor } : null }, error:null }; }, getUser: async () => { if (f.authWait) { const wait = f.authWait; f.authWait = null; return wait.promise; } return { data: { user: f.actor ? { id: f.actor } : null } }; } }, functions: { invoke: async (name, options) => { if(f.invokeWait) await f.invokeWait.promise; const authorization=options.headers?.Authorization; const actor=authorization ? [uuid(1),uuid(2)].find(id=>authorization==='Bearer fixture-token-'+id) : f.actor; f.moderationCalls.push({ actor, name, ...options }); return { data: {decision: 'allow'}, error: null }; } }, from(table) {
  const chain = { insert(payload) { f.inserts.push({ table, payload, actor: f.actor }); return chain; }, select() { return chain; }, single() { return Promise.resolve({ data: { id: uuid(99) }, error: null }); }, then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject); } }; return chain;
 } };
 const social = load('src/features/culture/mobileSocial.ts', {
  '../../lib/supabase': { supabase: db }, '../social-music/service': {}, '../social-music/model': {}, '../../lib/publicAudienceFilters': {},
  '../safety/accountSafety': actualSafety ? (f.safety=load('src/features/safety/accountSafety.ts', { '../../lib/supabase': { supabase: db } })) : { captureModerationActorScope: async expected=>{if(expected!==f.actor)throw Error('account changed');return {actorId:expected,accessToken:'fixture-token-'+expected};}, moderateUserContent: async payload => { f.moderationCalls.push(payload); if (f.moderationWait) await f.moderationWait.promise; return { decision: 'allow' }; } }, './publicCreatorIdentity': {},
 });
 const serviceSource = read('src/features/culture/mobileServices.ts');
 const fn = serviceSource.slice(serviceSource.indexOf('export async function createSocialPost('), serviceSource.indexOf('export async function loadCreatorModePulse('));
 const wrapper = load('src/features/culture/mobileServices.ts', {}, fn.replace('createMobileSocialPost({', 'globalThis.persist({'), { persist: social.createMobileSocialPost });
 f.create = wrapper.createSocialPost; return f;
}
test('actual Quote service persists quote flag, canonical original and destination rows', async () => {
 const f = postPersistenceFixture(); const result = await f.create({ content: 'My commentary', quotePostId: uuid(30) });
 assert.equal(result.success, true); const insert = f.inserts.find(row => row.table === 'social_posts'); assert.equal(insert.payload.is_quote, true); assert.equal(insert.payload.is_repost, false); assert.equal(insert.payload.original_post_id, uuid(30)); assert.equal(insert.payload.user_id, uuid(1));
 assert.ok(f.inserts.some(row => row.table === 'social_post_destinations'));
});
async function composerFixture() {
 const persistence = postPersistenceFixture();
 const f = { ...persistence, auth: { user: { id: uuid(1) } }, routes: [], alerts: [], quoteLoads: [], uploaded: [] };
 const rq = require('@tanstack/react-query'); const client = new rq.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
 const Input = p => React.createElement('textarea', { placeholder: p.placeholder, value: p.value, onInput: event => p.onChangeText?.(event.currentTarget.value), 'aria-label': p.accessibilityLabel });
 const profileDb = { from: () => { const chain = { select() { return chain; }, eq() { return chain; }, maybeSingle: async () => ({ data: { full_name: f.auth.user?.id === uuid(1) ? 'Actor A' : 'Actor B' }, error: null }) }; return chain; } };
 const Component = load('app/create-post.tsx', {
  react: React, 'react/jsx-runtime': require('react/jsx-runtime'), '@tanstack/react-query': rq,
  '@expo/vector-icons': { MaterialIcons: icon }, '../src/design/typography': { pluggdFonts: typography.pluggdFonts },
  'expo-document-picker': {}, 'expo-image-picker': { MediaTypeOptions: { Images: 'images', Videos: 'videos' }, requestMediaLibraryPermissionsAsync: async () => ({ granted: true }), launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///fixture.jpg', type: 'image', fileName: 'fixture.jpg' }] }) },
  'expo-linear-gradient': { LinearGradient: rn.View }, 'expo-router': { Stack: { Screen: () => null }, useRouter: () => ({ push: value => f.routes.push(value), replace: value => f.routes.push(value), back: () => f.routes.push('back'), setParams: () => {} }), useLocalSearchParams: () => ({ quotePostId: uuid(30) }) },
  'expo-status-bar': { StatusBar: () => null }, 'react-native': { ...rn, TextInput: Input, Alert: { alert: (...args) => f.alerts.push(args) } }, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  '../src/context/AuthProvider': { useAuth: () => f.auth }, '../src/components/PluggdImage': { PluggdImage: image }, '../src/design/haptics': { impactHaptic() {}, selectionHaptic() {} }, '../src/features/community-feed/MobileFeedAttachmentCard': { MobileFeedAttachmentCard: () => null },
  '../src/features/culture/mobileServices': { loadPostDetail: async id => { f.quoteLoads.push(id); return { post: { ...post, id } }; }, createSocialPost: input => { persistence.actor = f.auth.user?.id; return persistence.create(input); }, uploadSocialMediaAsset: async () => { f.uploaded.push('upload'); if (f.uploadWait) await f.uploadWait.promise; return { success: true, url: 'https://media/fixture.jpg' }; } },
  '../src/lib/mobileContent': { contentInitials: () => 'AA' }, '../src/lib/supabase': { supabase: profileDb }, '../src/design/usePluggdTheme': { usePluggdTheme: () => theme }, '../src/design/useBottomChromeInset': { useBottomChromeInset: () => 100 },
 }).default;
 const Wrapped = () => React.createElement(rq.QueryClientProvider, { client }, React.createElement(Component));
 f.ui = await mount(Wrapped); const close = f.ui.close; f.ui.close = async () => { await close(); client.clear(); };
 f.type = async text => { const textarea = f.ui.container.querySelector('textarea[placeholder="What’s happening in your world?"]') || f.ui.container.querySelector('textarea'); assert.ok(textarea); await act(async () => { textarea.value = text; textarea.dispatchEvent(new window.Event('input', { bubbles: true })); await settle(); }); };
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); await settle(); });
 f.persistence = persistence; return f;
}
test('actual Quote composer previews original and persists commentary through real service', async () => {
 const f = await composerFixture(); try {
  assert.match(f.ui.container.textContent, /Quoting Original Artist/); assert.match(f.ui.container.textContent, /An original thought/);
  await f.type('My commentary'); await f.ui.click('Publish Quote post');
  const insert = f.persistence.inserts.find(row => row.table === 'social_posts'); assert.ok(insert); assert.equal(insert.payload.original_post_id, uuid(30)); assert.equal(insert.payload.is_quote, true); assert.equal(insert.payload.content, 'My commentary');
 } finally { await f.ui.close(); }
});
test('actual Quote composer cancellation writes nothing', async () => {
 const f = await composerFixture(); try { await f.type('Unsent'); await f.ui.click('Go back'); assert.equal(f.persistence.inserts.length, 0); assert.equal(f.routes.at(-1), 'back'); } finally { await f.ui.close(); }
});
test('actual Quote composer clears departed actor draft and blocks late upload from posting as replacement actor', async () => {
 const f = await composerFixture(); try {
  await f.type('Private actor A commentary');
  const media = [...f.ui.container.querySelectorAll('[aria-label]')].find(el => /photo|media|image/i.test(el.getAttribute('aria-label') || ''));
  assert.ok(media, 'Media picker action missing'); await act(async () => { media.click(); await settle(); });
  f.uploadWait = deferred(); await f.ui.click('Publish Quote post'); assert.equal(f.uploaded.length, 1);
  f.auth = { user: { id: uuid(2) } }; await f.ui.render();
  await act(async () => { f.uploadWait.resolve(); await settle(); });
  assert.equal(f.persistence.inserts.length, 0, 'old actor upload cannot create a post under the next session');
  assert.ok(![...f.ui.container.querySelectorAll('textarea')].some(el => el.value.includes('Private actor A')), 'departed actor draft must be cleared');
 } finally { if (f.uploadWait) f.uploadWait.resolve(); await f.ui.close(); }
});

async function splitFixture(state) {
 const f = { state };
 const query = state === 'loading' ? { isPending: true } : state === 'error' ? { isError: true, error: Error('This invitation could not be loaded. Please try again.'), refetch() {} } : { data: { status: state === 'unavailable' ? 'expired' : 'active', title: 'Night Shift Sessions', hostName: 'John Miles', participantCount: 3, location: 'Studio Two, London', notes: 'Writing and production credits for the new session.' } };
 const mutation = { isPending: state === 'joining', isError: state === 'join-error', error: Error('Complete your legal name, artist or display name, contact email and split role on your Connect Card, then return to this invitation.'), data: state === 'success' ? { status: 'joined', agreementId: uuid(90), displayName: 'Joe Parker', role: 'producer' } : null, mutate() {} };
 const Component = load('src/features/studio/SplitJoinScreen.tsx', {
  ...themeMocks, react: React, 'react/jsx-runtime': require('react/jsx-runtime'), '@expo/vector-icons': { MaterialIcons: icon }, 'react-native': rn,
  '@tanstack/react-query': { useQuery: () => query, useMutation: () => mutation },
  'expo-router': { Stack: { Screen: () => null }, Redirect: () => null, useLocalSearchParams: () => ({ token: 'local-fixture-invitation', source: 'link' }), useRouter: () => ({ push() {}, replace() {}, canGoBack: () => true, back() {} }) },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }, '../../context/AuthProvider': { useAuth: () => ({ user: state === 'guest' ? null : { id: uuid(1) }, loading: false }) },
  './splitJoinService': {}, './SplitEngineScreens': { SplitAgreementScreen: () => null },
 }).SplitJoinScreen;
 f.ui = await mount(Component); return f;
}
function snapshot(ui, name, width) {
 const directory = process.env.PLUGGD_RENDER_DIR || '/private/tmp/pluggd-update2-render'; fs.mkdirSync(directory, { recursive: true });
 const css = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; } }).join('\n');
 const fonts = [['Satoshi-Regular','assets/fonts/Satoshi-Regular.otf'], ['Satoshi-Medium','assets/fonts/Satoshi-Medium.otf'], ['Satoshi-Bold','assets/fonts/Satoshi-Bold.otf'], ['Satoshi-Black','assets/fonts/Satoshi-Black.otf'], ['Sora-SemiBold','node_modules/@expo-google-fonts/sora/600SemiBold/Sora_600SemiBold.ttf'], ['Sora-Bold','node_modules/@expo-google-fonts/sora/700Bold/Sora_700Bold.ttf'], ['Sora-ExtraBold','node_modules/@expo-google-fonts/sora/800ExtraBold/Sora_800ExtraBold.ttf']];
 fs.mkdirSync(directory + '/fonts', { recursive: true });
 const fontCSS = fonts.map(([family,path]) => { const filename = path.split('/').pop(); fs.copyFileSync(new URL(path, base), `${directory}/fonts/${filename}`); return `@font-face{font-family:'${family}';src:url('./fonts/${filename}');font-display:swap}`; }).join('\n');
 const filename = `${name}-${theme.scheme}-${width}.html`;
 const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOCAL FIXTURE — ${name} ${theme.scheme} ${width}</title><style>${fontCSS}\n${css}\nhtml,body{margin:0;background:${theme.colors.background};color:${theme.colors.text}}.snapshot-stage{width:100%;max-width:${name.startsWith('split')?'none':'680px'};margin:0 auto;min-height:100vh;display:flex;flex-direction:column}.fixture-note{position:fixed;bottom:0;right:0;font:9px sans-serif;background:#222;color:white;padding:3px;z-index:9999;opacity:.7}</style></head><body><main class="snapshot-stage">${ui.container.innerHTML}</main><aside class="fixture-note">LOCAL COMPONENT FIXTURE · ${theme.scheme} · ${width}px · interactions unavailable</aside></body></html>`;
 fs.writeFileSync(`${directory}/${filename}`, html); return filename;
}
async function renderFixtures() {
 const files = [];
 for (const current of [tokens.pluggdLight, tokens.pluggdDark]) for (const width of [390, 1440]) {
  theme = current;
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true });
  const player = await playerFixture(); files.push(snapshot(player.ui, 'release-ready', width));
  player.loadError = 'This release could not load. Please try again.'; await player.ui.click('Play Album title'); files.push(snapshot(player.ui, 'release-error', width));
  player.loadError=new player.age.ReleaseAgeAccessError('missing-dob');await player.ui.click('Retry playing Album title');files.push(snapshot(player.ui,'release-missing-dob',width));
  player.loadError=new player.age.ReleaseAgeAccessError('under-18');await player.ui.click('Retry playing Album title');files.push(snapshot(player.ui,'release-under-18',width));await player.ui.close();
  const composer = await composerFixture(); await composer.type('The bassline is the heart of this one.'); files.push(snapshot(composer.ui, 'quote-composer', width)); await composer.ui.close();
  for (const state of ['active', 'guest', 'loading', 'error', 'unavailable', 'joining', 'join-error', 'success']) { const split = await splitFixture(state); files.push(snapshot(split.ui, 'split-' + state, width)); await split.ui.close(); }
 }
 const directory = process.env.PLUGGD_RENDER_DIR || '/private/tmp/pluggd-update2-render';
 fs.writeFileSync(`${directory}/index.html`, `<!doctype html><meta charset="utf-8"><title>PLUGGD Update 2 local fixtures</title><style>body{font:16px system-ui;max-width:960px;margin:32px auto;padding:0 20px}li{margin:10px}</style><h1>PLUGGD Update 2 local component fixtures</h1><p>Actual source components rendered through ReactDOM and React Native Web. Auth, server data, native icons/media and navigation are fixture boundaries. These snapshots verify layout/copy only and do not prove device behavior. Use the viewport width in each filename (390 or 1440).</p><ul>${files.map(file => `<li><a href="${file}">${file}</a></li>`).join('')}</ul>`);
 fs.writeFileSync(`${directory}/README.txt`, 'Serve this folder locally: python3 -m http.server 8767 --directory /private/tmp/pluggd-update2-render\nOpen http://127.0.0.1:8767/ . Set browser viewport to filename width, 844px height for mobile. Actual source DOM and injected RN-web CSS plus existing app fonts are saved. No browser opened by this subtask. Static snapshots, no live interactions or network writes.\nRegenerate: PLUGGD_WEB_PACKAGE_JSON=/Users/apple/PLUGGD_NEW/package.json node scripts/verify-native-community-actions.mjs --render\n');
 console.log('SAVED ' + files.length + ' actual-component HTML snapshots to ' + directory);
}

async function fullscreenFixture() {
 const f = { now: 0, session: { access_token: 'actor-a' }, actor: uuid(1), music: false, samples: [], nextSamples: [], listeners: new Map(), appListeners: new Set() };
 class Clock extends Date { static now() { return f.now; } }
 const qualification = load('src/features/community-feed/communityRelevanceModel.ts', {}, read('src/features/community-feed/communityRelevanceModel.ts'), { Date: Clock });
 f.player = { muted: true, volume: 1, playing: true, pause() {}, replaceAsync: async () => {}, addListener(type, fn) { if (!f.listeners.has(type)) f.listeners.set(type, new Set()); f.listeners.get(type).add(fn); return { remove: () => f.listeners.get(type).delete(fn) }; } };
 const pause = async () => {};
 const Component = load('src/features/culture/MobileSocialMediaViewer.tsx', {
  ...themeMocks, react: React, 'react/jsx-runtime': require('react/jsx-runtime'), '@expo/vector-icons': { MaterialIcons: icon },
  'expo-status-bar': { StatusBar: () => null }, 'expo-video': { VideoView: () => React.createElement('div', { 'data-video': true }), useVideoPlayer: (_source, setup) => React.useMemo(() => { setup(f.player); return f.player; }, []) },
  'react-native': { ...rn, AppState: { currentState: 'active', addEventListener: (_type, listener) => { f.appListeners.add(listener); return { remove: () => f.appListeners.delete(listener) }; } } },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }, '../../components/PluggdImage': { PluggdImage: image, Image: {} },
  '../../context/AuthProvider': { useAuth: () => ({ user: { id: f.actor }, session: f.session }) }, '../../context/PlaybackProvider': { usePlayback: () => ({ pause, isPlaying: f.music, isBuffering: false }) },
  '../social-music/model': { musicPostId: () => null, musicError: error => error.message }, '../social-music/service': {}, '../community-feed/communityRelevanceModel': qualification,
  './inlineVideoAudio': { prepareInlineVideoMutedPlayback: async () => true, setInlineVideoAutomaticAudio() {}, setInlineVideoPrimaryAudioProtection() {} },
  './inlineVideoSoundPreference': { hydrateInlineVideoSoundPreference: async () => {}, setInlineVideoUserMuted: async () => {}, useInlineVideoSoundPreference: { getState: () => ({ muted: false }) } },
 }, read('src/features/culture/MobileSocialMediaViewer.tsx') + '\nexport { FullScreenVideo };').FullScreenVideo;
 f.props = { uri: 'https://video/fixture.mp4', onQualifiedListening: elapsed => f.samples.push(elapsed) }; f.ui = await mount(Component, f.props);
 f.emit = async (position, player = f.player) => act(async () => { f.now = position * 1000; for (const listener of f.listeners.get('timeUpdate') || []) listener({ currentTime: position }); await settle(); });
 return f;
}
test('actual fullscreen only qualifies audible foreground progress and discards departed actor callbacks', async () => {
 const f = await fullscreenFixture(); try {
  f.player.muted = true; for (let i = 0; i <= 11; i++) await f.emit(i); assert.equal(f.samples.length, 0);
  f.player.muted = false; for (let i = 12; i <= 22; i++) await f.emit(i); assert.equal(f.samples.length, 1); assert.ok(f.samples[0] >= 10000);
  const old = [...f.listeners.get('timeUpdate')][0]; f.actor = uuid(2); f.session = { access_token: 'actor-b' }; await f.ui.render(f.props);
  const count = f.samples.length; await act(async () => old({ currentTime: 23 })); assert.equal(f.samples.length, count);
  await act(async () => { for (const listener of f.appListeners) listener('background'); });
  for (let i = 24; i <= 40; i++) await f.emit(i); assert.equal(f.samples.length, count);
 } finally { await f.ui.close(); }
});
test('actual fullscreen resets progress when recommendation delivery callback is replaced', async () => {
 const f = await fullscreenFixture(); try {
  f.player.muted = false; for (let i = 0; i <= 9; i++) await f.emit(i); assert.equal(f.samples.length, 0);
  f.props = { ...f.props, onQualifiedListening: elapsed => f.nextSamples.push(elapsed) }; await f.ui.render(f.props);
  await f.emit(10); assert.equal(f.nextSamples.length, 0, 'new delivery cannot inherit nine seconds from old delivery');
 } finally { await f.ui.close(); }
});
test('actual nested quoted original opens only its own canonical post', async () => {
 const f = await cardFixture({ ...post, is_quote: true, original_post: { ...post, id: uuid(30) } }); try {
  await f.ui.click('Open quoted post by Original Artist'); assert.equal(f.routes.length, 1); assert.equal(f.routes[0], `/post/${uuid(30)}`);
 } finally { await f.ui.close(); }
});
test('actual stale Quote callback cannot navigate after actor replacement', async () => {
 const f = await cardFixture(); try {
  await f.ui.click('Repost or quote post'); const action = f.alerts.at(-1)[2].find(a => a.text === 'Quote post');
  f.auth = { user: { id: uuid(2) } }; await f.ui.render(f.props); await act(async () => action.onPress()); assert.equal(f.routes.length, 0);
 } finally { await f.ui.close(); }
});

test('actual Quote service expected actor fence blocks initial mismatch and late moderation change', async () => {
 const mismatch = postPersistenceFixture(); const denied = await mismatch.create({ content: 'Commentary', quotePostId: uuid(30), expectedActorId: uuid(2) });
 assert.equal(denied.success, false); assert.equal(mismatch.inserts.length, 0);
 const late = postPersistenceFixture(); late.moderationWait = deferred(); const pending = late.create({ content: 'Commentary', quotePostId: uuid(30), expectedActorId: uuid(1) }); await settle(); late.actor = uuid(2); late.moderationWait.resolve();
 assert.equal((await pending).success, false); assert.equal(late.inserts.length, 0);
});
test('actual Quote composer duplicate Publish taps create one persisted quote', async () => {
 const f = await composerFixture(); try {
  await f.type('Only one quote');
  const buttons = [...f.ui.container.querySelectorAll('[aria-label="Publish Quote post"]')]; assert.equal(buttons.length, 2);
  await act(async () => { buttons[0].click(); buttons[1].click(); await settle(); });
  assert.equal(f.persistence.inserts.filter(row => row.table === 'social_posts').length, 1);
 } finally { await f.ui.close(); }
});

test('actual slug loader resolves canonical release before age and track authorization', async () => {
 const f = loaderFixture(); const queue = await f.api.loadPostReleaseQueue('omo-ita-1');
 assert.ok(f.calls[0].filters.some(([key,value]) => key === 'slug' && value === 'omo-ita-1'));
 assert.equal(f.ageCalls[0].releaseId, uuid(1)); assert.equal(queue[0].releaseId, uuid(1)); assert.ok(f.calls[1].filters.some(([key,value]) => key === 'release_id' && value === uuid(1)));
});
test('actual release player abandons late load after newer native playback intent', async () => {
 const f = await playerFixture(); try {
  f.wait = deferred(); await f.ui.click('Play Album title'); f.control.beginNativePlaybackIntent();
  await act(async () => { f.wait.resolve(); await settle(); }); assert.equal(f.starts.length, 0); assert.equal(f.toggles, 0);
 } finally { await f.ui.close(); }
});
test('actual slug player recognizes canonical current release and reuses selected track pause', async () => {
 const f = await playerFixture(); try {
  f.props = { ...f.props, releaseId: 'omo-ita-1' }; await f.ui.render(f.props); f.wait = deferred(); await f.ui.click('Play Album title');
  f.playback = { currentTrack: { releaseId: uuid(1), trackId: uuid(4) }, isPlaying: true, isBuffering: false }; await f.ui.render(f.props);
  await act(async () => { f.wait.resolve(); await settle(); }); assert.equal(f.starts.length, 0); assert.equal(f.toggles, 1); assert.ok(f.ui.find('Pause Album title'));
 } finally { await f.ui.close(); }
});

test('actual moderation dispatch must not submit departed actor quote under replacement account', async () => {
 const f = postPersistenceFixture({ actualSafety: true }); const staleUser = deferred(); f.authWait = staleUser;
 const pending = f.create({ content: 'Private actor A commentary', quotePostId: uuid(30), expectedActorId: uuid(1) }); await settle(); f.actor = uuid(2); staleUser.resolve({ data: { user: { id: uuid(1) } } });
 const result = await pending; assert.equal(result.success, false); assert.equal(f.inserts.length, 0);
 assert.equal(f.moderationCalls.filter(call => call.actor === uuid(2)).length, 0, 'moderation invoked as replacement actor before post insert fence');
});
test('actual scoped moderation pins bearer across stale session preparation and rejects departed result', async () => {
 const f = postPersistenceFixture({actualSafety:true}); const scope = await f.safety.captureModerationActorScope(uuid(1)); const stale=deferred(); f.sessionWait=stale;
 const pending=f.safety.moderateUserContent({contentKind:'post',text:'Original account draft'},scope); await settle();f.actor=uuid(2);stale.resolve({data:{session:{user:{id:uuid(1)},access_token:'fixture-token-'+uuid(1)}},error:null});
 await assert.rejects(pending,/account changed/);assert.equal(f.moderationCalls.length,1);assert.equal(f.moderationCalls[0].actor,uuid(1));assert.equal(f.moderationCalls[0].headers.Authorization,'Bearer fixture-token-'+uuid(1));
});
test('actual scoped moderation preserves captured bearer while invocation prepares and drops old-token result', async () => {
 const f = postPersistenceFixture({actualSafety:true}); const scope=await f.safety.captureModerationActorScope(uuid(1));f.invokeWait=deferred();
 const pending=f.safety.moderateUserContent({contentKind:'post',text:'Original account draft'},scope);await settle();f.actor=uuid(2);f.invokeWait.resolve();await assert.rejects(pending,/account changed/);assert.equal(f.moderationCalls[0].actor,uuid(1));
 const token=postPersistenceFixture({actualSafety:true});const original=await token.safety.captureModerationActorScope(uuid(1));token.invokeWait=deferred();const rotating=token.safety.moderateUserContent({contentKind:'post',text:'Draft'},original);await settle();token.token='rotated-fixture';token.invokeWait.resolve();await assert.rejects(rotating,/account changed/);
});
test('actual legacy moderation keeps existing dispatch for unrelated callers', async () => {
 const f=postPersistenceFixture({actualSafety:true});const result=await f.safety.moderateUserContent({contentKind:'comment',text:'Legacy caller'});assert.equal(result.decision,'allow');assert.equal(f.moderationCalls[0].headers,undefined);assert.equal(f.moderationCalls[0].actor,uuid(1));
});
test('actual missing-DOB recovery stays in the app and offers an accessible private birthday prompt', async () => {
 const f=await playerFixture();try {
  f.loadError=new f.age.ReleaseAgeAccessError('missing-dob');await f.ui.click('Play Album title');assert.equal(f.starts.length,0);
  const button=f.ui.find('Add date of birth');assert.ok(button);assert.ok(parseFloat(window.getComputedStyle(button).minHeight)>=44);
  await f.ui.click('Add date of birth');assert.equal(f.routes.at(-1),'/auth/date-of-birth');assert.equal(f.opened.length,0);assert.equal(f.starts.length,0);
 }finally{await f.ui.close();}
});
test('actual under-18 denial never offers DOB recovery or starts a queue', async () => {
 const f=await playerFixture();try {
  f.loadError=new f.age.ReleaseAgeAccessError('under-18');await f.ui.click('Play Album title');assert.equal(f.starts.length,0);assert.ok(!f.ui.find('Add date of birth'));assert.match(f.ui.container.textContent,/18 and over/);
  await f.ui.click('Retry playing Album title');assert.equal(f.starts.length,0);assert.equal(f.opened.length,0);
  assert.equal(f.age.releaseAccessRecoveryUrl(Object.assign(Error('Forged'),{status:'missing-dob'})),null);
 }finally{await f.ui.close();}
});
function quoteVisibilityFixture() {
 const f={actor:uuid(1), blocked:new Set(), original:{...post,id:uuid(30),user_id:uuid(22),content:'Original private text',images:['https://image/private.jpg'],video:'music:original'}, profileLoads:[],musicLoads:[]};
 const db={auth:{getUser:async()=>({data:{user:f.actor?{id:f.actor}:null}})},from(table){const q={select(){return q;},in(){return q;},eq(){return q;},then(yes,no){return Promise.resolve({data:table==='social_posts'?[f.original]:[],error:null}).then(yes,no);}};return q;}};
 f.api=load('src/features/culture/mobileSocial.ts',{
  '../../lib/supabase':{supabase:db},'../social-music/service':{postMusicSummaries:async ids=>{f.musicLoads.push(...ids);return new Map();}},'../social-music/model':{musicPostId:()=>true},
  '../../lib/publicAudienceFilters':{isNonPublicTestProfileName:name=>name==='Hidden test'},
  '../safety/accountSafety':{loadBlockedUserIds:async()=>{if(f.blockError)throw Error('Blocks unavailable');if(f.blockWait)await f.blockWait.promise;return f.blocked;}},
  './publicCreatorIdentity':{loadPublicCreatorIdentityMap:async ids=>{f.profileLoads.push(...ids);if(f.profileWait)await f.profileWait.promise;return new Map(ids.map(id=>[id,{full_name:f.hidden?'Hidden test':'Artist',username:'artist'}]));},publicCreatorDisplayName:p=>p?.full_name||'Artist'},
 },read('src/features/culture/mobileSocial.ts')+'\nexport { enrichPosts };');
 f.read=()=>f.api.enrichPosts([{...post,original_post_id:uuid(30),is_quote:true}],uuid(1));return f;
}
test('actual quote hydration removes blocked, deleted and moderated originals before attachment hydration',async()=>{
 for(const restriction of ['blocked','deleted','hidden','removed','rejected','cancelled']){
  const f=quoteVisibilityFixture();if(restriction==='blocked')f.blocked.add(f.original.user_id);else if(restriction==='deleted')f.original.is_deleted=true;else f.original.moderation_status=restriction;
  const rows=await f.read();assert.equal(rows.length,1);assert.equal(rows[0].original_post,null);assert.ok(!f.profileLoads.includes(f.original.user_id));assert.ok(!f.musicLoads.includes(f.original.id));assert.ok(!JSON.stringify(rows).includes('Original private text'));assert.ok(!JSON.stringify(rows).includes('private.jpg'));
 }
});
test('actual quote hydration retains allowed originals and filters test identities',async()=>{
 const f=quoteVisibilityFixture();assert.equal((await f.read())[0].original_post.content,'Original private text');
 const hidden=quoteVisibilityFixture();hidden.hidden=true;assert.equal((await hidden.read()).length,0);
 const own=quoteVisibilityFixture();own.original.user_id=uuid(1);own.original.moderation_status='hidden';assert.ok((await own.read())[0].original_post,'own hidden original follows existing top-level owner visibility');
});
test('actual quote hydration fails safely on block-read failure or account change during hydration',async()=>{
 const failure=quoteVisibilityFixture();failure.blockError=true;await assert.rejects(failure.read(),/Blocks unavailable/);
 for(const step of ['block','profile']){
  const f=quoteVisibilityFixture(),wait=deferred();if(step==='block')f.blockWait=wait;else f.profileWait=wait;const pending=f.read();await settle();f.actor=uuid(2);wait.resolve();await assert.rejects(pending,/session changed/);
 }
});
let failed = 0;
for (const { name, run } of tests) { try { await run(); console.log('PASS ' + name); } catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); } }
console.log(`${tests.length - failed}/${tests.length} actual-source Community action tests passed`);
if (process.argv.includes('--render')) await renderFixtures();
dom.window.close();
if (failed) process.exitCode = 1;
