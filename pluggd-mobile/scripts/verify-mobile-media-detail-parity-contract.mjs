import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const release = read('app/release/[id].tsx');
const beat = read('app/beat/[id].tsx');
const mix = read('app/mixes/[id].tsx');
const samplePack = read('app/sample-pack/[id].tsx');
const soundboard = read('app/soundboards/[id].tsx');
const event = read('app/events/[id].tsx');
const mobileServices = read('src/features/culture/mobileServices.ts');

for (const [name, source] of [
  ['release', release],
  ['beat', beat],
  ['mix', mix],
  ['sample pack', samplePack],
  ['soundboard', soundboard],
]) {
  assert.match(source, /toggleSavedContent/, `${name} detail must support real saved-library persistence`);
  assert.match(source, /Share\.share/, `${name} detail must expose native sharing`);
  assert.match(source, /\/create-post/, `${name} detail must expose post-to-feed flow`);
}

assert.match(release, /spendCredits/, 'release detail must preserve credit unlock path');
assert.match(release, /release_purchases/, 'release detail must preserve owned-release detection');

assert.match(beat, /license_prices|available_licenses/, 'beat detail must expose backend license metadata when present');
assert.match(beat, /Open Wallet/, 'beat detail must keep unsupported purchase routed through wallet/credits context, not external checkout');

assert.match(mix, /mix_tracklist_items/, 'mix detail must preserve real tracklist loading');
assert.match(samplePack, /sample_pack_purchases/, 'sample pack detail must preserve real free-claim purchases');
assert.match(soundboard, /loadSoundboardItemDetails/, 'soundboard detail must use the shared real soundboard item loader');
assert.match(mobileServices, /from\('soundboard_items'\)/, 'soundboard service must preserve real soundboard item loading');
assert.match(event, /eventId: event\.id/, 'event detail thread action must create event-scoped social destination rows');

for (const source of [release, beat, mix, samplePack, soundboard, event]) {
  assert.doesNotMatch(source, /stripe|checkout\.stripe|window\.location|https:\/\/buy|Pay \$|PaymentSheet/i, 'mobile detail pages must not expose stale external digital checkout');
}

console.log('mobile media detail parity contract verified');
