# iOS Native Parity Build 8 Recovery Verification

## Phase 21 Build 13 platform-plan production entitlement gate — pass

- [x] Read-only production preflight confirms the four required base tables/types exist and proves broad `supabase db push` unsafe because checkout migration history diverges substantially from production.
- [x] Only migrations `20260828132900` and `20260828133000` are applied through the targeted migration API.
- [x] Only `validate-iap-receipt`, `apple-server-notification`, `check-subscription` and `stripe-webhook` are deployed from accepted Phase 18 source.
- [x] Production read-back confirms six active Apple product mappings including `.pro.yearly.v2`, five expected entitlement columns, zero anon/authenticated write grants and all four deployed functions.
- [x] No purchase, phone build, archive/upload, App Review submission, merge or push occurs.

Actual result: TARGETED_PRODUCTION_ENTITLEMENT_DEPLOYMENT_PASS. Broad `supabase db push` was intentionally not used because local/remote migration history diverges. The two exact migration bodies were applied through the targeted migration API, the four exact lifecycle functions deployed, and production read-back confirms six active Apple products, Pro Yearly V2, client read-only entitlement access and function presence.

## Phase 22 Build 13 platform-plan sandbox gate — pending

- [ ] An authenticated PLUGGD Simulator user completes one Starter Monthly Apple sandbox purchase without a real charge.
- [ ] Production read-back confirms the exact Apple transaction/product/environment and effective Starter entitlement for that same user without altering any other user's entitlement.
- [ ] Restore Purchases returns clear success feedback and preserves the same entitlement idempotently.
- [ ] No phone build, archive/upload, App Review submission, merge or push occurs.

## Phase 19 Build 13 compact Events filters — pending

- [x] When, City and Genre render as three equal compact dropdown fields rather than horizontal chip rails.
- [x] Exactly one accessible dropdown menu opens at a time, identifies the current selection and closes after selection.
- [x] City options derive from every unique non-empty city in the active eligible event collection; no fixed shortlist is introduced. The current 83-event live collection truthfully exposes Berlin, Bristol, Liverpool and London and will automatically add newly populated cities.
- [x] Search/Map/Reset, text/category/date/city/genre filtering, active/result counts, zero-result recovery, Spotlight, Carnival, Map and routes remain unchanged by the bounded implementation.
- [x] Focused Events discovery contract, mobile TypeScript and scoped diff hygiene pass.
- [x] The founder rejected v1 and superseded v2. Exact-current v3 evidence shows evenly spaced uppercase fields, matched thin utility/category pills, no large refine headline, a City-width menu and a visible orange selected first row without a false top gap: `/private/tmp/pluggd-build13-events-filter-v3-closed.png`; `/private/tmp/pluggd-build13-events-filter-v3-city-open.png`.

## Phase 18 Build 13 PLUGGD platform plans — pending

- [x] `user_subscriptions` gains provider-neutral and provider-specific lifecycle fields, preserves one row per user and revokes client insert/update/delete/truncate access.
- [x] Trusted server catalogue maps all six `com.pluggd.mobile.plan.{starter|creator|pro}.{monthly|yearly}` products; receipt and notification handlers route them before creator-membership resolution.
- [x] StoreKit purchase/restore finishes only after verified or durably reconciled platform entitlement; missing products remain honest and no Stripe/web checkout is exposed.
- [x] Apple and Stripe retain independent lifecycle fields; the reconciler selects the highest valid tier, keeps promotional value and maps Stripe by price ID rather than amount.
- [ ] `/plans` renders Free/Starter/Creator/Pro, monthly/yearly, current provider/status/commission, App Store-localized price, Continue on Free, restore/manage, Terms and Privacy in light and dark themes. Dark compact render and selector interaction pass; light/current-device review remains pending.
- [ ] Account exposes `PLUGGD Plans` and distinguishes `Creator memberships`; Creator Studio exposes current plan plus a contextual plan action.
- [x] Focused platform-plan contract, TypeScript and Deno syntax/type checks pass; scoped `git diff --check` remains for the render gate.
- [x] Tier copy is founder-corrected and contract-locked: Creator and Pro contain only supported benefits; `Streaming payout pool`, `Advanced AI studio`, `White-label storefront`, `Sub-accounts` and Pro-only `Content ID protection` are absent. Content protection is treated as platform-wide.
- [ ] Exact-current Simulator renders are founder-approved before one replacement Build 13 phone build.
- [ ] No production migration/function deployment, Apple product creation, archive upload, App Store mutation or submission occurs before the recorded gates.

Current evidence: `/private/tmp/pluggd-build13-plans-final-top.png`; `/private/tmp/pluggd-build13-plans-final-selector.png`; `/private/tmp/pluggd-build13-plans-final-sticky.png`; `/private/tmp/pluggd-build13-plans-corrected-pro.png`. The monthly/yearly control uses two equal full-width segments, the selected cycle updates the tier cards, and a compact copy remains reachable immediately above the bottom chrome while lower plans are scrolled. The current Pro render shows the corrected supported matrix. `npm run verify:platform-plans`, mobile `npx tsc --noEmit` and scoped `git diff --check` pass after the final layout and copy corrections.

## Phase 15 Build 12 commit and physical candidate — blocking gates

- [x] Founder explicitly authorises committing the accepted Build 12 source and installing it on the connected iPhone.
- [x] The staged manifest contains only task-owned source, focused contracts and task records; `pluggd-mobile/.env` and `.playwright-cli/` remain unstaged.
- [x] Cached diff hygiene passes and the accepted candidate is committed with its exact SHA recorded.
- [x] A development-signed Release `iphoneos` build completes from that exact commit without changing product/project/dependency source.
- [x] Artifact bundle identifier, version, build number, embedded bundle provenance and signing are recorded.
- [x] The exact connected iPhone is identified; install, launch and installed-app read-back pass.
- [ ] Founder completes the remaining physical camera/mic, host re-entry, Live delete, Community delete, commerce/navigation and Carnival checks.

Actual result: EXACT_COMMIT_RELEASE_BUILD_PROVENANCE_SIGNATURE_INSTALL_LAUNCH_AND_IDENTITY_PASS; FOUNDER_PHYSICAL_REVIEW_PENDING. Commit `861c675707a6ad628de86b0fc6101c5e5bfe6ba0` produced `/private/tmp/pluggd-ios-build12-simulator/Build/Products/Release-iphoneos/Pluggd.app`, `com.pluggd.mobile` `1.0.0 (12)`, team `37X2468U5U`; embedded bundle SHA-256 `e448cf58b61d7ca71aab3db455eacc409f8383c2c49af3d2fd3c9533875a1780`. CoreDevice installed, launched and read back Build 12 on paired wired Ishola's iPhone, iPhone 15 Pro Max, iOS 26.6.1 (23G83). Push, merge, deployment, archive/upload, App Store Connect mutation and submission remain unauthorised and did not occur.

## Phase 14 Battle Arena visual correction — 2026-08-28

- PASS — Current no-battle Simulator state was captured before editing and confirmed the founder-reported oversized text-first presentation.
- PASS — Exact-current source now renders an image-led Arena hero, compact status/title hierarchy, real refresh action, between-round state and structured enter/match/vote format rail without exposing a fake battle or dummy control.
- PASS — Populated battle routes, real table-backed grouping, entry/vote constraints and detail behaviour remain present; focused battle and Live contracts, TypeScript and scoped diff hygiene pass.
- PASS — Exact-current Simulator evidence `/private/tmp/pluggd-battle-arena-final-v2.png` was visually inspected; no phone build/install or external action occurred.

## Phase 14 original Live feature parity — blocking gates

- [x] `/gamification/battles` reaches a real native Battle Arena rather than Community; `/live/battles` and `/live/battles/[id]` are valid routes.
- [x] Live lobby and Live creation expose one clear Battles/Battle Mode entry without treating it as a normal `session_rooms.live_mode`.
- [x] Arena/list/detail states read only real battle, entry, round, matchup, vote and public profile data with explicit loading, error and empty handling.
- [x] Entry submission authenticates, validates title/audio/timing/eligibility, uploads to `battle-audio`, persists the existing entry contract and attempts to compensate only its own uploaded file if the row write fails.
- [x] Voting authenticates, requires a real active-round matchup entry, respects the existing one-user/one-matchup constraint and reports success/failure without optimistic fabrication.
- [x] General-user battle creation and round advancement remain hidden; no schema/RLS/function or production mutation occurs.
- [x] Files/notes/feedback remain hidden after the exact current schema gate proved they target legacy `sessions`, not active `session_rooms`; ReplayKit screen share remains hidden because no complete implementation exists.
- [x] Focused Live/Battle contracts, `npx tsc --noEmit --pretty false` and scoped `git diff --check` pass.
- [x] Exact-current bundle is installed only into the existing Simulator for founder inspection. No screenshot crawl and no phone build/install occurs.

Actual result: SOURCE_RENDER_AND_EXACT_SIMULATOR_INSTALL_PASS; FOUNDER_SIMULATOR_REVIEW_PENDING. Exact source/installed bundle SHA-256 is `a947b20b5238ece432e20558c53f316899d4de6ba11d087f0caf2641b9b67cc8`. Targeted compact-Simulator inspection confirms the four original Live category cards render as two complete rows, with PLUGGD TV followed by Battle Arena; Live creation preserves its original four room modes before Battle Mode. No backend/production action, entry, vote or phone build occurred.

## Creator Studio upload parity and semantic-theme gate — 2026-08-28

- [x] Release form exposes and persists format, genres, native date, language/label, repeatable featured artists and credits, engineering credits, multiple tracks, media, rights/content and AI disclosure as a private draft.
- [x] Beat form exposes and persists full metadata, tags/moods/instruments, audio/artwork/stems/tagged files, four priced licence choices and exclusive/stems validation as unpublished.
- [x] Mix form exposes and persists the existing owner-schema metadata, tracklist, access/download intent and media as a private draft.
- [x] New Soundboard accepts an optional first audio file/title and attaches the real uploaded item to the newly created owner board with attempt-scoped rollback.
- [x] Video remains an optional addable Studio app with real owner upload/link, draft, publish and profile-feature behaviour; Live exposes working PLUGGD TV backed only by published public catalogue/curated records.
- [x] Upload actions are restrained and every visible action has loading, success and failure feedback.
- [x] Studio light adaptive surfaces contain no fixed white title/body text; explicitly dark media overlays retain white contrast.
- [x] Studio More tiles use native glass without decorative gradient/glow treatment in Night.
- [x] Focused Creator Studio contracts, `npx tsc --noEmit --pretty false` and scoped `git diff --check` pass.
- [ ] Founder reviews the exact-current Simulator flows before any phone build.

## Phase 13 Build 12 Live, Community and Carnival — blocking gates

- [ ] Green Room previews the correct audio/video mode before creation/broadcast and provides complete permission, camera, microphone, level, flip, route and Go Live states without dummy actions.
- [ ] In-session host controls work for microphone, camera, flip, route, Manage and End; advanced controls appear only where completely supported.
- [ ] Server role matrix proves owner always host, approved collaborator publisher, ordinary viewer subscriber and malicious requested-host cannot obtain publisher privilege.
- [ ] Owned active-session UI says Return as host after leaving and never permits owner re-entry as audience.
- [ ] Live removal is owner-only, ends active delivery, excludes the room publicly and retains ticket/purchase/gift/recording/audit rows.
- [ ] Community owner can delete from feed and detail; self Report/Block are absent; non-owner deletion fails; successful deletion invalidates every relevant surface.
- [x] Community internal switcher becomes sticky at the top while Stories/feed content scrolls underneath; every switcher action remains reachable and unobscured in focused Simulator evidence.
- [ ] Carnival content/routes remain unchanged while compact/large normal and Large Text captures show the corrected native heading hierarchy.
- [x] Store presents `Black` and `White` as separate accessible choices; either plus a size enables Add to basket; focused checkout validation accepts only a trusted exact/composite token and reserves the canonical row.
- [x] Removing one normal `featured_event` row advances Event Spotlight to the next eligible admin-curated event after refresh; active Carnival rows are skipped to avoid duplication, no scored fallback restores removed content, and the section hides only when no eligible curated event remains. Exact-current evidence: `/private/tmp/pluggd-build12-events-spotlight-v1.png`.
- [ ] Restored Event Spotlight keeps the selected featured event and working card while its badge returns to the accepted upper-card position.
- [ ] Connect Card light mode uses semantic dark title/body ink on the split and completion panels; dark mode uses solid premium panels with no orange gradient.
- [ ] Connect Card owner avatar has no unexplained tick and `Start setup` remains a clear 44-point working action without a full orange background.
- [ ] Create hub renders below the standard compact PLUGGD header so Home, Live, Search, Notifications and the account/avatar menu remain reachable; all six existing Create actions and the bottom dock remain unchanged.
- [x] Event Map prefers linked venue coordinates, keeps UK events in the UK and excludes ambiguous foreign geocodes from the fitted region; fresh evidence shows 82 events clustered over England with a readable dark preview.
- [x] Normal and Carnival article readers expose an accessible THE PLUG action routing to `/plug` without breaking Back or fallback rendering.
- [x] Live lobby category tiles retain bounded square geometry with zero, one or multiple active rooms and never block the rest of the page.
- [x] Full-player play/pause is visibly contrast-safe in Night mode and still reflects buffering/playing state; the final layout has one labelled Like and a distinct labelled Share action.
- [x] Creator membership feature copy and CTA have deliberate separation, a larger content-driven card and unchanged bottom padding.
- [x] Onboarding date of birth uses a native selector with a human-readable value, no manual format entry and unchanged minimum-age enforcement.
- [x] Live scheduling uses native date and time selectors with human-readable values and no manual format entry.
- [x] Main dock uses clean, enlarged icons with no icon circles or selected dot, and the icon/label row sits optically centred within the full safe-area-aware dock at compact and large iPhone sizes.
- [x] The shared header presents Live as a clear orange broadcast destination rather than a notification dot, while preserving logo, search, notifications, account and 44-point actions.
- [x] Customer-facing Build 12 copy contains no identified provider, stack, runtime, server or internal QA language; technical details remain implementation-only.
- [x] Release detail matches the approved visual hierarchy: full artwork, clean metadata/title, linked artist identity, same-row Listen action, evenly distributed Playlist/Tip/Like/Share/Post actions and producer credit without the former oversized artist box.
- [x] Legacy public WAV duration is derived read-only from media headers when stored duration metadata is absent; the verified `Still ah Link` release displays `2:41` without a production-data mutation.
- [x] Release ownership copy reads `OWN THE DROP`, describes the download/support value clearly and presents `Get it · 79 credits`; the singular Tip action opens the real recipient credit modal.
- [x] Event detail title is source-bound to semantic theme ink in Editorial Light and readable light ink in Night while preserving the orange final-word accent; founder rendered light-mode confirmation remains the current Simulator gate.
- [x] Carnival lifecycle is date-bounded: Events wind-down ends 7 September and returns to the normal board; Home/Discovery promotion expires through existing campaign gates; the direct guide remains an intentional archive.
- [x] Account menu and Settings expose Help & contact; the rendered route visibly names `support@pluggd.fm`, connects a validated in-app message to the existing admin-readable contact channel, and provides real accessible email, Help Centre, Community Guidelines, Privacy and Terms actions.
- [ ] Founder optionally submits one Simulator support message and confirms admin receipt; source/render QA intentionally created no production support record.
- [x] Portrait Listening Room tonearm is fully visible and credibly parked beside the platter when paused/stopped, then swings inward with a visible elbow bend and places the headshell on the outer groove while playing; platter and transport behaviour remain unchanged. Fresh same-viewport evidence: `/private/tmp/pluggd-build12-tonearm-state-v2.png`, `/private/tmp/pluggd-build12-tonearm-playing-v2.png` and `/private/tmp/pluggd-build12-tonearm-comparison-v2.png`; focused design QA passed.
- [x] Settings Appearance v3 renders System, Editorial Light and Night as three equal structural slots with each icon, one-line label, detail and selection mark centred on the same per-column axis. The rejected v2 screenshot is superseded by `/private/tmp/pluggd-build12-appearance-comparison-v3.png`, focused `/private/tmp/pluggd-build12-appearance-focused-comparison-v3.png` and real Editorial Light selection `/private/tmp/pluggd-build12-appearance-v3-light-selected.png`.
- [x] Settings removes the unnecessary decorative headline and uses a compact top row with a 36-point visible/44-point accessible back control plus a legible 13-point `ACCOUNT CONTROL` title mathematically centred across the full content width; `Manage your identity, purchases and privacy.` is centred and one line. Its Appearance selector matches the 90-point compact Stories-rail height and the rail-to-`YOUR PLUGGD` gap matches the compact label-to-rail spacing. All five complete rows clear the dock using 62-point targets only on short compact screens, while tall-phone layouts retain the established 68-point premium rows. The accepted three equal axes, state cues, back behaviour and theme interaction remain intact. Exact-current compact evidence: `/private/tmp/pluggd-build12-settings-final-v10.png`; comparison `/private/tmp/pluggd-build12-settings-final-comparison-v10.png`.
- [x] Listening Room X returns through normal history when present and replaces with `/mixes` when direct entry has no history; direct-entry Simulator interaction visibly closes the room to the populated Mixes page at `/private/tmp/pluggd-build12-listening-room-direct-after-close.png`.
- [x] Compact My PLUGGD presents eyebrow/actions as one balanced top row, followed by one-line `My PLUGGD` and one-line supporting copy using the full content width; header actions and primary tabs remain working.
- [x] For You and Following render as one equal-width accessible tab control, preserve the existing feed-mode query, and visibly change selected state when tapped.
- [x] Post cards hide only default `global_feed`/`user_profile` distribution labels; real linked board, creator-community, release, beat, mix, event and challenge destinations remain visible and actionable.
- [x] Same-state compact before/after My PLUGGD evidence and a Community post-card render pass Product Design QA with no P0/P1/P2 findings.
- [x] Fullscreen Community media follows the supplied top-flow expanded-post hierarchy of author/meta, caption, then media with no large dead gap; captions begin after the header and sit immediately above the visible frame, measure real overflow, collapse to two complete lines with tail ellipsis and accessible `more`, expand in-place through caption or control, bound/scroll long copy, expose `less`, retain gallery dots below the media, and reset collapsed for each newly opened media item without changing zoom/video/gallery/close behaviour. Comparison: `/private/tmp/pluggd-build12-community-viewer-comparison-v3.png`; founder Community sign-off received.
- [x] `/post/[id]` uses the supplied X hierarchy: only the author row reserves the avatar column; caption, destinations, media and actions use the normal full content width beneath it, and a single expanded-post image preserves its source aspect ratio without cropping while feed-card and multi-image presentation remain unchanged. Comparison: `/private/tmp/pluggd-build12-community-expanded-post-comparison-v2.png`.
- [x] Community's compact return rail sits approximately 9 points higher, retains the working back arrow and rule, and hides only its redundant label; non-compact return bars retain their complete labels.
- [x] Community Feed's compact Stories rail and sticky internal navigation use deliberate unclipped clearance; sticky dock, filter rail and timeline share the established horizontal guide, every filter is on-screen, later feed spacing remains, and founder Community sign-off is recorded at `/private/tmp/pluggd-build12-community-spacing-final-v11.png`.
- [x] Focused backend/mobile source checks, scoped TypeScript and diff hygiene pass; no broad aggregate suite is repeated during iteration.
- [ ] Founder completes the physical camera/mic, host re-entry, Live delete, Community delete and Carnival typography check on the installed Build 12 candidate.
- [x] Required Store/Live function deployment occurred only after its focused source/security gate with rollback source retained; no merge, push, archive/upload, App Store mutation or final submission occurred.

Actual result: SOURCE_AND_SIMULATOR_REPAIR_GATE_PASS; FOUNDER_SIMULATOR_APPROVAL_PENDING; DEVICE_BUILD_PAUSED. Clean Build 12 worktree created from `f9dc41942d98bb8673faac455c6d15c3f8a51734`; original dirty workspaces remain preserved. Scoped TypeScript/diff hygiene and focused Deno checks pass; authorised Live/Store functions are deployed; final Simulator evidence covers the repaired Store, Events, Community, My PLUGGD, article, Live lobby, player, membership, Carnival, onboarding, Release and Help/contact surfaces. The My PLUGGD title/support line are one-line, its feed-mode tabs are equal and interactive, and post cards no longer expose default distribution plumbing. The event title follows the active theme, and the Carnival Events takeover returns to the standard board after its 7 September wind-down. Native project/pods are ready, but no Build 12 phone binary has been built or installed and no archive/upload/App Store action has occurred.

## Phase 12F final submission preparation — blocking gates

- [x] Founder authority, exact source, accepted physical candidate, release actions, exclusions and recovery boundary are recorded before any Git/App Store action.
- [x] Every dirty and untracked path is classified and the exact local-commit inclusion/exclusion manifest is reviewed; no secret, derived artifact, output, recording or signing material is staged.
- [x] One local reproducible Build 8 commit is created from only the reviewed accepted source; no merge or push occurs.
- [x] Fresh distribution archive/export validates as `com.pluggd.mobile` version `1.0.0` build `8` with the accepted icon, entitlements, privacy manifest and final embedded bundle.
- [x] Build 8 uploads, processes and is selected for iOS `1.0.0`; Build 7 is no longer the selected review build.
- [ ] Reviewer credentials, exact IAP inventory/navigation, Restore Purchases and account deletion are read back or physically evidenced for the final candidate without making an unauthorised purchase/account mutation.
- [ ] Current App Store Connect privacy and age-rating answers are read back and saved truthfully.
- [ ] A continuous latest-OS physical Build 8 recording and an authorised signed Build 8 rights statement are attached and finish processing.
- [ ] Final App Review Notes and Guideline 2.1 response contain only verified current facts; any legal agreement or final submission confirmation is separately surfaced at action time.
- [x] No merge, push, deployment, production/backend write, purchase, reviewer-account mutation, fabricated signature/evidence or unrelated cleanup occurs.

Actual result: SOURCE_CLASSIFICATION_LOCAL_COMMIT_ARCHIVE_EXPORT_UPLOAD_PROCESSING_BUILD_SELECTION_AND_AGE_RATING_READBACK_PASS; LATER_EVIDENCE_GATES_PENDING. Local release commit `7d5d3ef8bb1a7a7f64d67297bb2fbb1cee4205f2` contains exactly 337 authorised Build 8 source/support paths, with the unrelated root web schema-types change preserved unstaged. Signed archive and 140,177,333-byte IPA validate as `com.pluggd.mobile` `1.0.0` `(8)` with the exact accepted phone bundle hash. Apple processed Build 8 as valid and the exact relationship read-back proves iOS 1.0 now selects Build 8 instead of Build 7. The live age declaration reads back as 17+ and accurately enables social media, messaging and UGC. Full App Privacy labels remain UI-only and unverified while Safari is signed out; the phone is on iOS 26.6 while Apple now publishes 26.6.1; the continuous recording, credentials/IAP/Restore/deletion proof, current rights-cleared screenshots and signed rights statement remain pending.

