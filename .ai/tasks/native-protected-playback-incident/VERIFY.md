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
| Physical Build 14 playback | PASS by founder: Beat, Channel One Mix, Still ah Link, and Glass Moon all play fine on the installed iPhone candidate. Exact tap-to-sound seconds were not recorded. |
| Release-card one-tap Play | PENDING: new native Releases/Home UI change needs source and physical device checks. |
| Release-card source checks | PASS: native TypeScript; Home, Home destination, commerce and protected playback contracts. Visible Play is a separate 44-point control on Releases wall/ledger/chart/pressing cards and Home New releases; source alone does not prove device taps. |
| Existing product-pages contract | PRE-EXISTING FAIL: detail-screen script expects `Starting ${release.title}…`, while unchanged `origin/main` detail source renders `Starting…`; this follow-up does not edit that screen. |
| Root Vitest accessibility command | BLOCKED locally: root checkout lacks Vitest (`sh: vitest: command not found`); PR CI will run required a11y/i18n. |
| Native main | PASS: PR #3 squash-merged as `9a0e5300d580104e46718ba11482ff24c4d0b99d`; merged tree matches the built source. |
| App Review video | PENDING: physical playback acceptance first; no Build 14 App Store upload/submission. |
