import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the real hook, pure product helpers and both store adapters. Only
// React's lifecycle, Supabase and native store APIs are replaced; no accounts,
// network, store purchases or files are mutated by these fixtures.
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function loadSource(file, imports = {}) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (id) => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected external import ${id} in ${file}`);
    return imports[id];
  };
  // Reconciliation backoff is skipped, not tested. All other promise/lifecycle
  // ordering is preserved so async state and authenticated preflight execute.
  Function('module', 'exports', 'require', 'setTimeout', 'console', compiled)(
    module, module.exports, requireMock, (callback) => queueMicrotask(callback),
    { ...console, warn() {} },
  );
  return module.exports;
}

const productHelpers = loadSource('src/billing/platformPlanProducts.ts');
const storeTypes = loadSource('src/billing/types.ts');
const googleSku = 'plg_plan_starter_monthly';
const nextGoogleSku = 'plg_plan_creator_yearly';
const appleSku = 'com.pluggd.mobile.plan.starter.monthly';
const account = { id: 'test-pluggd-account' };
const accountHash = createHash('sha256').update(`pluggd:${account.id}`).digest('hex');
const freeRow = () => ({ tier: 'free', status: 'active', billing_provider: null, billing_cycle: null });
const paidRow = (provider, extra = {}) => ({
  tier: 'starter', status: 'active', billing_provider: provider, billing_cycle: 'monthly',
  provider_product_id: provider === 'google_play' ? googleSku : null,
  apple_product_id: provider === 'apple' ? appleSku : null,
  ...extra,
});
const googlePurchase = (extra = {}) => ({
  productId: googleSku, purchaseToken: 'fixture-only-google-token',
  obfuscatedAccountIdAndroid: accountHash,
  purchaseState: 'purchased', transactionId: 'fixture-only-transaction', ...extra,
});
const googleResponse = (extra = {}) => ({
  success: true, type: 'platform_subscription', provider: 'google_play', product_id: googleSku,
  tier: 'starter', billing_cycle: 'monthly', status: 'active',
  token_tier: 'starter', token_billing_cycle: 'monthly', token_status: 'active',
  entitled: true, serverFinished: true, finish_required: false, ...extra,
});

function hookLifecycle() {
  const slots = [];
  let cursor = 0;
  let dirty = true;
  let result;
  let renderHook;
  let pendingEffects = [];
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === 'function' ? initial() : initial };
      const slot = slots[index];
      return [slot.value, (update) => {
        const value = typeof update === 'function' ? update(slot.value) : update;
        if (!Object.is(value, slot.value)) { slot.value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: { current: initial } };
      return slots[index].value;
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || !sameDeps(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || !sameDeps(slots[index].deps, deps)) {
        const cleanup = slots[index]?.cleanup;
        slots[index] = { deps, cleanup };
        pendingEffects.push(() => {
          cleanup?.();
          slots[index].cleanup = effect();
        });
      }
    },
  };
  const render = () => {
    dirty = false;
    cursor = 0;
    result = renderHook();
    const effects = pendingEffects;
    pendingEffects = [];
    effects.forEach((effect) => effect());
  };
  return {
    react,
    start(hook) { renderHook = hook; render(); },
    get result() { return result; },
    async settle() {
      // Fixed microtask turns are intentionally bounded; unresolved query
      // fixtures leave the hook loading without blocking this test process.
      for (let i = 0; i < 32; i += 1) { await Promise.resolve(); if (dirty) render(); }
      return result;
    },
    dispose() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

async function harness(options = {}) {
  const lifecycle = hookLifecycle();
  const model = {
    provider: 'google', row: freeRow(), owned: [], verification: googleResponse(),
    verificationError: null, queryError: null, authUser: account, authSequence: [],
    deferredEntitlement: null, ...options,
  };
  const calls = { requests: [], finishes: [], availableOptions: [], verifications: [], entitlementReads: [] };
  let purchaseListener;
  let errorListener;
  const products = productHelpers.GOOGLE_PLATFORM_PLAN_SKUS.map((id) => {
    const cycle = productHelpers.googlePlatformPlan(id).billingCycle;
    return {
      id, platform: 'android', type: 'subs', displayPrice: '£9.99',
      subscriptionOffers: [{ id: cycle, basePlanIdAndroid: cycle, displayPrice: '£9.99', offerTokenAndroid: `fixture-offer-${id}` }],
    };
  });
  const iosProducts = [{ id: appleSku, platform: 'ios', type: 'subs', displayPrice: '£9.99' }];
  const iap = {
    initConnection: async () => true, endConnection: async () => {}, getStorefront: async () => 'GB',
    fetchProducts: async ({ skus }) => (model.provider === 'google' ? products : iosProducts).filter((p) => skus.includes(p.id)),
    getAvailablePurchases: async (opts) => {
      calls.availableOptions.push(opts);
      return model.owned.filter((p) => !p.isSuspendedAndroid || opts?.includeSuspendedAndroid);
    },
    finishTransaction: async (input) => { calls.finishes.push(input); },
    requestPurchase: async (input) => { calls.requests.push(input); },
    purchaseUpdatedListener: (callback) => {
      purchaseListener = callback;
      return { remove() { if (purchaseListener === callback) purchaseListener = null; } };
    },
    purchaseErrorListener: (callback) => {
      errorListener = callback;
      return { remove() { if (errorListener === callback) errorListener = null; } };
    },
  };
  const google = loadSource('src/billing/adapters/google.ts', {
    'expo-iap': iap,
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') },
  });
  const apple = loadSource('src/billing/adapters/apple.ts', { 'expo-iap': iap });
  const adapter = model.provider === 'google' ? google.googleBillingAdapter : apple.appleBillingAdapter;
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: model.authSequence.length ? model.authSequence.shift() : model.authUser } }),
      getSession: async () => ({ data: { session: model.authUser ? { user: model.authUser, access_token: 'fixture-only-session' } : null } }),
    },
    from(table) {
      const filters = {};
      const query = {
        select(columns) { filters.columns = columns; return query; },
        eq(key, value) { filters[key] = value; return query; },
        async maybeSingle() {
          assert.equal(table, 'user_subscriptions');
          calls.entitlementReads.push({ ...filters });
          if (model.deferredEntitlement) return model.deferredEntitlement;
          return { data: model.row, error: model.queryError };
        },
        then(resolve, reject) {
          assert.ok(['platform_pricing_config', 'store_commerce_products'].includes(table));
          const data = table === 'platform_pricing_config' ? [] : products.map((p) => ({
            product_id: p.id, base_plan_id: p.subscriptionOffers[0].basePlanIdAndroid, offer_id: null,
          }));
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
    functions: { invoke: async (name, input) => {
      calls.verifications.push({ name, ...input });
      return { data: model.verification, error: model.verificationError };
    } },
  };
  const hook = loadSource('src/hooks/usePlatformSubscription.ts', {
    react: lifecycle.react,
    '../billing': { ...storeTypes, ...google },
    '../billing/platformPlanProducts': productHelpers,
    '../context/StoreKitProvider': { useStoreKit: () => ({ adapter, ready: true, connectionError: null }) },
    '../lib/supabase': { supabase },
  });
  lifecycle.start(hook.usePlatformSubscription);
  await lifecycle.settle();
  return {
    model, calls, get plans() { return lifecycle.result; },
    settle: () => lifecycle.settle(), dispose: () => lifecycle.dispose(),
    async purchase(p = googlePurchase()) { assert.equal(typeof purchaseListener, 'function'); await purchaseListener(p); return lifecycle.settle(); },
    async subscribe(sku = nextGoogleSku) { await lifecycle.result.subscribe(sku); return lifecycle.settle(); },
    async restore() { await lifecycle.result.restore(); return lifecycle.settle(); },
    async storeError(error) { assert.equal(typeof errorListener, 'function'); errorListener(error); return lifecycle.settle(); },
  };
}

let cases = 0;
async function check(name, options, verify) {
  const fixture = await harness(options);
  try { await verify(fixture); cases += 1; }
  catch (error) { throw new Error(`Platform-plan hook fixture failed: ${name}`, { cause: error }); }
  finally { fixture.dispose(); }
}
const noStorePurchase = (f) => assert.equal(f.calls.requests.length, 0, 'Unsafe store purchase was requested');
const noClientAck = (f) => assert.equal(f.calls.finishes.length, 0, 'Google platform token was acknowledged by the client');

await check('server-finished active Google plan', {}, async (f) => {
  await f.purchase();
  noClientAck(f);
  assert.equal(f.plans.notice, 'Your PLUGGD plan is active.');
  assert.equal(f.calls.verifications[0].name, 'validate-google-play-purchase');
  assert.equal(f.calls.verifications[0].body.subscription_scope, 'platform');
  assert.equal(f.calls.verifications[0].body.product_id, googleSku);
});
for (const token_status of ['hold', 'paused', 'expired', 'superseded']) {
  await check(`${token_status} token with other paid effective access`, {
    row: paidRow('apple'),
    verification: googleResponse({ tier: 'pro', billing_cycle: 'comped', token_status, entitled: false, serverFinished: false }),
  }, async (f) => {
    await f.purchase(); noClientAck(f);
    assert.match(f.plans.notice, /not currently active/);
    assert.equal(f.plans.error, null);
  });
}
await check('Google grant not yet server-finished', {
  verification: googleResponse({ serverFinished: false }),
}, async (f) => {
  await f.purchase(); noClientAck(f);
  assert.match(f.plans.error, /do not buy again/);
  assert.notEqual(f.plans.notice, 'Your PLUGGD plan is active.');
});
for (const patch of [
  { product_id: nextGoogleSku }, { provider: 'apple' }, { token_tier: 'pro' },
  { token_billing_cycle: 'yearly' }, { entitled: undefined }, { finish_required: true },
]) {
  await check(`invalid Google response ${Object.keys(patch)[0]}`, { verification: googleResponse(patch) }, async (f) => {
    await f.purchase(); noClientAck(f); assert.match(f.plans.error, /valid plan verification/);
  });
}
await check('network failure must not recover from prior Google effective tier', {
  row: paidRow('google_play'), verificationError: new Error('Fixture verification unavailable'),
}, async (f) => {
  await f.purchase(); noClientAck(f); assert.match(f.plans.error, /Do not subscribe again/);
});
await check('pending purchase', {}, async (f) => {
  await f.purchase(googlePurchase({ purchaseState: 'pending' }));
  noClientAck(f); assert.equal(f.calls.verifications.length, 0); assert.match(f.plans.notice, /payment approval/);
});
await check('active Google restore', { owned: [googlePurchase()] }, async (f) => {
  await f.restore(); noClientAck(f); assert.match(f.plans.notice, /has been restored/);
});
await check('non-entitled Google restore does not claim restored', {
  owned: [googlePurchase()], verification: googleResponse({ entitled: false, serverFinished: false, token_status: 'hold' }),
}, async (f) => {
  await f.restore(); noClientAck(f); assert.match(f.plans.notice, /not currently active/);
});
for (const [name, owned] of [
  ['suspended', googlePurchase({ isSuspendedAndroid: true })],
  ['pending', googlePurchase({ purchaseState: 'pending' })],
]) {
  await check(`${name} Google restore reconciles truthful inactive state`, {
    owned: [owned], verification: googleResponse({ entitled: false, serverFinished: false, token_status: name === 'pending' ? 'pending' : 'hold' }),
  }, async (f) => {
    await f.restore(); noClientAck(f);
    assert.deepEqual(f.calls.availableOptions.at(-1), { includeSuspendedAndroid: true });
    assert.equal(f.calls.verifications.length, 1, 'Owned inactive token was omitted from reconciliation');
    assert.match(f.plans.notice, /not currently active/);
  });
}
for (const provider of ['apple', 'stripe']) {
  await check(`fresh ${provider} plan blocks stale free UI`, {}, async (f) => {
    f.model.row = paidRow(provider);
    const reads = f.calls.entitlementReads.length;
    await f.subscribe(); noStorePurchase(f);
    assert.ok(f.calls.entitlementReads.length > reads, 'No fresh authenticated entitlement read');
    assert.match(f.plans.error, /another billing provider/);
  });
}
for (const provider of ['apple', 'stripe']) {
  await check(`admin overlay cannot hide underlying ${provider} renewal`, {}, async (f) => {
    f.model.row = paidRow('admin_grant', {
      tier: 'pro', billing_cycle: 'comped', source: 'admin_grant',
      [`${provider}_tier`]: 'starter', [`${provider}_status`]: 'active',
      [`${provider}_current_period_end`]: '2099-01-01T00:00:00Z',
      ...(provider === 'stripe' ? { stripe_subscription_id: 'fixture-stripe-subscription' } : { apple_product_id: appleSku }),
    });
    await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /another billing provider/);
  });
}
await check('admin overlay cannot hide Apple payment grace period', {}, async (f) => {
  f.model.row = paidRow('admin_grant', {
    tier: 'pro', billing_cycle: 'comped', apple_tier: 'starter', apple_status: 'past_due',
    apple_current_period_end: '2000-01-01T00:00:00Z', apple_grace_period_end: '2099-01-01T00:00:00Z',
  });
  await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /another billing provider/);
});
await check('higher Google purchase cannot overwrite a lower active admin grant', {}, async (f) => {
  f.model.row = paidRow('admin_grant', {
    tier: 'starter', source: 'admin_grant', billing_cycle: 'comped', current_period_end: '2099-01-01T00:00:00Z',
  });
  await f.subscribe(); noStorePurchase(f);
  assert.ok(f.plans.error, 'Missing explanation for the protected admin grant');
});
await check('equal Google purchase cannot overwrite a permanent admin grant', {}, async (f) => {
  f.model.row = paidRow('admin_grant', {
    tier: 'starter', source: 'admin_grant', billing_cycle: 'comped', current_period_end: null,
  });
  await f.subscribe(googleSku); noStorePurchase(f);
  assert.match(f.plans.error, /complimentary PLUGGD access/);
});
await check('fresh entitlement read failure', {}, async (f) => {
  f.model.queryError = new Error('Fixture current plan lookup failed');
  await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /lookup failed/);
});
await check('already failed entitlement blocks purchase', { queryError: new Error('Fixture access lookup failed') }, async (f) => {
  await f.subscribe(); noStorePurchase(f); assert.equal(f.plans.purchaseBlocked, true);
});
await check('pending entitlement load blocks purchase', { deferredEntitlement: new Promise(() => {}) }, async (f) => {
  assert.equal(f.plans.loading, true);
  await f.subscribe(); noStorePurchase(f); assert.equal(f.plans.purchaseBlocked, true);
});
await check('account changed between authenticated reads', {}, async (f) => {
  f.model.authSequence = [account, { id: 'different-fixture-account' }];
  await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /account changed/);
});
await check('signed out between authenticated reads', {}, async (f) => {
  f.model.authSequence = [account, null];
  await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /account changed|Sign in/i);
});
await check('first Google plan uses actual selected base-plan offer', {}, async (f) => {
  await f.subscribe();
  assert.equal(f.calls.requests.length, 1);
  const request = f.calls.requests[0];
  assert.equal(request.type, 'subs');
  assert.deepEqual(request.request.google.subscriptionOffers, [{ sku: nextGoogleSku, offerToken: `fixture-offer-${nextGoogleSku}` }]);
  assert.equal(request.request.google.obfuscatedAccountId, accountHash);
  assert.notEqual(request.request.google.obfuscatedAccountId, account.id);
  assert.equal(request.request.google.purchaseToken, undefined);
  assert.equal(request.request.google.subscriptionProductReplacementParams, undefined);
});
for (const billing_provider of ['google_play', 'admin_grant']) {
  await check(`${billing_provider} promo overlay replaces actual owned Google product`, {
    row: paidRow(billing_provider, { tier: 'pro', source: billing_provider === 'admin_grant' ? 'admin_grant' : 'combined', billing_cycle: 'comped', provider_product_id: googleSku }), owned: [googlePurchase()],
  }, async (f) => {
    await f.subscribe(); assert.equal(f.calls.requests.length, 1);
    const request = f.calls.requests[0].request.google;
    assert.equal(request.purchaseToken, 'fixture-only-google-token');
    assert.deepEqual(request.subscriptionProductReplacementParams, { oldProductId: googleSku, replacementMode: 'with-time-proration' });
    assert.deepEqual(f.calls.availableOptions.at(-1), { includeSuspendedAndroid: true });
  });
}
for (const [name, purchase] of [
  ['pending', googlePurchase({ purchaseState: 'pending' })],
  ['unknown', googlePurchase({ purchaseState: 'unknown' })],
  ['suspended', googlePurchase({ isSuspendedAndroid: true })],
  ['pending replacement', googlePurchase({ pendingPurchaseUpdateAndroid: { purchaseToken: 'fixture-pending-token', products: [nextGoogleSku] } })],
]) {
  await check(`${name} owned Google plan must fail closed`, { owned: [purchase] }, async (f) => {
    await f.subscribe(); noStorePurchase(f);
    assert.deepEqual(f.calls.availableOptions.at(-1), { includeSuspendedAndroid: true });
    assert.match(f.plans.error, /payment approval|needs attention|pending|waiting/i);
  });
}
await check('multiple owned tokens even for same product', {
  row: paidRow('google_play'), owned: [googlePurchase(), googlePurchase({ purchaseToken: 'fixture-other-token' })],
}, async (f) => { await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /More than one/); });
await check('current Google plan without owning Play account', { row: paidRow('google_play') }, async (f) => {
  await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /account that owns/);
});
for (const identity of ['different-pluggd-account-hash', undefined]) {
  await check(`same product with ${identity ? 'wrong' : 'missing'} PLUGGD ownership`, {
    row: paidRow('google_play'), owned: [googlePurchase({ obfuscatedAccountIdAndroid: identity })],
  }, async (f) => {
    await f.subscribe(); noStorePurchase(f); assert.match(f.plans.error, /account|ownership|confirm|restore/i);
    if (identity) assert.ok(!f.plans.error.includes(identity), 'Ownership error exposed a private identifier');
  });
}
await check('already owned same Google plan', { row: paidRow('google_play'), owned: [googlePurchase()] }, async (f) => {
  await f.subscribe(googleSku); noStorePurchase(f); assert.match(f.plans.error, /already own/);
});
await check('creator membership remains separate', { owned: [googlePurchase({ productId: 'plg_m_creator_tier' })] }, async (f) => {
  await f.subscribe(); assert.equal(f.calls.requests.length, 1);
  assert.equal(f.calls.requests[0].request.google.subscriptionProductReplacementParams, undefined);
});
await check('Apple verified purchase still finishes locally', {
  provider: 'apple', row: paidRow('apple'), verification: { success: true, type: 'platform_subscription', tier: 'starter' },
}, async (f) => {
  await f.purchase(googlePurchase({ productId: appleSku, purchaseToken: 'fixture.signed.receipt' }));
  assert.equal(f.calls.finishes.length, 1);
  assert.equal(f.calls.finishes[0].isConsumable, false);
  assert.equal(f.calls.verifications[0].name, 'validate-iap-receipt');
  assert.equal(f.plans.notice, 'Your PLUGGD plan is active.');
});
await check('Apple entitlement fallback retained', { provider: 'apple', row: paidRow('apple') }, async (f) => {
  await f.purchase(googlePurchase({ productId: appleSku, purchaseToken: 'fixture-non-jws' }));
  assert.equal(f.calls.verifications.length, 0); assert.equal(f.calls.finishes.length, 1);
  assert.equal(f.plans.notice, 'Your PLUGGD plan is active.');
});
await check('Apple purchase request remains unchanged', { provider: 'apple' }, async (f) => {
  await f.subscribe(appleSku);
  assert.deepEqual(f.calls.requests, [{ request: { apple: { sku: appleSku, appAccountToken: account.id, andDangerouslyFinishTransactionAutomatically: false } }, type: 'subs' }]);
  assert.equal(f.calls.availableOptions.length, 0);
});

console.log(`Android platform-plan hook behavior: PASS (${cases} fixtures; real hook/helpers/adapters, mocked services)`);
