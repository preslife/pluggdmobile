# PLUGGD iOS Web Source Audit - 2026-05-28

## Verdict

The current native app is not yet aligned with the PLUGGD web app as the source of truth. The most recent native pass improved styling and renamed the dock, but it did not resolve the deeper product architecture drift:

- Native still has a bottom-tab model that differs from the web mobile app.
- Native still exposes both `My Profile` and `MyPLUGGD` from the account sheet, even though the web account menu has no `MyPLUGGD` entry.
- Native still treats Create and Profile as primary bottom-tab destinations, while the web app treats Create as a creator floating action and Profile as an account-menu/public-profile route.
- Native screens are still generic app surfaces in several places instead of mobile translations of the web pages, routes, assets, and section hierarchy.
- Several verification scripts now encode the drift, so they can pass while the product is still wrong.

The fix should not be another visual polish pass. It should be a web-source realignment pass.

## Sources Audited

Web reference, read-only:

- `/Users/apple/PLUGGD_NEW/src/App.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/DomainAwareNavigation.tsx`
- `/Users/apple/PLUGGD_NEW/src/components/navigation/MobileBottomTabBar.tsx`
- `/Users/apple/PLUGGD_NEW/src/pages/NewHome2.tsx`
- `/Users/apple/PLUGGD_NEW/src/pages/Discover.tsx`
- `/Users/apple/PLUGGD_NEW/src/pages/Community.tsx`
- `/Users/apple/PLUGGD_NEW/src/pages/MarketHub.tsx`
- `/Users/apple/PLUGGD_NEW/src/pages/Wallet.tsx`
- `/Users/apple/PLUGGD_NEW/public/...`

