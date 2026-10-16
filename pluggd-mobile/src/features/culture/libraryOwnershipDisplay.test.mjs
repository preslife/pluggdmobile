import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Run with the selected installed dependency directory and retained baseline folder.
// No service, browser, native player or production API is invoked.
const here = path.dirname(fileURLToPath(import.meta.url));
const dependencies = path.resolve(process.argv[2]);
const baseline = path.resolve(process.argv[3]);
const requireDependency = createRequire(path.join(dependencies, 'react/package.json'));
const ts = requireDependency('typescript');
const React = requireDependency('react');
const RN = requireDependency('react-native-web');
const { renderToStaticMarkup } = requireDependency('react-dom/server');
const nativeRoot = path.resolve(here, '../../..');
const results = [];
let requests = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { requests++; throw new Error('NETWORK_FORBIDDEN'); };
const plain = (value) => JSON.parse(JSON.stringify(value));
const now = Date.now();

function evaluate(filename, imports, source = fs.readFileSync(filename, 'utf8')) {
  const output = ts.transpileModule(source, {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.equal(output.diagnostics?.length ?? 0, 0, `syntax: ${filename}`);
  const module = { exports: {} };
  const selectedRequire = (name) => {
    if (imports.has(name)) return imports.get(name);
    if (['react', 'react/jsx-runtime'].includes(name)) return requireDependency(name);
    throw new Error(`UNEXPECTED_MODULE:${name}`);
  };
  vm.runInNewContext(output.outputText, {
    module, exports: module.exports, require: selectedRequire, Date, console,
    fetch: globalThis.fetch,
  }, { filename, timeout: 2000 });
  return module.exports;
}

const ownership = evaluate(path.join(here, 'libraryOwnershipDisplay.ts'), new Map());
function item(status, source = 'purchases', extra = {}) {
  return { id: 'fixture-order', source, kind: 'beat_license', title: 'Altitude',
    route: '/commerce/order?id=fixture-order&kind=beat_license', status,
    ownershipStatus: status, ...extra };
}
function check(name, fn) { fn(); results.push({ name, status: 'PASS' }); }
function emptyBundle() { return { saved: [], purchases: [], tickets: [], entitlements: [] }; }

function serviceBundle(tables, old = false) {
  const queries = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'fixture-buyer' } } }) },
    from(table) {
      const calls = [];
      const query = {};
      for (const method of ['select', 'eq', 'in', 'or', 'order', 'limit']) {
        query[method] = (...args) => { calls.push([method, ...args]); return query; };
      }
      for (const method of ['insert', 'update', 'upsert', 'delete']) {
        query[method] = () => { throw new Error(`WRITE_FORBIDDEN:${method}`); };
      }
      query.then = (resolve, reject) => {
        queries.push({ table, calls });
        const selected = calls.find(([method]) => method === 'select')?.[1] ?? '';
        const rows = plain(tables[table] ?? []).map((row) => {
          if (table === 'sample_pack_purchases' && !selected.split(',').includes('status')) delete row.status;
          return row;
        });
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      };
      return query;
    },
    rpc() { throw new Error('RPC_FORBIDDEN'); },
  };
  const imports = new Map([
    ['../../lib/supabase', { supabase }], ['../../lib/storageUpload', {}],
    ['../../lib/mobileContent', {}], ['./mobileCapabilities', {}],
    ['../live/liveRoomLoading', {}], ['../connect/connect-card-data', {}],
    ['./mobileSocial', {}], ['../safety/accountSafety', {}],
  ]);
  const filename = path.join(here, 'mobileServices.ts');
  const source = old ? fs.readFileSync(path.join(baseline, 'baseline-mobileServices.ts'), 'utf8') : undefined;
  const service = evaluate(filename, imports, source);
  return service.loadLibraryBundle().then((bundle) => ({ bundle: plain(bundle), queries: plain(queries) }));
}

