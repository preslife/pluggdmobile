import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = (source) => {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(output.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
  return output.outputText;
};
const module = { exports: {} };
vm.runInNewContext(compile(read('src/lib/musicShare.ts')), {
  module, exports: module.exports, encodeURIComponent,
  require: (name) => { throw new Error(`Unexpected runtime dependency: ${name}`); },
});
const { playbackShareUrl, playbackShareContent, releaseShareContent } = module.exports;

// Run the actual screen callbacks at the Share API boundary, without starting
// playback, creating a native build or posting anything to another application.
function screenShare(path, scope) {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  const visit = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(ast) === 'handleShare') {
      handler = ts.isVariableDeclaration(node) ? `const ${node.getText(ast)};` : node.getText(ast);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(handler, `Share handler is present in ${path}`);
  const context = { ...scope, handler: undefined };
  vm.runInNewContext(compile(`${handler}\nhandler = handleShare;`), context);
  return context.handler;
}

const releaseId = '172d879c-e2b0-4c3f-a715-ef0beb328417';
const trackId = '761748bf-a3c6-41a0-a8a4-6c842ae78332';
const track = {
  id: trackId, releaseId, trackId,
  title: 'Last Dance', artist: 'European 305', type: 'release',
  url: 'https://private.test/audio.mp3?token=never-share-this',
};
const trackUrl = `https://pluggd.fm/release/${releaseId}?track=${trackId}`;

function playerFixture(currentTrack = track, result = async () => ({ action: 'sharedAction' })) {
  const calls = [], alerts = [];
  const handle = screenShare('app/player.tsx', {
    currentTrack, playbackShareContent, selectionHaptic() {},
    Share: { share: async (content) => { calls.push(content); return result(); } },
    Alert: { alert: (...args) => alerts.push(args) },
  });
  return { handle, calls, alerts };
}

test('Last Dance reaches the native share sheet with its exact track link in the message', async () => {
  const f = playerFixture();
  await f.handle();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].title, 'Last Dance');
  assert.equal(f.calls[0].message, `Listen to Last Dance by European 305 on PLUGGD.\n${trackUrl}`);
  assert.equal(f.calls[0].message.match(/https:\/\//g).length, 1);
  assert.equal(f.calls[0].url, undefined, 'one complete text item avoids separate-item omissions/duplicates');
  assert.doesNotMatch(f.calls[0].message, /token=|audio\.mp3|private\.test/);
  assert.equal(f.alerts.length, 0);
});

test('sharing follows the active queue track instead of the first track or EP alone', async () => {
  const f = playerFixture({ ...track, id: 'next', trackId: 'next', title: 'Next song' });
  await f.handle();
  assert.equal(f.calls[0].message, `Listen to Next song by European 305 on PLUGGD.\nhttps://pluggd.fm/release/${releaseId}?track=next`);
});

for (const [field, id, path] of [
  ['releaseId', 'single', '/release/single'],
  ['beatId', 'beat', '/beat/beat'],
  ['mixId', 'mix', '/mixes/mix'],
  ['samplePackId', 'pack', '/sample-packs/pack'],
  ['soundboardId', 'board', '/soundboards/board'],
]) {
  test(`player shares the public ${field} page, including legacy releases without a track ID`, () => {
    const content = playbackShareContent({ [field]: id, title: 'Music', artist: 'Creator', url: track.url });
    assert.equal(content.message, `Listen to Music by Creator on PLUGGD.\nhttps://pluggd.fm${path}`);
  });
}

test('encodes content identifiers and preserves exact track selection without leaking other state', () => {
  assert.equal(playbackShareUrl({ releaseId: ' release/id ', trackId: 'song?x=1&y=2' }),
    'https://pluggd.fm/release/release%2Fid?track=song%3Fx%3D1%26y%3D2');
});

test('missing content identity reports an unavailable link instead of sharing a description or audio URL', async () => {
  for (const value of [null, { ...track, releaseId: undefined }, { releaseId: ' ', url: track.url }]) {
    const f = playerFixture(value);
    await f.handle();
    assert.equal(f.calls.length, 0);
    assert.equal(f.alerts[0][0], 'Link unavailable');
  }
});

test('native sheet cancellation is quiet and real sharing errors are visible', async () => {
  const cancelled = playerFixture(track, async () => ({ action: 'dismissedAction' }));
  await cancelled.handle();
  assert.equal(cancelled.alerts.length, 0);
  const failed = playerFixture(track, async () => { throw new Error('Native share failed'); });
  await failed.handle();
  assert.equal(failed.alerts[0][0], 'Could not share');
});

test('the release screen shares the whole EP link independently of the player selection', async () => {
  const calls = [];
  const handle = screenShare('app/release/[id].tsx', {
    release: { id: releaseId, title: "’26 HEATERS", artist: 'European 305' },
    releaseShareContent,
    Share: { share: async (content) => { calls.push(content); } },
    Alert: { alert: () => assert.fail('successful share must not show an error') },
  });
  await handle();
  assert.equal(calls[0].message, `PLUGGD release: ’26 HEATERS by European 305\nhttps://pluggd.fm/release/${releaseId}`);
  assert.doesNotMatch(calls[0].message, /\?track=/);
});

test('the release screen handles a failed share without an unhandled rejection', async () => {
  const alerts = [];
  const handle = screenShare('app/release/[id].tsx', {
    release: { id: releaseId, title: 'EP' }, releaseShareContent,
    Share: { share: async () => { throw new Error('Native share failed'); } },
    Alert: { alert: (...args) => alerts.push(args) },
  });
  await handle();
  assert.equal(alerts[0][0], 'Could not share');
});
