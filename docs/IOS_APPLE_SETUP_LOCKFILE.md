# iOS Apple Setup Lockfile

Last updated: 2026-05-28

This file records non-secret Apple/App Store/IAP setup facts that must survive the iOS UI reset. Do not paste private keys, sandbox tester passwords, App Store Connect API private key contents, Supabase service-role keys, or personal secrets into this file.

## Repository/workspace paths

- Web repo path: `/Users/apple/pluggd-mobile-workspace`
- Mobile app path: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`
- Existing local Apple log: `pluggd-mobile/docs/PLUGGD_IOS_APPLE_LOG_2026-05-28.md`
- Design handoff path: not found locally

## Apple app identity

- Bundle ID: `com.pluggd.mobile` - Verified from local app config (`pluggd-mobile/app.json`) and local Xcode project (`pluggd-mobile/ios/pluggdmobile.xcodeproj/project.pbxproj`).
- App Store Connect app name: not found locally; expected app name is `Pluggd`.
- App Store Connect SKU: not found locally; confirm in App Store Connect.
- Apple Team ID: not found locally; confirm in Apple Developer/App Store Connect.
- App Apple ID: not found locally; confirm in App Store Connect.
- Associated capabilities seen locally:
  - Push/APNs entitlement: `aps-environment = development` in `pluggd-mobile/ios/pluggdmobile/pluggdmobile.entitlements`.
  - Apple Pay merchant entitlement: `merchant.com.pluggd.mobile` in `pluggd-mobile/ios/pluggdmobile/pluggdmobile.entitlements`.
  - StoreKit/IAP product usage: `react-native-iap` in `pluggd-mobile/package.json`.
- Capabilities needing Apple portal confirmation:
  - In-App Purchase capability.
  - Push Notifications production capability/certificates/keys.
  - Sign in with Apple identifiers, Services ID, and return URLs if already configured.

## IAP credit packs

Expected active Apple consumable product IDs and backend mapping:

- `pluggd_credits_starter` - Starter Credits - GBP 5.00 expected - 500 credits - product type: consumable - App Store Connect status: confirm in Apple - backend mapping: present in `validate-iap-receipt`.
- `pluggd_credits_popular` - Plus Credits - GBP 9.99 expected - 1,050 credits - product type: consumable - App Store Connect status: confirm in Apple - backend mapping: present in mobile and `validate-iap-receipt`.
- `pluggd_credits_value` - Value Credits - GBP 24.99 expected - 2,750 credits - product type: consumable - App Store Connect status: confirm in Apple - backend mapping: present in mobile and `validate-iap-receipt`.
- `pluggd_credits_premium` - Premium Credits - GBP 49.99 expected - 5,750 credits - product type: consumable - App Store Connect status: confirm in Apple - backend mapping: present in mobile and `validate-iap-receipt`.
- `pluggd_credits_ultimate` - Ultimate Credits - GBP 99.99 expected - 12,000 credits - product type: consumable - App Store Connect status: confirm in Apple - backend mapping: present in mobile and `validate-iap-receipt`.

Note: prior local docs treated `pluggd_credits_starter` as hidden/pending. Current product decision is that it is an active expected credit product and must be preserved.

## Subscription products

Expected Apple auto-renewable subscription product IDs and backend mapping:

- `pluggd_tier_299` - Bronze - GBP 2.99/mo fallback - subscription group ID/name: confirm in App Store Connect - status: confirm in Apple - backend mapping: present.
- `pluggd_tier_499` - Silver - GBP 4.99/mo fallback - subscription group ID/name: confirm in App Store Connect - status: confirm in Apple - backend mapping: present.
- `pluggd_tier_999` - Gold - GBP 9.99/mo fallback - subscription group ID/name: confirm in App Store Connect - status: confirm in Apple - backend mapping: present.
- `pluggd_tier_1999` - Platinum - GBP 19.99/mo fallback - subscription group ID/name: confirm in App Store Connect - status: confirm in Apple - backend mapping: present.
- `pluggd_tier_4999` - Diamond - GBP 49.99/mo fallback - subscription group ID/name: confirm in App Store Connect - status: confirm in Apple - backend mapping: present.

## StoreKit / App Store Server API setup

- StoreKit config exists locally: no.
- StoreKit config file path: none found by local `*.storekit` search.
- StoreKit sandbox tester notes: no tester email or credentials found locally. Do not record sandbox passwords in this repo.
- App Store Server API key exists in Apple: unknown; confirm in App Store Connect.
- Expected Supabase secret names only:
  - `APPLE_IAP_ISSUER_ID`
  - `APPLE_IAP_KEY_ID`
  - `APPLE_IAP_PRIVATE_KEY`
  - `APPLE_BUNDLE_ID`
  - `APPLE_SERVER_NOTIFICATION_SECRET`
  - `APPLE_IAP_ENVIRONMENT`

## Backend alignment

Confirmed local backend files:

- `supabase/migrations/20260428170000_apple_iap_tables.sql`
- `supabase/functions/validate-iap-receipt/index.ts`
- `supabase/functions/apple-server-notification/index.ts`

Not found locally:

- `supabase/functions/_shared/appleAppStore.ts`

Backend function used for receipt validation:

- `validate-iap-receipt` with `verify_jwt = true` in `supabase/config.toml`.

App Store Server Notifications handler:

- `apple-server-notification` with `verify_jwt = false` in `supabase/config.toml`.

Supabase tables used for Apple transactions:

- `iap_transactions`
- `apple_notification_log`
- `wallet_ledger`
- `fan_subscriptions`

Related support:

- `auth.users` supplies user identity and the StoreKit `appAccountToken`.
- `broadcast-notification` is called by IAP subscription flows for membership notifications.

## Do-not-change warnings

- Do not recreate IAP credit packs.
- Do not rename StoreKit product IDs without updating backend mappings.
- Do not replace the Bundle ID.
- Do not delete Apple IAP tables/functions.
- Do not paste Apple private keys, Supabase service-role keys, or sandbox passwords into docs.
- Do not move away from the documented commerce plan:
  - credits = Apple consumable IAP
  - tips = credits in iOS
  - memberships = Apple subscriptions
  - releases = Apple-backed credit unlock plus optional external web checkout
  - beats = external licensing checkout first
  - event tickets = external checkout
  - creator payouts = Stripe Connect
