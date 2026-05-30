# PLUGGD iOS World-Class Elevation Tasks

Date: 2026-05-17  
Repo: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`  
Read-only reference: `/Users/apple/PLUGGD_NEW`

## Execution Rules

- Do not restart the app.
- Do not edit `/Users/apple/PLUGGD_NEW`.
- Preserve the current Expo/iOS app, Supabase, auth/access gate, TrackPlayer, StoreKit/IAP, wallet, live/Agora, social/thread, ticket/QR foundations, and 5-tab shell.
- Bottom nav is now exactly: Home, Stage, Live, Backstage, MyPLUGGD.
- Search is no longer a bottom tab. It is accessed from top/header chrome and MyPLUGGD.
- Unsupported backend/payment/storage features must render honest unavailable or empty states, not fake completed features.
- Any feature that exists on the web product and is mapped into mobile must be equivalent to or better than the web implementation. No lightweight/mobile-lite placeholders are acceptable.
- `/Users/apple/PLUGGD_NEW` is the canonical reference for mapped product behavior. Mobile should translate that behavior into native iOS UX rather than replacing it with simplified shells.

## Baseline

- [x] Confirmed repo already contains existing dirty work from prior passes; these changes must be preserved.
- [x] `npx tsc --noEmit` passed before this elevation pass.
- [x] `git diff --check` passed before this elevation pass.
- [x] `npx expo-doctor` passed after this design-system pass.
- [x] Existing `scripts/verify-mobile-*.mjs` passed after this design-system pass.
- [ ] Baseline screenshots recorded for Home, Stage, Live, Backstage, Search.

## Supplied Assets

- [x] Copy `Pluggdsans5-Regular.otf` into `assets/fonts`.
- [x] Copy `Satoshi-Light.otf` into `assets/fonts`.
- [x] Copy `Satoshi-Regular.otf` into `assets/fonts`.
- [x] Copy `Satoshi-Medium.otf` into `assets/fonts`.
- [x] Copy `Satoshi-Bold.otf` into `assets/fonts`.
- [x] Copy `Satoshi-Black.otf` into `assets/fonts`.
- [x] Do not load italic fonts in v1.
- [x] Do not copy the duplicate Pluggdsans TTF unless OTF fails in Expo/iOS.

## Typography Target

- [x] Replace old Neue Montreal / Neue Haas Grotesk / ABC Diatype mapping.
- [x] Stop relying on the global `StyleSheet.create` typography monkey patch.
- [x] Load fonts through `expo-font` in `app/_layout.tsx`.
- [x] Use font keys:
  - `PluggdSans5-Regular`
  - `Satoshi-Light`
  - `Satoshi-Regular`
  - `Satoshi-Medium`
  - `Satoshi-Bold`
  - `Satoshi-Black`
- [x] Use `PluggdSans5-Regular` for page/app titles only.
- [x] Use `Satoshi-Black` / `Satoshi-Bold` for hero titles, section headers, and major CTAs.
- [x] Use `Satoshi-Bold` / `Satoshi-Medium` for secondary headings and pills.
- [x] Keep body, chat, metadata, and input text on native system font.
- [x] Add explicit text primitives: `PluggdTitle`, `PluggdHeading`, `PluggdSectionTitle`, `PluggdBody`, `PluggdMeta`, `PluggdCTA`.

## Theme And Tokens

- [x] Replace visible old orange `#FF5200` with canonical `#FF5A00`.
- [ ] Keep baked logo pixels untouched.
- [x] Add dark tokens:
  - canvas `#08080C`
  - deep background `#0B0B0B`
  - shell `#0D0D11`
  - surface `#12121A`
  - raised `#151515` / `#171717`
  - divider `#1F1F2E`
  - strong border `#262626`
  - text `#FFFFFF`
  - secondary `#B3B3B3`
  - muted `#737373`
  - UI muted `#8E8E9F`
  - inactive `#62627A`
  - orange `#FF5A00`
  - live coral `#FF4757`
  - Backstage violet `#7C3AED`
