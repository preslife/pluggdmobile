# PLUGGD iOS Backstage Page Tasks - 2026-05-17

## Scope

Implement Backstage exactly as the broader PLUGGD participation world:

- community access
- event hubs
- forum/board discussion
- ticket-thread culture
- active rooms
- producer lounge
- challenges/battles/contests
- soundboards
- community moments
- discovery and XP only where backed

Backstage is not the MyPLUGGD feed, not Stories, not Stage, not a marketplace grid, and not creator admin.

## Primary Backstage Page

- [x] Top bar left title is `BACKSTAGE`.
- [x] Top bar right actions are Search, Notifications, Avatar.
- [x] Wallet is not in the Backstage top bar.
- [x] Violet is introduced as the targeted Backstage/community sub-accent, separate from orange CTAs and coral live states.
- [x] Backstage uses a dedicated `backstageVioletStyles` layer for active filters, community accents, and deeper social surfaces.
- [x] Major community cluster tracking headers use Satoshi Black.
- [x] Active forums, hot topic threads, and user/count update text use real Inter Semi-Bold.
- [x] Filter pills are exactly: `My Circles | Event Hubs | Threads | Rooms | Producers | Challenges | Soundboards`.
- [x] Filter pills scroll/filter to real sections and do not create dead tabs.
- [x] Section 1 is `MY BACKSTAGE / MY CIRCLES`.
- [x] My Circles uses joined communities first, then real recommended communities if the user has none.
- [x] My Circles does not fake membership.
- [x] Unread/live/ticket badges render only from real active room/thread relationships.
- [x] Section 2 is `ACTIVE NOW`.
- [x] Active Now uses real `session_rooms`, live rooms, and `community_collab_rooms`.
- [x] Active user counts do not fall back to `max_members`.
- [x] Section 3 is `EVENT HUBS`.
- [x] Event Hubs use compact featured/standard card sizes and route to real event detail.
- [x] Event cards do not show fake ticket threads, fake attendee stacks, or fake QR.
- [x] Section 4 is `HOT THREADS`.
- [x] Hot Threads route to real board/thread/post destinations, not composer.
- [x] Section 5 is `TICKET THREADS`.
- [x] Ticket Threads only show real threads matching ticket/event participation language.
- [x] Section 6 is `COMMUNITY ROOMS`.
- [x] Community Rooms use real room data and route to live/session/backstage destinations.
- [x] Section 7 is `PRODUCER LOUNGE`.
- [x] Producer Lounge shows production threads/rooms/beat-linked discussion without marketplace license grids.
- [x] Section 8 is `CHALLENGES / BATTLES / CONTESTS`.
- [x] Challenges only render real challenge/thread data or an honest empty state.
- [x] Section 9 is `SOUNDBOARDS`.
- [x] Soundboards use real soundboard data and route to soundboard detail.
- [x] Section 10 is `COMMUNITY MOMENTS`.
- [x] Community Moments use real post/event/soundboard media, not personal Stories.
- [x] Section 11 is `DISCOVER MORE BACKSTAGES`.
- [x] Discover More uses real communities/hubs and routes to Backstage detail.
- [x] Section 12 is Backstage Rewards/XP only when membership XP/level exists.

## Backstage Detail

- [x] Detail header is compact, not a 330pt oversized hero.
- [x] Tabs are exactly: `Posts | Threads | Rooms | Events | Soundboards | Drops`.
- [x] Posts use the shared `MobileSocialPostCard` where web-parity social posts are available.
- [x] Threads show boards and threads, and boards open board feed routes.
- [x] Rooms do not route directly to composer.
- [x] Events do not route directly to composer.
- [x] Events route to a real community event detail surface.
- [x] Soundboards tab routes to real soundboard detail.
- [x] Drops route to release/beat/mix detail.

## Board Detail

- [x] Board filters are exactly: `Latest | Hot | Tickets | Audio | Events | Questions`.
- [x] Board filter chips filter the list and do not route directly to composer.
- [x] Composer remains an explicit `Start Thread` action only.
- [x] Thread list uses `MobileSocialPostCard`.
- [x] Board empty state names `social_post_destinations` so regressions are visible.

## Explicit Exclusions

- [x] No personal Stories rail.
- [x] No MyPLUGGD full feed.
- [x] No giant event cards over 248pt on Backstage landing.
- [x] No fake online counts.
- [x] No fake ticket threads.
- [x] No fake attendee stacks.
- [x] No fake live rooms.
- [x] No creator admin tools.
- [x] No marketplace/license grids.
- [x] No board cards routing directly to composer.

## Verification

- [x] `npx tsc --noEmit` passed after Backstage landing/detail/board edits.
- [x] `node scripts/verify-mobile-backstage-contract.mjs` passed after contract update.
- [x] All `scripts/verify-mobile-*.mjs` passed after Backstage edits.
- [x] `npx expo-doctor` passed after Backstage edits.
- [x] `git diff --check` passed after Backstage edits.

Verification output:

- `npx tsc --noEmit`: pass.
- `for script in scripts/verify-mobile-*.mjs; do node "$script"; done`: pass.
- `npx expo-doctor`: 17/17 checks passed.
- `git diff --check`: pass.

## Notes

- Community event detail was added at `/community/events/[id]` so Backstage community events route to a real backend-backed surface instead of composer.
- Physical ticket purchase, QR entry, and attendee stacks remain hidden unless backed by confirmed ticket/order/token payloads.
