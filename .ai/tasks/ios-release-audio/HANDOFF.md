# iOS audio editor candidate

Implemented source: 631e46e0d1734e671552c410245bf278d5b2be56 on codex/ios-release-audio, based on installed Build 15 source a9a647d5. Task worktree /private/tmp/pluggd-ios-release-audio. Native main and primary dirty checkout are unchanged.

Signed Build 16: /private/tmp/pluggd-ios-audio-device/Build/Products/Release-iphoneos/Pluggd.app. Production API/configuration, com.pluggd.mobile, version 1.0.0, team 37X2468U5U. Compiled and signature verified; not installed on a physical phone or uploaded to App Store Connect. Receipt /private/tmp/pluggd-ios-audio-candidate-receipt.json.
Final production simulator candidate: /private/tmp/pluggd-ios-audio-final-simulator/Pluggd.app. Same production JS bundle and compiled simulator native executable. The local UI fixture is excluded from the final candidates. Screenshot /private/tmp/pluggd-ios-audio-trim.png shows actual native controls with a clearly labelled local test track.

Pending live test access: asynchronous approval for temporarily reading only the existing Supabase server key to sign in the task-owned private QA account. Full production environment pull was rejected by automatic approval review; no secrets were downloaded. Do not bypass or repeat that request. No founder password reset, migrations or new production secrets are needed.

Remaining physical/live checks:
1. Search a real track; preview/select it; drag to a recognisable section; verify displayed start/end, ±0.1s adjustments and 15/30 durations. Confirm finger gesture performance and VoiceOver.
2. Choose a photo and a recorded/library video. Confirm media remains visible, original/music volume and music placement. Listen to the exact finished segment and timing.
3. Start global music, then preview. Verify competing audio stops; background/navigation and finished-preview return must stop without crash.
4. Publish into the existing task private QA community. Check exact recipe/attribution, feed and release reuse, private member playback and anonymous/non-member denial; exercise retained draft/lost-response recovery.
5. Confirm ordinary composer, polls and existing release playback. The parent playback PR #4 has its own pending physical one-tap gate.

Native release sequence: authorise concrete TestFlight candidate upload/iPhone testing; perform physical/live checks; task-only PR/current checks/review; authorise native main merge and eventual App Store submission as applicable. Do not label the native feature live until those gates pass. Keep Build 15 and prior binaries available for recovery.

Passing source/build checks are recorded in VERIFY.md. Reuse them unless relevant source/dependencies/environment change. One NEXT_ACTION is in PROGRESS.md. No broad re-audit or native rebuilding is needed to resume the pending live/device gates.
