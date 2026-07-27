import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const mobileRoot = new URL('../', import.meta.url);
const workspaceRoot = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, mobileRoot), 'utf8');

const policyPath = new URL('src/commerce/policy.ts', mobileRoot);
const backendPolicyPath = new URL('supabase/functions/resolve-commerce-policy/index.ts', workspaceRoot);
const beatPreparationPath = new URL('supabase/functions/prepare-beat-license/index.ts', workspaceRoot);
const beatCheckoutPath = new URL('supabase/functions/create-beat-purchase/index.ts', workspaceRoot);
const eventCheckoutPath = new URL('supabase/functions/create-event-checkout/index.ts', workspaceRoot);

assert.ok(existsSync(policyPath), 'canonical mobile commerce policy must exist at src/commerce/policy.ts');
assert.ok(existsSync(backendPolicyPath), 'server commerce policy function must exist at resolve-commerce-policy');
assert.ok(existsSync(beatPreparationPath), 'trusted beat preparation function must exist at prepare-beat-license');
assert.ok(existsSync(beatCheckoutPath), 'hosted beat checkout function must exist');
assert.ok(existsSync(eventCheckoutPath), 'hosted event checkout function must exist');

const policy = read('src/commerce/policy.ts');
const hostedCheckout = policy;
const credits = read('src/hooks/useCredits.ts');
const wallet = read('src/hooks/useWallet.ts');
const beat = read('app/beat/[id].tsx');
const beatLicence = read('app/commerce/license-preview.tsx');
const event = read('app/events/[id].tsx');
const release = read('app/release/[id].tsx');
const membership = read('app/membership/[creatorId].tsx');
const packageJson = JSON.parse(read('package.json'));
const adr = read('docs/PLUGGD_IOS_HYBRID_COMMERCE_ARCHITECTURE_2026-07-27.md');
const backendPolicy = readFileSync(backendPolicyPath, 'utf8');
const beatPreparation = readFileSync(beatPreparationPath, 'utf8');
const beatCheckout = readFileSync(beatCheckoutPath, 'utf8');
const eventCheckout = readFileSync(eventCheckoutPath, 'utf8');
const migrationsUrl = new URL('supabase/migrations/', workspaceRoot);
const migrationSource = readdirSync(migrationsUrl)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(new URL(name, migrationsUrl), 'utf8'))
  .join('\n');

for (const sku of [
  'pluggd_credits_starter',
  'pluggd_credits_popular',
  'pluggd_credits_value',
  'pluggd_credits_premium',
  'pluggd_credits_ultimate',
]) {
  assert.match(credits, new RegExp(sku), `approved StoreKit credit catalogue must preserve ${sku}`);
}

for (const purchaseKind of [
  'credit_pack',
  'release_unlock',
  'tip',
  'live_gift',
  'creator_membership',
  'beat_license',
  'event_ticket',
  'physical_merch',
]) {
  assert.match(policy, new RegExp(`['"]${purchaseKind}['"]`), `commerce policy must define ${purchaseKind}`);
}

for (const rail of [
  'apple_iap',
  'apple_subscription',
  'credits',
  'stripe_checkout',
  'unavailable',
]) {
  assert.match(policy, new RegExp(`['"]${rail}['"]`), `commerce policy must define ${rail}`);
}

