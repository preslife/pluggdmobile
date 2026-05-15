# PLUGGD iOS Consumer-First Rebuild Tasks

Date: 2026-05-14

Primary repo: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`
Read-only reference repo: `/Users/apple/PLUGGD_NEW`

## Goal

Rebuild the existing PLUGGD iOS app into a premium consumer-first music culture platform while preserving working iOS/native setup, Supabase auth/data, launch access, StoreKit/IAP credits, wallet, playback, live, events, and media integrations.

Decision: do not restart from scratch. Preserve the working engine, replace the product shell.

## Current State To Preserve

- [x] Existing Expo SDK 54 / React Native app is real and buildable.
- [x] iOS native workspace exists with bundle id `com.pluggd.mobile`.
- [x] Supabase client, auth/session provider, access-code gate, and storage layer exist.
- [x] TrackPlayer playback provider and mini-player exist.
- [x] Apple IAP credit packs exist for the four approved products.
- [x] Wallet/credit ledger hooks exist.
- [x] Agora live token helper exists.
- [x] Current app has too many old tabs/routes and still feels like a web/dashboard product.

## Product Rules

- Primary bottom nav is exactly: Home, Stage, Live, Backstage, Search.
- Wallet, profile, create, marketplace, uploads, analytics, and dashboards are not bottom-nav items.
- Creator tools live behind Creator Mode from the avatar menu.
- Events and ticketing are a growth layer woven through the app, not a sixth bottom tab.
- Digital credit purchases on iOS use Apple IAP only.
- No fake data, fake CTAs, or unsupported checkout flows should appear complete.
- `/Users/apple/PLUGGD_NEW` remains read-only reference only.

## Migration Map

Main mobile app:
- Home feed, Stage, Live, Backstage, Search.
- Release/music playback.
- Creator public profiles.
- Event discovery/cards/details.
- Ticket storage/status where backend supports it.
- Wallet credits and purchases.
- Social posting/engagement where backend supports it.

Mobile Creator Mode:
- Go Live, Create Post, Upload Clip, Post Announcement, Create Thread.
- Ticket scanning for promoter/event roles if supported.
- Lightweight creator activity pulse.
- Basic content/community moderation where backend supports it.

Desktop/web Creator Studio only:
- Distribution, ISRC/UPC, DSP delivery.
- Detailed release metadata and scheduling.
- Deep analytics, payout routing, tax, invoices.
- Merch inventory and fulfilment.
- Beat/stem marketplace management.
- CRM, automation, integrations, advanced team permissions.

Deferred unless backend is confirmed ready:
- Public fan livestreaming.
- Apple Wallet tickets.
- Friend attendance graph.
- Device location intelligence.
- Advanced live co-host controls.
- Deep recommendation algorithms.

## Execution Checklist

### Phase 0 - Task Control And Safety

- [x] Create this task document.
- [x] Copy the implementation checklist into this doc.
- [x] Confirm `/Users/apple/PLUGGD_NEW` is clean before implementation.
- [x] Run baseline checks: TypeScript, existing contract scripts, Expo Doctor, iOS build/run where feasible.
- [x] Update this doc after each completed major phase.

### Phase 1 - Audit Refresh

- [x] Inventory current routes and classify each as keep, move, defer, or remove from primary nav.
- [x] Inventory current API hooks/services for auth, playback, wallet, IAP, events, live, social, communities, search.
- [x] Identify fake/static/demo data and add/update contract checks blocking it.
- [x] Record backend/API gaps for Backstage, tickets, search, live rooms, and feed attachments.

### Phase 2 - Premium Design Foundation

- [x] Lock v1 to dark-first premium styling: `#080808`, `#0B0B0B`, `#151515`, `#262626`, `#FF5200`.
- [x] Refactor shared primitives for cards, media cards, feed cards, event cards, live cards, thread cards, avatar rows, chips, sheets, and empty states.
- [x] Remove visible theme toggle from primary UX for v1.
- [x] Use orange only for active nav, key CTAs, live/ticket/player highlights.
- [x] Replace dashboard-like layouts with compact cinematic/social mobile layouts.

### Phase 3 - App Shell Rebuild

