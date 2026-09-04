import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const destinations = read('src/features/discovery/publicDestinations.ts');
const discover = read('src/features/discovery/DiscoveryExperience.tsx');
const communitySwitcher = read('src/features/community-feed/CommunityInternalSwitcher.tsx');
const accountProfile = read('src/features/profile/my-profile-screen.tsx');
const mapsRoute = read('app/maps.tsx');
const libraryRoute = read('app/library.tsx');
const directory = read('src/features/directory/CreatorDirectoryScreen.tsx');
const directoryService = read('src/features/directory/creatorDirectoryService.ts');
const directoryRoute = read('app/directory.tsx');

for (const [id, route] of [
  ['mixes', '/mixes'],
  ['soundboards', '/soundboards'],
  ['releases', '/releases'],
  ['live', '/live'],
  ['the_plug', '/plug'],
  ['beatplug', '/market/beats'],
  ['opportunities', '/opportunities'],
  ['creators', '/directory'],
  ['community', '/community'],
  ['events', '/events'],
  ['store', '/market'],
]) {
  assert.match(destinations, new RegExp(`id: '${id}'[^\n]+route: '${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `${id} must retain its exact public route`);
}
assert.match(destinations, /CARNIVAL_HUB_DESTINATION[\s\S]*route: '\/hubs\/notting-hill-carnival-2026'/, 'Carnival must retain its exact route through the bounded seasonal fallback');
assert.doesNotMatch(destinations, /PUBLIC_DESTINATIONS[\s\S]*id: 'carnival'/, 'Carnival must not remain an unconditional permanent world');
assert.match(discover, /PUBLIC_DESTINATIONS\.map/, 'Discover must render the authoritative public destination registry');
assert.doesNotMatch(discover, /const discoveryWorlds\s*=\s*\[/, 'Discover must not retain a second hard-coded destination list');
const publicDestinationRegistry = destinations.match(/export const PUBLIC_DESTINATIONS:[\s\S]*?\] as const;/)?.[0] ?? '';
assert.doesNotMatch(publicDestinationRegistry, /id: 'maps'/, 'Maps belongs in Community and must not be promoted as a Discover world');
assert.doesNotMatch(publicDestinationRegistry, /id: 'library'/, 'Library belongs in the account menu and must not be promoted as a Discover world');
assert.match(communitySwitcher, /label: 'Maps'[\s\S]*router\.push\('\/maps'/, 'Community must retain its Maps destination and exact public route');
assert.match(mapsRoute, /MapSignalsScreen/, 'the Maps route must remain implemented');
assert.match(accountProfile, /Open library[\s\S]*go\('\/library'\)/, 'the account surface must retain the Library destination and exact public route');
assert.match(libraryRoute, /export default function LibraryScreen/, 'the Library route must remain implemented');

assert.match(directory, /label: 'Artists'/, 'the directory must expose the Artist tab');
assert.match(directory, /label: 'PLUGGD Creators'/, 'the directory must expose the PLUGGD Creator tab');
assert.match(directory, /label: 'Industry'/, 'the directory must expose the Industry tab');
assert.match(directory, /Search creators/, 'the directory must provide accessible creator search');
assert.match(directory, /All types/, 'the directory must provide creator-type filtering');
assert.match(directory, /All countries/, 'the directory must provide country filtering');
assert.match(directory, /toggleProfileFollow/, 'directory follow actions must use the real social service');
assert.match(directory, /router\.push\(item\.route/, 'directory cards must open the real creator profile route');
assert.match(directory, /RefreshControl/, 'the directory must support deliberate refresh and recovery');
assert.match(directory, /query\.isLoading[\s\S]*query\.isError[\s\S]*ListEmptyComponent/, 'the directory must retain distinct loading, error and empty states');
assert.match(directory, /width: 44[\s\S]*height: 44|minHeight: 44/, 'directory actions must preserve 44pt targets');

assert.match(directoryService, /from\('public_profiles'\)/, 'the directory must load real public creator profiles');
assert.match(directoryService, /from\('user_follows'\)/, 'the directory must derive current follow state');
assert.match(directoryService, /loadBlockedUserIds/, 'blocked accounts must be excluded from discovery');
assert.match(directoryService, /\/creator\/|\/user\//, 'directory entries must resolve to an existing native profile family');
assert.doesNotMatch(directoryService, /Math\.random|followerCount:\s*\d+/, 'the directory must not fabricate popularity data');
assert.match(directoryRoute, /CreatorDirectoryScreen/, 'the creator directory must have a dedicated native route');

console.log('PLUGGD mobile public destination and creator-directory contract verified');
