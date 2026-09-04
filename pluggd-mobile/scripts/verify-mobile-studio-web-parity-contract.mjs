import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const studioScreens = read('src/features/studio/StudioScreens.tsx');
const studioData = read('src/features/studio/studio-data.ts');
const trackLyrics = read('src/features/studio/trackLyricsAuthoring.ts');

assert.match(studioScreens, /Welcome back,\{'\\n'\}\{name\}\./, 'Studio Home must put the web-source welcome headline first in the command hero');
assert.doesNotMatch(studioScreens, /Creator Command|Studio Live/, 'Studio Home must not show internal command/status labels above the welcome headline');
assert.match(studioScreens, /buildMobileCommandActions/, 'Studio Home must use web-style mobile command actions');
assert.match(studioScreens, /commandPrimaryAction/, 'Studio Home must give the primary creator action deliberate visual priority');
assert.match(studioScreens, /commandQuickRow/, 'Studio Home must keep secondary creator actions compact and immediately available');
assert.match(studioScreens, /WEB_PARITY_ASSETS\.bedroomStudio/, 'Studio Home must use real visual context instead of a decorative placeholder hero');
for (const label of ['Upload Release', 'Check cash', 'Go live', 'Apps']) {
  assert.match(studioScreens, new RegExp(label), `Studio Home command actions must include ${label}`);
}
assert.match(studioScreens, /zoneRow/, 'Studio Home zones must be rendered as explicit two-column rows');
for (const label of ['Launch', 'Collect', 'Grow', 'Operate']) {
  assert.match(studioScreens, new RegExp(`title:\\s*'${label}'`), `Studio Home zones must include ${label}`);
}
assert.match(studioScreens, /dockCreateButton/, 'Studio dock must keep a distinct center Create treatment');
assert.match(studioScreens, /PluggdGlassSurface[\s\S]*dockGlass/, 'Studio dock must use the native glass-capable surface');
assert.match(studioScreens, /accessibilityState=\{\{ selected: isActive \}\}/, 'Studio dock tabs must expose their selected state');
assert.match(studioScreens, /studioMenuButton/, 'Studio topbar must keep the web-style Menu pill');
assert.match(studioScreens, /Pick the tools you actually use\./, 'Studio Apps must frame modules as a purposeful creator toolkit');
// Studio page titles address the creator about their own work. "Modules,
// account surfaces, and business tools" and "Build the Studio around your work"
// were product-team language pointed at a creator.
for (const internalCopy of ['account surfaces', 'Build the Studio around']) {
  assert.ok(!studioScreens.includes(internalCopy), `Studio page titles must not use internal product language: ${internalCopy}`);
}
assert.match(studioScreens, /function ActionBoard/, 'Studio Create must use a purpose-built action board rather than repeat the Home hero');
assert.match(studioScreens, /actionBoardRow/, 'Studio Create actions must render in intentional two-column rows');
assert.match(studioScreens, /const tabWidth = Math\.floor\(\(contentWidth - 16\) [/] 3\)/, 'My PLUGGD setup destinations must render as a stable 3-column grid');
assert.match(studioScreens, /ModuleTileGrid/, 'Studio More must render modules as premium tiles, not a plain text list');
assert.match(studioScreens, /More Studio/, 'Studio More must keep its module-surface hero');
assert.doesNotMatch(studioScreens, /function StudioMoreContent[\s\S]*?<ComplianceNote \/>/, 'Studio More must not expose implementation/compliance note copy as the first public surface');
assert.match(studioScreens, /function PublishingActivity/, 'Studio Analytics must visualize honest publishing activity');
assert.match(studioScreens, /Based on releases, beats, mixes, soundboards and events added to your Studio\./, 'Studio Analytics must explain the source of its publishing activity');
assert.match(studioScreens, /SectionTitle title="Catalog Mix"/, 'Studio Analytics must show the real catalog composition');
assert.doesNotMatch(studioScreens, /Math\.min\(100, 22 \+ data\.stats\.(?:release|beat|mix|soundboard)Count \* 12\)/, 'Studio Analytics must not use decorative fake catalog percentages');
assert.match(studioData, /id:\s*'my_pluggd'[\s\S]*title:\s*'My PLUGGD'/, 'Studio module catalog must preserve My PLUGGD from the web source');
assert.match(studioData, /id:\s*'splits'[\s\S]*route:\s*'\/studio\/splits'[\s\S]*status:\s*'native'/, 'Split Engine must be a working in-app tool, not a gateway out to the desktop site');

// The Split Engine surfaces moved out of StudioScreens into their own module when
// they stopped being an explainer and became the real tool. The guarantee is
// unchanged — these surfaces must still exist — so assert across both files.
const splitEngineScreens = read('src/features/studio/SplitEngineScreens.tsx');
const studioSurfaces = studioScreens + splitEngineScreens;
for (const token of [
  'Choose what you need',
  'Work With Me',
  'Collaborate',
  'Advanced',
  'Start a split sheet',
  'StudioSplitGatewayScreen',
  'Three steps. One record.',
  'Preview collaborator card',
]) {
  assert.match(studioSurfaces, new RegExp(token), `Connect Card and Split Engine must preserve ${token}`);
}

// The engine must actually reach the split RPCs rather than hand off to the site.
const splitEngineData = read('src/features/studio/split-engine.ts');
for (const rpc of [
  'fn_create_split_agreement',
  'fn_upsert_split_participant',
  'fn_delete_split_participant',
  'fn_validate_split_agreement',
  'fn_submit_split_for_approval',
  'fn_approve_split',
  'fn_lock_split_version',
]) {
  assert.match(splitEngineData, new RegExp(rpc), `Split Engine must call ${rpc} in the app`);
}
assert.doesNotMatch(splitEngineScreens + studioScreens, /pluggd\.fm\/studio\/splits/, 'Split Engine must not send creators to the desktop site to sign a split');
assert.doesNotMatch(studioScreens, /const readyCount = data\.connectProfile \? 3 : 0/, 'Connect Card must not invent view-completion progress');

assert.doesNotMatch(studioData, /total_plays,lyrics|savePublishedReleaseLyrics|\.update\(\{ lyrics:/, 'Studio must not retain the superseded release-level lyrics writer');
assert.match(studioScreens, /Manage track lyrics/, 'Release management must expose the per-track Lyrics Studio');
assert.match(studioScreens, /loadOwnedReleaseLyricsWorkspace/, 'Lyrics Studio must load exact owned release tracks');
assert.match(studioScreens, /Save private draft[\s\S]*Publish track lyrics/, 'private draft and public publication must remain separate explicit actions');
assert.match(trackLyrics, /from\('creator_track_lyrics'\)\.upsert/, 'working lyrics must use the private creator draft table');
assert.match(trackLyrics, /from\('published_track_lyrics'\)\.upsert/, 'publication must use the public per-track lyrics table');
assert.match(trackLyrics, /track_id: input\.track\.id[\s\S]*rights_confirmed: true/, 'publication must bind to the exact track and require rights confirmation');

console.log('mobile Studio web-parity contract verified');