function renderLibrary(bundle, { old = false, loading = false, error = false, actor = 'fixture-buyer', authLoading = false } = {}) {
  const presses = [];
  const routes = [];
  let retried = 0;
  let queryOptions;
  const Pressable = (props) => {
    presses.push({ label: props.accessibilityLabel, action: props.onPress });
    return React.createElement(RN.Pressable, props);
  };
  const colors = new Proxy({}, { get: (_, key) => key === 'background' ? '#101010' : '#eeeeee' });
  const imports = new Map([
    ['react-native', { ...RN, Pressable }],
    ['@expo/vector-icons', { MaterialIcons: () => null }],
    ['expo-linear-gradient', { LinearGradient: ({ colors: ignored, ...props }) => React.createElement(RN.View, props) }],
    ['expo-router', { Stack: { Screen: () => null }, useRouter: () => ({ push: (route) => routes.push(route) }) }],
    ['expo-status-bar', { StatusBar: () => null }],
    ['@tanstack/react-query', { useQuery: (options) => { queryOptions = options; return { data: bundle, isLoading: loading, isError: error, refetch: () => { retried++; } }; } }],
    ['../src/context/AuthProvider', { useAuth: () => ({ user: actor ? { id: actor } : null, loading: authLoading }) }],
    ['../src/components/PluggdImage', { PluggdImage: (props) => React.createElement(RN.View, { style: props.style }) }],
    ['../src/design/typography', { pluggdFonts: new Proxy({}, { get: () => 'sans-serif' }) }],
    ['../src/design/useBottomChromeInset', { useBottomChromeInset: () => 0 }],
    ['../src/features/discovery/DiscoveryHeader', { DiscoveryHeader: () => null }],
    ['../src/features/culture/mobileServices', { loadLibraryBundle: () => { throw new Error('UNEXPECTED_QUERY_DISPATCH'); } }],
    ['../src/features/culture/libraryOwnershipDisplay', ownership],
    ['../src/features/discovery/publicDestinations', { DISCOVERY_DESTINATION_ART: { library: undefined } }],
    ['../src/design/usePluggdTheme', { usePluggdTheme: () => ({ scheme: 'dark', colors }) }],
  ]);
  const filename = path.join(nativeRoot, 'app/library.tsx');
  const source = old ? fs.readFileSync(path.join(baseline, 'baseline-library.tsx'), 'utf8') : undefined;
  const { default: Screen } = evaluate(filename, imports, source);
  const html = renderToStaticMarkup(React.createElement(Screen));
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  return { text, html, presses, routes, retries: () => retried, queryOptions };
}

