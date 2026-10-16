import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Actual-source React tests. Native/StoreKit/network boundaries are fixtures;
// this establishes local behavior, not native layout or App Store fulfilment.
const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');
let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch {
  const workspaceRequire = createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || new URL('../../package.json', import.meta.url));
  ({ JSDOM } = workspaceRequire('jsdom'));
}
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://local.test' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
let clockMs = 0;
let timerId = 0;
const timers = new Map();
function advanceTimers(ms) {
  clockMs += ms;
  for (const [id, timer] of [...timers]) {
    if (timer.at <= clockMs) { timers.delete(id); timer.callback(); }
  }
}
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const session = { user: { id: 'account-fixture' }, access_token: 'fixture-token' };
const sessionResult = { data: { session }, error: null };
const userResult = { data: { user: session.user }, error: null };
const success = { data: { success: true, type: 'platform_subscription', tier: 'starter' }, error: null };
const sku = 'com.pluggd.mobile.plan.starter.monthly';
const otherSku = 'com.pluggd.mobile.plan.creator.monthly';
const purchase = { productId: sku, purchaseToken: 'signed.fixture.token', transactionId: 'transaction-fixture', purchaseState: 'purchased' };

function load(relativePath, mocks) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: relativePath,
    reportDiagnostics: true,
  });
  assert.equal((code.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0, relativePath);
  const module = { exports: {} };
  vm.runInNewContext(code.outputText, {
    module, exports: module.exports, console: { ...console, warn() {} },
    Date, Error, Map, Set, Promise, Intl,
    // Reconciliation delays are elided; outcomes and order remain actual code.
    setTimeout: (callback, ms = 0) => {
      const id = ++timerId;
      if (ms <= 1600) queueMicrotask(callback);
      else timers.set(id, { at: clockMs + ms, callback });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      assert.ok(Object.hasOwn(mocks, name), `Unmocked import ${name} in ${relativePath}`);
      return mocks[name];
    },
  }, { filename: relativePath });
  return module.exports;
}

async function mount(render) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(render()); });
  return {
    container,
    async render() { await act(async () => { root.render(render()); }); },
    async close() { await act(async () => root.unmount()); container.remove(); },
  };
}

const storeOperation = load('../src/billing/storeOperation.ts', {});

function fixture() {
  const state = {
    session: async () => sessionResult,
    user: async () => userResult,
    fetch: async () => [{ id: sku, displayPrice: '£4.99' }, { id: otherSku, displayPrice: '£9.99' }],
    verify: async () => success,
    finish: async () => undefined,
    entitlement: async () => ({ data: null, error: null }),
    available: async () => [],
    request: async () => undefined,
    log: [], purchaseListeners: new Set(), errorListeners: new Set(), calls: { request: 0, restore: 0, fetch: 0, finish: 0 },
  };
  const adapter = {
    provider: 'apple', storeName: 'App Store',
    fetchProducts: async (...args) => { state.calls.fetch++; return state.fetch(...args); },
    requestSubscription: async (args) => { state.calls.request++; state.log.push('request'); state.requestArgs = args; return state.request(args); },
    getAvailablePurchases: async () => { state.calls.restore++; return state.available(); },
    buildVerificationRequest: async () => ({ functionName: 'validate-iap-receipt', body: {} }),
    finishTransaction: async (_purchase, consumable) => { assert.equal(consumable, false); state.calls.finish++; state.log.push('finish'); await state.finish(); },
    listenForPurchases: (listener) => { state.purchaseListeners.add(listener); return { remove: () => state.purchaseListeners.delete(listener) }; },
    listenForErrors: (listener) => { state.errorListeners.add(listener); return { remove: () => state.errorListeners.delete(listener) }; },
    subscriptionManagementUrl: () => 'https://apps.apple.com/account/subscriptions',
  };
  const supabase = {
    auth: { getUser: () => state.user(), getSession: () => state.session() },
    functions: { invoke: async () => { state.log.push('verify'); return state.verify(); } },
    from(table) {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => { state.log.push('entitlement'); return state.entitlement(); },
        then: (resolve, reject) => Promise.resolve({ data: table === 'platform_pricing_config' ? [] : null, error: null }).then(resolve, reject),
      };
      return query;
    },
  };
  state.store = { adapter, ready: true, connectionError: null, retryConnection: async () => true };
  state.module = load('../src/hooks/usePlatformSubscription.ts', {
    '../billing': { storeProductId: (product) => product.id },
    '../billing/storeOperation': storeOperation,
    '../context/StoreKitProvider': { useStoreKit: () => state.store },
    '../lib/supabase': { supabase },
  });
  state.mount = async () => {
    function Probe() { state.value = state.module.usePlatformSubscription(); return null; }
    state.view = await mount(() => React.createElement(Probe));
    return state;
  };
  state.emitPurchase = async (value) => { await act(async () => { await Promise.all([...state.purchaseListeners].map((listener) => listener(value))); }); };
  state.emitError = async (value) => { await act(async () => { for (const listener of state.errorListeners) listener(value); }); };
  return state;
}

