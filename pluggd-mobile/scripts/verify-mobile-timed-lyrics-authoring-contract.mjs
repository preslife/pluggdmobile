import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const screens = read('src/features/studio/StudioScreens.tsx');
const service = read('src/features/studio/trackLyricsAuthoring.ts');
const studioData = read('src/features/studio/studio-data.ts');

assert.match(screens, /Manage track lyrics/, 'release management must open Lyrics Studio');
assert.match(screens, /tracks\.map[\s\S]*track\.trackNumber[\s\S]*track\.title/, 'Lyrics Studio must make the exact release track selectable');
assert.match(screens, /Import LRC[\s\S]*Tap sync/, 'Lyrics Studio must expose LRC import and tap-to-sync');
assert.match(screens, /FileSystem\.readAsStringAsync[\s\S]*parseLrcLyrics/, 'LRC import must parse the selected real file');
assert.match(screens, /progress\.position \* 1000/, 'tap-to-sync must capture actual playback time');
assert.match(screens, /trackId: selectedTrack\.id/, 'timing playback must retain canonical track identity');
assert.match(screens, /Save private draft[\s\S]*Publish track lyrics/, 'private work and publication must remain separate actions');
assert.match(screens, /I control the lyric display rights/, 'publication must expose an explicit rights confirmation');
assert.match(screens, /!rightsConfirmed[\s\S]*!timingReady/, 'publish must be disabled without rights and complete timing');

assert.match(service, /from\('releases'\)[\s\S]*\.eq\('user_id', auth\.user\.id\)/, 'workspace load must confirm the owned release');
assert.match(service, /from\('tracks'\)[\s\S]*\.eq\('release_id', releaseId\)/, 'workspace load must return real tracks for only that release');
assert.match(service, /creator_track_lyrics[\s\S]*onConflict: 'user_id,track_id,track_type'/, 'private working text must use the established owner draft contract');
assert.match(service, /published_track_lyrics[\s\S]*onConflict: 'track_id'/, 'public lyrics must upsert one publication per canonical track');
assert.match(service, /select\('id,releases!inner\(user_id\)'\)[\s\S]*\.eq\('releases\.user_id', auth\.user\.id\)/, 'publish must re-confirm exact track ownership');
assert.match(service, /rights_confirmed: true[\s\S]*rights_confirmed_at: publishedAt/, 'publication must record rights confirmation');
assert.match(service, /source === 'manual' \? \[\] : finalizedTimedLines/, 'plain lyrics must remain untimed and timed sources must use validated ordered lines');
assert.match(service, /matchAll\(\/\\\[\(\\d\{1,3\}\):/, 'LRC parser must read minute-second timestamps rather than invent timing');
assert.doesNotMatch(studioData + screens, /savePublishedReleaseLyrics|\.update\(\{ lyrics: normalizedLyrics \}\)/, 'native Studio must not write the superseded releases.lyrics field');
assert.doesNotMatch(service, /service_role|SUPABASE_SERVICE_ROLE/, 'native lyrics authoring must never contain a service-role credential');

console.log('PASS mobile timed lyrics authoring contract');
