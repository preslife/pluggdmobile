import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const releaseSource = readFileSync(new URL('../app/release/[id].tsx', import.meta.url), 'utf8');

assert.match(
  releaseSource,
  /function getReleaseCreditPrice/,
  'release detail must use a dedicated credit-price helper',
);

assert.match(
  releaseSource,
  /Math\.ceil\(release\.price \* 100\)/,
  'release GBP price fallback must convert to credits using 100 credits = GBP 1',
);

assert.doesNotMatch(
  releaseSource,
  /release\.credits_price \|\| release\.price \|\| 0/,
  'release detail must not treat GBP price as raw credits',
);

assert.match(
  releaseSource,
  /spendCredits\(\s*creditsNeeded,\s*'spend_unlock',\s*'release'/,
  'release unlock must spend credits through the entitlement-aware wallet path',
);

console.log('mobile release contract verified');
