import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const policy = read('src/commerce/policy.ts');
const external = read('src/commerce/androidExternalCheckout.ts');
const wallet = read('src/hooks/useWallet.ts');
const credits = read('src/hooks/useCredits.ts');
const live = read('src/screens/LiveSessionScreen.tsx');
const licence = read('app/commerce/license-preview.tsx');

for (const field of [
  'platform',
  'market',
  'purchaseKind',
  'allowedChoices',
  'productMapping',
  'billingAccountToken',
  'requiredDisclosure',
  'requiredProgram',
  'managementUrl',
  'denialReason',
  'killSwitchState',
]) {
  assert.match(policy, new RegExp(`\\b${field}\\b`), `policy decision must parse ${field}`);
}
assert.match(
  policy,
  /value === 'google_play_billing'[\s\S]*purchaseKind === 'creator_membership'[\s\S]*'google_play_subscription'[\s\S]*'google_play_iap'/,
  'the unified backend Play rail must map to the correct provider-neutral client rail',
);
assert.match(policy, /killSwitchState\.active \? 'unavailable'/, 'active commerce kill switches must override a permitted rail');
assert.match(policy, /requestedRail:\s*request\.requestedRail/, 'rail selection must be sent back to server policy');

assert.match(wallet, /const idempotencyKey =[\s\S]*Crypto\.randomUUID\(\)/, 'wallet spend must create one per-operation idempotency key');
assert.match(wallet, /request_id:\s*idempotencyKey[\s\S]*idempotency_key:\s*idempotencyKey/, 'wallet aliases must share the same idempotency key');
assert.match(wallet, /Platform\.OS === 'android'[\s\S]*commerce_platform:\s*'android'/, 'Android credit spend must declare its commerce platform');
assert.match(live, /const idempotencyKey =[\s\S]*'live_gift'[\s\S]*Crypto\.randomUUID\(\)/, 'live gifts must create a stable per-operation key');
assert.match(live, /idempotency_key:\s*idempotencyKey[\s\S]*commerce_platform:\s*'android'/, 'Android gifts must send their idempotency and platform markers');

assert.match(licence, /licenseType:\s*prepared\.option\.licenseType/, 'credit licensing must send the prepared immutable licence type');
assert.match(licence, /commercePlatform:\s*'android'/, 'credit licensing must declare Android commerce');
assert.match(licence, /storefront:\s*policy\.storefront/, 'credit licensing must send the verified ISO2 storefront');
assert.match(
  licence,
  /if \(creditRailAllowed\)[\s\S]*complete-beat-credit-license[\s\S]*return;[\s\S]*create-beat-purchase/,
  'the credit branch must return before hosted beat checkout can run',
);
assert.doesNotMatch(licence, /spendCredits\s*\(/, 'the licence client must never issue a generic credit debit');
assert.match(licence, /creditShortfall = Math\.max\(0, creditsRequired - wallet\.balance\.available_credits\)/, 'the exact shortfall must use the current spendable balance');
assert.match(licence, /recommendCreditPacks\(creditShortfall\)/, 'the shortfall UI must provide a pack recommendation');
assert.match(licence, /never buy multiple packs automatically/i, 'the UI must state that multipack purchase is never automatic');
assert.match(credits, /smallest-credit-overage pack combination/i, 'pack recommendation must minimize credit overage');
assert.doesNotMatch(licence, /purchaseCredits\s*\(/, 'the licence screen must not silently buy any recommended pack');

assert.match(external, /SUPPORTED_LINK_PROGRAMS[\s\S]*'external-content-link'[\s\S]*'external-offer'/, 'external checkout must allowlist exact Play API programme IDs');
assert.match(external, /decision\.killSwitchState\.active/, 'external checkout must enforce the server kill switch');
assert.match(external, /decision\.allowedChoices\.find/, 'external checkout must require a backend-allowed choice');
assert.match(external, /isBillingProgramAvailableAndroid/, 'external checkout must verify Play-side programme availability');
assert.match(external, /launchExternalLinkAndroid/, 'Android external digital checkout must use the Play link API, not a generic browser');
assert.match(
  external,
  /reconcileHostedCheckout\([\s\S]*state !== 'success'[\s\S]*createBillingProgramReportingDetailsAndroid[\s\S]*report-google-play-external-transaction/,
  'external reporting details must be created and submitted only after verified provider payment',
);
assert.doesNotMatch(external, /WebBrowser|openAuthSessionAsync/, 'Android digital external checkout must not bypass Play with a generic browser');

console.log('Android provider-neutral commerce client contract verified');
