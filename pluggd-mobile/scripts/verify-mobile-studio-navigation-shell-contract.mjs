import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const studio = read('src/features/studio/StudioScreens.tsx');
const studioData = read('src/features/studio/studio-data.ts');
const soundboardDetail = read('app/soundboards/[id].tsx');

const menuStart = studio.indexOf('function StudioMenuButton');
const menuEnd = studio.indexOf('function StudioTopBar');
assert.ok(menuStart >= 0 && menuEnd > menuStart, 'Studio menu implementation must be present');
const menu = studio.slice(menuStart, menuEnd);

assert.match(menu, /accessibilityLabel="Open Studio menu"/, 'the leading Studio control must describe the section menu');
assert.match(menu, /<Modal[\s\S]*visible=\{open\}/, 'the leading Studio control must open a native modal menu');
assert.match(menu, /const closeMenu = \(\) => setOpen\(false\)/, 'Studio menu dismissal must be a local state-only action');
assert.match(menu, /<Pressable\s+accessible=\{false\}\s+importantForAccessibility="no"\s+onPress=\{closeMenu\}\s+style=\{styles\.studioMenuBackdrop\}/, 'the full-screen backdrop must dismiss physically without exposing an overlapping accessibility target');
assert.equal((menu.match(/accessibilityLabel="Close Studio menu"/g) ?? []).length, 1, 'the accessibility tree must expose exactly one unambiguous Close Studio menu action');
assert.match(menu, /accessible\s+accessibilityRole="button"\s+accessibilityLabel="Close Studio menu"[\s\S]*?onPress=\{closeMenu\}/, 'the visible Studio menu close button must dismiss local drawer state only');
assert.doesNotMatch(menu, /router\.(?:push|replace)\(['"]\/studio\/apps/, 'the leading Studio control must not navigate directly to Apps');
assert.doesNotMatch(studio, /\.filter\(\(module\) => module\.status !== 'web_only'/, 'advanced Studio modules must remain reachable from the native menu through the secure Studio browser');
assert.match(studio, /Boolean\(module\.route\)/, 'route-less Studio modules must not appear in the native menu');
assert.match(studio, /module\.plugged \|\| module\.alwaysVisible/, 'the menu must follow the enabled role-aware Studio model');
assert.match(studio, /module\.id !== 'studio_apps'/, 'Apps must remain in the bottom dock instead of being duplicated in the section menu');
assert.match(studio, /STUDIO_MENU_NATIVE_ROUTE_PATHS\.has\(routePath\)/, 'the menu must allow only audited native route paths');
assert.match(studio, /'\/studio\/browser'/, 'the audited Studio menu route family must include the secure embedded workspace');
assert.match(studio, /<StudioMenuButton data=\{data\}/, 'the top bar must provide the real Studio module model to the menu');
assert.match(studio, /const DOCK_ITEMS[\s\S]*label: 'Apps'[\s\S]*route: '\/studio\/apps'/, 'Apps must remain in the existing Studio bottom dock');

const actionBoardStart = studio.indexOf('function ActionBoard');
const actionBoardEnd = studio.indexOf('function KpiCard');
assert.ok(actionBoardStart >= 0 && actionBoardEnd > actionBoardStart, 'Studio creator action board must be present');
const actionBoard = studio.slice(actionBoardStart, actionBoardEnd);
assert.doesNotMatch(actionBoard, /label="Preview"/, 'Studio creator actions must not present management modules as Preview');
assert.match(actionBoard, /Add \$\{module\.title\} to Studio\?/, 'optional unplugged creator actions must ask before adding the module');
assert.match(actionBoard, /setStudioModulePlugged\(data\.userId, module\.id, true\)/, 'confirmed optional modules must use the existing persisted Studio module setting');
assert.match(actionBoard, /module\.plugged[\s\S]*routePush\(router, action\.route\)/, 'default or already-plugged modules must open directly');

for (const [moduleId, expectedRoute] of [
  ['releases', '/studio/catalog?tab=releases'],
  ['beats', '/studio/catalog?tab=beats'],
  ['mixes', '/studio/catalog?tab=mixes'],
  ['soundboards', '/studio/catalog?tab=soundboards'],
]) {
  const start = studioData.indexOf(`id: '${moduleId}'`);
  const end = studioData.indexOf('\n  },', start);
  assert.ok(start >= 0 && end > start, `${moduleId} Studio module definition must exist`);
  const definition = studioData.slice(start, end);
  assert.match(definition, new RegExp(`route: '${expectedRoute.replace(/[?]/g, '\\?')}'`), `${moduleId} must open its internal Studio catalog manager`);
  assert.doesNotMatch(definition, new RegExp(`route: '/(?:${moduleId}|market/beats)'`), `${moduleId} must not use a public catalogue index as its Studio destination`);
}

assert.match(studio, /export function StudioCatalogScreen\(\)/, 'native Studio must expose an internal catalogue-management screen');
assert.doesNotMatch(studio, /route="\/(?:releases|mixes|soundboards|market\/beats)"/, 'Studio dashboard and analytics catalogue controls must not route to public indexes');
assert.doesNotMatch(studioData, /\.slice\(0, 12\)/, 'Studio management must not silently discard older owned catalogue rows');
assert.match(studio, /function catalogManagementActions\(item: StudioCatalogItem\)/, 'owned catalogue rows must open an actionable internal management workspace');
assert.match(studio, /Promote release[\s\S]*attachmentType=release&releaseId=\$\{id\}/, 'Release management must expose a working creator promotion action with the owned release attached');
assert.match(studio, /Review rights & splits[\s\S]*route: '\/studio\/splits'/, 'Release management must keep rights and split work inside Studio');
assert.match(studio, /accessibilityLabel=\{`Manage \$\{item\.title\} in Studio`\}/, 'owned catalogue rows must be labelled as management actions rather than passive selections');
assert.doesNotMatch(studio, /Selected in Studio|accessibilityLabel=\{`Select \$\{item\.title\}/, 'Studio catalogue management must not regress to a passive selected-only state');
assert.match(studioData, /managementFacts: catalogFacts\([\s\S]*label: 'Status'[\s\S]*label: 'Release date'/, 'Release management must expose real status and date metadata from the owned row');
assert.match(studio, /item\.kind === 'soundboard'[\s\S]*routePush\(router, item\.route\)/, 'owned Soundboards must enter their Studio editor route from catalogue management');
assert.match(soundboardDetail, /pathname\.startsWith\('\/studio\/soundboards\/'\)/, 'the real Soundboard owner editor must recognise Studio context');
assert.match(soundboardDetail, /useState\(studioMode\)/, 'Studio-owned Soundboards must default directly into editor mode');
assert.match(soundboardDetail, /studioReturnRoute = '\/studio\/catalog\?tab=soundboards'/, 'Studio Soundboard back fallback must remain inside Studio');

const nativeRouteFiles = [
  'app/creator/events.tsx',
  'app/creator/upload.tsx',
  'app/live/create.tsx',
  'app/market/index.tsx',
  'app/market/[section].tsx',
  'app/membership/index.tsx',
  'app/mixes/index.tsx',
  'app/profile.tsx',
  'app/releases/index.tsx',
  'app/sample-packs/index.tsx',
  'app/settings/privacy.tsx',
  'app/soundboards/index.tsx',
  'app/studio/analytics.tsx',
  'app/studio/browser.tsx',
  'app/studio/catalog.tsx',
  'app/studio/connect-card.tsx',
  'app/studio/index.tsx',
  'app/studio/my-pluggd.tsx',
  'app/studio/splits.tsx',
  'app/studio/soundboards/[id].tsx',
  'app/wallet.tsx',
];

for (const relativePath of nativeRouteFiles) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `native Studio menu destination must exist: ${relativePath}`);
}

console.log('PLUGGD native Studio navigation shell contract verified');
