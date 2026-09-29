# Native protected playback incident

CURRENT_PHASE=DEVICE_VERIFICATION
NEXT_ACTION=Collect audible playback and tap-to-sound evidence for Beat, Channel One, Still ah Link, and Glass Moon on physical Build 14; repair any failure before App Review video.
AUDIT_REQUIRED=false
BRANCH=codex/native-playback-incident
WORKTREE=/private/tmp/pluggd-native-playback-incident
BASE=ce2e1f6f (native origin/main, refreshed 2026-09-29)
EDIT_AUTHORITY=PlaybackProvider, protected source resolver, focused playback checks and this task record only.
PRESERVE=Original dirty mobile checkout, existing Build 13 binary and App Review materials; no production data/storage write.

2026-09-29: Live public web plays Channel One, Altitude and Glass Moon with progress. Production read-only checks show all 14 published Beat rows have a linked retained preview and storage object; all six public published Mix rows have storage objects. Channel One stores a public-shaped URL in the private audio-files bucket. Native Build 13 source predates the 12 September protected Beat preview backend change and rejects relative preview paths before playback. MUSE/CODE EP also have expiring audio-files links. The isolated fix routes those public identities through the existing server signer and retains normal CDN sources. Source scenarios pass; physical iOS Build 13 remains broken until a replacement build is installed. Still ah Link and Glass Moon are 46.4 MB and 44.5 MB public WAVs. HEAD returned in <0.4 s and Glass Moon's first 1 MB range in <0.2 s, so the two-minute iPhone start is not explained by initial server latency. The iOS forward buffer is bounded to eight seconds in source; device timing remains pending.

2026-09-29 replacement scope: `BUILD_REPLACEMENT_SCOPE.md` reconciles the September web/backend releases against frozen native Build 13. The existing MP3 export utility and audio-processing UI are not an automatic release transcode pipeline; neither slow release has an MP3/M4A derivative or linked `audio_files` stream. Do not swap a paid/downloadable WAV master for an MP3 to mask this. Native focused source scenarios and Android foundation pass. The existing aggregate player contract is blocked by stale generated Info.plist, not by this change. Device playback and App Review flows remain unverified.

2026-09-29 integration: Fresh `npm ci` in this isolated worktree removed the local dependency gap; `npx tsc --noEmit --pretty false` passed. PR #3 at `51473755` has passing a11y and i18n CI. A production-configured, signed local iOS `1.0.0 (14)` build completed at `/private/tmp/pluggd-build14-candidate/Build/Products/Release-iphoneos/Pluggd.app` with Sentry auto-upload disabled. The user asked to integrate the fixes for the blocked video. Installation on the paired iPhone is blocked by `kAMDMobileImageMounterDeviceLocked`; no device playback has been claimed. Keep Build 13 and do not upload or submit Build 14 to App Store Connect yet.

2026-09-29 device handoff: PR #3 merged to native `main` at `9a0e5300d580104e46718ba11482ff24c4d0b99d`; merged tree matches the built source plus documentation-only evidence. After the phone was unlocked, `devicectl` installed `com.pluggd.mobile` and read back version `1.0.0 (14)`, then launched it. Audible playback and Release start timing still require the user's physical check. Build 14 is local to the phone; there has been no App Store Connect upload/submission. The superseded August Build 4 PR #1 was closed without deleting its branch; both repos now have zero open PRs.
