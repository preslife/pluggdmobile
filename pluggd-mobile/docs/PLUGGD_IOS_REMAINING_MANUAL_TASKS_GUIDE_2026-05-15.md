# PLUGGD iOS Remaining Manual Tasks Guide

Status: 2026-05-15  
Scope: tasks that require Apple, Supabase project access, payment/compliance decisions, licensed assets, or real role-bearing accounts.

The local mobile app work is wired for these flows, but the items below must be completed manually before PLUGGD can be treated as launch-ready.

## 0. Ground Rules

1. Do not edit `/Users/apple/PLUGGD_NEW` while completing these tasks. It is reference-only for the mobile project.
2. Keep iOS digital goods on Apple IAP credits. Do not add Stripe/web checkout links for unlocks, beats, packs, digital memberships, gifts, or tips inside iOS.
3. Do not enable Apple Wallet, native ticket purchase, or advanced live moderation until the backend/payment/pass contracts below are done.
4. After every manual setup change, rerun:

```bash
cd /Users/apple/pluggd-mobile-workspace/pluggd-mobile
npx tsc --noEmit
for f in scripts/verify-mobile-*.mjs; do node "$f"; done
npx expo-doctor
npx expo run:ios --device "iPhone 17"
```

## 1. Add Licensed Production Fonts

Current app code targets:
- Headings: Neue Montreal
- Body/UI: Neue Haas Grotesk
- Campaign/poster/limited surfaces: ABC Diatype Monument

Manual steps:

1. Obtain properly licensed font files for app embedding.
2. Create this folder if it does not exist:

```bash
mkdir -p /Users/apple/pluggd-mobile-workspace/pluggd-mobile/assets/fonts
```

3. Add the font files using these filenames:

```text
assets/fonts/NeueMontreal-Regular.otf
assets/fonts/NeueMontreal-Medium.otf
assets/fonts/NeueMontreal-Bold.otf
assets/fonts/NeueHaasGroteskText-Regular.otf
assets/fonts/NeueHaasGroteskText-Medium.otf
assets/fonts/NeueHaasGroteskText-Bold.otf
assets/fonts/ABCDiatypeMonument-Regular.otf
assets/fonts/ABCDiatypeMonument-Bold.otf
```

4. Install/load `expo-font` as a direct dependency if it is not already present in `package.json`:

```bash
npx expo install expo-font
```

5. Update the root layout to load these fonts before rendering the app. The existing typography tokens are already prepared in `src/design/typography.ts`; the missing piece is the licensed binary files.
6. Run the simulator and visually inspect Home, Stage, Live, Backstage, Search, Wallet, and Creator Mode.

Acceptance criteria:
- No “unrecognized font family” warnings in Metro/Xcode logs.
- Headings visibly use Neue Montreal.
- Body text visibly uses Neue Haas Grotesk.
- Poster/campaign labels use ABC Diatype Monument where applied.

## 2. Confirm Apple Developer And App Store Connect Setup

Required Apple items:
- Bundle ID: `com.pluggd.mobile`
- Apple Developer team access
- App Store Connect app record
- IAP capability enabled
- Push Notifications capability enabled
- Associated Domains only if later needed for universal links

Manual steps:

1. In Apple Developer, confirm `com.pluggd.mobile` exists.
2. Enable In-App Purchase for the bundle ID.
3. Enable Push Notifications for the bundle ID.
4. In App Store Connect, confirm the PLUGGD app exists and is linked to that bundle ID.
5. Confirm bank/tax/agreements are active. StoreKit products can fail silently if agreements are incomplete.
6. Create or confirm a Sandbox Tester account.

Acceptance criteria:
- App Store Connect shows the app record as active/editable.
- In-app products are in “Ready to Submit” or otherwise testable state.
- Sandbox tester can sign into the simulator/device App Store sandbox.

## 3. Verify StoreKit Credit Packs

The app expects exactly these product IDs:

```text
pluggd_credits_popular
pluggd_credits_value
pluggd_credits_premium
pluggd_credits_ultimate
```

Expected packs:
- `pluggd_credits_popular`: Plus Credits, £9.99, 1,050 credits including 50 bonus
- `pluggd_credits_value`: Value Credits, £24.99, 2,750 credits including 250 bonus
- `pluggd_credits_premium`: Premium Credits, £49.99, 5,750 credits including 750 bonus
- `pluggd_credits_ultimate`: Ultimate Credits, £99.99, 12,000 credits including 2,000 bonus

Manual steps:

1. Open App Store Connect.
2. Go to the PLUGGD app, then Features / In-App Purchases.
3. Confirm all four product IDs match exactly, including underscores.
4. Confirm product type is consumable.
5. Confirm price tiers match the expected GBP pricing.
6. Confirm display names and descriptions are App Review-safe.
7. In the iOS simulator or a real device, sign into the sandbox account.
8. Open the app Wallet.
9. Confirm all four packs load.
10. Buy each pack in sandbox.
11. Confirm the app records the purchase and wallet/ledger state updates.
12. Test restore purchases.
13. Test failed/cancelled purchase handling.

