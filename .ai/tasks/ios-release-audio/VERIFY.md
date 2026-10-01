# Verification

Local source gate, 2026-09-30:
- PASS: TypeScript with isolated locked npm ci. Primary shared dependencies/dirty checkout unchanged.
- PASS: scripts/verify-ios-release-music.mjs: segment/timeline/gain bounds, precise tenths, strict playback origin, lost upload/prepare/render/publish response recovery, persisted stable IDs/no repeat render, processing/auth gates, bounded waveform/MPEG validation, cancellation, saved sounds and sandbox-moved draft recovery/scoped own-file deletion. Mock external services; not live proof.
- PASS: existing protected playback source scenarios and native social/community parity contract.
- PASS: git diff --check. Only contracted task files are included; .expo fixture/.env.local/generated ios/binaries are ignored.

Native builds:
- PASS: production-configured ARM64 Release simulator app, iPhone 17 Pro/iOS 26.3. Initial Mapbox asset tool failure resolved with ARM64-only four-job build; canonical PROJECT_ROOT fixed /tmp versus /private/tmp bundler resolution.
- PASS: signed iPhone Release Build 16, com.pluggd.mobile, version 1.0.0, team 37X2468U5U, current microphone purpose text. Final incremental build PASS from source 631e46e0d1734e671552c410245bf278d5b2be56; codesign --verify --deep --strict PASS (valid on disk/designated requirement). JS bundle SHA256 3cb32c30a641ab3a9058d90d8a070545b2c8d5b91d54a7f72fb18fc395933bbf. Candidate receipt /private/tmp/pluggd-ios-audio-candidate-receipt.json. No fixture soundtrack/token strings in production bundle.
- Historical build above was superseded by final f95bf3d Build 16 below. INSTALLED FOR DEVICE QA; no native main merge or App Store/TestFlight upload/submission.

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

Connected-phone integration, 2026-09-30:
- Current native main verified 9a0e5300 and sole open native PR #4 at a9a647d5; both are in this candidate ancestry. No other finished native commit is missing. Web #201 playback URL lifetime is server-provided; web #200 lobby retry required one narrow native equivalent. Web creator/admin/catalogue/library/metadata fixes need no binary port. Community Relevance v3 remains deferred.
- Added strict primary session-room loader and safe retry/loading panels on native Live lobby/swipe feed. Optional legacy sources retain existing compatibility fallback. Cached rooms remain after a refresh error; no active-call teardown/refactor. Existing room status poll ignores failed and late responses.
- PASS: verify-ios-live-room-recovery.mjs actual QueryClient cold failure, retained cached rooms after failure and successful retry/empty result. PASS existing mobile Live contract; TypeScript and diff hygiene. Original music checks reused unchanged.
- PASS actual native Live failure fixture: clear error, >=48pt Retry and Return controls rendered; tapping Retry reached the actual public loader and genuine empty room result. Fault injection is ignored/local only and is excluded from the phone candidate.
- Paired physical iPhone readback before action is 1.0.0 (15); developer mode enabled. Existing PLUGGD Ad Hoc Device QA 2026 profile includes this phone and same 37X2468U5U team/distribution identity. The App Store profile has no device list, so preserve that artifact and sign a separate clone with the existing ad hoc profile; do not create new credentials/profiles.
- Direct user approval covers local final Build 16 and in-place phone installation/launch/readback. No App Store/TestFlight upload or native main merge. Prior Build 14/15 retained paths in historical records no longer exist; retain source a9a647d5 for rollback reconstruction.

