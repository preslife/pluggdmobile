# PLUGGD iOS World-Class Gap Report

Date: 2026-05-14  
Primary repo: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`  
Reference-only repo: `/Users/apple/PLUGGD_NEW`

## Executive Verdict

The current app should not be restarted from zero. The native shell, Expo/iOS project, Supabase client, auth/access-code flow, playback provider, StoreKit credit packs, wallet hooks, and real content queries are salvageable and valuable.

The app is not world-class yet. It is currently a strong consumer-first shell with several real integrations, but many boxes in the original task doc mean "route/screen exists" rather than "complete product loop works end to end." The largest remaining gaps are Backstage, ticketing, social engagement, creator mode, persistent save/library behavior, notifications/activity depth, and final design/interaction polish.

Immediate defect found during this audit: `/notifications` redirected in a loop through legacy social notification routes. This has been fixed by making `/notifications` a real Activity screen backed by the existing Supabase notification RPCs.

## Gap-Completion Update

Implementation pass completed on 2026-05-14:

- Live Supabase capability check confirmed the newer mobile-relevant tables exist: `communities`, `community_members`, `community_events`, `community_event_rsvps`, `event_comments`, `event_tickets`, `ticket_orders`, `hubs`, `hub_sections`, `hub_items`, `view_hub_threads`, `social_posts`, `comments`, `likes`, `favorites`, `wallet_ledger`, `notifications`, `session_rooms`, `live_sessions`, `playlists`, `videos`, `beats`, `release_purchases`, `sample_pack_purchases`, `user_follows`, `community_collab_rooms`, and `community_challenges`.
- Added a mobile capability map and shared service layer so screen code no longer owns table guesses.
- Backstage overview now uses live `communities`/`community_members` plus legacy `hubs`/`view_hub_threads` where appropriate.
- Backstage detail now supports real community detail loading, membership state, join/leave persistence, Posts / Threads / Live Rooms / Events / Drops tabs, active rooms, community events, and community challenge threads.
- Event detail now uses real `event_rsvps`/`community_event_rsvps`-style RSVP flow, `event_comments`, real owned `event_tickets`/`ticket_orders`, and only displays QR data when `ticket_orders.qr_code_data` exists.
- Tickets, Library, Saved, and Wallet Vault now read account-owned tickets/orders, beat favorites, release purchases, and sample-pack purchases instead of public catalog rows.
- Post detail now supports real social post loading, likes through `likes`, and comments through `comments`.
- Stage and full player save actions now go through `toggleSavedContent`; non-beat saved states are explicitly marked unsupported until a real generalized saved-content table/RPC exists.
- Creator Mode pulse now reads real lightweight sources for followers, post engagement, community activity, live activity, tickets, wallet support activity, and creator metrics where present.
- Search now queries both current `communities` and legacy `hubs` so Backstage discovery covers both backend models.
- New/updated contracts cover capability-map, route loops, service-backed culture data, Backstage data, gap wiring, ticket QR compliance, and no fake fallback data.

Verified after this pass:

- `npx tsc --noEmit`
- `npx expo-doctor` (`17/17` checks passed)
- All `scripts/verify-mobile-*.mjs`

Still not completed by this pass:

- Supabase generated TypeScript types were not refreshed because the local Supabase CLI has no access token in this environment. Newer tables are typed through app-local mobile models and `(supabase as any)` wrappers until credentials are available.
- Native simulator screenshots and role-path manual QA were not rerun in this specific pass.
- A generalized saved-content model for releases, mixes, videos, events, communities, creators, and profiles is still missing in the backend; only beat saves are currently persisted through `favorites`.
- Native ticket purchase/checkout remains disabled unless a compliant mobile payment path is confirmed. The app now shows RSVP/status/ticket ownership instead of fake checkout.
- Apple Wallet pass generation, dynamic ticket QR rotation, friend attendance graph, push delivery, and advanced live co-host/moderation remain backend/product follow-ups.

Second gap-wiring pass completed on 2026-05-15:

- Verified the live `favorites` contract against Supabase and the read-only web reference: it supports `beat_id` and `release_id`; it does not support generic `mix_id`, `event_id`, `community_id`, `video_id`, or profile saves. Mobile now persists beat and release saves through the shared service and keeps unsupported save classes explicit instead of faking success.
- Verified the live `social_posts` table uses `content`, `title`, `post_type`, `community_id`, `likes_count`, `reposts_count`, and `comments_count`; `social_posts.body` is not a backend column. Added `/create-post` as a real Supabase-backed composer for standard posts, announcements, and Backstage thread-style posts.
- Event reminder buttons now persist through `event_rsvps` by setting `interested` or `cancelled`. Scheduled-session reminders persist through `live_session_reminders.session_id`; joinable room reminders are now covered by the later room-keyed `set_live_room_reminder` contract.
- Activity access is now present in the avatar menu with unread count support. Legacy social notification/inbox routes redirect to the real `/notifications` Activity route, and notification deep links for live/room/session items now pass `roomId` to match `/live/session`.
- Creator Mode quick actions now route only to valid mobile routes (`/live/create`, `/create-post`, `/notifications`, `/ticket-scan`) or show an explicit unavailable state for actions that still need backend contracts, including mobile clip upload.
- Verified after this pass: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, `npx expo-doctor` (`17/17`), and `npx expo run:ios --device "iPhone 17"` build/install/launch. The simulator build succeeded with 0 errors and launched `com.pluggd.mobile`.
- `/Users/apple/PLUGGD_NEW` was used as read-only reference only. It currently has unrelated pre-existing dirty files, but no mobile implementation step wrote to it.

Still not completed after the second pass:

- Full logged-out/fan/creator/promoter manual role-path QA has not been completed in one clean pass.
- Full-page screenshot capture for every primary/contextual route has not been rerun after the latest wiring pass.
- Generalized saved-content still needs a backend table/RPC for videos, mixes without release IDs, events, communities, creators, profiles, and live rooms.
- Joinable live-room reminders need either a safe mapping from `session_rooms` to `sessions` or a current reminder table keyed to `session_rooms`; scheduled-session reminders now persist and are locally scheduled.
- Native physical ticket purchase, Apple Wallet pass generation, and advanced live co-host/moderation remain backend/product follow-ups. Mobile clip upload, dynamic QR token generation, and push-token delivery were closed in the later mobile backend contract pass.

Backend/product blocker pass completed on 2026-05-15:

- Live schema probes confirmed there is still no generic `saved_items`, `user_saves`, or `saved_content` table. Instead of faking a universal save system, mobile now persists each supported class through real existing contracts: `favorites` for beats/releases, `event_rsvps` for event saves/reminders, `community_members` for Backstage joins, and `user_follows` for creator follows.
- `live_session_reminders` is confirmed to use `session_id`, not `room_id`. The app now treats `sessions` as scheduled/remindable items and `session_rooms` as joinable live rooms. Scheduled-session reminders persist through `live_session_reminders`; session-room-only reminders remain unavailable until the backend exposes a safe room reminder contract or a room-to-session mapping.
- `ticket_orders` is confirmed to expose `qr_code_data` and `checked_in_at`. Added `/ticket-scan` as a real manual QR payload checker/check-in surface for promoter/event roles. This is not presented as finished native scanning: camera scanning, permission copy, dynamic QR rotation, and promoter RLS/update policy still need production confirmation.
- `content_reports` is confirmed for moderation reports with supported target types. Live room reporting is now wired by reporting the host `profile` and attaching the live room id in the report description. This gives mobile a real moderation path without inventing a live-room report table.
- Native physical ticket purchase remains disabled because the web reference still uses a placeholder client-created `ticket_orders` flow around Stripe-style checkout comments. Mobile should not copy that as production purchase logic until a compliant native payment path is defined.
- Push remains blocked at the backend-contract level: `expo_push_tokens`, `mobile_push_tokens`, `device_push_tokens`, and `push_tokens` are absent in the live project; only web push subscriptions are visible. Mobile can show Activity/unread state, but device push delivery needs a real token table/function.
- Clip upload remains blocked at the backend-contract level: current `videos` rows expose `youtube_url`/`thumbnail_url`, not native `video_url`; `media_assets` and `upload_sessions` were not present, and no mobile upload bucket was visible to anon credentials.
- Verified after this blocker pass: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, and `npx expo-doctor` (`17/17`).

Remaining true backend/product blockers after this pass:

- A first-class generalized saved-content model is still needed for videos, playlists/mixes without release IDs, live rooms, and any object that should not be represented as RSVP/join/follow.
- Native ticket purchase, dynamic QR rotation, Apple Wallet passes, push delivery, clip upload, and deeper live moderation/co-host controls still need explicit backend/payment/product contracts.
- Full logged-out/fan/creator/promoter role-path QA and fresh full-page screenshots are intentionally still pending because backend blocker wiring was prioritized first.

App-side QA/scan pass completed on 2026-05-15:

- Added `expo-camera` and upgraded `/ticket-scan` to use native camera QR scanning through `CameraView` with `barcodeTypes: ['qr']`. Manual payload entry remains as a fallback. The route still validates against real `ticket_orders.qr_code_data` and attempts real check-in updates through `ticket_orders.checked_in_at`.
- Built and launched on the iPhone 17 simulator after installing the native camera module. `ExpoCamera` and `ZXingObjC` compiled successfully; the app built with 0 errors and 1 duplicate-library linker warning.
- Captured screenshot QA artifacts under `artifacts/screenshots/ios-qa-2026-05-15` for Home, Stage, Live, Backstage, Search, Player, Wallet, Creator Mode, Ticket Scan, Tickets, Activity, and Library.
- Fixed Wallet credit-pack display so PLUGGD’s approved GBP credit pack copy is stable in simulator/sandbox environments. The UI uses StoreKit pricing only when StoreKit returns GBP; otherwise it shows the approved labels: £9.99, £24.99, £49.99, and £99.99.
- Fixed Stage CTA semantics: Stage cards now check whether a real playable track URL exists. If no playable URL is available, the CTA says `Open` and routes to detail instead of showing a misleading `Play` action.
- Completed logged-out/public QA for the simulator route set: login, public primary tabs, ticket-scan sign-in gate, account-owned empty states, Wallet contextual access, and Creator Mode inactive-account messaging.
- Replaced leftover legacy emerald primary accent tokens with PLUGGD orange `#FF5A00` across the shared theme/content/navigation layer and Creator Mode shell constants. Added contract coverage to prevent the old emerald/violet primary accent from returning.

