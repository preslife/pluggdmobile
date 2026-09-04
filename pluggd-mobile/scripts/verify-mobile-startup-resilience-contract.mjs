import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(layout, /if \(!fontsLoaded\) \{\s*return null;/, 'font loading must never produce a blank application window');
assert.match(layout, /accessibilityRole="progressbar"/, 'font loading fallback must be exposed to assistive technology');
assert.match(layout, /Loading your PLUGGD world/, 'font loading must show an honest visible state');
assert.match(layout, /fontError[\s\S]*Close and reopen PLUGGD to try again/, 'font failure must remain visible and recoverable');

console.log('PASS mobile startup resilience contract');
