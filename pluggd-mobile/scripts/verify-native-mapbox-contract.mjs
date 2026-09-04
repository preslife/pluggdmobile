import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const appConfigSource = read('app.config.ts');
const androidMapSource = read('components/EventsMap.android.tsx');
const iosMapSource = read('components/EventsMap.native.tsx');
const webMapSource = read('components/EventsMap.tsx');
const mapboxSource = read('src/lib/mapbox.ts');
const mapboxPluginSource = read('node_modules/@rnmapbox/maps/plugin/src/withMapbox.ts');
const mapboxPodspec = read('node_modules/@rnmapbox/maps/rnmapbox-maps.podspec');

assert.equal(pkg.dependencies['@rnmapbox/maps'], '10.3.5');
assert.equal(pkg.dependencies['react-native-maps'], '1.20.1');
assert.equal(lock.packages['node_modules/@rnmapbox/maps']?.version, '10.3.5');
assert.equal(lock.packages['node_modules/react-native-maps']?.version, '1.20.1');

assert.match(appConfigSource, /const MAPBOX_NATIVE_SDK_VERSION = '11\.20\.1'/);
assert.match(appConfigSource, /EXPO_PUBLIC_MAPBOX_TOKEN/);
assert.match(appConfigSource, /RNMAPBOX_MAPS_DOWNLOAD_TOKEN/);
assert.match(appConfigSource, /'@rnmapbox\/maps'/);
assert.match(appConfigSource, /RNMapboxMapsVersion:\s*MAPBOX_NATIVE_SDK_VERSION/);
assert.doesNotMatch(appConfigSource, /RNMapboxMapsDownloadToken\s*:/);
assert.doesNotMatch(appConfigSource, /GOOGLE_MAPS_ANDROID_API_KEY/);
assert.doesNotMatch(appConfigSource, /googleMaps\s*:/);

assert.match(mapboxPluginSource, /System\.getenv\('RNMAPBOX_MAPS_DOWNLOAD_TOKEN'\)/);
assert.match(mapboxPodspec, /ENV\['RNMAPBOX_MAPS_DOWNLOAD_TOKEN'\]/);

assert.match(androidMapSource, /from '@rnmapbox\/maps'/);
assert.match(androidMapSource, /Mapbox\.setAccessToken\(MAPBOX_RUNTIME_TOKEN\)/);
assert.match(androidMapSource, /MAPBOX_CONFIG\.TOKEN\.trim\(\)/);
assert.match(androidMapSource, /<MapView/);
assert.match(androidMapSource, /<Camera/);
assert.match(androidMapSource, /<MarkerView/);
assert.match(androidMapSource, /mapbox:\/\/styles\/mapbox\/dark-v11/);
assert.match(androidMapSource, /attributionEnabled/);
assert.match(androidMapSource, /logoEnabled/);
assert.match(androidMapSource, /if \(!MAPBOX_RUNTIME_TOKEN \|\| mapLoadFailed\)/);
assert.match(androidMapSource, /Map temporarily unavailable/);
assert.doesNotMatch(androidMapSource, /react-native-maps/);

// Preserve the already-submitted iOS native map while Android adopts Mapbox.
assert.match(iosMapSource, /from 'react-native-maps'/);
assert.match(iosMapSource, /<Marker/);
assert.doesNotMatch(iosMapSource, /@rnmapbox\/maps/);

assert.match(webMapSource, /staticMapUrl\(points/);
assert.doesNotMatch(webMapSource, /@rnmapbox\/maps/);
assert.match(mapboxSource, /process\.env\.EXPO_PUBLIC_MAPBOX_TOKEN/);
assert.match(mapboxSource, /api\.mapbox\.com\/geocoding\/v5/);
assert.match(mapboxSource, /api\.mapbox\.com\/styles\/v1\/mapbox\/dark-v11\/static/);

const expoCli = resolve(root, 'node_modules/expo/bin/cli');
const publicConfig = JSON.parse(
  execFileSync(process.execPath, [expoCli, 'config', '--type', 'public', '--json'], {
    cwd: root,
    encoding: 'utf8',
  }),
);
const mapboxPlugin = publicConfig.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === '@rnmapbox/maps',
);
assert.equal(mapboxPlugin?.[1]?.RNMapboxMapsVersion, '11.20.1');
assert.equal(mapboxPlugin?.[1]?.RNMapboxMapsDownloadToken, undefined);
assert.equal(publicConfig.android.config?.googleMaps, undefined);
assert.equal(typeof publicConfig.extra.mapboxRuntimeConfigured, 'boolean');
assert.equal(publicConfig.extra.mapboxDownloadTokenConfigured, undefined);
assert.equal(publicConfig.extra.mapboxNativeSdkVersion, '11.20.1');

console.log('Native Mapbox contract: PASS');
