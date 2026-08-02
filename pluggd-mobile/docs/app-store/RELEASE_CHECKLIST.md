# iOS Release Checklist

## Automated gates

- [x] `npm run verify:mobile`
- [x] `npx tsc --noEmit`
- [x] `npx expo-doctor`
- [x] Root test suite (`52` files / `187` tests)
- [x] Root `npm run build`
- [x] Supabase edge-function unit tests
- [x] Production-configured iPhone simulator Release build
- [x] Production-configured signed Release build installed and launched on the
  registered iPhone 15 Pro Max using the `PLUGGD Ad Hoc Device QA 2026`
  profile; strict signature validation, production APNs and Sign in with Apple
  entitlements were confirmed before installation.
- [x] Release configuration archive build
- [x] Inspect archive for iPhone-only target, privacy manifest and no native Stripe SDK

## Production configuration

- [x] EAS is intentionally outside the v1 release path. The accepted App Store
  build and the signed physical-device QA build use the verified native Xcode
  archive/export pipeline, so no unused EAS project ID is being added for
  submission.
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
- [x] iOS hosted checkout success/cancel return URLs are restricted to
  `pluggd://commerce/success` for releases, beats, physical tickets and
  physical merchandise; hostile return URLs are rejected by contract tests.
- [x] Commerce policy defaults to restricted for an unknown storefront or failed policy request.
- [x] External release checkout is US-only until another storefront entitlement is explicitly approved.
- [x] Beat licensing, physical-ticket checkout and external release CTAs each have a tested remote kill switch.
- [x] Account/safety and hybrid-commerce migrations deployed to production.
- [x] Mobile ecosystem roles (`artist`, `producer`, `dj`, `promoter`, `venue`,
  `curator`, `service_provider`, `manager`, `fan`) are accepted by the live
  profile constraint; the legacy creator/label-only signup failure is fixed.
- [x] Public database views execute as the caller and retain underlying RLS;
  CRM, private-demographic, creator-pool and operational views are service-role
  only. Supabase security advisors report no remaining ERROR-level findings.
- [x] Account/safety, Apple verification, commerce policy, beat checkout, event checkout and Stripe webhook functions deployed and active.
- [x] Production beat agreements replaced with complete Basic, Premium,
  Unlimited and Exclusive wording; placeholder and beat-credit clauses are
  rejected by the migration guard.
- [x] Exclusive offers require fresh authenticated producer authorisation;
  every legacy Exclusive offer without it is disabled.
- [x] Licence acceptance and immediate digital-delivery consent are separate,
  versioned and immutable in the completed contract/PDF.
- [x] Internal commerce allocation, Exclusive-grant, catalogue-seeding and
  certificate functions are service-role only; anonymous/authenticated execute
  grants were removed and the targeted Supabase advisor findings cleared.
- [ ] Add the production `SUPABASE_DB_URL` repository secret so migration
  validation can run in GitHub instead of stopping before database checks.

## StoreKit and server notifications

- [x] Credit product IDs exactly match the five App Store Connect consumable drafts.
- [x] All five credit consumables resolve from StoreKit in the signed Release
  build on the registered iPhone, with Apple-supplied product names and prices;
  the physical-device Wallet capture is
  `/Users/apple/Desktop/Screenshot 2026-08-02 at 00.12.48.png`.
- [x] Wallet displays only StoreKit's storefront-localized prices, never a
  hard-coded GBP fallback or fixed currency-conversion claim. The final US
  sandbox capture is `/Users/apple/Desktop/Screenshot 2026-08-02 at 00.44.30.png`.
- [x] Every currently active sellable creator membership tier has a unique
  Apple product ID and the expected creator subscription group.
- [x] Unprovisioned or non-active creator products remain browse-only and expose
  no fallback purchase CTA.
- [x] Verified-creator membership catalogues are provisioned through a durable
  server queue: one Apple subscription group per creator and one unique product
  per tier/billing period. The production cron smoke returned HTTP 200, and a
  500-creator/1,000-product uniqueness simulation passed without collisions.
