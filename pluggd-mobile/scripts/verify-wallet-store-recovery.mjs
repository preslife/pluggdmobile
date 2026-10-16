import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Actual hook/screen/helper execution with real React hooks. StoreKit, server
// verification and wallet writes are fixtures; this does not purchase credits.
const require = createRequire(import.meta.url);
const React = require('react');
const ts = require('typescript');
let JSDOM;
try { ({ JSDOM } = require('jsdom')); }
catch { ({ JSDOM } = createRequire(process.env.PLUGGD_WEB_PACKAGE_JSON || new URL('../../package.json', import.meta.url))('jsdom')); }
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = React;
const balance = { balance_credits: 500, pending_credits: 0, available_credits: 500 };
const session = { user: { id: '00000000-0000-4000-8000-000000000022' }, access_token: 'fixture-token', expires_at: Date.now() / 1000 + 3600 };
const sessionResult = { data: { session }, error: null };
const valid = { data: { success: true, type: 'credits', credits_added: 500, balance }, error: null };
const sku = 'pluggd_credits_starter';
const otherSku = 'pluggd_credits_popular';
const purchase = { productId: sku, transactionId: 'credit-transaction-fixture', purchaseToken: 'signed.fixture.receipt', purchaseState: 'purchased' };
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function load(path, mocks, timers) {
  const result = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.equal((result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, {
    module, exports: module.exports, Error, Date, Map, Set, Promise,
    console: { ...console, log() {}, error() {}, warn() {} },
    setTimeout: timers.set, clearTimeout: timers.clear,
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      assert.ok(Object.hasOwn(mocks, name), `Unmocked ${name} in ${path}`);
      return mocks[name];
    },
  }, { filename: path });
  return module.exports;
}

async function mount(render) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(render()));
  return {
    container,
    async render() { await act(async () => root.render(render())); },
    async close() { await act(async () => root.unmount()); container.remove(); },
  };
}

function fixture() {
  const pendingTimers = new Map();
  let nextTimer = 0;
  const timers = {
    set(callback, delay) { const id = ++nextTimer; pendingTimers.set(id, { callback, delay }); return id; },
    clear(id) { pendingTimers.delete(id); },
  };
  const f = {
    log: [], balances: [], purchaseListeners: new Set(), errorListeners: new Set(), filters: [],
    fetch: async () => [sku, otherSku].map((id) => ({ id, displayPrice: id === sku ? '£4.99' : '£9.99' })),
    session: async () => sessionResult,
    refresh: async () => sessionResult,
    policy: async () => ({ permittedRail: 'apple_iap' }),
    request: async () => undefined,
    verify: async () => valid,
    available: async () => [],
    ledger: null,
    balanceRead: async () => ({ data: balance, error: null }),
    calls: { fetch: 0, request: 0, available: 0, finish: 0, connect: 0 },
  };
  const adapter = {
    provider: 'apple', storeName: 'App Store', accountName: 'Apple ID', creditRail: 'apple_iap',
    fetchProducts: async (...args) => { f.calls.fetch++; return f.fetch(...args); },
    requestProduct: async (args) => { f.calls.request++; f.requestArgs = args; return f.request(args); },
    getAvailablePurchases: async () => { f.calls.available++; return f.available(); },
    finishTransaction: async (_purchase, consumable) => { assert.equal(consumable, true); f.calls.finish++; f.log.push('finish'); },
    buildVerificationRequest: async (value, kind, accountId) => {
      f.verificationBinding = { value, kind, accountId };
      return { functionName: 'validate-iap-receipt', body: { product_id: value.productId, transaction_id: value.transactionId } };
    },
    listenForPurchases(listener) { f.purchaseListeners.add(listener); return { remove: () => f.purchaseListeners.delete(listener) }; },
    listenForErrors(listener) { f.errorListeners.add(listener); return { remove: () => f.errorListeners.delete(listener) }; },
  };
  f.store = { adapter, ready: true, connectionError: null, retryConnection: async () => { f.calls.connect++; return true; } };
  const setBalance = (value) => { f.balances.push(value); f.log.push('wallet'); };
  const supabase = {
    auth: { getSession: () => f.session(), refreshSession: () => f.refresh() },
    functions: { invoke: async (_name, request) => { f.verificationRequest = request; f.log.push('verify'); return f.verify(); } },
    rpc: async (name, args) => { assert.equal(name, 'get_wallet_balance'); assert.equal(args.p_user_id, session.user.id); return f.balanceRead(); },
    from(table) {
      assert.equal(table, 'wallet_ledger');
      const query = {
        select: () => query, limit: () => query,
        eq: (key, value) => { f.filters.push([key, value]); return query; },
        contains: (key, value) => { f.filters.push([key, value]); return query; },
        maybeSingle: async () => ({ data: f.ledger, error: null }),
      };
      return query;
    },
  };
  const timeout = load('../src/billing/storeOperation.ts', {}, timers);
  f.module = load('../src/hooks/useCredits.ts', {
    '../lib/supabase': { supabase },
    './useWallet': { useWalletStore: (selector) => selector({ setBalance }) },
    '../context/StoreKitProvider': { useStoreKit: () => f.store },
    '../commerce/policy': { resolveCommercePolicy: (...args) => f.policy(...args) },
    '../billing': { storeProductId: (product) => product.id, storeProductPrice: (product) => product?.displayPrice || '' },
    '../billing/storeOperation': timeout,
  }, timers);
  f.mount = async () => {
    function Probe() { f.value = f.module.useCredits(); return null; }
    f.view = await mount(() => React.createElement(Probe));
    return f;
  };
  f.emitPurchase = async (value) => { await act(async () => { await Promise.all([...f.purchaseListeners].map((listener) => listener(value))); }); };
  f.emitError = async (value) => { await act(async () => { for (const listener of f.errorListeners) listener(value); }); };
  f.expireReads = async () => {
    const entries = [...pendingTimers.values()];
    pendingTimers.clear();
    await act(async () => { for (const entry of entries) { assert.equal(entry.delay, 15000); entry.callback(); } });
  };
  f.pendingTimers = pendingTimers;
  f.timers = timers;
  return f;
}

