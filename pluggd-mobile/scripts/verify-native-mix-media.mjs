import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/features/studio/nativeMixMediaPreparation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
assert.equal(compiled.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
const exports = {};
let timerSerial=0;
const timers=new Map();
new Function('require', 'exports', 'process', 'setTimeout', 'clearTimeout', compiled.outputText)(id => {
  if (id === '@react-native-async-storage/async-storage') return { default: {} };
  if (id === 'expo-crypto' || id === 'expo-file-system/legacy') return {};
  if (id === '../../lib/supabase') return { supabase: {} };
  if (id === '../../lib/storageUpload') return {};
  if (id === '../playback/mixAccessSession') return {};
  if (id === '../playback/nativeMixAccess') return {};
  throw new Error(`Unexpected module: ${id}`);
}, exports, { env: {} }, (callback,delay)=>{const id=++timerSerial;timers.set(id,{callback,delay});return id;}, id=>timers.delete(id));
const { NativeMixMediaPreparation, NativeMixMediaError } = exports;
const project = 'https://qkwvqmubhyondemhasjp.supabase.co';
const actor = '20000000-0000-4000-8000-000000000001';
const mix = '10000000-0000-4000-8000-000000000001';
const other = '10000000-0000-4000-8000-000000000002';
const sourceAudio = `${actor}/${mix}/audio/original.mp3`;
const audio = { uri: 'file:///documents/selected.mp3', name: 'private name.mp3', size: 1, mimeType: 'audio/mpeg' };
const cover = { uri: 'file:///documents/selected.jpg', name: 'private name.jpg' };
const scope = { actor, generation: 1, instance: 'fixture' };
const hash = value => Promise.resolve(createHash('sha256').update(value).digest('hex'));
let count = 0;
function fixture() {
  let serial = 0;
  const remote = new Map(), receipts = new Map(), local = new Map();
  const log = [], deleted = [];
  const f = {
    remote, receipts, local, log, deleted, current: true, ready: true,
    uploadMode: 'success', copyMode: 'success', uploadCount: 0, copyCount: 0, downloadCount: 0,
    infoError: undefined, sourceDenied: false, transferSize: 96, transferExpectedSize: 96,
    transferStatus: 200, transferRejects: false, wrongGrant: false, grantOwner: true, noCache: false,
    beforeUpload: undefined, afterUpload: undefined, onReady: undefined, onProgress: undefined,
    put(bucket, path, size = 96, md5) { remote.set(`${bucket}/${path}`, { name: path, size, md5 }); },
    input(overrides = {}) { return { actorId: actor, scope, mixId: mix, visibility: 'private', kind: 'audio', file: audio, ...overrides }; },
  };
  local.set(audio.uri, { exists: true, isDirectory: false, size: 96, md5: 'a'.repeat(32) });
  local.set(cover.uri, { exists: true, isDirectory: false, size: 48, md5: 'b'.repeat(32) });
  const deps = {
    projectUrl: project, hash, randomUUID: () => `30000000-0000-4000-8000-${String(++serial).padStart(12, '0')}`,
    session: { current: () => f.current },
    client: {
      functions: { invoke: async (name, options) => { log.push(['capabilities', name, options]); f.onReady?.(); return {
        data: { version: 1, privateMixes: f.ready, ownerWrites: 1, maxAudioBytes: 150 * 1024 * 1024 }, error: null,
      }; } },
      storage: { from: bucket => ({
        info: async path => {
          log.push(['info', bucket, path]);
          const error = f.infoError || (f.sourceDenied && path.endsWith('original.mp3') ? 403 : undefined);
          if (error) return { data: null, error: { statusCode: String(error) } };
          const data = remote.get(`${bucket}/${path}`);
          return { data: data || null, error: data ? null : { statusCode: '404' } };
        },
        copy: async (path, target, { destinationBucket }) => {
          f.copyCount++; log.push(['copy', bucket, path, destinationBucket, target]);
          if (f.copyMode === 'denied') return { data: null, error: { statusCode: '403' } };
          const data = remote.get(`${bucket}/${path}`);
          if (data) f.put(destinationBucket, target, data.size);
          if (f.copyMode === 'uncertain') throw new Error('provider signed secret');
          return { data: data ? { path: `${destinationBucket}/${target}` } : null, error: data ? null : { statusCode: '404' } };
        },
        createSignedUrl: async path => ({ data: { signedUrl: `${project}/storage/v1/object/sign/${bucket}/${path}?token=synthetic-cover` }, error: null }),
      }) },
    },
    storage: {
      getItem: async key => receipts.get(key) ?? null,
      setItem: async (key, value) => { log.push(['receipt', key]); receipts.set(key, value); },
    },
    files: {
      cacheDirectory: 'file:///cache/', FileSystemSessionType: { FOREGROUND: 0 },
      getInfoAsync: async uri => local.get(uri) || { exists: false },
      copyAsync: async ({from,to}) => { local.set(to,{...local.get(from)}); },
      deleteAsync: async uri => { deleted.push(uri); local.delete(uri); },
      createDownloadResumable: (url, uri, options, progress) => {
        f.downloadCount++; log.push(['download', url, uri, options]);
        let canceled = false;
        return {
          cancelAsync: async () => { canceled = true; log.push(['cancel']); },
          downloadAsync: async () => {
            f.onProgress?.();
            progress({ totalBytesWritten: f.transferSize, totalBytesExpectedToWrite: f.transferExpectedSize });
            if (canceled) return undefined;
            local.set(uri, { exists: true, isDirectory: false, size: f.transferSize });
            if (f.transferRejects) throw new Error('native network interruption with private grant');
            return { status: f.transferStatus, uri };
          },
        };
      },
    },
    access: {
      read: async id => { log.push(['read', id]); return { owner: f.grantOwner, mix: { owner_user_id: actor } }; },
      play: async id => { log.push(['play', id]); return { url: `${project}/storage/v1/object/sign/audio-files/${f.wrongGrant ? 'wrong.mp3' : sourceAudio}?token=synthetic-audio` }; },
    },
    upload: async input => {
      f.uploadCount++; log.push(['upload', input]); f.beforeUpload?.();
      if (f.uploadMode !== 'failed') f.put(input.bucket, input.path, local.get(input.uri)?.size,local.get(input.uri)?.md5);
      f.afterUpload?.();
      if (f.uploadMode !== 'success') throw new Error('provider token=private-secret file:///private-path');
    },
  };
  f.deps = deps;
  f.prep = new NativeMixMediaPreparation(deps);
  return f;
}
async function test(name, run) { await run(); assert.equal(timers.size,0,`${name}: request timer leaked`); count++; console.log(`PASS ${name}`); }
const reason = expected => error => error instanceof NativeMixMediaError && error.reason === expected;

await test('private audio uses an immutable parent-bound path and disk upload, with durable receipt before I/O', async () => {
  const f = fixture(); const result = await f.prep.prepare(f.input());
  assert.match(result, new RegExp(`^mix-media/${actor}/${mix}/audio/[0-9a-f-]+\\.mp3$`));
  const upload = f.log.find(row => row[0] === 'upload')[1];
  assert.ok(upload.uri.startsWith('file:///cache/pluggd-mix-upload-')); assert.equal(upload.upsert, false); assert.equal(upload.foreground, true);
  assert.ok(f.log.findIndex(row => row[0] === 'receipt') < f.log.findIndex(row => row[0] === 'upload'));
  assert.ok(!result.includes('private name')); assert.ok(f.deleted.every(uri => uri.startsWith('file:///cache/pluggd-mix-upload-')));
});
await test('private/unlisted artwork is never uploaded to a public bucket; public cover has an explicit public copy', async () => {
  for (const visibility of ['private', 'unlisted', 'public']) {
    const f = fixture(); const result = await f.prep.prepare(f.input({ visibility, kind: 'cover', file: cover }));
    const upload = f.log.find(row => row[0] === 'upload')[1];
    assert.equal(upload.bucket, visibility === 'public' ? 'release-artwork' : 'mix-media');
    assert.ok(result.startsWith(visibility === 'public' ? `${project}/storage/v1/object/public/release-artwork/` : 'mix-media/'));
  }
});
await test('public audio replacement is also protected; unchanged legacy public playback is preserved', async () => {
  const f = fixture(); await f.prep.prepare(f.input({ visibility: 'public' }));
  assert.equal(f.log.find(row => row[0] === 'upload')[1].bucket, 'mix-media');
  const existing = `${project}/storage/v1/object/public/Mixes-audio/legacy.mp3`;
  assert.equal(await f.prep.prepare(f.input({ visibility: 'public', file: null, existing })), existing);
  assert.equal(f.uploadCount, 1);
});
await test('older/disabled capability response prevents all file writes', async () => {
  const f = fixture(); f.ready = false;
  await assert.rejects(f.prep.prepare(f.input()), reason('unavailable'));
  assert.equal(f.uploadCount + f.copyCount, 0); assert.equal(f.receipts.size, 0);
});
await test('actor or route change during readiness prevents any upload or receipt write', async () => {
  const f = fixture(); f.onReady = () => { f.current = false; };
  await assert.rejects(f.prep.prepare(f.input()), reason('changed')); assert.equal(f.uploadCount, 0); assert.equal(f.receipts.size, 0);
  const g = fixture(); await assert.rejects(g.prep.prepare(g.input({ assertCurrent() { throw new Error('route changed'); } })), reason('unavailable'));
  assert.equal(g.log.length, 0);
});
await test('missing, remote, zero, directory, oversized and unsupported local files are rejected before upload', async () => {
  for (const variant of ['missing', 'remote', 'zero', 'directory', 'large', 'type']) {
    const f = fixture(); let file = { ...audio };
    if (variant === 'remote') file.uri = 'https://foreign.invalid/audio.mp3';
    if (variant === 'type') file.name = 'payload.exe';
    if (variant === 'missing') f.local.delete(audio.uri);
    if (variant === 'zero') f.local.get(audio.uri).size = 0;
    if (variant === 'directory') f.local.get(audio.uri).isDirectory = true;
    if (variant === 'large') f.local.get(audio.uri).size = 150 * 1024 * 1024 + 1;
    await assert.rejects(f.prep.prepare(f.input({ file })), NativeMixMediaError); assert.equal(f.uploadCount, 0);
  }
});
await test('claimed picker size cannot hide an oversized file and artwork has its own 10 MiB bound', async () => {
  const f = fixture(); f.local.get(cover.uri).size = 10 * 1024 * 1024 + 1;
  await assert.rejects(f.prep.prepare(f.input({ kind: 'cover', file: { ...cover, size: 1 } })), reason('tooLarge'));
  assert.equal(f.uploadCount, 0);
});
await test('uncertain successful upload is recovered immediately without deleting or uploading again', async () => {
  const f = fixture(); f.uploadMode = 'uncertain';
  const result = await f.prep.prepare(f.input());
  const next = new NativeMixMediaPreparation(f.deps);
  assert.equal(await next.prepare(f.input()), result); assert.equal(f.uploadCount, 1); assert.equal(f.deleted.length, 1);
});
await test('failed upload retries the same persisted destination after app restart', async () => {
  const f = fixture(); f.uploadMode = 'failed';
  await assert.rejects(f.prep.prepare(f.input()), reason('unavailable'));
  const first = f.log.find(row => row[0] === 'upload')[1]; f.uploadMode = 'success';
  await new NativeMixMediaPreparation(f.deps).prepare(f.input());
  assert.equal(f.log.filter(row => row[0] === 'upload')[1][1].path, first.path); assert.equal(f.deleted.length, 2);
});
await test('changing selected file contents creates a new receipt even for the same URI and size', async () => {
  const f = fixture(); const first = await f.prep.prepare(f.input());
  f.local.get(audio.uri).md5 = 'c'.repeat(32);
  const second = await f.prep.prepare(f.input()); assert.notEqual(first, second); assert.equal(f.uploadCount, 2);
});
await test('actor change after a completed upload never returns success and keeps recovery data', async () => {
  const f = fixture(); f.afterUpload = () => { f.current = false; };
  await assert.rejects(f.prep.prepare(f.input()), reason('changed'));
  assert.equal(f.remote.size, 1); assert.equal(f.receipts.size, 1); assert.equal(f.deleted.length, 1);
});
await test('corrupt or wrong-parent recovery receipts fail closed without writes', async () => {
  const f = fixture(); f.uploadMode = 'failed'; await assert.rejects(f.prep.prepare(f.input()));
  const [key, value] = [...f.receipts][0]; const receipt = JSON.parse(value); receipt.path = `${actor}/${other}/audio/30000000-0000-4000-8000-000000000001.mp3`;
  f.receipts.set(key, JSON.stringify(receipt)); f.uploadMode = 'success';
  await assert.rejects(f.prep.prepare(f.input()), NativeMixMediaError); assert.equal(f.uploadCount, 1);
});
await test('target readback errors or a mismatched size do not trigger overwrites', async () => {
  const f = fixture(); const result = await f.prep.prepare(f.input());
  f.remote.get(result).size = 95;
  await assert.rejects(f.prep.prepare(f.input()), NativeMixMediaError); assert.equal(f.uploadCount, 1);
  const g = fixture(); g.infoError = 403;
  await assert.rejects(g.prep.prepare(g.input()), NativeMixMediaError); assert.equal(g.uploadCount, 0);
});
await test('same-parent protected audio is verified and reused without duplicating', async () => {
  const f = fixture(); f.put('mix-media', sourceAudio);
  assert.equal(await f.prep.prepare(f.input({ file: null, existing: `mix-media/${sourceAudio}` })), `mix-media/${sourceAudio}`);
  assert.equal(f.copyCount + f.uploadCount, 0);
});
await test('duplicate Mix media copies into the new parent instead of reusing original paths', async () => {
  const f = fixture(); f.put('mix-media', sourceAudio);
  const result = await f.prep.prepare(f.input({ mixId: other, file: null, sourceMixId: mix, existing: `mix-media/${sourceAudio}` }));
  assert.ok(result.startsWith(`mix-media/${actor}/${other}/audio/`)); assert.equal(f.copyCount, 1); assert.ok(f.remote.has(`mix-media/${sourceAudio}`));
});
await test('private-to-public artwork is copied out of protected storage while its original remains', async () => {
  const f = fixture(); const path = `${actor}/${mix}/cover/original.jpg`; f.put('mix-media', path, 48);
  const result = await f.prep.prepare(f.input({ file: null, kind: 'cover', existing: `mix-media/${path}`, visibility: 'public' }));
  assert.ok(result.startsWith(`${project}/storage/v1/object/public/release-artwork/`)); assert.ok(f.remote.has(`mix-media/${path}`));
});
await test('uncertain server-side copy is resolved through target readback without download', async () => {
  const f = fixture(); f.put('audio-files', sourceAudio); f.copyMode = 'uncertain';
  await f.prep.prepare(f.input({ file: null, existing: `audio-files/${sourceAudio}` }));
  assert.equal(f.copyCount, 1); assert.equal(f.downloadCount, 0);
});
await test('ACL-limited legacy audio uses source Mix owner/read/play authority and bounded native disk copy', async () => {
  const f = fixture(); f.copyMode = 'denied'; f.sourceDenied = true;
  const result = await f.prep.prepare(f.input({ mixId: other, sourceMixId: mix, file: null, existing: `audio-files/${sourceAudio}` }));
  assert.ok(result.startsWith(`mix-media/${actor}/${other}/audio/`));
  assert.deepEqual(f.log.filter(row => ['read', 'play'].includes(row[0])).map(row => row.slice(0, 2)), [['read', mix], ['play', mix]]);
  assert.equal(f.downloadCount, 1); assert.equal(f.uploadCount, 1); assert.equal(f.deleted.length, 1);
  const saved = [...f.receipts.values()].join(''); assert.ok(!saved.includes('token=') && !saved.includes('synthetic-audio'));
});
await test('audio grant for another source or non-owner cannot authorize a legacy copy', async () => {
  for (const property of ['wrongGrant', 'grantOwner']) {
    const f = fixture(); f.copyMode = 'denied'; f.sourceDenied = true; f[property] = property === 'wrongGrant';
    await assert.rejects(f.prep.prepare(f.input({ file: null, existing: `audio-files/${sourceAudio}` })), NativeMixMediaError);
    assert.equal(f.downloadCount, 0); assert.equal(f.uploadCount, 0);
  }
});
await test('download progress exceeding the audio limit cancels before upload and removes only its scratch copy', async () => {
  const f = fixture(); f.copyMode = 'denied'; f.sourceDenied = true; f.transferExpectedSize = 150 * 1024 * 1024 + 1;
  await assert.rejects(f.prep.prepare(f.input({ file: null, existing: `audio-files/${sourceAudio}` })), reason('tooLarge'));
  assert.equal(f.uploadCount, 0); assert.equal(f.log.filter(row => row[0] === 'cancel').length, 1);
  assert.ok(f.deleted.every(uri => uri.startsWith('file:///cache/pluggd-mix-copy-')));
});
await test('actor switch during native download cancels transfer before an upload', async () => {
  const f = fixture(); f.copyMode = 'denied'; f.sourceDenied = true; f.onProgress = () => { f.current = false; };
  await assert.rejects(f.prep.prepare(f.input({ file: null, existing: `audio-files/${sourceAudio}` })), reason('changed'));
  assert.equal(f.uploadCount, 0); assert.ok(f.log.some(row => row[0] === 'cancel'));
});
await test('truncated or non-200 legacy responses cannot become protected assets', async () => {
  for (const status of [206, 404]) {
    const f = fixture(); f.copyMode = 'denied'; f.sourceDenied = true; f.transferStatus = status;
    await assert.rejects(f.prep.prepare(f.input({ file: null, existing: `audio-files/${sourceAudio}` })), NativeMixMediaError);
    assert.equal(f.uploadCount, 0); assert.equal(f.deleted.length, 1);
  }
  const g = fixture(); g.copyMode = 'denied'; g.put('audio-files', sourceAudio, 100);
  await assert.rejects(g.prep.prepare(g.input({ file: null, existing: `audio-files/${sourceAudio}` })), reason('changed'));
  assert.equal(g.uploadCount, 0);
});
await test('foreign origins, traversal, double escapes and unsupported private source types require a replacement file', async () => {
  for (const existing of ['https://foreign.invalid/storage/v1/object/public/audio-files/set.mp3', 'mix-media/../set.mp3',
    `${project}/storage/v1/object/sign/audio-files/%252e%252e/set.mp3?token=synthetic`, 'audio-files/set.exe', 'https://user:pass@qkwvqmubhyondemhasjp.supabase.co/storage/v1/object/public/audio-files/set.mp3']) {
    const f = fixture(); await assert.rejects(f.prep.prepare(f.input({ file: null, existing })), NativeMixMediaError);
    assert.equal(f.copyCount + f.downloadCount + f.uploadCount, 0);
  }
});
await test('optional absent artwork is allowed, absent audio and actor mismatch are rejected', async () => {
  const f = fixture(); assert.equal(await f.prep.prepare(f.input({ file: null, kind: 'cover' })), null);
  await assert.rejects(f.prep.prepare(f.input({ file: null })), reason('fileRequired'));
  await assert.rejects(f.prep.prepare(f.input({ actorId: other })), reason('changed'));
});
await test('concurrent preparation shares one immutable upload and checks each caller before returning', async () => {
  const f = fixture();
  const [first, second] = await Promise.all([f.prep.prepare(f.input()), f.prep.prepare(f.input())]);
  assert.equal(first, second); assert.equal(f.uploadCount, 1);
});
await test('a recovery-storage failure prevents upload and leaves the selected local file intact', async () => {
  const f = fixture(); f.deps.storage.setItem = async () => { throw new Error('storage full /private/path'); };
  await assert.rejects(f.prep.prepare(f.input()), error => reason('unavailable')(error) && !error.message.includes('/private/path'));
  assert.equal(f.uploadCount, 0); assert.ok(f.local.has(audio.uri));
});
await test('a changed local file during upload is never acknowledged as the selected asset', async () => {
  const f = fixture(); f.afterUpload = () => { f.local.get(audio.uri).md5 = 'e'.repeat(32); };
  await assert.rejects(f.prep.prepare(f.input()), reason('changed'));
  assert.equal(f.remote.size, 1); assert.equal(f.deleted.length, 1);
  // Restoring the original selection can recover only the original captured
  // bytes, not the changed source; the immutable target was fed a snapshot.
  f.local.get(audio.uri).md5 = 'a'.repeat(32); f.afterUpload = undefined;
  assert.ok(await new NativeMixMediaPreparation(f.deps).prepare(f.input()));
  assert.equal(f.uploadCount,1);
  assert.equal([...f.remote.values()][0].md5,'a'.repeat(32));
});
await test('signed legacy artwork fallback keeps the grant in memory and deletes only its temporary file', async () => {
  const f = fixture(); f.copyMode = 'denied';
  const path = `${actor}/legacy-cover.jpg`;
  await f.prep.prepare(f.input({ file: null, kind: 'cover', existing: `release-artwork/${path}` }));
  assert.equal(f.downloadCount, 1); assert.equal(f.uploadCount, 1); assert.equal(f.deleted.length, 1);
  assert.ok(![...f.receipts.values()].join('').includes('token='));
  assert.ok(!f.log.some(row => row[0] === 'play'));
});
await test('native download rejection cancels before deleting its partial private scratch file', async () => {
  const f = fixture(); f.copyMode = 'denied'; f.sourceDenied = true; f.transferRejects = true;
  await assert.rejects(f.prep.prepare(f.input({file:null,existing:`audio-files/${sourceAudio}`})),reason('unavailable'));
  assert.equal(f.log.filter(row => row[0] === 'cancel').length,1);
  assert.equal(f.deleted.length,1); assert.equal(f.uploadCount,0);
  assert.ok(f.deleted.every(uri => !f.local.has(uri)));
});
await test('timed-out native uploads retain their disk snapshots until the native promise settles', async () => {
  for(const existing of [null,`audio-files/${sourceAudio}`]) {
    const f=fixture(); f.copyMode='denied'; f.sourceDenied=true;
    let finish, uploadUri;
    f.deps.upload=input=>{uploadUri=input.uri;return new Promise(resolve=>{finish=()=>{f.put(input.bucket,input.path,96);resolve();};});};
    const preparing=f.prep.prepare(f.input(existing?{file:null,existing}:{}));
    // Drive actual async preparation to the controlled native I/O boundary.
    for(let step=0;step<100&&!finish;step++) await Promise.resolve();
    assert.ok(finish,'native upload started'); assert.ok(f.local.has(uploadUri));
    const deadline=[...timers.values()].find(timer=>timer.delay===180_000); assert.ok(deadline);
    deadline.callback();
    await assert.rejects(preparing,reason('unavailable'));
    assert.ok(f.local.has(uploadUri),'native uploader may still be reading'); assert.ok(!f.deleted.includes(uploadUri));
    finish(); for(let step=0;step<30;step++) await Promise.resolve();
    assert.ok(f.deleted.includes(uploadUri),'task cleans up only after native upload settles'); assert.ok(!f.local.has(uploadUri));
  }
});
console.log(`PASS ${count} actual-source native Mix media cases. Storage/auth/FileSystem boundaries are synthetic; no hosted writes, binary build or device claim.`);
