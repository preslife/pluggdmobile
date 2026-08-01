import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dockSource = read('components/PluggdDock.tsx');
const headerSource = read('components/MobileHeader.tsx');
const chromeSource = read('components/AppChrome.tsx');
const walletSource = read('app/wallet.tsx');
const creditsSource = read('src/hooks/useCredits.ts');

for (const label of ['Home', 'Discover', 'Community', 'Events']) {
  assert.match(dockSource, new RegExp(`label:\\s*'${label}'`), `${label} must be in the locked primary nav`);
}
assert.doesNotMatch(dockSource, /label:\s*'Search'/, 'Search must stay in top/header access, not bottom nav');
assert.doesNotMatch(dockSource, /label:\s*'(Wallet|Marketplace|Explore|Create|Profile|Stage|Live|Backstage|MyPLUGGD)'/, 'wallet/old native tabs must not return as primary nav tabs');
assert.match(headerSource, /Wallet \/ Credits|Wallet \/ Earnings/, 'wallet must be available from avatar menu with web account copy');
assert.match(headerSource, /Memberships/, 'memberships must be available from avatar menu');
assert.match(headerSource, /Tickets/, 'tickets must be available from avatar menu');
assert.match(walletSource, /App Store currency/, 'wallet must explain that Apple localizes the final price');
assert.doesNotMatch(walletSource, /100 credits = £1/, 'wallet must not mix a fixed GBP value with localized StoreKit prices');
assert.match(creditsSource, /product\?\.localizedPrice \?\? ''/, 'credit packs must display only StoreKit-localized prices');
assert.doesNotMatch(creditsSource, /return `£\$\{fallbackPriceGBP/, 'credit packs must not display a hard-coded GBP fallback');
assert.match(chromeSource, /BOTTOM_HIDDEN_EXACT[\s\S]*'\/wallet'/, 'the public dock must not cover Wallet purchase controls');

for (const sku of ['pluggd_credits_starter', 'pluggd_credits_popular', 'pluggd_credits_value', 'pluggd_credits_premium', 'pluggd_credits_ultimate']) {
  assert.match(creditsSource, new RegExp(sku), `${sku} must remain in IAP catalog`);
}

console.log('mobile wallet context contract verified');
