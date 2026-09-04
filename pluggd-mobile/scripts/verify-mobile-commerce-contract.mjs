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
const eventBoard = read('src/features/editorial/EventsBoardScreen.tsx');
const eventDiscoveryData = read('src/features/events/eventDiscoveryData.ts');
const externalEventTickets = read('src/lib/eventTickets.ts');
const release = read('app/release/[id].tsx');
const releaseFloor = read('src/features/editorial/ListeningFloorScreen.tsx');
const home = read('src/features/home/live-music-dashboard-home.tsx');
const mobileContent = read('src/lib/mobileContent.ts');
const membership = read('app/membership/[creatorId].tsx');
const subscriptions = read('src/hooks/useSubscription.ts');
const store = read('src/features/editorial/MarketStoreScreen.tsx');
const product = read('app/product/[id].tsx');
const mobileServices = read('src/features/culture/mobileServices.ts');
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
  'google_play_iap',
  'google_play_subscription',
  'google_play_billing',
  'credits',
  'stripe_physical',
  'external_web_checkout',
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
assert.match(
  migrationSource,
  /revoke\s+all\s+on\s+table\s+public\.membership_iap_products\s+from\s+public/i,
  'the membership catalogue must not inherit public table access',
);
assert.match(
  migrationSource,
  /revoke\s+all\s+on\s+table\s+public\.membership_iap_products\s+from\s+anon/i,
  'anonymous users must not read the membership product catalogue',
);
assert.match(
  migrationSource,
  /grant\s+select\s+on\s+table\s+public\.membership_iap_products\s+to\s+authenticated/i,
  'authenticated users need explicit read access before the active-product RLS policy can apply',
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

assert.match(
  store,
  /\.in\('product_type', \['physical', 'merchandise', 'merch', 'creator_merch'\]\)/,
  'iOS Store must include every checkout-supported physical merchandise type while excluding digital products',
);
assert.match(
  store,
  /\.eq\('requires_shipping', true\)/,
  'creator merchandise must be explicitly classified for shipping before appearing in the iOS Store',
);
assert.doesNotMatch(store, /Shop all/, 'iOS Store must not route a generic purchase CTA into BeatPlug');
assert.match(
  product,
  /product\.requires_shipping === true/,
  'creator merchandise checkout must fail closed unless physical shipping is explicit',
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
assert.match(
  beatLicence,
  /if \(creditRailAllowed\)[\s\S]*complete-beat-credit-license[\s\S]*commercePlatform:\s*'android'[\s\S]*storefront:\s*policy\.storefront[\s\S]*return;[\s\S]*create-beat-purchase/,
  'Android beat licences must complete with signed-contract credits and return before the hosted path',
);
assert.doesNotMatch(
  beatLicence,
  /spendCredits\s*\(/,
  'beat licences must use the server-authoritative completion function, not a generic wallet debit',
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
assert.match(externalEventTickets, /classification === 'physical'[\s\S]*classification === 'unclassified'[\s\S]*classification == null/, 'organiser ticket links must support physical and legacy-unclassified real-world event rows');
assert.match(externalEventTickets, /realWorldTicket[\s\S]*!event\.stream_url[\s\S]*!event\.playback_url/, 'organiser ticket links must reject virtual playback and stream access');
assert.match(externalEventTickets, /url\.protocol !== 'https:'/, 'organiser ticket links must require HTTPS');
assert.match(externalEventTickets, /!event\.stream_url[\s\S]*!event\.playback_url/, 'paid virtual access must never use organiser ticket links');
assert.match(externalEventTickets, /WebBrowser\.openBrowserAsync/, 'eligible organiser ticket links must open in a secure in-app browser');
assert.match(eventDiscoveryData, /ticket_url,commerce_classification/, 'the shared Events discovery layer must load ticket URLs and trusted classification');
assert.match(eventBoard, /openExternalEventTickets/, 'Events discovery must provide a working organiser-ticket CTA');
assert.match(event, /ExternalTicketAccess/, 'event detail must explain and open eligible organiser tickets');
assert.match(event, /EventTicketPurchase/, 'event detail must retain PLUGGD-hosted ticket-tier checkout');

assert.match(release, /spendCredits[\s\S]*spend_unlock/, 'release unlock must keep the universal credit path');
assert.match(release, /useCommercePolicy/, 'optional release hosted checkout must be storefront and policy gated');
assert.match(release, /creditsNeeded[\s\S]*credits/, 'release detail must present its normal unlock price in credits');
assert.match(release, /download-signed-url/, 'owned release downloads must use the signed delivery service');
assert.doesNotMatch(release, /\.from\('releases'\)[\s\S]{0,120}\.select\('\*'\)/, 'public release detail must not select private download fields');
assert.match(releaseFloor, /credits_price/, 'release discovery must load the server credit price');
assert.match(releaseFloor, /credits`/, 'release discovery must label normal prices as credits');
assert.doesNotMatch(releaseFloor, /formatGBP/, 'normal release discovery prices must not be raw GBP');
assert.match(home, /release\.credits_price[\s\S]*credits/, 'Home release cards must present digital release pricing in credits');
assert.doesNotMatch(
  home.match(/const releases = bundle\.releases[\s\S]*?const beats =/)?.[0] ?? '',
  /formatGBP/,
  'Home release cards must not present a GBP digital unlock price',
);
assert.doesNotMatch(mobileContent.match(/RELEASE_LIST_SELECT =[\s\S]*?;/)?.[0] ?? '', /download_url/, 'public release lists must not expose private downloads');
assert.doesNotMatch(mobileContent.match(/CREATOR_RELEASE_LIST_SELECT =[\s\S]*?;/)?.[0] ?? '', /download_url/, 'creator release lists must not expose private downloads');

assert.match(
  subscriptions,
  /membership_iap_products/,
  'provider-neutral membership billing must preserve unique creator-tier Apple catalogue mappings',
);
assert.match(
  subscriptions,
  /store_commerce_products/,
  'provider-neutral membership billing must load verified Google Play product/base-plan mappings',
);
assert.doesNotMatch(
  membership,
  /pluggd_tier_(?:299|499|999|1999|4999)/,
  'membership UI must not use shared price-point SKUs as creator identity',
);
assert.match(
  membership,
  /\.or\(`id\.eq\.\$\{creatorId\},user_id\.eq\.\$\{creatorId\}`\)/,
  'membership routes must resolve both public profile IDs and creator account IDs',
);
assert.match(
  membership,
  /useSubscription\(\{\s*creatorId:\s*creatorUserId/,
  'store catalogue lookup must use the resolved creator account ID',
);
assert.match(
  mobileServices,
  /loadCreatorMemberships\(profileId:[\s\S]*from\('membership_tiers'\)[\s\S]*\.eq\('owner_type', 'profile'\)[\s\S]*\.eq\('owner_id', profileId\)/,
  'creator membership discovery must query the canonical membership tier owner columns',
);
assert.match(
  mobileServices,
  /loadCreatorMemberships\(profileId, ownerId, viewerId\)/,
  'creator profile membership discovery must separate profile ownership from the creator account purchase route and viewer state',
);

const releaseDetail = read('app/release/[id].tsx');
assert.match(
  releaseDetail,
  /const canUnlock = !isOwned && creditsNeeded > 0 && hasCreatorSuppliedAudio/,
  'release unlocks must require real creator-supplied audio',
);
assert.match(
  releaseDetail,
  /const hasCreatorSuppliedAudio = !catalogueReference/,
  'catalogue reference pages must never present a paid audio unlock',
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
