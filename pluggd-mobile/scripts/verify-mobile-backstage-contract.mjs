import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const routeSource = read('app/(tabs)/backstage.tsx');
const backstageSource = read('src/features/backstage/backstage-world-screen.tsx');
const dataSource = read('src/features/culture/useCultureData.ts');
const serviceSource = read('src/features/culture/mobileServices.ts');
const dataAndServiceSource = `${dataSource}\n${serviceSource}`;
const chromeSource = read('components/AppChrome.tsx');

assert.match(routeSource, /BackstageWorldScreen/, 'Backstage tab must use the dedicated premium Backstage screen');

for (const label of [
  'BACKSTAGE',
  'My Circles',
  'Event Hubs',
  'Rooms',
  'Threads',
  'Producers',
  'MY BACKSTAGE',
  'EVENT HUBS',
  'ACTIVE COMMUNITY ROOMS',
  'HOT THREADS',
  'PRODUCER LOUNGE',
  'COMMUNITY MOMENTS',
  'DISCOVER MORE BACKSTAGES',
]) {
  assert.match(backstageSource, new RegExp(label), `${label} must be present in the Backstage experience`);
}

for (const hook of ['useBackstage', 'useEventLayer', 'useHomeFeed', 'useLiveRooms']) {
  assert.match(backstageSource, new RegExp(hook), `${hook} must power Backstage with real app data`);
}

for (const table of ["from('hubs')", "from('view_hub_threads')", "from('events')", "from('session_rooms')"]) {
  assert.match(dataAndServiceSource, new RegExp(table.replace(/[()']/g, '\\$&')), `${table} must feed Backstage/current community surfaces`);
}

assert.doesNotMatch(dataAndServiceSource, /from\('creator_communities'\)|from\('community_threads'\)/, 'Backstage must not depend on old guessed creator_communities/community_threads tables');

for (const mapper of ['mapProducerLounge', 'mapMoments', 'mapCreatorIdentities', 'eventCountdown']) {
  assert.match(backstageSource, new RegExp(mapper), `${mapper} must map Backstage UI to backend models`);
}

for (const color of ['#08080C', '#12121A', '#1F1F2E', '#FF5A00', '#FF4757']) {
  assert.match(backstageSource, new RegExp(color), `${color} Backstage design token must be used`);
}

for (const action of [
  "go('/notifications'",
  "go('/wallet'",
  "router.push(`/events/${event.id}`",
  "router.push('/backstage'",
  "router.push({ pathname: '/live/session'",
  'scrollTo({ y:',
]) {
  assert.match(backstageSource, new RegExp(action.replace(/[/'(){}$`]/g, '\\$&')), `${action} action must be wired`);
}

assert.match(backstageSource, /ScrollView\s+horizontal/, 'Backstage must use compact horizontal sections');
assert.match(backstageSource, /RefreshControl/, 'Backstage must support pull-to-refresh for live Supabase data');
assert.match(chromeSource, /normalized === '\/backstage'/, 'Backstage should own its own header');
assert.match(chromeSource, /<MiniPlayer\s*\/>/, 'Global MiniPlayer must remain available on Backstage when media is active');

assert.doesNotMatch(
  backstageSource,
  /Elias Thorne Circle|London Warehouse Hub|South City Scene|LONDON WAREHOUSE NIGHT|Anyone got 2 spare tickets\?|Drop your open verse take|Pre-Event Meetup Room|Listening Party Room|SECTION 1|SECTION 2|Fictional/,
  'Backstage source must not hardcode mockup labels or fake community/event/thread content',
);

assert.doesNotMatch(backstageSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

console.log('mobile backstage contract verified');
