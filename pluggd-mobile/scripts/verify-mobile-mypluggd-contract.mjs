import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

const headerSource = read('components/AccountMenuButton.tsx');
const discoveryHeader = read('src/features/discovery/DiscoveryHeader.tsx');
const dockSource = read('components/PluggdDock.tsx');
const communityRoute = read('app/community.tsx');
const communityTabRoute = read('app/(tabs)/community.tsx');
const communityFeed = read('src/features/community-feed/CommunityFeedScreen.tsx');
const tabFanRoute = read('app/(tabs)/my-pluggd.tsx');
const topLevelFanRoute = exists('app/my-pluggd.tsx') ? read('app/my-pluggd.tsx') : '';
const fanHub = read('src/features/mypluggd/my-pluggd-screen.tsx');
const studioData = read('src/features/studio/studio-data.ts');
const studioScreens = read('src/features/studio/StudioScreens.tsx');

assert.match(headerSource, /label:\s*'My PLUGGD'[\s\S]*route:\s*'\/my-pluggd'/, 'Fan account menu must expose My PLUGGD');
assert.match(discoveryHeader, /AccountMenuButton/, 'Public discovery avatars must open the account menu directly');
assert.doesNotMatch(discoveryHeader, /router\.push\('\/my-pluggd'/, 'Public discovery avatars must not detour through My PLUGGD');
assert.doesNotMatch(dockSource, /label:\s*'MyPLUGGD'|route:\s*'\/my-pluggd'/, 'Dock must not expose MyPLUGGD');
assert.match(tabFanRoute, /MyPluggdScreen/, 'Tab My PLUGGD route must render the fan hub');
assert.match(topLevelFanRoute, /MyPluggdScreen/, 'Top-level My PLUGGD route must render the fan hub');
for (const label of ['Feed', 'Circles', 'Library', 'Activity']) {
  assert.match(fanHub, new RegExp(`'${label}'|>${label}<|${label}`), `Fan My PLUGGD must include the ${label} area`);
}
for (const fanCollection of ['Recently Played', 'My Playlists', 'Saved Music', 'Saved Events', 'Tickets', 'Purchases / Unlocks']) {
  assert.match(fanHub, new RegExp(fanCollection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Fan My PLUGGD must expose ${fanCollection}`);
}
assert.match(studioData, /title:\s*'My PLUGGD'/, 'Studio app catalog must expose the web-source My PLUGGD module');
assert.match(studioScreens, /Creator setup hub/, 'Native My PLUGGD must use the web-source creator setup hub framing');
assert.match(studioScreens, /My PLUGGD status/, 'Native My PLUGGD must include the web-source readiness card');
assert.match(studioScreens, /setup areas ready/, 'Native My PLUGGD must show setup-area readiness');
for (const label of ['Overview', 'Profile', 'Page', 'Card', 'Embeds', 'Settings']) {
  assert.match(studioScreens, new RegExp(`label:\\s*'${label}'|>${label}<|${label}`), `Native My PLUGGD must include the ${label} section chip`);
}
assert.match(studioScreens, /Identity, page, share tools, and settings in one compact setup surface\./, 'Native My PLUGGD hero copy must match the current mobile web model');
assert.match(studioScreens, /<Text style=\{styles\.studioBrandTitle\} numberOfLines=\{1\}>STUDIO<\/Text>/, 'Studio topbar must stay branded as STUDIO, not shrink page titles into the nav');
assert.match(communityRoute, /CommunityFeedScreen/, 'Top-level Community must own the social/culture feed surface');
assert.match(communityTabRoute, /CommunityFeedScreen/, 'Tab Community must own the social/culture feed surface');
assert.match(communityFeed, /CommunityComposer[\s\S]*MobileSocialPostCard|MobileSocialPostCard[\s\S]*CommunityComposer/, 'Community must expose the real feed and composer');
assert.doesNotMatch(communityRoute + communityTabRoute, /CommunityParityScreen/, 'Community primary routes must not use the generic parity screen');
assert.match(fanHub, /AccountMenuButton/, 'My PLUGGD must reuse the canonical role-aware account menu');
assert.doesNotMatch(fanHub, /Creator Mode[\s\S]*\/creator-mode/, 'My PLUGGD must not expose an unconditional creator shortcut to fans');

console.log('mobile fan and creator My PLUGGD contract verified');
