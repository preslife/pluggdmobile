import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

function loadGoogleAdapter(iap) {
  const compiled = ts.transpileModule(read('src/billing/adapters/google.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const imports = {
    'expo-iap': iap,
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      digestStringAsync: async (_algorithm, value) =>
        createHash('sha256').update(value).digest('hex'),
    },
  };
  const requireMock = (id) => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected external import ${id}`);
    return imports[id];
  };
  Function('module', 'exports', 'require', compiled)(module, module.exports, requireMock);
  return module.exports.googleBillingAdapter;
}

function billing(overrides = {}) {
  const calls = {
    ends: 0,
    inits: 0,
    fetchProducts: [],
    availablePurchases: [],
    storefronts: 0,
    requests: [],
    finishes: [],
  };
  const iap = {
    endConnection: async () => { calls.ends += 1; return true; },
    initConnection: async () => { calls.inits += 1; return true; },
    fetchProducts: async (input) => { calls.fetchProducts.push(input); return []; },
    getAvailablePurchases: async (options) => { calls.availablePurchases.push(options); return []; },
    getStorefront: async () => { calls.storefronts += 1; return 'GB'; },
    finishTransaction: async (input) => { calls.finishes.push(input); },
    requestPurchase: async (input) => { calls.requests.push(input); },
    purchaseErrorListener: () => ({ remove() {} }),
    purchaseUpdatedListener: () => ({ remove() {} }),
    ...overrides,
  };
  return { adapter: loadGoogleAdapter(iap), calls };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function flushMicrotasks(turns = 16) {
  for (let index = 0; index < turns; index += 1) await Promise.resolve();
}

async function waitFor(predicate, message) {
  for (let index = 0; index < 64; index += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.fail(message);
}

const disconnected = () => Object.assign(
  new Error('Billing service disconnected. Please try again.'),
  { code: 'service-disconnected' },
);
const notReady = () => new Error('Billing client not ready');
const product = { id: 'fixture-product', platform: 'android', type: 'in-app' };
let cases = 0;

async function check(name, run) {
  await run();
  cases += 1;
  console.log(`PASS ${name}`);
}

await check('a recognized not-ready read is retried once with the same catalogue request', async () => {
  const { adapter, calls } = billing({
    fetchProducts: async (input) => {
      calls.fetchProducts.push(input);
      if (calls.fetchProducts.length === 1) throw notReady();
      return [product];
    },
  });

  assert.deepEqual(await adapter.fetchProducts(['credit.standard', 'credit.premium'], 'in-app'), [product]);
  assert.deepEqual(calls.fetchProducts, [
    { skus: ['credit.standard', 'credit.premium'], type: 'in-app' },
    { skus: ['credit.standard', 'credit.premium'], type: 'in-app' },
  ]);
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
});

await check('concurrent product, ownership and storefront reads share one recovery', async () => {
  const initialFailures = deferred();
  const holdReset = deferred();
  let firstReads = 0;
  const failTogether = async (success) => {
    firstReads += 1;
    if (firstReads === 3) initialFailures.resolve();
    if (firstReads <= 3) {
      await initialFailures.promise;
      throw disconnected();
    }
    return success;
  };
  const { adapter, calls } = billing({
    endConnection: async () => { calls.ends += 1; await holdReset.promise; return true; },
    fetchProducts: async (input) => {
      calls.fetchProducts.push(input);
      return failTogether([product]);
    },
    getAvailablePurchases: async (options) => {
      calls.availablePurchases.push(options);
      return failTogether([{ productId: 'owned.fixture' }]);
    },
    getStorefront: async () => {
      calls.storefronts += 1;
      return failTogether('GB');
    },
  });

  const results = Promise.all([
    adapter.fetchProducts(['plan.monthly'], 'subs'),
    adapter.getAvailablePurchases({ includeSuspendedAndroid: true }),
    adapter.getStorefront(),
  ]);
  await waitFor(() => calls.ends === 1, 'shared reads did not start one connection reset');
  await flushMicrotasks();
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 0, 'init must wait for the in-flight reset');
  holdReset.resolve();

  assert.deepEqual(await results, [[product], [{ productId: 'owned.fixture' }], 'GB']);
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
  assert.equal(calls.fetchProducts.length, 2);
  assert.deepEqual(calls.fetchProducts[0], { skus: ['plan.monthly'], type: 'subs' });
  assert.deepEqual(calls.fetchProducts[1], calls.fetchProducts[0]);
  assert.deepEqual(calls.availablePurchases, [
    { includeSuspendedAndroid: true },
    { includeSuspendedAndroid: true },
  ]);
  assert.equal(calls.storefronts, 2);
});

await check('legacy response code and exact string not-ready errors are recognized narrowly', async () => {
  for (const failure of [
    Object.assign(new Error('legacy billing response'), { responseCode: -1 }),
    'Billing client not ready',
  ]) {
    const { adapter, calls } = billing({
      getStorefront: async () => {
        calls.storefronts += 1;
        if (calls.storefronts === 1) throw failure;
        return 'GB';
      },
    });
    assert.equal(await adapter.getStorefront(), 'GB');
    assert.equal(calls.storefronts, 2);
    assert.equal(calls.ends, 1);
    assert.equal(calls.inits, 1);
  }
});

await check('unrelated read errors do not reset or retry', async () => {
  const failure = Object.assign(new Error('Billing client not ready yet'), { code: 'query-product' });
  const { adapter, calls } = billing({
    fetchProducts: async (input) => { calls.fetchProducts.push(input); throw failure; },
  });

  await assert.rejects(adapter.fetchProducts(['missing.product'], 'in-app'), (error) => error === failure);
  assert.equal(calls.fetchProducts.length, 1);
  assert.equal(calls.ends, 0);
  assert.equal(calls.inits, 0);
});

await check('a failed retry is surfaced and is never retried a second time', async () => {
  const retryFailure = disconnected();
  const { adapter, calls } = billing({
    fetchProducts: async (input) => {
      calls.fetchProducts.push(input);
      if (calls.fetchProducts.length === 1) throw notReady();
      throw retryFailure;
    },
  });

  await assert.rejects(adapter.fetchProducts(['plan.monthly'], 'subs'), (error) => error === retryFailure);
  assert.equal(calls.fetchProducts.length, 2);
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
});

await check('a false reinitialization result does not retry the original read', async () => {
  const { adapter, calls } = billing({
    initConnection: async () => { calls.inits += 1; return false; },
    fetchProducts: async (input) => { calls.fetchProducts.push(input); throw notReady(); },
  });

  await assert.rejects(
    adapter.fetchProducts(['plan.monthly'], 'subs'),
    /Google Play billing connection recovery did not initialize/,
  );
  assert.equal(calls.fetchProducts.length, 1);
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
});

await check('a recovery initialization error is surfaced without retrying the read', async () => {
  const initFailure = new Error('native init failed');
  const { adapter, calls } = billing({
    initConnection: async () => { calls.inits += 1; throw initFailure; },
    fetchProducts: async (input) => { calls.fetchProducts.push(input); throw notReady(); },
  });

  await assert.rejects(adapter.fetchProducts(['plan.monthly'], 'subs'), (error) => error === initFailure);
  assert.equal(calls.fetchProducts.length, 1);
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
});

await check('a finish queued beside a failing read is counted before recovery can reset', async () => {
  const finishPending = deferred();
  const { adapter, calls } = billing({
    fetchProducts: async (input) => {
      calls.fetchProducts.push(input);
      if (calls.fetchProducts.length === 1) throw notReady();
      return [product];
    },
    finishTransaction: async (input) => {
      calls.finishes.push(input);
      return finishPending.promise;
    },
  });

  const read = adapter.fetchProducts(['plan.monthly'], 'subs');
  const purchase = { productId: 'plan.monthly' };
  const finish = adapter.finishTransaction(purchase, false);
  await waitFor(() => calls.finishes.length === 1, 'finish mutation did not start');
  await flushMicrotasks();
  assert.equal(calls.ends, 0, 'recovery must observe a mutation started in the same event turn');

  finishPending.resolve();
  await finish;
  assert.deepEqual(await read, [product]);
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
  assert.equal(calls.finishes.length, 1);
});

await check('recovery and subsequent finish wait for an active purchase mutation', async () => {
  const purchasePending = deferred();
  const { adapter, calls } = billing({
    requestPurchase: async (input) => { calls.requests.push(input); return purchasePending.promise; },
    fetchProducts: async (input) => {
      calls.fetchProducts.push(input);
      if (calls.fetchProducts.length === 1) throw disconnected();
      return [product];
    },
  });

  const purchase = adapter.requestProduct({ sku: 'credits.1050', accountId: 'fixture-account' });
  await waitFor(() => calls.requests.length === 1, 'purchase mutation did not start');
  const read = adapter.fetchProducts(['credits.1050'], 'in-app');
  await waitFor(() => calls.fetchProducts.length === 1, 'read did not fail while purchase was active');
  await flushMicrotasks();
  assert.equal(calls.ends, 0, 'recovery must not end a connection during a purchase promise');

  const finish = adapter.finishTransaction({ productId: 'credits.1050' }, true);
  await flushMicrotasks();
  assert.equal(calls.finishes.length, 0, 'finish must wait for the existing recovery');
  assert.equal(calls.ends, 0, 'finish must not race the active purchase');

  purchasePending.resolve({ ok: true });
  assert.deepEqual(await purchase, { ok: true });
  assert.deepEqual(await read, [product]);
  await finish;
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
  assert.equal(calls.requests.length, 1);
  assert.equal(calls.finishes.length, 1);
});

await check('explicit disconnect also waits for an active adapter mutation', async () => {
  const finishPending = deferred();
  const { adapter, calls } = billing({
    finishTransaction: async (input) => { calls.finishes.push(input); return finishPending.promise; },
  });
  const purchase = { productId: 'credits.1050' };
  const finish = adapter.finishTransaction(purchase, true);
  await waitFor(() => calls.finishes.length === 1, 'finish mutation did not start');
  const disconnect = adapter.disconnect();
  await flushMicrotasks();
  assert.equal(calls.ends, 0, 'disconnect must not end the connection during finishTransaction');

  finishPending.resolve();
  await finish;
  await disconnect;
  assert.equal(calls.ends, 1);
  assert.equal(calls.finishes.length, 1);
  assert.equal(calls.finishes[0].purchase, purchase);
});

await check('connect waits for an in-flight disconnect before reinitializing', async () => {
  const disconnectPending = deferred();
  const { adapter, calls } = billing({
    endConnection: async () => { calls.ends += 1; await disconnectPending.promise; return true; },
  });
  const disconnect = adapter.disconnect();
  await waitFor(() => calls.ends === 1, 'disconnect did not enter endConnection');
  const connect = adapter.connect();
  await flushMicrotasks();
  assert.equal(calls.inits, 0, 'connect must wait until endConnection completes');

  disconnectPending.resolve();
  await disconnect;
  assert.equal(await connect, true);
  assert.equal(calls.ends, 1);
  assert.equal(calls.inits, 1);
});

await check('purchase and finish mutations are never replayed on disconnection errors', async () => {
  const failure = disconnected();
  const { adapter, calls } = billing({
    requestPurchase: async (input) => { calls.requests.push(input); throw failure; },
    finishTransaction: async (input) => { calls.finishes.push(input); throw failure; },
  });
  const accountId = 'fixture-account';
  const profileId = 'fixture-profile';
  const hash = (value) => createHash('sha256').update(value).digest('hex');

  await assert.rejects(adapter.requestProduct({ sku: 'credits.1050', accountId, profileId }), (error) => error === failure);
  assert.deepEqual(calls.requests[0], {
    request: { google: {
      skus: ['credits.1050'],
      obfuscatedAccountId: hash(`pluggd:${accountId}`),
      obfuscatedProfileId: hash(`pluggd-profile:${profileId}`),
    } },
    type: 'in-app',
  });

  const plan = {
    id: 'plg_plan_creator_monthly',
    platform: 'android',
    type: 'subs',
    subscriptionOffers: [{
      id: 'monthly-intro',
      basePlanIdAndroid: 'monthly',
      offerTokenAndroid: 'exact-offer-token',
    }],
  };
  await assert.rejects(adapter.requestSubscription({
    sku: plan.id,
    accountId,
    profileId,
    product: plan,
    basePlanId: 'monthly',
    offerId: 'monthly-intro',
    googleReplacement: {
      purchaseToken: 'previous-purchase-token',
      oldProductId: 'plg_plan_starter_monthly',
      replacementMode: 'with-time-proration',
    },
  }), (error) => error === failure);
  assert.deepEqual(calls.requests[1], {
    request: { google: {
      skus: [plan.id],
      obfuscatedAccountId: hash(`pluggd:${accountId}`),
      obfuscatedProfileId: hash(`pluggd-profile:${profileId}`),
      subscriptionOffers: [{ sku: plan.id, offerToken: 'exact-offer-token' }],
      purchaseToken: 'previous-purchase-token',
      subscriptionProductReplacementParams: {
        oldProductId: 'plg_plan_starter_monthly',
        replacementMode: 'with-time-proration',
      },
    } },
    type: 'subs',
  });

  const purchase = { productId: 'credits.1050', purchaseToken: 'fixture-token' };
  await assert.rejects(adapter.finishTransaction(purchase, true), (error) => error === failure);
  assert.equal(calls.finishes.length, 1);
  assert.equal(calls.finishes[0].purchase, purchase);
  assert.equal(calls.finishes[0].isConsumable, true);
  assert.equal(calls.ends, 0);
  assert.equal(calls.inits, 0);
  assert.equal(calls.requests.length, 2);
});

console.log(`Google billing read recovery behavior: PASS (${cases} cases)`);
