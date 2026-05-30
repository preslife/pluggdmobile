# PLUGGD iOS Live Page Tasks - 2026-05-17

## Source Instruction

Live is the real-time PLUGGD sessions surface. It must expose real live rooms, session rooms, listening parties, community rooms, event-linked live sessions and replays from the backend. It must not show fake live cards, fake viewer counts, a social feed, stories, creator admin, static event cards pretending to be live, or generic livestream UI.

## Implementation Checklist

- [x] Top bar is `LIVE` with Search, Notifications and Avatar only.
- [x] Wallet is removed from the Live top bar.
- [x] Persistent mini-player remains global through `AppChrome`, above bottom nav when media is active.
- [x] Filter pills are exactly `Live Now | Upcoming | Rooms | Listening Parties | Replays`.
- [x] Live defaults to real `Live Now` when a joinable `session_rooms` item is live.
- [x] Live falls back to `Upcoming` when no joinable live session exists.
- [x] Live Now focus card only shows a coral `LIVE` badge for real active joinable live rooms.
- [x] No-live focus state uses the approved copy and actions: `View Upcoming`, `Watch Replays`.
- [x] Upcoming focus state uses `UPCOMING`, scheduled time/countdown, reminder/details CTA and no fake live badge.
- [x] `Join Live` routes only to `/live/session` for actual joinable session rooms.
- [x] `Set Reminder` uses the existing scheduled-session/event reminder contracts.
- [x] `Open Backstage` appears only when a real `backstage_id` exists.
- [x] Live Now rail only renders when multiple real live sessions exist.
- [x] Live Swipe Entry only renders when real active live rooms exist.
- [x] Added full-screen `/live/feed` swipe experience backed by real live session rooms.
- [x] Full-screen live feed supports vertical swipe next and swipe down/back exit.
- [x] Full-screen live feed shows real chat preview from `session_messages`.
- [x] Upcoming Live Sessions are compact cards and never show Join before live.
- [x] Community Rooms use real room/backstage-linked data only.
- [x] Listening Parties section is derived from real room/session text/category data.
- [x] Studio / Cook-up Sessions section is derived from real room/session text/category data.
- [x] Event-linked Live Sessions only show events with `stream_url` or `playback_url`.
- [x] Replays + Clips only show replay rows when `replay_url` exists.
- [x] Featured Live Creators use real live hosts and profile data.
- [x] Normal fan UI does not expose host controls; host controls remain in `LiveSessionScreen`.
- [x] `LiveSessionScreen` retains Agora, chat, reactions, gifts, stage requests, host controls, report/block and runtime operations.

## Data Sources

- [x] `session_rooms`
- [x] `live_sessions`
- [x] `community_collab_rooms`
- [x] `events` through the existing event layer
- [x] `session_messages` for live-feed chat preview
- [x] `profiles` enrichment through the mobile service layer
- [x] existing reminder, follow, playback and notification services

## Files Changed

- [x] `src/features/live/live-culture-screen.tsx`
- [x] `app/live/feed.tsx`
- [x] `src/features/culture/mobileServices.ts`
- [x] `src/features/culture/mobileTypes.ts`
- [x] `scripts/verify-mobile-live-contract.mjs`

## Verification

- [x] `node scripts/verify-mobile-live-contract.mjs`
- [x] `npx tsc --noEmit`
- [x] all `scripts/verify-mobile-*.mjs`
- [x] `npx expo-doctor`
- [x] `git diff --check`

## Notes

- The page intentionally omits fake live sessions, fake viewer counts and fake replays.
- Event-linked live cards only render from events with real stream or playback media.
- Community rooms route to an exact joinable session room when backed by `session_rooms`, or to the linked Backstage community when backed by community data.
- The full-screen Live Feed is only available when real live session rooms exist.
