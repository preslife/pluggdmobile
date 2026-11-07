import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function load(source, dependencies = {}) {
  const module = { exports: {} };
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  vm.runInNewContext(result.outputText, { module, exports: module.exports, Number, Math, Map, Set, Promise, AbortController, console,
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1, clearTimeout: () => {},
    require: name => { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; },
  });
  return module.exports;
}
const { chooseInlineVideo } = load(read('src/features/culture/inlineVideoVisibility.ts'));

test('autoplay selects exactly one mostly visible video nearest the usable screen centre', () => {
  const frames = [{ id: 'above', y: -200, height: 300 }, { id: 'centre', y: 250, height: 300 }, { id: 'below', y: 700, height: 300 }];
  assert.equal(chooseInlineVideo(frames, 900), 'centre');
  assert.equal(chooseInlineVideo([{ id: 'clipped', y: 650, height: 300 }], 900), null);
  assert.equal(chooseInlineVideo([{ id: 'invalid', y: NaN, height: 300 }, { id: 'zero', y: 100, height: 0 }], 900), null);
});
test('explicit Play works on a partially visible video and still stops offscreen', () => {
  assert.equal(chooseInlineVideo([{ id: 'manual', y: 650, height: 300, preferred: true }], 900), 'manual');
  assert.equal(chooseInlineVideo([{ id: 'manual', y: 800, height: 300, preferred: true }], 900), null);
  assert.equal(chooseInlineVideo([{ id: 'manual', y: 650, height: 300, preferred: true }, { id: 'auto', y: 250, height: 300 }], 900), 'manual');
});

function coordinator() {
  const effects = [];
  const appListeners = new Set();
  let id = 0;
  let delayed;
  const appState = { currentState: 'active', addEventListener: (_, listener) => { appListeners.add(listener); return { remove: () => appListeners.delete(listener) }; } };
  const react = { useId: () => String(++id), useRef: () => ({ current: { measureInWindow: callback => { delayed = callback; } } }), useState: value => [value, () => {}], useEffect: fn => effects.push(fn), useSyncExternalStore: (_subscribe, snapshot) => snapshot() };
  const module = load(read('src/features/culture/useInlineVideoVisibility.ts') + '\nexport { measure, entries, suspensions }; export const getSelected = () => selected;', { react, '@react-navigation/native': { useIsFocused: () => true }, 'react-native': { AppState: appState, Dimensions: { get: () => ({ height: 900 }) } }, './inlineVideoVisibility': { chooseInlineVideo } });
  return { ...module, effects, appState, appListeners, complete: () => delayed(0, 250, 300, 300) };
}
test('fullscreen suspension cancels an in-flight visibility result; close resumes selection', () => {
  const c = coordinator();
  c.entries.set('video', { view: { measureInWindow: callback => { c.pending = callback; } }, preferred: false });
  c.measure();
  c.useSuspendInlineVideos(true);
  const release = c.effects.shift()();
  c.pending(0, 250, 300, 300);
  assert.equal(c.getSelected(), null);
  release();
  c.pending(0, 250, 300, 300);
  assert.equal(c.getSelected(), 'video');
});
test('background and unregister prevent a late measurement from restarting playback', () => {
  const c = coordinator();
  c.entries.set('video', { view: { measureInWindow: callback => { c.pending = callback; } }, preferred: false });
  c.measure(); c.appState.currentState = 'background'; c.pending(0, 250, 300, 300);
  assert.equal(c.getSelected(), null);
  c.appState.currentState = 'active'; c.measure(); c.entries.delete('video'); c.pending(0, 250, 300, 300);
  assert.equal(c.getSelected(), null);
});
