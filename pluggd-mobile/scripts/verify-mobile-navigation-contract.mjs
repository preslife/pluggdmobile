import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dockSource = read('components/PluggdDock.tsx');
const tabsSource = read('app/(tabs)/_layout.tsx');
const chromeSource = read('components/AppChrome.tsx');
const tabDiscoverSource = read('app/(tabs)/discover.tsx');
const tabCommunitySource = read('app/(tabs)/community.tsx');
const tabEventsSource = read('app/(tabs)/events.tsx');
const tabMarketSource = read('app/(tabs)/market.tsx');

const visibleDock = [
  ['Home', '/'],
  ['Discover', '/discover'],
  ['Community', '/community'],
  ['Events', '/events'],
  ['Market', '/market'],
];

for (const [label, route] of visibleDock) {
  assert.match(dockSource, new RegExp(`label:\\s*'${label}'[\\s\\S]*?route:\\s*'${route.replace('/', '\\/')}'`), `web-parity dock tab ${label} -> ${route} must be present`);
}

assert.doesNotMatch(
  dockSource,
  /label:\s*'(Explore|Create|Profile|Stage|Live|Backstage|MyPLUGGD|Search|Wallet)'/,
  'primary dock must exclude old native-tab and secondary labels',
);
assert.doesNotMatch(
  dockSource,
  /route:\s*'\/(explore|create|profile|stage|live|backstage|my-pluggd|wallet|search)'/,
  'secondary routes must not be primary bottom tabs',
);
assert.doesNotMatch(dockSource, /ScrollView|CREATOR_DOCK|FAN_DOCK/, 'primary mobile navigation must be fixed web-source tabs only');
assert.doesNotMatch(dockSource, /primary:\s*true|primaryPressable/, 'Create must not remain as a central dock action');

assert.match(
  dockSource,
  /accessibilityLabel=\{`\$\{item\.label\} tab`\}/,
  'each tab must expose a clear accessibility label',
);

for (const routeName of ['index', 'discover', 'community', 'events', 'market']) {
  assert.match(tabsSource, new RegExp(`name="${routeName}"`), `${routeName} route must be registered in tabs layout`);
}

for (const hiddenRoute of ['explore', 'create', 'profile', 'stage', 'live', 'backstage', 'my-pluggd']) {
  assert.match(
    tabsSource,
    new RegExp(`name="${hiddenRoute}"[\\s\\S]*?href:\\s*null`),
    `${hiddenRoute} must stay hidden from the primary tab bar`,
  );
}

for (const label of ['Home', 'Discover', 'Community', 'Events', 'Market']) {
  assert.match(tabsSource, new RegExp(`title:\\s*"${label}"`), `${label} must be a visible tab title`);
}
assert.doesNotMatch(tabsSource, /title:\s*"(Explore|Create|Profile|Stage|Live|Backstage|MyPLUGGD)"/, 'tab titles must use the web-parity dock labels');
assert.match(chromeSource, /CreateActionSheet/, 'Create must be mounted through the role-aware floating action sheet');
assert.match(tabDiscoverSource, /DiscoverParityScreen/, 'Discover tab must render the web-source Discover parity screen');
assert.match(tabCommunitySource, /CommunityParityScreen/, 'Community tab must render the web-source Community parity screen');
assert.match(tabEventsSource, /EventsParityScreen/, 'Events tab must render the web-source Events parity screen');
assert.match(tabMarketSource, /MarketParityScreen/, 'Market tab must render the web-source Market parity screen');

console.log('mobile navigation contract verified');