const tests = [];
const test = (name, run) => tests.push({ name, run });
const withHook = (run) => async () => { const f = await fixture().mount(); try { await run(f); } finally { await f.view.close(); } };

test('busy before session await; duplicate/different purchase and restore blocked; listener owns completion', withHook(async (f) => {
  const auth = deferred();
  f.session = () => auth.promise;
  let first;
  await act(async () => {
    first = f.value.subscribe(sku);
    void f.value.subscribe(sku);
    void f.value.subscribe(otherSku);
    void f.value.restore();
  });
  assert.equal(f.value.purchasingSku, sku);
  assert.equal(f.calls.request, 0);
  assert.equal(f.calls.restore, 0);
  await act(async () => { auth.resolve(sessionResult); await first; });
  assert.equal(f.calls.request, 1);
  assert.equal(f.requestArgs.accountId, session.user.id);
  assert.equal(f.value.purchasingSku, sku, 'request resolution must retain busy until StoreKit event');
  await act(async () => { await f.value.subscribe(otherSku); await f.value.restore(); });
  assert.equal(f.calls.request, 1);
  assert.equal(f.calls.restore, 0);
  f.session = async () => sessionResult;
  const verification = deferred();
  f.verify = () => verification.promise;
  let event;
  await act(async () => { event = Promise.all([...f.purchaseListeners].map((listener) => listener(purchase))); });
  assert.equal(f.calls.finish, 0, 'no finish before verification');
  f.log.length = 0;
  await act(async () => { verification.resolve(success); await event; });
  assert.deepEqual(f.log, ['finish', 'entitlement']);
  assert.equal(f.value.purchasingSku, null);
  assert.match(f.value.notice, /active/);
}));

test('cancellation releases lock without verification or finishing', withHook(async (f) => {
  await act(async () => f.value.subscribe(sku));
  await f.emitError({ code: 'user-cancelled', productId: sku });
  assert.equal(f.value.purchasingSku, null);
  assert.equal(f.value.error, null);
  assert.equal(f.calls.finish, 0);
  assert.ok(!f.log.includes('verify'));
  await act(async () => f.value.subscribe(otherSku));
  assert.equal(f.calls.request, 2);
}));

test('request failure releases the lock and never verifies or finishes', withHook(async (f) => {
  f.request = async () => { throw new Error('Store fixture unavailable'); };
  await act(async () => f.value.subscribe(sku));
  assert.equal(f.value.purchasingSku, null);
  assert.match(f.value.error, /Store fixture unavailable/);
  assert.equal(f.calls.finish, 0);
  assert.ok(!f.log.includes('verify'));
  f.request = async () => undefined;
  await act(async () => f.value.subscribe(otherSku));
  assert.equal(f.calls.request, 2);
}));

