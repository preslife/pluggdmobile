import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(mobileRoot, '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const catalogue = read('supabase/functions/_shared/applePlatformPlans.ts');
const verifier = read('supabase/functions/validate-iap-receipt/index.ts');
const notification = read('supabase/functions/apple-server-notification/index.ts');
const sharedEntitlement = read('supabase/functions/check-subscription/index.ts');
const stripeWebhook = read('supabase/functions/stripe-webhook/index.ts');
const migration = read('supabase/migrations/20260828133000_pluggd_platform_plans_apple.sql');
const hook = read('pluggd-mobile/src/hooks/usePlatformSubscription.ts');
const screen = read('pluggd-mobile/app/plans.tsx');
const accountMenu = read('pluggd-mobile/components/AccountMenuButton.tsx');
const studio = read('pluggd-mobile/src/features/studio/StudioScreens.tsx');
const creatorMembership = read('pluggd-mobile/app/membership/index.tsx');

for (const sku of [
  'com.pluggd.mobile.plan.starter.monthly',
  'com.pluggd.mobile.plan.starter.yearly',
  'com.pluggd.mobile.plan.creator.monthly',
  'com.pluggd.mobile.plan.creator.yearly',
  'com.pluggd.mobile.plan.pro.monthly',
  'com.pluggd.mobile.plan.pro.yearly.v2',
]) {
  assert.match(catalogue, new RegExp(sku), `trusted server catalogue is missing ${sku}`);
  assert.match(hook, new RegExp(sku), `native product catalogue is missing ${sku}`);
}

assert.match(migration, /billing_provider/);
assert.match(migration, /apple_original_transaction_id/);
assert.match(migration, /user_subscriptions_apple_original_tx_unique/);
assert.match(migration, /platform_subscription_products/);
assert.match(migration, /revoke insert, update, delete, truncate on public\.user_subscriptions/);
assert.match(migration, /when 'starter' then 1/);
assert.match(migration, /commission_rate = v_commission/);
assert.match(migration, /product_kind in \('credits', 'fan_membership', 'platform_subscription'\)/);
assert.match(verifier, /type:\s*"platform_subscription"/);
assert.match(verifier, /platform_sync_apple_subscription/);
assert.match(verifier, /\.from\("fan_subscriptions"\)/, 'creator membership verification must remain separate');
assert.match(notification, /reconcilePlatformPlan/);
assert.match(notification, /platform_sync_apple_subscription/);
assert.match(sharedEntitlement, /platform_subscription_products/);
assert.doesNotMatch(sharedEntitlement, /unit_amount|amount <=|amount >/i, 'Stripe tier must not be inferred from price amount');
assert.match(stripeWebhook, /platform_subscription_products/);
assert.match(stripeWebhook, /platform_sync_stripe_subscription/);
assert.match(hook, /Private collaboration tools/);
assert.match(hook, /Everything in Creator/);
assert.match(hook, /Full analytics & exports/);
assert.doesNotMatch(hook, /Streaming payout pool|Advanced AI studio|Content ID protection|White-label storefront|Sub-accounts/);
assert.doesNotMatch(migration, /Streaming payout pool|Advanced AI studio|Content ID protection|White-label storefront|Sub-accounts/);

assert.match(screen, /PLUGGD Plans power your creator tools/);
assert.match(screen, /Creator memberships are separate/);
assert.match(screen, /Restore purchases/);
assert.match(screen, /PurchaseLegalLinks/);
assert.match(screen, /monthly or yearly period/);
assert.match(screen, /SAVE ~2 MONTHS/);
assert.match(screen, /billingOptionSlot: \{ flex: 1, minWidth: 0 \}/, 'billing selector must use two equal flex slots');
assert.match(screen, /billingOption: \{ width: '100%', flex: 1/, 'each billing option must fill and centre inside its slot');
assert.match(screen, /Continue on Free/);
assert.doesNotMatch(screen, /£\d/, 'paid plan prices must come from the App Store product');
assert.doesNotMatch(screen, /stripe\.com|checkout|https:\/\//i, 'the native plan screen must not offer web checkout');
assert.match(accountMenu, /label: 'PLUGGD Plans'/);
assert.match(accountMenu, /label: 'Creator memberships'/);
assert.match(studio, /function PlatformPlanCard/);
assert.match(studio, /<PlatformPlanCard \/>/);
assert.match(creatorMembership, /Memberships renew for the period and price shown/);

console.log('PLUGGD platform plans contract: PASS');