- [x] Add real light tokens based on the supplied light mockup.
- [x] Keep dark mode default.
- [x] Support light mode through Settings/system preference, not a prominent main UX toggle.

## Apple iPhone UI Rules

- [x] Shared header, tab bar, avatar, wallet, icon button, and mini-player controls now use 44pt hit regions.
- [x] Shared header/tab/player chrome respects safe areas around Dynamic Island and home indicator.
- [x] Existing haptics remain wired for tab changes, CTAs, play, profile/menu, and primary actions.
- [ ] Use real artwork and layered surfaces, not flat dashboard cards.
- [ ] Avoid web dashboard layouts.

## Core Chrome

- [x] Home/global header height is 60px after safe area.
- [x] Home/global header uses PLUGGD logo left and wallet/avatar right.
- [x] Home/global header has no search icon.
- [x] Stage/Live/Backstage/Search headers use compact height `max(insets.top + 62, 96)`.
- [x] Page titles use `PluggdSans5-Regular` at 31-34px.
- [x] Header icon hit targets are 44 x 44.
- [x] Backstage title uses violet.
- [x] Bottom nav height remains 56px.
- [x] Bottom nav active underline is 24 x 3 in orange.
- [x] Mini-player appears only when media is active, height 48px, above bottom nav.
- [x] Mini-player play control has 44pt hit region.

## Revised Navigation And Profile Direction

- [x] Move Search out of bottom nav.
- [x] Add `MyPLUGGD` as the far-right fifth tab.
- [x] MyPLUGGD defaults to Feed and exposes `Feed | Circles | Library | Activity`.
- [x] MyPLUGGD uses real services: `loadMobileSocialFeed`, `useBackstage`, `loadLibraryBundle`, `loadMobileNotifications`, and `loadInboxThreads`.
- [x] Header/top chrome exposes Search.
- [x] Avatar menu includes MyPLUGGD and Inbox.
- [x] Public creator profile tabs mirror the current web creator profile tabs from `/Users/apple/PLUGGD_NEW/src/components/creator/WorldClassCreatorPage.tsx`: Overview, Music, Beats, Soundboards, Gallery, Videos, Community, Shop, Shows, Live, About.
- [x] Added a stronger personal profile identity screen inspired by current social app profile patterns.
- [x] Added an edit profile route with real Supabase profile updates for name, username and bio.
- [x] Upgraded post composer visual structure around author context, destination context, large writing surface, top publish action and explicit tool affordances.
- [x] Composer media upload is wired through the real `social-media` storage bucket and `createMobileSocialPost`.

## Screen Elevation Checklist

### Home

- [ ] Home is the live social pulse of music culture.
- [ ] Structure: logo header, Happening Now hero, feed tabs, social timeline, Live Now, Events Near You/Ticket Drops, Trending Sounds, Backstage Buzz, Recommended Creators/Communities, Stories/Moments where backed.
- [ ] Main surface is social-first and web-backed through `social_posts`, `social_post_destinations`, `social_comments`, `social_likes`, `social_bookmarks`, `social_reposts`, `social_poll_votes`, `vote_social_poll`, and `fn_for_you_feed`.
- [ ] Audio embeds use the persistent player.
- [ ] Event embeds route to event detail.
- [ ] Backstage Buzz opens real boards/threads.

### Stage

- [ ] Stage is cinematic media discovery.
- [ ] Structure: header, filters, Featured Discovery Hero, Trending Now, Live Creator Sessions, Featured Producer Drops, Open Verse Challenges, Recommended Creators.
- [ ] Hero is 240-280px, image/video-led, with Play only when playable.
- [ ] Beats are present but secondary.
- [ ] All play/save/open actions are real.

### Live

- [ ] Live is real-time culture, not generic livestream UI.
- [ ] Structure: header, filters, Featured Live Hero, Live Now, Upcoming Live Events, Community Live Rooms, Replays + Clips, Featured Live Creators.
- [ ] Coral badge appears only for real live state.
- [ ] Join Live appears only if joinable.
- [ ] Reminders persist.
- [ ] Fan and host states are separated.