test('pending approval keeps the purchase guarded and exposes status without another request', withHook(async (f) => {
  await act(async () => f.value.subscribe(sku));
  await f.emitPurchase({ ...purchase, purchaseState: 'pending' });
  assert.equal(f.value.purchasingSku, sku);
  assert.equal(f.value.purchaseTakingLong, true);
  await act(async () => { await f.value.subscribe(otherSku); await f.value.restore(); await f.value.checkPurchaseStatus(); });
  assert.equal(f.calls.request, 1);
  assert.equal(f.value.purchasingSku, sku);
  assert.equal(f.value.purchaseTakingLong, true);
  assert.match(f.value.notice, /waiting for payment approval/);
  assert.equal(f.calls.finish, 0);
  assert.ok(!f.log.includes('verify'));
}));

test('pending request/error responses retain the guard until a completed transaction arrives', withHook(async (f) => {
  f.request = async () => { throw Object.assign(new Error('Awaiting approval'), { code: 'deferred-payment' }); };
  await act(async () => f.value.subscribe(sku));
  assert.equal(f.value.purchasingSku, sku);
  assert.equal(f.value.purchaseTakingLong, true);
  await f.emitError({ productId: sku, code: 'pending', message: 'Awaiting approval' });
  await act(async () => f.value.checkPurchaseStatus());
  await act(async () => f.value.subscribe(otherSku));
  assert.equal(f.calls.request, 1);
  assert.equal(f.value.purchasingSku, sku);
  await f.emitPurchase(purchase);
  assert.equal(f.value.purchasingSku, null);
  assert.equal(f.calls.finish, 1);
  f.request = async () => undefined;
  await act(async () => f.value.subscribe(otherSku));
  assert.equal(f.calls.request, 2);
}));

test('verification failure leaves transaction unfinished and exposes inline target', withHook(async (f) => {
  f.verify = async () => ({ data: { success: false }, error: null });
  await act(async () => f.value.subscribe(sku));
  await f.emitPurchase(purchase);
  assert.equal(f.calls.finish, 0);
  assert.equal(f.value.purchasingSku, null);
  assert.equal(f.value.feedbackSku, sku);
  assert.match(f.value.error, /valid plan entitlement/);
}));

test('verification transport failure without recovered entitlement never finishes', withHook(async (f) => {
  f.verify = async () => ({ data: null, error: new Error('offline') });
  await act(async () => f.value.subscribe(sku));
  await f.emitPurchase(purchase);
  assert.equal(f.calls.finish, 0);
  assert.match(f.value.error, /still verifying/);
}));

test('restore locks immediately and prevents purchase/second restore overlap', withHook(async (f) => {
  const auth = deferred();
  f.session = () => auth.promise;
  let restoring;
  await act(async () => {
    restoring = f.value.restore();
    void f.value.restore();
    void f.value.subscribe(sku);
  });
  assert.equal(f.value.restoring, true);
  assert.equal(f.calls.request, 0);
  await act(async () => { auth.resolve(sessionResult); await restoring; });
  assert.equal(f.calls.restore, 1);
  assert.equal(f.value.restoring, false);
}));

test('successful restore verifies then manually finishes then refreshes entitlement', withHook(async (f) => {
  f.available = async () => [purchase, { ...purchase, productId: otherSku, purchaseState: 'pending' }, { ...purchase, productId: 'unrelated-product' }];
  f.log.length = 0;
  await act(async () => f.value.restore());
  assert.deepEqual(f.log, ['verify', 'finish', 'entitlement']);
  assert.equal(f.calls.finish, 1);
  assert.match(f.value.notice, /restored/);
  assert.equal(f.value.restoring, false);
}));

