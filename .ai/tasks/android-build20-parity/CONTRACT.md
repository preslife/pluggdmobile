# Android Build 20 parity update

Date: 2026-10-02

User instruction: update the Android application already live since 19 August to match the current iOS Build 20, verify it, and submit the Google Play update. Release is intended for full availability on approval, not a staged 5% rollout. Verify live Console settings before submission.

## Source boundaries

- Branch: `codex/android-build20-parity`.
- Worktree: `/Users/apple/.codex/worktrees/android-build20-parity/pluggd-mobile-workspace`.
- Starting source: `1089831508f492ce07a66aeb2cd77fbcc47a6f6b`, with Build 20 application source `bc5e72bf4a4d606a13b622e3521dd904a00925e9` equal to merged native main `ac22da2e1ac5da5f460f37aca589dce307efd60b`.
- Current iOS finalisation advanced to Build 21 at `540d69dbd098327b64b16b7eb8213029402096c3`. Carry only its two reviewed shared upload changes and actual-source tests; do not import iOS build-number configuration or another agent's task records. Foreground session selection is an iOS-only transport setting; Android-relevant change is safe transport-error copy.
- Historical Android source: `codex/android-v1` / `c1b387a3`, production version code 13. Current Play state still needs live confirmation.
- Preserve the dirty primary mobile checkout, active iOS worktree, signed iOS candidates and production data. Never merge into main without explicit approval.
- Any backend delta uses the current web/Supabase source in an isolated branch, never wholesale deployment of mobile's Supabase directory.

## Implementation and verification

1. Carry Build 20 shared product/UI/service fixes; review the complete Android-specific delta.
2. Retain Google Play credits and creator memberships, Mapbox, notifications, authenticated App Links, media-service restrictions and large-screen navigation.
3. Implement provider-neutral PLUGGD platform-plan purchasing, verification, lifecycle and management for Google Play without regressing Apple/Stripe.
4. Avoid a speculative Android redesign or major SDK upgrade. Include only demonstrable platform fixes and native quality improvements.
5. Run shared/Android behavior checks, TypeScript, Expo Doctor, a production Android bundle, clean native configuration and signed candidate inspection. Verify Billing and 16 KB libraries in the actual artifact.
6. Exercise representative layouts/new feature cohorts, media lifecycle and Play-signed commerce. Source assertions and prior iOS/Android screenshots are not current device proof.
7. Reconcile new Maps/music/Battle/support data with Play Data Safety, rating, foreground-service and app-access declarations. Keep unapproved external digital checkout disabled.
8. Upload an internal candidate first, verify exact identity and update behavior, then submit the checked update for public availability on approval.

## Authority and release gate

The user authorises this scoped Android implementation, routine account access, upload and Google Play update submission. New legal agreements require current confirmation. Credential changes, charged purchases, permanent account deletion and destructive unrelated cleanup are not inferred.

Do not submit a known broken purchase flow or claim unperformed physical/device/live tests. Record concrete outstanding gates and retain the released version as recovery reference.