const tests = [];
const test = (name, run) => tests.push({ name, run });
const withCredits = (run) => async () => { const f = await fixture().mount(); try { await run(f); } finally { await f.view.close(); } };

test('empty products show honest failure and retry recovers store prices', async () => {
  const f = fixture();
  f.fetch = async () => [];
  await f.mount();
  try {
    assert.equal(f.value.loadingProducts, false);
    assert.match(f.value.productError, /returned no credit pack prices/);
    assert.ok(f.value.packs.every((pack) => !pack.product && !pack.localizedPrice));
    f.fetch = async () => [{ id: sku, displayPrice: '£4.99' }];
    await act(async () => f.value.retryProducts());
    assert.equal(f.calls.fetch, 2);
    assert.equal(f.value.productError, null);
    assert.equal(f.value.packs[0].localizedPrice, '£4.99');
  } finally { await f.view.close(); }
});

test('fetch failure and missing/blank product prices never become buyable fallbacks', async () => {
  const f = fixture();
  f.fetch = async () => { throw new Error('offline'); };
  await f.mount();
  try {
    assert.match(f.value.error, /prices could not be loaded/);
    f.fetch = async () => [{ id: sku, displayPrice: ' ' }, { id: 'unrelated', displayPrice: '£1.00' }];
    await act(async () => f.value.retryProducts());
    assert.equal(f.value.products.length, 0);
    assert.ok(f.value.packs.every((pack) => !pack.product));
    await act(async () => f.value.purchaseCredits(sku));
    assert.equal(f.calls.request, 0);
    assert.match(f.value.purchaseError, /price is unavailable/);
  } finally { await f.view.close(); }
});

test('loading and explicit retry remain visible until product read finishes', async () => {
  const f = fixture();
  let products = deferred();
  f.fetch = () => products.promise;
  await f.mount();
  try {
    assert.equal(f.value.loadingProducts, true);
    await act(async () => { products.resolve([]); });
    products = deferred();
    let retry;
    await act(async () => { retry = f.value.retryProducts(); });
    assert.equal(f.value.retrying, true);
    assert.equal(f.value.loadingProducts, true);
    await act(async () => { products.resolve([{ id: sku, displayPrice: '£4.99' }]); await retry; });
    assert.equal(f.value.retrying, false);
    assert.equal(f.value.loadingProducts, false);
  } finally { await f.view.close(); }
});

