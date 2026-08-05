# PLUGGD mobile — design direction + per-page plan

**Date:** 2026-08-04
**Audited:** `pluggd-mobile` @ `b9b16c7`, screens reviewed from `artifacts/qa/final-aaa-pass-2026-08-01/` (110 captures)
**Reference:** the live web app at `/Users/apple/PLUGGD_NEW`

---

## 1. When the font changed, and was it planned

| Date | Commit | What happened |
|---|---|---|
| 21 Jul 2026 | `09e2d3f` | Design line ends. Instrument Serif + JetBrains Mono + Satoshi, matching the web. |
| 22 Jul 2026 | `26e70d4`, `2d3cb82`, `ad2bf49`, `9ba4a70` | Home + Discover rebuilt around "The Daily Plug". Worked against a side-by-side mock — see `artifacts/screenshots/music-discovery-redesign-2026-07-22/home-comparison.png` (concept left, build right, both in Sora/Satoshi). |
| **26 Jul 2026** | **`290df85`** — *"Finish selected mobile design across secondary surfaces"* | **The fonts changed here.** Instrument Serif, JetBrains Mono, Playfair Display and Inter were removed from `package.json` and `app/_layout.tsx`, and the global serif tokens were re-pointed at Sora. |

**Was it planned?** Half of it.

Choosing a Sora/Satoshi treatment for **Home and Discover** was a real decision — there's a comparison artifact, and those two screens were rebuilt to match it.

Extending it **app-wide** was not a design decision, it was a side effect. `290df85` carries a one-line message, ships no design doc, and the only record of intent is a code comment:

> *"Compatibility aliases. The selected mobile redesign uses the concept-1 Sora/Satoshi typography system everywhere, including older call sites."* — `src/design/typography.ts`

Because `edFonts.serif`, `serifItalic` and `mono` were *aliased* rather than removed, ~20 screens that were never part of the selected concept silently restyled themselves with no compile error and no visual diff in review. There is no `concept-1` spec anywhere in the repo. (The `stitch_pluggd_home_discovery` folder is an older, unrelated set — it uses Lexend/Manrope/Spline Sans.)

So: nobody decided "PLUGGD mobile should have no serif." It happened as a token rename.

---

## 2. Should the app keep the editorial look? — Yes, but not as a binary

**Recommendation: restore the serif as a display-only voice. Keep Satoshi for everything you actually read. Drop Sora.**

This is not a compromise — it's what the web already does, and what the app's own content model demands.

**Why the serif has to come back:**

- **The app's vocabulary is already editorial and the type is fighting it.** Look at `24-the-plug.png`: an orange mono kicker `PLUGGD EDITORIAL · CULTURE IN MOTION`, a masthead, filter chips, `THE LEAD STORY` / `CURRENT ISSUE` rails, a dateline `LONDON · 02 JUN 2026`, "Read dispatch →", "Latest dispatches / 6 STORIES". That is a magazine front page rendered in a product sans. Same on Releases (`THE LISTENING FLOOR`), Discover (`FOLLOW THE SIGNAL`), Community (`SCENES IN MOTION`), Home (`The Daily Plug`, "Edition"). The structure survived the font swap; only the voice was removed.
- **It's the only thing that makes PLUGGD look unlike its competitors.** Spotify, SoundCloud, Audiomack, Bandcamp and Apple Music are all geometric/neo-grotesque sans. A serif masthead over warm near-black is instantly not-those. Sora is a good typeface that makes PLUGGD look like everyone else.
- **One brand across surfaces.** Someone reading pluggd.fm and then opening the app currently sees two different products.

**Why *not* to just revert to the design line:** the concern behind picking a sans was legitimate. Instrument Serif is a display face — at 15–17px body sizes its thin strokes go fragile on OLED, and it was being used too far down the type scale. The fix is a size floor, not deletion.

**The system to standardise on** (mirrors the web exactly):

| Role | Face | Use |
|---|---|---|
| Display | **Instrument Serif 400** (+ Italic for the accent word) | Page mastheads and section titles **≥ 28px only**. Never body, never buttons, never nav. |
| Labels / data | **JetBrains Mono 500**, uppercase, tracked +0.08em | Eyebrows, datelines, counts, stat labels, timestamps, chips |
| Body / UI | **Satoshi** (Light → Black) | Everything else — body copy, buttons, list rows, tabs, nav, form fields |
| Sora | — | **Remove.** It duplicates Satoshi's role and adds a third sans with no job. |

