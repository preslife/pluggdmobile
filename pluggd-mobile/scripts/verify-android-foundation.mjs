import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function loadPureTypeScriptModule(path) {
  const source = read(path);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;
  const module = { exports: {} };
  Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}

const { navigationModeForWidth } = loadPureTypeScriptModule(
  'src/design/adaptiveNavigationPolicy.ts',
);
const { matchesAllowedNotificationUrl } = loadPureTypeScriptModule(
  'src/lib/notificationUrlPolicy.ts',
);
const {
  createImageLoadScheduler,
  imageDisplayWidthForDevice,
  isLowMemoryAndroidImageTarget,
} = loadPureTypeScriptModule('src/components/lowMemoryImagePolicy.ts');

assert.equal(navigationModeForWidth(599), 'compact');
assert.equal(navigationModeForWidth(600), 'top');
assert.equal(navigationModeForWidth(1280), 'top');

assert.equal(isLowMemoryAndroidImageTarget('android', 24), true);
assert.equal(isLowMemoryAndroidImageTarget('android', 25), true);
assert.equal(isLowMemoryAndroidImageTarget('android', 26), false);
assert.equal(isLowMemoryAndroidImageTarget('ios', 24), false);
assert.equal(imageDisplayWidthForDevice(720, true), 360);
assert.equal(imageDisplayWidthForDevice(720, false), 720);

const imageScheduler = createImageLoadScheduler(2);
const imageStarts = [];
const imageReleases = [];
for (const id of ['a', 'b', 'c']) {
  imageScheduler.schedule((release) => {
    imageStarts.push(id);
    imageReleases.push(release);
  });
}
assert.deepEqual(imageStarts, ['a', 'b']);
assert.equal(imageScheduler.getActiveCount(), 2);
assert.equal(imageScheduler.getPendingCount(), 1);
imageReleases[0]();
await Promise.resolve();
assert.deepEqual(imageStarts, ['a', 'b', 'c']);
assert.equal(imageScheduler.getActiveCount(), 2);
assert.equal(imageScheduler.getPendingCount(), 0);

const firstPartyHosts = new Set(['pluggd.fm', 'www.pluggd.fm']);
for (const url of [
  'pluggd://live',
  'pluggd://events/event-id',
  'https://pluggd.fm/events/event-id',
]) {
  assert.equal(matchesAllowedNotificationUrl(url, firstPartyHosts), true, url);
}
for (const url of [
  'https://evil.example/events/event-id',
  'https://pluggd.fm.evil.example/events/event-id',
  'https://pluggd.fm:8443/events/event-id',
  'pluggd://events/../auth/login',
  'pluggd://events/%2e%2e/auth/login',
  'pluggd://settings',
  'javascript:alert(1)',
  'file:///etc/passwd',
]) {
  assert.equal(matchesAllowedNotificationUrl(url, firstPartyHosts), false, url);
}

const expoCli = resolve(root, 'node_modules/expo/bin/cli');
const publicConfig = JSON.parse(
  execFileSync(process.execPath, [expoCli, 'config', '--type', 'public', '--json'], {
    cwd: root,
    encoding: 'utf8',
  }),
);