## Phase 12E replacement connected-phone candidate — blocking gates

- [x] Founder approval, exact worktree/branch/frozen base, dirty-state preservation boundary, target phone and consequential limits are recorded before build.
- [x] Exact current-source development-signed Release build succeeds with the proven command-only Expo entry recovery and no source/project/dependency/signing edit.
- [x] Embedded bundle is non-empty, differs from Phase 12C and its source map contains the accepted complete-circumference `avatarOutline` implementation.
- [x] Artifact reads back as `com.pluggd.mobile` version `1.0.0` build `8`, passes strict signing verification and is provisioned for the exact phone.
- [x] CoreDevice replaces, launches and reads back Build 8 on Ishola’s iPhone.
- [x] Phone mirror confirms the complete top-right avatar circumference on the installed replacement candidate, or the single external blocker is recorded without repeating the build.
- [x] No aggregate rerun, production/backend/account/purchase action, Git integration, archive/upload, App Store Connect mutation or submission occurs.

Actual result: EXACT_SOURCE_RELEASE_BUILD_PROVENANCE_SIGNATURE_PROFILE_INSTALL_LAUNCH_IDENTITY_AND_PHYSICAL_HEADER_PASS. Artifact SHA-256 `f6fa548d1df02f76b107d815e8e7d0fe94b83dc9445b9298c73898fea75d2afe`; physical Store evidence `/private/tmp/pluggd-phase12e-phone-store.jpg`. Remaining Apple-review walkthrough and any archive/upload/submission remain separately gated.

## Phase 12D physical header avatar outline correction — blocking gates

- [x] The shared header retains the approved 36-point centred avatar inside the unchanged 44-point account target, with no translation or header/page-spacing change.
- [x] A header-local semantic orange outline makes the complete circumference visible at top, right, bottom and left in Night, Editorial Light and System-resolved schemes without changing the shared avatar primitive.
- [x] Community, Events and Store inherit the same result from `MobileHeader`; account-menu routing and accessibility remain intact.
- [x] Focused shared-shell/navigation checks, TypeScript, scoped diff hygiene and compact/large rendered comparisons pass.
- [x] No phone rebuild/install, aggregate rerun, production/backend/account mutation, purchase, Git action, deployment, archive/upload or App Store action occurs before founder rendered approval and separate replacement-build authority.

Actual result: SOURCE_AND_RENDERED_GATE_PASS; FOUNDER_VISUAL_APPROVAL_ACCEPTED_AND_PHASE_12E_REPLACEMENT_BUILD_AUTHORISED. Evidence: `/private/tmp/pluggd-phase12d-community-compact-night.png`; `/private/tmp/pluggd-phase12d-community-compact-light.png`; `/private/tmp/pluggd-phase12d-store-compact-light.png`; `/private/tmp/pluggd-phase12d-community-large-night.png`; `/private/tmp/pluggd-phase12d-events-large-night.png`.

## Phase 12C final connected-phone candidate — blocking gates

- [x] Exact integration worktree, branch, frozen starting HEAD and dirty-state preservation boundary are recorded before build.
- [x] Paired target resolves as Ishola’s iPhone, iPhone 15 Pro Max, CoreDevice `2FAD1D76-6CEA-5EC5-BB81-43B0F64BB124`.
- [x] Exact current-source development-signed Release build succeeds without product/dependency/signing edits.
- [x] Artifact contains the embedded Release JavaScript bundle and valid exact-device provisioning/signature.
- [x] CoreDevice installs as an upgrade, launches and reads back `Pluggd | com.pluggd.mobile | 1.0.0 | 8`.
- [ ] Founder performs the latest-OS physical Apple-review walkthrough/recording; physical background audio, permissions, reviewer access and core fan/creator flows remain unclaimed until observed.
- [x] No production/account/purchase action, Git integration, distribution archive, upload, App Store Connect mutation or submission occurs.

Actual result: EXACT_SOURCE_RELEASE_BUILD_SIGNATURE_PROFILE_INSTALL_LAUNCH_AND_IDENTITY_READBACK_PASS. Installed on Ishola’s iPhone, iPhone 15 Pro Max, iOS 26.6 (23G71), as PLUGGD 1.0.0 (8). Physical walkthrough/recording and its behavioural evidence remain founder-owned and pending; submission remains NO-GO.

## Phase 12B Carnival curated Featured plans repair — blocking gates

- [x] Carnival Top Pick remains the first chronological eligible Carnival event.
- [x] Featured plans consumes `featured_event` curation in admin order, filtered to the current eligible Carnival collection.
- [x] Top Pick and duplicate IDs are absent from Featured plans; chronological events fill only remaining slots up to six.
- [x] Full Programme and All Carnival Events retain their existing chronological collections and order.
- [x] A dedicated executable fixture proves curated order, eligibility, deduplication and fallback, including City Splash ID `97409057-97fd-4190-99b8-eef633d58bfa`.
- [x] Existing Events takeover/discovery contracts, TypeScript and scoped diff hygiene pass.
- [x] Founder live-Simulator visual gate is accepted: compact current-source navigation reached City Splash from Featured plans, and the founder explicitly stopped further screenshot driving after seeing the proof. No retained independent large capture is claimed.
- [x] No admin/backend/production mutation, phone build/install, Git action, archive/upload, App Store Connect action or submission occurs.

Actual result: CURATED_FEATURED_PLANS_SOURCE_AND_FOCUSED_CHECKS_PASS; FOUNDER_SIMULATOR_VISUAL_GATE_ACCEPTED; SOURCE_FROZEN. Evidence: `/private/tmp/pluggd-phase12b-carnival-curation/compact-featured-swipe1.png`. No independent retained large screenshot is claimed because the founder explicitly accepted the live proof and stopped further Simulator driving.

## Phase 12 Apple pre-submission audit — blocking gates

- [x] Current official Apple sources are recorded for every guideline applied; third-party summaries are evidence prompts, not rule authority.
- [x] Every Guideline 2.1 rejection item has a current source/config/App Store Connect/physical-proof owner and exact completion state.
- [x] UGC report/block/filter/moderation/support, account deletion, login, privacy/permissions and legal access are classified with exact routes/files and real backend/manual proof boundaries.
- [x] Every money/unlock flow is classified as StoreKit IAP, credits backed by IAP, physical-goods checkout, hosted creator checkout, external reader/access or a release blocker; subscription terms/prices/restoration are checked.
- [x] App Store Connect app/review information, metadata, screenshots, age rating, privacy declarations, IAP reviewability and reviewer credentials are inspected read-only and manual gaps listed without saving.
- [x] Native utility/template/duplicate/developer-conduct risks and visible placeholder/internal/dead-action risks are checked against the exact current binary/source.
- [x] Any safe code/document fix has its own exact allowed-file manifest, focused checks and rollback before editing; accepted product design and business logic are preserved.
- [x] Final App Review Notes, recording flow, tested-device list, access instructions, services, regions, rights and IAP navigation are drafted from verified facts only.
- [ ] Release blockers are retested on the final latest-OS physical candidate after a separately approved rebuild; no GO is declared beforehand.
- [x] No App Store Connect mutation/reply, production data/account action, purchase, phone rebuild/install, Git action, deployment, archive/upload or submission occurs during the read-only audit.

Actual result: TARGETED_AUDIT_AND_BUILD8_DRAFT_PACK_PASS; FINAL_PHYSICAL_AND_SUBMISSION_GATES_PENDING. No confirmed product-code blocker remains. App Store Connect still has unresolved issues with `1.0.0 (7)` selected; Build 8 archive/upload/selection, final physical walkthrough, current screenshots, signed rights statement, reviewer-account read-back, privacy/age read-backs and the final response remain open. Focused mobile source contracts pass; the preserved root Vite dependency gap is recorded as TEST_BLOCKED rather than a product failure. Current verdict is NO-GO for submission, with the separately authorised final connected-phone candidate as the next safe gate.

## Phase 11G2 Listening Room signal and background playback — blocking gates

- [ ] SUPERSEDED/REJECTED: the complete grey segmented replacement was rendered but did not match the accepted current-web meter treatment. Phase 11G3 owns the replacement proof.
- [x] Playing meter activity remains tied to real TrackPlayer playback state and is not described or exposed as decoded stereo amplitude.
- [x] Existing Listening Room audio, progress, deck/transport, waveform, tonearm, save/share, comments and Track ID behaviour remains intact.
- [x] Expo config and checked-in native Info.plist both declare `UIBackgroundModes` with `audio`; TrackPlayer retains the Playback category, interruption handling, lock-screen metadata and registered remote service.
- [x] No AppState/background transition explicitly pauses or resets the queue; Android killed-app policy remains unchanged.
- [x] Focused Mix/product and player/background contracts, TypeScript, configuration/plist readback and scoped diff hygiene pass.
- [x] Compact and large populated Listening Room renders show the restored meters before another phone build.
- [ ] Physical switch-away continuation and lock-screen controls remain unclaimed until a separately approved phone build/install and device test.

Actual result: BACKGROUND_AUDIO_SOURCE_PASS; METER_RENDER_REJECTED_AND_REOPENED_IN_PHASE_11G3; PHYSICAL_BACKGROUND_PLAYBACK_PENDING_NEW_BUILD. Both iOS build authorities declare background audio with the existing TrackPlayer service preserved. No physical switch-away or lock-screen pass is claimed from source alone.

## Phase 11G3 current-web Listening Room VU correction — blocking gates

- [x] Both native L/R modules use the current web's dark horizontal track and continuous green → yellow → red fill; no grey vertical segment treatment remains.
- [x] Paused state presents the web's clearly visible 18% fill; playing state uses the web's 82% left and 68% right targets with independent playback-only pulse.
- [x] Accessibility identifies left/right playback activity without claiming decoded amplitude, and the existing room audio, transport, tonearm, waveform, Save, Share, comments and Track ID paths remain intact.
- [x] Focused product-pages contract, TypeScript and scoped diff hygiene pass.
- [x] Compact and large populated native rooms are rendered and visually inspected in paused and real playing states before any replacement phone build.
- [ ] Physical playing motion remains a later device interaction check; no true PCM/amplitude proof is claimed from TrackPlayer's current JS API.

Actual result: SOURCE_AND_SIMULATOR_RENDERED_GATE_PASS; FOUNDER_VISUAL_APPROVAL_AND_NEW_PHYSICAL_BUILD_PENDING. The native modules now match current web's horizontal colour fill and playback pulse, with compact/large paused and playing proof. No phone-build or physical background-audio claim was made.

## Phase 11G shared header and all-scheme dock correction — blocking gates

- [x] Shared Community, Events and Store headers retain their height/spacing and 44-point account target while the complete 36-point avatar accent ring clears the rounded header boundary.
- [x] The complete public dock icon/label row uses the same five-point optical translation in Editorial Light, Night and System-resolved schemes.
- [x] Dock height, bottom safe-area reservation, 54-point press targets, five routes, selected indicators and mini-player clearance remain unchanged.
- [x] Focused shared-shell, appearance and navigation checks, TypeScript and scoped diff hygiene pass.
- [x] Compact and large Night renders cover the affected shared-header/dock family, and Editorial Light regression evidence confirms the accepted light geometry remains intact.
- [x] No aggregate rerun, phone rebuild/install, Git integration, production mutation, deployment, archive/upload, App Store action or cleanup occurs before founder rendered approval and separate phone-build authority.

Actual result: SOURCE_AND_RENDERED_GATE_PASS; FOUNDER_VISUAL_APPROVAL_PENDING. Community, Events and Store share the corrected avatar, and Night/Editorial Light dock-row alignment is visibly consistent at compact and large sizes. No phone build or consequential action occurred.

## Phase 11F final icon and connected-phone rebuild — blocking gates

- [x] Canonical Expo and native iOS AppIcon inputs use the supplied artwork and are byte-equivalent 1024×1024 opaque PNG files.
- [x] Android adaptive/notification, favicon, splash and in-app branding assets remain unchanged.
- [x] The single deferred aggregate mobile suite, TypeScript, Expo configuration and scoped diff hygiene pass after the icon replacement.
- [x] A development-signed Release build succeeds for the connected paired iPhone, installs and launches without changing production/backend data.
- [x] The installed app exposes the refreshed icon on the phone where device tooling permits direct proof. The canonical and generated store/device icon outputs are proven equivalent; CoreDevice cannot capture the physical home screen, so founder visual review remains pending.
- [x] No archive/upload/App Store submission, production mutation, purchase, Git integration, deployment or cleanup occurs.

Actual result: FINAL_ICON_SOURCE_BUILD_INSTALL_LAUNCH_AND_FOUNDER_ICON_REVIEW_PASS. The accepted 1024×1024 opaque icon is canonical, store/device-generated icon outputs match, all aggregate constituents plus TypeScript and Expo Doctor pass, and development-signed Release `com.pluggd.mobile` `1.0.0 (8)` installed, launched and read back on Ishola's iPhone. The founder confirmed the new icon on the physical home screen. The distribution build passed Xcode store validation but was not archived or submitted. One optional post-launch process query hit the recorded CoreDevice initialisation timeout; the successful launch result remains intact. No production/backend mutation, purchase, Git integration, deployment, cleanup, archive, upload or App Store submission occurred.

## Phase 11E Mapbox and role-correct Live — blocking gates

- [x] The existing public Mapbox value is available to mobile only as `EXPO_PUBLIC_MAPBOX_TOKEN`; no build-only download secret or token value appears in records/chat.
- [x] Expo config reports runtime Mapbox configured and a real current event renders at least one map point without fabricated coordinates or production data mutation.
- [x] Host view contains Manage/Mute but no Report/Block, Gifts, Follow-self or visible Like button; audience view retains real Gifts/Stage where eligible and Safety overflow.
- [x] Tap-on-media sends the existing realtime heart reaction and floating feedback; no duplicate right-rail Like control remains.
- [x] Host/fan interaction controls are lightweight bottom icons beside the comment field with accessible hit areas, not boxed right-rail panels.
- [x] The real creator avatar/name opens an in-app summary sheet with avatar, identity, verification, bio/type, real fan Follow/Following and established profile route.
- [x] Latest persisted/realtime comments render directly over media above the composer; blocked-user filtering, send/error handling and session-ended behaviour remain intact.
- [x] Agora, audio rooms, gifts/credits/idempotency, stage/runtime actions, follow persistence, moderation, auth, Reduce Motion and leave/end semantics pass focused source checks.
- [x] TypeScript, focused Phase 11E contract and scoped diff hygiene pass.
- [x] Compact/large creator and fan screenshots, creator sheet, comment states, tap-like feedback and populated Events Map are opened for inspection before another phone build.
- [x] No aggregate rerun, phone build/install, production/backend mutation, purchase/gift/follow/report, Git integration, deployment, archive/upload or App Store action occurs before founder visual approval.

Actual result: SOURCE_AND_RENDERED_GATE_PASS; FOUNDER_VISUAL_APPROVAL_PENDING. The real Events map renders 93 current events, role-correct Live creator/fan states and creator identity sheet pass compact/large inspection, and all focused checks pass. Product/config edits are frozen. No aggregate rerun or consequential action occurred.

## Phase 11D Creator Studio physical-phone cleanup — blocking gates

- [x] Home KPI/zone and More module cards use neutral established liquid glass in Editorial Light and Night; rejected black/white and orange card gradients are absent.
- [x] Next Up contains no duplicate task ID and retains the truthful highest-priority action first.
- [x] Insights headings, controls, metrics, charts, audience and empty/error/loading copy are legible and theme-aware in Editorial Light and Night.
- [x] Appearance is a compact accessible three-choice selector and the creator account sheet exposes an Appearance shortcut above Settings without adding a dock destination.
- [x] Restore Purchases is absent as a separate account row and remains available inside Purchases & Access with existing commerce authority preserved.
- [x] Account ordering follows the approved creator/work-access/account hierarchy; routes, role conditions and Sign out behaviour remain unchanged.
- [x] Focused checks, TypeScript and scoped diff hygiene pass for the exact manifest.
- [x] Compact and large Editorial Light/Night screenshots cover Home, Insights, More, Settings Appearance and the account sheet and are opened for visual inspection before another phone build.
- [x] No aggregate rerun, phone build/install, production mutation, purchase, Git integration, archive/upload or App Store action occurs before founder visual approval.

Actual result: SOURCE_AND_RENDERED_GATE_PASS; FOUNDER_VISUAL_APPROVAL_PENDING. Neutral liquid glass, Next Up deduplication, theme-aware Insights, compact Appearance, consolidated Restore Purchases and creator-first account ordering pass the focused contracts and compact/large light/dark inspection. Product edits are frozen. No aggregate rerun or consequential action occurred.

## Phase 11C physical visual-parity regression recovery — blocking gates

- [x] Events map follow-up identifies why current Events inventory produces `No mapped events yet`, separating data-coordinate, filtering/transformation and renderer/configuration evidence; no fabricated pin or production mutation is accepted as a fix. Result: 93/93 active public events have location strings, but the current `.env` and Expo process have no `EXPO_PUBLIC_MAPBOX_TOKEN`; the geocoder therefore returns no points before the valid native renderer is reached.
- [x] Bottom-dock follow-up compares compact/large Editorial Light safe-area and item geometry, then proves any narrow vertical-centering correction without changing dock height, routes, accessibility targets, mini-player clearance or approved dark/System behaviour. Result: light-only row translation is 5 points; compact/large light and compact dark regression renders pass.

- [x] Releases matches current web Listening Floor hero/deck/controls/order/cards/type/full-page rhythm; obsolete orange emphasis is absent and credits/listening/detail behaviour is preserved.
- [x] Mixes renders `What's happening` and `Listening rooms`, retains every required lower section and has non-compressed action geometry.
- [x] The opened portrait Listening Room matches the current web turntable/record-deck product and preserves real media progress, transport, waveform/VU state, tracklist, Save, Share, Request ID/Track ID, room pulse/comments and truthful unsupported states; a generic detail stack or landscape-only waveform is not accepted.
- [x] Mixes editorials resolve real artwork through the established resolver and show honest fallback/loading/error/empty states.
- [x] Discover uses the approved PLUGGD DJ banner/copy/action and contains no `Build the next room` substitute.
- [x] Maps and Library are absent from the Discover world grid while Maps remains in Community and Library remains in the user/account menu with working routes.
- [x] Community's five icon/label axes are centred and create reads as one cohesive 3D control at compact, large and accessibility text sizes.
- [x] BeatPlug reproduces the current web-mobile order and scale: audition hero, search/filter, large BeatPlug picks, compact Browse list, four benefits, cream Beat Bench/record presentation, full-width licence stubs, stacked producers, stacked Soundboards and creator close; the rejected tiny artwork grid is absent while data, licences, credits/payment and routes remain unchanged.
- [x] Events contains no iPhone-only Georgia override and uses one approved font system across normal/takeover/Browse/Map/detail without behaviour regression.
- [x] Focused checks assert rendered invocation/absence semantics, not dormant strings; TypeScript and scoped diff hygiene pass.
- [x] Same-size compact/large full-page screenshots cover every named top/middle/bottom/opened state and are opened beside current web-mobile references before the single aggregate suite.
- [x] Founder accepts the complete Simulator comparison set before any replacement physical-phone build.
- [x] No production write, purchase, archive/upload/submission, deployment, Git integration or unrelated dirty-file adoption occurs.

Actual result: VISUAL_AND_AGGREGATE_CONSTITUENT_GATE_PASS; REPLACEMENT_PHONE_BUILD_INSTALL_LAUNCH_PASS; FOUNDER_PHYSICAL_REVIEW_PENDING. The founder approved the complete seven-surface rendered comparison set, including the final Listening Room tonearm correction at compact and large iPhone sizes. The single `npm run verify:mobile` invocation stopped on an obsolete test that contradicted the approved Maps/Library page boundary; it was not rerun. The corrected focused contract, all aggregate commands skipped by that stop, final TypeScript, Expo Doctor 18/18 and scoped diff hygiene pass. After explicit founder approval, exact-worktree Release artifact `com.pluggd.mobile` `1.0.0 (8)` built with Apple Development signing, installed as an upgrade, launched successfully and read back from Ishola's iPhone as version `1.0.0`, build `8`. Physical page rendering and interaction remain unclaimed until founder review. No Git integration, production/backend mutation, purchase, deployment, archive/upload or App Store action occurred.

## Phase 11A final release safety, appearance and creator-directory gate

