#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.includes('--help')) {
  console.log(`Verify an already-booted Android device with a release APK.

Required:
  ANDROID_SERIAL               adb serial to test (never auto-selects a device)

Optional:
  PLUGGD_SMOKE_APK             release APK path
  PLUGGD_SMOKE_URL             first-party App Link (default: discover)
  PLUGGD_SMOKE_SCREENSHOT      PNG evidence output path
  PLUGGD_SMOKE_WAIT_MS         post-launch observation window (default: 15000)
  PLUGGD_SMOKE_SKIP_INSTALL=1  test the already-installed package
  ANDROID_HOME                 Android SDK root used to resolve adb
`);
  process.exit(0);
}

const serial = process.env.ANDROID_SERIAL?.trim();
if (!serial) {
  throw new Error('ANDROID_SERIAL is required so a device is never selected implicitly.');
}

const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
const adb = androidHome ? resolve(androidHome, 'platform-tools/adb') : 'adb';
const apk = resolve(
  process.env.PLUGGD_SMOKE_APK ?? resolve(root, 'android/app/build/outputs/apk/release/app-release.apk'),
);
const url = process.env.PLUGGD_SMOKE_URL ?? 'https://pluggd.fm/discover';
const screenshot = process.env.PLUGGD_SMOKE_SCREENSHOT
  ? resolve(process.env.PLUGGD_SMOKE_SCREENSHOT)
  : null;
const waitMs = Number(process.env.PLUGGD_SMOKE_WAIT_MS ?? 15_000);
const packageName = 'com.pluggd.mobile';

if (!Number.isFinite(waitMs) || waitMs < 1_000 || waitMs > 120_000) {
  throw new Error('PLUGGD_SMOKE_WAIT_MS must be between 1000 and 120000.');
}
if (!url.startsWith('https://pluggd.fm/') && !url.startsWith('pluggd://')) {
  throw new Error('PLUGGD_SMOKE_URL must be a first-party HTTPS or pluggd:// link.');
}
if (process.env.PLUGGD_SMOKE_SKIP_INSTALL !== '1' && !existsSync(apk)) {
  throw new Error(`Release APK not found: ${apk}`);
}

function run(args, options = {}) {
  return execFileSync(adb, ['-s', serial, ...args], {
    encoding: options.binary ? null : 'utf8',
    stdio: options.binary ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

const deviceState = run(['get-state']).trim();
if (deviceState !== 'device') throw new Error(`Device ${serial} is ${deviceState}.`);

const api = Number(run(['shell', 'getprop', 'ro.build.version.sdk']).trim());
if (!Number.isFinite(api) || api < 24) {
  throw new Error(`Device API ${api || 'unknown'} is below PLUGGD's API 24 minimum.`);
}

let apkSha256 = null;
if (process.env.PLUGGD_SMOKE_SKIP_INSTALL !== '1') {
  apkSha256 = createHash('sha256').update(readFileSync(apk)).digest('hex');
  run(['install', '-r', apk]);
}

run(['shell', 'am', 'force-stop', packageName]);
run(['logcat', '-c']);
const launch = run([
  'shell',
  'am',
  'start',
  '-W',
  '-a',
  'android.intent.action.VIEW',
  '-d',
  url,
  packageName,
]);

await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));

const activities = run(['shell', 'dumpsys', 'activity', 'activities']);
const topResumedLine = activities
  .split('\n')
  .find((line) => line.includes('topResumedActivity=') || line.includes('mResumedActivity:'));
if (!topResumedLine?.includes(`${packageName}/.MainActivity`)) {
  throw new Error(`PLUGGD is not resumed after launch: ${topResumedLine?.trim() ?? 'no resumed activity'}`);
}

const logs = run(['logcat', '-d', '-v', 'brief']);
const fatalPattern = /FATAL EXCEPTION|OutOfMemoryError|Process:\s+com\.pluggd\.mobile|UnsatisfiedLinkError/;
const fatalLines = logs.split('\n').filter((line) => fatalPattern.test(line));
if (fatalLines.length > 0) {
  throw new Error(`Fatal Android log entries detected:\n${fatalLines.slice(0, 20).join('\n')}`);
}

if (screenshot) {
  mkdirSync(dirname(screenshot), { recursive: true });
  writeFileSync(screenshot, run(['exec-out', 'screencap', '-p'], { binary: true }));
}

const packageDump = run(['shell', 'dumpsys', 'package', packageName]);
const sdkMatch = packageDump.match(/versionCode=(\d+)\s+minSdk=(\d+)\s+targetSdk=(\d+)/);
if (!sdkMatch) throw new Error('Could not read installed package SDK metadata.');
const [, versionCode, minSdk, targetSdk] = sdkMatch;
if (Number(minSdk) !== 24 || Number(targetSdk) !== 36) {
  throw new Error(`Unexpected SDK contract: minSdk=${minSdk}, targetSdk=${targetSdk}.`);
}

const launchValue = (key) => launch.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? null;
console.log(
  JSON.stringify(
    {
      result: 'PASS',
      serial,
      deviceApi: api,
      packageName,
      versionCode: Number(versionCode),
      minSdk: Number(minSdk),
      targetSdk: Number(targetSdk),
      url,
      launchState: launchValue('LaunchState'),
      totalTimeMs: Number(launchValue('TotalTime')) || null,
      observationMs: waitMs,
      apk: process.env.PLUGGD_SMOKE_SKIP_INSTALL === '1' ? null : apk,
      apkSha256,
      screenshot,
      fatalLogEntries: 0,
    },
    null,
    2,
  ),
);
