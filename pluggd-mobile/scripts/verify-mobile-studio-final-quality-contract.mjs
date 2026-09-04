import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const studio = read('src/features/studio/StudioScreens.tsx');
const connectEditor = read('src/features/studio/StudioConnectCardEditorScreen.tsx');
const commerce = read('src/features/studio/StudioCommerceScreen.tsx');
const financials = read('src/features/studio/StudioFinancialsScreen.tsx');
const catalog = read('src/features/studio/OwnerCatalogScreen.tsx');
const upload = read('app/creator/upload.tsx');
const video = read('src/features/studio/StudioVideoScreen.tsx');
const glassPanel = read('components/liquid-glass/GlassPanel.tsx');

assert.doesNotMatch(studio, /style=\{\(\{\s*pressed\s*\}\)/, 'Studio Pressables must not use the unsupported function-style class regression');
assert.match(studio, /const pathname = usePathname\(\)/, 'Studio shell must read the current pathname');
assert.match(studio, /<ScrollView\s+key=\{pathname\}/, 'each Studio route must receive a fresh scroll container');
assert.match(studio, /style=\{\[\s*styles\.studioMenuItem,/, 'Studio drawer rows must use stable static style arrays');
assert.match(studio, /__DEV__ && data\.userId === 'studio-preview'[\s\S]*PREVIEW DATA · NOT YOUR ACCOUNT/, 'Simulator-only Studio fixtures must carry an explicit visible preview-data disclosure');
assert.match(studio, /Simulator preview data\. Not your account\./, 'the preview-data disclosure must be exposed accessibly');
assert.match(studio, /__DEV__ && params\.preview === 'creator' \? createStudioPreviewData\(\) : null/, 'Studio preview fixtures must remain guarded by the development-only route');

assert.match(studio, /function ModuleCard[\s\S]*modulePrimaryAction/, 'Apps must expose a compact primary action in every module row');
assert.match(studio, /\{module\.description\}/, 'Apps must explain modules with creator-facing descriptions');
assert.doesNotMatch(studio, /\{module\.addsToStudio\}/, 'Apps must not repeat internal module wiring copy');
assert.match(studio, /styles\.moduleTitle[\s\S]*numberOfLines=\{2\}/, 'Apps titles must remain complete at accessibility text sizes');
assert.match(studio, /accessibilityLabel=\{`Unplug \$\{module\.title\}`\}/, 'optional active Apps must keep an explicit accessible Unplug action');
assert.match(studio, /tileCopy\(actionDescriptions\.get\(action\.id\) \|\| action\.detail\)/, 'Create tiles must prefer creator-facing module descriptions over internal wiring copy');

for (const [route, component] of [
  ['app/studio/connect-card/edit.tsx', 'StudioConnectCardEditorScreen'],
  ['app/studio/splits/new.tsx', 'SplitCreateScreen'],
  ['app/studio/splits/[id].tsx', 'SplitAgreementScreen'],
  ['app/studio/browser.tsx', 'StudioBrowserScreen'],
]) {
  const source = read(route);
  assert.match(source, /CreatorAccessGate/, `${route} must import the creator access gate`);
  assert.match(source, new RegExp(`<CreatorAccessGate><${component} \/><\/CreatorAccessGate>`), `${route} must gate its protected loader before rendering`);
}

const visibleStudioSources = [studio, connectEditor, commerce, financials, catalog, upload].join('\n');
for (const internalCopy of [
  'Recent Studio Rows',
  'Advanced Studio',
  'OWNER WORKSPACE',
  'OWNER COMMERCE',
  'OWNER EDIT',
  'owner-managed',
  'owner-only',
  'exact authenticated',
  'exact secure',
]) {
  assert.ok(!visibleStudioSources.includes(internalCopy), `Creator Studio must not expose internal product copy: ${internalCopy}`);
}
assert.doesNotMatch(visibleStudioSources, /advanced studio/i, 'Creator Studio must use the approved More creator tools wording in visible and accessibility copy');

assert.match(connectEditor, /hero: \{ minHeight: 260, borderRadius: 24,/, 'Connect Card editor hero must use the premium Studio radius');
assert.match(connectEditor, /section: \{ borderRadius: 22,/, 'Connect Card editor form panels must use the premium Studio radius');
assert.match(connectEditor, /fieldRow: \{ flexDirection: 'row', flexWrap: 'wrap'/, 'Connect Card paired fields must wrap safely on compact screens');
assert.match(connectEditor, /serviceActions: \{ flexDirection: 'row', flexWrap: 'wrap'/, 'Connect Card service actions must wrap safely on compact screens');

assert.match(commerce, /hero: \{ borderRadius: 24,/, 'Commerce hero must use the premium Studio radius');
assert.match(commerce, /card: \{ borderRadius: 22,/, 'Commerce product cards must use the premium Studio radius');
assert.match(commerce, /tabs: \{ padding: 4, borderRadius: 16,/, 'Commerce tabs must match the Studio control language');
assert.match(financials, /hero: \{ borderRadius: 24,/, 'Financials hero must use the premium Studio radius');
assert.match(financials, /payoutCard: \{ borderRadius: 20,/, 'Financials payout cards must match the Studio panel language');

assert.match(catalog, /let licensePrices: Record<string, number>;[\s\S]*try \{[\s\S]*Object\.fromEntries[\s\S]*catch \(priceError\)/, 'licence prices must be parsed inside a handled validation boundary');
assert.match(catalog, /Alert\.alert\('Check licence pricing'/, 'invalid licence pricing must produce a clear creator-facing error');

assert.equal((upload.match(/<LinearGradient[^>]*style=\{StyleSheet\.absoluteFill\}/g) ?? []).length, 1, 'Upload Studio must render exactly one full-screen background gradient');
assert.match(upload, /<CreatorAccessGate>[\s\S]*<SafeAreaView/, 'Upload Studio must remain protected before its loader and form render');

assert.match(studio, /function MoreModuleTile[\s\S]*decorative=\{false\}/, 'Studio More cards must use clean native glass without decorative gradients');
assert.match(glassPanel, /!light && decorative && webPanel\[intensity\]/, 'gradient-free glass must remain gradient-free on web and native');
assert.match(studio, /catalogManagerEmptyTitle, \{ color: theme\.colors\.text \}/, 'adaptive Studio catalogue titles must use semantic light and dark text');
assert.match(studio, /catalogManagerRow, \{ borderColor: theme\.colors\.border, backgroundColor: theme\.colors\.surface \}/, 'adaptive Studio catalogue cards must use semantic surfaces');
assert.match(video, /primaryButton:[\s\S]*borderColor: theme\.colors\.borderAccent[\s\S]*backgroundColor: theme\.colors\.surfaceRaised/, 'Video upload actions must use the restrained Studio action treatment');

console.log('PLUGGD native Creator Studio final-quality contract verified');