- [x] Replace current dock tabs with exactly Home, Stage, Live, Backstage, Search.
- [x] Remove floating Create button from the global fan shell.
- [x] Rebuild `MobileHeader` around logo/search/avatar only.
- [x] Rebuild avatar menu with My Profile, Wallet, Library, Purchases, Tickets, Badges/Rewards, Saved, Following, Creator Mode if eligible, Settings, Sign out.
- [x] Preserve auth gating and session behavior.
- [x] Ensure mini-player survives all tab changes and does not restart playback.

### Phase 4 - Persistent Player

- [x] Upgrade mini-player visual design with artwork, title, creator, play/pause, progress, and compact Backstage shortcut.
- [x] Build full player with artwork/video, queue, creator link, save, share, comments/community shortcut, related releases/events.
- [x] Keep current TrackPlayer provider as playback source of truth.
- [x] Ensure navigation does not call `reset()` unless a new track/queue is intentionally selected.

### Phase 5 - Home

- [x] Rebuild Home as the daily music-culture feed.
- [x] Add For You / Following / Backstage segmented filter.
- [x] Render real social posts with avatar, name, handle, timestamp, text, media, embedded release/event/community where available.
- [x] Add playable music embeds wired to the global player.
- [x] Add event cards, live alert cards, release cards, community highlights.
- [x] Empty state: "Follow creators to shape your feed."
- [x] Do not show creator admin tools on Home.

### Phase 6 - Stage

- [x] Rebuild Stage as media-led music discovery.
- [x] Add filters: For You, Releases, Mixes, Videos, Playlists.
- [x] Use large cinematic media cards, not file-list rows.
- [x] Wire play/save/share/creator/profile/backstage actions.
- [x] Surface event ties when real event data exists.
- [x] Ship large-card vertical discovery first.
- [x] Empty state: "Your sound is loading. Explore trending creators."

### Phase 7 - Live

- [x] Rebuild Live around verified/approved creator livestreams.
- [x] Sections: Live Now, Upcoming Lives, Replays/Clips.
- [x] Preserve Agora token integration.
- [x] Add live cards with creator avatar, live ring, title, real viewer count when available, category, Join CTA.
- [x] Live room: full-screen video, chat overlay, follow, gift if supported, Backstage button, share, report.
- [x] Keep creator live controls inside Creator Mode.
- [x] Empty state: "No one is live right now. See upcoming sessions."

### Phase 8 - Backstage

- [x] Rebuild Backstage as creator-owned communities.
- [x] Landing: followed communities, trending communities, active discussions, live rooms, recommended communities.
- [x] Community page: banner, avatar, verified badge, real counts where available, join/follow, tabs Posts / Threads / Live Rooms / Events / Drops.
- [x] Thread cards: category, title, author, timestamp, likes/upvotes, comments, pinned/locked status.
- [x] Connect track/live/event/creator profile flows into Backstage.
- [x] Empty state: "Join creator communities to enter the conversation."

### Phase 9 - Search

- [x] Rebuild Search as a primary tab.
- [x] Add prominent search bar, recent/trending searches, category chips.
- [x] Result groups: Top, Creators, Tracks, Mixes, Videos, Events, Communities, Users.
- [x] Include events as a major vertical.
- [x] Use real Supabase queries first; no fake search results.
- [x] Empty state: "Search artists, tracks, events, communities and fans."

### Phase 10 - Events And Ticketing Layer

- [x] Add reusable event card used across Home, Stage, Live, Backstage, Search.
- [x] Event detail: image, title, date/time, venue/city, lineup/creator, ticket status, RSVP/save, discussion thread.
- [x] Wallet ticket screen: event image, venue, date/time, ticket type, QR/code only if backend supports it.
- [x] If native ticket purchasing is not confirmed, show save/reminder/status instead of fake checkout.
- [x] Add event discussion/fan meetup thread entry points in Backstage.
- [x] Do not make Events a sixth bottom tab.

### Phase 11 - Wallet Contextual Access

- [x] Keep wallet out of bottom nav.
- [x] Rebuild Wallet as Apple-like secure surface for credits, tickets, purchases, rewards, badges, unlockables.
- [x] Preserve IAP credit packs exactly: `pluggd_credits_popular`, `pluggd_credits_value`, `pluggd_credits_premium`, `pluggd_credits_ultimate`.
- [x] Preserve 100 credits = GBP 1 model.
- [x] Preserve Apple IAP for digital credit purchases.
- [x] Block external checkout for iOS digital goods.

### Phase 12 - Creator Mode

