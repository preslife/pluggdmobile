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
assert.match(service, /rpc\('submit_free_battle_entry'[\s\S]*p_battle_id: input\.battleId[\s\S]*p_rules_version: input\.rulesVersion[\s\S]*p_adult: input\.consent[\s\S]*p_rights: input\.consent/, 'entry identity, current rules, free-battle eligibility and duplicate-entry enforcement must use the server authority rather than a race-prone client insertion');
assert.match(service, /if \(!input\.consent \|\| !input\.rulesVersion\)/, 'entry upload must fail closed without explicit adult/rights/rules acceptance');
assert.doesNotMatch(service, /\.(?:insert|upsert|update)\(/, 'the native Battle client must not bypass server entry or vote enforcement with direct table writes');
assert.match(service, /remove\(\[path\]\)/, 'a failed entry row write must attempt to remove its own upload');
assert.match(service, /rpc\('vote_free_battle'[\s\S]*p_matchup_id: input\.matchupId[\s\S]*p_entry_id: input\.entryId[\s\S]*p_rules_version: input\.rulesVersion[\s\S]*p_adult: input\.consent/, 'the server vote authority must receive the real matchup, entry, accepted rules and adult consent');
assert.match(service, /if \(error\) throw new Error\(errorMessage\(error, 'Your vote could not be saved\.'/, 'a rejected or already-locked vote must surface the server failure');
assert.match(service, /rpc\('battle_vote_counts', \{ p_battle_id: battleId \}\)/, 'public audience counts must use the approved aggregate rather than exposing other viewers\' private vote rows');
assert.doesNotMatch(service + screens, /advance-battle-rounds|createBattle|Create Battle/, 'unsafe user battle creation and round advancement must stay hidden');

assert.match(screens, /ENTRIES OPEN|LIVE BATTLE|FINAL RESULT/, 'the arena must present upcoming, live and results states');
assert.match(screens, /Submit your track/, 'eligible free battles must expose real entry submission');
assert.match(screens, /Battle bracket/, 'battle detail must expose tournament rounds and matchups');
assert.match(screens, /title="Audience votes"/, 'battle detail must expose real audience vote totals without implying a cross-round ranking determines the champion');
assert.match(screens, /moderation_status==='approved'\)\.sort\(\(left, right\) => right\.voteCount - left\.voteCount/, 'only approved entries may appear in the real vote-backed leaderboard');
assert.match(screens, /finalMatchups\[0\]\.winner_entry_id/, 'the champion must come from the final matchup winner, not aggregate audience totals');
assert.match(screens, /playback\.playTrack/, 'entry audio controls must use the real global player');
assert.match(screens, /viewerVoteEntryId/, 'the UI must show a viewer locked vote state');
assert.match(screens, /isLoading|isError|isRefetching/, 'battle routes must expose loading, error and refresh states');

assert.match(liveLobby, /BattleArenaEntry[\s\S]*router\.push\('\/live\/battles'/, 'Live must include a prominent working Battle Arena entry');
assert.match(liveCreate, /Battle Mode[\s\S]*router\.push\('\/live\/battles'/, 'Live creation must expose Battle Mode as the dedicated arena');
assert.doesNotMatch(liveCreate, /type LiveMode = [^\n]*battle/, 'Battle Mode must not be misrepresented as a session_rooms live mode');

console.log('PASS mobile server-authoritative Live battle source contract; server/live enforcement remains a separate release gate');