Local reminder completion pass completed on 2026-05-15:

- Added `src/lib/localNotifications.ts` with `expo-notifications` display handling, permission requests, schedule/cancel support, AsyncStorage notification-id tracking, and notification-tap deep links back into the app.
- Root layout now configures local notification presentation and registers a notification response listener.
- Event detail RSVP and Live scheduled-event/session reminder actions persist the backend row first, then schedule or cancel an on-device local notification when the event/session has a future start time.
- Live and Backstage headers now show backend-backed unread Activity counts from `notifications_unread_count` instead of permanent fake dots. The Activity route invalidates the shared unread query after mark-read and mark-all-read mutations.
- Added reusable animated `PremiumSkeleton` loading blocks and wired them into Home, Stage, Live, Backstage, and Search so primary tabs no longer rely on spinner-only loading states.
- Added reusable `PluggdImage` media rendering with native cache hints and a 200ms fade-in. Primary Home/Stage/Live/Backstage/Search artwork and ticket images use the wrapper now.
- Promoter/venue avatar-menu Ticket Scan now routes to the real `/ticket-scan` camera/check-in surface instead of the stale `/tickets?mode=scan` query route.
- Removed stale external digital checkout behavior from the old beat licensing CTA. Beat licensing now stays save/info-only until a native PLUGGD credits entitlement path exists, and `useStorefront` no longer enables external digital links in iOS.
- `MOBILE_CAPABILITIES.live.reminders` is now `available` for event/scheduled-session reminders. `notifications.pushTokens` remains `unavailable` because mobile push-token backend tables/functions are still missing.
- Verified after this pass: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, `npx expo-doctor` (`17/17`), and `npx expo run:ios --device "iPhone 17"` build/install/launch. Native build completed with 0 errors and 1 duplicate `-lc++` linker warning.
- Final automated verification after the image/commerce cleanup also passed: `npx tsc --noEmit`, all `scripts/verify-mobile-*.mjs`, and `npx expo-doctor` (`17/17`).
- Refreshed simulator screenshots are saved in `artifacts/screenshots/ios-qa-2026-05-15-latest` for Home, Stage, Live, Backstage, Search, Activity, Ticket Scan, Wallet, and Creator Mode.

