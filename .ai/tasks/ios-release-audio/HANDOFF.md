# Installed iOS Build 16

Source f95bf3df5657c8d1250b79cd3aa950cfe1a10816 on codex/ios-release-audio, based on Build 15 a9a647d5. Worktree /private/tmp/pluggd-ios-release-audio; primary dirty checkout and native main unchanged.

Build 16 is installed in place on Ishola's iPhone (iPhone 15 Pro Max), com.pluggd.mobile, version 1.0.0. Independent installed-version, launch and running-process readback passed. Includes the native release music editor, existing protected Beat/Mix and release-card playback fixes, and narrow Live lobby/swipe-feed retry recovery. Recent-work check found no other completed native work missing; applicable server fixes are already inherited. Community Relevance v3 remains deferred.

Production-signed candidate /private/tmp/pluggd-ios-audio-device/Build/Products/Release-iphoneos/Pluggd.app is retained. Existing phone-enabled ad hoc profile signed a separate clone /private/tmp/pluggd-ios-audio-phone/Pluggd.app; signature verified. Receipt /private/tmp/pluggd-ios-audio-candidate-receipt.json. Production JS SHA256 e2b39897c570bc7f4b3474aeee724072c1e709b631cd0d15d928634f26825109. Final simulator fixture replaced with exact production JS/assets and existing compiled simulator executable. No TestFlight/App Store upload/submission or native main merge.

Remaining physical/live acceptance on installed phone:
1. Community composer → Music: choose photo/video; search/select a real track and drag to a recognisable section. Confirm explicit start/end, ±0.1s adjustment, 15/30 durations, smooth finger movement and VoiceOver.
2. Confirm visible media, original/music volume and timing placement. Listen to the exact finished segment and mix.
3. Start global music then audition. Confirm competing audio stops; background/navigation and finished-preview return stop without crash.
4. Publish into the task private QA community and check recipe/attribution, feed/release reuse, private member access and non-member denial. Existing phone authentication may be used. No native live publication is claimed.
5. Confirm ordinary posts/polls and release/Home one-tap Play/Pause; parent PR #4 physical gate remains outstanding.

Automated QA sign-in still needs the pending narrow existing-key approval. Automatic review rejected a full production env pull; no secrets downloaded. Do not bypass/repeat it or reset accounts. Phone installation used no credential extraction.

Next gate: physical/native live acceptance, task-only PR/current checks/review and applicable native merge/store authority. Current approval covered the local phone update only. Rollback source a9a647d5 is retained, but historical Build 14/15 binaries no longer exist; rollback needs reconstruction. Preserve original checkout and candidates. Passing checks are in VERIFY.md; no broad re-audit/rebuild is needed for remaining device checks.
