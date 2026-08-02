# App Store Submission Validation Report

Validated on 2 August 2026 from branch `codex/app-store-submission-final`.

## Release verdict

The current branch is visually and structurally ready for final TestFlight
device validation. The production beat agreements and their formation controls
are implemented and deployed, and the product owner approved the default
composition split and PLUGGD marketplace/intermediary role on 1 August 2026.
The App Store Connect metadata package is assembled in one draft. A signed
production-configured Release build now installs and launches on the registered
iPhone 15 Pro Max. Apple's sandbox server-notification test and the first
physical-device consumable purchase are verified end-to-end. It is not yet safe
to press final submission. A physical creator-membership purchase, its initial
creator/tier mapping, eleven accelerated sandbox renewals and normal expiry are
now verified end-to-end. Restore Purchases, billing retry, refund and revoke
remain deliberate Sandbox Apple Account gates, alongside the other unchecked
items in the release checklist.

## Current verified gates

- `npm run verify:mobile` passes every mobile release contract, including
  reachability, Live, hybrid commerce, public copy, typography, player,
  navigation and the new app-wide Pressable accessibility-role scanner.
- Mobile TypeScript passes with no emit and Expo Doctor passes all 18 checks.
- The root suite passes all 52 files and 187 tests. Focused licensing and
  hybrid-commerce tests pass 5 files / 45 tests.
- The root Vite production build succeeds. Its existing dependency, browser
  data and large-chunk warnings remain non-blocking technical debt.
- A production-configured Release build installs and launches on the iPhone 17
  Pro Max simulator after the final accessibility and image-fallback changes.
- `git diff --check` passes.
- Production's legacy creator/label-only profile constraint was found during
  reviewer provisioning, expanded to the mobile ecosystem-role set and guarded
  by `verify-mobile-role-schema-contract.mjs`.
- The processed signed build remains `1.0.0 (1)` with bundle ID
  `com.pluggd.mobile`; Apple previously accepted delivery
  `3a09f0ea-9a2f-47fb-8b93-973b7e48641e` without validation errors.
- A fresh production-configured Release build was signed with
  `Apple Distribution: ROWSON GROUP LTD (37X2468U5U)` and the Ad Hoc profile
  `PLUGGD Ad Hoc Device QA 2026`, passed Xcode's store validation and strict
  code-signature verification, installed on Ishola's registered iPhone 15 Pro
  Max (`00008130-000A1D3A046B8D3A`), launched successfully and remained running.
  Its embedded entitlements include production APNs, Sign in with Apple,
  `get-task-allow=false` and the expected application identifier.
- Native Sign in with Apple completed successfully in that signed device build
  on 2 August 2026. Apple returned to PLUGGD with an authenticated account and
  presented the production three-step onboarding flow. Evidence is retained at
  `/Users/apple/Desktop/Screenshot 2026-08-02 at 00.02.04.png`.
- The first physical onboarding attempt exposed an invalid duplicate write to
  the nonexistent `profiles.genres` field. The app now keeps those preferences
  in the existing versioned `onboarding_progress` payload only; a regression
  contract protects that schema boundary. The corrected flow completed on the
  physical device, returned to Home without an error and remained complete
  after the final signed-build installation.
- All five production credit consumables resolve from StoreKit in the corrected
  signed Release build on the registered iPhone, including Apple-supplied names
  and prices. The Wallet evidence is retained at
  `/Users/apple/Desktop/Screenshot 2026-08-02 at 00.12.48.png`.
- Wallet pricing now uses only StoreKit's storefront-localized price. The UI no
  longer mixes a US sandbox dollar price with a fixed GBP conversion claim and
  no longer substitutes a hard-coded GBP price while StoreKit is unavailable;
  purchase remains disabled until the localized product is loaded. The final
  signed-device evidence is
  `/Users/apple/Desktop/Screenshot 2026-08-02 at 00.44.30.png`.
- A physical sandbox purchase of Plus Credits completed in Apple's sheet. The
  run exposed that `react-native-iap` StoreKit 2 supplies the signed JWS in
  `verificationResultIOS` while intentionally leaving `transactionReceipt`
  empty. Credits and memberships now submit the signed JWS, and a regression
  contract forbids the legacy field.
- The interrupted purchase was reconciled from Apple's already verified
  `ONE_TIME_CHARGE` notification without charging again. Production contains
  exactly one transaction row and one `topup_iap` ledger row for transaction
  `…5801`; the resulting wallet balance is 1,050 available credits, zero
  pending credits and zero duplicate grants.
- `apple-server-notification` v18 and `validate-iap-receipt` v13 are active.
  The notification handler now fulfils all five server-owned credit SKUs as a
  crash-safe backup, using the same unique Apple transaction idempotency key as
  client validation. Apple IAP top-ups use `topup_iap`, so they are available
  immediately rather than entering the web top-up hold. Membership retries are
  skipped only when the exact notification is already reflected on the
  entitlement, so a callback logged before a failed mutation cannot strand a
  verified purchase.
