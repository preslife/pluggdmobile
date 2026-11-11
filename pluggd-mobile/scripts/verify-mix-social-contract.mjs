import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)('typescript');
function evaluate(source, extras = {}) {
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, { module, exports: module.exports, ...extras }); return module.exports;
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const { createMixSocialService, withMixSocialLock } = evaluate(read('src/features/listeningRoom/mixSocialService.ts'));
const scope = { actor: 'actor-one', generation: 1, instance: 'session' };
const calls = []; let current = true; let liked = false; let saved = false; let visible = true; let failWrite = false; let switchOnCounts = false;
let legacySaved = false; let failLegacyDelete = false;
function builder(table) {
  const query = { table, operation: 'select', filters: {}, body: null }; calls.push(query);
  const chain = {
    select: () => chain, eq: (key, value) => { query.filters[key] = value; return chain; },
    insert: value => { query.operation = 'insert'; query.body = value; return chain; },
    delete: () => { query.operation = 'delete'; return chain; },
    maybeSingle: async () => {
      if (table === 'mixes') { if (switchOnCounts) current = false; return { data: visible ? { like_count: liked ? 1 : 0, save_count: saved ? 1 : 0 } : null, error: null }; }
      if (table === 'saved_content') return { data: legacySaved ? { id: 'legacy-one' } : null, error: null };
      return { data: (table === 'mix_likes' ? liked : saved) ? { mix_id: 'mix-one' } : null, error: null };
    },
    then: (resolve, reject) => Promise.resolve().then(() => {
      if (failWrite) return { data: null, error: { message: 'offline' } };
      if (table === 'saved_content') {
        if (failLegacyDelete) return { data: null, error: { message: 'offline' } };
        assert.equal(query.operation, 'delete');
        assert.equal(query.filters.id, 'legacy-one');
        assert.equal(query.filters.content_type, 'mix');
        assert.equal(query.filters.content_id, 'mix-one');
        assert.equal(query.filters.user_id, 'actor-one');
        legacySaved = false;
      }
      if (table === 'mix_likes') liked = query.operation === 'insert';
      if (table === 'mix_saves') saved = query.operation === 'insert';
      return { data: null, error: null };
    }).then(resolve, reject),
  }; return chain;
}
const service = createMixSocialService({ from: builder }, value => { if (!current || value !== scope) throw new Error('account_changed'); });
assert.equal((await service.read(scope, 'mix-one')).saved, false);
assert.equal((await service.change(scope, 'mix-one', 'like', true)).liked, true);
assert.equal(saved, false);
assert.equal((await service.change(scope, 'mix-one', 'save', true)).saved, true);
assert.equal(liked, true);
assert.equal((await service.change(scope, 'mix-one', 'save', false)).saved, false);
for (const write of calls.filter(call => call.operation !== 'select')) {
  assert.equal(write.operation === 'insert' ? write.body.user_id : write.filters.user_id, 'actor-one');
}
assert.ok(calls.filter(call => call.table === 'mixes').every(call => call.filters.visibility === 'public' && call.filters.status === 'published'));
assert.ok(!calls.some(call => call.table === 'saved_content' && call.operation === 'insert'));
legacySaved = true;
assert.equal((await service.read(scope, 'mix-one')).saved, true);
assert.equal((await service.change(scope, 'mix-one', 'save', false)).saved, false);
assert.equal(legacySaved, false);
saved = true; legacySaved = true; failLegacyDelete = true;
await assert.rejects(service.change(scope, 'mix-one', 'save', false));
assert.equal(saved, false); assert.equal(legacySaved, true);
assert.equal((await service.read(scope, 'mix-one')).saved, true);
failLegacyDelete = false;
assert.equal((await service.change(scope, 'mix-one', 'save', false)).saved, false);
visible = false;
let writes = calls.filter(call => call.operation !== 'select').length;
await assert.rejects(service.change(scope, 'mix-one', 'like', false));
assert.equal(calls.filter(call => call.operation !== 'select').length, writes);
visible = true; switchOnCounts = true;
await assert.rejects(service.change(scope, 'mix-one', 'save', true));
assert.equal(calls.filter(call => call.operation !== 'select').length, writes);
switchOnCounts = false; current = true; failWrite = true;
await assert.rejects(service.change(scope, 'mix-one', 'save', true));
assert.equal(saved, false); failWrite = false;
current = false;
await assert.rejects(service.read(scope, 'mix-one'));
current = true;
await assert.rejects(service.change({ ...scope, actor: null }, 'mix-one', 'save', true));
let unlock; const first = withMixSocialLock('same-mix-actor', () => new Promise(resolve => { unlock = resolve; }));
await assert.rejects(withMixSocialLock('same-mix-actor', async () => assert.fail('second concurrent action ran')));
unlock('done'); await first;
assert.equal(await withMixSocialLock('same-mix-actor', async () => 'next'), 'next');
console.log('PASS canonical Like/Save, actor binding, public gating, failure handling and shared serialization');