- [x] Add `Creator Mode` route accessible only from avatar menu for creator/promoter/venue roles.
- [x] Quick actions: Go Live, Create Post, Upload Clip, Start Listening Party, Create Thread, Post Announcement, Scan Tickets if promoter/event role, Reply to Fans.
- [x] Activity hub: followers, mentions, comments, reposts, community activity, live activity, ticket summary, latest purchases, gifts.
- [x] Content controls: edit/delete/pin posts, manage comments, feature release/event/live/thread.
- [x] Community controls only where backend supports moderation.
- [x] Do not expose deep analytics, payout management, distribution, tax, CRM, or inventory management.

### Phase 13 - Verification And Polish

- [x] Run contract checks after each major phase.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npx expo-doctor`.
- [x] Run iOS simulator build and launch.
- [x] Capture screenshots for Home, Stage, Live, Backstage, Search, Player, Wallet, Creator Mode.
- [ ] Test logged-out, fan, creator, and promoter/venue role paths.
- [x] Verify no fake data, no broken CTAs, no creator admin pollution in fan UI.
- [x] Verify `/Users/apple/PLUGGD_NEW` has no file changes.

## Running Notes

- 2026-05-14: Task document created. `/Users/apple/PLUGGD_NEW` checked clean before implementation.
- 2026-05-14: Baseline checks passed: TypeScript, Expo Doctor, and existing mobile contract scripts.
- 2026-05-14: Added shared culture data/hooks and rebuilt the primary shell around Home, Stage, Live, Backstage, and Search.
- 2026-05-14: Added/updated contract scripts for culture shell, player persistence, wallet contextual access, route coverage, and new navigation.
- 2026-05-14: TypeScript and contract checks pass after the consumer-first shell rebuild.
- 2026-05-14: Native iOS simulator build/run succeeded through XcodeBuildMCP on iPhone 17. Captured simulator previews for Home, Stage, Live, Backstage, Search, and logged-out auth state.
- 2026-05-14: `/Users/apple/PLUGGD_NEW` verified clean after implementation.
- 2026-05-14: Corrective design pass after simulator review: tightened top spacing, replaced plain vertical discovery lists with horizontal rails, reduced oversized Stage media cards, added richer event/release/community/creator tiles, and changed the bottom navigation into a floating premium dock. TypeScript and mobile contract checks passed after this pass.
- 2026-05-14: Relaunched the redesigned app on the iPhone 17 simulator. Final screenshot spot checks confirmed Home and Stage render with compact headers, horizontal rails, constrained media cards, and the floating dock. `/Users/apple/PLUGGD_NEW` remained clean.
- 2026-05-14: Direction pivot accepted from the Cyber-Underground Noir / Digital Backstage Pass brief. Updated the main nav target to Feed, Stage, Create, Wallet, Profile; rebuilt Home as a full-bleed social timeline with 60px header and 44px tab strip; rebuilt Stage as a full-viewport vertical loop surface with right-side controls and waveform; updated Search category chips to be stateful; updated contracts to reflect the new nav model. TypeScript and contract checks passed after the pivot.
- 2026-05-14: Homepage-only corrective pass from the supplied Live Music Dashboard mockup. Replaced the old Home route with a dedicated premium dashboard screen: cinematic live hero, horizontal Live Now and Events rails, audio drop rows, Backstage Buzz, creator reel, orange CTA system, wallet/avatar header, and fixed Home/Stage/Live/Backstage/Search bottom nav. Focused Home, navigation, player contracts, TypeScript, Expo Doctor, and iPhone 17 simulator build/run passed. Current `/Users/apple/PLUGGD_NEW` status shows unrelated existing changes; it was not modified during this pass.
- 2026-05-14: Wired the Live Music Dashboard homepage to real Supabase data. Home now uses `useHomeFeed`, `useLiveRooms`, and `useBackstage`; release/mix rows call `toTrack()` and start the global `PlaybackProvider`; events use live `events` rows; Backstage Buzz uses real social/community thread data; recommended creators use public profile rows where available and real release artists otherwise. Confirmed current backend uses `social_posts.content`/`title` and `profiles.full_name`/`username`, not `social_posts.body` or `profiles.display_name`; no schema changes were made. Smoke query passed for releases, events, session rooms, and social posts. TypeScript, Home/navigation contracts, Expo Doctor, iPhone 17 simulator launch, scroll check, and play-to-mini-player check passed.
- 2026-05-14: Stage-page corrective pass started from the supplied Stage mockup. Replaced the old `CultureScreens` Stage export with a dedicated premium Stage screen using real `useHomeFeed`, `useLiveRooms`, `toTrack`, and `PlaybackProvider` data paths; added cinematic hero, wired filter pills, horizontal trending shelf, live sessions, lower-priority producer rows, open-verse challenge mapping from real social posts, and recommended creators from profile/release/beat data. Adjusted app chrome so Stage owns its header while the global mini-player still appears when media is active. Added `verify-mobile-stage-contract.mjs`.
- 2026-05-14: Stage-page verification passed after simulator review. Fixed the iPhone safe-area header clipping and disabled the React Native dev perf monitor overlay in dev builds so screenshots reflect the actual UI. Confirmed Stage renders real Supabase release data, horizontal shelves, no fake mockup artist names, wired filter pills, hero play/pause, and global mini-player persistence. Checks passed: `verify-mobile-stage-contract.mjs`, `verify-mobile-home-contract.mjs`, `npx tsc --noEmit`, and `npx expo-doctor`. Simulator screenshot: `/var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_f9c1aa54-0b56-4633-be6e-cb54e37f8003.jpg`.
- 2026-05-14: Live-page corrective pass started from the supplied Live mockup. Replaced the old `CultureScreens` Live export with a dedicated `LiveCultureScreen` using real `useLiveRooms`, `useEventLayer`, `useBackstage`, `useHomeFeed`, and `PlaybackProvider` paths. Added premium LIVE header, notification/wallet/avatar actions, wired filter pills, featured live hero, Live Now shelf, upcoming live events/reminders, community live rooms, replays/clips, and featured live creators. Kept `/live/session` intact and added `verify-mobile-live-contract.mjs`.
- 2026-05-14: Live-page verification passed. Confirmed the simulator renders the new LIVE header without global-header duplication, real event-backed hero, wired filters, upcoming live event cards, community rooms, replays empty state, featured live creators, and active Live bottom nav. Checks passed: `verify-mobile-live-contract.mjs`, `verify-mobile-stage-contract.mjs`, `verify-mobile-navigation-contract.mjs`, `npx tsc --noEmit`, and `npx expo-doctor`. Simulator screenshots: top `/var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_ab27486c-1dfd-4511-aa79-aedbefb69c57.jpg`, scrolled `/var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_efc4bd87-6965-4129-b098-5d0115cbc14f.jpg`.
- 2026-05-14: Backstage-page corrective pass started from the supplied Backstage mockup. Replaced the old shared `CultureScreens` Backstage export with a dedicated `BackstageWorldScreen` using real `useBackstage`, `useEventLayer`, `useHomeFeed`, and `useLiveRooms` data. The new structure leads with My Backstage circles, then event hubs/ticket thread actions, community rooms, hot threads, producer lounge, community moments, and discover-more Backstages. Added filter pills that scroll to the relevant section, notification/wallet/avatar actions, and `verify-mobile-backstage-contract.mjs`. Updated app chrome so Backstage owns its own header while preserving the global mini-player/dock.
- 2026-05-14: Backstage-page verification passed. Confirmed the simulator renders the new BACKSTAGE header without global-header duplication, My Backstage circles, stacked event hub/ticket-thread cards, active community rooms, hot threads, producer lounge cards, and active Backstage bottom nav. Checks passed: `verify-mobile-backstage-contract.mjs`, `verify-mobile-stage-contract.mjs`, `verify-mobile-live-contract.mjs`, `verify-mobile-navigation-contract.mjs`, `npx tsc --noEmit`, and `npx expo-doctor`. Simulator screenshots: top `/var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_8c9b1aff-fbbf-4307-b110-63f1467a97ac.jpg`, event hubs `/var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_db0cf361-c42e-4dad-948c-f909711efd22.jpg`, rooms/threads `/var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_64801f11-bc7f-4c22-bfa0-27a12b58db33.jpg`, producer lounge `/var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_0fef3b4f-f43d-442c-8e5b-7b98c65d46db.jpg`.
- 2026-05-14: Data-map correction pass after review. Verified the current web repo uses `hubs`, `hub_sections`, `hub_items`, `view_hub_threads`, `communityBoards.ts`, `event_rsvps`, `event_tickets`, `session_rooms`, `live_sessions`, `videos`, `playlists`, `beats`, `events`, `releases`, and `profiles`. Updated mobile Backstage/Search data hooks away from old guessed `creator_communities` / `community_threads` sources and toward current `hubs` + `view_hub_threads`. Removed the soundboard/social-post fallback for Backstage communities/threads so missing backend surfaces become empty states instead of disguised fake community data. Event hub ticket labels now use actual ticket/thread signals rather than marking every event as “Ticket thread active.”
- 2026-05-14: Search-page corrective pass started. Replaced the old shared `CultureScreens` Search export with a dedicated `SearchDiscoveryScreen`: SEARCH-owned header, premium universal search input, stateful category pills, real discovery lanes for events/live/sounds/producers/communities/creators, and grouped typed results for creators, tracks, mixes, videos, events, communities, users, beats, and live streams. Search uses `useUniversalSearch`, `useHomeFeed`, `useEventLayer`, `useBackstage`, `useLiveRooms`, and the global playback provider; no fake data is introduced. Added `verify-mobile-search-contract.mjs` and updated app chrome so Search owns its own header.
- 2026-05-14: Action/data wiring pass. Replaced hardcoded fan onboarding creator suggestions with real `profiles` queries and persisted selected follows into `user_follows`; removed visible Apple/Google auth buttons until OAuth is wired; connected forgot-password to Supabase reset email; wired sample-pack free claims to `sample_pack_purchases` and paid packs to Wallet/credits instead of external checkout; wired soundboard follow to the board creator through `user_follows`; added full-player share/save actions; redirected stale/deferred social, gamification, commerce, pro, and heavy creator routes into the consumer shell, Wallet, Purchases, Live, Backstage, or Creator Mode. Added `verify-mobile-action-wiring-contract.mjs` to block missing `onPress` controls and fake onboarding data.
- 2026-05-14: World-class gap audit completed against the original consumer-first rebuild plan, page-specific mockup briefs, data map, and current route/data implementation. Created `docs/PLUGGD_IOS_WORLD_CLASS_GAP_REPORT_2026-05-14.md`. Found and fixed a notification redirect loop by replacing `/notifications` with a real Supabase-backed Activity screen using `notifications_list_recent`, `notifications_mark_read`, and `notifications_mark_all_read`. Checks passed after the fix: `npx tsc --noEmit` and `verify-mobile-action-wiring-contract.mjs`.
- 2026-05-14: Gap-completion implementation pass. Verified live Supabase availability for `communities`, `community_members`, `community_events`, `community_event_rsvps`, `event_comments`, `event_tickets`, `ticket_orders`, `hubs`, `hub_sections`, `hub_items`, `view_hub_threads`, `social_posts`, `comments`, `likes`, `favorites`, `wallet_ledger`, `notifications`, `session_rooms`, `live_sessions`, `playlists`, `videos`, `beats`, `release_purchases`, `sample_pack_purchases`, `user_follows`, `community_collab_rooms`, and `community_challenges`. Supabase type regeneration was attempted but blocked by missing CLI access token, so newer live tables are wrapped through typed mobile service models.
- 2026-05-14: Added the shared mobile service/type/capability layer under `src/features/culture`: capability map, typed Backstage/event/social/saved/live/wallet models, `loadBackstageOverview`, `loadBackstageDetail`, `joinBackstage`, `leaveBackstage`, `loadEventDetail`, `setEventRsvp`, `addEventComment`, `loadWalletTickets`, `loadLibraryBundle`, `toggleSavedContent`, `loadPostDetail`, `toggleLike`, `addComment`, `loadCreatorModePulse`, and notification count support.
- 2026-05-14: Completed the next wiring pass from the gap plan. Backstage detail now has real Posts / Threads / Live Rooms / Events / Drops tabs and persisted join/leave. Event detail now uses real RSVP, event comments, ticket/order status and QR only from real `ticket_orders.qr_code_data`. Tickets, Library, Saved and Wallet Vault now read account-owned tickets/purchases/saved beats instead of generic catalogs. Post detail now supports real like/comment mutations. Stage and Player save actions use the shared save service and clearly report unsupported non-beat saved states rather than pretending persistence exists.
- 2026-05-14: Updated contract coverage for the gap-completion pass: route-loop, capability-map, gap-wiring, service-backed culture/backstage contracts, and existing mobile route/navigation/home/stage/live/search/commerce/action/player/wallet contracts. Checks passed: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, and `npx expo-doctor` (`17/17` checks).
- 2026-05-15: Completed a second gap-wiring pass. Verified the live backend `favorites` table supports `beat_id` and `release_id` only; updated Library, Saved, Stage, and full Player so release saves now persist through the shared service and unsupported save types do not pretend to complete. Verified current `social_posts` uses `content`/`title`, not `body`; added `/create-post` as a real Supabase-backed composer for posts, announcements, and Backstage thread-style posts.
- 2026-05-15: Wired event reminder buttons to real `event_rsvps` status through `setEventReminder`. At this checkpoint, live-room-only reminders were still blocked by `live_session_reminders.session_id`; that blocker was superseded later by the room-keyed reminder contract. Updated notification deep links for live/room/session notifications to route with `roomId`.
- 2026-05-15: Added Activity/unread access from the avatar menu, routed stale social notification/inbox paths to the real `/notifications` screen, and moved legacy Creator/Studio/Profile shortcuts into the consumer shell (`/creator-mode`, `/create-post`, `/notifications`) instead of old dashboard routes. Creator Mode quick actions now either open real mobile routes or show a clear unavailable state for backend-missing actions like clip upload.
- 2026-05-15: Verification passed after the second gap-wiring pass: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, `npx expo-doctor` (`17/17` checks), and `npx expo run:ios --device "iPhone 17"` build/install/launch. The iOS command built `Pluggd.app` successfully with 0 errors and launched `com.pluggd.mobile` on the iPhone 17 simulator.
- 2026-05-15: Checked `/Users/apple/PLUGGD_NEW` status after the pass. It contains unrelated pre-existing dirty files, but this mobile pass did not edit or write to the reference repo.
- 2026-05-15: Completed backend/product blocker pass before screenshot QA. Live schema probes confirmed there is no generic `saved_items`, `user_saves`, or `saved_content` table; `favorites` supports only `beat_id` and `release_id`; `live_session_reminders` is keyed to `session_id`, not `session_rooms.room_id`; `ticket_orders` contains `qr_code_data` and `checked_in_at`; current mobile push token tables are missing; `videos` is YouTube/thumbnail based and there are no confirmed `media_assets` or `upload_sessions` upload tables.
- 2026-05-15: Expanded saved/library persistence without inventing a generic save table. `toggleSavedContent` now persists beats/releases through `favorites`, events through `event_rsvps`, Backstage communities through `community_members`, and creator follows through `user_follows`. Unsupported save classes still return a clear backend-contract message instead of fake success.
- 2026-05-15: Fixed the live reminder mismatch by separating joinable `session_rooms` from scheduled `sessions`. The Live tab now routes only joinable `session_rooms` to `/live/session`; scheduled session reminders persist through `live_session_reminders.session_id`; non-joinable live rows explain that a session room must be created before joining.
- 2026-05-15: Added `/ticket-scan` as a real backend-backed manual QR payload checker for promoter/event roles. It reads `ticket_orders.qr_code_data`, displays event/order status, and attempts a real check-in update to `ticket_orders.checked_in_at`; native camera scanning was added in the follow-up camera pass.
- 2026-05-15: Added a real live-room report path in `/live/session` using `content_reports` by reporting the host profile with the live room id in the moderation description. Advanced moderation beyond report/gift/stage-request foundations still needs explicit backend contracts.
- 2026-05-15: Verification passed after the backend/product blocker pass: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, and `npx expo-doctor` (`17/17` checks).
- 2026-05-15: Continued the next app-side pass without waiting for a new prompt. Added `expo-camera` and upgraded `/ticket-scan` from manual-only payload entry to native QR scanning with camera permission handling and manual fallback. The scanner verifies and checks in through real `ticket_orders.qr_code_data` / `checked_in_at`; dynamic QR token generation was added later, while Apple Wallet passes remain external PassKit/signing work.
- 2026-05-15: Native iOS build/install/launch passed after adding the camera module. `npx expo run:ios --device "iPhone 17"` installed CocoaPods, compiled `ExpoCamera` and `ZXingObjC`, built `Pluggd.app` with 0 errors and 1 duplicate-library linker warning, installed, and launched `com.pluggd.mobile`.
- 2026-05-15: Simulator screenshot QA pass captured primary/contextual screens into `artifacts/screenshots/ios-qa-2026-05-15`: Home, Stage, Live, Backstage, Search, Player, Wallet, Creator Mode, Ticket Scan, Tickets, Activity, and Library.
- 2026-05-15: Screenshot QA found two app-side defects and both were fixed. Wallet credit packs no longer display non-GBP sandbox StoreKit prices; the UI falls back to the approved GBP labels unless StoreKit returns GBP. Stage media CTAs now use playable URL detection and show `Open` for non-playable items instead of presenting a misleading Play action.
- 2026-05-15: Logged-out/public role-path QA pass completed. Verified login screen, public Home/Stage/Live/Backstage/Search access, account-gated ticket scanner state, empty account-owned Tickets/Activity/Library states, contextual Wallet access, and Creator Mode fan/account-inactive messaging. Signed-in fan/creator/promoter QA still needs real account credentials and role permissions.
- 2026-05-15: Cleaned up legacy accent tokens. Shared `PLUGGD_ORANGE` constants now use `#FF5A00`, the auth screen refresh shows orange-first styling, and a culture contract blocks the old emerald/violet primary accent from returning to the main mobile shell.
- 2026-05-15: Continued the completion pass after the checkpoint. Added native local notification scheduling for event and scheduled-live reminders using `expo-notifications`, `AsyncStorage`, and app deep links. Root layout now configures notification display and tap handling. Live reminder actions and Event detail RSVP actions persist backend state first, then schedule/cancel local reminders when a future start time exists. Backend push-token delivery remains blocked by missing mobile push-token contracts, but on-device local reminders are now app-side wired.
- 2026-05-15: Replaced permanent notification dots in Live and Backstage headers with real unread Activity counts from `notifications_unread_count`. The Activity route now invalidates the shared unread query after marking one or all notifications read, so avatar/header badges reflect backend state instead of static UI decoration.
- 2026-05-15: Added `PremiumSkeleton` and replaced spinner-only loading blocks on Home, Stage, Live, Backstage, and Search with animated premium skeleton loaders. Contract coverage now requires primary screens to use the skeleton and requires the skeleton to expose progressbar accessibility semantics.
- 2026-05-15: Fixed a stale promoter/venue avatar-menu route. Ticket Scan now opens the real `/ticket-scan` camera/check-in surface instead of an unused `/tickets?mode=scan` query route, and contract coverage blocks the stale route from returning.
- 2026-05-15: Verification after the latest completion pass passed: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, `npx expo-doctor` (`17/17`), and `npx expo run:ios --device "iPhone 17"` build/install/launch. Native build completed with 0 errors and 1 duplicate `-lc++` linker warning. Refreshed simulator screenshots for Home, Stage, Live, Backstage, Search, Activity, Ticket Scan, Wallet, and Creator Mode in `artifacts/screenshots/ios-qa-2026-05-15-latest`.
- 2026-05-15: Added `PluggdImage`, a shared cached fade-in media wrapper. Home, Stage, Live, Backstage, Search, and Tickets now use it for primary artwork/thumbnails so images use native cache hints and fade in over 200ms instead of snapping into view. Contract coverage now requires this image wrapper on the primary culture screens.
- 2026-05-15: Removed stale external digital checkout behavior from the old beat licensing CTA. `BeatLicenseButton` no longer opens web checkout links or emails web purchase links, and `useStorefront` now reports `canShowExternalLink: false` in the iOS app. Commerce contract coverage blocks the stale external beat checkout path from returning.
- 2026-05-15: Final automated verification for this continuation pass passed: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, and `npx expo-doctor` (`17/17`). `/Users/apple/PLUGGD_NEW` was checked and still only shows unrelated pre-existing dirty files; this pass did not edit it.
- 2026-05-15: Backend/product-contract continuation pass completed in the mobile workspace. Added a forward-only Supabase migration `supabase/migrations/20260515073614_mobile_gap_contracts.sql` for `saved_content`, room-keyed `live_session_reminders.room_id`, `mobile_push_tokens`, `mobile_clips`/`mobile-clips` storage, and short-lived `ticket_entry_tokens` with issue/verify RPCs. Existing favorites, event RSVP, ticket orders, StoreKit/IAP, wallet, web push, and live contracts were preserved.
- 2026-05-15: Updated the existing `send-push-notification` Edge Function to preserve web push delivery while also sending native Expo push messages from `mobile_push_tokens`; invalid Expo devices are marked inactive. The notification insert now targets the current `notifications.payload` column.
- 2026-05-15: Wired mobile services to the new contracts: generic `toggle_saved_content`, room reminder RPC, rotating ticket issue/verify RPCs, and `create_mobile_clip_record`. Live reminders now support `session_rooms` when scheduled; Library/Saved now hydrates generic saved rows when the migration is deployed.
- 2026-05-15: Added native push token registration through `expo-notifications` and `upsert_mobile_push_token`. Registration runs after sign-in when permission already exists, and after local reminder permission is granted.
- 2026-05-15: Added `/upload-clip`, a real mobile clip upload route using `expo-image-picker`, Supabase Storage `mobile-clips`, and the new clip metadata RPC. Creator Mode now routes Upload Clip to that screen instead of showing a blocker.
- 2026-05-15: Upgraded Tickets and Ticket Scan for rotating ticket payloads. Tickets can request a short-lived entry payload from `issue_ticket_entry_token`; the wallet renders a real QR code through `react-native-qrcode-svg`/`react-native-svg`; the scanner verifies `pluggd-ticket-v1` payloads through `verify_ticket_entry_token` and still supports static `ticket_orders.qr_code_data` fallback. Apple Wallet remains blocked until pass-signing credentials and pass generation are configured.
- 2026-05-15: Added `verify-mobile-backend-contracts.mjs` and updated gap/capability contracts to cover the new backend contracts. Verification passed after adding the QR renderer: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, `npx expo-doctor` (`17/17`), `git diff --check`, and `npx expo run:ios --device "iPhone 17"` build/install/launch with 0 errors and 1 duplicate `-lc++` linker warning. Signed-in fan/creator/promoter QA still requires real role-bearing credentials; native ticket purchase and Apple Wallet passes still require external payment/passkit contracts before enabling.
- 2026-05-15: Typography system pass completed. Added app-wide font-family tokens/defaults for Neue Montreal headings, Neue Haas Grotesk body text, and ABC Diatype Monument campaign/poster text, plus `docs/PLUGGD_IOS_TYPOGRAPHY_2026-05-15.md`. The actual licensed font binaries are external and must be added under `assets/fonts` before the requested typefaces can render on device.
- 2026-05-15: Supabase deployment verification completed after the SQL migration was manually applied and `send-push-notification` was deployed. Live REST probes returned `200` for `saved_content`, `mobile_push_tokens`, `mobile_clips`, `ticket_entry_tokens`, and `live_session_reminders`; live RPC probes confirmed `toggle_saved_content`, `set_live_room_reminder`, `upsert_mobile_push_token`, `create_mobile_clip_record`, `issue_ticket_entry_token`, and `verify_ticket_entry_token` are visible and protected by authentication.
- 2026-05-15: Closed a remaining local route loose end. Hidden legacy tab files (`explore`, `drops`, `marketplace`, `mixes`, `events`, `wallet`, `community`, `soundboards`, `profile`) now intentionally redirect into the new Home/Stage/Live/Backstage/Search or avatar/contextual shell instead of exposing stale old tab pages by deep link. `verify-mobile-action-wiring-contract.mjs` now blocks those legacy tabs from returning as live hidden screens.