### Backstage

- [ ] Backstage is membership, event hubs, ticket threads, rooms, forums, and belonging.
- [ ] Violet is used for Backstage identity.
- [ ] Structure: header, filters, My Backstage, Event Hubs, Active Community Rooms, Hot Threads, Producer Lounge, Community Moments, Discover More Backstages.
- [ ] Board cards open board feeds, not composer.
- [ ] Event hubs show real status and honest CTA.
- [ ] `/backstage/[id]` tabs: Posts, Threads, Live Rooms, Events, Drops.
- [ ] `/community/boards/[slug]` is the board feed route.

### MyPLUGGD

- [x] MyPLUGGD is the user’s personal social home.
- [x] Structure: top bar with Search, Inbox, Notifications, Avatar; internal Feed, Circles, Library, Activity tabs.
- [x] Feed uses the web-backed mobile social feed.
- [x] Feed starts with Stories/Moments, then composer, then the full social thread feed.
- [x] Feed supports For You, Following, Latest, Backstage and Trending modes through the canonical social service.
- [x] Circles uses Backstage/community/thread/room services.
- [x] Circles includes Fan Map entry backed by fan-map RPC/table services.
- [x] Circles board cards open board feeds, not composer.
- [x] Library uses real saved, tickets, purchases and entitlement services.
- [x] Activity uses notifications/deep links and remains a real tab.
- [x] Inbox remains a top-bar utility route and does not replace Activity.

### Search

- [ ] Search is fast universal discovery.
- [ ] Categories: Top, Creators, Users, Tracks/Releases, Mixes, Videos, Beats, Playlists, Events, Communities, Boards, Posts, Hashtags, Live Rooms, Store/Support, Memberships.
- [ ] Every result routes to a real detail surface or explicit unavailable state.

## Contextual Page Elevation

- [ ] Creator profile.
- [x] Creator profile mirrors current web tab set.
- [x] Personal profile.
- [x] Edit profile.
- [ ] Event detail.
- [ ] Thread/post detail.
- [ ] Board feed.
- [ ] Release detail.
- [ ] Beat detail.
- [ ] Mix detail.
- [ ] Soundboard detail.
- [ ] Sample pack detail.
- [ ] Playlist detail.
- [ ] Wallet.
- [ ] Tickets.
- [ ] Notifications.
- [ ] Inbox.
- [ ] Creator Mode.
- [ ] Player.

## Commerce And Ticketing

- [ ] Digital goods use Apple IAP only.
- [ ] Preserve StoreKit products:
  - `pluggd_credits_popular`
  - `pluggd_credits_value`
  - `pluggd_credits_premium`
  - `pluggd_credits_ultimate`
- [ ] Preserve `100 credits = £1`.
- [ ] Include restore purchases.
- [ ] No external digital checkout links.
- [ ] Physical ticket purchase is disabled unless App Store-compliant native payment is confirmed.
- [ ] QR appears only with stored payload or dynamic ticket token.

## Contracts

- [x] Font assets exist and are loaded.
- [x] No old visible bottom tabs.
- [x] No fake fallback rows/counts.
- [x] No route collisions.
- [x] No dead buttons.
- [x] No unsupported iOS digital checkout.
- [x] No QR without real payload.
- [x] No creator-admin leakage in fan tabs.
- [x] No generic `comments`/`likes` for PLUGGD social posts.
- [x] Board cards do not route directly to composer.
- [x] Avatar menu routes render cleanly.
- [x] MyPLUGGD tabs are exactly Feed, Circles, Library, Activity.
- [x] MyPLUGGD Feed contains Stories/Moments before the social feed.
- [x] Stories/Moments use the web-backed `social_stories`, `social_story_views`, `can_create_social_story`, `mark_story_viewed`, and `social-media` upload flow.
- [x] Story viewer supports image, video and audio stories instead of treating every story as a static image.
- [x] Composer supports image, video, audio and poll creation through the same social post destination system as the web feed.
- [x] Activity is not moved into Inbox.
- [x] Fan Map uses real fan-map tables/RPCs.

