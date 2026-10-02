import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const source = read('src/billing/platformPlanProducts.ts');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
Function('module', 'exports', compiled)(module, module.exports);
const { GOOGLE_PLATFORM_PLAN_SKUS, googlePlatformPlan, googlePlanReplacement, hasNonGooglePlatformSubscription, validateGooglePlatformPlanResponse } = module.exports;
assert.equal(GOOGLE_PLATFORM_PLAN_SKUS.length, 6);
assert.equal(new Set(GOOGLE_PLATFORM_PLAN_SKUS).size, 6);
for (const tier of ['starter', 'creator', 'pro']) for (const billingCycle of ['monthly', 'yearly']) {
  assert.deepEqual(googlePlatformPlan(`plg_plan_${tier}_${billingCycle}`), { tier, billingCycle });
}
assert.equal(googlePlatformPlan('plg_m_creator_tier'), null);
const expectedAccountId = 'a'.repeat(64);
const replace = (current, target, purchases) => googlePlanReplacement(current, target, purchases, expectedAccountId);
assert.equal(replace(null, 'plg_plan_starter_monthly', []), null);
const owned = { productId: 'plg_plan_starter_monthly', purchaseState: 'purchased', purchaseToken: 'test-only-token', obfuscatedAccountIdAndroid: expectedAccountId };
assert.deepEqual(replace(owned.productId, 'plg_plan_creator_yearly', [owned]), {
  oldProductId: owned.productId, purchaseToken: owned.purchaseToken, replacementMode: 'with-time-proration',
});
assert.throws(() => replace(null, 'plg_plan_creator_yearly', [owned]), /Restore your existing/);
assert.throws(() => replace(owned.productId, owned.productId, [owned]), /already own/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', []), /account that owns/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [{ ...owned, purchaseToken: null }]), /could not be confirmed/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [{ ...owned, purchaseState: 'pending' }]), /payment approval/);
assert.throws(() => replace(null, 'plg_plan_creator_yearly', [{ ...owned, purchaseState: 'pending' }]), /payment approval/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [{ ...owned, pendingPurchaseUpdateAndroid: { productId: 'plg_plan_pro_yearly' } }]), /payment approval/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [{ ...owned, obfuscatedAccountIdAndroid: 'b'.repeat(64) }]), /owning account/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [{ ...owned, obfuscatedAccountIdAndroid: null }]), /owning account/);
assert.throws(() => googlePlanReplacement(null, 'plg_plan_creator_yearly', [], ''), /unconfirmed PLUGGD account/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [{ ...owned, purchaseState: 'unknown' }]), /needs attention/);
assert.throws(() => replace(null, 'plg_plan_creator_yearly', [{ ...owned, purchaseState: 'unknown' }]), /needs attention/);
assert.throws(() => replace(null, 'plg_plan_creator_yearly', [{ ...owned, purchaseState: undefined }]), /needs attention/);
assert.throws(() => replace(null, 'plg_plan_creator_yearly', [{ ...owned, isSuspendedAndroid: true }]), /needs attention/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [owned, { ...owned, productId: 'plg_plan_pro_yearly' }]), /More than one/);
assert.throws(() => replace(owned.productId, 'plg_plan_creator_yearly', [owned, { ...owned, purchaseToken: 'other-test-only-token' }]), /More than one/);
assert.throws(() => replace(null, 'not-a-plan', []), /not supported/);
assert.equal(replace(null, 'plg_plan_starter_monthly', [{ ...owned, productId: 'plg_m_creator_tier' }]), null);
const verified = {
  success: true, type: 'platform_subscription', provider: 'google_play',
  product_id: owned.productId, token_tier: 'starter', token_billing_cycle: 'monthly',
  tier: 'pro', billing_cycle: 'comped', entitled: true, serverFinished: true, finish_required: false,
};
assert.deepEqual(validateGooglePlatformPlanResponse(owned.productId, verified), { finishRequired: false, entitlementActive: true });
for (const state of ['hold', 'paused', 'pending', 'expired', 'replaced']) {
  assert.deepEqual(validateGooglePlatformPlanResponse(owned.productId, { ...verified, token_status: state, entitled: false, serverFinished: false }), { finishRequired: false, entitlementActive: false });
}
assert.deepEqual(validateGooglePlatformPlanResponse(owned.productId, { ...verified, tier: 'free', entitled: false }), { finishRequired: false, entitlementActive: false });
assert.throws(() => validateGooglePlatformPlanResponse(owned.productId, { ...verified, entitled: true, serverFinished: false }), /still syncing/);
for (const mutation of [{ provider: 'apple' }, { product_id: 'plg_plan_creator_yearly' }, { token_tier: 'pro' }, { token_billing_cycle: 'yearly' }, { finish_required: true }, { entitled: undefined }, { serverFinished: undefined }, { success: false }]) {
  assert.throws(() => validateGooglePlatformPlanResponse(owned.productId, { ...verified, ...mutation }), /valid plan verification/);
}
assert.throws(() => validateGooglePlatformPlanResponse(owned.productId, null), /valid plan verification/);
const now = Date.parse('2026-10-02T12:00:00Z');
assert.equal(hasNonGooglePlatformSubscription({ stripe_tier: 'starter', stripe_status: 'active', stripe_current_period_end: '2026-11-02T12:00:00Z', billing_provider: 'admin_grant' }, now), true);
assert.equal(hasNonGooglePlatformSubscription({ apple_tier: 'starter', apple_status: 'past_due', apple_current_period_end: '2026-10-01T12:00:00Z', apple_grace_period_end: '2026-10-03T12:00:00Z' }, now), true);
assert.equal(hasNonGooglePlatformSubscription({ stripe_tier: 'pro', stripe_status: 'cancelled', stripe_current_period_end: '2026-10-01T12:00:00Z' }, now), false);
assert.equal(hasNonGooglePlatformSubscription({ stripe_subscription_id: 'test-only-subscription', stripe_status: 'incomplete' }, now), true);
assert.equal(hasNonGooglePlatformSubscription({ apple_tier: 'creator', apple_status: 'active', apple_current_period_end: 'invalid' }, now), true);
assert.equal(hasNonGooglePlatformSubscription({ tier: 'pro', billing_provider: 'access_code' }, now), false);
const hook = read('src/hooks/usePlatformSubscription.ts');
assert.match(hook, /purchase_kind', 'platform_subscription'/);
assert.match(hook, /subscription_scope: 'platform'/);
assert.match(hook, /response\.serverFinished !== true/);
assert.match(hook, /if \(isGoogle\) return validateGooglePlatformPlanResponse\(purchase\.productId, response\)/);
assert.match(hook, /if \(result\.entitlementActive\) activePurchases \+= 1/);
assert.match(hook, /googlePlanReplacement\(currentGoogleSku, sku, await adapter\.getAvailablePurchases\(\{ includeSuspendedAndroid: true \}\), googleIdentifiers!\.obfuscatedAccountId\)/);
assert.match(hook, /await loadPlatformPlanEntitlement\(user\.id\)/);
assert.match(hook, /entitlementState\.loading \|\| entitlementState\.error/);
assert.match(hook, /const currentGoogleSku = googlePlatformPlan\(entitlement\.providerProductId \?\? ''\) \? entitlement\.providerProductId : null/);
assert.match(hook, /isGoogle \? null : await recoverEntitlement/);
assert.doesNotMatch(hook, /adapter\.provider !== 'apple'/);
const adapter = read('src/billing/adapters/google.ts');
assert.match(adapter, /subscriptionProductReplacementParams/);
assert.match(adapter, /purchaseToken: input\.googleReplacement\.purchaseToken/);
const screen = read('app/plans.tsx');
assert.match(screen, /plans\.priceForProduct/);
assert.match(screen, /plans\.accountName/);
assert.match(screen, /billingProvider === 'google_play'/);
assert.match(screen, /plans\.hasOtherPaidProvider/);
console.log('Android platform plans and safe replacement: PASS');