- A physical sandbox purchase of Kxngdom VIP Monthly mapped to the intended
  Kxngdom creator and `VIP supporters` tier. Production then processed eleven
  verified `DID_RENEW` callbacks and `EXPIRED / VOLUNTARY`, advancing the same
  entitlement through Apple's accelerated sandbox lifecycle without an
  identity collision.

## Final product, visual and accessibility verification

- 110 simulator captures in `artifacts/qa/final-aaa-pass-2026-08-01/` cover
  public discovery, media detail, fan account, creator Studio, commerce,
  editorial, Community, Connect Card, Live, auth, safety and recovery states.
- Home, Discover, Community and Library retain uninterrupted playback through
  the persistent mini-player. A real tagged MP3 was started from Home, carried
  across all four surfaces and opened in the full player without restarting.
- The Release runtime exposes labelled first-viewport actions for Home music,
  Search, My PLUGGD, Live and every dock tab. The final pass added explicit
  roles, labels and selected/disabled state to auth, membership, stories,
  playlists, community rooms, event cards, creator onboarding, wallet purchase
  controls and Live stage moderation.
- Dynamic Type at the largest accessibility size and increased contrast were
  visually exercised on Home and Edit Profile, then restored to normal. Full
  spoken VoiceOver traversal and Reduce Motion still require a device pass.
- Xcode device captures from the signed iPhone build verified the final Home
  hierarchy, artwork sizing, playable first viewport, persistent dock spacing,
  and the production sign-in screen with native Apple, Google and email paths.
  Native Apple authorization and the corrected fan onboarding callback are now
  complete; Google authorization still requires its final device-owner consent
  pass.
- Remote-image failure now falls back through the original source and then a
  branded local asset rather than leaving a blank or distorted card.
- Ticket scanning now accepts only PLUGGD's rotating signed ticket payload and
  verifies entry through the authenticated server flow; it cannot directly
  mutate ticket orders.
- Live remains globally reachable from the header, Home, Discover and Create.
  Lobby, replay, broadcast setup, Agora session infrastructure, chat,
  reactions, stage requests, moderation, gifts and host controls remain wired.
- The product-reachability contract protects Releases, Mixes, Soundboards,
  Live, THE PLUG, Market, Community creation/boards, Library, Wallet,
  purchases, memberships, tickets, Studio, Connect Cards and split sheets from
  being silently hidden by future navigation changes.
- Account avatars now open the canonical account menu directly. Fan accounts
  are not offered Studio, creator routes fail closed behind role validation,
  and Studio provides both a working account menu and a deterministic
  `Back to PLUGGD` exit so no user can become trapped in the creator shell.
- Mobile room creation fails closed through authenticated
  `manage-live-sessions` server validation and no longer inserts directly into
  `session_rooms`.

## Hybrid-commerce verification

- The approved rails remain unchanged: Apple IAP credits for release unlocks,
  tips and live gifts; Apple subscriptions for creator memberships; hosted
  Stripe for professional beat licences, eligible physical tickets and
  physical merchandise; Stripe Connect for creator settlements.
- Credits cannot purchase beats, memberships, tickets or merchandise.
- Beat checkout rejects client pricing, ownership mismatches, incomplete legal
  text, unsigned agreements, unready Connect accounts, unknown storefronts,
  hostile return URLs and active kill switches.
- Event checkout rejects virtual events, mismatched tiers, invalid quantities,
  unavailable inventory, closed sale windows, malformed trusted pricing,
  hostile return URLs and active kill switches. A failed Stripe session
  releases its reservation.
- The production catalogue now contains complete `basic_lease`, `premium_lease`,
  `unlimited_lease` and `exclusive_rights` agreements. Production verification
  reports 10,964–11,860 characters per template, no placeholder fragments and
  no beat-credit language.
- Licence acceptance and the unticked immediate-delivery request are recorded
  independently. Exclusive options require versioned producer authorisation;
  all seven legacy Exclusive options were disabled because none had it.
- Generic web cart, mobile and backend routes now enforce Stripe-only beat
  licensing. Completed contracts receive an immutable, hash-addressed licence
  PDF; secure beat-file delivery is limited to verified completed purchases.
- The product owner approved the default 50/50 producer-side/artist-side
  composition split and PLUGGD's marketplace/intermediary role as the launch
  commercial baseline on 1 August 2026. Independent UK music/consumer counsel
  review remains recommended before material transaction volume; it is not
  represented here as having occurred.

## Live production and App Store Connect state

- Production Supabase project is PLUGGD (`qkwvqmubhyondemhasjp`). Apple,
  Google and email authentication are enabled.
- Current Supabase security and performance advisor snapshots report no
  ERROR-level findings, but substantial warning debt remains: mutable function
  search paths, permissive/always-true policies, public buckets, broad
  security-definer execution grants, unindexed foreign keys and a PostgreSQL
  version upgrade recommendation. These should be scheduled as a controlled
  database-hardening programme, not mass-edited immediately before submission.
