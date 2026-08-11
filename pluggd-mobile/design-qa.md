# PLUGGD Home Design QA

## Scope

- Surface: signed-out Home, iPhone 17 Pro Max simulator
- Captured viewport: 368 × 800
- Visual direction: selected PLUGGD music-discovery system, strengthened with the live web product's signal ticker, editorial storytelling and Next Wave hierarchy
- Comparison: `artifacts/qa/home-redesign-2026-07-29/home-before-after.jpg`
- Final captures:
  - `artifacts/qa/home-redesign-2026-07-29/after-home-top.jpg`
  - `artifacts/qa/home-redesign-2026-07-29/after-home-middle.jpg`
  - `artifacts/qa/home-redesign-2026-07-29/after-home-bottom.jpg`
  - `artifacts/qa/home-redesign-2026-07-29/after-home-player.jpg`

## Mandatory comparison

### Typography

- Sora remains the display face and Satoshi the supporting copy face throughout.
- Daily Plug, section headings, metadata and CTA hierarchy are consistent with the selected mobile system.
- The featured CTA was shortened and rebuilt as one inline action so its icon no longer wrapped onto a second line.
- No legacy display typography is visible.

### Spacing and layout

- The first viewport contains a featured playable release plus four additional choices.
- Artwork remains square and fills its frame without blurred sidebars or destructive zooming.
- Section rhythm is compact enough for discovery while preserving 44pt primary targets.
- The single market gateway was moved onto a fixed 180pt visual surface after simulator QA exposed flex shrink.
- Event artwork and event information now occupy separate, intentional surfaces; poster text is not duplicated by an overlay.
- The live room is a complete bordered signal card rather than a collapsed row.
- The persistent player and dock remain separate layers and do not restart playback during navigation.

### Color and surfaces

- The fixed PLUGGD anchors remain black, warm cream and orange.
- Borders and dark-brown surfaces create grouping without generic nested cards.
- Orange is reserved for play, selected state, live signal and primary conversion actions.
- Text and actionable controls maintain readable contrast against artwork and night surfaces.

### Imagery

- Release artwork uses the release-specific fitting component and displays edge-to-edge in square slots.
- Editorial, event, soundboard, scene and market imagery use their actual source assets.
- No placeholder artwork, synthetic illustration, custom SVG or CSS-art substitute was introduced.
- Tall poster copy is preserved inside the image while UI copy sits in a separate information panel.

### Copy and content

- The live ticker, editorial story, releases, events and market counts are source-backed.
- Imported catalogue metadata is not used as a pretend playable release.
- Registration is secondary and appears only after the music, scenes, editorial, live and commerce gateways.
- Internal status values and architecture language are not exposed.

### States and interactions

- Featured and grid play actions have distinct accessible targets from their detail routes.
- One-tap playback opens the persistent player; an unavailable remote file reaches the existing honest “Audio unavailable” state.
- Home-to-Discover scene deep links apply city/genre matching; when no exact playable match exists, Discover offers wider real signals instead of a dead end or fabricated scene content.
- Reduce Motion disables ticker movement and featured parallax.
- Loading, empty, signed-out and unavailable-audio states remain represented.

### Accessibility and resilience

- Simulator runtime snapshot exposes labelled play, open, search, account, scene, event, market, registration, player and dock controls.
- Primary controls use at least 44pt targets.
- The ticker has a static VoiceOver summary and a non-moving Reduce Motion treatment.
- Longer titles are constrained deliberately and supporting copy can wrap without breaking the grid.

## Findings resolved

- P1 — single market gateway collapsed to a narrow strip: fixed with an explicit inner visual surface and verified in the bottom capture.
- P1 — primary registration button lost its fill: fixed with an inner button surface and verified in the bottom capture.
- P1 — scheduled live room exposed an internal status and lacked hierarchy: replaced with human date/creator metadata and a full signal card.
- P2 — featured CTA icon wrapped onto a separate line: rebuilt as a single inline action.
- P2 — event poster and overlay repeated the same title: separated poster media from the event information panel.
- P2 — scene deep link could become an immediate empty dead end: retained honest matching and added a real-content fallback.

## Remaining follow-up

- P3 — validate the same hierarchy at the largest accessibility text setting during the broader accessibility submission pass.
- P3 — replace any remotely unavailable creator audio at its source; the client already presents the correct unavailable state.

final result: passed

---

# Android Discover Narrow-Phone Parity — 2026-08-11

## Comparison target

