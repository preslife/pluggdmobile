import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url),
  ts = require('typescript');
const calls = [],
  uploads = [],
  removed = [];
let signed = 0,
  fail = false,
  authenticated = true;
const client = {
  auth: {
    getUser: async () => ({ data: { user: authenticated ? { id: 'artist' } : null }, error: null }),
  },
  rpc: async (name, args) => {
    calls.push({ name, args });
    return { data: 'entry', error: fail ? { message: 'Entries are closed' } : null };
  },
  storage: {
    from: () => ({
      createSignedUrl: async (path, seconds) => {
        signed++;
        assert.equal(seconds, 300);
        return { data: { signedUrl: 'https://local.test/private-audio' }, error: null };
      },
      remove: async (paths) => {
        removed.push(...paths);
        return { error: null };
      },
    }),
  },
};
const code = ts.transpileModule(
  readFileSync(new URL('../src/features/live/battleService.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const module = { exports: {} };
vm.runInNewContext(code, {
  module,
  exports: module.exports,
  Date,
  Error,
  Map,
  Set,
  console,
  require: (name) =>
    name.includes('storageUpload')
      ? { uploadFileToSupabaseStorage: async (value) => uploads.push(value) }
      : { supabase: client },
});
const api = module.exports,
  input = {
    battleId: 'battle',
    title: ' Original verse ',
    audio: {
      uri: 'file:///local-fixture.mp3',
      name: 'verse.mp3',
      mimeType: 'audio/mpeg',
      size: 200,
    },
    rulesVersion: '2026-10-01',
    consent: true,
  };
await assert.rejects(api.submitBattleEntry({ ...input, consent: false }), /Confirm/);
assert.equal(uploads.length, 0);
authenticated = false;
await assert.rejects(api.submitBattleEntry(input), /Sign in/);
assert.equal(uploads.length, 0);
authenticated = true;
await api.submitBattleEntry(input);
assert.equal(uploads.length, 1);
assert.equal(uploads[0].bucket, 'battle-audio');
assert.match(uploads[0].path, /^artist\/battle\//);
assert.equal(calls[0].name, 'submit_free_battle_entry');
assert.equal(calls[0].args.p_title, 'Original verse');
assert.equal(calls[0].args.p_adult, true);
assert.equal(calls[0].args.p_rights, true);
assert.equal(calls[0].args.p_rules_version, '2026-10-01');
fail = true;
await assert.rejects(api.submitBattleEntry(input), /Entries are closed/);
assert.equal(removed.length, 1);
fail = false;
await api.submitBattleVote({
  battleId: 'battle',
  matchupId: 'match',
  entryId: 'entry',
  rulesVersion: '2026-10-01',
  consent: true,
});
assert.equal(calls.at(-1).name, 'vote_free_battle');
assert.equal(calls.at(-1).args.p_matchup_id, 'match');
assert.equal(calls.at(-1).args.p_adult, true);
assert.equal(
  await api.battleAudioUrl('artist/battle/verse.mp3'),
  'https://local.test/private-audio',
);
assert.equal(signed, 1);
console.log(
  'PASS: actual native service uses private fresh300-second audio, recorded adult/rights/rules entry and vote RPCs, rejects missing consent/auth before upload, removes only failed owned upload. Local service fixtures, not live/device proof.',
);