Acceptance criteria:
- All four products load from StoreKit.
- No non-GBP sandbox price is shown to UK users unless StoreKit returns a valid GBP localized price.
- Purchase success creates the correct credits.
- Cancelled purchase does not grant credits.
- Restore path does not duplicate consumable credits incorrectly.

## 4. Receipt Validation And Credit Ledger QA

The app preserves Apple IAP and wallet/credit logic, but production readiness requires server-side receipt validation confirmation.

Manual steps:

1. Identify the backend function/table that validates StoreKit receipts.
2. Confirm receipt validation uses Apple production/sandbox endpoints correctly.
3. Confirm each successful transaction writes an immutable ledger row.
4. Confirm duplicate transaction IDs are rejected/idempotent.
5. Confirm refund/revocation handling is defined.
6. Confirm `100 credits = £1` is enforced in code and backend.
7. Confirm credit spend uses `spend-credits` or the confirmed entitlement path.

Acceptance criteria:
- A replayed StoreKit transaction cannot grant credits twice.
- Ledger rows reconcile with the StoreKit transaction ID.
- Failed receipt validation never grants credits.
- Credit spend creates a durable entitlement/unlock where applicable.

## 5. Native Physical Ticket Purchase Decision

Current state:
- Event discovery, RSVP, ticket status, tickets wallet, QR display, dynamic ticket tokens, and ticket scanning are wired.
- Native physical ticket purchase is intentionally not enabled until a compliant payment contract exists.

Manual product/legal decision:

1. Decide whether event tickets are treated as real-world goods/services outside Apple IAP.
2. Confirm the payment provider to use for physical event tickets, likely Stripe/Apple Pay or another native payment flow.
3. Confirm App Store compliance with legal/payment advisor before enabling purchase CTAs.

Backend contract needed:

1. Server-created payment intent/session for event tickets.
2. Server-side ticket order creation only after payment confirmation.
3. Webhook handling for payment success, failure, refund, chargeback.
4. `ticket_orders` row creation with:
   - `event_id`
   - `user_id`
   - `status`
   - `ticket_type`
   - `qr_code_data` or dynamic-token eligibility
   - payment reference
5. Capacity/stock locking to prevent oversell.
6. Refund and transfer rules.
7. RLS policies for buyer read access and promoter/venue scan access.

Acceptance criteria:
- The iOS app never opens external checkout for digital goods.
- Physical event ticket payment is native and App Store-compliant.
- Ticket order appears in Wallet after payment.
- Ticket QR is not shown until the backend creates a real order.
- Scanner can validate and check in the ticket with promoter/venue permissions.

## 6. Apple Wallet Passes

Current state:
- PLUGGD app displays real QR payloads from the backend.
- Apple Wallet is not enabled yet.

Manual Apple setup:

1. Create a Pass Type ID in Apple Developer.
2. Generate PassKit certificate.
3. Store certificates securely in backend secret storage.
4. Define pass branding:
   - logo
   - icon
   - strip image/event image
   - foreground/background colors
   - pass fields
5. Build a backend pass signing service.
6. Add pass update/revocation behavior for cancelled/refunded tickets.

Backend payload should include:
- event title
- venue/city
- date/time
- ticket type
- order ID
- dynamic or static entry payload
- attendee display name if allowed
- support/contact text

App work after backend is ready:

1. Add an “Add to Apple Wallet” CTA only when the backend returns a signed `.pkpass`.
2. Hide the CTA when no pass is available.
3. Test adding, updating, and removing passes on a real iPhone.

Acceptance criteria:
- Passes add to Apple Wallet on a real device.
- Cancelled/refunded tickets cannot remain valid.
- Scanner accepts the same backend-valid payload used by Wallet.

## 7. Push Notifications Production Setup

Current state:
- Mobile push tokens are stored in `mobile_push_tokens`.
- `send-push-notification` sends Expo push messages and preserves web push.
- Local reminders are wired for events/live.

Manual steps:

1. Confirm `send-push-notification` has these Supabase secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

2. Confirm the Expo project ID is available to the app configuration.
3. Configure iOS push credentials for EAS/Expo.
4. Build and install on a real iPhone.
5. Sign in.
6. Allow notifications.
7. Confirm a row is created in `mobile_push_tokens`.
8. Trigger `send-push-notification` with a test payload for that user.
9. Confirm the device receives the push.
10. Tap the push and verify deep linking opens the correct route.
11. Test opt-out preferences.
12. Test stale device token behavior.

Acceptance criteria:
- Real device token is stored.
- Push arrives on device.
- Notification tap routes into the app.
- Opted-out users do not receive push.
- Invalid Expo tokens are marked inactive.

## 8. Real Role-Bearing QA Accounts

Create or identify test accounts:

```text
Fan account
Creator account
Promoter/venue account
```

Required backend setup:

1. Each account must have a valid `profiles` row.
2. Creator account must have creator/promoter role fields or role rows matching the app’s role logic.
3. Promoter/venue account must have permission to scan/check in tickets for at least one event.
4. Fan account must have:
   - saved content
   - event RSVP
   - optional purchased ticket
   - optional credit balance
5. Creator account must have:
   - releases
   - posts
   - Backstage/community membership
   - optional live room
