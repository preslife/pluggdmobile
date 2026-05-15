# PLUGGD Mobile Audit And Implementation Plan

Date: 2026-05-13

Scope:
- Mobile workspace audited: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`
- Live web reference audited read-only: `/Users/apple/PLUGGD_NEW`
- No files in `/Users/apple/PLUGGD_NEW` were changed.

## Executive Summary

The current mobile app should not be thrown away. It is a real Expo/React Native project with an iOS native project, Supabase auth/data integration, StoreKit-based credit purchase code, a wallet ledger hook, a TrackPlayer global player, a mini-player, role onboarding, live-session work, and a meaningful set of creator and marketplace screens.

It is also not aligned enough with the current PLUGGD web product to ship as-is. The main gaps are the current launch/access-code gate, the richer current social/community model, entitlement-safe credit spending, Apple-compliant commerce boundaries, premium native navigation, and removal of fake fallback data and inert buttons.

The correct direction is to keep the useful mobile foundation, reconnect it to the current PLUGGD backend contracts, remove or hide outdated digital checkout assumptions, and rebuild the app shell and core flows around a premium dark native iOS experience.

## Implementation Progress After Audit

Completed in the first implementation pass:

- Verified the native iOS simulator build successfully after granting CoreSimulator access.
- Added `scripts/verify-mobile-commerce-contract.mjs` to guard the current iOS commerce rules.
- Restricted the mobile StoreKit credit catalog to the four approved packs.
- Updated wallet credit spending to call the current entitlement-aware `spend-credits` function.
- Removed the global Stripe provider wrapper from the app layout.
- Disabled the stale mobile digital checkout and order-success routes so they no longer present card/Apple Pay checkout for digital goods.
- Re-ran the commerce contract check, TypeScript, and an incremental native iOS simulator build successfully.
- Added `scripts/verify-mobile-auth-contract.mjs` to guard mobile launch-access parity.
- Added `src/features/auth/launch-access.ts` for access-code normalization, pending code storage, validation, redemption, preaccess profile sync, and `platform_user_has_launch_access` enforcement.
- Updated `AuthProvider` so restored and newly changed sessions are accepted only after launch-access enforcement.
- Updated login and signup to collect access codes, validate them against the current backend, and store pending codes before Supabase auth.
- Re-ran the auth contract check, commerce contract check, TypeScript, and an incremental native iOS simulator build successfully after the auth changes.
- Added `scripts/verify-mobile-navigation-contract.mjs` to guard the agreed core mobile shell.
- Replaced the horizontally scrolling fan/creator dock with a fixed five-tab mobile shell: Home, Discover, Create, Community, and Profile.
- Kept existing routes intact and mapped deeper release, market, live, creator, wallet, and social routes into the nearest top-level tab state.
- Re-ran navigation/auth/commerce contract checks, TypeScript, and an incremental native iOS simulator build successfully after the navigation change.
- Added `scripts/verify-mobile-home-contract.mjs` to block demo/fallback Home content from returning.
- Removed fake Home artists, live rooms, event, release drops, and fabricated viewer counts.
- Updated Home to render real Supabase data only, with honest empty states for no featured release, no live sessions, no new releases, and no upcoming events.
- Re-ran home/navigation/auth/commerce contract checks, TypeScript, and an incremental native iOS simulator build successfully after the Home cleanup.
- Added `scripts/verify-mobile-route-contract.mjs` to guard required mobile route coverage.
- Added a standalone access-code route at `/auth/access-code`.
- Added public creator/profile routes at `/u/:username`, `/creator/:username`, and `/user/:userId` backed by a shared Supabase-driven profile screen.
- Added root `/notifications`, `/search`, and `/settings` entry points so the agreed mobile screen map has stable route coverage.
- Re-ran route/home/navigation/auth/commerce contract checks, TypeScript, and an incremental native iOS simulator build successfully after the route coverage work.
- Added `scripts/verify-mobile-market-contract.mjs` to guard against unfinished marketplace checkout/service/license/offer surfaces.
- Refocused Marketplace on real Beats, Sample Packs, and Soundboards backed by Supabase data.
- Removed unfinished Services, Licenses, and Offers tabs from the iOS market surface.
- Updated beat detail to route users to Wallet for credits instead of showing stale checkout language.
- Re-ran all mobile contract checks, TypeScript, and an incremental native iOS simulator build successfully after the Marketplace pass.
- Added `scripts/verify-mobile-release-contract.mjs` to guard release credit unlock accounting.
- Fixed release unlock pricing so `credits_price` remains authoritative and GBP `price` falls back to `Math.ceil(price * 100)` using the agreed 100 credits = GBP 1 model.
- Confirmed release unlock still calls the entitlement-aware wallet spend path with `spend_unlock` and `ref_type=release`.
- Re-ran all mobile contract checks, TypeScript, and an incremental native iOS simulator build successfully after the release unlock fix.

## Phase 1 Audit - Current Web Product

### Product Surface

The current web app is a full music platform, not a simple streaming app. The audited web repo exposes these major areas:

- Auth, launch access, pre-access applications, fan waitlist, onboarding, and role setup.
- Public discovery, home, fan home, search, charts, radio, releases, release detail, and music redirect routes.
- Creator profiles through username and creator routes.
- Marketplace routes for beats, sample packs, soundboards, mixes, events, live sessions, hubs, and communities.
- Social feed/community routes including post detail, community boards, creator communities, hubs, and activity.
- Account routes for library, favorites, orders, memberships, wallet, payouts, notifications, inbox, and settings.
- Creator/studio routes for releases, beats, sample packs, events, memberships, live, analytics, payouts, CRM, labels, and other studio tools.
- Admin routes for access codes, moderation, store, events, users, roles, security, catalog, live gifts, and platform operations.

Primary web route reference: `/Users/apple/PLUGGD_NEW/src/App.tsx`.

### Auth And Launch Access

The current web app has active pre-release/access-code logic. It is not optional platform decoration.

Relevant web contracts:

- `platform_validate_access_code`
- `platform_redeem_access_code`
- `platform_user_has_launch_access`
- `preaccess_sync_profile_from_submission`
- `profiles`
- `profile_roles`

Relevant web files:

- `/Users/apple/PLUGGD_NEW/src/hooks/useAuth.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/PreReleaseGate.tsx`
- `/Users/apple/PLUGGD_NEW/src/pages/Auth.tsx`
- `/Users/apple/PLUGGD_NEW/supabase/migrations/20260401194000_launch_access_codes_and_gate.sql`
- `/Users/apple/PLUGGD_NEW/supabase/migrations/20260419000000_access_code_tiers_and_founders.sql`
- `/Users/apple/PLUGGD_NEW/supabase/migrations/20260504090000_pre_release_gate_and_submissions.sql`

Mobile currently does not enforce this gate, so a signed-in mobile user can diverge from the live web access model.

### Backend And Supabase Surface

The current web backend includes tables, RPCs, and functions for:

- Profiles and roles.
- Releases, tracks, release purchases, release access, release favorites, and playback tracking.
- Beats, beat licenses, beat sales, licensing contracts, licensing templates, and marketplace purchases.
- Sample packs, sample pack purchases, and sample pack samples.
- Soundboards and soundboard items, with comments/reactions support in migrations.
- Mixes and tracklist items.
- Events, RSVPs, tickets, and event discussions.
- Social posts, comments, likes, bookmarks, reposts, quote posts, poll votes, stories, and notifications.
- Creator communities, hubs, memberships, perks, metrics, collaborations, campaigns, CRM, courses, and labels.
- Wallet ledger, credit purchases, credit spend flows, live gifts, creator wallet ledger, payouts, and subscriptions.
- Live rooms, live participants, live messages, stage requests, gift catalog, and gift events.
- Notifications, notification preferences, inbox, reports, moderation, admin workflows, and platform logs.

Important web functions audited:

- `validate-iap-receipt`
- `apple-server-notification`
- `spend-credits`
- `process-credits-transaction`
- `create-credits-checkout`
- `create-release-purchase`
- `confirm-release-purchase`
- `create-beat-purchase`
- `confirm-beat-purchase`
- `create-sample-pack-purchase`
- `confirm-sample-pack-purchase`
- `download-signed-url`
- `download-sample-pack`
- `get-sample-pack-sample-url`
- `create-live-session-token`
- `send-live-gift`
- `send-push-notification`
- `broadcast-notification`

No `create-mobile-payment-intent` function was found in the current web Supabase functions, which makes the mobile Stripe PaymentSheet path look outdated.

### Wallet, Credits, And IAP

The web backend has real Apple IAP support:

- `validate-iap-receipt` verifies Apple transactions and records credit top-ups using wallet ledger kind `topup_iap`.
- `apple-server-notification` exists for App Store server notification handling.
- Migration `20260428170000_apple_iap_tables.sql` creates `iap_transactions`, `apple_notification_log`, and subscription-related columns.
- `spend-credits` expects a positive credit amount, deducts credits internally, writes a negative wallet ledger transaction, and creates a `release_purchases` entitlement for release unlocks.

The current user-approved mobile credit packs are:

- `pluggd_credits_popular` - Plus Credits - GBP 9.99 - 1,050 credits including 50 bonus
- `pluggd_credits_value` - Value Credits - GBP 24.99 - 2,750 credits including 250 bonus
- `pluggd_credits_premium` - Premium Credits - GBP 49.99 - 5,750 credits including 750 bonus
- `pluggd_credits_ultimate` - Ultimate Credits - GBP 99.99 - 12,000 credits including 2,000 bonus

The existing backend and mobile code also know about `pluggd_credits_starter`, which is not in the current requested list. That SKU must either be deliberately retained because it exists in App Store Connect, or removed from the mobile purchase UI and product fetch list.

Wallet model to enforce in iOS:

- 100 credits = GBP 1.
- Credits never expire.
- Credits can be used for unlocks, tips, gifts, fan interactions, and platform-native purchases where allowed.
- iOS credit purchases must use Apple IAP.
- iOS must not expose external checkout links for in-app digital goods.

### Social And Community

The current web app supports a richer feed than the mobile app:

- Feed query helpers such as `fn_for_you_feed`.
- Posts with destination/community context.
- Comments.
- Likes.
- Bookmarks.
- Reposts.
- Quote posts.
- Poll voting through `social_poll_votes` and `vote_social_poll`.
- Realtime post insert handling.
- Social notification triggers.

Relevant web files:

- `/Users/apple/PLUGGD_NEW/src/hooks/useSocialFeed.tsx`
- `/Users/apple/PLUGGD_NEW/supabase/migrations/20260404130000_pluggdx_social_feed.sql`
- `/Users/apple/PLUGGD_NEW/supabase/migrations/20260414160000_for_you_feed_rpc.sql`
- `/Users/apple/PLUGGD_NEW/supabase/migrations/20260506222847_production_social_poll_votes.sql`

### Current Web Documentation Signals

The audited web docs emphasize that PLUGGD should not ship dummy buttons, fake routes, fake product behavior, or placeholder platform claims. The mobile app should follow that rule as well: unfinished features can be scaffolded internally, but the UI must not pretend they are complete.

Relevant reference docs:

- `/Users/apple/PLUGGD_NEW/PLUGGD_CONTEXT.MD`
- `/Users/apple/PLUGGD_NEW/docs/PLUGGD_PRODUCT_MAP.md`
- `/Users/apple/PLUGGD_NEW/docs/PLUGGD_COMPLETE_FEATURE_LIST.md`
- `/Users/apple/PLUGGD_NEW/docs/MOBILE_IOS_COMMERCE_ARCHITECTURE_2026-04-22.md`

## Phase 1 Audit - Current Mobile App

### Framework And Project Shape

The actual mobile app is nested at:

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`