- [ ] Submit the completed App Review draft. Version 1.0, all five credit packs,
  the Kxngdom subscription and its subscription group are attached together;
  final submission has intentionally not been pressed.
- [x] Review screenshots are attached to all five credit consumables; the live
  App Store Connect audit reports `COMPLETE` for each consumable.
- [x] Accurate Kxngdom membership review screenshot uploaded; the subscription
  and subscription group report `Ready for Review` and are attached to the
  draft submission.
- [x] App Store Server Notification V2 production and sandbox URLs point to
  `apple-server-notification`.
- [x] Remove the unnecessary credential query parameter from both notification
  URLs, leaving authentication and verification to the notification handler.
- [x] Apple sandbox test notification succeeds and appears exactly once in
  `apple_notification_log` (`434e26a3-ca67-4faa-a84c-7c431ecb2387`).
- [x] Sandbox Plus Credits purchase grants exactly once. Apple transaction
  `…5801` produced one `iap_transactions` row and one `topup_iap` ledger row;
  the verified balance is 1,050 available credits with zero pending credits.
- [x] Interrupted consumable completes after server verification. The physical
  purchase exposed the StoreKit 2 legacy-receipt mismatch, was recovered from
  Apple's verified `ONE_TIME_CHARGE` notification without another purchase,
  and the deployed notification handler now provides idempotent crash-safe
  fulfilment for all five credit packs.
- [ ] Membership purchase maps to the intended creator and tier.
- [ ] Restore Purchases restores memberships and never duplicates consumable credits.
- [ ] Renewal, billing retry, expiry, refund and revoke notifications update entitlement status.
- [ ] Two creators with the same membership price can both be subscribed to and restored without identity collision.
- [x] Signed Release build containing the final visible membership CTA built,
  installed and launched on the registered iPhone 15 Pro Max on 2 August 2026;
  the installed `com.pluggd.mobile` process remained running after launch.

## Hybrid commerce

- [x] Credits can fund only releases, tips and live gifts; they cannot fund beats, memberships, tickets or merchandise.
- [x] Beat checkout accepts trusted beat/licence/agreement identifiers and rejects client price or creator tampering.
- [x] A beat licence agreement requiring signature cannot enter checkout until its required acceptance is valid.
- [x] Generic cart and credit services reject beat licences; web and iOS both
  route buyers through the trusted licence-selection/agreement flow.
- [ ] Beat webhook replay is idempotent; success, cancellation, delayed completion, refund and revocation reconcile correctly.
- [x] Real-world event checkout validates event classification, tier, quantity, price, sales window and inventory server-side.
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
- [x] `support@pluggd.fm` monitoring is confirmed: the public support route
  returns HTTP 200, the domain publishes active IONOS MX records, and a live
  release-test message delivered into the monitored IONOS inbox on 1 August
  2026.

## App Store Connect

- [x] Version 1.0 promotional text, description, keywords, support URL,
  marketing URL and copyright are saved in App Store Connect.
- [x] App Information subtitle and Music / Social Networking categories are
  saved and verified after a clean reload.
- [x] Apple Content Rights is declared as third-party content for which PLUGGD
  has the necessary rights, consistent with the uploader rights assertion and
  service licence in the production Terms.
- [x] Dedicated `appreview@pluggd.fm` account added securely in App Store
  Connect with saved private credentials and verified Account Holder contact
  details.
- [x] Review notes saved with the hybrid-commerce rails, account-deletion path,
  restore path and intentional browse-only behaviour.
- [x] Reviewer account has an active StoreKit membership catalogue entry and
  can reach published professional beat licence options. No verified physical
  paid-ticket tier exists in production, so ticket checkout remains honestly
  unavailable rather than using fabricated inventory.
- [x] App Privacy answers match `PRIVACY_LABEL_INVENTORY.md`. All eight data
  types and the privacy-policy URL were published after the account owner
  confirmed Apple’s accuracy and compliance attestation.
- [x] Age rating answers match a 16+ community/music service. Apple’s
  questionnaire calculates 13+ from the content answers and applies the saved
  16+ override required by PLUGGD’s Terms and signup gate.
