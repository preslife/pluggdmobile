# Pluggd Mobile Restart Checkpoint

Date: 2026-04-29

## Current Workspace

- Main workspace: `/Users/apple/pluggd-mobile-workspace`
- Mobile app: `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`
- Web app reference repo: `/Users/apple/PLUGGD_NEW`
- Current git branch before checkpoint: `main`

## What Was Verified

- `npx tsc --noEmit` passes in `pluggd-mobile`.
- iOS simulator build succeeded.
- Installed simulator app metadata previously showed:
  - Bundle id: `com.pluggd.app`
  - Display name: `Pluggd`
- `pluggd://live/create` opens the new Create Room screen.
- `pluggd://creator/events` opens the new Events screen.
- Metro was stopped after testing.

## Migrations To Apply Manually

Apply these in order:

1. `/Users/apple/pluggd-mobile-workspace/supabase/migrations/20260428170000_apple_iap_tables.sql`
2. `/Users/apple/pluggd-mobile-workspace/supabase/migrations/20260429120000_session_rooms_mobile_metadata.sql`
3. `/Users/apple/pluggd-mobile-workspace/supabase/migrations/20260429143000_live_room_modes.sql`

## Edge Functions

No edge functions were deployed.

Do not deploy the mobile workspace copy of `manage-live-sessions` over production without checking `/Users/apple/PLUGGD_NEW` first, because the web app has a newer shared version of that function.

IAP functions exist in the mobile workspace, but the web repo already has versions of the same functions. Before deploy, reconcile SKU mapping with current mobile packs:

- `pluggd_credits_starter`
- `pluggd_credits_popular`
- `pluggd_credits_value`
- `pluggd_credits_premium`
- `pluggd_credits_ultimate`

## Mobile Screens Added Or Wired

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/live/create.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/creator/events.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/(tabs)/live/index.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/creator/dashboard.tsx`

## Native iOS Note

The generated native iOS project under `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/ios` is ignored by git, but it was patched locally during testing so the simulator launched as `com.pluggd.app` and registered `pluggd://`.

The source config in `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app.json` already contains the intended persistent settings:

- `expo.scheme = "pluggd"`
- `expo.ios.bundleIdentifier = "com.pluggd.mobile"`
- `expo.android.package = "com.pluggd.mobile"`

## Next Backend Step

After migrations are applied, deploy backend functions only from the safe source:

- For shared live rooms, deploy from `/Users/apple/PLUGGD_NEW`, not from the mobile workspace, unless the web function is intentionally merged with the mobile changes first.
- For Apple IAP, reconcile the production `validate-iap-receipt` SKU mapping before deployment.

## Next Mobile Step

Restart Metro when ready:

```bash
cd /Users/apple/pluggd-mobile-workspace/pluggd-mobile
npx expo start --dev-client --port 8081 --host localhost
```

Then open:

```bash
xcrun simctl openurl booted pluggd://live/create
```

## 2026-05-01 Update

### Mobile Checkpoints Added

- `8a547b9` — added supplied Pluggd brand assets, app icon/splash assets, reusable `BrandLogo`, and `SymbolIcon` compatibility layer.
- `e0a4c95` — fixed NativeWind transformation so className-based screens render correctly in the native iOS build.

### Verified On Simulator

- `npx tsc --noEmit` passes in `/Users/apple/pluggd-mobile-workspace/pluggd-mobile`.
- Metro starts with:
  `npx expo start --dev-client --port 8081 --host localhost --clear`
- Verified screenshots/routes:
  - `pluggd://` home feed
  - `pluggd://auth/login`
  - `pluggd://auth/signup`
  - `pluggd://live/create`
  - `pluggd://wallet`
- Metro showed only repeated `onAnimatedValueUpdate` warnings during spot checks; no JS runtime errors were seen.

### Edge Functions

