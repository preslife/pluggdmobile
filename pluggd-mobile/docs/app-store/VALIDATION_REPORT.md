# App Store Submission Validation Report

Validated on 1 August 2026 from branch `codex/app-store-submission-final`.

## Current verified gates

- `npm run verify:mobile` passes all 39 iOS/mobile release checks, including
  the new product-reachability and Live contracts.
- Mobile TypeScript passes with no emit and Expo Doctor passes.
- The root suite passes all 50 files and 167 tests. The focused accessibility
  run passes 2 tests, the integration run passes 4 files / 8 tests, the Vite
  production build succeeds, and `npm ci --dry-run --ignore-scripts` succeeds.
- A production-configured Release build installs and launches on the iPhone 17
  Pro Max simulator. Thirteen matched screenshots were captured at 1320×2868.
- The processed signed build remains `1.0.0 (1)` with bundle ID
  `com.pluggd.mobile`; Apple previously accepted delivery
  `3a09f0ea-9a2f-47fb-8b93-973b7e48641e` without validation errors.

## Final product and visual verification

- Home, Discover, Community, Events, Mixes, Soundboards, Wallet, Studio,
  Connect Card, player, membership, Live and Go Live have current native
  evidence in `artifacts/app-store/submission-2026-07-30/`.
- Live is again a first-class public surface: a compact one-tap Live signal is
  present in both public header systems, Home retains a real room/event section,
  Discover includes a visual Live world, and the lobby has an explicit Go Live
  control.
- The broadcast setup was rebuilt in the selected editorial system with four
  room formats, scheduling, public/private access, stage requests, capacity,
  recording defaults and a persistent start action.
- Existing Agora token/session code, live chat, reactions, stage requests,
  moderation, replays, host controls and credit-funded gifts remain wired.
- The product-reachability contract protects Releases, Mixes, Soundboards,
  Live, THE PLUG, Market, Community creation/boards, Library, Wallet,
  purchases, memberships, tickets, Studio, Connect Cards and splits from being
  silently hidden by future navigation redesigns.
- Mobile room creation now fails closed through `manage-live-sessions`; it can
  no longer bypass server validation with a direct `session_rooms` insert.
- The legacy web Live manager now derives ownership from the authenticated
  bearer token in this branch, and the web client no longer submits a trusted
  `userId`. Coordinate deployment from the current web source-of-truth so its
  richer Live mode configuration is preserved.
- The creator membership screen formats database minor-unit prices correctly;
  the provisioned Kxngdom tier displays `$2.99`, not `$299.00`.

## Live App Store Connect state (read-only audit, 1 August 2026)

- App `6765738727`, version 1.0, is `PREPARE_FOR_SUBMISSION` with manual release.
- Build 1 is valid, minimum iOS is 15.1 and non-exempt encryption is false.
- No App Store screenshot set is uploaded yet.
- App Review contact is incomplete. A demo account is required but not configured.
- Five credit consumables are `READY_TO_SUBMIT`; each has a complete review
  screenshot, one localisation and 200 price points.
- Kxngdom monthly membership `6795673482` remains `MISSING_METADATA` because
  its review screenshot is absent. Its localisation, availability and 175
  storefront prices are present.
- Content-rights declaration is not set.
- Production and sandbox App Store Server Notification URLs target the correct
  function, but both still include an unnecessary query-string credential.

## Verified production services

- Production Supabase project is PLUGGD (`qkwvqmubhyondemhasjp`). Apple,
  Google and email authentication are enabled.
- The hybrid commerce policy remains: Apple IAP credits for releases/tips/live
  gifts, Apple subscriptions for memberships, hosted Stripe for professional
  beat licences, eligible physical tickets and physical merchandise, and
  Stripe Connect for creator payouts.
- All eight commerce policy rows are present and default to unavailable when
  storefront or policy resolution fails.
- The unauthenticated production Live manager probe returns HTTP 401 at the
  Supabase gateway. The authenticated identity-spoof hardening in this branch
  still requires a coordinated web-function deploy.

## Submission blockers still open

1. Complete the content-rights register and approve an upload set containing
   only material with retrievable marketing rights.
2. Add App Review contact details and a dedicated reviewer account with the
   required membership, professional beat and real-world ticket fixtures.
3. Upload the Kxngdom membership review screenshot, add the five consumables
   and membership to the version submission, then complete StoreKit sandbox
   purchase, restore, renewal, refund, revoke and duplicate-delivery tests.
4. Remove the notification query credential and run App Store Server
   Notification V2 sandbox/production delivery tests.
5. Add the GitHub `SUPABASE_DB_URL` secret so migration validation is active.
6. Coordinate deployment of the hardened legacy web Live manager from the
   current web source-of-truth, then exercise host creation/update/delete with
   ownership-spoof attempts.
7. Complete signed TestFlight device testing: Apple and Google sign-in,
   microphone/camera/photos/notifications, offline recovery, Dynamic Type,
   VoiceOver, Reduce Motion, player rotation and the full commerce-return matrix.
8. Resolve the Apple Developer membership renewal payment-method warning.

Do not submit or add the version for review until the unchecked release gates
are complete. Do not upload the captured screenshots until the rights register
identifies the approved subset.
