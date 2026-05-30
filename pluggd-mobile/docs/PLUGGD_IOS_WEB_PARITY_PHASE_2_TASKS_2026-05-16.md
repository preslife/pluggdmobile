# PLUGGD iOS Web-Parity Phase 2 Tasks

Date: 2026-05-16

Primary repo: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`  
Read-only reference repo: `/Users/apple/PLUGGD_NEW`

## Rules

- [x] Continue from the existing mobile app. Do not restart.
- [x] Preserve auth, access gate, Supabase, StoreKit/IAP, wallet, playback, live, social, thread, and Backstage foundations.
- [x] Keep `/Users/apple/PLUGGD_NEW` read-only.
- [x] Keep bottom nav exactly: Home, Stage, Live, Backstage, Search.
- [x] After each phase, update this document with notes and verification output.

## Phase 0 - Task Control And Contracts

- [x] Create this Phase 2 task document.
- [x] Add or extend contracts for stories, playlists, creator profiles, live room depth, event discussion, soundboards, notifications/inbox, store/support, advanced search, fan identity, fake fallback blocking, and dead button blocking.
- [x] Run all existing `scripts/verify-mobile-*.mjs`.

Notes:
- Added `scripts/verify-mobile-phase2-web-parity-contract.mjs`.
- Updated older contracts to recognize the new service-backed Inbox, creator profile bundle, notification deep-link service, and soundboard service.

## Phase 1 - Stories / Moments

- [x] Add typed mobile story models.
- [x] Add mobile story service using the web-backed `social_stories`, `social_story_views`, `mark_story_viewed`, and capability fallbacks.
- [x] Add Story rail/viewer surfaces for Home, Creator Profiles, Backstage communities, and Events where supported.
- [x] If upload is not confirmed, keep creation explicitly unavailable instead of faking it.

Notes:
- Added `MobileStoriesRail` and `/story/[id]`.
- Story creation is gated by `can_create_social_story`; upload remains unavailable unless the mobile media contract is confirmed.

## Phase 2 - Playlists

- [x] Add typed playlist models and service.
- [x] Add playlist detail route.
- [x] Add playlists to Stage/Search/Library access.
- [x] Add create/follow/add-to-playlist/share actions only where backend support exists.

Notes:
- Added `/playlists/[id]`.
- Search now includes Playlists.
- Playlist item loading supports `playlist_items` and `playlist_tracks`; unsupported mutations return explicit unavailable states.

## Phase 3 - Creator Profile Fan Parity

- [x] Upgrade creator profiles into fan-facing public profiles with Music, Live, Events, Clips/Gallery, Backstage, Store/Support, and Membership sections.
- [x] Wire creator Backstage entry, follow/support, upcoming lives, releases, mixes, beats, soundboards, and events.
- [x] Keep editing, analytics, payouts, distribution, inventory, and deep Creator Studio on web or Creator Mode only.

Notes:
- Added `CreatorProfileBundle` and moved profile content loading into the shared mobile service layer.
- Creator profile now surfaces Releases, Mixes, Beats, Sample Packs, Soundboards, Live, Events, Backstage, Playlists, Store/Support, Membership, and Creator Moments.
- Creator events and soundboards use fallback owner-key queries so older/newer web schemas can resolve `created_by`, `creator_id`, `user_id`, or `promoter_id`.

## Phase 4 - Live Room Depth

- [x] Preserve native Agora room entry and existing chat/gift/reaction/stage request foundations.
- [x] Confirm fan Live cards route to exact rooms/sessions/replays.
- [x] Confirm host controls for runtime preferences, recording/restream, stage moderation, waiting-room/green-room state, and safe unavailable states.

Notes:
- Existing native Agora room entry, chat, gifts, reactions, stage request, runtime preference, recording/restream, and moderation foundations are preserved.
- Advanced production tooling remains web/Creator Mode unless the mobile contract is safe.

## Phase 5 - Events / Ticket Culture

- [x] Preserve event detail, RSVP/reminder, event comments, ticket wallet, and ticket QR foundations.
- [x] Add who’s going, promoter/venue profile links, map/location context, event-linked Backstage hub, and richer discussion affordances.
- [x] Keep native ticket purchase disabled until a compliant mobile payment contract is confirmed.
- [x] Show QR only when backed by a real token/payload.

Notes:
- Added `loadEventCultureContext` for event attendance, venue/promoter summaries, event social destination posts, and event stories.
- Ticket purchase remains disabled unless a compliant payment contract is confirmed.

## Phase 6 - Soundboards

- [x] Rebuild soundboard detail as a real PLUGGD surface with audio/note/image/link/poll items.
- [x] Add item reactions/comments, board comments, share/post-to-feed, secure downloads where allowed, and play-count logging where backed.
- [x] Avoid presenting soundboards as simple lists.

Notes:
- Added `loadSoundboardItemDetails`, board comments, item comments, item reactions, and play-count logging through `increment_soundboard_item_play`.

## Phase 7 - Notifications / Inbox / DMs

- [x] Complete activity feed, notification deep links, DM/inbox entry, read/unread state, push token registration path, and notification preferences.
- [x] Use web navigation mapping for deep-link routing.

Notes:
- Activity now uses `loadMobileNotifications`/`markMobileNotificationRead`.
- Added `/inbox` backed by `conversation_threads`, with explicit unavailable state if the backend is absent.
- Added `registerPushToken`.

## Phase 8 - Store / Support / Memberships

- [x] Add fan-facing storefront/support surfaces: creator store browsing, physical merch where supported, tips/gifts/credits, memberships/subscriptions, purchases in Wallet/Library.
- [x] Keep inventory, fulfilment, tax, payout, variants, and business settings on web Creator Studio.
- [x] Preserve Apple-compliant IAP/credits rules for digital goods.

Notes:
- Creator profiles and Search now surface Store/Support and Memberships.
- Store digital checkout remains contextual/disabled unless a compliant mobile route exists.

## Phase 9 - Advanced Search

- [x] Add filters/results for playlists, stories, store/support, memberships, rewards/fan identity, and any remaining web-backed categories.
- [x] Every row must route to a real detail screen or a clear unavailable state.

Notes:
- Search filters now include Playlists, Stories, Store, and Memberships alongside the existing social, board, music, event, community, user, beat, and live filters.

## Phase 10 - Fan Identity / Rewards

- [x] Add consumer-facing identity surfaces: badges, rewards, community leaderboards, challenge voting, attended events, and joined communities.
- [x] Keep mature music-culture framing, not childish gamification.

Notes:
- Replaced the placeholder Badges/Rewards route with a real `loadFanIdentitySummary` surface for badges, rewards, joined communities, attended events, and challenge votes.

## Phase 11 - Visual Polish And QA

- [x] Bring contextual pages up to the premium tab standard: creator profile, event detail, playlist detail, soundboard detail, wallet tickets, notifications, inbox, store/support.
- [x] Add skeletons, image fade/caching, haptics, pressed states, accessibility labels, and tighter safe-area spacing.
- [ ] Run screenshot QA on Home, Stage, Live, Backstage, Search, Creator Profile, Event, Playlist, Soundboard, Wallet, Notifications, Inbox, and Player.

Notes:
- Visual/contextual upgrades were applied to Creator Profile, Event Detail, Playlist Detail, Soundboard Detail, Notifications, Inbox, Search, Stories, and Fan Identity.
- Full screenshot QA remains a manual/device pass after the next simulator run.

## Verification Log

- `npx tsc --noEmit` passed.
- `npx expo-doctor` passed: 17/17 checks, no issues detected.
- `for script in scripts/verify-mobile-*.mjs; do node "$script"; done` passed.
- `git diff --check` passed.
- `/Users/apple/PLUGGD_NEW` was used for read-only reference only. It already has uncommitted changes in its own worktree; this pass did not write to that repo.

### 2026-05-16 Second Surface Audit

- Rechecked the Phase 2 checklist, primary route layout, AppChrome, global header/menu, mini-player, Creator Mode, public creator profile, events, soundboards, search, stories, playlists, notifications, inbox, memberships, wallet/tickets, and legacy creator routes.
- Fixed a hardcoded mini-player Backstage badge (`142 backstage`) and replaced it with a data-driven route/label using optional playback metadata.
- Updated playback track metadata to support `backstageId`, `backstageRoute`, and `backstageActiveCount`.
- Corrected the capability map so social post creation/reposts reflect the implemented web-backed social layer.
- Redirected legacy heavy mobile Creator Studio routes `/creator/dashboard` and `/creator/memberships` to `/creator-mode`, preserving the rule that full Studio remains web-only.
- Strengthened contracts so hardcoded Backstage counts and heavy creator routes cannot regress.

Fresh verification after this audit:
- `npx tsc --noEmit` passed.
- `for script in scripts/verify-mobile-*.mjs; do node "$script"; done` passed.
- `npx expo-doctor` passed: 17/17 checks, no issues detected.
- `git diff --check` passed.

## Backend/Product Blockers

- Native ticket purchase remains disabled until a compliant mobile payment contract is confirmed.
- Apple Wallet passes remain deferred until pass generation/signing exists.
- Story and rich media creation depends on confirmed mobile storage/upload contracts.
- Missing backend features must render premium unavailable/empty states, not fake completed flows.
- Full screenshot QA and role-based manual QA still need a simulator/device pass with real fan, creator, and promoter accounts.
- I cannot honestly call the app final/world-class until screenshot QA and role-path QA are complete on real data-bearing accounts; automated parity/contracts are green, but visual feel and real entitlement/live/ticket paths need manual proof.
