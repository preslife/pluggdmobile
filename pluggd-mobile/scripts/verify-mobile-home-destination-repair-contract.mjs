import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const home = read('src/features/home/MusicDiscoveryHome.tsx');
const homeDiscoveryData = read('src/features/home/homeDiscoveryData.ts');
const destinations = read('src/features/home/homeDestinations.ts');
const discoveryModel = read('src/features/discovery/discoveryModel.ts');
const discover = read('src/features/discovery/MusicDiscoveryDiscover.tsx');
const editorialBits = read('src/features/editorial/EditorialBits.tsx');
const miniPlayer = read('components/MiniPlayer.tsx');
const glassPlayer = read('components/liquid-glass/GlassMiniPlayer.tsx');
const fullPlayer = read('app/player.tsx');
const plugNavigation = read('src/features/editorial/thePlugNavigation.ts');
const plugReader = read('app/plug/[id].tsx');
const publicFeatures = read('src/features/discovery/publicDiscoveryFeatures.ts');
const commercePolicy = read('src/commerce/policy.ts');
const product = read('app/product/[id].tsx');
const basket = read('app/commerce/basket.tsx');
const physicalBasketBackend = read('../supabase/functions/enhanced-store-checkout/iosPhysicalBasket.ts');
const releases = read('src/features/editorial/ListeningFloorScreen.tsx');
const beatPlug = read('src/features/editorial/BeatPlugScreen.tsx');
const dj = read('app/dj.tsx');
const carnivalTypes = read('src/features/carnival/carnivalTypes.ts');
const carnivalService = read('src/features/carnival/carnivalService.ts');
const carnival = read('src/features/carnival/CarnivalHubScreen.tsx');

for (const kind of ['release', 'beat', 'mix', 'scene', 'article', 'opportunity', 'creator', 'backstage', 'soundboard', 'store_product', 'event', 'carnival', 'live_room', 'creator_tool']) {
  assert.match(destinations, new RegExp(`kind: '${kind}'`), `Homepage destination registry must include ${kind}`);
}
assert.match(destinations, /signedOutRoute: '\/auth\/login'/, 'Creator tools must have an explicit signed-out action.');
assert.match(home, /resolveHomeDestination/, 'Homepage cards must resolve through the typed destination registry.');
for (const invisibleLayer of ['sceneHit', 'waveHit', 'soundboardHit', 'worldHit']) {
  assert.doesNotMatch(home, new RegExp(invisibleLayer), `Homepage must not retain overlapping ${invisibleLayer} layers.`);
}

assert.match(discoveryModel, /DiscoveryScene[\s\S]*kind: 'city' \| 'genre'[\s\S]*canonicalValue/, 'Scenes must have a typed canonical destination.');
assert.match(discoveryModel, /bundle\.beats\.forEach/, 'Scenes must derive available genres from real BeatPlug inventory as well as releases and mixes.');
assert.match(home, /title="From the scenes"[\s\S]*scenes\.length \?/, 'Home must keep the Scenes section visible and render sourced scenes when available.');
assert.match(home, /value: scene\.canonicalValue, label: scene\.label/, 'Home scene routes must carry a canonical filter value and a human-readable label.');
assert.match(home, /Scenes could not load\.[\s\S]*Tap to refresh current cities and sounds\./, 'Home Scenes must expose a deliberate retry state instead of disappearing.');
assert.match(discover, /selectedScene[\s\S]*discoveryItemMatchesScene/, 'Discover must apply the selected scene.');
assert.match(discover, /sceneValue[\s\S]*canonicalValue: normalizeSceneValue\(selectedSceneValue\)/, 'Discover must filter against the canonical scene value while preserving the display label.');
assert.match(discover, /filter === 'Scenes' && selectedScene\s*\? items\s*:\s*\(items\.length \? items : allItems\)/, 'A selected scene with no matches must not fall back to the generic feed.');

assert.doesNotMatch(glassPlayer, /Close player and stop playback/, 'The mini-player must not expose an easy-to-hit adjacent close X.');
assert.match(miniPlayer, /text: 'Close player'[\s\S]*void closePlayer\(\)/, 'Destructive player close must live in the deliberate options menu.');
assert.doesNotMatch(fullPlayer, /accessibilityLabel="Close player and stop playback"/, 'The full player must not expose a direct destructive close button beside minimise/share.');
assert.match(fullPlayer, /text: 'Close player', style: 'destructive'/, 'The full player must place Close player inside an intentional options action.');
assert.match(fullPlayer, /accessibilityLabel="Open player options"/, 'The full player must expose the intentional options action.');

