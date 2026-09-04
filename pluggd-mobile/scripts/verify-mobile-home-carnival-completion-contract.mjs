import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/features/home/MusicDiscoveryHome.tsx', import.meta.url), 'utf8');
const data = readFileSync(new URL('../src/features/home/homeDiscoveryData.ts', import.meta.url), 'utf8');

assert(!home.includes("return 'Support release'"), 'Home must not imply that supporting a release unlocks streaming');
assert(home.includes("if (item.kind === 'release') return 'View release'"), 'Release CTA must use truthful detail-opening copy');
assert(home.includes("featured.kind === 'release' ? featured.destinationRoute"), 'Release CTA must open release detail rather than the support route');

for (const acceptedCarnivalCopy of [
  'The PLUGGD Carnival Guide',
  'Find your sound.',
  'Plan the road.',
  'Sound systems, mas bands, food, history and the practical stops worth knowing—brought together in one music-first guide.',
  'Open the Carnival Hub',
]) {
  assert(home.includes(acceptedCarnivalCopy), `First Home Carnival feature is missing accepted copy: ${acceptedCarnivalCopy}`);
}
assert(home.includes('carnivalFeatureTitleEmphasis'), 'Plan the road must retain its accepted visual emphasis');
assert(home.includes("openHomeDestination({ kind: 'carnival' })"), 'First Home Carnival feature must retain its working Hub route');
assert(!home.includes('SOURCE-CHECKED GUIDE'), 'Native-only Carnival copy must not replace the accepted web-mobile wording');

assert(data.includes("item.kind === 'creator' || item.kind === 'community'"), 'Next Wave must explicitly prioritise real creators and community rooms');
assert(data.includes('peopleAndRooms[0]') && data.includes('peopleAndRooms[1]'), 'Next Wave must reserve multiple visible people/room positions when data exists');
assert(home.includes('onOpen={openHomeDestination}'), 'Every Next Wave tile must use the typed destination resolver');
assert(data.includes('destination: { kind:'), 'Next Wave data must carry typed destinations rather than inventing routes at render time');

assert(home.includes('accessibilityLabel={`Open soundboard'), 'A Soundboard card must expose one clear semantic route target');
assert(home.includes("openHomeDestination({ kind: 'soundboard', id: board.slug || board.id })"), 'Artwork, title, arrow and Open board must share the validated Soundboard destination');
assert(!home.includes('soundboardHit'), 'Soundboards must not use overlapping invisible pressable layers');

assert(home.includes('accessibilityLabel={`Open event'), 'The Happening Now event must be exposed as one whole-card action');
assert(home.includes("openHomeDestination({ kind: 'event', id: String(featuredEvent.id) })"), 'The Happening Now event must pass its exact real event ID through the typed destination resolver');
assert(home.includes("if (Number(price ?? 0) > 0) return 'Tickets'"), 'Paid events must use Tickets');
assert(home.includes("if (price === 0) return 'RSVP'"), 'Free events must use RSVP');
assert(home.includes("return 'Details'"), 'Unknown-price events must use Details');

const dj = home.indexOf('title="PLUGGD DJ"');
const beatPlug = home.indexOf('title="BeatPlug"', dj + 1);
const studio = home.indexOf('title="Creator Studio"', beatPlug + 1);
assert(dj >= 0 && beatPlug > dj && studio > beatPlug, 'Drops & Tools must be ordered PLUGGD DJ, BeatPlug, Creator Studio');
assert(home.includes("openHomeDestination({ kind: 'creator_tool', tool: 'pluggd_dj' })"), 'PLUGGD DJ must open its real named native workflow rather than generic upload');
assert(existsSync(new URL('../app/dj.tsx', import.meta.url)), 'The native PLUGGD DJ destination must exist');
assert(!home.includes('title="PLUGGD DJ"\n              meta={`${feed.data?.mixes.length'), 'PLUGGD DJ must not be presented as the generic listening-only Mixes page');
assert(home.includes("openHomeDestination({ kind: 'creator_tool', tool: 'beatplug' })"), 'BeatPlug must open through the typed destination resolver');
assert(home.includes("openHomeDestination({ kind: 'creator_tool', tool: 'studio' })"), 'Creator Studio must open through the typed destination resolver');

assert(home.includes('title="From THE PLUG"'), 'Accepted From THE PLUG section must remain present');
assert(home.includes('title="New releases"'), 'Accepted New Releases section must remain present');
assert(home.includes('title="Mixes in rotation"'), 'Accepted Mixes section must remain present');
assert(home.includes('MAKE IT YOURS'), 'Accepted Make It Yours section must remain present');

console.log('PASS mobile Home completion contract');
