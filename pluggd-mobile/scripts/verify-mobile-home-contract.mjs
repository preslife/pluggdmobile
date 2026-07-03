import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const homeRoute = read('app/(tabs)/index.tsx');
const homeSource = read('src/features/home/live-music-dashboard-home.tsx');
const mobileHeader = read('components/MobileHeader.tsx');
const taskSheet = read('docs/PLUGGD_IOS_HOME_PAGE_TASKS_2026-05-17.md');

assert.match(homeRoute, /LiveMusicDashboardHome/, 'Home tab must use the dedicated public-front-door Home screen');

// Section names pinned to the live web home (NewHome2) mobile view copy.
for (const token of [
  "'Top bar'",
  "'Lead platform spotlight'",
  "'Today on PLUGGD'",
  "'Live now on PLUGGD'",
  "'The next wave is already here'",
  "'Explore the whole culture'",
  "'Tonight on PLUGGD'",
  "'Follow the people behind the sound'",
  "'New sounds, merch, and moments'",
  "'Progress / rewards teaser'",
]) {
  assert.match(homeSource, new RegExp(token.replace(/[()']/g, '\\$&')), `Home section order must include ${token}`);
}

const expectedOrder = [
  '<SpotlightCard',
  '<TodayOnPluggd',
  '<LiveNowPreview',
  '<CreatorsToFollow',
  '<NewInDiscover',
  '<EventsTicketCulture',
  '<CommunityActivityPreview',
  '<MarketplacePreview',
  '<ProgressRewardsTeaser',
];
let lastIndex = -1;
for (const token of expectedOrder) {
  const nextIndex = homeSource.indexOf(token);
  assert.ok(nextIndex > lastIndex, `${token} must appear in the approved Home order`);
  lastIndex = nextIndex;
}

for (const required of [
  'resolveSpotlight',
  "cta?: 'Listen' | 'Open' | 'Join Live' | 'View Event' | 'Open Soundboard'",
  'buildDiscoverItems',
  'WEB_PARITY_ASSETS',
  'HOME_HERO_FALLBACK',
  'buildMarketplaceItems',
  'loadMobilePlaylists',
  'loadFanIdentitySummary',
  'toggleProfileFollow',
  'useHomeFeed',
  'useLiveRooms',
  'useBackstage',
]) {
  assert.match(homeSource, new RegExp(required.replace(/[()]/g, '\\$&')), `${required} must be wired into Home`);
}

for (const priorityToken of [
  'const release =',
  'const mix =',
  'const soundboard =',
  "room.status === 'live'",
  'const event =',
  'const creator =',
  'const community =',
]) {
  assert.match(homeSource, new RegExp(priorityToken.replace(/[()]/g, '\\$&')), `Lead spotlight priority must include ${priorityToken}`);
}

for (const sizeToken of [
  'height: 206',
  'borderRadius: 24',
  'width: 148',
  'height: 116',
  'width: 150',
  'height: 210',
  'width: 140',
  'height: 180',
  'width: 160',
  'height: 198',
  'height: 112',
  'width: 240',
  'height: 166',
  'height: 72',
  'minHeight: 86',
  'width: 164',
  'height: 202',
  'height: 100',
]) {
  assert.match(homeSource, new RegExp(sizeToken), `Home must preserve specified component sizing token ${sizeToken}`);
}

for (const routeToken of [
  "router.push('/explore'",
  "router.push('/live'",
  "pathname: '/live/session'",
  "router.push(`/events/${event.id}`",
  "router.push('/community'",
  "router.push(item.route",
  "router.push(creator.route",
]) {
  assert.match(homeSource, new RegExp(routeToken.replace(/[/'(){}$`]/g, '\\$&')), `${routeToken} action must be wired`);
}

for (const copy of [
  'Today on PLUGGD',
  'Explore the whole culture',
  'The next wave is already here',
  'Live now on PLUGGD',
  'Tonight on PLUGGD',
  'Follow the people behind the sound',
  'New sounds, merch, and moments',
]) {
  assert.match(homeSource, new RegExp(copy), `${copy} must be present on Home`);
}

for (const token of ['search', 'notifications-none', 'account-balance-wallet']) {
  assert.match(mobileHeader, new RegExp(token), `Top bar must include ${token}`);
}
assert.match(mobileHeader, /PluggdAvatar|GlassAvatar/, 'Top bar must include a profile avatar primitive');
assert.match(mobileHeader, /height:\s*60/, 'Top bar height must stay in the 56-64pt range');
assert.match(mobileHeader, /width=\{94\}\s+height=\{24\}/, 'Home/logo chrome must use 20-24pt visual logo height');
assert.match(mobileHeader, /width:\s*44[\s\S]*height:\s*44/, 'Top bar controls must retain 44pt touch targets');

assert.doesNotMatch(
  homeSource,
  /MobileStoriesRail|SocialFeedSection|MobileSocialPostCard|ComposerEntry|create-post|Inbox|Edit profile|Creator Mode|Professional dashboard/,
  'Home must not include Stories, full feed, composer, inbox, profile editing, or creator admin modules',
);
assert.doesNotMatch(
  homeSource,
  /Fictional Track|Creator Studio Session|Vault Room Live|Northside Booth|LONDON WAREHOUSE|BASEMENT FREQUENCY|Aria Vale|Milo Static|Sol Noir|Maya Sol|Kairo Beats|Selecta Nia|Afrobeats Night|Boiler Room|Ticketmaster|Spotify|TikTok|SoundCloud|DICE|Resident Advisor/,
  'Home must not render static/fake artists, events, audio drops, viewer counts, or third-party brand names',
);
assert.match(homeSource, /ScrollView\s+horizontal/, 'Home shelves must use horizontal rails');
assert.match(homeSource, /RefreshControl/, 'Home must support pull-to-refresh for live Supabase data');
assert.doesNotMatch(homeSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

for (const checklistItem of [
  'No Stories rail.',
  'No full feed.',
  'No giant feed posts.',
  'No composer.',
  'No inbox.',
  'No profile editing.',
  'No creator admin modules.',
  'No fake metrics.',
]) {
  assert.match(taskSheet, new RegExp(checklistItem.replace(/[.]/g, '\\.')), `Task sheet must document ${checklistItem}`);
}

console.log('mobile home contract verified');