1. [ ] Accepted Home, Discovery, Profile, Events, Studio, Community-content and player behaviour remains unchanged outside the recorded exact manifests; original rollback dirt and excluded artifacts remain untouched.
2. [ ] iOS release cards/details/profile catalogue show the server-authoritative credit price and `Unlock with credits`; creator GBP/web pricing is absent from normal iOS consumer purchase presentation.
3. [ ] Wallet credit-pack prices are real StoreKit-localized products, missing products fail closed, and no hardcoded/Stripe digital cash price appears as an iOS purchase option.
4. [ ] Production and sandbox Apple fulfilment passes exact bundle, environment, product, app identity and idempotency fixtures without weakening identity checks or allowing credits to expire; client transaction JWS that lacks appAppleId is not treated as complete app proof, and signed notification reconciliation confirms outer appAppleId/bundle/environment before the native processing state resolves.
5. [ ] Modified-client release unlock attempts cannot buy unpublished, reference, rights-blocked or non-deliverable content; public release loading exposes no private download asset and entitled delivery remains signed.
6. [ ] `ios_physical_basket` rejects digital IDs, client prices, invalid product types/status/visibility/moderation/currency/options/quantity/stock and derives physical item price/shipping/order state on the server; atomic reservations cannot oversell and setup failure, expiry, cancellation/refund restore stock idempotently while completion commits it exactly once.
7. [ ] Creator merchandise preserves Stripe Connect seller payout/reservation and aligns public/checkout status, shipping, native return, cancellation, webhook and stock semantics without merging seller baskets.
8. [ ] UK/non-authorised storefronts expose no digital Stripe/web CTA; separately policy-permitted US behaviour and universal physical hosted checkout remain correctly distinguished.
9. [x] Settings exposes accessible `System`, `Editorial Light` and `Night` choices; selection persists, System follows live iOS changes and no saved-light dark flash occurs.
10. [ ] Root background, status bars, shared glass/background/header/dock/player/sheet/modal/loading/error/empty components use resolved semantic tokens and honour Reduce Motion/Transparency.
11. [ ] Home and Community preserve accepted layout/content/interactions in all modes with readable canvas/card/post chrome, intentional media scrims, AA text/UI contrast and 44×44-point targets.
12. [ ] Exact-current runtime proof shows the integrated creator directory, not a stale MusicBrainz/claim stack or older vertical-list bundle.
13. [ ] PLUGGD Creators is the default/first directory mode; creator flags outrank generic artist metadata, Industry remains explicit, ordering/pagination/search/follow/profile routes and deduplication pass exact-count tests.
14. [ ] Directory renders an artwork-led featured rail and compact two-column creator gallery; public cards contain no primary MusicBrainz provenance CTA or unsafe name-based claim state.
15. [ ] Artist/profile linkage resolves only verified claim IDs; no Ola/Ayofe or other production mapping is changed without a separately reviewed exact-target plan and read-back.
16. [ ] Owner appearance control merges `embed_settings.profile_visibility.show_play_counts`; default/true shows public plays, false hides hero and About totals, and private Studio analytics remain available.
17. [x] Focused lane contracts/tests, Deno checks, aggregate mobile verification, TypeScript, Expo Doctor/config, palette contrast checks and clean diff hygiene pass after integration.
18. [x] Compact and large screenshots for Home and Community in System, Editorial Light and Night are saved, opened and inspected; live System light/dark switching passes without restart.
19. [ ] Creator directory plus play-count-visible/hidden profile renders pass compact/large, default/XL/accessibility Dynamic Type, VoiceOver, Reduce Motion/Transparency, increased contrast, safe-area, keyboard, modal and player/dock checks.
20. [ ] Physical-iPhone StoreKit sandbox purchase/recovery/credit unlock/signed download and Stripe test-mode official/creator merchandise purchase/cancel/return/webhook/shipping/stock/reconciliation pass before archive/upload/submission resumes; production/external actions retain their separate approval gates.
21. [ ] Guideline 2.1 completeness passes on the exact Build 8 archive: reviewer account/backend, all attached IAPs, Restore Purchases, account deletion, legal/support URLs, contextual permissions, playback, Community safety, creator access and every visible review-path control are functional with no preview fixture, placeholder, dead action or stale Build 7 evidence.
22. [ ] Guideline 4.3 review passes one-bundle/source/metadata checks and the exact Build 8 screenshots plus review path visibly demonstrate PLUGGD's original integrated creator/fan catalogue, Creator Studio, credits/IAP, Community, Live, Events, editorial and creator-commerce value without template/demo identity or duplicate variants.
23. [ ] The prior eight requested review items are re-read against current App Store Connect state; five consumables, creator subscription/group, reviewer access, rights statement, safety/regional notes, privacy/age answers and all Build 8 attachments are current, processed and selected before the response is sent or Submit for Review is pressed.
24. [ ] Every reachable Build 8 user-facing route passes the appearance manifest: semantic Editorial Light/System/Night chrome or an explicitly approved immersive-media exception, with no accidental dark canvas, invisible text/control/form, dark-only state/modal or status-bar mismatch.
25. [ ] The new App Store Connect social-media age-rating questions are answered truthfully against current Community/Live/UGC behaviour; calculated rating, 16+ override, privacy answers, categories and manual release mode are re-read before resubmission.
26. [ ] Zero-playable playlists expose no enabled Play action; incomplete THE PLUG metadata cannot surface public temporary copy; unfinished generic parity destinations expose no reachable `Coming soon` cards, while complete established routes remain unchanged.
27. [x] At Accessibility Extra Large, the exact compact cold-launch transition keeps the React font-gate `PLUGGD` wordmark on one un-clipped line while preserving readable loading/error copy, progress semantics and the accepted native-splash-to-saved-theme handoff.
28. [x] The first Home Carnival feature uses the accepted web-mobile title, two-part headline, full music-first guide body and `Open the Carnival Hub` CTA, while retaining the existing artwork, campaign lifecycle and working Hub route; compact rendering is visually inspected.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- CURRENT_STATUS=SOURCE_GATE_PASS_RENDERED_GATE_IN_PROGRESS

## Phase 11B native Live Gifts shared-overlay gate

1. [x] Existing commerce-policy, authenticated send, idempotency, server wallet/settlement, fixed-price, wallet refresh and host/self/inactive/unauthenticated guards remain unchanged.
2. [x] Native loads `get_live_room_gift_catalog({ p_room_id })` first, preserves creator order, treats a successful valid empty result according to proven backend semantics and uses the active global catalogue only when the RPC is genuinely unavailable.
3. [x] Initial, send-response and realtime events carry durable ID, `gift_id` and `animation_variant`; catalogue hydration resolves the same correct name/art for the sender and another viewer.
4. [x] One durable server event produces one history item, one polite announcement and one overlay even when send response and realtime both arrive; unknown gift IDs fall back without a crash, invented metadata or second debit.
5. [x] The focused queue is FIFO, owns one active event, caps pending events at 20, advances on completion/bounded timeout and clears on room change, session end and unmount.
6. [x] The native overlay sits above media and below controls, uses `pointerEvents="none"`, never covers/blocks Leave, Share, chat or host actions, exposes sender/`You`, quantity, gift and creator-support meaning, and autoplays no audio.
7. [x] Thumbnail/unsupported-animation failures fall back to text/icon and advance; the existing Reanimated implementation makes no remote-Lottie claim and introduces no new dependency or unverified/watermarked asset.
8. [x] Reduce Motion renders a short static acknowledgement; accessibility announces each durable event once without focus theft or raw UUID primary copy.
9. [x] Focused gift-overlay checks, TypeScript and existing Live, wallet, commerce, route, accessibility and App Store-readiness contracts pass; scoped diff hygiene is clean.
10. [x] Fresh compact and large Simulator evidence covers tray, active/queued/generic/thumbnail-fallback states with readable copy, safe areas, dock/player clearance and unobstructed controls. This is explicitly inert component-render evidence from the recorded temporary harness, which was removed before the final Release rebuild; it does not substitute for item 11.
11. [ ] Authorised two-client proof measures correct realtime propagation, and a physical iPhone proves compositing, memory, room exit and background/foreground recovery before final archive; unavailable external evidence is recorded as blocking rather than fabricated.
12. [x] No production write/payment/catalogue mutation, backend/economy edit, dependency/Pods change, browser repair, phone install, Git integration, deploy, archive/upload or App Store action occurs in the source/Simulator lane.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- ASSET_AND_DEPENDENCY_DECISION=Existing React Native/Reanimated motion plus catalogue thumbnail fallback; no remote Lottie playback claim and no Downloads/recovered animation asset ships.
- DEVICE_CANDIDATE_PARTIAL=PASS. The harness-free Release source produced `com.pluggd.mobile` `1.0.0 (8)`, embedded the exact paired iPhone UDID, installed as an upgrade, read back as Build 8, ran on the phone and passed forced-termination relaunch. This does not satisfy item 11 without the real-room/two-client and physical interaction matrix.
- CURRENT_STATUS=SOURCE_AND_SIMULATOR_GATE_PASS_DEVICE_INSTALL_LAUNCH_PASS_TWO_CLIENT_AND_PHYSICAL_INTERACTION_MATRIX_PENDING

## Phase 11 clean integration, Build 8 and submission gate

1. [ ] A separate clean integration branch/worktree begins at `36618653`, which contains current `origin/main`; the original dirty recovery worktree remains untouched.
2. [ ] The reviewed integration diff contains only the authorised source/support manifest and excludes artifacts, prior output PDFs, temp files, credentials and Supabase CLI residue.
3. [ ] The Android parity follow-up records every material Build 8 addition beyond Build 7 without performing Android implementation or Play work.
4. [ ] The integrated app reports marketing version 1.0.0 / iOS build 8 while Android versioning remains unchanged.
5. [ ] Aggregate mobile contracts, TypeScript, Expo/app-readiness checks and clean diff hygiene pass on the integrated source.
6. [ ] Exact integrated-source compact and large Simulator smoke checks show no regression in Home, Discovery, Community, Events, Creator Profile, Studio, Release upload/AI declaration, player and global navigation.
7. [ ] Any authenticated release-critical checks use only an existing safe session and reversible private state; no public publish, purchase, payout, Live creation or unrelated production mutation occurs.
8. [ ] The Build 8 Release archive succeeds and entitlements, privacy manifests, icons, encryption, bundle provenance, signature and exported IPA validate.
9. [ ] The exact candidate installs/launches on the paired physical iPhone and the recorded release-critical device matrix passes, or the unavailable-device blocker is recorded before upload/submission.
10. [ ] App Store Connect accepts the exact Build 8 upload and the build finishes processing without a blocking validation error.
11. [ ] Review notes, recording, signed rights statement, privacy labels, reviewer access and selected build all match Build 8 before Submit for Review.
12. [ ] `main` is advanced only by the clean reviewed integration; the original recovery worktree remains the rollback source until upload acceptance and founder-confirmed cleanup.

- USER_AUTHORITY=Founder explicitly authorised clean integration, build and submission on 25 August 2026.
- DEVICE_GATE_PARTIAL=Build 8 Release package identity, exact-device profile, upgrade install, installed-version read-back, process observation and cold relaunch pass. Item 9 remains unchecked until the recorded release-critical interaction matrix passes.
- CURRENT_STATUS=RELEASE_DEVICE_INSTALL_LAUNCH_PASS_DEVICE_MATRIX_ARCHIVE_UPLOAD_AND_SUBMISSION_PENDING

## Phase 10O Release-form AI declaration and safe visual-preview gate

1. [x] Existing Details/Media/Rights/Review composition, Release/Beat/Mix switching, local recovery, private draft/auth/processing/rollback/catalogue behaviour and unrelated dirt remain intact.
2. [x] Release Rights copies web `AI use declaration`, its highest-level instruction, all three classification labels/descriptions and semantic radio behaviour exactly.
3. [x] Generated-only contribution, audio-scope, artist-identity, rights and no-impersonation conditions match web; `none`/`assisted` strip stale generated detail; Beat/Mix remain unchanged.
4. [x] The authenticated service rejects a web-incomplete Release AI disclosure and stores the exact versioned `ai_disclosure` keys only inside existing Release `distribution_settings`; no schema/backend expansion occurs.
5. [x] Release Review and final-review sheet expose classification plus relevant generated detail and complete/incomplete truth; old local drafts receive safe defaults.
6. [x] `preview=creator` bypasses the form gate only under `__DEV__`, visibly says `FORM PREVIEW · NO ACCOUNT DATA`, and cannot bypass authenticated service persistence or affect a normal signed-out/production route.
7. [x] Fresh current compact Details, Media, Rights/AI and Review captures are saved and opened; copy, controls, radio/confirmation states, safe areas, keyboard/dock clearance and 44pt targets pass.
8. [x] Creator-upload and Studio final-quality contracts, TypeScript and scoped diff hygiene pass.
9. [x] No media picker, local save, private-draft creation, publish/submit, auth/production/database/storage write, phone, dependency, Git integration, deploy, archive/upload or App Store action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true; USER_CORRECTION_TO_COPY_WEB_RECORDED_BEFORE_PERSISTENCE_EDIT=true
- CURRENT_GAP_EVIDENCE=Current `app/creator/upload.tsx` has no AI declaration; current signed-out menu navigation renders `CreatorAccessGate` with Sign in rather than the form.
- CURRENT_STATUS=SOURCE_COMPACT_RENDERED_PASS_USER_APPROVED_AUTHENTICATED_PERSISTENCE_SEPARATELY_GATED

## Phase 10N Events search/map navigation and Studio preview-truth gate

1. [x] The accepted Events and Studio compositions, data/loaders, auth gates, routes and unrelated dirty files remain unchanged outside the exact manifest.
2. [x] The collapsed first Events control visibly says `Search`, semantically says `Open/Hide event search and filters`, preserves an active-count suffix and is closed by default.
3. [x] Opening reveals the same canonical text search plus category/date/city/genre/group refinements; closing does not clear state and no forced keyboard/focus disrupts entry.
4. [x] Normal and Carnival Map modes expose an immediate 44pt `Back to Events` control above the canvas; it returns to Browse with result/filter/mode state preserved, while lower Browse-all remains available.
5. [x] The real signed-out Studio gate contains no catalogue/audience fixture values; `studio-preview` shows a visible DEV-only `PREVIEW DATA · NOT YOUR ACCOUNT` disclosure and the production loader/auth boundary is unchanged.
6. [x] Focused Events and Studio contracts, TypeScript and scoped diff hygiene pass after the correction.
7. [x] Fresh current compact screenshots for Search closed/open, Map/back, Studio signed-out and Studio preview Home/Apps/My PLUGGD are saved, opened and inspected for wrapping, safe areas, 44pt targets and dock clearance.
8. [x] No production/auth/database/storage write, Save/Create/Publish completion, phone, dependency, Git integration, deployment, archive/upload or App Store action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- BEFORE_EVIDENCE=`/private/tmp/pluggd-events-search-map-studio-audit-20260825/01-events-collapsed-current.jpg`; `02-events-search-filters-open-current.jpg`; `03-events-map-missing-return-current.jpg`; `04-studio-signed-out-current.jpg`
- FINAL_EVIDENCE=`/private/tmp/pluggd-events-search-map-studio-audit-20260825/05-events-search-collapsed-final.jpg`; `06-events-search-open-final.jpg`; `07-events-map-back-final.jpg`; `08-studio-preview-home-labelled-final.jpg`; `09-studio-preview-apps-labelled-final.jpg`; `10-studio-preview-my-pluggd-labelled-final.jpg`; `11-studio-signed-out-final.jpg`
- SOURCE_EVIDENCE=`verify-mobile-events-discovery-contract.mjs`; `verify-mobile-studio-final-quality-contract.mjs`; `npx tsc --noEmit --pretty false`; scoped `git diff --check` all exit 0.
- INTERACTION_EVIDENCE=`Carib Nation` narrowed Map to exactly one event; `Back to Events` restored the exact query and expanded state; Reset then close restored the clean default. Studio preview Home/Apps/My PLUGGD expose the disclosure, while the real signed-out route exposes only Sign in/Create account and no fixture totals.
- CURRENT_STATUS=SOURCE_COMPACT_RENDERED_INTERACTION_PASS_AUTHENTICATED_STUDIO_PERSISTENCE_SEPARATELY_GATED_USER_REVIEW_PENDING

## Phase 10M Creator Studio final-quality gate

1. [x] Known-good Home, My PLUGGD, Connect Card, catalogue, Upload, Video and Soundboard compositions/capabilities remain present; accepted public surfaces and unrelated dirty work are unchanged.
2. [x] Workspace drawer rows render icon, one-line label and chevron horizontally with selected state and working close/backdrop; Studio routes open at their own top rather than inheriting another route's scroll offset.
3. [x] Direct Connect Card edit, Split create/detail and embedded advanced Studio routes show the creator access/sign-in gate before protected loaders when signed out.
4. [x] Home retains every real command/KPI/zone/next action and contains no internal `Recent Studio Rows` or implementation language.
5. [x] Apps filters and module persistence remain real; cards are compact/readable, Add/Manage/Unplug semantics are non-duplicative and reversible, and materially more than one module is visible above the dock on compact.
6. [x] Create and More preserve complete real route coverage, artwork/grouping and native/advanced truth while showing creator outcomes rather than `Adds ... to Studio` copy.
7. [x] Insights preserves 7/30/90 verified metrics, honest zero/partial/error states and catalogue routes; no invented data or retry-only signed-out path exists.
8. [x] My PLUGGD tabs, progress/next move and Profile/Page/Card/Embeds/Settings routes work with readable labels, route-top reset and dock clearance.
9. [x] Connect Card editor identity/service fields, availability, add/remove/save, public/advanced routes and states remain complete; premium rounded geometry and keyboard/safe-area behaviour pass.
10. [x] Catalogue/upload/lyrics retain complete owner inventory and private/moderation/public boundaries; invalid numeric values show a guarded user error, and Upload renders one background layer.
11. [x] Soundboard and Video source/route/state contracts remain pass with unpublished/private defaults, real owner/public separation and no fake content/action.
12. [x] Commerce preserves products/memberships/packs and moderation/StoreKit boundaries while matching premium native geometry; no QA mutation occurs.
13. [x] Financials preserves real credits/activity/payout/Wallet/advanced boundaries while matching premium native geometry; no payout or credit purchase occurs.
14. [x] Split Engine direct access, content selection, collaborator/totals/save/approval/lock/version/document source contracts remain server-authoritative; no split mutation occurs.
15. [x] Embedded browser remains PLUGGD-path allowlisted with one-time session, external-host confirmation, expiry, close/back/refresh and safe return behaviour.
16. [x] Visible forms/actions have labels, correct input/toggle semantics, selected/expanded/disabled/busy states, destructive confirmation, success/error recovery and minimum 44pt targets.
17. [x] Exact-current compact, representative large and Dynamic Type same-frame review covers Home, Apps, Create, More, My PLUGGD, Connect Card, catalogue, signed-out gate and drawer; no actionable P0/P1/P2, overflow, clipping, unsafe-area, keyboard or dock defect remains.
18. [x] TypeScript, all existing focused Studio/upload/catalog/lyrics/Soundboard/Video contracts, final-quality regression contract, route/global-shell checks, scoped diff hygiene and one fresh Simulator build/run pass. Authenticated production-backed rendering is claimed only if a real safe session exists; no phone, production, dependency, Git, deploy, archive/upload or App Store action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- BEFORE_EVIDENCE=`/private/tmp/pluggd-creator-studio-final-audit-20260825/before/`
- WEB_NATIVE_COMPARISONS=`/private/tmp/pluggd-creator-studio-final-audit-20260825/comparisons-final/`
- CURRENT_SOURCE_BASELINE=All twelve focused Studio/upload/catalog/lyrics/Soundboard/Video contracts pass before Phase 10M edits.
- AUTHENTICATED_RENDER_BOUNDARY=Current Simulator is signed out. Production-backed Analytics, owner forms, Commerce, Financials, Split and persistence remain source/contract verified unless the user later supplies a safe authenticated session.
- FINAL_EVIDENCE=`/private/tmp/pluggd-creator-studio-final-audit-20260825/after/`; exact-current compact Home/Apps/Create/More/My PLUGGD/Connect Card/catalogue/access gate/drawer, representative large Home/Apps and accessibility-extra-large Apps/Create/My PLUGGD were opened and inspected.
- SOURCE_EVIDENCE=`./node_modules/.bin/tsc --noEmit`; thirteen focused Studio/upload/catalogue/lyrics/Soundboard/Video contracts; route; global shell/player; `git diff --check`.
- BUILD_EVIDENCE=Fresh XcodeBuildMCP build/install/launch passed on `PLUGGD Large Parity 26.3` and `PLUGGD Compact Parity 26.3` after the final source correction.
- CURRENT_STATUS=SOURCE_BUILD_COMPACT_LARGE_ACCESSIBILITY_SAME_FRAME_RENDERED_PASS_AUTHENTICATED_PERSISTENCE_PENDING_USER_REVIEW_PENDING

## Phase 10L2 Native Events literal mobile-web component-parity gate

1. [x] Normal lifecycle entry matches the accepted warm-black bordered panel, subdued `opacity-38` photographic layer, typography, measure, radius, spacing and action proportions.
2. [x] Normal collapsed discovery controls match the accepted single three-column panel and preserve working expanded search/date/city/genre/category filtering, Map and Reset state.
3. [x] Event Spotlight matches the accepted artwork, overlay, badge, Georgia title/body/meta/CTA geometry and contains no date/artwork duplication.
4. [x] Upcoming uses the accepted portrait artwork-overlay cards with month/day badge, venue/title lower overlay and compact status footer; the shorter separate artwork/body card is absent.
5. [x] The compact list heading reads Event list / Browse events / 12 showing and every row uses a reference-equivalent real artwork slot, one title/date/venue stack and an outlined View action. No date tile occupies artwork, no date repeats and no filled Tickets button changes the accepted row hierarchy.
6. [x] The working View all bridge, Local Scene rail and Event Board appear in the accepted order with matching spacing, heading alignment and card dimensions.
7. [x] Normal and Carnival boards remain two-column 4:3 cards with exact radii/gaps/body/footer rhythm, dates below artwork, accepted SOON placement and working 8+8 paging.
8. [x] Carnival switch, road line and Top Pick reproduce the accepted spacing and 0.96/1.04 copy-art split while preserving chronological Top Pick authority and full accessible content.
9. [x] Featured plans reproduce the accepted asymmetric card measurements and next-card peek; See all plans works.
10. [x] Carnival proceeds directly from Featured plans to category/phase rails. The invented takeover Filters/Map/Reset panel is absent; Map remains available at the accepted programme continuation.
11. [x] Full programme matches accepted category/group rail, heading, day divider, varied artwork shapes, row typography/rules/actions and View all/Map continuation with no date replacing artwork.
12. [x] Normal/Carnival switching, guide, filters, search, Reset, Browse/Map, detail, provider ticket presentation, View all and pagination work with accessible selected/expanded/disabled/busy states and no external mutation.
13. [x] Fresh compact and representative large same-frame comparisons cover every named normal and Carnival state; combined inspection has no actionable P0/P1/P2 and live-data differences are identified separately.
14. [x] TypeScript, takeover/discovery/Carnival/route/global-shell contracts, scoped diff hygiene, fresh Simulator build/run, Dynamic Type, safe-area/dock review and appended superseding design QA all pass. No phone, production, dependency, Git integration, deploy, archive/upload or App Store action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- SOURCE_REFERENCE=`5e79af7160f9437b541b3637af602016b0e0ac95:src/pages/Events.tsx`; `src/pages/events-page.css`; frozen artifacts `08`, `09`, `10`, `11`, `16`.
- BEFORE_EVIDENCE=`/private/tmp/pluggd-events-exact-audit-20260825/before/`
- FINAL_EVIDENCE=`/private/tmp/pluggd-events-exact-audit-20260825/comparisons/`; compact normal/Carnival/list/programme/board/detail/map/Hub states plus large normal/Carnival and Dynamic Type before/fix evidence.
- SOURCE_EVIDENCE=`npx tsc --noEmit --pretty false`; takeover; Events discovery/ticketing; Carnival completion; route; global shell/player contracts; scoped tracked/untracked diff hygiene.
- BUILD_EVIDENCE=Fresh final XcodeBuildMCP build/run passed on `PLUGGD Large Parity 26.3` using isolated DerivedData; exact current bundle remained live on compact.
- CURRENT_STATUS=SOURCE_BUILD_COMPACT_LARGE_ACCESSIBILITY_SAME_FRAME_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10L1 Native Events exact mobile-web visual-parity correction gate