assert.match(editorialBits, /StyleSheet\.flatten\(typeof style === 'function' \? style\(state\) : style\)/, 'Shared editorial Pressables must flatten nested style arrays so fixed card geometry reaches native layout.');
assert.match(home, /waveMosaic: \{ height: 224, minHeight: 224, maxHeight: 224/, 'Next Wave must retain a bounded mosaic height.');

assert.match(home, /action="Open THE PLUG"/, 'Home must expose the THE PLUG index.');
assert.match(plugNavigation, /INTERNAL_HOSTS/, 'Article navigation must distinguish PLUGGD from external hosts.');
assert.match(plugReader, /decision\.kind === 'external'[\s\S]*openExternalLink/, 'Only genuine external links may prompt before Safari.');

assert.match(publicFeatures, /imageCandidates/, 'Opportunity identity must use deterministic artwork candidates.');
assert.match(publicFeatures, /fallbackSource/, 'Opportunity identity must have a shared visual fallback.');
assert.match(home, /opportunityFrame: \{ width: 220, minWidth: 220, maxWidth: 220/, 'Opportunity cards must use the approved narrower fixed rail geometry.');
assert.match(home, /opportunitySurface: \{ \.\.\.StyleSheet\.absoluteFillObject/, 'Opportunity surfaces must fill rather than expand their bounded rail frames.');
assert.match(home, /numberOfLines=\{2\}>\{opportunity\.title\}/, 'Opportunity titles must be bounded instead of widening the rail.');
assert.match(home, /pluggd-events\.jpg/, 'Happening Now must use the approved event artwork when a live row has no cover.');
assert.match(home, /\{nextWave\.length \? <NextWave/, 'The Next Wave must render whenever its real destination builder returns content.');
assert.doesNotMatch(homeDiscoveryData, /filter\(\(\{ release, signal \}\) => Boolean\(release\.cover_art_url && signal\?\.supporter_count\)\)/, 'The Next Wave must not disappear solely because optional supporter metrics are absent.');

assert.match(destinations, /destination\.tool === 'pluggd_dj'[\s\S]*\? '\/dj'/, 'PLUGGD DJ must resolve to its own native destination.');
assert.match(dj, /PLUGGD DJ/, 'The native PLUGGD DJ destination must preserve the named tool identity.');
assert.match(dj, /\/studio\/catalog\?tab=mixes/, 'PLUGGD DJ must provide direct mix workspace access.');

assert.match(publicFeatures, /\['physical', 'merchandise', 'merch', 'creator_merch'\]/, 'Home Store rail must contain physical merchandise only.');
assert.match(commercePolicy, /requiresDigitalStorefront = request\.kind !== 'physical_merch' && request\.classification !== 'physical'/, 'Physical merchandise must not depend on StoreKit storefront availability.');
for (const customerCopy of ['Sold out', 'Checkout is temporarily unavailable', 'Try again']) {
  assert.match(product, new RegExp(customerCopy), `Product errors must expose customer-safe ${customerCopy} copy.`);
}
assert.match(basket, /clientContext:\s*'ios_physical_basket'/, 'Native physical checkout must use the isolated server-validated basket context.');
assert.doesNotMatch(basket, /Origin:\s*'https:\/\/pluggd\.fm'/, 'Native checkout must not forge a browser Origin header.');
assert.match(physicalBasketBackend, /const RETURN_URL = "pluggd:\/\/commerce\/success"/, 'Native physical checkout must use the trusted app return URL.');
assert.match(basket, /Your basket is still here and you have not been charged/, 'Checkout failure copy must be customer-safe and preserve recovery context.');

for (const releaseToken of ['Lead Drop', 'This Week', 'Moving Now', 'New music discovery starts here.', 'Browse the floor', 'Fresh Pressings', 'The chart', 'Pressing orders', 'Listening passes', 'The racks', 'From THE PLUG']) {
  assert.match(releases, new RegExp(releaseToken, 'i'), `Releases must preserve ${releaseToken}.`);
}
assert.doesNotMatch(releases, /Previous featured drop|Play featured drop|Next featured drop/, 'Releases must use release terminology, not unrelated copy.');

for (const beatPlugToken of ['Featured Beat', 'Hot Leases', 'Crates', 'Licenses', 'Find your next beat.', 'LISTENING BENCH', 'View licences & buy']) {
  assert.match(beatPlug, new RegExp(beatPlugToken, 'i'), `BeatPlug must preserve ${beatPlugToken}.`);
}

assert.match(carnivalTypes, /schemaVersion: 1 \| 2/, 'Carnival bundle contract must support a compatible v1 to v2 rollout.');
assert.match(carnivalService, /\[1, 2\]\.includes\(data\.schemaVersion\)/, 'Carnival loader must reject unknown schema versions.');
for (const token of ['stickyHeaderIndices', 'PLUGGD PRESENTS', 'WEST LONDON', 'DIAMOND JUBILEE', '60 YEARS ON THE ROAD', 'Notting Hill Carnival', '29—31 AUGUST 2026', 'EXPLORE THE MAP', 'BUILD MY CARNIVAL', 'Save Carnival', 'I’M GOING', 'Seven ways into the road.', 'Choose your road.', 'Pick the feeling. We’ll find the corners.', 'Map the road', 'Find your sound', 'Bands on the road', 'Save the road.', 'Travel, access and offline', 'Carnival questions']) {
  assert.match(carnival, new RegExp(token, 'i'), `Carnival hierarchy must include ${token}.`);
}
assert.match(carnival, /bundle\.guide\.weekend\.map\(\(day\)[\s\S]*uri=\{day\.imageUrl/, 'Carnival weekend cards must use their own day artwork, never article artwork by index.');
assert.doesNotMatch(carnivalService, /\.\.\.\(\(data as Partial<CarnivalHubBundle>\)\.guide/, 'Native Carnival sections must not be silently reordered or remapped by a stale remote guide object.');
assert.doesNotMatch(carnival, /bundle\.stories\[index\]/, 'Carnival day cards must never borrow article artwork by array position.');
const carnivalOrder = [
  'sectionY.current.guide',
  'sectionY.current.stories',
  'sectionY.current.weekend',
  'sectionY.current.build',
  'sectionY.current.map',
  'sectionY.current.sounds',
  'sectionY.current.bands',
  'sectionY.current.community',
  'sectionY.current.essentials',
  'sectionY.current.faq',
];
let previousCarnivalIndex = -1;
for (const marker of carnivalOrder) {
  const index = carnival.indexOf(marker);
  assert.ok(index > previousCarnivalIndex, `Carnival section ${marker} must follow the exact mobile-web hierarchy.`);
  previousCarnivalIndex = index;
}

console.log('PASS mobile Homepage and destination repair contract');
