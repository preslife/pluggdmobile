# Verification

Local source gate, 2026-09-30:
- PASS: TypeScript with isolated locked npm ci. Primary shared dependencies/dirty checkout unchanged.
- PASS: scripts/verify-ios-release-music.mjs: segment/timeline/gain bounds, precise tenths, strict playback origin, lost upload/prepare/render/publish response recovery, persisted stable IDs/no repeat render, processing/auth gates, bounded waveform/MPEG validation, cancellation, saved sounds and sandbox-moved draft recovery/scoped own-file deletion. Mock external services; not live proof.
- PASS: existing protected playback source scenarios and native social/community parity contract.
- PASS: git diff --check. Only contracted task files are included; .expo fixture/.env.local/generated ios/binaries are ignored.

Native builds:
- PASS: production-configured ARM64 Release simulator app, iPhone 17 Pro/iOS 26.3. Initial Mapbox asset tool failure resolved with ARM64-only four-job build; canonical PROJECT_ROOT fixed /tmp versus /private/tmp bundler resolution.
- PASS: signed iPhone Release Build 16, com.pluggd.mobile, version 1.0.0, team 37X2468U5U, current microphone purpose text. Final incremental build PASS from source 631e46e0d1734e671552c410245bf278d5b2be56; codesign --verify --deep --strict PASS (valid on disk/designated requirement). JS bundle SHA256 3cb32c30a641ab3a9058d90d8a070545b2c8d5b91d54a7f72fb18fc395933bbf. Candidate receipt /private/tmp/pluggd-ios-audio-candidate-receipt.json. No fixture soundtrack/token strings in production bundle.
- NOT RELEASED: no native main merge, phone installation, App Store archive/export/upload or submission. Existing Build 15 stays installed.

Actual native UI, isolated simulator fixture:
- PASS: actual Expo media picker selected task PLUGGD image; own-file copy/preview and real AsyncStorage draft restored after simulated application-container move.
- PASS: actual editor/sound sheet render with PLUGGD typography/colors, visible media above sheet, thumb-sized controls, equal music/trim/mix/media tools.
- PASS: picker saved tab and track selection; single-modal selection-to-trim presentation; 15/30 photo presets; accessible +1-second start and 0.1-second nudge; cancel restored previous 15-second recipe.
- PASS: bounded local audition play/pause and visible playhead; volume touch updated 80% to 56%; content duration exposed timing placement controls.
- PASS: finished fixture video/caption/attribution preview and return to editor. The first native return exposed a released-player pause crash; fixed cleanup and actual return then succeeded.
- DRAG UNVERIFIED: CUA drag/scroll attempts did not move the pointer beyond its origin or deliver complete touch movement. Duration responder received only initial touch. This is not a passed waveform finger-scrub check; requires physical iPhone test.
- FIXTURE BOUNDARY: catalogue/peaks/audio/final video were isolated local fixtures; publication intentionally fails in that temporary bundle. Production app builds use the real APIs and never include fixture overrides.

Live/service gate:
- REUSED: web backend excerpt/photo/video render, exact recipe, atomic publication/attribution/privacy and seven-day temporary cleanup production verified on web main 70ef6234. No backend change made by this native task.
- PENDING: actual native authenticated catalogue/audition/upload/render/publish/readback/private access and background sync. Single existing QA server-key access approval is pending. Automatic approval review rejected broad Vercel production env pull as unnecessary credential extraction; nothing was downloaded. Do not bypass this rejection or reset ordinary accounts.
- PENDING: physical camera/video capture, finger scrub smoothness, audible exact segment/mix placement, queue/background/navigation and VoiceOver usage.
- BASELINE: parent native playback PR #4 remains open with separate physical-tap proof outstanding. Do not silently claim/merge its acceptance.

Acceptance mapping: 1–4 native controls and media path implemented with above simulator boundaries; 5 real adapters/retry behavior implemented but native live gate pending; 6 release/feed/protected playback integrated with focused source checks but authenticated native readback pending; 7 protected baseline and no migrations verified; 8 TypeScript/focused checks/build/native UI evidence available, final exact-source artifact gate passed; live and physical acceptance remain explicit.

Final native display: 0:00.1 start / 0:15.1 end correctly rendered after the precision fix. Screenshot /private/tmp/pluggd-ios-audio-trim.png. Temporary UI fixture was replaced on the simulator with a production-configured candidate using the signed candidate JS bundle, retaining the compiled simulator native executable. No fixture override is enabled in the retained actual candidate.

Production simulator startup: PASS actual PLUGGD home/catalogue loaded signed out after replacing the fixture. No QA authentication or live native music publication claimed.
