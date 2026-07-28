# iOS Apple Setup Lockfile

Last updated: 2026-07-28

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
- App Store Connect app name: `PLUGGD`.
- App Store Connect SKU: `com.pluggd.mobile`.
- Apple Team: ROWSON GROUP LTD (`37X2468U5U`).
- App Apple ID: `6765738727`.
- App Store subtitle: `Music beyond the algorithm`.
- Categories: Music (primary), Social Networking (secondary).
- Age rating: saved 16+ override (content questionnaire calculated 13+).
- Price: free.
- Availability: public on app release in all 175 App Store countries or
  regions.
- App Privacy: published on 28 July 2026 with the eight data types recorded in
  `pluggd-mobile/docs/app-store/PRIVACY_LABEL_INVENTORY.md`.
- Associated capabilities seen locally:
  - Push/APNs entitlement in `pluggd-mobile/ios/Pluggd/Pluggd.entitlements`.
  - StoreKit/IAP product usage: `react-native-iap` in `pluggd-mobile/package.json`.
- Capabilities confirmed in Apple:
  - In-App Purchase.
  - Apple Pay.
  - Associated Domains.
  - Push Notifications.
  - Sign in with Apple.
- Sign in with Apple:
  - Key ID: `YR9NGV4BVT`.
  - Services ID: `com.pluggd.mobile.web`.
  - Native client ID: `com.pluggd.mobile`.
  - Return URL:
    `https://qkwvqmubhyondemhasjp.supabase.co/auth/v1/callback`.
  - Web domain: `qkwvqmubhyondemhasjp.supabase.co`.
  - Supabase Apple provider enabled for both client IDs on 28 July 2026.
  - Rotate the provider client secret before 24 January 2027.
  - Only replacement key `YR9NGV4BVT` is present in Apple Developer; legacy key
    `35836M9T34` is absent.
  - The revoked legacy private-key block was removed from
    `/Users/apple/Documents/PLUGGD IOS.rtf` on 28 July 2026; its non-secret
    notes were preserved.
  - The in-app Terms and Privacy consent was accepted in the simulator. Native
    authorization must be re-tested in the signed TestFlight build because the
    simulator has no usable Apple account.

## Distribution signing

- Apple Distribution certificate ID: `59DCV9XJQ8`.
- Certificate subject: `Apple Distribution: ROWSON GROUP LTD (37X2468U5U)`.
- Certificate SHA-1: `C9694294F46F1BD335979F1734A8B6FB5EB3A857`.
- Certificate expiry: 28 July 2027.
- Apple WWDR intermediate: G3, valid through 20 February 2030.
- App Store profile name: `PLUGGD App Store 2026`.
- App Store profile ID: `QYFF5M7ZKB`.
- App Store profile UUID: `3b08cb87-302a-44e0-85fc-eac957e360e2`.
- Profile application identifier: `37X2468U5U.com.pluggd.mobile`.
- The `1.0.0 (1)` Release archive and IPA were produced on 28 July 2026.
- The signed IPA has production APNs, Sign in with Apple,
  `get-task-allow=false`, `beta-reports-active=true` and no native Stripe SDK.
- IPA SHA-256:
  `190ac7fdc322ec37e4f00e5f2e1d9425c4e8e113cc1041b8b372adc89053e752`.
- App Store Connect organization API access was approved on 28 July 2026.
- App Store Connect issuer ID: `518dca2d-5479-4d96-8d4e-7872c6455f4b`.
- Active Developer-role upload key: `PLUGGD TestFlight Upload`, key ID
  `4Z23TZVP84`. Its private key is stored outside the repository with
  owner-only permissions; never copy its contents into source or documentation.
- The unusable one-time-download key `47JF3XF5UB` was revoked on 28 July 2026.
- Apple accepted and processed the `1.0.0 (1)` IPA on 28 July 2026. Delivery
  UUID: `3a09f0ea-9a2f-47fb-8b93-973b7e48641e`; TestFlight status is
  `Ready to Submit`.

## IAP credit packs

Expected active Apple consumable product IDs and backend mapping:

- `pluggd_credits_starter` - Starter Credits - 500 credits - Apple ID
  `6765751701` - consumable draft in all storefronts.
- `pluggd_credits_popular` - Plus Credits - 1,050 credits - Apple ID
  `6765758284` - consumable draft in all storefronts.
- `pluggd_credits_value` - Value Credits - 2,750 credits - Apple ID
  `6765759369` - consumable draft in all storefronts.
- `pluggd_credits_premium` - Premium Credits - 5,750 credits - Apple ID
  `6765760475` - consumable draft in all storefronts.
- `pluggd_credits_ultimate` - Ultimate Credits - 12,000 credits - Apple ID
  `6765761038` - consumable draft in all storefronts.

The five products are configured, not approved. Submission and sandbox purchase
verification remain release gates.

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

Provisioned production catalogue as of 28 July 2026:

- subscription group `Kxngdom Memberships` (`22271259`);
- monthly product `com.pluggd.membership.kxngdom.vip.monthly` (Apple ID
  `6795673482`) for the `VIP supporters` tier at USD 2.99;
- English (U.K.) display metadata, worldwide availability and App Review notes
  are saved in App Store Connect;
- the server catalogue row is intentionally `provisioned`, not `active`, until
  an accurate review screenshot and signed StoreKit sandbox verification are
  complete. The app therefore keeps this tier browse-only.

## StoreKit / App Store Server API setup

- StoreKit config exists locally: no.
- StoreKit config file path: none found by local `*.storekit` search.
- StoreKit sandbox tester notes: no tester email or credentials found locally. Do not record sandbox passwords in this repo.
- App Store Server API key material is configured in Supabase. Confirm the key
  remains active in App Store Connect before TestFlight testing.
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
- Production and sandbox App Store Server Notification V2 URLs both point to
  the deployed production handler. The query credential is intentionally not
  recorded here.
- Apple’s test notification and the resulting single
  `apple_notification_log` row remain to be verified.

Supabase tables used for Apple transactions:

- `iap_transactions`
- `apple_notification_log`
- `wallet_ledger`
- `fan_subscriptions`

Hybrid-commerce foundation confirmed in production on 28 July 2026:

- server-owned commerce policy with independent rail kill switches;
- provider-neutral entitlement/source fields;
- idempotent hosted-checkout and Stripe event records;
- production Edge Functions for policy, checkout, reconciliation and webhooks.

Unique creator-tier Apple products still require provisioning and catalogue
import before membership purchase controls may be enabled.

App Store Connect business status verified on 28 July 2026:

- Free Apps Agreement active.
- Paid Apps Agreement active.
- GBP bank account active.
- Required United States tax forms active.
- Digital Services Act trader compliance active.

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
