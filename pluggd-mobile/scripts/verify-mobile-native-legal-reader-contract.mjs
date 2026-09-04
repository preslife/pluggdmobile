import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const content = read('src/features/legal/legalContent.ts');
const reader = read('src/features/legal/LegalReaderScreen.tsx');
const purchaseLinks = read('src/components/PurchaseLegalLinks.tsx');
const privacySettings = read('app/settings/privacy.tsx');
const signup = read('app/auth/signup.tsx');
const termsRoute = read('app/legal/terms.tsx');
const privacyRoute = read('app/legal/privacy.tsx');

assert.match(termsRoute, /LegalReaderScreen document=\{TERMS_DOCUMENT\}/, 'Terms route must render the native legal reader');
assert.match(privacyRoute, /LegalReaderScreen document=\{PRIVACY_DOCUMENT\}/, 'Privacy route must render the native legal reader');
assert.doesNotMatch(reader, /WebView|Linking\.openURL|LEGAL_URLS/, 'native legal readers must not use an external browser or WebView');
assert.match(reader, /router\.canGoBack\(\)[\s\S]*router\.back\(\)[\s\S]*router\.replace\('\/'/, 'legal readers must have safe close navigation');
assert.match(reader, /useBottomChromeInset/, 'legal readers must reserve shared bottom chrome clearance');

for (const source of [purchaseLinks, privacySettings, signup]) {
  assert.doesNotMatch(source, /Linking\.openURL\(LEGAL_URLS\.(?:terms|privacy)\)/, 'user-facing legal taps must not leave the app');
  assert.match(source, /\/legal\/(?:terms|privacy)/, 'user-facing legal surfaces must contain internal legal routes');
}
assert.match(purchaseLinks, /router\.push\('\/legal\/terms'/, 'purchase Terms action must route internally');
assert.match(purchaseLinks, /router\.push\('\/legal\/privacy'/, 'purchase Privacy action must route internally');
assert.match(privacySettings, /router\.push\('\/legal\/terms'/, 'Privacy settings Terms action must route internally');
assert.match(privacySettings, /router\.push\('\/legal\/privacy'/, 'Privacy settings policy action must route internally');
assert.match(signup, /By creating an account you agree to the/, 'signup consent copy must be preserved');
assert.match(signup, /I confirm that I am at least \{MINIMUM_AGE\}/, 'signup age consent semantics must be preserved');

for (const heading of [
  'Who we are',
  'Who these Terms apply to',
  'Eligibility',
  'Your account',
  'Your content and rights',
  'Your responsibilities as a creator',
  'Fan purchases and access',
  'Payments, fees and payouts',
  'Acceptable use',
  'Intellectual property of Pluggd',
  'Beta and early access',
  'Service changes',
  'Disclaimers',
  'Limitation of liability',
  'Indemnity',
  'Termination',
  'Governing law',
]) assert.match(content, new RegExp(`title: '${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `Terms must include ${heading}`);

for (const heading of [
  'What this policy covers',
  'The data we collect',
  'Information you provide to us',
  'Information we collect automatically',
  'How we use your data',
  'Legal bases (UK/EU/EEA)',
  'How we share your data',
  'International transfers',
  'Data retention',
  'Your rights',
  'Children',
]) assert.ok(content.includes(`title: '${heading}'`), `Privacy must include ${heading}`);

assert.match(content, /Last updated: 08 Dec 2025/, 'Terms canonical update date must be preserved');
assert.match(content, /Last updated: December 2025/, 'Privacy canonical update date must be preserved');
assert.match(content, /support@pluggd\.fm/, 'canonical legal contact must be preserved');
assert.doesNotMatch(content, /lorem ipsum|coming soon|placeholder|\.\.\./i, 'legal content must not be abbreviated or placeholder copy');

console.log('PLUGGD internal native Terms and Privacy contract verified');