- Four directly callable `SECURITY DEFINER` commerce functions identified in the
  final advisor pass were restricted to `service_role`; their targeted advisor
  findings are now zero.
- App `6765738727`, version 1.0, reports `Ready for Review` with manual release.
  Build 1 is valid, minimum iOS is 15.1 and non-exempt encryption is false.
- Safari live verification on 2 August attached validated build `1.0.0 (1)` to
  the internal `PLUGGD Submission QA` group and invited the Account Holder.
  App Store Connect now reports `1 Tester · 1 Build` with tester status
  `Invited`; accepting and installing that build on the iPhone remains open.
- Five credit consumables are `READY_TO_SUBMIT`; each has a complete review
  screenshot, one localisation and 200 price points.
- Kxngdom monthly membership `6795673482` has its private review screenshot,
  reports `Ready for Review`, and is attached with its subscription group.
- Production now has a durable membership-catalogue queue and one-minute
  provisioner schedule. It creates one group per approved creator and unique
  tier products using server-owned identifiers and prices, supplies Apple
  metadata and the review screenshot, and reconciles approval before exposing
  purchase controls. Its production invocation returned HTTP 200; a read-only
  500-creator/1,000-product scale simulation produced no collisions.
- The dedicated App Manager team key `PLUGGD IAP Worker` (`SVJYMDCFUC`) is
  installed in Supabase. The authenticated 2 August audit successfully returned
  Kxngdom's plan availability, 175 configured prices and territories,
  localisation and complete review screenshot, resolving the previous
  Developer-role HTTP 403.
- The final signed Release build with the rebuilt visible membership CTA was
  built, installed and launched on the registered iPhone 15 Pro Max on 2 August
  2026. Xcode confirmed the installed `com.pluggd.mobile` process remained
  active after launch.
- A dedicated `appreview@pluggd.fm` fan account is provisioned with completed
  onboarding, safe age defaults and an active Kxngdom StoreKit catalogue entry.
  Its credentials and verified Account Holder contact details are saved only
  in Apple's private review fields.
- The public support route returns HTTP 200 and `support@pluggd.fm` publishes
  active IONOS MX records. A live App Review support test sent on 1 August 2026
  arrived in the monitored IONOS inbox, closing the support-monitoring gate.
- Apple Content Rights is saved. The public 6.5-inch screenshot requirement is
  satisfied by a 1284×2778 PLUGGD Live Studio capture containing no third-party
  catalogue media; uncleared catalogue imagery remains excluded.
- Production and sandbox App Store Server Notification URLs now reach the
  correct function without the obsolete query-string credential.
- Apple's sandbox V2 test notification returned `SUCCESS` and the verified
  `TEST` payload for `com.pluggd.mobile` was recorded exactly once in
  `apple_notification_log`. Replaying Apple's same signed payload twice returned
  the explicit duplicate acknowledgement both times and the database count
  remained one. The deployed handler verifies ES256 JWS signatures,
  the complete Apple x5c chain, pinned G2/G3 roots, required Apple certificate
  OIDs, certificate validity, bundle ID, Apple app ID and environment before
  processing.
- iOS 1.0/build 1, all five credit consumables, Kxngdom VIP Monthly and the
  Kxngdom Memberships group are attached together as eight items ready to
  submit. Apple has enabled the final `Submit for Review` control. It has
  intentionally not been pressed.

## Submission blockers still open

1. Complete creator-membership Restore Purchases on the signed device without
   duplicating the existing entitlement. Initial purchase, creator/tier mapping,
   eleven renewals and expiry are green.
2. Exercise transaction-backed billing-retry, refund and revoke subscription
   notifications. The standalone Apple sandbox test, initial purchase,
   renewals and voluntary expiry are already green.
3. Add the GitHub `SUPABASE_DB_URL` secret so migration validation runs in CI.
4. Provision a real organiser-approved physical paid-ticket tier before testing
   ticket checkout; production currently contains none and the app correctly
   fails closed.
5. Complete concurrent ticket oversell, reservation-expiry, refund inventory,
   delayed-webhook and checkout-return reconciliation tests against production
   Stripe/Supabase fixtures.
6. Accept the internal TestFlight invitation, install build `1.0.0 (1)`, and
   complete the remaining signed TestFlight device interactions: Apple and Google sign-in,
   signup/email confirmation/sign-out, camera, microphone, photos,
   notifications, offline recovery, VoiceOver, Reduce Motion, player rotation
   and the storefront commerce matrix. Signed Release installation, launch,
   hardware Home rendering and native Apple authentication are already verified
   on the registered iPhone 15 Pro Max.
7. Resolve the Apple Developer membership renewal payment-method warning.

The 1 August Safari audit authenticated the ROWSON GROUP LTD account and
verified PLUGGD's live version, build and complete review draft. Apple pages
occasionally rendered only the navigation shell; two or three reloads and a
short wait restored the content without changing state.

Do not press final `Submit for Review` until the unchecked transaction,
notification and physical-device gates are complete.
