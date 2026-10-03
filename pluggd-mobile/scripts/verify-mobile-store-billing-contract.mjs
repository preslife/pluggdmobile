import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const provider = read('src/context/StoreBillingProvider.tsx');
const compatibilityProvider = read('src/context/StoreKitProvider.tsx');
const types = read('src/billing/types.ts');
const apple = read('src/billing/adapters/apple.ts');
const google = read('src/billing/adapters/google.ts');
const policy = read('src/commerce/policy.ts');
const credits = read('src/hooks/useCredits.ts');
const memberships = read('src/hooks/useSubscription.ts');
const membershipScreen = read('app/membership/[creatorId].tsx');

assert.equal(packageJson.dependencies['expo-iap'], '5.0.1', 'expo-iap must be exactly pinned so the embedded Play Billing version cannot drift');
assert.equal(packageJson.dependencies['react-native-iap'], undefined, 'the Billing Library 7 react-native-iap client must be removed');

assert.match(provider, /getStoreBillingAdapter\(Platform\.OS\)/, 'one root provider must select the native store adapter');
assert.match(provider, /adapter\s*\.\s*connect\(\)/, 'one root provider must own the billing connection');
assert.match(provider, /adapter\.disconnect\(\)/, 'the root provider must release the billing connection');
assert.match(compatibilityProvider, /StoreBillingProvider as StoreKitProvider/, 'submitted iOS provider wiring must remain compatible');

for (const rail of ['apple_iap', 'apple_subscription', 'google_play_iap', 'google_play_subscription']) {
  assert.match(types + policy, new RegExp(`['"]${rail}['"]`), `billing contracts must include ${rail}`);
}