1. [x] Normal phone composition omits the extra native masthead/Browse switch and opens with lifecycle entry (when visible) → Filters/Map/Reset → artwork-backed Event Spotlight, matching accepted web mobile.
2. [x] Search, normal category, date, city and genre controls remain real and canonical inside the expandable Filters panel; collapsed state inserts no category/summary stack before Spotlight.
3. [x] Normal Spotlight matches the accepted single artwork-backed/overlaid editorial surface with Georgia serif title, source description/meta, Open Event and truthful Ticket Link behaviour.
4. [x] Carnival phone composition contains only the compact All Events/Carnival 60 switch plus road line before the split Top Pick; rejected lifecycle headline/body/action masthead and pre-Top-Pick search/utilities are absent.
5. [x] Carnival Top Pick is the first chronological filtered rail event (web-mobile precedence), not the global admin featured-event override; its split measurements, artwork crop, serif/mono hierarchy, description and CTA match the accepted source.
6. [x] Featured plans preserve asymmetric widths/heights, next-card peek, real artwork, serif titles and a working See all plans scroll to the canonical board.
7. [x] Filters/Map/Reset and expandable search/time/city/genre controls follow Featured plans, then category/lifecycle rails; every control retains selected/expanded/disabled/reset truth and the canonical collection.
8. [x] Full programme uses Georgia editorial headings, real-image dividers, varied row-art shapes, mono time/ticket data, 44-point actions and no date/artwork obstruction; boards remain 8+8 and unchanged in data behaviour.
9. [x] Lifecycle/count, canonical loader/filter, Browse/Map parity, detail/ticket/Hub, normal curated spotlight, states/accessibility and frozen non-Events surfaces pass focused source contracts and TypeScript.
10. [x] Fresh current native normal top, Carnival top, Featured/utilities, programme and board captures are normalized with the exact accepted web state in the same comparison frames; all P0/P1/P2 are iterated away.
11. [x] Project-root `design-qa.md` preserves prior reports, records source/current pixels, viewport/density/state, required fidelity surfaces, comparison history and ends the Events report with `final result: passed`.
12. [x] Compact, representative large and Dynamic Type/safe-area/dock checks pass; no production, phone, dependency, Git integration, deployment, archive/upload or App Store action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- SOURCE_REFERENCE=`5e79af7160f9437b541b3637af602016b0e0ac95:src/pages/Events.tsx`; `src/pages/events-page.css`; accepted 390px artifacts in `.ai/tasks/cultural-takeover-web/artifacts/`
- REJECTED_COMPARISONS=`/private/tmp/pluggd-events-takeover-20260824/comparisons/web-vs-native-normal.jpg`; `/private/tmp/pluggd-events-takeover-20260824/comparisons/web-vs-native-carnival.jpg`
- FINAL_EVIDENCE=`/private/tmp/pluggd-events-parity-20260825/web-vs-native-normal-final.png`; `/private/tmp/pluggd-events-parity-20260825/web-vs-native-carnival-final.png`; `/private/tmp/pluggd-events-parity-20260825/web-vs-native-carnival-programme-final.png`; `/private/tmp/pluggd-events-parity-20260825/web-vs-native-normal-board-v2.png`; `/private/tmp/pluggd-events-parity-20260825/web-vs-native-carnival-board-v2.png`
- LARGE_ACCESSIBILITY_EVIDENCE=`/private/tmp/pluggd-events-parity-20260825/native-large-normal-top.png`; `/private/tmp/pluggd-events-parity-20260825/native-large-carnival-top.png`; `/private/tmp/pluggd-events-parity-20260825/native-large-accessibility-normal.png`; `/private/tmp/pluggd-events-parity-20260825/native-large-accessibility-carnival.png`
- SOURCE_EVIDENCE=`npx tsc --noEmit --pretty false`; `verify-mobile-events-takeover-contract.mjs`; `verify-mobile-events-discovery-contract.mjs`; `verify-mobile-carnival-completion-contract.mjs`; `verify-mobile-route-contract.mjs`; `verify-mobile-global-shell-player-contract.mjs`; scoped `git diff --check`.
- BUILD_EVIDENCE=Fresh XcodeBuildMCP build/run on `PLUGGD Large Parity 26.3` passed using isolated DerivedData; exact current bundle also rendered on `PLUGGD Compact Parity 26.3`.
- CURRENT_STATUS=SOURCE_BUILD_COMPACT_LARGE_ACCESSIBILITY_SAME_FRAME_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10L Native Events Cultural Takeover gate

1. [x] Actual native helper passes the accepted web lifecycle boundaries, Europe/London day rollover, entry visibility, membership rejection/acceptance, category and before/live/after fixtures.
2. [x] Normal Events is the default; temporary entry appears only for preview/planning/live/wind-down and disappears before/after while the permanent Carnival Hub route remains unchanged.
3. [x] One canonical post-loader collection drives takeover total, search/date/city/genre, category/group, Browse programme/board, Map points/count, exact detail routes and ticket actions; zero results never substitute unrelated events.
4. [x] Carnival entry exposes lifecycle language, verified total, Open Carnival mode and Complete guide above normal discovery; Carnival mode replaces only the generic masthead and All Events resets campaign/shared filters and restores normal Browse.
5. [x] Campaign header exposes programme and Before the road/Carnival weekend/After the road counts plus All/Free/Sound systems/Mas + J'ouvert/Workshops + talks/Parties/Family, Browse, Map and Complete road guide with accessible selected/expanded/disabled state.
6. [x] Normal compact hierarchy is Filters/Map/Reset → Event Spotlight → Upcoming horizontal rail → 12-row compact list → small Local Scene rail → compact two-column Event Board.
7. [x] Carnival compact hierarchy is split Top Pick → asymmetrical Featured plans rail with next-card peek → category/lifecycle rails → textured day dividers and varied programme rows → complete two-column Carnival Event Board.
8. [x] Both boards start at exactly 8 and add exactly 8 per action; old one-card-per-screen feed is absent. Spotlight, rails, map recommendations and boards have unobstructed artwork with date/time beside or below, never duplicated over imagery.
9. [x] Existing Phase 10D search/filter/ticket/detail/map/loading/error and Opportunities behaviour remains functional; Carnival Hub, Homepage, Discovery, Opportunities, Creator Profile, dock/player/navigation and unrelated dirt are unchanged.
10. [x] Focused Phase 10L and existing Events/product/commerce/route/preservation contracts, native TypeScript and scoped tracked/untracked diff hygiene pass.
11. [x] Same-current-input native counts match the accepted web snapshot: 68 bounded Carnival listings, 21 before, 47 weekend, 0 after; filtered Browse and Map totals remain identical, with any map geocode shortfall reported separately rather than hidden.
12. [x] Fresh compact and large Simulator evidence covers normal, planning entry, Carnival Browse, category/group/zero, Browse/Map, All Events return, event detail/ticket presentation and Hub navigation with no horizontal overflow, clipped copy, unsafe target, Dynamic Type failure or dock/safe-area obstruction.
13. [x] Same-state normalized visual comparisons against the accepted 390px reference have no actionable P0/P1/P2 typography, spacing, colour, image, copy, hierarchy or interaction mismatch; any P3 remains recorded honestly.
14. [x] No production write, location permission request, ticket purchase, RSVP/comment/content/config mutation, phone build/install, dependency change, Git integration, deployment, archive/upload or App Store action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- SOURCE_REFERENCE=`5e79af7160f9437b541b3637af602016b0e0ac95:.ai/tasks/cultural-takeover-web/IOS_HANDOFF.md`
- BEFORE_EVIDENCE=`/private/tmp/pluggd-events-takeover-20260824/before/`
- FINAL_EVIDENCE=`/private/tmp/pluggd-events-takeover-20260824/after-compact/`; `/private/tmp/pluggd-events-takeover-20260824/after-large/`; `/private/tmp/pluggd-events-takeover-20260824/comparisons/`
- SOURCE_EVIDENCE=`npx tsc --noEmit --pretty false`; `verify-mobile-events-takeover-contract.mjs`; `verify-mobile-events-discovery-contract.mjs`; `verify-mobile-carnival-completion-contract.mjs`; `verify-mobile-route-contract.mjs`; `verify-mobile-global-shell-player-contract.mjs`; scoped `git diff --check`.
- DATA_EVIDENCE=Current public snapshot `94` active normal; `66` active Carnival (`19/47/0`); `68` bounded Carnival (`21/47/0`); Browse and Map `66`.
- BUILD_EVIDENCE=Fresh isolated DerivedData log ends `** BUILD SUCCEEDED **`; exact app installed/launched on compact and large Simulators only.
- AUTH_EXTERNAL_BOUNDARY=No purchase, RSVP, content/config persistence, location prompt or authenticated production mutation was exercised; ticket provider presence and detail route were rendered without opening the external purchase flow.
- FINAL_STATUS=SOURCE_DATA_BUILD_COMPACT_LARGE_ACCESSIBILITY_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10K Discovery-destination final polish gate

1. [x] Creators contains no internal implementation language, retains factual counts/search/tabs/filters/follow/profile routes, and exposes useful creator identity/action content sooner at compact and large widths.
2. [x] Canonical identity resolution prefers social_author_profiles, uses public_profiles only for a better missing/system-generated public handle, never invents a handle and suppresses @admin-862d3297 plus @pluggd fallbacks across feed, quote/repost, thread, comment and media states.
3. [x] Live has one honest global empty status; empty category tiles use distinct permanent labels/purpose copy, remain non-tappable, and never imply a scheduled/live/replay source. Its creator shelf also rejects room-category identities and never simulates a Follow action for an unresolvable account.
4. [x] BeatPlug summary and visible licence action use one source-safe availability predicate across available_licenses, license_prices and the existing licensable price contract; checkout remains server-authoritative.
5. [x] BeatPlug hero actions and Store hero/actions fit compact, large and accessibility-width states without clipped text, squeezed targets or headline widows.
6. [x] Back to Discovery has a consistent 44-point rhythm, and every changed destination clears the unchanged mini-player/dock through the shared bottom inset.
7. [x] Focused Phase 10K, Phase 10J aggregate, Community/social, Live, Store, route, player and Home/Discovery/Profile preservation contracts plus TypeScript and scoped diff hygiene pass.
8. [x] Fresh compact and large before/after same-frame comparisons are inspected for top and lower scroll states; direct return, nested detail/back, tabs/filters and reachable empty interactions pass. Network loading/error and authenticated mutation renders have one named blocker: no safe fixture/session gate was authorised, so those states remain source/contract verified and rendered proof is not claimed.
9. [x] Phase 10K edited no Events-owned or frozen product surface; existing Events-owned shared-tree dirt remains separate and unadopted. No production, phone, dependency, Git, deployment, archive/upload or App Store action occurred.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- EVIDENCE=`/private/tmp/pluggd-phase10k-audit-20260824/comparisons/`; `/private/tmp/pluggd-phase10k-audit-20260824/after/`; `/private/tmp/pluggd-phase10k-audit-20260824/after-large/`; `/private/tmp/pluggd-phase10k-audit-20260824/after/00-discovery-handoff.png`.
- CURRENT_STATUS=SOURCE_COMPACT_LARGE_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10J0 destination and identity audit gate

1. [x] Current compact native Community Pulse is captured and its generic identity is traced to the exact loader/normaliser and canonical public-profile authority.
2. [x] Current compact native screenshots are captured and inspected for all twelve in-scope destination entry screens; Events is absent from the edit manifest.
3. [x] Matching current mobile-web phone screenshots are captured and inspected for all twelve destinations, including the exact `src/pages/Mixes.tsx` Listening Room reference. Production Live is recorded as an authenticated boundary, not bypassed rendered proof.
4. [x] Native route/component/data and mobile-web counterpart mappings are complete for Community identity, Mixes, Soundboards, Releases, Live, THE PLUG, BeatPlug, Opportunities, Creators, Community, Store, Maps and Library.
5. [x] Every screen's visual hierarchy, rails/cards, artwork, controls, route/capability, loading/error/empty/auth/accessibility/player/commerce behaviour and preservation constraints are recorded.
6. [x] Shared Back to Discovery behaviour is mapped for direct Discovery entry, nested detail return and non-Discovery deep-link entry without corrupting normal navigation history.
7. [x] The authoritative numbered implementation matrix and exact allowed-file manifest are recorded before product edits; only then may `AUDIT_REQUIRED=false` and `CODE_EDIT_ALLOWED=true`.
8. [x] No product source, Events-owned surface, phone, production, Git, deploy or release state changed during this audit.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- FINAL_STATUS=AUDIT_AND_PRE_EDIT_GATE_PASS_IMPLEMENTATION_AUTHORISED

## Phase 10J implementation and rendered acceptance gate

1. [x] Community Pulse, Community feed, originals/reposts, threads/comments and media viewer render canonical public creator identity from `social_author_profiles` before signed-in fallback; no visible `PLUGGD user` or `User` remains.
2. [x] Mixes retains its accepted hero/finder and exposes real horizontal New & notable, selector, scene, radio and event rails with play/detail/back behaviour.
3. [x] Soundboards preserves real canvas cards, exposes working owner actions when eligible, resolves creator identity and returns to Discovery.
4. [x] Releases preserves the Listening Floor sleeve/deck/search/chart/racks while presenting browseable Fresh Pressings/Pressing Orders/Passes and complete playback/detail/back behaviour.
5. [x] Live preserves truthful live/upcoming/replay/auth semantics, keeps useful category content visible and returns to Discovery.
6. [x] THE PLUG matches the current mobile-web magazine hierarchy and current story/artwork curation while preserving the complete native reader.
7. [x] BeatPlug preserves audition/search/licensing/commerce policy, upgrades picks/producers into artwork-led rails and returns to Discovery.
8. [x] Opportunities presentation is unchanged apart from the shared working return control.
9. [x] Creators has an artwork-led stage, real featured rail and creator gallery with complete search/tab/filter/follow/profile behaviour and no invented creator name.
10. [x] Community keeps rich full image/video/audio/poll/link/thread behaviour, canonical identities, collapsed paused-player clearance and return navigation.
11. [x] Store retains its strong storefront and policy-safe product/basket routes, shows real creator shop identity and returns to Discovery.
12. [x] Maps keeps its live map/list/filter/privacy/create behaviour and integrates a readable, non-overlapping return control.
13. [x] Library uses real saved/owned/ticket/access data in artwork-led shelves, has a deliberate truthful empty state and returns to Discovery.
14. [x] Every in-scope loading/error/empty branch exposes Back to Discovery; Discovery → entry → detail → entry → Discovery and direct entry → Discovery pass without loops.
15. [x] Paused or user-collapsed mini-player never auto-expands over a destination on pathname change; new-track/full-player/play/pause/queue behaviour remains intact.
16. [x] Focused destination/social/player contracts, TypeScript and scoped diff hygiene pass with no Events-owned, production, phone, Git, deploy or release action.
17. [x] Exact-current compact and large Simulator captures are compared against the current 390px web references and pass artwork, wrapping, rails, 44pt controls, safe areas, bottom chrome and interaction review.

- EVIDENCE=`/private/tmp/pluggd-destination-parity-audit-20260824/comparisons/`; `/private/tmp/pluggd-compact-community-final.png`; `/private/tmp/pluggd-large-community-identity-final.png`; `/private/tmp/pluggd-large-*-final.png`; `/private/tmp/pluggd-compact-discovery-review-final.png`.
- EVENTS_EXCLUSION=PASS. Events was not edited or absorbed by Phase 10J.
- PHYSICAL_DEVICE=DEFERRED by user request.
- FINAL_STATUS=SOURCE_COMPACT_LARGE_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10I3 Discovery Soundboard-back artwork regression gate

1. [x] Exact current compact evidence captures blank permanent-navigation artwork after Soundboard Back.
2. [x] Source and runtime markers prove the returned route is the repaired `DiscoveryExperience`, not `LegacyMusicDiscoveryDiscover`.
3. [x] Restarting the exact Metro bundle restores every permanent destination image without a product-code edit.
4. [x] With Metro running, public Soundboard item → real Back returns to repaired Discovery with destination images still present.
5. [x] The final review handoff leaves a truthful runtime state and records that Metro must remain active; no unsupported source fix is added.
6. [x] Focused source/diff checks remain green and no phone, production, Git, deploy or release action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- FINAL_STATUS=RUNTIME_CAUSE_CONFIRMED_NO_SOURCE_REGRESSION_REVIEW_RUNTIME_ACTIVE

## Phase 10I2 Discovery entry hierarchy correction gate

1. [x] Current compact evidence and source prove two feature cards precede the permanent navigation.
2. [x] Carnival/seasonal spotlight is the sole feature above `Every way into the culture`; the current artwork, route and seasonal semantics remain unchanged.
3. [x] `What's Moving Now` remains present, uses the same `what_moving_now` admin placement and route, and renders immediately below the permanent navigation.
4. [x] Ticker, filters, destination artwork/order/routes, card dimensions and all lower Discovery sections remain unchanged.
5. [x] Focused Discovery contracts, TypeScript, scoped diff hygiene and negative temporary-hook search pass.
6. [x] Exact-current-bundle compact before/after visual comparison passes hierarchy, spacing, artwork/copy and bottom-chrome clearance; Metro stops and no phone, production, Git, deploy or release action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- FINAL_STATUS=SOURCE_AND_COMPACT_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10I1 Discovery destination artwork fit correction gate

1. [x] Current compact evidence confirms the generated square art is over-cropped by the existing full-bleed `cover` treatment rather than the files being missing or corrupt.
2. [x] Every half-width permanent destination shows its recognisable central composition without stretch, corner-only magnification, blank/black failure or unreadable overlay copy.
3. [x] Every wide permanent destination uses an intentional fitted composition that preserves copy space and does not leave an accidental-looking empty card.
4. [x] The current Carnival Hub remote artwork, seasonal semantics, feature-card renderer, navigation route and surrounding Discovery hierarchy remain unchanged.
5. [x] Exact-current-bundle compact and large visual comparisons pass every permanent destination; focused Discovery contracts, TypeScript and scoped diff hygiene pass.
6. [x] Metro stops and only the compact review Simulator remains; no phone, production, Git, deploy or release action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- FINAL_STATUS=SOURCE_COMPACT_LARGE_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10I Discovery content-and-capability parity gate

1. [x] Existing authorised Discovery/header/route/data/playback repairs remain intact; only the audit-proven Discovery regressions are removed and unrelated dirty/untracked work is preserved.
2. [x] Carnival is no longer an unconditional permanent tile; scheduled `seasonal_spotlight` wins, the bounded 2026 fallback expires after the event window, and an empty post-season slot hides rather than showing stale campaign copy.
3. [x] Every permanent destination renders its own inspected project-local raster artwork with correct crop, legibility and no blank/black tile on compact or large widths; the DJ/mixes image has white hands within an intentionally diverse set, the current Carnival Hub artwork remains unchanged, and later seasonal features use their own scheduled artwork.
4. [x] `PluggdImage` immediately renders a packaged fallback and still falls back after remote transform/original failure, while no-fallback missing media keeps the neutral surface.
5. [x] `hero_rotation`, `what_moving_now`, `discover_for_you` and `seasonal_spotlight` have separate native semantics and exact routes; empty/unknown placement responses fail soft without unrelated substitution.
6. [x] Scheduled admin ticker rows render near the top, safe promos stay internal, real content resolves exact destinations, organic items fill sparsely and duplicates are removed.
7. [x] Start Somewhere uses the admin opening stage plus its clearly associated continuation rail; More for you uses real signed-in taste/follow/history/favourite/freshness signals with already-played down-ranking and honest scheduled/editorial fallback.
8. [x] Scenes, Genres, Cities and Charts each render their own truthful destination/result mode with real counts; exact scene empties never show unrelated content and the default page no longer duplicates Top 10.
9. [x] Default native hierarchy contains What's Moving, seasonal spotlight when active, permanent worlds, opening, More for you, Opportunities, Live, Trending Scenes, New, Racks, DJ, rich Soundboards, Near You, Creators and Community in the recorded order without cloning web layout.
10. [x] Store products, repeated Library gateway and duplicate bottom Live/BeatPlug/Opportunities cards are gone; Store/Library remain concise world destinations and From the Racks uses older real public releases.
11. [x] Opportunities retains real counts/funding/routes/artwork and Live labels only real live rooms as live, with a truthful current-event fallback.
12. [x] From the Racks, PLUGGD DJ and Soundboards Worth Opening use real routes/data; soundboard cards preview saved public canvas items and no visible control is dummy.
13. [x] Creators to Watch uses canonical public identities and Community Pulse uses current public threads/exact post routes rather than What's Moving strings or duplicated creator catalogue.
14. [x] Data/media safety, loading/errors/empty states, 44pt targets, selected accessibility states, haptics, title wrapping, safe-area and bottom-chrome/player clearance pass; no private/download asset or fabricated metric appears.
15. [x] Web/schema Phase 7C source checks prove the new constraints/admin controls/RPC ordering, but no migration or curation row is applied and current deployed-schema compatibility remains intact.
16. [x] Focused native contracts, TypeScript and scoped diff hygiene pass; exact-current-bundle compact and large Simulator visual/action matrix plus same-width mobile-web content comparison pass, Metro stops and one compact review Simulator remains. No phone, production, Git, deploy or release action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- AUDIT_REQUIRED=false
- CODE_EDIT_ALLOWED=false
- PHYSICAL_DEVICE=DEFERRED by user request.
- CONSEQUENTIAL_ACTIONS=None authorised.
- FINAL_STATUS=SOURCE_COMPACT_LARGE_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10H4 Creator Profile compact tab-spacing correction gate

- [x] Compact Ola visually matches the accepted reference's contained Listen pill, full outlined Follow pill and separate circular More control; the action row fills the safe content width without intrinsic collapse.
- [x] Compact Ola renders Overview, Music 8, Community and More as four proportionally distributed, visibly separated controls with no touching, overlap, clipping or wrap.
- [x] More and its chevron remain one aligned control and the selected underline remains bounded to its owning tab.
- [x] Stable IDs, 44pt-plus targets, selected/expanded states, haptics, tab changes and overflow-menu actions remain intact.
- [x] Focused Creator Profile contract, native TypeScript and scoped Phase 10H4 diff hygiene pass.
- [x] Exact-current-bundle compact and large rendered comparison against `/Users/apple/Desktop/Codex Image 24 Aug 2026, 12_12_20.jpg` passes hero-action proportions, tab spacing and bottom-chrome clearance; Ola Overview, Music and More tap evidence passes. Metro stops and no mutating, phone, production, Git or release action occurs.

- FINAL_STATUS=SOURCE_COMPACT_LARGE_RENDERED_PASS_USER_REVIEW_PENDING

## Phase 10H3 Creator Profile interaction parity gate

- [x] Accepted Creator Profile presentation, data journeys, private-media safety and unrelated dirty work remain preserved.
- [x] Native safely normalises published imagery, density, typography and motion enums while missing/malformed values fall back deliberately.
- [x] Minimal, Subtle and Signature map to distinct native behaviour; Signature adds scroll-linked cover depth without layout animation or duplicate looping.
- [x] System Reduce Motion disables non-essential hero, entrance, tab/content and sheet motion while retaining content and interaction semantics.
- [x] Tabs/menus use selection haptics, primary actions use restrained impact feedback and Follow/Unfollow success occurs only after confirmed persistence; passive/disabled/scroll states do not vibrate.
- [x] Tabs, active content and action sheet animate only transform/opacity with accessible selected/expanded/busy states and 44pt-plus targets.
- [x] Focused Creator Profile contract, native TypeScript and scoped Phase 10H3 diff hygiene pass.
- [x] Exact current bundle renders Ola Kingdom on `PLUGGD Compact Parity 26.3`; tab changes and both action-sheet open/close paths pass non-mutating visual/accessibility inspection. Existing published Signature creator `@awaboyz` supplies entrance/tab-motion evidence. The Simulator accessibility driver could not move the React Native scroll view, so direct automated scroll-parallax observation is explicitly unclaimed.
- [x] Metro is stopped and no creator config publish, production mutation, phone build/install, staging, commit, push, deployment, archive/upload or App Store action occurs.