Updated blockers after this pass:

- Camera-based ticket scanning is now app-side implemented, but dynamic QR rotation, Apple Wallet passes, and native ticket purchasing still require backend/payment contracts.
- Local notification scheduling is now app-side implemented for event and scheduled-live reminders; remote push delivery remains blocked by missing mobile push-token backend tables/functions.
- Clip upload remains blocked by missing mobile upload/storage contract.
- Full role-path QA still needs a signed-in fan, creator, and promoter/venue pass with real account permissions.

## What Is Solid And Worth Keeping

- Existing Expo SDK / React Native app and iOS native workspace.
- Bundle id `com.pluggd.mobile`.
- Supabase client and typed Supabase schema file.
- Auth/session provider and access-code gate.
- TrackPlayer playback context and persistent mini-player foundation.
- Apple IAP credit pack configuration for:
  - `pluggd_credits_popular`
  - `pluggd_credits_value`
  - `pluggd_credits_premium`
  - `pluggd_credits_ultimate`
- Wallet ledger and credit balance hooks.
- Credit spend logic foundation.
- Agora live token helper and live session routes.
- Current consumer-first primary tabs:
  - Home
  - Stage
  - Live
  - Backstage
  - Search
- Real data hook foundation in `src/features/culture/useCultureData.ts`.
- Real content bundle foundation in `src/lib/mobileContent.ts`.
- Contract scripts for tab/nav/commercial/action wiring checks.

