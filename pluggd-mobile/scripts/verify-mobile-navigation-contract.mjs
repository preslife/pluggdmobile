import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dockSource = read('components/PluggdDock.tsx');
const tabsSource = read('app/(tabs)/_layout.tsx');
const tabCommunitySource = read('app/(tabs)/community.tsx');

for (const label of ['Home', 'Explore', 'Create', 'Community', 'Profile']) {
  assert.match(dockSource, new RegExp(`label:\\s*'${label}'`), `locked mobile tab ${label} must be present`);
}

for (const route of ["route: '/'", "route: '/explore'", "route: '/create'", "route: '/community'", "route: '/profile'"]) {
  assert.match(dockSource, new RegExp(route.replace(/[/'()]/g, '\\$&')), `${route} must be in core tab routes`);
}

assert.doesNotMatch(
  dockSource,
  /label:\s*'(Discover|Events|Market|Stage|Live|Backstage|MyPLUGGD|Search|Wallet)'/,
  'primary dock must exclude old/secondary tab labels',
);
assert.doesNotMatch(
  dockSource,
  /route:\s*'\/(discover|events|market|stage|live|backstage|my-pluggd|wallet|search)'/,
  'secondary routes must not be primary bottom tabs',
);
assert.doesNotMatch(dockSource, /ScrollView|CREATOR_DOCK|FAN_DOCK/, 'primary mobile navigation must be fixed web-source tabs only');

assert.match(
  dockSource,
  /accessibilityLabel=\{`\$\{item\.label\} tab`\}/,
  'each tab must expose a clear accessibility label',
);

for (const routeName of ['index', 'explore', 'create', 'community', 'profile']) {
  assert.match(tabsSource, new RegExp(`name="${routeName}"`), `${routeName} route must be registered in tabs layout`);
}

for (const hiddenRoute of ['discover', 'events', 'market', 'stage', 'live', 'backstage', 'my-pluggd']) {
  assert.match(
    tabsSource,
    new RegExp(`name="${hiddenRoute}"[\\s\\S]*?href:\\s*null`),
    `${hiddenRoute} must stay hidden from the primary tab bar`,
  );
}

assert.doesNotMatch(tabsSource, /title:\s*"(Discover|Events|Market|Stage|Live|Backstage|MyPLUGGD)"/, 'tab titles must use the locked mobile nav labels');
assert.match(dockSource, /label:\s*'Create'[\s\S]*route:\s*'\/create'/, 'Create must be a first-class bottom tab');
assert.match(dockSource, /label:\s*'Profile'[\s\S]*route:\s*'\/profile'/, 'Profile must be a first-class bottom tab');
assert.match(tabCommunitySource, /CommunityParityScreen/, 'Community tab must render the web-source Community parity screen');

console.log('mobile navigation contract verified');
