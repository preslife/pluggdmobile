import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');

for (const asset of [
  'assets/brand/pluggd-logo-dark.png',
  'assets/brand/pluggd-logo-light.png',
  'assets/splash-icon.png',
]) {
  assert.ok(existsSync(join(root, asset)), `${asset} must exist`);
  assert.ok(statSync(join(root, asset)).size > 400_000, `${asset} must use the supplied full PLUGGD logo asset`);
}

const header = read('components/MobileHeader.tsx');
assert.match(header, /import \{ BrandLogo \}/, 'MobileHeader must use the shared BrandLogo component');
assert.match(header, /<BrandLogo variant=\{theme\.scheme\}|<BrandLogo variant="auto"|<BrandLogo variant="dark"/, 'MobileHeader must render the real PLUGGD logo image');
assert.doesNotMatch(header, /<Text style=\{styles\.wordmark\}>PLUGGD<\/Text>/, 'MobileHeader must not fall back to a text wordmark');

console.log('mobile logo contract verified');
