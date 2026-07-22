import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const homeRoute = read('app/(tabs)/index.tsx');
const home = read('src/features/home/MusicDiscoveryHome.tsx');
const model = read('src/features/discovery/discoveryModel.ts');
const chrome = read('components/AppChrome.tsx');

assert.match(homeRoute, /MusicDiscoveryHome/, 'Home tab must use the mobile discovery-first Home');
for (const token of ['The Daily Plug', 'Four worth your time', 'From the scenes', 'featuredPlayBadge', 'Support this release']) {
  assert.match(home, new RegExp(token), `Home must include ${token}`);
}
assert.match(home, /items\.slice\(1, 5\)/, 'Home must expose four compact choices immediately after the daily pick');
assert.match(home, /playQueue/, 'Home music choices must start the shared playback queue');
assert.match(home, /minHeight: 44/, 'Home primary controls must preserve 44pt touch targets');
assert.doesNotMatch(home, /Playfair|edFonts\.serif|Marketing|Join the movement/, 'Home must use the chosen modern grotesk discovery voice');
for (const token of ['DiscoveryItem', 'playableUrl', 'destinationRoute', 'discoveryReason', 'supportRoute', 'PluggdTrack']) {
  assert.match(model, new RegExp(token), `unified discovery model must include ${token}`);
}
assert.match(model, /releasePlayableUrl/, 'release playback must keep the existing safe URL resolver');
assert.match(chrome, /normalized === '\/'[\s\S]*normalized === '\/discover'/, 'Home and Discover must own their compact discovery header');

console.log('mobile discovery Home contract verified');
