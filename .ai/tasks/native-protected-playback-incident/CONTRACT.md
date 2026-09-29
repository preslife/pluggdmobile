# Native protected playback incident

Goal: restore published Beat and Mix playback in iOS after the protected Beat preview format and private Mix storage rules diverged from frozen Build 13 source; refresh affected release links without exposing paid masters. Endpoint is a reviewed native source fix and a separately gated replacement iOS build/device check for the user's App Review video.

Allowed: shared PlaybackProvider, a small identity-based source resolver, narrow source/security checks, this task record, and a native PR. Excluded: production data writes, bucket policy changes, web redesign, dirty original mobile checkout, existing Build 13 binary, App Store upload/submission, and unrelated Android work.

Acceptance: published Beat preview resolves by Beat ID through `resolve-playback-url`, never by signing the paid path directly; published Mix resolves by Mix ID, including Channel One's private-bucket URL; private-bucket release links refresh by track/release ID; unrelated public sources retain prior behavior; queues validate resolved URLs; failed signer never falls back to protected originals; the physical replacement app plays a Beat, Channel One, and a release before video recording. Time Still ah Link and Glass Moon from tap to audible sound on the replacement iPhone; the iOS buffer change is a hypothesis until this passes. A new iOS build and device test are required for runtime completion.

Rollback: revert the task commit/new native build. Do not alter production audio rows or storage policy. Keep Build 13 artifacts until a replacement is verified and accepted.

Gate: source commit/PR and checks may proceed under the user's repair request. Merge to native main and replacement build require the explicit native integration gate in `AGENTS.md`; App Store upload/submission remains a separate human handoff.
