import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const hiddenMarketplaceTab = new URL('../app/(tabs)/marketplace.tsx', import.meta.url);
const marketplaceSource = read('app/marketplace.tsx');
const marketIndexSource = read('app/market/index.tsx');
const marketSectionSource = read('app/market/[section].tsx');
const beatMarketplaceSource = read('app/beat-marketplace.tsx');
const beatDetailSource = read('app/beat/[id].tsx');
const parityServiceSource = read('src/features/parity/appWideParityServices.ts');

assert.equal(
  existsSync(hiddenMarketplaceTab),
  false,
  'Marketplace must not exist inside the tab navigator because old tab routes can shadow the five-tab app shell',
);

assert.doesNotMatch(
  `${marketplaceSource}\n${marketIndexSource}\n${marketSectionSource}\n${beatMarketplaceSource}`,
  /Coming into Market|card payment|Stripe|Start checkout|external checkout link/i,
  'Marketplace routes must not expose unfinished card, Stripe, or external digital checkout surfaces',
);

assert.match(marketplaceSource, /MarketParityScreen/, 'Top-level Marketplace route must render the native Market parity screen');
assert.match(marketIndexSource, /MarketParityScreen/, 'Top-level Market route must render the native Market parity screen');
assert.match(marketSectionSource, /MarketParityScreen/, 'Market section route must render the native Market parity screen');
assert.match(beatMarketplaceSource, /MarketParityScreen/, 'Beat marketplace shortcut must render the native Market parity screen');

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
  beatDetailSource,
  /Start checkout|checkout|Open Wallet|router\.push\('\/wallet'|Choose MP3 lease, premium WAV, stems, or exclusive licensing at checkout/i,
  'Beat detail must not expose external or stale checkout language',
);
assert.match(
  beatDetailSource,
  /Save Beat|View license options|License on web|Licensing coming soon/,
  'Beat detail must use an App Review-safe professional licensing CTA',
);

console.log('mobile market contract verified');