## Final Verification

- [x] `npx tsc --noEmit`.
- [x] `npx expo-doctor`.
- [x] All `scripts/verify-mobile-*.mjs`.
- [x] `git diff --check`.
- [ ] Simulator QA: logged out, access code, dark mode, light mode, Home actions, Stage actions, Live actions, Backstage actions, Search categories, profile menu, Wallet/IAP/restore, event RSVP/comment/ticket state, thread interactions, Creator Mode role gate.
- [ ] Screenshot manifest: Home dark/light, Stage dark/light, Live dark/light, Backstage dark/light, Search dark/light, Creator profile, Event detail, Board feed, Thread detail, Release detail, Wallet, Player, Creator Mode.

## 2026-05-17 Implementation Notes

- Installed supplied OTF fonts and loaded them through Expo in `app/_layout.tsx`.
- Replaced the old hidden typography monkey patch with explicit typography tokens and text primitives.
- Added dark/light token sets matching the revised visual direction.
- Updated global header, bottom nav, mini-player, shared primitives, and primary tab headers to use the revised chrome spec.
- Updated visible UI orange from `#FF5200` to `#FF5A00` across app UI files.
- Applied Satoshi/Pluggdsans hierarchy to Home, Stage, Live, Backstage, and Search primary text surfaces.
- Increased key header/nav/player and several small CTA controls to Apple 44pt hit targets.
- Updated contracts for supplied font loading and theme/logo behavior.
- Verification after this pass:
  - `npx tsc --noEmit` passed.
  - `npx expo-doctor` passed 17/17 checks.
  - all `scripts/verify-mobile-*.mjs` passed.
  - `git diff --check` passed.

## 2026-05-17 MyPLUGGD / Profile / Composer Notes

- Replaced the fifth bottom tab from Search to MyPLUGGD at the far right.
- Kept Search as a top/header utility route at `/search`.
- Added `src/features/mypluggd/my-pluggd-screen.tsx` and `app/(tabs)/my-pluggd.tsx`.
- Removed `app/(tabs)/search.tsx` so Search is not a tab route.
- Updated navigation and route contracts for the revised nav model.
- Updated public creator profile to use the web creator profile tab set: Overview, Music, Beats, Soundboards, Gallery, Videos, Community, Shop, Shows, Live, About.
- Replaced the old generic `/profile` hub with a stronger personal profile surface and added `/edit-profile`.
- Upgraded `/create-post` toward a premium social composer while preserving real social destination writes through `createSocialPost`.
- Applied targeted light-mode cleanup to the Tickets surface so ticket rows and QR payload panels use shared theme tokens.
- Verification during this pass:
  - `npx tsc --noEmit` passed after MyPLUGGD/profile/composer changes.
  - `node scripts/verify-mobile-navigation-contract.mjs` passed after nav contract update.
  - `node scripts/verify-mobile-route-contract.mjs` passed after route contract update.
  - all `scripts/verify-mobile-*.mjs` passed after updating Search/MyPLUGGD contracts.
  - `npx expo-doctor` passed 17/17.
  - `git diff --check` passed.

## 2026-05-17 Stories / Composer Full-Parity Correction

- Locked the product rule that mobile mapped features must be web-equivalent or better. No lightweight placeholders should ship for PLUGGD’s primary web-backed features.
- Re-audited the web social implementation in `/Users/apple/PLUGGD_NEW/src/components/social/StoriesRail.tsx`, `CreateStory.tsx`, `StoryViewer.tsx`, `CreateSocialPost.tsx`, and `SocialFeed.tsx`.
- Upgraded mobile Stories/Moments so the rail always exposes the signed-in user story slot, not only when other stories exist.
- Wired story creation to the real `social-media` storage bucket and `social_stories` insert path for image, video and audio stories.
- Updated story view tracking to use the web-compatible `mark_story_viewed` RPC and `social_story_views.viewer_id`.
- Added a story deck loader so `/story/[id]` opens the author’s real 24-hour story sequence rather than a generic latest-story lookup.
- Upgraded `/story/[id]` so:
  - video stories render through native `expo-video`,
  - audio stories play through the global PLUGGD player,
  - image stories remain full-screen,
  - story progress and next/previous navigation are present.