- FINAL_STATUS=SOURCE_AND_COMPACT_INTERACTION_PASS_USER_REVIEW_PENDING; physical haptic feel and a direct automated parallax gesture remain unclaimed.

## Phase 10H2 creator-owned Creator Pick and fan-action gate

- [x] Accepted Creator Profile behaviour and unrelated dirty work remain preserved.
- [x] My PLUGGD Page exposes an exact Creator Pick selector using only eligible creator-owned public releases, beats and soundboards; automatic/type rules remain available.
- [x] Published configuration preserves a bounded optional exact ID without a migration or platform-wide/admin feature mutation.
- [x] Public web resolves only a matching public item from the current creator's loaded catalogue and safely falls back for missing/mismatched IDs.
- [x] Native preserves and resolves the same exact setting, including first Listen queue alignment, without exposing private/draft/foreign content.
- [x] Native avatar is circular with the creator accent ring and intact identity layout.
- [x] Native Overview renders adjacent Join Community and Support creator cards with canonical routes and existing support authentication/Tip behaviour; Community tab remains usable.
- [x] Focused web configuration/builder tests, web and mobile TypeScript, focused native contract, scoped diff hygiene and exact compact-Simulator Ola render pass; no production, phone, Git, deploy or release action occurs.

Phase 10H2 final status: `SOURCE_AND_COMPACT_RENDER_PASS_USER_REVIEW_PENDING`; no Ola exact-ID publication, authenticated creator-builder render, production deployment or phone build occurred.

## Phase 10H1 Ola creator-brand and hero-rhythm gate

- [x] Accepted catalogue/playback/tabs/Community/Connect/security behaviour and unrelated dirty work remain untouched.
- [x] Native resolves the public creator accent with web-parity precedence; Ola renders `#EC4899` rather than the PLUGGD orange fallback.
- [x] Published Featured module preference and web automatic format priority survive in native; Ola's Creator Pick is the real featured `EKO` beat.
- [x] Ola's real bio/byline and real identity chips create visible information and spacing between identity and actions.
- [x] Listen, Follow/Manage and More remain working 44pt-plus controls; the primary action is a restrained creator-accent pill rather than the oversized rectangular block.
- [x] Avatar ring, primary action and selected emphasis use the creator accent with readable contrast; no draft configuration appears.
- [x] Focused Creator Profile contract, TypeScript, scoped diff hygiene and exact compact-Simulator Ola render pass; Metro stops and no phone, production, Git or release action occurs.

Final status: `VERIFIED` on `PLUGGD Compact Parity 26.3`; user visual acceptance remains the next handoff.

## Phase 10H world-class Creator Profile gate

1. [x] Current Phase 10G creator-profile changes are classified as authorised/useful, unrelated dirty work is preserved and the complete 18-item Phase 10H plan exists before product edits.
2. [x] NINE X and Kxngdom render real creator-controlled cover fallbacks, identity, location/type and verified state without invented branding.
3. [x] Hero/action hierarchy exposes only working Listen, Follow/Manage and contextual fan conversion, with Support, Message/Book, Share and links in a deliberate accessible secondary surface.
4. [x] Overview presents one coherent creator story across Creator Pick, listening/latest catalogue, membership/exclusives, Visual Channel, Community and relevant commerce/live signals while omitting absent modules.
5. [x] Music exposes compact creator catalogue browsing/search, Play all, active queue state, direct playback/detail and shared mini/full player continuity.
6. [x] Creator Pick and catalogue items show truthful format, artist, genre, explicit/member state, description and policy-safe price/detail/ownership context.
7. [x] NINE X receives both release-linked visuals shown on web in addition to published `creator_videos`; all video cards dedupe and open canonical native destinations, and release `download_url` can never become a public video source.
8. [x] Kxngdom membership shows real price cadence, member count, benefits, current-member/availability copy and exact existing membership route without joining or purchasing.
9. [x] Exclusive/unreleased presentation appears only for real entitled catalogue fields, exposes only authorised metadata/preview and routes locked access to Membership.
10. [x] Eligible creators expose the existing credits Support sheet with signed-out authentication handling; modal open/close is verified and no tip is submitted.
11. [x] Message/Book appears only when an enabled public Connect Card resolves through its canonical user identity; it opens the server-returned public/business slug, absent/private/token cards render no dead action and no enquiry is sent.
12. [x] Store, beat licence, release ownership, membership and tip journeys remain distinct, policy-safe and routed through existing detail/commerce authorities; no purchase occurs.
13. [x] Community identity, purpose, truthful member/content semantics and canonical route are clear from profile; return navigation works and no catalogue duplication is introduced.
14. [x] About exposes safe real social/website/press links, location, genres, since date and non-zero public follower/catalogue/play/achievement/latest-work proof without private data.
15. [x] Owners receive real destinations for edit profile, catalogue/uploads, videos, memberships/store, Connect Card and public preview; no Studio tool is duplicated on the public page.
16. [x] Contextual tabs retain the repaired interaction/deep-link behaviour and add an understandable overflow affordance on compact/large profiles without zero-count destinations.
17. [x] New sheets, search, links, content and controls pass 44pt targets, selected/busy/expanded accessibility states, safe URLs, safe areas, title/artwork integrity, bottom chrome/player clearance, targeted errors, TypeScript, focused contracts and scoped diff hygiene.
18. [x] Exact-current-bundle NINE X/Kxngdom compact/large matrix plus the targeted Ola Kingdom compact security/data/route matrix passes; Metro stops and one named Simulator review state remains without phone, production, Git or App Store actions.

### Phase 10H Ola Kingdom security and canonical Connect correction

- [x] Current source and diff prove the auto-review-denied `download_url` video-source attempt did not land; the release-video conversion uses only public YouTube or video-shaped preview URLs and has a dedicated negative regression assertion.
- [x] Read-only production data resolves Ola Kingdom to eight live public releases, one published beat (`EKO`), disabled business Connect and enabled non-token public Connect at canonical slug `ola-kingdom`.
- [x] Ola's eight releases all carry download assets but none qualifies as a video; the exact current Simulator therefore exposes Music 8 and no Videos destination.
- [x] Canonical user-ID Connect lookup precedes legacy slug fallback, uses only the sanitized RPC payload, rejects private/token/disabled views and exposes no contact field through the profile bundle.
- [x] Compact Simulator verifies all eight release titles, exact release navigation/return, Beats → EKO → exact beat detail/return, profile actions → Connect → `@ola-kingdom` public card/return, and final Ola Overview state without a mutation.
- [x] Creator Profile, route and Studio identity/Connect Card contracts, TypeScript and scoped diff hygiene pass; Metro is stopped and port 8081 is free.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- DESIGN_SELECTION=REFINED_DISPLAYED_OPTION_2
- SELECTED_REFERENCE=`/Users/apple/.codex/generated_images/01a02bf6-4161-73b2-8004-9fca59c022a7/exec-6b83428e-396d-4efb-a125-f6df00a83fad.png`; structure/hierarchy only, with live database content authoritative.
- CODE_EDIT_ALLOWED=true
- PHYSICAL_DEVICE=DEFERRED by user request.
- CONSEQUENTIAL_ACTIONS=None authorised.
- FINAL_STATUS=READY_FOR_USER_REVIEW

### Phase 10H evidence

- `LIVE_DATA=PASS`: NINE X 5 releases / 47 plays / 2 release-linked videos / public Connect / YouTube / Instagram; Kxngdom 2 releases / 17 plays / 6 beats / 1-member US$2.99 monthly tier / absent Connect; Ola Kingdom 8 releases / 64 plays / 1 beat / canonical public Connect / no valid video source.
- `INTERACTION=PASS`: Music search, Creator Pick/detail, Videos/detail, Community/return, membership/detail, Beats/detail, About links, public Connect, signed-out Support, More/action sheets and external YouTube navigation.
- `PLAYBACK=PASS`: shared player advanced from 0:25 to 0:33 on CODE EP before pause; `/private/tmp/pluggd-player-progress-comparison.png`.
- `DESIGN_QA=PASS`: `/private/tmp/pluggd-creator-final-comparison-v2.png`; `pluggd-mobile/design-qa.md` final result `passed`.
- `SOURCE=PASS`: `npx tsc --noEmit --pretty false`; Creator Profile, route, Studio identity/Connect Card, commerce, player, video catalogue, Homepage/profile-Community boundary and product-page contracts; scoped `git diff --check`.
- `AUTH_LIMIT`: no authorised creator-owner session was available; owner destinations are source/route verified only. No follow, join, tip, message, book, subscription or purchase mutation occurred.
- `HANDOFF=PASS`: Metro stopped; the large QA Simulator remains shut down; only `PLUGGD Compact Parity 26.3` remains booted on Ola Kingdom Overview. Final state: `/private/tmp/pluggd-ola-kingdom-review-state.png`.

## Phase 10G canonical Creator Profile gate

### User-reopened tab interaction correction

- [x] Compact NINE X reproduction proves visible profile tabs are absent from interactive Simulator accessibility targets.
- [x] Source diagnosis proves persistent `requestedTab` synchronization can overwrite a user-selected valid tab.
- [x] Every visible tab is an inspectable, selected, minimum-44pt interactive control with a stable native identifier.
- [x] A deep-linked tab is applied once when available and subsequent user selections remain selected.
- [x] NINE X Overview, Music, Community and About each change both selection and body content on compact and large Simulators.
- [x] Kxngdom Overview, Music, Community, Membership, Beats and About each change both selection and body content on compact and large Simulators.
- [x] Focused contract, TypeScript, diff hygiene and exact-bundle Simulator evidence pass without mutating follow/join/purchase/production state.
- TAB_REPAIR_EVIDENCE=`/private/tmp/pluggd-phase10g-tab-repair/01-nine-x-compact-music.jpg`; `/private/tmp/pluggd-phase10g-tab-repair/02-nine-x-compact-community.jpg`; `/private/tmp/pluggd-phase10g-tab-repair/03-nine-x-compact-overview.jpg`; `/private/tmp/pluggd-phase10g-tab-repair/04-kxngdom-compact-membership.jpg`; `/private/tmp/pluggd-phase10g-tab-repair/05-kxngdom-large-membership.jpg`; `/private/tmp/pluggd-phase10g-tab-repair/06-nine-x-compact-review-ready.jpg`.
- REOPENED_STATUS=SOURCE_AND_COMPACT_LARGE_TAB_MATRIX_PASS_USER_REVIEW_PENDING

1. [x] Canonical private/public profile resolution, handle casing, user/profile identity and safe back behavior pass.
2. [x] NINE X receives exactly its five approved/live/public PLUGGD releases with correct artwork, ordering and no invalid-column empty fallback.
3. [x] Mixes use `owner_user_id` plus published/public visibility; all other catalogue/event/live loaders are creator-owned, public-only and contain no global fallback.
4. [x] Published creator-owned uploaded/YouTube videos load from `creator_videos` and open a real playable/detail destination, never Search.
5. [x] Public RPC configuration safely controls native module visibility/order/accent with a deliberate fallback when absent or malformed.
6. [x] Hero exposes only working availability-driven Listen, Follow, Join Community, Membership/Support, Share and owner Manage actions.
7. [x] Published accessible creator accent/module emphasis appears inside the accepted native PLUGGD visual language without draft or invented branding.
8. [x] Overview is fan-first, prioritises real featured/latest/music/membership/Community/current activity, and omits absent optional modules instead of stacking empty rails.
9. [x] Release/mix/beat/supported preview playback, queue start, progress/mini-player and exact detail/back navigation pass without a production write.
10. [x] Kxngdom exposes `VIP supporters` as a dedicated Membership destination with real benefits and exact StoreKit membership route; no subscription or purchase occurs.
11. [x] Exclusive/unreleased labels are backed by real fields, locked access routes to Membership and no private/download asset is exposed to an unauthorised viewer.
12. [x] Primary Community is visible from hero/Overview/contextual tab and opens the canonical Community without recreating its catalogue.
13. [x] Available Beats, Soundboards, Gallery, Videos, Store/Support, Shows, Live and About modules have truthful counts/metadata/artwork/destinations.
14. [x] Overview/About remain reachable; all other tabs are contextual, respect published visibility and deep links, and show no zero-count destination rail.
15. [x] Owner Manage routes to Studio/My PLUGGD while fan actions remain public; owner and fan paths are never substituted for each other. Source-contract verified; authenticated creator mutation QA remains separate.
16. [x] Critical profile load failure renders a targeted retry/error notice; optional module absence remains non-fatal and honest.
17. [x] Compact/large Simulator visual and accessibility review passes full artwork, title wrapping, tap targets, labels/states, safe areas, section rhythm and bottom chrome/player clearance.
18. [x] Focused Creator Profile contract, TypeScript and scoped diff hygiene pass; NINE X/Kxngdom compact/large evidence is captured, Metro is stopped, dirty work is preserved and no consequential action occurs.

- PLAN_RECORDED_BEFORE_PRODUCT_EDITS=true
- AUDIT_REQUIRED=false
- CODE_EDIT_ALLOWED=false
- PHYSICAL_DEVICE=DEFERRED by user request.
- CONSEQUENTIAL_ACTIONS=None authorised.
- EVIDENCE=`/private/tmp/pluggd-phase10g-profile-audit/13-native-nine-x-compact-top.png`; `/private/tmp/pluggd-phase10g-profile-audit/14-native-nine-x-large-top.png`; `/private/tmp/pluggd-phase10g-profile-audit/18-native-kxngdom-large-membership.png`; `/private/tmp/pluggd-phase10g-profile-audit/19-native-nine-x-compact-music-final.jpg`; `/private/tmp/pluggd-phase10g-profile-audit/20-native-nine-x-compact-five-releases-final.jpg`; `/private/tmp/pluggd-phase10g-profile-audit/22-native-kxngdom-compact-membership-final.jpg`; `/private/tmp/pluggd-phase10g-profile-audit/25-native-code-ep-playing-progress-a.jpg`; `/private/tmp/pluggd-phase10g-profile-audit/26-native-code-ep-playing-progress-b.jpg`.
- OWNER_AUTH_RENDER=Source-contract pass; signed-out Simulator pass did not exercise creator authentication or perform mutations.
- LEGACY_GAP_CHECK=`verify-mobile-gap-wiring-contract.mjs` has a stale retired-tab assertion; current dedicated Community/boundary contracts pass.
- FINAL_STATUS=SOURCE_AND_COMPACT_LARGE_RENDER_PASS_USER_SIMULATOR_REVIEW_PENDING

## Phase 10F Homepage and profile/community boundary gate

1. [x] Accepted native Homepage, Opportunities and Creator Profile designs remain intact; no Creator Profile or Discovery source is changed.
2. [x] Homepage Opportunities cards are narrower, bounded, readable at two title lines and preserve artwork, metadata and exact routes.
3. [x] Creator-owned communities resolve identity from a canonical public creator profile rather than treating community slug as creator username.
4. [x] Next Wave creator/community entries open the canonical Creator Profile, deduplicate creator destinations and contain no unconditional `ROOM OPEN` claim.
5. [x] Community detail contains no global feed-bundle catalogue; optional preview content is public, bounded and explicitly linked by `community_id`.
6. [x] Drops and Soundboards catalogue tabs are absent; at most one compact latest-content preview links to Creator Profile Music.
7. [x] Community posts and threads share one Community surface while rich image/video/audio/poll/link/thread behavior remains preserved.
8. [x] Live contains only genuine linked session/event states and real destinations; no fabricated live dot, fake Join action or self-loop route remains.
9. [x] Collaboration rooms/challenges are truthfully presented as Collabs and expose no dead action.
10. [x] Compact community identity includes membership and `View creator profile` actions without duplicating the full Creator Profile landing page.
11. [x] Loading, retry, empty, access and join/leave states remain deliberate; scoped diff confirms unrelated dirty work was preserved.
12. [x] Focused contracts, TypeScript, diff hygiene and compact/large exact-bundle Simulator checks pass; runtime is cleaned up and work stops for user review.
- PHYSICAL_DEVICE=DEFERRED by user request.
- CONSEQUENTIAL_ACTIONS=None authorised.
- EVIDENCE=`/private/tmp/pluggd-phase10f-compact-home-final.png`; `/private/tmp/pluggd-phase10f-compact-next-wave-profile.png`; `/private/tmp/pluggd-phase10f-compact-community.png`; `/private/tmp/pluggd-phase10f-large-home-final.png`; `/private/tmp/pluggd-phase10f-large-community.png`.
- CREATOR_PROFILE_FOLLOW_UP=NINE X canonical routing passes, but rendered `0 CATALOG`/empty Music conflicts with five public releases available to the Community data path; separate profile audit required.
- FINAL_STATUS=SOURCE_AND_COMPACT_LARGE_RENDER_PASS_USER_SIMULATOR_REVIEW_PENDING

## Phase 10E Homepage Moving Now order gate

- [x] Featured remains the original first music module.
- [x] Four Worth Your Time renders before the separate Moving Now module.
- [x] Moving Now retains its existing curation/fallback, artwork, design, playback and exact destination behavior.
- [x] Carnival and all unrelated Homepage modules retain their existing order and implementation.
- [x] Focused Homepage, destination and Carnival contracts plus TypeScript and scoped diff hygiene pass.
- [x] Exact updated JavaScript bundle renders on the compact iOS Simulator with Four Worth cards before Moving Now.
- [x] Metro is stopped; no phone install, production mutation, deployment, Git integration, archive/upload or App Store action occurred.
- [ ] User visual acceptance of the reordered Homepage Simulator state.
- EVIDENCE=`/private/tmp/pluggd-home-four-before-moving-context.png`; `/private/tmp/pluggd-home-four-before-moving.png`.
- FINAL_STATUS=SOURCE_AND_COMPACT_RENDER_PASS_USER_SIMULATOR_REVIEW_PENDING

## Phase 10D Events discovery and ticketing gate

- [x] Complete active public event select includes real city, lineup, genre, event tags, slug and venue identity without losing current pagination/artwork/ticket fields.
- [x] Events-owned search matches real title, description, lineup, venue/location, city, genre and tags.
- [x] Filters control expands/collapses and date, city and genre controls combine correctly with categories and search.
- [x] Active-filter count, exact result count, reset and honest zero-result recovery render and work.
- [x] Safe HTTPS organiser ticket URLs appear for physical and legacy-unclassified real-world events with no stream/playback access.
- [x] Virtual/hybrid stream access, invalid/local/credential URLs and paid digital access cannot use the external-ticket path; localhost/local/internal suffixes and private/link-local/reserved IP literals are rejected.
- [x] Spotlight and event cards expose provider-labelled ticket actions plus separate exact detail navigation.
- [x] Event detail exposes polished artwork, back/share, status/date/location/lineup/genre and a prominent provider-labelled ticket journey.
- [x] Existing hosted ticket tiers, policy checks, Wallet, RSVP/reminders, promoter, stories, attendance, live, community and comments remain intact.
- [x] Loading, retry/not-found, ticket busy/error and no-result states are deliberate and contain no fake data.
- [x] Focused Events/product/commerce/route/gap contracts, TypeScript and scoped diff hygiene pass.
- [x] Exact-current-source Simulator build and compact/large rendered interaction matrix pass.
- [x] No purchase, RSVP/comment/content/config mutation, deployment, phone build/install, Git integration, archive/upload or App Store action occurs. The tested ticket click attempted the existing asynchronous `analytics_events` click insert; success is unverified because analytics errors are intentionally swallowed.
- EVIDENCE=`/private/tmp/pluggd-events-compact-filter.png`; `/private/tmp/pluggd-events-compact-detail.png`; `/private/tmp/pluggd-events-large-top.png`; `/private/tmp/pluggd-events-large-detail.png`.
- FINAL_STATUS=SOURCE_BUILD_COMPACT_AND_LARGE_RENDER_PASS_USER_SIMULATOR_REVIEW_PENDING

## Phase 10C user-reopened Homepage/Carnival gate

- [x] Existing accepted native Homepage design is preserved.
- [x] Original Featured release is restored at the top and Moving now is an additional, separately curated module.
- [x] D’YANI and other THE PLUG cards can resolve artwork embedded in current web/article payloads.
- [x] Soundboard cards retain readable width/title geometry and the complete card opens the real board.
- [x] Happening Now rejects ended and unrelated future events, requires real artwork, and accepts only current event/live-room states.
- [x] Carnival live values override by slug while missing web-published stories are preserved; rendered count is seven story cards after the lead guide.
- [x] Carnival compact/large rails use mobile-web 82vw geometry, full artwork and untruncated wrapping titles.
- [x] Carnival local back/share actions remain exposed; the compact hero stays on two lines; the first story opens its complete native reader.
- [x] Five focused contracts, TypeScript, scoped tracked diff hygiene and untracked whitespace checks pass after the final source change.
- [x] Exact-current-source Debug Simulator build passes and renders on compact and large iOS 26.3 Simulators.
- [x] No physical-phone build/install, production mutation/deploy, purchase, Git integration, archive/upload or App Store action occurred.
- [ ] User visual acceptance of this exact Homepage/Carnival Simulator state.
- FINAL_STATUS=SOURCE_BUILD_COMPACT_AND_LARGE_RENDER_PASS_USER_SIMULATOR_REVIEW_PENDING

## Phase 10B authoritative 24-item gate

Older Phase 10A source passes below are historical evidence only. They do not close this reopened rendered/product gate.

1. [x] Parity boundary is honoured: Home/Discover/Opportunities preserve approved native design while matching content/capability; explicitly designated linked screens receive same-width web visual/product comparison.
2. [x] Dirty-work regressions are repaired without broad reversion, content deletion or unrelated-file adoption.
3. [x] The full numbered implementation contract and verification matrix exist before Phase 10B product edits.
4. [x] Featured Release passes artwork, detail, play/pause, track switch, mini/full player and back-navigation rendered checks.
5. [x] Carnival Hub passes current web hierarchy/content, real-data, route and interaction checks.
6. [x] Four Worth passes playback/artwork and options-only deliberate Close player checks.
7. [x] Scenes pass canonical data, visible typed selection, filtered results, zero-result and retry checks.
8. [x] Mixes in Rotation passes playback, exact detail route, artwork and state regression checks.
9. [x] New Releases and Releases/Listening Floor pass card playback plus editorial deck, search/filter, Fresh Pressings, charts/editorial/racks, multi-track, waveform and lyrics checks.
10. [x] THE PLUG passes in-app index, complete HTML/metadata reader, back/share/save and true-external-link checks.
11. [ ] Opportunities preserve the accepted native design and pass deterministic artwork, bounded cards, filters, list/detail/navigation and signed-out auth-gate checks; authenticated save/application-state mutation QA remains pending.
12. [x] Next Wave passes compact/large geometry, artwork/content and exact-destination checks.
13. [x] Soundboards pass exact identifier, whole-card target and loading/error/empty checks.
14. [x] Physical merchandise passes non-StoreKit discovery, variants, stock, shipping, price, basket and checkout-state checks without a real purchase.
15. [x] PLUGGD DJ, BeatPlug and Creator Studio each open the correct workflow; BeatPlug passes direct web product/visual comparison.
16. [x] Happening Now passes real artwork resolution and intentional fallback checks.
17. [x] One typed destination registry covers every visible Homepage destination family and truthful auth/creator gates.
18. [x] No content was removed to hide a defect; all repaired surfaces expose deliberate loading, empty, error and retry states.
19. [x] Same-width native/web reference captures are recorded with the corrected visual-vs-content parity boundary.
20. [x] Complete reachable public/signed-out rendered interaction matrix passes across Home, Discover and repaired linked destinations.
21. [x] Compact and large Simulator visual QA passes bounds, crops, typography, spacing, controls, touch targets and accessibility; fresh current-source physical-device QA remains separate.
22. [x] Focused lane checks pass; integrated TypeScript, build and rendered regression checks pass once on the assembled source.
23. [x] Final handoff reports all 24 items separately and distinguishes source, rendered, device and consequential-action evidence.
24. [x] Final repaired product contains real data/workflows, deliberate states and no visible internal/developer copy on the verified public/signed-out surfaces.

