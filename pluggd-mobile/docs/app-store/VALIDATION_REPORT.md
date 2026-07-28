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
- Free Apps Agreement, Paid Apps Agreement, banking, tax forms and Digital
  Services Act compliance are active.
- The legacy Apple key `35836M9T34` is absent from the Developer key list, and
  obsolete Supabase CLI tokens used during this audit were removed.
- The revoked legacy private-key block was removed from
  `/Users/apple/Documents/PLUGGD IOS.rtf` without deleting its non-secret
  planning notes.

## Submission blockers still open

1. Finish the content-rights declaration only after the rights register has
   retrievable evidence for every submitted asset.
2. Complete the review contact, dedicated reviewer account, review notes and
   release mode.
3. Provision unique creator-tier auto-renewable subscription products and
   import the resulting product catalogue. Unprovisioned tiers must remain
   browse-only.
4. Test App Store Server Notification V2 in sandbox and production, then
   exercise purchase, restore, renewal, expiry, refund and revoke paths.
5. Resolve the Apple Developer membership renewal payment-method warning.
6. Sign in to or link the correct Expo account, or configure Xcode signing;
   this Mac currently has no valid signing identity. Produce a signed archive
   and TestFlight build, then complete device,
   accessibility, permission, offline and commerce-return testing.
7. Capture and upload rights-cleared final App Store screenshots and select the
   reviewed build.
8. Re-test native Apple sign-in in a signed development or TestFlight build.
   The account owner accepted the displayed PLUGGD Terms and Privacy Policy,
   but the unsigned simulator app failed with Apple authentication error
   `-7026`; the Mac has no valid signing identity and the simulator has no
   usable Apple account.

Do not submit or add the version for review until every unchecked item in
`RELEASE_CHECKLIST.md` is complete.