Keep Codex's warm surface tokens (`#171310`, `rgba(36,29,21,0.82)`) — they're better than the design line's, which still leaked cool blue-greys.

---

## 3. Cross-cutting fixes — these apply to every page

These matter more than any single screen. Fix them first; several pages stop needing individual work afterwards.

1. **One type system.** Section 2. Single largest visual gain.
2. **One header component.** There are currently two: a flat header (Discover, Community, Events, THE PLUG) and a glass pill bar (Market, Releases). Pick the flat one — the pill bar eats vertical space and its icon set (`LIVE`, bell, avatar) differs from the flat one (`LIVE`, search, account). Standardise on: logo · LIVE · search · account, with an optional page-specific action on the right.
3. **One eyebrow/title/subtitle block.** Discover, Community, Events, Market and THE PLUG already share this shape — mono orange eyebrow, display title, one-line subtitle. Extract it and apply it to the pages that don't (Home, My PLUGGD, Studio, Library, Wallet).
4. **Bottom inset for the dock.** Content runs under the dock on nearly every scrolling page. Every scroll container needs `contentContainerStyle.paddingBottom = dockHeight + insets.bottom + 24`. Currently the last row of every page is half-hidden.
5. **Violet has no owner — three unreconciled values, used as the default.** *(Corrected: an earlier draft of this doc called violet "the Backstage sub-accent", quoting the 21 Jul handoff. Backstage is retired — see §3.9 — so that scoping no longer exists. The real situation is worse.)*
   There are three separate violets in live code, none of them shared:
   - `#7C3AED` — `PLUGGD_VIOLET` / `PLUGGD_BACKSTAGE_VIOLET` (aliases of each other) in `src/design/tokens.ts:6`
   - `#6C5CE7` — a second hardcoded `VIOLET` in `src/features/culture/CultureScreens.tsx:63`
   - `#7c5cff` — a third, for the `PLAYABLE` chip in `src/features/editorial/MixesWorldScreen.tsx:1226`
   - plus `rgba(126,106,255,…)` and `rgba(173,91,255,…)` as liquid-glass tones

   And it is not a scoped accent — it's the **default fallback tone for anything uncategorised** (`AppWideParityScreens.tsx:298,315,1195` — not an event, not market, therefore violet), a **global background wash** (`LiquidBackground.tsx:33`), and the accent for Library / Saved / Following, the verified badge, and the live ring (`CultureScreens.tsx:1462-64, 583, 1746`).

   **Decide what violet is for, then apply it deliberately.** Either promote it to a real secondary — one hex, defined in `tokens.ts`, with a stated job (e.g. "personal/owned surfaces") — or remove it and let warm neutrals carry the uncategorised case. What it can't stay is an accidental default in three shades. By contrast orange is clean: 107 uses of `#ff6600` against a single stray `#ff7a1a`.

9. **Retired concepts still have live callers — this is shipping broken navigation.** "Stage" and "Backstage" were abandoned as destinations, but only the screens were unwired, not the things pointing at them. `app/(tabs)/backstage.tsx` is `<Redirect href="/create" />`, and **seven live call sites still push to it**:

   | Call site | Button the user sees | Where they actually land |
   |---|---|---|
   | `app/player.tsx:283` | **Scene** (a11y "Community") | Create hub |
   | `app/player.tsx:284` | **Talk** (a11y "Comments") | Create hub |
   | `app/post/[id].tsx:165` | **Open Community** | Create hub |
   | `CultureScreens.tsx:428` | **Comment** | Create hub |
   | `CultureScreens.tsx:899` | comment count (**48**) | Create hub |
   | `CultureScreens.tsx:566` | creator portal | Create hub |
   | `mobileServices.ts:357` | activity-row fallback | Create hub |

   Tapping "Comment" on a post takes you to the Create screen. Fix the destinations first, then delete `src/features/backstage/backstage-world-screen.tsx` (1,023 lines) and `src/features/stage/stage-discovery-screen.tsx` (984 lines), and drop `/stage` and `/backstage` from the alias lists in `components/PluggdDock.tsx:29,45` and `components/AppChrome.tsx:38-39`. `/stage` has no live callers, so it's a clean delete. The `/backstage/[id]` detail route is fine and stays — 28 call sites use it correctly.
