import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');

// Execute the actual query/mapper functions, extracting declarations only to
// avoid booting unrelated native screens/services. The owner-readable SDK
// fixture deliberately includes all visibility/status combinations; filters
// in the product queries determine what can reach public result/cache data.
function functions(path, names, boundary) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true);
  const declarations = names.map(name => {
    const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(declaration, `Actual function missing: ${name}`);
    return declaration.getText(ast).replace(/^export\s+/, '');
  });
  const result = ts.transpileModule(declarations.join('\n'), {
    fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
  });
  assert.equal(result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  const context = vm.createContext({ ...boundary, Promise, Set, Map, console });
  return vm.runInContext(result.outputText + `\n({${names.join(',')}})`, context, { timeout: 1000 });
}
const owner = 'owner-fixture';
const mixes = [
  { id: 'mix-public', slug: 'public-set', status: 'published', visibility: 'public', title: 'Public fixture', city: 'City', audio_url: 'https://local.invalid/public.mp3', cover_url: 'https://local.invalid/public.jpg', owner_user_id: owner },
  ...['private', 'unlisted'].map(visibility => ({ id: `mix-${visibility}`, slug: `${visibility}-set`, status: 'published', visibility, title: `${visibility} secret fixture`, audio_url: `https://local.invalid/${visibility}.mp3`, cover_url: `https://local.invalid/${visibility}.jpg`, owner_user_id: owner })),
  { id: 'mix-draft', slug: 'draft-set', status: 'draft', visibility: 'public', title: 'draft secret fixture', audio_url: 'https://local.invalid/draft.mp3', owner_user_id: owner },
];
const playlist = mixes.map((mix, position) => ({ id: `item-${position}`, playlist_id: 'playlist', mix_id: mix.id, position,
  title: mix.title, artist: 'Cached creator', image_url: mix.cover_url, audio_url: mix.audio_url }));
const queryCalls = [];
const supabase = { from(table) {
  const entry = { table, eq: [], in: [], or: [] }; queryCalls.push(entry);
  const rows = () => {
    let data = table === 'mixes' ? mixes : table === 'playlist_items' ? playlist : [];
    data = data.filter(row => entry.eq.every(([key, value]) => row[key] === value)
      && entry.in.every(([key, values]) => values.includes(row[key])));
    for (const value of entry.or) {
      if (value.startsWith('id.eq.')) {
        const reference = value.slice('id.eq.'.length).split(',slug.eq.')[0];
        data = data.filter(row => row.id === reference || row.slug === reference);
      }
    }
    return data;
  };
  const builder = {
    select() { return this; }, eq(key, value) { entry.eq.push([key, value]); return this; }, in(key, values) { entry.in.push([key, values]); return this; },
    or(value) { entry.or.push(value); return this; }, order() { return this; }, limit() { return this; },
    maybeSingle() { return Promise.resolve({ data: rows()[0] || null, error: null }); },
    then(resolve, reject) { return Promise.resolve({ data: rows(), error: null }).then(resolve, reject); },
  };
  return builder;
} };
const services = functions('../src/features/culture/mobileServices.ts', ['safeList', 'safeMaybe', 'mapPlaylistTrack', 'loadPlaylistTracks', 'resolveMobileFeedAttachment'], { supabase });
const search = functions('../src/features/culture/useCultureData.ts', ['useUniversalSearch'], {
  supabase, safeList: services.safeList, useQuery: options => options, RELEASE_LIST_SELECT: 'fixture',
  loadBlockedUserIds: async () => new Set(), loadSafetySettings: async () => ({ ageBand: null, sensitiveContentEnabled: false }),
  canShowSensitiveContent: () => false, loadMobilePlaylists: async () => [], loadMobileStories: async () => [],
  searchSocialContent: async () => ({ posts: [], boards: [], hashtags: [] }),
});
const cases = [];
const test = (name, run) => cases.push({ name, run });
test('public native search excludes owner-readable private/unlisted/draft Mix metadata before caching', async () => {
  const query = search.useUniversalSearch('fixture'); const result = await query.queryFn();
  assert.deepEqual(JSON.parse(JSON.stringify(result.mixes.map(row => row.id))), ['mix-public']);
  assert.ok(!JSON.stringify(result).includes('secret fixture'));
});
test('native community attachment resolves only a published public Mix by ID or slug', async () => {
  for (const mix of mixes) {
    for (const reference of [mix.id, mix.slug]) {
      const result = await services.resolveMobileFeedAttachment({ attachmentType: 'mix', mixId: reference });
      if (mix.id === 'mix-public') assert.equal(result.title, 'Public fixture');
      else assert.equal(result, null, `${mix.id} cannot become a public attachment`);
    }
  }
});
test('playlist metadata cannot revive private Mix labels/artwork/audio from cached item snapshots', async () => {
  const rows = await services.loadPlaylistTracks('playlist'); assert.equal(rows.length, 4);
  const visible = rows.find(row => row.mix_id === 'mix-public'); assert.equal(visible.title, 'Public fixture'); assert.equal(visible.audio_url, mixes[0].audio_url);
  for (const item of rows.filter(row => row.mix_id !== 'mix-public')) {
    assert.equal(item.title, 'Mix unavailable'); assert.equal(item.creator, null); assert.equal(item.image_url, null); assert.equal(item.audio_url, null);
    assert.equal(item.route, `/mixes/${item.mix_id}`, 'explicit detail route can check current owner access without a cached capability');
  }
  assert.ok(!JSON.stringify(rows).includes('secret fixture'));
});
let failures = 0;
for (const { name, run } of cases) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack || error}`); }
}
assert.equal(failures, 0, `${failures}/${cases.length} public Mix consumer cases failed`);
console.log(`PASS ${cases.length} actual-source native public-consumer scenarios; synthetic owner-readable SDK rows, no hosted calls or UI/device proof.`);
