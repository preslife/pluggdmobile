import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';

const require = createRequire(import.meta.url);
const plugin = require('../plugins/withAndroidReactBackBridge.cjs');
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const template = read('scripts/fixtures/android-react-back/MainActivity.kt');

// Exercise the real Expo withMainActivity mod, without prebuild or a device.
async function apply(contents, language = 'kt', registrations = 1) {
  let config = { name: 'Back fixture', slug: 'back-fixture' };
  for (let n = 0; n < registrations; n += 1) config = plugin(config);
  assert.deepEqual(Object.keys(config.mods), ['android']);
  assert.deepEqual(Object.keys(config.mods.android), ['mainActivity']);
  const result = await config.mods.android.mainActivity({
    ...config,
    modRequest: { platform: 'android', modName: 'mainActivity' },
    modResults: { path: '/fixture/MainActivity.kt', language, contents },
  });
  assert.equal(result.modResults.language, language);
  return result.modResults.contents;
}

const generated = await apply(template);
assert.notEqual(generated, template);
assert.equal(await apply(generated), generated, 'the actual mod must be byte-idempotent');
assert.equal(await apply(template, 'kt', 2), generated, 'duplicate plugin registration must not duplicate callbacks');

const generatedBlocks = [...generated.matchAll(/^([ ]*)\/\/ @generated begin pluggd-android-react-back-([^\n]+)\n([\s\S]*?)^\1\/\/ @generated end pluggd-android-react-back-\2$/gm)];
assert.deepEqual(generatedBlocks.map((m) => m[2]), ['import', 'callback', 'register', 'default']);
const content = Object.fromEntries(generatedBlocks.map((m) => [m[2], m[3]]));
assert.equal(content.import, 'import androidx.activity.OnBackPressedCallback\n');
assert.match(content.callback, /private var pluggdReactBackCallback: OnBackPressedCallback\? = null/);
assert.match(content.register, /Build\.VERSION\.SDK_INT in 33\.\.35/);
assert.match(content.register, /onBackPressedDispatcher\.addCallback\(this, callback\)/,
  'registration must have the Activity lifecycle owner');
assert.match(content.register, /this@MainActivity\.onBackPressed\(\)/,
  'dispatch must retain ReactActivity and Expo delegate semantics');
assert.match(content.register, /val wasEnabled = isEnabled\s+isEnabled = false\s+try \{/);
assert.match(content.register, /finally \{\s+if \(!isFinishing && !isDestroyed\) isEnabled = wasEnabled/);
assert.match(content.default, /val wasEnabled = callback\?\.isEnabled \?: false\s+callback\?\.isEnabled = false\s+try \{/);
assert.match(content.default, /finally \{\s+if \(!isFinishing && !isDestroyed\) callback\?\.isEnabled = wasEnabled/);
const originalBody = template.match(/  override fun invokeDefaultOnBackPressed\(\) \{\n([\s\S]*?)\n  \}/)[1];
const wrappedBody = content.default.match(/    try \{\n([\s\S]*?)\n    \} finally/)[1]
  .split('\n').map((line) => line ? line.slice(2) : line).join('\n');
assert.equal(wrappedBody, originalBody, 'the complete Expo legacy/root default body must be preserved byte-for-byte after added indentation');
assert.ok(generated.indexOf(content.register) > generated.indexOf('    super.onCreate(null)'));

// Remove only the four exact generated blocks and recover the input template.
const reverse = new Map(generatedBlocks.map((match) => [match[2], match[0]]));
const recovered = generated
  .replace(`\n\n${reverse.get('import')}`, '')
  .replace(`\n${reverse.get('callback')}`, '')
  .replace(`\n${reverse.get('register')}`, '')
  .replace(reverse.get('default'), `  override fun invokeDefaultOnBackPressed() {\n${originalBody}\n  }`);
assert.equal(recovered, template, 'no template material outside the owned bridge may change');

const failures = [
  ['Java template', template, 'java'],
  ['missing class anchor', template.replace('class MainActivity : ReactActivity()', 'class OtherActivity : ReactActivity()')],
  ['changed super-onCreate anchor', template.replace('super.onCreate(null)', 'super.onCreate(savedInstanceState)')],
  ['duplicated super-onCreate anchor', template.replace('super.onCreate(null)', 'super.onCreate(null)\n    super.onCreate(null)')],
  ['changed Expo default semantics', template.replace('moveTaskToBack(false)', 'moveTaskToBack(true)')],
  ['duplicate default override', template.replace('\n}', '\n  override fun invokeDefaultOnBackPressed() {}\n}')],
  ['pre-existing custom Back dispatch', template.replace('class MainActivity : ReactActivity() {', 'class MainActivity : ReactActivity() {\n  override fun onBackPressed() {}')],
  ['pre-existing callback', template.replace('import android.os.Bundle', 'import android.os.Bundle\nimport androidx.activity.OnBackPressedCallback')],
  ['partial generated bridge', generated.replace(reverse.get('callback'), '')],
  ['tampered generated callback', generated.replace('isEnabled = wasEnabled', 'isEnabled = true')],
  ['extra generated marker', generated + '// pluggd-android-react-back-unexpected\n'],
  ['CRLF template change', template.replaceAll('\n', '\r\n')],
];
for (const [name, source, language = 'kt'] of failures) {
  await assert.rejects(() => apply(source, language), /withAndroidReactBackBridge:/, name);
}

const appConfig = read('app.config.ts');
assert.equal(appConfig.split("'./plugins/withAndroidReactBackBridge.cjs'").length, 2);
assert.match(appConfig, /withAndroidAdaptiveActivity\.cjs',\s+'\.\/plugins\/withAndroidReactBackBridge\.cjs'/);
assert.match(appConfig, /predictiveBackGestureEnabled: true/);
assert.match(appConfig, /minSdkVersion: 24/);
assert.match(appConfig, /targetSdkVersion: 36/);

// Optional portable output for a separate Kotlin compiler/JVM probe. The
// permanent Node gate has no local toolchain paths or native-jar requirement.
const emit = process.argv.slice(2);
assert.ok(emit.length === 0 || (emit.length === 1 && emit[0].startsWith('--emit-kotlin-fixture=')), 'unsupported arguments');
if (emit.length) {
  const directory = emit[0].slice('--emit-kotlin-fixture='.length);
  assert.ok(isAbsolute(directory), 'fixture output must be an explicitly supplied absolute directory');
  writeFileSync(join(directory, 'MainActivity.kt'), generated);
  // The behavior harness supplies inert symbols. Only import declarations
  // are removed; every generated callback/default statement remains actual.
  writeFileSync(join(directory, 'MainActivity.behavior.kt'), generated.replace(/^import [^\n]+\n/gm, ''));
  writeFileSync(join(directory, 'BackBridgeBehavior.kt'), read('scripts/fixtures/android-react-back/BackBridgeBehavior.kt'));
  // A real cached-API type probe can compile the same emitted callback and
  // default body without needing generated Expo/R/BuildConfig app artifacts.
  writeFileSync(join(directory, 'MainActivity.api.kt'), `package com.pluggd.mobile
import android.os.Build
import android.os.Bundle
import androidx.activity.OnBackPressedCallback
import com.facebook.react.ReactActivity
class MainActivity : ReactActivity() {
${content.callback}  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
${content.register}  }
${content.default}}
`);
}
console.log(`Android React Back actual CNG mod: PASS (idempotence, template preservation, ${failures.length} fail-closed fixtures; no device/gesture proof)`);
