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

- [x] Pluggd Ltd Google Play organisation account is verified. Account ID:
      `5583821221716547447`.
- [x] `com.pluggd.mobile` is registered and protected in Play Console.
- [x] Play App Signing is enabled and the app-signing SHA-256 fingerprint is
      recorded in the release handoff.
- [ ] Merchant/payments profile is active for Pluggd Ltd.
- [x] Android Publisher API service account has minimum app-scoped access for
      store presence and internal testing; production release permission is
      intentionally not granted.
- [x] Google Cloud Pub/Sub topic and authenticated push subscription exist for
      RTDN.
- [x] Firebase/Google services configuration is present in the EAS production
      environment for FCM. Supabase remains PLUGGD's application backend.
- [x] A dedicated Mapbox native runtime token is configured as
      `EXPO_PUBLIC_MAPBOX_TOKEN` in each EAS environment. It is a public `pk` token
      with only `styles:read` and `fonts:read`; native mobile SDK tokens cannot
      use URL restrictions, so it is not shared with web or other environments.
- [ ] If the native dependency download requires authenticated access, an EAS
      build secret named `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` is configured as a secret
      `sk` token with only `downloads:read`. It is never passed through Expo
      plugin options or committed to source.
- [ ] `https://pluggd.fm/.well-known/assetlinks.json` contains the Play signing
      fingerprint and serves as JSON without redirects.
- [ ] UK billing-choice and US external-content-link enrolments are approved.
- [ ] The exact EEA programme used by the release permits the implemented choice
      flow; otherwise the EEA external-checkout flag remains disabled.
- [x] The `PLUGGD Internal QA` Play tester list is configured for the internal
      track with `lordtokumbo@gmail.com`.
- [ ] A Sentry project exists for both Android and iOS, with
      `EXPO_PUBLIC_SENTRY_DSN` stored in the applicable EAS environments and
      `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` stored as
      build-only EAS secrets/variables.

Secrets belong in EAS, Google Cloud, Play Console, Stripe, or Supabase. Never
commit `google-services.json`, service-account JSON, signing keys, Mapbox secret
download tokens, Sentry auth tokens, or Play credentials. The public Mapbox
runtime token is a client credential and must remain least-privileged and
environment-specific.

### Live service audit — 2026-08-10

- Pluggd Ltd's Play organisation is verified. Google Cloud project
  `pluggd-mobile-production` contains the Firebase Android app, a least-privilege
  Android Publisher service account, the RTDN topic, and an authenticated OIDC
  push subscription pointed at the Supabase RTDN endpoint.
- EAS project `@pluggd-ltd/pluggd` is linked and its production environment
  contains the Firebase configuration plus the existing public Mapbox runtime
  token. A direct Mapbox style request returned HTTP 200 on 2026-08-10. Sentry
  release upload credentials and a controlled production event remain external
  gates.
- Supabase project `qkwvqmubhyondemhasjp` contains the Google Play verification
  secrets, but its migration history diverges from source and several Android
  commerce objects are not present. Do not bulk-push or repair history; rehearse
  and apply a reviewed schema delta before deploying the new functions.
- The four Android migrations (`20260808130000`, `20260808131000`,
  `20260808132000`, and `20260809140000`) are local-only. The remote project
  exposes existing `resolve-commerce-policy`, `delete-account`,
  `export-my-data`, and `moderate-user-content` function slugs, but does not
  expose `validate-google-play-purchase`, `google-play-rtdn`, or
  `report-google-play-external-transaction`. Existing slugs are not evidence
  that the provider-neutral branch implementations are deployed.
- Supabase has `ACCOUNT_DELETION_AUDIT_SALT`, but does not have the required
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`,
  `GOOGLE_PLAY_PUBSUB_AUDIENCE`,
  `GOOGLE_PLAY_PUBSUB_SERVICE_ACCOUNT_EMAIL`, or external-program secrets.
- Live browser inspection of `https://www.pluggd.fm/account-deletion` renders
  PLUGGD's **Page Not Found** surface. The source route is complete but not
  deployed. `https://pluggd.fm/.well-known/assetlinks.json` returns the generic
  web application HTML shell with `text/html`, not Digital Asset Links JSON.