assert.match(policy, /useCommercePolicy/, 'commerce policy module must export useCommercePolicy');
assert.match(
  policy,
  /functions\.invoke\(\s*['"]resolve-commerce-policy['"]/,
  'client policy must resolve eligibility through the server',
);
assert.match(
  policy,
  /unavailable[\s\S]*(error|catch|fallback)|(?:error|catch|fallback)[\s\S]*unavailable/i,
  'failed or unknown commerce policy must fail closed to unavailable',
);
assert.match(backendPolicy, /commerce_policy_rules/, 'server policy must use server-owned commerce rules');
assert.match(backendPolicy, /restricted|unavailable/, 'server policy must preserve a restricted/default-deny result');
for (const table of [
  'commerce_policy_rules',
  'membership_iap_products',
  'external_checkout_sessions',
]) {
  assert.match(migrationSource, new RegExp(`\\b${table}\\b`), `hybrid commerce migrations must define ${table}`);
}
assert.match(
  migrationSource,
  /membership_iap_products[\s\S]*(apple_product_id|product_id)[\s\S]*(unique|UNIQUE)/i,
  'Apple membership catalogue must enforce unique product identity',
);

assert.equal(packageJson.dependencies['@stripe/stripe-react-native'], undefined, 'native Stripe SDK must not ship');
assert.ok(packageJson.dependencies['expo-web-browser'], 'hosted checkout must use expo-web-browser');
assert.match(hostedCheckout, /openHostedCheckout/, 'hosted checkout helper must export openHostedCheckout');
assert.match(hostedCheckout, /expo-web-browser/, 'hosted checkout must use the approved in-app browser');
assert.match(hostedCheckout, /https:/, 'hosted checkout must require an HTTPS provider URL');
assert.doesNotMatch(
  hostedCheckout,
  /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET/,
  'mobile hosted-checkout code must never contain Stripe secrets',
);

assert.match(beat, /licenseOptionId/, 'beat detail must route a trusted licence-option identifier');
assert.match(beatLicence, /useCommercePolicy/, 'beat licensing must be storefront and policy gated');
assert.match(beatLicence, /prepare-beat-license/, 'beat licensing must request a server-prepared licence checkout');
assert.match(beatLicence, /licenseOptionId/, 'beat licensing must submit a trusted licence-option identifier');
assert.match(beatLicence, /contractId/, 'beat licensing must submit its verified contract identifier');
assert.match(beatLicence, /openHostedCheckout/, 'eligible professional beat licences must open hosted checkout');
assert.doesNotMatch(
  beatLicence,
  /licenseFee|price(?:Cents|Pence)\s*:/,
  'beat checkout must not submit an authoritative client price',
);
assert.doesNotMatch(
  `${beat}\n${beatLicence}`,
  /spendCredits|Open Wallet|router\.push\(\s*['"]\/wallet/,
  'professional beat licences must never spend credits',
);
assert.match(beatPreparation, /licenseOptionId/, 'beat preparation must resolve a trusted licence-option identifier');
assert.doesNotMatch(
  beatPreparation,
  /const\s*\{\s*[^}]*licenseFee|body\.licenseFee|license_fee\s*=\s*body/i,
  'beat preparation must not trust a client-provided licence fee',
);
assert.match(beatCheckout, /licenseOptionId/, 'beat checkout must accept a trusted licence-option identifier');
assert.match(beatCheckout, /contractId/, 'beat checkout must require its contract identifier');
assert.match(beatCheckout, /external_checkout_sessions/, 'beat checkout must persist an idempotent external session');
assert.doesNotMatch(
  beatCheckout,
  /const\s*\{\s*[^}]*licenseFee|body\.licenseFee|license_fee\s*=\s*body/i,
  'beat checkout must never trust a client-provided licence fee',
);

assert.match(event, /useCommercePolicy/, 'ticket checkout must be policy gated');
assert.match(event, /ticketTypeId/, 'ticket checkout must submit a trusted ticket-type identifier');
assert.match(event, /openHostedCheckout/, 'eligible real-world tickets must open hosted checkout');
assert.doesNotMatch(
  event,
  /price(?:Cents|Pence)\s*:/,
  'ticket checkout must not submit an authoritative client price',
);
assert.match(eventCheckout, /ticketTypeId/, 'event checkout must accept a trusted ticket-type identifier');
assert.match(eventCheckout, /external_checkout_sessions/, 'event checkout must persist an idempotent external session');
assert.match(eventCheckout, /physical|real.world/i, 'event checkout must enforce real-world classification');
assert.doesNotMatch(
  eventCheckout,
  /price(?:Cents|Pence)\s*=\s*(?:body|request)|const\s*\{\s*[^}]*price(?:Cents|Pence)/i,
  'event checkout must never trust a client-provided ticket price',
);

assert.match(release, /spendCredits[\s\S]*spend_unlock/, 'release unlock must keep the universal credit path');
assert.match(release, /useCommercePolicy/, 'optional release hosted checkout must be storefront and policy gated');

assert.match(
  membership,
  /membership_iap_products/,
  'membership purchase UI must load unique creator-tier Apple catalogue mappings',
);
assert.doesNotMatch(
  membership,
  /pluggd_tier_(?:299|499|999|1999|4999)/,
  'membership UI must not use shared price-point SKUs as creator identity',
);

assert.match(
  wallet,
  /functions\.invoke\(\s*['"]spend-credits['"]/,
  'wallet spending must use the entitlement-aware credit function',
);
assert.doesNotMatch(
  wallet,
  /process-credits-transaction/,
  'wallet spend must not use the old generic credit transaction function',
);

for (const required of [
  'Beat licence',
  'professional',
  'Release unlock',
  'US storefront',
  'Tip or live gift',
  'Creator membership',
  'Physical event ticket',
  'Stripe Connect',
  'fail closed',
]) {
  assert.match(adr, new RegExp(required, 'i'), `canonical commerce ADR must explain ${required}`);
}

assert.match(wallet, /Credits never expire|never expire/i, 'wallet must preserve non-expiring credit language');

console.log('mobile hybrid commerce contract verified');
