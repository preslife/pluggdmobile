import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dockSource = read('components/PluggdDock.tsx');
const tabsSource = read('app/(tabs)/_layout.tsx');
const headerSource = read('components/MobileHeader.tsx');

for (const label of ['Home', 'Stage', 'Live', 'Backstage', 'Search']) {
  assert.match(dockSource, new RegExp(`label:\\s*'${label}'`), `core tab ${label} must be present`);
}

for (const route of ["route: '/'", "route: '/stage'", "route: '/live'", "route: '/backstage'", "route: '/search'"]) {
  assert.match(dockSource, new RegExp(route.replace(/[/'()]/g, '\\$&')), `${route} must be in core tab routes`);
}

assert.doesNotMatch(
  dockSource,
  /ScrollView|CREATOR_DOCK|FAN_DOCK|label:\s*'Market'|label:\s*'Create'|label:\s*'Wallet'|label:\s*'Profile'/,
  'primary mobile navigation must be fixed consumer-first tabs only',
);

assert.match(
  dockSource,
  /accessibilityLabel=\{`\$\{item\.label\} tab`\}/,
  'each tab must expose a clear accessibility label',
);

for (const routeName of ['index', 'stage', 'live', 'backstage', 'search']) {
  assert.match(tabsSource, new RegExp(`name="${routeName}"`), `${routeName} route must be registered in tabs layout`);
}

assert.match(headerSource, /Creator Mode/, 'Creator Mode must be accessible from avatar menu');
assert.match(headerSource, /Wallet/, 'Wallet must be accessible from avatar menu');
assert.match(headerSource, /Open wallet and tickets/, 'Home header must expose wallet and tickets entry');
assert.doesNotMatch(headerSource, /Open direct messages|chat-bubble-outline/, 'Home header must not show search or DM icons in this dashboard shell');
assert.doesNotMatch(headerSource, /setCreateOpen|CreateAction|Creator Studio|Analytics|Earnings/, 'global header must not expose old all-in-one creator studio controls');

console.log('mobile navigation contract verified');