## Build and native evidence

- [x] `npm run verify:mobile` passes against the checked-in lockfile, including
      all shared/iOS contracts, TypeScript, a real Android Hermes/source-map
      export, Expo Doctor 18/18, and the observability contract.
- [x] The production EAS job repeats installation and verification in a clean
      build environment.
- [x] The current npm advisory result and runtime reachability disposition are
      recorded in `DEPENDENCY_SECURITY_AUDIT_2026-08-08.md`; no automated
      `audit fix` or incompatible SDK change was applied.
- [x] The frozen production lockfile received a fresh dependency audit, and the
      release bundle proves React DevTools/`shell-quote` are excluded.
- [x] Clean Expo CNG Android prebuild passes.
- [x] Debug Gradle build installs and boots on API 36.
- [x] Production AAB is signed by the upload key and accepted by the internal
      Play track.
- [x] The local release AAB manifest targets API 36, has `allowBackup=false`,
      predictive back enabled, adaptive activity configuration, and no legacy
      storage, overlay, cleartext, or Google Maps API-key metadata.
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
  SHA-256 `1a9a42e915965c6e835b19836b3d143ea2c455c2e678e668d63106b4ef9d41ff`.
- Arm64 APK: `android/app/build/outputs/apk/release/app-release.apk`, 150 MB,
  SHA-256 `082027e7d799c9e2586b198a8ea6e5013ed1e22edd766288fa3cd198f0d6fbdf`.
- Both artifacts pass `zipalign -P 16`; the APK verifies with v2 signing. The
  AAB and APK use the local Android Debug certificate only, so neither is a
  Play candidate. Production remains gated on EAS upload signing and Play App
  Signing.
- With Metro stopped, the exact final APK cold-launched the verified
  `https://pluggd.fm/discover` App Link on API 24 and 36. Its immediate
  predecessor passed API 33 and 35 before the API 24–25-only playback branch.
  The complete evidence and limitations are recorded in
  [`ANDROID_DEVICE_MATRIX_2026-08-09.md`](ANDROID_DEVICE_MATRIX_2026-08-09.md).
- API 24 initially exposed a real `OutOfMemoryError` under its 48 MB heap. The
  API 24–25-only image policy now caps derivatives at 360 px and schedules at
  most two native image loads concurrently. The rebuilt APK passed a full
  Discover scroll and settle. A second playback OOM was closed by bounded
  5–10 second buffering and 192 px notification artwork on API 24–25. The final
  APK retained an active MediaSession and foreground service through 50 seconds
  foreground and 10 seconds background playback without a fatal/OOM entry.
- Phone, tablet, and foldable evidence is retained under
  `artifacts/qa/android-v1-2026-08-08/`. The exact release screenshot is
  [phone-release-final-current.png](../../artifacts/qa/android-v1-2026-08-08/phone-release-final-current.png).
  Fold/unfold transitions preserved one process and one `MainActivity`; compact
  and expanded navigation recomposed without duplicating the Router root.
- The Android/Supabase suite passes 29 files and 199 tests. The catalogue test
  proves that new monthly/yearly base plans are activated in Play before their
  provider-neutral server catalogue rows become active.

The 2026-08-09 AAB was built with Sentry upload disabled because the external
Sentry project variables are not provisioned. It predates the native Mapbox
correction and is superseded for map verification. On 2026-08-10, current
source produced a release-mode arm64 APK with Billing 9 and Mapbox, and that APK
cold-launched on API 36 at 1080x1920 and 2560x1440. Home, Discover, Events, and
the live Mapbox event map were rendered and inspected. The final screenshots
are in [`store-assets`](store-assets/). The app still fails safely when
`EXPO_PUBLIC_MAPBOX_TOKEN` is absent or rejected.

