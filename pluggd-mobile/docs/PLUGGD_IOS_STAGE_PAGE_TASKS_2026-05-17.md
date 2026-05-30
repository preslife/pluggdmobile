# PLUGGD iOS Stage Exact Implementation Tasks

Date: 2026-05-17  
Repo: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`  
Read-only reference: `/Users/apple/PLUGGD_NEW`

## Non-Negotiable Stage Purpose

- Stage is media discovery and playback.
- Stage is where users decide what to play, watch, save, or discover.
- Stage is not a social feed.
- Stage is not a marketplace homepage.
- Stage is not creator admin.
- Mini-player remains global above bottom navigation when media is active; it is not inside Stage scroll.
- Every visible play/save/open action must use real media, a real route, real persistence, or an honest empty/unavailable state.

## Exact Implementation Checklist

### 1. Top Bar

- [x] Left title is `STAGE`.
- [x] Right side order is Search, Notifications, Avatar.
- [x] Wallet is not in the Stage top bar.
- [x] Title uses the premium page title style.
- [x] Icon visible size is 22-24pt.
- [x] Icon touch area is 44pt.
- [x] Avatar touch area is 44pt.

### 2. Filter Pills

- [x] Filters are exactly For You, Releases, Mixes, Videos, Beats, Soundboards, Playlists.
- [x] Row height is 40-44pt.
- [x] Pill visible height is 30-34pt.
- [x] Touch target is 44pt.
- [x] For You shows the full mixed Stage surface.
- [x] Releases, Mixes, Videos, Beats, Soundboards and Playlists filter the whole page to that media type.
- [x] Beats do not dominate the default For You page.

### 3. Continue Listening

- [x] Shows only when real playback history exists.
- [x] Uses `release_plays` through `loadRecentlyPlayedLibraryItems`.
- [x] Height is 72-88pt.
- [x] Full width minus gutters.
- [x] Contains artwork, title, creator/meta, progress line and play/continue affordance.
- [x] Does not render fake listening rows.

### 4. Featured Stage Hero

- [x] Main editorial media feature exists.
- [x] Height is 230-270pt.
- [x] Full width minus 16pt gutters.
- [x] Radius is 22-24pt.
- [x] Image/artwork led with subtle motion.
- [x] Category tag maps to Release, Mix, Video, Soundboard, Beat, Playlist or Sample Pack.
- [x] Title is 26-30pt and max two lines.
- [x] Creator and metadata render from backend rows.
- [x] Play appears only when a playable URL exists.
- [x] Open appears when playable media does not exist.
- [x] Save uses backed persistence.
- [x] Enter Backstage is gated by a real `backstageRoute`; no fake Backstage CTA is shown.

### 5. Swipe Beats

- [x] Promo card is visible in For You and Beats contexts.
- [x] Promo height is 120-150pt.
- [x] CTA is `Start Swiping`.
- [x] Tapping opens `/swipe-beats`.
- [x] Swipe Beats full screen uses real published beats.
- [x] Swipe right saves.
- [x] Swipe left skips.
- [x] Swipe up opens license/detail.
- [x] Double tap saves/likes.
- [x] Preview playback uses real beat audio where present.

### 6. Stage Sections

- [x] Trending Now renders mixed real media.
- [x] New Drops / Releases renders releases, singles, EPs and albums from `releases`.
- [x] Mixes renders public published mixes.
- [x] Videos renders `videos`.
- [x] Soundboards renders `soundboards` and latest `soundboard_items`.
- [x] Beats / Producer Drops renders compact rows, not marketplace cards.
- [x] Charts renders compact ranked rows for Beats, Releases, Mixes and Creators.
- [x] Genre Hubs uses the real onboarding genre list and opens genre detail.
- [x] Radio / Mood Stations are not shown because no backed station logic is confirmed.
- [x] Playlists renders real playlists.
- [x] Sample Packs renders real sample packs below Beats/Soundboards/Playlists.
- [x] Recommended Creators renders real creator profiles.

### 7. Stage Must Not Include

- [x] No full social feed.
- [x] No Stories rail.
- [x] No profile banner.
- [x] No merch/store grid.
- [x] No creator admin tools.
- [x] No fake radio stations.
- [x] No fake play buttons.
- [x] No fake save states.
- [x] No licensing purchase modules on the main Stage page.

## Files Changed

- `src/features/stage/stage-discovery-screen.tsx`
- `app/swipe-beats.tsx`
- `app/genre/[genre].tsx`
- `scripts/verify-mobile-stage-contract.mjs`

## Verification

- [x] `node scripts/verify-mobile-stage-contract.mjs`
- [x] `npx tsc --noEmit`
- [x] all `scripts/verify-mobile-*.mjs`
- [x] `npx expo-doctor`
- [x] `git diff --check`