test('hung product read times out without inventing prices and permits explicit retry', async () => {
  const f = fixture();
  f.fetch = () => new Promise(() => {});
  await f.mount();
  try {
    await f.expireReads();
    assert.equal(f.value.loadingProducts, false);
    assert.match(f.value.productError, /took too long/);
    f.fetch = async () => [{ id: sku, displayPrice: '£4.99' }];
    await act(async () => f.value.retryProducts());
    assert.equal(f.value.packs[0].product.id, sku);
  } finally { await f.view.close(); }
});

test('connection retry survives the root ready-state update and fetches products once', async () => {
  const f = fixture();
  f.store.ready = false;
  f.store.connectionError = 'Store connection failed';
  const connect = deferred();
  const products = deferred();
  f.store.retryConnection = () => { f.calls.connect++; return connect.promise; };
  f.fetch = () => products.promise;
  await f.mount();
  try {
    assert.equal(f.value.loadingProducts, false);
    let retry;
    await act(async () => { retry = f.value.retryProducts(); });
    f.store.ready = true;
    f.store.connectionError = null;
    await f.view.render();
    await act(async () => { connect.resolve(true); });
    assert.equal(f.value.retrying, true);
    assert.equal(f.calls.fetch, 1);
    await act(async () => { products.resolve([{ id: sku, displayPrice: '£4.99' }]); await retry; });
    assert.equal(f.value.loadingProducts, false);
    assert.equal(f.value.retrying, false);
  } finally { await f.view.close(); }
});

test('connection timeout leaves readable retry feedback', async () => {
  const f = fixture();
  f.store.ready = false;
  f.store.connectionError = 'offline';
  f.store.retryConnection = () => new Promise(() => {});
  await f.mount();
  try {
    let retry;
    await act(async () => { retry = f.value.retryProducts(); });
    await f.expireReads();
    await retry;
    assert.equal(f.value.retrying, false);
    assert.match(f.value.productError, /connection took too long/);
  } finally { await f.view.close(); }
});

test('stale product completion cannot overwrite a newer retry', async () => {
  const f = fixture();
  const first = deferred();
  f.fetch = () => first.promise;
  await f.mount();
  try {
    f.fetch = async () => [{ id: otherSku, displayPrice: '£9.99' }];
    await act(async () => f.value.retryProducts());
    await act(async () => { first.resolve([{ id: sku, displayPrice: '£4.99' }]); });
    assert.equal(f.value.products.length, 1);
    assert.equal(f.value.products[0].id, otherSku);
  } finally { await f.view.close(); }
});

test('purchase auth is bounded before dispatch and duplicate purchase/restore are blocked', withCredits(async (f) => {
  const auth = deferred();
  f.session = () => auth.promise;
  let request;
  await act(async () => { request = f.value.purchaseCredits(sku); void f.value.purchaseCredits(otherSku); void f.value.restorePurchases(); });
  assert.equal(f.value.purchasing, true);
  assert.equal(f.calls.request, 0);
  const baseline = f.calls.available;
  await f.expireReads();
  await request;
  assert.equal(f.calls.available, baseline);
  assert.equal(f.calls.request, 0);
  assert.equal(f.value.purchasing, false);
  assert.match(f.value.purchaseError, /Sign-in check took too long/);
}));

test('expired-session refresh and policy reads are bounded before requesting payment', withCredits(async (f) => {
  f.session = async () => ({ data: { session: { ...session, expires_at: 1 } }, error: null });
  f.refresh = () => new Promise(() => {});
  let request;
  await act(async () => { request = f.value.purchaseCredits(sku); });
  await f.expireReads();
  await request;
  assert.match(f.value.purchaseError, /Sign-in refresh took too long/);
  assert.equal(f.calls.request, 0);
  f.session = async () => sessionResult;
  f.policy = () => new Promise(() => {});
  await act(async () => { request = f.value.purchaseCredits(sku); });
  await f.expireReads();
  await request;
  assert.match(f.value.purchaseError, /eligibility took too long/);
  assert.equal(f.calls.request, 0);
}));

