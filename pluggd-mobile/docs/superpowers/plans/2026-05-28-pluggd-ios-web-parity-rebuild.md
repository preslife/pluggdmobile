# PLUGGD iOS Web-Parity Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the native iOS product shell so it follows the PLUGGD web app as source of truth while preserving Apple/IAP/backend commerce contracts.

**Architecture:** Use the web app's routes, mobile dock, account menu, create model, page hierarchy, and visual assets as the canonical product model. Native should be an iOS translation of the web product, not a separate Stage/Backstage/MyPLUGGD app.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase, existing mobile service modules, Apple StoreKit/IAP integration, and read-only web reference from `/Users/apple/PLUGGD_NEW`.

## Source Documents

- Audit: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/docs/PLUGGD_IOS_WEB_SOURCE_AUDIT_2026-05-28.md`
- Apple lockfile: `/Users/apple/pluggd-mobile-workspace/docs/IOS_APPLE_SETUP_LOCKFILE.md`
- App Review notes draft: `/Users/apple/pluggd-mobile-workspace/docs/IOS_APP_REVIEW_NOTES_DRAFT.md`
- Web reference: `/Users/apple/PLUGGD_NEW`
- Native app: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`

## Product Decision

- [x] Treat the web mobile dock as the native source of truth: `Home / Discover / Community / Events / Market`.
- [x] Remove Create from the primary dock and rebuild it as a creator floating action/sheet.
- [x] Remove Profile from the primary dock and keep profile/account access in the avatar account sheet.
- [x] Remove visible `MyPLUGGD` navigation and retire it as a user-facing product label.
- [x] Keep `/live` as a real route/deep link but not a dock tab.
- [x] Preserve all Apple/IAP/backend commerce setup.

If product leadership rejects the web mobile dock and insists on `Home / Explore / Create / Community / Profile`, this plan must be re-baselined. That tab set is not web-source parity.

## Phase 1 - Replace Wrong Contracts First

