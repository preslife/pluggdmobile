import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const studioScreens = read('src/features/studio/StudioScreens.tsx');
const studioData = read('src/features/studio/studio-data.ts');

assert.match(studioScreens, /Welcome back,\{'\\n'\}\{name\}\./, 'Studio Home must put the web-source welcome headline first in the command hero');
assert.doesNotMatch(studioScreens, /Creator Command|Studio Live/, 'Studio Home must not show internal command/status labels above the welcome headline');
assert.match(studioScreens, /buildMobileCommandActions/, 'Studio Home must use web-style mobile command actions');
assert.match(studioScreens, /commandPillInner/, 'Studio Home command actions must render as framed web-style pills');
for (const label of ['Upload Release', 'Check cash', 'Go live', 'Apps']) {
  assert.match(studioScreens, new RegExp(label), `Studio Home command actions must include ${label}`);
}
assert.match(studioScreens, /zoneRow/, 'Studio Home zones must be rendered as explicit two-column rows');
for (const label of ['Launch', 'Collect', 'Grow', 'Operate']) {
  assert.match(studioScreens, new RegExp(`title:\\s*'${label}'`), `Studio Home zones must include ${label}`);
}
assert.match(studioScreens, /dockActionIcon/, 'Studio dock must keep the larger center Action treatment');
assert.match(studioScreens, /studioMenuButton/, 'Studio topbar must keep the web-style Menu pill');
assert.match(studioScreens, /Plug modules into your workspace\./, 'Studio Apps must keep the web-source module marketplace heading');
assert.match(studioScreens, /ModuleTileGrid/, 'Studio More must render modules as premium tiles, not a plain text list');
assert.match(studioScreens, /More Studio/, 'Studio More must keep its module-surface hero');
assert.doesNotMatch(studioScreens, /function StudioMoreContent[\s\S]*?<ComplianceNote \/>/, 'Studio More must not expose implementation/compliance note copy as the first public surface');
assert.match(studioData, /id:\s*'my_pluggd'[\s\S]*title:\s*'My PLUGGD'/, 'Studio module catalog must preserve My PLUGGD from the web source');

console.log('mobile Studio web-parity contract verified');
