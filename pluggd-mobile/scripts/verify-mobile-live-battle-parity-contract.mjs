import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const arenaRoute = read('app/live/battles/index.tsx');
const detailRoute = read('app/live/battles/[id].tsx');
const legacyRoute = read('app/gamification/battles.tsx');
const screens = read('src/features/live/BattleScreens.tsx');
const service = read('src/features/live/battleService.ts');
const liveLobby = read('src/features/live/live-culture-screen.tsx');
const liveCreate = read('app/live/create.tsx');

assert.match(arenaRoute, /BattleArenaScreen/, 'the arena must have a real native route');
assert.match(detailRoute, /BattleDetailScreen/, 'battle details must have a real native route');
assert.match(legacyRoute, /Redirect href="\/live\/battles"/, 'the legacy battle route must reach the arena, not Community');
assert.doesNotMatch(legacyRoute, /href="\/community"/, 'Battles must never redirect back to Community');

for (const table of ['battles', 'battle_entries', 'battle_rounds', 'battle_matchups', 'battle_votes']) {
  assert.match(service, new RegExp(`from\\('${table}'\\)`), `Battle parity must use the real ${table} table`);
}
assert.match(service, /bucket: 'battle-audio'/, 'entry audio must use the existing battle-audio bucket');
assert.match(service, /auth\.getUser\(\)/, 'entry and voting actions must derive identity from current auth');
assert.match(service, /existingResult\.data[\s\S]*already have an entry/, 'entry submission must enforce one current-user entry before upload');
assert.match(service, /battleResult\.data\.status !== 'upcoming'/, 'entry submission must close outside the upcoming window');
assert.match(service, /entry_fee_cents[\s\S]*requires an entry pass/, 'paid entry must not be silently bypassed in native');
assert.match(service, /remove\(\[path\]\)/, 'a failed entry row write must attempt to remove its own upload');
assert.match(service, /entry_a_id[\s\S]*entry_b_id[\s\S]*not part of this matchup/, 'votes must be restricted to the selected matchup entries');
assert.match(service, /battleResult\.data\.status !== 'live'[\s\S]*Voting is not open for this matchup/, 'votes must be accepted only during the real active battle round');
assert.match(service, /eq\('matchup_id', input\.matchupId\)[\s\S]*eq\('voter_user_id', user\.id\)/, 'voting must check the current user matchup vote before insertion');
assert.match(service, /battle_id: input\.battleId/, 'vote insertion must persist the real battle id rather than relying on a missing trigger value');
assert.doesNotMatch(service + screens, /advance-battle-rounds|createBattle|Create Battle/, 'unsafe user battle creation and round advancement must stay hidden');

assert.match(screens, /ENTRIES OPEN|LIVE BATTLE|FINAL RESULT/, 'the arena must present upcoming, live and results states');
assert.match(screens, /Submit your track/, 'eligible free battles must expose real entry submission');
assert.match(screens, /Battle bracket/, 'battle detail must expose tournament rounds and matchups');
assert.match(screens, /Crowd ranking/, 'battle detail must expose a real vote-backed leaderboard');
assert.match(screens, /playback\.playTrack/, 'entry audio controls must use the real global player');
assert.match(screens, /viewerVoteEntryId/, 'the UI must show a viewer locked vote state');
assert.match(screens, /isLoading|isError|isRefetching/, 'battle routes must expose loading, error and refresh states');

assert.match(liveLobby, /BattleArenaEntry[\s\S]*router\.push\('\/live\/battles'/, 'Live must include a prominent working Battle Arena entry');
assert.match(liveCreate, /Battle Mode[\s\S]*router\.push\('\/live\/battles'/, 'Live creation must expose Battle Mode as the dedicated arena');
assert.doesNotMatch(liveCreate, /type LiveMode = [^\n]*battle/, 'Battle Mode must not be misrepresented as a session_rooms live mode');

console.log('PASS mobile original Live battle parity contract');
