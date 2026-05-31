import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const audit = read('docs/PLUGGD_IOS_WEB_SOURCE_AUDIT_2026-05-28.md');
const plan = read('docs/superpowers/plans/2026-05-28-pluggd-ios-web-parity-rebuild.md');
const dock = read('components/PluggdDock.tsx');
const tabs = read('app/(tabs)/_layout.tsx');
const chrome = read('components/AppChrome.tsx');
const services = read('src/features/parity/appWideParityServices.ts');
const screens = read('src/features/parity/AppWideParityScreens.tsx');
const communityFeed = read('src/features/community-feed/CommunityFeedScreen.tsx');
const appCommunity = read('app/community.tsx');
const tabCommunity = read('app/(tabs)/community.tsx');
const explore = read('app/explore.tsx');
const tabExplore = read('app/(tabs)/explore.tsx');
const tabStage = read('app/(tabs)/stage.tsx');

assert.match(audit, /Home \/ Discover \/ Community \/ Events \/ Market/, 'Audit must record the web-parity mobile dock source of truth');
assert.match(plan, /Treat the web mobile dock as the native source of truth/, 'Implementation plan must declare web mobile dock source of truth');

for (const [label, route] of [
  ['Home', '/'],
  ['Discover', '/discover'],
  ['Community', '/community'],
  ['Events', '/events'],
  ['Market', '/market'],
]) {
  assert.match(dock, new RegExp(`label:\\s*'${label}'[\\s\\S]*?route:\\s*'${route.replace('/', '\\/')}'`), `Dock must expose ${label} -> ${route}`);
}
assert.doesNotMatch(dock, /label:\s*'(Explore|Create|Profile|MyPLUGGD|Backstage|Stage|Live)'/, 'Dock must not expose old native-tab or compatibility labels as primary tabs');
assert.match(chrome, /CreateActionSheet/, 'Create must be exposed through the role-aware floating action sheet');

for (const name of ['index', 'discover', 'community', 'events', 'market']) {
  assert.match(tabs, new RegExp(`name="${name}"`), `${name} must be registered as a tab route`);
}
for (const hidden of ['explore', 'create', 'profile', 'stage', 'live', 'backstage', 'my-pluggd']) {
  assert.match(tabs, new RegExp(`name="${hidden}"[\\s\\S]*href:\\s*null`), `${hidden} must remain registered but hidden from the tab bar`);
}

assert.match(services, /export async function loadCommunityParity/, 'Community must have a web-source parity loader');
for (const discoverToken of ['BeatPlug', 'Live rooms', 'Soundboards', 'Trending hashtags', 'liveRoomCard', 'beatCard']) {
  assert.match(services, new RegExp(discoverToken), `Discover parity loader must preserve web Discover content class ${discoverToken}`);
}
for (const communityToken of ['Stories and moments', 'Community prompt', 'Contests', 'Crowdfund', 'From THE PLUG', 'Community radio', 'Who to follow']) {
  assert.match(services, new RegExp(communityToken), `Community parity loader must preserve web Community module ${communityToken}`);
}
for (const marketToken of ['BeatPlug flagship', 'Releases', 'Sample packs', 'Merch', 'Services', 'Licenses', 'Creator Offers']) {
  assert.match(services, new RegExp(marketToken), `Market parity loader must preserve web Market lane ${marketToken}`);
}
assert.match(screens, /export function CommunityParityScreen/, 'Community parity screen must be exported');
assert.match(appCommunity, /CommunityFeedScreen/, 'Top-level Community route must use the feed-first Community screen');
assert.match(tabCommunity, /CommunityFeedScreen/, 'Tab Community route must use the feed-first Community screen');
assert.match(communityFeed, /MobileStoriesRail[\s\S]*CommunityComposer[\s\S]*MobileSocialPostCard/, 'Community feed must render stories, composer, and real social posts');
assert.doesNotMatch(appCommunity + tabCommunity, /CommunityParityScreen/, 'Community primary routes must not use the generic parity screen');
assert.match(explore, /ExploreParityScreen/, 'Explore route must render the primary discovery parity screen');
assert.match(tabExplore, /ExploreParityScreen/, 'Tab Explore route must render the primary discovery parity screen');
assert.match(tabStage, /Redirect[\s\S]*href="\/discover"/, 'Old Stage route must redirect to Discover');

console.log('mobile web source truth contract verified');