// Execute the real Library loader with no-network table fixtures. Other ownership tables are empty.
const librarySource = read('src/features/culture/mobileServices.ts');
const start = librarySource.indexOf('export async function loadLibraryBundle()');
const end = librarySource.indexOf('export async function loadRecentlyPlayedLibraryItems', start);
assert.ok(start >= 0 && end > start);
const fixtures = {
  mix_saves: [{ mix_id: 'canonical', user_id: 'actor-one' }],
  saved_content: [
    { id: 'legacy-duplicate', content_type: 'mix', content_id: 'canonical', user_id: 'actor-one' },
    { id: 'legacy-mix', content_type: 'mix', content_id: 'legacy', user_id: 'actor-one' },
    { id: 'legacy-release', content_type: 'mix', content_id: 'old-release', user_id: 'actor-one' },
    { id: 'legacy-unavailable', content_type: 'mix', content_id: 'unavailable', metadata: { title: 'Old bookmark' }, user_id: 'actor-one' },
  ],
  mixes: [
    { id: 'canonical', slug: 'canonical-mix', title: 'Canonical mix', cover_url: 'cover', city: 'London', status: 'published', visibility: 'public' },
    { id: 'legacy', slug: 'legacy-mix', title: 'Legacy mix', status: 'published', visibility: 'public' },
    { id: 'unavailable', title: 'Private mix title must not escape', status: 'published', visibility: 'private' },
  ],
  releases: [{ id: 'old-release', title: 'Old release mix', artist: 'Artist' }],
};
const libraryCalls = [];
const fixtureClient = { from: table => {
  const request = { table, filters: {}, in: {} }; libraryCalls.push(request);
  const chain = { select: () => chain, eq: (key, value) => { request.filters[key] = value; return chain; },
    in: (key, values) => { request.in[key] = values; return chain; }, order: () => chain, limit: () => chain, or: () => chain,
    then: (resolve, reject) => Promise.resolve({ data: (fixtures[table] ?? []).filter(row => Object.entries(request.filters).every(([key, value]) => row[key] === value)
      && Object.entries(request.in).every(([key, values]) => values.includes(row[key]))), error: null }).then(resolve, reject) };
  return chain;
} };
const { loadLibraryBundle } = evaluate(librarySource.slice(start, end), {
  supabase: fixtureClient, getCurrentUserId: async () => 'actor-one', loadWalletTickets: async () => [],
  safeList: async query => (await query).data ?? [],
});
const library = await loadLibraryBundle();
assert.equal(library.saved.length, 4);
const canonical = library.saved.find(item => item.source === 'mix_saves');
assert.equal(canonical.route, '/mixes/canonical-mix');
assert.equal(library.saved.filter(item => item.route === '/mixes/canonical-mix').length, 1);
assert.equal(library.saved.find(item => item.id === 'legacy-mix').route, '/mixes/legacy-mix');
assert.equal(library.saved.find(item => item.id === 'legacy-release').route, '/release/old-release');
assert.equal(library.saved.find(item => item.id === 'legacy-unavailable').title, 'Old bookmark');
assert.ok(!JSON.stringify(library).includes('Private mix title'));
assert.equal(libraryCalls.find(call => call.table === 'mix_saves').filters.user_id, 'actor-one');
assert.ok(libraryCalls.filter(call => call.table === 'mixes').every(call => call.filters.visibility === 'public' && call.filters.status === 'published'));
console.log('PASS canonical Library visibility/deduplication and legacy Mix/release bookmark preservation');

const hook = read('src/features/listeningRoom/useMixSocial.ts');
assert.match(hook, /scope: captured/);
assert.match(hook, /mixAccessSession\.current\(variables\.scope\)/);
assert.match(hook, /\['mix-social', identity\.key, mixId/);
assert.match(hook, /await client\.cancelQueries\(\{ queryKey: key, exact: true \}\)/);
assert.match(hook, /await client\.fetchQuery/);
assert.doesNotMatch(hook, /toggleSavedContent|saved_content/);
const player = read('app/player.tsx');
assert.match(player, /mixSocial\.toggleLike\(\)/);
assert.match(player, /mixSocial\.toggleSave\(\)/);
assert.match(player, /label=\{mixSocial\.saved \? 'Saved' : 'Save'\}/);
assert.match(player, /currentTrack\.mixId \|\| saving/);
console.log('Mix social contract: PASS. No live reads or writes.');