6. ~~**Verify the dock at 375pt.**~~ **Resolved.** Confirmed in the running app at 375pt: all five tabs (including the restored Store) render without clipping. The 368px QA captures were the artifact, as suspected — the dock styles were always correct.
7. **Empty and loading states need the same care as full ones.** `--:--`, `0 TRACKS`, `40% HEALTH`, `CATALOG 1` with an empty progress bar all currently read as broken rather than new.
8. **Never full-bleed a photo behind body copy.** See Studio below.

---

## 4. Per-page plan

### Tier 1 — public hubs

**Home** — *needs the most work*
Currently `MusicDiscoveryHome.tsx`; the web-parity version sits unused in `live-music-dashboard-home.tsx`.
- Restore the **Edition masthead**: `EDITION №216 — TUESDAY 4 AUGUST` in mono over an Instrument Serif headline with the italic orange accent word. This is the app's front door and the single strongest brand moment — right now it's "The Daily Plug" in Sora Bold.
- Add the **search field**. The web puts a full-width `Search creators, scenes, live rooms…` input directly under the header; the app has an icon only. On a phone, search is the primary discovery gesture — an icon is the wrong affordance here.
- Restore **The Pledge** (Own your masters / Split fairly / Keep your scene + the two role cards + Read the manifesto). This is the positioning statement and it is completely absent from the app.
- Restore **Platform Pulse**, **Build Your World**, **The Edition** signup and the closing CTA. `components/WhatsMovingNow.tsx` and `components/BuildYourWorld.tsx` are already-built ports sitting orphaned — wire them, don't rewrite them.
- Keep the live ticker and the hero release card; both are good.

**Discover** — *good bones, wrong IA*
The screen itself (`03-discover.jpg`) is strong: numbered world cards 01–05, warm ground, clean chips.
- Two problems: the top card rail is clipped mid-card at first paint (start the rail at a section boundary), and the bottom rows run under the dock.
- The tab taxonomy (`For you / Scenes / Genres / Cities / Charts`) diverges from the web (`All / Music / BeatPlug / Mixes / Creators / Soundboards` + Trending/New). Pick one and use it in both places — right now a user filtering on the web can't do the same thing in the app.
- Missing vs web: **Live Now**, **Near You**, **Creators to Watch**, **Community Pulse**. `DiscoverEditorialScreen.tsx` already implements all four and is currently dead code.

**Community** — *closest to right*
`04-community.jpg` is the best-resolved hub page. Header, segmented control (Feed/Communities/Boards/Explore), filter row (Latest/Threads/Media/Reposts), composer prompt, post cards — all clean and matching the web.
- One fix: **the story rail is below the fold**, under the composer and partially behind the dock. On web it sits at the top. Move it above the composer.
- Post cards could use a little more vertical rhythm between the text block and the media — they currently touch.

**Events** — *strong, minor fixes*
`05-events.jpg`. Spotlight card, Browse/Map toggle, category chips, Upcoming Events posters. Matches the web section-for-section.
- The Event Spotlight card has a large empty dark area above the title where the poster image should be — either fill it or collapse the card height when there's no image.
- Two control rows stacked (`All events / Live Music / Culture…` then `Filters / Map / Reset`) is one row too many, and `Map` appears twice (once as the top toggle, once in the filter row). Remove the duplicate.

**Market / Store** — *restored to the dock; now needs the checkout rails wired per product*

**Store is a primary tab again** (done — `14edaa2`). It had been dropped when the dock was simplified to four items for submission, which hid a catalogue that was already ported from web on 27 Jul. Nothing in App Review required that: `PLUGGD_IOS_HYBRID_COMMERCE_ARCHITECTURE_2026-07-27.md` is marked canonical, `src/commerce/policy.ts` already resolves all five rails, and `react-native-iap` plus the StoreKit provider are already installed. This was a navigation regression, not a product decision.

The catalogue ships on both web and iOS; **the CTA is chosen per product type**, server-side:

| Product | iOS rail | CTA |
|---|---|---|
| Physical merch | `stripe_checkout` | `Buy £35` |
| Event tickets | `stripe_checkout` | `Get tickets` |
| Bookings / real-world services | `stripe_checkout` | `Enquire` / `Book` |
| Beat licences | `stripe_checkout` (professional licence for work off-platform) | `License beat` |
| Release unlock | `credits` (credits bought via IAP) | `Unlock 100 credits` |
| Tips / live gifts | `credits` | `Send tip` |
| Creator memberships | `apple_subscription` | `Join £4.99/month` |
| Paid sample packs / digital downloads | `unavailable` on iOS v1 | browse and save, **no purchase CTA** |
| Already bought on web | entitlement only | appears in Library |

Two constraints to hold to, both already in the architecture:

- **Paid digital downloads must not use ordinary hosted checkout on iOS.** Physical goods can; digital packs cannot. iOS v1 shows them without a purchase CTA.
- **Direct external cash purchase of releases was scoped US-storefront-first.** Everywhere else, including the UK, the safe default is the Apple-backed credit unlock unless the external-purchase entitlement applies.

Remaining design work on the screen itself:
- Uses the glass pill header while its sibling hubs use the flat one — unify (§3.2). Confirmed in the rendered app: Home shows the flat header, Store shows the pill with an extra bell.
- Missing the web's **Filter panel** (Collections / Product types / Sellers) and the **Bundles** shelf. A store without faceted browse stops working past ~30 products.
- Every product card and detail CTA must read its label and rail from `useCommercePolicy` rather than hardcoding — so a product that resolves to `unavailable` degrades to browse-and-save instead of showing a dead button.

### Tier 2 — content worlds

**THE PLUG** — *best page in the app; give it the serif*
`24-the-plug.png` needs almost nothing structurally. Masthead, chips, lead story with dateline, latest dispatches. Put Instrument Serif on the `THE PLUG` masthead, the lead headline and "Latest dispatches", and JetBrains Mono on `LONDON · 02 JUN 2026` and `6 STORIES`, and this becomes a genuinely world-class editorial screen.

**Releases / Listening Floor** — *strong*
`07-releases.jpg`. Full-bleed artwork, page dots, waveform scrubber, transport, `Support — £0.79`. Excellent.
- `--:--` on both time labels means duration isn't resolving before paint — show a skeleton bar instead of dead placeholders.
- `4 PLAYS` floats unanchored to the right of the transport row; move it to the metadata line under the title.
- The `RELEASED / 10 JUN 2026` row is behind the dock (§3.4).

**Mixes / Soundboards / BeatPlug** — keep as-is structurally; they inherit the type fix and the bottom inset. These were faithful web ports and still are.

**Live** — verify the empty state. Web shows "No live rooms open right now" plus upcoming events and a *Start a Room* CTA so the page is never dead. Confirm the app does the same rather than showing an empty list.

### Tier 3 — personal

**My PLUGGD** — *the most confused page*
`28-my-pluggd.png`.
- The violet eyebrow is a symptom of §3.5, not a one-off. Resolve violet's role globally first, then apply the answer here.
- **Two stacked tab rows**: `Feed / Circles / Library / Activity`, then immediately `For You / Following`. Two levels of horizontal tabs 60px apart is a hierarchy failure — a user can't tell which one they're changing. Collapse to one row, or make the second a chip/segmented control that visually reads as subordinate.
- The header block (eyebrow, title, subtitle) plus two tab rows plus a story rail plus a composer consumes the entire first screen before any content appears. Cut it down: title + one tab row + composer, and move stories inline.
- Feed content runs behind the dock.

**Wallet / Purchases / Tickets / Memberships / Settings** — these are utility screens and are mostly fine. Apply the shared header, the mono treatment for amounts and dates, and the bottom inset. Don't add editorial display type here — utility pages should stay quiet.

**Full player** — *clean, one fix*
`25-player.png`. Good hierarchy.
- **`Scene` and `Talk` are both broken** — both push `/backstage`, which redirects to the Create hub (§3.9). Point Scene at the release's community and Talk at its comments. This is a functional bug, not styling.
- Once they go somewhere, differentiate them: they currently carry identical orange weight and near-identical speech-bubble glyphs. Make one primary, and use distinct icons (Scene = people/room, Talk = bubble, Queue = list).
- Empty state says "No track selected" with a dead transport — offer a "Start the rotation" action instead of a disabled player.

### Tier 4 — creator

