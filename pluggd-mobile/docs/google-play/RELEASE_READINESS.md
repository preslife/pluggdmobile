# PLUGGD Android release readiness

Owner: Pluggd Ltd

Package: `com.pluggd.mobile`

Minimum Android: API 24

Target Android: API 36

Audience: 16+

This is the evidence ledger for the Android release. A box is checked only when
the linked Play, Google Cloud, EAS, Supabase, build, or device evidence exists.
Source-level success is not a substitute for a Play-signed build or device test.

## External account gates

- [ ] Pluggd Ltd Google Play organisation account is verified. Live Play
      Console inspection on 2026-08-09 confirms account ID
      `5583821221716547447` is still awaiting Google identity/document approval;
      phone verification and **Create app** remain disabled. Evidence:
      [`play-account-verification-pending.png`](../../artifacts/qa/android-v1-2026-08-08/play-account-verification-pending.png).
- [ ] `com.pluggd.mobile` is registered and protected in Play Console.
- [ ] Play App Signing is enabled and both upload and app-signing SHA-256
      fingerprints are recorded.
- [ ] Merchant/payments profile is active for Pluggd Ltd.
- [ ] Android Publisher API service account has the minimum app-scoped access.
- [ ] Google Cloud Pub/Sub topic and push subscription exist for RTDN.
- [ ] FCM HTTP v1 credentials are configured in EAS.
- [ ] A Maps SDK for Android key is restricted to package and signing SHA-256.
- [ ] `https://pluggd.fm/.well-known/assetlinks.json` contains the Play signing
      fingerprint and serves as JSON without redirects.
- [ ] UK billing-choice and US external-content-link enrolments are approved.
- [ ] The exact EEA programme used by the release permits the implemented choice
      flow; otherwise the EEA external-checkout flag remains disabled.
- [ ] Play licence testers and internal/closed test groups are configured.
- [ ] A Sentry project exists for both Android and iOS, with
      `EXPO_PUBLIC_SENTRY_DSN` stored in the applicable EAS environments and
      `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` stored as
      build-only EAS secrets/variables.

Secrets belong in EAS, Google Cloud, Play Console, Stripe, or Supabase. Never
commit `google-services.json`, service-account JSON, signing keys, Maps keys,
Sentry DSNs, or Play credentials.

## Build and native evidence

- [x] `npm run verify:mobile` passes against the checked-in lockfile, including
      all shared/iOS contracts, TypeScript, a real Android Hermes/source-map
      export, Expo Doctor 18/18, and the observability contract.
- [ ] The production EAS job repeats installation and verification in a clean
      build environment.
- [x] The current npm advisory result and runtime reachability disposition are
      recorded in `DEPENDENCY_SECURITY_AUDIT_2026-08-08.md`; no automated
      `audit fix` or incompatible SDK change was applied.
- [x] The frozen production lockfile received a fresh dependency audit, and the
      release bundle proves React DevTools/`shell-quote` are excluded.
- [x] Clean Expo CNG Android prebuild passes.
- [x] Debug Gradle build installs and boots on API 36.
- [ ] Production AAB is signed by the upload key and accepted by the internal
      Play track.
- [x] The local release AAB manifest targets API 36, has `allowBackup=false`,
      predictive back enabled, adaptive activity configuration, and no legacy
      storage, overlay, cleartext, or unprovisioned Maps-key entry.
- [x] The release dependency report resolves Play Billing Library 9.1.0 through
      `openiap-google:3.0.1` and `expo-iap:5.0.1`.
- [x] All 51 arm64 and 50 x86-64 libraries pass Android 16 KB page-size
      inspection.
- [x] R8, resource shrinking, release lint, AAB packaging, and an exact-source
      minified APK cold-launch smoke pass.
- [x] The exact release APK installs and cold-launches on API 24, 33, 35, and
      36; the repeatable smoke gate records the APK hash, SDK contract, resumed
      activity, timing, screenshot, and fatal/OOM log result.
- [ ] Sentry symbol/source-map upload is verified with a controlled test event.

Sentry is deliberately disabled when `EXPO_PUBLIC_SENTRY_DSN` is absent. The
release gate requires an EAS production build with the build-only source-map
variables above, followed by a controlled JS exception whose Sentry stack
resolves to the original TypeScript source and exact release. Session Replay,
screenshots, view hierarchy capture, default PII, and SDK logs remain disabled.

## Local release evidence — 2026-08-09

The exact current source produced these local audit artifacts:

- AAB: `android/app/build/outputs/bundle/release/app-release.aab`, 236 MB,
  SHA-256 `8067c06b258153e7f9a0b692643f4e49ea7b5f88c0d4ecdc7ebeb7bef10e4804`.
- Arm64 APK: `android/app/build/outputs/apk/release/app-release.apk`, 150 MB,
  SHA-256 `7d73533edd5776719176df7e1619a1b07bfd9851cd9d45269e3f6b5c22c3e090`.
- Both artifacts pass `zipalign -P 16`; the APK verifies with v2 signing. The
  AAB and APK use the local Android Debug certificate only, so neither is a
  Play candidate. Production remains gated on EAS upload signing and Play App
  Signing.
