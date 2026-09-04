import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const hub = read('src/features/carnival/CarnivalHubScreen.tsx');
const service = read('src/features/carnival/carnivalService.ts');
const guide = read('src/features/carnival/carnivalGuideContent.ts');
const canonicalRoute = read('app/carnival/index.tsx');
const story = read('app/carnival/story/[slug].tsx');
const chrome = read('src/lib/appChromeVisibility.ts');

assert.match(
  canonicalRoute,
  /export \{ default \} from '\.\.\/\.\.\/src\/features\/carnival\/CarnivalHubScreen'/,
  'The canonical /carnival Expo route must reuse the existing native Carnival Hub without duplicating UI.',
);

assert.match(hub, /loadCarnivalHub/, 'Carnival Hub must retain its published real-data bundle.');
assert.match(hub, /<CarnivalMap signals=\{mappedSignals\}/, 'The accepted source-checked Carnival map must remain present.');
assert.match(hub, /bundle\.soundboards\.map/, 'The accepted real Carnival soundboards must remain present.');
assert.match(hub, /bundle\.stories\[0\]/, 'The accepted lead Carnival story must remain present.');
assert.match(hub, /bundle\.stories\.slice\(1\)\.map/, 'The remaining published Carnival stories must remain present.');
assert.match(hub, /bundle\.officialLinks\.map/, 'The accepted official travel and access links must remain present.');
assert.match(service, /\[1, 2\]\.includes\(data\.schemaVersion\)/, 'Carnival must accept v1 during the v2 rollout and reject unknown versions.');
assert.match(service, /CARNIVAL_GUIDE_FALLBACK/, 'A v1 bundle must be enriched with the approved guide without duplicating the backend system.');
for (const token of ['stickyHeaderIndices', 'START HERE · THE COMPLETE GUIDE', 'Choose your road.', 'Bands on the road', 'Getting there', 'Access and quieter spaces', 'Carnival questions']) {
  assert.match(hub, new RegExp(token), `Carnival must include ${token}`);
}
for (const token of ['weekend', 'bands', 'travel', 'access', 'faqs']) {
  assert.match(guide, new RegExp(`${token}:`), `Carnival v1 fallback must include ${token}`);
}

assert.match(hub, /<Text style=\{styles\.storyTitle\}>\{story\.title\}<\/Text>/, 'Carnival story cards must show their complete title.');
assert.doesNotMatch(hub, /style=\{styles\.storyTitle\} numberOfLines=/, 'Carnival story titles must not be line-clamped.');
assert.match(hub, /mobileWebRailWidth = Math\.min\(Math\.round\(viewportWidth \* 0\.82\)/, 'Carnival story and weekend rails must match the live mobile web 82vw card geometry.');
assert.match(hub, /snapToInterval=\{mobileWebRailWidth \+ 9\}/, 'Carnival editorial rails must preserve the mobile-web snap rhythm.');
assert.match(hub, /storyFrame: \{ height: 432[\s\S]*storySurface: \{ \.\.\.StyleSheet\.absoluteFillObject[\s\S]*storyImage: \{ \.\.\.StyleSheet\.absoluteFillObject/, 'Carnival story cards must use a layout-owning mobile-web full-image composition.');
assert.match(hub, /storyCopy: \{ position: 'absolute'[\s\S]*left: 18, right: 18[\s\S]*minWidth: 0/, 'Carnival story copy must be bounded inside the card.');
assert.match(hub, /storyTitle: \{ flexShrink: 1[\s\S]*fontFamily: edFonts\.serif[\s\S]*lineHeight: 39/, 'Carnival story titles must wrap in the current mobile-web editorial treatment.');
assert.match(hub, /weekendCard: \{ height: 464, flexShrink: 0/, 'Carnival weekend cards must retain the mobile-web 82vw visual rail height without compression.');
assert.match(hub, /viewportWidth < 390 && styles\.heroTitleCompact[\s\S]*heroTitleCompact: \{ fontSize: 54/, 'Compact iPhones must preserve the deliberate two-line Carnival masthead.');

assert.match(hub, /signals=\{bundle\.signals\}/, 'The route builder must receive the real published Carnival places.');
assert.match(hub, /buildCarnivalRoute\(signals, preferences\)/, 'Route preview must use the existing real route builder.');
assert.match(hub, /LIVE ROUTE PREVIEW/, 'Build My Carnival must present an immediate route preview.');
assert.match(hub, /preview\.stops\.slice\(0, 4\)\.map/, 'Route preview must show real matching stops.');
assert.match(hub, /carnivalSignalCategory\(stop\)/, 'Preview stops must retain real category context.');
assert.match(hub, /accessibilityState=\{\{ disabled: !hasStops \}\}/, 'Saving must be disabled when no real route can be built.');
assert.match(hub, /saveCarnivalRoute\(route\)/, 'The builder must retain real route persistence.');
assert.match(hub, /board\.slug \|\| board\.id/, 'Carnival Soundboards must use their canonical slug when available.');

assert.match(story, /<SafeAreaView edges=\{\['top'\]\} style=\{styles\.safeHeader\}>/, 'Story controls must sit below the safe top chrome.');
assert.match(story, /accessibilityLabel="Go back" hitSlop=\{8\}/, 'Story back control must provide a reliable expanded tap target.');
assert.match(story, /iconButton: \{ width: 48, height: 48/, 'Story header controls must meet a generous touch target.');
assert.match(story, /<Text style=\{styles\.headerTitle\}>\{story\?\.title \?\? 'Carnival story'\}<\/Text>/, 'The story reader header must show the full title.');
assert.doesNotMatch(story, /style=\{styles\.headerTitle\} numberOfLines=/, 'Story reader titles must not be line-clamped.');
assert.match(story, /router\.canGoBack\(\) \? router\.back\(\) : router\.replace\('\/hubs\/notting-hill-carnival-2026'/, 'Story back must retain a reliable Carnival Hub fallback route.');
assert.match(chrome, /const HIDDEN_EXACT = new Set\(\[[\s\S]*?'\/carnival'[\s\S]*?'\/hubs\/notting-hill-carnival-2026'/, 'Both Carnival Hub entry routes must keep their native back/share controls clear of shared app chrome.');
assert.match(guide, /export const CARNIVAL_STORY_FALLBACK:[\s\S]*?the-sound-systems-are-the-headliners[\s\S]*?how-to-do-carnival-without-moving-like-a-tourist/, 'Native Carnival must retain the complete source-checked web story catalogue.');
assert.match(service, /CARNIVAL_STORY_FALLBACK\.map[\s\S]*?remoteStories\.find[\s\S]*?remote \? \{ \.\.\.fallback, \.\.\.remote \} : fallback/, 'Live Carnival story values must override the local parity catalogue without allowing a partial payload to erase published stories.');
assert.match(hub, /style=\{styles\.storyRailViewport\}[\s\S]*?snapToInterval=\{mobileWebRailWidth \+ 9\}/, 'The mobile-web-width Carnival story rail must reserve the full card viewport instead of collapsing on iOS.');
assert.match(hub, /style=\{\[styles\.storyFrame, \{ width: mobileWebRailWidth \}\]\}[\s\S]*?style=\{styles\.storySurface\}/, 'Each Carnival story needs a layout-owning 82vw frame around its full-surface press target.');

console.log('PLUGGD native Carnival completion contract passed');
