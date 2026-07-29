import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const studioScreens = read('src/features/studio/StudioScreens.tsx');
const studioData = read('src/features/studio/studio-data.ts');

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
assert.match(studioScreens, /Build the Studio around your work\./, 'Studio Apps must frame modules as a purposeful creator toolkit');
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

console.log('mobile Studio web-parity contract verified');