- Source visual truth: `/Users/apple/Downloads/IMG_0881.PNG` and `/Users/apple/Downloads/IMG_0882.PNG`, supplied from the current iPhone app.
- Implementation: local Android release APK rendered on an API 35 emulator configured to the Samsung S21 content width.
- Source pixels: 1290 × 2796; approximately 430 × 932 points at 3× density.
- Implementation pixels: 1080 × 2400; 360 × 800 dp at density 480.
- State: signed-in Discover, dark theme, current live catalogue data.
- Full-view comparison: `artifacts/qa/android-discover-parity-2026-08-11/06-comparison-top.png`.
- Focused Release Radar comparison: `artifacts/qa/android-discover-parity-2026-08-11/07-comparison-release-radar.png`.
- Before evidence: `artifacts/qa/android-discover-parity-2026-08-11/03-android-360dp-before.png`.
- Post-fix evidence: `artifacts/qa/android-discover-parity-2026-08-11/04-android-360dp-fixed-top.png` and `artifacts/qa/android-discover-parity-2026-08-11/05-android-360dp-fixed-release-radar.png`.

## Comparison history

### Iteration 1 — blocked

- P1: the four Discover gateways became a single left-aligned column at 360dp.
- P1: Release Radar used the same overflowing percentage-plus-gap calculation and could also wrap into one column.
- Cause: two 48.8% or 48.5% cards plus an 8dp or 10dp gap exceeded the 320dp content width after horizontal padding on a 360dp Android device.

### Iteration 2 — passed

- Changed both card families to a 47.5% flex basis with flex growth and a 48.8% maximum.
- Kept THE PLUG at a deliberate 100% basis and maximum.
- Rebuilt and installed the release APK, then recaptured at the exact failing 360dp width.
- The gateway cards now render 2 × 2 and Release Radar renders 2 × 2 without clipping or horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: Sora display text and Satoshi supporting text remain unchanged; Android line wrapping reflects its narrower 360dp viewport without changing hierarchy.
- Spacing and layout rhythm: card tracks now match the iPhone two-column composition; section gaps, padding, radii, and dock overlap remain consistent with the existing system.
- Colors and visual tokens: the warm-black, cream, muted-grey, and PLUGGD orange tokens are unchanged.
- Image quality and asset fidelity: both platforms use the same live catalogue artwork and crop behavior; no placeholders or replacement assets were introduced.
- Copy and content: labels, counts, section titles, and discovery explanations are unchanged. Live data can differ between captures by time.
- Accessibility: existing card button roles and labels are preserved. Screenshot comparison does not prove TalkBack reading order or dynamic-type reflow, which remain separate runtime checks.

## Interaction evidence

- Discover tab navigation: passed.
- Vertical scrolling through the gateway, scene, and Release Radar sections: passed.
- Persistent dock remained visible and operable: passed.
- Android runtime fatal-error scan: clear for the captured session.

## Residual differences

- The Android proof is intentionally narrower than the iPhone reference because it recreates the Samsung failure. The horizontally scrollable filter row therefore shows less of the final filter, as designed.
- Status-bar icons, density, and current profile artwork are device-owned or live-data differences rather than design drift.

final result: passed

---

# PLUGGD Community Internal Dock QA — 7 August 2026

## Scope and source

- Surface: signed-in Community feed on the iPhone Air simulator at 368 × 800.
- Product reference: the local web implementation in `/Users/apple/PLUGGD_NEW/src/components/community/CommunityBottomDock.tsx` and the supplied mobile-web screenshot `/Users/apple/Downloads/IMG_0771.PNG`.
- Accepted native capture: `artifacts/qa/community-dock-2026-08-07/02-native-final.jpg`.

## Comparison and findings

- Replaced the scrolling Feed / Communities / Boards / Explore pills with the web-source Community dock: Feed, Boards, a raised central Post action, Explore and Maps.
- Kept the dock in the former internal-menu position so it does not compete with PLUGGD's persistent app dock or global player.
- Removed the temporary header create button; Logo, Live, Search and Account have their original spacing again.
- Preserved the stories-first entry and newest-first feed directly beneath the internal dock.
- Matched the web hierarchy with five evenly distributed 44pt-or-larger targets, a 48pt orange Post control, selected-state underline and restrained dark surface.
- Verified Feed, Boards, Post, Explore and Maps in the running native simulator. Post opens the authenticated composer and its back control returns to Community.
- Runtime accessibility snapshot exposes every dock destination as a separately labelled button with selected state where applicable.

## Remaining limits

- Screenshot comparison confirms visual hierarchy and spacing; VoiceOver speech/order should still be included in the final physical-device accessibility walkthrough.

final result: passed

---

# PLUGGD Home Geometry Correction

## Findings resolved

- Moved the live signal ticker directly beneath the Daily Plug masthead so it establishes realtime context before the featured music.
- Rebuilt scene gateways as fixed 176×136pt visual frames; artwork, gradient and copy now fill the complete card instead of collapsing inside an empty frame.
- Rebuilt mix cards as fixed 176pt artwork frames with separate 48pt detail actions; artwork now fills the surface without the blank lower panel seen in the simulator.
- Added explicit non-shrinking widths to horizontal scene and mix rails so card density cannot collapse at runtime.
- Rebuilt the complete lower Home sequence rather than stopping at the first affected rails:
  - Next Wave uses a fixed 224pt editorial mosaic plus fixed 132pt supporting cards.
  - Soundboards use non-shrinking 224×158pt artwork frames with copy and interaction layered independently.
  - The featured event preserves its complete poster, information and RSVP treatment inside a fixed frame.
  - The live-room row is fixed at 88pt with an independent full-row target.
  - Market gateways use fixed 180pt visual frames and cannot collapse when only one gateway is available.