- [x] The submitted public screenshot subset is cleared in the content-rights
  register. Catalogue artwork, avatars and event imagery remain excluded until
  their item-level evidence is recorded.
- [x] Export compliance is represented by
  `ITSAppUsesNonExemptEncryption=false`; Apple build metadata reports “App Uses
  Non-Exempt Encryption: No.”
- [x] Thirteen matched 1320×2868 screenshots captured from the final Release
  simulator build, including Live, Go Live and membership review surfaces.
- [x] Rights-safe PLUGGD Live Studio screenshot uploaded to the required
  6.5-inch iPhone slot at 1284×2778. It contains no creator artwork, avatars,
  event photography or user content.
- [x] Processed build `1.0.0 (1)` selected for App Store version 1.0.
- [x] Version release mode set to manual so approval cannot trigger an
  unintended public launch.
- [x] Free Apps and Paid Apps agreements, bank account, tax forms and Digital
  Services Act compliance are active.
- [x] The app is configured as free and publicly available on app release in
  all 175 App Store countries or regions.

Current catalogue state: five credit consumables, Kxngdom VIP Monthly and the
Kxngdom Memberships subscription group report `Ready for Review`. All seven
commerce items plus iOS version 1.0/build 1 are attached to the active draft as
eight items ready to submit. The rights-safe 6.5-inch screenshot is processed,
version 1.0 reports `Ready for Review`, and Apple has enabled the final
`Submit for Review` control. Their review copy preserves the approved hybrid
rails. Draft attachment is not approval; final submission and sandbox
verification remain required.

## Final human smoke test

- [ ] Signed out, signup, email confirmation, sign in and sign out.
- [x] Signed-out Home, Discover, Community and Events; mini-player persists without restart.
- [x] Release, mix, beat-marketplace, soundboard and event routes in the signed-out simulator.
- [x] Live is globally reachable from the public header, Home and Discover;
  lobby, replay, creator broadcast setup and authenticated server creation are
  present in the Release simulator build.
- [x] Signed-in creator profile, creator membership and role-specific Studio routes.
- [ ] Restricted, US and approved-entitlement storefront commerce matrix.
- [ ] Hosted beat and ticket checkout return, cancel, pending, refund and unavailable states.
- [ ] Offline images, unavailable audio, empty and loading states.
- [ ] VoiceOver order and labels, Dynamic Type, 44pt targets, contrast and Reduce Motion.
- [ ] Portrait flow and player rotation.
- [ ] Camera, microphone, photos and notifications each ask only at point of use.
- [ ] No placeholder copy, false claims, debug controls or nonfunctional buttons.
- [x] Product-owner sign-off recorded for the production beat agreements,
  default 50/50 producer-side/artist-side composition split and PLUGGD's
  marketplace/intermediary role. This is an owner-approved commercial baseline,
  not a representation that independent UK music counsel reviewed it.

## Account and signing observations

- [x] The replacement Sign in with Apple key is separate from the active App
  Store Connect In-App Purchase key `35836M9T34`. The IAP key remains active
  only for the final server-API and sandbox lifecycle checks; its local private
  key copy must be securely destroyed after those checks, then the key can be
  revoked if PLUGGD will not use authenticated App Store Server API requests.
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
- [x] Native Sign in with Apple completed successfully in the signed Release
  build on the registered iPhone 15 Pro Max on 2 August 2026. Apple returned to
  PLUGGD and the authenticated account reached the real three-step onboarding
  flow; the device capture is
  `/Users/apple/Desktop/Screenshot 2026-08-02 at 00.02.04.png`.
- [x] Fan onboarding no longer writes the nonexistent `profiles.genres` field;
  genre preferences remain versioned inside `onboarding_progress`, the mobile
  regression contract passes, and the corrected signed build was installed on
  2 August 2026.
- [x] Complete Fan onboarding in the corrected signed build. The final device
  run saved genre preferences without writing `profiles.genres`, returned to
  Home without an error, and retained the completed profile across the final
  signed-build installation on 2 August 2026.