## Original Plan Coverage Matrix

| Area | Target | Current Status | Gap |
| --- | --- | --- | --- |
| Five-tab nav | Exactly Home, Stage, Live, Backstage, Search | Implemented | Needs final visual QA on every device size |
| Avatar/context routes | Profile, Wallet, Library, Purchases, Tickets, Saved, Following, Creator Mode, Settings | Mostly present | Several routes are scaffold screens, not full product loops |
| Auth/access code | Preserve and fix | Present | Needs full logged-out/fan/creator/promoter role path testing |
| Home | Live music dashboard with events, live, sounds, buzz, creators | Implemented with real hooks | Not yet a complete social feed with comments/reposts/post detail |
| Stage | Premium discovery/player surface | Implemented visually | No full-screen swipe loop, local-only saves, limited playlist/video/challenge depth |
| Live | Real-time live culture | Implemented visually with live data hooks | Reminders local-only, live room/chat/gift/moderation path needs full validation |
| Backstage | Membership/community/event hub participation layer | Partially implemented | Biggest product gap: membership, event hubs, rooms, who is going, and detail page are incomplete |
| Search | Universal discovery | Implemented as grouped Supabase queries | Needs ranking, recent search persistence, better result actions, possible search RPC |
| Player | Global mini-player and full player | Present | Save/share/comment/community shortcuts need consistent real persistence |
| Events/ticketing | Cultural event layer across app | Partially present | No confirmed ticket order/attendance/QR/native checkout loop |
| Wallet/IAP | Apple-compliant credit packs and contextual wallet | Strong foundation | Tickets, badges, rewards, unlockables, purchases, entitlements incomplete |
| Creator Mode | Lightweight mobile controls only | Present as route | Mostly quick-action redirects and static pulse, not yet real creator workflow |
| Notifications/activity | Likes, comments, follows, unlocks, purchases, community activity | Basic Activity route now present | Needs full data wiring, push, unread badge, deep-link coverage |
| QA/screenshots | Build checks, screenshots, role tests | Typecheck/action wiring pass | Full simulator screenshot pack and role testing still not complete |

## Screen-By-Screen Gaps

### Home

