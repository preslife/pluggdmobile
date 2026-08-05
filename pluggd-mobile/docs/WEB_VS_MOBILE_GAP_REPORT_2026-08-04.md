# PLUGGD mobile — gap & regression report vs the live web app

**Date:** 2026-08-04
**Reference (read-only):** `/Users/apple/PLUGGD_NEW` — served at `localhost:5199`, unlocked via `localStorage.pluggd_pre_release_unlock = 'true'`
**Audited app:** `/Users/apple/pluggd-mobile-workspace/pluggd-mobile` @ `b9b16c7` (branch `codex/app-store-submission-final`) — the checked-out, shipping tree
**Compared against:** `main` @ `6a69689` — the editorial design line

Nothing was deleted. Everything called "lost" below is still in the tree; it was **unwired**, and the contract suite kept reporting green because it pins the files that were unwired rather than the ones now rendering.

---

## 0. Why work went missing — the branch picture

The two lines forked at `63081ee`:

```
63081ee ──┬── main (6a69689)                     5 design commits
          └── codex/app-store-submission-final   design commits rebased in (846c902…5dc46f1)
                                                 + ~50 further commits on top  ← shipping
```

- `main` is **not** an ancestor of `b9b16c7`. The design work was rebased onto Codex's line, so it is present in history — but later Codex commits replaced two of the screens it produced.
- `main` … `b9b16c7` differ by **291 files, +18,599 / −5,004**.
- The working checkout's `node_modules` matches `b9b16c7` (`@stripe/` is empty — the StoreKit migration removed `@stripe/stripe-react-native`), confirming `b9b16c7` is what actually builds and ships.
- Route files are near-identical: Codex added 8 routes, removed `app/auth/biometric.tsx`. **The divergence is content, not routing.**

Relevant Codex commits that changed design surfaces: `26e70d4` "Redesign mobile discovery around The Daily Plug", `2d3cb82` "Restore rich discovery sections", `ad2bf49` "Restore PLUGGD worlds in discovery redesign", `7de94ed` "finish discovery-first home experience", `92b8b77`/`a20297b` "restore home card geometry".

---

## 1. REGRESSION — the editorial type system was removed app-wide

This is the single largest visual difference, and it affects **every** screen.

**Web (verified live):** `main h1` computes to `"Instrument Serif", Georgia, serif`, 48px / weight 400. `src/index.css` declares three families: **Instrument Serif** (display), **JetBrains Mono** (tracked uppercase labels), **Satoshi** (body).

**Mobile, design line (`main`):** loaded all of them — `@expo-google-fonts/instrument-serif`, `/jetbrains-mono`, `/playfair-display`, `/inter`.

**Mobile, shipping (`b9b16c7`):** all four packages removed from `package.json`; [app/_layout.tsx:6](pluggd-mobile/app/_layout.tsx:6) now imports Sora only. The app bundles Sora + Satoshi + PluggdSans and nothing else.

The serif tokens were not deleted — they were **aliased to sans**, so every existing call site silently changed appearance with no compile error:

| Token | `main` | shipping (`b9b16c7`) |
|---|---|---|
| `edFonts.serif` | `InstrumentSerif-Regular` | `Sora-SemiBold` ([src/design/editorial.ts:45](pluggd-mobile/src/design/editorial.ts:45)) |
| `edFonts.serifItalic` | `InstrumentSerif-Italic` | `Sora-Bold` ([:46](pluggd-mobile/src/design/editorial.ts:46)) |
| `edFonts.mono` | `JetBrainsMono-Medium` | `Satoshi-Black` ([:50](pluggd-mobile/src/design/editorial.ts:50)) |
| `pluggdFonts.serif` / `serifItalic` / `serifItalicBold` | `PlayfairDisplay-*` | `Sora-*` ([src/design/typography.ts:16-18](pluggd-mobile/src/design/typography.ts:16)) |

