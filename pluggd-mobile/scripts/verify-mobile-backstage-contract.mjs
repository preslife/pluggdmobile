import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const routeSource = read('app/(tabs)/backstage.tsx');
const tabsSource = read('app/(tabs)/_layout.tsx');
const dockSource = read('components/PluggdDock.tsx');
const detailSource = read('app/backstage/[id].tsx');
const boardSource = read('app/community/boards/[slug].tsx');
const communityEventSource = read('app/community/events/[id].tsx');
const dataSource = read('src/features/culture/useCultureData.ts');
const serviceSource = read('src/features/culture/mobileServices.ts');
const socialSource = read('src/features/culture/mobileSocial.ts');
const dataAndServiceSource = `${dataSource}\n${serviceSource}\n${socialSource}`;
const chromeSource = read('components/AppChrome.tsx');

assert.match(routeSource, /<Redirect href="\/create" \/>/, 'Legacy Backstage tab route must redirect to Create while deep-link details stay available');
assert.match(tabsSource, /name="backstage"[\s\S]*href:\s*null/, 'Backstage compatibility route must stay hidden from the tab bar');
assert.doesNotMatch(tabsSource, /title:\s*"Backstage"/, 'Tabs layout must not expose Backstage as a primary title');
assert.doesNotMatch(dockSource, /label:\s*'Backstage'|route:\s*'\/backstage'/, 'Backstage must not remain a primary bottom tab');
assert.match(chromeSource, /normalized === '\/backstage'/, 'Legacy Backstage route must still avoid duplicate global chrome while redirecting');

for (const table of [
  "from('communities')",
  "from('community_members')",
  "from('community_boards')",
  "from('view_hub_threads')",
  "from('events')",
  "from('community_events')",
  "from('community_collab_rooms')",
  "from('community_challenges')",
  "from('soundboards')",
  "from('session_rooms')",
]) {
  assert.match(dataAndServiceSource, new RegExp(table.replace(/[()']/g, '\\$&')), `${table} must keep feeding community detail surfaces`);
}

assert.doesNotMatch(
  dataAndServiceSource,
  /from\('creator_communities'\)|from\('community_threads'\)/,
  'Community detail surfaces must not depend on old guessed creator_communities/community_threads tables',
);

assert.match(
  detailSource,
  /const TABS = \['Posts', 'Threads', 'Rooms', 'Events', 'Soundboards', 'Drops'\]/,
  'Community detail tabs must be preserved for existing deep links',
);
assert.match(detailSource, /Official Community/, 'Backstage deep-link detail must present as Community in visible copy');
assert.doesNotMatch(detailSource, /Official Backstage|Backstage unavailable|No Backstage events/, 'Visible Backstage detail copy must be retired');
assert.match(detailSource, /MobileSocialPostCard/, 'Community detail Posts must use the shared social card system');
assert.match(detailSource, /activeTab === 'Rooms'/, 'Community detail must use Rooms, not Live Rooms');
assert.match(detailSource, /activeTab === 'Soundboards'/, 'Community detail must expose Soundboards');
assert.match(detailSource, /\/community\/events\/\$\{event\.id\}/, 'Community detail events must route to a real community event route');
assert.doesNotMatch(detailSource, /pathname: '\/create-post'.{0,120}room|pathname: '\/create-post'.{0,120}event/s, 'Room and event card taps must not route directly to composer');

assert.match(
  boardSource,
  /const BOARD_FILTERS = \['Latest', 'Hot', 'Tickets', 'Audio', 'Events', 'Questions'\]/,
  'Board filters must be exactly Latest, Hot, Tickets, Audio, Events, Questions',
);
assert.match(boardSource, /filterBoardPosts/, 'Board detail must filter thread lists instead of using composer-type chips');
assert.match(boardSource, /Start Thread/, 'Board composer must be an explicit Start Thread action');
assert.match(boardSource, /social_post_destinations/, 'Board detail empty state must document destination-backed posting');
assert.doesNotMatch(boardSource, /BOARD_POST_TYPES|createThread\(type\.type\)|onPress=\{\(\) => createThread\(type/, 'Board filter chips must not route directly to composer');

assert.match(communityEventSource, /from\('community_events'\)/, 'Community event detail must load from community_events');
assert.match(communityEventSource, /Open Community|Open Backstage/, 'Community event detail must route back to the linked community detail');

console.log('mobile community/backstage compatibility contract verified');
