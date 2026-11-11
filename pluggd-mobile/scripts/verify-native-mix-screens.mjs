import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');
const { JSDOM } = createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || '/private/tmp/pluggd-audit-locked-runtime/package.json')('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { QueryClient, QueryClientProvider, useQuery } = require('@tanstack/react-query');
const { act } = React;
const project = 'https://qkwvqmubhyondemhasjp.supabase.co';
const mixId = '10000000-0000-4000-8000-000000000001';
const owner = '20000000-0000-4000-8000-000000000001';
const other = '20000000-0000-4000-8000-000000000002';
const token = 'a'.repeat(64);
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const signed = (name = 'cover') => `${project}/storage/v1/object/sign/mix-media/${owner}/${mixId}/${name}.jpg?token=synthetic`;
function response(visibility = 'private', owns = true) {
  return { data: { version: 1, mix: { id: mixId, slug: 'fixture-mix', owner_user_id: owner,
    title: 'Scoped private fixture', status: 'published', visibility, allow_download: true,
    audio_url: `mix:${mixId}`, cover_url: visibility === 'public' ? 'https://public.invalid/cover.jpg' : signed(), duration_seconds: 400 },
    owner: owns, public: visibility === 'public', tracklist: [{ id: '30000000-0000-4000-8000-000000000001', position: 1, start_seconds: 84, raw_title: 'Second selection' }] }, error: null };
}

async function fixture({ screen = 'detail', actor = owner, visibility = 'private', landscape = false } = {}) {
  const f = { now: 1_800_000_000_000, routes: [], calls: [], alerts: [], shares: [], links: [], db: [], timers: new Map(), params: { id: mixId }, focused: true,
    dimensions: landscape ? { width: 1000, height: 700 } : { width: 390, height: 844 }, appState: 'active', listeners: new Set(),
    invoke: async () => response(visibility, actor === owner), query: async table => ({ data: table === 'mixes' ? visibility === 'public' ? response('public', actor === owner).data.mix : null : [], error: null }),
    save: async () => ({ success: true, saved: true }), publicLoads: [], player: { currentTrack: null, queue: [], isPlaying: false, isBuffering: false, progress: { position: 0, duration: 400 }, repeatMode: 'off', shuffleMode: 'off' } };
  f.localStore=new Map();f.pendingMix=false;f.failDraftRead=false;
  if(screen==='upload'){
    f.params={type:'mix'};
    f.localStore.set(`pluggd:studio-upload-draft:v2:${owner}:mix`,JSON.stringify({kind:'mix',plannedMixId:mixId,title:'Private creator draft',creator:'Fixture DJ',genre:'House',rightsOwner:'Fixture DJ',rightsConfirmed:true,
      artwork:{uri:'file:///cover.jpg',name:'cover.jpg'},audio:{uri:'file:///audio.mp3',name:'audio.mp3'},tracklist:'00:00 Artist — Track'}));
  }
  f.createImpl=async()=>({catalogId:mixId,trackId:null,audioFileId:null,processingStatus:'ready'});
  f.ownerRecord={id:mixId,kind:'mix',title:'Owned Mix fixture',description:'Context',artworkUrl:'mix-media/fixture/cover.jpg',publicRoute:`/mixes/${mixId}`,status:'draft',moderationStatus:null,isPublic:false,tracks:[],
    raw:{owner_user_id:owner,updated_at:'2026-11-02T12:00:00.000Z',visibility:'private',genre_tags:['House'],mood_tags:[],allow_download:false}};
  f.ownerPending=false;
  f.ownerSaveImpl=async(record,input)=>{f.ownerRecord={...f.ownerRecord,title:input.title,description:input.description,raw:{...f.ownerRecord.raw,visibility:input.visibility,genre_tags:input.tags,mood_tags:input.moods,updated_at:'2026-11-02T12:00:01.000Z'}};return{current:true};};
  f.ownerApi={loadOwnerCatalogRecord:async(kind,id,assertCurrent)=>{
    if(f.session.scope().actor!==owner)throw new Error('Item unavailable');assertCurrent?.();return{...structuredClone(f.ownerRecord),assertCurrent,mixScope:f.session.scope()};},
    ownerMixPendingSave:async()=>f.ownerPending?{mixId}:null,
    recoverOwnerMixSave:async()=>{f.ownerPending=false;return{current:true,id:mixId};},
    saveOwnerCatalogRecord:(record,input)=>{f.calls.push({ownerSave:input,record});return f.ownerSaveImpl(record,input);},
    submitOwnerCatalogForReview:async record=>{f.calls.push({ownerPublish:record.raw.visibility});f.ownerRecord.status='published';return{current:true};},
    duplicateOwnerCatalogRecord:async()=>({id:'10000000-0000-4000-8000-000000000002',kind:'mix'}),
    removeOwnerCatalogFromPublic:async()=>{},restoreOwnerCatalogDraft:async()=>{},replaceOwnerCatalogArtwork:async()=>{},replaceOwnerCatalogAudio:async()=>{},addOwnedReleaseTrack:async()=>{},saveOwnedReleaseTrack:async()=>{},moveOwnedReleaseTrack:async()=>{}};
  if(screen==='owner')f.params={kind:'mix',id:mixId};
  let sequence = 0;
  const setTimer = (callback, delay) => { const id = ++sequence; f.timers.set(id, { callback, delay, at: f.now + delay }); return id; };
  const clearTimer = id => f.timers.delete(id);
  const modules = new Map();
  const styles = { create: value => value, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 };
  const font = new Proxy({}, { get: () => 'fixture' });
  const theme = { scheme: 'dark', colors: new Proxy({}, { get: () => '#111111' }) };
  function primitive(tag) {
    return function NativeBoundary(props) {
      const { children, onPress, accessibilityLabel, accessibilityRole, disabled, value, onChangeText, onError, source } = props;
      return React.createElement(tag, { 'aria-label': accessibilityLabel, role: accessibilityRole, disabled,
        ...(tag === 'button' ? { type: 'button', onClick: onPress } : {}),
        ...(tag === 'textarea' ? { value, onChange: event => onChangeText?.(event.target.value) } : {}),
        ...(tag === 'img' ? { src: source?.uri, onError } : {}),
      }, tag === 'img' || tag === 'textarea' ? undefined : typeof children === 'function' ? children(0) : children);
    };
  }
  const View = primitive('div'), Text = primitive('span'), Pressable = primitive('button'), Image = primitive('img');
  const ScrollView = React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ scrollTo() {} })); return React.createElement(View, props); });
  class AnimatedValue { constructor(value) { this.value = value; } interpolate() { return this.value; } setValue(v) { this.value = v; } stopAnimation() {} }
  const animation = () => ({ start() {}, stop() {} });
  const native = { View, Text, Pressable, Image, ScrollView, TextInput: primitive('textarea'), ActivityIndicator: props => React.createElement('span', { 'aria-label': props.accessibilityLabel || 'Loading' }),
    StyleSheet: styles, useWindowDimensions: () => f.dimensions, Animated: { Value: AnimatedValue, View, loop: animation, timing: animation, sequence: animation },
    Easing: { linear: x => x, ease: x => x, inOut: x => x }, Alert: { alert: (...args) => f.alerts.push(args) },
    Share: { share: async payload => { f.shares.push(payload); } }, Linking: { openURL: async url => { f.links.push(url); } },
    AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) },
    Modal:props=>props.visible?React.createElement(View,props):null,KeyboardAvoidingView:View,Switch:()=>null,
    AppState: { get currentState() { return f.appState; }, addEventListener: (_, callback) => { f.listeners.add(callback); return { remove: () => f.listeners.delete(callback) }; } }, Platform: { OS: 'ios' } };
  const router = { push: path => f.routes.push(path), replace: path => f.routes.push(path), back: () => f.routes.push('back'), canGoBack: () => true };
  function query(table) {
    const entry = { table, filters: [], selected: '' }; f.db.push(entry);
    const builder = { select(columns) { entry.selected = columns; return this; }, eq(...args) { entry.filters.push(args); return this; }, in(...args) { entry.filters.push(['in', ...args]); return this; }, order() { return this; }, limit() { return this; }, insert(data) { entry.insert = data; return this; },
      maybeSingle() { return Promise.resolve().then(() => f.query(table, entry)); }, single() { return this.maybeSingle(); }, then(resolve, reject) { return Promise.resolve().then(() => f.query(table, entry)).then(resolve, reject); } };
    return builder;
  }
  const sdk = { from: query, rpc: async (name, args) => { f.db.push({ rpc: name, args }); return { data: null, error: null }; }, functions: { invoke: async (name, options) => { f.calls.push({ name, body: options.body }); return f.invoke(name, options); } } };
  const sourceFiles = {
    './roomViewState': 'src/features/listeningRoom/roomViewState.ts',
    './mixAccessSession': 'src/features/playback/mixAccessSession.ts',
    './nativeMixAccess': 'src/features/playback/nativeMixAccess.ts',
    './nativeMixDetail': 'src/features/playback/nativeMixDetail.ts',
    './useNativeMixDetail': 'src/features/playback/useNativeMixDetail.ts',
    './protectedMixPlayback': 'src/features/playback/protectedMixPlayback.ts',
    './playbackAccess': 'src/features/playback/playbackAccess.ts',
    './releaseAgeAccess': 'src/features/playback/releaseAgeAccess.ts',
    './nativePlaybackControl': 'src/features/playback/nativePlaybackControl.ts',
    './nativeQueueMutation': 'src/features/playback/nativeQueueMutation.ts',
  };
  function load(path) {
    if (modules.has(path)) return modules.get(path);
    const compiled = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
    assert.equal(compiled.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, path);
    const module = { exports: {} }; modules.set(path, module.exports);
    vm.runInNewContext(compiled.outputText, { module, exports: module.exports, URL, URLSearchParams, console,__DEV__:false,requestAnimationFrame:callback=>{callback();return 1;}, Date: class extends Date { static now() { return f.now; } },
      process: { env: { EXPO_PUBLIC_SUPABASE_URL: project } }, setTimeout: setTimer, clearTimeout: clearTimer,
      require(id) {
        if (id === 'react' || id === 'react/jsx-runtime') return require(id);
        if (id === 'react-native') return native;
        if (id === '@react-navigation/native') return { useIsFocused: () => f.focused };
        if (id.endsWith('/features/listeningRoom/ListeningRoomScreen')) return load('src/features/listeningRoom/ListeningRoomScreen.tsx');
        if (id.endsWith('/features/listeningRoom/roomViewState') || id === './roomViewState') return load('src/features/listeningRoom/roomViewState.ts');
        if (id === './ListeningDeck3D') return { ListeningDeck3D: props => {
          React.useEffect(() => { props.onReady(); }, []);
          React.useEffect(() => { if (props.cueRequestId != null) props.onCueReady(props.cueRequestId); }, [props.cueRequestId]);
          return React.createElement(View, { accessibilityLabel: 'Mock native deck boundary' });
        } };
        if (id.endsWith('/features/listeningRoom/useMixSocial')) return { useMixSocial: (id, isPublic) => {
          const identity = load('src/features/playback/useNativeMixDetail.ts').useMixSessionIdentity();
          const [state, setState] = React.useState({ liked: false, saved: false });
          const scope = f.session.scope();
          const change = async kind => {
            assert.ok(isPublic, 'protected Mix attempted a social action');
            const result = await f.save(); f.session.assertCurrent(scope);
            if (!result.success) throw new Error('Save failed');
            f.calls.push({ social: kind, actor: scope.actor, id });
            setState(before => ({ ...before, [kind === 'like' ? 'liked' : 'saved']: result.saved }));
          };
          return { ...(identity.ready ? state : {}), signedIn: Boolean(scope.actor), ready: identity.ready,
            busy: false, loading: false, error: null, retry: async () => {},
            toggleLike: () => change('like'), toggleSave: () => change('save') };
        } };
        if(id==='@react-native-async-storage/async-storage')return{default:{getItem:async key=>{if(f.failDraftRead)throw new Error('device read failure');return f.localStore.get(key)??null;},setItem:async(key,value)=>f.localStore.set(key,value),removeItem:async key=>f.localStore.delete(key)}};
        if(id==='@react-native-community/datetimepicker')return{default:()=>null};
        if(id==='expo-file-system/legacy')return{};
        if(id==='expo-document-picker')return{getDocumentAsync:async()=>{if(f.pickerError)throw new Error('native picker failure');return{canceled:true};}};
        if(id==='expo-image-picker')return{requestMediaLibraryPermissionsAsync:async()=>{if(f.pickerError)throw new Error('native permission failure');return{granted:true};},launchImageLibraryAsync:async()=>({canceled:true})};
        if(id.endsWith('/components/CreatorAccessGate'))return{CreatorAccessGate:View};
        if(id.endsWith('/features/studio/creatorUploadService'))return{createCreatorStudioDraft:(...args)=>{f.calls.push({create:args});return f.createImpl(...args);}};
        if(id.endsWith('/features/studio/nativeMixRevision'))return{nativeMixRevision:{hasPending:async()=>f.pendingMix},NativeMixRevisionError:class extends Error{constructor(reason){super(reason);this.reason=reason;}}};
        if(id==='./ownerCatalogService')return f.ownerApi;
        if (id === '@tanstack/react-query') return { useQuery };
        if (id === 'expo-router') return { Stack: { Screen: () => null }, useRouter: () => router, useLocalSearchParams: () => f.params, usePathname: () => '/discover',
          useFocusEffect: callback => React.useEffect(() => f.focused ? callback() : undefined, [callback, f.focused]) };
        if (id === 'expo-crypto') return { randomUUID: require('node:crypto').randomUUID };
        if (id === '@expo/vector-icons') return { MaterialIcons: props => React.createElement('i', { 'data-icon': props.name }) };
        if (id === 'expo-linear-gradient') return { LinearGradient: View };
        if (id === 'expo-status-bar') return { StatusBar: () => null };
        if (id === 'react-native-safe-area-context') return {SafeAreaView:View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
        if (id === 'react-native-track-player') return { RepeatMode: { Off: 'off', Queue: 'queue', Track: 'track' } };
        if (id.endsWith('/lib/supabase')) return { supabase: sdk };
        if (id.endsWith('/lib/orientation')) return { useListeningRoomOrientation() {} };
        if (id.endsWith('/design/typography')) return { pluggdFonts: font };
        if (id.endsWith('/design/editorial')) return { edFonts: font };
        if (id.endsWith('/design/haptics')) return { selectionHaptic() {}, impactHaptic() {} };
        if (id.endsWith('/design/usePluggdTheme')) return { usePluggdTheme: () => theme };
        if (id === './liquid-glass') return { GlassMiniPlayer: props => React.createElement(View, null,
          React.createElement(Text, null, props.title),
          React.createElement(Pressable, { accessibilityLabel: 'Open full player', onPress: props.onOpen }, 'Open'),
          React.createElement(Pressable, { accessibilityLabel: 'More', onPress: props.onMorePress }, 'More'),
          props.canLike ? React.createElement(Pressable, { accessibilityLabel: 'Save', onPress: props.onLikePress }, 'Save') : null) };
        if (id.endsWith('/context/PlaybackProvider')) return { usePlayback: () => f.player };
        if (id.endsWith('/features/culture/mobileServices')) return { getCurrentUserId: async () => f.session.scope().actor, toggleSavedContent: (...args) => { f.calls.push({ save: args }); return f.save(...args); } };
        if (id.endsWith('/lib/musicShare')) return load('src/lib/musicShare.ts');
        if (id.endsWith('/lib/mobileContent')) return { formatDuration: value => `${value || 0}s`, formatCompact: value => String(value || 0), releasePlayableUrl: () => '' };
        if (id.endsWith('/components/ContentUI')) return { RecoveryState: props => React.createElement(View, null, React.createElement(Text, null, props.title), React.createElement(Text, null, props.body), React.createElement(Pressable, { onPress: props.onPrimary }, props.primaryLabel), React.createElement(Pressable, { onPress: props.onSecondary }, props.secondaryLabel)) };
        if (id.endsWith('/components/PlaybackSeekBar')) return { PlaybackSeekBar: props => React.createElement(View, null, typeof props.children === 'function' ? props.children(0) : props.children) };
        if (id === './resolvePlaybackSource') return { resolvePlaybackTrack: async track => track };
        for (const [key, value] of Object.entries(sourceFiles)) if (id === key || id === `../playback/${key.slice(2)}` || id.endsWith(`/features/playback/${key.slice(2)}`)) return load(value);
        if (id.endsWith('/features/playback/publicPlaybackService')) return load('src/features/playback/publicPlaybackService.ts');
        throw new Error(`Unmocked ${id} in ${path}`);
      },
    }, { filename: path });
    modules.set(path, module.exports); return module.exports;
  }
  f.session = load(sourceFiles['./mixAccessSession']).mixAccessSession; f.session.bindActor(actor);
  if (screen === 'detail') load('src/features/listeningRoom/roomViewState.ts').roomViewState.write(f.session.identityKey(), mixId, { tab: 'tracklist' });
  f.accessClient = load(sourceFiles['./nativeMixAccess']).nativeMixAccess;
  f.detailApi = load(sourceFiles['./nativeMixDetail']);
  const control = load(sourceFiles['./nativePlaybackControl']);
  f.playImpl = async track => track;
  f.player.refreshMixPresentation = async () => { f.calls.push({ refreshArtwork: true }); };
  f.player.playTrack = async (track, startAt = 0) => { control.beginNativePlaybackIntent(); f.calls.push({ play: track, startAt }); return f.playImpl(track); };
  for (const action of ['play', 'pause', 'seekTo', 'togglePlayPause', 'skipToNext', 'skipToPrevious', 'skipToQueueIndex', 'playQueue', 'toggleRepeat', 'toggleShuffle', 'closePlayer']) f.player[action] = async (...args) => { control.beginNativePlaybackIntent(); f.calls.push({ control: action, args }); };
  f.intent = control;
  const screenModule=load(screen==='owner'?'src/features/studio/OwnerCatalogScreen.tsx':screen==='upload'?'app/creator/upload.tsx':screen === 'player' ? 'app/player.tsx' : screen === 'mini' ? 'components/MiniPlayer.tsx' : 'app/mixes/[id].tsx');
  const Component = screen==='owner'?screenModule.OwnerCatalogScreen:screenModule.default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  f.render = async () => { await act(async () => root.render(React.createElement(QueryClientProvider, { client }, React.createElement(Component)))); };
  f.text = () => container.textContent;
  f.button = name => [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === name || button.textContent === name);
  f.press = async name => { const button = f.button(name); assert.ok(button, `Missing button: ${name}`); await act(async () => button.click()); };
  f.tick = async milliseconds => { f.now += milliseconds; const due = [...f.timers.entries()].filter(([, timer]) => timer.at <= f.now); due.forEach(([id]) => f.timers.delete(id)); await act(async () => { due.forEach(([, timer]) => timer.callback()); }); };
  f.actor = async value => { await act(async () => f.session.bindActor(value)); };
  f.app = async value => { f.appState = value; await act(async () => { f.listeners.forEach(listener => listener(value)); }); };
  f.close = async () => { await act(async () => root.unmount()); client.clear(); container.remove(); assert.equal(f.listeners.size, 0); assert.equal(f.timers.size, 0, 'pending screen deadline after unmount'); };
  f.container = container; f.client = client; f.load = load;
  return f;
}
const cases = [];
const test = (name, run) => cases.push({ name, run });
const using = fn => async () => { const f = await fixture(); try { await fn(f); } finally { await f.close(); } };

