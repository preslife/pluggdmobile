# Native protected playback verification

| Gate | Result |
| --- | --- |
| Public web Mix Channel One | PASS: player advanced to 0:06 / 23:54 on pluggd.fm. |
| Public web Beat Altitude | PASS: player advanced to 0:02 / 3:12. |
| Public web Release Glass Moon | PASS: player advanced to 0:02 / 2:06. |
| Slow-release origin response | PASS: public WAVs exist with byte ranges; Glass Moon first 1 MB returned HTTP 206 in 0.18 s; this does not prove iPhone startup speed. |
| Production audio metadata and objects | PASS read-only: 14/14 published Beats linked to retained previews and objects; 6/6 public Mixes have objects. |
| Protected native source scenarios | PASS: Beat/Mix/release identity signer, failed signer without master fallback, unrelated CDN unchanged. |
| Android foundation source contract | PASS. |
| Native TypeScript | PASS after fresh `npm ci`: `npx tsc --noEmit --pretty false`. Prior node_modules gap was local and is resolved. |
| Existing broad player/global-shell source contracts | BLOCKED by stale generated Info.plist and unrelated dock baseline assertions. |
| Local iOS Build 14 | PASS: production-configured signed `1.0.0 (14)` `xcodebuild` completed; `Pluggd.app` exists in isolated DerivedData. This is not App Store upload or device playback. |
| Physical device install | PASS: `devicectl` installed and launched `com.pluggd.mobile` on the paired iPhone; installed-app readback reports `1.0.0 (14)`. Audible playback remains pending. |
| Still ah Link / Glass Moon tap-to-sound | PENDING: founder reported about two minutes in Build 13; time both on replacement physical iPhone before video. |
| Native main | PASS: PR #3 squash-merged as `9a0e5300d580104e46718ba11482ff24c4d0b99d`; merged tree matches the built source. |
| App Review video | PENDING: physical playback acceptance first; no Build 14 App Store upload/submission. |
