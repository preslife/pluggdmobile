import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const primitives = read('components/PluggdPrimitives.tsx');
const home = read('src/features/home/live-music-dashboard-home.tsx');
const explore = read('src/features/search/search-discovery-screen.tsx');
const createAndHub = read('src/features/culture/CultureScreens.tsx');
const community = read('src/features/mypluggd/my-pluggd-screen.tsx');
const profile = read('src/features/profile/my-profile-screen.tsx');
const dock = read('components/PluggdDock.tsx');

for (const exportName of [
  'PremiumScreenBackdrop',
  'PremiumScreenHeader',
  'PremiumHeroCard',
  'PremiumMediaRail',
  'PremiumListRow',
  'PremiumEmptyState',
]) {
  assert.match(primitives, new RegExp(`export function ${exportName}`), `${exportName} must exist as a shared premium screen primitive`);
}

for (const token of [
  'expo-linear-gradient',
  'PluggdImage',
  'theme.colors.artworkBase',
  'borderRadius: pluggdRadii.sheet',
  'minHeight: 44',
  'fontVariant',
]) {
  assert.match(primitives, new RegExp(escapeRegExp(token)), `premium primitives must include ${token}`);
}

for (const [name, source] of [
  ['Home', home],
  ['Explore', explore],
  ['Create', createAndHub],
  ['Community', community],
  ['Profile', profile],
]) {
  assert.match(source, /PremiumScreenBackdrop/, `${name} must use the shared premium backdrop`);
}

assert.match(home, /PremiumHeroCard/, 'Home must use the shared premium hero for the front-door spotlight');
assert.match(explore, /PremiumScreenHeader[\s\S]*UNIVERSAL DISCOVERY/, 'Explore/Search must use the shared premium header');
assert.match(createAndHub, /PremiumScreenHeader[\s\S]*Fast actions/, 'Create must use the shared premium header');
assert.match(community, /PremiumScreenHeader[\s\S]*Feed[\s\S]*Circles[\s\S]*Library[\s\S]*Activity/, 'Community must preserve social tabs inside a premium shell');
assert.match(profile, /profileCover[\s\S]*avatarWrap[\s\S]*profileBadge[\s\S]*Wallet[\s\S]*Tickets[\s\S]*Settings/, 'Profile must use a premium identity block while keeping account shortcuts');
assert.doesNotMatch(profile, /PremiumScreenHeader[\s\S]*Profile[\s\S]*PremiumHeroCard[\s\S]*Profile/i, 'Profile must not repeat stacked generic Profile headers');

for (const label of ['Home', 'Explore', 'Create', 'Community', 'Profile']) {
  assert.match(dock, new RegExp(`label:\\s*'${label}'`), `premium finish must keep ${label} in the locked five-tab nav`);
}
assert.doesNotMatch(dock, /label:\s*'(Discover|Events|Market|Stage|Live|Backstage|MyPLUGGD|Search)'/, 'premium finish must not regress the locked five-tab nav');
assert.doesNotMatch(home + explore + createAndHub + community + profile, /generic card-heavy|Lorem|\bFictional\b|\bTicketmaster\b|\bSpotify\b|\bTikTok\b|\bDICE\b/i, 'finished core surfaces must avoid placeholder or third-party mockup language');

console.log('mobile premium finish contract verified');
