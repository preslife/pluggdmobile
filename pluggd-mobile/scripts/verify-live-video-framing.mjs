import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const requireDependency = createRequire(new URL('../package.json', import.meta.url));
const ts = requireDependency('typescript');
const source = readFileSync(new URL('../src/features/live/liveVideoFraming.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(code, {
  module, exports: module.exports,
  require(name) {
    assert.equal(name, '../../lib/agora');
    return { OrientationMode: { OrientationModeFixedPortrait: 2 } };
  },
});
const { portraitLiveDimensions, portraitPreviewDimensions, configurePortraitLiveVideo } = module.exports;
let passed = 0;
function check(name, test) {
  test();
  passed++;
  console.log(`PASS ${name}`);
}

check('phone camera encoding uses fixed 9:16 rather than the device display ratio', () => {
  const dimensions = portraitLiveDimensions();
  assert.deepEqual({ ...dimensions }, { width: 720, height: 1280 });
  assert.equal(dimensions.width * 16, dimensions.height * 9);
  assert.equal(dimensions.width % 8, 0);
  assert.equal(dimensions.height % 8, 0);
});
check('tall, compact and landscape displays do not change the camera aspect', () => {
  for (const viewport of [{ width: 430, height: 932 }, { width: 393, height: 852 }, { width: 375, height: 667 }, { width: 932, height: 430 }]) {
    const preview = portraitPreviewDimensions(viewport);
    assert.ok(Math.abs(preview.width / preview.height - 9 / 16) < 0.000001);
    assert.ok(preview.width <= viewport.width - 32);
  }
});
check('Green Room shows the same full camera aspect within its available width and scroll area', () => {
  for (const viewport of [{ width: 430, height: 932 }, { width: 320, height: 568 }, { width: 180, height: 800 }]) {
    const frame = portraitLiveDimensions();
    const preview = portraitPreviewDimensions(viewport);
    assert.ok(preview.width <= viewport.width - 32);
    assert.ok(preview.height <= 520);
    assert.ok(Math.abs(preview.width / preview.height - frame.width / frame.height) < 0.000001);
  }
});
check('native publisher config makes capture and local preview follow the portrait encoding', () => {
  const calls = [];
  configurePortraitLiveVideo({
    setVideoEncoderConfiguration: (config) => { calls.push(['encode', config]); return 0; },
    setCameraCapturerConfiguration: (config) => { calls.push(['capture', config]); return 0; },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].orientationMode, 2);
  assert.equal(calls[0][1].dimensions.width, 720);
  assert.equal(calls[0][1].dimensions.height, 1280);
  assert.equal(calls[1][1].followEncodeDimensionRatio, true);
});
check('a rejected encoder configuration fails visibly before pretending the camera is prepared', () => {
  let captureCalled = false;
  assert.throws(() => configurePortraitLiveVideo({
    setVideoEncoderConfiguration: () => -2,
    setCameraCapturerConfiguration: () => { captureCalled = true; return 0; },
  }), /Could not prepare the live camera/);
  assert.equal(captureCalled, false);
});
check('a rejected capture configuration fails visibly', () => {
  assert.throws(() => configurePortraitLiveVideo({
    setVideoEncoderConfiguration: () => 0,
    setCameraCapturerConfiguration: () => -2,
  }), /Could not prepare the live camera/);
});
console.log(`${passed} live framing behavior checks passed; physical camera and viewer proof remain separate.`);