Stack:

- Expo SDK 54
- React 19
- React Native 0.81
- Expo Router 6
- Supabase JS 2
- React Query
- Zustand
- NativeWind
- React Native Track Player
- React Native IAP
- React Native Agora
- Stripe React Native

Native artifacts exist:

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/ios/pluggdmobile.xcworkspace`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/ios/pluggdmobile.xcodeproj`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/ios/Podfile`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/ios/Podfile.lock`

App identity:

- App name: `Pluggd`
- iOS bundle id: `com.pluggd.mobile`
- Scheme: `pluggd`
- iOS deployment target: 15.1
- New architecture: enabled

### Build Status

Completed checks:

- `npx tsc --noEmit` passed.
- `npx expo-doctor` passed all 17 checks.
- Native iOS simulator build passed with `xcodebuild`, scheme `pluggdmobile`, Debug, iPhone 17 simulator, derived data at `/private/tmp/pluggd-mobile-derived-data`, and `CODE_SIGNING_ALLOWED=NO`.

Native iOS status:

- Xcode workspace, scheme, Pods, and simulator target were discovered.
- XcodeBuildMCP was configured for workspace `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/ios/pluggdmobile.xcworkspace`, scheme `pluggdmobile`, Debug, iPhone 17 simulator, and derived data at `/private/tmp/pluggd-mobile-derived-data`.
- The initial sandboxed shell build could not access CoreSimulator services, so the build was re-run with simulator access and completed successfully.
- Build output contains third-party dependency warnings from React Native, Expo, TrackPlayer, Agora, Stripe, and related Pods, but no app compile failure.