- Deployed `validate-iap-receipt` to Supabase project `qkwvqmubhyondemhasjp` from `/Users/apple/PLUGGD_NEW`.
- The deployed credit SKU mapping is:
  - `pluggd_credits_starter` → 500 credits
  - `pluggd_credits_popular` → 1,050 credits
  - `pluggd_credits_value` → 2,750 credits
  - `pluggd_credits_premium` → 5,750 credits
  - `pluggd_credits_ultimate` → 12,000 credits
- No live-session Edge Functions were deployed on 2026-05-01. Keep using `/Users/apple/PLUGGD_NEW` as the safe source before any live backend deploy.

### Still Outstanding

- The three migrations listed above still need to be applied manually unless confirmed otherwise.
- `/Users/apple/PLUGGD_NEW` contains untracked Supabase function/migration files from prior work; do not bulk-commit or deploy from there without reviewing its full git status.

## 2026-05-01 IAP Backend Update

- User confirmed the three mobile migrations were applied manually.
- Mobile StoreKit calls now send the signed-in Supabase user id as Apple `appAccountToken` for both credit packs and subscriptions:
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/hooks/useCredits.ts`
  - `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/hooks/useSubscription.ts`
- `npx tsc --noEmit` passes after the change.
- Originally confirmed bundle id from `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app.json`: `com.pluggd.app`.
- User registered new Apple Bundle ID `com.pluggd.mobile`; mobile config and Supabase `APPLE_BUNDLE_ID` were updated to match.
- Next backend step: set Apple App Store Server API secrets in Supabase, then deploy `apple-server-notification` from `/Users/apple/PLUGGD_NEW`, not the mobile workspace copy.

## 2026-05-01 End Of Day Simulator Checkpoint

### Saved Commits

- `aef4db0` — aligned Apple IAP bundle id and wallet credit pricing with `com.pluggd.mobile`.
- `53f92f4` — fixed simulator-discovered Explore and Marketplace render issues.

### Simulator State

- Tested on iPhone 17 Pro simulator.
- Debug dev-client build is installed as `com.pluggd.mobile`.
- Release build was not retried because Xcode previously failed with low disk space. Use Debug for simulator QA until more disk is available.
- Metro was running with `npx expo start --dev-client --localhost` during testing and should be restarted tomorrow if needed.

### Routes Verified On 2026-05-01

- `pluggd:///` — Home/feed loads with real content.
- `pluggd://explore` — Explore now renders Fresh Beats correctly.
- `pluggd://marketplace` — Marketplace now renders instead of crashing.
- `pluggd://wallet` — Wallet loads Apple IAP packs; simulator localized StoreKit prices to dollars, but pack values and product IDs are correct.
- `pluggd://live` — Live lobby loads; current database has no active/upcoming rooms, so empty states display.
- `pluggd://live/create` — Create room screen loads.
- `pluggd://auth/role` — Onboarding role picker loads.
- `pluggd://auth/fan-setup` — Fan setup loads.
- `pluggd://creator/dashboard` — Correctly shows unauthenticated state without login.
- `pluggd://profile` — Redirects to login without login.

### Screenshots Saved

Current screenshot folder:

`/Users/apple/pluggd-mobile-workspace/app-store-screenshots/simulator-pass-2026-05-01`

Files captured:

- `01-home-feed.png`
- `02-explore.png`
- `03-marketplace.png`
- `04-wallet-credits.png`
- `05-live-lobby.png`
- `06-create-live-room.png`
- `07-onboarding-role-picker.png`
- `08-fan-setup.png`

All current screenshots are `1206 x 2622`.

### Still Needed Tomorrow

- Need a valid Supabase test account email/password, or approval to create one, before verifying and screenshotting:
  - full Profile/settings
  - Creator onboarding
  - Creator Studio/dashboard
  - real live-session join/start states
- Old seeded migration credentials (`dyani@example.com`, `elevatetoday@example.com`, `akvr@example.com` with `temp_password_123`) do not work against the current Supabase project.
