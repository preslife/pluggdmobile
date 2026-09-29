# Native protected playback incident

CURRENT_PHASE=READY_FOR_PR
NEXT_ACTION=Checkpoint the checked native fix, open its PR, complete exact-head review, then resolve the explicit native integration/build gate before replacing Build 13.
AUDIT_REQUIRED=false
BRANCH=codex/native-playback-incident
WORKTREE=/private/tmp/pluggd-native-playback-incident
BASE=ce2e1f6f (native origin/main, refreshed 2026-09-29)
EDIT_AUTHORITY=PlaybackProvider, protected source resolver, focused playback checks and this task record only.
PRESERVE=Original dirty mobile checkout, existing Build 13 binary and App Review materials; no production data/storage write.

2026-09-29: Live public web plays Channel One, Altitude and Glass Moon with progress. Production read-only checks show all 14 published Beat rows have a linked retained preview and storage object; all six public published Mix rows have storage objects. Channel One stores a public-shaped URL in the private audio-files bucket. Native Build 13 source predates the 12 September protected Beat preview backend change and rejects relative preview paths before playback. MUSE/CODE EP also have expiring audio-files links. The isolated fix routes those public identities through the existing server signer and retains normal CDN sources. Source scenarios pass; physical iOS Build 13 remains broken until a replacement build is installed. Still ah Link and Glass Moon are 46.4 MB and 44.5 MB public WAVs. HEAD returned in <0.4 s and Glass Moon's first 1 MB range in <0.2 s, so the two-minute iPhone start is not explained by initial server latency. The iOS forward buffer is bounded to eight seconds in source; device timing remains pending.

2026-09-29 replacement scope: `BUILD_REPLACEMENT_SCOPE.md` reconciles the September web/backend releases against frozen native Build 13. The existing MP3 export utility and audio-processing UI are not an automatic release transcode pipeline; neither slow release has an MP3/M4A derivative or linked `audio_files` stream. Do not swap a paid/downloadable WAV master for an MP3 to mask this. Native focused source scenarios and Android foundation pass. The existing aggregate player contract is blocked by stale generated Info.plist, not by this change; native TypeScript remains blocked by the already-recorded local dependency gap. Device playback and App Review flows remain unverified.