### Environment And Backend Integration

Mobile `.env` points at the same Supabase project as the current web app. The app uses:

- `src/lib/supabase.ts` for the Supabase client.
- `src/lib/storage.ts` for React Native session persistence.
- `src/context/AuthProvider.tsx` for session restore and sign-out.

The Supabase foundation is worth keeping, but the auth behavior is not current enough because it omits launch access-code enforcement.

### Existing Screens

The mobile route tree is broad. Major areas already exist:

- Auth: login, signup, role selection, fan setup, magic link, onboarding.
- Tabs: home, explore, drops, marketplace, mixes, events, community, soundboards, profile, wallet.
- Music/release detail.
- Beat detail.
- Sample pack detail.
- Soundboard detail.
- Player.
- Library and favorites.
- Creator dashboard, onboarding, upload, analytics, events, licensing, memberships, payouts, audience.
- Live create/session screens.
- Membership screens.
- Commerce checkout/success screens.
- Social/community screens.
- Settings/profile/wallet flows.

This is a useful screen inventory, but many screens are partial or wired to older assumptions.

### Navigation And App Shell

Current app shell:

- `app/(tabs)/_layout.tsx` uses Expo Router tabs but hides the native tab bar.
- `components/AppChrome.tsx` renders the mobile header, mini-player, and custom dock.
- `components/PluggdDock.tsx` provides a horizontally scrollable dock.
- `components/BottomTabs.tsx` returns null.

