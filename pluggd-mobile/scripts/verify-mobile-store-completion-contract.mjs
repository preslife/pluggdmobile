import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const store = read('src/features/editorial/MarketStoreScreen.tsx');
const detail = read('app/product/[id].tsx');
const parity = read('src/features/parity/AppWideParityScreens.tsx');

assert.match(
  parity,
  /export function MarketParityScreen\(\)[\s\S]*?return <MarketStoreScreen \/>/,
  'The active Market route must continue to render the completed Store screen',
);

for (const table of ['store_products', 'creator_merchandise', 'sample_packs']) {
  assert.match(store, new RegExp(`from\\('${table}'\\)`), `Store must render real ${table} data`);
}
assert.match(store, /productRoute[\s\S]*?\/product\/\$\{product\.id\}\?source=\$\{product\.source\}/, 'Each physical product must retain its exact real detail route and source');
assert.match(store, /ProductArtwork[\s\S]*?PluggdImage[\s\S]*?artFallback/, 'Products must use real artwork with a contained type fallback');
assert.match(store, /gridCardWrap[\s\S]*?productArtWrap:\s*\{\s*aspectRatio:\s*0\.86/, 'Merchandise cards must retain one consistent mobile product ratio');
assert.match(store, /SHELF_FILTERS[\s\S]*?accessibilityRole="tab"[\s\S]*?setShelfFilter/, 'Real shelves must be compact and accessibly filterable');

assert.match(store, /accessibilityLabel="Open purchases"[\s\S]*?router\.push\('\/purchases'/, 'The Store must expose existing purchase records');
assert.match(store, /accessibilityLabel="Explore BeatPlug"[\s\S]*?router\.push\('\/market\/beats'/, 'The Store must retain BeatPlug access');
assert.match(store, /accessibilityLabel="Browse sample packs"[\s\S]*?router\.push\('\/sample-packs'/, 'The Store must retain full sample-pack access');
assert.match(store, /router\.push\(`\/sample-pack\/\$\{pack\.id\}`/, 'Every sample-pack card must open its real detail route');

assert.match(store, /productsQuery\.isLoading[\s\S]*?productsQuery\.isError[\s\S]*?productsQuery\.refetch/, 'Physical merchandise must expose loading, error and retry states');
assert.match(store, /The next physical drop is being prepared[\s\S]*?Browse sample packs/, 'An empty physical shelf must retain a useful real destination');
assert.match(store, /packsQuery\.isLoading[\s\S]*?packsQuery\.isError[\s\S]*?packsQuery\.refetch/, 'Sample packs must expose loading, error and retry states');
assert.match(store, /New sample packs will appear here when creators publish them/, 'Sample packs must expose an honest empty state');
assert.match(store, /useBottomChromeInset\(\)[\s\S]*?paddingBottom:\s*bottomInset/, 'Store content must clear the shared player and bottom dock');

assert.doesNotMatch(
  store,
  /Music Production|Mixing & Mastering|Artwork & Design|DJ Sets|From £\d+|Event merch coming soon|Worldwide Lookbook|STORE_PROMISES|SERVICES/,
  'The Store must not show hard-coded services, prices, trust claims or promotional filler as commerce',
);
assert.doesNotMatch(store, /safeList/, 'Store query failures must not be silently converted into false empty shelves');

assert.match(detail, /useCommercePolicy[\s\S]*?kind:\s*'physical_merch'/, 'Product checkout must remain policy-gated as physical merchandise');
assert.match(detail, /accessibilityLabel={`Continue to secure checkout for \$\{quantity\} \$\{product\.title\}`\}/, 'Product detail must retain the real quantity-aware purchase action');
assert.match(detail, /create-merch-checkout[\s\S]*?openHostedCheckout[\s\S]*?reconcileHostedCheckout/, 'Purchase must remain server-created, hosted and reconciled');
assert.match(detail, /Decrease quantity[\s\S]*?Increase quantity/, 'Product detail must retain quantity controls');

console.log('mobile store completion contract verified');
