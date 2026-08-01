# App Store Submission Validation Report

Validated on 1 August 2026 from branch `codex/app-store-submission-final`.

## Release verdict

The current branch is visually and structurally ready for final TestFlight
device validation. The production beat agreements and their formation controls
are now implemented and deployed. It is not yet safe to submit for App Review
because the remaining blockers require product/legal approval, App Store Connect
metadata, StoreKit sandbox transactions, production notification delivery and
physical-device testing. Those blockers are listed below and remain unchecked
in the release checklist.

## Current verified gates

- `npm run verify:mobile` passes every mobile release contract, including
  reachability, Live, hybrid commerce, public copy, typography, player,
  navigation and the new app-wide Pressable accessibility-role scanner.
- Mobile TypeScript passes with no emit and Expo Doctor passes all 18 checks.
- The root suite passes all 51 files and 184 tests. Focused licensing and
  hybrid-commerce tests pass 5 files / 45 tests.
- The root Vite production build succeeds. Its existing dependency, browser
  data and large-chunk warnings remain non-blocking technical debt.
- A production-configured Release build installs and launches on the iPhone 17
  Pro Max simulator after the final accessibility and image-fallback changes.
- `git diff --check` passes.
- The processed signed build remains `1.0.0 (1)` with bundle ID
  `com.pluggd.mobile`; Apple previously accepted delivery
  `3a09f0ea-9a2f-47fb-8b93-973b7e48641e` without validation errors.

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
- UK counsel review is still required for the default 50/50 composition split
  and PLUGGD's marketplace/intermediary role before material transaction volume.

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
- App `6765738727`, version 1.0, is `PREPARE_FOR_SUBMISSION` with manual release.
  Build 1 is valid, minimum iOS is 15.1 and non-exempt encryption is false.
- Five credit consumables are `READY_TO_SUBMIT`; each has a complete review
  screenshot, one localisation and 200 price points.
- Kxngdom monthly membership `6795673482` remains `MISSING_METADATA` because
  its review screenshot is absent.
- App Review contact/demo-account configuration and the content-rights
  declaration remain incomplete. No App Store screenshot set is uploaded yet.
- Production and sandbox App Store Server Notification URLs reach the correct
  function but still contain an unnecessary query-string credential.

## Submission blockers still open

1. Record UK product/legal sign-off on the supplied agreements, especially the
   default composition split and PLUGGD marketplace/intermediary role.
2. Complete the content-rights register and approve an upload set containing
   only material with retrievable marketing rights.
3. Add App Review contact details and a dedicated reviewer account with the
   required membership, professional beat and real-world ticket fixtures.
4. Upload the Kxngdom membership review screenshot, add the five consumables
   and membership to the version submission, then complete StoreKit sandbox
   purchase, restore, renewal, refund, revoke and duplicate-delivery tests.
5. Remove the notification query credential and run App Store Server
   Notification V2 sandbox and production delivery tests.
6. Add the GitHub `SUPABASE_DB_URL` secret so migration validation runs in CI.
7. Complete concurrent ticket oversell, reservation-expiry, refund inventory,
   delayed-webhook and checkout-return reconciliation tests against production
   Stripe/Supabase fixtures.
8. Complete signed TestFlight device testing: Apple and Google sign-in,
   signup/email confirmation/sign-out, camera, microphone, photos,
   notifications, offline recovery, VoiceOver, Reduce Motion, player rotation
   and the storefront commerce matrix.
9. Resolve the Apple Developer membership renewal payment-method warning and
   confirm `support@pluggd.fm` monitoring.
10. Link the correct EAS project if EAS remains part of the release pipeline.

The 1 August Chrome audit could authenticate the ROWSON GROUP LTD account and
identify PLUGGD, but App Store Connect rendered only its navigation shell and no
record body in both the existing and a clean tab. No metadata was changed in
that state. Resume the remaining App Store Connect items only after its content
module renders normally.

Do not submit or add the version for review until these unchecked release gates
are complete. Do not upload the screenshot set until the rights register
identifies the approved subset.
