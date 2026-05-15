import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const liveRoute = read('app/(tabs)/live/index.tsx');
const liveSource = read('src/features/live/live-culture-screen.tsx');
const liveSessionSource = read('src/screens/LiveSessionScreen.tsx');
const chromeSource = read('components/AppChrome.tsx');

assert.match(liveRoute, /LiveCultureScreen/, 'Live tab must use the dedicated premium Live screen');

for (const label of [
  'LIVE',
  'Live Now',
  'Upcoming',
  'Replays',
  'Community Rooms',
  'LIVE NOW',
  'UPCOMING LIVE EVENTS',
  'COMMUNITY LIVE ROOMS',
  'REPLAYS + CLIPS',
  'FEATURED LIVE CREATORS',
]) {
  assert.match(liveSource, new RegExp(label.replace(/\+/g, '\\+')), `${label} must be present in the Live experience`);
}

for (const hook of ['useLiveRooms', 'useEventLayer', 'useBackstage', 'useHomeFeed', 'usePlayback']) {
  assert.match(liveSource, new RegExp(hook), `${hook} must power Live with real app data`);
}

for (const mapper of ['pickHero', 'mapCreators', 'replayTrack', 'eventCountdown']) {
  assert.match(liveSource, new RegExp(mapper), `${mapper} must wire Live UI to backend models`);
}

for (const color of ['#08080C', '#12121A', '#1F1F2E', '#FF5A00', '#FF4757']) {
  assert.match(liveSource, new RegExp(color), `${color} Live design token must be used`);
}

for (const action of [
  "go('/notifications'",
  "go('/wallet'",
  "router.push('/backstage'",
  "router.push({ pathname: '/live/session'",
  'playTrack(track)',
  'setEventReminder',
  'setScheduledSessionReminder',
  'loadReminderState',
  'toggleProfileFollow',
  'openLiveRoom',
  'toggleFollow',
]) {
  assert.match(liveSource, new RegExp(action.replace(/[/'(){}]/g, '\\$&')), `${action} action must be wired`);
}

for (const action of ['reportLiveRoom', 'Report live room?', 'Report submitted', 'flag']) {
  assert.match(liveSessionSource, new RegExp(action.replace(/[?'()]/g, '\\$&')), `${action} live-session moderation action must be wired`);
}

assert.match(liveSource, /ScrollView\s+horizontal/, 'Live must use horizontal shelves');
assert.match(liveSource, /RefreshControl/, 'Live must support pull-to-refresh for live Supabase data');
assert.match(liveSource, /Animated\.loop/, 'Live hero must include subtle media motion');
assert.match(chromeSource, /normalized === '\/live'/, 'Live should own its own header');
assert.match(chromeSource, /<MiniPlayer\s*\/>/, 'Global MiniPlayer must remain available on Live when media is active');

assert.doesNotMatch(
  liveSource,
  /SECTION 1|SECTION 2|SECTION 3|SECTION 4|SECTION 5|SECTION 6|ELIAS THORNE|12\.4K|LIVE FROM THE UNDERGROUND|Cookup Session|Open Verse Feedback|Studio Breakdown|Listening Party|Live DJ Set|Warehouse Livestream|Producer Lounge|Fictional/,
  'Live source must not hardcode mockup labels or fake creator/session content',
);

assert.doesNotMatch(liveSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

console.log('mobile live contract verified');