- CURRENT_SOURCE_STATUS=PASS_ASSEMBLED_EXACT_SOURCE
- CURRENT_RENDERED_STATUS=PASS_PUBLIC_SIGNED_OUT_COMPACT_AND_LARGE_SIMULATOR
- CURRENT_DEVICE_STATUS=CURRENT_EMBEDDED_BUILD_INSTALLED_AND_LAUNCHED_USER_INTERACTION_QA_PENDING
- CONSEQUENTIAL_ACTIONS=None; no deploy, production write, Git integration, archive/upload, purchase or App Store action.
- FINAL_STATUS=SOURCE_BUILD_PUBLIC_RENDER_AND_DEVICE_INSTALL_PASS_AUTHENTICATED_OPPORTUNITY_AND_PHYSICAL_INTERACTION_QA_PENDING

## Phase 10B Community image/video parity continuation

- [x] Current web Community thread `MediaLightbox` and video behavior were compared directly with native before editing.
- [x] Every visible Community image tile is an accessible action that opens a full-screen native viewer without also navigating the outer post card.
- [x] Every post in a multi-post thread uses the shared full social card, so later thread posts retain images, video, audio, polls, links and actions instead of collapsing to text-only rows.
- [x] Full-screen images use complete-image `contain` rendering, pinch zoom, previous/next controls, position dots and the post caption/author context.
- [x] Community video attachments open a real `expo-video` player with native controls and `contain`; video does not autoplay or remain playing after the viewer unmounts.
- [x] `verify-mobile-social-web-parity-contract.mjs` and `verify-mobile-community-feed-contract.mjs` pass.
- [x] `npx tsc --noEmit` and scoped `git diff --check` pass.
- [x] The exact current source was embedded into a 13 MB Hermes bytecode bundle, signed with the required development profile, installed over `com.pluggd.mobile` on Ishola's iPhone and launched successfully.
- [ ] The user opens at least one real multi-image Community thread and one real video thread on the phone and confirms image containment/zoom/navigation, native video controls and close/back behavior.
- DEVICE_ARTIFACT=`/private/tmp/pluggd-phase10b-device/Build/Products/Debug-iphoneos/Pluggd.app`
- DEVICE_READBACK=`com.pluggd.mobile` version `1.0.0` build `1`; install and foreground launch passed; running process was observed.
- SIGNING_NOTE=Local strict verification returned `CSSMERR_TP_NOT_TRUSTED` for the development certificate, but Xcode signing plus real-device install and launch passed. No archive, distribution signing or App Store conclusion is inferred.
- FINAL_STATUS=SOURCE_BUILD_INSTALL_LAUNCH_PASS_USER_MEDIA_INTERACTION_QA_PENDING

## Phase 10A Homepage and destination repair gate

- [x] Behavioral Home destination contract proves every rendered action resolves to a supported route or explicit auth/creator gate.
- [x] Scene filter contract proves zero unfiltered fallback for a selected scene.
- [x] Player contract proves collapse is visible and Close is options-menu-only.
- [x] THE PLUG contract proves internal article navigation remains native and external browsing is domain-classified.
- [x] Opportunity contract proves fixed rail geometry and deterministic non-letter artwork fallback.
- [x] Store contract proves physical merchandise does not depend on StoreKit and no internal classification/policy copy is rendered.
- [x] Carnival v1/v2 compatibility and approved section-order contract pass.
- [x] Listening Floor contract proves the first viewport is editorial and the listening deck is bounded rather than full-screen-player-sized.
- [x] `npx tsc --noEmit` passes once after lane integration.
- [x] Scoped `git diff --check` passes for the exact authorised manifest.
- [x] Exact current-source Debug device build succeeds, installs on the connected iPhone and launches as `com.pluggd.mobile` without creating an archive.
- [ ] Current Debug build is reviewed by the user on their iPhone through the complete Homepage tap matrix.
- [x] No production deploy, purchase, archive, upload or App Store submission occurs in this gate.
- FINAL_STATUS=SOURCE_PASS_USER_IPHONE_DEBUG_WALKTHROUGH_PENDING

## Phase 10 integrated rendered gate

- [x] Exact current-source Debug Simulator build passed and the installable artifact is preserved at `/private/tmp/pluggd-parity-derived/Build/Products/Debug-iphonesimulator/Pluggd.app`.
- [x] Live taxonomy backend is ACTIVE as `manage-live-sessions` v24 with JWT verification; the deployed digest matches v23 and no Live session or row was created.
- [x] Complete-parity backend migration `20260822120000` is recorded remotely; `mobile-studio-handoff` v1, `process-audio-upload` v219, and `enhanced-store-checkout` v180 are ACTIVE with the intended JWT settings and safe rejection probes pass.
- [x] Native Community thread comments render the real profile-derived avatar, display name and handle and open the same creator/user profile routes used by post cards; focused social, Community, route, gap-wiring, capability, Studio complete-parity/web-parity, TypeScript and diff gates pass, and no second raw-ID-initial UI use was found by the targeted scan.
- [ ] Compact/large signed-out, fan and creator rendered walkthrough remains blocked until macOS restarts the stuck root-owned CoreSimulator disk service.
- [ ] User personally reviews the complete Simulator app before any exact submission archive.
- [ ] Physical-iPhone accessibility, media, permission, interruption, offline and StoreKit gates remain pending the later connected-device stage.
- FINAL_STATUS=SOURCE_BUILD_AND_BACKEND_PASS_RENDERED_QA_HOST_RESTART_PENDING

## Phase 9A complete-parity foundation gate

- [x] Shared destination/module registry maps every entry to a valid native route or allowlisted exact `/studio/*` embedded route and never substitutes a public fan route for management.
- [x] Studio module state is server-first, migrates existing AsyncStorage choices once and retains an offline cache; cross-device runtime sync remains an authenticated post-deployment gate.
- [x] Native Studio browser uses only short-lived route-bound codes, prevents arbitrary/external navigation and handles back/close/refresh/offline/session expiry in source; exact completion refresh remains a post-deployment rendered gate.
- [x] Sign-out revokes outstanding Studio handoffs before clearing the local session.
- [x] Creators is a real native directory destination with Artist, PLUGGD Creator and Industry tabs, real search/filter/follow/profile routing and block-state exclusion.
- [x] Focused Studio, navigation and public-directory contracts, TypeScript and scoped diff hygiene pass for Phase 9A.
- [x] No production mutation/deploy, Git integration, dependency change, build/archive/upload, or App Store action occurred in this source phase.
- FINAL_STATUS=SOURCE_PASS_BACKEND_DEPLOYMENT_AND_RENDERED_AUTHENTICATED_QA_PENDING

## Phase 9B complete THE PLUG reader gate

- [x] Article DTO loads canonical complete HTML, legacy editor HTML, author, publication, category/edition, publication date and read metadata from real published rows.
- [x] Reader preserves the complete approved document, resolves relative assets safely, disables arbitrary JavaScript and intercepts external navigation.
- [x] Native title/back/share/save states are accessible and never replace a complete article with a stripped excerpt.
- [x] Loading, retry, unavailable, safe-link and HTML-renderer failure states remain distinct and recoverable.
- [x] Focused contract, TypeScript and scoped diff hygiene pass.
- [x] No editorial content, production, dependency, Git-history, build/archive/upload or App Store state changes.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AND_AUTHENTICATED_QA_PENDING

## Phase 9C full-screen Maps gate

- [x] `/maps` renders the full-screen native Mapbox canvas rather than `ParityScaffold`.
- [x] Canonical public-signal, Tune In, like, create and publish RPCs are reused without a duplicate map data system.
- [x] Clusters, live pulse, search, activity/mood filters, selected-signal sheet, directions and 30-second refresh are present.
- [x] Saved Carnival routes render as a line overlay and native signal creation publishes approximate coordinates.
- [x] Location remains off until an explicit Locate me action and an accessible list survives map/token failure.
- [x] Focused Maps contract, TypeScript and scoped diff hygiene pass.
- [x] No production, dependency, Git-history, build/archive/upload or App Store state changes occurred.
- FINAL_STATUS=SOURCE_PASS_RENDERED_LOCATION_AND_AUTHENTICATED_QA_PENDING

## Phase 9D universal audio and timed lyrics gate

- [x] Player consumes canonical public-safe audio metadata, including duration and normalised waveform peaks, with a progress fallback while processing.
- [x] The selected release track controls waveform and published lyrics retrieval; multi-track selection never reuses another track's lyrics.
- [x] Timed lines highlight and auto-scroll with manual navigation plus Reduce Motion support; plain untimed lyrics remain readable.
- [x] Public streaming and background/queue behaviour remain separate from gated download/IAP actions.
- [x] Focused contract, existing player contracts, TypeScript and scoped diff hygiene pass.
- FINAL_STATUS=SOURCE_PASS_RENDERED_REAL_DATA_BACKGROUND_AND_DEVICE_QA_PENDING

## Phase 9E native creator upload gate

- [x] Final review creates an authenticated backend-owned private draft and never reports publication.
- [x] Artwork and audio use existing owner-scoped storage; `audio_files` is linked to the created release track, beat or mix.
- [x] Audio processing starts explicitly and the UI exposes upload/processing state without claiming completion early.
- [x] Partial failure performs a compensating rollback of only the newly created row/object set.
- [x] Local save remains available as a separate device-draft action.
- [x] Focused contract, existing action-wiring contract, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_DEPLOYMENT_RENDERED_AND_AUTHENTICATED_QA_PENDING

## Phase 9F native Soundboard creation and owner gate

- [x] Studio exposes a real native New Soundboard route for populated and empty owner catalogues.
- [x] Creator chooses a truthful blank/visual template, title, description, optional cover and privacy/comment settings; downloads remain off on creation and owner-controlled afterward.
- [x] Creation reuses `create_soundboard`, stores only real selected appearance metadata and opens the exact owner canvas.
- [x] Existing owner canvas exposes board edit/publish/visibility/comment/download controls; public viewing is a separate explicit canvas-first presentation.
- [x] Focused contract, existing canvas contract, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AND_AUTHENTICATED_QA_PENDING

## Phase 9G native timed lyrics authoring gate

- [x] Studio selects an exact owned release track and never publishes ambiguous release-level lyrics.
- [x] Plain text and LRC import produce editable line data; tap-to-sync records ordered timestamps against real playback.
- [x] Working text remains private until an explicit rights-confirmed publish action.
- [x] Publication upserts the exact `published_track_lyrics.track_id` row and preserves untimed fallback text.
- [x] Focused contract, updated Studio web-parity contract, universal-player contract, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_BACKEND_DEPLOYMENT_RENDERED_AND_AUTHENTICATED_QA_PENDING

## Phase 9H native owner catalogue management gate

- [x] Owned release, beat and mix rows open a genuine native management screen rather than action-only summaries or public indexes.
- [x] Load/save re-confirm exact ownership and expose truthful metadata, rights, pricing/licensing and publication/visibility state supported by each schema.
- [x] Public removal/restore and duplicate are explicit, confirmed and backend-acknowledged; public presentation remains a separate action.
- [x] Digital purchase/licensing configuration never opens an external consumer checkout.
- [x] Focused contract, Studio contracts, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AUTHENTICATED_REAL_DATA_QA_PENDING

## Phase 9I native video catalogue and upload gate

- [x] Videos opens a real native owner catalogue route and no longer remains a route-less Studio label.
- [x] Basic upload uses an existing owner bucket/table/policy, starts private/draft and compensates partial failure.
- [x] Owner metadata, visibility/publication, replace/unpublish and separate public presentation actions are truthful and backend-acknowledged.
- [x] Advanced editing/distribution opens only its allowlisted authenticated Studio module.
- [x] Focused contract, Studio contracts, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AUTHENTICATED_UPLOAD_QA_PENDING

## Phase 9J native analytics and audience gate

- [x] Insights exposes real 7/30/90-day selection and labels every metric/window honestly.
- [x] Owner-safe trends cover the available plays, views, saves, followers and revenue data without invented values or cross-owner leakage.
- [x] Empty, partial-data, retry and advanced-drilldown states remain actionable and truthful.
- [x] Focused contract, Studio contracts, TypeScript and scoped diff hygiene pass without creating analytics or production rows.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AUTHENTICATED_REAL_DATA_QA_PENDING

## Phase 9K native identity and Connect Card gate

- [x] Common profile identity, cover, contact and social-link fields save through exact owner-scoped native writes.
- [x] Connect Card identity, contact, links, service/rate and availability edits use `connect_profiles` and `connect_services` with validation and backend acknowledgement.
- [x] My PLUGGD page management opens the exact authenticated page builder, not a public fan page; public profile/Card viewing is a separate explicit action.
- [x] Advanced Card/privacy configuration stays securely embedded while routine edits remain native.
- [x] Focused contract, Studio contracts, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AUTHENTICATED_OWNER_QA_PENDING

## Phase 9L native commerce owner gate

- [x] Store, membership, pack and merchandise rows load only for the authenticated owner and surface truthful state/counts.
- [x] Frequent native edit/publication/availability actions wait for backend acknowledgement and never open a consumer checkout.
- [x] Inventory, fulfilment, tier construction, tax and advanced configuration use exact allowlisted authenticated Studio modules.
- [x] Public product/membership/pack viewing is a separate explicit action and digital purchases remain StoreKit-gated.
- [x] Focused contract, Studio contracts, commerce gating, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AUTHENTICATED_OWNER_QA_PENDING

## Phase 9M native Financials owner gate

- [x] Wallet balances, recent activity and payout lifecycle state load only for the authenticated creator.
- [x] The common native summary is read-only during verification and routes cash actions through the existing native Wallet.
- [x] Tax, statements, exports, bank/KYC and payout configuration use the exact allowlisted authenticated Financials module.
- [x] Loading, retry, empty and partial-data states remain truthful and actionable.
- [x] Focused contract, Studio contracts, TypeScript and scoped diff hygiene pass without a purchase, cash-out or production write.
- FINAL_STATUS=SOURCE_PASS_RENDERED_AUTHENTICATED_OWNER_QA_PENDING

## Phase 9N Home and Discover public-parity gate

- [x] Home preserves its approved editorial hierarchy and adds truthful Opportunities plus Store/new-goods discovery.
- [x] Discover retains For You and the two-tap destination grid while adding rich Opportunities and Store/Library entry points.
- [x] Opportunity count/funding/deadline copy and Store price/type copy come from current public rows without invented personal matches.
- [x] Public Store cards use only active, public, approved rows and keep digital purchase gating unchanged.
- [x] Focused contract, existing discovery/contracts, TypeScript and scoped diff hygiene pass without a production write.
- FINAL_STATUS=SOURCE_PASS_RENDERED_PUBLIC_QA_PENDING

## Phase 9O public physical-commerce gate

- [x] Only approved public GBP physical Store products enter the native basket; creator merchandise retains its existing direct physical checkout.
- [x] The basket persists on device, enforces the backend's line/quantity limits and captures every required server-backed product option.
- [x] Checkout sends no client price and uses only `ios_physical_basket`, product identity, quantity and selected options.
- [x] Return navigation is not payment proof; the authenticated owner order must reach `completed` before the basket clears or the order is confirmed.
- [x] Purchases and the multi-line order record remain owner-scoped and show item/options/fulfilment state without exposing digital download routes.
- [x] Focused contract, TypeScript and scoped diff hygiene pass without a purchase, deploy or production write.
- FINAL_STATUS=SOURCE_PASS_DEPLOYMENT_RENDERED_AUTHENTICATED_PAYMENT_QA_PENDING

## Phase 9P startup-resilience gate

- [x] Font loading no longer returns a blank application window.
- [x] Loading and font-error states remain visible and accessible without depending on the unloaded custom fonts.
- [x] Focused contract, TypeScript and scoped diff hygiene pass.
- FINAL_STATUS=SOURCE_PASS_RENDERED_STARTUP_QA_PENDING

## Phase 8I release-closeout gate

- [x] `manage-live-sessions` passes Deno type-check and focused Live contract.
- [x] Exact function diff hygiene passes and taxonomy/linked-event ownership rules remain.
- [x] Exact function deploys to project `qkwvqmubhyondemhasjp`; readback is ACTIVE version 24 with JWT verification and no Live session or database row created.
- [ ] Current source manifest is refreshed and explicit-path staging excludes artifacts, temp files, stale PDFs and Supabase CLI residue.
- [ ] Build 8 source is committed reproducibly before archive.
- [ ] Physical-device evidence and App Store submission gates are completed or explicitly blocked with the exact user action required.
- FINAL_STATUS=LIVE_DEPLOY_PASS_MANIFEST_RENDER_PHYSICAL_AND_RELEASE_GATES_PENDING

## Phase 8H Listening Floor CTA geometry gate

- [x] CTA is a restrained rounded rectangle with explicit horizontal padding, not a fully rounded pill.
- [x] `Open release` and priced `Support — £…` labels share single-line compact-width containment.
- [x] Release navigation and the adjacent circular save control are unchanged.
- [x] Focused Product contract passes.
- [x] `npx tsc --noEmit --pretty false` passes.
- [x] Scoped diff hygiene passes.
- [x] Existing iPhone Simulator shows the current featured-release CTA without text-edge contact, clipping or overlap.
- EVIDENCE=`/tmp/pluggd-build8-auth-gates/39-listening-floor-cta-geometry-pass.jpg`.
- FINAL_STATUS=PHASE_8H_LISTENING_FLOOR_CTA_GEOMETRY_PASS_AND_FROZEN

## Phase 8G Studio catalog-management completion gate

- [x] Focused Studio contract proves no Studio creator/catalog action maps Releases, Beats, Mixes or Soundboards to public indexes or labels them Preview.
- [x] `npx tsc --noEmit --pretty false` passes.
- [x] Scoped tracked/untracked diff hygiene passes for the exact Phase 8G files.
- [x] Authenticated Simulator: Julius Vero's real `Echoes` row opens an actionable internal Studio workspace rather than a passive selected card or public Release page.
- [x] Authenticated Simulator: Promote release opens the creator composer with Echoes attached; no post is published and back returns to the Studio workspace.
- [x] Authenticated Simulator: Soundboards opens internal Studio management, not the public Soundboards index.
- [x] Optional unplugged catalog module presents Add to Studio confirmation; cancel leaves state and route unchanged.
- [x] Existing Studio drawer close and Apps/dock separation remain passing through focused contracts and the unchanged dock.
- EVIDENCE=`/tmp/pluggd-build8-auth-gates/33-studio-releases-management-pass.jpg`; `/tmp/pluggd-build8-auth-gates/34-studio-soundboards-management-pass.jpg`; `/tmp/pluggd-build8-auth-gates/35-studio-optional-add-prompt-pass.jpg`; `/tmp/pluggd-build8-auth-gates/36-studio-create-no-preview-pass.jpg`; `/tmp/pluggd-build8-auth-gates/37-studio-echoes-action-workspace-pass.jpg`; `/tmp/pluggd-build8-auth-gates/38-studio-echoes-promote-attachment-pass.jpg`.
- FINAL_STATUS=PHASE_8G_STUDIO_CATALOG_MANAGEMENT_PASS_AND_FROZEN

- FINAL_STATUS=PHASE_8F_AUTHENTICATED_AND_COMPACT_GATE_COMPLETE_WITH_RECORDED_BLOCKERS
- AUDIT_REQUIRED=false
- CODE_EDIT_ALLOWED=true

## Phase 8E Home event-detail route gate

- DEFECT=Home lower Nile Rodgers whole-card target registers a tap but remains on Home.
- RESERVED_SOURCE=`pluggd-mobile/src/features/home/MusicDiscoveryHome.tsx`; `pluggd-mobile/scripts/verify-mobile-home-carnival-completion-contract.mjs`.
- REQUIRED_SOURCE=Explicit `/events/[id]` pathname with the real `featuredEvent.id` param; whole-card accessible target and accepted presentation preserved.
- REQUIRED_CHECKS=Focused Home contract; TypeScript; scoped diff hygiene.
- REQUIRED_RENDER=Serial walkthrough owner taps `Open event Nile Rodgers & CHIC - 17 August` and proves matching Event detail opens.
- RESULT=PASS. Structured real-ID route opened the matching detail in the serial current-source walkthrough; evidence `/tmp/pluggd-build8-whole-app-walkthrough/normal/08b-home-event-route-pass.png`.

## Phase 8D Release-detail public-stream gate

- USER_APPROVAL=RECORDED: public full audio streaming is authorised while downloads remain gated.
- RESERVED_SOURCE=`pluggd-mobile/app/release/[id].tsx`; `pluggd-mobile/scripts/verify-mobile-product-pages-contract.mjs`.
- SHARED_RESOLVER=`pluggd-mobile/src/lib/mobileContent.ts::releasePlayableUrl`, read-only.
- REQUIRED_SOURCE=Release detail calls the same resolver used by Search for public release/track playback; catalogue-reference and track rights/takedown guards remain; no public download action/URL is added.
- REQUIRED_DOWNLOAD_PRESERVATION=`isOwned`, `canUnlock`, credits unlock, hosted checkout, `Buy download`, `Unlock download` and owned-file copy remain gated.
- REQUIRED_CHECKS=Focused Product contract; TypeScript; scoped diff hygiene.
- REQUIRED_RENDER=Real “Still ah Link” Release detail publicly starts playback in the existing iPhone Simulator; signed-out download remains protected.
- PUBLIC_STREAM_SOURCE=PASS via shared `releasePlayableUrl` for both permitted track rows and release fallback; catalogue and rights/takedown guards preserved.
- DOWNLOAD_GATING_SOURCE=PASS; ownership/unlock/hosted-checkout paths unchanged and no public raw Download action added.
- FOCUSED_PRODUCT_CONTRACT=PASS.
- TYPESCRIPT=PASS.
- SCOPED_DIFF_HYGIENE=PASS.
- STILL_AH_LINK_RENDER=PASS: Release detail `Listen` starts the real `2:41` track and exposes `Pause media` in the global player.
- DOWNLOAD_GATE_RENDER=PASS: unowned screen exposes `Unlock download for 79 credits` and states that listening is separate; no public Download action appears.
- EVIDENCE=`/tmp/pluggd-phase8d-still-ah-link-public-stream.png`.
- PHASE_8D_SCOPE_STATUS=VERIFIED_AND_FROZEN.

