import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const creditsSource = read('src/hooks/useCredits.ts');
const walletSource = read('src/hooks/useWallet.ts');
const layoutSource = read('app/_layout.tsx');
const paymentsSource = read('src/lib/payments.ts');
const checkoutSource = read('app/commerce/checkout.tsx');
const successSource = read('app/commerce/success.tsx');
const storefrontSource = read('src/hooks/useStorefront.ts');
const beatLicenseSource = read('components/BeatLicenseButton.tsx');

function extractArray(source, exportName) {
  const match = source.match(new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\] as const;`));
  assert.ok(match, `${exportName} export not found`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

const expectedCreditSkus = [
  'pluggd_credits_starter',
  'pluggd_credits_popular',
  'pluggd_credits_value',
  'pluggd_credits_premium',
  'pluggd_credits_ultimate',
];

assert.deepEqual(
  extractArray(creditsSource, 'CREDIT_PACK_SKUS'),
  expectedCreditSkus,
  'iOS credit catalog must expose only the approved four StoreKit credit packs',
);

for (const label of ['Plus Credits', 'Value Credits', 'Premium Credits', 'Ultimate Credits']) {
  assert.match(creditsSource, new RegExp(`label:\\s*'${label}'`), `${label} label missing`);
}

assert.match(creditsSource, /label:\s*'Starter Credits'/, 'Starter Credits label missing');

for (const price of ['5', '9.99', '24.99', '49.99', '99.99']) {
  assert.match(creditsSource, new RegExp(`fallbackPriceGBP:\\s*${price.replace('.', '\\.')}`), `approved GBP price ${price} missing`);
}

assert.match(
  creditsSource,
  /product\.currency === 'GBP' \|\| product\.localizedPrice\.includes\('£'\)/,
  'credit pack UI must not display non-GBP StoreKit sandbox prices for approved PLUGGD credit packs',
);

assert.match(
  creditsSource,
  /pluggd_credits_starter[\s\S]*totalCredits:\s*500/,
  'starter credit SKU must remain an active 500 credit pack',
);

assert.match(
  walletSource,
  /functions\.invoke\(\s*'spend-credits'/,
  'wallet spend must call spend-credits so backend entitlements are created',
);
assert.doesNotMatch(
  walletSource,
  /process-credits-transaction/,
  'wallet spend must not use the old generic credit transaction function',
);

assert.doesNotMatch(
  paymentsSource,
  /create-mobile-payment-intent|initPaymentSheet|presentPaymentSheet/,
  'outdated Stripe PaymentSheet digital checkout path must not be active in iOS',
);

assert.doesNotMatch(
  layoutSource,
  /StripeProvider/,
  'global StripeProvider must not wrap iOS digital purchase flows',
);

assert.doesNotMatch(
  checkoutSource,
  /launchPaymentSheet|Payment Method|Pay \$|beat_id: params\.beatId \?\? "demo"/,
  'checkout route must not expose stale Stripe/card checkout for digital goods',
);

assert.doesNotMatch(
  successSource,
  /Paid with Apple Pay|Download Stems|View License PDF|Order Successful/,
  'legacy order success screen must not imply unsupported digital checkout completion',
);

assert.match(
  storefrontSource,
  /canShowExternalLink:\s*false/,
  'storefront hook must not allow external digital checkout links in the iOS app',
);

assert.doesNotMatch(
  beatLicenseSource,
  /Linking\.openURL|licenseUrl|send-push-notification|complete the purchase on the web|Licenses are completed/,
  'beat licensing CTA must not preserve stale external checkout or web purchase paths',
);

assert.match(
  beatLicenseSource,
  /Licensing coming soon|Save this beat/,
  'beat licensing CTA must use polished customer-facing unavailable-state copy',
);

assert.doesNotMatch(
  beatLicenseSource,
  /native entitlement|external checkout|payment contract|web purchase|unsupported payment/i,
  'beat licensing CTA must not expose implementation or App Review copy',
);

console.log('mobile commerce contract verified');