## Play internal release evidence — 2026-08-11

- EAS production build `ecd995d7-4fdc-444d-b827-180feeccd45f` completed from
  commit `91c81b8` as Android version code 9. The clean cloud build compiled all
  four supported ABIs, completed release lint and R8 shrinking, and used the
  configured production upload key.
- The downloaded 271 MB AAB has SHA-256
  `7c48c72f3d5cfb3d4b88530da4b1488ac77eee9137b16b87e9be369697a1a68a`.
  ZIP integrity verification reported no errors.
- Android Publisher edit `05212581463699531938` uploaded the exact AAB and
  committed `PLUGGD Android 1.0.0 (9)` to the `internal` track with status
  `completed`. A separate Publisher API read-back returned version code 9 and
  the same completed status.
- Source-map upload is explicitly skipped in EAS profiles until the Sentry
  organisation, project, and auth-token gates above are provisioned. The SDK's
  privacy-safe runtime integration remains in source, but this internal build
  is not evidence of a controlled Sentry release event.

## Play store listing evidence — 2026-08-10

- The `en-GB` listing, 512x512 RGB icon, and 1024x500 RGB feature graphic are
  committed in Play Console.
- Publisher edit `16819659014713659865` committed four 1080x1920 RGB JPEG phone
  screenshots and two 2560x1440 RGB JPEG screenshots to both the seven-inch and
  ten-inch tablet slots. All screenshots are current release-mode renders with
  live 10 August 2026 content; the Events map visibly uses Mapbox.
- Data Safety, app access, ads, content rating, target audience, government,
  financial, and health declarations are completed in Play Console.
- Store-listing assets are complete. Version code 9 is Play-signed and accepted
  on the completed internal-testing track; public rollout remains gated by the
  unchecked commerce, legal, live-service, and device-policy evidence below.

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

- [x] Data Safety form matches `DATA_SAFETY_INVENTORY.md` and the release SDK
      dependency report.
- [ ] Privacy policy, terms, account-deletion URL, support URL, and refund paths
      are public and name Pluggd Ltd consistently. The canonical backend branch
      now includes a self-service, pre-rendered
      `https://www.pluggd.fm/account-deletion` route plus provider-neutral
      deletion/export/moderation functions; live inspection on 2026-08-09 still
      renders **Page Not Found**, so this remains unchecked until the migration,
      functions, and route are deployed and verified on the public host.
- [x] Content rating and target-audience declarations state the 16+ posture.
- [x] Neutral age confirmation appears before social OAuth account creation.
      Signup uses an unchecked accessible 16+ checkbox; login uses an explicit
      provider confirmation action; both Apple and Google helpers reject calls
      without a required consent object before starting OAuth. The focused auth,
      iOS readiness, and TypeScript contracts pass.
- [ ] UGC report/block flows and moderation operations are demonstrated with the
      Play review account.
- [ ] Social/child-safety and CSAE standards/contact are supplied if Play
      categorises PLUGGD as Social.
- [ ] Foreground media playback service is declared with review evidence.
- [ ] App access instructions exercise signed-in, creator, commerce, and safety
      surfaces without relying on production customer data.
- [ ] Phone and tablet screenshots are current release-mode renders and are
      committed to Play. A current foldable screenshot matching the submitted
      AAB remains required before this combined gate can be checked.

## Rollout gates

1. Internal: native infrastructure and one credit/membership test SKU.
2. Closed: complete commerce lifecycle, device matrix, moderation, and account
   deletion. No production money or creator payout unless explicitly approved.
3. Production 5%: monitor crash-free users, ANR, failed verification,
   unacknowledged purchases, RTDN lag, and entitlement mismatches.
4. Promote to 20%, 50%, and 100% only after each cohort remains within the
   agreed thresholds for at least one full billing/notification monitoring day.