## Phase 8 consolidated acceptance state

- ACCEPTANCE_MATRIX=REGISTERED at `/tmp/pluggd-user-notes-acceptance-matrix.md` with 75 user-note points. Later verified Home results supersede its earlier Home `IN_PROGRESS` snapshot; Product and auth/data-dependent pending rows are not promoted.
- SOURCE_MANIFEST=REGISTERED at `/tmp/pluggd-build8-source-manifest.md` as a read-only provenance/staging aid. Its Home-active snapshot is superseded by the Home freeze; Product remains pending. It grants no staging, commit, build, archive, upload, production or App Store authority.
- HOME=VERIFIED_AND_FROZEN. Focused contract and scoped diff hygiene passed; fresh Simulator evidence: `/tmp/pluggd-phase7a-home-final-root.png`, `/tmp/pluggd-phase7a-home-lower-final.png`, `/tmp/pluggd-phase7a-home-event-tools-final.png`. Release action, multiple real Next Wave destinations, Soundboard preview/Open Board, whole event card/RSVP and exact PLUGGD DJ–BeatPlug–Creator Studio order/routes pass. Accepted Home sections remain preserved.
- CARNIVAL=VERIFIED_AND_FROZEN. `scripts/verify-mobile-carnival-completion-contract.mjs` and scoped diff hygiene passed. Normal/compact story-card, composed builder, real route-preview and story-reader evidence: `/tmp/pluggd-carnival-normal-story-card.png`, `/tmp/pluggd-carnival-compact-story-card.png`, `/tmp/pluggd-carnival-normal-builder.png`, `/tmp/pluggd-carnival-compact-builder.png`, `/tmp/pluggd-carnival-normal-route-preview.png`, `/tmp/pluggd-carnival-compact-route-preview.png`, `/tmp/pluggd-carnival-normal-story-reader.png`, `/tmp/pluggd-carnival-compact-story-reader.png`.
- DISCOVER=VERIFIED_AND_FROZEN. Focused completion contract, TypeScript and diff hygiene passed. Evidence: `/tmp/pluggd-native-discover-top.png`, `/tmp/pluggd-native-discover-destinations-evidence.png`, `/tmp/pluggd-native-discover-top10-tail.png`, `/tmp/pluggd-native-discover-playback-evidence.png`, `/tmp/pluggd-native-discover-detail-evidence.png`, `/tmp/pluggd-native-discover-beatplug-evidence.png`, `/tmp/pluggd-native-discover-opportunities-evidence.png`.
- COMMUNITY=VERIFIED_AND_FROZEN. Focused completion contract, TypeScript and diff hygiene passed. Feed preservation, compact Boards, board detail, purposeful Explore and destination evidence: `/tmp/pluggd-native-community-feed-evidence.png`, `/tmp/pluggd-native-community-boards-evidence.png`, `/tmp/pluggd-native-community-board-detail-evidence.png`, `/tmp/pluggd-native-community-explore-evidence.png`, `/tmp/pluggd-native-community-explore-destination-evidence.png`.
- STORE_PUBLIC_FLOW=VERIFIED_AND_FROZEN. Focused Store contract, TypeScript and diff hygiene passed. Evidence: `/tmp/pluggd-native-store-front-evidence.png`, `/tmp/pluggd-native-store-product-policy-evidence.png`, `/tmp/pluggd-native-store-purchases-evidence.png`. Authenticated commerce/policy/checkout remains `QA_NEEDED`; no purchase is authorised or claimed.
- OPPORTUNITIES_SOURCE_AND_SIGNED_OUT_FLOW=VERIFIED_AND_FROZEN. Focused Opportunities/route/adaptive-navigation contracts, TypeScript and diff hygiene passed; list/detail/filter/artwork rendering passed. Signed-in automatic match score/confidence/reasons, missing facts, save/preparing/ready/applied and application state remain `QA_NEEDED`; no auth mutation or fabricated state is allowed.
- SOUNDBOARDS_PUBLIC_FLOW=VERIFIED_AND_FROZEN. Evidence: `/tmp/pluggd-native-soundboards-index-v2.png`, `/tmp/pluggd-native-soundboard-carnival-detail.png`, `/tmp/pluggd-native-soundboard-fallin-detail.png`. Owner editor remains `QA_NEEDED`; the exact remaining Product/Drag action and initial real metadata `NaN`/`0:00 of 0:00` defect remain Product-owned.
- STUDIO_LEGAL_SOURCE=VERIFIED_AND_FROZEN. Focused contracts, TypeScript and diff hygiene passed. Authenticated Studio rendering and session-dependent legal reachability remain unclaimed.
- HEADER_PLAYER_CORE=VERIFIED_AND_FROZEN for source and reachable basic interactions. Header evidence: `/tmp/pluggd-phase6-header-mini.png`, `/tmp/pluggd-authqa-header-search-route.png`. Player play/seek/pause/resume passed; minimise preserves context at `/tmp/pluggd-authqa-player-minimised.png`; distinct close stops/clears/dismisses at `/tmp/pluggd-authqa-player-closed.png`. Honest empty-waveform fallback and lyrics-absent state at `/tmp/pluggd-authqa-release-lyrics-absent.png` passed. Real non-empty waveform, lyrics present/long-text, VoiceOver and background/interruption remain `QA_NEEDED`.
- INTERACTION_POLISH_HAPTICS=SOURCE_PASS_AND_SIMULATOR_LIMITED. Focused interaction-polish contract, TypeScript and diff hygiene passed; Reduced Motion evidence: `/tmp/pluggd-native-interaction-reduced-motion-evidence.png`. Simulator cannot physically prove haptic vibration, so physical haptics remain unclaimed.
- PRODUCT_OWNER=VERIFIED_AND_FROZEN for the source/check lanes returned to this serial gate. Release source replacement, Mix playback, Home event routing and the other recorded Product surfaces were retested from current Metro source. Auth/data-only rows remain separate blockers.
- INTEGRATED_SUITE=COMPLETE_WITH_RECORDED_BLOCKERS. The current-source matrix now closes at 52 PASS, 7 accepted focused regression passes, 9 QA-blocked rows, zero pending rows and zero concrete failures. This is not Build 8 archive/upload/App Store authorisation.

## Phase 8F serial whole-app Simulator results

- MATRIX=`/tmp/pluggd-build8-whole-app-walkthrough-matrix.md`.
- EVIDENCE_ROOT=`/tmp/pluggd-build8-whole-app-walkthrough/`.
- CONTACT_SHEET=PASS at `/tmp/pluggd-build8-whole-app-walkthrough/contact-sheet.png`; regenerated from 60 normal/compact evidence images.
- CURRENT_SOURCE_PROVENANCE=PASS. Installed `com.pluggd.mobile` dev client consumed current Metro JS. A temporary v3 accessibility marker proved current-source loading; final focused contracts confirm all diagnostic markers/logging are absent.
- MATRIX_TOTAL=68.
- MATRIX_PASS=52.
- MATRIX_ACCEPTED_REGRESSION_PASS=7. Existing focused source/render evidence was accepted per orchestration rules rather than rerun.
- MATRIX_QA_BLOCKED=9. Soundboard owner tools; Live viewer/overlay/composer and actual broadcaster canvas without a public session/creation; real lyrics/non-empty waveform; physical haptics, VoiceOver, background/interruption and rotation remain unclaimed.
- MATRIX_PENDING_NOT_CLAIMED=0.
- MATRIX_FAIL=0 after resolved-defect retests.
- HOME_EVENT_ROUTE=PASS at `/tmp/pluggd-build8-whole-app-walkthrough/normal/08b-home-event-route-pass.png`.
- OPPORTUNITIES_COMPACT_FILTER_AX=PASS at `/tmp/pluggd-build8-whole-app-walkthrough/compact/06b-opportunities-filter-ax-pass.png`.
- CARNIVAL_DEEP_LINK=PASS at `/tmp/pluggd-build8-whole-app-walkthrough/compact/07b-carnival-deeplink-pass.png`.
- RELEASE_ACTIVE_SOURCE_REPLACEMENT=PASS. With `lexisumfruits` active, Release routes showed the old player collapsed and the exact Listen action unobstructed; the action opened Still ah Link/Elevatetoday with `Pause media`. Evidence `/tmp/pluggd-build8-whole-app-walkthrough/normal/37e-release-v5-collapsed-player-pass.jpg` and `/tmp/pluggd-build8-whole-app-walkthrough/normal/37f-release-v5-active-source-pass.jpg`.
- MIX_PLAYBACK=PASS at `/tmp/pluggd-build8-whole-app-walkthrough/normal/39c-mix-v2-play-pass.jpg`. The real SUMMER D&B mix reached full player/Pause. The 350ms Starting state is source-pass but render-not-captured because snapshot latency exceeded the transient.
- LIVE_ENTRY=PASS at `/tmp/pluggd-build8-whole-app-walkthrough/normal/35b-live-entry-current-source.png`.
- AUTHENTICATED_OPPORTUNITIES=PASS at `/tmp/pluggd-build8-auth-gates/04-opportunities-auth-list-count-pass.jpg`, `05-opportunities-auth-saved-pass.jpg`, and `06-opportunities-auth-preparing-pass.jpg`. The authorised account remains Preparing only; no official application was submitted.
- AUTHENTICATED_STUDIO=PASS at `/tmp/pluggd-build8-auth-gates/14-studio-drawer-close-before-pass.jpg`, `15-studio-drawer-close-after-pass.jpg`, and `16-studio-apps-dock-pass.jpg`.
- LIVE_SAFE_SETUP=PASS at `/tmp/pluggd-build8-auth-gates/17-live-taxonomy-room-type.jpg` through `22-live-index-auth-sections-pass.jpg`. No room was created/scheduled and no server persistence claim is made. Viewer/overlay/composer and real broadcaster canvas remain QA-blocked without a current session/creation.
- LIVE_LOBBY_OPTION_3_SOURCE=PASS: focused Live contract, full TypeScript and scoped diff hygiene returned by the source owner.
- LIVE_LOBBY_OPTION_3_RENDER=PASS at `/tmp/pluggd-build8-auth-gates/24-live-lobby-normal-top.jpg`, `25-live-lobby-normal-lower.jpg`, `27-live-lobby-normal-creator-route-pass.jpg`, `29-live-lobby-compact-top-collapsed.jpg`, and `30-live-lobby-compact-lower.jpg`. Normal and compact lobby preserve reachable header actions, an image-led 2x2 category grid without horizontal overflow, honest non-tappable empty categories and a working real creator route. No Live room/reminder was created.
- LIVE_LOBBY_OPTION_3_DESIGN_QA=PASS at `/tmp/pluggd-live-option3-design-qa.md`; P3 follow-up only: partial PLUGGD Events wordmark crop in the Event-linked bundled fallback.
- COMPACT_PLAYER_CLEARANCE_SOURCE=PASS. `app/player.tsx` uses the bounded `isCompactPortrait` branch only at <=400x700 and preserves normal-width layout, waveform/lyrics, minimise/close, share/save/seek/shuffle/previous/play/next/repeat and Queue actions.
- COMPACT_PLAYER_FOCUSED_CONTRACT=PASS via `node scripts/verify-mobile-global-shell-player-contract.mjs`.
- COMPACT_PLAYER_TYPESCRIPT=PASS via `npx tsc --noEmit --pretty false`.
- COMPACT_PLAYER_DIFF_HYGIENE=PASS for `app/player.tsx`, the focused contract and Phase 8F records.
- COMPACT_PLAYER_RENDER_AND_AX=PASS at `/tmp/pluggd-build8-auth-gates/23-compact-player-controls-pass.jpg`. The 375x667 SUMMER D&B full player exposes Pause, shuffle, previous, next, repeat and Queue in the visible accessibility snapshot; K09 and K10 are PASS.
- AUTHENTICATED_COMPACT_CONTACT_SHEET=PASS at `/tmp/pluggd-build8-auth-gates/contact-sheet.jpg`.
- COMPACT_ENVIRONMENT_NOTE=One development-signing notification Keychain entitlement redbox occurred at `/tmp/pluggd-build8-whole-app-walkthrough/compact/02a-notification-entitlement-redbox.png`; later compact public surfaces remained reachable. This is not production/App Store evidence.
- CONSEQUENT_ACTIONS=NONE. No build, archive, upload, App Store action, production/Supabase mutation, Git staging/commit/push, purchase or destructive account action occurred.
- PHASE_8F_SCOPE_STATUS=AUTHENTICATED_AND_COMPACT_SIMULATOR_GATE_COMPLETE_WITH_RECORDED_BLOCKERS_AND_SOURCE_FROZEN. Human approval is still required before any Build 8 archive/upload/submission.

## Phase 7A Home/Carnival completion gate

- RESERVED_SOURCE=`src/features/home/MusicDiscoveryHome.tsx`; `src/features/home/homeDiscoveryData.ts`; `scripts/verify-mobile-home-carnival-completion-contract.mjs`.
- REQUIRED_SOURCE_EVIDENCE=Focused Phase 7A contract, `npx tsc --noEmit`, scoped `git diff --check`.
- REQUIRED_RENDERED_EVIDENCE=One fresh iPhone Simulator pass covering Home release action, multiple Next Wave destinations, Soundboard preview/action, whole event card and CTA, and Drops & Tools order/routes.
- SUPPORT_RELEASE_COPY_AND_ACTION=PASS.
- CARNIVAL_STORY_TITLES=RELINQUISHED_WITHOUT_SOURCE_EDITS.
- BUILD_MY_CARNIVAL_COMPOSITION=RELINQUISHED_WITHOUT_SOURCE_EDITS.
- CARNIVAL_SAFE_BACK_ACTION=RELINQUISHED_WITHOUT_SOURCE_EDITS.
- NEXT_WAVE_REAL_MULTIPLE_ITEMS=PASS at `/tmp/pluggd-phase7a-home-lower-final.png`.
- SOUNDBOARD_PREVIEW_AND_OPEN_BOARD=PASS source; fresh art/section render at `/tmp/pluggd-phase7a-home-soundboards-final.png` with separate preview/action layout asserted by focused contract.
- HAPPENING_NOW_CARD=PASS at `/tmp/pluggd-phase7a-home-event-tools-final.png`; free inventory renders truthful RSVP with corrected spacing, and whole-card route is source-asserted.
- DROPS_AND_TOOLS_ORDER=PASS at `/tmp/pluggd-phase7a-home-event-tools-final.png`: PLUGGD DJ mix upload, BeatPlug, Creator Studio.
- ACCEPTED_HOME_SECTIONS_PRESERVED=PASS at `/tmp/pluggd-phase7a-home-lower-1.png` and `/tmp/pluggd-phase7a-home-soundboards-final.png`.
- PHASE_7A_FOCUSED_CONTRACT=PASS via `node scripts/verify-mobile-home-carnival-completion-contract.mjs`.
- PHASE_7A_DIFF_HYGIENE=PASS for the exact two Home files and focused contract.
- PHASE_7A_TYPESCRIPT=BLOCKED_BY_CONCURRENT_OUT_OF_SCOPE_RELEASE_DETAIL. `npx tsc --noEmit` reports only missing style keys in `app/release/[id].tsx`; no Home-file error was reported and this lane did not edit Release detail.

## Phase 6 global top-bar and player parity gate

- BASELINE_COMPACT=`/tmp/pluggd-global-shell-player-audit-01-compact.png`: shared header and expanded MiniPlayer are functional but top actions are undersized/crowded, close is missing, and the player/dock masks too much Soundboard detail.
- BASELINE_FULL=`/tmp/pluggd-global-shell-player-audit-02-full.png`: full player preserves art, seek, controls, queue and source hierarchy, but its chevron is minimise behaviour mislabeled as close; no true dismiss/reset action, real waveform or published-lyrics view is present.
- REAL_DATA_SOURCES=`soundboard_items.waveform_data` for real public Soundboard waveform amplitudes; `releases.lyrics` for real published release lyrics. No synthetic/deterministic/random waveform or generated lyrics are allowed.
- WEB_CLOSE_AUTHORITY=Web `closePlayer` stops media, removes its source, clears visible active track/queue/index/time/expanded/history state and prevents player resurrection. Native close must achieve the equivalent with `TrackPlayer.reset()` and owned queue state.
- REQUIRED_SOURCE_CHECKS=Focused global shell/player contract; relevant route, adaptive-navigation and playback contracts; `npx tsc --noEmit`; scoped diff hygiene.
- REQUIRED_RENDERED_CHECKS=Fresh shared-header target/spacing evidence; compact expanded, collapsed and closed states; close while playing/paused and after seek; full-player minimise versus close; real waveform/fallback and seek progress; release lyrics present/absent/long-text where reachable; Soundboard clearance; accessibility labels/touch targets; global route/action preservation.

## Phase 6 results

- HEADER_SOURCE=PASS. Shared compact and Discovery headers now use 44-point action targets, 38-point avatars and larger spaced Live/search/notification controls while preserving every existing route; Discovery now includes the missing notification action and unread state.
- CLOSE_SOURCE=PASS. `closePlayer` calls `TrackPlayer.reset()` and clears owned queue/error context. Expanded/collapsed mini player and portrait/landscape full player expose distinct accessible minimise/collapse and `Close player and stop playback` controls. Minimise leaves playback context intact; the prior internal BarFlow lyrics shortcut is removed.
- WAVEFORM_SOURCE=PASS. Only real `soundboard_items.waveform_data` is normalised and downsampled; Reanimated clips active bars from actual playback position/duration and tapping seeks through the existing player. Empty/missing amplitudes use the ordinary actual-progress rail; no random, decorative or deterministic waveform is generated.
- LYRICS_SOURCE=PASS. Only real `releases.lyrics` is queried for release tracks; the scrollable reader handles loading, retry, published long text and honest absence without generated lyrics or synchronised timing.
- SOUNDBOARD_CLEARANCE_SOURCE=PASS. Nested `/soundboards/*` routes default the existing player to its collapsed state and retain separate expand/close controls. No Soundboard product/canvas or global navigation source changed.
- PHASE_6_FOCUSED_CONTRACT=PASS via `node scripts/verify-mobile-global-shell-player-contract.mjs`.
- PHASE_6_EXISTING_PLAYER_CONTRACT=PASS via `node scripts/verify-mobile-player-contract.mjs`.
- PHASE_6_LOGO_CONTRACT=PASS via `node scripts/verify-mobile-logo-contract.mjs`.
- PHASE_6_ADAPTIVE_NAVIGATION_CONTRACT=PASS via `node scripts/verify-android-adaptive-navigation-contract.mjs`.
- PHASE_6_TYPESCRIPT=PASS via `npx tsc --noEmit`.
- PHASE_6_DIFF_HYGIENE=PASS for the exact reserved source, focused contract and task records.
- HEADER_AND_EXPANDED_PLAYER_RENDER=PASS at `/tmp/pluggd-phase6-header-mini.png`: larger Live/search/bell/avatar controls are legible and separated; expanded player shows distinct collapse and close controls above the unchanged dock.
- FULL_PLAYER_RENDER=PASS at `/tmp/pluggd-phase6-current.png`: the full player preserves real art, playback, seek, shuffle/repeat, save/share, queue and route hierarchy while showing separate minimise and close controls.
- SOUNDBOARD_COLLAPSED_RENDER=PASS at `/tmp/pluggd-phase6-soundboard-compact.png`: public Soundboard detail remains visible above the unchanged global dock and the small global player retains separate expand and close actions.
- REAL_WAVEFORM_RENDER=BLOCKED_BY_CURRENT_DATA. The reachable board `soundboard-19409994` and its current audio item expose empty waveform objects, so the truthful playback rail rendered. No non-empty amplitude fixture was fabricated or injected.
- INTERACTION_AND_ACCESSIBILITY_DEVICE_MATRIX=PENDING_INTEGRATION_GATE. Source labels/targets pass contract and rendered presence is proven, but close/minimise across playing/paused/seek/queue/repeat, actual VoiceOver, published lyrics present/absent/long-text, and background/interruption were not exercised by controllable Simulator automation. No end-to-end interaction claim is made.
- PHASE_6_SCOPE_STATUS=SOURCE_AND_REACHABLE_RENDER_PASS_FROZEN. This is not whole-app, device or Build 8 release approval.

## Phase 5 native Opportunities web-authority parity gate

- WEB_AUTHORITY=`cceaee6fd170e16adb85d83d95cebd7a80883e47` in `/Users/apple/PLUGGD_NEW`, read-only.
- VISUAL_REFERENCES=`/Users/apple/Downloads/ChatGPT Image Aug 16, 2026 at 04_28_17 PM.png`; `/Users/apple/PLUGGD_NEW/design-qa.md`; prior native final comparisons remain the accepted Phase 4 baseline.
- TARGETED_SOURCE_FINDING=Phase 4 native already has real inventory, automatic deterministic matching, published eligibility, application workspace, safe official links and visible promoter artwork. Remaining parity gaps are the accepted web model-backed filter surface, verified organiser identity fallback, opportunity-specific missing-fact answer flow and compact working detail actions above global chrome.
- REQUIRED_PRESERVATION=Existing Home, Discover, Soundboards, global navigation/dock, build metadata, real data engine, safe external actions, production and Git history.
- REQUIRED_SOURCE_CHECKS=Focused Opportunities contract; mobile route contract; `npx tsc --noEmit`; scoped diff hygiene.
- REQUIRED_RENDERED_CHECKS=Fresh Simulator list, detail and full-screen filter evidence; signed-in automatic match/confidence/reasons and real application-state evidence where an existing safe authenticated session is available.

## Phase 5 results

