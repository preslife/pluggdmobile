import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const homeRoute = read('app/(tabs)/index.tsx');
const home = read('src/features/home/MusicDiscoveryHome.tsx');
const model = read('src/features/discovery/discoveryModel.ts');
const chrome = read('components/AppChrome.tsx');
const content = read('src/lib/mobileContent.ts');
const releaseFloor = read('src/features/editorial/ListeningFloorScreen.tsx');
const search = read('src/features/culture/useCultureData.ts');

assert.match(homeRoute, /MusicDiscoveryHome/, 'Home tab must use the mobile discovery-first Home');
for (const token of ['The Daily Plug', 'Four worth your time', 'From the scenes', 'Mixes in rotation', 'New releases', 'Soundboards', 'Featured event', 'Live now on PLUGGD', 'Drops & tools', 'Backstage communities', 'Creators to know', 'featuredPlayBadge', 'featuredActionLabel']) {
  assert.match(home, new RegExp(token), `Home must include ${token}`);
}
assert.match(home, /buildBalancedHomePicks\(items, featured\?\.id\)/, 'Home must deliberately balance the four compact choices');
assert.match(home, /playQueue/, 'Home music choices must start the shared playback queue');
assert.match(home, /minHeight: 44/, 'Home primary controls must preserve 44pt touch targets');
assert.doesNotMatch(home, /Playfair|edFonts\.serif|Marketing|Join the movement/, 'Home must use the chosen modern grotesk discovery voice');
for (const token of ['DiscoveryItem', 'playableUrl', 'destinationRoute', 'discoveryReason', 'supportRoute', 'PluggdTrack']) {
  assert.match(model, new RegExp(token), `unified discovery model must include ${token}`);
}
assert.match(model, /releasePlayableUrl/, 'release playback must keep the existing safe URL resolver');
assert.match(model, /item\.tagged_url \|\| item\.audio_url/, 'beat discovery must prefer the iOS-safe tagged preview over the master WAV');
assert.match(model, /for \(const kind of \['release', 'mix', 'beat'\]/, 'Home picks must span releases, mixes, and beats when available');
assert.match(chrome, /normalized === '\/'[\s\S]*normalized === '\/discover'/, 'Home and Discover must own their compact discovery header');
for (const source of [content, releaseFloor, search]) {
  assert.match(source, /\.eq\('approved', true\)/, 'public release surfaces must require editorial approval');
  assert.match(source, /\.eq\('status', 'live'\)/, 'public release surfaces must require a live release');
  assert.match(source, /\.eq\('catalogue_mode', 'pluggd'\)/, 'public release surfaces must exclude metadata-only catalogue imports');
  assert.match(source, /\.eq\('visibility_status', 'visible'\)/, 'public release surfaces must respect release visibility');
  assert.match(source, /\.order\('release_date'/, 'public release surfaces must sort by the actual release date');
}

const discover = read('src/features/discovery/MusicDiscoveryDiscover.tsx');
for (const token of ['Start somewhere unexpected', 'SignalTile', 'WorldGateway', 'worldImage', 'Soundboards', 'SCENE DIAL', 'RELEASE RADAR', 'PLUGGD CHART', 'Creator market']) {
  assert.match(discover, new RegExp(token), `Discover must preserve the visual exploration module ${token}`);
}
assert.doesNotMatch(discover, /Fresh signals[\s\S]*items\.slice\(0, 10\)/, 'Discover must not regress to a generic ranked list as its primary experience');

const events = read('src/features/editorial/EventsBoardScreen.tsx');
for (const token of ['Go where the sound is.', 'EventSpotlight', 'UpcomingPosterRail', 'BrowseFastList', 'FullEventCards', 'Open Opportunities', 'For Promoters']) {
  assert.match(events, new RegExp(token), `Events must preserve and redesign ${token}`);
}

const mixes = read('src/features/editorial/MixesWorldScreen.tsx');
for (const token of ['Mix of week', 'Find your next mix', 'Listening rooms', 'Rising DJs', 'Scene explorer', 'PLUGGD radio', 'Upcoming events']) {
  assert.match(mixes, new RegExp(token), `Mixes must preserve ${token}`);
}

const soundboards = read('src/features/editorial/SoundboardsIndexScreen.tsx');
for (const token of ['Ideas grow in public.', 'CREATOR SKETCHBOOKS', 'Search titles, creators, vibes', 'Trending', 'Featured']) {
  assert.match(soundboards, new RegExp(token), `Soundboards must preserve ${token}`);
}

console.log('mobile discovery Home contract verified');
