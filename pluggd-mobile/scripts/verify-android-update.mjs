import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptsDirectory, '..');
const argumentsSet = new Set(process.argv.slice(2));
const stageOptions = ['--source-only', '--typecheck-only', '--doctor-only'];
for (const argument of argumentsSet) assert.ok([...stageOptions, '--list'].includes(argument), `unknown verification argument ${argument}`);
assert.ok(stageOptions.filter((option) => argumentsSet.has(option)).length <= 1, 'select at most one explicit verification stage');

// Enumerate every verification script, including the pure Battle, Maps, audio,
// social-music, Live-recovery, plan and zoom fixtures. Do not use a platform-name
// prefix to silently lose useful tests. The sole non-source check below installs
// and controls a real device and remains an explicit separate release gate.
const excluded = new Map([
  ['verify-mobile-finish.mjs', 'the older aggregate runner, not an individual check'],
  ['verify-android-update.mjs', 'this aggregate runner'],
  ['verify-android-release-device-smoke.mjs', 'explicit serial/artifact-based device installation and smoke gate'],
]);
const scripts = readdirSync(scriptsDirectory)
  .filter((file) => /^verify-.*\.mjs$/.test(file))
  .filter((file) => !excluded.has(file))
  .sort();
const requiredBehaviorChecks = [
  'verify-battle-competition.mjs', 'verify-map-signal-review.mjs',
  'verify-protected-playback-source.mjs', 'verify-ios-release-music.mjs',
  'verify-ios-live-room-recovery.mjs', 'verify-android-platform-plans.mjs',
  'verify-android-platform-plan-hook-behavior.mjs',
  'verify-android-contact-form-contract.mjs',
  'verify-android-aab-page-alignment-fixtures.mjs',
  'verify-music-upload-behaviour.mjs',
  'verify-mobile-android-media-zoom-contract.mjs', 'verify-mobile-contract-source-tools.mjs',
];
for (const check of requiredBehaviorChecks) assert.ok(scripts.includes(check), `Android source gate must include ${check}`);

if (argumentsSet.has('--list')) {
  console.log(JSON.stringify({
    sourceChecks: scripts,
    exclusions: Object.fromEntries(excluded),
    generatedIosOnly: ['Info.plist / PrivacyInfo.xcprivacy', 'AppDelegate / iOS splash assets and storyboard'],
    separateStages: ['TypeScript', 'Expo Doctor'],
    releaseGatesNotClaimed: ['candidate Mapbox runtime config and artifact inspection', 'signed AAB / Billing / 16 KB libraries', 'device/native/Play-signed/live behavior and backend enforcement'],
  }, null, 2));
  process.exit(0);
}

function run(command, args, { androidSource = false } = {}) {
  return spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...(androidSource ? { ANDROID_VERIFY: '1' } : {}) },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
  });
}

function failureSummary(result) {
  if (result.error) return result.error.message;
  const lines = `${result.stderr || ''}\n${result.stdout || ''}`.split('\n');
  const message = lines.find((line) => /^(?:AssertionError|Error|TypeError|ReferenceError|SyntaxError|appearance contract failed:|npm error)/.test(line));
  const location = lines.find((line) => /^    at file:\/\//.test(line));
  const fallback = lines.map((line) => line.trim()).filter(Boolean).slice(-3).join('\n');
  return [message || fallback || `process exited ${result.status ?? result.signal ?? 'without a status'}`, location].filter(Boolean).join('\n');
}

let failed = false;
const selectedStage = stageOptions.find((option) => argumentsSet.has(option));
if (!selectedStage || selectedStage === '--source-only') {
  console.log(`Android shared/source/behavior gate: ${scripts.length} checks. ANDROID_VERIFY=1 applies only to explicitly generated iOS project artifacts.`);
  console.log('Separate release gates: device smoke, candidate runtime config, signed artifact and Play/live behavior. No source checks are excluded for known failures.');
  const failures = [];
  for (const script of scripts) {
    const result = run(process.execPath, [`scripts/${script}`], { androidSource: true });
    if (result.status === 0) console.log(`PASS ${script}`);
    else {
      failures.push(script);
      console.error(`FAIL ${script}\n${failureSummary(result)}`);
    }
  }
  console.log(`Android source gate: ${scripts.length - failures.length}/${scripts.length} passed; ${failures.length} failed.`);
  if (failures.length) {
    failed = true;
    console.error(`Unresolved checks: ${failures.join(', ')}`);
  }
}

if (!selectedStage || selectedStage === '--typecheck-only') {
  console.log('TypeScript gate (independent result):');
  const result = run(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '--pretty', 'false']);
  if (result.status === 0) console.log('PASS TypeScript');
  else { failed = true; console.error(`FAIL TypeScript\n${result.stdout || ''}${failureSummary(result)}`); }
}

if (!selectedStage || selectedStage === '--doctor-only') {
  console.log('Expo Doctor gate (independent result; may require network access):');
  // npm may retrieve this diagnostic tool into its temporary cache. This does
  // not add an application dependency or modify the project's lockfile.
  const result = run('npx', ['--yes', 'expo-doctor']);
  if (result.status === 0) console.log(`PASS Expo Doctor\n${result.stdout.trim()}`);
  else { failed = true; console.error(`FAIL Expo Doctor\n${result.stdout || ''}${failureSummary(result)}`); }
}

process.exitCode = failed ? 1 : 0;
