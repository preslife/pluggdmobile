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

## Submission blockers still open

1. Complete and verify App Store public metadata, review contact, reviewer
   account, privacy answers, age rating, content-rights answers and export
   compliance.
2. Provision unique creator-tier auto-renewable subscription products and
   import the resulting product catalogue. Unprovisioned tiers must remain
   browse-only.
3. Configure and test App Store Server Notification V2 in sandbox and
   production, then exercise purchase, restore, renewal, expiry, refund and
   revoke paths.
4. Audit agreements, tax and banking and resolve the Apple membership renewal
   payment-method warning.
5. Produce a signed archive and TestFlight build, then complete device,
   accessibility, permission, offline and commerce-return testing.
6. Capture and upload rights-cleared final App Store screenshots and select the
   reviewed build.
7. Revoke the legacy Apple private key exposed in
   `/Users/apple/Documents/PLUGGD IOS.rtf`, replace any dependent secret, and
   remove the plaintext copy.
8. Finish the native Apple sign-in handoff after the account owner accepts the
   displayed PLUGGD Terms and Privacy Policy.

Do not submit or add the version for review until every unchecked item in
`RELEASE_CHECKLIST.md` is complete.
