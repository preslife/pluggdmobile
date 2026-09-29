import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const miniSource = read('components/MiniPlayer.tsx');
const playerSource = read('app/player.tsx');
const providerSource = read('src/context/PlaybackProvider.tsx');
const resolverSource = read('src/features/playback/resolvePlaybackSource.ts');
const appConfigSource = read('app.config.ts');
const iosInfoSource = read('ios/Pluggd/Info.plist');
const playbackServiceSource = read('src/lib/playback-service.ts');
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
assert.match(providerSource, /resolvePlaybackSource\(track\)/, 'single-track and queue playback must resolve protected sources first');
assert.match(providerSource, /resolved\.filter\(isPlayableTrack\)/, 'queues must validate resolved URLs before reaching TrackPlayer');
assert.match(resolverSource, /contentType: 'beat'|contentType: 'mix'/, 'protected audio must use a content identity');
assert.match(resolverSource, /functions\.invoke\('resolve-playback-url'/, 'protected previews must use the server playback signer');
assert.doesNotMatch(resolverSource, /storage\.from\('beat-license-files'\)/, 'native must never sign a paid Beat file path directly');
assert.match(providerSource, /playQueue: \(tracks: PluggdTrack\[\], startIndex\?: number\) => Promise<PluggdTrack \| null>/, 'queue replacement must return the actual native active track for caller verification');
assert.match(providerSource, /await TrackPlayer\.play\(\);[\s\S]*?await syncQueue\(\);[\s\S]*?TrackPlayer\.getActiveTrack\(\)/, 'queue replacement must synchronise and confirm native playback before resolving');
assert.match(providerSource, /playTrack: \(track: PluggdTrack\) => Promise<PluggdTrack \| null>/, 'single-track playback must return the actual native active track for caller verification');
assert.match(appConfigSource, /UIBackgroundModes:\s*\['audio'\]/, 'Expo iOS configuration must declare music background audio');
assert.match(iosInfoSource, /<key>UIBackgroundModes<\/key>[\s\S]*?<string>audio<\/string>/, 'checked-in native iOS configuration must declare music background audio');
assert.match(providerSource, /iosCategory:\s*IOSCategory\.Playback/, 'TrackPlayer must use the iOS music playback audio-session category');
assert.match(providerSource, /autoHandleInterruptions:\s*true/, 'TrackPlayer must handle native audio interruptions without app-state teardown');
assert.doesNotMatch(providerSource, /AppState[\s\S]{0,500}(pause|reset)|(?:pause|reset)[\s\S]{0,500}AppState/, 'background app-state changes must not pause or reset the music queue');
for (const remoteEvent of ['RemotePlay', 'RemotePause', 'RemoteStop', 'RemoteNext', 'RemotePrevious', 'RemoteSeek']) {
  assert.match(playbackServiceSource, new RegExp(`Event\\.${remoteEvent}`), `background playback service must retain ${remoteEvent}`);
}
assert.match(contentSource, /catalogue_import_job_id[\s\S]*catalogue_mode !== 'pluggd'[\s\S]*return null/, 'catalogue metadata must never resolve to a playable release URL');
assert.match(releaseSource, /catalogue_import_job_id[\s\S]*catalogue_mode !== 'pluggd'[\s\S]*return \[\]/, 'release detail must keep imported catalogue tracks out of playback');

console.log('mobile player contract verified');