The file header changed too — from *"direct port of the web app's public-visual-system.css + editorial.css tokens so mobile surfaces render the same dark/cream editorial rhythm as pluggd.fm"* to *"PLUGGD selected mobile discovery system. Display: Sora. Data labels: Satoshi Black."*

**Visible result:** web home reads `The night belongs to the *scene*` in Instrument Serif with an orange italic accent; the app reads `The Daily Plug` in Sora Bold.

---

## 2. REGRESSION — Home was replaced; the web-parity home is orphaned

| | file | lines | status |
|---|---|---|---|
| Rendering now | `src/features/home/MusicDiscoveryHome.tsx` | 1,100 | live |
| Web-parity home | `src/features/home/live-music-dashboard-home.tsx` | 1,935 | **imported by nothing** |

`app/(tabs)/index.tsx` on `main` exported `LiveMusicDashboardHome`; it now exports `MusicDiscoveryHome`.

Sections present on the live web home, with reference counts in each mobile file:

| Web home section | orphaned parity home | live home |
|---|---|---|
| Edition hero — `EDITION №216 — TUESDAY 4 AUGUST` + serif headline | 28 | **0** |
| `NOW ON PLUGGD` carousel (numbered 01–05, prev / pause / next) | 7 | **0** |
| **THE PLEDGE** — "Own your masters. Split fairly. Keep your scene." + *I make music* / *I'm here for the sound* + READ THE MANIFESTO | 15 | **0** |
| **PLATFORM PULSE** — "What is moving right now" stat counters | 3 | **0** |
| **BUILD YOUR WORLD** — Listening Parties / Co-production / Transparent Splits | 4 | **0** |
| **THE EDITION** — newsletter subscribe | 3 | **0** |
| Closing CTA — **EMBODY THE CULTURE. FUEL YOUR PATH.** | 11 | **0** |
| `CREATORS: CLAIM YOUR WORLD →` | 2 | **0** |

Also missing vs web, independent of the swap:

- **Search input.** Web home has a full-width `Search creators, scenes, live rooms, …` field directly under the header. The app has a magnifier icon only.
- **Section jump-nav.** Web home exposes a rail: Live now · Next wave · Featured story · The Pledge · Explore scene · Soundboards · Events · Drops · Communities · Build your world · Platform pulse · The Edition.
- **Footer link columns** (Discover / Community / Events / Store / Live / PLUGGD).

Carried over correctly: live activity ticker, upcoming events, The Next Wave, THE PLUG story, Soundboards, Drops, Backstage rooms.

---

## 3. REGRESSION — Discover was replaced; the web-parity Discover is dead code

`DiscoverParityScreen` ([src/features/parity/AppWideParityScreens.tsx:1301](pluggd-mobile/src/features/parity/AppWideParityScreens.tsx:1301)) returns `DiscoverEditorialScreen`. **No route imports it any more** — both `app/discover.tsx` and `app/(tabs)/discover.tsx` now import `MusicDiscoveryDiscover`. `DiscoverEditorialScreen.tsx` is unreachable.

Its own doc comment names the web parity set exactly: *"What's moving now, For You, Live Now, Trending Scenes, New From Creators, Soundboards Worth Opening, Near You, Creators to Watch, Community Pulse."* That matches the live web `/discover` section-for-section.

The live app's Discover is a different IA — tabs `For you / Scenes / Genres / Cities` over City signal, Genre signal, Producer signal, New releases, Soundboards, Charts, THE PLUG, More signals to explore.

Missing vs web `/discover`:

- Filter chips **All · Music · BeatPlug · Mixes · Creators · Soundboards** and the **Trending / New** sort
- **Live Now** — "public rooms first, queued rooms when nothing is live", with *View Events* / *Start a Room*
- **Near You**
- **Creators to Watch**
- **Community Pulse**
- **From the racks**
- Closing CTA "Go beyond one format. Explore the whole culture."

---

## 4. Why the contract suite stayed green

`npm run verify:mobile` passes, but **10 contract scripts pin files the app no longer renders**:

| Orphaned file | Contracts still validating it |
|---|---|
| `live-music-dashboard-home.tsx` | `verify-mobile-typography`, `verify-mobile-social-web-parity`, `verify-mobile-culture` |
| `stage-discovery-screen.tsx` | `verify-mobile-stage`, `verify-mobile-gap-wiring`, `verify-mobile-culture` |
| `backstage-world-screen.tsx` | `verify-mobile-culture`, `verify-mobile-gap-wiring` |
| `components/CreateActionSheet.tsx` | `verify-mobile-app-wide-web-parity`, `verify-mobile-liquid-glass`, `verify-mobile-navigation`, `verify-mobile-premium-finish`, `verify-mobile-web-source-truth` |

Demonstration:

```bash
cd /Users/apple/pluggd-mobile-workspace/pluggd-mobile && node scripts/verify-mobile-typography-contract.mjs
```

prints `mobile typography contract verified` and exits 0 — while the shipping app contains no serif font at all. **Repoint these contracts at the live files before trusting the suite again.**

---

## 5. Built but unreachable (~2,000 lines)

**Stage and Backstage are retired concepts.** The screens were unwired, but the things pointing at them were not — so these aren't just dead code, they're live broken navigation. Full detail and the fix list are in `DESIGN_DIRECTION_AND_PAGE_PLAN_2026-08-04.md` §3.9.

- `src/features/backstage/backstage-world-screen.tsx` (1,023 lines) — `app/(tabs)/backstage.tsx` is `<Redirect href="/create" />`, and **seven live call sites still push to `/backstage`**, including the player's *Scene* and *Talk* buttons and the *Comment* action on posts. All of them land the user on the Create hub. Fix the destinations, then delete. (The `/backstage/[id]` detail route is healthy — 28 correct call sites — and stays.)
- `src/features/stage/stage-discovery-screen.tsx` (984 lines) — `app/(tabs)/stage.tsx` is `<Redirect href="/discover" />`. No live callers, so it's a clean delete. **It contains the only full Charts implementation** (`SectionHeader title="CHARTS"`, `ChartRow`, creator charts) — move that somewhere reachable first if you still want it.

Also drop `/stage` and `/backstage` from the tab alias lists in `components/PluggdDock.tsx:29,45` and `components/AppChrome.tsx:38-39`.

Note: the May 2026 docs `PLUGGD_IOS_STAGE_PAGE_TASKS_2026-05-17.md` and `PLUGGD_IOS_BACKSTAGE_PAGE_TASKS_2026-05-17.md` describe these retired concepts and should be archived — they will mislead anyone auditing from the docs.

Also orphaned: `components/BuildYourWorld.tsx`, `components/WhatsMovingNow.tsx`, `components/CultureBand.tsx`, `components/TipModal.tsx`, `components/BeatLicenseButton.tsx`, `components/AchievementToast.tsx`, `components/liquid-glass/PremiumHeroCard.tsx`, `components/CreateActionSheet.tsx` (newly orphaned by Codex).

`BuildYourWorld.tsx` and `WhatsMovingNow.tsx` are direct ports of the web's *Build your world* and *Platform pulse* sections — they are ready to wire back into Home.

---

## 6. Surfaces that DID keep web parity — leave these alone

| Route | Screen | Notes |
|---|---|---|
| `/releases` | `ListeningFloorScreen` | Fresh pressings, The chart, Pressing orders, Listening passes, The racks |
| `/mixes` | `MixesWorldScreen` | incl. **PLUGGD radio** section |
| `/soundboards` | `SoundboardsIndexScreen` | search + Updated/Trending/Featured |
| `/events` | `EventsBoardScreen` | matches web `/events` section-for-section: Discover local shows, Browse/Map toggle, category chips, Browse fast list, Event Spotlight, Open Opportunities, For Promoters |
| `/market` | `MarketStoreScreen` | Worldwide Lookbook, What's Next, creator storefronts, Digital shelf, Book talent, Event merch |
| `/market/beats` | `BeatPlugScreen` | |
| `/community` | `CommunityFeedScreen` | has web's `all / threads / media / reposts` filters + Stories / THE PLUG / Boards / Nearby / Communities / Explore |
| `/plug` | `ThePlugIndexScreen` | added by Codex; absent on `main` |