test('failed products expose recovery and retry fetches actual hook products', async () => {
  const f = fixture();
  f.fetch = async () => { throw new Error('offline'); };
  await f.mount();
  try {
    assert.equal(f.value.loadingProducts, false);
    assert.equal(f.value.products.length, 0);
    assert.match(f.value.error, /Retry App Store/);
    f.fetch = async () => [{ id: sku }];
    await act(async () => f.value.retryStore());
    assert.equal(f.calls.fetch, 2);
    assert.equal(f.value.products[0].id, sku);
    assert.equal(f.value.error, null);
  } finally { await f.view.close(); }
});

test('false connect stays unready; explicit retry is single-flight and succeeds', async () => {
  let value;
  let connects = 0;
  let disconnects = 0;
  let gate = deferred();
  const adapter = { storeName: 'App Store', connect: () => { connects++; return gate.promise; }, disconnect: async () => { disconnects++; } };
  const source = load('../src/context/StoreBillingProvider.tsx', {
    'react-native': { Platform: { OS: 'ios' } },
    '../billing': { getStoreBillingAdapter: () => adapter },
    '../billing/storeOperation': storeOperation,
  });
  function Probe() { value = source.useStoreBilling(); return null; }
  const view = await mount(() => React.createElement(source.StoreBillingProvider, null, React.createElement(Probe)));
  try {
    assert.equal(value.ready, false);
    await act(async () => { gate.resolve(false); });
    assert.equal(value.ready, false);
    assert.match(value.connectionError, /Could not connect/);
    gate = deferred();
    let retry;
    await act(async () => { retry = value.retryConnection(); assert.equal(value.retryConnection(), retry); });
    assert.equal(connects, 2);
    await act(async () => { gate.resolve(true); assert.equal(await retry, true); });
    assert.equal(value.ready, true);
    assert.equal(value.connectionError, null);
  } finally { await view.close(); }
  assert.equal(disconnects, 1);
});

test('entitlement/auth timeout settles with a retryable error instead of inert price loading', async () => {
  const f = fixture();
  f.session = () => new Promise(() => {});
  await f.mount();
  try {
    assert.equal(f.value.loading, true);
    await act(async () => advanceTimers(15_000));
    assert.equal(f.value.loading, false);
    assert.match(f.value.entitlementError, /Retry plan details/);
    f.session = async () => sessionResult;
    await act(async () => f.value.refresh());
    assert.equal(f.value.entitlementError, null);
  } finally { await f.view.close(); }
});

test('retry exposes immediate pending state while StoreKit reconnection is unresolved', withHook(async (f) => {
  const gate = deferred();
  f.store.ready = false;
  f.store.connectionError = 'offline';
  f.store.retryConnection = () => gate.promise;
  await f.view.render();
  let retry;
  await act(async () => { retry = f.value.retryStore(); });
  assert.equal(f.value.retryingStore, true);
  await act(async () => { gate.resolve(false); await retry; });
  assert.equal(f.value.retryingStore, false);
}));

test('missing StoreKit event exposes status recovery without allowing another charge', withHook(async (f) => {
  await act(async () => f.value.subscribe(sku));
  await act(async () => advanceTimers(45_000));
  assert.equal(f.value.purchaseTakingLong, true);
  assert.match(f.value.notice, /Check purchase status/);
  await act(async () => f.value.subscribe(otherSku));
  assert.equal(f.calls.request, 1);
  f.available = async () => [purchase];
  await act(async () => f.value.checkPurchaseStatus());
  assert.equal(f.calls.finish, 1);
  assert.equal(f.value.purchasingSku, null);
}));

test('explicit status recovery unlocks a settled empty result but never an open native request', withHook(async (f) => {
  const native = deferred();
  f.request = () => native.promise;
  let request;
  await act(async () => { request = f.value.subscribe(sku); });
  await act(async () => advanceTimers(45_000));
  await act(async () => f.value.checkPurchaseStatus());
  assert.equal(f.value.purchasingSku, sku, 'an unresolved native request must remain protected');
  await act(async () => { native.resolve([]); await request; });
  await act(async () => f.value.checkPurchaseStatus());
  assert.equal(f.value.purchasingSku, null);
  assert.match(f.value.notice, /You can choose a plan again/);
  f.request = async () => undefined;
  await act(async () => f.value.subscribe(otherSku));
  assert.equal(f.calls.request, 2);
}));