assert.match(apple, /apple:\s*\{[\s\S]*sku[\s\S]*appAccountToken:\s*accountId/, 'iOS requests must preserve the StoreKit app account token');
assert.match(apple, /receipt_data:\s*purchase\.purchaseToken/, 'expo-iap StoreKit 2 JWS must use the unified purchase token');
assert.match(apple, /validate-iap-receipt/, 'iOS must retain its existing server verifier');
assert.match(google, /CryptoDigestAlgorithm\.SHA256[\s\S]*`pluggd:\$\{accountId\}`[\s\S]*\.toLowerCase\(\)/, 'Play account binding must remain lowercase SHA-256 of pluggd:user-id');

function loadGoogleAdapter() {
  const compiled = ts.transpileModule(google, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const calls = { requests: [] };
  const imports = {
    'expo-iap': {
      endConnection: async () => true,
      fetchProducts: async () => [],
      finishTransaction: async () => {},
      getAvailablePurchases: async () => [],
      getStorefront: async () => 'GB',
      initConnection: async () => true,
      purchaseErrorListener: () => ({ remove() {} }),
      purchaseUpdatedListener: () => ({ remove() {} }),
      requestPurchase: async (request) => { calls.requests.push(request); },
    },
    'expo-crypto': {
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      digestStringAsync: async (algorithm, value) => {
        assert.equal(algorithm, 'SHA-256', 'Play account binding must use SHA-256');
        return createHash('sha256').update(value).digest('hex');
      },
    },
  };
  const requireMock = (id) => {
    assert.ok(Object.hasOwn(imports, id), `Unexpected external import ${id} in Google adapter`);
    return imports[id];
  };
  const module = { exports: {} };
  Function('module', 'exports', 'require', compiled)(module, module.exports, requireMock);
  return { adapter: module.exports.googleBillingAdapter, calls };
}

const { adapter: googleAdapter, calls: googleCalls } = loadGoogleAdapter();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const accountId = 'billing-contract-account';
const profileId = 'billing-contract-profile';
await googleAdapter.requestProduct({ sku: 'credits.1050', accountId, profileId });
assert.deepEqual(googleCalls.requests[0], {
  request: { google: {
    skus: ['credits.1050'],
    obfuscatedAccountId: hash(`pluggd:${accountId}`),
    obfuscatedProfileId: hash(`pluggd-profile:${profileId}`),
  } },
  type: 'in-app',
}, 'Play one-time purchases must preserve SKU-array shape, type, and exact account digests');
await googleAdapter.requestProduct({ sku: 'credits.6000', accountId });
assert.deepEqual(googleCalls.requests[1], {
  request: { google: {
    skus: ['credits.6000'],
    obfuscatedAccountId: hash(`pluggd:${accountId}`),
    obfuscatedProfileId: hash(`pluggd-profile:${accountId}`),
  } },
  type: 'in-app',
}, 'Play profile binding must fall back to the authenticated account when no profile is selected');

const subscriptionProduct = {
  id: 'plg_plan_creator_monthly',
  platform: 'android',
  type: 'subs',
  subscriptionOffers: [
    { id: 'monthly-intro', basePlanIdAndroid: 'yearly', offerTokenAndroid: 'wrong-base-decoy-token' },
    { id: 'monthly', basePlanIdAndroid: 'monthly', offerTokenAndroid: 'exact-base-token' },
    { id: 'monthly-intro', basePlanIdAndroid: 'monthly', offerTokenAndroid: 'exact-offer-token' },
  ],
};
const replacement = {
  purchaseToken: 'previous-purchase-token',
  oldProductId: 'plg_plan_starter_monthly',
  replacementMode: 'with-time-proration',
};
await googleAdapter.requestSubscription({
  sku: subscriptionProduct.id,
  accountId,
  profileId,
  product: subscriptionProduct,
  basePlanId: 'monthly',
  offerId: 'monthly-intro',
  googleReplacement: replacement,
});
assert.deepEqual(googleCalls.requests[2], {
  request: { google: {
    skus: [subscriptionProduct.id],
    obfuscatedAccountId: hash(`pluggd:${accountId}`),
    obfuscatedProfileId: hash(`pluggd-profile:${profileId}`),
    subscriptionOffers: [{ sku: subscriptionProduct.id, offerToken: 'exact-offer-token' }],
    purchaseToken: replacement.purchaseToken,
    subscriptionProductReplacementParams: {
      oldProductId: replacement.oldProductId,
      replacementMode: replacement.replacementMode,
    },
  } },
  type: 'subs',
}, 'Play subscriptions must preserve the selected offer token and replacement identifiers');
await googleAdapter.requestSubscription({
  sku: subscriptionProduct.id,
  accountId,
  profileId,
  product: subscriptionProduct,
  basePlanId: 'monthly',
});
assert.deepEqual(googleCalls.requests[3], {
  request: { google: {
    skus: [subscriptionProduct.id],
    obfuscatedAccountId: hash(`pluggd:${accountId}`),
    obfuscatedProfileId: hash(`pluggd-profile:${profileId}`),
    subscriptionOffers: [{ sku: subscriptionProduct.id, offerToken: 'exact-base-token' }],
  } },
  type: 'subs',
}, 'a subscription without an offer id must use only the exact selected base plan');
await assert.rejects(googleAdapter.requestSubscription({
  sku: subscriptionProduct.id,
  accountId,
  product: subscriptionProduct,
  basePlanId: 'not-provisioned',
}), /does not have an eligible Google Play base plan/);
await assert.rejects(googleAdapter.requestSubscription({
  sku: subscriptionProduct.id,
  accountId,
  product: subscriptionProduct,
  basePlanId: 'monthly',
  offerId: 'unprovisioned-offer',
}), /does not have an eligible Google Play base plan/);
assert.equal(googleCalls.requests.length, 4, 'unprovisioned Play plans or offers must not reach requestPurchase');

assert.match(google, /purchase_token:\s*purchase\.purchaseToken/, 'Play verification must send the purchase token, not the order ID');
assert.match(google, /validate-google-play-purchase/, 'Play purchases must use the server Play verifier');
assert.match(google, /package_name:\s*ANDROID_PACKAGE_NAME/, 'Play verification must bind the token to the Android package');

assert.match(credits, /policy\.permittedRail !== adapter\.creditRail/, 'credit checkout must enforce the active provider rail');
assert.match(memberships, /policy|subscriptionRail|adapter\.subscriptionRail/, 'membership flow must expose the active subscription rail');
assert.match(credits, /purchase\.purchaseState === 'pending'[\s\S]*return;/, 'pending credit purchases must not be consumed');
assert.match(memberships, /purchase\.purchaseState === 'pending'[\s\S]*return;/, 'pending memberships must not be acknowledged');
assert.match(credits, /const verification = await validateReceipt\(purchase\);[\s\S]*verification\.finishRequired[\s\S]*finishTransaction\(purchase, true\)/, 'credit verification must authorize consume/finish');
assert.match(memberships, /const verification = await validateReceipt\(purchase\);[\s\S]*verification\.finishRequired[\s\S]*finishTransaction\(purchase, false\)/, 'membership verification must authorize acknowledge/finish');
assert.match(credits, /response\.finish_required === true[\s\S]*response\.finish_mode !== 'consume'/, 'Play credits must consume only when the backend success contract requires it');
assert.match(memberships, /response\.finish_required === true[\s\S]*response\.finish_mode !== 'acknowledge'/, 'Play memberships must acknowledge only when the backend success contract requires it');
assert.match(memberships, /response\.purchase_kind !== 'creator_membership'[\s\S]*response\.subscription_id[\s\S]*response\.store_subscription_entitlement_id/, 'Play memberships must validate the backend entitlement envelope');
assert.match(memberships, /from\('store_commerce_products'\)[\s\S]*eq\('provider', 'google_play'\)[\s\S]*eq\('purchase_kind', 'creator_membership'\)/, 'Android memberships must load the provider-neutral Google Play catalogue');
assert.match(memberships, /basePlanId:\s*product\.basePlanId[\s\S]*offerId:\s*product\.offerId/, 'Membership purchase requests must carry the selected catalogue base plan and offer');
assert.match(membershipScreen, /productId:\s*storeProduct\.sku[\s\S]*basePlanId:\s*storeProduct\.basePlanId[\s\S]*offerId:\s*storeProduct\.offerId[\s\S]*mappingMatches/, 'Membership policy must authorize the exact selected store mapping');
assert.match(membershipScreen, /sameTier[\s\S]*sameStorePlan[\s\S]*store_base_plan_id === storeProduct\.basePlanId[\s\S]*isCurrentTier = sameTier && sameStorePlan/, 'Android current-membership state must match the exact selected base plan');
assert.match(membershipScreen, /storeName\.toUpperCase\(\)[\s\S]*SECURE BILLING/, 'Membership billing identity must use the active platform provider');
assert.match(membershipScreen, /\(\['monthly', 'yearly'\] as const\)[\s\S]*period\.toUpperCase\(\)/, 'Provisioned monthly and yearly Play base plans must be user-selectable');
assert.doesNotMatch(membershipScreen, /iOS only|Subscriptions are currently available on iOS only/, 'Android memberships must not be blocked by client copy');

console.log('mobile provider-neutral store billing contract verified');
