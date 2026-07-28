# iOS Release Checklist

## Automated gates

- [x] `npm run verify:mobile`
- [x] `npx tsc --noEmit`
- [x] `npx expo-doctor`
- [x] Root test suite (`50` files / `167` tests)
- [x] Root `npm run build`
- [x] Supabase edge-function unit tests
- [x] Production-configured iPhone simulator Release build
- [x] Release configuration archive build
- [x] Inspect archive for iPhone-only target, privacy manifest and no native Stripe SDK

## Production configuration

- [ ] EAS project linked to the correct Expo organisation. The local CLI is not
  signed in and `app.config.ts` has no EAS project ID.
- [x] Apple team and bundle ID `com.pluggd.mobile` confirmed in the signed
  archive. Apple Distribution certificate `59DCV9XJQ8` and App Store profile
  `PLUGGD App Store 2026` are installed and valid through 28 July 2027.
- [x] App Store Connect app record and numeric Apple App ID `6765738727` confirmed.
- [x] Production Supabase URL and anon key are used by the production build; no service key is bundled in the app.
- [x] `APPLE_BUNDLE_ID=com.pluggd.mobile`
- [x] `APPLE_APP_ID=6765738727`
- [x] `APPLE_IAP_ENVIRONMENT=Both` for production + TestFlight verification
- [x] `APPLE_ROOT_CA_G2_BASE64` and `APPLE_ROOT_CA_G3_BASE64` use current certificates from Apple PKI.
- [x] `ACCOUNT_DELETION_AUDIT_SALT` is a strong production secret.
- [x] Stripe production key and signed webhook secret are configured only in Supabase.
- [ ] Hosted checkout success/cancel return URLs use the approved PLUGGD app/web allowlist.
- [x] Commerce policy defaults to restricted for an unknown storefront or failed policy request.
- [x] External release checkout is US-only until another storefront entitlement is explicitly approved.
- [ ] Beat licensing, physical-ticket checkout and external release CTAs each have a tested remote kill switch.
- [x] Account/safety and hybrid-commerce migrations deployed to production.
- [x] Account/safety, Apple verification, commerce policy, beat checkout, event checkout and Stripe webhook functions deployed and active.

## StoreKit and server notifications

- [x] Credit product IDs exactly match the five App Store Connect consumable drafts.
- [x] Every currently active sellable creator membership tier has a unique
  Apple product ID and the expected creator subscription group.
- [x] Unprovisioned or non-active creator products remain browse-only and expose
  no fallback purchase CTA.
- [ ] Products are approved or submitted with the app version and available in required storefronts.
- [x] App Store Server Notification V2 production and sandbox URLs point to
  `apple-server-notification`.
- [ ] Test notification succeeds and appears once in `apple_notification_log`.
- [ ] Sandbox credit purchase grants exactly once.
- [ ] Interrupted consumable completes after server verification.
- [ ] Membership purchase maps to the intended creator and tier.
- [ ] Restore Purchases restores memberships and never duplicates consumable credits.
- [ ] Renewal, billing retry, expiry, refund and revoke notifications update entitlement status.
- [ ] Two creators with the same membership price can both be subscribed to and restored without identity collision.

## Hybrid commerce

- [x] Credits can fund only releases, tips and live gifts; they cannot fund beats, memberships, tickets or merchandise.
- [x] Beat checkout accepts trusted beat/licence/agreement identifiers and rejects client price or creator tampering.
- [ ] A beat contract requiring signature cannot enter checkout until its required acceptance is valid.
- [ ] Beat webhook replay is idempotent; success, cancellation, delayed completion, refund and revocation reconcile correctly.
- [ ] Real-world event checkout validates event classification, tier, quantity, price, sales window and inventory server-side.
- [x] Paid virtual events are rejected by external checkout.
- [ ] Concurrent ticket purchases cannot oversell; abandoned reservations expire and refunds return inventory correctly.
- [ ] Hosted Stripe Checkout offers Apple Pay/card only where the Stripe account and customer device support them.
- [ ] Checkout cancellation and app termination do not grant access; foreground/return reconciliation waits for provider confirmation.
- [ ] Cross-platform entitlements restore access without exposing an ineligible purchase CTA.

## Safety and accounts