test('returned purchase plus replayed listener verifies and finishes only once', withHook(async (f) => {
  f.request = async () => purchase;
  await act(async () => f.value.subscribe(sku));
  await f.emitPurchase(purchase);
  assert.equal(f.calls.finish, 1);
  assert.equal(f.log.filter((item) => item === 'verify').length, 1);
}));

test('late request rejection cannot unlock a newer purchase', withHook(async (f) => {
  const first = deferred();
  const second = deferred();
  f.request = ({ sku: requested }) => requested === sku ? first.promise : second.promise;
  let firstRun;
  let secondRun;
  await act(async () => { firstRun = f.value.subscribe(sku); });
  await f.emitPurchase(purchase);
  await act(async () => { secondRun = f.value.subscribe(otherSku); });
  assert.equal(f.value.purchasingSku, otherSku);
  await act(async () => { first.reject(new Error('late first request')); await firstRun; });
  assert.equal(f.value.purchasingSku, otherSku);
  await act(async () => advanceTimers(45_000));
  await act(async () => f.value.checkPurchaseStatus());
  assert.equal(f.value.purchasingSku, otherSku, 'older rejection must not mark current request settled');
  await act(async () => { second.resolve([]); await secondRun; });
}));

test('late request resolution cannot mark a newer request settled', withHook(async (f) => {
  const first = deferred();
  const second = deferred();
  f.request = ({ sku: requested }) => requested === sku ? first.promise : second.promise;
  let a; let b;
  await act(async () => { a = f.value.subscribe(sku); });
  await f.emitPurchase(purchase);
  await act(async () => { b = f.value.subscribe(otherSku); });
  await act(async () => { first.resolve([]); await a; });
  await act(async () => advanceTimers(45_000));
  await act(async () => f.value.checkPurchaseStatus());
  assert.equal(f.value.purchasingSku, otherSku);
  await act(async () => { second.resolve([]); await b; });
}));

test('late native errors cannot release a store-confirmed purchase during verification', withHook(async (f) => {
  const native = deferred(); const verification = deferred();
  f.request = () => native.promise;
  f.verify = () => verification.promise;
  let request; let update;
  await act(async () => { request = f.value.subscribe(sku); });
  await act(async () => { update = Promise.all([...f.purchaseListeners].map((listener) => listener(purchase))); });
  await act(async () => { native.reject(Object.assign(new Error('late cancellation'), { code: 'user-cancelled' })); await request; });
  await f.emitError({ productId: sku, code: 'user-cancelled', message: 'late native error' });
  await act(async () => f.value.subscribe(otherSku));
  assert.equal(f.calls.request, 1);
  assert.equal(f.value.purchasingSku, sku);
  await act(async () => { verification.resolve(success); await update; });
  assert.equal(f.calls.finish, 1);
  assert.equal(f.value.purchasingSku, null);
  assert.equal(f.value.error, null);
}));

test('Restore and replayed listener share transaction fulfillment', withHook(async (f) => {
  const verification = deferred();
  f.verify = () => verification.promise;
  f.available = async () => [purchase];
  let restore; let replay;
  await act(async () => { restore = f.value.restore(); });
  await act(async () => { replay = Promise.all([...f.purchaseListeners].map((listener) => listener(purchase))); });
  assert.equal(f.log.filter((item) => item === 'verify').length, 1);
  await act(async () => { verification.resolve(success); await Promise.all([restore, replay]); });
  assert.equal(f.calls.finish, 1);
  assert.equal(f.value.error, null);
}));