**Studio** — *needs real work; weakest screen in the app*
`38-studio.png`.
- **The full-bleed release artwork behind the hero destroys legibility.** "Welcome back, creator." sits over bright yellow sky, and the `Check cash / Go live / Apps` labels sit on a photo of a car — effectively unreadable. Either drop to a flat warm panel, or keep the image with a much heavier scrim (a 70%+ vertical gradient), and never place small labels over the busy region.
- The `40% HEALTH` ring competes with the headline for the same eye position. Move it below the CTA or into the stat row.
- `Collect / Payouts and wal…` truncates. Shorten the label.
- Stat tiles (`CATALOG 1`, `AUDIENCE 4`, `LIVE 0`) carry progress bars with nothing to progress against — drop the bars at low counts, or replace with a trend delta.
- Studio has its **own bottom dock** (Home/Apps/Create/Insights/More with a raised orange FAB) that shares no visual language with the main GlassDock. A distinct creator-mode nav is a defensible choice, but it should be the same component with a different item set, not a different design.

**Connect Card / Analytics / Upload / Payouts / Memberships** — consistent with Studio; they'll improve once the Studio header and dock are resolved. Analytics in particular should take the mono treatment for all numerals.

### Tier 5 — auth

**Login / Signup / Role / Fan setup** — first impression of the brand. These should carry the Edition masthead treatment (mono eyebrow + serif line) rather than generic form headers. Low effort, high return.

---

## 5. There is no current design plan of record

Worth stating plainly, because it's the reason this is hard to answer: **the newest design document in the tree is the 21 Jul `CODEX_BUILD_HANDOFF.md`.** Everything else is May 2026 task lists — including `PLUGGD_IOS_BACKSTAGE_PAGE_TASKS_2026-05-17.md` and `PLUGGD_IOS_STAGE_PAGE_TASKS_2026-05-17.md`, both for concepts that have since been retired. The only doc after 21 Jul is `PLUGGD_IOS_HYBRID_COMMERCE_ARCHITECTURE_2026-07-27.md`, which is commerce, not design.

So the redesign that has been running since 22 Jul has no written spec at all. That's how the app-wide font change happened as a code comment, and it's why an audit that starts from the docs — as my first pass did — reads from a plan that no longer applies. **Archive the May docs and the 21 Jul handoff, and let this file be the plan of record until it's superseded.**

Retired, but still referenced in old docs and live code: **Stage**, **Backstage** (see §3.9).

---

## 6. Order of work

Font is deliberately last — design and features first.

**Done on `claude/pluggd-aaa-pass`:**
- `a3eaf96` Codex's uncommitted work preserved as the base
- `bf18188` bottom-chrome inset — every scrolling screen now reserves the right space
- `f046a48` web build restored (the track-player shim was missing `Event` / `useTrackPlayerEvents`, which blanked the whole tree — this is the harness QA screenshots come from)
- `14edaa2` Store restored as the fifth dock tab

- `1f0a20e` digital shelf no longer prices packs that can't be bought on iOS
- `f80ccf9` one header across the public hubs — Market and Releases were falling through to the pill
- `d75970e` My PLUGGD tab hierarchy — the subordinate switch was outranking the primary tabs
- `a8ead46` `tone="community"` no longer resolves to the retired Backstage violet

Commerce checked while doing the Store work: `/product/[id]` and `/sample-pack/[id]` already gate correctly — digital products degrade to "BROWSE ONLY", paid packs answer with "Preview only on iPhone". The rails were sound; only the listing was over-promising.

**Next:**
1. Home — Edition masthead and the search field (not the marketing sections).
2. Discover — Live Now / Near You / Creators to Watch / Community Pulse.
3. Empty and loading states (§3.7) — `--:--` on the Listening Floor is the visible one.
4. Shared eyebrow/title/subtitle block (§3.3).
5. Retired-concept cleanup (§3.9) — **needs a call**: deleting `stage-discovery-screen.tsx` loses the only full Charts implementation.
6. Studio hero legibility — **needs a fresh capture first**; the 1 Aug screenshot predates `5787b0f`.
7. Violet, the rest of it (§3.5) — **needs a call**: real secondary, or gone.
8. Store faceted filters + Bundles shelf.
9. **Last:** the type system (§2).

Then repoint the 10 contract scripts listed in `WEB_VS_MOBILE_GAP_REPORT_2026-08-04.md` §4, so this class of regression can't pass review again.