Current:
- `app/(tabs)/index.tsx` uses `LiveMusicDashboardHome`.
- Uses real hooks from `useHomeFeed`, `useEventLayer`, and related content loaders.
- Has the requested live dashboard direction: happening-now hero, live now, events, trending sounds, backstage buzz, recommended creators.

Remaining:
- Not a full social/music feed yet.
- Comments, likes, reposts, quote posts, share-to-feed, and post detail flows are not complete as an end-to-end social graph.
- Feed attachments are only as good as available data mapping.
- Ticket CTAs can route to event/ticket contexts, but there is no confirmed native ticket purchase/order loop.
- Need better empty/loading skeletons and final screenshot verification.

Next:
- Build a real post detail route.
- Wire comments/likes/reposts to confirmed tables/RPCs.
- Add event/social attachment actions only where backend supports them.
- Add contract coverage for no fake Home feed rows.

### Stage

Current:
- `app/(tabs)/stage.tsx` uses `StageDiscoveryScreen`.
- Pulls releases and mixes through `useStageContent`.
- Has hero, trending, live sessions, producer drops, challenges, recommended creators.
- Visual direction is closer to premium discovery than the old marketplace/dashboard style.

Remaining:
- No true full-screen vertical swipe discovery loop yet.
- Save/bookmark state is local in places and not consistently persisted.
- Videos/playlists are not fully implemented as first-class Stage content.
- Open Verse Challenges appear derived from available content/social signals, not a confirmed challenge system.
- Producer drops/beats are still a lane, but entitlements/license/unlock flow needs backend confirmation.

Next:
- Add persistent save/favorite support across release, mix, video, event, creator, hub.
- Build full-screen discovery mode after data/actions are stable.
- Confirm playlists/videos/challenges tables or ship clear empty states.
- Wire Stage cards to player/detail/backstage/event actions consistently.

### Live

Current:
- `app/(tabs)/live/index.tsx` uses `LiveCultureScreen`.
- `useLiveRooms` queries `session_rooms` and `live_sessions`.
- Agora foundations and live session routes exist.
- Live Now, Upcoming, Replays/Clips, and Community Rooms surfaces are present.

Remaining:
- Public live eligibility/approved creator gating is not fully enforced in the UI/data layer.
- Event and scheduled-session reminder buttons are backed by real reminder/RSVP rows and local notifications. Room-only reminders still need a backend room reminder contract.
- Live chat, gifts, moderation, report flow, co-host flow, replay save, and clip creation need end-to-end validation.
- Viewer counts and room status depend on backend freshness.

Next:
- Confirm `session_rooms` / `live_sessions` status model and role rules.
- Add a room-keyed reminder contract if room-only reminders are required.
- Test `/live/session` with real Agora token flow.
- Add live moderation/report actions only where backed.

### Backstage

Current:
- `app/(tabs)/backstage.tsx` uses `BackstageWorldScreen`.
- `useBackstage` queries `hubs` and `view_hub_threads`.
- Event hubs, active rooms, hot threads, producer lounge, community moments, recommended backstages are represented.
- `app/backstage/[id].tsx` exists.

Remaining:
- This is the biggest gap against the product vision.
- `useBackstage` currently maps some community values to null:
  - `member_count`
  - `online_count`
  - `avatar_url`
  - `is_verified`
- `useBackstage` returns `liveRooms: []`; active rooms are not actually linked to hubs.
- Joined communities need a real membership/follow table.
- Event hubs are not yet truly linked to ticket threads, attendance, or "who's going."
- Backstage detail page is minimal and does not fully implement tabs:
  - Posts
  - Threads
  - Live Rooms
  - Events
  - Drops
- No real join/open hub membership action has been validated.
- Community moments depend on a confirmed media/posts model.

Next:
- Confirm or create the mobile contract for hub memberships.
- Wire joined communities, online counts, member counts, and avatars.
- Add event-linked threads and ticket-thread categories.
- Build full Backstage detail page with real tabs.
- Add Join/Open actions with real persistence.
- Treat this as the highest-priority product completion area.

### Search

Current:
- `app/(tabs)/search.tsx` uses `SearchDiscoveryScreen`.
- `useUniversalSearch` queries:
  - `profiles`
  - `releases`
  - `mixes`
  - `beats`
  - `videos`
  - `events`
  - `hubs`
  - `session_rooms`

