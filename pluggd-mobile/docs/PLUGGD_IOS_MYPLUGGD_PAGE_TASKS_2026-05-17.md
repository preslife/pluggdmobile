# PLUGGD iOS MyPLUGGD Exact Implementation Tasks

Date: 2026-05-17  
Repo: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`  
Read-only reference: `/Users/apple/PLUGGD_NEW`

## Non-Negotiable MyPLUGGD Purpose

- MyPLUGGD is the user's personal social home.
- MyPLUGGD opens on Feed by default.
- Tabs are exactly Feed, Circles, Library, Activity.
- Search and Inbox are top-bar utilities, not bottom tabs and not Activity replacements.
- Profile is not shown as a banner/card in the Feed.
- Stories/Moments appear here, not on Home.
- Feed is visible immediately after Stories, compact composer and feed controls.
- Every row/card/action uses real backend data, a real route, a real mutation, or an honest unavailable state.

## Status Notes

- Implemented in `src/features/mypluggd/my-pluggd-screen.tsx`.
- Stories/Moments use `MobileStoriesRail` in compact mode above the composer/feed only.
- Feed uses the canonical mobile social service and `MobileSocialPostCard`.
- Circles includes real joined communities, rooms, threads, event hubs, boards, recommended circle join mutation, and a full-screen Fan Map backed by `loadFanMapContext` and `createFanMapPlug`.
- Library uses saved/owned content plus real `release_plays` for Recently Played and a real `/playlists/new` route for playlist creation.
- Activity remains a tab; Inbox remains a top-bar route.
- Avatar opens the approved menu order: View Profile, Edit Profile, Inbox, Wallet, Tickets, Saved, Settings, Creator Mode, Sign Out.

## Exact Implementation Checklist

### 1. Top Bar

- [x] Left title is `MY PLUGGD`.
- [x] Right side order is Search, Inbox, Notifications, Avatar.
- [x] Top bar content height is 56-64pt after safe area.
- [x] Title size is 28-32pt, bold/heavy.
- [x] Icon visible size is 22-24pt.
- [x] Icon touch area is 44x44pt.
- [x] Avatar visible size is 30-34pt.
- [x] Avatar touch area is 44x44pt.

### 2. Tab Row

- [x] Appears directly below the top bar.
- [x] Tabs are exactly Feed, Circles, Library, Activity.
- [x] Default selected tab is Feed.
- [x] Row height is 40-44pt.
- [x] Labels are 13-14pt.
- [x] Active underline is 3pt orange.
- [x] Touch area per tab is at least 44pt.
- [x] Activity remains a tab and is not moved into Inbox.

### 3. Feed: Stories / Moments Rail

- [x] Stories rail appears directly below the tab row.
- [x] Stories rail is above composer and feed.
- [x] Stories do not appear on Home.
- [x] Rail height is 84-96pt.
- [x] Story circle/avatar is 56-64pt.
- [x] Label size is 10-11pt.
- [x] Rail scrolls horizontally with 16pt page padding.
- [x] First item is `Your story`.
- [x] `Your story` opens create story/moment.
- [x] Unwatched ring is orange/accent.
- [x] Watched ring is muted grey.
- [x] Live story badge appears only if backed by real live state.
- [x] Empty rail still provides a useful real create/suggested moments state.

### 4. Feed: Compact Composer Entry

- [x] Appears directly below Stories.
- [x] Height is 48-56pt.
- [x] Full width minus 16pt gutters.
- [x] Radius is 14-16pt.
- [x] Entire row is tappable.
- [x] User avatar is 32-36pt.
- [x] Placeholder is `What's happening?`.
- [x] Right quick actions are image/video, music/audio, event/thread.
- [x] Visible quick-action icons are 18-20pt.
- [x] Each quick action has a 44pt touch area.
- [x] Tapping row opens composer.
- [x] Music icon opens share music/beat/release route/state.
- [x] Event icon opens event/thread/share route/state.
- [x] No follower stats, bio, View Profile, profile banner or large avatar block.

### 5. Feed: Feed Switch

- [x] Appears below compact composer.
- [x] Options are exactly For You and Following.
- [x] Row height is 40-44pt.
- [x] Active underline is 3pt orange.
- [x] Label size is 14-15pt.
- [x] Touch area is at least 44pt.
- [x] For You uses personalised PLUGGD social feed data.
- [x] Following uses stricter followed/joined data.
- [x] Following empty state shows follow/join suggestions.

### 6. Feed: Full Social Feed

- [x] Feed renders full-width timeline items, not small modules.
- [x] Feed supports the shared web-parity social card.
- [x] Text, image, video, audio, repost, quote, reply, release, beat, mix, soundboard, event, live room, community/thread, board, playlist and poll content routes/actions are supported by the shared card/service layer.
- [x] Action row includes reply, repost, like, save and share.
- [x] Empty/new user state title is `Build your feed`.
- [x] Empty/new user state body is `Follow creators, join circles, and save music to make MyPLUGGD yours.`
- [x] Empty/new user state has `Find creators` and `Join circles` CTAs.

### 7. Circles

- [x] Circles is the user's personal community/forum home, not full Backstage discovery.
- [x] Order is My Circles Rail, Fan Map entry, Active Now, Unread Threads, Event Hubs I'm In, Ticket Threads, Followed Boards, Recommended Circles.
- [x] My Circles rail card dimensions match 132-148pt wide and 156-176pt high.
- [x] Badges/counts appear only when real.
- [x] Active Now rows route to exact rooms.
- [x] Unread Threads rows route to real post/thread routes.
- [x] Event Hubs rows route to event/hub detail.
- [x] Ticket Threads are filtered event/ticket discussions.
- [x] Followed Boards open board feeds, not composer.
- [x] Recommended Circles use real communities and join routes.
- [x] Fan Map opens full-screen and uses the real fan map backend.
- [x] Fan Map allows users to plug in publicly with a message/comment.

### 8. Library

- [x] Library is the user's saved, owned, collected and personalised content.
- [x] Order is Recently Played, My Playlists, Saved Music, Saved Posts, Saved Threads/Boards, Saved Events, Tickets, Purchases/Unlocks, Wallet/Credits Shortcut, Badges/XP/Rewards.
- [x] No fake saved content.
- [x] Recently Played reads real `release_plays`.
- [x] My Playlists has a real playlist creation route.
- [x] QR/ticket state only appears where backed by real payload.
- [x] Wallet shortcut opens Wallet and keeps Apple IAP rules intact.

### 9. Activity

- [x] Activity is the full history of social/product activity.
- [x] Inbox/DMs are not inside Activity.
- [x] Filter pills are All, Mentions, Replies, Follows, Communities, Events, Rewards.
- [x] Activity sections are Mentions/Replies, Community Updates, Event/Ticket Updates, Live Updates, Likes/Reposts/Saves, New Followers, Rewards/XP/Badges.
- [x] Rows route to real deep links or notifications.

### 10. Profile Access Rule

- [x] No profile banner in Feed.
- [x] Profile is reached through top-right avatar.
- [x] Profile is reachable from Your story avatar.
- [x] Profile is reachable from own post avatar through shared post card behavior.
- [x] Avatar menu/profile routes remain available in the approved order.

## Verification

- [x] `npx tsc --noEmit`
- [x] `node scripts/verify-mobile-mypluggd-contract.mjs`
- [x] `node scripts/verify-mobile-social-web-parity-contract.mjs`
- [x] all `scripts/verify-mobile-*.mjs`
- [x] `npx expo-doctor`
- [x] `git diff --check`