Problems:

- The dock is not a premium native iOS tab structure.
- It creates many visible destinations at once, increasing clutter.
- The creator dock is large and tool-heavy for a consumer-first mobile shell.
- The requested design wants a mature mobile-first app, not a web-route dock.

### Design System

The mobile token file is close to the requested palette:

- Background: `#080808`
- Surface: `#151515`
- Border: `#262626`
- Accent: `#FF5200`

Relevant file:

- `src/design/tokens.ts`

This foundation should be kept. The implementation still needs tightening:

- Reduce inconsistent corner radii and visual language.
- Remove fake/fallback cards.
- Avoid over-explanatory visible UI text.
- Reduce gradients and decorative effects.
- Make navigation and core content feel native and music-first.
- Keep controls dense, legible, and mature.

### Auth Implementation

Current mobile auth:

- Email/password login works through Supabase.
- Email/password signup writes basic user metadata.
- Role selection writes `profiles` and `profile_roles`.
- Role choices are appropriately broad: artist, producer, DJ, promoter, venue, curator, service provider, manager, and fan.

Problems:

- No current web launch access-code gate.
- No pending access-code redemption after OAuth or signup.
- Social login buttons appear present but are not wired.
- Forgot password behavior is incomplete.
- Access denial does not match web behavior.

### Player Implementation

Current mobile player work is valuable:

- `src/context/PlaybackProvider.tsx` uses `react-native-track-player`.
- It supports setup, queue, play/pause, seek, skip, repeat, shuffle, progress, and metadata.
- `components/MiniPlayer.tsx` gives a persistent mini-player.

This should be kept and refactored into the final shell. The main missing piece is access-safe playback URL resolution and locked-content behavior matching backend entitlements.

### Home And Discover

Current home:

- Loads releases, beats, session rooms, and events.
- Shows featured content, recent drops, live rooms, beats, and events.

Problems:

- It contains fallback/demo content.
- Some CTAs are inert.
- It is closer to a dashboard than a personalized music/social home feed.
- It does not use the richer current web feed/discovery contracts.

Current discover:

- Searches profiles, beats, and releases.
- Shows verified artists, recent releases, recent beats, and ecosystem navigation.

Problems:

- It is useful but still route-grid oriented.
- It is not yet a polished music discovery surface.

### Releases

Current release detail:

- Fetches a release and tracks.
- Checks `release_purchases`.
- Queues tracks in the player.
- Attempts credit unlock through `useWallet.spendCredits`.

Problems:

- Unlock flow calls `process-credits-transaction`, not current `spend-credits`.
- It may confuse GBP/cash `price` with `credits_price` when calculating credits.
- It manually marks a release owned after spending but may not create a real backend entitlement.
- Locked-track playback needs stricter backend URL/access handling.

### Beats Marketplace

Current marketplace and beat detail:

- Browse beats.
- Preview beats.
- Show creator attribution and basic metadata.

Problems:

- Detail licensing CTA is effectively inert.
- `BeatLicenseButton` exists but reflects older external checkout assumptions.
- No Apple-compliant in-app unlock/licensing flow is wired.
- Beat entitlement and license creation need backend confirmation before exposing purchase actions.

### Sample Packs And Sound Kits

Current sample pack detail:

- Fetches `sample_packs` and `sample_pack_samples`.
- Can preview samples.

Problems:

- Buy/claim CTA is inert.
- Preview gating is weak.
- Unlock/purchase entitlement flow is missing.
- Need use `get-sample-pack-sample-url` and purchase/unlock contracts where supported.

### Soundboards

Current soundboard detail:

- Fetches soundboards and items.
- Plays audio items and opens link items.

Problems:

- Presentation is list-like, not a strong pad/soundboard mobile experience.
- Follow/share actions are incomplete.
- Comments/reactions/community integrations are not wired.

### Social And Community

Current mobile community:

- Loads basic `social_posts`.
- Can insert a simple post.
- Displays fan map plugs and community surfaces.

Problems:

- Like/comment/repost UI is mostly label-only.
- No robust comments, likes, bookmarks, reposts, quote posts, media, polls, or realtime feed behavior.
- Author display is incomplete.
- Some sections are placeholder-like.

### Creator Tools

Current mobile creator work includes:

- Creator dashboard with metrics and content queries.
- Creator onboarding.
- Creator event management with Supabase CRUD.
- Creator memberships.
- Live creation.
- Upload/licensing/payout/audience screens.

Worth keeping:

- Dashboard query structure.
- Events CRUD.
- Membership tier management if product mapping is fixed.
- Live create flow.

Problems:

