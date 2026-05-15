import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const homeRoute = read('app/(tabs)/index.tsx');
const homeSource = read('src/features/home/live-music-dashboard-home.tsx');

assert.match(
  homeRoute,
  /LiveMusicDashboardHome/,
  'Home tab must use the dedicated Live Music Dashboard screen',
);

for (const copy of [
  'LIVE NOW ON THE STAGE',
  'EVENTS NEAR YOU',
  'GET TICKETS',
  'EXCLUSIVE AUDIO DROPS',
  'TRENDING BACKSTAGE BUZZ',
  'RECOMMENDED CREATORS',
]) {
  assert.match(homeSource, new RegExp(copy), `${copy} must be present on the dashboard`);
}

for (const hook of ['useHomeFeed', 'useLiveRooms', 'useBackstage']) {
  assert.match(homeSource, new RegExp(hook), `${hook} must power the homepage`);
}

for (const mapper of ['mapDrops', 'resolveHero', 'toTrack', 'releasePlayableUrl']) {
  assert.match(homeSource, new RegExp(mapper), `${mapper} must wire dashboard UI to real content/playback`);
}

for (const color of ['#08080C', '#12121A', '#1F1F2E', '#FF5A00', '#FF4757']) {
  assert.match(homeSource, new RegExp(color), `${color} design token must be used`);
}

assert.doesNotMatch(
  homeSource,
  /Fictional Track|Creator Studio Session|Vault Room Live|Northside Booth|LONDON WAREHOUSE|BASEMENT FREQUENCY|Aria Vale|Milo Static|Sol Noir|Maya Sol|Kairo Beats|Selecta Nia|Afrobeats Night|Boiler Room|Ticketmaster|Spotify|TikTok|SoundCloud|DICE|Resident Advisor/,
  'Home dashboard must not render static/fake artists, events, audio drops, viewer counts, or third-party brand names',
);

for (const route of ["router.push('/live'", "router.push(`/events/${event.id}`", "router.push('/backstage'", "router.push(creator.route"]) {
  assert.match(homeSource, new RegExp(route.replace(/[/'(){}$`]/g, '\\$&')), `${route} action must be wired`);
}

assert.match(homeSource, /ScrollView\s+horizontal/, 'homepage shelves must use horizontal scroll rails');
assert.match(homeSource, /RefreshControl/, 'homepage must support pull-to-refresh for live Supabase data');
assert.doesNotMatch(homeSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

console.log('mobile home contract verified');
