# Google Play credits — saved Draft readback

2026-10-03. This is provider Draft configuration proof, not product activation, a purchase test or production release. Starter remains active with its previously reviewed UKGBP4.99/USUSD4.99; no Starter repurchase or other price edit.

## Authoritative prices and scoped approval

Current selected Apple customer-price reference: `CREDIT_PRICE_PARITY.json`, SHA25620e04dd1c46b28037442fc4b302b181edd23dd9d24016a6e085de37bb6f28b19. The owner explicitly approved normal Google conversion only for unmatched overseas countries. No broad conversion of matching countries, fallback/guessed FX prices or future-market pricing was used.

| Saved Draft | Canonical credits | UK price | Current priced/available markets | Exact Apple same-currency matches | Approved Google conversions |
| --- | ---: | ---: | ---: | ---: | ---: |
| pluggd_credits_popular | 1,050 | GBP9.99 | 174 | 127, zero mismatches | 47 |
| pluggd_credits_value | 2,750 | GBP24.99 | 174 | 127, zero mismatches | 47 |
| pluggd_credits_premium | 5,750 | GBP49.99 | 174 | 127, zero mismatches | 47 |
| pluggd_credits_ultimate | 12,000 | GBP99.99 | 174 | 127, zero mismatches | 47 |

Each is standard/Buy/digital-content/Digital app sales/en-GB, default Backwards compatible, multi-quantity unchecked. Future New countries/regions are unavailable/unpriced. Root independently read all persisted Value/Premium/Ultimate price-grid rows, compared all127 exact prices/currencies against the frozen reference, checked every current availability and all47 converted prices, and reused its accepted Popular persisted readback. Zero missing/unexpected countries; Save disabled on the reviewed saved options. The 47 converted prices are approved Play customer prices, not exact Apple parity claims.

Canonical pages observed under `https://play.google.com/console/u/5/developers/5583821221716547447/app/4974825042849463763/one-time-products/sku/`: each exact SKU above has its detail page and `/purchase-options/po/standard#edit` saved option. Independent lane receipt: `/private/tmp/google-play-credit-draft-receipts-2026-10-03.md`.

## Corrected Draft metadata discrepancy

Root found actual Premium description incorrectly stated5,500 credits. The independent lane confirms this was its unsourced assumption, not from the canonical reference. Root edited only that Draft description to `5,750 PLUGGD Credits for eligible digital purchases, beat licences, tips and live gifts.`, normally saved it, observed Your changes have been saved/disabled Save changes, then reopened details and read the exact corrected description. Standard/Buy/Backwards compatible/Draft174 and every regional price remain unchanged. App/server/Apple quantities were never changed. Value description2,750 and Ultimate12,000 were confirmed in the lane's persisted evidence; root also read Ultimate12,000 directly.

Proof screenshot `/private/tmp/pluggd-premium-credit-description-corrected.png`, SHA256be65989e74054268020f1cec1022452d579f9597fae32862d589b8f8478cc9d7.

## Bound full root readback and remaining activation gate

`/private/tmp/google-play-credit-draft-root-review-2026-10-03.json`, SHA256b1ba8a5ad39b5948250910728c72d9450c30d7b1236d796722e952781167bc70, retains complete observed DOM rows and per-pack comparisons; stage SAVED_DRAFT_ONLY_NOT_ACTIVATED. The reference's PREPARED_NOT_APPLIED flag must not be changed to fully applied while provider/server products remain Draft.

All four existing larger `store_commerce_products` rows remain draft with canonical quantities and null price/currency/provider_state. Their existing catalog_seed metadata is preserved. No provider/server activation, schema mutation, ledger/entitlement write, Apple-price change or public submission occurred here. Genuine non-self creator membership/free Test-card proof still precedes coordinated activation. Future activation must verify exact product/default-option/price/quantity bindings, preserve seed metadata/transactions, and retain a scoped deactivate-without-ledger-deletion recovery path. No new key or wholesale Supabase deployment is needed.
