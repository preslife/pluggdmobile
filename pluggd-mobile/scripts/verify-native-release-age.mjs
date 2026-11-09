import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript');
const code = ts.transpileModule(readFileSync(new URL('../src/features/playback/releaseAgeAccess.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
assert.equal(code.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
const loaded = { exports: {} };
vm.runInNewContext(code.outputText, { module: loaded, exports: loaded.exports, require: id => id === 'expo-crypto' ? { randomUUID } : { supabase: {} }, Date, Object, Map, Set, Promise, Error, setTimeout, clearTimeout });
const { createReleaseAgeAccess, adultFromDateOfBirth, isReleaseTrack } = loaded.exports;
const release = { id: 'release', user_id: 'owner', explicit: false, audio_url: 'https://canonical.test/release.mp3' };
const song = { id: 'song', release_id: 'release', explicit: false, audio_url: 'https://canonical.test/song.mp3' };
function fixture() {
  const f = { actor: 'adult', token: 'token-1', release: { ...release }, song: { ...song }, dob: '1990-01-01', error: null, pause: null, calls: [], listeners: new Set() };
  f.session = () => f.actor ? { user: { id: f.actor }, access_token: f.token } : null;
  f.client = { auth: { getSession: async () => ({ data: { session: f.session() }, error: null }),
    onAuthStateChange: callback => { f.listeners.add(callback); return { data: { subscription: { unsubscribe: () => f.listeners.delete(callback) } } }; } },
    from(table) {
      f.calls.push(table); const filters = [];
      const read = async single => {
        if (f.pause) { const pause = f.pause; f.pause = null; await pause(); }
        const rows = (table === 'releases' ? [f.release] : table === 'tracks' ? [f.song]
          : table === 'profile_private_demographics' ? [{ user_id: f.actor, date_of_birth: f.dob }] : [])
          .filter(Boolean).filter(row => filters.every(([key, value]) => row[key] === value));
        return { data: single ? rows[0] || null : rows, error: f.error === table ? { message: 'private provider detail' } : null };
      };
      return { select() { return this; }, eq(key, value) { filters.push([key, value]); return this; }, maybeSingle: () => read(true), then: (resolve, reject) => read(false).then(resolve, reject) };
    } };
  f.api = createReleaseAgeAccess(f.client);
  f.change = actor => { f.actor = actor; for (const listener of f.listeners) listener('SIGNED_IN', f.session()); };
  return f;
}
let count = 0;
async function test(name, run) { await run(); count++; console.log('PASS ' + name); }
const denied = status => error => error.status === status && !error.message.includes('provider');
for (const level of ['release', 'song']) {
  for (const [actor, dob, status] of [[null, null, 'signed-out'], ['minor', '2015-11-09', 'under-18'], ['adult', null, 'missing-dob'], ['adult', 'bad', 'missing-dob']]) {
    await test(`${level} explicit gate denies ${status} without trusting route flags`, async () => {
      const f = fixture(); f[level].explicit = true; f.actor = actor; f.dob = dob;
      await assert.rejects(f.api.assert({ releaseId: 'release', trackId: 'song', explicit: false }), denied(status));
    });
  }
}
await test('adult and canonical owner may access either protected level; no DOB leaves the request', async () => {
  for (const actor of ['adult', 'owner']) {
    const f = fixture(); f.release.explicit = true; f.song.explicit = true; f.actor = actor;
    if (actor === 'owner') f.dob = null;
    const grant = await f.api.assert({ trackId: 'song' });
    const track = { id: 'song', type: 'release', releaseId: grant.releaseId, trackId: grant.trackId, releaseAccess: { authorizationId: grant.authorizationId } };
    assert.equal(f.api.authorized(track), true); assert.equal(JSON.stringify(grant).includes('1990-01-01'), false); assert.equal(JSON.stringify(track).includes('token-1'), false);
    if (actor === 'owner') assert.equal(f.calls.includes('profile_private_demographics'), false);
  }
});
await test('clean music remains available to guests with no demographic request', async () => {
  const f = fixture(); f.actor = null; await f.api.assert({ releaseId: 'release', trackId: 'song' });
  assert.equal(f.calls.includes('profile_private_demographics'), false);
});
await test('release-wide download/all-release check includes explicit children', async () => {
  const f = fixture(); f.actor = null; f.song.explicit = true;
  await assert.rejects(f.api.assert({ releaseId: 'release' }), denied('signed-out'));
});
await test('parent mismatch and missing canonical objects fail closed', async () => {
  const f = fixture(); await assert.rejects(f.api.assert({ releaseId: 'foreign', trackId: 'song' }), denied('unavailable'));
  await assert.rejects(f.api.assert({ trackId: 'missing' }), denied('unavailable'));
  delete f.release.explicit; await assert.rejects(f.api.assert({ releaseId: 'release' }), denied('unavailable'));
});
await test('metadata and private-demographic failures never fall back to public DOB', async () => {
  for (const table of ['tracks', 'releases', 'profile_private_demographics']) {
    const f = fixture(); f.release.explicit = true; f.error = table;
    await assert.rejects(f.api.assert({ releaseId: 'release', trackId: 'song' }), denied('unavailable'));
    assert.equal(f.calls.includes('profiles'), false);
  }
});
await test('account and token changes discard delayed metadata responses', async () => {
  for (const mutate of [f => { f.actor = 'other'; }, f => { f.token = 'token-2'; }]) {
    const f = fixture(); f.pause = async () => mutate(f);
    await assert.rejects(f.api.assert({ trackId: 'song' }), denied('session-changed'));
  }
});
await test('logout and same-account return invalidate old queue capabilities', async () => {
  const f = fixture(), stop = f.api.observe(); let revoked = 0;
  const unsubscribe = f.api.subscribe(() => revoked++);
  const grant = await f.api.assert({ trackId: 'song' });
  const track = { id: 'song', releaseId: 'release', trackId: 'song', sourceType: 'release', releaseAccess: grant };
  assert.equal(f.api.authorized(track), true);
  f.change(null); assert.equal(f.api.authorized(track), false);
  f.change('adult'); assert.equal(f.api.authorized(track), false); assert.equal(revoked, 2);
  await assert.rejects(f.api.assertCurrent(grant), denied('session-changed')); unsubscribe(); stop(); assert.equal(f.listeners.size, 0);
});
await test('token refresh fences pending links while preserving actor-bound active queue grants', async () => {
  const f = fixture(), stop = f.api.observe(); const grant = await f.api.assert({ trackId: 'song' });
  const track = { id: 'song', releaseId: 'release', trackId: 'song', type: 'release', releaseAccess: grant };
  f.token = 'token-2'; f.change('adult'); assert.equal(f.api.authorized(track), true);
  await assert.rejects(f.api.assertCurrent(grant), denied('session-changed')); stop();
});
await test('forged, foreign and cold-start native grants are rejected', async () => {
  const f = fixture(); const grant = await f.api.assert({ trackId: 'song' });
  const track = { id: 'song', releaseId: 'release', trackId: 'song', type: 'release', releaseAccess: grant };
  assert.equal(createReleaseAgeAccess(f.client).authorized(track), false);
  assert.equal(f.api.authorized({ ...track, trackId: 'other' }), false);
  assert.equal(f.api.authorized({ ...track, releaseAccess: { authorizationId: 'forged' } }), false);
  assert.equal(f.api.authorized({ ...track, releaseAccess: undefined }), false);
});
await test('18th birthday compares local calendar dates and rejects invalid/future dates', async () => {
  const now = new Date(2026, 10, 9, 12);
  assert.equal(adultFromDateOfBirth('2008-11-09', now), true);
  assert.equal(adultFromDateOfBirth('2008-11-10', now), false);
  for (const value of ['2008-02-30', '2030-01-01', '2008-13-01', '', null]) assert.equal(adultFromDateOfBirth(value, now), null);
});
await test('unrelated Mix and Beat metadata retains its existing authorization path', async () => {
  assert.equal(isReleaseTrack({ type: 'mix', releaseId: 'legacy-extra' }), false);
  assert.equal(isReleaseTrack({ type: 'beat', trackId: 'legacy-extra' }), false);
  assert.equal(isReleaseTrack({ type: 'release' }), true);
  assert.equal(isReleaseTrack({ releaseId: 'release' }), true);
});
await test('late initial hydration cannot restore an old release actor after a real account change', async () => {
  const f = fixture(), stop = f.api.observe();
  await f.api.assert({ trackId: 'song' }); f.change('other');
  const grant = await f.api.assert({ trackId: 'song' });
  for (const listener of f.listeners) listener('INITIAL_SESSION', { user: { id: 'adult' }, access_token: 'old-token' });
  assert.equal(f.api.authorized({ id: 'song', releaseId: 'release', trackId: 'song', type: 'release', releaseAccess: grant }), true);
  stop();
});
await test('profile owner_id has the canonical owner exception; a label identity alone does not', async () => {
  const f = fixture(); f.release.explicit = true; f.release.owner_id = 'profile-owner'; f.release.owner_type = 'profile';
  f.actor = 'profile-owner'; f.dob = null; await f.api.assert({ trackId: 'song' });
  f.release.owner_type = 'label'; await assert.rejects(f.api.assert({ trackId: 'song' }), denied('missing-dob'));
});
const referenceModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/features/playback/releaseReference.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { module: referenceModule, exports: referenceModule.exports });
await test('real editorial slug links and UUIDs use scoped canonical lookups; malformed references fail closed', async () => {
  assert.equal(referenceModule.exports.releaseReference('omo-ita-1').column, 'slug');
  assert.equal(referenceModule.exports.releaseReference('10000000-0000-4000-8000-000000000001').column, 'id');
  for (const value of ['../secret', 'slug,id.eq.foreign', 'https://pluggd.fm/release/x', '', null]) assert.equal(referenceModule.exports.releaseReference(value), null);
});
console.log(`${count} native release age scenarios passed`);
