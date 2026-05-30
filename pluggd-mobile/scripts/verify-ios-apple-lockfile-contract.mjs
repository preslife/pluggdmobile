import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const readRoot = (path) => readFileSync(new URL(path, root), 'utf8');

const lockfilePath = new URL('docs/IOS_APPLE_SETUP_LOCKFILE.md', root);
const reviewNotesPath = new URL('docs/IOS_APP_REVIEW_NOTES_DRAFT.md', root);

assert.ok(existsSync(lockfilePath), 'root Apple setup lockfile must exist');
assert.ok(existsSync(reviewNotesPath), 'App Review notes draft must exist');

const lockfile = readRoot('docs/IOS_APPLE_SETUP_LOCKFILE.md');
const reviewNotes = readRoot('docs/IOS_APP_REVIEW_NOTES_DRAFT.md');

for (const heading of [
  'Repository/workspace paths',
  'Apple app identity',
  'IAP credit packs',
  'Subscription products',
  'StoreKit / App Store Server API setup',
  'Backend alignment',
  'Do-not-change warnings',
]) {
  assert.match(lockfile, new RegExp(`## ${heading}`), `${heading} section missing from Apple lockfile`);
}

assert.match(
  lockfile,
  /Bundle ID:\s*`com\.pluggd\.mobile`[\s\S]*Verified from local app config/,
  'Bundle ID must be recorded as verified from local config',
);

for (const sku of [
  'pluggd_credits_starter',
  'pluggd_credits_popular',
  'pluggd_credits_value',
  'pluggd_credits_premium',
  'pluggd_credits_ultimate',
  'pluggd_tier_299',
  'pluggd_tier_499',
  'pluggd_tier_999',
  'pluggd_tier_1999',
  'pluggd_tier_4999',
]) {
  assert.match(lockfile, new RegExp(sku), `${sku} must be listed in Apple lockfile`);
}

for (const secretName of [
  'APPLE_IAP_ISSUER_ID',
  'APPLE_IAP_KEY_ID',
  'APPLE_IAP_PRIVATE_KEY',
  'APPLE_BUNDLE_ID',
  'APPLE_SERVER_NOTIFICATION_SECRET',
  'APPLE_IAP_ENVIRONMENT',
]) {
  assert.match(lockfile, new RegExp(secretName), `${secretName} expected secret name missing`);
}

for (const forbidden of [
  /-----BEGIN PRIVATE KEY-----/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/,
  /APPLE_IAP_PRIVATE_KEY\s*=\s*['"][^'"]+['"]/,
  /sandbox(?:_|-|\s)*password\s*[:=]\s*\S+/i,
]) {
  assert.doesNotMatch(lockfile + reviewNotes, forbidden, 'Apple docs must not contain private key material or sandbox passwords');
}

for (const backendPath of [
  'supabase/migrations/20260428170000_apple_iap_tables.sql',
  'supabase/functions/validate-iap-receipt/index.ts',
  'supabase/functions/apple-server-notification/index.ts',
]) {
  assert.match(lockfile, new RegExp(backendPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${backendPath} must be confirmed`);
}

for (const tableName of ['iap_transactions', 'apple_notification_log', 'wallet_ledger', 'fan_subscriptions']) {
  assert.match(lockfile, new RegExp(tableName), `${tableName} must be listed as Apple transaction infrastructure`);
}

for (const phrase of [
  'Apple IAP consumables',
  'credits do not expire',
  'tips use Apple-backed credits',
  'Apple auto-renewable subscriptions',
  'professional beat licensing',
  'real-world/off-app events',
  'Stripe Connect',
]) {
  assert.match(reviewNotes, new RegExp(phrase, 'i'), `App Review notes must explain: ${phrase}`);
}

console.log('iOS Apple lockfile contract verified');