assert.equal(publicConfig.android.allowBackup, false);
assert.equal(publicConfig.android.predictiveBackGestureEnabled, true);
assert.equal(typeof publicConfig.extra.mapboxRuntimeConfigured, 'boolean');
assert.equal(publicConfig.extra.mapboxDownloadTokenConfigured, undefined);
assert.equal(publicConfig.extra.mapboxNativeSdkVersion, '11.20.1');
assert.equal(publicConfig.android.config?.googleMaps, undefined);
assert.ok(publicConfig.android.blockedPermissions.includes('android.permission.READ_EXTERNAL_STORAGE'));
assert.ok(publicConfig.android.blockedPermissions.includes('android.permission.SYSTEM_ALERT_WINDOW'));
assert.ok(publicConfig.android.blockedPermissions.includes('android.permission.WRITE_EXTERNAL_STORAGE'));
assert.ok(publicConfig.android.permissions.includes('POST_NOTIFICATIONS'));
assert.ok(
  publicConfig.android.intentFilters.some((filter) =>
    filter.data?.some((item) => item.scheme === 'https' && item.host === 'pluggd.fm'),
  ),
);
const pluginNames = publicConfig.plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
assert.ok(pluginNames.includes('expo-notifications'));
assert.ok(pluginNames.includes('expo-camera'));
assert.ok(pluginNames.includes('./plugins/withAndroidAdaptiveActivity.cjs'));
assert.ok(pluginNames.includes('@rnmapbox/maps'));
const buildPropertiesPlugin = publicConfig.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
);
assert.equal(buildPropertiesPlugin?.[1]?.android?.minSdkVersion, 24);
assert.equal(buildPropertiesPlugin?.[1]?.android?.enableMinifyInReleaseBuilds, true);
assert.equal(buildPropertiesPlugin?.[1]?.android?.enableShrinkResourcesInReleaseBuilds, true);
const notificationPlugin = publicConfig.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications');
assert.equal(notificationPlugin?.[1]?.icon, './assets/notification-icon.png');

const eas = JSON.parse(read('eas.json'));
assert.equal(eas.build.development.android.buildType, 'apk');
assert.equal(eas.build.preview.android.buildType, 'apk');
assert.equal(eas.build.production.android.buildType, 'app-bundle');
assert.equal(eas.submit.production.android.track, 'internal');

const liveSource = read('src/screens/LiveSessionScreen.tsx');
assert.match(liveSource, /PermissionsAndroid\.RESULTS\.NEVER_ASK_AGAIN/);
assert.ok(
  liveSource.indexOf('if (!permissions.granted)') < liveSource.indexOf('const token = await fetchLiveToken'),
  'Live token must not be requested before Android permission denial is handled.',
);

const uploadSource = read('app/creator/upload.tsx');
assert.match(uploadSource, /copyToCacheDirectory:\s*true/);
assert.match(uploadSource, /FileSystem\.documentDirectory/);
assert.match(uploadSource, /FileSystem\.copyAsync/);

const clipUploadSource = read('app/upload-clip.tsx');
const socialUploadSource = read('src/features/culture/mobileServices.ts');
const storageUploadSource = read('src/lib/storageUpload.ts');
assert.match(clipUploadSource, /persistSelectedClip/);
assert.match(storageUploadSource, /FileSystem\.uploadAsync/);
assert.doesNotMatch(clipUploadSource, /response\.blob\(\)/);
assert.doesNotMatch(socialUploadSource, /response\.blob\(\)/);

const layoutSource = read('app/_layout.tsx');
const orientationSource = read('src/lib/orientation.ts');
const adaptiveActivityPlugin = read('plugins/withAndroidAdaptiveActivity.cjs');
const appConfigSource = read('app.config.ts');
const eventsMapSource = read('components/EventsMap.android.tsx');
const iosEventsMapSource = read('components/EventsMap.native.tsx');
const pluggdImageSource = read('src/components/PluggdImage.tsx');
const trackPlayerPatch = read('patches/react-native-track-player+4.1.2.patch');
const playbackProvider = read('src/context/PlaybackProvider.tsx');
const releaseDeviceSmoke = read('scripts/verify-android-release-device-smoke.mjs');
assert.match(layoutSource, /applyAdaptiveAppOrientation\(Math\.min\(window\.width, window\.height\)\)/);
assert.match(orientationSource, /Platform\.OS === 'android' && shortestWindowEdgeDp >= 600/);
assert.match(orientationSource, /orientation\.unlockAsync\(\)/);