Smaller deltas on these:

- **Market** is missing the web's faceted **Filter** panel (Collections / Product types / Sellers) and the **Bundles** shelf.

---

## 7. Web features with no mobile route

Genuine gaps:

| Web route | Notes |
|---|---|
| `/directory` | creator directory — referenced as a dock alias but no screen exists |
| `/blog`, `/blog/:postId` | |
| `/manifesto` | also the target of the missing Pledge CTA |
| `/label`, `/label/:slug` | label pages |
| `/contracts` | |
| `/referrals` | |
| `/learn`, `/learn/:slug`, `/education`, `/academy` | `app/gamification/courses.tsx` exists but there's no learn hub |
| `/challenges`, `/progress` | app has `gamification/quests` + `gamification/battles` only |
| `/collabs`, `/collaborate` | app has `app/pro/collab.tsx` only |
| `/credits/purchase` | likely intentional under IAP — confirm |

Present but nested (no standalone route — flag only if you want the route):

- **Charts** — only reachable as a section of `/releases`; the fuller implementation is in the dead stage screen
- **Radio** — a section of `/mixes` (`PluggdRadio`), no `/radio` route

Deliberate, not bugs:

- Role-specific public profiles: web ships distinct `/artist/:id`, `/producer`, `/djs/:slug`, `/venues/:slug`, `/promoters/:slug`, mobile collapses them into `u/[username]` / `creator/[username]`, role-aware via `src/lib/mobileNavigation.ts`. Reasonable for mobile — but the web layouts differ per role, so check nothing role-specific is lost.
- `/terms`, `/privacy`, `/help`, `/refunds` are handled as external links to `pluggd.fm`. Fine.

---

## 8. Codex changes worth keeping

- **Warm surfaces.** `main` still leaked cool values (`surfaceAlt: rgba(34,35,52,0.72)`, `artworkBase: #111827`); Codex corrected them to `rgba(36,29,21,0.82)` / `#171310`. Verified against live code, not just the handoff: the warm ground is consistent, and orange is clean at 107 uses of `#ff6600` against one stray `#ff7a1a`. Don't revert these when restoring the type system.
- New routes: `app/plug/index.tsx`, `app/studio/splits.tsx`, `app/connect/[slug]/{business,collab,contract,rates}.tsx`, `app/commerce/order.tsx`, `app/settings/blocked-accounts.tsx`
- StoreKit/IAP commerce, native Apple + Google sign-in, `src/design/useReducedMotion.ts`, `src/components/ReleaseArtwork.tsx`

---

## 9. Suggested order of work

1. **Restore the type system** — re-add `@expo-google-fonts/instrument-serif` + `/jetbrains-mono`, load them in `app/_layout.tsx`, point `edFonts.serif/serifItalic/mono` and `pluggdFonts.serif*` back at them. Keep Codex's warm colour tokens. This alone recovers the editorial look on every screen.
2. **Repoint the 10 contracts** at the files that actually render, so the suite can catch this class of loss.
3. **Decide Home.** Either re-wire `live-music-dashboard-home.tsx`, or port the eight missing sections (Edition hero, NOW ON PLUGGD carousel, The Pledge, Platform Pulse, Build Your World, The Edition, closing CTA, Creators-claim link) plus the search field into `MusicDiscoveryHome`.
4. **Decide Discover.** Same choice: re-wire `DiscoverEditorialScreen`, or add Live Now / Near You / Creators to Watch / Community Pulse / From the racks and the filter+sort chips to `MusicDiscoveryDiscover`.
5. **Resolve the dead screens** — wire up or delete `stage-discovery-screen.tsx` and `backstage-world-screen.tsx`; if deleting, move Charts somewhere reachable first.
6. Fill the route gaps from §7 in whatever order matters commercially.
