import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const liveRoute = read('app/(tabs)/live/index.tsx');
const liveSource = read('src/features/live/live-culture-screen.tsx');
const liveFeedSource = read('app/live/feed.tsx');
const liveSessionSource = read('src/screens/LiveSessionScreen.tsx');
const services = read('src/features/culture/mobileServices.ts');
const chromeSource = read('components/AppChrome.tsx');

assert.match(liveRoute, /LiveCultureScreen/, 'Live tab must use the dedicated premium Live screen');
assert.ok(existsSync(new URL('../app/live/feed.tsx', import.meta.url)), 'Live swipe feed route must exist');

assert.match(
  liveSource,
  /const FILTERS = \['Live Now', 'Upcoming', 'Rooms', 'Listening Parties', 'Replays'\] as const/,
  'Live filters must exactly match the approved order',
);

for (const label of [
  'LIVE',
  'LIVE NOW',
  'Swipe live rooms',
  'Open Live Feed',
  'UPCOMING LIVE SESSIONS',
  'COMMUNITY ROOMS',
  'LISTENING PARTIES',
  'STUDIO / COOK-UP SESSIONS',
  'EVENT-LINKED LIVE SESSIONS',
  'REPLAYS + CLIPS',
  'FEATURED LIVE CREATORS',
  'No one is live right now',
  'Nothing scheduled yet',
]) {
  assert.match(liveSource, new RegExp(label.replace(/[+]/g, '\\+')), `${label} must be present in the Live experience`);
}

for (const hook of ['useLiveRooms', 'useEventLayer', 'useBackstage', 'useHomeFeed', 'usePlayback']) {
  assert.match(liveSource, new RegExp(hook), `${hook} must power Live with real app data`);
}

for (const mapper of [
  'isRealLiveRoom',
  'isReplayRoom',
  'isUpcomingRoom',
  'isCommunityRoom',
  'isListeningParty',
  'isStudioSession',
  'isEventLinkedLive',
  'pickFocus',
  'mapCreators',
  'replayTrack',
  'eventCountdown',
]) {
  assert.match(liveSource, new RegExp(mapper), `${mapper} must wire Live UI to backend models`);
}

for (const color of ['#08080C', '#12121A', '#1F1F2E', '#FF5A00', '#FF4757']) {
  assert.match(liveSource, new RegExp(color), `${color} Live design token must be used`);
}

for (const action of [
  "go('/notifications'",
  "router.push('/search'",
  "router.push('/live/feed'",
  "router.push({ pathname: '/live/session'",
  "router.push(`/backstage/${source.room.backstage_id}`",
  'playback.playTrack(track)',
  'setEventReminder',
  'setScheduledSessionReminder',
  'loadReminderState',
  'toggleProfileFollow',
  'openRoom',
  'toggleFollow',
]) {
  assert.match(liveSource, new RegExp(action.replace(/[/'(){}$.[\]`]/g, '\\$&')), `${action} action must be wired`);
}

for (const token of [
  "from('session_rooms')",
  "from('live_sessions')",
  "from('community_collab_rooms')",
  "from('session_messages')",
  'loadLiveRoomMessagePreview',
  'creator_username',
]) {
  assert.match(services, new RegExp(token.replace(/[()']/g, '\\$&')), `${token} must back the Live data layer`);
}

for (const token of [
  'loadLiveRoomMessagePreview',
  'PanResponder',
  'live swipe feed',
  'Join Live Room',
  "router.push({ pathname: '/live/session'",
  'No active live rooms',
]) {
  assert.match(liveFeedSource, new RegExp(token.replace(/[()']/g, '\\$&')), `${token} must be wired in the full-screen Live Feed`);
}

for (const action of ['reportLiveRoom', 'Report live room?', 'Report submitted', 'flag']) {
  assert.match(liveSessionSource, new RegExp(action.replace(/[?'()]/g, '\\$&')), `${action} live-session moderation action must be wired`);
}

for (const token of [
  "rpc('update_live_runtime_preferences'",
  "functions.invoke('live-runtime-ops'",
  "rpc('withdraw_live_stage_request'",
  "rpc('remove_live_stage_participant'",
  'start_recording',
  'stop_recording',
  'start_restream',
  'stop_restream',
  'Host controls',
]) {
  assert.match(liveSessionSource, new RegExp(token.replace(/[()']/g, '\\$&')), `${token} must be wired for mobile Live host/runtime parity`);
}

assert.match(liveSource, /ScrollView\s+horizontal/, 'Live must use horizontal shelves');
assert.match(liveSource, /RefreshControl/, 'Live must support pull-to-refresh for live Supabase data');
assert.match(liveSource, /Animated\.loop/, 'Live focus card must include subtle media motion');
assert.match(chromeSource, /normalized === '\/live'/, 'Live should own its own header');
assert.match(chromeSource, /<MiniPlayer\s*\/>/, 'Global MiniPlayer must remain available on Live when media is active');

assert.doesNotMatch(liveSource, /go\('\/wallet'|account-balance-wallet|Open wallet/, 'Live top bar must not include Wallet');
assert.doesNotMatch(liveSource, /MobileStoriesRail|MobileSocialPostCard|CompactComposer|ComposerEntry|full social feed|stories rail/, 'Live must not include social feed, stories or composer UI');
assert.doesNotMatch(liveSource, /creator dashboard|Creator Mode|admin dashboard/i, 'Live must not expose creator admin dashboard UI');
assert.doesNotMatch(
  liveSource,
  /SECTION 1|SECTION 2|SECTION 3|SECTION 4|SECTION 5|SECTION 6|ELIAS THORNE|12\.4K|LIVE FROM THE UNDERGROUND|Cookup Session|Open Verse Feedback|Studio Breakdown|Listening Party|Live DJ Set|Warehouse Livestream|Producer Lounge|Fictional/,
  'Live source must not hardcode mockup labels or fake creator/session content',
);

assert.doesNotMatch(liveSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

console.log('mobile live contract verified');
