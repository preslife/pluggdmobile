import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const homeRoute = read('app/(tabs)/index.tsx');
const homeSource = read('src/features/home/live-music-dashboard-home.tsx');
const mobileHeader = read('components/MobileHeader.tsx');
const taskSheet = read('docs/PLUGGD_IOS_HOME_PAGE_TASKS_2026-05-17.md');

assert.match(homeRoute, /LiveMusicDashboardHome/, 'Home tab must use the dedicated public-front-door Home screen');

// Section names pinned to the live web home (NewHome2) mobile view, top to bottom.
for (const token of [
  "'Top bar'",
  "'Hero / edition masthead'",
  "'Realtime ticker'",
  "'Live now on PLUGGD'",
  "'The next wave is already here'",
  "'Featured story'",
  "'Explore your scene'",
  "'Soundboards'",
  "'Tonight on PLUGGD'",
  "'Drops / Marketplace'",
  "'Backstage / Communities'",
  "'Build your world'",
  "'Platform pulse'",
  "'Embody the culture'",
]) {
  assert.match(homeSource, new RegExp(token.replace(/[()'/]/g, '\\$&')), `Home section order must include ${token}`);
}

// Rendered component order must follow the web home top-to-bottom.
const expectedOrder = [
  '<HomeHero',
  '<LiveTicker',
  '<LiveNowOnPluggd',
  '<NextWave',
  '<FeaturedStory',
  '<ExploreYourScene',
  '<SoundboardsBoard',
  '<TonightOnPluggd',
  '<DropsMarketplace',
  '<BackstageCommunities',
  '<BuildYourWorldSection',
  '<PlatformPulse',
  '<EmbodyCulture',
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
  'buildSceneCircuits',
  'buildMarketplaceItems',
  'WEB_PARITY_ASSETS',
  'HOME_HERO_FALLBACK',
  'loadSoundboardItemDetails',
  "from('blog_posts')",
  'useHomeFeed',
  'useLiveRooms',
  'useBackstage',
]) {
  assert.match(homeSource, new RegExp(required.replace(/[()|?']/g, '\\$&')), `${required} must be wired into Home`);
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

// Editorial system pins — Instrument Serif display voice, cream/night rhythm,
// torn paper joins, paper ticker band (the pluggd.fm public visual system).
for (const token of [
  'edFonts.serif',
  'TornEdge',
  'variant="paper"',
  'ed.paper2',
  'ed.night',
  'SerifTitle',
  'Eyebrow',
]) {
  assert.match(homeSource, new RegExp(token.replace(/["=.]/g, '\\$&')), `Home must keep the editorial visual system token ${token}`);
}

for (const sizeToken of [
  'minHeight: 560',
  'width: 172',
  'width: 280',
  'height: 190',
  'minHeight: 320',
  'minHeight: 210',
  'minHeight: 168',
  'width: 52',
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
  "router.push(circuit.route",
  "router.push('/market'",
  "router.push('/events'",
]) {
  assert.match(homeSource, new RegExp(routeToken.replace(/[/'(){}$`]/g, '\\$&')), `${routeToken} action must be wired`);
}

// Copy pinned to the web home voice (en-GB locale of the live site).
for (const copy of [
  'Where music culture',
  'Authentic. Unfiltered. The heartbeat of the scene.',
  'Live now on PLUGGD',
  'No live rooms open right now. See what is coming up.',
  'The next wave is already here',
  'Meet the artists, producers, collectives, and scenes shaping what comes next.',
  'Find the rooms, crews, and sounds moving around you.',
  'Raw ideas, references, comments, and audio sketches from creators building in public.',
  'Tonight on PLUGGD',
  'Listening parties, release nights, showcases, pop-ups, and live rooms from the underground.',
  'New sounds, merch, tickets, and moments before they disappear.',
  'Follow the people behind the sound.',
  'Build your world',
  'Run listening parties, collaborations, rights, and revenue without losing the culture around them.',
  'What is moving right now',
  'Join the rooms where music starts, follow the scenes before they break, and build your world on PLUGGD.',
]) {
  assert.match(homeSource, new RegExp(copy.replace(/[.,]/g, '\\$&')), `${copy} must be present on Home`);
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