// Folding between the inner and outer displays must be delivered to the
// existing MainActivity. Recreating it can mount a second Expo Router linking
// root, so preserve every size/density configuration signal in CNG output.
for (const configChange of [
  'keyboard',
  'keyboardHidden',
  'orientation',
  'screenSize',
  'screenLayout',
  'smallestScreenSize',
  'uiMode',
  'density',
]) {
  assert.match(adaptiveActivityPlugin, new RegExp(`['\"]${configChange}['\"]`));
}
assert.match(adaptiveActivityPlugin, /AndroidConfig\.Manifest\.getMainActivityOrThrow/);
assert.match(adaptiveActivityPlugin, /android:configChanges/);

// Credential-free local and internal builds must never instantiate Mapbox
// without its public runtime token. The secret download token remains an
// environment-only native build input and must not enter plugin config.
assert.match(appConfigSource, /EXPO_PUBLIC_MAPBOX_TOKEN/);
assert.match(appConfigSource, /RNMAPBOX_MAPS_DOWNLOAD_TOKEN/);
assert.doesNotMatch(appConfigSource, /RNMapboxMapsDownloadToken\s*:/);
assert.doesNotMatch(appConfigSource, /GOOGLE_MAPS_ANDROID_API_KEY/);
assert.match(eventsMapSource, /from '@rnmapbox\/maps'/);
assert.match(eventsMapSource, /Mapbox\.setAccessToken\(MAPBOX_RUNTIME_TOKEN\)/);
assert.match(eventsMapSource, /if \(!MAPBOX_RUNTIME_TOKEN \|\| mapLoadFailed\)/);
assert.match(eventsMapSource, /Map temporarily unavailable/);
assert.doesNotMatch(eventsMapSource, /react-native-maps/);
assert.match(iosEventsMapSource, /from 'react-native-maps'/);
assert.doesNotMatch(iosEventsMapSource, /@rnmapbox\/maps/);

// API 24/25 can expose a 48 MB normal app heap. Artwork-heavy ScrollViews must
// not initiate every remote request and bitmap decode in one GC window.
assert.match(pluggdImageSource, /lowMemoryImageLoadScheduler\.schedule/);
assert.match(pluggdImageSource, /imageDisplayWidthForDevice/);
assert.match(pluggdImageSource, /LOW_MEMORY_SLOT_TIMEOUT_MS/);

// The API 24/25 player must not decode full-resolution notification artwork or
// reserve TrackPlayer's default 50-second buffer alongside the Discover feed.
assert.match(playbackProvider, /isConstrainedAndroidRuntime\(Platform\.OS, Platform\.Version\)/);
assert.match(playbackProvider, /transformedUri\(track\.artwork, CONSTRAINED_PLAYBACK_ARTWORK_WIDTH\)/);
assert.match(playbackProvider, /minBuffer:\s*5/);
assert.match(playbackProvider, /maxBuffer:\s*10/);
assert.match(playbackProvider, /playBuffer:\s*1/);
assert.match(playbackProvider, /backBuffer:\s*0/);
assert.match(playbackProvider, /tracks\.filter\(isPlayableTrack\)\.map\(\(track\) => trackForNativePlayback\(track\)\)/);

// Device evidence must be collected against an explicitly selected serial and
// fail on API drift, a backgrounded/crashed activity, or fatal native logs.
assert.match(releaseDeviceSmoke, /ANDROID_SERIAL is required/);
assert.match(releaseDeviceSmoke, /topResumedActivity=/);
assert.match(releaseDeviceSmoke, /OutOfMemoryError/);
assert.match(releaseDeviceSmoke, /Number\(minSdk\) !== 24/);
assert.match(releaseDeviceSmoke, /Number\(targetSdk\) !== 36/);

// React Native 0.81 TurboModules require Promise-based @ReactMethods to expose
// a JVM void return. Keep the native TrackPlayer compatibility patch reachable
// through patch-package instead of relying on a modified node_modules tree.
assert.match(trackPlayerPatch, /private fun launch\(block: suspend \(\) -> Unit\)/);
assert.match(trackPlayerPatch, /fun play\(callback: Promise\) = launch \{/);
assert.match(trackPlayerPatch, /fun getPlaybackState\(callback: Promise\) = launch \{/);

console.log('Android foundation contract: PASS');
