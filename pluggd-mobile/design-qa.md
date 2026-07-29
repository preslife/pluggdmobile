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
