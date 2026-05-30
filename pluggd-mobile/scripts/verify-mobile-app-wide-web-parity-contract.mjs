#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const pathFor = (path) => join(root, path);
const read = (path) => readFileSync(pathFor(path), 'utf8');

const requiredNativeRoutes = [
  'app/discover.tsx',
  'app/events/index.tsx',
  'app/market/index.tsx',
  'app/market/[section].tsx',
  'app/releases/index.tsx',
  'app/mixes/index.tsx',
  'app/soundboards/index.tsx',
  'app/sample-packs/index.tsx',
  'app/hubs/index.tsx',
  'app/hubs/[slug].tsx',
  'app/maps.tsx',
  'app/hashtag/[tag].tsx',
  'app/connect/[slug].tsx',
  'app/studio/index.tsx',
];

for (const route of requiredNativeRoutes) {
  assert.ok(existsSync(pathFor(route)), `${route} must exist as a native app-wide parity route`);
  const source = read(route);
  assert.doesNotMatch(source, /<Redirect\s+href="\/(?:stage|search|backstage|creator-mode|wallet|music)"/, `${route} must not silently redirect into a generic tab`);
}

const serviceSource = read('src/features/parity/appWideParityServices.ts');
const screenSource = read('src/features/parity/AppWideParityScreens.tsx');
const studioScreenSource = read('src/features/studio/StudioScreens.tsx');
const studioDataSource = read('src/features/studio/studio-data.ts');
const sharedContentSource = read('src/lib/mobileContent.ts');
const dockSource = read('components/PluggdDock.tsx');
const dataSource = `${serviceSource}\n${sharedContentSource}`;

for (const token of [
  'loadDiscoverParity',
  'loadMarketParity',
  'loadEventsParity',
  'loadHubsParity',
  'loadMapSignalsParity',
  'loadHashtagParity',
  'loadConnectCardParity',
  'loadStudioParity',
]) {
  assert.match(serviceSource, new RegExp(token), `app-wide parity services must export ${token}`);
}

for (const table of [
  'releases',
  'beats',
  'sample_packs',
  'mixes',
  'soundboards',
  'events',
  'hubs',
  'map_signals',
  'social_posts',
  'connect_profiles',
]) {
  assert.match(dataSource, new RegExp(`from\\('${table}'`), `app-wide parity services must query ${table} directly or through the shared mobile content loader`);
}

for (const token of [
  'DiscoverParityScreen',
  'MarketParityScreen',
  'EventsParityScreen',
  'HubsParityScreen',
  'MapSignalsParityScreen',
  'HashtagParityScreen',
  'ConnectCardParityScreen',
  'StudioParityScreen',
]) {
  assert.match(`${screenSource}\n${serviceSource}`, new RegExp(token), `app-wide parity screens must include ${token}`);
}

assert.doesNotMatch(
  `${screenSource}\n${serviceSource}`,
  /No fake checkout|native translation|unsupported payment|private data|heavy operations|hidden or clearly labelled|App Review|Apple IAP|Apple-backed|external checkout|native entitlement|payment contract|web-only|backend contract|current backend|mobile backend/i,
  'app-wide parity screens must not expose internal planning or App Review copy',
);

for (const route of [
  'app/studio/index.tsx',
  'app/studio/apps.tsx',
  'app/studio/action.tsx',
  'app/studio/analytics.tsx',
  'app/studio/my-pluggd.tsx',
  'app/studio/connect-card.tsx',
  'app/studio/more.tsx',
]) {
  const source = read(route);
  assert.doesNotMatch(source, /StudioParityScreen/, `${route} must use native Studio screens, not the generic parity placeholder`);
  assert.match(source, /Studio[A-Za-z]+Screen/, `${route} must import a dedicated native Studio screen`);
}

for (const token of [
  'StudioHomeScreen',
  'StudioAppsScreen',
  'StudioActionScreen',
  'StudioAnalyticsScreen',
  'StudioMyPluggdScreen',
  'StudioConnectCardScreen',
  'StudioMoreScreen',
  'setStudioModulePlugged',
  'Desktop Tools',
  'Use desktop Studio',
]) {
  assert.match(`${studioScreenSource}\n${studioDataSource}`, new RegExp(token), `native Studio implementation must include ${token}`);
}

assert.doesNotMatch(
  `${studioScreenSource}\n${studioDataSource}`,
  /web-only|Beat-license checkout|native contract|backend contract|No fake checkout/i,
  'native Studio implementation must avoid internal planning labels in public UI copy',
);

const chromeSource = read('components/AppChrome.tsx');
assert.match(chromeSource, /'\/studio'/, 'AppChrome must hide public chrome for native Studio routes');
assert.match(chromeSource, /CreateActionSheet/, 'AppChrome must mount the role-aware floating Create sheet');
for (const [label, route] of [
  ['Home', '/'],
  ['Discover', '/discover'],
  ['Community', '/community'],
  ['Events', '/events'],
  ['Market', '/market'],
]) {
  assert.match(dockSource, new RegExp(`label:\\s*'${label}'[\\s\\S]*?route:\\s*'${route.replace('/', '\\/')}'`), `web-parity dock must expose ${label} -> ${route}`);
}
assert.doesNotMatch(dockSource, /label:\s*'(Explore|Create|Profile|Stage|Live|Backstage|MyPLUGGD)'/, 'web-parity dock must not regress to old native-tab labels');

console.log('mobile app-wide web parity contract verified');
