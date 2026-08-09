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

assert.equal(navigationModeForWidth(599), 'compact');
assert.equal(navigationModeForWidth(600), 'top');
assert.equal(navigationModeForWidth(1280), 'top');

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
assert.equal(publicConfig.extra.androidGoogleMapsConfigured, false);
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
const eventsMapSource = read('components/EventsMap.native.tsx');
const trackPlayerPatch = read('patches/react-native-track-player+4.1.2.patch');
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

// Credential-free local and internal builds must never instantiate Google
// Maps without its restricted Android key; native view creation would crash.
assert.match(appConfigSource, /androidGoogleMapsConfigured:\s*Boolean\(GOOGLE_MAPS_ANDROID_API_KEY\)/);
assert.match(eventsMapSource, /Constants\.expoConfig\?\.extra\?\.androidGoogleMapsConfigured === true/);
assert.match(eventsMapSource, /Platform\.OS === 'android' && !androidMapsConfigured/);
assert.match(eventsMapSource, /Map unavailable in this build/);

// React Native 0.81 TurboModules require Promise-based @ReactMethods to expose
// a JVM void return. Keep the native TrackPlayer compatibility patch reachable
// through patch-package instead of relying on a modified node_modules tree.
assert.match(trackPlayerPatch, /private fun launch\(block: suspend \(\) -> Unit\)/);
assert.match(trackPlayerPatch, /fun play\(callback: Promise\) = launch \{/);
assert.match(trackPlayerPatch, /fun getPlaybackState\(callback: Promise\) = launch \{/);

console.log('Android foundation contract: PASS');
