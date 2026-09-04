# Android release device matrix — 2026-08-09

Artifact under test: local minified arm64 release APK

Final SHA-256: `082027e7d799c9e2586b198a8ea6e5013ed1e22edd766288fa3cd198f0d6fbdf`

Package contract: `com.pluggd.mobile`, version code 1, minimum API 24,
target API 36. Metro was stopped for every run. Each run installed the APK,
force-stopped the package, cleared Logcat, cold-launched the verified
`https://pluggd.fm/discover` App Link, observed the resumed activity, and
checked for fatal exceptions, native linkage failures, and out-of-memory
errors.

## Automated release smoke

The repeatable gate requires an explicit device serial and never auto-selects a
connected device:

```sh
ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
ANDROID_SERIAL=emulator-5554 \
PLUGGD_SMOKE_SCREENSHOT=/absolute/evidence.png \
npm run verify:android-device-smoke
```

It fails when the device is below API 24, the installed app does not declare
minimum API 24 and target API 36, `MainActivity` is not resumed, or the
post-launch Logcat contains a fatal/native/OOM signal. Successful output is
machine-readable JSON containing the APK hash, OS, cold-start timing, route,
observation window, and screenshot path.

## Results

| API | AVD | Cold start | Additional stress | Result and evidence |
|---:|---|---:|---|---|
| 24 | Pixel 2, Google APIs ARM64 | 1,041 ms | Full Discover scroll and 20 s settle, playback start, 50 s foreground playback, then 10 s background playback under the platform's 48 MB app heap | PASS — [auth](../../artifacts/qa/android-v1-2026-08-08/api24-auth-login-release.png), [Discover](../../artifacts/qa/android-v1-2026-08-08/api24-discover-release-fixed.png), [scroll bottom](../../artifacts/qa/android-v1-2026-08-08/api24-discover-release-stress-bottom.png), [Home](../../artifacts/qa/android-v1-2026-08-08/api24-home-release-fixed.png), [playback](../../artifacts/qa/android-v1-2026-08-08/api24-playback-release.png) |
| 33 | Pixel 7, Google APIs ARM64 | 993 ms | Confirmed notification permission is declared and remains ungranted before the app asks at a relevant signed-in moment | PASS — [Discover](../../artifacts/qa/android-v1-2026-08-08/api33-discover-release.png) |
| 35 | Pixel 8, Google APIs ARM64 | 1,681 ms | 15 s post-launch observation and fatal/OOM sweep | PASS — [Discover](../../artifacts/qa/android-v1-2026-08-08/api35-discover-current-release.png) |
| 36 | Pixel 9, Google APIs ARM64 | 2,011 ms | Final-APK automated smoke; the preceding build's edge-back gesture returned to Launcher without a fatal log and the unchanged release manifest has `enableOnBackInvokedCallback=true` | PASS — [Discover](../../artifacts/qa/android-v1-2026-08-08/api36-discover-current-release.png) |

The current app source therefore has release-APK launch coverage at every
planned emulator OS gate: 24, 33, 35, and 36. API 24 and 36 were rerun on the
final APK above. API 33 and 35 used its immediate predecessor,
SHA-256 `7d73533edd5776719176df7e1619a1b07bfd9851cd9d45269e3f6b5c22c3e090`;
the only subsequent runtime branch is explicitly limited to API 24–25 by an
executed contract. Previous exact-release API 36
phone, tablet, foldable, rotation, multi-window, fold/unfold, player, auth, and
route evidence remains in `artifacts/qa/android-v1-2026-08-08/`.

## Minimum-OS defect found and closed

The first API 24 Discover run exposed a genuine `OutOfMemoryError`. Android 7
gave the app a 48 MB growth limit while the artwork-heavy Discover `ScrollView`
started many remote image/TLS/bitmap operations concurrently. This was not an
emulator-wide memory shortage.

The repair is restricted to Android API 24–25: Supabase artwork derivatives are
capped at 360 px and native image/network starts use a cancellable two-slot
FIFO scheduler. API 26+ and iOS retain their existing behavior. The rebuilt
release APK survived a complete Discover scroll and Home navigation with the
same 48 MB limit; observed Dalvik use remained approximately 46.0/49.1 MB at
the bottom and fell after navigation. The Android foundation contract executes
the API threshold, derivative cap, and scheduler-concurrency assertions.

Starting playback after that artwork stress then exposed a second native OOM:
TrackPlayer's default 50-second buffer and full-resolution notification artwork
had no safe headroom. API 24–25 now uses a 5–10 second forward buffer, no back
buffer/cache reservation, and a 192 px Supabase artwork derivative; unsafe
external notification artwork is omitted. The final APK maintained an active
`PLAYING` MediaSession and foreground media service through 50 seconds in the
app and 10 seconds backgrounded. The post-run fatal/OOM sweep was empty. iOS
and API 26+ retain their submitted/current buffering and artwork behavior.

## Still external or physical-device gated

This matrix does not claim Play signing, Play-delivered split APK behavior,
Samsung One UI, physical Pixel hardware, Bluetooth/headset/call interruption,
FCM delivery, Maps with a restricted release key, Google OAuth release
redirects, or Play purchase lifecycle coverage. Those gates need the verified
Play organisation, production credentials, Play internal-track artifact, and
physical devices. Minimum-OS install, auth rendering, Discover stress, Home
navigation, foreground/background playback service, and native linkage now
pass; Bluetooth, headset, call-interruption, and lock-screen visual QA still
require physical hardware.
