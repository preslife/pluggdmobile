import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const marketSource = read('app/(tabs)/marketplace.tsx');
const marketIndexSource = read('app/market/index.tsx');
const beatMarketplaceSource = read('app/beat-marketplace.tsx');
const beatDetailSource = read('app/beat/[id].tsx');

assert.doesNotMatch(
  marketSource,
  /Services|Licenses|Offers|Coming into Market|checkout|card payment|Stripe/i,
  'Marketplace must not expose unfinished service/license/offer or checkout surfaces',
);

assert.match(marketSource, /<Redirect href="\/stage" \/>/, 'Hidden marketplace tab must redirect into Stage, not remain a primary marketplace surface');
assert.match(marketIndexSource, /<Redirect href="\/stage" \/>/, 'Top-level Market route must redirect into Stage');
assert.match(beatMarketplaceSource, /<Redirect href="\/stage" \/>/, 'Beat marketplace shortcut must redirect into Stage');

assert.doesNotMatch(
  beatDetailSource,
  /Start checkout|checkout|Choose MP3 lease, premium WAV, stems, or exclusive licensing at checkout/i,
  'Beat detail must not expose external or stale checkout language',
);

console.log('mobile market contract verified');
