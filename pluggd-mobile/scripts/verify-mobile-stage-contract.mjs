import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const stageRoute = read('app/(tabs)/stage.tsx');
const stageSource = read('src/features/stage/stage-discovery-screen.tsx');
const chromeSource = read('components/AppChrome.tsx');

assert.match(
  stageRoute,
  /StageDiscoveryScreen/,
  'Stage tab must use the dedicated premium discovery screen',
);

for (const label of [
  'STAGE',
  'For You',
  'Releases',
  'Mixes',
  'Videos',
  'Beats',
  'Challenges',
  'TRENDING NOW',
  'LIVE CREATOR SESSIONS',
  'FEATURED PRODUCER DROPS',
  'OPEN VERSE CHALLENGES',
  'RECOMMENDED CREATORS',
]) {
  assert.match(stageSource, new RegExp(label), `${label} must be present in the Stage experience`);
}

for (const hook of ['useHomeFeed', 'useLiveRooms', 'usePlayback']) {
  assert.match(stageSource, new RegExp(hook), `${hook} must power Stage with real app data and playback`);
}

for (const mapper of ['mapStageItems', 'mapCreators', 'mapChallenges', 'toTrack', 'getItemTrack']) {
  assert.match(stageSource, new RegExp(mapper), `${mapper} must wire Stage UI to Supabase content models`);
}

for (const color of ['#08080C', '#12121A', '#1F1F2E', '#FF5A00', '#FF4757']) {
  assert.match(stageSource, new RegExp(color), `${color} Stage design token must be used`);
}

for (const action of [
  "router.push('/wallet'",
  "router.push('/backstage'",
  "router.push('/search'",
  "router.push({ pathname: '/live/session'",
  'playTrack(track)',
  'toggleSave',
]) {
  assert.match(stageSource, new RegExp(action.replace(/[/'(){}]/g, '\\$&')), `${action} action must be wired`);
}

assert.match(stageSource, /ScrollView\s+horizontal/, 'Stage must use horizontal content shelves');
assert.match(stageSource, /RefreshControl/, 'Stage must support pull-to-refresh for live Supabase data');
assert.match(stageSource, /Animated\.loop/, 'Stage hero must include subtle media motion');
assert.match(stageSource, /function isPlayable\(item: StageItem\)[\s\S]*getItemTrack\(item\)/, 'Stage play CTAs must be gated by real playable URLs');
assert.match(stageSource, /Open \$\{item\.title\}/, 'Stage non-playable media CTAs must open detail routes instead of looking like dead Play buttons');
assert.match(chromeSource, /ownsHeader\s*\?\s*null\s*:\s*<MobileHeader\s*\/>/, 'Stage should own its own header');
assert.match(chromeSource, /normalized === '\/stage'/, 'Stage should be included in owned-header routes');
assert.match(chromeSource, /<MiniPlayer\s*\/>/, 'Global MiniPlayer must remain available on Stage when media is active');

assert.doesNotMatch(
  stageSource,
  /MAIN SECTION|AFTER HOURS|ELIAS THORNE|Apple Music|Spotify|TikTok|BeatStars|Boiler Room|Fictional Track|Creator Studio Session/,
  'Stage source must not hardcode mockup labels, third-party brands, or fake artist/event content',
);

assert.doesNotMatch(stageSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

console.log('mobile stage contract verified');