Final connected-phone artifact and installation:
- PASS: final Xcode iPhone Release Build 16 from f95bf3df5657c8d1250b79cd3aa950cfe1a10816; existing distribution identity/team and production configuration. Original App Store-signed artifact retained; separate clone signed with existing PLUGGD Ad Hoc Device QA 2026 profile. codesign --verify --deep --strict passed. Production JS SHA256 e2b39897c570bc7f4b3474aeee724072c1e709b631cd0d15d928634f26825109. Candidate receipt /private/tmp/pluggd-ios-audio-candidate-receipt.json.
- PASS: devicectl installed in place on paired iPhone 15 Pro Max, device 2FAD1D76-6CEA-5EC5-BB81-43B0F64BB124. Independent apps readback confirms com.pluggd.mobile 1.0.0, bundle version 16. Launch PID 1200 and subsequent process readback confirm the exact installed Pluggd executable remained running. Evidence /private/tmp/pluggd-ios-audio-phone-{install,after,launch,processes}.json. No uninstall or new provisioning credentials.
- PASS: simulator fault fixture replaced with production JS/assets from the final candidate, matching SHA256; existing compiled simulator executable retained (no native configuration/dependency change). simctl install/launch succeeded. Production bundles exclude fixture overrides.
- STILL PENDING: physical waveform gesture/sound mix/media capture/background/VoiceOver and authenticated native publish/privacy readback. Device install/startup is not end-to-end acceptance. Existing phone account may be used; automated QA authentication approval remains pending.

2026-10-01 screenshot regression correction (final source verification before Build 17):
- Root cause confirmed in actual native render: shared EdPressable callback styles were lost, removing horizontal row sizing and absolute overlays. Resolve caller style against local pressed state and pass native static styles; preserve haptics, callbacks, accessibility and playback/error logic.
- Releases chart keeps # / TITLE / ARTIST / PLAYS, removes extra PLAY header, and places independent Play/Pause beside artwork before title. Full rows/rank/artist/plays align. Background now uses the active theme, eliminating light-theme ink on a fixed dark background.
- Home release rail uses responsive square artwork sizing fitting the first three cards within phone content width; 44pt Play/Pause remains inside artwork, separate from title/artist. Actual final native screenshot confirms all three controls complete and copy clear.
- PASS actual native real-data Home Glass Moon Play→Pause without navigation, Pause→Play and separate title opens correct release. Final third-card MUSE EP Play→Pause also confirmed after service resolution. PASS chart Down over You single Play→Pause without navigation, Pause→Play and title opens exact release. These are simulator/service UI-state checks, not physical audible proof.
- PASS actual Home light and dark render; actual light Releases chart and wall layout. Full-resolution evidence /private/tmp/pluggd-ios-home-corrected.png and /private/tmp/pluggd-ios-chart-corrected.png. XcodeBuildMCP semantic swipe/tap used after generic desktop Simulator gestures failed to deliver movement; no temporary production fixture or credentials used.
- PASS final TypeScript, mobile Home contract, Home/destination contract, protected playback source scenarios and diff hygiene. Earlier music/service checks reused unchanged.
- Phone currently unreachable (CoreDevice 4000 / connection reset); user asked to reconnect/unlock while candidate preparation continues. Build 16 retained at /private/tmp/pluggd-ios-build16-retained/Pluggd.app. No store submission or upload.

- PASS actual dark Releases ledger render after switching from wall: thumbnail, title/artist, price and independent Play all align without lost styles. Dark Home final render confirmed all three controls complete; theme transition needed service/UI settling before the final capture. Retained evidence /var/folders/q5/g1rtr31x6dj_yt8ddp9mk7000000gn/T/screenshot_optimized_c1b0fb45-bc02-49b1-81e1-a0485b8658eb.jpg (ledger) and screenshot_optimized_70be5110-63c8-4fe4-9e38-99361f4c1271.jpg (dark Home).
- Exact correction source checkpoint: e967922eaf8d333133d77a7021fef98eb3241c7b. Final local Build 17 archive underway from this head. Only evidence records will change afterward.

- Initial Build 17 archive succeeded after cache recovery and passed strict signature verification. Final accessibility gate expanded chart title tap height to 44pt and artwork hit area to 44pt without changing visual columns; TypeScript/diff checks pass. Refreshing the archive from this final source uses retained native intermediates, rather than a full rebuild.