test('an unresolved purchase request has no artificial cancellation timer', withCredits(async (f) => {
  const request = deferred();
  f.request = () => request.promise;
  let started;
  await act(async () => { started = f.value.purchaseCredits(sku); });
  assert.equal(f.pendingTimers.size, 0);
  await f.expireReads();
  assert.equal(f.value.purchasing, true);
  assert.equal(f.calls.request, 1);
  await act(async () => { request.resolve(undefined); await started; });
  assert.equal(f.value.purchasing, true, 'request return still waits for listener');
}));

test('resolved request and pending payment have no timeout-based unlock or duplicate dispatch', withCredits(async (f) => {
  await act(async () => f.value.purchaseCredits(sku));
  assert.equal(f.value.purchasing, true);
  assert.equal(f.requestArgs.sku, sku);
  assert.equal(f.requestArgs.accountId, session.user.id);
  assert.equal(f.pendingTimers.size, 0, 'purchase itself must never get a read timeout');
  await f.emitPurchase({ ...purchase, purchaseState: 'pending' });
  await f.expireReads();
  await act(async () => { await f.value.purchaseCredits(otherSku); await f.value.restorePurchases(); await f.value.retryProducts(); });
  assert.equal(f.calls.request, 1);
  assert.equal(f.calls.finish, 0);
  assert.equal(f.value.purchasing, true);
  assert.equal(f.value.pendingPayment, true);
  assert.match(f.value.notice, /Do not buy again/);
}));

test('trusted credits response updates wallet before manual finish', withCredits(async (f) => {
  const verification = deferred();
  f.verify = () => verification.promise;
  await act(async () => f.value.purchaseCredits(sku));
  let event;
  await act(async () => { event = Promise.all([...f.purchaseListeners].map((listener) => listener(purchase))); });
  assert.equal(f.calls.finish, 0);
  assert.equal(f.balances.length, 0);
  assert.equal(f.pendingTimers.size, 0, 'verification is not a preflight read timeout');
  await act(async () => { verification.resolve(valid); await event; });
  assert.deepEqual(f.log, ['verify', 'wallet', 'finish']);
  assert.equal(f.verificationBinding.accountId, session.user.id);
  assert.equal(f.verificationBinding.kind, 'credits');
  assert.equal(f.verificationRequest.headers.Authorization, `Bearer ${session.access_token}`);
  assert.equal(f.value.purchasing, false);
  assert.equal(f.value.feedbackSku, sku);
  assert.match(f.value.notice, /wallet is up to date/);
}));

test('trusted duplicate credits success does not require credits_added', withCredits(async (f) => {
  f.verify = async () => ({ data: { success: true, duplicate: true, type: 'credits', balance }, error: null });
  await f.emitPurchase(purchase);
  assert.equal(f.calls.finish, 1);
  assert.deepEqual(f.balances, [balance]);
}));

for (const [name, data] of [
  ['false success', { success: false, type: 'credits', balance }],
  ['wrong entitlement', { success: true, type: 'platform_subscription', balance }],
  ['missing balance', { success: true, type: 'credits' }],
  ['nonfinite balance', { success: true, type: 'credits', balance: { ...balance, available_credits: NaN } }],
  ['empty response', null],
]) {
  test(`${name} leaves credits unfinished and wallet unchanged`, withCredits(async (f) => {
    f.verify = async () => ({ data, error: null });
    await f.emitPurchase(purchase);
    assert.equal(f.calls.finish, 0);
    assert.equal(f.balances.length, 0);
    assert.match(f.value.purchaseError, /valid credit balance/);
  }));
}

test('verification failure without trusted ledger recovery stays unfinished', withCredits(async (f) => {
  f.verify = async () => ({ data: null, error: new Error('offline') });
  await f.emitPurchase(purchase);
  assert.equal(f.calls.finish, 0);
  assert.equal(f.balances.length, 0);
  assert.match(f.value.purchaseError, /Do not buy again/);
  assert.equal(f.filters.find(([key]) => key === 'user_id')[1], session.user.id);
  const metadata = f.filters.find(([key]) => key === 'meta')[1];
  assert.equal(metadata.transaction_id, purchase.transactionId);
  assert.equal(metadata.product_id, sku);
}));

test('matching server ledger recovery retains verified transaction/account scope', withCredits(async (f) => {
  f.ledger = { id: 'ledger-fixture', kind: 'topup_iap', amount_credits: 500 };
  await f.emitPurchase({ ...purchase, purchaseToken: null });
  assert.equal(f.calls.finish, 1);
  assert.deepEqual(f.balances, [balance]);
  assert.equal(f.filters.find(([key]) => key === 'ref_type')[1], 'apple_iap');
}));

