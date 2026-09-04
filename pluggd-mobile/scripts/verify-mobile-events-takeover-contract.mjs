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
    Intl,
    Date,
    Error,
    Number,
    String,
    Object,
    Array,
    Set,
  });
  new vm.Script(transpiled.outputText, { filename }).runInContext(context);
  return module.exports;
}

const modelSource = read('src/features/events/eventTakeovers.ts');
const board = read('src/features/editorial/EventsBoardScreen.tsx');
const discoveryData = read('src/features/events/eventDiscoveryData.ts');
const model = executeTypeScriptModule(modelSource, 'eventTakeovers.ts');
const config = model.NOTTING_HILL_CARNIVAL_2026_TAKEOVER;

const candidate = (overrides = {}) => ({
  title: 'Notting Hill Carnival warm-up party',
  description: 'A dancehall warm-up before the road.',
  starts_at: '2026-08-28T20:00:00.000Z',
  ends_at: '2026-08-29T02:00:00.000Z',
  city: 'London',
  location: 'Ladbroke Grove, London W10',
  venue_name: 'The Example',
  genre_tags: ['dancehall'],
  event_tags: ['carnival', 'warm-up'],
  ticket_url: 'https://tickets.example.com',
  ...overrides,
});

for (const [instant, expected] of [
  ['2026-08-09T12:00:00.000Z', 'hidden'],
  ['2026-08-10T12:00:00.000Z', 'preview'],
  ['2026-08-17T12:00:00.000Z', 'planning'],
  ['2026-08-29T12:00:00.000Z', 'live'],
  ['2026-08-31T22:30:00.000Z', 'live'],
  ['2026-09-01T12:00:00.000Z', 'wind_down'],
  ['2026-09-08T12:00:00.000Z', 'archived'],
]) {
  assert.equal(model.resolveEventTakeoverPhase(config, new Date(instant)), expected, `phase for ${instant}`);
}
assert.equal(model.zonedCalendarDay(new Date('2026-08-31T23:30:00.000Z'), 'Europe/London'), '2026-09-01');
assert.equal(model.isEventTakeoverEntryVisible('hidden'), false);
assert.equal(model.isEventTakeoverEntryVisible('planning'), true);
assert.equal(model.isEventTakeoverEntryVisible('live'), true);
assert.equal(model.isEventTakeoverEntryVisible('wind_down'), true);
assert.equal(model.isEventTakeoverEntryVisible('archived'), false);

assert.equal(model.eventBelongsToTakeover(candidate(), config), true);
assert.equal(model.eventBelongsToTakeover(candidate({ title: 'London culture night', description: 'A community gathering', event_tags: ['culture'] }), config), false);
assert.equal(model.eventBelongsToTakeover(candidate({ starts_at: '2026-10-01T20:00:00.000Z' }), config), false);
assert.equal(model.eventBelongsToTakeover(candidate({ city: 'Leeds', location: 'Leeds', title: 'Leeds Carnival' }), config), false);
assert.equal(model.eventBelongsToTakeover(candidate({ starts_at: 'not-a-date' }), config), false);
assert.equal(model.eventBelongsToTakeover(candidate({ city: null, location: 'Westbourne Park, W11' }), config), true);

const categoryCandidate = candidate({ description: 'Free family workshop and talk before Carnival.' });
assert.equal(model.eventMatchesTakeoverCategory(categoryCandidate, 'free', config), true);
assert.equal(model.eventMatchesTakeoverCategory(categoryCandidate, 'workshops', config), true);
assert.equal(model.eventMatchesTakeoverCategory(categoryCandidate, 'sounds', config), false);
assert.equal(model.eventMatchesTakeoverCategory(categoryCandidate, 'missing', config), false);
assert.equal(model.takeoverGroupForEvent(candidate({ starts_at: '2026-08-28T20:00:00.000Z' }), config), 'before');
assert.equal(model.takeoverGroupForEvent(candidate({ starts_at: '2026-08-30T12:00:00.000Z' }), config), 'live');
assert.equal(model.takeoverGroupForEvent(candidate({ starts_at: '2026-09-02T20:00:00.000Z' }), config), 'after');

for (const required of [
  'experienceMode',
  'isEventTakeoverEntryVisible',
  'eventBelongsToTakeover',
  'eventMatchesTakeoverCategory',
  'takeoverGroupForEvent',
  'Open Carnival mode',
  'Complete guide',
  'All Events',
  'LocalSceneRail',
  'CompactEventBoard',
  'TakeoverDiscovery',
  "router.push(NOTTING_HILL_CARNIVAL_2026_TAKEOVER.hubHref as any)",
]) {
  assert.ok(board.includes(required), `Events board must contain ${required}`);
}
assert.match(board, /useState\(8\)/, 'Event Board must start at eight');
assert.match(board, /Math\.min\(filtered\.length, count \+ 8\)/, 'Event Board must add eight');
assert.match(board, /mapQuery[\s\S]*filtered\.map\(\(event\)/, 'map must consume the canonical filtered collection');
assert.match(board, /loadPublicEventDiscovery\(\{ includePastSince: TAKEOVER_COLLECTION_QUERY_FLOOR \}\)/, 'Events must request the bounded takeover candidate window');
assert.match(board, /eventCandidates\.filter\(\(event\) => isPublicActiveEvent\(event, takeoverClock\.getTime\(\)\)\)/, 'normal Events must remain active/upcoming only');
assert.match(board, /eventCandidates\.filter\(\(event\) => eventBelongsToTakeover/, 'takeover membership must consume the complete bounded candidate collection');
assert.match(discoveryData, /loadPublicEventDiscovery[\s\S]*activeEventWindowFilter[\s\S]*includePastSince[\s\S]*pastEventWindowFilter/, 'the existing paged loader must own active plus bounded past candidates');
assert.match(discoveryData, /loadPublicActiveEvents[\s\S]*loadPublicEventDiscovery\(\{ pageSize \}\)/, 'existing active-only loader callers must retain their contract');
assert.doesNotMatch(board, /function FullEventCards/, 'obsolete one-column full feed must be removed');
assert.match(board, /const EVENTS_SERIF_FONT = edFonts\.serif;/, 'Events must use the approved PLUGGD editorial font token');
assert.doesNotMatch(board, /fontFamily:\s*['"]Georgia['"]|Platform\.OS[^\n]*Georgia|Georgia[^\n]*Platform\.OS/, 'Events must not restore the old iPhone-only Georgia exception');
for (const obsoleteOverlay of ['spotlightDateTicket', 'mapRecommendationDate']) {
  assert.ok(!board.includes(obsoleteOverlay), `${obsoleteOverlay} must not cover event artwork`);
}
assert.match(board, /posterArtwork[\s\S]*posterDateBadge[\s\S]*posterOverlayCopy[\s\S]*posterFooter/, 'Upcoming must use the accepted artwork badge, lower overlay and separate footer hierarchy');
assert.doesNotMatch(board, /function DateBlock/, 'compact list and board must not restore the obsolete date tile');
assert.ok(!board.includes(".from('event_takeovers')"), 'takeover must not create a second backend');

console.log('mobile Events Cultural Takeover model and source contract verified');
