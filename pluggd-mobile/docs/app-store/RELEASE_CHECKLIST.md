# iOS Release Checklist

## Automated gates

- [x] `npm run verify:mobile`
- [x] `npx tsc --noEmit`
- [x] `npx expo-doctor`
- [x] Root test suite (`50` files / `167` tests)
- [x] Root `npm run build`
- [x] Supabase edge-function unit tests
- [x] Production-configured iPhone simulator Release build
- [ ] Release configuration archive build
- [ ] Inspect archive for iPhone-only target, privacy manifest and no native Stripe SDK

## Production configuration

- [ ] EAS project linked to the correct Expo organisation.
- [ ] Apple team and bundle ID `com.pluggd.mobile` confirmed; distribution certificate and provisioning profile still require archive validation.
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
- [ ] Every sellable creator membership tier has a unique Apple product ID and the expected creator subscription group.
- [ ] Unprovisioned creator tiers remain browse-only and expose no fallback purchase CTA.
- [ ] Products are approved or submitted with the app version and available in required storefronts.
- [ ] App Store Server Notification V2 production and sandbox URLs point to `apple-server-notification`.
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
- [ ] Legal URLs resolve publicly and support@pluggd.fm is monitored.

## App Store Connect

- [ ] Metadata copied from `APP_STORE_METADATA.md` and proofread.
- [ ] App Review account added securely in App Store Connect.
- [ ] Review notes copied from `APP_REVIEW_NOTES.md` and updated with any special test state.
- [ ] Reviewer account has access to one StoreKit membership, one professional beat licence test item and one verified real-world ticket test item.
- [ ] App Privacy answers match `PRIVACY_LABEL_INVENTORY.md`.
- [ ] Age rating answers match a 16+ community/music service.
- [ ] Content rights register fully cleared.
- [ ] Export compliance answered using `ITSAppUsesNonExemptEncryption=false`.
- [ ] Screenshots captured from the final build and uploaded.
- [ ] Agreements, tax and banking are active.

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
