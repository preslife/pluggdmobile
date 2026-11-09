import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { JSDOM } = createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || new URL('../../package.json', import.meta.url))('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://local.test' });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function load(path, mocks = {}) {
  const result = ts.transpileModule(read(path), { fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  assert.equal(result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0, path);
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, { module, exports: module.exports, Date, Error, Map, Set, Promise, Intl, AbortController, setTimeout, clearTimeout,
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      assert.ok(Object.hasOwn(mocks, name), `Unmocked ${name} in ${path}`); return mocks[name];
    } }, { filename: path });
  return module.exports;
}
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise((yes) => { resolve = yes; }); return { promise, resolve }; };
const until = async (test) => { for (let i = 0; i < 100 && !test(); i++) await new Promise((resolve) => setTimeout(resolve, 0)); assert.ok(test(), 'fixture did not reach expected boundary'); };
let cases = 0;
async function test(label, run) { await run(); cases++; console.log(`PASS ${label}`); }

function harness() {
  const h = { session: { user: { id: 'actor-a' }, access_token: 'fixture-token-a' }, now: Date.parse('2026-11-09T12:00:00Z'), rows: new Map(), storage: new Map(), calls: [], listeners: new Set(), failPrivate: false, beforeQuery: null, onPinned: null, serverUser: null };
  h.changeActor = (id, token = id ? `fixture-token-${id}` : null) => {
    h.session = id ? { user: { id }, access_token: token } : null;
    for (const listener of h.listeners) listener(id ? 'SIGNED_IN' : 'SIGNED_OUT', h.session);
  };
  const storage = {
    async getItem(key) { return h.storage.get(key) ?? null; }, async setItem(key, value) { h.storage.set(key, value); }, async removeItem(key) { h.storage.delete(key); },
    async getAllKeys() { return [...h.storage.keys()]; },
  };
  h.client = { auth: {
    async getSession() { return { data: { session: h.session }, error: null }; },
    async getUser(token) { h.calls.push({ kind: 'getUser', token }); return { data: { user: h.serverUser ?? h.session?.user }, error: null }; },
    onAuthStateChange(callback) { h.listeners.add(callback); return { data: { subscription: { unsubscribe() { h.listeners.delete(callback); } } } }; },
  }, from(table) {
    assert.equal(table, 'profile_private_demographics', 'DOB service must use only the private table');
    const query = { kind: 'select', table, filters: {}, value: null, headers: {}, signal: null, options: null };
    const builder = {
      select() { return this; }, eq(key, value) { query.filters[key] = value; return this; }, is(key, value) { query.filters[key] = value; return this; }, maybeSingle() { return this; },
      update(value) { query.kind = 'update'; query.value = value; return this; },
      upsert(value, options) { query.kind = 'upsert'; query.value = value; query.options = options; return this; },
      setHeader(key, value) { query.headers[key] = value; h.onPinned?.(query); return this; }, abortSignal(signal) { query.signal = signal; return this; },
      then(resolve, reject) { return (async () => {
        h.calls.push(query);
        if (h.beforeQuery) await h.beforeQuery(query);
        if (query.signal?.aborted) return { data: null, error: new Error('Aborted') };
        if (h.failPrivate) return { data: null, error: new Error('Private read failed') };
        const id = query.value?.user_id ?? query.filters.user_id;
        if (query.kind === 'select') return { data: clone(h.rows.get(id) ?? null), error: null };
        const row = h.rows.get(id);
        if (query.kind === 'upsert') {
          assert.equal(query.options.ignoreDuplicates, true, 'signup must never overwrite a concurrent private row');
          if (!row) h.rows.set(id, { ...clone(query.value), gender: null, pronouns: null });
        } else if (row && row.date_of_birth === query.filters.date_of_birth) h.rows.set(id, { ...row, ...clone(query.value) });
        return { data: null, error: null };
      })().then(resolve, reject); },
    };
    return builder;
  } };
  const module = load('src/features/auth/private-date-of-birth.ts', {
    '../../lib/supabase': { supabase: h.client }, '../../lib/storage': { supabaseStorage: storage }, '../../config/environment': { MINIMUM_AGE: 16 },
  });
  h.module = module; h.service = module.createPrivateDateOfBirthService(h.client, storage, () => h.now);
  return h;
}

