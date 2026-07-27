# iOS Apple Setup Lockfile

Last updated: 2026-07-27

This file records non-secret Apple/App Store/IAP setup facts that must survive the iOS UI reset. Do not paste private keys, sandbox tester passwords, App Store Connect API private key contents, Supabase service-role keys, or personal secrets into this file.

## Repository/workspace paths

- Web repo path: `/Users/apple/pluggd-mobile-workspace`
- Mobile app path: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`
- Historical Apple log: `pluggd-mobile/docs/PLUGGD_IOS_APPLE_LOG_2026-05-28.md`
- Canonical commerce architecture: `pluggd-mobile/docs/PLUGGD_IOS_HYBRID_COMMERCE_ARCHITECTURE_2026-07-27.md`
- Design handoff path: not found locally

## Apple app identity

- Bundle ID: `com.pluggd.mobile` - Verified from local app config and
  `pluggd-mobile/ios/Pluggd.xcodeproj/project.pbxproj`.
- App Store Connect app name: not found locally; expected app name is `Pluggd`.
- App Store Connect SKU: not found locally; confirm in App Store Connect.
- Apple Team ID: not found locally; confirm in Apple Developer/App Store Connect.
- App Apple ID: not found locally; confirm in App Store Connect.
- Associated capabilities seen locally:
  - Push/APNs entitlement in `pluggd-mobile/ios/Pluggd/Pluggd.entitlements`.
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

The five historical shared price SKUs (`pluggd_tier_299`,
`pluggd_tier_499`, `pluggd_tier_999`, `pluggd_tier_1999` and
`pluggd_tier_4999`) are migration-only identifiers. They must not be provisioned
as the public multi-creator catalogue because one shared product cannot identify
two simultaneous memberships to different creators at the same price.

The production model is:

- one unique Apple auto-renewable subscription product per sellable creator tier;
- one Apple subscription group per creator membership programme;
- a fixed approved set of price points from which creators select;
- a server-side Apple product catalogue mapping product ID to creator, tier,
  group, price point, status and migration metadata;
- no purchase CTA for an unprovisioned or inactive catalogue row.

Product IDs and group IDs are generated/provisioned operational data and must be
exported from App Store Connect into the server catalogue. Do not maintain a
global source allowlist of creator membership product IDs in the mobile bundle.

## StoreKit / App Store Server API setup

- StoreKit config exists locally: no.
- StoreKit config file path: none found by local `*.storekit` search.
- StoreKit sandbox tester notes: no tester email or credentials found locally. Do not record sandbox passwords in this repo.
- App Store Server API key exists in Apple: unknown; confirm in App Store Connect.
- Expected Supabase secret names only:
  - `APPLE_BUNDLE_ID`
  - `APPLE_APP_ID`
  - `APPLE_IAP_ENVIRONMENT`
  - `APPLE_ROOT_CA_G2_BASE64`
  - `APPLE_ROOT_CA_G3_BASE64`
  - `ACCOUNT_DELETION_AUDIT_SALT`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

The native app intentionally has no Stripe secret and no native Stripe SDK.
Eligible professional licence, real-world ticket and physical merchandise flows
use server-created hosted Stripe Checkout.

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

Required hybrid-commerce additions before release:

- a server-owned commerce policy and independent rail kill switches;
- a unique creator-tier Apple product catalogue;
- provider-neutral entitlement/source fields;
- idempotent hosted-checkout order and Stripe event records.

Related support:

- `auth.users` supplies user identity and the StoreKit `appAccountToken`.
- `broadcast-notification` is called by IAP subscription flows for membership notifications.

## Do-not-change warnings

- Do not recreate IAP credit packs.
- Do not rename StoreKit product IDs without updating backend mappings.
- Do not reuse one Apple membership product across creators.
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
- Credits can fund releases, tips and live gifts only; they cannot fund beats,
  memberships, tickets or merchandise.
- External release checkout is US-first and enabled elsewhere only after the
  relevant entitlement/configuration is approved.
- Keep the native Stripe SDK out of the iOS app; hosted Stripe Checkout remains
  part of the approved hybrid model.
