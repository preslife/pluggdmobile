import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const cultureSource = read('src/features/culture/CultureScreens.tsx');
const dataSource = read('src/features/culture/useCultureData.ts');
const serviceSource = read('src/features/culture/mobileServices.ts');
const typeSource = read('src/features/culture/mobileTypes.ts');
const dataAndServiceSource = `${dataSource}\n${serviceSource}`;
const dataAndTypeSource = `${dataSource}\n${typeSource}`;
const tokenSource = read('src/design/tokens.ts');
const mobileContentSource = read('src/lib/mobileContent.ts');
const mobileNavigationSource = read('src/lib/mobileNavigation.ts');
const skeletonSource = read('src/components/PremiumSkeleton.tsx');
const imageSource = read('src/components/PluggdImage.tsx');
const primaryScreenSources = [
  read('src/features/home/live-music-dashboard-home.tsx'),
  read('src/features/stage/stage-discovery-screen.tsx'),
  read('src/features/live/live-culture-screen.tsx'),
  read('src/features/backstage/backstage-world-screen.tsx'),
  read('src/features/search/search-discovery-screen.tsx'),
];

for (const hook of ['useHomeFeed', 'useStageContent', 'useLiveRooms', 'useBackstage', 'useUniversalSearch', 'useEventLayer']) {
  assert.match(dataSource, new RegExp(`function ${hook}|export function ${hook}`), `${hook} must exist`);
}

for (const typeName of ['CultureTabKey', 'StageMediaItem', 'LiveRoomItem', 'BackstageCommunity', 'BackstageThread']) {
  assert.match(dataAndTypeSource, new RegExp(`type ${typeName}|export type ${typeName}`), `${typeName} must exist`);
}

for (const table of ["from('events')", "from('releases')", "from('profiles')", "from('hubs')", "from('view_hub_threads')", "from('session_rooms')", "from('live_sessions')", "from('beats')"]) {
  assert.match(dataAndServiceSource, new RegExp(table.replace(/[()']/g, '\\$&')), `${table} must be part of the current mobile data map`);
}

assert.doesNotMatch(dataAndServiceSource, /from\('creator_communities'\)|from\('community_threads'\)/, 'mobile Backstage must use current hubs/thread sources instead of old guessed community table names');

for (const screenName of ['HomeScreen', 'StageScreen', 'LiveScreen', 'BackstageScreen', 'SearchScreen', 'CreatorModeScreen', 'TicketsScreen']) {
  assert.match(cultureSource, new RegExp(`function ${screenName}|export function ${screenName}`), `${screenName} must exist`);
}

assert.match(cultureSource, /EventCultureCard/, 'events must be reusable across culture surfaces');
assert.match(cultureSource, /ReleaseEmbed/, 'music embeds must be playable from feed/search surfaces');
assert.match(cultureSource, /playTrack/, 'culture screens must use the global playback provider');
for (const source of [tokenSource, mobileContentSource, mobileNavigationSource, cultureSource]) {
  assert.doesNotMatch(source, /#00FF88|PLUGGD_ORANGE = '#00FF88'|const ORANGE = VIOLET/, 'PLUGGD primary accent must stay orange-first, not legacy emerald/violet');
}
assert.match(skeletonSource, /accessibilityRole="progressbar"/, 'premium skeletons must expose loading semantics');
assert.match(skeletonSource, /Animated\.loop/, 'premium skeletons must use native animated loading motion');
assert.match(imageSource, /cache:\s*'force-cache'/, 'PLUGGD image wrapper must use native cache hints');
assert.match(imageSource, /Animated\.timing\(opacity,\s*\{\s*toValue:\s*1,\s*duration:\s*200/, 'PLUGGD image wrapper must fade media in over 200ms');
for (const source of primaryScreenSources) {
  assert.match(source, /PremiumSkeleton/, 'primary Home/Stage/Live/Backstage/Search screens must use premium skeleton loaders instead of spinner-only loading blocks');
  assert.match(source, /PluggdImage/, 'primary Home/Stage/Live/Backstage/Search screens must use the cached fade-in image wrapper');
}
assert.doesNotMatch(cultureSource, /dummy|lorem|fake|mock|Maya Sol|Kairo Beats|Selecta Nia/i, 'culture shell must not ship fake/demo data');

console.log('mobile culture contract verified');
