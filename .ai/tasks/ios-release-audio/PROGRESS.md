# Progress

Phase: READY_FOR_USER_REVIEW — corrected Build 17 installed; local App Store export prepared.
NEXT_ACTION: Complete physical/live media acceptance on installed Build 17, then obtain the applicable native release/store handoff approval before push/merge/upload/submission.
AUDIT_REQUIRED=false
Branch: codex/ios-release-audio
Worktree: /private/tmp/pluggd-ios-release-audio
Base: a9a647d545763bcc90d2c6babb1473f59870b86b (installed Build 15 source). Native main remains 9a0e5300; parent playback PR #4 remains independently open.
Latest implementation checkpoint: fa463390edf2655968a7a63f67f617acb1a3c6c9. Final archive, IPA and phone clone share production JS SHA256 e567a863d32c5397364f378583937e3d8e3f6af0d43d29650618ec0f27aa69c9. Subsequent edits are evidence records only.
Edit authority: native music editor and narrow Live/Home/Releases corrections in CONTRACT. Primary heavily dirty native checkout was not edited.
Approved actions: local production-configured candidate, existing-profile signing, in-place paired-phone update and launch/readback; local archive/export preparation. No native main merge or TestFlight/App Store upload/submission authorised.

Implemented: native photo/video music editor, persisted own-media/draft recovery, public streamable catalogue search/saved/recent, waveform/excerpt selection with precise and accessible controls, duration presets, original/music mix and timeline placement, independent audition, private upload/render and ready-only publication, persisted idempotency, release/feed reuse and attribution. Includes relevant Live lobby/swipe-feed retry recovery. No dependencies, schema or policy changes. Community Relevance v3 remains deferred.

Correction: shared EdPressable resolves callback styles into native static styles while preserving pressed/haptic/caller behaviour. Chart restores original columns, puts independent Play beside artwork and uses the theme background. Home fits three complete square covers with 44pt Play inside artwork and separate title navigation. Chart Open targets are at least 44pt.

Verification: final TypeScript and focused Home/destination/protected-playback checks pass. Actual native simulator light/dark Home, chart, wall and dark ledger layouts pass with real public data. Home/chart Play→Pause and Pause→Play work without navigation; separate title Open navigates to the correct release. Final archive succeeded and passed strict signature verification in the keychain-enabled context. Local App Store IPA export succeeded; bundle identity/version/hash confirmed. Exact final production JS/assets installed and launched in the retained native simulator.

Phone: initial CoreDevice connection reset resolved at final installation gate. In-place Build 17 installation passed on Ishola's iPhone, iPhone 15 Pro Max, device 2FAD1D76-6CEA-5EC5-BB81-43B0F64BB124. Independent apps readback confirms com.pluggd.mobile 1.0.0 (17). Launch and subsequent process readback confirm PID 2522 running from installed app. Receipt /private/tmp/pluggd-ios-build17-receipt.json. This proves installation/startup, not physical audible or publishing acceptance.

Artifacts: /private/tmp/pluggd-ios-layout-build17/Pluggd.xcarchive; /private/tmp/pluggd-ios-layout-build17-export/Pluggd.ipa; /private/tmp/pluggd-ios-layout-phone17/Pluggd.app. Corrected screenshots in /Users/apple/.codex/visualizations/2026/09/27/01a0e23e-284e-7480-8940-d96579080b36/ios-build17/. Build 16 production recovery retained at /private/tmp/pluggd-ios-build16-retained/Pluggd.app. Historical Build 14/15 binaries unavailable; source a9a647d5 retained for reconstruction.

Remaining acceptance: physical finger waveform scrubbing, audible exact excerpt/mix, camera/library/background/navigation/VoiceOver and authenticated native publish/privacy readback. Generic desktop drag dispatch was not finger-gesture proof; fixture service checks were not live publishing proof. Existing phone account can be used. Automated private QA sign-in approval remains pending; automatic review rejected full production env extraction and no secrets were downloaded. Do not repeat or bypass it.

Release boundary: no push, native main merge, Apple upload or submission. Local export reported an expired Apple account session warning but succeeded with existing manual signing; future upload authentication is not verified. See HANDOFF.md for remaining gates.

Cleanup: after disk-full archive failure, removed only task-owned simulator compiler caches/products after no-user checks and confirmation of an identical retained native executable. Source, app copies, screenshots, archive/dSYMs, device products and Build 16 recovery preserved. Test fixture excluded from production bundles. Task simulator shut down after final verification to release memory. Docker was not started or used; independent Docker Desktop status query did not respond and was terminated without altering Docker.
