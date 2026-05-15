import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const typography = read('src/design/typography.ts');
const tokens = read('src/design/tokens.ts');
const layout = read('app/_layout.tsx');

assert.match(typography, /heading:\s*'Neue Montreal'/, 'headings must use Neue Montreal');
assert.match(typography, /body:\s*'Neue Haas Grotesk'/, 'body text must use Neue Haas Grotesk');
assert.match(typography, /campaign:\s*'ABC Diatype Monument'/, 'campaign/poster/limited styles must use ABC Diatype Monument');
assert.match(typography, /StyleSheet as any\)\.create/, 'global StyleSheet typography assignment must be configured');
assert.match(typography, /TextInput/, 'body typography must apply to inputs');
assert.match(tokens, /fonts:\s*pluggdFonts/, 'design tokens must expose typography families');
assert.match(layout, /configurePluggdTypography/, 'root layout must install PLUGGD typography defaults');

console.log('mobile typography contract verified');
