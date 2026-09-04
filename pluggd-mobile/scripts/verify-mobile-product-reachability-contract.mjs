import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const requiredRoutes = [
  'app/live/index.tsx',
  'app/live/create.tsx',
  'app/live/feed.tsx',
  'app/live/session.tsx',
  'app/releases/index.tsx',
  'app/mixes/index.tsx',
  'app/soundboards/index.tsx',
  'app/plug/index.tsx',
  'app/market/index.tsx',
  'app/library.tsx',
  'app/wallet.tsx',
  'app/purchases.tsx',
  'app/membership/index.tsx',
  'app/tickets.tsx',
  'app/create.tsx',
  'app/studio/index.tsx',
  'app/studio/connect-card.tsx',
  'app/studio/splits.tsx',
];

for (const route of requiredRoutes) {
  assert.equal(existsSync(new URL(route, root)), true, `${route} must remain routable after navigation redesigns`);
}

const header = read('components/MobileHeader.tsx') + read('components/AccountMenuButton.tsx');
const discoveryHeader = read('src/features/discovery/DiscoveryHeader.tsx');
const discover = read('src/features/discovery/MusicDiscoveryDiscover.tsx');
const publicDestinations = read('src/features/discovery/publicDestinations.ts');
const community = read('src/features/community-feed/CommunityInternalSwitcher.tsx');
const culture = read('src/features/culture/CultureScreens.tsx');
const studio = read('src/features/studio/StudioScreens.tsx');
const studioData = read('src/features/studio/studio-data.ts');

assert.match(header, /accessibilityLabel="Open PLUGGD Live"[\s\S]*?router\.push\('\/live'/, 'Live must be globally reachable in one tap');
assert.match(discoveryHeader, /accessibilityLabel="Open PLUGGD Live"[\s\S]*?router\.push\('\/live'/, 'Home, Discover, Community, Events and Library must expose Live in one tap');
assert.match(header, /accessibilityLabel="Search PLUGGD"/, 'Global search must remain in the public header');
assert.match(header, /label: 'Library'[\s\S]*?route: '\/library'/, 'Fan Library must remain reachable from Account');
assert.match(header, /label: 'Purchases & Access'[\s\S]*?route: '\/purchases'/, 'Purchases must remain reachable from Account');
assert.match(header, /label: 'Memberships'[\s\S]*?route: '\/membership'/, 'Memberships must remain reachable from Account');
assert.match(header, /label: 'Tickets'[\s\S]*?route: '\/tickets'/, 'Tickets must remain reachable from Account');
assert.match(header, /label: 'Connect Card'[\s\S]*?route: '\/studio\/connect-card'/, 'Connect Cards must remain reachable for creators');

for (const [label, route] of [
  ['Mixes', '/mixes'],
  ['Soundboards', '/soundboards'],
  ['Releases', '/releases'],
  ['Live', '/live'],
  ['THE PLUG', '/plug'],
]) {
  assert.match(publicDestinations, new RegExp(`title: '${label}'[\\s\\S]*?route: '${route.replaceAll('/', '\\/')}'`), `${label} must remain a visual Discover gateway`);
}
assert.match(publicDestinations, /title: 'Store'[\s\S]*?route: '\/market'/, 'Creator Market must remain a Discover gateway');

assert.match(community, /label: 'THE PLUG'[\s\S]*?router\.push\('\/plug'/, 'Community must retain THE PLUG editorial access');
assert.match(community, /label: 'Create Post'[\s\S]*?router\.push\('\/create-post'/, 'Community must retain fan and creator posting access');
assert.match(community, /label: 'Boards'/, 'Community boards must remain visible');
assert.match(community, /label: 'Nearby'[\s\S]*?router\.push\('\/events'/, 'Community must retain local event discovery');

for (const token of ["label: 'Go Live'", "route: '/live/create'", "label: 'Create Post'", "label: 'Upload Clip'", "label: 'Listening Party'"]) {
  assert.match(culture, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Creator quick actions must include ${token}`);
}

assert.match(studio, /title: 'Go live'[\s\S]*?route: '\/live\/create'/, 'Studio must expose broadcast creation');
assert.match(`${studio}\n${studioData}`, /title: 'Connect Card'[\s\S]*?route: '\/studio\/connect-card'/, 'Studio must expose Connect Card management');
assert.match(`${studio}\n${studioData}`, /route: '\/studio\/splits'/, 'Studio must expose split tools from Connect workflows');

console.log('mobile product reachability contract verified');
