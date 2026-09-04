import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dockSource = read('components/PluggdDock.tsx');
const headerSource = read('components/MobileHeader.tsx') + read('components/AccountMenuButton.tsx');
// Chrome visibility rules live in src/lib/appChromeVisibility.ts so AppChrome
// and useBottomChromeInset cannot disagree. Assert against that source.
const chromeSource = read('components/AppChrome.tsx') + read('src/lib/appChromeVisibility.ts');
const walletSource = read('app/wallet.tsx');
const creditsSource = read('src/hooks/useCredits.ts');
const appleBillingSource = read('src/billing/adapters/apple.ts');
const billingTypesSource = read('src/billing/types.ts');

// Store is a primary tab. It was dropped to a four-item dock during submission
// simplification, but the hybrid commerce architecture always intended the
// catalogue to ship on iOS with a per-product payment rail — physical goods and
// real-world services on hosted checkout, digital unlocks on credits/IAP.
for (const label of ['Home', 'Discover', 'Community', 'Events', 'Store']) {
  assert.match(dockSource, new RegExp(`label:\\s*'${label}'`), `${label} must be in the locked primary nav`);
}
assert.doesNotMatch(dockSource, /label:\s*'Search'/, 'Search must stay in top/header access, not bottom nav');
assert.doesNotMatch(dockSource, /label:\s*'(Wallet|Marketplace|Explore|Create|Profile|Stage|Live|Backstage|MyPLUGGD)'/, 'wallet/old native tabs must not return as primary nav tabs');
assert.match(headerSource, /Wallet \/ Credits|Wallet \/ Earnings/, 'wallet must be available from avatar menu with web account copy');
assert.match(headerSource, /Memberships/, 'memberships must be available from avatar menu');
assert.match(headerSource, /Tickets/, 'tickets must be available from avatar menu');
assert.match(walletSource, /storeName[\s\S]*store currency/, 'wallet must explain that the active store localizes the final price');
assert.doesNotMatch(walletSource, /100 credits = £1/, 'wallet must not mix a fixed GBP value with localized StoreKit prices');
assert.match(creditsSource + billingTypesSource, /storeProductPrice[\s\S]*product\?\.displayPrice \?\? ''/, 'credit packs must display only store-localized prices');
assert.doesNotMatch(creditsSource, /return `£\$\{fallbackPriceGBP/, 'credit packs must not display a hard-coded GBP fallback');
assert.match(creditsSource, /case 'unknown':[\s\S]*storeName[\s\S]*could not complete this purchase/, 'unknown store failures must give customers an actionable message');
assert.match(creditsSource, /debugMessage: error\.debugMessage/, 'StoreKit diagnostics must retain Apple debug details for device QA');
assert.match(creditsSource, /const purchaseToken = purchase\.purchaseToken;/, 'expo-iap StoreKit 2 credit validation must use Apple\'s signed transaction JWS');
assert.doesNotMatch(creditsSource, /receipt_data:\s*purchase\.transactionReceipt/, 'StoreKit 2 credit validation must not submit the empty legacy receipt field');
assert.match(creditsSource, /confirmed this purchase, but verification is still pending\./, 'delayed verification must provide safe recovery guidance');
assert.match(creditsSource, /Do not buy again—reopen Wallet in a moment\./, 'backend verification errors must prevent an accidental duplicate purchase');
assert.match(creditsSource, /pendingReconciliationStarted/, 'Wallet must automatically reconcile interrupted StoreKit purchases');
assert.match(creditsSource, /getAvailablePurchases\(\)[\s\S]*validateReceipt\(purchase\)[\s\S]*finishTransaction/, 'interrupted purchases must be server-verified before StoreKit is finished');
assert.match(creditsSource + appleBillingSource, /recoverServerVerifiedPurchase[\s\S]*\.from\('wallet_ledger'\)[\s\S]*\.eq\('ref_type', billing\.creditRail\)[\s\S]*\.contains\('meta'[\s\S]*creditRail:\s*'apple_iap'/, 'a server-notification fulfilment must clear the client warning only after finding the authenticated user\'s store ledger grant');
assert.match(creditsSource, /isWalletBalance\(balance\)/, 'a recovered server balance must be runtime validated before entering wallet state');
assert.match(creditsSource, /if \(recovered\)\s*\{[\s\S]*return \{ data: recovered,[\s\S]*verification is still pending/, 'missing StoreKit JWS data must fall back to the verified server transaction before showing an error');
assert.match(chromeSource, /BOTTOM_HIDDEN_EXACT[\s\S]*'\/wallet'/, 'the public dock must not cover Wallet purchase controls');

for (const sku of ['pluggd_credits_starter', 'pluggd_credits_popular', 'pluggd_credits_value', 'pluggd_credits_premium', 'pluggd_credits_ultimate']) {
  assert.match(creditsSource, new RegExp(sku), `${sku} must remain in IAP catalog`);
}

console.log('mobile wallet context contract verified');
