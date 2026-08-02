import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const contentUi = read('components/ContentUI.tsx');
const release = read('app/release/[id].tsx');
const beat = read('app/beat/[id].tsx');
const beatLicence = read('app/commerce/license-preview.tsx');
const event = read('app/events/[id].tsx');
const wallet = read('app/wallet.tsx');
const membership = read('app/membership/[creatorId].tsx');
const tickets = read('app/tickets.tsx');

assert.match(contentUi, /PremiumScreenHeader/, 'shared ScreenShell must use the premium app header');
assert.match(contentUi, /theme\.colors\.background/, 'shared ScreenShell must use the selected theme canvas');
assert.doesNotMatch(contentUi, /PremiumScreenBackdrop/, 'shared ScreenShell must not reintroduce the obsolete promotional backdrop');

for (const [name, source] of [
  ['beat detail', beat],
  ['event detail', event],
]) {
  assert.match(source, /PremiumScreenBackdrop/, `${name} must opt into the shared premium backdrop`);
}

for (const [name, source] of [
  ['wallet', wallet],
  ['membership', membership],
]) {
  assert.match(source, /theme\.colors\.background/, `${name} must use the selected theme canvas`);
  assert.doesNotMatch(source, /PremiumScreenBackdrop/, `${name} must not reintroduce the obsolete promotional backdrop`);
}

// Release detail is the mobile discovery editorial page: art and identity
// lead into an immediate playback decision, then contextual credits and
// community/support layers. This deliberately replaces the old web section
// order assertion with the approved mobile discovery hierarchy.
assert.match(release, /SUPPORT THIS RELEASE/, 'release detail must open with the full-bleed art + support pill (web parity)');
assert.match(release, /AccentTitle/, 'release detail title must carry the web orange last-word treatment');
assert.match(release, /PLAYBACK[\s\S]*FULL CREDITS[\s\S]*DISCUSSION[\s\S]*WHERE TO STREAM[\s\S]*THE WORDS/, 'release detail must put playback before contextual credits, discussion and supporting material');
assert.match(release, /spendCredits[\s\S]*spend_unlock/, 'release detail must keep credit unlock wired through the wallet ledger');
assert.match(release, /Save[\s\S]*Post[\s\S]*Share/, 'release detail must keep save, post-to-feed and share actions');

assert.match(`${beat}\n${beatLicence}`, /professional (?:beat )?licensing/i, 'beat flow must frame licensing as professional/off-app use, not generic in-app checkout');
assert.doesNotMatch(beat, /Open Wallet|router\.push\('\/wallet'/, 'beat licensing must not route professional/off-app licensing into the Apple credits wallet');
assert.match(beat, /licenseOptionId/, 'beat detail must route a trusted licence-option identifier');
assert.match(beatLicence, /useCommercePolicy/, 'beat licensing must be server-policy gated');
assert.match(beatLicence, /licenseOptionId/, 'beat licensing must submit a trusted licence-option identifier');
assert.match(beatLicence, /openHostedCheckout/, 'eligible professional beat licences must use hosted checkout');

assert.match(event, /EventTicketPurchase/, 'event detail must preserve policy-gated ticket purchase');
assert.match(event, /setEventRsvp/, 'event detail must preserve free RSVP');
assert.match(event, /Event thread/, 'event detail must preserve event-thread social handoff');
assert.match(event, /useCommercePolicy/, 'paid event tickets must be server-policy gated');
assert.match(event, /ticketTypeId/, 'paid event tickets must submit a trusted ticket-type identifier');

assert.match(wallet, /Restore Purchases/, 'wallet must expose Apple restore purchases');
assert.match(wallet, /Credits never expire/, 'wallet must keep App Review-safe credit expiry language');
for (const sku of [
  'pluggd_credits_starter',
  'pluggd_credits_popular',
  'pluggd_credits_value',
  'pluggd_credits_premium',
  'pluggd_credits_ultimate',
]) {
  assert.match(wallet + read('src/hooks/useCredits.ts'), new RegExp(sku), `wallet credits flow must preserve ${sku}`);
}

assert.match(membership, /Apple[\s\S]*Settings[\s\S]*Subscriptions/, 'membership screen must keep Apple subscription cancel/manage guidance');
assert.match(membership, /membership_iap_products/, 'membership screen must load unique creator-tier Apple product mappings');
assert.doesNotMatch(membership, /pluggd_tier_(?:299|499|999|1999|4999)/, 'membership screen must not use shared price SKUs as creator identity');
assert.match(
  membership,
  /<View\s+key=\{tier\.id\}[\s\S]*?<Pressable[\s\S]*?accessibilityRole="radio"/,
  'tier expansion and purchase actions must be sibling controls rather than nested Pressables',
);
assert.match(
  membership,
  /joinButton:\s*\{[\s\S]*?backgroundColor:\s*'#ff6600'/,
  'the membership purchase CTA must render with an explicit visible PLUGGD-orange surface',
);
assert.match(membership, /SWITCH TO/, 'membership screen must support same-creator tier changes');
assert.match(membership, /isCurrentTier/, 'membership screen must identify the active creator tier');

assert.match(tickets, /Entry codes appear only for eligible tickets/, 'tickets must keep honest QR/pass limitations');
assert.match(tickets, /issueTicketEntryToken/, 'tickets must keep rotating entry token integration');

console.log('mobile contextual premium contract verified');
