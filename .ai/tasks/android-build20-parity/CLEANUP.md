# Android18 cleanup and preservation — 4 October2026

Explicit founder request: save/commit work, close task simulators/tabs and remove old builds. Founder specifically declined another cleanup list/approval round. Only verified obsolete task artifacts removed; no broad filesystem cleanup.

## Completed

- Four task Play Console tabs1937853417/1937853356/1937853475/1937853471 closed through browser controls; normal fresh openTabs readback confirms none remain. Other browser tabs, Apple/iOS window and Chrome profiles left alone.
- Exact owned emulator5558/PLUGGD_Tablet16K_API36/PID43169 normally shut down via official emu kill. Process and ADB readback confirms gone; physical Samsung remains connected and unrelated ghost5562/sharedADB untouched. Virtual device disk/sign-in/accounts preserved, not wiped/deleted. No iOS simulator closed.
-20regular obsolete local APK/AABfiles (Downloads14–17, five superseded candidate AABs, old unsigned/installed split copies) plus4explicit Android production JS export directories removed. Total logical bytes4688893757 (~4.69GB). Fresh lsof exact-file/directory checks showed no use, inode/device/size snapshot matched at action time, symlinks/Git directories rejected. Explicit-target script and receipt archived locally. No EAS/Play build/history or release deleted.
- These disposable local copies were permanently removed, not moved to Trash. Signed store/build history and committed source remain; exports can be regenerated. Small historical receipts/checkers, previous public13 rollback, current18, all iOS artifacts/credentials/AVDs and unrelated work preserved.

## Durable release archive (not Git)

`/Users/apple/pluggd-mobile-workspace/build/release-archive/android18-20261004`

Existing Git build/ignore applies; no tracked ignore/config/source edit. Contains exact18 AAB/provenance/static scripts/reports, actual Play-installed18splits, independent installed-inspection receipts, task records, backend ACKreceipt,256selected native screenshots/flows and public100%/submission screenshots. No raw device logs/tokens committed. Final AAB SHA5f38a88d69637d8d37b14dbf437c20b92a2d3bdfd22240eb7ab1353f5c644b28 verified both original and durable copy. Current phone18base SHAa10119d89568043c9384c6f8052b2b705231b770d21e2c6b1bfc488c686f01d7 preserved. Cleanup scope and timestamped receipt JSON bind exact removed targets and preserve hashes. Current original temporary18proof paths also retained; historical references to deliberately removed old binaries are not current acceptance inputs.

## Source / task state

Exact released sourcef87d977 remains in Git history; final public completiond62c7ab and cleanup checkpoint retained on codex/android-build20-parity. No merge/main/primaryiOS changes. Task registry CLOSED; automatic completion follow-up remains PAUSED. Backend PR215/217 are already merged/deployed, not redeployed during cleanup; isolated backend docs reconciled to public completion. Preserve unrelated existing supabase/.temp/cli-latest dirt rather than inventing a source commit/reset. Branch backup/readback verified separately; no force push.
