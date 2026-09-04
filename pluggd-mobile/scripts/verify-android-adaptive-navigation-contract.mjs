import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function loadPureTypeScriptModule(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;
  const module = { exports: {} };
  Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}

const navigation = loadPureTypeScriptModule('src/design/adaptiveNavigationPolicy.ts');
assert.equal(navigation.navigationWidthClassForWidth(599), 'compact');
assert.equal(navigation.navigationWidthClassForWidth(600), 'medium');
assert.equal(navigation.navigationWidthClassForWidth(839), 'medium');
assert.equal(navigation.navigationWidthClassForWidth(840), 'expanded');
assert.equal(navigation.navigationModeForPlatformWidth('android', 411), 'compact');
assert.equal(navigation.navigationModeForPlatformWidth('android', 600), 'top');
assert.equal(navigation.navigationModeForPlatformWidth('android', 1280), 'top');
assert.equal(navigation.navigationModeForPlatformWidth('ios', 1280), 'compact');
assert.equal(navigation.navigationModeForPlatformWidth('web', 1280), 'compact');

// Rotation and fold resizing must be derived from the current width, not a
// latched initial device class.
assert.deepEqual(
  [411, 900, 599, 720].map((width) =>
    navigation.navigationModeForPlatformWidth('android', width),
  ),
  ['compact', 'top', 'compact', 'top'],
);

const chrome = loadPureTypeScriptModule('src/lib/appChromeVisibility.ts');
assert.equal(chrome.hasDedicatedAppHeader('/'), true);
assert.equal(chrome.hasDedicatedAppHeader('/market'), true);
assert.equal(chrome.hasDedicatedAppHeader('/creator/events'), true);
assert.equal(chrome.hasDedicatedAppHeader('/opportunities'), true);
assert.equal(chrome.hasDedicatedAppHeader('/opportunities/example-opportunity'), true);
assert.equal(chrome.hasDedicatedAppHeader('/notifications'), false);
assert.equal(chrome.hasDedicatedAppHeader('/wallet'), false);
assert.equal(chrome.shouldUseWideTopNavigation('/notifications', 'top'), true);
assert.equal(chrome.shouldUseWideTopNavigation('/notifications', 'compact'), false);
assert.equal(chrome.shouldUseWideTopNavigation('/studio', 'top'), false);
assert.equal(chrome.shouldUseWideTopNavigation('/', 'top'), true);
assert.equal(chrome.shouldUseWideTopNavigation('/discover', 'top'), true);
assert.equal(chrome.shouldUseWideTopNavigation('/events', 'top'), true);
assert.equal(chrome.shouldUseWideTopNavigation('/market', 'top'), true);
assert.equal(chrome.shouldUseWideTopNavigation('/creator/events', 'top'), false);

assert.equal(
  chrome.bottomChromeInsetForLayout({
    safeBottom: 0,
    bottomHidden: false,
    wideTopNavigation: false,
    hasCurrentTrack: false,
  }),
  107,
);
assert.equal(
  chrome.bottomChromeInsetForLayout({
    safeBottom: 24,
    bottomHidden: false,
    wideTopNavigation: false,
    hasCurrentTrack: true,
  }),
  240,
);
assert.equal(
  chrome.bottomChromeInsetForLayout({
    safeBottom: 0,
    bottomHidden: false,
    wideTopNavigation: true,
    hasCurrentTrack: true,
  }),
  158,
);
assert.equal(
  chrome.bottomChromeInsetForLayout({
    safeBottom: 24,
    bottomHidden: false,
    wideTopNavigation: true,
    hasCurrentTrack: true,
  }),
  170,
);
assert.equal(
  chrome.bottomChromeInsetForLayout({
    safeBottom: 24,
    bottomHidden: true,
    wideTopNavigation: true,
    hasCurrentTrack: true,
  }),
  48,
);

const appChromeSource = read('components/AppChrome.tsx');
const adaptiveSource = read('components/AdaptivePluggdNavigation.tsx');
const topSource = read('components/PluggdTopNavigation.tsx');
const dockSource = read('components/PluggdDock.tsx');
const discoveryHeaderSource = read('src/features/discovery/DiscoveryHeader.tsx');
const insetSource = read('src/design/useBottomChromeInset.ts');
const hookSource = read('src/design/adaptiveNavigation.ts');

assert.match(appChromeSource, /AdaptivePluggdNavigation mode="top"/);
assert.match(appChromeSource, /AdaptivePluggdNavigation mode="compact"/);
assert.match(appChromeSource, /shouldUseWideTopNavigation/);
assert.match(appChromeSource, /widePlayerWrap/);
assert.ok(
  appChromeSource.indexOf('wideTopNavigation ?') < appChromeSource.indexOf(': ownsHeader ? null'),
  'Wide Android navigation must take precedence over route-owned discovery headers.',
);
assert.doesNotMatch(appChromeSource, /import \{ PluggdDock \}/);
assert.match(adaptiveSource, /useAdaptiveNavigationLayout/);
assert.match(adaptiveSource, /widthClass=\{adaptiveLayout\.widthClass\}/);
assert.match(hookSource, /useWindowDimensions/);
assert.match(hookSource, /Platform\.OS/);
assert.match(insetSource, /bottomChromeInsetForLayout/);
assert.match(insetSource, /shouldUseWideTopNavigation/);
assert.match(topSource, /accessibilityRole="tab"/);
assert.match(topSource, /accessibilityState=\{\{ selected: active \}\}/);
assert.match(topSource, /top-nav-tab-/);
assert.match(topSource, /isCoreNavigationItemActive\(pathname, item\)/);
assert.match(topSource, /accessibilityLabel="Search PLUGGD"/);
assert.match(topSource, /accessibilityLabel="Open notifications"/);
assert.match(topSource, /accessibilityLabel="Open account menu"/);
assert.match(topSource, /size=\{44\}/);
assert.match(topSource, /zIndex:\s*100/);
assert.match(topSource, /elevation:\s*100/);
assert.match(dockSource, /isCoreNavigationItemActive\(pathname, item\)/);
assert.match(discoveryHeaderSource, /useAdaptiveNavigationMode\(\)/);
assert.match(discoveryHeaderSource, /navigationMode === 'top'/);
assert.match(discoveryHeaderSource, /height:\s*insets\.top \+ 70/);

console.log('Android adaptive navigation contract: PASS');