- Preserved independent play/open accessibility targets and selection haptics.

## Verification

- Compared against the user-supplied iPhone 17 Pro Max capture.
- Inspected the ticker, scene rail, mix rail, Next Wave mosaic, Soundboards rail, event, live room and market gateway in the running simulator after hot reload.
- TypeScript: passed.
- Evidence:
  - `artifacts/qa/home-page-polish-2026-07-30/01-home-top-ticker.jpg`
  - `artifacts/qa/home-page-polish-2026-07-30/02-scenes-mixes-fixed.jpg`
  - `artifacts/qa/home-page-polish-2026-07-30/03-next-wave-soundboards-fixed.jpg`
  - `artifacts/qa/home-page-polish-2026-07-30/04-events-market-fixed.jpg`

final result: passed

---

# PLUGGD Fan Experience Design QA

## Scope

- Audited fan entry, onboarding, My PLUGGD, personal profile, Library, playlists, tickets, purchases, memberships and the account navigation model.
- Compared the mobile collection model with the local live-web implementation in `/Users/apple/PLUGGD_NEW`.
- Evidence and detailed flow report: `artifacts/qa/fan-experience-audit-2026-07-30/`.

## Findings resolved

- Activated the existing rich My PLUGGD fan hub instead of redirecting it to Profile.
- Made My PLUGGD the signed-in fan account entry while keeping Studio as the creator entry.
- Split Library and Purchases & Access into clear account destinations.
- Added owned and followed playlists to the unified Library data and deduplicated saved content.
- Reframed Library around Music, Playlists, Events and Access, with a clear first-playlist action and ownership gateway.
- Connected the onboarding notification choice to real mobile push registration.
- Added explicit accessible roles, labels and states to onboarding choices and actions.
- Updated stale contracts so they protect the intentional fan information architecture rather than the retired redirect.

## Verification

- TypeScript: passed.
- Full mobile verification suite: passed.
- Expo Doctor: passed.
- Native iOS simulator build and launch: passed.
- iPhone 17 Pro Max visual inspection: passed for signed-out and empty states.

## Evidence limitation

- The current simulator is signed out. Populated playlists, purchases, memberships, activity and ticket history still require one signed-in fan test-account pass before App Store sign-off.

final result: passed with signed-in populated-state QA remaining

---

# PLUGGD Remaining-Surfaces Design QA

## Scope

- Surfaces audited on the iPhone 17 Pro Max simulator: Discover, Community, Events, Releases, Mixes, Soundboards, Market, Studio access, Connect Card, Login, Purchases, Wallet, Memberships, Tickets, Library, Settings, release detail, mix detail, event detail, beat detail, beat licensing and soundboard detail.
- Local product reference: `/Users/apple/PLUGGD_NEW`, including the production soundboard playback resolver and current public experience.
- Evidence:
  - `artifacts/qa/remaining-pages-2026-07-30/soundboard-playing.jpg`
  - `artifacts/qa/remaining-pages-2026-07-30/recovery-beat.jpg`
  - `artifacts/qa/remaining-pages-2026-07-30/licence-signed-out.jpg`

## Visual-system findings

- Sora display typography, Satoshi supporting typography, warm-black surfaces and restrained PLUGGD orange remain consistent across the audited screens.
- Existing catalogue, discovery, creator, community and commerce surfaces already use the selected mobile system; no legacy web-parity redesign was reintroduced.
- Purchases now uses four image-led gateways rather than an underdesigned empty panel.
- Public-profile, missing-content and restricted-commerce states now retain the same hierarchy and polish as populated screens.
- Valid detail pages preserve artwork-first presentation, readable metadata, 44pt actions and the persistent player/dock separation.

## Functional findings resolved

- Soundboard slugs no longer enter the UUID query path.
- Relative soundboard media paths now use the same secure playback resolver as the live web app.
- Play-all resolves every playable soundboard item before building the queue.
- Soundboard play, follow, save, post, share, react and comment actions expose clear VoiceOver labels.
- Signed-out licence review no longer leaks a backend response; it explains the authentication step and links directly to sign-in.
- Missing beats, mixes, soundboards, events, posts, communities, boards, playlists, videos, products and sample packs now use a shared premium recovery treatment with real onward navigation.
- The recovery primary action was exercised in the simulator and reached the live market catalogue.

## Verification

- TypeScript: passed.
- Mobile contract suite: passed through all product contracts and TypeScript.
- Expo Doctor: 18/18 passed.
- Native iOS simulator build and launch: passed.
- Runtime accessibility snapshot: recovery and licence actions are labelled and actionable.
- One pre-existing Hermes dependency-analysis warning remains; it is a CocoaPods build-script warning and does not affect runtime or submission behavior.

final result: passed
