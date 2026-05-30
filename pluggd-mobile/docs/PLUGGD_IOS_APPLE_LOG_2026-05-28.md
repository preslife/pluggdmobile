# Pluggd iOS Apple Log

Last updated: 2026-05-28

## Bundle ID

Confirmed mobile bundle ID: `com.pluggd.mobile`

Local sources:
- `pluggd-mobile/app.json`
- `pluggd-mobile/ios/pluggdmobile.xcodeproj/project.pbxproj`
- `pluggd-mobile/ios/pluggdmobile/Info.plist`

Do not use the root `app.json` / root `ios/vitereactshadcnts` project for the Pluggd mobile App Store record. Those still reference non-Pluggd placeholder identifiers.

## App Store Connect SKU

Not found locally.

No `eas.json`, App Store Connect metadata file, `ascAppId`, or app SKU value was found in the repo. Confirm this in App Store Connect.

## Apple Team ID

Not found locally.

No `DEVELOPMENT_TEAM`, provisioning profile, EAS credentials file, or Apple credentials file was found for the Pluggd mobile app. Confirm this in Apple Developer / App Store Connect.

## IAP Credit Product IDs

Current approved mobile credit catalog:

- `pluggd_credits_popular` - Plus Credits - GBP 9.99 - 1,050 credits including 50 bonus
- `pluggd_credits_value` - Value Credits - GBP 24.99 - 2,750 credits including 250 bonus
- `pluggd_credits_premium` - Premium Credits - GBP 49.99 - 5,750 credits including 750 bonus
- `pluggd_credits_ultimate` - Ultimate Credits - GBP 99.99 - 12,000 credits including 2,000 bonus

Local sources:
- `pluggd-mobile/src/hooks/useCredits.ts`
- `pluggd-mobile/scripts/verify-mobile-commerce-contract.mjs`
- `pluggd-mobile/docs/PLUGGD_IOS_REMAINING_MANUAL_TASKS_GUIDE_2026-05-15.md`

Backend note: `supabase/functions/validate-iap-receipt/index.ts` also recognizes `pluggd_credits_starter` for 500 credits, but mobile docs and contract checks say it is not in the current approved mobile catalog unless explicitly re-approved.

## Subscription Product IDs

Current mobile subscription product IDs:

- `pluggd_tier_299` - Bronze - fallback GBP 2.99/mo
- `pluggd_tier_499` - Silver - fallback GBP 4.99/mo
- `pluggd_tier_999` - Gold - fallback GBP 9.99/mo
- `pluggd_tier_1999` - Platinum - fallback GBP 19.99/mo
- `pluggd_tier_4999` - Diamond - fallback GBP 49.99/mo

Local sources:
- `pluggd-mobile/src/hooks/useSubscription.ts`
- `pluggd-mobile/app/membership/[creatorId].tsx`
- `supabase/functions/validate-iap-receipt/index.ts`
- `supabase/functions/apple-server-notification/index.ts`

Open decision: docs flag the shared price-point subscription SKU strategy as needing business/App Store Connect confirmation before broad public release.

## Subscription Group IDs

Not found locally.

No subscription group IDs or App Store Connect group metadata were found in the repo. Confirm group ID/name in App Store Connect. If the five membership products remain alternate tiers, they should be reviewed against the intended App Store Connect subscription group strategy.

## Sandbox Tester Notes

No sandbox tester email or credentials were found locally.

Manual QA requirements from existing docs:
- Create or confirm a Sandbox Tester account in App Store Connect.
- Sign into the simulator/device App Store sandbox account.
- Confirm all four current credit products load from StoreKit.
- Buy each credit pack in sandbox and confirm wallet/ledger state updates.
- Test restore, cancelled purchase handling, failed receipt validation, and duplicate/replayed transaction handling.
- Confirm subscription purchases and App Store Server Notifications in sandbox before production release.

Checkpoint note: `PLUGGD_MOBILE_RESTART_CHECKPOINT.md` says the wallet loaded Apple IAP packs in the simulator on 2026-05-01, but simulator StoreKit prices localized to dollars. Product IDs and pack values were correct. Full sandbox purchase QA still needs a real sandbox tester and App Store Connect product availability.

## StoreKit Config File Path If Any

None found.

`*.storekit` search returned no local StoreKit config file.

## Backend Function Used For Receipt Validation

Primary receipt validation function: `validate-iap-receipt`

Path: `supabase/functions/validate-iap-receipt/index.ts`

Client callers:
- `pluggd-mobile/src/hooks/useCredits.ts`
- `pluggd-mobile/src/hooks/useSubscription.ts`

Supabase config:
- `validate-iap-receipt`: `verify_jwt = true`
- `apple-server-notification`: `verify_jwt = false`

App Store Server Notifications V2 handler: `apple-server-notification`

Path: `supabase/functions/apple-server-notification/index.ts`

Use: renewal, billing retry, auto-renew changes, expiry, refund, subscribed, and revoke events for subscriptions.

Deployment note from checkpoint: `validate-iap-receipt` was deployed on 2026-05-01 to Supabase project `qkwvqmubhyondemhasjp` from `/Users/apple/PLUGGD_NEW`. The checkpoint says Apple App Store Server API secrets still needed to be set, then `apple-server-notification` should be deployed from `/Users/apple/PLUGGD_NEW` after reconciling sources.

## Supabase Tables Used For Apple Transactions

Direct Apple/IAP transaction tables:

- `iap_transactions` - validated IAP receipt transaction log; unique `transaction_id`; stores `original_transaction_id`, `product_id`, `type`, `environment`, purchase/expiry dates, status, and partial raw receipt.
- `apple_notification_log` - App Store Server Notifications V2 idempotency and payload log keyed by `notification_uuid`.
- `wallet_ledger` - credit top-up ledger rows for Apple IAP credit packs; uses `ref_type = 'apple_iap'` and metadata containing product/transaction details.
- `fan_subscriptions` - subscription state for Apple membership purchases; stores `apple_sku` and Apple transaction metadata, plus `current_period_end` and `last_payment_at`.

Related but not Apple transaction ledgers:
- `auth.users` - referenced by `iap_transactions.user_id` and used as the StoreKit `appAccountToken` source.
- `membership_tiers` and `profiles` - read by mobile subscription UI.
- `broadcast-notification` function - invoked after subscription validation/notifications.

Schema source:
- `supabase/migrations/20260428170000_apple_iap_tables.sql`

## Do-Not-Change Notes

- Keep the iOS bundle ID as `com.pluggd.mobile`.
- Keep the current approved mobile credit catalog to exactly: `pluggd_credits_popular`, `pluggd_credits_value`, `pluggd_credits_premium`, `pluggd_credits_ultimate`.
- Do not expose `pluggd_credits_starter` in the iOS purchase catalog unless it is explicitly re-approved and confirmed in App Store Connect.
- Preserve `100 credits = GBP 1`.
- iOS digital goods must use Apple IAP-backed PLUGGD credits; do not add Stripe, web checkout, or external checkout links for in-app digital goods.
- Keep StoreKit purchase calls using the signed-in Supabase user ID as Apple `appAccountToken`.
- Validate Apple receipts through `validate-iap-receipt` before finishing transactions.
- Preserve duplicate-grant protection through `iap_transactions` and `wallet_ledger` checks.
- Before deploying Apple IAP edge functions, reconcile this workspace with `/Users/apple/PLUGGD_NEW`; existing checkpoint notes identify `/Users/apple/PLUGGD_NEW` as the safe deploy source for prior IAP function deployment.
