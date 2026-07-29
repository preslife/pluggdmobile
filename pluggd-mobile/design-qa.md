# PLUGGD Music-Discovery Redesign — Design QA

## Source truth

- Selected hybrid concept: `/Users/apple/.codex/generated_images/019f8932-7bd6-7460-abd1-20fed208cc10/exec-e2d7d685-013e-4e31-a1a0-a629dd12b306.png`
- Concept dimensions: 853 × 1844 px (390 × 844pt design intent)
- Fixed anchors: PLUGGD logo, orange `#ff6600`, warm black canvas
- Chosen system: Curator's Bazaar / Daily Plug hierarchy with Signal Deck's modern grotesk typography and compact interaction density

## Implementation captures

- Home: `artifacts/screenshots/music-discovery-redesign-2026-07-22/home.jpg`
- Corrected Home: `artifacts/screenshots/music-discovery-redesign-2026-07-22/home-v2.png`
- Corrected Discover: `artifacts/screenshots/music-discovery-redesign-2026-07-22/discover-v2.png`
- Discover with persistent mini-player: `artifacts/screenshots/music-discovery-redesign-2026-07-22/discover-mini-player.jpg`
- Full player: `artifacts/screenshots/music-discovery-redesign-2026-07-22/full-player.jpg`
- Community: `artifacts/screenshots/music-discovery-redesign-2026-07-22/community.jpg`
- Library: `artifacts/screenshots/music-discovery-redesign-2026-07-22/library.jpg`
- Direct source/implementation comparison: `artifacts/screenshots/music-discovery-redesign-2026-07-22/home-comparison.png`
- Corrected direct comparison: `artifacts/screenshots/music-discovery-redesign-2026-07-22/home-comparison-v2.png`

## Capture conditions

- Device: iPhone 17 Pro Max simulator, iOS 26.2, portrait
- Native viewport: 430 × 932pt; optimized screenshot: 368 × 800px
- State: public feed loaded from the existing Supabase data; signed-out library empty state; real playback queue active for mini/full-player captures
- Accessibility inspection: runtime semantic snapshot with labelled Home, Discover, Community and Library tabs and labelled playable controls

## Full-screen comparison

The corrected implementation preserves the selected hierarchy: compact brand header, Daily Plug lead, immediate playable artwork, four choices, scene strip and four-item dock. Below the opening viewport it now continues into New Releases, Soundboards, a real Featured Event, creator discovery and contextual live access. Real production data changes the exact artwork and copy, by design.

## Focused comparison

| Area | Result | Notes |
| --- | --- | --- |
| Header and typography | Pass | Sora/Satoshi modern grotesk replaces the rejected serif direction. |
| First playable | Pass | Orange 44pt play control is visible on the lead artwork and starts the shared queue in one tap. |
| Opening density | Pass | Lead plus four distinct music choices appear before the dock. |
| Discovery rationale | Pass | Every row exposes a real-data reason such as producer signal, city movement or genre selection. |
| Player continuity | Pass | Do Better continued from Home into Discover; mini and full player use the same PlaybackProvider queue. |
| Navigation | Pass | Home, Discover, Community and Library are fixed; Events and Market remain reachable contextually. |
| Honest states | Pass | Missing collections use an explicit empty state; unavailable audio keeps the existing honest alert. |
| Touch/accessibility | Pass | Primary controls are 44pt or larger and carry descriptive accessibility labels. |

## Iteration history

1. Initial native pass exposed an invisible lead play affordance and compact cards that collapsed into an unintended three-column arrangement.
2. Replaced the lead action with a visible 44pt orange artwork control and rendered the four picks as two explicit two-column rows.
3. Discover rows initially lost their horizontal layout through callback-based press styling; changed layout-critical pressables to stable direct styles.
4. Rebuilt and captured again. Home, Discover, playback and navigation passed the simulator interaction check.
5. User review correctly identified that the first pass still diverged from the mockup and had removed too much platform depth. Home was rebuilt with stronger artwork scale and restored Releases, Soundboards, Featured Event and creator modules.
6. Discover's ranked-list opening was removed and replaced with a three-part playable mosaic, surfaced-reason line, Scene Dial, Release Radar and independent chart. The corrected simulator captures were compared again.

## Outstanding visual issues

- None at P0, P1 or P2 for the approved discovery loop.
- Existing Community content retains its richer glass treatment; it now participates in the selected navigation and persistent player but can receive a deeper editorial-density pass in the next public-surface sweep.

## Final result: passed

The approved Home direction, intentional Discover surface, persistent mini-player, modern full player, four-part navigation and redesigned Library are implemented and verified against the selected concept.

## Release artwork correction — 29 July 2026

- Source visual truth: the live `Still ah Link` 3000 × 3000px release cover and the existing square-cover presentation used throughout PLUGGD.
- Defective implementation capture: `artifacts/screenshots/release-artwork-correction-2026-07-29/home-before.jpg` at 368 × 800px.
- Corrected implementation captures:
  - Home: `artifacts/screenshots/release-artwork-correction-2026-07-29/home-after.jpg`
  - Release detail: `artifacts/screenshots/release-artwork-correction-2026-07-29/release-detail-after.jpg`
  - Home comparison: `artifacts/screenshots/release-artwork-correction-2026-07-29/home-comparison.jpg`
  - Release detail comparison: `artifacts/screenshots/release-artwork-correction-2026-07-29/release-detail-comparison.jpg`
- Viewport: iPhone 17 Pro Max simulator, optimized 368 × 800px capture.
- State: live public feed, `Still ah Link` featured on Home and opened on its public release route.
- Root cause: the Supabase derivative request supplied `width` without an explicit resize strategy, returning a distorted 520 × 3000px derivative from the square 3000 × 3000px source.
- Fix: derivative requests now use `resize=contain`, preserving the source ratio before React Native applies the card's edge-to-edge `cover` fit. Release hero, Home lead, release tiles, Listening Floor wall, ledger, chart and support cards use consistent artwork frames.
- Full-view comparison: the corrected Home shows complete, correctly proportioned square covers while rectangular cards remain edge-to-edge with a modest centred crop. No blurred bars or narrow poster strips remain.
- Focused comparison: Home lead and release detail hero both preserve the full square composition; typography, spacing, orange controls, copy and card hierarchy are unchanged.
- Accessibility and interaction: existing labelled press targets and one-tap playback remain unchanged.
- Comparison history:
  1. The original rendering showed severe zoom caused by the malformed derivative.
  2. A contain-plus-blurred-backdrop treatment exposed the malformed derivative as a narrow strip and was rejected.
  3. Inspecting the live source and derivative proved the data was correct and the resize response was not.
  4. The derivative was corrected, the app rebuilt, and Home plus release detail were recaptured on the same simulator.
- Final result: passed.