test('slow native finish retains ownership after visible timeout and across Restore', withHook(async (f) => {
  const finish = deferred();
  f.finish = () => finish.promise;
  await act(async () => f.value.subscribe(sku));
  let first;
  await act(async () => { first = Promise.all([...f.purchaseListeners].map((listener) => listener(purchase))); });
  await act(async () => { advanceTimers(15_000); await first; });
  assert.equal(f.calls.finish, 1);
  assert.equal(f.value.purchasingSku, sku);
  let replay;
  await act(async () => { replay = Promise.all([...f.purchaseListeners].map((listener) => listener(purchase))); });
  await act(async () => { advanceTimers(15_000); await replay; });
  await act(async () => f.value.restore());
  assert.equal(f.calls.finish, 1);
  assert.equal(f.calls.restore, 0, 'an in-flight native finish still protects the screen');
  await act(async () => { finish.resolve(); });
  f.available = async () => [purchase];
  await act(async () => f.value.checkPurchaseStatus());
  assert.equal(f.value.purchasingSku, null);
  assert.equal(f.calls.finish, 1);
}));

test('screen resolves real EdPressable styles, preserves 48pt Choose targets and inline feedback', async () => {
  const f = fixture();
  const flatten = (style) => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style || {};
  let scroll;
  const native = {
    StyleSheet: { create: (styles) => styles, flatten, hairlineWidth: 1 },
    View: ({ children }) => React.createElement('div', null, children),
    Text: ({ children, accessibilityLiveRegion }) => React.createElement('span', { 'aria-live': accessibilityLiveRegion }, children),
    ActivityIndicator: () => React.createElement('span', { 'data-spinner': true }),
    ScrollView: ({ children, onScroll }) => { scroll = onScroll; return React.createElement('div', null, children); },
    Linking: { openURL: async () => undefined },
    Pressable: ({ children, style, accessibilityLabel, accessibilityRole, disabled, onPress, onPressIn, onPressOut }) => {
      assert.notEqual(typeof style, 'function', `Native interop received callback style: ${accessibilityLabel}`);
      const resolved = flatten(style);
      return React.createElement('button', {
        'aria-label': accessibilityLabel, role: accessibilityRole, disabled,
        'data-min-height': resolved.minHeight || resolved.height,
        'data-direction': resolved.flexDirection,
        'data-align': resolved.alignItems,
        onClick: onPress, onMouseDown: onPressIn, onMouseUp: onPressOut,
      }, children);
    },
  };
  const Icon = () => React.createElement('span', { 'data-icon': true });
  const editorial = load('../src/features/editorial/EditorialBits.tsx', {
    'react-native': native,
    '@expo/vector-icons': { MaterialIcons: Icon },
    'react-native-reanimated': { default: { View: native.View } },
    '../../design/editorial': { ed: {}, edFonts: {} },
    '../../design/haptics': { impactHaptic() {}, selectionHaptic() {} },
    '../../design/useReducedMotion': { useReducedMotion: () => true },
  });
  let state = {
    entitlement: { tier: 'free', status: 'active', commissionRate: 20, currentPeriodEnd: null },
    planDefinitions: f.module.PLATFORM_PLANS,
    products: [{ id: sku, displayPrice: '£4.99' }, { id: otherSku, displayPrice: '£9.99' }, { id: 'com.pluggd.mobile.plan.pro.monthly', displayPrice: '£19.99' }],
    loading: false, loadingProducts: false, restoring: false, purchasingSku: null,
    feedbackSku: sku, error: 'Verification fixture failed', notice: null,
    clearMessage() {}, subscribe() {}, restore() {}, retryStore() {}, refresh() {}, checkPurchaseStatus() {},
  };
  const screen = load('../app/plans.tsx', {
    'react-native': native,
    '@expo/vector-icons': { MaterialIcons: Icon },
    'expo-router': { Stack: { Screen: () => null }, useRouter: () => ({ back() {}, push() {} }) },
    'expo-status-bar': { StatusBar: () => null },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../src/billing': { storeProductId: (product) => product.id, storeProductPrice: (product) => product.displayPrice },
    '../src/components/PurchaseLegalLinks': { PurchaseLegalLinks: () => null },
    '../src/features/editorial/EditorialBits': editorial,
    '../src/context/AuthProvider': { useAuth: () => ({ user: session.user }) },
    '../src/design/useBottomChromeInset': { useBottomChromeInset: () => 0 },
    '../src/design/typography': { pluggdFonts: {} },
    '../src/design/usePluggdTheme': { usePluggdTheme: () => ({ scheme: 'dark', colors: new Proxy({}, { get: () => '#ffffff' }) }) },
    '../src/hooks/usePlatformSubscription': { usePlatformSubscription: () => state },
  });
  const view = await mount(() => React.createElement(screen.default));
  const button = (label) => view.container.querySelector(`button[aria-label="${label}"]`);
  try {
    const choose = button('Choose Starter');
    assert.ok(choose);
    assert.ok(Number(choose.dataset.minHeight) >= 48, 'Choose target must remain at least48pt');
    assert.equal(choose.dataset.direction, 'row');
    assert.equal(choose.dataset.align, 'center');
    assert.equal(choose.parentElement.querySelector('[aria-live="polite"]').textContent, state.error);
    assert.equal(button('Show monthly plans').dataset.minHeight, '48');
    await act(async () => { scroll({ nativeEvent: { contentOffset: { y: 500 } } }); });
    assert.equal(view.container.querySelectorAll('button[aria-label="Show monthly plans"]').length, 2);
    state = { ...state, purchasingSku: sku };
    await view.render();
    assert.equal(button('Connecting to App Store').disabled, true);
    assert.equal(button('Choose Creator').disabled, true);
    assert.equal(button('Restore App Store purchases').disabled, true);
    assert.equal(button('Show monthly plans').disabled, true);
    state = { ...state, purchasingSku: null, loadingProducts: true };
    await view.render();
    const loading = [...view.container.querySelectorAll('button[aria-label="Loading App Store prices"]')];
    assert.equal(loading.length, 3);
    assert.ok(loading.every((item) => item.disabled));
    state = { ...state, loadingProducts: false, loading: true };
    await view.render();
    assert.ok(button('Checking current plan').disabled);
    state = { ...state, loading: false, entitlementError: 'Retry plan details', globalError: 'Retry plan details' };
    await view.render();
    assert.equal(button('Retry plan details').disabled, false);
    state = { ...state, entitlementError: null, globalError: null, retryingStore: true };
    await view.render();
    assert.ok(button('Connecting to App Store').disabled);
    state = { ...state, retryingStore: false, purchasingSku: sku, purchaseTakingLong: true };
    let checks = 0;
    state.checkPurchaseStatus = () => { checks++; };
    await view.render();
    const check = button('Check purchase status');
    assert.ok(check && !check.disabled, 'delayed StoreKit must expose an enabled status-recovery action');
    await act(async () => check.click());
    assert.equal(checks, 1);
    state = { ...state, purchasingSku: null, purchaseTakingLong: false, feedbackSku: 'not-rendered-sku', error: 'Global fallback fixture' };
    await view.render();
    assert.ok(button('Choose Starter').parentElement.textContent.includes('Global fallback fixture'));
    let retries = 0;
    state = { ...state, loadingProducts: false, products: [], retryStore: () => { retries++; } };
    await view.render();
    const retry = button('Retry App Store');
    assert.ok(retry && !retry.disabled);
    await act(async () => retry.click());
    assert.equal(retries, 1);
  } finally { await view.close(); }
});

let failures = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack || error}`); }
}
dom.window.close();
assert.equal(failures, 0, `${failures}/${tests.length} actual-source regression tests failed`);
console.log(`PASS ${tests.length} actual-source React/JSDOM regression tests. Native rendering, StoreKit and physical-device behavior remain unverified by this harness.`);
