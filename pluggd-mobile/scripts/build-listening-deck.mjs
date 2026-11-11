import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Normal rebuilds use pinned local devDependencies. Existing toolchains may be used read-only.
const toolchain = process.env.PLUGGD_DECK_TOOLCHAIN_ROOT ?? root;
const require = createRequire(join(toolchain, 'package.json'));
const esbuild = require('esbuild');
for (const [name, expected] of [['three', '0.184.0'], ['esbuild', '0.21.5']]) {
  const actual = JSON.parse(await readFile(join(toolchain, 'node_modules', name, 'package.json'), 'utf8')).version;
  if (actual !== expected) throw new Error(`${name}: expected ${expected}, received ${actual}`);
}
const assets = join(root, 'assets/listening-room');
const model = await readFile(join(assets, 'pluggd-deck-mobile.glb'));
const jsonLength = model.readUInt32LE(12);
const gltf = JSON.parse(model.subarray(20, 20 + jsonLength).toString());
const primitives = gltf.meshes.flatMap(mesh => mesh.primitives);
const triangles = primitives.reduce((sum, p) => sum + gltf.accessors[p.indices].count / 3, 0);
if (triangles !== 738094) throw new Error('Approved deck geometry changed; review its appearance before rebuilding.');
const renderer = join(root, 'src/features/listeningRoom/renderer');
const result = await esbuild.build({
  entryPoints: [join(renderer, 'entry.renderer.ts')], bundle: true, write: false,
  format: 'iife', platform: 'browser', target: ['safari16.4', 'chrome110'], minify: true,
  legalComments: 'inline', nodePaths: [join(toolchain, 'node_modules')],
  plugins: [{ name: 'embedded-approved-model', setup(build) {
    build.onResolve({ filter: /^\.\/model\.generated$/ }, () => ({ path: 'model', namespace: 'approved-model' }));
    build.onLoad({ filter: /.*/, namespace: 'approved-model' }, () => ({ contents: `export default ${JSON.stringify(model.toString('base64'))};`, loader: 'js' }));
  } }],
});
const javascript = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const nonce = createHash('sha256').update(javascript).digest('hex').slice(0, 32);
const licenceText = (await Promise.all(['THREE-LICENSE.txt', 'MESHOPTIMIZER-LICENSE.txt'].map(file => readFile(join(renderer, file), 'utf8')))).join('\n\n');
const html = `<!doctype html><!-- Bundled third-party notices\n${licenceText}\n--><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src 'nonce-${nonce}'; img-src https: data: blob:; connect-src blob:; media-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><style nonce="${nonce}">html,body,#deck{width:100%;height:100%;padding:0;margin:0;overflow:hidden;background:transparent}#deck{position:relative;touch-action:pan-y;user-select:none;-webkit-user-select:none}canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}#arm,#record,#start{position:absolute;left:0;top:0;outline:none;border:0;background:transparent}#arm{width:52px;height:52px;border-radius:50%;z-index:3;touch-action:none}#record{border-radius:50%;z-index:2;touch-action:none}#start{display:none}.is-gesturing{touch-action:none!important}</style></head><body><div id="deck"><canvas id="surface"></canvas><div id="record"></div><div id="arm"></div><div id="start"></div></div><script nonce="${nonce}">${javascript}</script></body></html>`;
await writeFile(join(assets, 'deck.html'), html);
const sha = value => createHash('sha256').update(value).digest('hex');
await writeFile(join(assets, 'bundle-manifest.json'), JSON.stringify({
  schemaVersion: 1, source: 'PLUGGD approved web deck, corrections 1e1d9bf26de8449bce1be9c8b014b96eb39fd225',
  three: '0.184.0', esbuild: '0.21.5', meshoptimizer: 'Three.js embedded meshoptimizer 1.1 decoder',
  model: { file: 'pluggd-deck-mobile.glb', bytes: model.byteLength, sha256: sha(model), triangles,
    extensionsRequired: gltf.extensionsRequired },
  html: { file: 'deck.html', bytes: Buffer.byteLength(html), sha256: sha(html) },
  licences: ['../../src/features/listeningRoom/renderer/THREE-LICENSE.txt', '../../src/features/listeningRoom/renderer/MESHOPTIMIZER-LICENSE.txt'],
}, null, 2) + '\n');
console.log(`Built local listening-deck bundle: ${Buffer.byteLength(html)} bytes, ${triangles} source triangles.`);