- Licensing has TODO persistence.
- Some creator tools are too web-heavy for primary mobile tabs.
- Membership StoreKit product mapping needs current business validation.
- Upload and studio flows need audit before exposing as complete.

### Wallet And StoreKit

Current mobile wallet/IAP:

- `src/hooks/useCredits.ts` uses `react-native-iap`.
- It fetches products, initiates purchases, listens for updates/errors, calls `validate-iap-receipt`, finishes transactions, restores purchases, and updates wallet balance.
- `app/wallet.tsx` shows pack cards and ledger.

Worth keeping:

- StoreKit integration foundation.
- Receipt validation function call.
- Wallet balance and ledger rendering.

Problems:

- UI includes `pluggd_credits_starter`, which is not in the current requested pack list.
- Wallet copy must be updated to the current model.
- Spending hook uses the older generic transaction function.
- StoreKit status cannot be fully verified without sandbox/App Store Connect product availability.

### Memberships And Subscriptions

Current mobile subscription hook:

- Uses fixed SKUs such as `pluggd_tier_299`, `pluggd_tier_499`, `pluggd_tier_999`, `pluggd_tier_1999`, and `pluggd_tier_4999`.
- Creates a pending `fan_subscriptions` row.
- Calls StoreKit subscription purchase.
- Validates receipt through `validate-iap-receipt`.

Risk:

- Current web mobile commerce guidance recommends per-creator Apple subscription product mapping rather than shared generic price-point products. This requires business and App Store Connect confirmation before public release.

### Events And Live

Current mobile live work is substantial:

- `src/lib/live.ts` invokes `create-live-session-token`.
- Live creation creates `session_rooms`.
- Live session screen uses session rooms, participants, messages, stage requests, gifts, and profiles.
- Gift send path invokes `send-live-gift`.

This should be kept and verified against current backend/RLS. Do not fake unavailable live features.

### Commerce And Stripe

At audit time, mobile contained Stripe paths:

- Root app layout wraps the app in `StripeProvider`.
- `src/lib/payments.ts` launches Stripe PaymentSheet through `create-mobile-payment-intent`.
- `app/commerce/checkout.tsx` uses PaymentSheet and includes demo metadata.
- `app/commerce/success.tsx` says Apple Pay.

Problems:

- `create-mobile-payment-intent` was not found in the current web functions.
- This path appears old.
- It risks violating the requested iOS model for in-app digital goods.
- It should be removed or hidden from iOS digital flows unless retained only for clearly allowed physical/event cases with proper compliance review.

Current status after the first implementation pass:

- The global `StripeProvider` wrapper has been removed.
- `src/lib/payments.ts` no longer calls Stripe or the missing mobile PaymentIntent function.
- The legacy checkout and success routes now show disabled-state screens and route users back to Wallet/Market instead of presenting a digital checkout.
- The Stripe dependency and plugin remain in the project for a later deliberate decision because physical goods, events, or web-only creator commerce may still need separate treatment.

## Gap Report

### Present In Web But Missing Or Incomplete In Mobile

- Launch/pre-access gate and access-code redemption.
- Full web auth/session behavior after signup/OAuth.
- Rich social feed with comments, likes, bookmarks, reposts, quote posts, polls, media, and realtime updates.
- Current creator community/hub model.
- Release playback/access URL resolution and entitlement-safe locked content.
- Release favorites/current library behavior.
- Apple-compliant credit spend flows using `spend-credits`.
- Beat license/unlock flow using current backend contracts.
- Sample pack entitlement/download/sample URL flow.
- Soundboard reactions/comments/share-to-feed behavior.
- Mature notifications/activity center.
- Current admin/moderation-driven content status handling on mobile surfaces.
- Proper native app shell and premium iOS tab experience.
- Full StoreKit sandbox verification.
- App Store server notification reconciliation verification.

### Partially Implemented In Mobile

- Supabase auth.
- Role onboarding.
- Home/discover.
- Release detail and playback.
- Beat browsing and preview.
- Sample pack browsing and preview.
- Soundboard browsing/playback.
- Wallet balance and ledger.
- StoreKit credit purchase foundation.
- Creator dashboard.
- Creator events.
- Creator memberships.
- Live sessions.
- Mini-player/full-player foundation.

### Implemented Against Old Or Incorrect Assumptions

- Stripe PaymentSheet for in-app digital checkout.
- `create-mobile-payment-intent` function usage.
- Beat/detail license checkout path.
- `useWallet.spendCredits` using `process-credits-transaction` for unlock-style spending.
- Release unlock fallback to cash `price` as credits.
- Shared membership SKUs if the business needs per-creator subscription products.
- Fallback fake home data and placeholder marketplace sections.
- Custom web-like dock as the primary shell.

### Backend Work Worth Keeping