Remaining:
- No global ranked search RPC/index yet.
- No persisted recent searches.
- No location-aware event search.
- No advanced filters by city, genre, live status, event date, or community type.
- Search result action coverage needs manual testing.

Next:
- Add recent searches locally or in user settings.
- Add a Supabase RPC or indexed search view for ranked cross-entity results.
- Add category-specific empty states and result actions.

### Player

Current:
- TrackPlayer provider and mini-player exist.
- Full player route exists.
- Cards can start playback from real media URLs where available.

Remaining:
- Save from full player is not consistently persisted for all media types.
- Comment/community shortcut should open a real Backstage/community route when linked.
- Queue behavior and intentional reset rules need manual verification.
- Related releases/events/comments are not fully mapped.

Next:
- Add a typed `save_media` abstraction backed by real tables.
- Make community/comment shortcut data-driven.
- Add player contract for shared context and no accidental reset on tab changes.

### Events And Ticketing

Current:
- `events` table is used by Home, Live, Backstage, Search, and `app/events/[id].tsx`.
- Event detail route exists.
- Tickets route exists as a contextual wallet/ticket surface.

Remaining:
- No confirmed real ticket purchase/order/attendance table wiring.
- No dynamic QR/code tickets.
- No Apple Wallet pass support.
- No "who's going" graph.
- No RSVP/save persistence confirmed.
- No event reminder persistence confirmed.
- Ticketing is present visually, but not yet the growth engine described in the plan.

Next:
- Confirm backend tables for:
  - ticket orders
  - event attendance
  - RSVPs/saves
  - QR ticket payloads
  - transfer/share rules
- Decide native payment path for physical event tickets.
- Keep iOS digital goods on Apple IAP credits; do not use external checkout for digital unlocks.
- Build event hubs and ticket threads into Backstage first.

### Wallet, Credits, IAP

Current:
- Wallet screen exists and uses wallet/ledger hooks.
- StoreKit packs are preserved.
- Credit model is preserved:
  - 100 credits = GBP 1
  - credits never expire
  - iOS digital credits via Apple IAP
- Release unlock / credit spend foundation exists.

Remaining:
- Purchased releases/assets/tickets/rewards/badges are not unified into a complete wallet vault.
- Paid sample pack unlocks route toward wallet but still require backend entitlement implementation.
- Beats/license unlock flow needs confirmed backend contract.
- Tips/gifts/fan interactions need consistent wallet ledger and entitlement rules.
- Receipts, restore purchases, and server-side receipt validation need final production review.

Next:
- Create one entitlement layer for releases, beats, sample packs, memberships, gifts, and tickets.
- Add restore purchase QA.
- Add wallet vault sections backed by real data.
- Keep digital checkout strictly Apple-compliant.

### Creator Mode

Current:
- `/creator-mode` exists and is available from avatar menu for eligible roles.
- Quick actions are present.
- Heavy Creator Studio routes have been pushed out of primary fan navigation.

Remaining:
- Creator Mode is mostly a control hub, not yet a working mobile creator suite.
- Some actions redirect to fallback/deferred routes.
- Activity pulse is mostly static labels, not real metrics.
- Ticket scanning is not implemented.
- Community moderation controls are not complete.
- Upload clip/story/moment is not complete in mobile.
- Go Live and live scheduling need end-to-end validation.

Next:
- Wire each quick action to a real backend-supported route or mark it clearly unavailable.
- Build simple creator activity query bundle.
- Implement ticket scanner only if ticket backend is confirmed.
- Keep deep analytics, payouts, distribution, metadata, CRM, and inventory on web Creator Studio.

### Auth, Onboarding, Profile

Current:
- Auth/session/access-code flow exists.
- Fan onboarding and creator onboarding routes exist.
- Profile/avatar menu entry exists.

Remaining:
- Role-aware UX needs full manual testing:
  - logged out
  - fan
  - creator
  - promoter/event role
  - venue role
- Profile setup/editing needs final polish and data validation.
- OAuth buttons were removed from visible auth, but production auth options should be reviewed.
- Biometric route is deferred/redirect-like.