test('restore reports empty results and verifies unfinished credits before finishing', withCredits(async (f) => {
  await act(async () => f.value.restorePurchases());
  assert.match(f.value.notice, /No unfinished credit purchases/);
  f.available = async () => [purchase];
  f.log.length = 0;
  await act(async () => f.value.restorePurchases());
  assert.deepEqual(f.log, ['verify', 'wallet', 'finish']);
  assert.match(f.value.notice, /wallet is up to date/);
  assert.equal(f.value.restoring, false);
}));

test('restore read failure is recoverable without finishing or discarding credits', withCredits(async (f) => {
  f.available = () => new Promise(() => {});
  let restore;
  await act(async () => { restore = f.value.restorePurchases(); });
  assert.equal(f.value.restoring, true);
  await f.expireReads();
  await restore;
  assert.equal(f.value.restoring, false);
  assert.equal(f.calls.finish, 0);
  assert.match(f.value.purchaseError, /Purchases took too long/);
  f.available = async () => [purchase];
  f.verify = async () => ({ data: { success: false, type: 'credits', balance }, error: null });
  await act(async () => f.value.restorePurchases());
  assert.equal(f.calls.finish, 0);
  assert.equal(f.balances.length, 0);
  assert.match(f.value.purchaseError, /valid credit balance/);
}));

test('restored pending payment stays locked without being finished', withCredits(async (f) => {
  f.available = async () => [{ ...purchase, purchaseState: 'pending' }];
  await act(async () => f.value.restorePurchases());
  assert.equal(f.value.restoring, false);
  assert.equal(f.value.pendingPayment, true);
  assert.equal(f.value.purchasing, true);
  assert.match(f.value.notice, /Do not buy again/);
  await act(async () => f.value.purchaseCredits(otherSku));
  assert.equal(f.calls.request, 0);
  assert.equal(f.calls.finish, 0);
}));

test('Google credit consumption still requires verified credit response and consume mode', withCredits(async (f) => {
  f.store.adapter.provider = 'google';
  f.store.adapter.creditRail = 'google_play_iap';
  f.verify = async () => ({ data: { success: true, provider: 'google_play', purchase_kind: 'credit_pack', finish_required: true, finish_mode: 'consume' }, error: null });
  await f.emitPurchase({ ...purchase, purchaseToken: 'google-token' });
  assert.deepEqual(f.log, ['verify', 'wallet', 'finish']);
  f.log.length = 0;
  f.verify = async () => ({ data: { success: true, provider: 'google_play', purchase_kind: 'credit_pack', finish_required: true, finish_mode: 'acknowledge' }, error: null });
  await f.emitPurchase({ ...purchase, purchaseToken: 'google-token' });
  assert.deepEqual(f.log, ['verify']);
  assert.equal(f.calls.finish, 1);
  assert.match(f.value.purchaseError, /invalid credit completion mode/);
}));

test('cancelled request allows a deliberate next purchase', withCredits(async (f) => {
  await act(async () => f.value.purchaseCredits(sku));
  await f.emitError({ productId: sku, code: 'user-cancelled', message: 'cancelled' });
  assert.equal(f.value.purchasing, false);
  assert.equal(f.value.purchaseError, null);
  assert.match(f.value.notice, /cancelled/);
  await act(async () => f.value.purchaseCredits(otherSku));
  assert.equal(f.calls.request, 2);
}));

