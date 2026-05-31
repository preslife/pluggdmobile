# Mobile Community Feed Parity QA - 2026-05-31

## Scope

This QA note covers the native Community feed parity batch on `checkpoint/ios-current-state-for-review`.

Locked areas were not changed:
- Global dock remains Home / Discover / Community / Events / Market.
- Create remains a floating role-aware action sheet.
- Account/profile remains available through the avatar/account sheet.
- Apple/IAP setup, Bundle ID, StoreKit SKUs, receipt validation, and payment strategy were not changed.

## Verification

Passed:
- `node scripts/verify-mobile-community-feed-contract.mjs`
- `node scripts/verify-mobile-navigation-contract.mjs`
- `node scripts/verify-mobile-social-web-parity-contract.mjs`
- `node scripts/verify-mobile-public-copy-contract.mjs`
- `node scripts/verify-mobile-web-source-truth-contract.mjs`
- `node scripts/verify-mobile-mypluggd-contract.mjs`
- `npx tsc --noEmit`
- `npm run verify:mobile`

`npm run verify:mobile` included the aggregate mobile contracts, TypeScript, and Expo Doctor. Expo Doctor reported 18/18 checks passing.

## Simulator QA

Passed on iPhone 17 Pro Max simulator:
- Opened `pluggd://community`.
- Community renders as a feed-first screen, not the generic parity directory.
- Header, Community title, internal Feed / Communities / Boards / Explore switcher, stories rail, composer, prompt module, feed filters, post cards, global dock, and floating Create action are visible.
- Fixed the first screenshot issue where the Community title was hidden under the fixed mobile header.
- No visible Stage / Backstage / MyPLUGGD labels on the Community screen or global dock.
- No visible public planning copy such as backend contract, unsupported payment, native translation, or unsupported module wording.

Screenshot artifact:
- `artifacts/screenshots/community-feed-parity-2026-05-31/community-iphone17promax-after-offset.png`

Passed on iPhone Air simulator:
- Installed the dev client on iPhone Air simulator `808FC930-B111-4D35-A9D0-61971700A272`.
- Opened `pluggd://community`.
- Community title and internal controls are visible without header overlap.
- Stories rail, signed-out composer gate, Community Prompt, feed filters, and a social post card are visible.
- Global dock labels remain readable: Home / Discover / Community / Events / Market.
- Create remains outside the dock.

Screenshot artifact:
- `artifacts/screenshots/community-feed-parity-2026-05-31/community-iphone-air-after-cache-clean.png`

Storage/cache note:
- Initial iPhone Air install attempts failed with `ENOSPC`.
- Cleared generated artifacts only: Xcode DerivedData, local `.expo`, `ios/build`, unavailable simulators, npm cache, two simulator device containers, and `~/Library/Developer/XcodeBuildMCP/workspaces`.
- The XcodeBuildMCP workspace cache was the missing 5.1 GB build-cache source.
- Available disk improved to 15 GB before the successful iPhone Air build.

## Product Checks

Completed:
- Community tab now renders `CommunityFeedScreen`, not `CommunityParityScreen`.
- Stories/Moments rail appears at the top of the feed.
- Composer appears above the feed, with a signed-out compose gate.
- Feed filters exist: All, Threads, Media, Reposts, Activity.
- Social feed renders native post cards with like, comment, repost, bookmark, share, and report actions.
- Pull-to-refresh is wired through the feed query.
- Mobile interstitial modules are interleaved into the feed: Community Prompt, Live Now, Who To Follow, Trending Boards, Nearby Events, and Community Radio where backed by data.
- Internal Community switcher exists: Feed, Communities, Boards, Explore.
- Existing generic parity helpers are retained for secondary Community tabs, not the main Feed tab.
- Hashtag navigation routes to `/hashtag/[tag]`.
- Post detail route interactions invalidate Community feed data.
- Release, beat, mix, and event Post actions route to the composer with attachment parameters.

Remaining external QA:
- Signed-in post creation against live Supabase data.
- Real-device TestFlight pass.
