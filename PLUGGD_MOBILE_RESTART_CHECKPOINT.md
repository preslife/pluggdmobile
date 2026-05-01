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
- Installed simulator app metadata now shows:
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

The generated native iOS project under `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/ios` is ignored by git, but it was patched locally during testing so the simulator launches as `com.pluggd.app` and registers `pluggd://`.

The source config in `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app.json` already contains the intended persistent settings:

- `expo.scheme = "pluggd"`
- `expo.ios.bundleIdentifier = "com.pluggd.app"`
- `expo.android.package = "com.pluggd.app"`

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