- Upgraded MyPLUGGD inline composer to create real posts with media uploads, poll payloads, destination rows, hashtags/mentions extraction, and social feed invalidation.
- Upgraded `/create-post` to upload image, video and audio attachments through the same storage path and submit them to `createMobileSocialPost`.
- Strengthened `scripts/verify-mobile-social-web-parity-contract.mjs` so regressions fail if:
  - stories are hidden when the feed has no other stories,
  - the story viewer lacks video/audio support,
  - composer/story media upload is replaced by a placeholder,
  - canonical social storage/service calls disappear.
- Verification after this correction:
  - `npx tsc --noEmit` passed.
  - `node scripts/verify-mobile-social-web-parity-contract.mjs` passed.
  - all `scripts/verify-mobile-*.mjs` passed.
  - `npx expo-doctor` passed 17/17 checks.
  - `git diff --check` passed.

## 2026-05-17 Corrected MyPLUGGD Web-Parity Notes

- Reworked `src/features/mypluggd/my-pluggd-screen.tsx` so MyPLUGGD maps to the web `/community` social system instead of a basic account feed.
- Locked the internal tabs to exactly: Feed, Circles, Library, Activity.
- Feed now renders:
  - `MobileStoriesRail` for Stories/Moments.
  - A composer entry immediately below stories.
  - For You, Following, Latest, Backstage and Trending feed modes.
  - Real `MobileSocialPostCard` thread cards from `loadMobileSocialFeed`.
- Circles now renders:
  - Fan Map entry using `loadFanMapContext`.
  - Joined/public communities from Backstage services.
  - Real `community_boards` via `loadCommunityBoards`.
  - Event hubs/ticket thread rows from Backstage or web hub payload fallbacks.
  - Active threads and rooms with real routes.
- Library remains the ownership layer for saved content, tickets and purchases.
- Activity remains its own tab and uses `loadMobileNotifications`; Inbox stays separate in the top bar via `/inbox`.
- Added mobile community hub and Fan Map services:
  - `loadMyPluggdHub`
  - `loadFanMapContext`
  - `fn_hub_payload`
  - `get_fan_map_plugs`
  - `get_fan_map_stats`
  - `fan_map_plugs` fallback.
- Strengthened contracts so regressions are blocked for:
  - Stories before feed.
  - Activity not becoming Inbox.
  - Inbox as top-bar utility only.
  - Fan Map using real data services.
  - Board cards opening feeds rather than composer.
- Verification after this corrected MyPLUGGD pass:
  - `npx tsc --noEmit` passed.
  - `npx expo-doctor` passed 17/17 checks.
  - all `scripts/verify-mobile-*.mjs` passed.
  - `git diff --check` passed.

Remaining contextual elevation after this batch:

- Event detail, release detail, beat detail, mix detail, sample-pack detail, soundboard detail, playlist detail, wallet subflows, notifications, inbox and Creator Mode still need the same profile/composer-level visual pass.
- Search is top-level and functional, but old docs/contracts mentioning Search as a bottom tab must continue to be removed if discovered.
- The reference web repo `/Users/apple/PLUGGD_NEW` was inspected only; it already has unrelated dirty files and was not edited in this pass.

Remaining from the full plan:

- Full simulator visual QA and screenshots are still required.
- Contextual pages still need a detailed visual pass one by one: creator profile, event detail, thread/post detail, board feed, release/beat/mix/soundboard/sample-pack/playlist detail, wallet/tickets, notifications/inbox, creator mode, and player.
- Light mode is tokenized and supported by shared chrome, but the older screen-local dark `COLORS` objects still need a deeper pass before light mode can be called final across every surface.
