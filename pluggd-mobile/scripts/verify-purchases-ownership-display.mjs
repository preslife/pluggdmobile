import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Actual Purchases/ContentUI/service source with explicit synthetic query/router/
// native boundaries. Selected installed modules are test-only; no API or app runs.
const nativeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const here = path.join(nativeRoot, 'src/features/culture');
const dependencies = path.resolve(process.argv[2]);
const baselineFile = path.join(path.resolve(process.argv[3]), 'baseline-purchases.tsx');
const dependency = createRequire(path.join(dependencies, 'react/package.json'));
const babel = dependency('@babel/core');
const React = dependency('react');
const RN = dependency('react-native-web');
const { renderToStaticMarkup } = dependency('react-dom/server');
const results = [];
const REVIEW_TIME = Date.parse('2026-10-12T12:00:00Z');
class ReviewDate extends Date { static now() { return REVIEW_TIME; } }
const plain = (value) => JSON.parse(JSON.stringify(value));
let requests = 0;
const previousFetch = globalThis.fetch;
globalThis.fetch = () => { requests++; throw new Error('NETWORK_FORBIDDEN'); };
function evaluate(filename, imports, source = fs.readFileSync(filename, 'utf8')) {
  const emitted = babel.transformSync(source, { filename, configFile: false, babelrc: false,
    plugins: [[dependency.resolve('@babel/plugin-transform-typescript'), { isTSX: filename.endsWith('.tsx'), allowDeclareFields: true }],
      [dependency.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      dependency.resolve('@babel/plugin-transform-modules-commonjs')] });
  assert.ok(emitted?.code);
  const module = { exports: {} };
  vm.runInNewContext(emitted.code, { module, exports: module.exports,
    require(name) {
      if (imports.has(name)) return imports.get(name);
      if (['react', 'react/jsx-runtime'].includes(name)) return dependency(name);
      throw new Error(`UNEXPECTED_MODULE:${name}`);
    }, Date: ReviewDate, console, fetch: globalThis.fetch }, { filename, timeout: 2000 });
  return module.exports;
}
const ownership = evaluate(path.join(here, 'libraryOwnershipDisplay.ts'), new Map());
const typography = evaluate(path.join(nativeRoot, 'src/design/typography.ts'), new Map());
const liquidGlass = evaluate(path.join(nativeRoot, 'src/design/liquidGlassTokens.ts'), new Map());
const designTokens = evaluate(path.join(nativeRoot, 'src/design/tokens.ts'), new Map([
  ['./typography', typography], ['./liquidGlassTokens', liquidGlass],
]));
function check(name, action) { action(); results.push({ name, status: 'PASS' }); }
const emptyBundle = () => ({ saved: [], purchases: [], tickets: [], entitlements: [] });
async function serviceBundle(tables) {
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'fixture-buyer' } } }) },
    from(table) {
      const query = {};
      for (const method of ['select', 'eq', 'in', 'or', 'order', 'limit']) query[method] = () => query;
      for (const method of ['insert', 'update', 'upsert', 'delete']) query[method] = () => { throw new Error(`WRITE_FORBIDDEN:${method}`); };
      query.then = (resolve, reject) => Promise.resolve({ data: plain(tables[table] ?? []), error: null }).then(resolve, reject);
      return query;
    }, rpc() { throw new Error('RPC_FORBIDDEN'); },
  };
  const service = evaluate(path.join(here, 'mobileServices.ts'), new Map([
    ['../../lib/supabase', { supabase }], ['../../lib/storageUpload', {}], ['../../lib/mobileContent', {}],
    ['./mobileCapabilities', {}], ['../live/liveRoomLoading', {}], ['../connect/connect-card-data', {}],
    ['./mobileSocial', {}], ['../safety/accountSafety', {}],
  ]));
  return plain(await service.loadLibraryBundle());
}
function renderPurchases(bundle, { old = false, loading = false, error = false, actor = 'fixture-buyer', authLoading = false } = {}) {
  const presses = []; const routes = [];
  let queryOptions;
  let retries = 0;
  const Pressable = (props) => {
    if (props.onPress) presses.push({ label: props.accessibilityLabel, action: props.onPress });
    return React.createElement(RN.Pressable, props);
  };
  const theme = designTokens.pluggdDark;
  const themeModule = { usePluggdTheme: () => theme };
  const gradient = { LinearGradient: ({ colors: ignored, ...props }) => React.createElement(RN.View, props) };
  const icons = { MaterialIcons: () => null };
  const native = { ...RN, Pressable };
  // Use actual ScreenShell/ListCard/SectionTitle/EmptyState; only their unchanged
  // header/chip native boundary is synthetic, as are safe theme/asset adapters.
  const contentUI = evaluate(path.join(nativeRoot, 'components/ContentUI.tsx'), new Map([
    ['react-native', native], ['@expo/vector-icons', icons], ['expo-linear-gradient', gradient],
    ['../src/design/typography', typography], ['../src/design/usePluggdTheme', themeModule],
    ['../src/design/useBottomChromeInset', { useBottomChromeInset: () => 0 }],
    ['../src/design/tokens', designTokens],
    ['../src/lib/mobileContent', { contentInitials: (title) => title.slice(0, 2) }],
    ['./PluggdPrimitives', { PluggdChip: () => null, PremiumScreenHeader: ({ title, subtitle, actions }) =>
      React.createElement(RN.View, null, React.createElement(RN.Text, null, title), React.createElement(RN.Text, null, subtitle), actions) }],
  ]));
  const imports = new Map([
    ['react-native', native], ['@expo/vector-icons', icons], ['expo-linear-gradient', gradient],
    ['expo-router', { Stack: { Screen: () => null }, useRouter: () => ({ push: (route) => routes.push(route) }) }],
    ['expo-status-bar', { StatusBar: () => null }],
    ['@tanstack/react-query', { useQuery: (options) => { queryOptions = options; return { data: bundle, isLoading: loading, isError: error,
      refetch: () => { retries++; return Promise.resolve(); } }; } }],
    ['../src/context/AuthProvider', { useAuth: () => ({ user: actor ? { id: actor } : null, loading: authLoading }) }],
    ['../components/ContentUI', contentUI], ['../src/design/typography', typography],
    ['../src/components/PluggdImage', { PluggdImage: (props) => React.createElement(RN.View, { style: props.style }) }],
    ['../src/features/culture/mobileServices', { loadLibraryBundle: () => { throw new Error('QUERY_DISPATCH_FORBIDDEN'); } }],
    ['../src/features/culture/libraryOwnershipDisplay', ownership],
    ['../src/features/culture/useCultureData', { useHomeFeed: () => ({ data: { releases: [], beats: [], events: [], profiles: [] } }) }],
    ['../src/context/StoreBillingProvider', { useStoreBilling: () => ({ adapter: { storeName: 'App Store' } }) }],
    ['../src/design/usePluggdTheme', themeModule],
  ]);
  const filename = path.join(nativeRoot, 'app/purchases.tsx');
  const { default: Screen } = evaluate(filename, imports, old ? fs.readFileSync(baselineFile, 'utf8') : undefined);
  const html = renderToStaticMarkup(React.createElement(Screen));
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  return { text, html, presses, routes, retries: () => retries, queryOptions };
}
const altitudeCount = (render) => (render.text.match(/Altitude/g) ?? []).length;
try {
  // Exact shape of the observed unsigned pending contract, with synthetic IDs.
  const pending = await serviceBundle({ licensing_contracts: [{ id: 'fixture-pending', beat_id: 'fixture-beat',
    status: 'pending', transaction_id: null, signed_at: null }], beats: [{ id: 'fixture-beat', title: 'Altitude', producer_name: 'Producer' }] });
  check('actual baseline Purchases reproduces pending Available now and derived duplicate RED', () => {
    assert.equal(pending.entitlements.length, 1);
    const before = renderPurchases(pending, { old: true });
    assert.match(before.text, /Available now/); assert.match(before.text, /pending/i); assert.equal(altitudeCount(before), 2);
  });
  check('actual pending Purchases is labelled history once, never Available now or empty GREEN', () => {
    const after = renderPurchases(pending);
    assert.match(after.text, /Purchase history/); assert.match(after.text, /Pending/);
    assert.doesNotMatch(after.text, /Available now|No purchases yet/); assert.equal(altitudeCount(after), 1);
    after.presses.find((p) => p.label === 'Open Altitude').action();
    assert.deepEqual(after.routes, ['/commerce/order?id=fixture-pending&kind=beat_license']);
  });
  const beat = { beats: [{ id: 'fixture-beat', title: 'Altitude' }] };
  const paid = await serviceBundle({ ...beat, purchases: [{ id: 'fixture-paid', beat_id: 'fixture-beat', status: 'paid' }] });
  check('actual paid order remains Available now once with original accessible receipt route', () => {
    const after = renderPurchases(paid); assert.match(after.text, /Available now/); assert.match(after.text, /paid/);
    assert.doesNotMatch(after.text, /Purchase history/); assert.equal(altitudeCount(after), 1);
    after.presses.find((p) => p.label === 'Open Altitude').action();
    assert.deepEqual(after.routes, ['/commerce/order?id=fixture-paid&kind=beat_license']);
  });
  for (const status of ['refunded', 'expired', 'revoked', 'failed', 'signed', 'unknown', null]) {
    const bundle = await serviceBundle({ ...beat, purchases: [{ id: 'fixture-status', beat_id: 'fixture-beat', status }] });
    check(`actual ${String(status)} order stays labelled history rather than a legacy default grant`, () => {
      const after = renderPurchases(bundle); assert.match(after.text, /Purchase history/); assert.doesNotMatch(after.text, /Available now/);
      assert.match(after.text, ['signed', 'unknown', null].includes(status) ? /access not confirmed/i : new RegExp(status,'i'));
      assert.equal(altitudeCount(after), 1);
    });
  }
  const expiredMember = await serviceBundle({ fan_subscriptions: [{ id: 'fixture-member', creator_id: 'fixture-creator', status: 'active', current_period_end: '2000-01-01T00:00:00Z' }] });
  check('expired active membership is history with honest Expired label', () => {
    const after = renderPurchases(expiredMember); assert.match(after.text, /Purchase history/); assert.match(after.text, /Expired/); assert.doesNotMatch(after.text, /Available now/);
  });
  const release = await serviceBundle({ release_purchases: [{ id: 'fixture-release', release_id: 'fixture-release-id', status: 'completed', download_expires_at: '2000-01-01T00:00:00Z' }] });
  check('completed paid release remains available after its download window only expires', () => {
    const after = renderPurchases(release); assert.match(after.text, /Available now/); assert.doesNotMatch(after.text, /Purchase history/);
  });
  const packs = await serviceBundle({ sample_pack_purchases: [{ id: 'fixture-pack-paid', sample_pack_id: 'paid', status: 'paid' }, { id: 'fixture-pack-pending', sample_pack_id: 'pending', status: 'pending' }] });
  check('sample pack legacy available default cannot promote pending, paid keeps exact raw status', () => {
    const after = renderPurchases(packs); assert.match(after.text, /Available now/); assert.match(after.text, /Purchase history/); assert.match(after.text, /sample pack · paid/); assert.match(after.text, /sample pack · Pending/);
  });
  for (const statuses of [['paid', 'paid'], ['paid', 'pending']]) {
    const duplicate = await serviceBundle({ ...beat, purchases: statuses.map((status) => ({ id: 'fixture-duplicate', beat_id: 'fixture-beat', status })) });
    check(`same identity ${statuses.join('/')} appears once with conservative state`, () => {
      const after = renderPurchases(duplicate); assert.equal(altitudeCount(after), 1);
      assert.equal(after.text.includes('Available now'), statuses.every((status) => status === 'paid'));
    });
  }
  check('real-shaped pending ticket order stays Tickets with status and original order route, no derived alias', () => {
    const ticket = { id: 'fixture-ticket', event_id: 'fixture-event', event_title: 'Night tickets', status: 'pending', venue: 'Venue', source: 'ticket_orders' };
    const after = renderPurchases({ ...emptyBundle(), tickets: [ticket], entitlements: [{ id: ticket.id, kind: 'ticket', title: ticket.event_title, status: ticket.status, route: '/events/fixture-event' }] });
    assert.match(after.text, /Tickets/); assert.match(after.text, /ticket · pending/); assert.doesNotMatch(after.text, /Available now|No purchases yet/);
    assert.equal((after.text.match(/Night tickets/g) ?? []).length, 1);
    after.presses.find((p) => p.label === 'Open Night tickets').action();
    assert.deepEqual(after.routes, ['/commerce/order?id=fixture-ticket&kind=event_ticket']);
  });
  check('loading/empty gateways and restore remain existing visible navigation', () => {
    const after = renderPurchases(emptyBundle()); assert.match(after.text, /No purchases yet|Start somewhere/);
    after.presses.find((p) => p.label === 'Explore Releases').action();
    after.presses.find((p) => p.label === 'Restore App Store memberships').action();
    assert.deepEqual(after.routes, ['/releases', '/membership']);
    const loading = renderPurchases(emptyBundle(), { loading: true }); assert.doesNotMatch(loading.text, /No purchases yet/); assert.match(loading.html, /progressbar/);
  });
  check('actual baseline query failure falsely claims no purchases RED; candidate error has real retry GREEN', () => {
    const before = renderPurchases(undefined, { old: true, error: true });
    assert.match(before.text, /No purchases yet/);
    const after = renderPurchases(undefined, { error: true });
    assert.match(after.text, /Your purchases could not load/);
    assert.doesNotMatch(after.text, /No purchases yet|Available now|Purchase history|Start somewhere/);
    after.presses.find((p) => p.label === 'Retry purchases').action();
    assert.equal(after.retries(), 1);
  });
  check('failed refresh or initial loading cannot retain stale available cards or ticket claims', () => {
    for (const state of [{ error: true }, { loading: true }]) {
      const after = renderPurchases(paid, state);
      assert.doesNotMatch(after.text, /Available now|Purchase history|Altitude|No purchases yet/);
    }
  });
  check('Purchases cache separates signed-in accounts', () => {
    const a = renderPurchases(paid, { actor: 'account-a' });
    const b = renderPurchases(paid, { actor: 'account-b' });
    assert.notDeepEqual(plain(a.queryOptions.queryKey), plain(b.queryOptions.queryKey));
    assert.equal(a.queryOptions.enabled, true);
  });
  check('signed-out and restoring-session Purchases cannot expose previous account cards', () => {
    for (const state of [{ actor: null }, { authLoading: true }]) {
      const after = renderPurchases(paid, state);
      assert.equal(after.queryOptions.enabled, false);
      assert.doesNotMatch(after.text, /Available now|Purchase history|Altitude|No purchases yet/);
    }
  });
  assert.equal(requests, 0);
  console.log(JSON.stringify({ status: 'PASS', cases: results.length, results, network_requests: requests,
    actual_sources: ['app/purchases.tsx', 'components/ContentUI.tsx', 'src/features/culture/mobileServices.ts', 'src/features/culture/libraryOwnershipDisplay.ts'],
    mocked_boundaries: ['query/actor/table fixtures', 'router push', 'fixed theme selection/header/chip/icons/images/gradient/inset/billing/feed/native metadata'],
    actual_design: 'selected dark tokens/typography values, no loaded-font or visual/device claim',
    compiler: 'selected installed Babel configFile=false/babelrc=false', runtime: 'React19.1/RN-web0.21.2 server rendering; no browser/native build',
    old_source: 'baseline-purchases.tsx actual source RED; candidate GREEN', physical_native_provider_payment_grant: 'NOT_RUN' }, null, 2));
} finally { globalThis.fetch = previousFetch; }