- Current Supabase project/env wiring.
- `validate-iap-receipt`.
- `apple-server-notification`.
- `spend-credits`.
- `send-live-gift`.
- `create-live-session-token`.
- Release, beat, sample pack, soundboard, live, wallet, and social tables.
- Access-code/pre-release RPCs.
- Social feed RPCs and tables.

### Frontend Work Worth Keeping

- Expo project and native iOS project.
- Supabase client/session persistence.
- React Query/Zustand foundation.
- Dark design token palette.
- Playback provider and mini-player.
- Wallet/IAP purchase foundation.
- Role onboarding.
- Creator dashboard/events/live foundations.
- Existing browse/detail queries as starting points.

### Work To Remove, Hide, Or Refactor

- Remove/hide Stripe digital checkout paths from iOS consumer flows.
- Remove/hide fake fallback content.
- Remove or replace inert CTA buttons.
- Replace the custom dock with a native tab structure.
- Refactor credit spending to current backend functions.
- Refactor wallet packs to the approved four-pack list unless `starter` is explicitly retained.
- Refactor community into the current social feed model.
- Refactor beat/sample/soundboard purchase actions only after backend entitlement contracts are confirmed.

## Phase 2 - Correct Mobile App Definition

### Product Direction

The iOS app should be a premium dark music/social app. It should feel native, compact, mature, and fast. It should not present unfinished platform features as complete.

Visual baseline:

- Background: `#080808` / `#0B0B0B`
- Cards: `#151515`
- Borders: `#262626`
- Accent: `#FF5200`
- Dark-first UI
- Minimal gradients
- No cartoon styling
- No cheap neon styling
- No cluttered web-route lists

### Proposed Mobile Architecture

Keep:

- Expo Router for navigation.
- Supabase JS for backend access.
- React Query for server state.
- Zustand for local playback/wallet/session UI state.
- TrackPlayer for audio.
- React Native IAP for StoreKit purchases.

Add/refactor:

- A feature-oriented service layer for backend calls:
  - `src/features/auth`
  - `src/features/home`
  - `src/features/music`
  - `src/features/player`
  - `src/features/social`
  - `src/features/creator`
  - `src/features/market`
  - `src/features/wallet`
  - `src/features/live`
  - `src/features/notifications`
- Generated/current Supabase types copied into the mobile repo from the live schema process, not hand-guessed.
- A small design system with native buttons, cards, list rows, sheet headers, tabs, chips, empty states, and media cards.
- A playback/access service that centralizes release/track/beat/sample/soundboard audio URL access decisions.
- A commerce boundary that prevents external checkout links for iOS digital goods.

### Navigation Structure

Recommended primary tabs:

- Home
- Discover
- Create
- Community
- Profile

Supporting surfaces:

- Mini-player above the tab bar.
- Full player as a modal/full route.
- Wallet from Profile and purchase/unlock flows.
- Creator Studio entry from Profile/Create, role-aware.
- Search as a Discover-first surface.
- Notifications from top-right header/profile.
- Settings from Profile.

Why this shape:

- It keeps consumer browsing simple.
- It still supports creators without turning the main app into a studio dashboard.
- It maps better to native iOS expectations than a horizontally scrolling web dock.

## Screen Map

### Auth And Access

- Splash/session restore.
- Login.
- Signup.
- Access code entry/redeem.
- Pre-access status/blocked state.
- Role onboarding.
- Fan profile setup.
- Creator profile setup.

### Home

- Personalized feed.
- Featured releases.
- Featured creators.
- Live/event highlights.
- Community highlights.
- Continue listening.
- Marketplace highlights only where real data exists.

### Discover

- Search.
- Releases.
- Creators.
- Beats.
- Sample packs.
- Soundboards.
- Mixes.
- Events/live.
- Charts/radio if backend route is ready.

### Music And Player

- Releases list.
- Release detail.
- Track list.
- Unlock state.
- Mini-player.
- Full player.
- Queue.
- Basic playback controls.

### Community

- For You / Following feed.
- Composer.
- Post detail.
- Comments.
- Likes/bookmarks/reposts/quote posts where backend supports.
- Media post support where backend supports.
- Community/hub entry points.

### Creator Profiles

- Profile header.
- Releases.
- Beats.
- Sample packs.
- Soundboards.
- Mixes/videos if supported.
- Events/shows.
- Follow/support actions.
- Creator store/links only where compliant and available.

### Marketplace

- Beats browse/detail/preview.
- Sample packs browse/detail/preview.
- Soundboards browse/detail/play.
- Unlock/licensing only where backend support is verified.

### Wallet

- Balance.
- Approved credit packs.
- Apple IAP purchase flow.
- Ledger.
- Credit usage explainer.
- Restore purchases.

### Events And Live

- Events list.
- Event detail.
- RSVP/ticket status if backend supports.
- Live sessions list.
- Live session detail/join.
- Creator live create path if role allows.

### Notifications And Activity

- Likes.
- Comments.
- Follows.
- Unlocks.
- Purchases.
- Community activity.
- Push registration/status once backend support is confirmed.

