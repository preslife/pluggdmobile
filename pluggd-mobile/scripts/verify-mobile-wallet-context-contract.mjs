import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dockSource = read('components/PluggdDock.tsx');
const headerSource = read('components/MobileHeader.tsx');
const walletSource = read('app/wallet.tsx');
const creditsSource = read('src/hooks/useCredits.ts');

for (const label of ['Home', 'Discover', 'Community', 'Events', 'Market']) {
  assert.match(dockSource, new RegExp(`label:\\s*'${label}'`), `${label} must be in the locked primary nav`);
}
assert.doesNotMatch(dockSource, /label:\s*'Search'/, 'Search must stay in top/header access, not bottom nav');
assert.doesNotMatch(dockSource, /label:\s*'(Wallet|Marketplace|Explore|Create|Profile|Stage|Live|Backstage|MyPLUGGD)'/, 'wallet/old native tabs must not return as primary nav tabs');
assert.match(headerSource, /Wallet \/ Credits|Wallet \/ Earnings/, 'wallet must be available from avatar menu with web account copy');
assert.match(headerSource, /Memberships/, 'memberships must be available from avatar menu');
assert.match(headerSource, /Tickets/, 'tickets must be available from avatar menu');
assert.match(walletSource, /100 credits = £1/, 'wallet must preserve credit conversion copy');

for (const sku of ['pluggd_credits_starter', 'pluggd_credits_popular', 'pluggd_credits_value', 'pluggd_credits_premium', 'pluggd_credits_ultimate']) {
  assert.match(creditsSource, new RegExp(sku), `${sku} must remain in IAP catalog`);
}

console.log('mobile wallet context contract verified');
