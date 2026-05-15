import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const routeSource = read('app/(tabs)/search.tsx');
const searchSource = read('src/features/search/search-discovery-screen.tsx');
const dataSource = read('src/features/culture/useCultureData.ts');
const chromeSource = read('components/AppChrome.tsx');

assert.match(routeSource, /SearchDiscoveryScreen/, 'Search tab must use the dedicated premium Search screen');

for (const label of [
  'SEARCH',
  'UNIVERSAL DISCOVERY',
  'Happening Near The Culture',
  'Sounds And Producers',
  'Communities And Creators',
  'Events',
  'Creators',
  'Tracks',
  'Mixes',
  'Videos',
  'Communities',
  'Beats / Producers',
  'Live Streams',
  'Users',
]) {
  assert.match(searchSource, new RegExp(label), `${label} must be present in Search`);
}

for (const hook of ['useUniversalSearch', 'useHomeFeed', 'useEventLayer', 'useBackstage', 'useLiveRooms', 'usePlayback']) {
  assert.match(searchSource, new RegExp(hook), `${hook} must power Search`);
}

for (const table of ["from('profiles')", "from('releases')", "from('mixes')", "from('beats')", "from('videos')", "from('events')", "from('hubs')", "from('session_rooms')"]) {
  assert.match(dataSource, new RegExp(table.replace(/[()']/g, '\\$&')), `${table} must be in universal search data map`);
}

for (const color of ['#08080C', '#12121A', '#1F1F2E', '#FF5A00', '#FF4757']) {
  assert.match(searchSource, new RegExp(color), `${color} Search design token must be used`);
}

for (const action of [
  "router.push(`/events/${event.id}`",
  "router.push(`/release/${release.id}`",
  "router.push(`/beat/${beat.id}`",
  "router.push(communityRoute(community)",
  "router.push({ pathname: '/live/session'",
  'playTrack(track)',
]) {
  assert.match(searchSource, new RegExp(action.replace(/[/'(){}$`]/g, '\\$&')), `${action} action must be wired`);
}

assert.match(searchSource, /RefreshControl/, 'Search must support pull-to-refresh for live data');
assert.match(searchSource, /TextInput/, 'Search must expose a native text input');
assert.match(chromeSource, /normalized === '\/search'/, 'Search should own its own premium header');
assert.doesNotMatch(searchSource, /Fictional|Elias Thorne|LONDON WAREHOUSE|Boiler Room|Spotify|TikTok|DICE|Ticketmaster|Lorem|mock/i, 'Search must not ship fake or third-party placeholder data');
assert.doesNotMatch(searchSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

console.log('mobile search contract verified');
