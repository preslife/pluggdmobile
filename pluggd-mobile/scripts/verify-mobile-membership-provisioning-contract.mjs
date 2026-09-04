import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260802160000_membership_iap_provisioning.sql');
const schedule = read('supabase/migrations/20260802170000_schedule_membership_iap_provisioner.sql');
const worker = read('supabase/functions/provision-membership-iap/index.ts');
const apple = read('supabase/functions/_shared/appStoreConnect.ts');
const config = read('supabase/config.toml');
const membership = read('pluggd-mobile/app/membership/[creatorId].tsx');
const subscriptionHook = read('pluggd-mobile/src/hooks/useSubscription.ts');

assert.match(migration, /one Apple subscription group/i, 'architecture must define one subscription group per creator');
assert.match(migration, /creator_membership_iap_catalogues/, 'creator App Store catalogues must be persisted');
assert.match(migration, /membership_iap_provisioning_jobs/, 'provisioning must use a durable queue');
assert.match(migration, /for update skip locked/i, 'workers must claim jobs safely under concurrency');
assert.match(migration, /desired_product_id[^]*unique/i, 'creator-tier product IDs must be unique');
assert.match(migration, /membership_tier_id[\s\S]*billing_period[\s\S]*unique/i, 'tier-period provisioning must be idempotent');
assert.match(migration, /is_verified[\s\S]*verification_status[\s\S]*approved/i, 'only verified approved creators may be provisioned');
assert.match(migration, /trg_sync_verified_creator_membership_iap/, 'creator approval must automatically queue eligible membership tiers');
assert.match(migration, /verification is no longer approved[\s\S]*status = 'inactive'/i, 'revoked creator verification must disable sellable membership mappings');
assert.match(migration, /revoke all on function public\.approve_creator_membership_iap[^]*authenticated/i, 'creator approval must remain service-only');
assert.match(migration, /revoke all on function public\.claim_membership_iap_provisioning_jobs[^]*authenticated/i, 'queue claiming must remain service-only');

assert.match(worker, /MEMBERSHIP_IAP_PROVISIONER_SECRET/, 'worker must require a dedicated server secret');
assert.match(apple, /ASC_PRIVATE_KEY/, 'Apple private key must come from server environment only');
assert.match(worker, /subscriptionGroups/, 'worker must create or reuse creator subscription groups');
assert.match(worker, /desired_product_id/, 'worker must use the deterministic trusted product identifier');
assert.match(worker, /subscriptionLocalizations/, 'worker must configure product localization');
assert.match(worker, /subscriptionGroupLocalizations/, 'worker must configure creator group localization');
assert.match(worker, /subscriptionPricePoints/, 'worker must resolve server-owned price points');
assert.match(worker, /subscriptionPlanAvailabilities/, 'worker must configure territory availability');
assert.match(worker, /subscriptionAppStoreReviewScreenshots/, 'worker must upload App Review evidence for every product');
assert.match(worker, /tier_order \|\| 0\) \+ 1/, 'tier order must map to Apple group levels in ascending order');
assert.match(worker, /price_monthly[\s\S]*price_yearly/, 'worker must resolve prices from the trusted tier record');
assert.doesNotMatch(worker, /payload\?\.(price|productId|creatorId|tierId)/, 'worker must not trust commerce identity or amount from the request body');

assert.match(apple, /SignJWT/, 'App Store Connect requests must use signed short-lived JWTs');
assert.match(apple, /ES256/, 'App Store Connect JWTs must use ES256');
assert.match(apple, /\[429, 500, 502, 503, 504\]/, 'Apple requests must retry transient failures');
assert.doesNotMatch(apple, /PRIVATE KEY-----/, 'no Apple private key may be committed');
assert.match(config, /\[functions\.provision-membership-iap\][\s\S]*verify_jwt = false/, 'cron worker must rely on its dedicated secret gate');
assert.match(schedule, /status = 'awaiting_review'/, 'review-pending products must be reconciled after Apple approval');
assert.match(schedule, /vault\.decrypted_secrets/, 'cron must read its worker credential from encrypted Vault storage');
assert.match(schedule, /cron\.schedule[\s\S]*membership-iap-provisioner/, 'membership provisioning must run automatically');
assert.match(schedule, /revoke all on function public\.invoke_membership_iap_provisioner[^]*authenticated/i, 'the scheduled invoker must not be callable by app users');

assert.match(membership, /storeProduct\?\.provisioned/, 'join CTA must remain hidden until the active store resolves the creator-tier product');
assert.match(membership, /router\.canGoBack\(\)[\s\S]*router\.replace\(`\/creator\//, 'membership Back must have a safe creator-profile fallback');
assert.match(membership, /hero: \{ height: 220/, 'membership hero must not bury the first tier below an empty 330pt masthead');
assert.match(subscriptionHook, /\.eq\('status', 'active'\)/, 'mobile catalogue must expose only active products');
assert.match(subscriptionHook, /recoverServerVerifiedMembership/, 'subscriptions must recover from server verification when the store callback is incomplete');
assert.match(subscriptionHook, /\.eq\('fan_id', session\.user\.id\)[\s\S]*billing\.provider === 'apple'[\s\S]*\.eq\('apple_sku', purchase\.productId\)[\s\S]*google_play_product_id/, 'membership recovery must be scoped to the signed-in fan and provider-specific creator-tier SKU');
assert.doesNotMatch(membership, /pluggd_tier_(?:299|499|999|1999|4999)/, 'mobile must never use a shared creator membership SKU');

console.log('mobile membership provisioning contract verified');