- [x] Production signup is open; preview/development still enforce launch access.
- [x] 16+ declaration is required during signup.
- [x] Report and block actions are implemented for posts and profiles.
- [x] Blocked authors are filtered from feed, thread and comments.
- [x] Media and risk-signalled UGC is quarantined before publication.
- [x] Sensitive-content defaults are safe for accounts without an age band.
- [x] Data archive downloads through a private 24-hour signed URL.
- [x] Account deletion requires recent authentication and removes the auth account.
- [x] Support, privacy, terms and community-guidelines URLs resolve publicly.
- [ ] `support@pluggd.fm` monitoring is confirmed.

## App Store Connect

- [x] Version 1.0 promotional text, description, keywords, support URL,
  marketing URL and copyright are saved in App Store Connect.
- [x] App Information subtitle and Music / Social Networking categories are
  saved and verified after a clean reload.
- [ ] App Review account added securely in App Store Connect.
- [x] Review notes saved with the hybrid-commerce rails, account-deletion path,
  restore path and intentional browse-only behaviour.
- [ ] Reviewer account has access to one StoreKit membership, one professional beat licence test item and one verified real-world ticket test item.
- [x] App Privacy answers match `PRIVACY_LABEL_INVENTORY.md`. All eight data
  types and the privacy-policy URL were published after the account owner
  confirmed Apple’s accuracy and compliance attestation.
- [x] Age rating answers match a 16+ community/music service. Apple’s
  questionnaire calculates 13+ from the content answers and applies the saved
  16+ override required by PLUGGD’s Terms and signup gate.
- [ ] Content rights register fully cleared.
- [x] Export compliance is represented by
  `ITSAppUsesNonExemptEncryption=false`; Apple build metadata reports “App Uses
  Non-Exempt Encryption: No.”
- [ ] Screenshots captured from the final build and uploaded.
- [x] Processed build `1.0.0 (1)` selected for App Store version 1.0.
- [x] Version release mode set to manual so approval cannot trigger an
  unintended public launch.
- [x] Free Apps and Paid Apps agreements, bank account, tax forms and Digital
  Services Act compliance are active.
- [x] The app is configured as free and publicly available on app release in
  all 175 App Store countries or regions.

Current catalogue state: five credit consumables exist as App Store Connect
drafts in every storefront. Their review copy now describes only release
unlocks, tips and live gifts. Draft existence is not approval; submission and
sandbox verification remain required.

## Final human smoke test

- [ ] Signed out, signup, email confirmation, sign in and sign out.
- [x] Signed-out Home, Discover, Community and Events; mini-player persists without restart.
- [ ] Release, mix, beat, soundboard, event and creator routes.
- [ ] Restricted, US and approved-entitlement storefront commerce matrix.
- [ ] Hosted beat and ticket checkout return, cancel, pending, refund and unavailable states.
- [ ] Offline images, unavailable audio, empty and loading states.
- [ ] VoiceOver order and labels, Dynamic Type, 44pt targets, contrast and Reduce Motion.
- [ ] Portrait flow and player rotation.
- [ ] Camera, microphone, photos and notifications each ask only at point of use.
- [ ] No placeholder copy, false claims, debug controls or nonfunctional buttons.
- [ ] Product/legal sign-off recorded for professional beat licensing and real-world event classification.

## Account and signing observations

- [x] Legacy Apple key `35836M9T34` is absent from the Apple Developer key
  list; only the replacement Sign in with Apple key remains.
- [x] Temporary and obsolete Supabase CLI access tokens created during this
  release session were deleted and verified absent.
- [x] Revoked legacy private-key material was removed from
  `/Users/apple/Documents/PLUGGD IOS.rtf`; the non-secret notes were preserved.
- [x] Apple Distribution identity
  `Apple Distribution: ROWSON GROUP LTD (37X2468U5U)` and App Store profile
  `PLUGGD App Store 2026` are installed. The Release archive and exported IPA
  pass strict signature verification with production APNs, Sign in with Apple,
  `get-task-allow=false` and the expected application identifier.
- [x] Upload the signed `1.0.0 (1)` IPA to App Store Connect. Apple accepted
  delivery `3a09f0ea-9a2f-47fb-8b93-973b7e48641e` without validation or upload
  errors on 28 July 2026.
- [x] Confirm that `1.0.0 (1)` completes Apple processing and becomes available
  as a TestFlight build. App Store Connect reports `Ready to Submit`.
- [ ] Re-test native Sign in with Apple in a signed development or TestFlight
  build on a device with an Apple account. The unsigned simulator build reaches
  Apple’s consent flow but fails at the native authorization layer.
