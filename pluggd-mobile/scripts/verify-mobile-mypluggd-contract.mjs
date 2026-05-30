import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

const headerSource = read('components/MobileHeader.tsx');
const dockSource = read('components/PluggdDock.tsx');
const communityRoute = read('app/community.tsx');
const communityTabRoute = read('app/(tabs)/community.tsx');
const tabCompatibilityRoute = read('app/(tabs)/my-pluggd.tsx');
const topLevelCompatibilityRoute = exists('app/my-pluggd.tsx') ? read('app/my-pluggd.tsx') : '';
const studioData = read('src/features/studio/studio-data.ts');
const studioScreens = read('src/features/studio/StudioScreens.tsx');

assert.doesNotMatch(headerSource, /MyPLUGGD|route:\s*'\/my-pluggd'/, 'Account menu must not expose MyPLUGGD or route to it');
assert.doesNotMatch(dockSource, /label:\s*'MyPLUGGD'|route:\s*'\/my-pluggd'/, 'Dock must not expose MyPLUGGD');
assert.match(studioData, /title:\s*'My PLUGGD'/, 'Studio app catalog must expose the web-source My PLUGGD module');
assert.match(studioScreens, /Creator setup hub/, 'Native My PLUGGD must use the web-source creator setup hub framing');
assert.match(studioScreens, /My PLUGGD status/, 'Native My PLUGGD must include the web-source readiness card');
assert.match(studioScreens, /setup areas ready/, 'Native My PLUGGD must show setup-area readiness');
for (const label of ['Overview', 'Profile', 'Page', 'Card', 'Embeds', 'Settings']) {
  assert.match(studioScreens, new RegExp(`label:\\s*'${label}'|>${label}<|${label}`), `Native My PLUGGD must include the ${label} section chip`);
}
assert.match(studioScreens, /Identity, page, share tools, and settings in one compact setup surface\./, 'Native My PLUGGD hero copy must match the current mobile web model');
assert.match(studioScreens, /<Text style=\{styles\.studioBrandTitle\} numberOfLines=\{1\}>STUDIO<\/Text>/, 'Studio topbar must stay branded as STUDIO, not shrink page titles into the nav');
assert.match(communityRoute, /CommunityParityScreen/, 'Top-level Community must own the social/culture surface');
assert.match(communityTabRoute, /CommunityParityScreen/, 'Tab Community must own the social/culture surface');
assert.match(tabCompatibilityRoute, /Redirect[\s\S]*href="\/profile"/, 'Old tab MyPLUGGD route must redirect to Profile');
assert.match(topLevelCompatibilityRoute, /Redirect[\s\S]*href="\/profile"/, 'Old top-level MyPLUGGD route must redirect to Profile');

console.log('mobile My PLUGGD web-source contract verified');
