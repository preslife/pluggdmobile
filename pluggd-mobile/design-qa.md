# PLUGGD Music-Discovery Redesign — Design QA

## Source truth

- Selected hybrid concept: `/Users/apple/.codex/generated_images/019f8932-7bd6-7460-abd1-20fed208cc10/exec-e2d7d685-013e-4e31-a1a0-a629dd12b306.png`
- Concept dimensions: 853 × 1844 px (390 × 844pt design intent)
- Fixed anchors: PLUGGD logo, orange `#ff6600`, warm black canvas
- Chosen system: Curator's Bazaar / Daily Plug hierarchy with Signal Deck's modern grotesk typography and compact interaction density

## Implementation captures

- Home: `artifacts/screenshots/music-discovery-redesign-2026-07-22/home.jpg`
- Discover with persistent mini-player: `artifacts/screenshots/music-discovery-redesign-2026-07-22/discover-mini-player.jpg`
- Full player: `artifacts/screenshots/music-discovery-redesign-2026-07-22/full-player.jpg`
- Community: `artifacts/screenshots/music-discovery-redesign-2026-07-22/community.jpg`
- Library: `artifacts/screenshots/music-discovery-redesign-2026-07-22/library.jpg`
- Direct source/implementation comparison: `artifacts/screenshots/music-discovery-redesign-2026-07-22/home-comparison.png`

## Capture conditions

- Device: iPhone 17 Pro Max simulator, iOS 26.2, portrait
- Native viewport: 430 × 932pt; optimized screenshot: 368 × 800px
- State: public feed loaded from the existing Supabase data; signed-out library empty state; real playback queue active for mini/full-player captures
- Accessibility inspection: runtime semantic snapshot with labelled Home, Discover, Community and Library tabs and labelled playable controls

## Full-screen comparison

The implementation preserves the selected hierarchy: compact brand header, Daily Plug lead, immediate playable artwork, four choices, scene strip, contextual event entry and four-item dock. Real production data changes the exact artwork and copy, by design. It is denser than the concept while preserving clear section rhythm and has no marketing block before music.

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

## Outstanding visual issues

- None at P0, P1 or P2 for the approved discovery loop.
- Existing Community content retains its richer glass treatment; it now participates in the selected navigation and persistent player but can receive a deeper editorial-density pass in the next public-surface sweep.

## Final result: passed

The approved Home direction, intentional Discover surface, persistent mini-player, modern full player, four-part navigation and redesigned Library are implemented and verified against the selected concept.
