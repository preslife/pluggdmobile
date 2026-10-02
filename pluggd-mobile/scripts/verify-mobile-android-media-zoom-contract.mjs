import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/features/culture/mediaZoomGeometry.ts', import.meta.url), 'utf8');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { module, exports: module.exports });
const { containedMediaSize, boundedMediaTransform, mediaPageDirection } = module.exports;

for (const [width, height, ratio] of [[390, 240, 16 / 9], [411, 500, 0.5], [900, 480, 1], [600, 300, 4]]) {
  const image = containedMediaSize(width, height, ratio);
  assert.ok(image.width <= width && image.height <= height);
  assert.ok(Math.abs(image.width / image.height - ratio) < 0.000001);
  for (const zoom of [0, 1, 1.5, 2, 4, 8]) {
    for (const x of [-9999, 0, 9999]) {
      for (const y of [-9999, 0, 9999]) {
        const value = boundedMediaTransform(zoom, x, y, image.width, image.height, width, height);
        assert.ok(value.scale >= 1 && value.scale <= 4);
        assert.ok(Math.abs(value.x) <= Math.max(0, (image.width * value.scale - width) / 2));
        assert.ok(Math.abs(value.y) <= Math.max(0, (image.height * value.scale - height) / 2));
        if (value.scale === 1) { assert.equal(value.x, 0); assert.equal(value.y, 0); }
      }
    }
  }
}
assert.equal(mediaPageDirection(1, -60, 10), 1);
assert.equal(mediaPageDirection(1, 60, 10), -1);
assert.equal(mediaPageDirection(1, 47, 0), 0);
assert.equal(mediaPageDirection(1, 60, 60), 0);
assert.equal(mediaPageDirection(2, -300, 0), 0);
const viewer = readFileSync(new URL('../src/features/culture/MobileSocialMediaViewer.tsx', import.meta.url), 'utf8');
assert.match(viewer, /activeImage && Platform\.OS === 'android'/);
assert.match(viewer, /AndroidZoomableImage key=\{`\$\{post\.id\}:\$\{imageIndex\}:\$\{activeImage\}`\}/);
assert.match(viewer, /GestureHandlerRootView style=\{styles\.zoomViewport\}/);
assert.match(viewer, /Gesture\.Simultaneous\(pinch, pan\)/);
assert.match(viewer, /Gesture\.Pan\(\)\.maxPointers\(1\)/);
assert.match(viewer, /if \(!success \|\| panWasZoomed\.value\) return/);
assert.match(viewer, /boundedMediaTransform\(zoom/);
assert.match(viewer, /reducedMotion \? 1 : withTiming/);
assert.match(viewer, /accessibilityLabel="Reset image zoom"/);
assert.match(viewer, /accessibilityActions=\{\[\{ name: 'increment', label: 'Zoom in' \}/);
assert.match(viewer, /: activeImage \? \([\s\S]*minimumZoomScale=\{1\}[\s\S]*maximumZoomScale=\{4\}/);
assert.match(viewer, /isVideo && post\.video \? <FullScreenVideo uri=\{post\.video\} \/> : null/);
console.log('PASS: Android contained-image bounds, zoom/pan limits, scale-one paging, attachment reset identity, modal gesture root, reduced motion and accessible zoom/reset; iOS ScrollView/video branches retained. Source/geometry evidence only; native gestures still require rendered/device acceptance.');
