import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This source gate runs synthetic/parser fixtures only. A release must invoke
// the separate inspector with its exact signed AAB and LLVM executable paths.
const inspector = resolve(dirname(fileURLToPath(import.meta.url)), 'inspect-android-aab-page-alignment.mjs');
const result = JSON.parse(execFileSync(process.execPath, [inspector, '--self-test'], {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024,
}));
assert.equal(result.fixtureCount, 13);
assert.equal(result.syntheticFixtures.length, result.fixtureCount);
assert.ok(result.syntheticFixtures.every((fixture) => fixture.pass === true));
assert.ok(result.syntheticFixtures.some((fixture) => fixture.analyzerPass === false));
assert.ok(result.syntheticFixtures.some((fixture) => fixture.roundedRelroWritableOverlapPass === false));
console.log(`Android AAB page-alignment synthetic fixtures: PASS (${result.fixtureCount}; no artifact or runtime tested)`);
