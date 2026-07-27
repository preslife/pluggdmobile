import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const hiddenMarketplaceTab = new URL('../app/(tabs)/marketplace.tsx', import.meta.url);
const marketplaceSource = read('app/marketplace.tsx');
const marketIndexSource = read('app/market/index.tsx');
const marketSectionSource = read('app/market/[section].tsx');
const beatMarketplaceSource = read('app/beat-marketplace.tsx');
const beatDetailSource = read('app/beat/[id].tsx');
const beatLicenceSource = read('app/commerce/license-preview.tsx');
const parityServiceSource = read('src/features/parity/appWideParityServices.ts');

assert.equal(
  existsSync(hiddenMarketplaceTab),
  false,
  'Marketplace must not exist inside the tab navigator because old tab routes can shadow the five-tab app shell',
);

assert.doesNotMatch(
  `${marketplaceSource}\n${marketIndexSource}\n${marketSectionSource}\n${beatMarketplaceSource}`,
  /Coming into Market|STRIPE_SECRET_KEY|PaymentSheet|client-provided price/i,
  'Marketplace routes must not expose unfinished, secret-bearing, native-Stripe or client-priced checkout surfaces',
);

// Web routing parity: /market resolves to the /store culture shop (via
// MarketParityScreen -> MarketStoreScreen) and /marketplace + the beat
// shortcut resolve to the BeatPlug audition floor, mirroring the live
// web redirects (/market -> /store, /marketplace -> /market/beats).
assert.match(marketplaceSource, /BeatPlugScreen/, 'Top-level Marketplace route must render the BeatPlug audition floor (web redirect parity)');
assert.match(marketIndexSource, /MarketParityScreen/, 'Top-level Market route must render the native Market parity screen');
assert.match(marketSectionSource, /MarketParityScreen/, 'Market section route must render the native Market parity screen');
assert.match(beatMarketplaceSource, /BeatPlugScreen/, 'Beat marketplace shortcut must render the BeatPlug audition floor (web redirect parity)');

assert.match(
  parityServiceSource,
  /Preview beats and review license options from producers/,
  'Native Market must use polished consumer-facing beat discovery copy',
);

assert.match(
  parityServiceSource,
  /Beat licensing previews will appear when published beats exist/,
  'Native Market must keep licensing context public-facing and non-internal',
);

assert.doesNotMatch(
  parityServiceSource,
  /Apple IAP-backed|external digital checkout|native entitlement|No fake checkout|unsupported payment|payment contract/i,
  'Native Market source must not contain App Review or implementation planning copy in public surfaces',
);

assert.doesNotMatch(
  `${beatDetailSource}\n${beatLicenceSource}`,
  /Open Wallet|router\.push\('\/wallet'|licenseFee|price(?:Cents|Pence)\s*:/i,
  'Beat detail must not route licensing through credits or submit an authoritative client price',
);
assert.match(
  `${beatDetailSource}\n${beatLicenceSource}`,
  /useCommercePolicy[\s\S]*licenseOptionId[\s\S]*openHostedCheckout/,
  'Beat detail must policy-gate a trusted professional licence before hosted checkout',
);

console.log('mobile market contract verified');