Next:
- Complete manual role-path QA.
- Ensure creator/promoter features are gated.
- Ensure fan UI never shows admin tools.

### Notifications And Activity

Current:
- Supabase has `notifications` table and RPCs:
  - `notifications_list_recent`
  - `notifications_mark_read`
  - `notifications_mark_all_read`
  - `notifications_unread_count`
- `/notifications` is now a real screen and no longer a redirect loop.

Remaining:
- Local notification scheduling is wired for event/scheduled-live reminders; backend push-token delivery is still unavailable.
- Top-level unread count badges are now wired for the shared header/menu plus Live and Backstage owned headers.
- Notification deep-link coverage needs testing across all related types.
- No activity grouping or filters.

Next:
- Add backend mobile push token table/function before wiring remote push delivery.
- Add contract to prevent notification redirect loops.

## Backend/API Gaps To Verify

Confirmed usable sources:
- `events`
- `releases`
- `profiles`
- `hubs`
- `view_hub_threads`
- `social_posts`
- `fan_map_plugs`
- `beats`
- `sample_packs`
- `mixes`
- `soundboards`
- `wallet_ledger`
- `notifications`
- `session_rooms`
- `live_sessions`

Still needs confirmation or stronger contract:
- Hub memberships / joined communities.
- Hub online presence.
- Event-linked community threads.
- Ticket orders / event tickets.
- Attendance / RSVP / "who's going."
- Dynamic QR ticket payloads.
- Event reminders.
- Search ranking RPC or indexed search view.
- Playlists.
- Videos/clips/replays as first-class Stage and Live content.
- Open verse challenges.
- Saved/favorites across all content types.
- Full social engagement:
  - comments
  - likes
  - reposts
  - quote posts
  - shares
- Creator activity pulse.
- Creator moderation actions.
- Push notification tokens and delivery.
- Entitlements for all paid content classes.

## Design And Interaction Gaps

The latest screens are closer to the requested premium direction, but world-class still requires a final visual QA pass, not just code completion.

Remaining design work:
- Confirm every primary screen is visually distinct:
  - Home = live music dashboard.
  - Stage = media discovery/player surface.
  - Live = real-time creator/live culture.
  - Backstage = membership, event hubs, rooms, threads, participation.
  - Search = clean universal discovery.
- Add consistent skeleton loaders instead of blank loading states.
- Add image fade-in/caching strategy.
- Add haptics for:
  - tab selection
  - like/save
  - ticket/reminder confirmations
  - purchase success
- Review safe-area spacing and dynamic text on all iPhone sizes.
- Add accessibility labels where missing.
- Verify no giant content cards overflow the viewport.
- Verify horizontal shelves actually scroll and do not feel like vertical lists.
- Capture full-page screenshots for every primary and contextual page.

## QA Gaps

Automated checks that have recently passed:
- `npx tsc --noEmit`
- `node scripts/verify-mobile-action-wiring-contract.mjs`

Still required:
- Full contract suite run after any next implementation phase.
- `npx expo-doctor`.
- iOS simulator build/run.
- Full-page screenshots for:
  - Home
  - Stage
  - Live
  - Backstage
  - Search
  - Player
  - Wallet
  - Tickets
  - Creator Mode
  - Profile/avatar menu
- Manual role tests:
  - logged out
  - fan
  - creator
  - promoter/event role
  - venue role
- Manual media persistence test:
  - play from Home
  - switch tabs
  - open player
  - return to content
- Manual commerce test:
  - IAP product loading
  - buy/restore sandbox path
  - wallet ledger update
  - no external digital checkout links
- Manual Backstage test:
  - open community
  - join/follow
  - open event hub
  - open ticket thread
  - join room

## Priority Build Order From Here

1. Stabilize loose ends.
   - Add contract for redirect loops.
   - Run full route/action contract suite.
   - Capture screenshots and compare against the page briefs.

2. Finish Backstage as the key differentiator.
   - Real joined communities.
   - Event hubs.
   - Ticket threads.
   - Who's going.
   - Active rooms.
   - Full community detail tabs.

