import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const miniSource = read('components/MiniPlayer.tsx');
const playerSource = read('app/player.tsx');
const providerSource = read('src/context/PlaybackProvider.tsx');
const contentSource = read('src/lib/mobileContent.ts');
const releaseSource = read('app/release/[id].tsx');

assert.match(miniSource, /usePlayback/, 'mini-player must use the shared playback provider');
assert.match(miniSource, /useState\(false\)/, 'native mini-player QA fixture must be opt-in rather than visible by default');
assert.doesNotMatch(miniSource, /useState\(__DEV__\)/, 'development builds must not invent a current track');
assert.match(miniSource, /backstageRoute/, 'mini-player must include a data-driven Backstage shortcut');
assert.doesNotMatch(miniSource, /142 backstage|\\d+ backstage/, 'mini-player must not hardcode fake Backstage activity counts');
assert.match(playerSource, /usePlayback/, 'full player must use the shared playback provider');
assert.match(playerSource, /queue/, 'full player must expose queue state');
assert.match(playerSource, /sceneRoute[\s\S]*backstageRoute[\s\S]*\/community/, 'full player Scene action must use a real community destination');
assert.match(playerSource, /talkRoute[\s\S]*focus=comments[\s\S]*filter=threads/, 'full player Talk action must use comments or community threads');
assert.doesNotMatch(playerSource, /router\.push\('\/backstage'/, 'full player must not use the retired Backstage compatibility redirect');
assert.doesNotMatch(playerSource, /Download|Paid with Apple Pay|external checkout/i, 'full player must not expose unsupported digital commerce actions');
assert.match(providerSource, /isPlayableTrack[\s\S]*new URL[\s\S]*https:[\s\S]*http:[\s\S]*file:[\s\S]*content:/, 'playback provider must reject missing or malformed media URLs');
assert.match(providerSource, /const playableTracks = tracks\.filter\(isPlayableTrack\)/, 'queues must drop metadata-only entries before reaching TrackPlayer');
assert.match(contentSource, /catalogue_import_job_id[\s\S]*catalogue_mode !== 'pluggd'[\s\S]*return null/, 'catalogue metadata must never resolve to a playable release URL');
assert.match(releaseSource, /catalogue_import_job_id[\s\S]*catalogue_mode !== 'pluggd'[\s\S]*return \[\]/, 'release detail must keep imported catalogue tracks out of playback');

console.log('mobile player contract verified');