await test('self-owned private DOB insert pins bearer and confirms readback', async () => {
  const h = harness(); const result = await h.service.saveMissing('actor-a', '2000-01-02');
  assert.equal(result.hasDateOfBirth, true); assert.equal(result.adult, true);
  assert.equal(h.rows.get('actor-a').date_of_birth, '2000-01-02');
  for (const call of h.calls.filter((call) => call.table)) assert.equal(call.headers.Authorization, 'Bearer fixture-token-a');
  assert.equal(h.calls.find((call) => call.kind === 'getUser').token, 'fixture-token-a');
  assert.equal(h.listeners.size, 0);
});
await test('fills only null private DOB while preserving other private fields', async () => {
  const h = harness(); h.rows.set('actor-a', { user_id: 'actor-a', date_of_birth: null, gender: 'fixture', pronouns: 'fixture' });
  await h.service.saveMissing('actor-a', '2000-01-02');
  assert.equal(h.rows.get('actor-a').gender, 'fixture'); assert.equal(h.rows.get('actor-a').pronouns, 'fixture');
  const write = h.calls.find((call) => call.kind === 'update'); assert.equal(write.filters.date_of_birth, null);
});
await test('existing private DOB defeats conflicting new input and old auth metadata', async () => {
  const h = harness(); h.rows.set('actor-a', { user_id: 'actor-a', date_of_birth: '2009-01-02' });
  h.serverUser = { id: 'actor-a', user_metadata: { date_of_birth: '1990-01-01', age_band: '18_plus' } };
  const result = await h.service.saveMissing('actor-a', '1990-01-01');
  assert.equal(result.adult, false); assert.equal(h.rows.get('actor-a').date_of_birth, '2009-01-02');
  assert.equal(h.calls.filter((call) => call.kind === 'upsert' || call.kind === 'update').length, 0);
});
await test('private read failure never falls back to public/metadata DOB or writes', async () => {
  const h = harness(); h.failPrivate = true;
  await assert.rejects(h.service.saveMissing('actor-a', '2000-01-02'), (error) => error.reason === 'unavailable');
  assert.equal(h.rows.size, 0); assert.equal(h.calls.filter((call) => call.kind === 'upsert').length, 0);
});
await test('no-session email signup retains intent without a private-table request until matching authenticated user', async () => {
  const h = harness(); h.changeActor(null);
  await h.service.rememberSignup('actor-a', '2000-01-02', true);
  assert.equal(h.storage.size, 1); assert.equal(h.calls.length, 0);
  await assert.rejects(h.service.resumeSignup('actor-a'), (error) => error.reason === 'signed-out');
  h.changeActor('actor-b');
  assert.equal(await h.service.resumeSignup('actor-b'), null); assert.equal(h.storage.size, 1); assert.equal(h.rows.size, 0);
  h.changeActor('actor-a'); await h.service.resumeSignup('actor-a');
  assert.equal(h.rows.get('actor-a').date_of_birth, '2000-01-02'); assert.equal(h.rows.has('actor-b'), false); assert.equal(h.storage.size, 0);
});
await test('active signup intent remains in memory and durable email intent expires/cleans after 24 hours', async () => {
  const h = harness(); await h.service.rememberSignup('actor-a', '2000-01-02', false); assert.equal(h.storage.size, 0);
  h.now += 16 * 60 * 1000; assert.equal(await h.service.resumeSignup('actor-a'), null); assert.equal(h.rows.size, 0);
  await h.service.rememberSignup('actor-a', '2000-01-02', true); h.now += h.module.PENDING_DOB_TTL_MS + 1;
  assert.equal(await h.service.resumeSignup('actor-a'), null); assert.equal(h.storage.size, 0); assert.equal(h.rows.size, 0);
});
await test('startup cleanup removes expired orphaned accounts and memory intents, preserving unexpired confirmation and unrelated storage', async () => {
  const h = harness(); await h.service.rememberSignup('never-confirmed', '2000-01-02', true);
  await h.service.rememberSignup('actor-a', '2000-01-02', false);
  h.now += h.module.PENDING_DOB_TTL_MS + 1;
  h.storage.set('unrelated-setting', 'keep');
  // Seed a new unexpired confirmation through a separate instance, as after restart.
  const orphanKey = [...h.storage.keys()].find((key) => key.includes('never-confirmed'));
  const currentKey = orphanKey.replace('never-confirmed', 'still-confirming');
  h.storage.set(currentKey, JSON.stringify({ userId: 'still-confirming', dateOfBirth: '2000-01-02', createdAt: h.now, durable: true }));
  await h.service.cleanupExpired();
  assert.equal(h.storage.has(orphanKey), false); assert.equal(h.storage.has(currentKey), true); assert.equal(h.storage.get('unrelated-setting'), 'keep');
  h.calls.length = 0; assert.equal(await h.service.resumeSignup('actor-a'), null); assert.equal(h.calls.length, 0);
});
await test('returning authenticated user preserves existing private DOB and consumes matching old intent', async () => {
  const h = harness(); h.rows.set('actor-a', { user_id: 'actor-a', date_of_birth: '2009-01-02' });
  await h.service.rememberSignup('actor-a', '1990-01-01', true); const result = await h.service.resumeSignup('actor-a');
  assert.equal(result.adult, false); assert.equal(h.rows.get('actor-a').date_of_birth, '2009-01-02'); assert.equal(h.storage.size, 0);
});
await test('account switch during a private read aborts the stale save', async () => {
  const h = harness(), held = deferred(); h.beforeQuery = (query) => query.kind === 'select' ? held.promise : undefined;
  const save = h.service.saveMissing('actor-a', '2000-01-02'); const rejection = assert.rejects(save, (error) => error.reason === 'session-changed');
  await until(() => h.calls.some((call) => call.table)); h.changeActor('actor-b'); held.resolve(); await rejection;
  assert.equal(h.rows.size, 0); assert.equal(h.listeners.size, 0);
});
await test('credential rotation during write preparation retains initiating header and aborts, never writing as next user', async () => {
  const h = harness(); h.onPinned = (query) => { if (query.kind === 'upsert') h.changeActor('actor-b'); };
  await assert.rejects(h.service.saveMissing('actor-a', '2000-01-02'), (error) => error.reason === 'session-changed');
  const write = h.calls.find((call) => call.kind === 'upsert'); assert.equal(write.headers.Authorization, 'Bearer fixture-token-a'); assert.equal(write.value.user_id, 'actor-a'); assert.equal(h.rows.size, 0);
});
await test('unmounted/stale completion cannot write, and concurrent private DOB wins without overwrite', async () => {
  const h = harness(); await assert.rejects(h.service.saveMissing('actor-a', '2000-01-02', () => false), (error) => error.reason === 'session-changed');
  h.beforeQuery = (query) => { if (query.kind === 'upsert') h.rows.set('actor-a', { user_id: 'actor-a', date_of_birth: '2009-01-02' }); };
  assert.equal((await h.service.saveMissing('actor-a', '2000-01-02')).adult, false); assert.equal(h.rows.get('actor-a').date_of_birth, '2009-01-02');
});
await test('minimum signup age remains 16; malformed/future DOB is refused and 16/17 is not adult', async () => {
  const h = harness();
  for (const value of ['2012-01-01', '2000-02-31', '3000-01-01', 'not-a-date']) await assert.rejects(h.service.saveMissing('actor-a', value), (error) => error.reason === 'invalid');
  assert.equal(h.calls.length, 0);
  assert.equal((await h.service.saveMissing('actor-a', '2009-01-02')).adult, false);
});