## Audit Refresh Notes

Route classification:
- Main app: `/(tabs)/index`, `/(tabs)/stage`, `/(tabs)/live`, `/(tabs)/backstage`, `/(tabs)/search`, `/player`, `/release/[id]`, `/creator/[username]`, `/events/[id]`.
- Avatar/contextual: `/profile`, `/wallet`, `/library`, `/purchases`, `/tickets`, `/badges`, `/favorites`, `/following`, `/settings`, `/creator-mode`.
- Hidden/deep legacy: old marketplace, mixes, drops, events, community, soundboards, profile, and wallet tab routes redirect into the new consumer shell or the proper avatar/contextual route.
- Web Studio only/deferred: deep creator dashboards, analytics, payouts, uploads, licensing, distribution, CRM, and marketplace management.

Preserved integrations:
- `AuthProvider`, launch access RPC flow, Supabase client/storage, `PlaybackProvider`, `useCredits`, `useWallet`, `fetchLiveToken`, event/release/profile routes.

Backend/API gaps:
- Dedicated Backstage community source is now `hubs` plus `view_hub_threads`; if unavailable in the mobile Supabase environment, Backstage shows empty states instead of falling back to unrelated soundboards/social posts.
- Ticket QR/Apple Wallet support is not confirmed, so ticket screens use verified event data and explicit empty states.
- Public search has no unified backend RPC yet; v1 uses grouped Supabase queries by content type.
