import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const requireDependency = createRequire(new URL('../package.json', import.meta.url));
const ts = requireDependency('typescript');
let passed = 0;

function loadSource(relative, imports, extra = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected test import: ${name}`);
      return imports[name];
    },
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://qa.invalid', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'qa-public-key' } },
    ...extra,
  }, { filename: relative });
  return module.exports;
}

function nativeUpload({ upload, session = { access_token: 'qa-session' }, os = 'ios' }) {
  return loadSource('../src/lib/storageUpload.ts', {
    'expo-file-system/legacy': {
      FileSystemSessionType: { BACKGROUND: 0, FOREGROUND: 1 },
      FileSystemUploadType: { BINARY_CONTENT: 0 },
      uploadAsync: upload,
    },
    'react-native': { Platform: { OS: os } },
    './supabase': { supabase: { auth: { getSession: async () => ({ data: { session } }) } } },
  }, { fetch: () => { throw new Error('Native upload must not load a Blob into JavaScript'); } });
}

const input = { bucket: 'social-music-drafts', path: 'qa-owner/qa-draft/source.mp4', uri: 'file:///qa/source.mp4', contentType: 'video/mp4' };
async function check(name, test) {
  await test();
  passed++;
  console.log(`PASS ${name}`);
}

await check('native music upload streams one owned file through the requested foreground session', async () => {
  const calls = [];
  const uploader = nativeUpload({ upload: async (...args) => { calls.push(args); return { status: 200, body: '{}' }; } });
  await uploader.uploadFileToSupabaseStorage({ ...input, foreground: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'https://qa.invalid/storage/v1/object/social-music-drafts/qa-owner/qa-draft/source.mp4');
  assert.equal(calls[0][1], input.uri);
  assert.equal(calls[0][2].sessionType, 1);
  assert.equal(calls[0][2].uploadType, 0);
  assert.equal(calls[0][2].headers.authorization, 'Bearer qa-session');
  assert.equal(calls[0][2].headers['content-type'], 'video/mp4');
  assert.equal(calls[0][2].headers['x-upsert'], 'false');
});

await check('other native uploads retain their background session and explicit overwrite choice', async () => {
  let options;
  const uploader = nativeUpload({ upload: async (_url, _uri, next) => { options = next; return { status: 201, body: '{}' }; } });
  await uploader.uploadFileToSupabaseStorage({ ...input, bucket: 'avatars', upsert: true });
  assert.equal(options.sessionType, 0);
  assert.equal(options.headers['x-upsert'], 'true');
});

await check('transport interruption fails clearly without exposing native URLs, paths or token text', async () => {
  let calls = 0;
  const uploader = nativeUpload({ upload: async () => {
    calls++;
    throw new Error('Error Domain=NSURLErrorDomain Code=-1 https://qa.invalid/private?token=qa-sensitive-example file:///private/qa/source.mp4');
  } });
  await assert.rejects(uploader.uploadFileToSupabaseStorage({ ...input, foreground: true }), error => {
    assert.equal(error.message, 'Your media could not be uploaded. Check your connection and try again.');
    assert.doesNotMatch(error.message, /NSURLError|https?:|file:|token|qa-sensitive-example/);
    return true;
  });
  assert.equal(calls, 1);
});

await check('expired sign-in prevents any native upload', async () => {
  let calls = 0;
  const uploader = nativeUpload({ session: null, upload: async () => { calls++; } });
  await assert.rejects(uploader.uploadFileToSupabaseStorage(input), /Sign in again/);
  assert.equal(calls, 0);
});

await check('an HTTP storage denial is not converted into upload success', async () => {
  const uploader = nativeUpload({ upload: async () => ({ status: 403, body: '{"message":"Upload access denied"}' }) });
  await assert.rejects(uploader.uploadFileToSupabaseStorage(input), /Upload access denied/);
});

function musicService(scenario) {
  const state = { scenario, uploaded: false, uploads: 0, prepares: 0, renders: 0, lists: 0, status: 'pending', checkpoints: [] };
  const uploader = nativeUpload({ upload: async () => {
    state.uploads++;
    if (state.scenario === 'missing') throw new Error('Native transport interrupted');
    state.uploaded = true;
    if (state.scenario === 'lost-ack') throw new Error('Native response lost after successful write');
    return { status: 200, body: '{}' };
  } });
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { access_token: 'qa-session' } } }) },
    rpc: async (name, args) => {
      assert.equal(name, 'prepare_social_music_render');
      assert.equal(args.p_request_id, 'qa-request');
      assert.equal(args.p_source_path, 'qa-owner/qa-upload/source.mp4');
      state.prepares++;
      return { data: 'qa-render-job', error: null };
    },
    from(name) {
      assert.equal(name, 'social_music_render_jobs');
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { status: state.status }, error: null }) }) }) };
    },
    storage: {
      from(bucket) {
        return {
          list: async () => {
            assert.equal(bucket, 'social-music-drafts');
            state.lists++;
            return { data: state.uploaded ? [{ name: 'source.mp4', metadata: { size: 58525 } }] : [], error: null };
          },
          createSignedUrl: async (_path, seconds) => {
            assert.equal(bucket, 'social-music-processed');
            assert.equal(seconds, 300);
            return { data: { signedUrl: 'https://qa.invalid/private-preview' }, error: null };
          },
        };
      },
    },
  };
  const service = loadSource('../src/features/social-music/service.ts', {
    '@react-native-async-storage/async-storage': { getItem: async () => null },
    'expo-crypto': {},
    'expo-file-system': { Directory: class {}, File: class {}, Paths: { cache: 'file:///qa/cache' } },
    '../../lib/supabase': { supabase },
    '../../lib/storageUpload': { uploadFileToSupabaseStorage: next => {
      assert.equal(next.foreground, true);
      return uploader.uploadFileToSupabaseStorage(next);
    } },
    './model': loadSource('../src/features/social-music/model.ts', {}),
  }, {
    fetch: async url => {
      assert.equal(url, 'https://pluggd.fm/api/social-music-render');
      state.renders++;
      state.status = 'ready';
      return { ok: true, json: async () => ({ status: 'ready' }) };
    },
  });
  const draft = {
    userId: 'qa-owner', uploadId: 'qa-upload', requestId: 'qa-request', postId: 'qa-post',
    media: { kind: 'video', uri: 'file:///qa/source.mp4', mimeType: 'video/mp4', fileSize: 58525 },
    track: { release_id: 'qa-release', track_id: 'qa-track' },
    recipe: { startSeconds: 1, durationSeconds: 5 },
  };
  const checkpoint = async value => { state.checkpoints.push({ ...value }); };
  return { service, state, draft, checkpoint };
}

await check('actual music service persists one upload/job and resumes a finished preview without repeats', async () => {
  const { service, state, draft, checkpoint } = musicService('ok');
  const first = await service.renderMusicDraft(draft, checkpoint);
  assert.equal(first.uri, 'https://qa.invalid/private-preview');
  assert.equal(first.published, false);
  assert.equal(state.uploads, 1);
  assert.equal(state.prepares, 1);
  assert.equal(state.renders, 1);
  assert.equal(draft.sourcePath, undefined);
  await service.renderMusicDraft(state.checkpoints.at(-1), checkpoint);
  assert.equal(state.uploads, 1);
  assert.equal(state.prepares, 1);
  assert.equal(state.renders, 1);
});

await check('actual music service reconciles a lost acknowledgement through the owned object before rendering', async () => {
  const { service, state, draft, checkpoint } = musicService('lost-ack');
  const result = await service.renderMusicDraft(draft, checkpoint);
  assert.equal(result.published, false);
  assert.equal(state.uploads, 1);
  assert.equal(state.lists, 1);
  assert.equal(state.prepares, 1);
  assert.equal(state.renders, 1);
});

await check('actual music service retains an interrupted draft and creates no job until an owned upload succeeds', async () => {
  const { service, state, draft, checkpoint } = musicService('missing');
  await assert.rejects(service.renderMusicDraft(draft, checkpoint), /Your media could not be uploaded/);
  assert.equal(state.prepares, 0);
  assert.equal(state.renders, 0);
  assert.equal(draft.sourcePath, undefined);
  assert.equal(draft.requestId, 'qa-request');
  state.scenario = 'ok';
  await service.renderMusicDraft(draft, checkpoint);
  assert.equal(state.prepares, 1);
  assert.equal(state.renders, 1);
});

console.log(`${passed} actual native upload/service behaviour checks passed; no production connection.`);
