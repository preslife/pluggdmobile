# App Store Hardening Validation Report

Validated on 28 July 2026 from branch `codex/ios-hybrid-commerce`.

## Verified code and build gates

- `npm run verify:mobile` passes all 38 mobile release contracts.
- TypeScript passes with no emit.
- Expo Doctor passes all 18 checks.
- The root suite passes all 50 files and 167 tests.
- Eight relevant edge-function test files pass all 52 tests, including the
  legacy-schema migration contract.
- A production-configured iOS Release build succeeds on the iPhone 17 Pro Max
  simulator.
- A device Release archive succeeds with Apple Distribution signing. The
  exported `1.0.0 (1)` IPA passes strict signature verification and has
  `get-task-allow=false`.
- Native smoke tests confirm immediate playback, persistent mini-player
  navigation, signed-out discovery, the 16+ consent gate and a working native
  Sign in with Apple entry point.

## Verified production deployment

- Production project: PLUGGD (`qkwvqmubhyondemhasjp`), London region.
- The account-safety migration and hybrid-commerce foundation migration are
  deployed. The commerce migration safely upgrades the legacy ticket-order
  schema without deleting existing rows and adds the required release credit
  price field.
- All required account, moderation, Apple verification, commerce-policy,
  checkout, reconciliation, webhook, credit, payout and document-delivery Edge
  Functions are deployed and active.
- Production contains all eight expected commerce policy rows. Unknown
  storefronts fail closed; a complete US professional beat licence resolves to
  hosted Stripe Checkout; a GB release unlock resolves to credits.
- Public database views now use caller permissions so their underlying RLS
  policies remain authoritative. Anonymous discovery/community view queries
  continue to pass, while CRM contact and operational webhook views reject the
  anonymous role. Supabase's post-migration security scan has no ERROR-level
  findings.
- Apple identity, IAP environment, current Apple root certificates, deletion
  audit salt, Stripe signing and existing Supabase secrets are configured
  server-side.
- Five unreachable mix audio URLs were cleared conditionally so the production
  player does not repeatedly attempt known-broken media.

## Verified Apple configuration

- Apple team: ROWSON GROUP LTD (`37X2468U5U`).
- App Store Connect app: PLUGGD, Apple ID `6765738727`, bundle
  `com.pluggd.mobile`, version 1.0 in Prepare for Submission.
- In-App Purchase, Apple Pay, Associated Domains, Push Notifications and Sign
  in with Apple capabilities are enabled.
- Sign in with Apple uses key `YR9NGV4BVT`, Services ID
  `com.pluggd.mobile.web`, and the production Supabase callback. The Supabase
  Apple provider accepts both the Services ID and native bundle ID.
- Five consumable credit products exist as drafts with the expected IDs and
  credit values. Their review notes now restrict use to release unlocks, tips
  and live gifts. They are not yet submitted or sandbox-verified.
- App Store Server Notification V2 production and sandbox URLs are configured
  to the production `apple-server-notification` function. The notification
  delivery test and idempotency evidence are still pending.
- The version 1.0 promotional text, description, keywords, support URL,
  marketing URL and copyright are saved. The subtitle has been shortened to
  the valid 26-character `Music beyond the algorithm`; the Music / Social
  Networking categories are saved and verified after reload.
- App Privacy now contains the eight data types from the native manifest and
  the public privacy-policy URL. Each type is linked to the account and not
  used for tracking; Product Interaction is used for App Functionality and
  Analytics. The account owner confirmed Apple’s accuracy and compliance
  attestation and the answers are published.
- The age-rating content responses calculate 13+. The saved 16+ override
  matches PLUGGD’s Terms and signup gate.
- The app has a free price schedule and is publicly available on app release
  in all 175 App Store countries or regions.
- A clean production-configured Release build was rebuilt for the iPhone 17 Pro
  Max simulator and launched successfully. Home, Discover, Community and Events
  were captured at 1320×2868. A spotlight-action overflow found on Events was
  corrected and re-verified in the rebuilt app.
- A second submission-readiness run exercised Home, Discover, Community,
  Events, event detail, Soundboards, Mixes, Releases, Beat marketplace, Search,
  signed-out Library, account, Privacy & Safety, the persistent mini-player and
  full player. Playback started in one tap and persisted across the primary
  navigation. Production-mode authentication visibly exposes Sign in with
  Apple. The misleading unavailable-ticket copy and sparse signed-out account
  gateway found during this run were corrected and re-captured.
- Free Apps Agreement, Paid Apps Agreement, banking, tax forms and Digital
  Services Act compliance are active.
- Apple Distribution certificate `59DCV9XJQ8` is installed with the WWDR G3
  intermediate and is valid through 28 July 2027.
- App Store provisioning profile `PLUGGD App Store 2026`
  (`3b08cb87-302a-44e0-85fc-eac957e360e2`) is installed and valid through
  28 July 2027.
- The signed archive uses bundle ID `com.pluggd.mobile`, production APNs,
  Sign in with Apple, application identifier
  `37X2468U5U.com.pluggd.mobile`, the expected privacy manifest and
  `ITSAppUsesNonExemptEncryption=false`.
- The exported IPA SHA-256 is
  `190ac7fdc322ec37e4f00e5f2e1d9425c4e8e113cc1041b8b372adc89053e752`.
- The legacy Apple key `35836M9T34` is absent from the Developer key list, and
  obsolete Supabase CLI tokens used during this audit were removed.
- The revoked legacy private-key block was removed from
  `/Users/apple/Documents/PLUGGD IOS.rtf` without deleting its non-secret
  planning notes.

## Submission blockers still open

1. Finish the content-rights declaration only after the rights register has
   retrievable evidence for every submitted asset.
2. Complete the review contact and dedicated reviewer account. The reviewed
   build, hybrid-commerce notes and controlled manual-release mode are saved.
3. Complete signed StoreKit sandbox validation and upload an accurate review
   screenshot for the provisioned Kxngdom monthly membership and all five
   credit consumables, add those products to the first app review submission,
   then promote the membership's server catalogue status from `provisioned` to
   `active`. The unique product, creator subscription group, storefront
   metadata and fail-closed catalogue row are already in place.
4. Test App Store Server Notification V2 in sandbox and production, then
   exercise purchase, restore, renewal, expiry, refund and revoke paths.
5. Resolve the Apple Developer membership renewal payment-method warning.
6. Complete device, accessibility, permission, offline and commerce-return
   testing on the processed `1.0.0 (1)` build. Apple accepted delivery
   `3a09f0ea-9a2f-47fb-8b93-973b7e48641e` without validation or upload errors
   and App Store Connect reports `Ready to Submit`.
7. Capture and upload rights-cleared final App Store screenshots. Processed
   build `1.0.0 (1)` is already selected.
8. Re-test native Apple sign-in in the signed TestFlight build. The account
   owner accepted the displayed PLUGGD Terms and Privacy Policy, but the
   simulator has no usable Apple account and therefore cannot complete the
   production identity flow.

Do not submit or add the version for review until every unchecked item in
`RELEASE_CHECKLIST.md` is complete.