const native = (tag) => ({ children, onPress, onChangeText, accessibilityLabel, accessibilityRole, accessibilityState, style, maxFontSizeMultiplier, ...rest }) => {
  const props = { onClick: onPress, onInput: onChangeText ? (event) => onChangeText(event.target.value) : undefined, 'aria-label': accessibilityLabel, role: accessibilityRole, disabled: rest.disabled ?? accessibilityState?.disabled };
  for (const key of ['value', 'placeholder', 'type']) if (rest[key] !== undefined) props[key] = rest[key];
  return React.createElement(tag, props, children);
};
const View = native('div'), Text = native('span'), Button = native('button');
const nativeMocks = { View, Text, Pressable: Button, TextInput: native('input'), ScrollView: View, KeyboardAvoidingView: View, Platform: { OS: 'ios' }, ActivityIndicator: native('span'), StyleSheet: { create: (value) => value, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 } };
const theme = { scheme: 'dark', colors: new Proxy({}, { get: () => '#555555' }) };
async function mount(Component) {
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => { root.render(React.createElement(Component)); });
  return { container, async render() { await act(async () => root.render(React.createElement(Component))); }, async close() { await act(async () => root.unmount()); container.remove(); } };
}
const button = (ui, label) => [...ui.container.querySelectorAll('button')].find((item) => item.textContent === label || item.getAttribute('aria-label') === label);
async function click(element) { assert.ok(element, 'expected UI action'); await act(async () => { element.click(); await new Promise((resolve) => setTimeout(resolve, 0)); }); }
async function input(element, value) { assert.ok(element); await act(async () => { element.value = value; element.dispatchEvent(new dom.window.Event('input', { bubbles: true })); }); }
function uiMocks(h) {
  const routes = [];
  const router = { push: (route) => routes.push(route), replace: (route) => routes.push(route), back() { routes.push('back'); }, canGoBack: () => true };
  const mocks = {
    '@expo/vector-icons': { MaterialIcons: () => null }, 'react-native': nativeMocks,
    '@react-native-community/datetimepicker': { default: ({ onChange }) => React.createElement('input', { type: 'date', 'aria-label': 'Birthday picker', onInput: (event) => onChange({ type: 'set' }, new Date(`${event.target.value}T12:00:00`)) }) },
    'expo-router': { useRouter: () => router, useLocalSearchParams: () => ({}), Stack: { Screen: () => null }, Link: native('a') },
    'expo-status-bar': { StatusBar: () => null }, 'react-native-safe-area-context': { SafeAreaView: View }, 'expo-linear-gradient': { LinearGradient: View },
    '../../src/context/AuthProvider': { useAuth: () => ({ user: h.session?.user ?? null, session: h.session, loading: false, launchAccessNotice: null, clearLaunchAccessNotice: async () => {} }) },
    '../../src/config/environment': { MINIMUM_AGE: 16, LAUNCH_ACCESS_REQUIRED: false },
    '../../src/design/typography': { pluggdFonts: {} }, '../../src/design/usePluggdTheme': { usePluggdTheme: () => theme, usePluggdThemeMode: () => ({ mode: 'dark', setMode() {} }) },
    '../../src/features/auth/private-date-of-birth': { ...h.module, privateDateOfBirth: h.service },
    '../../components/BrandLogo': { BrandLogo: () => null }, '../../components/AppleSignInButton': { AppleSignInButton: ({ onPress }) => React.createElement('button', { onClick: onPress }, 'Apple signup') },
    '../../components/GoogleSignInButton': { GoogleSignInButton: ({ onPress }) => React.createElement('button', { onClick: onPress }, 'Google signup') },
    '../../src/features/auth/launch-access': { storePendingAccessCode: async () => {}, validateAccessCode: async () => ({ valid: true }) },
    '../../src/lib/mobileContent': { PLUGGD_ORANGE: '#ff6600' }, '../../src/lib/supabase': { supabase: h.client },
    '../../src/features/auth/apple-sign-in': { isAppleSignInCancellation: () => false, signInWithApple: async () => ({ userId: 'actor-a' }) },
    '../../src/features/auth/google-sign-in': { isGoogleSignInCancellation: () => false, signInWithGoogle: async () => ({ userId: 'actor-a' }) },
  };
  return { mocks, routes };
}
async function chooseDob(ui, value) {
  await click(button(ui, 'Choose your date of birth') ?? button(ui, 'Choose date of birth'));
  await input(ui.container.querySelector('input[type=date]'), value); await click(button(ui, 'Confirm date of birth'));
}
await test('actual signup email-confirmation UI retains typed intent and never navigates into unauthenticated onboarding', async () => {
  const h = harness(); h.changeActor(null); let signupOptions;
  h.client.auth.signUp = async (options) => { signupOptions = options; return { data: { user: { id: 'actor-a' }, session: null }, error: null }; };
  const { mocks, routes } = uiMocks(h); const Component = load('app/auth/signup.tsx', mocks).default; const ui = await mount(Component);
  try {
    await chooseDob(ui, '2000-01-02'); await click(button(ui, 'Create account'));
    assert.match(ui.container.textContent, /Check your email/); assert.equal(routes.length, 0); assert.equal(h.storage.size, 1); assert.equal(h.rows.size, 0);
    assert.equal(Object.hasOwn(signupOptions.options.data, 'date_of_birth'), false); assert.ok(button(ui, 'Go to sign in'));
  } finally { await ui.close(); }
});
await test('actual signup with an immediate session saves privately before role setup', async () => {
  const h = harness(); h.client.auth.signUp = async () => ({ data: { user: { id: 'actor-a' }, session: h.session }, error: null });
  const { mocks, routes } = uiMocks(h); const Component = load('app/auth/signup.tsx', mocks).default; const ui = await mount(Component);
  try {
    await chooseDob(ui, '2000-01-02'); await click(button(ui, 'Create account'));
    assert.equal(h.rows.get('actor-a').date_of_birth, '2000-01-02'); assert.equal(h.storage.size, 0); assert.deepEqual(routes, ['/auth/role']);
  } finally { await ui.close(); }
});
await test('actual OAuth signup uses provider-returned identity and refuses a concurrent different account', async () => {
  const h = harness(); h.changeActor('actor-b');
  const { mocks, routes } = uiMocks(h); const Component = load('app/auth/signup.tsx', mocks).default; const ui = await mount(Component);
  try {
    await chooseDob(ui, '2000-01-02'); await click(button(ui, 'Google signup'));
    assert.equal(h.rows.size, 0); assert.equal(routes[0].pathname, '/auth/date-of-birth');
    assert.equal(routes[0].params.continueTo, 'role');
  } finally { await ui.close(); }
});
for (const provider of ['Google', 'Apple']) {
  await test(`actual ${provider} missing-DOB completion has a native picker and saves only its own private row`, async () => {
    const h = harness(); h.session.user.identities = [{ provider: provider.toLowerCase() }];
    const { mocks, routes } = uiMocks(h); const Component = load('app/auth/date-of-birth.tsx', mocks).default; const ui = await mount(Component);
    try {
      assert.ok(button(ui, 'Choose your date of birth'));
      await chooseDob(ui, '2000-01-02'); await click(button(ui, 'Save private date of birth'));
      assert.equal(h.rows.get('actor-a').date_of_birth, '2000-01-02'); assert.match(ui.container.textContent, /already saved/);
      await click(button(ui, 'Continue')); assert.deepEqual(routes, ['back']);
    } finally { await ui.close(); }
  });
}
await test('actual native completion preserves 17-year-old explicit denial and never starts playback', async () => {
  const h = harness(); const { mocks, routes } = uiMocks(h); const Component = load('app/auth/date-of-birth.tsx', mocks).default; const ui = await mount(Component);
  try {
    await chooseDob(ui, '2009-01-02'); await click(button(ui, 'Save private date of birth'));
    assert.match(ui.container.textContent, /Explicit music is only available to listeners aged 18 and over/); assert.equal(routes.length, 0);
    const age = load('src/features/playback/releaseAgeAccess.ts', { 'expo-crypto': { randomUUID: () => 'fixture-grant' }, '../../lib/supabase': { supabase: h.client } });
    assert.equal(age.adultFromDateOfBirth(h.rows.get('actor-a').date_of_birth, new Date(h.now)), false);
  } finally { await ui.close(); }
});
await test('actual completion read failure exposes Retry without a blind DOB write', async () => {
  const h = harness(); h.failPrivate = true; const { mocks } = uiMocks(h); const Component = load('app/auth/date-of-birth.tsx', mocks).default; const ui = await mount(Component);
  try { assert.ok(button(ui, 'Try again')); assert.equal(button(ui, 'Save private date of birth'), undefined); assert.equal(h.rows.size, 0); }
  finally { await ui.close(); }
});
console.log(`${cases} actual-source private DOB behavior/UI cases passed; account, network and native picker boundaries are fixtures. No production data or birthdays were written.`);