test('private detail renders scoped metadata/tracklist without public social reads/actions', using(async f => {
  await f.render(); assert.ok(f.text().includes('Scoped private fixture')); assert.ok(f.text().includes('Private mix'));
  assert.ok(f.text().includes('Second selection')); assert.deepEqual(f.db, []);
  for (const label of ['Share mix', 'Save mix', 'Request Track ID', 'Post comment', 'Post mix to community']) assert.equal(f.button(label), undefined);
  await f.press('Listen'); assert.ok(f.button('Download')); assert.equal(f.client.getQueryCache().getAll().length, 0);
}));
test('private chapter selection stays paused; explicit Play starts the intended scoped timestamp with no delayed seek', using(async f => {
  await f.render(); await f.press('Seek to Second selection at 1:24');
  assert.equal(f.calls.filter(item => item.play).length, 0); await f.press('Play mix');
  const call = f.calls.find(item => item.play); assert.equal(call.startAt, 84); assert.equal(call.play.mixId, mixId);
  assert.ok(call.play.mixAccess); assert.ok(!JSON.stringify(call.play).includes(token));
  await f.tick(350); assert.equal(f.calls.filter(item => item.control === 'seekTo').length, 0);
}));
test('private scope change removes old title/artwork immediately and suppresses old response', using(async f => {
  await f.render(); const pending = deferred(); f.invoke = () => pending.promise;
  await f.actor(other); assert.ok(!f.text().includes('Scoped private fixture')); assert.equal(f.container.querySelector('img'), null);
  await act(async () => pending.resolve(response('private', true)));
  assert.ok(!f.text().includes('Scoped private fixture'));
  assert.ok(f.db.every(query => query.filters?.some(([key, value]) => key === 'visibility' && value === 'public')));
}));
test('private denial removes metadata and offers retry without direct-table fallback', using(async f => {
  f.invoke = async () => ({ data: null, error: { status: 404 } }); await f.render();
  assert.ok(f.text().includes('This mix is unavailable')); assert.ok(f.button('Try again'));
  // No capability is supplied, but even the permitted compatibility attempt is public-only.
  for (const query of f.db) assert.ok(query.filters.some(([key, value]) => key === 'visibility' && value === 'public'));
  f.invoke = async () => response(); await f.press('Try again'); assert.ok(f.text().includes('Scoped private fixture'));
}));
test('capability detail failure cannot enter public fallback or expose its bearer', using(async f => {
  const route = f.session.rewriteLink(`https://pluggd.fm/mixes/${mixId}#token=${token}`);
  f.params.access = new URL(route, project).searchParams.get('access');
  f.invoke = async () => ({ data: null, error: { status: 404 } }); await f.render();
  assert.equal(f.db.length, 0); assert.ok(!f.text().includes(token)); assert.ok(f.button('Try again'));
}));
test('public rollout fallback renders audio before independently failing/retrying tracklist', using(async f => {
  f.invoke = async () => ({ data: null, error: { status: 404 } });
  let failed = true;
  f.query = async table => table === 'mixes' ? { data: response('public').data.mix, error: null }
    : table === 'mix_tracklist_items' ? failed ? { data: null, error: new Error('synthetic') } : { data: response('public').data.tracklist, error: null }
      : { data: [], error: null };
  await f.render(); assert.ok(f.button('Play mix')); assert.ok(f.text().includes('The tracklist could not load.'));
  const tables = f.db.filter(item => item.table === 'mix_tracklist_items');
  assert.ok(tables.every(item => item.filters.some(([key, value]) => key === 'mixes.visibility' && value === 'public')));
  failed = false; await f.press('Retry tracklist'); assert.ok(f.text().includes('Second selection'));
  assert.ok(f.button('Share mix')); await f.press('Share mix'); assert.ok(f.shares[0].message.includes(`https://pluggd.fm/mixes/${mixId}`));
}));
test('new pause suppresses a pending track-jump failure and all delayed navigation', using(async f => {
  await f.render(); const pending = deferred(); f.playImpl = () => pending.promise;
  await f.press('Seek to Second selection at 1:24'); await f.press('Play mix'); f.intent.beginNativePlaybackIntent();
  await act(async () => pending.resolve(null)); await f.tick(350);
  assert.equal(f.alerts.length, 0); assert.equal(f.routes.length, 0); assert.ok(!f.text().includes('This mix could not start'));
}));
test('authorized download opens only the checked URL and describes handoff truthfully', using(async f => {
  await f.render(); f.invoke = async (_, { body }) => body.action === 'download' ? { data: { url: signed('audio'), fileName: 'mix.mp3' }, error: null } : response();
  await f.press('Listen'); await f.press('Download'); assert.deepEqual(f.links, [signed('audio')]); assert.equal(f.alerts[0][0], 'Download opened');
}));
test('account change during download suppresses URL handoff', using(async f => {
  await f.render(); const pending = deferred(); f.invoke = (_, { body }) => body.action === 'download' ? pending.promise : Promise.resolve({ data: null, error: { status: 404 } });
  await f.press('Listen'); await f.press('Download'); await f.actor(other);
  await act(async () => pending.resolve({ data: { url: signed('audio'), fileName: 'mix.mp3' }, error: null })); assert.equal(f.links.length, 0);
}));
test('focused metadata refresh failure invalidates private playback permission', using(async f => {
  await f.render(); await f.press('Seek to Second selection at 1:24'); await f.press('Play mix'); await f.tick(350);
  const access = f.calls.find(call => call.play).play.mixAccess;
  f.invoke = async () => ({ data: null, error: { status: 404 } }); await f.tick(200000);
  assert.equal(f.session.authorized(mixId, access), false); assert.ok(!f.text().includes('Scoped private fixture'));
}));
test('background suspends detail refresh and foreground refreshes current metadata', using(async f => {
  await f.render(); const count = f.calls.length; await f.app('background'); await f.tick(200000);
  assert.equal(f.calls.length, count); await f.app('active'); assert.equal(f.calls.length, count + 1);
}));

