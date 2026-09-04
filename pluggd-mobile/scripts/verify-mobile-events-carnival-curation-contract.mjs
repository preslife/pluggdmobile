import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function executeTypeScriptModule(source, filename) {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    fileName: filename,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `TypeScript transpile diagnostics in ${filename}`);

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    Map,
    Set,
    Array,
  });
  new vm.Script(transpiled.outputText, { filename }).runInContext(context);
  return module.exports;
}

const helperSource = read('src/features/events/carnivalFeaturedPlans.ts');
const board = read('src/features/editorial/EventsBoardScreen.tsx');
const { resolveCarnivalFeaturedPlans } = executeTypeScriptModule(helperSource, 'carnivalFeaturedPlans.ts');

const event = (id, title = id) => ({ id, title });
const topPick = event('chronological-top', 'Required chronological Top Pick');
const fallbackA = event('chronological-fallback-a');
const curatedA = event('curated-a');
const curatedB = event('curated-b');
const curatedC = event('curated-c');
const curatedD = event('curated-d');
const citySplash = event('97409057-97fd-4190-99b8-eef633d58bfa', 'City Splash: Carnival Warm Up Party');
const fallbackB = event('chronological-fallback-b');
const ineligible = event('not-an-eligible-carnival-event');

const eligibleChronologicalEvents = [
  topPick,
  fallbackA,
  curatedC,
  citySplash,
  curatedB,
  curatedD,
  curatedA,
  fallbackB,
];
const adminCuratedItems = [
  { event: curatedA },
  { event: curatedB },
  { event: curatedC },
  { event: curatedD },
  { event: citySplash },
  { event: topPick },
  { event: citySplash },
  { event: ineligible },
];

const resolved = resolveCarnivalFeaturedPlans(
  adminCuratedItems,
  eligibleChronologicalEvents,
  topPick.id,
  6,
);

assert.deepEqual(
  [...resolved].map(({ id }) => id),
  [curatedA.id, curatedB.id, curatedC.id, curatedD.id, citySplash.id, fallbackA.id],
  'Featured plans must preserve admin order, keep City Splash fifth, exclude Top Pick/duplicates/ineligible rows and use chronology only as fallback',
);
assert.deepEqual(
  [...resolveCarnivalFeaturedPlans([], eligibleChronologicalEvents, topPick.id, 3)].map(({ id }) => id),
  [fallbackA.id, curatedC.id, citySplash.id],
  'Chronological order must be the honest fallback when no eligible curation exists',
);
assert.deepEqual([...resolveCarnivalFeaturedPlans(adminCuratedItems, eligibleChronologicalEvents, topPick.id, 0)], []);

assert.match(board, /const takeoverSpotlight = takeoverRailEvents\[0\] \?\? filtered\[0\]/, 'Carnival Top Pick must remain chronological');
assert.match(board, /resolveCarnivalFeaturedPlans<EventItem>\([\s\S]*?spotlightQuery\.data,[\s\S]*?takeoverRailEvents,[\s\S]*?takeoverSpotlight\?\.id,[\s\S]*?6,[\s\S]*?\)/, 'Featured plans must resolve from admin curation against eligible chronological Carnival events');
assert.match(board, /<TakeoverDiscovery[\s\S]*?events=\{filtered\}[\s\S]*?featuredPlans=\{takeoverFeaturedPlans\}/, 'Takeover discovery must receive the curated Featured plans separately from the programme');
assert.match(board, /const programmeGroups = useMemo\([\s\S]*?events\.slice\(0, 10\)/, 'Full Programme must retain the existing chronological events prop');
assert.match(board, /heading="All Carnival Events"[\s\S]*?events=\{filtered\}|events=\{filtered\}[\s\S]*?heading="All Carnival Events"/, 'All Carnival Events must retain the filtered chronological collection');
assert.doesNotMatch(board, /const featuredPlans = railEvents\.filter/, 'Featured plans must not revert to direct chronological derivation');

console.log('mobile Carnival Featured plans curation contract verified');
