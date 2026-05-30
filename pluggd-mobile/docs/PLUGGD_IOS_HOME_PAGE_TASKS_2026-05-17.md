# PLUGGD iOS Home Page Exact Implementation Tasks

Date: 2026-05-17  
Repo: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`  
Read-only reference: `/Users/apple/PLUGGD_NEW`

## Non-Negotiable Home Purpose

- Home is PLUGGD's public front door.
- Home shows what PLUGGD is across music, creators, events, live, commerce and community.
- Home is not the social feed.
- Home does not have Stories.
- Home does not start with feed posts.
- Home must use real backend data and real routes only.
- No fake metrics, fake live states, fake artists, fake events, fake checkout or placeholder social modules.

## Exact Implementation Checklist

### 1. Top Bar

- [x] Left side is the real PLUGGD logo.
- [x] Right side order is Search, Notifications, Wallet, Avatar.
- [x] Top bar height is 56-64pt.
- [x] Logo visual height is 20-24pt.
- [x] Icon visible size is 22-24pt.
- [x] Every icon/avatar control has a 44pt touch target.

### 2. Lead Platform Spotlight

- [x] Appears immediately below the top bar.
- [x] Pulls the best single current PLUGGD moment by priority:
  1. major release/mix/soundboard drop
  2. active live session
  3. major event/ticket moment
  4. creator/community spotlight
  5. campaign/crowdfunding/membership moment
- [x] Does not show generic badge text like LIVE / DROP / EVENT / FEATURED.
- [x] Width is full minus 16pt gutters.
- [x] Height is 190-220pt.
- [x] Radius is 22-24pt.
- [x] Image/video/artwork is primary.
- [x] Copy is editorial, e.g. "New from ..." or "Tonight in ...".
- [x] CTA is only one of Listen, Open, Join Live, View Event, Open Soundboard.
- [x] CTA only appears when it maps to a real route/data action.

### 3. Today On PLUGGD

- [x] Compact snapshot rail appears after spotlight.
- [x] Cards are in this exact order:
  1. New drops
  2. Live soon
  3. Events near you
  4. Soundboards active
  5. Creator to watch
- [x] Card width is 136-156pt.
- [x] Card height is 104-124pt.
- [x] Card radius is 16pt.
- [x] Counts/status text are real or honest empty states.

### 4. New On Stage

- [x] Stage preview appears after Today On PLUGGD.
- [x] Includes real releases, mixes, videos, beats, soundboards and playlists when available.
- [x] Card width is 140-160pt.
- [x] Card height is 190-220pt.
- [x] Artwork is 140-160pt.
- [x] Title max is 2 lines.
- [x] Every card opens the real detail route.

### 5. Creators To Follow

- [x] Appears after New On Stage.
- [x] Uses real creator profiles.
- [x] Card width is 132-148pt.
- [x] Card height is 168-188pt.
- [x] Avatar/artwork is 72-88pt.
- [x] Follow button visible height is 30-34pt.
- [x] Follow touch target is 44pt.
- [x] Live dot appears only if backed by real live state.
- [x] Follow/Open action is active and real.

### 6. Live Now

- [x] Appears after Creators To Follow.
- [x] Uses real active live sessions only.
- [x] Card width is 150-170pt.
- [x] Card height is 180-210pt.
- [x] Preview area is 104-124pt.
- [x] Live state appears only if real.
- [x] Listener/viewer count appears only if real.
- [x] Join Live routes to the exact live/session room.

### 7. Events And Ticket Culture

- [x] Appears after Live Now.
- [x] Uses compact Home preview cards, not huge Backstage/event hub cards.
- [x] Card width is 220-260pt.
- [x] Card height is 150-176pt.
- [x] Image strip height is 64-76pt.
- [x] Content block height is 74-90pt.
- [x] Includes event image, event title, date/city, RSVP/ticket state.
- [x] CTA is View Event, RSVP or Get Tickets and routes to real event detail/status handling.

### 8. Backstage Activity Preview

- [x] Appears after Events And Ticket Culture.
- [x] It is not the feed.
- [x] Uses full-width compact cards.
- [x] Card height is 76-96pt.
- [x] Max visible cards is 3.
- [x] Includes community/event hub name, thread title, latest reply preview, real reply count and real attachment chip if present.
- [x] Includes View more in Backstage CTA.

### 9. Marketplace / Store Preview

- [x] Appears after Backstage Activity Preview.
- [x] Surfaces real beats, sample packs and creator store/merch products where available.
- [x] Does not dominate Home.
- [x] Card width is 150-180pt.
- [x] Card height is 180-220pt.
- [x] Cards open real detail/store routes or honest unavailable states.

### 10. Progress / Rewards Teaser

- [x] Appears only if signed in.
- [x] Height is 88-112pt.
- [x] Full width minus gutters.
- [x] Uses real XP, badge, quest or credits data where available.
- [x] Hidden when signed out.

### Home Must Not Include

- [x] No Stories rail.
- [x] No full feed.
- [x] No giant feed posts.
- [x] No composer.
- [x] No inbox.
- [x] No profile editing.
- [x] No creator admin modules.
- [x] No fake metrics.

## Verification

- [x] `npx tsc --noEmit`
- [x] `node scripts/verify-mobile-home-contract.mjs`
- [x] all `scripts/verify-mobile-*.mjs`
- [x] `npx expo-doctor`
- [x] `git diff --check`

## Implementation Notes

- Home now renders exactly as PLUGGD's public front door: spotlight, Today rail, Stage preview, creators, Live, events/tickets, Backstage preview, marketplace/store, and signed-in rewards teaser.
- Home no longer imports or renders Stories, the social feed, the composer, inbox, profile editing, or creator admin surfaces.
- The global Home top bar now shows the PLUGGD logo on the left and Search, Notifications, Wallet and Avatar on the right with 44pt touch targets.
- Home uses real Supabase-backed sources through existing mobile services and typed queries. Unsupported or empty sections show honest empty states instead of fake rows/counts.
- Video cards now open a real `/videos/[id]` mobile detail route.
- Store/merch cards now open a real `/product/[id]` mobile detail route with an honest mobile-checkout-pending state instead of a fake checkout.
- `scripts/verify-mobile-social-web-parity-contract.mjs` was corrected so the full social feed/stories/composer requirement is enforced on MyPLUGGD, not Home.