3. Finish ticketing/event culture.
   - RSVP/save/reminder persistence.
   - Ticket orders/attendance if backend exists.
   - Wallet ticket display.
   - QR only if supported.
   - Backstage event hub integration.

4. Finish social engagement.
   - Post detail.
   - Comments.
   - Likes.
   - Reposts.
   - Share-to-feed.
   - Feed attachments.

5. Finish persistent media and saved library.
   - Unified save/favorite model.
   - Queue behavior.
   - Related media/events.
   - Real Backstage shortcuts.

6. Finish Live.
   - Validate Agora live room.
   - Persist reminders.
   - Validate chat/gifts/moderation/report where supported.
   - Keep fan public livestreaming gated/deferred.

7. Finish Wallet/IAP/entitlements.
   - Restore purchases.
   - Receipt validation review.
   - Entitlements for releases, beats, packs, tips, gifts, memberships.
   - Wallet vault with tickets, rewards, purchases, badges.

8. Finish Creator Mode.
   - Replace static pulse with real data.
   - Wire quick actions to real supported flows.
   - Implement ticket scanning only after ticket backend is confirmed.
   - Keep heavy Creator Studio on web.

9. World-class polish pass.
   - Haptics.
   - Skeleton loading.
   - Image caching/fade.
   - Motion/transitions.
   - Accessibility.
   - Performance profiling.
   - Device screenshots.

## Non-Negotiables Going Forward

- Do not edit `/Users/apple/PLUGGD_NEW`.
- Do not reintroduce wallet/profile/create/marketplace as bottom tabs.
- Do not fake complete product loops with static/demo content where backend is missing.
- Do not show creator admin tools in fan Home/Stage/Live/Backstage/Search.
- Do not use external checkout for iOS digital goods.
- Do not show ticket QR codes unless backend ticket payloads are real.
- Do not claim Backstage is complete until membership, event hubs, rooms, and threads are real.
- Do not mark Creator Mode complete until quick actions and activity pulse are real.

## Bottom Line

The remaining work is not a new shell rebuild. It is product-loop completion.

The app now has the right consumer-first direction, but to become world-class it needs:
- Backstage made real.
- Ticketing woven into the culture loop.
- Social engagement wired end to end.
- Saves/library/player persistence completed.
- Wallet/IAP entitlements finished.
- Creator Mode reduced to real mobile actions only.
- Full screenshot and role-path QA.

## 2026-05-15 Gap Closure Update

Closed in the current mobile workspace:
- Generic saved-content backend contract: added `saved_content` plus `toggle_saved_content`; mobile `Library`/`Saved` hydrates generic saved rows when deployed.
- Room-keyed live reminders: added `live_session_reminders.room_id` plus `set_live_room_reminder`; Live supports scheduled `session_rooms` reminders.
- Mobile push delivery contract: added `mobile_push_tokens`, native token registration, and Expo push delivery inside the existing `send-push-notification` function while preserving web push.
- Clip upload contract: added `mobile-clips` storage, `mobile_clips`, `create_mobile_clip_record`, and `/upload-clip`.
- Dynamic ticket entry contract: added `ticket_entry_tokens`, `issue_ticket_entry_token`, `verify_ticket_entry_token`, Tickets token generation, rendered QR codes, and scanner verification.
- Hidden old tab routes: legacy tab files now redirect into the correct consumer shell/contextual route instead of exposing stale marketplace, profile, wallet, community, or discover pages by deep link.
- Deployment verification: after the manual SQL migration and Edge Function deployment, live REST probes returned `200` for the new mobile tables and live RPC probes confirmed the new functions are visible and authentication-protected.
- Typography framework: global app typography tokens/defaults now target Neue Montreal, Neue Haas Grotesk, and ABC Diatype Monument.

Still external/product-gated:
- Native physical ticket purchase needs a confirmed App Store-compliant payment path before enabling in iOS.
- Apple Wallet passes need PassKit certificate, pass type identifier, signing service, and payload design.
- Signed-in fan/creator/promoter QA needs real role-bearing accounts and permissions.
- Licensed font binaries for Neue Montreal, Neue Haas Grotesk, and ABC Diatype Monument must be supplied before those families can render on real devices.
