# Corrected Build 17 installed; local store artifact prepared

Source fa463390edf2655968a7a63f67f617acb1a3c6c9 on codex/ios-release-audio, based on installed Build 15 a9a647d5. Worktree /private/tmp/pluggd-ios-release-audio. Primary dirty checkout and native main remain unchanged.

Build 17 is installed in place and running on Ishola's iPhone (iPhone 15 Pro Max), com.pluggd.mobile 1.0.0. Independent app-version readback and launch/running-process readback passed (PID 2522). App data preserved; no uninstall. Includes the native release music editor, protected playback/release-card fixes and relevant Live retry parity from Build 16, plus corrected Home/Releases layouts.

Chart Play is directly beside artwork, with original title/artist/rank/plays structure and readable themed background. Home shows three complete square covers with full artwork-overlay Play buttons and clear title/artist copy. Native real-data light/dark Home, chart, wall and ledger visual checks passed; Play/Pause stays independent from Open navigation. Final chart Open touch areas meet 44pt. Screenshots:
- /Users/apple/.codex/visualizations/2026/09/27/01a0e23e-284e-7480-8940-d96579080b36/ios-build17/home-corrected.png
- /Users/apple/.codex/visualizations/2026/09/27/01a0e23e-284e-7480-8940-d96579080b36/ios-build17/chart-corrected.png

Production-signed archive /private/tmp/pluggd-ios-layout-build17/Pluggd.xcarchive passed strict signature verification. Local App Store export /private/tmp/pluggd-ios-layout-build17-export/Pluggd.ipa passed; identity/version/production bundle confirmed. Separate existing ad hoc clone /private/tmp/pluggd-ios-layout-phone17/Pluggd.app signed and verified for phone. Receipt /private/tmp/pluggd-ios-build17-receipt.json. Production JS SHA256 e567a863d32c5397364f378583937e3d8e3f6af0d43d29650618ec0f27aa69c9. IPA SHA256 a6b8c82c6b3daef86f36ae0dab7bcd19150901c26ab900dcd428ac3a09c7562b. No fixture/authentication override in final bundle. Retained simulator launched the same final JS/assets before shutdown.

Remaining physical/live acceptance on installed phone:
1. Confirm Home/chart appearance and independent Play versus title Open on physical phone.
2. Community composer → Music: choose photo/video, find a real track and finger-drag to recognisable section; verify explicit start/end, precise adjustment, duration and VoiceOver controls.
3. Listen to exact finished excerpt with original/music volume and timing placement; verify global music pauses during audition and preview/background/navigation cleanup.
4. Publish in private QA community and verify attribution/reuse, member access and non-member denial using existing phone authentication. No live native publication is claimed.

Automated private QA authentication still requires pending narrowly scoped approval. Automatic review rejected full production env extraction; no credentials downloaded and no bypass/retry permitted. Native fixture checks and installation receipts do not replace remaining physical/live acceptance.

Next gate: physical/native live acceptance, task-only PR/current checks/review and applicable native merge/store authority. Current approval covers local artifacts and in-place phone update. No native push/merge or TestFlight/App Store upload/submission. Local export succeeded despite expired Apple account-session warning; upload authentication remains unverified. Recent-work reconciliation found no other completed native change missing; Community Relevance v3 remains deferred.

Recovery: retain production-signed Build 16 at /private/tmp/pluggd-ios-build16-retained/Pluggd.app and source a9a647d5; old Build 14/15 binaries unavailable. Only unused task simulator compiler caches/products removed to recover disk space, after confirming identical retained executable. App copies, source, device products, archive/dSYMs and evidence preserved. Task simulator shut down to release memory. Docker Desktop is independent and was not altered. Passing checks in VERIFY.md; no broad re-audit/rebuild needed for remaining device checks.
