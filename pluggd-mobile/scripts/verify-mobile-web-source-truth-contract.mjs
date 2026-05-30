import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const audit = read('docs/PLUGGD_IOS_WEB_SOURCE_AUDIT_2026-05-28.md');
const plan = read('docs/superpowers/plans/2026-05-28-pluggd-ios-web-parity-rebuild.md');
const dock = read('components/PluggdDock.tsx');
const tabs = read('app/(tabs)/_layout.tsx');
const services = read('src/features/parity/appWideParityServices.ts');
const screens = read('src/features/parity/AppWideParityScreens.tsx');
const appCommunity = read('app/community.tsx');
const tabCommunity = read('app/(tabs)/community.tsx');
const explore = read('app/explore.tsx');
const tabExplore = read('app/(tabs)/explore.tsx');
const tabStage = read('app/(tabs)/stage.tsx');

assert.match(audit, /Home \/ Discover \/ Community \/ Events \/ Market|Home \/ Explore \/ Create \/ Community \/ Profile/, 'Audit must record the mobile dock source of truth');
assert.match(plan, /Treat the web mobile dock as the native source of truth/, 'Implementation plan must declare web mobile dock source of truth');

assert.match(dock, /label:\s*'Explore'[\s\S]*route:\s*'\/explore'/, 'Dock must use Explore as the primary discovery route');
assert.match(dock, /label:\s*'Create'[\s\S]*route:\s*'\/create'/, 'Dock must expose Create as a first-class tab');
assert.match(dock, /label:\s*'Profile'[\s\S]*route:\s*'\/profile'/, 'Dock must expose Profile as a first-class tab');
assert.doesNotMatch(dock, /label:\s*'(Discover|Events|Market|MyPLUGGD|Backstage|Stage)'/, 'Dock must not expose compatibility or secondary labels as primary tabs');

for (const name of ['explore', 'create', 'community', 'profile']) {
  assert.match(tabs, new RegExp(`name="${name}"`), `${name} must be registered as a tab route`);
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
assert.match(appCommunity, /CommunityParityScreen/, 'Top-level Community route must use parity screen');
assert.match(tabCommunity, /CommunityParityScreen/, 'Tab Community route must use parity screen');
assert.match(explore, /ExploreParityScreen/, 'Explore route must render the primary discovery parity screen');
assert.match(tabExplore, /ExploreParityScreen/, 'Tab Explore route must render the primary discovery parity screen');
assert.match(tabStage, /Redirect[\s\S]*href="\/explore"/, 'Old Stage route must redirect to Explore');

console.log('mobile web source truth contract verified');