try {
  // Shape of Root's actual unsigned pending contract; synthetic IDs, no genuine actor/session.
  const pendingTables = { licensing_contracts: [{ id: 'fixture-pending', beat_id: 'fixture-beat',
    status: 'pending', transaction_id: null, signed_at: null }],
    beats: [{ id: 'fixture-beat', title: 'Altitude', producer_name: 'Producer' }] };
  const pending = await serviceBundle(pendingTables);
  const oldPending = await serviceBundle(pendingTables, true);
  const before = renderLibrary(oldPending.bundle, { old: true });
  check('old actual Library reproduces pending ownership/double-count RED', () => {
    assert.match(before.text, /Owned & unlocked/);
    assert.match(before.text, /2 verified items/);
  });
  const after = renderLibrary(pending.bundle);
  check('actual pending Library renders history, zero ACCESS and no owned heading', () => {
    assert.match(after.text, /Purchase history/); assert.match(after.text, /PENDING/);
    assert.match(after.text, /0 ACCESS/); assert.doesNotMatch(after.text, /Owned & unlocked|verified item/);
    assert.doesNotMatch(after.text, /Build a library that brings you back/);
  });
  check('pending row retains order navigation and purchases gateway', () => {
    after.presses.find((p) => p.label === 'Open Altitude').action();
    after.presses.find((p) => p.label === 'Open purchases and access').action();
    assert.deepEqual(after.routes, ['/commerce/order?id=fixture-pending&kind=beat_license', '/purchases']);
  });
  const paidTables = { purchases: [{ id: 'fixture-paid', beat_id: 'fixture-beat', status: 'paid' }], beats: pendingTables.beats };
  const paid = await serviceBundle(paidTables);
  check('confirmed actual component counts one despite derived entitlement', () => {
    assert.equal(paid.bundle.entitlements.length, 1);
    const rendered = renderLibrary(paid.bundle);
    assert.match(rendered.text, /1 verified item/); assert.match(rendered.text, /1 ACCESS/);
    assert.match(rendered.text, /Owned & unlocked/); assert.doesNotMatch(rendered.text, /Purchase history|2 verified/);
  });
  check('Library cache separates signed-in accounts', () => {
    const a = renderLibrary(paid.bundle, { actor: 'account-a' });
    const b = renderLibrary(paid.bundle, { actor: 'account-b' });
    assert.notDeepEqual(plain(a.queryOptions.queryKey), plain(b.queryOptions.queryKey));
    assert.equal(a.queryOptions.enabled, true);
  });
  check('signed-out and restoring-session Library cannot expose previous account cards', () => {
    for (const state of [{ actor: null }, { authLoading: true }]) {
      const screen = renderLibrary(paid.bundle, state);
      assert.equal(screen.queryOptions.enabled, false);
      assert.doesNotMatch(screen.text, /Altitude|Owned & unlocked|verified item|Build a library that brings you back/);
    }
  });
  check('Library loading or failed refresh cannot expose cached ownership claims', () => {
    for (const state of [{ loading: true }, { error: true }]) {
      const screen = renderLibrary(paid.bundle, state);
      assert.doesNotMatch(screen.text, /Altitude|Owned & unlocked|verified item|Build a library that brings you back/);
    }
  });
  for (const status of ['pending', 'failed', 'refunded', 'expired', 'revoked', 'signed', 'available', null, 'unknown']) {
    check(`${String(status)} cannot become confirmed ownership`, () => {
      const projected = ownership.projectLibraryOwnership([item(status, 'licensing_contracts')], now);
      assert.equal(projected.owned.length, 0); assert.equal(projected.history.length, 1);
    });
  }
  check('signed contract even with transaction pointer stays unconfirmed', () => {
    assert.equal(ownership.projectLibraryOwnership([item('signed', 'licensing_contracts', { transaction_id: 'fixture-intent' })], now).owned.length, 0);
  });
  check('canonical active contract remains owned', () => {
    assert.equal(ownership.projectLibraryOwnership([item('active', 'licensing_contracts')], now).owned.length, 1);
  });
  const unknownBeat = await serviceBundle({ purchases: [{ id: 'fixture-unknown', beat_id: 'fixture-beat', status: null }] });
  check('legacy completed default cannot hide missing raw beat status', () => {
    assert.equal(unknownBeat.bundle.purchases[0].status, 'completed');
    assert.equal(ownership.projectLibraryOwnership(unknownBeat.bundle.purchases, now).owned.length, 0);
  });
  const packs = await serviceBundle({ sample_pack_purchases: [
    { id: 'fixture-pack-paid', sample_pack_id: 'pack-paid', status: 'paid' },
    { id: 'fixture-pack-pending', sample_pack_id: 'pack-pending', status: 'pending' },
  ] });
  check('actual paid/pending sample-pack mapping preserves available legacy fields', () => {
    const projected = ownership.projectLibraryOwnership(packs.bundle.purchases, now);
    assert.deepEqual(plain(projected.owned.map((p) => p.id)), ['fixture-pack-paid']);
    assert.deepEqual(plain(projected.history.map((p) => p.id)), ['fixture-pack-pending']);
    assert.ok(packs.bundle.purchases.every((p) => p.status === 'available'));
  });
  const release = await serviceBundle({ release_purchases: [{ id: 'fixture-release', release_id: 'release', status: 'completed', download_expires_at: '2000-01-01T00:00:00Z' }] });
  check('expired release download window does not revoke completed ownership', () => {
    assert.equal(ownership.projectLibraryOwnership(release.bundle.purchases, now).owned.length, 1);
  });
  for (const expiry of ['2000-01-01T00:00:00Z', 'not-a-date']) {
    check(`membership access fails closed for ${expiry}`, () => {
      assert.equal(ownership.projectLibraryOwnership([item('active', 'fan_subscriptions', { ownershipExpiresAt: expiry })], now).owned.length, 0);
    });
  }
  check('future active membership access remains confirmed', () => {
    assert.equal(ownership.projectLibraryOwnership([item('active', 'fan_subscriptions', { ownershipExpiresAt: '2099-01-01T00:00:00Z' })], now).owned.length, 1);
  });
  check('duplicate confirmed rows count once; conflicting state fails closed', () => {
    assert.equal(ownership.projectLibraryOwnership([item('paid'), item('paid')], now).owned.length, 1);
    const conflicting = ownership.projectLibraryOwnership([item('paid'), item('pending')], now);
    assert.equal(conflicting.owned.length, 0); assert.equal(conflicting.history.length, 1);
  });
  check('unrecognized/prototype status or source cannot promote or crash', () => {
    const poisoned = item('__proto__', '__proto__');
    assert.equal(ownership.projectLibraryOwnership([poisoned], now).owned.length, 0);
    assert.equal(ownership.libraryHistoryStatus(poisoned, now), 'Access not confirmed');
  });
  check('saved music/navigation, loading, error/retry and empty states remain', () => {
    const saved = { ...emptyBundle(), saved: [{ id: 'saved', source: 'favorites', kind: 'beat', title: 'Saved track', route: '/beat/saved' }] };
    const screen = renderLibrary(saved); assert.match(screen.text, /Saved music/);
    screen.presses.find((p) => p.label === 'Open Saved track').action(); assert.deepEqual(screen.routes, ['/beat/saved']);
    assert.match(renderLibrary(emptyBundle()).text, /Build a library that brings you back/);
    assert.doesNotMatch(renderLibrary(emptyBundle(), { loading: true }).text, /Build a library that brings you back/);
    const failed = renderLibrary(emptyBundle(), { error: true }); assert.match(failed.text, /Your Library could not load/);
    failed.presses.find((p) => p.label === 'Retry Library').action(); assert.equal(failed.retries(), 1);
    assert.doesNotMatch(failed.text, /Build a library that brings you back/);
  });
  check('original loader fields and queries preserved except permitted status SELECT', () => {
    const strip = (bundle) => plain({ ...bundle, purchases: bundle.purchases.map(({ ownershipStatus, ownershipExpiresAt, ...legacy }) => legacy) });
    assert.deepEqual(strip(pending.bundle), oldPending.bundle);
    const normalizedQueries = pending.queries.map((query) => ({ ...query, calls: query.calls.map((call) =>
      query.table === 'sample_pack_purchases' && call[0] === 'select'
        ? ['select', call[1].replace(',status,', ',')] : call) }));
    assert.deepEqual(normalizedQueries, oldPending.queries);
    assert.equal(requests, 0);
  });
  console.log(JSON.stringify({ status: 'PASS', cases: results.length, results,
    actual_source: 'LibraryScreen/loadLibraryBundle/ownership helper',
    renderer: 'React19.1 + actual RN-web0.21.2 static markup; synthetic query/router/theme boundaries',
    baseline_defect_reproduced: true, network_requests: requests,
    physical_live_native_acceptance: 'NOT_RUN' }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}