### Files

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-navigation-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-mypluggd-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-social-web-parity-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-app-wide-web-parity-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/package.json`

### Tasks

- [x] Replace the current navigation contract so it expects the web mobile dock: Home, Discover, Community, Events, Market.
- [x] Allow the label `Explore` only if the route and screen are explicitly mapped to web Discover. Recommended label: `Discover`.
- [x] Remove the contract expectation that Create is a bottom tab.
- [x] Remove the contract expectation that Profile is a bottom tab.
- [x] Add a contract that forbids `MyPLUGGD` in `components/MobileHeader.tsx`, `components/PluggdDock.tsx`, and visible tab labels.
- [x] Add `scripts/verify-mobile-account-menu-web-parity-contract.mjs`.
- [x] Add `scripts/verify-mobile-web-source-truth-contract.mjs`.
- [x] Add `scripts/verify-mobile-web-asset-contract.mjs`.
- [ ] Wire the new scripts into `package.json` if the repo has an aggregate verification command.

### Acceptance

- Running the new contract scripts fails on the current app before implementation.
- The contracts express web parity, not the previous native assumption.

## Phase 2 - Web Asset Parity

### Files

- `/Users/apple/PLUGGD_NEW/public/assets/homepage/homepage-hero.jpeg`
- `/Users/apple/PLUGGD_NEW/public/assets/homepage/homepage-explore-ecosystem.png`
- `/Users/apple/PLUGGD_NEW/public/assets/homepage/homepage-support-section.png`
- `/Users/apple/PLUGGD_NEW/public/assets/discover/paper-panel-card.png`
- `/Users/apple/PLUGGD_NEW/public/assets/discover/paper-panel-wide.png`
- `/Users/apple/PLUGGD_NEW/public/images/pluggd-live-hero.png`
- `/Users/apple/PLUGGD_NEW/public/images/pluggd-events.png`
- `/Users/apple/PLUGGD_NEW/public/images/pluggd-mixes.png`
- `/Users/apple/PLUGGD_NEW/public/newhome2-assets/ai-assets/intimate-crowd-hero.png`
- `/Users/apple/PLUGGD_NEW/public/newhome2-assets/ai-assets/brick-room-show.png`
- `/Users/apple/PLUGGD_NEW/public/newhome2-assets/ai-assets/intimate-vocalist.png`
- `/Users/apple/PLUGGD_NEW/public/newhome2-assets/ai-assets/warm-listening-room.png`
- `/Users/apple/PLUGGD_NEW/public/newhome2-assets/ai-assets/bedroom-studio.png`
- `/Users/apple/PLUGGD_NEW/public/newhome2-assets/phone-assets/*.jpg`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/assets/web-parity/...`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/parity/webAssets.ts`

### Tasks

- [x] Copy only approved non-secret public web assets into `assets/web-parity`.
- [x] Create `src/features/parity/webAssets.ts` with typed `require(...)` mappings.
- [x] Add categories for home, discover, live, events, market, community, and studio/account assets.
- [x] Update the asset contract to ensure native references real bundled artwork, not only gradients.

### Acceptance

- Home and Discover can render with web-derived art before remote content loads.
- No screen relies on fake placeholder counts or fake commerce data.

## Phase 3 - Navigation And Account Reset

### Files

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/components/PluggdDock.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/components/MobileHeader.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/(tabs)/_layout.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/discover.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/events/index.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/market/index.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/my-pluggd.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/backstage/[id].tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/stage.tsx`

### Tasks

- [x] Rebuild `PluggdDock` as Home, Discover, Community, Events, Market.
- [x] Remove Create and Profile from the dock.
- [x] Keep `/live` reachable from header/home/discover/events/profile/deep links, not dock.
- [x] Replace account items with the web account menu model:
  - Studio or Dashboard.
  - My Profile.
  - PLUGGD Progress.
  - Wallet / Earnings or Wallet / Credits.
  - Analytics.
  - Settings.
  - Connect Card for creators.
  - Become a Creator for non-creators.
  - Admin Console when applicable.
  - Sign out.
- [x] Remove visible `MyPLUGGD`.
- [x] Keep Inbox and Notifications as header/activity surfaces, not identity duplicates.
- [x] Implement creator floating action/sheet matching web `MobileCreateButton`.
- [x] Convert `/stage` to a compatibility route for Discover.
- [x] Convert `/my-pluggd` to compatibility routing only.
- [ ] Re-audit `/backstage` and `/backstage/[id]` meanings before final redirects.

### Acceptance

- There is exactly one visible profile/account entry path.
- Create is role-aware and creator-only unless showing Become Creator.
- Web mobile dock parity contract passes.

## Phase 4 - Home Rebuild From `NewHome2`

### Files

- Web source: `/Users/apple/PLUGGD_NEW/src/pages/NewHome2.tsx`
- Native target: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/home/live-music-dashboard-home.tsx`
- Native route: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/(tabs)/index.tsx`

### Tasks

- [ ] Rename the mental model from dashboard home to web Home/front door.
- [ ] Implement artwork-led hero with native search.
- [ ] Implement a native section jump control.
- [ ] Implement realtime ticker.
- [ ] Implement Live strip.
- [ ] Implement Next Wave creator rail.
- [ ] Implement Featured Story.
- [ ] Implement Scene discovery.
- [ ] Implement Soundboards.
- [ ] Implement Events.
- [ ] Implement Drops.
- [ ] Implement Communities.
- [ ] Implement Build/Pulse sections where backed by real data.
- [x] Use web assets and real Supabase data only.

### Acceptance

- Home looks recognisably derived from web `NewHome2`.
- Home is not a feed, profile, wallet, or creator dashboard.

## Phase 5 - Discover Rebuild From Web Discover

### Files

- Web source: `/Users/apple/PLUGGD_NEW/src/pages/Discover.tsx`
- Native target: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/discover/DiscoverScreen.tsx`
- Legacy native source to split/retire: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/stage/stage-discovery-screen.tsx`
- Native route: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/discover.tsx`

### Tasks

- [ ] Build Discover as the canonical native discovery route.
- [ ] Preserve web chips: Music, BeatPlug, Mixes, Creators, Soundboards, Trending, New.
- [ ] Preserve content classes: releases, beats, mixes, events, live rooms, soundboards, scenes, creators, communities.
- [ ] Preserve ticker/curated placement behavior where native data exists.
- [ ] Route `/stage` to Discover as compatibility only.
- [ ] Remove Stage language from visible UI.

### Acceptance

- Discover is a native translation of web Discover, not a renamed Stage page.

## Phase 6 - Community Rebuild From Web Community

### Files

- Web source: `/Users/apple/PLUGGD_NEW/src/pages/Community.tsx`
- Native target: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/community/CommunityScreen.tsx`
- Legacy/native source to split: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/mypluggd/my-pluggd-screen.tsx`
- Legacy/native source to split: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/culture/CultureScreens.tsx`
- Native route: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/community.tsx`

### Tasks

- [ ] Remove Library, Purchases, Wallet, and personal profile concepts from Community.
- [ ] Build feed, stories, composer, who-to-follow, prompt, live-now, community radio, events, boards, contests, crowdfund, THE PLUG, directory, and creator spotlight as real-data modules.
- [ ] Preserve moderation/report states where available.
- [ ] Keep empty states honest when backend support is missing.
- [ ] Retire MyPLUGGD wording from visible UI.

### Acceptance

- Community feels like the web culture hub.
- Account/library features no longer appear as Community sections.

## Phase 7 - Events As A First-Class Tab

### Files

- Web routes: `/Users/apple/PLUGGD_NEW/src/App.tsx`
- Native target: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/events/EventsScreen.tsx`
- Existing native routes:
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/events/index.tsx`
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/events/[id].tsx`

### Tasks

- [ ] Restore Events as a first-class dock destination.
- [ ] Build event discovery/list/calendar views.
- [ ] Polish event detail with RSVP, ticket ownership, promoter/venue links, community thread, live-linked session, and honest external ticketing boundaries.
- [ ] Avoid fake QR codes or fake Apple Wallet claims.

### Acceptance

- Events matches the web dock and no longer feels buried inside Explore/Home.

## Phase 8 - Market As A First-Class Tab

### Files

- Web source: `/Users/apple/PLUGGD_NEW/src/pages/MarketHub.tsx`
- Native target: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/market/MarketScreen.tsx`
- Existing native routes:
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/market/index.tsx`
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/market/[section].tsx`
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/marketplace.tsx`
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/beat-marketplace.tsx`

### Tasks

- [ ] Restore Market as a first-class dock destination.
- [ ] Build BeatPlug flagship section.
- [ ] Add releases, samples, merch, services, licenses, and creator offers sections where supported.
- [ ] Keep App Review-safe commerce boundaries visible in the right places.
- [ ] Route old marketplace paths into Market sections.

### Acceptance

- Market matches web's commercial hub and does not expose unfinished or noncompliant digital checkout flows.

## Phase 9 - Account, Profile, Wallet, Tickets

### Files

- Web account source: `/Users/apple/PLUGGD_NEW/src/components/DomainAwareNavigation.tsx`
- Web dashboard source: `/Users/apple/PLUGGD_NEW/src/components/DashboardRouter.tsx`
- Native account/header: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/components/MobileHeader.tsx`
- Native profile/account: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/profile/my-profile-screen.tsx`
- Native wallet: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/wallet.tsx`
- Native tickets: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/tickets.tsx`

### Tasks

- [ ] Separate public profile from account dashboard.
- [ ] Keep My Profile as one account-menu item.
- [ ] Keep Wallet/Credits reachable from account sheet and purchase/unlock flows.
- [ ] Keep Tickets reachable from account sheet and events.
- [ ] Keep Progress reachable from account sheet.
- [ ] Keep creator Studio reachable from account sheet and floating Create.
- [ ] Remove MyPLUGGD from account/dashboard UI.

### Acceptance

- The user no longer sees two profile-like entries that lead to overlapping places.
- Profile/account matches web semantics.

## Phase 10 - Commerce And Contextual Screens

### Files

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/release/[id].tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/beat/[id].tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/membership/[creatorId].tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/wallet.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/hooks/useCredits.ts`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-commerce-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-wallet-context-contract.mjs`

### Tasks

- [ ] Keep Apple credit product IDs unchanged.
- [ ] Keep subscription product IDs unchanged.
- [ ] Confirm release unlocks use credits.
- [ ] Confirm tips use credits.
- [ ] Confirm memberships use Apple subscriptions.
- [ ] Confirm beat licensing remains professional/off-app where applicable.
- [ ] Confirm event tickets remain external/off-app where applicable.
- [ ] Confirm restore purchases is reachable from Wallet/Membership.

### Acceptance

- Existing Apple/IAP/backend contracts still pass.
- UI is App Review-safe and not pretending unsupported native checkout exists.

## Phase 11 - Visual QA And Finish

### Tasks

- [ ] Run all new source-truth contracts.
- [ ] Run existing Apple/commerce contracts.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx expo-doctor`.
- [ ] Start the Expo dev server.
- [ ] Capture iOS simulator screenshots for Home, Discover, Community, Events, Market, Account sheet, Create sheet, Release detail, Beat detail, Event detail, Wallet, Membership, Tickets, Live.
- [ ] Compare screenshots against web source pages and this audit.
- [ ] Fix visible overlap, generic placeholders, duplicate labels, fake state, and route dead ends.
- [ ] Run a real-device TestFlight pass before App Review.

### Required Verification Commands

```sh
node scripts/verify-ios-apple-lockfile-contract.mjs
node scripts/verify-mobile-web-source-truth-contract.mjs
node scripts/verify-mobile-account-menu-web-parity-contract.mjs
node scripts/verify-mobile-web-asset-contract.mjs
node scripts/verify-mobile-navigation-contract.mjs
node scripts/verify-mobile-commerce-contract.mjs
node scripts/verify-mobile-wallet-context-contract.mjs
npx tsc --noEmit
npx expo-doctor
```

## Stop Conditions

Stop and report before continuing if:

- A required web source route has no native equivalent and the correct fallback is unclear.
- A requested Apple/IAP product ID change appears necessary.
- A dirty file contains unrelated user changes that would need to be overwritten.
- The product owner explicitly decides to keep `Home / Explore / Create / Community / Profile`; that is a different product contract from web mobile parity.
