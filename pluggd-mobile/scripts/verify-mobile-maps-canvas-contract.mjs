import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const route = read('app/maps.tsx');
const screen = read('src/features/maps/MapSignalsScreen.tsx');
const service = read('src/features/maps/mapSignalsService.ts');
const chrome = read('src/lib/appChromeVisibility.ts');

assert.match(route, /MapSignalsScreen/, 'Maps route must render the native canvas');
assert.doesNotMatch(route, /ParityScaffold/, 'Maps route must not retain the stacked parity scaffold');
assert.match(screen, /@rnmapbox\/maps/, 'Maps must use the installed native Mapbox runtime');
assert.match(screen, /StyleSheet\.absoluteFill/, 'Mapbox canvas must fill the route');
assert.match(screen, /clusterRadius=\{48\}/, 'dense signals must cluster on the canvas');
assert.match(screen, /signal-live-pulse/, 'live movement must have a map pulse layer');
assert.match(screen, /Search scene signals/, 'Maps must expose search');
assert.match(screen, /ACTIVITY_FILTERS[\s\S]*MOOD_FILTERS/, 'Maps must expose activity and mood discovery filters');
assert.match(screen, /Show accessible signal list/, 'Maps must expose an accessible list alternative');
assert.match(screen, /accessibilityLabel="Locate me"[\s\S]*onPress=\{\(\) => void locateMe\(\)\}/, 'location permission must be initiated by an explicit Locate me action');
assert.match(screen, /showUserLocation \? \([\s\S]*<UserLocation/, 'user location must stay hidden until explicitly requested');
assert.match(screen, /selectedSheet[\s\S]*Tune In[\s\S]*Like signal[\s\S]*Directions to/, 'selected signals must expose Tune In, like and directions actions');
assert.match(screen, /mutationFn: createAndPublishMapSignal/, 'signal creation must use the canonical create-and-publish service');
assert.match(screen, /Create a signal[\s\S]*Publish signal/, 'signed-in users must have a native signal composer');
assert.match(screen, /loadSavedCarnivalRoute[\s\S]*carnival-route-line/, 'saved Carnival routes must render as a map overlay');
assert.match(screen, /refetchInterval: 30_000/, 'live movement must refresh without a manual reload');
assert.match(screen, /Map canvas unavailable[\s\S]*Open signal list/, 'map failure must retain a usable list fallback');
assert.match(screen, /width: 44[\s\S]*height: 44/, 'Maps controls must preserve 44pt targets');

for (const rpc of ['get_public_map_signals', 'tune_in_map_signal', 'toggle_map_signal_like', 'create_map_signal', 'publish_map_signal']) {
  assert.ok(service.includes(`rpc('${rpc}'`), `Maps must reuse canonical RPC ${rpc}`);
}
assert.doesNotMatch(service, /\.from\(['"]map_signals['"]\)/, 'Maps must not bypass the public-safe RPC contract');
assert.match(chrome, /['"]\/maps['"]/, 'Maps must own its header without duplicating shared top chrome');

console.log('PLUGGD mobile full-screen Maps canvas contract verified');
