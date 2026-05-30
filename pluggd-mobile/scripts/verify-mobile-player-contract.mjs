import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const miniSource = read('components/MiniPlayer.tsx');
const playerSource = read('app/player.tsx');

assert.match(miniSource, /usePlayback/, 'mini-player must use the shared playback provider');
assert.match(miniSource, /backstageRoute/, 'mini-player must include a data-driven Backstage shortcut');
assert.doesNotMatch(miniSource, /142 backstage|\\d+ backstage/, 'mini-player must not hardcode fake Backstage activity counts');
assert.match(playerSource, /usePlayback/, 'full player must use the shared playback provider');
assert.match(playerSource, /queue/, 'full player must expose queue state');
assert.match(playerSource, /\/backstage/, 'full player must connect playback to Backstage/community');
assert.doesNotMatch(playerSource, /Download|Paid with Apple Pay|external checkout/i, 'full player must not expose unsupported digital commerce actions');

console.log('mobile player contract verified');