6. Promoter/venue account must have:
   - event ownership or scan permissions
   - at least one test ticket order

Manual QA paths:

1. Logged out launch and access-code flow.
2. Fan login.
3. Fan Home, Stage, Live, Backstage, Search.
4. Fan play track, switch tabs, confirm playback persists.
5. Fan save release/event/community/creator.
6. Fan RSVP to event and schedule reminder.
7. Fan open Wallet and Tickets.
8. Creator login.
9. Creator opens Creator Mode from avatar menu.
10. Creator creates post.
11. Creator uploads clip.
12. Creator starts/schedules live if permitted.
13. Creator opens community/backstage controls where supported.
14. Promoter login.
15. Promoter opens Ticket Scan.
16. Promoter scans static and dynamic ticket QR payloads.
17. Confirm checked-in state updates.

Acceptance criteria:
- Fan UI is not polluted by creator admin tools.
- Creator Mode is only visible for eligible roles.
- Promoter scan route is role-appropriate.
- Every button either persists, routes, plays media, opens a sheet, or shows a clear unsupported state.

## 9. Content And Data Seeding For Launch

For the app to feel world-class at first open, seed real launch content:

Home:
- 3-5 live/event-led hero candidates
- 8-12 upcoming events
- 10+ creator posts
- 10+ trending releases/mixes
- 6+ active Backstage threads

Stage:
- 20+ playable releases/tracks
- 10+ mixes
- 6+ videos if video table is ready
- 6+ producer drops
- 3+ open verse/challenge items

Live:
- 2+ active or scheduled live rooms
- 5+ upcoming lives/events
- 5+ replay/clip records if backend supports them

Backstage:
- 5+ communities/hubs
- 10+ threads
- 3+ event hubs with ticket discussion
- 3+ active rooms or scheduled room records

Search:
- creators, tracks, events, communities and users should all produce real results.

Acceptance criteria:
- No primary tab opens to a blank app unless the signed-in account genuinely has no data.
- Empty states are useful and premium.
- No fake real-world artist/venue/brand names.

## 10. Real Device QA

Do not rely only on simulator for final weekend readiness.

Manual steps:

1. Install a development build or TestFlight build on a real iPhone.
2. Test camera permission for Ticket Scan.
3. Test microphone/camera permission for live creation.
4. Test photo library permission for Upload Clip.
5. Test background/lock-screen audio behavior.
6. Test notification permission and push receipt.
7. Test poor network and offline states.
8. Test iPhone SE/small viewport if available.
9. Test recent large iPhone viewport.
10. Test dark mode only; confirm no light-mode bleed.

Acceptance criteria:
- No clipped text in the five main tabs.
- No giant cards overflowing the viewport.
- Player survives tab switches.
- QR scanner opens and scans.
- Upload Clip handles permission denial and cancellation.
- Wallet/IAP does not crash when StoreKit is unavailable.

## 11. Screenshot And App Review Assets

Manual steps:

1. Capture final screenshots for:
   - Home
   - Stage
   - Live
   - Backstage
   - Search
   - Player
   - Wallet
   - Tickets
   - Creator Mode
2. Prepare App Store screenshots in required device sizes.
3. Avoid showing fake personal data, unreleased real artists without permission, or test transaction details.
4. Prepare review notes explaining:
   - IAP credits are used for digital goods.
   - Physical ticket purchase is disabled or App-Store-compliant.
   - Creator tools are lightweight mobile controls.
   - Heavy Creator Studio is web/desktop.

Acceptance criteria:
- App Store screenshots reflect the final design.
- Review notes match what is actually enabled in-app.

## 12. Final Release Candidate Checklist

Run this before TestFlight or App Store submission:

```bash
cd /Users/apple/pluggd-mobile-workspace/pluggd-mobile
npx tsc --noEmit
for f in scripts/verify-mobile-*.mjs; do node "$f"; done
npx expo-doctor
git diff --check
npx expo run:ios --device "iPhone 17"
```

Then manually confirm:

- Home/Stage/Live/Backstage/Search only in bottom nav.
- Wallet/Profile/Creator Mode only through avatar/contextual routes.
- Proper PLUGGD logo appears in header/auth/splash.
- StoreKit products load.
- No external checkout for digital goods.
- Ticket QR appears only for real ticket orders.
- Apple Wallet CTA hidden until pass backend exists.
- Push notifications work on a real device.
- Signed-in fan/creator/promoter paths pass.
- `/Users/apple/PLUGGD_NEW` remains untouched by mobile work.

## Owner Summary

Apple/App Store owner:
- App record, capabilities, IAP products, sandbox testers, PassKit, TestFlight, review assets.

Backend/Supabase owner:
- Confirm production migration state, secrets, payment/ticket purchase backend, pass signing service, RLS policies, notification jobs.

Product/legal owner:
- Ticket payment compliance, refund/transfer policy, moderation policy, creator/live permission rules.

Design/brand owner:
- Licensed fonts, final logo/icon/screenshot approval, launch content curation.

QA owner:
- Real role-bearing account testing, real device testing, StoreKit sandbox testing, scanner/push/upload verification.