### Settings

- Account.
- Profile.
- Wallet.
- Privacy.
- Notifications.
- Creator tools entry.
- Legal/help.

## Backend And API Mapping

### Auth

- Supabase auth session.
- `profiles`
- `profile_roles`
- `platform_validate_access_code`
- `platform_redeem_access_code`
- `platform_user_has_launch_access`
- `preaccess_sync_profile_from_submission`

### Home And Discover

- `fn_for_you_feed`
- Releases/tracks queries.
- Beat queries.
- Sample pack/sample queries.
- Soundboard/item queries.
- Mix/mix tracklist queries.
- Event queries.
- Live session queries.
- Profile/creator queries.

### Music And Playback

- `releases`
- `tracks`
- `release_purchases`
- `release_favorites`
- `can_access_release`
- `verify-release-access`
- `resolve-playback-url`
- `track-release-play`
- `track-beat-play`

### Wallet And Credits

- `get_wallet_balance`
- `wallet_ledger`
- `validate-iap-receipt`
- `apple-server-notification`
- `spend-credits`
- `send-live-gift`

### Marketplace

- `beats`
- `beat_licenses`
- `beat_sales`
- `sample_packs`
- `sample_pack_samples`
- `sample_pack_purchases`
- `soundboards`
- `soundboard_items`
- Purchase/confirm functions only where compliant for iOS and appropriate to the content type.

### Social

- `social_posts`
- `social_comments`
- `social_likes`
- `social_bookmarks`
- `social_reposts`
- `social_poll_votes`
- `vote_social_poll`
- Realtime post/comment subscriptions where safe.

### Creator

- `creator_kpi_events`
- `creator_metrics`
- `membership_tiers`
- `membership_perks`
- `fan_subscriptions`
- `creator_wallet_ledger`
- `events`
- `session_rooms`
- Release/beat/sample/soundboard creator ownership queries.

### Live

- `session_rooms`
- `session_participants`
- `session_messages`
- `live_stage_requests`
- `live_gift_catalog`
- `live_gift_events`
- `create-live-session-token`
- `send-live-gift`

### Notifications

- `notifications`
- `notification_prefs`
- Notification RPCs/functions from the current backend.
- Mobile push token registration still needs confirmation; web push subscriptions do not automatically cover APNS device tokens.

## IAP And StoreKit Status

Current mobile StoreKit foundation:

- `react-native-iap` is installed.
- Credit products are fetched.
- Purchases are initiated with StoreKit.
- Purchase updates call `validate-iap-receipt`.
- Transactions are finished.
- Restore purchases exists.

Current backend IAP foundation:

- `validate-iap-receipt` exists.
- `apple-server-notification` exists.
- IAP-related migrations exist.
- Wallet ledger supports `topup_iap`.

Open items:

- Confirm App Store Connect has the four requested products active:
  - `pluggd_credits_popular`
  - `pluggd_credits_value`
  - `pluggd_credits_premium`
  - `pluggd_credits_ultimate`
- Decide whether `pluggd_credits_starter` remains hidden, removed, or formally supported.
- Verify `validate-iap-receipt` inserts or reconciles `iap_transactions`; the table exists but the audited function primarily records ledger/system log activity.
- Verify App Store server notifications in a sandbox/prod environment.
- Verify sandbox StoreKit purchases on simulator and real device.
- Fix mobile spending to use `spend-credits` for supported unlocks.
- Confirm subscription SKU strategy before exposing memberships broadly.

## Keep, Refactor, Delete

### Keep

- Expo/RN project structure.
- iOS native project and Pods.
- Supabase environment/client/session storage.
- React Query and Zustand usage.
- TrackPlayer playback provider.
- Mini-player concept.
- Dark token palette.
- Role onboarding.
- Wallet credit purchase foundation.
- Wallet balance and ledger reading.
- Creator dashboard/events/live foundations.
- Existing browse/detail query code as a starting point.

### Refactor

- AuthProvider and auth screens to include access-code/pre-release behavior.
- AppChrome/PluggdDock into a premium native tab shell.
- Wallet pack list and copy.
- Credit spending from `process-credits-transaction` to current `spend-credits`.
- Release unlock/access logic.
- Beat/sample/soundboard detail actions.
- Community feed into current social model.
- Creator memberships after SKU/product mapping is confirmed.
- Design components into a tighter dark native system.

### Delete Or Hide

- Stripe digital checkout path in iOS in-app digital flows.
- `create-mobile-payment-intent` dependency.
- Demo metadata in commerce checkout.
- Fake/fallback home data.
- Inert buttons that look live.
- Placeholder marketplace sections until backend support is verified.
- Empty `BottomTabs` component once replaced.

## Missing Backend Requirements Or Decisions

