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
| Native TypeScript | BLOCKED by pre-existing missing `@react-native-community/datetimepicker` in local node_modules and errors only in unrelated auth/upload/live routes; no changed-file diagnostic. |
| Existing broad player/global-shell source contracts | BLOCKED by stale generated Info.plist and unrelated dock baseline assertions. |
| iOS Simulator and physical device | PENDING: no Simulator booted; replacement build/physical test required. |
| Still ah Link / Glass Moon tap-to-sound | PENDING: founder reported about two minutes in Build 13; time both on replacement physical iPhone before video. |
| Native main, replacement build and App Review video | PENDING. |