- With Metro stopped, the exact APK cold-launched the verified
  `https://pluggd.fm/discover` App Link on API 24, 33, 35, and 36. The complete
  evidence and limitations are recorded in
  [`ANDROID_DEVICE_MATRIX_2026-08-09.md`](ANDROID_DEVICE_MATRIX_2026-08-09.md).
- API 24 initially exposed a real `OutOfMemoryError` under its 48 MB heap. The
  API 24–25-only image policy now caps derivatives at 360 px and schedules at
  most two native image loads concurrently. The rebuilt APK passed a full
  Discover scroll, settle, and Home navigation without a fatal/OOM entry.
- Phone, tablet, and foldable evidence is retained under
  `artifacts/qa/android-v1-2026-08-08/`. The exact release screenshot is
  [phone-release-final-current.png](../../artifacts/qa/android-v1-2026-08-08/phone-release-final-current.png).
  Fold/unfold transitions preserved one process and one `MainActivity`; compact
  and expanded navigation recomposed without duplicating the Router root.
- The Android/Supabase suite passes 29 files and 199 tests. The catalogue test
  proves that new monthly/yearly base plans are activated in Play before their
  provider-neutral server catalogue rows become active.

The AAB was built with Sentry upload disabled because the external Sentry
project variables are not provisioned. The local Maps key was also absent, so
Events used the deliberate non-crashing fallback. Those are release gates, not
local passes.

## Commerce evidence

- [ ] One Play credit pack completes purchase, server verification, durable
      wallet grant, consume, reinstall recovery, refund, and RTDN handling.
- [ ] One creator membership completes product/base-plan purchase, server
      verification, durable entitlement, acknowledgement, renewal, grace,
      account hold, cancellation, expiry, refund, and revoke.
- [ ] A fan can hold active memberships for two creators at once.
- [ ] Android never finishes a Play transaction before the server returns a
      durable successful grant.
- [ ] Duplicate client retries and duplicate/out-of-order RTDN messages produce
      exactly one grant or lifecycle transition.
- [ ] Beat licensing supports signed-contract payment with Play-acquired credits
      and issues the immutable licence/download entitlement.
- [ ] Physical merchandise and verified in-person event tickets use hosted
      Stripe checkout and reconcile after app termination.
- [ ] External digital checkout is visible only for an approved market/program,
      uses Google's required disclosure/API flow, and is remotely killable.
- [ ] External transactions and refunds are reported within the programme
      deadline; nightly reconciliation alerts on omissions.
- [ ] Provider-specific subscription management and refund/support URLs work.

## Functional and rendered QA matrix

Required form factors:

| Cohort | Required evidence |
|---|---|
| Compact phone | 360dp and 412dp, gesture and three-button navigation |
| Current Pixel | Physical or Play-certified API 36 device |
| Samsung | Physical One UI device |
| Tablet | 7-inch and 10-inch/Pixel Tablet layouts |
| Foldable | Folded, unfolded, resize, and posture transition |
| Minimum OS | API 24 install, launch, auth, playback, and core navigation |
| Modern OS | API 33, 35, and 36 smoke and permission behavior |

For each canonical route cohort capture current-run screenshots in light and
dark appearance, default and large text, and portrait plus supported landscape.
Check edge-to-edge insets, keyboard avoidance, predictive back, multi-window,
player/navigation overlap, loading/empty/error/offline states, and tap targets.

Critical journeys:

- [ ] Email and Google OAuth, callback recovery, logout, and session restore.
- [ ] Home, Discover, Community, Events/Maps, Market, Library, and profile.
- [ ] Persistent player, queue, lock-screen controls, audio focus, Bluetooth,
      headset removal, call interruption, background, and killed process.
- [ ] Camera/microphone denial, retry, settings recovery, Live host/audience,
      and collaboration.
- [ ] Notification delivery/tap in foreground, background, and terminated state;
      untrusted links are rejected.
- [ ] Photo/document picker and large `content://` upload after app restart.
- [ ] Credits, beat licence, membership, purchase history, restore/reinstall,
      hosted checkout, and account deletion.

## Play policy declarations

- [ ] Data Safety form matches `DATA_SAFETY_INVENTORY.md` and the release SDK
      dependency report.
- [ ] Privacy policy, terms, account-deletion URL, support URL, and refund paths
      are public and name Pluggd Ltd consistently.
- [ ] Content rating and target-audience declarations state the 16+ posture.
- [ ] Neutral age confirmation appears before social OAuth account creation.
- [ ] UGC report/block flows and moderation operations are demonstrated with the
      Play review account.
- [ ] Social/child-safety and CSAE standards/contact are supplied if Play
      categorises PLUGGD as Social.
- [ ] Foreground media playback service is declared with review evidence.
- [ ] App access instructions exercise signed-in, creator, commerce, and safety
      surfaces without relying on production customer data.
- [ ] Phone, tablet, and foldable screenshots use current cleared content and
      match the submitted build.

## Rollout gates

1. Internal: native infrastructure and one credit/membership test SKU.
2. Closed: complete commerce lifecycle, device matrix, moderation, and account
   deletion. No production money or creator payout unless explicitly approved.
3. Production 5%: monitor crash-free users, ANR, failed verification,
   unacknowledged purchases, RTDN lag, and entitlement mismatches.
4. Promote to 20%, 50%, and 100% only after each cohort remains within the
   agreed thresholds for at least one full billing/notification monitoring day.