Native app:

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/components/PluggdDock.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/components/MobileHeader.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/(tabs)/_layout.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/culture/CultureScreens.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/home/live-music-dashboard-home.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/stage/stage-discovery-screen.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/mypluggd/my-pluggd-screen.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/profile/my-profile-screen.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-navigation-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-mypluggd-contract.mjs`

## Web Source Of Truth

### Web Mobile Dock

The committed web mobile dock in `MobileBottomTabBar.tsx` is:

- Home: `/`
- Discover: `/discover`
- Community: `/community`
- Events: `/events`
- Market: `/market`

The web mobile dock does not include Create, Profile, Live, MyPLUGGD, Wallet, or Search as primary tabs. It hides itself on the live domain/live routes.

This is the strongest source-of-truth signal for the iOS bottom navigation.

### Web Top Navigation

The web hub navigation in `DomainAwareNavigation.tsx` is:

- Discover, with dropdown items for Music, THE PLUG, Mixes, Creators, Soundboards, Trending, and New on PLUGGD.
- Community.
- Events.
- Market, with dropdown items for BeatPlug, Releases, Samples, Merch, Services, Licenses, and Creator Offers.
- Live, as a route/domain jump, not a mobile dock item.
- Optional Academy behind a feature flag.

Native Explore should be web Discover if the label remains Explore. Native Market should exist as a first-class destination if the web source wins.

### Web Account Menu

The web account menu is role-aware and contains:

- `Studio` for creator accounts, otherwise `Dashboard`.
- `My Profile`, routed to `/creator/:username` for creator accounts or `/u/:username` for fan accounts, with `/dashboard` fallback.
- `PLUGGD Progress`.
- `Wallet / Earnings` for creators, or `Wallet / Credits` for fans.
- `Analytics`.
- `Settings`.
- Theme switch.
- `Connect Card` for creator accounts.
- `Become a Creator` for non-creator accounts.
- `Admin Console` when applicable.
- `Sign out`.

There is no `MyPLUGGD` account-menu entry on web.

### Web Create Model

The web mobile app has `MobileCreateButton`, not a Create bottom tab. It appears for creator accounts and exposes:

- Upload Release.
- Upload Beat.
- Upload Mix.
- Create Soundboard.
- Create Event.
- Start Live.
- Go to Studio.

Native Create should be a role-aware floating action/sheet, not a primary dock destination, if the iOS app is following web.

### Web Home

The web Home source is `NewHome2.tsx`, not a generic dashboard.

Important source sections and behaviors:

- Artwork-led hero with search.
- Section jump drawer.
- Realtime ticker.
- Live strip.
- Next wave creator grid.
- Featured story.
- Scene discovery.
- Soundboards.
- Events.
- Drops.
- Communities.
- Build your world.
- Pulse.

The web page uses real data loaders and real visual assets from `public/newhome2-assets`, `public/assets/homepage`, and `public/images`.

### Web Discover

The web Discover page is a content discovery system, not a renamed Stage tab. It includes:

- Releases.
- BeatPlug/beats.
- Mixes.
- Creators.
- Soundboards.
- Trending.
- New content.
- Events.
- Live rooms.
- Scene signals.
- Discover ticker and curated placements.

Native Discover/Explore must preserve this structure and route map. It should not be a generic search grid.

### Web Community

The web Community page is a social/culture hub:

- Social feed.
- Stories rail.
- Composer.
- Who to follow.
- Community left rail and bottom dock.
- Announcements.
- Community prompt.
- Live now.
- Community radio.
- Nearby events.
- Boards.
- Contests.
- Crowdfund.
- THE PLUG.
- Directory.
- Events calendar.
- Creator spotlight.

Native Community should not be the user's personal account/library/profile hub. Library, purchases, wallet, saved items, and profile settings belong in account/dashboard surfaces.

### Web Market

The web Market page is the commercial hub:

- BeatPlug flagship.
- Releases.
- Samples.
- Merch.
- Services.
- Licenses.
- Creator Offers.

On iOS, Market must keep App Review boundaries:

- Digital in-app credits and unlocks go through Apple IAP credits.
- Beat licensing is framed as professional/off-app licensing.
- Event tickets are external/off-app where applicable.
- Creator payouts remain Stripe Connect.

Market should be visible as a first-class destination if native follows the web mobile dock.

### Web Events

Events are a first-class web mobile dock destination. Native should not bury Events under Explore or Home if the app is meant to mirror the web mobile product.

Events should cover:

- Event discovery.
- Event detail.
- RSVP/ticket ownership.
- Venue/promoter profile links.
- Live-linked events.
- Community threads around events.

## Native Drift

### 1. Bottom Navigation Drift

Native currently enforces:

- Home
- Explore
- Create
- Community
- Profile

This conflicts with the web mobile dock:

- Home
- Discover
- Community
- Events
- Market

The previous "locked" native tab plan conflicts with the later and stronger instruction to use the web app as the source of truth. This must be resolved explicitly. The recommended resolution is: web source wins.

### 2. Account Menu Duplication

Native `MobileHeader.tsx` currently includes both:

- `My Profile` -> `/profile`
- `MyPLUGGD` -> `/my-pluggd`

This directly violates the web account model and creates the duplicated destination problem the user reported. `MyPLUGGD` should be retired as an account-menu label and product concept unless there is a new approved web source for it.

### 3. Create Is In The Wrong Place

Native Create is a bottom tab. Web Create is a role-aware floating create button for creators. Native should follow the web:

- Creator accounts see a create action button/sheet.
- Fan accounts see no fake creator controls; they can see Become a Creator from the account sheet.
- Heavy studio actions route to Studio only where native support exists or are labelled as web handoffs.

### 4. Profile Is In The Wrong Place

Native Profile is a bottom tab. Web Profile is reached through account/public profile routes. The web bottom dock treats profile/username routes as Home-active, not as a Profile tab.

Native should separate:

- Public profile route: `/creator/:username`, `/u/:username`, `/profile/:id`.
- Account dashboard sheet/routes: profile, wallet, tickets, settings, saved, orders, progress.

### 5. Community Owns Too Much Account State

Native Community/MyPLUGGD currently mixes feed, circles, library, and activity. The web Community page is a culture/social hub. Library and account activity should not live inside the Community tab.

### 6. Visual Asset Gap

The web app has a strong artwork-led visual language, but the native app only has a small brand asset set. Web assets that should drive the native look include:

- `assets/homepage/homepage-hero.jpeg`
- `assets/homepage/homepage-explore-ecosystem.png`
- `assets/homepage/homepage-support-section.png`
- `assets/discover/paper-panel-card.png`
- `assets/discover/paper-panel-wide.png`
- `images/pluggd-live-hero.png`
- `images/pluggd-events.png`
- `images/pluggd-mixes.png`
- `newhome2-assets/ai-assets/intimate-crowd-hero.png`
- `newhome2-assets/ai-assets/brick-room-show.png`
- `newhome2-assets/ai-assets/intimate-vocalist.png`
- `newhome2-assets/ai-assets/warm-listening-room.png`
- `newhome2-assets/ai-assets/bedroom-studio.png`
- `newhome2-assets/phone-assets/*.jpg`

The native app will keep feeling generic until these assets, or an approved native equivalent asset manifest, are used.

### 7. Verification Scripts Encode The Wrong Product

Some native scripts currently enforce the drift:

- `scripts/verify-mobile-navigation-contract.mjs` requires Home, Explore, Create, Community, Profile.
- `scripts/verify-mobile-mypluggd-contract.mjs` preserves MyPLUGGD semantics.
- Social parity checks still mention MyPLUGGD as the destination for stories/feed/composer.

These contracts must be replaced or they will keep approving the wrong app.

## Recommended Product Decision

Use the web mobile app as source of truth:

- Native dock: `Home / Discover / Community / Events / Market`.
- Native Create: floating creator action/sheet, not a tab.
- Native Profile: account sheet/public profile route, not a tab.
- Native Live: real route/deep link and surfaced in Home, Discover, Events, Community, notifications, and creator profiles, not a dock tab.
- Retire `MyPLUGGD` as visible navigation. Redirect old `/my-pluggd` links based on the destination being requested, but do not show it as a user-facing concept.

If the previous native contract `Home / Explore / Create / Community / Profile` is still required, that should be treated as an intentional product divergence from web. It should not be described as web-source parity.

## Route Compatibility Notes

- `/stage` should redirect to `/discover` or `/explore` only if Explore is the native label for Discover.
- `/discover` should become the canonical native route for web parity.
- `/live` must remain a real route/deep link.
- `/backstage/[id]` should resolve to a community/hub detail when the ID maps to a community. Do not reintroduce Backstage as a tab.
- `/backstage` should not be blindly mapped to Community or Studio until the old route meaning is inspected. Creator/admin uses should route to Studio/Create actions; public social/community uses should route to Community.
- `/my-pluggd` should remain only as a compatibility redirect while visible UI moves to Community, account dashboard, or public profile as appropriate.

## Non-Negotiables

- Do not reset Apple Developer, App Store Connect, StoreKit, IAP products, subscription groups, or Supabase Apple commerce infrastructure.
- Do not rename IAP product IDs.
- Do not remove `docs/IOS_APPLE_SETUP_LOCKFILE.md`.
- Do not fake counts, fake avatars, fake ticket codes, fake live state, or fake purchase state.
- Do not keep contracts that pass while the app violates the web source of truth.