- REAL_LIST_FILTERS=PASS. The native list uses current Supabase inventory, real search, quick filters and a full-screen model-backed filter surface for category, creator role, genre, career stage, delivery, deadline, signed-in match/saved state and deterministic sorting. Counts and preview rows derive from the current result set.
- ARTWORK_AND_ORGANISER_IDENTITY=PASS. Opportunity-specific verified artwork and organiser logo/domain identity are preferred; the exact approved creator image is used only when no specific artwork exists. No letter placeholder or invented artwork/value is used.
- AUTOMATIC_MATCH_AND_MISSING_FACT_SOURCE=PASS. Signed-in matches remain deterministic and automatic, with score, confidence, reasons, eligibility and missing facts. Opportunity-specific answers can be persisted only through the existing private-fact backend contract when the user opts in.
- APPLICATION_AND_OFFICIAL_ACTION_SOURCE=PASS. Save, preparing, ready and applied state remain backend-owned; official apply/source URLs are HTTP(S)-validated; compact Apply and Prepare actions stay above the global bottom chrome.
- SINGLE_HEADER_POLICY=PASS. `/opportunities` and `/opportunities/*` own their dedicated list/detail headers. The former duplicate global plus local detail header is removed; detail back/share controls remain visible; the existing player and bottom dock remain rendered.
- PHASE_5_FOCUSED_OPPORTUNITIES_CONTRACT=PASS via `node scripts/verify-mobile-opportunities-contract.mjs`.
- PHASE_5_ROUTE_CONTRACT=PASS via `node scripts/verify-mobile-route-contract.mjs`.
- PHASE_5_ADAPTIVE_NAVIGATION_CONTRACT=PASS via `node scripts/verify-android-adaptive-navigation-contract.mjs`, including exact and nested Opportunities dedicated-header assertions.
- PHASE_5_TYPESCRIPT=PASS via `npx tsc --noEmit`.
- PHASE_5_DIFF_HYGIENE=PASS for the reserved Opportunities source/asset/contracts and exact approved shared-header files.
- PHASE_5_DIAGNOSTIC_HYGIENE=PASS. No temporary Opportunities log marker or hardcoded localhost/development URL remains.
- SIGNED_OUT_LIST_RENDER=PASS at `/tmp/pluggd-native-opportunities-phase5-list-single-header.png`: one intentional list header, complete title/search/filter hierarchy, real PRS identity/artwork and non-overlapping image-led lead card.
- SIGNED_OUT_DETAIL_RENDER=PASS at `/tmp/pluggd-native-opportunities-phase5-detail-single-header.png`: one compact back/share header, real artwork/identity, truthful facts/private-match prompt and compact Apply/Prepare actions above the preserved player/dock.
- FILTER_RENDER=PASS at `/tmp/pluggd-native-opportunities-phase5-filters-qa-v3.png`: full-screen, model-backed options, real snapshot/result count, disabled signed-out private-match option and clear working result action.
- SAME_INPUT_VISUAL_COMPARISONS=Inspected at `/tmp/pluggd-native-opportunities-phase5-list-reference-vs-runtime.png` and `/tmp/pluggd-native-opportunities-phase5-detail-reference-vs-runtime.png` against the supplied mobile mock. The accepted implementation preserves PLUGGD's actual global dock/player while matching the reference's image-led hierarchy and compact decision flow.
- AUTHENTICATED_RENDERED_MATCH_AND_APPLICATION_STATE=BLOCKED. The reachable Simulator is signed out, and this lane is prohibited from mutating authentication. No authenticated visual claim is made; do not repeat source checks or manufacture a session.
- PHASE_5_SCOPE_STATUS=SOURCE_AND_SIGNED_OUT_RENDER_PASS_FROZEN. This is not whole-app, device or Build 8 release approval.

## Queued pre-Build 8 shared-shell/player gates — not implemented in Phase 5

- TOP_BAR_REQUIRED=Increase avatar, notification, search and Live control scale/spacing and accessible touch targets; verify safe areas across main/detail screens.
- PLAYER_REQUIRED=Match supported web playback/pause/seek/queue/repeat/shuffle/share/route behaviour; use actual playback/seek progress for a real animated waveform; show only real lyrics with present/absent/long-text evidence; verify background/interruption and accessibility.
- PLAYER_CLOSE_REQUIRED=Minimise preserves playback. A separate visible accessible `×` close must stop playback, clear active media and queue context according to existing web behaviour, dismiss compact/full-screen UI and prevent unexpected navigation restart. Verify playing/paused, compact/full-screen, after seek, queue/repeat and VoiceOver/touch-target states.

## Phase 4D clean-cache runtime diagnostic

- CLEAN_CACHE_EVIDENCE=`/tmp/pluggd-native-opportunities-list-cacheclean.png`: FAIL; the local promoter image surface remains empty.
- METRO_EVIDENCE=Asset module 3104 is registered with hash `ba3bde35ca454b20de072d505efe84f9`; its local asset endpoint returns HTTP 200.
- AUTHORISED_TEMPORARY_EDIT=Log the resolved local source URI/dimensions once and the local `<Image>` `onError` payload in `OpportunityScreens.tsx` only.
- STOP_CONDITION=Do not choose or implement another fix until the orchestrator supplies the exact runtime output; remove all temporary logging before final source verification.
- RUNTIME_SOURCE_RESULT=Resolved source is 1774×887 at scale 1 and uses Metro asset hash `ba3bde35ca454b20de072d505efe84f9`; the exact URI returns HTTP 200 `image/png`.
- RUNTIME_ERROR_RESULT=No local artwork `onError` event fired in either list or detail.
- EVIDENCED_FIX=PASS in source. List/detail artwork now uses explicit `width: '100%'` and `height: '100%'` inside the already-sized media containers rather than relying on absolute edge layout.
- TEMPORARY_DIAGNOSTICS_REMOVED=PASS by focused contract.
- PHASE_4D_FOCUSED_CONTRACT=PASS.
- PHASE_4D_ROUTE_CONTRACT=PASS.
- PHASE_4D_TYPESCRIPT=PASS.
- PHASE_4D_DIFF_HYGIENE=PASS.
- PHASE_4D_SIMULATOR_LIST_AND_DETAIL=PASS. Fresh hot reload shows the exact Early Career promoter artwork visibly rendered on both the native lead list card and detail hero; compact non-overlapping hierarchy is preserved.
- FINAL_LIST_COMPARISON=`/tmp/pluggd-native-opportunities-list-comparison-final.png`, inspected by orchestrator against the supplied mobile reference.
- FINAL_DETAIL_COMPARISON=`/tmp/pluggd-native-opportunities-detail-comparison-final.png`, inspected by orchestrator against the supplied mobile reference.
- DIAGNOSTIC_LOGGING_REMOVAL=PASS by focused contract and final targeted source search.
- PHASE_4_SCOPE_STATUS=RENDERED_VERIFIED_AND_FROZEN. This is a native Opportunities lane pass, not whole-app or release approval.

## Phase 4C bundled promoter artwork render gate

- CURRENT_LIST_EVIDENCE=`/tmp/pluggd-native-opportunities-list-corrected.png`: PARTIAL PASS; overlap is fixed, but the valid local promoter PNG renders as an empty black 188-point media region after a full dev-client reload.
- ROOT_CAUSE_SCOPE=The shared `getOpportunityArtwork` to `OpportunityArtwork` path assumes the static `require()` result is numeric and does not normalise Expo/Metro module-object shapes.
- AUTHORISED_FIX=Normalise only the approved bundled promoter asset module into a React Native image source using runtime asset resolution; do not hardcode localhost/dev URLs or change any other record artwork behaviour.
- REQUIRED_CHECKS=Focused Opportunities contract; route contract; `npx tsc --noEmit`; scoped diff hygiene; orchestrator rerender of list and detail.
- SOURCE_NORMALISATION=PASS. The shared artwork component unwraps module-default asset shapes and resolves the direct or unwrapped static source with `Image.resolveAssetSource`; it contains no hardcoded development-server URL.
- OTHER_ARTWORK_PRESERVATION=PASS by focused contract and scoped diff. Remote metadata, verified artwork and organiser-logo fallback behaviour are unchanged.
- PHASE_4C_FOCUSED_CONTRACT=PASS.
- PHASE_4C_ROUTE_CONTRACT=PASS.
- PHASE_4C_TYPESCRIPT=PASS.
- PHASE_4C_DIFF_HYGIENE=PASS.
- PHASE_4C_SIMULATOR_LIST_AND_DETAIL=PENDING with orchestrator; no rendered completion claim is made by this source lane.

## Phase 4B rendered visual-fix gate

- REFERENCE_MOBILE=`/Users/apple/Downloads/ChatGPT Image Aug 16, 2026 at 04_28_17 PM.png`.
- REFERENCE_DESKTOP=`/Users/apple/Downloads/ChatGPT Image Aug 16, 2026 at 04_47_28 PM.png` for information hierarchy only.
- CURRENT_LIST_EVIDENCE=`/tmp/pluggd-native-opportunities-list.png`: FAIL; compressed/overlapping sections, weak artwork/source identity, and hierarchy below the supplied mobile target.
- CURRENT_DETAIL_EVIDENCE=Early Career Promoter detail: FAIL; oversized blank purple fallback media and insufficiently compact match-first hierarchy.
- REQUIRED_FIX=Restore non-overlapping list rhythm and image-led hierarchy; show the real Early Career Promoter campaign/card artwork; compact detail around identity, value/deadline/location and automatic match without changing data or behaviour.
- AUTHORISED_ASSET=`pluggd-mobile/assets/opportunities/early-career-promoter-hero.png`, exact bundled copy of `/Users/apple/PLUGGD_NEW/public/images/opportunities/early-career-promoter-hero.png`; only the Early Career promoter record may use it.
- REQUIRED_CHECKS=Focused Opportunities contract; route contract; `npx tsc --noEmit`; scoped diff hygiene; orchestrator-owned final Simulator comparison on the already-running session.

## Phase 4B source results

- LIST_LAYOUT_SOURCE=PASS. Opportunity Pressables now flatten their style object; the lead card reserves a 188-point media region and a separate in-flow copy region, removing the absolute copy overlap; filters and rows retain their real visual surfaces.
- DETAIL_LAYOUT_SOURCE=PASS. Detail media is reduced from 292 to 156 points so organiser, value/deadline/location and automatic/private match context enter the first-screen hierarchy sooner.
- PROMOTER_ARTWORK_SOURCE=PASS. The Early Career promoter maps to the bundled exact approved campaign asset; SHA-256 matches the web source exactly.
- DATA_AND_ACTION_PRESERVATION=PASS by focused contract. Real Supabase inventory, deterministic matches, eligibility, saved/application/checklist state and safe official destinations remain intact.
- FOCUSED_CONTRACT=PASS.
- ROUTE_CONTRACT=PASS.
- TYPESCRIPT=PASS.
- DIFF_HYGIENE=PASS.
- FINAL_SIMULATOR_COMPARISON=PENDING with orchestrator; no rendered completion claim is made by this source lane.

## Phase 4 real native Opportunities lane

- EXPECTED_SOURCE_FILES=`app/opportunities/index.tsx`; `app/opportunities/[id].tsx`; `src/features/opportunities/OpportunityScreens.tsx`; `src/features/opportunities/opportunityService.ts`; `src/features/editorial/EventsBoardScreen.tsx`; `scripts/verify-mobile-opportunities-contract.mjs`.
- REQUIRED_DATA_BEHAVIOUR=Existing Supabase published Opportunities inventory only; slug/UUID detail; existing backend save, application-status, checklist, and readiness records only.
- REQUIRED_PRESENTATION=Truthful search/filter, deadline, location, funding/value, published eligibility, verification, official-source, loading, error, and empty states without seed/fallback data.
- REQUIRED_NAVIGATION=Working `/opportunities` and `/opportunities/[id]` native routes; Events Open Opportunities routes internally; official application actions use safe backend HTTP(S) URLs only.
- REQUIRED_PRESERVATION=Home, Discover, font, Carnival, Events outside the scoped entry point, prior Studio/legal lanes, web code, schema/RLS, production, and all unrelated dirty files.
- REQUIRED_CHECKS=Focused Opportunities contract; `npx tsc --noEmit`; relevant existing route/copy contracts; scoped `git diff --check`; existing-session render only if already reachable.

## Phase 4 results

- NATIVE_ROUTES=PASS by source contract. Thin `/opportunities` and `/opportunities/[id]` Expo routes render the shared native list/detail experience; detail back navigation has a cold-deep-link-safe `/opportunities` fallback.
- REAL_INVENTORY_AND_DETAIL=PASS. Only verified existing `open`, `closing_soon`, or `rolling` rows are queried; detail resolves real slug or UUID rows; loading, error, empty, refresh, search, category, and delivery states are truthful and contain no seeds or fallback listings.
- AUTOMATIC_MATCHING=PASS by source contract. Signed-in users automatically receive the versioned deterministic score, confidence, pass/fail/unknown reasons, and missing-fact guidance from existing profile, catalogue, activity, requirement, and private-fact evidence. No button press, random value, AI ranking, or invented score is used.
- ARTWORK_AND_IDENTITY=PASS by source contract. List and detail share the same metadata/verified artwork resolver, use real organiser logos when available, and fall back to a branded image/icon rather than a generated initial.
- APPLICATION_STATE=PASS by source contract. Save, preparing, ready, applied, checklist completion, and readiness use existing backend tables; signed-out private actions preserve an internal return route through login.
- OFFICIAL_ACTIONS=PASS by source contract. Apply, guidelines, and source actions accept safe HTTP(S) destinations only; missing application links are stated honestly and expose no dead apply button.
- EVENTS_ENTRY=PASS. The prior placeholder is replaced only by an internal `/opportunities` entry with relevant creator-facing copy.
- FOCUSED_CONTRACT=PASS via `node scripts/verify-mobile-opportunities-contract.mjs`.
- ROUTE_CONTRACT=PASS via `node scripts/verify-mobile-route-contract.mjs`.
- TYPESCRIPT=PASS via `npx tsc --noEmit`.
- DIFF_HYGIENE=PASS. The tracked Events diff and all five untracked Phase 4 source/contract files have no whitespace errors.
- PUBLIC_COPY_CONTRACT=BLOCKED_BY_PREEXISTING_UNRELATED_ASSERTION. `node scripts/verify-mobile-public-copy-contract.mjs` reports only `src/features/legal/legalContent.ts:69` because the legitimate phrase `binding contract` contains the generic scanner substring `internal`; no Phase 4 file is reported and that script/path is outside this lane.
- REACT_REVIEW=PASS by source review. Hooks remain top-level, match/filter maps are memoised, query/mutation keys are scoped, list keys are stable, failures are visible, and backend writes invalidate their owning queries.
- RENDERED_SIMULATOR=BLOCKED. The controlling progress record already establishes that no existing Simulator/app session is reachable. This source-only lane did not repeat device discovery, boot, build, install, or authentication work.
- DESIGN_QA=BLOCKED. The supplied mobile mock-up guided the native hierarchy, but same-state rendered comparison cannot be performed without an authorised reachable app session; no visual completion claim is made.
- RELEASE_CLAIM=NOT MADE. Phase 4 source completion is not a Build 8, device, or App Review readiness pass.

## Phase 3 internal native legal-reader lane

- EXPECTED_SOURCE_FILES=`app/legal/terms.tsx`; `app/legal/privacy.tsx`; `src/features/legal/LegalReaderScreen.tsx`; `src/features/legal/legalContent.ts`; `src/components/PurchaseLegalLinks.tsx`; `app/settings/privacy.tsx`; `app/auth/signup.tsx`; `scripts/verify-mobile-native-legal-reader-contract.mjs`; `scripts/verify-ios-app-store-readiness-contract.mjs`.
- REQUIRED_CONTENT=Complete current canonical PLUGGD Terms and Privacy content, without abbreviation or placeholder text.
- REQUIRED_LINK_BEHAVIOUR=All current user-facing Terms/Privacy taps navigate to `/legal/terms` or `/legal/privacy` internally; no external browser/WebView.
- REQUIRED_PRESERVATION=Purchase and signup disclosures/semantics, privacy/account-deletion controls, App Store metadata URLs, Home, Discover, font, and prior Studio work remain unchanged.
- REQUIRED_CHECKS=Focused route/link/content contract; `npx tsc --noEmit`; scoped `git diff --check`.

## Phase 3 results

- CANONICAL_CONTENT=PASS. Complete current en-GB canonical sections, update dates, and contact details are represented in the shared native content module; no placeholder or abbreviated copy.
- NATIVE_READER=PASS by source contract. One accessible native `ScrollView` reader serves both thin Expo routes without WebView, browser navigation, or a new dependency.
- INTERNAL_LINKS=PASS. Purchase disclosures, Privacy settings, and signup consent route to `/legal/terms` and `/legal/privacy`; no contracted user-facing Terms/Privacy tap still calls `Linking.openURL`.
- PRESERVATION=PASS by focused/readiness contracts. Purchase and signup semantics, account deletion/privacy controls, non-legal external actions, and App Store metadata URL requirements remain intact.
- TYPESCRIPT=PASS via `npx tsc --noEmit`.
- FOCUSED_CONTRACTS=PASS: native legal reader; iOS App Store readiness; contextual premium.
- DIFF_HYGIENE=PASS via scoped `git diff --check`.
- REACT_REVIEW=PASS. Shared static content is module-level, routes are thin, hooks are top-level, list keys are stable, and all interactive legal controls have accessibility roles/labels.
- RENDERED_SIMULATOR=BLOCKED. `xcrun simctl list devices` showed no booted Simulator; all listed iOS devices were shut down and only iPad runtimes were installed. No boot, build, install, or auth mutation was authorised.
- RELEASE_CLAIM=NOT MADE. Phase 3 source completion is not a Build 8 or App Review readiness pass.

## Phase 2 Creator Studio navigation-shell lane

- EXPECTED_SOURCE_FILES=`pluggd-mobile/src/features/studio/StudioScreens.tsx`; `pluggd-mobile/src/features/studio/studio-data.ts` only if required; focused Studio navigation tests/scripts only.
- REQUIRED_SOURCE_ASSERTION=The leading Studio control opens a native section menu and does not push `/studio/apps`.
- REQUIRED_ROUTE_ASSERTION=Every exposed menu destination already exists as a working native Studio route/screen.
- REQUIRED_PRESERVATION=Existing Studio bottom dock, Home, Discover, font, and unrelated routes/layouts remain unchanged.
- REQUIRED_COMMAND_CHECKS=TypeScript and focused Studio navigation tests/scripts.
- REQUIRED_RENDERED_CHECK=Fresh authenticated Studio evidence on the existing Simulator when reachable; otherwise record authentication as a blocker and stop.

## Phase 2 results

- SOURCE_BEHAVIOUR=PASS. The leading control opens a native modal section menu and contains no direct Apps navigation.
- MENU_MODEL=PASS. It follows role-enabled Studio modules, excludes `web_only` and route-less entries, deduplicates paths, allowlists existing native route paths, and excludes Studio Apps.
- DOCK_PRESERVATION=PASS by focused contract. Apps remains `/studio/apps` in the unchanged bottom dock definition.
- ROUTE_EXISTENCE=PASS by focused contract for every allowlisted destination family.
- TYPESCRIPT=PASS via `npx tsc --noEmit`.
- FOCUSED_CONTRACTS=PASS: native navigation shell; Studio web parity; account/Studio navigation.
- DIFF_HYGIENE=PASS via scoped `git diff --check`.
- RENDERED_AUTHENTICATED_SIMULATOR=BLOCKED. `xcrun simctl list devices` reported no booted Simulator and no iPhone device/runtime; no build, boot, install, or auth mutation was authorised.
- RELEASE_CLAIM=NOT MADE. This is not a Build 8 or App Review readiness pass.

## Phase 1 evidence

- Branch: `codex/ios-carnival-live-review-v5`.
- Worktree: `/Users/apple/pluggd-mobile-workspace`.
- HEAD at attribution snapshot: `366186538e59f40604f96a954970ed021df93913`.
- Pre-record status: 164 entries, comprising 55 modified and 109 untracked paths.
- Permitted change surface: `.ai/ACTIVE_TASKS.md` and `.ai/tasks/ios-native-parity-build8-recovery/*` only.

## Not run by design

## Phase 8J Native Published Lyrics Verification (2026-08-17)

- [x] Studio data loads the existing owner release's `lyrics` value.
- [x] Release workspace shows Add published lyrics / Edit published lyrics without a public route detour.
- [x] Multiline editor save updates `releases.lyrics` only for selected release ID plus authenticated `user_id` and verifies the returned row.
- [x] Empty lyrics cannot silently publish or erase lyrics.
- [x] Focused Studio contract, `npx tsc --noEmit`, scoped diff hygiene and authenticated Simulator editor-open proof pass.
- [x] No invented lyrics or production data mutation occurs during verification.

Actual result: PASS. Final source checks passed and the real Echoes release opened the complete native editor at `/tmp/pluggd-native-studio-published-lyrics-editor-final.png`; no lyrics were entered or published.

- No app build, bundle, archive, installation, or dependency change.
- No rendered Simulator, iPhone, iPad, or browser QA.
- No Supabase/storage/production checks or mutations.
- No App Store Connect, upload, review, or submission work.

`FINAL_STATUS` records the completed authenticated and compact current-source Simulator integration gate with nine explicit external-state/device blockers, zero pending rows and zero concrete failures. It is not Build 8 archive/upload/App Store approval; consequential release actions remain separate and require human approval.
# Phase 16 physical playback and typography correction

- [x] Carnival Hub section titles match the established Home section hierarchy without changing Carnival content or routes.
- [x] Expanded player shows a working ordered release tracklist only when the current release has more than one playable track.
- [x] Expanded and mini-player progress rails support tap and drag seeking with a visible thumb.
- [x] Listening Room tonearm seats on the outer groove, follows playback toward the centre and supports direct drag seeking; its waveform rail also supports tap and drag.
- [x] BeatPlug hero has no orange gradient, Play all has premium spacing, and the Listening Bench waveform supports tap and drag seeking.
- [ ] Community header avatar remains fully visible on physical-device safe-area insets. Source geometry passes; authenticated physical/founder render pending.
- [ ] Account menu restores the direct top-right appearance toggle while preserving its established item order and all existing account actions. Source and TypeScript pass; signed-in founder render pending.
- [ ] A signed-in user sees their own non-deleted posts in For You even when moderation hides them publicly, so owner deletion remains reachable. Owner-aware source path passes; authenticated founder interaction pending.
- [x] Focused source assertions, TypeScript and scoped diff hygiene pass; stale aggregate assertions are recorded separately and do not describe regressions in this phase.
- [ ] Exact-current Simulator evidence is founder-reviewed before any replacement phone build.
# Phase 17 Build 13 phone candidate and App Store resubmission

- [x] Founder approves the exact Phase 16 Simulator state and authorises Build 13 phone installation and submission preparation.
- [ ] iOS build authority is exactly 13 while Android versioning remains unchanged.
- [ ] Reviewed staged manifest contains only authorised Phase 16 source, Build 13 metadata/review documents and task records; `.env`, `.playwright-cli`, secrets and derived artifacts are excluded.
- [ ] One local reproducible commit is created and identified before any device build.
- [ ] Development-signed Release build validates as `com.pluggd.mobile` `1.0.0 (13)` with exact team, signature and embedded bundle hash.
- [ ] Exact Build 13 candidate installs, launches and reads back on the paired iPhone.
- [ ] A separate Build 13 content-rights PDF preserves the supplied document's substantive content and visible signature, changes only stale build references, renders cleanly and has its signature state reported truthfully.
- [ ] Distribution archive/export/upload provenance matches the committed Build 13 source and Apple finishes processing it as valid.
- [ ] App Store Connect selects Build 13 and retains the complete correct IAP set, reviewer credentials/tester access, privacy/age answers, review notes and Guideline 2.1 response.
- [ ] Founder's current Build 13 physical recording and the authorised Build 13 rights statement are attached and finish processing.
- [ ] Final Submit for Review occurs only after all current evidence is present and any Apple legal/Account Holder confirmation is explicitly surfaced.
