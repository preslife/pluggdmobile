import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const directory = read('src/features/directory/CreatorDirectoryScreen.tsx');
const directoryService = read('src/features/directory/creatorDirectoryService.ts');
const audience = read('src/lib/publicAudienceFilters.ts');
const identity = read('src/features/culture/publicCreatorIdentity.ts');
const social = read('src/features/culture/MobileSocialPostCard.tsx');
const live = read('src/features/live/live-culture-screen.tsx');
const beatPlug = read('src/features/editorial/BeatPlugScreen.tsx');
const store = read('src/features/editorial/MarketStoreScreen.tsx');
const returnBar = read('src/features/discovery/DiscoveryReturnBar.tsx');

assert.doesNotMatch(directory, /resolved to their real public|Start with a real profile/i, 'Creators must not expose internal implementation language.');
assert.match(directory, /people shaping what comes next/, 'Creators must use public-facing ecosystem copy.');
assert.match(directory, /Step into their worlds/, 'The featured creator rail must use audience-facing copy.');
assert.match(directory, /withArtwork[\s\S]*withoutArtwork[\s\S]*slice\(0, 6\)/, 'Artwork-backed creators must lead the featured rail.');
assert.match(directory, /width < 400 \? 310 : 350/, 'The creator stage must reveal useful content sooner at compact and large widths.');

assert.match(audience, /isPresentablePublicUsername/, 'Public identity must own a shared presentable-handle rule.');
assert.match(audience, /admin\|user\|creator\|profile\|member\|account\|test\|review/, 'System-generated account prefixes must be rejected.');
assert.match(directoryService, /isPresentablePublicUsername\(candidateUsername\)/, 'The creator directory must suppress internal handles.');
assert.match(identity, /Promise\.all\([\s\S]*social_author_profiles[\s\S]*public_profiles/, 'Social and creator public identity rows must be resolved together.');
assert.match(identity, /mergeIdentity/, 'Canonical identity fields must merge without replacing available public values.');
assert.match(identity, /presentableUsername/, 'The shared identity adapter must suppress non-presentable handles.');
assert.doesNotMatch(social, /'@pluggd'|: 'PLUGGD'/, 'Community cards must not invent a platform handle for a creator.');
assert.match(social, /const publicMeta = \[/, 'Community metadata must compose from only available public identity and date fields.');

assert.equal((live.match(/Nothing live or scheduled yet/g) ?? []).length, 1, 'Live must expose one global empty status.');
assert.doesNotMatch(live, /Nothing scheduled/, 'Category cards must not repeat the global empty status.');
for (const label of ['DROP IN TOGETHER', 'HEAR IT FIRST', 'BUILD IN PUBLIC', 'FROM THE CROWD']) {
  assert.match(live, new RegExp(label), label + ' must give its empty Live category a distinct purpose.');
}
assert.match(live, /if \(!source\) \{[\s\S]*<View[\s\S]*accessible/, 'Empty Live categories must remain descriptive non-buttons.');
assert.match(live, /const name = room\.creator_name\?\.trim\(\)/, 'The Live creator shelf must require a real creator identity instead of presenting a room category as a person.');
assert.match(live, /creator\.canFollow[\s\S]*View profile/, 'Live creator cards without a followable account must open the real profile instead of simulating a follow.');
assert.match(live, /const bottomPadding = useBottomChromeInset\(\)/, 'Live must clear the shared dock and mini-player.');

assert.match(beatPlug, /function beatHasLicenceOptions/, 'BeatPlug must use one licence-availability predicate.');
assert.match(beatPlug, /available_licenses[\s\S]*license_prices[\s\S]*Number\(beat\.price/, 'Licence availability must cover all existing beat licence fields.');
assert.doesNotMatch(beatPlug, /heroHasLicenceOptions/, 'BeatPlug must not restore the removed duplicate hero licence CTA above the functional Listening Bench.');
assert.match(beatPlug, /beatHasLicenceOptions\(benchBeat\)[\s\S]*View licences & buy/, 'The Beat Bench purchase CTA must use the same licence truth.');
for (const token of ['LISTENING BENCH', 'FIND YOUR NEXT BEAT', 'BeatPlug picks now', 'BROWSE BEATPLUG', 'Choose the Right BeatPlug License', 'From Soundboards']) {
  assert.match(beatPlug, new RegExp(token), `BeatPlug must preserve the current-web ${token} surface.`);
}
const beatPlugOrder = ['LISTENING BENCH', 'FIND YOUR NEXT BEAT', 'BeatPlug picks now', 'BROWSE BEATPLUG', 'Choose the Right BeatPlug License'];
for (let index = 1; index < beatPlugOrder.length; index += 1) {
  assert(beatPlug.indexOf(beatPlugOrder[index - 1]) < beatPlug.indexOf(beatPlugOrder[index]), `${beatPlugOrder[index]} must follow ${beatPlugOrder[index - 1]}.`);
}
assert.match(beatPlug, /playback\.playQueue\(queue, startIndex\)/, 'BeatPlug auditions must establish a real queue for the bench transport.');
assert.match(beatPlug, /benchProgress[\s\S]*benchWavePlayed/, 'The Beat Bench waveform must be tied to real playback progress.');
assert.doesNotMatch(beatPlug, /beatGrid|beatCard: \{ width: '47\.5%'/, 'BeatPlug must not regress to the obsolete tiny multi-column catalogue grid.');
assert.match(beatPlug, /paddingBottom: bottomInset/, 'BeatPlug must clear the shared dock and mini-player.');

assert.match(store, /Wear the culture\.[\s\S]*Back the makers\./, 'Store hero must retain a controlled two-line message without a widow.');
assert.match(store, /heroCtaRow:[^\n]*flexWrap: 'wrap'/, 'Store actions must wrap safely when the available width or text scale requires it.');
assert.match(store, /minHeight: 46/, 'Store hero actions must retain at least 44-point targets.');

assert.match(returnBar, /minHeight: 52/, 'The shared return row must use the Phase 10K vertical rhythm.');
assert.match(returnBar, /action:[\s\S]*minHeight: 44/, 'Back to Discovery must retain a 44-point action.');
assert.doesNotMatch([directory, live, beatPlug, store, returnBar].join('\n'), /EventsBoardScreen/, 'Phase 10K must not absorb the separately owned Events screen.');

console.log('PLUGGD native Discovery destination polish contract passed');