test('wallet renders loading/retry/pack feedback and only confirms a priced purchase', withCredits(async (f) => {
  let state = { ...f.value };
  let retries = 0;
  const purchases = [];
  const alerts = [];
  const flatten = (style) => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style || {};
  const View = ({ children, accessibilityLiveRegion }) => React.createElement('div', { 'aria-live': accessibilityLiveRegion }, children);
  const native = {
    View, ScrollView: View, RefreshControl: () => null,
    StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
    Alert: { alert: (...args) => alerts.push(args) },
    ActivityIndicator: () => React.createElement('span', { 'data-spinner': true }),
    Text: ({ children, accessibilityLiveRegion }) => React.createElement('span', { 'aria-live': accessibilityLiveRegion }, children),
    Pressable: ({ children, style, accessibilityRole, accessibilityLabel, onPress, disabled }) => {
      assert.notEqual(typeof style, 'function', 'Native boundary must receive resolved static styles');
      return React.createElement('button', { role: accessibilityRole, 'aria-label': accessibilityLabel, disabled, onClick: onPress, 'data-min-height': flatten(style).minHeight }, children);
    },
  };
  const screen = load('../app/wallet.tsx', {
    '@expo/vector-icons': { MaterialIcons: () => null },
    '../src/design/typography': { pluggdFonts: {} },
    'expo-router': { Stack: { Screen: () => null } },
    'expo-status-bar': { StatusBar: () => null },
    '@tanstack/react-query': { useQuery: () => ({ isLoading: false, data: { entitlements: [] }, refetch: async () => undefined }) },
    'react-native': native,
    '../components/PluggdPrimitives': { PremiumScreenHeader: () => null },
    '../src/design/usePluggdTheme': { usePluggdTheme: () => ({ scheme: 'dark', colors: new Proxy({}, { get: () => '#ffffff' }) }) },
    '../src/components/PurchaseLegalLinks': { PurchaseLegalLinks: () => null },
    '../src/hooks/useCredits': { useCredits: () => ({ ...state, retryProducts: () => { retries++; }, purchaseCredits: (value) => purchases.push(value) }) },
    '../src/hooks/useWallet': { useWallet: () => ({ balance, ledger: [], loading: false, refreshBalance: async () => undefined, refreshLedger: async () => undefined }) },
    '../src/features/culture/mobileServices': { loadLibraryBundle: async () => undefined },
  }, f.timers);
  const view = await mount(() => React.createElement(screen.default));
  const button = (label) => view.container.querySelector(`button[aria-label="${label}"]`);
  try {
    state = { ...state, loadingProducts: true };
    await view.render();
    assert.equal(button('Loading App Store prices').disabled, true);
    assert.ok(view.container.textContent.includes('Loading…'));
    state = { ...state, loadingProducts: false, packs: state.packs.map((pack) => ({ ...pack, product: null, localizedPrice: '' })), productError: 'Prices could not be loaded', error: 'Prices could not be loaded' };
    await view.render();
    assert.ok(!button('Retry App Store').disabled);
    assert.ok(view.container.textContent.includes('Prices could not be loaded'));
    assert.ok(view.container.textContent.includes('Unavailable'));
    await act(async () => button('Retry App Store').click());
    assert.equal(retries, 1);
    assert.equal(alerts.length, 0);
    state = { ...state, retrying: true };
    await view.render();
    assert.equal(button('Retrying App Store').disabled, true);
    state = { ...f.value, feedbackSku: sku, purchaseError: 'Verification is pending. Do not buy again.', error: 'Verification is pending. Do not buy again.' };
    await view.render();
    const starter = [...view.container.querySelectorAll('button[role="radio"]')].find((item) => item.getAttribute('aria-label').startsWith('Starter Credits'));
    assert.match(starter.parentElement.querySelector('[aria-live="polite"]').textContent, /Do not buy again/);
    state = { ...f.value };
    await view.render();
    const buy = button('Buy 1,050 credits for £9.99');
    assert.ok(buy && !buy.disabled);
    assert.equal(buy.dataset.minHeight, '54');
    await act(async () => buy.click());
    assert.equal(purchases.length, 0, 'confirmation precedes dispatch');
    alerts.at(-1)[2].find((action) => action.text === 'Buy').onPress();
    assert.deepEqual(purchases, [otherSku]);
    state = { ...state, purchasing: true, pendingPayment: true };
    await view.render();
    assert.equal(button('Awaiting payment approval').disabled, true);
    assert.ok([...view.container.querySelectorAll('button[role="radio"]')].every((item) => item.disabled));
    assert.equal(button('Restore purchases').disabled, true);
  } finally { await view.close(); }
}));

let failures = 0;
for (const { name, run } of tests) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack || error}`); }
}
dom.window.close();
assert.equal(failures, 0, `${failures}/${tests.length} wallet recovery cases failed`);
console.log(`PASS ${tests.length} actual-source React wallet recovery cases. Local fixtures; no real purchases, backend writes or native device proof.`);