- Confirm final credit product catalog and whether the starter pack exists publicly.
- Confirm APNS device token storage and mobile push notification functions.
- Confirm mobile playback URL resolver behavior for locked tracks and previews.
- Add or confirm credit entitlement functions for beats, sample packs, and soundboards if those unlocks are intended on iOS.
- Confirm per-creator membership Apple subscription product mapping.
- Confirm which event/ticket flows are Apple-compliant in iOS and which should be web-only or informational.
- Confirm whether creator upload/studio tools should be full mobile authoring or mobile management only.

## Risk List

- App Review risk if external checkout or Stripe digital payment remains visible in iOS digital content flows.
- Accounting/entitlement risk if mobile spends credits without creating the correct purchase entitlement.
- Access-control risk if mobile bypasses the current web launch gate.
- Data-shape risk if mobile continues using old assumptions instead of current generated Supabase types.
- UX risk from broad placeholder navigation and inert CTAs.
- StoreKit risk until sandbox products and receipt validation are tested end to end.
- Native build requires CoreSimulator access outside the restricted sandbox, but the baseline simulator build now passes.
- Social/community scope risk because the web social model is much richer than the current mobile version.

## Phase 3 Implementation Plan

### 1. Make The App Build Successfully

- Baseline completed on 2026-05-13: TypeScript, Expo Doctor, and native iOS simulator build are passing.
- Keep this as a regression gate before and after feature refactors.
- If future native builds fail, capture full Xcode logs and fix before continuing feature work.

### 2. Reconnect To Current Backend Contracts

- Bring current Supabase generated types into mobile.
- Create typed service modules for auth, music, wallet, social, market, live, and profiles.
- Replace outdated function names and shape assumptions.

### 3. Fix Auth And Access Code Flow

- Add access-code entry and pending code redemption.
- Mirror web behavior for denied launch access.
- Sync preaccess submissions into profiles where applicable.
- Keep role-aware onboarding but avoid a childish fan/creator split.

### 4. Implement Premium Native App Shell

- Replace the scroll dock with a focused native tab structure.
- Keep mini-player above tabs.
- Use sheets/modals for Create, wallet purchase, comments, sharing, and quick actions.
- Apply the dark design tokens consistently.

### 5. Implement Core Consumer Music Flow

- Home.
- Discover.
- Releases list/detail.
- Creator profile.
- Player and queue.
- Library/favorites.
- Playback access checks.

### 6. Implement Wallet And Apple IAP

- Restrict UI to the approved four credit packs unless the starter SKU is confirmed.
- Update wallet copy to current model.
- Verify StoreKit product fetch.
- Verify receipt validation and ledger update.
- Verify restore purchases.

### 7. Implement Credit Unlocks, Tips, And Gifts Where Supported

- Use `spend-credits` for release unlocks.
- Use `send-live-gift` for live gifts.
- Add beat/sample/soundboard credit unlocks only after backend entitlement behavior is confirmed or added.

### 8. Implement Marketplace Surfaces

- Beats browse/detail/preview.
- Sample packs browse/detail/preview.
- Soundboards browse/detail/pad playback.
- Hide unsupported purchase/licensing actions until real backend support exists.

### 9. Implement Feed And Community

- Use current social feed contracts.
- Add post composer.
- Add comments, likes, bookmarks, reposts, and quote posts where supported.
- Add media/polls only where backend and storage support are verified.

### 10. Implement Events And Live

- Events listing/detail.
- Live listing/detail/join.
- Creator live create path.
- Keep incomplete live features hidden instead of fake.

### 11. Notifications And Settings

- Add activity center.
- Add push token registration after backend support is confirmed.
- Complete account/profile/privacy/notification settings.

### 12. Polish And QA

- Run TypeScript, Expo Doctor, native iOS simulator build, and focused manual flows.
- Test login/signup/access code.
- Test release playback/unlock.
- Test StoreKit sandbox purchase.
- Test wallet ledger.
- Test social compose/reactions.
- Test live session entry.
- Test on simulator and a real iOS device where possible.

### 13. Final Handover

- Document build/test commands.
- Document known backend dependencies.
- Document App Store Connect/IAP status.
- Document remaining risks and next release checklist.

## Priority Build Order

1. Baseline native iOS build verification - completed.
2. Remove or hide noncompliant/outdated checkout paths - first pass completed for digital checkout routes.
3. Wallet and approved StoreKit credit pack alignment - first pass completed.
4. Auth/access gate alignment - first pass completed for email/password login and signup.
5. Premium native shell and tabs - first pass completed with fixed five-tab app chrome.
6. Backend type/service alignment.
7. Home, Discover, Music, Creator Profile, Player - Home no-fake-data cleanup and public creator profile routes completed; Discover/Music/Player refinement still pending.
8. Release credit unlock end-to-end verification.
9. Beats, Sample Packs, Soundboards.
10. Feed and Community.
11. Events and Live.
12. Notifications, Settings, and creator mobile tools.
13. UI polish and full simulator/device QA.