test('full player excludes protected metadata from public queries/cache and public social actions', async () => {
  const f = await fixture({ screen: 'player' });
  try {
    const detail = await f.accessClient.read(mixId); f.player.currentTrack = f.load('src/features/playback/protectedMixPlayback.ts').nativeMixTrack(detail);
    f.player.queue = [f.player.currentTrack]; f.params = { title: 'route-secret', artist: 'route-artist', cover: 'https://secret.invalid' };
    f.calls.length = 0; await f.render();
    assert.ok(f.text().includes('Scoped private fixture')); assert.equal(f.db.length, 0); assert.equal(f.calls.length, 0);
    assert.ok(!f.text().includes('route-secret')); for (const label of ['Share current track', 'Like current track', 'Open track community', 'Open track comments']) assert.equal(f.button(label), undefined);
    for (const query of f.client.getQueryCache().getAll()) assert.equal(query.state.data, undefined);
    await f.press('Open source for Scoped private fixture'); assert.equal(f.routes[0].params.id, mixId); assert.ok(!JSON.stringify(f.routes).includes('Scoped private fixture'));
    f.player.currentTrack = null; f.player.queue = []; await f.render(); assert.ok(!f.text().includes('Scoped private fixture')); assert.ok(!f.text().includes('route-secret')); assert.equal(f.container.querySelector('img'), null);
  } finally { await f.close(); }
});
test('full player saves public Mix successfully rather than reporting false failure', async () => {
  const f = await fixture({ screen: 'player' });
  try {
    f.player.currentTrack = { id: mixId, mixId, title: 'Public fixture', artist: 'Fixture', url: `mix:${mixId}`, type: 'mix' };
    await f.render(); assert.ok(f.db.some(call => call.rpc === 'get_public_playback_metadata')); await f.press('Save this mix');
    assert.equal(f.calls.find(call => call.social)?.social, 'save'); assert.ok(f.button('Remove mix from saved')); assert.equal(f.alerts.length, 0);
  } finally { await f.close(); }
});
test('landscape private detail retains playback/download and excludes public actions', async () => {
  const f = await fixture({ landscape: true });
  try {
    await f.render(); assert.ok(f.text().includes('Private mix')); assert.ok(f.button('Play mix')); assert.ok(f.button('Download'));
    assert.equal(f.button('Share mix'), undefined); assert.equal(f.button('Save mix'), undefined);
    await f.press('Seek to Second selection at 1:24'); await f.press('Play mix'); await f.tick(350); assert.equal(f.calls.find(call => call.play).startAt, 84);
  } finally { await f.close(); }
});
test('unlisted recipient source navigation carries only ID and live opaque handle', async () => {
  const f = await fixture({ screen: 'player', actor: null, visibility: 'unlisted' });
  try {
    const key = f.session.remember(mixId, token); const detail = await f.accessClient.read(mixId, key);
    f.player.currentTrack = f.load('src/features/playback/protectedMixPlayback.ts').nativeMixTrack(detail);
    await f.render(); await f.press('Open source for Scoped private fixture');
    assert.deepEqual(JSON.parse(JSON.stringify(f.routes[0])), { pathname: '/mixes/[id]', params: { id: mixId, access: key } });
    assert.ok(!JSON.stringify(f.routes).includes(token)); assert.equal(f.db.length, 0);
  } finally { await f.close(); }
});
test('public save completed after account change cannot announce old-account success', async () => {
  const f = await fixture({ screen: 'player' });
  try {
    f.player.currentTrack = { id: mixId, mixId, title: 'Public fixture', artist: 'Fixture', url: `mix:${mixId}`, type: 'mix' };
    const pending = deferred(); f.save = () => pending.promise;
    await f.render(); await f.press('Save this mix'); await f.actor(other);
    await act(async () => pending.resolve({ success: true, saved: true })); assert.equal(f.alerts.length, 0);
  } finally { await f.close(); }
});
test('expired room cover falls back without exposing a stale signed image', using(async f => {
  await f.render(); const image = f.container.querySelector('img');
  await act(async () => image.dispatchEvent(new window.Event('error')));
  assert.equal(f.container.querySelector('img'), null);
  f.invoke = async () => { const result = response(); result.data.mix.cover_url = signed('fresh-cover'); return result; };
  await f.app('background'); await f.app('active'); assert.equal(f.container.querySelector('img').getAttribute('src'), signed('fresh-cover'));
}));
test('mini player routes omit private presentation and queue carries only focus', async () => {
  const f = await fixture({ screen: 'mini' });
  try {
    const detail = await f.accessClient.read(mixId);
    f.player.currentTrack = { ...f.load('src/features/playback/protectedMixPlayback.ts').nativeMixTrack(detail), releaseId: 'legacy-extra', backstageRoute: '/community' };
    f.player.queue = [f.player.currentTrack]; await f.render();
    assert.equal(f.button('Save'), undefined); await f.press('Open full player'); assert.equal(f.routes[0], '/player');
    await f.press('More'); const options = f.alerts.at(-1); assert.equal(options[0], 'Player options');
    assert.ok(!options[2].some(item => /Save track|Community/.test(item.text)));
    await act(async () => options[2].find(item => item.text.startsWith('Queue')).onPress());
    assert.deepEqual(JSON.parse(JSON.stringify(f.routes[1])), { pathname: '/player', params: { focus: 'queue' } });
    assert.ok(!JSON.stringify(f.routes).includes('Scoped private fixture'));
  } finally { await f.close(); }
});
test('real native-intent entry rewrites both cold and warm capabilities without route bearer', using(async f => {
  const entry = f.load('app/+native-intent.tsx');
  for (const initial of [true, false]) {
    const rewritten = entry.redirectSystemPath({ path: `pluggd://mixes/${mixId}#token=${token}`, initial });
    assert.ok(rewritten.includes('access=')); assert.ok(!rewritten.includes(token));
    const handle = new URL(rewritten, project).searchParams.get('access');
    assert.equal(f.session.token(f.session.scope(), mixId, handle), token);
  }
}));
test('expired authentication cannot enter public fallback', using(async f => {
  f.invoke = async () => ({ data: null, error: { status: 401 } }); await f.render();
  assert.equal(f.db.length, 0); assert.ok(f.text().includes('This mix could not load')); assert.ok(f.button('Try again'));
}));
test('full player metadata refresh has an accessible state and a concrete recovery link in both layouts', async () => {
  for (const landscape of [false, true]) {
    const f = await fixture({ screen: 'player', landscape });
    try {
      f.player.mixMetadataRefreshing = true;
      f.player.mixRecovery = { mixId, accessKey: '00000000-0000-4000-8000-000000000001' };
      await f.render(); assert.ok(f.container.querySelector('[aria-label="Refreshing mix details"]'));
      assert.ok(f.text().includes('Mix details could not be refreshed.'));
      await f.press('Open mix details to check access');
      assert.deepEqual(JSON.parse(JSON.stringify(f.routes[0])), { pathname: '/mixes/[id]', params: { id: mixId, access: f.player.mixRecovery.accessKey } });
      assert.ok(!JSON.stringify(f.routes).includes('Scoped private fixture'));
    } finally { await f.close(); }
  }
});
test('full player failed artwork offers a working scoped retry without route presentation', async () => {
  const f = await fixture({ screen: 'player' });
  try {
    const detail = await f.accessClient.read(mixId); f.player.currentTrack = f.load('src/features/playback/protectedMixPlayback.ts').nativeMixTrack(detail);
    await f.render(); const image = f.container.querySelector('img'); await act(async () => image.dispatchEvent(new window.Event('error')));
    assert.ok(f.button('Reload mix artwork')); await f.press('Reload mix artwork'); assert.equal(f.calls.filter(call => call.refreshArtwork).length, 1);
    f.player.mixMetadataRefreshing = true; await f.render(); assert.equal(f.button('Reload mix artwork').disabled, true);
  } finally { await f.close(); }
});
const openUploadReview=async f=>{for(const label of ['Continue to Media','Continue to Rights','Continue to Review','Open review'])await f.press(label);};
test('upload Mix saves its planned ID before creation, reports ready and reopens the confirmed item',async()=>{
  const f=await fixture({screen:'upload'});
  try{
    await f.render();assert.ok(f.text().includes('Private creator draft'));await openUploadReview(f);
    f.createImpl=async(draft,stage,context)=>{assert.equal(draft.plannedMixId,mixId);assert.equal(context.actorId,owner);assert.ok([...f.localStore.values()].some(value=>value.includes(mixId)));return{catalogId:mixId,processingStatus:'ready'};};
    await f.press('Create Studio draft');assert.equal(f.alerts[0][0],'Studio draft created');assert.ok(f.alerts[0][1].includes('Mix and tracklist are saved'));assert.ok(!f.alerts[0][1].includes('processes the audio'));
    const saved=JSON.parse(f.localStore.get(`pluggd:studio-upload-draft:v2:${owner}:mix`));assert.equal(saved.completedMixId,mixId);
    await act(async()=>f.alerts[0][2][0].onPress());assert.equal(f.routes[0].params.item,mixId);
  }finally{await f.close();}
});
test('upload Mix offers explicit recovery after a lost response and keeps the same planned ID',async()=>{
  const f=await fixture({screen:'upload'});
  try{
    await f.render();await openUploadReview(f);f.createImpl=async()=>{f.pendingMix=true;throw new Error('Save could not be confirmed');};
    await f.press('Create Studio draft');assert.ok(f.button('Recover unfinished Mix save'));assert.ok(f.text().includes('Recover the previous save'));
    f.createImpl=async(draft,stage,context)=>{assert.equal(context.recoverMix,true);assert.equal(draft.plannedMixId,mixId);f.pendingMix=false;return{catalogId:mixId,processingStatus:'ready'};};
    await f.press('Recover unfinished Mix save');assert.equal(f.calls.filter(call=>call.create).length,2);
    assert.equal(JSON.parse(f.localStore.get(`pluggd:studio-upload-draft:v2:${owner}:mix`)).completedMixId,mixId);
  }finally{await f.close();}
});
test('upload Mix account switch clears the form and suppresses old completion and navigation',async()=>{
  const f=await fixture({screen:'upload'});
  try{
    await f.render();await openUploadReview(f);const pending=deferred();f.createImpl=()=>pending.promise;
    await f.press('Create Studio draft');await f.actor(other);assert.ok(!f.text().includes('Private creator draft'));
    await act(async()=>pending.resolve({catalogId:mixId,processingStatus:'ready'}));assert.equal(f.alerts.length,0);assert.equal(f.routes.length,0);
    assert.ok(!f.localStore.has(`pluggd:studio-upload-draft:v2:${other}:mix`));assert.ok(f.localStore.has(`pluggd:studio-upload-draft:v2:${owner}:mix`));
  }finally{await f.close();}
});
test('upload Mix device read failure offers retry without replacing the saved draft',async()=>{
  const f=await fixture({screen:'upload'});
  try{
    const key=`pluggd:studio-upload-draft:v2:${owner}:mix`,before=f.localStore.get(key);f.failDraftRead=true;await f.render();
    assert.ok(f.button('Retry opening draft'));assert.equal(f.localStore.get(key),before);
    f.failDraftRead=false;await f.press('Retry opening draft');assert.ok(f.text().includes('Private creator draft'));
  }finally{await f.close();}
});
test('upload Mix file-picker errors show recovery without dropping previous selections',async()=>{
  const f=await fixture({screen:'upload'});
  try{
    await f.render();await f.press('Continue to Media');f.pickerError=true;
    await f.press('Choose audio file');await f.press('Choose square artwork');
    assert.deepEqual(f.alerts.map(alert=>alert[0]),['Audio not saved','Artwork not saved']);
    await openUploadReview({...f,press:async name=>{if(name==='Continue to Media')return;return f.press(name);}});
    await f.press('Create Studio draft');assert.equal(f.calls.find(call=>call.create).create[0].audio.uri,'file:///audio.mp3');
  }finally{await f.close();}
});
test('owner Mix requires saving visibility edits before publication and navigates to the confirmed private copy',async()=>{
 const f=await fixture({screen:'owner'});
 try{
  await f.render();assert.ok(f.text().includes('Owned Mix fixture'));await f.press('unlisted');assert.equal(f.button('Publish mix').disabled,true);
  await f.press('Save catalogue changes');assert.equal(f.calls.find(c=>c.ownerSave).ownerSave.visibility,'unlisted');assert.equal(f.button('Publish mix').disabled,false);
  await f.press('Publish mix');assert.equal(f.calls.find(c=>c.ownerPublish).ownerPublish,'unlisted');
  await f.press('Duplicate Owned Mix fixture as a private draft');const dialog=f.alerts.at(-1);assert.ok(dialog[1].includes('protected files'));
  await act(async()=>dialog[2].find(item=>item.text==='Duplicate').onPress());assert.ok(f.routes.some(path=>String(path).includes('/studio/catalog/mix/10000000-0000-4000-8000-000000000002')));
 }finally{await f.close();}
});
test('owner Mix keeps edited form and exposes exact recovery after an unknown save',async()=>{
 const f=await fixture({screen:'owner'});
 try{
  await f.render();await f.press('unlisted');f.ownerSaveImpl=async()=>{f.ownerPending=true;throw new Error('Save unknown');};
  await f.press('Save catalogue changes');assert.ok(f.button('Recover unfinished Mix save'));assert.equal(f.button('Save catalogue changes').disabled,true);
  f.ownerApi.recoverOwnerMixSave=async()=>{f.ownerPending=false;f.ownerRecord.raw.visibility='unlisted';f.ownerRecord.raw.updated_at='2026-11-02T12:00:01.000Z';return{current:true,id:mixId};};
  await f.press('Recover unfinished Mix save');assert.equal(f.button('Recover unfinished Mix save'),undefined);assert.equal(f.button('Save catalogue changes').disabled,false);
 }finally{await f.close();}
});
test('owner Mix account switch hides old fields and suppresses a late operation acknowledgement',async()=>{
 const f=await fixture({screen:'owner'});
 try{
  await f.render();const pending=deferred();f.ownerSaveImpl=()=>pending.promise;await f.press('Save catalogue changes');await f.actor(other);
  assert.ok(!f.text().includes('Owned Mix fixture'));await act(async()=>pending.resolve({current:true}));assert.equal(f.alerts.length,0);assert.equal(f.routes.length,0);
 }finally{await f.close();}
});
test('owner Mix restores a stale device draft and requires explicit latest-version review',async()=>{
 const f=await fixture({screen:'owner'});
 try{
  f.localStore.set(`pluggd:mix-owner-draft:v1:${owner}:${mixId}`,JSON.stringify({form:{title:'My kept edit'},expectedUpdatedAt:'2026-11-01T12:00:00.000Z'}));
  await f.render();assert.ok(f.text().includes('This Mix has changed'));assert.equal(f.button('Save catalogue changes').disabled,true);
  await f.press('Keep my edits and review latest Mix');assert.equal(f.button('Save catalogue changes').disabled,false);
  await f.press('Save catalogue changes');assert.equal(f.calls.find(c=>c.ownerSave).ownerSave.title,'My kept edit');
 }finally{await f.close();}
});
test('owner Mix share actions use fragment links without persisting capabilities and revoke through the owner API',async()=>{
 const f=await fixture({screen:'owner'});
 try{
  f.ownerRecord.status='published';f.ownerRecord.raw.visibility='unlisted';
  f.invoke=async(_,options)=>options.body.action==='createLink'?{data:{mixId,token},error:null}:options.body.action==='revokeLink'?{data:{revoked:true},error:null}:response('unlisted',true);
  await f.render();await f.press('Create unlisted Mix link');assert.equal(f.shares[0].message,`https://pluggd.fm/mixes/${mixId}#token=${token}`);
  assert.ok(![...f.localStore.values()].join('').includes(token));await f.press('Revoke unlisted Mix links');assert.ok(f.alerts.some(alert=>alert[0]==='Previous Mix link revoked'));
 }finally{await f.close();}
});
let failures = 0;
const selected=process.env.PLUGGD_NATIVE_SCREEN_FILTER?cases.filter(item=>item.name.includes(process.env.PLUGGD_NATIVE_SCREEN_FILTER)):cases;
for (const { name, run } of selected) {
  try { await run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack || error}`); }
}
dom.window.close(); assert.ok(selected.length,'No matching screen cases');assert.equal(failures, 0, `${failures}/${selected.length} screen cases failed`);
console.log(`PASS ${selected.length} actual-source React screen/detail cases; native boundaries are fixtures, no visual/device or hosted acceptance.`);
