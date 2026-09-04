# iOS Native Parity Build 8 Recovery Contract

## Phase 21 Build 13 platform-plan production entitlement gate — 2026-08-28

Apply only `20260828132900_add_starter_subscription_tier.sql` and `20260828133000_pluggd_platform_plans_apple.sql` to linked production project `qkwvqmubhyondemhasjp` through targeted migrations; the divergent checkout migration history forbids `supabase db push`. Deploy only `validate-iap-receipt`, `apple-server-notification`, `check-subscription` and `stripe-webhook` from the accepted Phase 18 source, including their shared `applePlatformPlans.ts` dependency. Preserve every other schema, function, subscription, membership, credit, product and payment surface.

Preconditions are the passing focused platform-plan contract and diff hygiene; all six Apple products plus the `PLUGGD Creator Plans` group staged Ready for Review; production presence of `subscription_tier`, `user_subscriptions`, `platform_promo_entitlements` and `iap_transactions`; and a read-only migration check proving broad push unsafe. Verify exact product catalogue rows, RLS/client read-only grants and deployed function availability after the change. Rollback is function-version redeployment plus deactivating the six provider catalogue rows and server-side Apple entitlement handling; never delete purchase/audit rows or erase an existing Stripe/promo entitlement. No sandbox purchase, phone build, archive/upload or App Review submission is authorised by this deployment gate.

## Phase 19 Build 13 compact Events filters — 2026-08-28

Replace only the oversized expanded When, City and Genre chip rails on native Events with one compact, premium three-field dropdown row. Each field must expose its current value, open one accessible option menu at a time, preserve selected-state truth and close after selection. City options come from every unique non-empty city in the currently loaded eligible event catalogue for the active normal/Carnival experience rather than a hand-maintained shortlist; When and Genre retain their existing truthful sources and filtering semantics.

Preserve the Search/Map/Reset row, text search, category rail, date/city/genre query behaviour, active-filter count, result count, zero-result recovery, Event Spotlight, Carnival curation, map and every event route/action. This is a contained Events presentation change in `pluggd-mobile/src/features/editorial/EventsBoardScreen.tsx` plus its existing focused Events contract and task records. No production data mutation, Apple/App Store action, phone build or unrelated Events redesign is authorised.

Acceptance requires the focused Events discovery contract, mobile TypeScript, diff hygiene and an exact-current compact Simulator render showing the closed dropdown row and one open option menu without clipping.

## Phase 18 Build 13 PLUGGD platform-plan contract — 2026-08-28

Build 13 must make PLUGGD's own Free, Starter, Creator and Pro tiers visible and usable without conflating them with fan memberships purchased from individual creators. Add a native `PLUGGD Plans` destination, a prominent current-plan/upgrade surface in Creator Studio and an Account entry available across the app. Existing `Memberships` remains the place for creators a fan supports.

Starter, Creator and Pro ship as monthly and yearly Apple auto-renewable subscriptions in one separate `PLUGGD Creator Plans` subscription group. Permanent product IDs are `com.pluggd.mobile.plan.{starter|creator|pro}.{monthly|yearly}` with Pro at level 1, Creator at level 2 and Starter at level 3. The native app displays only Apple's localized price/period and never sends a digital-feature buyer to Stripe or the web. Free has no StoreKit product. GBP business targets are £4.99/£49, £12.99/£129.90 and £29.99/£299.90 with 12.5%, 5% and 0% commission; Free is 20%.

The effective entitlement is `public.user_subscriptions`, shared with the current web/Stripe implementation. Client roles must be read-only; paid mutations are service-role only. A server-owned provider-product catalogue resolves tier and cycle by product ID rather than price amount. Apple receipt validation must verify the signed StoreKit 2 transaction, exact product, bundle/environment and `appAccountToken` before activating a tier. Restore and server notifications update the Apple lifecycle fields and run the same highest-valid-tier reconciler used by Stripe, admin and promotional access. Neither provider may erase the other, and paid access must preserve/bank Founding Creator or access-code value.

Do not alter creator membership groups/products, `fan_subscriptions`, credit packs, gifts, releases, beat licences, tickets or physical commerce. Do not hard-code GBP fallback prices into purchase buttons, expose internal/provider copy, create fake purchases, or add a web-checkout escape. A missing App Store product is a clear unavailable state. Existing web-paid users retain access and receive truthful management guidance without an external purchase CTA.

Acceptance requires focused source contracts, TypeScript/Deno syntax, scoped diff hygiene and exact-current rendered Account, Studio and Plans states in both semantic themes or one recorded environment blocker. A new phone build, production deployment/migration, Apple product creation, archive upload and submission remain later explicit gates.

## Phase 15 Build 12 commit and physical-candidate contract — 2026-08-28

The founder has accepted the assembled Build 12 Simulator candidate for a controlled source freeze and connected-phone install. Commit only the task-owned Build 12 app, backend-function source, focused contracts and task records already present in this worktree. Preserve the modified local `pluggd-mobile/.env` and temporary `.playwright-cli/` state unstaged and untouched. Review the exact staged manifest and cached diff hygiene before committing.

Build one development-signed Release `iphoneos` app from the resulting exact commit using the existing `Pluggd.xcworkspace` and `Pluggd` scheme, with the established command-only `ENTRY_FILE=index.js` recovery if required. Identify the connected iPhone before install; record the commit, artifact, bundle identifier, version/build, signing, device identity/OS, install, launch and installed-app read-back. This gate proves packaging and launch only; the founder performs camera, microphone, host re-entry/removal, Community deletion, commerce/navigation and seasonal UI checks on the physical device.

No push, merge, production deployment/mutation, migration/function deployment, archive, IPA upload, App Store Connect edit, reviewer reply or Submit for Review is authorised. The pre-commit base, preserved prior workspaces/Build 11 source and prior signed phone build remain rollback authorities.

## Original Live feature parity contract — 2026-08-28

Native Live must retain its complete working broadcast room while restoring the separate Battles product that the original web/product contract defines. Battles is not another Agora room mode: it is a dedicated tournament arena backed by the existing `battles`, `battle_entries`, `battle_rounds`, `battle_matchups`, `battle_votes` and `battle-audio` contracts. Live navigation and creation must make that distinction clear.

The arena provides real live/upcoming/results discovery, a featured battle presentation, entry submission with titled audio, tournament rounds/matchups, leaderboard and one-vote-per-matchup behaviour. It must use current authenticated data, real loading/error/empty/success states and the established premium native visual language. The former native Community redirect is removed. Web defects are not parity requirements: do not expose a dead battle-detail link, unrestricted Create Battle action or unsafe round advancement where current database authority does not support it.

The wider original Live matrix is explicit. Native already preserves camera/audio broadcasting, chat, reactions, gifts, stage and participant controls, recording/captions/restream controls, moderation, sharing and owner re-entry. Web session files, shared notes and timestamped feedback may be added only where current room foreign keys and RLS prove a production-safe working path. Screen share remains absent until a complete ReplayKit-capable implementation exists. No dummy control, provider/internal copy, speculative schema, production mutation or broad Live redesign is permitted.

The exact Phase 14 `PROGRESS.md` manifest controls edits. Focused source contracts, TypeScript, diff hygiene and an exact-current Simulator install precede founder review. The existing no-phone-build gate remains unchanged.

## Creator Studio upload parity and semantic-theme contract — 2026-08-28

The complete native Creator Studio creation family must preserve its premium native presentation while matching the current working web/data contracts for each content type. Release creation covers format, primary and subgenre, native date selection, language, label, repeatable featured artists and full repeatable production/writing credits, engineering credits, multiple titled tracks, artwork/audio, explicit/instrumental, ownership and AI disclosure. Beat creation covers descriptive metadata, tags/moods/instruments, master/artwork/stems/tagged files, all four priced licence choices and the existing exclusive-rights authorisation rule. Mix creation follows the existing real native owner schema because the current web tree has no separate Mix builder: genre/mood tags, recording context, event/city, BPM range, timestamped tracklist, access/download intent and private draft. Soundboard creation accepts and persists an optional first real audio item and title alongside its existing canvas identity, cover, template, access and comment controls. Video remains an optional addable Studio app: creators who add it can upload or link real video, keep drafts private, publish, and choose creator-profile featuring. Live exposes a PLUGGD TV destination that reads only eligible published/featured catalogue records; private creator drafts are never public and the existing video persistence is extended rather than duplicated.

All creation actions remain authenticated, real and compensating: files and rows created by a failed transaction are removed only when they belong to that attempt, and successful creation produces private/unpublished catalogue state. There are no dummy controls, fake media, silent failures or schema/RLS changes. Publication, membership-gating configuration and production verification remain in their existing owner workspaces unless already supported by the same creation contract.

Studio theme behaviour is shared rather than patched by screenshot. Adaptive light surfaces use semantic dark title/body tokens; fixed white text is allowed only on explicitly dark artwork/media. More tiles use the existing native glass surface without the decorative gradient/glow layer in Night, and primary upload actions use a restrained premium surface rather than a large orange slab. Existing routes, tap targets, dock, permissions and data remain unchanged.

## Phase 13 Build 12 release-candidate corrections contract — 2026-08-27

Build 12 replaces the paused candidate with five bounded corrections. Native Live must provide a video-first Green Room before broadcast, explicit permission/retry states, camera/microphone preview and controls, microphone level, camera flip, honest audio routing and a distinct final Go Live action. Scheduled owners return through the Green Room. In-session owners receive persistent working camera, microphone, flip, audio-route, Manage and End controls plus the existing recording/captions/restream/stage facilities. Existing advanced native/Agora capabilities may be exposed only when completely functional; no visible placeholder or unsupported control is permitted.

Host identity is server authority. Room ownership always resolves to host regardless of route parameter, while only currently approved collaborators may receive non-owner publisher privileges. A client request for `host` or `collaborator` can never create authorization. Leaving a running broadcast preserves the host role, and every owned active-session entry point reads `Return as host`, not `Join Room`.

Live removal is owner-only and non-destructive to financial/audit evidence. Active rooms must end media/recording/restream state before public removal; scheduled/ended rooms may be removed directly. Public discovery/re-entry excludes removed rooms, but tickets, ticket purchases, credit gifts, recordings and moderation/audit history remain retained. The current cascading hard-delete path is forbidden for this feature.

Community owners receive Delete post in feed and detail menus and never see Report/Block against themselves. Deletion is authenticated, owner-scoped, soft and acknowledged before feed/detail invalidation. Failure leaves the post visible with retryable feedback. Attachments remain retained until exact ownership/reference safety is independently proven; comment deletion is outside this contract.

Carnival retains its accepted content, imagery, routes and identity while replacing hard-coded desktop-sized mobile headings with the established native hierarchy. Body Dynamic Type remains supported; only display headings receive bounded scaling to prevent destructive layouts. Verification covers normal and Large Text compact/large rendering.

The founder's current phone review expands this same candidate with seven bounded repairs. Store must present comma-delimited legacy colour values as separate accessible choices while server checkout validates each token against one trusted inventory row. Normal Event Spotlight remains strictly admin-authoritative: removing one `featured_event` row advances to the next eligible curated event in admin order, active Carnival takeover events are skipped to avoid duplication, and the section hides only when no eligible curated event remains. Event Map must prefer linked venue coordinates or UK-qualified fallback geocoding instead of fitting ambiguous foreign results. Only the Community internal switcher becomes sticky; Stories and content continue scrolling. Normal and Carnival article readers expose an explicit THE PLUG route. Live category cards use bounded square geometry rather than percentage/aspect feedback. The large Night player transport is contrast-safe. Creator membership cards retain bottom padding while adding clear feature-to-CTA separation.

The founder's final pre-package additions are also bounded: onboarding date of birth uses a native selector with a human-readable value and unchanged minimum-age enforcement, never a typed date-format field; and the complete main-dock icon/dot/label row is optically centred within the full safe-area-aware dock without changing routes, tap targets or reserved content clearance.

The final Events/Connect Card review adds one bounded visual lane. Event Spotlight keeps its restored admin-authoritative selection and complete card behaviour while its `EVENT SPOTLIGHT` badge returns to the earlier upper-card anchor. PLUGGD Studio Connect Card must use semantic dark ink on its light solid feature panels, restrained solid premium surfaces rather than orange gradients in dark mode, no unconditional verification tick over the owner avatar, and a clear but neutral outlined `Start setup` action rather than a full orange slab. Card copy, routes, imagery, profile data and all working actions remain unchanged.

The Create hub remains reachable from the account menu and must retain normal global navigation. Its existing creator actions, content hierarchy and bottom dock remain unchanged, while the standard compact PLUGGD top header supplies Home, Live, Search, Notifications and the account/avatar menu. The content starts below that header with deliberate clearance; no action route or creator permission behaviour changes.

The final Simulator review adds three narrowly bounded corrections. Event detail titles must use semantic theme ink in Editorial Light while retaining Night contrast and the existing orange final-word treatment. The existing Carnival lifecycle remains authoritative: the Events takeover is visible through its 7 September wind-down, then the normal Events experience replaces it; Home and Discovery seasonal promotion expire through their existing campaign/fallback gates, while the direct guide remains available as an archive. Customer contact must no longer be buried inside Privacy & Safety: the account menu and Settings expose a clear Help & contact route with visible `support@pluggd.fm`, a working email action and the established Help Centre/legal destinations.

The founder's final Listening Room visual correction is limited to the portrait record deck's tonearm geometry. Preserve the accepted 270-point platter, label artwork, grooves, pivot, deck card, signal meters and working play/pause/stop behaviour. Against the supplied real-turntable reference, the parked arm must remain completely within the deck, settle beside the platter in a credible near-vertical rest position and never clip the card or screen. When playback engages, the same animated arm swings inward with a deliberate elbow bend and places the headshell over the outer groove; it must not read as a straight floating bar. Paused/stopped and playing states require same-viewport Simulator evidence before founder approval resumes.

The founder's next Simulator findings are limited to two regressions. The Settings Appearance selector must occupy the complete content width as three equal columns, with each icon, label, detail and selection mark centred on one shared axis. The Listening Room close control must keep ordinary back-stack behaviour but fall back to the Mixes route when the room was opened directly and no back destination exists; it may never remain visibly tappable as a no-op.

The founder rejected the recorded Appearance v2 proof because the render still shrink-wraps each choice around its content: the three choices are spread across the row, but their actual control widths and internal icon/text axes are not equal or centred. The corrective authority is layout-only: replace the runtime width calculation with three structural equal-width slots, make each Pressable fill its slot, keep one-line centred labels/details and preserve theme switching, radio semantics, copy, selection styling and every surrounding Settings element. The prior v2 screenshot and pass claim are invalid evidence and must be superseded by an exact-current v3 before/after comparison.

The founder's exact-current v3 review preserves the corrected equal-column selector but rejects the remaining Settings vertical hierarchy. Remove the decorative `Everything yours, in one place.` headline, retain `ACCOUNT CONTROL`, keep the original `identity` meaning in a genuine one-line management summary, and tighten only the header-to-Appearance and Appearance-to-settings rhythm so useful controls begin higher and the remaining page follows upward. Compact the complete Appearance choice rail to approximately the existing compact Stories rail's 90-point footprint while retaining the icon, one-line label, short detail, selection state and full-width equal tap areas. The space from the bottom of that rail to `YOUR PLUGGD` should match the deliberate compact interval between the `APPEARANCE` label and the rail rather than opening a second oversized gap. Do not introduce a redundant top bar: place the smaller visible back control and a clearly legible compact-title-scale `ACCOUNT CONTROL` in one row nearer the safe-area edge, retain an accessible 44-point back target, mathematically centre the title using an equal right-side spacer, and centre the one-line management summary immediately below that row. All five `YOUR PLUGGD` rows, including the complete Tickets row, must clear the dock at the 375 x 667 compact viewport using 62-point targets; taller devices such as the founder's 430-point-wide phone retain the established premium 68-point row spacing. The back behaviour, selector semantics/behaviour, three shared horizontal axes, setting copy/actions, routes and dock clearance remain unchanged.

The founder's current My PLUGGD review reopens only that screen's header/feed control and the shared social-card destination presentation. At compact width, the eyebrow and account actions form one clear top row while `My PLUGGD` and its concise supporting line each receive the complete content width and remain on one line. The For You/Following choice becomes one equal-width accessible tab control rather than two competing CTA pills, with no feed-query or remembered-mode change. `global_feed` and `user_profile` remain internal distribution records but are not rendered as post-card destinations: they merely repeat the current Community surface or expose a non-working Profile chip. Real linked destinations such as a board, creator community, release, beat, mix or event remain visible and actionable.

The founder's final Community media findings are limited to expanded-post and fullscreen caption presentation. The `/post/[id]` expanded post follows the supplied X reference: only the author row reserves the avatar column; caption, destinations, media and actions then begin at the normal screen margin and use the complete available width. Single-image expanded posts preserve the source aspect ratio with complete-image rendering rather than cropping. Feed-card geometry and multi-image grids remain unchanged. The fullscreen viewer follows the same top-flow author/meta, caption, then media hierarchy: the caption begins after the header and sits immediately above the rendered image/video frame rather than leaving a large unused avatar/content rail or remaining pinned to the screen bottom. The collapsed caption must show no more than two complete lines with a tail ellipsis and expose an accessible `more` action when the measured caption exceeds that limit. Pressing the caption or `more` expands the full copy in-place; long expanded copy remains bounded and scrollable rather than consuming the media stage, and `less` restores the two-line state. Opening another media item resets to collapsed. Gallery dots remain immediately below the media. Media loading, pinch zoom, video controls, gallery arrows/dots, author/meta copy, close behaviour, stored post content and reply/business behaviour remain unchanged. This is a bounded hierarchy correction, not authority to add a new reply/action route. Exact edit authority adds only `pluggd-mobile/src/features/culture/MobileSocialMediaViewer.tsx`, the thread variant in `MobileSocialPostCard.tsx`, `/post/[id]` outer spacing, focused evidence and task records.

The Community-only compact return rail moves upward by approximately half of its current header gap while preserving the top navigation geometry, avatar clearance, complete 36-point compact return row, working back arrow, rule and every non-compact/shared-header consumer. Hide only the redundant `BACK TO DISCOVERY` label on Community so the rule begins beside the arrow; all non-compact consumers retain their complete labels. This adds only the existing compact style in `DiscoveryHeader.tsx`, the bounded optional-label presentation in `DiscoveryReturnBar.tsx` and focused evidence.

On the Community Feed only, remove the generic 14-point list interval between the compact Stories header and the sticky internal navigation, then lift the Stories header 3 points toward the return rule without clipping its ring or label. The sticky Community dock, feed-filter rail and timeline row use the bottom dock's established 10-point outer guide; reduced filter gaps keep all five filters on-screen, and the timeline avatar-to-body gap reduces from 11 to 8 points. Preserve the approved 16-point expanded-thread shell, sticky behaviour, later feed-row spacing and all non-Feed tabs. This adds only the Feed list/header/filter styles in `CommunityFeedScreen.tsx`, the existing dock shell in `CommunityInternalSwitcher.tsx`, the timeline styles in `MobileSocialPostCard.tsx` and focused evidence.

These additions do not authorise catalogue/event data rewriting or broader redesign. Store token support is backwards compatible and reserves the canonical trusted option row. Event curation remains admin authority. Map coordinates are never fabricated. The article Back action and existing reader fallback remain intact. Every visible action must work with honest loading, success and failure states.

Allowed files and consequential boundaries are exactly the Phase 13 `PROGRESS.md` manifest, expanded only by `pluggd-mobile/app/events/[id].tsx`, `pluggd-mobile/components/AccountMenuButton.tsx`, `pluggd-mobile/app/settings/index.tsx`, the new focused `pluggd-mobile/app/support.tsx` route, dedicated-header ownership in `pluggd-mobile/src/lib/appChromeVisibility.ts`, the Create hub's header clearance in `pluggd-mobile/src/features/culture/CultureScreens.tsx`, the bounded portrait-deck implementation and reliable direct-entry close fallback in `pluggd-mobile/app/mixes/[id].tsx`, the bounded My PLUGGD header/feed control in `pluggd-mobile/src/features/mypluggd/my-pluggd-screen.tsx`, the destination presentation only in `pluggd-mobile/src/features/culture/MobileSocialPostCard.tsx`, `pluggd-mobile/design-qa.md` and task records for these final corrections. Source/security/render gates precede the authorised phone install. Production migration/function deployment, archive/upload, App Store changes and final submission remain separately recorded gates.

## Phase 12B Carnival curated Featured plans repair contract — 2026-08-26

Preserve the chronological Carnival Top Pick, Full Programme and All Carnival Events board. Carnival `Featured plans` must instead respect the existing `featured_event` query's admin display order: retain only currently eligible Carnival events, remove the Top Pick and duplicate IDs, and use the chronological eligible collection only to fill uncurated remaining slots up to the existing six-card limit.

The repair must make `City Splash: Carnival Warm Up Party` (`97409057-97fd-4190-99b8-eef633d58bfa`) eligible to appear in its existing fifth curated position without changing admin, production or event data. Exact edit authority is `EventsBoardScreen.tsx`, one pure focused resolver under `src/features/events`, one dedicated contract under `scripts`, and these task records. Compact and large rendered Carnival evidence showing City Splash plus focused/type/diff checks are required before the final phone-candidate gate resumes.

No admin/backend/production mutation, phone build/install, purchase, Git integration, deployment, archive/upload, App Store Connect action or submission is authorised by this repair.

## Phase 12 Apple pre-submission audit contract — 2026-08-26

Before another physical-phone build, perform one current App Review audit against Apple's official requirements and the founder-supplied Guideline 2.1 Information Needed rejection. This is an evidence and release-safety phase, not permission to redesign the completed product or repeat accepted visual audits.

The audit must classify 2.1 app completeness/reviewer access, 1.2 UGC safety, 3.1.1/3.1.2 digital commerce and subscription presentation, 4.2 native utility, 4.3 duplicate/template risk, 4.8 login, 5.1 privacy/permissions/account deletion, 5.6 transparency, 2.3 metadata accuracy and social age rating. It must also inventory the review recording, tested devices/OS versions, app function/audience/value, access credentials/instructions, external services, regional differences, protected-material rights and every IAP product/location requested by Apple.

Use current official Apple documentation as rule authority, then exact current integration source/configuration, existing App Review documents, authenticated read-only App Store Connect values and current Simulator/device evidence. Preserve the accepted app, dirty worktree and page-specific design decisions. Do not create dummy review paths, hide useful functionality, invent credentials, perform purchases, fabricate backend proof or claim physical evidence from source.

During the audit, only task records may change. Product/source fixes require a recorded finding, exact allowed-file manifest, rollback, focused checks and `CODE_EDIT_ALLOWED=true`. No App Store Connect save/reply, reviewer-account or production data mutation, report/block/account deletion, purchase, final phone build/install, Git integration, deployment, archive/upload or submission is authorised without its own explicit gate.

The audit output is a precise blocker/risk ledger, App Store Connect manual checklist, draft Review Notes and GO/NO-GO verdict. GO requires every release blocker to be fixed and retested on the final physical candidate; archive/upload/submission remains a later founder approval.

## Phase 11G2 Listening Room signal and background playback contract — 2026-08-26

The founder added two physical-device defects to the current correction gate. The portrait Listening Room must again show recognisable L/R deck signal meters, not progress-clamped orange dashes inside apparently blank boxes. The replacement may use real playback state/progress to animate a labelled segmented activity display, but it must not claim access to decoded stereo amplitude that TrackPlayer does not expose. Existing real audio, progress, deck/transport, waveform, save/share, comments and Track ID behaviour remain authoritative.

Music must continue when the user switches away from PLUGGD and expose the existing remote/lock-screen controls. Preserve the registered background playback service and queue/business logic; add the missing iOS `audio` background mode to both Expo and checked-in native build authorities, and explicitly retain TrackPlayer's music playback audio-session category and interruption handling. Android killed-app policy and all live-room microphone/media behaviour remain unchanged.

Edit authority expands only to `pluggd-mobile/app/mixes/[id].tsx`, `pluggd-mobile/app.config.ts`, `pluggd-mobile/ios/Pluggd/Info.plist`, `pluggd-mobile/src/context/PlaybackProvider.tsx`, the narrow Mix/player contracts and the existing Phase 11G manifest. Source/config checks and rendered Listening Room evidence precede another separately approved phone build. Background continuation and lock-screen controls require later physical-device proof and may not be marked verified from source alone.

## Phase 11G shared chrome physical correction contract — 2026-08-26

The founder confirmed the replacement icon and therefore the installed full Build 8 provenance, then rejected two remaining shared-chrome details in physical dark-mode screenshots: the top-right account avatar's accent ring is clipped on Community, Events and Store, and the public dock's icon/label row remains optically top-loaded. This reopens only the shared header avatar clearance and the already-established five-point dock row translation.

Keep the shared header at its established height and spacing, preserve the 44-point account-menu target and route, reduce only the visible avatar from 38 to 36 points, and remove its negative vertical offset. Apply the existing five-point whole-row dock translation in Night/System-dark as well as Editorial Light. Do not change dock height, safe-area reservation, routes, targets, selected state, mini-player clearance or page composition.

Only `pluggd-mobile/components/MobileHeader.tsx`, `pluggd-mobile/components/liquid-glass/GlassDock.tsx`, narrowly necessary focused assertions and the existing task records are edit-authorised. Compact/large Night renders of the supplied page family and an Editorial Light regression render must precede another explicitly approved phone build. No aggregate rerun, phone build/install, Git integration, production mutation, deployment, archive/upload, App Store action or cleanup is authorised by this correction.

## Phase 11F final app icon and connected-phone rebuild contract — 2026-08-26

The founder approved the complete rendered app and supplied the final submission icon. Replace only the canonical Expo iOS icon and current native AppIcon build input with the exact supplied artwork at Apple's required 1024×1024 opaque PNG format. Do not redesign, recolour, crop or substitute it, and do not alter Android adaptive, notification, favicon, splash or in-app brand assets.

After icon equivalence and focused validation, run the single deferred aggregate mobile gate once, then create, install and launch the development-signed Release build on the already connected paired iPhone. A successful phone build is not an App Store archive/submission pass. No archive, upload, App Store Connect submission, production/backend mutation, purchase, Git integration, deployment or cleanup is authorised.

Exact edit authority is `pluggd-mobile/assets/icon.png`, `pluggd-mobile/ios/Pluggd/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`, narrowly necessary icon verification support, stale exact assertions in the two account contracts plus the Community, Discovery polish, Home destination, global-shell and `pluggd-mobile/scripts/verify-mobile-ios-v5-contract.mjs` contracts discovered by the one aggregate invocation/tail continuation, and this task's records. These assertion updates may recognise only already-approved Phase 11C/11D/11E source semantics; no account, Community, BeatPlug, shared-header/player or Live product source change is authorised.

## Phase 11E Mapbox restoration and role-correct full-screen Live contract — 2026-08-26

The founder accepted Phase 11D and supplied current physical-device evidence for one final bounded lane. Mobile must again receive the existing public Mapbox token so current event locations geocode into the already-implemented map. Live must preserve PLUGGD's real Agora/chat/gifts/stage/moderation/follow infrastructure while adopting the interaction hierarchy users expect from mature full-screen live-video products; this is not authority to copy proprietary branding, ranking, rewards or unrelated TikTok surfaces.

1. Add the existing public web Mapbox value only as `EXPO_PUBLIC_MAPBOX_TOKEN`: ignored `.env.local` for this exact local worktree/device candidate and the existing EAS development/preview/production environments for durable cloud builds. Preserve unrelated tracked `.env` credentials. Never print the value in task records, logs or chat; do not expose a build-only Mapbox download secret.
2. Prove Expo configuration reports Mapbox runtime configured, the geocoder receives the public token and at least one real current event produces a rendered map point. Do not fabricate a pin or mutate event/location data.
3. Derive host/fan composition from the resolved room host and stream role. Host UI must not offer Report/Block, Gifts, Follow-self or a redundant Like control.
4. Preserve fan Report/Block, Gifts, stage requests, sharing and comments, but place these as lightweight bottom interactions beside the composer instead of boxed right-rail cards.
5. Preserve tap-on-media heart reactions and their realtime broadcast/floating feedback. No visible Like button is required.
6. Make the real creator avatar/name a clear top-left action. Its sheet uses current profile data, offers real follow/unfollow only to non-host viewers and opens the established public creator route.
7. Keep latest realtime comments over the media above the bottom composer, with clear names and readable text, while retaining blocked-user filtering and database-backed send/error handling.
8. Retain host Manage/Mute and their existing runtime/stage controls in the bottom interaction cluster; retain close/leave/end semantics and accessibility targets.
9. Preserve Agora lifecycle, audio-room variant, gifts/credits/idempotency, wallet refresh, stage RPCs, room updates, session ending, moderation, auth and Reduced Motion.
10. Render compact and large creator/fan states, populated/empty comments where practical, opened creator sheet, tap-like feedback and populated Events Map before any replacement phone build.

Only ignored `.env.local`, `eas.json`, `src/screens/LiveSessionScreen.tsx`, one focused contract and task records are authorised. No production/backend/schema/data mutation, purchase/gift/follow/report during QA, dependency, aggregate rerun, Git integration, physical build/install, deployment, archive/upload or App Store action is authorised before the founder's visual gate.

## Phase 11D Creator Studio physical-phone cleanup contract — 2026-08-26

The founder approved a bounded visual and information-architecture correction after reviewing physical-phone screenshots 1250-1260. This does not reopen Studio functionality or any previously approved public surface.

1. Studio Home KPI and zone cards and More module cards use the established native liquid-glass system with theme-aware neutral material in Editorial Light and Night. The rejected white-to-black and orange-to-black card gradients are absent; orange is limited to meaningful icons, selected states, chips and actions.
2. Home `Next Up` renders each incomplete task once by stable task identity. The calculated next move remains first and the same setup task cannot appear again with another icon.
3. Insights uses semantic theme colours for headings, range/trend tabs, metrics, chart/axis labels, audience cards, empty/error/loading states and supporting copy. Editorial Light contains no white-on-cream content.
4. Settings presents System, Editorial Light and Night as one compact, legible three-choice control with integrated selected state and accessible radio semantics.
5. The creator account sheet exposes an Appearance shortcut immediately above Settings, without adding a Studio dock destination.
6. Restore Purchases is removed as a separate account-sheet row and remains truthfully available inside Purchases & Access. No StoreKit, credit, membership, receipt or entitlement behaviour is weakened or duplicated.
7. Creator account rows are ordered by creator identity/work, money/access/content, then communication/account controls; Sign out remains last. Existing destinations and creator/role conditional behaviour are preserved.
8. Focused source checks and compact/large Editorial Light and Night rendered evidence precede any aggregate rerun or replacement phone build. No commit, push, merge, production mutation, archive/upload or App Store action is authorised.

Exact product ownership is limited to `pluggd-mobile/src/features/studio/StudioScreens.tsx`, `pluggd-mobile/app/settings/index.tsx`, `pluggd-mobile/components/AccountMenuButton.tsx`, `pluggd-mobile/app/purchases.tsx` only if restore consolidation requires it, narrowly related focused assertions, and this task's records.

## Phase 11C physical-device visual-parity regression recovery contract — 2026-08-26

### Recovered founder decision hierarchy — current task plus `Orchestrate PLUGGD release recovery`

This hierarchy was reconstructed after the physical Build 8 regression report. It supersedes blanket uses of “parity” and prevents one page's rule being applied to another page.

1. **Homepage composition** — Preserve the newer founder-approved native Homepage design. Homepage parity means complete current web content, data, curation, routes and behaviour inside that design, not cloning the web layout. Keep Featured Track and add Moving Now as a separate module above Four Worth Your Time; never replace one with the other. Preserve the intentionally compact mini-player.
2. **Homepage named exceptions** — The first Carnival feature and the Carnival Hub itself use direct current mobile-web visual/copy/hierarchy authority. The feature copy is exactly `The PLUGGD Carnival Guide`, `Find your sound. Plan the road.`, the approved body, and `Open the Carnival Hub`. Featured admin slots, Happening Now, THE PLUG artwork, Opportunities, Soundboards, Scenes and Next Wave must use real current data and exact destinations; a query/routing failure may not be “fixed” by hiding the module.
3. **Discovery composition** — Preserve the newer founder-approved native Discovery design and seasonal Carnival slot. Discovery parity means current web content/capabilities/data, not a web layout clone. Carnival retains its feature artwork; permanent destination art must fit its card. Navigation precedes general discovery modules, with at most the seasonal Carnival feature above it. Do not add Maps or Library: Maps belongs to Community and Library to the account menu. Do not duplicate Store/New Goods. Back navigation must return to this one current Discovery implementation, never a dormant older screen.
4. **Opportunities** — Preserve the accepted native Opportunities design. Repair only completeness, artwork resolution, bounded cards, wrapped titles, data, forms, routes and behaviour.
5. **Releases and Listening Floor** — Direct current mobile-web visual, structural and functional parity is required. Preserve the real record/sleeve listening-deck product, current section order, progress, multi-track playback, lyrics, saves, credits-first pricing and detail routes. Do not substitute a giant player, obsolete orange emphasis or an invented native floor.
6. **Mixes and Listening Rooms** — Direct current mobile-web visual, structural and functional parity is required. The index must include What's happening, Listening rooms, Rising DJs, New & notable, Scene explorer, PLUGGD radio, events/editorial and a Back to Discovery path. The opened portrait Listening Room must be the turntable/record-deck product with moving vinyl/tonearm, real progress, waveform/VU state, transport, Save, Share, Request ID/Track ID, tracklist, room pulse/comments and timestamp journeys where backed by existing data. A landscape-only waveform page or generic detail stack is not the accepted room.
7. **BeatPlug** — Direct current mobile-web visual, structural and functional parity is required. The current web audition hero, large artwork rhythm, search/filter controls, BeatPlug picks, compact crate/list browsing, four benefits, cream Beat Bench/record presentation, licences, producers, Soundboards and creator close are the authority. A tiny multi-column artwork grid is explicitly rejected. Preserve real preview, licence, producer and checkout authority.
8. **PLUGGD DJ** — Use the exact approved PLUGGD DJ banner and `Your library. On deck.` promotion. It opens the actual PLUGGD DJ product, never generic creator upload. Creator access uses an explicit gate.
9. **Community** — Stories lead the page. The internal dock is Feed, Boards, raised Post, Explore and Maps in five equal columns; every label is centred under its icon and Post reads as one restrained three-dimensional control, not two circles. Preserve the app-wide dock separately. Thread media opens complete photos/videos and displays canonical creator identity rather than `PLUGGD User` fallbacks.
10. **Creator profiles** — Preserve the founder-selected native profile direction rather than cloning the web layout. Carry over the web profile's catalogue, subscriptions, exclusive content, community, Support, Connect Card and creator customisation. Use a circular avatar, byline in the hero, separate Listen/Follow/Support/Join actions, working non-squashed tabs, creator colours/motion, haptics and subtle motion. Ola Kingdom is the required populated check. Private/gated download assets must never be exposed as public video URLs.
11. **Creator directory** — Lead with real PLUGGD creators and real profile routes. Existing creators such as Ola Kingdom and Ayofe cannot be shown as unclaimed imported artists. Keep catalogue metadata distinct, remove MusicBrainz as a primary public action and avoid plain alphabetical stacks.
12. **Events** — Direct parity with the accepted current web-mobile Events takeover is required for normal and Carnival modes, while preserving the frozen lifecycle/canonical collection. Normal remains default; filters/search, Browse/Map, details and tickets share one collection; compact list, Local Scene, 8+8 board, artwork/date placement, Map back action and PLUGGD typography must match the accepted hierarchy. The permanent Carnival Hub remains after the temporary mode winds down.
13. **Appearance** — Preserve Night plus the approved Editorial Light/System choices. Editorial Light uses cream/paper, near-black text and orange accents with real contrast. Theme work may change semantic colour/chrome only; it cannot reorder, replace or flatten accepted page composition.
14. **Playback** — The compact mini-player size is founder-approved and frozen. Progress must visibly move during real playback. Player work may not expose metadata-only catalogue records as playable or remove deliberate collapse/close safety.
15. **Data and curation** — Public loaders must return the full eligible catalogue, including current THE PLUG artwork/articles and the full event collection. Admin feature flags/ranks must drive feature spots. Happening Now means truly current Live/events, not an upcoming fallback. Creator attribution is canonical everywhere.
16. **Commerce and App Review** — iOS release unlocks display/pay in credits backed by IAP credit packs; creator-set currency remains the web/Studio input and server conversion authority. PLUGGD-owned physical merchandise uses the native physical basket; creator merchandise retains its separate hosted seller checkout. Preserve the reviewed 2.1/4.3, legal, Restore, account deletion, rights and regional commerce boundaries.
17. **Gifts and launch** — Preserve the secure gift wallet/split/cash-out/catalogue/tray work and the native realtime/creator-selected gift-set repair. Only approved transparent Lottie assets may animate overlays. The launch wordmark must remain one-line at large text sizes.
18. **Verification sequence** — Use the current web mobile viewport and exact-current compact/large Simulator side by side. Visual acceptance precedes broad testing. Run only narrow checks while iterating, one aggregate gate after visual stability, and no physical-phone build until the founder has reviewed the Simulator evidence.

The current Phase 11C implementation remains bounded to the physical-device regressions. Completed Home, profile, Studio, commerce, theme, gifting and launch work is preservation context, not permission to redesign or reopen it.

### Authority and failed release gate

The founder's exact Build 8 physical-iPhone review withdraws visual acceptance for Releases, Mixes, BeatPlug, the Discover navigation/PLUGGD DJ promotion, the Community internal switcher and Events typography. The installed binary is current; the failure is in integrated source that mixed obsolete native ports, a section-deleting rail conversion, synthetic promotion/navigation decisions and a one-off Events font override. The candidate is not shippable and Phase 11 release progression is paused.

The accepted web-mobile implementations are frozen visual authorities: `/Users/apple/PLUGGD_NEW/src/pages/Releases.tsx` plus `src/components/releases/floor/**`; `/Users/apple/PLUGGD_NEW/src/pages/Mixes.tsx`; `/Users/apple/PLUGGD_NEW/src/pages/Marketplace.tsx` plus `src/components/market/BeatBench.tsx` and `beat-bench.css`; `/Users/apple/PLUGGD_NEW/src/components/dj/DjAppPromo.tsx`; and the accepted Events web-mobile hierarchy. React/Tailwind is translated through existing native primitives; it cannot replace working data, navigation, audio, licensing, credits, ticketing or lifecycle behaviour.

### Complete numbered plan recorded before product edits

1. **Preserve integration and accepted work** — Patch the current dirty integration tree in place. Do not reset or restore whole files, modify the original rollback worktree, overwrite accepted Home/Profile/Studio/Store/Live/Gifts work or absorb unrelated dirty files.
2. **Keep the compact mini-player intentional** — Preserve the founder-approved small player and its routes/playback/close behaviour; it is not a Phase 11C defect.
3. **Rebuild Releases from the current Listening Floor** — Match the accepted mobile-web hero, deck, browse controls, section order, cards, typography, spacing and full-page rhythm. Remove obsolete orange heading emphasis where current web inherits the heading colour.
4. **Preserve Releases product truth** — Keep public listening, explicit/rights guards, credits-first unlock, owned downloads, saves and detail routes unchanged. No StoreKit, entitlement or backend redesign is authorised.
5. **Restore the complete Mixes world** — Render `What's happening` and `Listening rooms` again in their accepted positions, retain the current Listening Room/deck destination, and keep uploads, scenes, radio, events and editorial content without replacing one module with another.
6. **Repair Mixes controls and content** — Use intentional full-width action geometry, prevent compressed labels, resolve editorial artwork through the established THE PLUG resolver and keep truthful loading/error/empty states instead of black pseudo-thumbnails.
7. **Restore the exact Discover PLUGGD DJ promotion** — Use the approved banner, `PLUGGD DJ for Mac`, `Your library. On deck.`, approved supporting copy and `Explore PLUGGD DJ`; remove `Build the next room` and substitute Mixes artwork.
8. **Restore the approved Discover navigation boundary** — Remove Maps and Library from the Discover world grid. Keep Maps in Community and Library in the user/account menu; preserve both routes and their existing screens without promoting them as discovery content.
9. **Correct the Community switcher visually** — Use five equal icon/label axes and one cohesive raised orange create control whose face, sidewall and shadow read as one 3D button, preserving all destinations and composer behaviour.
10. **Bring BeatPlug to the current web Bench standard** — Translate the Beat Bench/mobile marketplace hierarchy, audition focus, artwork scale, discovery controls, crates/rails and catalogue rhythm so the lower page is not a generic small-card grid.
11. **Preserve BeatPlug commerce and audio authority** — Keep real catalogue loading, previews, BPM/metadata, licences, credits/payment, basket/checkout and detail routes. No fake inventory or alternate purchase path.
12. **Unify Events typography** — Remove the iPhone-only Georgia override and map normal, takeover, Browse, Map and detail roles to one approved PLUGGD font system while preserving lifecycle, canonical collection, filters, 8+8 board, tickets and Hub behaviour.
13. **Verify rendered inclusion, not dormant source** — Focused checks assert Mixes render invocations, absence of synthetic DJ/Maps/Library entries, current Release emphasis, BeatPlug Bench hierarchy, centred Community geometry and absence of platform-only Events font exceptions.
14. **Use real-data visual states** — Confirm populated/missing artwork, long titles, loading/error/empty states and real navigation. A definition, query pass or top-only screenshot cannot close a gate.
15. **Use a visual-first efficient gate** — For each page capture the exact web-mobile reference and same-size native top/middle/bottom or opened state, inspect side-by-side/overlay, correct visible mismatch, then run only its narrow behaviour/source checks. Run the broad suite once after all pages visually stabilise.
16. **Keep approval and release actions separate** — Present compact and large Releases, Mixes/opened Room, BeatPlug, Discover, Community and Events comparison evidence before another phone build. No production write, purchase, Git integration, deployment, archive/upload/submission or cleanup is authorised.

### Exact Phase 11C ownership

Product edits are limited to `pluggd-mobile/src/features/editorial/{ListeningFloorScreen,MixesWorldScreen,BeatPlugScreen,EventsBoardScreen}.tsx`; `pluggd-mobile/app/mixes/[id].tsx` for the explicitly recovered portrait Listening Room; `pluggd-mobile/src/features/discovery/{DiscoveryExperience,publicDestinations}.ts*`; `pluggd-mobile/src/features/community-feed/CommunityInternalSwitcher.tsx`; the one approved PLUGGD DJ mobile asset if absent; narrowly related focused assertions; `design-qa.md`; and this task's records/active row. Existing services, commerce, audio, event loaders, global chrome, player and every unrelated file are frozen.

### Pre-edit gate

Physical screenshots, bundle provenance, exact native sources, frozen web authorities, root causes, allowed files, preservation rules and the visual-first blocking matrix are recorded. `AUDIT_REQUIRED=false`; `CODE_EDIT_ALLOWED=true`; `VERIFICATION_REQUIRED=true` for Phase 11C only.

## Phase 11A final release safety, appearance and creator-directory contract — 2026-08-25

### Authority and audited truth

The founder explicitly authorises a final bounded repair phase before Build 8 archive/submission, with parallel implementation writers where useful. This phase extends—but does not reopen—the accepted Home, Discovery, Creator Profile, Events and Creator Studio designs. The original recovery worktree remains untouched; implementation occurs only in the clean integration lane.

The plan-first audit found: the credits/IAP product model is correct but currency presentation and production receipt validation need repair; the PLUGGD physical basket is not yet server-enforced as physical-only; the native theme foundation exists but most accepted surfaces bypass it; public creator classification can lose to generic artist metadata; Ola Kingdom and Ayofe have real creator profiles but their separate imported artist rows remain unlinked; and public play totals cannot currently be hidden by their creator.

### Complete numbered plan recorded before product edits

1. **Preserve accepted work and exact ownership** — Keep the accepted Home, Discovery, Creator Profile, Events, Creator Studio, Community content, navigation, player and release-upload designs. Patch current integration files in place; do not restore older copies, absorb excluded artifacts or alter the original rollback worktree.
2. **Keep credits as the sole normal iOS release-unlock price** — Release cards, creator catalogue cards and release details must present the server-authoritative credit requirement (`N credits`) rather than the creator's raw GBP/web price. The unlock action remains credits-based; Creator Studio and web may retain creator-set cash pricing for their own authorised surfaces.
3. **Keep cash display StoreKit-authoritative on iOS** — Credit-pack currency prices appear only from StoreKit's localized product metadata. Missing products fail closed; no hardcoded cash amount, Stripe CTA or web price may masquerade as an iOS digital purchase price.
4. **Repair production StoreKit verification** — Correct Apple signed-transaction identity validation for sandbox and production without weakening bundle/environment/product/user checks, idempotency, non-expiring account credits or server-owned fulfilment. Add focused fixtures for accepted and rejected production/sandbox payloads.
5. **Enforce release eligibility and private-delivery boundaries server-side** — A credits unlock must reject unpublished, catalogue-reference, rights-blocked or non-deliverable releases even from a modified client. Public release loading must not expose a private download asset before entitlement; fulfilled downloads use the established entitlement-checked signed-delivery path.
6. **Make the PLUGGD physical basket physically strict** — `ios_physical_basket` accepts only active, public, approved, in-stock PLUGGD `store_products` with an allowlisted physical type, server-resolved options/prices/currency, bounded integer quantities, shipping collection, native return URLs and reconciled order state. Reject client prices, digital fallbacks, invalid options/status/currency and oversell races.
7. **Align creator merchandise without merging seller flows** — Preserve creator-specific Stripe Connect checkout, payout and reservation. Align the public status allowlist, native return, shipping and stock semantics; do not place multiple creators or PLUGGD stock into the same seller basket.
8. **Retain Apple storefront policy boundaries** — UK and other non-authorised storefronts expose no digital Stripe/web checkout CTA. Any separately permitted US external-purchase path remains policy-resolved and must not replace credits/IAP. Physical merchandise remains the only universal hosted-checkout category.
9. **Provide three coherent appearance choices** — `System` follows iOS, `Editorial Light` uses cream/paper canvases, near-black ink and accessible orange accents, and `Night` preserves the accepted current dark design. Persist the choice and expose it in Settings with truthful selected state.
10. **Remove theme flash and update native chrome** — Hydrate the saved mode before the themed app shell, expose resolved scheme, update system/root background and status-bar styling, and preserve intentional white-on-dark photographic/media overlays.
11. **Theme shared surfaces semantically** — Upgrade tokens and shared background, glass panels, header, dock, mini-player, sheets, icon controls, loading/error/empty states and modals so downstream screens do not require duplicated palette logic. Honour Reduce Motion and Reduce Transparency.
12. **Complete Home and Community appearance coverage** — Convert their hardcoded canvas/chrome/post/navigation colours to semantic tokens without changing accepted layout, curation, media, interactions or section order. Normal text and controls meet WCAG 2.1 AA contrast; orange fills use dark on-accent text; interactive targets are at least 44×44 points.
13. **Prove runtime/source identity before judging Creators** — The integrated `/directory` source contains no public MusicBrainz/claim-card stack; verification must prove the exact current bundle is running so stale screens are never accepted or edited around.
14. **Lead the directory with PLUGGD creators** — Default to `PLUGGD Creators`, classify Industry explicitly and creator/profile flags before generic `artist` metadata, use deterministic ordering and pagination, and preserve search/follow/profile routes.
15. **Make the directory visually deliberate** — Retain an artwork-led featured rail and compact two-column creator gallery, add truthful catalogue/industry browsing only where backed by real data, remove MusicBrainz as a primary public CTA and avoid an alphabetical full-width card stack.
16. **Keep claims exact and safe** — Never auto-claim or merge imported artists by normalized name. A catalogue artist may resolve to a PLUGGD creator only through verified `claimed_profile_id`/`claimed_by_user_id`; Ola/Ayofe production mappings require separate reviewed exact-target read-back before any mutation.
17. **Give creators play-count privacy** — Add an owner control stored by merging `profiles.embed_settings.profile_visibility.show_play_counts`, default `true`. When false, public hero and About surfaces omit play totals while private Creator Studio analytics remain intact.
18. **Run bounded source verification** — Each writer runs only its focused tests. The integration gate then runs aggregate mobile contracts, TypeScript, Deno/function tests, Expo Doctor/config, contrast assertions and clean diff hygiene once after all lanes stabilise.
19. **Perform blocking rendered QA** — Capture and open Home and Community in System, Editorial Light and Night on compact and large Simulators; live-switch System light/dark; inspect creator directory/profile visible/hidden plays; check default/XL/accessibility Dynamic Type, VoiceOver names/order, Reduce Motion/Transparency, increased contrast, status bars, safe areas, keyboard, modals, player/dock clearance and 44-point targets.
20. **Keep consequential gates separate** — No production function/migration deployment, production artist-link write, purchase, public content mutation, archive/upload or App Store submission is implied by source/render passes. StoreKit and Stripe test-mode flows must pass on a physical iPhone before the existing Phase 11 archive/upload/submission gate continues, with human approval retained at production and external handoffs.
21. **Close Guideline 2.1 App Completeness against the exact Build 8 binary** — Every visible review-path action must work with truthful loading/error/empty/success behaviour; the durable reviewer login, live backend, attached IAPs/subscription, legal/support URLs, contextual permissions, account deletion, Restore Purchases, playback, Community safety and creator access must be reachable in the exact archive. Remove or production-gate preview fixtures, debug controls, placeholders, stale Build 7 claims and dead/unsupported actions. Replace every device/OS/video placeholder with watched end-to-end Build 8 evidence before saving review notes.
22. **Demonstrate Guideline 4.3 differentiation rather than merely asserting it** — Submit one PLUGGD bundle identity and no location/content clones; preserve the original creator-and-fan platform, credits/IAP, Creator Studio, Community, Live, Events, editorial, catalogue and creator-owned commerce capabilities that materially distinguish it from generic music players/social templates. Audit the binary, metadata, screenshots and review path for copied-template/demo identity, duplicate bundle/app variants, placeholder brands or generic stack-only surfaces, and describe the concrete differentiated value in Review Notes without competitor claims or unverifiable superlatives.
23. **Reconcile the Guideline 2.1 rejection response with current truth** — The five consumables and credits/IAP design predate the rejection and must be preserved, not recreated. Carry forward the configured consumables, creator membership, reviewer account, rights statement, safety controls and regional commerce explanation only after current read-back. Supersede Build 7 filenames/build/device statements with exact Build 8 evidence; do not send the response or press Submit for Review until all recorded attachments have processed and App Store Connect shows the selected Build 8 plus its IAP set ready for review.
24. **Make appearance coverage genuinely app-wide** — After foundation/Home/Community conversion, audit every reachable user-facing route in the exact Build 8 route manifest. Each route must either consume semantic appearance tokens or be explicitly documented as an intentional immersive artwork/video/map surface with accessible surrounding chrome. Editorial Light may not fall back to an accidental black canvas, white-on-cream text, unreadable form field, dark-only empty/error state or mismatched modal. Commerce and Directory/Profile writers make their owned files theme-aware; the Theme writer owns remaining route-level appearance corrections without changing their accepted product composition.
25. **Resolve current App Store Connect metadata prompts** — Before resubmission, answer Apple's newly displayed social-media age-rating questions truthfully against PLUGGD Community, messaging, Live and UGC controls; re-read the calculated rating/16+ override, privacy answers, categories and release mode. Do not dismiss the prompt or reuse an older answer without current read-back.
26. **Remove audit-proven Guideline 2.1 temporary/dead states** — A playlist with no playable track cannot expose an enabled Play action; a THE PLUG record without complete article content cannot appear as a public dispatch that is “being prepared”; generic parity destinations cannot expose reachable `Coming soon` cards for unfinished Services, Creator Offers or Promoter tools. Hide, disable truthfully or route only to complete established implementations without inventing content or changing accepted product composition.
27. **Keep the React launch handoff brand-safe at large text sizes** — The post-storyboard font-loading gate must render the `PLUGGD` wordmark on one line at Accessibility Extra Large, with a bounded local multiplier and no clipped letters, while its loading/error copy remains readable and screen-reader-labelled. Preserve the accepted neutral native splash, saved appearance handoff, route timing and all hydrated screens; prove the exact cold-launch transition visually on the compact Simulator.
28. **Restore the accepted first Home Carnival feature copy** — The first Carnival card beneath the featured music spotlight must use the current web-mobile authority: `The PLUGGD Carnival Guide`; `Find your sound. Plan the road.` with the second phrase visually emphasised; `Sound systems, mas bands, food, history and the practical stops worth knowing—brought together in one music-first guide.`; and `Open the Carnival Hub`. Preserve its existing Carnival artwork, visibility lifecycle, Hub destination, card composition and every later Carnival/seasonal surface.

### Exact implementation ownership

- COMMERCE_WRITER=`supabase/functions/_shared/appleSignedData.ts` and focused tests; the notification-only app-identity reconciliation branch/tests in `supabase/functions/apple-server-notification/index.ts`; the fail-closed release preflight in `supabase/functions/spend-credits/index.ts`; `supabase/functions/enhanced-store-checkout/**`; `supabase/functions/create-merch-checkout/**` only for the audited status/return mismatch; the narrowly tagged `ios_physical_basket` reservation/completion/expiry/refund branches and focused tests under `supabase/functions/stripe-webhook/{index.ts,hybridCommerce.ts}`; one corrective inventory migration and tests when required; `pluggd-mobile/app/{wallet.tsx,release/[id].tsx,commerce/basket.tsx}`; `pluggd-mobile/src/{hooks/useCredits.ts,lib/mobileContent.ts,features/editorial/ListeningFloorScreen.tsx,features/home/live-music-dashboard-home.tsx}` with the Home file limited to its audited release price helper; focused commerce/release/physical-basket contracts. `PublicCreatorProfileScreen.tsx` is excluded from this writer to avoid collision.
- THEME_WRITER=`pluggd-mobile/src/design/{usePluggdTheme.ts,tokens.ts,liquidGlassTokens.ts}`; `pluggd-mobile/app/{_layout.tsx,settings/index.tsx}`; current shared liquid-glass/header/account/create/content components; the audited Home and Community files; then any remaining user-visible route identified by the exact route-manifest appearance audit and not owned by Commerce or Directory/Profile; focused appearance/accessibility contracts. Patch current dirty files in place and do not alter product composition.
- DIRECTORY_PROFILE_WRITER=`pluggd-mobile/src/features/directory/{creatorDirectoryService.ts,CreatorDirectoryScreen.tsx}`; `pluggd-mobile/src/features/profile/edit-profile-screen.tsx`; `pluggd-mobile/src/features/profiles/PublicCreatorProfileScreen.tsx` including both play-count visibility and credit-first price presentation; focused directory/profile contracts.
- COMPLETENESS_WRITER=`pluggd-mobile/app/{playlists/[id].tsx,plug/[id].tsx}`; `pluggd-mobile/src/features/parity/appWideParityServices.ts`; `pluggd-mobile/src/features/editorial/thePlugArticleService.ts` only if necessary to exclude incomplete public content; focused 2.1 completeness contracts plus only the stale placeholder-presence assertions in `pluggd-mobile/scripts/verify-mobile-web-source-truth-contract.mjs`. These files are excluded from Theme ownership to avoid collisions; use the shared theme API when touched.
- RECORDS_AND_INTEGRATION_WRITER=this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md`, active row, App Review notes only after behaviour is proven, and integration-only conflict/test/render coordination.

### Frozen and consequential boundaries

No broad schema redesign, artist name matching, catalogue import, new payment provider, Android implementation, production deploy/write, archive/upload/submission or cleanup is authorised merely by this implementation phase. Exact production changes and external release actions remain separately gated by Phase 11.

## Phase 11B native Live Gifts shared-overlay contract — 2026-08-25

### Authority and audited boundary

The founder supplied and explicitly endorsed the Build 8 gifting handoff after the accepted transaction, catalogue, wallet, settlement and native gift-tray implementation was recovered. This is a bounded pre-archive native presentation/realtime repair in the clean integration lane. It does not reopen the economy, payment, wallet, creator split, cash-out, admin catalogue, web overlay or original dirty recovery worktree.

The release-safe implementation will use the app's existing React Native/Reanimated stack for the shared animated moment. No new native Lottie/SVGA dependency and no Downloads MP4/GIF/JPEG or unverified animation asset will enter Build 8. Catalogue thumbnails and restrained native motion provide the visual effect; unsupported or malformed remote animation metadata cannot stall the queue, and this implementation will not claim remote Lottie playback.

### Complete numbered plan recorded before product edits

1. **Preserve the complete transaction path** — Keep `resolveCommercePolicy({ kind: 'live_gift' })`, authenticated `send-live-gift`, per-attempt idempotency keys, `perform_live_gift_v3`, wallet refresh, insufficient-credit routing, host/self-gift and inactive/unauthenticated guards, fixed pricing and creator settlement unchanged.
2. **Respect each room's selected catalogue** — Attempt `get_live_room_gift_catalog({ p_room_id: currentRoomId })` first and retain its order. Fall back to the active global catalogue only for a genuinely unavailable RPC/error path; a successful valid empty room result remains empty unless current local/backend source proves documented global-default semantics.
3. **Hydrate the canonical event shape** — Include durable event ID, `gift_id` and `animation_variant` in native gift-event loading and realtime handling. Build a gift-by-ID lookup from the resolved room catalogue and attach the matching gift to both initial/send-response and realtime rows before presentation.
4. **Deduplicate by durable identity** — The same server event received through the send response and realtime INSERT produces one list item, one accessibility announcement and one overlay. Timestamp, sender or gift type alone must never be the deduplication key.
5. **Keep unknown gifts safe** — A missing catalogue match produces a restrained generic creator-support acknowledgement with no invented gift metadata, crash, second debit or queue stall.
6. **Create one bounded queue authority** — A focused hook owns one active event plus FIFO pending events, caps pending work at 20, ignores duplicate durable IDs, advances on completion or a bounded fallback timeout, and clears on room change, ended session and unmount.
7. **Create a separate non-blocking native overlay** — A focused component renders absolutely above room media and below interactive Live controls with `pointerEvents="none"`. It keeps sender/`You`, quantity, gift name and creator-support meaning visible, uses thumbnail plus native motion, plays no audio and never blocks Leave, Share, chat or host controls.
8. **Honour accessibility and motion settings** — Reduce Motion uses a brief static badge/thumbnail acknowledgement; the active event emits one polite announcement without stealing focus or exposing raw UUIDs as primary copy. Thumbnail failure falls back to text/icon and still completes.
9. **Keep sender confirmation subordinate** — The existing local success acknowledgement may remain, but it must not enqueue or visually compete as a second shared effect.
10. **Verify source and rendered behaviour proportionally** — Focused checks cover room-catalogue RPC/fallback semantics, event fields/hydration, durable-ID dedupe, FIFO/cap/cleanup/timeout and overlay safety/accessibility. TypeScript plus existing Live, wallet, commerce, route, accessibility and App Store-readiness contracts must remain green.
11. **Require honest release evidence** — Compact and large Simulator states must show tray, active effect, queued effect and generic/thumbnail fallback without clipping or control obstruction. Real-device compositing/memory/background recovery and authorised two-client realtime propagation remain blocking before final archive; no latency promise is made from source inspection.
12. **Keep consequential boundaries** — No production write/payment/catalogue mutation, migration/function/economy edit, dependency addition, web repair, physical-phone install, Git integration, deploy, archive/upload or App Store action occurs in this lane. If current source requires any excluded surface, stop and amend this contract first.

### Exact allowed files

- `pluggd-mobile/src/screens/LiveSessionScreen.tsx`
- New focused files under `pluggd-mobile/src/features/live/`: `LiveGiftOverlay.tsx`, `useLiveGiftQueue.ts` and, only if needed, `liveGiftPresentation.ts`
- `pluggd-mobile/scripts/verify-mobile-live-gift-overlay-contract.mjs`
- Existing focused Live contract scripts only when a truthful preservation assertion must be added
- This task's `CONTRACT.md`, `PROGRESS.md` and `VERIFY.md`

### Explicit exclusions

No Supabase migration/function, wallet/economy/settlement/admin file, package/lockfile/Pods/project file, browser gift overlay, production catalogue/storage row, unrelated Live layout, Downloads media or unverified animation asset is authorised. The six recovered Lottie JSON candidates remain reference-only for a separately approved post-release asset/dependency decision.

## Phase 11 clean integration, Build 8 and submission contract — 2026-08-25

### Authority and target

The founder explicitly authorises the clean iOS integration, Build 8 preparation and App Store submission path. Android parity implementation is deliberately deferred until this iOS submission is finished; only a concise private follow-up note is authorised now.

- TARGET=`com.pluggd.mobile`, marketing version `1.0.0`, iOS Build `8`, recorded attempt `21`.
- BASELINE=Fresh `origin/main` is commit `be82c022`; it is an ancestor of current clean branch head `36618653`. The 95 intervening commits include previously completed iOS and already released Android work and must not be rewritten or discarded during this pass.
- INTEGRATION_METHOD=Create a separate clean worktree/branch from `36618653`, mechanically overlay only the current authorised source/support manifest, then review the clean diff before committing. The original dirty worktree remains the recovery/rollback source and is not cleaned, reset, rebased or destructively altered.
- AUTHORISED_DIRTY_MANIFEST=Current task records; `AGENTS.md`; `pluggd-mobile/app.config.ts`; current changes under `pluggd-mobile/app/**`, `assets/discovery-destinations/**`, `assets/opportunities/**`, `components/**`, `src/**`, `docs/app-store/**`, focused `scripts/**`, the React Native patch and `design-qa.md`; plus the already deployed matching source at `supabase/functions/manage-live-sessions/index.ts`. These are the source/support groups attributed by this task and its recorded Phase 1-10 manifests.
- EXCLUSIONS=All `pluggd-mobile/artifacts/**`, `pluggd-mobile/output/**`, `pluggd-mobile/tmp/**`, `supabase/.temp/**`, derived data, local credentials and unknown residue. They remain untouched in the original worktree and are not integrated merely because they exist.
- RELEASE_METADATA=Advance only the iOS default build number from 7 to 8 and supersede Build 7 draft wording where required for the exact new candidate. Preserve Android versioning/configuration; no Android build, upload or Play action is authorised.

### Required gates and recovery

1. Record the exact resulting clean diff and confirm no excluded artifact/temp/backend residue entered it.
2. Run the complete current mobile contract suite, TypeScript, Expo configuration/readiness checks and clean diff hygiene against the integrated source. Do not rerun old lane checks individually when the aggregate suite covers them.
3. Build and visually smoke the exact integrated source on the existing compact and large Simulators; investigate any concrete regression before release work.
4. Validate production configuration without mutations. Authenticated creator upload/Studio persistence may be tested only with an existing safe account and reversible private-draft behaviour; do not publish content, purchase, pay out, create a Live room or alter unrelated production data.
5. Produce a signed iOS Release archive for Build 8, validate entitlements, privacy manifests, icons, encryption declaration, embedded bundle provenance and distribution signature, then export the exact upload artifact.
6. Install the exact candidate on the paired physical iPhone when available and complete the release-critical cold launch, authentication, navigation, playback, background/interruption, upload form, Studio gate and purchase-policy checks without completing a purchase or public content action.
7. Upload only after every blocking source/build/signing gate passes. Complete App Store Connect attachment/metadata/build-selection checks before requesting review. If the provider requires an interactive Account Holder confirmation, missing evidence, agreement or credential, stop at that exact boundary and report it; do not manufacture evidence or bypass it.
8. Push/fast-forward `main` only after the clean integration commit and required source/build gates pass. Preserve the original dirty branch/worktree as rollback until the uploaded build is accepted and the founder confirms cleanup.

### Android follow-up boundary

`pluggd-mobile/docs/android/IOS_BUILD8_PARITY_FOLLOWUP.md` is the private checklist for our later Android pass. It must identify all material iOS Build 8 additions beyond Build 7, distinguish shared React Native changes from iOS/platform-specific validation, and require fresh Android source, visual, device, commerce, notification, playback and Play-release checks. No Android product edit, build or Play submission occurs in Phase 11.

## Phase 10O Release-form AI declaration and safe visual preview — implementation contract — 2026-08-25

### User outcome and audited current truth

The user asks to inspect the native release forms, specifically including the AI declaration. Current source and Simulator inspection prove two concrete gaps: the four-step Upload Release workflow contains no AI or synthetic-media declaration at all, and the signed-out review Simulator correctly routes the Upload Release menu action to `CreatorAccessGate`, so the current form cannot be shown without either a legitimate creator session or a development-only visual harness. This supersedes the Phase 10M form-completeness claim for this exact requirement.

The current native workflow already has a strong Details → Media → Rights → Review composition, device-local draft recovery, private authenticated catalogue creation, explicit/non-public defaults, rollback and audio-processing boundaries. Those known-good behaviours are preserved. The authoritative web implementation is the current `EnhancedReleaseBuilder` on `origin/main` (introduced by `72389117`): it stores a versioned `ai_disclosure` object in Release `distribution_settings`, so native must use that exact semantic contract rather than inventing a parallel declaration.

### Complete numbered plan recorded before product edits

1. **Preserve the existing workflow and dirty ownership** — Keep the accepted four-step Upload Studio composition, Release/Beat/Mix switching, fields, artwork/audio selection, local draft recovery, private draft creation, processing, rollback, catalogue return, creator gate and every unrelated dirty/untracked file. Adopt only the exact Phase 10O diff in the named manifest.
2. **Copy the release-only web classification** — In the Rights step for Release only, add `AI use declaration` with the web instruction `Choose the highest level of AI use anywhere on this release. You can still save an unfinished draft.` Require exactly one choice with the same labels and descriptions: `No AI used`, `AI-assisted`, or `AI-generated elements`. Beat and Mix remain unchanged.
3. **Copy the web conditional generated detail** — Only when `AI-generated elements` is selected, require every applicable contribution from `Lyrics`, `Composition or melody`, `Vocals`, `Instrumental performance`, and `Other audio or production`. When an audio element applies, require `Part of the audio` or `All of the audio`; when all applies, require `Human artist identity` or `AI persona`.
4. **Copy the web generated-rights confirmations** — For generated releases only, separately require the exact rights statement and the exact no-impersonation statement from web. Keep the existing general distribution-rights confirmation separate. `No AI used` and `AI-assisted` are complete classification answers without generated-only confirmations, matching web.
5. **Persist the exact web contract** — Extend the authenticated native draft input and write `distribution_settings.ai_disclosure` with web-compatible keys: `version`, `classification`, `generated_elements`, `audio_scope`, `artist_identity`, `rights_confirmed`, and `no_impersonation_confirmed`. Clear irrelevant generated values exactly as web does. Do not add columns, migrations, RPCs, functions or production writes during QA; Beat/Mix payloads remain unchanged.
6. **Expose review truth** — Add an `AI declaration` row to both the Release Review step and final review sheet, summarising classification and relevant generated detail while showing incomplete truth until all web-equivalent conditional validation passes. Save-on-device recovery must retain the new fields and safely default older local drafts.
7. **Add a development-only visual route** — Permit `?preview=creator` to render this form only when `__DEV__` is true, with a visible `FORM PREVIEW · NO ACCOUNT DATA` disclosure. Production builds and normal signed-out routes must still pass through `CreatorAccessGate`; the preview cannot publish or bypass the authenticated draft service.
8. **Capture the complete form** — On the sole compact Simulator, open the development-only Release form and capture Details, Media, Rights with the complete AI declaration, and Review/final-review states. Open and inspect every image for wrapping, selected/disabled state, 44pt controls, keyboard/safe-area behaviour and readable disclosure.
9. **Close focused gates** — Strengthen and run the existing creator-upload contract, Studio final-quality contract, TypeScript and scoped diff hygiene. Append the visual/source result to `design-qa.md`. Do not select media, save a draft, create/publish/submit content, mutate auth/production/database/storage, install on a phone, change dependencies, perform Git integration, deploy, archive/upload or take App Store action.

### Exact Phase 10O allowed file manifest

- `pluggd-mobile/app/creator/upload.tsx`
- `pluggd-mobile/src/features/studio/creatorUploadService.ts`
- `pluggd-mobile/scripts/verify-mobile-creator-upload-contract.mjs`
- `pluggd-mobile/scripts/verify-mobile-studio-final-quality-contract.mjs` only if its form-completeness assertion requires strengthening
- `pluggd-mobile/design-qa.md`
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

No schema, migration, Supabase function, global access gate, Studio menu, catalogue editor, Beat/Mix payload, shared navigation, public surface, dependency, release file or unrelated dirt is edit-authorised. The current Simulator/source evidence, missing declaration, exact `origin/main` web contract, persistence authority, nine numbered requirements, exact manifest and verification boundary are recorded before the corrected native implementation continues. `AUDIT_REQUIRED=false`; `CODE_EDIT_ALLOWED=true` only for Phase 10O; `VERIFICATION_REQUIRED=true`.

## Phase 10N Events search/map navigation and Studio preview-truth correction — implementation contract — 2026-08-25

### User outcome and exact current evidence

The user's current compact-Simulator review identifies three bounded defects after the accepted Events and Creator Studio phases: the collapsed Events control says `Filters` even though its first and primary expanded action is text search; Map has no immediate top return control; and the unsigned Studio visual-preview fixture can be mistaken for real account data because its `8` catalogue items and `1,284` audience figure are not visibly disclosed as preview values.

Fresh current evidence is saved under `/private/tmp/pluggd-events-search-map-studio-audit-20260825/`: the accepted collapsed Events hierarchy, expanded search/filter panel, Map state without a top return, and the real signed-out Studio access state. Source inspection confirms the Studio figures exist only in the guarded `__DEV__ && preview=creator` fixture and are not returned to production or signed-out users.

### Complete numbered correction plan recorded before product edits

1. **Preserve accepted work and ownership** — Keep the accepted Events campaign, Spotlight, Upcoming, compact list, Local Scene, boards, Carnival mode, canonical loader/filter collection, map points, detail/ticket routes and global chrome unchanged. Keep the accepted Studio visual system, routes, real loader, creator-access gate and production data behaviour unchanged. Preserve every unrelated dirty/untracked file.
2. **Name the discovery action clearly** — Change only the collapsed visible `Filters` label to `Search`, because the expanded panel begins with canonical free-text search and then exposes filters. Use the semantic label `Open/Hide event search and filters`; keep the active-count suffix so a closed panel still communicates applied refinement.
3. **Keep progressive disclosure** — Leave the search/filter panel closed by default to protect the accepted Event Spotlight/editorial first-view rhythm. Preserve explicit open/close, current query/filter values, reset behaviour, results count and all category/date/city/genre/group filtering. Do not force focus or keyboard presentation.
4. **Make Map reversible at first glance** — Add a full-width, at-least-44pt `Back to Events` control directly above the Map canvas in both normal and Carnival map modes. It returns to Browse without clearing the query, filters, category/group, canonical results, selected event data or mode lifecycle. Retain the lower `Browse all events` continuation as a secondary route.
5. **Disclose Simulator-only Studio fixtures** — On `data.userId === 'studio-preview'` in `__DEV__` only, show a compact visible `PREVIEW DATA · NOT YOUR ACCOUNT` notice immediately below the Studio top bar. The preview fixture remains visual QA only; no mock values, bypass or developer copy may enter a production build or a real signed-out/account state.
6. **Strengthen focused contracts** — Update only the focused Events discovery and Studio final-quality contracts to assert the new visible/semantic labels, top Map return, default-closed state and DEV preview disclosure while preserving the canonical loader/auth boundaries.
7. **Run current compact interaction and visual QA** — Verify collapsed Search, expanded search/filters, Map return with state preserved, Studio signed-out access, and the disclosed Home/Apps/My PLUGGD preview surfaces. Save and open every final screenshot; check safe areas, wrapping, 44pt controls and accessibility labels.
8. **Close proportionate source and safety gates** — Run the two focused contracts, TypeScript and scoped diff hygiene. The current Metro bundle may hot-load this TypeScript/React correction; no redundant native rebuild is required unless runtime fails. Append a superseding QA note and do not perform a phone install, production/auth/data write, Save/Create/Publish, dependency, Git integration, deployment, archive/upload or App Store action.

### Exact Phase 10N allowed file manifest

- `pluggd-mobile/src/features/editorial/EventsBoardScreen.tsx`
- `pluggd-mobile/src/features/studio/StudioScreens.tsx`
- `pluggd-mobile/scripts/verify-mobile-events-discovery-contract.mjs`
- `pluggd-mobile/scripts/verify-mobile-studio-final-quality-contract.mjs`
- `pluggd-mobile/design-qa.md`
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

Every other product, service, loader, route, asset, backend, schema, dependency, build/release and dirty/untracked file is frozen. The current screenshots, source cause, eight numbered requirements, ownership manifest and verification boundary are recorded before product edits. `AUDIT_REQUIRED=false`; `CODE_EDIT_ALLOWED=true` only for Phase 10N; `VERIFICATION_REQUIRED=true`.

## Phase 10M Creator Studio final quality pass — implementation contract — 2026-08-25

### User outcome and current visual truth

After the accepted Events pass, the user requires one final complete Creator Studio pass across every native surface and form: visually world-class, easy for creators to understand, and fully functional. This phase preserves the native product where it is already stronger than mobile web; web is the capability and quality reference, not a requirement to discard stronger native composition.

Fresh exact-current compact evidence is saved under `/private/tmp/pluggd-creator-studio-final-audit-20260825/before/`. Same-frame web/native comparisons are under `/private/tmp/pluggd-creator-studio-final-audit-20260825/comparisons/`. The accepted/current 390px web cockpit references are `.ai/tasks/studio-mobile-core-suite-redesign/artifacts/*-390x844.png` in `/Users/apple/PLUGGD_NEW`.

Current audit findings are bounded and concrete:

- native Home, My PLUGGD, Connect Card, catalogue and the signed-out gate are already visually stronger or equivalently polished and must not be flattened into generic templates;
- the Workspace drawer is a P1 render failure: function-valued `Pressable` styles are not applied in this runtime, so icon, label and chevron stack vertically and the close control loses its surface;
- routes sharing one dock key can inherit the previous route's scroll offset because the Studio shell keys its `ScrollView` by `active` rather than the actual pathname;
- direct Connect Card editor, Split create/detail and embedded Studio deep links do not consistently pass through the creator-access gate, producing retry-only authentication errors instead of an honest sign-in path;
- Apps is functionally complete but too slow to scan on phone; duplicate Add/Plug controls and tall cards hide most of the toolkit below the dock;
- visible copy such as `Recent Studio Rows`, `owner-safe`, `owner-managed`, `exact authenticated module`, and module text beginning `Adds ... to Studio` describes implementation rather than creator outcomes;
- Connect Card editing, Commerce and Financials use an older square/small-radius template that visibly diverges from the current premium native Studio language;
- owner-catalogue numeric parsing can reject before its guarded operation handler, yielding an unhandled promise instead of field-level/user-facing validation;
- Upload Studio renders the identical full-screen background gradient twice;
- all twelve focused Studio source contracts currently pass, proving route/service foundations but not visual correctness; they did not catch the drawer regression.

Authenticated production-backed Analytics, owner records, Commerce, Financials, Split collaboration and save/publish flows cannot be truthfully rendered in the current signed-out Simulator. Their current source/contracts and non-mutating states are in scope; authenticated persistence proof remains an explicit human-session blocker and may not be fabricated or bypassed.

### Complete numbered plan recorded before product edits

1. **Preserve known-good work and dirty ownership** — Keep accepted Events, Home, Discovery, Opportunities, Creator Profile, Community, global dock/player and all unrelated dirty/untracked files frozen. Within Studio, preserve the current Home command hero, My PLUGGD hub, Connect Card owner hero, catalogue information architecture, Upload Studio workflow, Video Studio, Soundboard creator/editor and server-authoritative services unless a named defect below requires a bounded change.

2. **Use current web and native evidence correctly** — Retain native information architecture where it is stronger, while matching web's creator-facing completeness, compact mobile scanning, premium black/orange visual language and honest route capability. Every visual acceptance decision uses same-frame reference/current inspection at the matching top or content state; separate screenshots and source checks alone are not visual acceptance.

3. **Repair the Studio shell** — Move drawer row/close layout styles onto concrete inner views so the current runtime cannot drop row geometry; preserve the exact menu model, routes, selected state, safe areas and modal dismissal. Key each Studio `ScrollView` by pathname so every direct/dock/menu route opens at its own top without stale scroll inheritance. Preserve the five-item Studio dock and public-app exit.

4. **Freeze and reverify Home** — Keep the current photographic command hero, health ring, working Upload/Wallet/Live/Apps/next-move actions, KPI/zone rhythm and bottom-safe dock. Replace only internal section wording such as `Recent Studio Rows` with concise creator language; do not redesign the accepted composition.

5. **Make Apps fast to scan** — Keep role recommendations, filters, module persistence, route truth and add/remove confirmations. Compress module cards into a clear icon/title/description/action hierarchy, remove duplicate Add-versus-Plug affordances, retain an explicit reversible Unplug action for eligible modules, and keep all targets at least 44pt. A phone viewport must expose materially more than one module without clipping the dock.

6. **Polish Create and More without reducing capability** — Preserve the two-column action grid, real native/advanced route distinction, artwork and module grouping. Replace `adds to Studio`/implementation vocabulary with module descriptions and creator outcomes, keep all real routes/actions, and expose no placeholder or fake persistence.

7. **Keep Insights truthful** — Preserve 7/30/90 ranges, verified summary/trends/audience/coverage/zero states and catalogue links. Use creator-facing loading/error copy; retry remains for genuine transient failure, while signed-out entry is handled by access gating rather than a retry loop. No invented data or estimated totals.

8. **Preserve My PLUGGD and page-builder reachability** — Keep the current setup hero, six readable tabs, progress/next move, Profile/Page/Card/Embeds/Settings routes and separate public/share actions. Verify direct tab switching, scroll reset, label wrapping and dock clearance; do not duplicate the public creator profile.

9. **Finish Connect Card ownership flows** — Preserve the accepted owner hero, public/share/collaborator/advanced routes and private-view separation. Gate the direct editor before its loader runs, keep identity and services/rates persistence, destructive confirmation and success/error states, and restyle the editor's tabs/sections/fields/buttons into the premium rounded native language without hiding any field.

10. **Preserve catalogue, upload and lyrics while fixing form safety** — Keep owned Releases/Beats/Mixes/Soundboards, full untruncated inventory, owner editors, artwork/audio replacement, per-track lyrics, private draft creation, moderation/public separation and rollback behaviour. Surface invalid numeric metadata through a guarded user message instead of an unhandled rejection, remove the duplicate Upload background layer, and keep keyboard, review, progress and save states intact.

11. **Reverify Soundboards and Videos** — Keep the current canvas-first Soundboard templates, unpublished-by-default creation, owner/public separation, real notes/media layout persistence, Video drafts, uploads/YouTube source, artwork, duplicate, publish/unpublish and advanced routes. No redesign is authorised without a current concrete failure; source, route, target-size, safe-area and state checks remain required.

12. **Bring Commerce into the current Studio language** — Preserve real products, memberships, packs, moderation, availability, public-view separation, StoreKit consumer boundary and secure advanced builders. Upgrade only visual hierarchy/radii/spacing/action containment and creator-facing copy; keep loading/error/empty/partial data honest and never exercise a commerce mutation during QA.

13. **Bring Financials into the current Studio language** — Preserve real credit balance, recent activity, payout lifecycle, Wallet and secure tax/statement/bank/KYC handoff. Upgrade the hero, summary, activity, payout and protected-work panels to the same premium geometry, with truthful partial/empty/error states; never request a payout or purchase credits.

14. **Protect Split Engine direct journeys** — Gate direct create/detail routes, then preserve owned-work selection, collaborator search, exact three-column totals, save/discard, approval, lock/version/document states and server-authoritative percentages. Do not create a split or change collaborators during QA; use source contracts and signed-out/access rendering unless a safe authenticated session is supplied.

15. **Keep embedded advanced Studio secure and understandable** — Gate direct browser entry, preserve the allowlisted PLUGGD-only path model, one-time handoff, external-host confirmation, expired-session state, back/refresh/close controls and return route. Settings and advanced builders remain the exact authenticated web modules; no duplicate backend or fake native form is created.

16. **Audit every visible form and action state** — Labels, required fields, keyboard types, multi-line inputs, toggles, selected/disabled/busy state, destructive confirmation, success/failure response, retry/sign-in recovery and 44pt controls must be explicit. No Save/Create/Publish/Submit/Unplug/Hide/Payout/purchase action is completed in QA; source/service assertions establish wiring where current auth blocks non-mutating render proof.

17. **Run blocking visual and accessibility QA** — Capture exact-current compact Home, Apps, Create, More, My PLUGGD, Connect Card, catalogue, signed-out gate and Workspace drawer plus representative large and Dynamic Type states. Build same-frame comparisons for web-corresponding surfaces, inspect combined frames, fix every P0/P1/P2, verify scroll-to-top, menu rows, tabs, wrapping, safe areas, keyboard avoidance, dock clearance, haptics source and semantic selected/expanded/disabled/busy state. Secondary authenticated forms must be reported as source-only if no session exists.

18. **Close focused source/build and safety gates** — Run TypeScript; all twelve existing Studio/upload/catalog/lyrics/Soundboard/Video contracts; a new final-quality regression contract; route/global-shell checks; scoped diff hygiene; and one fresh Simulator build/run after the complete batch. Append a superseding Studio report to `design-qa.md`. Leave only the compact Simulator and exact Metro bundle. No phone, production/database/storage mutation, dependency change, staging, commit, push, merge, deploy, archive/upload or App Store action is authorised.

### Exact Phase 10M allowed file manifest

- `pluggd-mobile/src/features/studio/StudioScreens.tsx`
- `pluggd-mobile/src/features/studio/StudioConnectCardEditorScreen.tsx`
- `pluggd-mobile/src/features/studio/StudioCommerceScreen.tsx`
- `pluggd-mobile/src/features/studio/StudioFinancialsScreen.tsx`
- `pluggd-mobile/src/features/studio/OwnerCatalogScreen.tsx`
- `pluggd-mobile/app/creator/upload.tsx`
- `pluggd-mobile/app/studio/connect-card/edit.tsx`
- `pluggd-mobile/app/studio/splits/new.tsx`
- `pluggd-mobile/app/studio/splits/[id].tsx`
- `pluggd-mobile/app/studio/browser.tsx`
- `pluggd-mobile/scripts/verify-mobile-studio-navigation-shell-contract.mjs` only for shell/route assertions made stale by the authorised repair
- `pluggd-mobile/scripts/verify-mobile-studio-complete-parity-foundation-contract.mjs` only to replace the stale `Advanced Studio` display-copy assertion with the authorised creator-facing `More creator tools` semantics
- `pluggd-mobile/scripts/verify-mobile-studio-commerce-owner-contract.mjs` only to preserve the consumer-purchase boundary assertion using the authorised creator-facing shop copy
- `pluggd-mobile/scripts/verify-mobile-studio-financials-owner-contract.mjs` only to preserve the protected Financials boundary assertion using the authorised plain-language KYC/advanced copy
- new `pluggd-mobile/scripts/verify-mobile-studio-final-quality-contract.mjs`
- `pluggd-mobile/design-qa.md` for one appended final Studio visual report
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

No Studio service, schema, Supabase function, media policy, Video/Soundboard implementation, global auth component, dependency, public surface or unrelated file is edit-authorised. Existing dirty files in the manifest are adopted only for the bounded defects above; all other existing content remains prior authorised work and must be preserved.

### Consequential boundary and pre-edit gate

The audit, same-frame comparisons, route/component/service inventory, current source-contract results, concrete severity findings, authenticated boundary, eighteen numbered requirements and exact file manifest are recorded before product edits. `AUDIT_REQUIRED=false`; `CODE_EDIT_ALLOWED=true` only for Phase 10M. No production/database/storage mutation, Save/Create/Publish completion, payout/purchase, physical-phone install, dependency, Git integration, deployment, archive/upload or App Store action is authorised.

## Phase 10L2 Native Events literal mobile-web component parity — implementation contract — 2026-08-25

### User correction and reopened visual truth

The user has withdrawn Phase 10L1 visual acceptance and requires the native Events content surface to match the accepted mobile-web implementation component by component, including the small details: dates may not replace or repeat over listing artwork, panels and cards must use the same structure and sizing, and visual work continues until joint screenshot comparison passes. The controlling implementation remains accepted web commit `5e79af7160f9437b541b3637af602016b0e0ac95`, `src/pages/Events.tsx`, `src/pages/events-page.css` and frozen artifacts `08`, `09`, `10`, `11` and `16` under `.ai/tasks/cultural-takeover-web/artifacts/`.

Fresh exact-current native evidence captured during this reopened audit is under `/private/tmp/pluggd-events-exact-audit-20260825/before/`. It proves Phase 10L1 fixed the main editorial direction but did not reach literal component parity:

- normal lifecycle entry still uses a photographic background while accepted web uses the restrained warm-black campaign panel;
- native Upcoming cards use a shorter artwork-plus-body card while accepted web uses a 320px portrait artwork card with date and copy overlays plus a compact footer;
- native `Browse fast` rows repeat the full date while replacing the required 48px left artwork with a second date tile, use the wrong heading/count copy, serif row titles, square corners and a filled Tickets button instead of the accepted artwork-led `Browse events` row and outlined View pill;
- native Carnival inserts a generic Filters/Map/Reset panel between Featured plans and the campaign category rail; accepted web moves directly from Featured plans into category/group rails and exposes Map at the programme continuation;
- the Carnival split Top Pick ratio is visually copy-heavy compared with the accepted `0.96fr / 1.04fr` split;
- established native global header/dock/player remain intentionally native, but every Events-owned panel between them is governed by the web-mobile measurements and visual structure.

The previous `final result: passed` Events report is historical evidence for Phase 10L1, not current acceptance. Phase 10L2 appends a superseding report only after the stricter comparison gate passes.

### Complete numbered correction plan recorded before product edits

1. **Preserve functional and ownership truth** — Keep normal Events default, lifecycle visibility/removal, bounded/current counts, canonical collection, normal admin-curated Spotlight, Carnival chronological Top Pick, search/date/city/genre/category/group filtering, Browse/Map parity, event detail, external ticket handling, Carnival Hub, loading/error/empty states and 8+8 boards. Do not edit the loader, takeover helper, map, ticket helper, detail route, Hub, global shell, other accepted pages, backend, schema or dependencies.

2. **Match the normal lifecycle panel exactly** — Remove the native photo fill and reproduce the accepted warm-black campaign surface, thin warm border, approximately 20px radius, compact mono eyebrow, serif title, body measure, two-button proportions and vertical spacing. Preserve working Open Carnival mode and Complete guide actions and the truthful lifecycle count.

3. **Match normal discovery controls exactly** — Keep the three equal Filters/Map/Reset actions inside one compact rounded dark panel with the accepted inset, one-point gaps, 44pt targets, active/disabled truth and no extra visible search/category content while collapsed. Expanded controls remain canonical and accessible without changing the accepted collapsed first view.

4. **Match Event Spotlight exactly** — Preserve the single artwork-backed panel but align its content inset, badge size, Georgia display size/line height, body measure, metadata rhythm, CTA proportions, overlays, radius and minimum height to the accepted mobile component. Dates remain metadata only and never cover or replace artwork.

5. **Rebuild Upcoming cards from the accepted component** — Use approximately 320pt-wide snap cards with portrait 3:4 artwork, a compact month/day overlay at the top-left, venue/title over the lower artwork gradient, and the accepted compact status footer. Remove the shorter separate artwork/body design while preserving real artwork, current event order, detail navigation and truthful ticket/apply state.

6. **Rebuild the compact twelve-row list exactly** — Use the exact `Event list` / `Browse events` / `12 showing` hierarchy. Every row uses a real 48×48 artwork thumbnail at left, one sans/Satoshi title, one date line, one venue line and the accepted outlined View pill. A fallback gradient may replace genuinely missing artwork, but a date tile may never occupy the artwork slot and the date may never be duplicated. The complete row opens event detail; ticket availability remains available on Spotlight, cards, board and detail rather than changing this accepted row into a competing filled-ticket action.

7. **Match the normal continuation rhythm** — Reproduce the accepted rounded `View all N events` bridge immediately after the twelve rows, the `Local Scene` heading/rail card dimensions and spacing, and the Event Board heading/result alignment. The View-all action scrolls to the board and is not static.

8. **Match both Event Boards exactly** — Preserve two columns and 8+8 paging while aligning 4:3 artwork, 1.15rem-equivalent radius, gap, body/footer padding, date typography, title/venue line limits, `SOON` pill placement and footer arrow/status to web mobile. Dates live below artwork; only the accepted `SOON` chip may overlay the artwork.

9. **Match the Carnival opening exactly** — Align All Events/Carnival switch size and inset, road-line measure, spacing and split Top Pick to the web `0.96fr / 1.04fr` copy/art ratio. Preserve the 30px-equivalent Georgia title, compact mono date/venue, two-line description, text CTA, full-height source artwork and current chronological event authority.

10. **Match Featured plans and remove the invented takeover utility panel** — Preserve the exact 58vw/48vw card widths, 176/128/158 artwork rhythm, radii, copy/footer padding and next-card peek. After Featured plans, render the campaign category rail and phase-count rail directly, as accepted web does. Remove the native Filters/Map/Reset panel from Carnival; Map remains the working programme continuation action and normal mode retains the complete expandable discovery controls.

11. **Match Full programme and programme continuation** — Align the category/phase rail borders and spacing, Road schedule/Full programme/result heading, photographic day divider, weekday/date type, 82px information grid, alternating rounded/circular artwork shapes, mono time/ticket text, serif title, venue, 44pt outlined arrow, row rules and final `View all N events` plus Map actions. Dates never replace artwork.

12. **Verify all real controls and states** — Exercise normal/Carnival switching, Complete guide, Filters/search/date/city/genre/category/group, Reset, Map/Browse return, View all, 8-more paging, event detail and provider ticket presentation. Verify selected/expanded/disabled/busy labels, minimum targets, Dynamic Type, safe-area and dock clearance without mutating production or opening a purchase.

13. **Run blocking same-frame visual QA** — Capture fresh compact and representative large normal top, Upcoming, twelve-row list, list-to-Local-Scene transition, normal board, Carnival top, Featured-to-category transition, programme and Carnival board states from the exact current bundle. Normalize each against the matching frozen web artifact or exact source component at the same content state; inspect the combined images, fix every P0/P1/P2 and repeat until the Events-owned surfaces visually match. Separate live-data/time differences from presentation differences.

14. **Close source/build and handoff gates** — Strengthen only focused Events assertions that became stale, run TypeScript, takeover/discovery/Carnival/route/global-shell contracts and scoped diff hygiene, then perform one fresh Simulator build/run after the complete Events batch. Append a superseding project-root `design-qa.md` report ending exactly `final result: passed`. Leave one compact Simulator on default Normal Events. No phone, production, dependency, Git integration, deployment, archive/upload or App Store action is authorised.

### Exact Phase 10L2 allowed file manifest

- `pluggd-mobile/src/features/editorial/EventsBoardScreen.tsx`
- `pluggd-mobile/scripts/verify-mobile-events-discovery-contract.mjs` only for the exact list/card/hierarchy assertions above
- `pluggd-mobile/scripts/verify-mobile-events-takeover-contract.mjs` only if the Carnival utility/order assertion must be strengthened
- `pluggd-mobile/design-qa.md` for one appended superseding Events comparison report while preserving all prior reports
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

Every other modified or untracked file remains separately owned and preserved. Creator Studio is the next sequential phase but is not yet edit-authorised: after Phase 10L2 closes, a fresh screenshot-first Studio audit must inventory every current native surface/form and current web authority, reconcile the existing Studio dirt, and record its own numbered plan and manifest before any Studio product edit.

### Consequential boundary and pre-edit gate

No production/database/storage mutation, location prompt, ticket purchase, RSVP/comment/content/config write, physical-phone install, dependency change, Git staging/commit/push/merge, deployment, archive/upload or App Store action is authorised. The direct user correction, fresh current screenshots, exact accepted source, fourteen numbered items, ownership manifest and verification matrix are recorded before product edits. `AUDIT_REQUIRED=false`; `CODE_EDIT_ALLOWED=true` only for the Phase 10L2 manifest.

## Phase 10L1 Native Events exact mobile-web visual-parity correction — implementation contract — 2026-08-25

### User correction and visual truth

The user rejected the Phase 10L visual result because the native Events screen falls materially short of the accepted mobile-web composition. The controlling visual truth is the accepted web implementation at commit `5e79af7160f9437b541b3637af602016b0e0ac95`, especially `src/pages/Events.tsx`, `src/pages/events-page.css` and these exact 390px captures:

- normal top: `/private/tmp/pluggd-cultural-takeover-web/.ai/tasks/cultural-takeover-web/artifacts/08-mobile-normal-top-390x844.png`
- normal board: `/private/tmp/pluggd-cultural-takeover-web/.ai/tasks/cultural-takeover-web/artifacts/09-mobile-normal-board-390x844.png`
- Carnival top: `/private/tmp/pluggd-cultural-takeover-web/.ai/tasks/cultural-takeover-web/artifacts/10-mobile-carnival-top-390x844.png`
- Carnival programme: `/private/tmp/pluggd-cultural-takeover-web/.ai/tasks/cultural-takeover-web/artifacts/11-mobile-carnival-programme-390x844.png`
- Carnival board: `/private/tmp/pluggd-cultural-takeover-web/.ai/tasks/cultural-takeover-web/artifacts/16-mobile-carnival-board-390x844.png`

The rejected same-frame comparisons are `/private/tmp/pluggd-events-takeover-20260824/comparisons/web-vs-native-normal.jpg` and `web-vs-native-carnival.jpg`. They prove two P1 hierarchy regressions: native inserts a generic normal masthead that web mobile omits, and native inserts an oversized Carnival campaign masthead/search/control stack that pushes the split Top Pick completely below the first viewport. They also prove P1/P2 typography, spotlight selection, surface and programme-rhythm drift. This direct user correction reopens only Events visual composition; the completed lifecycle/data audit remains authoritative and `AUDIT_REQUIRED=false`.

React DOM/Tailwind code cannot execute directly inside React Native, but its exact section order, measurements, typography intent, asset selection, copy and interaction behaviour must be translated rather than redesigned.

### Complete numbered correction plan recorded before product edits

1. **Preserve the proven product contract** — Keep normal Events as default; lifecycle entry/removal, 68/21/47/0 bounded membership, 66 active Browse/Map truth, canonical loader/filter collection, category/group/time/city/genre logic, map, detail, ticket, Hub, loading/error/empty states and 8+8 boards unchanged except where a visual wrapper or scroll target must expose the accepted mobile hierarchy.

2. **Match normal mobile first-view order** — On the native compact/phone composition, remove the extra `Find your next night` hero and duplicate Browse/Map switch. The lifecycle-controlled Carnival entry becomes the first app-owned Events module under the accepted global `DiscoveryHeader`; immediately after it render the three equal Filters/Map/Reset controls and then Event Spotlight, matching accepted web mobile. Keep the page title available to screen readers through an accessibility label rather than spending the viewport on a duplicate visual masthead.

3. **Progressively disclose search and normal filters** — Move the always-visible search box and normal category rail into the existing expandable Filters panel so the collapsed state matches web while preserving real search, category, date, city and genre capability. Active-filter count, selected/expanded/disabled state, reset, result truth and 44-point targets remain intact. The collapsed normal state must not insert category/result-summary rows between the controls and Spotlight.

4. **Match the normal Spotlight surface** — Translate the accepted web spotlight into a single artwork-backed editorial panel with dark directional overlays, orange pill label, Instrument-Serif-equivalent iOS Georgia display typography, description, date/city/venue metadata and working Open Event plus eligible Ticket Link actions. Artwork remains unobstructed by dates; source-backed copy may wrap but the panel must reach the first viewport like the accepted 390px state.

5. **Match the compact Carnival opening** — Replace the rejected boxed campaign headline/body/Browse/Map/Guide masthead with the accepted compact All Events/Carnival 60 switch and one road-ready context line only. Do not duplicate lifecycle marketing copy above Top Pick. All Events remains a working reset/exit; the normal lifecycle entry retains the permanent Complete guide path. Browse/Map/search/filter capability moves below the opening editorial modules rather than displacing them.

6. **Use the accepted Carnival Top Pick authority and composition** — In takeover Browse, select the first chronologically ordered filtered rail event exactly as web mobile does (`railEvents[0]`), not the admin-wide `featured_event` override used by normal Spotlight. Reproduce the split 0.96/1.04 copy-art panel, approximately 248-point height, Georgia serif title, mono date/venue, two-line description and text CTA with the event artwork crop. Normal Spotlight remains admin-curated with the existing Carnival-exclusion guard.

7. **Match Featured plans and working continuation** — Reproduce the web heading (`Featured plans` plus working `See all plans`), asymmetric 58vw/48vw card widths, 176/128/158 artwork rhythm, visible next-card peek, serif titles and unobstructed real artwork. `See all plans` must scroll to the canonical Carnival board; it may not be static text.

8. **Keep full filtering without breaking the accepted Carnival rhythm** — Place compact Filters/Map/Reset and the expandable real search/date/city/genre controls after Featured plans, followed by the accepted category and lifecycle rails. Category/group controls remain on the canonical collection. The default Carnival top comparison must show Top Pick and the Featured transition before these utilities, as web does.

9. **Match programme editorial voice** — Use Georgia serif for Events editorial display headings and Sora/Satoshi for controls/body/data. Remove generic rounded-card drift where web uses full-width ruled surfaces; preserve real-image day dividers, alternate programme artwork shapes (rounded rectangle/circle/compact rectangle), orange mono time/ticket data, 44-point arrows, and the exact Full programme/result hierarchy without date overlays.

10. **Blocking screenshot-comparison gate** — Capture fresh normal top, Carnival top, Featured-to-filters, programme and both boards from the exact current native bundle on the named compact Simulator, plus representative large/Dynamic Type guards. Normalize each current capture with the matching accepted web state in one same-frame comparison. Write the comparison history to project-root `design-qa.md`; fix every P0/P1/P2 and do not freeze or claim parity until its final result is exactly `passed`. Source contracts, TypeScript, rendered proof and external-action boundaries remain separate.

### Exact Phase 10L1 allowed file manifest

- `pluggd-mobile/src/features/editorial/EventsBoardScreen.tsx`
- `pluggd-mobile/scripts/verify-mobile-events-takeover-contract.mjs` only if an existing assertion must be strengthened for the corrected hierarchy/selection
- `pluggd-mobile/scripts/verify-mobile-events-discovery-contract.mjs` only if an existing visual-order assertion must be strengthened; no data-contract change is planned
- `pluggd-mobile/design-qa.md` for the mandatory appended Events comparison report; preserve all existing Home/Profile/Android/Community QA history
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

`src/features/events/eventTakeovers.ts`, `src/features/events/eventDiscoveryData.ts`, `app/events/[id].tsx`, `components/EventsMap.native.tsx`, `src/lib/eventTickets.ts`, Carnival Hub, Homepage, Discovery, Opportunities, Creator Profile, global header/dock/player, backend/schema/dependencies and every unrelated dirty/untracked file are frozen in this correction.

### Consequential boundary and pre-edit gate

No production/database/storage mutation, location prompt, purchase, RSVP/comment/content/config write, physical-phone install, dependency change, Git staging/commit/push/merge, deployment, archive/upload or App Store action is authorised. The user correction, rejected/current comparisons, accepted source, exact numbered plan, dirty ownership and verification gate are now recorded before product edits. `AUDIT_REQUIRED=false`; `CODE_EDIT_ALLOWED=true` only for the Phase 10L1 manifest above.

## Phase 10L Native Events Cultural Takeover — implementation contract — 2026-08-24

### Authoritative outcome and frozen reference

Implement the user-accepted Events Cultural Takeover in the existing native Events product from web commit `5e79af7160f9437b541b3637af602016b0e0ac95` and its frozen handoff at `.ai/tasks/cultural-takeover-web/IOS_HANDOFF.md`. Normal Events remains the default. The temporary Notting Hill Carnival entry and mode exist only during the configured preview, planning, live and wind-down phases, then disappear automatically; the permanent native Carnival Hub remains unchanged and reachable independently as the archive/guide.

This phase is a native adaptation of the accepted 390px hierarchy, not a desktop-web clone. Preserve the accepted native header, bottom dock, event loader, search/filter/ticket/detail/map infrastructure and the already accepted Homepage, Discovery, Opportunities, Creator Profile and Carnival Hub work.

### Pre-edit evidence and dirty ownership reconciliation

- Remote `main` and the frozen handoff resolve to accepted commit `5e79af7160f9437b541b3637af602016b0e0ac95`; local `main` was stale and was not switched into or used to overwrite this dirty native branch.
- Fresh compact native captures at `/private/tmp/pluggd-events-takeover-20260824/before/` confirm the useful Phase 10D search, filter, ticket and event-detail work is present, but the lower Events feed still uses date badges over artwork and full-width cards that consume roughly one screen each. The accepted reference instead requires clean artwork, a compact 12-row list, a small Local Scene rail and an 8+8 two-column Event Board.
- `src/features/editorial/EventsBoardScreen.tsx` is an authorised but incomplete Events-owned file from Phase 10D plus the bounded Opportunities entry. It is adopted as this phase's implementation baseline; no existing search, filter, Browse/Map, ticket, error or Opportunities behaviour may be discarded.
- `src/features/events/eventDiscoveryData.ts` and `scripts/verify-mobile-events-discovery-contract.mjs` are authorised Phase 10D untracked files and remain the canonical loader/contract baseline. The loader is read-only for this phase unless a concrete typed-candidate or count-parity failure requires the already permitted bounded shape change.
- `app/events/[id].tsx`, `components/EventsMap.native.tsx` and `src/lib/eventTickets.ts` are useful authorised Phase 10D dirt. They are preserved and consumed without edits in Phase 10L; focused checks must prove their detail, ticket and map paths still work.
- `src/features/carnival/CarnivalHubScreen.tsx`, Carnival services/artwork, bottom navigation, Homepage, Discovery, Opportunities and Creator Profile belong to accepted prior lanes. Phase 10L may navigate to or read them but may not edit them.
- Other event-related dirt, including creator/community event routes, remains separately owned and untouched. No unrelated modified or untracked file is adopted, reverted, staged or deleted.

### Complete numbered implementation plan recorded before product edits

1. **Pure lifecycle and collection model** — Add one typed, side-effect-free native takeover helper equivalent to accepted web `src/lib/eventTakeovers.ts`. Preserve the exact Europe/London lifecycle boundaries, bounded August/September collection window, London/geography and Carnival identity rules, configured categories, before/live/after grouping and lifecycle copy. The helper owns no network or persistence and creates no backend.

2. **One canonical event collection** — Start from `usePublicActiveEvents`, after its canonical discoverable, active-window, cancelled-row, pagination and de-duplication rules. Derive the bounded Carnival collection once, then apply campaign category/group plus existing search/date/city/genre filters to that same collection. Browse, Map, result counts, Top Pick, featured plans, programme rows, two-column board, detail routes and ticket actions must consume the identical final filtered array; zero results never fall back to unrelated events.

3. **Default normal Events and lifecycle entry** — Keep `experienceMode='all'` as the initial state. During preview/planning/live/wind-down only, render a compact Carnival entry above normal Events discovery with the current lifecycle language, verified programme total, `Open Carnival mode` and `Complete guide`. Before promotion and after wind-down, render no temporary entry and force any stale takeover state back to normal without hiding or changing the permanent Carnival Hub.

4. **Campaign masthead, exit and guide** — Opening Carnival mode replaces the generic Events masthead inside the same `/events` route while preserving `DiscoveryHeader` and the global bottom dock. Provide an accessible All Events/Carnival switch, one-line road-ready context, current phase title/copy, programme and before/weekend/after counts, Browse, Map and Complete road guide actions. `All Events` resets campaign category/group and shared query/time/city/genre state, restores Browse and returns the exact normal hierarchy immediately. Complete guide uses the existing `/hubs/notting-hill-carnival-2026` route and unchanged Hub artwork.

5. **Working search and filters in both modes** — Retain the existing Events-owned search and expandable date/city/genre filters. Normal mode retains its category rail. Carnival mode exposes All, Free, Sound systems, Mas + J'ouvert, Workshops + talks, Parties and Family plus Before the road, Carnival weekend and After the road counts/filters. Every control has selected/expanded/disabled state, resets the 8-card board limit, reports the truthful total and shares the collection with Map; a missing category/group renders a deliberate empty state and one-action reset.

6. **Accepted normal mobile hierarchy** — Reorder normal Browse to `Filters / Map / Reset` → Event Spotlight → Upcoming horizontal artwork rail → compact 12-row event list → small horizontal Local Scene rail → compact Event Board. Keep a varied, intentional editorial rhythm, retain real curated spotlight selection but avoid duplicating the active Carnival entry as the normal spotlight where another event exists, and preserve working ticket/detail actions.

7. **Accepted Carnival mobile hierarchy** — Recreate the accepted 390px native composition with a split copy/artwork Top Pick, an asymmetrical horizontal Featured plans rail with visible next-card peek, campaign category and lifecycle rails, textured real-image day dividers, varied compact programme rows, Browse/Map/guide actions and the complete Carnival Event Board below. Use existing event and Carnival artwork only; add no generated or placeholder campaign art.

8. **Compact 8+8 boards and clean artwork** — Replace the obsolete full-width `FullEventCards` feed with one reusable two-column Event Board in both normal and Carnival modes. It starts at exactly eight events and adds exactly eight per working action until complete. Event card artwork remains unobstructed; dates/times live beside or below the image and are never duplicated as image overlays. Remove date overlays from Spotlight, Upcoming and map recommendation artwork as well. Preserve readable two-line titles, venue/city, truthful ticket state and exact event-detail/ticket navigation without horizontal overflow.

9. **States, accessibility and preservation** — Preserve loading, retry, honest empty, ticket busy/error and map-empty states; do not request location permission or create fake coordinates/content. Keep minimum 44-point actions, Dynamic Type tolerance, VoiceOver labels plus selected/expanded/busy state, Reduce Motion-safe existing entrance behaviour, safe-area and mini-player/dock clearance. Do not edit ticket checkout, RSVP persistence, map services, bottom navigation, backend/schema, dependencies or any accepted non-Events page.

10. **Source, data and rendered integration gate** — Execute the same lifecycle/membership/category/group boundary fixtures as web through the actual native helper, add one focused Phase 10L source contract, run the existing Events/product/commerce/route/preservation contracts, native TypeScript and scoped diff hygiene. Compare the exact native and accepted web Carnival counts on the same current public input. Render and visually inspect compact and large Simulator states for normal Events, planning entry, Carnival Browse, category/group selection and honest zero state, Map with the same count, All Events return, event detail/ticket presentation and Carnival Hub navigation. Capture normalized same-state comparisons and check artwork, typography, spacing, overflow, safe area, dock and accessibility. Source, count, rendered and external-action evidence remain separate.

### Exact Phase 10L allowed file manifest

- `pluggd-mobile/src/features/editorial/EventsBoardScreen.tsx`
- one new pure helper: `pluggd-mobile/src/features/events/eventTakeovers.ts`
- `pluggd-mobile/src/features/events/eventDiscoveryData.ts` only if a concrete typed-candidate or same-input count failure proves the bounded loader shape is required; no such edit is planned at gate opening
- one new focused contract: `pluggd-mobile/scripts/verify-mobile-events-takeover-contract.mjs`
- existing focused contracts may be read/run but changed only if a Phase 10L assertion proves stale and this contract is updated first
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

### Consequential boundary and stop conditions

No production write, schema/RLS/backend change, location permission request, ticket purchase, RSVP/comment/content/config mutation, physical-phone build/install, dependency change, Git staging/commit/push/merge, deployment, archive/upload or App Store action is authorised. Stop and reopen scope if the canonical loader cannot reproduce the accepted same-input collection, the native map requires a service edit, the Hub route is broken, or any requested behaviour requires a file outside the manifest.

### Pre-edit gate

The authoritative handoff, accepted reference images, current compact native render and dirty ownership have been inspected. All ten requirements, exact allowed manifest, preservation rules and source/data/compact/large verification matrix are recorded before product edits. `AUDIT_REQUIRED=false`; `CODE_EDIT_ALLOWED=true` only for Phase 10L after the matching Progress, Verify and active-task records contain this same scope.

## Phase 10K Discovery-destination final polish — implementation contract — 2026-08-24

### Outcome and frozen boundaries

Apply the final visual-audit corrections to Creators, Community, Live, BeatPlug, Store and the shared Discovery-return rhythm so these public destinations feel intentional, truthful and competitive at both compact and large iPhone widths. This is a focused polish pass over the accepted Phase 10J compositions, not another redesign.

Homepage, Discovery, Opportunities and Creator Profile presentation remain frozen. Events and event detail remain separately owned and must not be edited, reformatted or absorbed. The global bottom dock, player behaviour, data policies, production records, dependencies and unrelated dirty work are preserved unless a Phase 10K check proves a regression inside the exact allowed surface.

### Complete numbered implementation plan recorded before product edits

1. **Creators: public copy and first-view hierarchy** — Current compact evidence at /private/tmp/pluggd-phase10k-audit-20260824/before/01-creators.png shows internal implementation language in the hero, an oversized 430-point stage that consumes the full first viewport, and no visible creator card before the dock. Replace internal phrases such as “resolved to their real public identity” and “Start with a real profile” with audience-facing editorial copy. Tighten the hero and featured-card proportions, preserve the real profile counts and artwork, and ensure the first featured creator identity/action enters the journey sooner without clipping. Allowed files: src/features/directory/CreatorDirectoryScreen.tsx and the focused Phase 10K contract; creatorDirectoryService.ts only if source review proves a presentation field is missing. Preserve search, tabs, filters, follow/auth, blocked-user exclusion, canonical profile routes, loading/error/empty states and factual counts.

2. **Community: presentable canonical identity** — Current compact evidence at /private/tmp/pluggd-phase10k-audit-20260824/before/02-community.png correctly shows Fly Jones but exposes the system-generated handle @admin-862d3297. Resolve public identity field by field: social_author_profiles remains the primary authority, public_profiles may fill or replace only an absent/system-generated public handle, and authenticated profiles remains the final safe fallback. Never invent a handle. If no presentable handle exists, render the real display name and date without @pluggd or an internal slug; profile navigation falls back to the canonical user route. Apply the same rule to feed, repost/quote, thread, comment and media identity. Allowed files: src/lib/publicAudienceFilters.ts, src/features/culture/publicCreatorIdentity.ts, src/features/culture/mobileSocial.ts, src/features/culture/MobileSocialPostCard.tsx and focused contracts. Preserve feed order, moderation, rich media, polls, destinations, composer/mutations and Community tabs.

3. **Live: useful honest empty composition** — Current compact evidence at /private/tmp/pluggd-phase10k-audit-20260824/before/03-live.png repeats “Nothing scheduled” in the feature panel and every category tile, making a truthful empty inventory feel broken. Keep one explicit “Nothing live or scheduled yet” status in Featured Live. Give the four category tiles distinct permanent editorial labels and concise purpose copy when no real source exists; only real sources may add LIVE, scheduled or replay status and become tappable. Tighten the empty focus so all four categories read as useful discovery entry points while preserving real joinability, reminders, replays, create-live auth and event ownership. Allowed file: src/features/live/live-culture-screen.tsx plus focused contracts.

4. **BeatPlug: one licence truth and responsive actions** — The featured beat exposes a real View licence action and price while the summary currently counts only non-empty available_licenses arrays, producing a contradictory “0 with licence options” metric. Introduce one source-safe licence-availability predicate used by the summary and visible CTA logic, covering the existing available_licenses and license_prices fields and the current licensable price contract without making the client authoritative for checkout. Keep View licence routed to beat detail, make the primary/secondary hero actions fit compact widths without crowding, and tighten top rhythm without losing the strong catalogue composition. Allowed file: src/features/editorial/BeatPlugScreen.tsx plus focused contracts. Preserve audition playback, search/sort, producer identity, checkout policy, prices and no-purchase QA.

5. **Store: headline measure and responsive hero** — Prevent the hero message from producing a weak final-line widow at large or accessibility widths. Use a shorter audience-facing line with a controlled readable measure, keep the existing store identity and two working actions, and verify both buttons retain 44-point targets without squeezing. Allowed file: src/features/editorial/MarketStoreScreen.tsx plus focused contracts. Preserve official/creator/sample-pack inventory, real owner identity, stock truth, basket, product routes, currency and checkout policy.

6. **Shared return and bottom-chrome rhythm** — Standardise the shared Back to Discovery component’s vertical measure and rule alignment so custom-header and standard-header destinations begin consistently. Verify every changed screen uses useBottomChromeInset and that final content clears the existing mini-player/dock. Do not redesign or resize the global dock in this phase; a global change is authorised only if same-state Home, Discovery, Opportunities and Creator Profile preservation evidence proves it necessary, which the current audit does not. Allowed file: src/features/discovery/DiscoveryReturnBar.tsx plus the five destination files above. Preserve 44-point target size, replace-to-Discovery semantics, nested back history and all accepted shell/player behaviour.

7. **Source, interaction and visual integration gate** — Add one focused Phase 10K contract covering public copy, presentable-handle suppression, shared licence truth, Live empty semantics, Store headline and shared spacing. Run TypeScript, the Phase 10J aggregate destination contract, Community/social identity, Live, Store, route, player and Home/Discovery/Profile preservation contracts, plus scoped diff hygiene. On both compact and large Simulators, inspect top and lower scroll states, Back to Discovery, tabs/filters, profile/detail returns, real-data and empty/loading/error branches that can be reached without mutating auth or production, and paused/playing bottom-chrome clearance. Create fresh same-frame comparisons from current Phase 10K before/after captures. Source checks and screenshots are reported separately from authenticated, phone, build, production and release proof.

### Exact Phase 10K allowed product-file manifest

- pluggd-mobile/src/features/directory/CreatorDirectoryScreen.tsx
- pluggd-mobile/src/features/directory/creatorDirectoryService.ts only if an existing public presentation field is proven missing
- pluggd-mobile/src/lib/publicAudienceFilters.ts
- pluggd-mobile/src/features/culture/publicCreatorIdentity.ts
- pluggd-mobile/src/features/culture/mobileSocial.ts
- pluggd-mobile/src/features/culture/MobileSocialPostCard.tsx
- pluggd-mobile/src/features/live/live-culture-screen.tsx
- pluggd-mobile/src/features/editorial/BeatPlugScreen.tsx
- pluggd-mobile/src/features/editorial/MarketStoreScreen.tsx
- pluggd-mobile/src/features/discovery/DiscoveryReturnBar.tsx
- pluggd-mobile/scripts/verify-mobile-discovery-destination-polish-contract.mjs
- existing focused contracts only when a Phase 10K assertion must be added or a proven stale assertion corrected
- this task's CONTRACT.md, PROGRESS.md, VERIFY.md and matching ACTIVE_TASKS.md row

No Events-owned file, global tab/dock component, Opportunities, Creator Profile, Homepage, Discovery composition, schema, dependency, production, phone, Git integration, deployment, archive/upload or App Store action is authorised.

### Pre-edit gate

The fresh compact captures above were inspected before this plan. The seven numbered items, exact allowed manifest, preservation constraints and verification matrix are recorded before product edits. AUDIT_REQUIRED=false and CODE_EDIT_ALLOWED=true only after this contract, PROGRESS.md, VERIFY.md and the matching active-task row contain the same Phase 10K scope.

## Phase 10J Discovery destinations and canonical content identity — audit contract — 2026-08-24

### Outcome and boundaries

Raise every Discovery-linked native destination except Events to the current mobile-web product's content, capability and presentation standard while retaining a deliberate native composition. No screen may remain a generic vertical stack or plain template. Community Pulse and every creator-owned content surface must render the canonical public creator identity rather than `PLUGGD user`, `User` or an invented platform label. All in-scope entry screens must provide a clear, working return to Discovery.

The accepted newer Homepage and Discovery designs are frozen; parity there remains content/capability parity, not design cloning. The accepted Opportunities and Creator Profile designs are also frozen except where a shared identity or return-navigation adapter can be changed without altering their presentation. Events is excluded because another agent owns its redesign and will provide a separate handoff.

### Audit inventory required before product edits

1. Community Pulse and shared content identity.
2. Mixes (`/mixes`).
3. Soundboards (`/soundboards`).
4. Releases / Listening Floor (`/releases`).
5. Live (`/live`).
6. THE PLUG (`/plug`).
7. BeatPlug (`/market/beats`).
8. Opportunities (`/opportunities`) — preservation audit only unless a functional regression is proven.
9. Creators (`/directory`).
10. Community (`/community`).
11. Store (`/market`).
12. Maps (`/maps`).
13. Library (`/library`).
14. Shared Back to Discovery and return-state behaviour across all twelve destination entry screens.

For every item, the final matrix must name the exact native route/component/data authority, current mobile-web counterpart, current rendered defect, proposed structure and interactions, expected file manifest, preservation constraints, loading/error/empty/auth/accessibility behaviour, and compact/large rendered journey checks. The matrix must be grounded in screenshots captured and inspected during this audit. Existing historical screenshots may provide context but cannot close the gate.

### Complete numbered implementation matrix recorded before product edits

The matrix below is grounded in exact-current compact native captures under `/private/tmp/pluggd-destination-parity-audit-20260824/native/`, fresh 390px production-web captures under `/private/tmp/pluggd-destination-parity-audit-20260824/web/`, and same-frame comparisons under `/private/tmp/pluggd-destination-parity-audit-20260824/comparisons/`. The production `/live` reference truthfully redirects to Signal Room authentication; its signed-out capture plus the current local `src/pages/live/Index.tsx` implementation define the public/authenticated boundary. Events remains absent from every edit lane.

1. **Community Pulse and shared creator identity** — Native entry: Discovery `/discover` → `DiscoveryExperience` Community Pulse; shared renderers `MobileSocialPostCard` and `MobileSocialMediaViewer`; data authority `social_posts`, `social_comments`, `social_post_destinations` and `mobileSocial.ts`. Web counterpart: `/community` through `useSocialFeed.tsx`, whose public-safe `social_author_profiles` lookup precedes signed-in `profiles`. Current defect: the compact capture renders `PLUGGD user` because signed-out native reads `profiles` directly and RLS returns no author rows; the same fault reaches the full Community feed, original/repost cards, thread comments and media viewer. Fix: add one public-content identity adapter that batches unique user IDs through `social_author_profiles`, fills missing signed-in rows from `profiles`, retains canonical `user_id`, username, full name and avatar, and never replaces an available handle with a platform label. Truly absent/deleted public identities use the deliberate neutral label `Community member`, never `PLUGGD user` or `User`. Expected files: new `src/features/culture/publicCreatorIdentity.ts`; `src/features/culture/mobileSocial.ts`; `src/features/culture/MobileSocialPostCard.tsx`; `src/features/culture/MobileSocialMediaViewer.tsx`; `src/features/discovery/DiscoveryExperience.tsx`; focused contract. Preserve blocking/moderation, post ordering, rich image/video/audio/poll/link/thread rendering, exact post routes and all mutation/auth gates. Verify signed-out Community Pulse, full feed, original/repost, thread/comment and media-viewer identity, avatar and creator-route labels on compact and large; a missing-profile fixture remains safe and non-generic.

2. **Mixes (`/mixes`)** — Native route `app/mixes/index.tsx` → `MixesParityScreen` → `MixesWorldScreen`; data authority public/published `mixes`, upcoming discoverable `events`, published `blog_posts`, shared playback and saved-content routes. Web counterpart exact `src/pages/Mixes.tsx` at `/mixes`. Current defect: the compact hero is visually credible, but the lower experience is a sequence of full-width vertical stacks; `New & notable`, city selectors, scene explorer, radio and events do not provide the web page's browseable rail rhythm, and no Back to Discovery exists. Fix: retain the accepted hero/finder and convert the catalogue, selectors, scene, radio and event blocks into bounded 78–84vw snap rails with full artwork, readable two-line titles, play/open-room separation and deliberate peeking; retain editorial highlights as an issue-style closing panel. Expected files: `src/features/editorial/MixesWorldScreen.tsx`, shared return component/header, focused contract. Preserve the exact public/published query, search/filter semantics, play/pause/progress, long-press actions, exact mix/detail routes, loading/retry/empty behaviour and event ownership. Verify hero tabs, finder, every horizontal rail, play/pause, mix detail/back, Back to Discovery, no clipped cards and bottom-chrome clearance at compact and large widths.

3. **Soundboards (`/soundboards`)** — Native route `app/soundboards/index.tsx` → `SoundboardsParityScreen` → `SoundboardsIndexScreen`; data authority public/published `soundboards`, saved public preview items and creator profiles. Web counterpart `src/pages/Soundboards.tsx`. Current defect: the canvas previews already meet the product's strongest visual pattern, but the page omits the web entry's owner actions, still permits `Building in public` in place of a resolvable creator identity, and has no Back to Discovery. Fix: keep the real canvas cards, add Back to Discovery and authenticated `Manage your boards` / `New Soundboard` routes (`/studio/catalog?tab=soundboards`, `/studio/soundboards/new`), resolve creators through the shared public identity adapter, and hide owner-only actions for signed-out visitors while retaining the sign-in follow prompt. Expected files: `src/features/editorial/SoundboardsIndexScreen.tsx`, shared identity/return files, focused contract. Preserve canvas item ordering, search/sort, public visibility, exact board detail/back, owner/RLS boundaries and empty/error states. Verify signed-out and owner-aware header states, real creator handle, canvas interaction and return on compact/large.

4. **Releases / Listening Floor (`/releases`)** — Native route `app/releases/index.tsx` → `ReleasesParityScreen` → `ListeningFloorScreen`; data authority approved/live public releases and tracks, public release-market signals, THE PLUG stories, events/live listening passes and shared player. Web counterpart `src/pages/Releases.tsx` and its real Listening Floor/Room components. Current defect: the accepted native lead drop and vinyl/deck foundation already correspond to web, but no Back to Discovery exists and Pressing Orders/Listening Passes remain long vertical blocks rather than tactile browseable shelves. Fix: preserve the lead drop, sleeve/deck/progress/search/chart/wall/ledger hierarchy; add Back to Discovery; present Fresh Pressings, Pressing Orders and available Passes as snap rails with artwork, complete title/artist/price/support/pass facts and exact detail actions. Expected files: `src/features/editorial/ListeningFloorScreen.tsx`, shared return component/header, focused contract. Preserve release policy, public visibility, multi-track playback, save/support/purchase separation, lyrics/detail routes, no private/download URL exposure, filter/empty/error behaviour. Verify deck progress, track switching, search/filter, each rail, release detail/back and Discovery return on compact/large.

5. **Live (`/live`)** — Native route `app/live/index.tsx` → `LiveCultureScreen`; data authority live-room hooks, live schedule/events, backstage, replays, creator profiles and reminders. Web counterpart authenticated `src/pages/live/Index.tsx`; production signed-out `/live` redirects to Signal Room authentication and was not bypassed. Current defect: native already has a strong real-data Live composition and honest empty state, but lacks Back to Discovery and the empty focus dominates the entry without a clear route back. Fix: add the shared return control beneath the custom Live header; retain the featured focus, honest category cards, schedule, replays and creator rails; tighten only empty-focus spacing so the first real category shelf remains visible on compact screens. Expected files: `src/features/live/live-culture-screen.tsx`, shared return component, focused contract. Preserve joinability checks, live/upcoming/replay truth, reminder/auth gates, create-live route, no invented live status and all event ownership. Verify signed-out empty/current real-data states, category actions, reminder auth response, replay playback when available and return behaviour on compact/large.

6. **THE PLUG (`/plug`)** — Native route `app/plug/index.tsx` → `ThePlugIndexScreen`; data authority `loadThePlugEditorialStories`, explicit feature/rank state, story metadata and exact native reader. Web counterpart `src/pages/ThePlug.tsx` at `/discover/the-plug`. Current defect: native receives current stories and art, but its generic black card grid loses the production web magazine's warm-paper issue identity, edition hierarchy, lead feature, numbered/front-desk rhythm and Back to Discovery. Fix: recompose the same real story data into the current web mobile magazine language: cream paper, edition masthead, large serif `THE PLUG`, issue count, image-led lead, horizontal `In this edition` strip, lead dispatch and numbered story rail/grid; add Back to Discovery with dark-on-paper treatment. Expected files: `src/features/editorial/ThePlugIndexScreen.tsx`, shared return component, focused contract. Preserve current editorial selection/rank, artwork, complete article reader, categories, refresh, external-link policy, loading and honest empty state. Verify D'Yani/current lead artwork reception, category change, story reader/back/share and Discovery return on compact/large with no clipped titles.

7. **BeatPlug (`/market/beats`)** — Native route `app/market/[section].tsx` → `MarketParityScreen` → `BeatPlugScreen`; data authority public/licensable `beats`, available licences, public Soundboards and shared playback. Web counterpart `src/pages/Marketplace.tsx` at `/market/beats`. Current defect: the native hero, audition controls and licence hierarchy are strong, but entry from Discovery highlights Store, has no explicit return, and Trending/producer blocks fall back to plain rows. Fix: add Back to Discovery, keep the hero/player/search/licence grid, turn current picks and producers into artwork-led snap rails, keep the full beat grid for deliberate catalogue browsing, and ensure every producer/beat displays its real stored producer identity without `PLUGGD Producer` when a public owner can be resolved. Expected files: `src/features/editorial/BeatPlugScreen.tsx`, shared identity/return files, focused contract. Preserve server-authoritative licensing/checkout, safe audition URLs, exact beat routes, save/auth, no purchase in QA, search/sort and empty/error states. Verify audition progress, view licence, filters, rails, beat detail/back and Discovery return on compact/large.

8. **Opportunities (`/opportunities`) — preservation lane** — Native route `app/opportunities/index.tsx` → `OpportunitiesScreen`; data authority opportunity service/model matching, eligibility, organiser art and saved/application state. Web counterpart `src/pages/Opportunities.tsx`. Current comparison confirms the accepted native design already reaches the web content/capability standard. Fix: add only the shared Back to Discovery treatment without altering hero, metrics, search/filter, matching, feature or card presentation. Expected files: `src/features/opportunities/OpportunityScreens.tsx`, shared return component/header, focused contract assertion. Preserve every accepted opportunity behaviour, private matching, official external actions, saved/preparation/application state, organiser identity, artwork and all current compact/large evidence. Verify presentation remains unchanged apart from the return row and its route.

9. **Creators (`/directory`)** — Native route `app/directory.tsx` → `CreatorDirectoryScreen`; data authority `creatorDirectoryService.ts` over `public_profiles`, viewer follows and blocked-user state. Web counterpart `src/pages/Directory.tsx`. Current defect: the compact native page is a utilitarian filter header followed by indistinguishable list rows; it has no visual discovery stage, rails, creator cover treatment or Back to Discovery, and unresolved profiles can become `PLUGGD creator`. Fix: retain the three factual directory taxonomies/search/type/country filters, but add an image-led editorial directory stage, verified/active counts, a real `Creators to know now` snap rail from ranked public entries, and a two-column artwork/cover-led creator gallery with circular avatar, handle, role, location/genre, follower proof and working Follow/Profile actions. Exclude entries without a resolvable public name/handle instead of inventing one. Expected files: `src/features/directory/CreatorDirectoryScreen.tsx`, `src/features/directory/creatorDirectoryService.ts`, shared return component, focused contract. Preserve factual directory semantics, blocked-user exclusion, follow auth/mutation, verified flags, canonical creator routes, refresh/loading/error/empty behaviour. Verify all tabs and filters, featured rail, grid wrapping, follow sign-in gate, profile/back and Discovery return at compact/large.

10. **Community (`/community`)** — Native route `app/community.tsx` → `CommunityFeedScreen`; data authority `loadCommunityFeedBundle` and the shared social loader. Web counterpart `src/pages/Community.tsx`. Current defect: native already contains feed/boards/explore/maps structure and rich cards, but generic identities make it look unfinished, the paused mini-player can reopen over the feed after route changes, and no Back to Discovery exists. Fix: apply the canonical author adapter to feed/original/thread/comment/media states, add Back to Discovery to every loading/error/tab branch, and retain the accepted rich card media viewer and internal switcher. Expected files: `src/features/community-feed/CommunityFeedScreen.tsx`, shared identity/return/player files, focused contract. Preserve composer/mutations/auth, feed filters, boards, communities, rich full-screen image/video behaviour, post detail/back and moderation. Verify web/native author agreement for Fly Jones, Ola Kingdom and other current posts, media open/close, tab changes, collapsed paused player and Discovery return on compact/large.

11. **Store (`/market`)** — Native route `app/market/index.tsx`/market parity → `MarketStoreScreen`; data authority approved public official `store_products`, live physical `creator_merchandise`, sample packs and physical basket state. Web counterpart `src/pages/Store.tsx`. Current defect: native already has a strong editorial storefront, but lacks Back to Discovery and creator merchandise is labelled only `Creator shop`, losing the owner's public identity. Fix: add Back to Discovery, select creator `user_id`, enrich creator merchandise with the shared public identity adapter and show the real display name/handle on featured/grid cards; retain the native dark editorial composition and existing merchandise/sample-pack rails. Expected files: `src/features/editorial/MarketStoreScreen.tsx`, shared identity/return files, focused contract. Preserve public/approved/GBP/physical filters, stock and sold-out truth, basket and purchase routes, checkout policy, no client-authoritative price and all loading/error/empty states. Verify real owner identity where creator goods exist, product/basket routes, sample-pack rail and Discovery return on compact/large without purchase.

12. **Maps (`/maps`)** — Native route `app/maps.tsx` → `MapSignalsScreen`; data authority public map signals, Mapbox, approximate location, saved Carnival route, tune/like/create mutations. Web counterpart `src/pages/Maps.tsx`. Current comparison confirms the native full-screen map is already the stronger native composition. Fix: integrate a compact Back to Discovery pill into the top overlay and rebalance list/map top offsets; keep map and accessible-list modes visually intact. Expected files: `src/features/maps/MapSignalsScreen.tsx`, shared return component only if reusable, focused contract. Preserve approximate-location privacy, Mapbox fallback, live polling, filters, list accessibility, auth-gated creation/tune/like, directions and current selected-sheet behaviour. Verify map/list, search/filter, unavailable fallback, 44pt return control and Discovery return on compact/large without publishing a signal.

13. **Library (`/library`)** — Native route `app/library.tsx` → `LibraryScreen`; data authority `loadLibraryBundle` saved content, playlists, tickets, purchases and entitlements. Web counterpart `src/pages/Library.tsx`. Current defect: native is a heading/stats/tabs/row template and its signed-out/empty state has no artwork-led reason to return; web supplies market, PLUGGD DJ, wallet/access and browse pathways. Fix: add Back to Discovery, an image-led collection stage using the existing Library destination art, primary `Continue discovering` and `Browse Market` actions, horizontal shelves for saved music/playlists/events/access, and a compact ownership vault/DJ bridge; populated content uses real artwork and empty states remain truthful. Expected files: `app/library.tsx`, shared return component, focused contract. Preserve saved/ticket/purchase/entitlement separation, playlists, purchase routes, no fake wallet balance or invented content, authentication behaviour and loading/error states. Verify empty and fixture-populated shelves, filters, exact content routes, access gateway and Discovery return on compact/large.

14. **Shared Back to Discovery, nested return and player clearance** — Native authority all twelve entry screens plus shared `DiscoveryHeader`/new return component and `MiniPlayer`. Web reference uses persistent Discover navigation while exact detail pages retain normal Back. Current defect: none of the twelve native entry captures exposes a labelled Back to Discovery; Store/BeatPlug/Community dock selection changes context, and the paused mini-player resets to expanded on unrelated pathname changes and obscures destination content. Fix: one 44pt `Back to Discovery` control calls a stable `/discover` replacement so direct/deep-linked entry cannot loop; entry → nested detail uses normal history back to the entry, then explicit Discovery return; loading/error/empty branches expose the same control. Split mini-player track-change and route-change effects so navigation may auto-collapse a paused/route-sensitive player but can never auto-expand a user-collapsed player. Expected files: new `src/features/discovery/DiscoveryReturnBar.tsx` or the equivalent export in `DiscoveryHeader.tsx`; every named entry screen; `components/MiniPlayer.tsx`; one aggregate route/render contract. Preserve bottom tabs, ordinary non-Discovery navigation, full-player route, play/pause/queue state and active track. Verify direct entry, Discovery entry, detail/back/Discovery, hardware/back behaviour, paused and playing mini-player clearance on compact/large across all twelve screens.

### Exact Phase 10J allowed product-file manifest

- `pluggd-mobile/src/features/culture/publicCreatorIdentity.ts` (new)
- `pluggd-mobile/src/lib/publicAudienceFilters.ts`
- `pluggd-mobile/src/lib/mobileContent.ts`
- `pluggd-mobile/src/features/culture/mobileSocial.ts`
- `pluggd-mobile/src/features/culture/MobileSocialPostCard.tsx`
- `pluggd-mobile/src/features/culture/MobileSocialMediaViewer.tsx`
- `pluggd-mobile/src/features/culture/useCultureData.ts`
- `pluggd-mobile/src/features/discovery/DiscoveryExperience.tsx`
- `pluggd-mobile/src/features/discovery/discoveryModel.ts`
- `pluggd-mobile/src/features/discovery/DiscoveryHeader.tsx`
- `pluggd-mobile/src/features/discovery/DiscoveryReturnBar.tsx` (new if the shared header cannot own both custom and standard mastheads cleanly)
- `pluggd-mobile/src/features/editorial/MixesWorldScreen.tsx`
- `pluggd-mobile/src/features/editorial/SoundboardsIndexScreen.tsx`
- `pluggd-mobile/src/features/editorial/ListeningFloorScreen.tsx`
- `pluggd-mobile/src/features/live/live-culture-screen.tsx`
- `pluggd-mobile/src/features/editorial/ThePlugIndexScreen.tsx`
- `pluggd-mobile/src/features/editorial/BeatPlugScreen.tsx`
- `pluggd-mobile/src/features/opportunities/OpportunityScreens.tsx`
- `pluggd-mobile/src/features/directory/CreatorDirectoryScreen.tsx`
- `pluggd-mobile/src/features/directory/creatorDirectoryService.ts`
- `pluggd-mobile/src/features/community-feed/CommunityFeedScreen.tsx`
- `pluggd-mobile/src/features/editorial/MarketStoreScreen.tsx`
- `pluggd-mobile/src/features/maps/MapSignalsScreen.tsx`
- `pluggd-mobile/app/library.tsx`
- `pluggd-mobile/app/post/[id].tsx`
- `pluggd-mobile/src/features/search/search-discovery-screen.tsx`
- `pluggd-mobile/src/features/stage/stage-discovery-screen.tsx`
- `pluggd-mobile/src/features/backstage/backstage-world-screen.tsx`
- `pluggd-mobile/src/features/connect/ConnectCardScreen.tsx`
- `pluggd-mobile/src/features/parity/appWideParityServices.ts`
- `pluggd-mobile/components/MiniPlayer.tsx`
- one new focused aggregate contract under `pluggd-mobile/scripts/verify-mobile-discovery-destination-completion-contract.mjs`; existing focused contracts may be changed only when an assertion is proven stale by this authorised implementation.

No Events-owned route, component, service, test, screenshot plan or task record is in the manifest. No schema, dependency, production, phone, Git, deployment or release action is authorised.

The shared identity lane may touch the listed post-detail, search, Stage, Backstage, Connect Card and parity aggregation files only to resolve or suppress an invented creator credit. It may not redesign those accepted surfaces. This bounded amendment follows the user's explicit requirement that creator-owned content never present `PLUGGD user`, `User` or another manufactured identity, and the large-Simulator finding that a review-test account remained in the public Community feed.

### Pre-edit and consequential-action gate

- `AUDIT_REQUIRED=true` and `CODE_EDIT_ALLOWED=false` until the complete numbered matrix is written into this contract and mirrored as unchecked evidence in `VERIFY.md`.
- Planning records and temporary screenshots are the only authorised writes during Phase 10J0.
- No product/source file, database, storage object, dependency, phone build, Git integration, deployment, archive/upload or App Store state may change during the audit.

## Phase 10I Discovery content-and-capability parity repair — 2026-08-24

### Outcome and design boundary

Keep the accepted newer native Discovery design and make it a complete, truthful discovery product: admin-controlled opening and timely features, a seasonal campaign lifecycle, real personalisation, working scene/genre/city/chart modes, complete permanent-destination artwork, and the useful content depth present on mobile web without copying the web layout. Homepage, Opportunities, Creator Profile, Community internals and the linked destination screens remain separate products and must not be redesigned here.

### Complete numbered implementation plan recorded before product edits

1. **Preserve and attribute the current dirty work** — retain the useful existing native Discovery repairs: public destination registry, complete Opportunities rail, public active-event paging, canonical creator resolution, scene normalisation, chart engagement ranking, working routes/playback and accepted header/spacing. Remove only the Discovery-specific duplications or semantic regressions proven by the 2026-08-24 visual audit. Preserve all unrelated dirty and untracked files.
2. **Seasonal Carnival lifecycle** — remove Carnival as an unconditional permanent destination. Read a scheduled `seasonal_spotlight` placement first; while the schema change is source-only, retain a bounded Notting Hill Carnival fallback that expires after the 2026 event window. After expiry, no stale Carnival card remains: the slot hides until an administrator schedules the next real internal campaign. The Carnival hub remains available through its canonical route while it is featured.
3. **Complete destination artwork system** — give every permanent Discovery destination one purpose-made, rights-safe raster asset with a coherent PLUGGD editorial treatment. Destination cards use these stable graphics rather than whichever content row happens to be first. Preserve the current Carnival Hub artwork unchanged during the bounded 2026 fallback; after Carnival, the seasonal slot uses the scheduled feature's own artwork. Titles, metadata, gradients and crops must remain legible at compact and large widths.
4. **Image fallback reliability** — repair `PluggdImage` so a packaged local fallback is visible immediately on native and remains available if a remote transform and original both fail. Remote images keep their current transform/original fallback sequence; missing art keeps the neutral surface when no local fallback exists.
5. **Explicit admin semantics** — `hero_rotation` controls the complete `Start somewhere unexpected` opening stage, including the named continuation rail beneath the mosaic; `what_moving_now` becomes a prominent near-top feature; `discover_for_you` provides scheduled editorial seeds/fallbacks for the personalised shelf; `seasonal_spotlight` controls time-bounded campaigns. Unknown or empty placements fail soft without substituting unrelated content.
6. **Realtime pulse parity** — consume scheduled `discover_ticker_items` in native, resolve content rows to their exact public destinations, allow only safe internal promo routes, and merge them ahead of bounded organic live/content signals without duplicates. The result is an accessible near-top horizontal culture pulse, not hidden bottom copy.
7. **Truthful opening and For You** — keep the current mosaic visual language for `Start somewhere unexpected`, but source it from `hero_rotation` with organic fallback. Add a distinct `More for you` shelf ranked from real signed-in genre affinity, followed creators, recent plays/favourites and freshness; down-rank already-played items and use scheduled `discover_for_you` plus balanced editorial content when signals are absent or sparse. Copy must say when picks are editorial rather than pretend they are personalised.
8. **Truthful filter modes** — `Scenes` shows real scene destinations/counts and an exact selected-scene result; `Genres` shows real genre destinations/counts; `Cities` shows real city destinations/counts; `Charts` exclusively owns the measured Top 10. No mode may render the entire default page, replace an empty exact scene with unrelated results, or label a mix-only list as all scenes.
9. **Default section composition** — in the accepted native visual language, order the default journey as search/filter/realtime pulse, What's Moving Now, seasonal spotlight when active, permanent destinations, opening stage, More for you, Opportunities, Live, Trending Scenes, New from Creators, From the Racks, PLUGGD DJ, Soundboards Worth Opening, Near You, Creators to Watch and Community Pulse.
10. **Remove duplicate navigation/content blocks** — remove `New goods on PLUGGD`, the repeated Library gateway and the duplicate bottom Live/BeatPlug/Opportunities promos. Keep Store and Library only as concise permanent destinations in the world directory. Replace the store-products shelf with web-parity `From the Racks`, using older real public PLUGGD releases rather than merchandise already promoted on Home/Store.
11. **Opportunities and Live integrity** — retain the accepted Opportunities design, real open inventory, exact routes, honest listed GBP total and existing image fallbacks. Live shows only actually live rooms as live; when none are open, show a truthful empty state and current events. Do not call queued rooms live or fabricate counts/matches.
12. **Racks, DJ and Soundboards depth** — From the Racks uses real older public releases; PLUGGD DJ is one deliberate image-led gateway to the canonical native route; Soundboards Worth Opening previews real published boards and their saved public canvas items rather than compressed generic cover cards. Every visible action routes or plays through an existing authority.
13. **Creators and Community depth** — Creators to Watch uses resolvable public creator identities only. Community Pulse uses current public social threads with full readable copy and exact post routes; it does not reuse the What's Moving Now curation or create creator-profile catalogue duplication.
14. **Data, interaction and accessibility integrity** — preserve real public release/beat/mix/soundboard/event/opportunity/profile data, safe streaming/download separation, queue alignment, haptics, loading/error/empty states, 44pt targets, selected-state accessibility, title wrapping, safe areas and bottom player/navigation clearance. No private/draft media, dummy route, fabricated metric or silent failure may be introduced.
15. **Source-only shared curation change** — the new placements are prepared in the web/schema checkout under its matching Phase 7C contract. No migration is applied and no production row is created during this phase. Native must remain backwards-compatible with the currently deployed placement constraint/RPC and use the bounded seasonal fallback until a separately approved deployment/data gate.
16. **Focused and rendered gate** — extend the dedicated Discovery contracts, run native TypeScript and scoped diff hygiene, then render the exact current bundle on compact and large iOS Simulators. Visually inspect every mode and the complete default page; tap every destination/section CTA and representative playback without a production mutation. Compare the same-width native content inventory against current mobile web, capture accepted screenshots, stop Metro and leave one named compact Simulator for user review. No phone build/install occurs.

### Phase 10I allowed product manifest

- `pluggd-mobile/src/components/PluggdImage.tsx`
- `pluggd-mobile/src/features/discovery/MusicDiscoveryDiscover.tsx`
- `pluggd-mobile/src/features/discovery/discoveryModel.ts`
- `pluggd-mobile/src/features/discovery/publicDestinations.ts`
- `pluggd-mobile/src/features/discovery/publicDiscoveryFeatures.ts`
- `pluggd-mobile/src/features/discovery/siteCuration.ts`
- contained new Discovery helpers for taste, destination artwork or presentation data
- `pluggd-mobile/assets/discovery-destinations/*` for the approved generated raster set
- `pluggd-mobile/scripts/verify-mobile-discover-completion-contract.mjs`
- `pluggd-mobile/scripts/verify-mobile-home-discover-public-parity-contract.mjs` only where an existing Discovery assertion must be updated
- one contained new image-fallback contract if required
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

### Phase 10I consequential-action boundary

No production/database/storage mutation, migration apply, deployment, phone build/install, dependency change, staging, commit, push, merge, archive/upload or App Store action is authorised. The source-only schema/admin preparation has an explicit rollback of removing the new migration and reverting the bounded admin/type additions before any external deployment; a future applied migration requires its own pre-state, rollback and approval gate.

## Phase 10H4 Creator Profile compact tab-spacing correction — 2026-08-24

1. Restore the complete accepted Ola Kingdom hero-navigation composition shown in `/Users/apple/Desktop/Codex Image 24 Aug 2026, 12_12_20.jpg`, not only the text labels: contained Listen pill, full outlined Follow pill, separate circular More control, then `Overview`, `Music 8`, `Community` and `More` as four distinct controls.
2. Keep the action row and tab rail explicitly stretched to the full safe content width across animated and non-animated states. Listen and Follow divide the available width while More remains a fixed circle; none may collapse to intrinsic text width.
3. Restore the known-good proportionally distributed tab layout from the reference. Preserve the full-width divider, selected indicator, 44pt-plus targets, stable IDs, selected/expanded accessibility state and existing tab/menu behaviour. `More` and its chevron remain one aligned row; no label wraps, overlaps, clips or touches its neighbour at compact width.
4. Preserve the accepted Creator Profile hero identity, theme/motion, catalogue, Creator Pick, Community/Support, membership, Connect, playback and private-media behaviour plus all unrelated dirty work. Do not redesign the tab taxonomy or reopen another screen.
5. Extend the focused Creator Profile contract with exact stretch/containment/anti-crowding assertions, then run native TypeScript and scoped diff hygiene across the Phase 10H4 manifest.
6. Render Ola Kingdom from the exact current bundle on `PLUGGD Compact Parity 26.3`; visually compare it side by side with the accepted reference and tap-test Overview, Music and More without following, joining, tipping or playing. Source/accessibility checks alone cannot close the gate. Capture evidence, stop Metro and leave Ola Overview for review.

### Phase 10H4 allowed product manifest

- `pluggd-mobile/src/features/profiles/PublicCreatorProfileScreen.tsx`
- `pluggd-mobile/scripts/verify-mobile-creator-profile-contract.mjs`
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

## Phase 10H3 Creator Profile interaction parity — 2026-08-24

1. Preserve the accepted Creator Profile layout, exact Creator Pick, circular creator avatar, Community/Support pair, creator accent, catalogue, playback, membership, Connect, support-authentication, private-media safety and unrelated dirty work.
2. Extend the existing public creator-page config adapter to preserve only valid published `imagery`, `density`, `typography` and `motion` enum values alongside accent, preset and modules. Missing, legacy or malformed values must use deliberate native-safe defaults; no draft config, schema change or production write is allowed.
3. Translate the published motion choice into native semantics: Minimal stays still apart from essential pressed feedback; Subtle receives restrained one-shot hero hierarchy, tab/content continuity and sheet motion; Signature adds performant scroll-linked cover depth plus the Subtle treatment. Do not embed GSAP in React Native.
4. Use the existing operating-system reduced-motion hook as an absolute override for non-essential entrances, parallax, tab/content transitions and sheet choreography. Content order, focus, actions and pressed feedback remain usable without animation.
5. Use the existing haptic helper deliberately: selection feedback on tabs and menus, light impact on explicit primary fan/listening actions, and success feedback only after a Follow/Unfollow persistence operation confirms. No haptic on scroll, initial render, disabled controls or every passive card.
6. Run animation on Reanimated's UI-thread primitives and restrict it to transform/opacity. Keep 44pt-plus targets and truthful selected/expanded/busy accessibility states; prevent duplicate entrance loops, layout shifts and motion on data refresh.
7. Add focused contract coverage for safe theme normalisation, motion/reduced-motion wiring and haptic semantics, then run native TypeScript and scoped diff hygiene across the exact Phase 10H3 manifest.
8. Render Ola Kingdom from the exact current bundle on `PLUGGD Compact Parity 26.3`; inspect hero scroll, a primary/overflow tab change and action-sheet open/close without following, joining, tipping, playing or writing configuration. Capture evidence, stop Metro and leave one review Simulator. No phone, production, Git, deploy or release action.

### Phase 10H3 allowed product manifest

- `pluggd-mobile/src/features/culture/mobileTypes.ts`
- `pluggd-mobile/src/features/culture/mobileServices.ts`
- `pluggd-mobile/src/features/profiles/PublicCreatorProfileScreen.tsx`
- `pluggd-mobile/src/design/haptics.ts` only for confirmed-success notification feedback
- `pluggd-mobile/scripts/verify-mobile-creator-profile-contract.mjs`
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching `.ai/ACTIVE_TASKS.md` row

## Phase 10H2 creator-owned Creator Pick and fan-action repair — 2026-08-24

1. Preserve all accepted Creator Profile catalogue, playback, membership, Community, Connect, support-authentication, private-media and creator-theme behaviour plus unrelated dirty work.
2. In Creator Studio → My PLUGGD → Page → Appearance, keep the existing automatic/type rules and add a deliberate exact Creator Pick selector populated only from the signed-in creator's eligible public releases, published beats and public published soundboards.
3. Store the exact choice as a bounded optional content ID alongside its existing content type inside the published `featured` module settings. Do not reuse or mutate the platform-wide/admin `is_featured` flag, add a schema migration, or write production configuration during implementation/QA.
4. Public web must resolve an exact selection only when the ID and type match an item already loaded through that creator's public catalogue. Missing, unpublished, mismatched or malformed selections fall back through existing type/automatic rules without exposing draft or foreign content.
5. Native must preserve the same published setting and apply the same public-catalogue ownership/type check before selecting Creator Pick and the first Listen queue item; existing automatic/type-only configurations remain backward-compatible.
6. Replace the native 86pt rounded-square avatar with a true circular creator avatar while preserving creator-colour ring, artwork crop, fallback initials, identity layout and accessible contrast.
7. On native Overview, restore the selected two-card conversion row: Join Community beside Support creator when both are available. Community keeps its canonical route; Support reuses the existing signed-out login gate and Tip modal. The Community tab may retain its full-width contextual callout. Both cards remain readable and at least 44pt on compact width.
8. Extend focused web/mobile contracts, run focused configuration tests and TypeScript/scoped diff hygiene, then render Ola Kingdom on `PLUGGD Compact Parity 26.3`. Do not follow, join, tip, play, publish configuration, mutate production, install on phone, stage, commit, push, deploy, archive/upload or submit.

## Phase 10H1 Ola creator-brand and hero-rhythm correction — 2026-08-24

The user accepts the native profile direction but requires the public creator's own published customisation and the web hero's information rhythm to survive in iOS. This is a bounded correction to Phase 10H items 2, 3, 14, 17 and 18; it does not reopen the catalogue, playback, tabs, Community, Connect, commerce or video-security lanes.

1. Preserve every accepted Ola data/security result and all unrelated dirty work; edit only the existing profile presentation surface, its focused helper/contract and task records.
2. Resolve the native accent in the same authority order as web: published page theme first, then the creator's public legacy storefront accent/primary colour, then the app fallback. Reject malformed or unreadable colours. Ola's currently rendered web authority is `#EC4899`.
3. Preserve the published Featured module setting and the web automatic selection rule across releases, beats and soundboards. A featured/available beat leads for a producer; Ola must therefore show the real featured `EKO` beat rather than an unrelated release.
4. Keep the native artwork-led identity, but render the real profile bio/byline and compact real identity chips between the avatar/name block and actions so the controls no longer sit directly beneath the avatar.
5. Replace the oversized rectangular Listen control with a restrained 44pt-plus creator-accent pill treatment; keep Listen, Follow/Manage and More semantics, destinations, loading/selection behaviour and accessible labels unchanged.
6. Apply the creator accent consistently to the hero avatar ring, primary action and selected/navigation emphasis without cloning the web layout or exposing draft configuration.
7. Extend the focused source contract, run TypeScript and scoped diff hygiene, then render Ola on `PLUGGD Compact Parity 26.3` and leave only that Simulator in the review state. No phone build/install, production mutation, follow, purchase, Git integration or release action is authorised.

## Phase 10H world-class Creator Profile experience — 2026-08-24

### Outcome and design boundary

Evolve the accepted native Creator Profile into PLUGGD's complete creator headquarters: one branded public destination where a fan can understand the creator, play and browse every authorised format, follow, join Community, subscribe for exclusives, support directly, shop or licence eligible work, and contact the creator for bookings or collaboration. The owner must reach the real Studio tools that control identity, catalogue, video, memberships, commerce and Connect Card without duplicating those tools on the public page.

This is a focused information-architecture and presentation redesign inside the established native PLUGGD visual system. Current native styling, playback, catalogue reception, contextual modules, membership safety, Community boundary and working tab repair are preserved. The current web Creator Profile is the content/capability reference, not a desktop-layout template. No empty capability is invented and no private, draft or unauthorised asset is exposed.

### Complete execution matrix before product edits

1. **Dirty-work and regression boundary** — Current native: `PublicCreatorProfileScreen` on `/creator/[username]` and `/profile/[userId]`; data: the completed Phase 10G bundle and published page RPC; web: `WorldClassCreatorPage`. Defect: the new scope must not overwrite the useful Phase 10G recovery or unrelated dirty release work. Expected files: only the Phase 10H manifest below. Fix: preserve the existing loader, catalogue, playback, membership, Community, tab and safe-back behaviour and layer the redesign on the current diff. Verification: scoped diff attribution before/after plus focused contracts. Must preserve: all unrelated Home, Discover, Events, Community, Store, Studio, player and release work.
2. **Creator-controlled identity and branding** — Current native: hero uses only `cover_image_url`, avatar, name, handle and bio; route unchanged; data: `profiles`/`public_profiles`. Web counterpart: hero cover plus storefront/profile-theme fallbacks, location, role and verified state. Defect: Kxngdom loses its cinematic banner and both profiles omit useful identity. Expected files: profile screen, presentation helper, profile types. Fix: normalise cover fallback from published `embed_settings`, accessible accent, location, creator type and verified state; use only real fields. Verification: NINE X and Kxngdom top states on compact/large. Preserve: current artwork crop, safe-area legibility, avatar and creator accent.
3. **Clear conversion hierarchy** — Current native: Listen/Follow plus equal-weight Community/Membership/Support/Share tiles; data: bundle availability. Web counterpart: Listen, Follow, Join Community, Support and quick actions. Defect: growing capabilities would overcrowd the hero and primary intent is unclear. Expected files: profile screen and UI component file. Fix: keep Listen and Follow as the primary pair, one contextual fan-conversion action, and a deliberate action sheet for Support, Message/Book, Share and external links; never show dead actions. Verification: every rendered action has one working destination and 44pt target. Preserve: existing follow optimistic rollback, owner Manage separation and playback start.
4. **Fan-first Overview composition** — Current native: feature card followed by rails in published order. Web counterpart: Creator Pick, latest music, player, Community, membership, visuals, rotation and support signals. Defect: the page still reads as disconnected modules rather than a creator story. Expected files: profile screen/UI components. Fix: create a paced Overview with Creator Pick, compact listen hub/latest catalogue, membership or exclusive callout, Visual Channel, Community, and current commerce/live signals; omit absent optional sections. Verification: NINE X and Kxngdom overview hierarchy comparison at one viewport. Preserve: creator-published module visibility/order and no empty rails.
5. **Creator-owned listening hub** — Current native: global player works, Music is a static list, hero Listen queues playable formats. Web counterpart: branded searchable creator player with queue and per-track actions. Defect: fans cannot browse/search the creator catalogue or understand the active queue from the profile. Expected files: profile screen/UI components only, using existing playback provider. Fix: add a compact profile listening surface with Play all, active-track state, catalogue search/filter and direct list playback/detail; keep the full global player as the playback authority. Verification: NINE X five-release search, queue start, track switch, pause/resume, mini/full player and back navigation. Preserve: shared player, progress, queue safety and member-lock routing.
6. **Complete release and format merchandising** — Current native: Creator Pick/list rows omit type, genre, explicit state, description and price/ownership context. Web counterpart: rich Creator Pick and complete music metadata. Defect: work is playable but poorly presented for discovery or sale. Expected files: profile screen, profile types and `mobileContent.ts` metadata. Fix: expose real format, artist, genre, explicit/member status, description and policy-safe price/detail/ownership CTA; show mixes, beats, sample packs and playlists with truthful format metadata. Verification: CODE EP and Kxngdom beat/release cards. Preserve: no raw download leak, no digital purchase path that bypasses current commerce policy.
7. **Visual Channel parity** — Current native: Videos uses only published `creator_videos`; route `/videos/[id]`. Web counterpart: `creator_videos` plus releases carrying YouTube/video sources. Defect: NINE X web shows two visuals while iOS shows no Videos destination. Expected files: `mobileContent.ts`, mobile services/types, profile screen; video detail only if a canonical source needs it. Fix: include public release-linked visual metadata, merge/dedupe it with creator-owned videos, and route creator videos to video detail and release visuals to the exact release detail. Verification: NINE X `Videos 2`, artwork, titles and both destinations. Preserve: published-only creator videos and no private media URL exposure.
8. **Membership conversion and subscription clarity** — Current native: Kxngdom has benefits and an Explore button but omits price/member context. Web counterpart: price cadence, member count, benefits, cancellation/payment reassurance and join journey. Defect: fans cannot judge the offer before leaving the profile. Expected files: profile screen/UI components; existing membership route remains authoritative. Fix: show real monthly/yearly price, member count, benefits, current-member state and policy-safe availability copy, then route to `/membership/[creatorId]`. Verification: Kxngdom signed-out compact/large and source contract; no join/purchase. Preserve: StoreKit policy, real tier data and truthful `Joining opens soon` state.
9. **Exclusive and unreleased showcase** — Current native: real locked releases route to Membership but are not presented as a coherent member offer. Web counterpart: membership/exclusive positioning controlled by real catalogue fields. Defect: the creator request for unreleased music and exclusive content is not legible. Expected files: profile screen/UI components. Fix: create an exclusive preview treatment only when real `is_exclusive`, premium or perk-access content exists; expose allowed metadata/preview and membership route, never private/download assets. Verification: source fixtures/contracts plus any reachable real creator state. Preserve: no invented unreleased section or entitlement claim.
10. **Direct Support flow** — Current native: Support appears only when a storefront item exists; the shared `CommerceTipModal` and credits policy already exist elsewhere. Web counterpart: Tip Artist is available as direct creator support. Defect: creators such as NINE X lose the fan-support action. Expected files: profile screen, reusing `CommerceTipModal` unchanged unless a focused accessibility defect is found. Fix: expose Support for eligible public creators, require authentication at action time, use the existing credits tip sheet and exact creator identity, and retain storefront support separately. Verification: signed-out route/login gate and modal open/close only; no tip is submitted. Preserve: wallet policy, balance checks, idempotency and no production mutation.
11. **Message, booking and collaboration flow** — Current native: no profile action; existing `/connect/[slug]` public/business views and Studio Connect Card editor own the data. Web counterpart: Message / Book and Booking Desk. Defect: fans and industry cannot reach creator-approved contact/booking information. Expected files: mobile services/types, the existing Connect Card data adapter and profile screen. Fix: resolve only an enabled public Connect Card through the existing canonical user-ID contract first, retain slug lookup as a legacy fallback, and show Message/Book when it has a real route; otherwise omit it. Owners receive Manage Connect Card. Verification: Ola Kingdom resolves `@olakingdom` to canonical Connect slug `ola-kingdom`, a reachable public card route plus absent-card state; no email, booking or message is sent. Preserve: private/token Connect views and no exposed private contact fields.
12. **Showcase-to-sale journeys** — Current native: Store and Beats are contextual lists, with sale intent mostly deferred to detail pages. Web counterpart: release buy intent, Beat Vault, Store/Support and membership. Defect: profile does not clearly communicate what can be bought, licensed or supported. Expected files: profile screen/UI components and existing item routes. Fix: create one contextual Shop/Support area that prioritises eligible physical merchandise, beat licences, release ownership detail, membership and tip without merging their commerce rails; all purchases remain on the existing detail/policy routes. Verification: route and commerce contracts, no purchase. Preserve: physical/digital classification, hosted checkout/credits/StoreKit separation and existing product details.
13. **Community growth journey** — Current native: Community quick action and contextual tab work. Web counterpart: Fan Connection plus Community overview/activity. Defect: the creator-to-community value proposition is thin and counts use different semantics. Expected files: profile screen and mobile types/services only if real summary data is needed. Fix: show primary Community identity, real member count, purpose and Explore/Join wording that opens the canonical Community; label the tab by spaces/content rather than mismatching web member counts. Verification: NINE X and Kxngdom canonical Community routes and return to profile; no join. Preserve: Community as discussion/live/collaboration, never duplicate catalogue tabs.
14. **About, links and social proof** — Current native: About contains bio, handle, role and followers only. Web counterpart: location, genres, profile/social links, releases, beats, total plays, achievements, latest music and since date. Defect: creator credibility and external identity are missing. Expected files: mobile services/types, profile screen/presentation helper. Fix: normalise safe HTTP(S) website/social/press links, show real location/genres/since and non-zero public stats, including total plays and achievements when available. Verification: NINE X social links/location and Kxngdom catalogue/plays; invalid link fixtures remain hidden. Preserve: no private email or draft metadata.
15. **Owner showcase-management journey** — Current native: owner Follow becomes generic Manage to My PLUGGD. Existing tools: `/edit-profile`, `/studio/catalog`, `/creator/upload`, `/studio/videos`, `/studio/commerce?tab=memberships`, `/studio/commerce?tab=store`, `/studio/connect-card/edit` and Community management. Defect: creators cannot tell where to customise the landing page, upload music/mixes/exclusives, configure subscriptions, sell or manage bookings. Expected files: profile screen/UI components only; no duplicate Studio implementation. Fix: owner action sheet with real role/availability-driven Studio destinations and a clear public-preview boundary. Verification: source route contract and non-mutating owner-auth navigation when an authorised session is available. Preserve: Creator Studio as management authority and public profile as fan destination.
16. **Contextual navigation without hidden capability** — Current native: horizontal contextual tabs work after Phase 10G but overflow has no visual affordance. Web counterpart: visible contextual tab set. Defect: Beats/About and future modules can be undiscoverable. Expected files: profile screen/UI components. Fix: keep only non-empty published destinations, group music formats coherently, expose an edge cue/More entry when overflow exists, retain stable identifiers and one-time deep-link selection. Verification: complete NINE X/Kxngdom compact/large tab matrix and deep links. Preserve: repaired hit targets, selection state and contextual counts.
17. **Accessibility, resilience and performance** — Current native: Phase 10G loading/retry, bottom inset and accessibility pass. Defect: new sheets, search, links and denser content add risk. Expected files: all Phase 10H product files and focused contract. Fix: 44pt targets, selected/busy/expanded states, readable type, full artwork, safe areas, Reduce Motion-safe transitions, keyboard/search behaviour, safe external URLs, targeted partial-load diagnostics and bounded lists. Verification: runtime accessibility snapshot, compact/large layout, TypeScript, focused contracts and scoped diff hygiene. Preserve: no silent critical query failure and no dock/player obstruction.
18. **Bounded rendered handoff** — Verify the exact current bundle on compact and large Simulators using NINE X and Kxngdom, plus the targeted compact Ola Kingdom security/data matrix requested during review. Exercise every non-mutating hero, Overview, Music, Videos, Membership, Community, About, external-link, Connect Card, owner-route and playback journey that is actually available. Do not follow, join, tip, message, book, subscribe, purchase, save a contact, write creator configuration, build/install on the phone, mutate production, stage, commit, push, archive or submit. Stop Metro and leave one named Simulator review state.

### Phase 10H allowed product manifest

- `pluggd-mobile/src/features/profiles/PublicCreatorProfileScreen.tsx`
- up to two focused files under `pluggd-mobile/src/features/profiles/` for presentation normalisation and reusable profile sections/actions
- `pluggd-mobile/src/features/culture/mobileServices.ts`
- `pluggd-mobile/src/features/culture/mobileTypes.ts`
- `pluggd-mobile/src/features/connect/connect-card-data.ts` only for the existing sanitized user-ID Connect Card RPC adapter
- `pluggd-mobile/src/lib/mobileContent.ts`
- `pluggd-mobile/app/videos/[id].tsx` only if canonical release-linked video detail requires a bounded correction
- `pluggd-mobile/scripts/verify-mobile-creator-profile-contract.mjs` and only the minimal existing route/commerce/player expectation updates required by the changed profile contract
- `pluggd-mobile/design-qa.md` as the temporary local Product Design comparison report; do not commit it
- this task's `CONTRACT.md`, `PROGRESS.md` and `VERIFY.md`

### Design and edit gate

- The current native and web NINE X/Kxngdom screenshots are the grounding references.
- Product Design must produce three grounded 390x844 directions that vary information hierarchy and action model while preserving PLUGGD's existing typography, black/orange theme, artwork-led language and contextual content.
- `CODE_EDIT_ALLOWED=false` until one direction is selected. Planning records and temporary visual artifacts are the only authorised writes before selection.
- After selection, implement the chosen direction directly in the native app; no Figma file, web prototype, dependency change or parallel design system is required.

## Phase 10G canonical Creator Profile — 2026-08-24

### Goal and product boundary

Creator Profile is the canonical public home for an artist, DJ, producer, label or other creator. It must answer the real creator request behind PLUGGD: one branded landing page where fans can hear the complete public catalogue, discover mixes and other formats, understand and join a subscription, enter the creator's Community, access creator-approved exclusive/unreleased offers and support the creator. Community remains the discussion/engagement layer and Creator Studio remains the owner-management layer.

This phase preserves the native PLUGGD visual system and targets current web content/capability/configuration parity, not literal desktop-layout parity. The audited web references are `src/components/creator/WorldClassCreatorPage.tsx`, `src/lib/creatorProfilePageConfig.ts` and `src/lib/creatorProfilePageService.ts`; production NINE X and Kxngdom are the rendered reference accounts.

### Numbered implementation plan

1. **Canonical identity and safe resolution** — retain private `profiles` lookup plus canonical `public_profiles` fallback, case-insensitive handle resolution and safe back behavior; the public profile, user, membership and Community must resolve to the same creator identity.
2. **Complete release reception** — replace the invalid `audio_url` selector with current public release fields, enforce approved/live/PLUGGD/visible rules, resolve both canonical owner identity and web-supported artist aliases, deduplicate and order by release date so NINE X receives all five public releases.
3. **Complete multi-format ownership** — query mixes through `owner_user_id` with published/public filters; keep beats, sample packs, soundboards, playlists, shows/events and live rooms owner-scoped and public-only; never use global catalogue fallbacks on a creator page.
4. **Canonical creator video path** — load published `creator_videos` for the owner, retain uploaded and YouTube media metadata, and route each card to a genuine playable/detail action instead of `/search`.
5. **Published creator configuration** — consume `get_public_creator_profile_page`, safely normalise the published theme accent, visible modules and module order, and fall back to a role-appropriate native order when no published configuration exists.
6. **Hero as the landing-page decision point** — keep real cover/avatar/identity and add availability-driven Listen, Follow, Join Community, Membership/Support, Share and owner Manage actions; never render a dead or irrelevant CTA.
7. **Creator-controlled brand treatment** — apply the published accessible accent and module emphasis within the existing native PLUGGD design; do not expose draft configuration or invent creator branding.
8. **Fan-first Overview** — replace the wall of empty rails with a deliberate overview: featured playable work, latest catalogue, active membership/exclusive offer, primary Community and current show/live/support signals in published order, while omitting absent optional modules.
9. **Playable complete Music experience** — give releases, mixes, beats and supported preview formats direct play/pause actions through the shared global player plus exact detail navigation; the hero Listen action starts the first real playable item/queue.
10. **Dedicated Membership journey** — expose active tiers as their own visible destination and overview callout with real title, benefits, StoreKit-localised availability on the existing membership screen and exact creator route; no purchase is performed during QA.
11. **Truthful exclusive and unreleased positioning** — label only real exclusive/member content as such, show public metadata/allowed preview only, route locked access to the membership journey and never leak private/download assets or imply an unreleased catalogue that is not present.
12. **Community without duplication** — make the primary Community visible from hero, Overview and its contextual tab, using the canonical Community route; Community remains discussion/live/collaboration rather than a second creator catalogue.
13. **Complete supporting modules** — preserve and polish available Beats, Soundboards, Gallery, Videos, Store/Support, Shows, Live and About content with real counts, metadata, artwork and exact destinations.
14. **Contextual information architecture** — always retain Overview and About, show other tabs only when their module is published and has content, honour deep links by selecting the nearest valid tab and avoid horizontal rows of zero-count destinations.
15. **Owner/fan boundary** — owners receive Manage in Studio/My PLUGGD and public-preview actions; fans receive follow/join/support/share. No public page action substitutes a consumer route for owner management.
16. **Deliberate resilience** — stop silently translating critical profile catalogue query failures into a completely empty success state; return enough bundle diagnostics for a targeted retry/error notice while optional missing modules remain non-fatal.
17. **Mobile quality and accessibility** — preserve full artwork, readable multi-line titles, 44pt actions, accessible labels/states, Reduce Motion compatibility, safe-area/status-bar legibility, consistent section rhythm and unobscured bottom-dock/player content on compact and large iPhones.
18. **Bounded verification and handoff** — add a focused source contract covering items 1–17, run TypeScript and scoped diff hygiene once, verify NINE X plus Kxngdom on compact/large Simulators including playback/navigation without joining or purchasing, stop Metro, preserve the dirty tree and freeze for user review before Discovery.

### Allowed changes and exclusions

- Allowed product manifest: `pluggd-mobile/src/features/profiles/PublicCreatorProfileScreen.tsx`; `pluggd-mobile/src/features/culture/mobileServices.ts`; `pluggd-mobile/src/features/culture/mobileTypes.ts`; `pluggd-mobile/src/lib/mobileContent.ts` only if shared public release metadata requires it; `pluggd-mobile/app/videos/[id].tsx` only for canonical creator-video detail; one focused Creator Profile contract plus minimal route/commerce expectation updates required by the new Membership tab and loader signature; task records.
- No web source change, schema/migration/RLS change, production data correction, creator configuration write, dependency change or unrelated redesign.
- No real membership join, StoreKit purchase, follow, Community join, event action, analytics assertion or other production mutation during verification.
- No phone build/install, deployment, Git integration, archive/upload or App Store action.

## Phase 10F Homepage and profile/community boundary — 2026-08-24

### User outcome

Finish the reopened Homepage issues without redesigning the accepted native Homepage, and make Community a useful engagement layer beneath the canonical Creator Profile rather than a duplicate creator landing page. Creator Profile redesign and Discovery are separate later review phases and are not authorised in this lane.

### Product boundary

- **Creator Profile is canonical** for creator identity, custom presentation, full music catalogue, beats, soundboards, gallery, videos, shop, shows, memberships and persistent fan conversion.
- **Community is subordinate**: discussion, threads, participation, community-specific collaboration and genuinely linked live activity. It must always provide a clear route back to the Creator Profile.
- **Live Room is temporary**: a genuine live/scheduled/replay session only. A community or collaboration room must not be labelled live merely because it exists.
- Next Wave may editorially feature creator/community artwork, but creator-owned entries must resolve to the canonical Creator Profile and must not create a second landing-page destination.

### Numbered implementation and acceptance matrix

1. **Preserve the accepted designs** — retain the current native Homepage, Opportunities and Creator Profile visual/product systems; no web-layout clone and no Creator Profile redesign in Phase 10F.
2. **Bound Opportunities cards** — reduce Homepage Opportunities rail width, retain a visible next-card cue, two-line readable titles, artwork, funding/deadline metadata and exact existing list/detail routes.
3. **Canonical community identity** — enrich creator-owned communities from the public creator profile record, never treating the community slug as a creator username.
4. **Next Wave destinations** — creator/community entries open `/creator/{username}` when a canonical public profile exists, deduplicate the same creator destination and use truthful creator/community labels; remove unconditional `ROOM OPEN` claims.
5. **No global catalogue leakage** — remove the global feed-bundle fallback from community detail. Any music preview shown there must be explicitly linked by `community_id`, public, bounded and optional.
6. **No duplicated catalogue tabs** — remove full Drops and Soundboards tabs from Community. At most one compact `Latest from {creator}` preview may link back to the Creator Profile Music tab.
7. **One community conversation** — combine community posts and discussion threads into one Community surface while preserving rich social cards, image/video viewers, polls, audio, links, actions and thread navigation.
8. **Truthful live surface** — show only genuine community-linked live/scheduled/replay sessions or community events under Live, with accurate state labels and real destinations; no fabricated live dots, dead Join actions or routes that loop back to the same page.
9. **Truthful collaboration surface** — present community collaboration rooms/challenges as Collabs, not live sessions. Informational cards remain non-actionable unless a real distinct destination exists.
10. **Subordinate identity shell** — use a compact community identity header with membership action and a clear `View creator profile` action; do not reproduce the full creator bio/catalogue/store/events landing page.
11. **Deliberate states and preservation** — retain loading, retry, empty, access and join/leave feedback; preserve the accepted native media/thread parity work and all unrelated dirty files.
12. **Verification and stop gate** — focused contracts, TypeScript and scoped diff hygiene must pass, followed by exact-current-bundle compact and large Simulator interaction checks. Stop for user review; no physical-phone install, production mutation, deploy, Git integration, archive/upload or App Store action.

### Allowed files

- `pluggd-mobile/src/features/home/MusicDiscoveryHome.tsx`
- `pluggd-mobile/src/features/home/homeDiscoveryData.ts`
- `pluggd-mobile/src/features/culture/mobileServices.ts`
- `pluggd-mobile/src/features/culture/mobileTypes.ts`
- `pluggd-mobile/app/backstage/[id].tsx`
- focused Homepage, Community, route and boundary contract scripts
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching active-task row

### Explicitly out of scope

- `PublicCreatorProfileScreen.tsx`, Creator Studio customisation, Discover, Events, Carnival, Opportunities list/detail, schemas/RLS and web production source.
- No production writes, migration, deployment, phone install, stage/commit/push, archive/upload, purchase or App Store action.
- Preserve every unrelated modified/untracked file and accepted prior lane.

## Phase 10D Events discovery and ticketing quality lane — 2026-08-23

### User outcome

Make the existing native Events product competitive as a discovery and ticket-handoff experience: real search and filters, visible legitimate organiser ticket links, strong event cards and a polished event detail hierarchy. Preserve all accepted PLUGGD visual language and existing event/community/commerce capabilities.

### Current evidence and exact defects

- Native route `/events` is `src/features/editorial/EventsBoardScreen.tsx`; detail route `/events/[id]` is `app/events/[id].tsx`.
- The public active-event layer is `src/features/events/eventDiscoveryData.ts` through `usePublicActiveEvents`; it pages the complete discoverable active/upcoming set.
- Current production read-only evidence: 107 active public rows; 107 with artwork; 104 with HTTPS `ticket_url`; zero currently eligible in native because all 104 ticketed rows are `commerce_classification='unclassified'` despite having no `stream_url` or `playback_url`.
- Native has category chips but no Events-owned text search. The visible Filters surface is inert and cannot filter date, city or genre.
- Current data selection omits the real `city`, `lineup_headline`, `genre_tags`, `event_tags`, `slug` and `venue_id` fields already used by the web Events product.
- Ticket CTAs exist in source but are hidden by the classification gate; detail therefore exposes no organiser ticket action for the current 104 ticketed events.

### Repair matrix

1. **Complete event data contract** — extend `EventItem`, the public paged select and detail select with real search/display fields. Preserve discoverable/active filtering, pagination, admin-feature ordering, artwork and map behavior.
2. **Proper search** — add an Events-owned native text field matching title, description, lineup, city, location, genres and event tags. Preserve the global PLUGGD search action separately.
3. **Working filters** — replace the inert Filters label with an accessible expandable panel for date, city and genre; expose active state, counts and one-action reset. Preserve Browse/Map and category chips.
4. **Truthful result states** — reset pagination after query/filter changes; show exact result totals, intentional no-match copy and a working clear/reset action. Never substitute unfiltered rows after a zero result.
5. **External ticket eligibility** — accept a validated HTTPS organiser `ticket_url` for a physical or legacy-unclassified real-world event only when no stream/playback access is attached; continue rejecting virtual access, credentials, local hosts and invalid URLs. Preserve analytics and secure in-app-browser handoff.
6. **Ticket visibility on discovery** — show provider-labelled ticket status/actions on the spotlight and full event cards; retain a distinct Event details action and hosted PLUGGD-ticket behavior.
7. **Premium detail hierarchy** — keep real artwork and safe fallback, add balanced back/share controls, clear date/status/location/lineup/genre information and an immediately discoverable provider-labelled ticket action. Preserve RSVP/reminders, promoter, Wallet, live link, stories, attendance, community and comments.
8. **States and safety** — retain loading, retry/not-found, ticket-opening busy/error, external-price/refund disclosure, authenticated mutations and no fake inventory/pricing.
9. **Rendered verification** — verify text search, combined filters, reset, zero results, organiser ticket handoff presentation, exact event detail navigation and compact/large bounds. Do not complete a purchase or mutate RSVP/comments during agent QA.

### Allowed files

- `pluggd-mobile/src/features/editorial/EventsBoardScreen.tsx`
- `pluggd-mobile/src/features/events/eventDiscoveryData.ts`
- `pluggd-mobile/src/lib/mobileContent.ts`
- `pluggd-mobile/src/lib/eventTickets.ts`
- `pluggd-mobile/src/features/culture/mobileServices.ts` only for the event-detail select
- `pluggd-mobile/app/events/[id].tsx`
- focused Events/product/commerce contract scripts
- this task's `CONTRACT.md`, `PROGRESS.md`, `VERIFY.md` and matching active-task row

### Out of scope and consequential boundary

- No event-row edits, classification backfill, migration, production write/deploy, purchase, RSVP/comment mutation, phone build/install, Git staging/commit/push, archive/upload or App Store action.
- Do not redesign Homepage, Discover, Opportunities, Carnival, Community, global navigation/player or creator event-management flows.
- Preserve all unrelated dirty and untracked work.

### Acceptance

- All real active public rows remain reachable.
- Search and filters visibly operate on real fields and never fall back to unrelated results.
- Every safe current organiser ticket URL produces a visible provider-labelled action; virtual/invalid URLs do not.
- Event list and detail meet compact/large layout, touch-target, type, artwork and error-state standards in current-source Simulator renders.

## Phase 10B authoritative Homepage and linked-screen parity repair

The user brief at `/Users/apple/Downloads/PLUGGD iOS — Authoritative Homepage and Linked-Screen Parity Repair.md` supersedes conflicting older plans, comments and implementation assumptions. The accepted newer native Homepage, Discover and Opportunities designs are preserved: their parity target is content, sections, real data, artwork, destinations, interaction and loading/empty/error state behaviour, **not web layout imitation**. Carnival Hub, Releases/Listening Floor, BeatPlug and any other linked screen explicitly described by the brief still require same-width current-mobile-web product and visual comparison.

1. Parity means the same real product capability and content depth; native UI remains deliberately native unless a linked screen is explicitly designated for web visual comparison.
2. Diagnose and repair regressions without discarding useful dirty work; preserve unrelated files and every accepted working flow.
3. Keep this numbered contract, progress manifest and verification matrix current before implementation claims.
4. Preserve Featured Release artwork, detail navigation, play/pause, track switching, mini-player, full player and back navigation.
5. Bring Carnival Hub to current mobile-web hierarchy, content depth and section behaviour without placeholders or dead controls.
6. Preserve Four Worth Your Time playback and artwork; collapse/minimise remains direct, while destructive Close player is only an intentional overflow/options action.
7. Populate Scenes from canonical real genre/city values, route typed filters, visibly identify the selected scene and never substitute a generic Discover feed for zero results.
8. Preserve working Mixes in Rotation playback, detail routing and artwork.
9. Preserve New Releases card playback while repairing Releases/Listening Floor to the current web product: editorial first viewport, bounded record/player, search, filters, Fresh Pressings, charts, editorial, racks, multi-track, waveform and lyrics.
10. Keep THE PLUG as a clear in-app index and complete in-app reader, preserving canonical HTML and metadata; only genuine external destinations may leave the app.
11. Preserve the accepted current native Opportunities design; resolve artwork through shared candidates, keep bounded readable cards, and complete real filters, list/detail/navigation, auth/application and loading/empty/error/retry states.
12. Render Next Wave with stable geometry, real artwork/content and exact destinations on compact and large widths.
13. Make every visible Soundboard entry open its exact board identifier with a whole-card semantic target.
14. Keep physical merchandise independent of StoreKit and support truthful variants, stock, shipping, pricing, basket and checkout states without conducting a real purchase in QA.
15. Route PLUGGD DJ to its real DJ workflow, BeatPlug to web-comparable product/visual depth, and Creator Studio to the authenticated owner workspace/gate rather than generic upload or public pages.
16. Restore Happening Now artwork using deterministic real candidates and an intentional product fallback, never an empty image well.
17. Maintain one typed Homepage destination registry for all visible release, mix, scene, article, opportunity, creator/community, Soundboard, merchandise, event/Carnival/live and creator-tool cards.
18. Do not remove content to make the screen look fixed; loading, empty, error and retry states must remain truthful and usable.
19. Capture native and current mobile-web references at the same viewport width; apply design comparison only to the explicitly designated linked screens and content/capability comparison to Homepage/Discover.
20. Complete the rendered interaction matrix across Homepage, Discover and every repaired linked destination; source assertions alone are not end-to-end proof.
21. Visually review compact and large iPhone widths for bounds, crop, hierarchy, typography, overlap, dead space, touch targets and accessibility.
22. Re-run focused checks after each lane and TypeScript/build/rendered regression checks once at the named integration gate.
23. Final handoff reports each numbered item separately as pass, fail or blocked with source, rendered, device and consequential-action evidence kept distinct.
24. Hold every repaired surface to one production product standard: real data, complete workflows, deliberate states and no visible internal/developer copy.

- ALLOWED_PRODUCT_SURFACES=The existing Homepage/Discover and exact linked destinations named above, their shared data/routing/playback/commerce foundations, and focused contracts. No unrelated redesign.
- PRESERVE_VISUALS=The accepted current native Homepage, current native Discover, current native Opportunities and current font.
- PRESERVE_FUNCTION=Featured Release, Four Worth Your Time, Mixes in Rotation, New Releases playback, global playback, downloads gating and other already working actions.
- CONSEQUENTIAL_BOUNDARY=No production mutation/deploy, Git staging/commit/push/merge, release build/archive/upload, real purchase or App Store submission is authorised by this phase.
- FINAL_STATUS=IMPLEMENTATION_IN_PROGRESS

## Phase 10A Homepage and destination physical-device repair contract

- [ ] Every visible Homepage card has a valid native route or an explicit sign-in/creator-access action; overlapping invisible press targets are removed.
- [ ] The visible mini-player close control is removed; collapse remains visible and deliberate Close remains in the options menu.
- [ ] Scene routes carry a typed genre/city destination, show the selected scene and never fall back to an unfiltered Discover feed.
- [ ] Carnival and Releases follow the current 390x844 mobile-web hierarchy while preserving real data and working native playback/actions.
- [ ] THE PLUG index and article routes remain in-app; only genuine external citation domains can request external browsing.
- [ ] Opportunity art and card geometry are deterministic, bounded and consistent across Home/list/detail.
- [ ] Next Wave, Soundboard and Drops & Tools targets all work or are hidden/gated truthfully.
- [ ] Homepage Store discovery uses verified physical merchandise; physical availability is independent of StoreKit and internal policy copy is not user-visible.
- [ ] Focused contracts, TypeScript and scoped diff hygiene pass; current physical-iPhone approval remains required before any release archive.
- FINAL_STATUS=IMPLEMENTATION_IN_PROGRESS

## Phase 9 complete-parity integration contract

- User-approved architecture: everyday creator workflows are fully native; specialist desktop-density Studio tools open their exact authenticated `/studio/*` workspace in native Studio chrome, never Safari and never a public fan page.
- Current mobile web is the functional and visual reference. Preserve accepted Releases, Mixes, BeatPlug, Opportunities, Events, Carnival, Live and Soundboards work while completing missing behaviour.
- The completed audit is authoritative (`AUDIT_REQUIRED=false`). Do not repeat the page/route audit unless a focused verification failure creates new uncertainty.
- All public destinations must be reachable within two taps through a shared native Discover destination registry, including a genuine Creators directory.
- Frequent owner workflows remain native: release/track/beat/mix/Soundboard/basic-video creation and management; events; Live; splits; everyday analytics; Wallet summary; My PLUGGD/Connect Card; common Store/membership/pack/merchandise actions.
- Advanced analytics, tax/statements/exports, full page builder, venues, applications, CRM, collaborations, commerce builders, licences, connected accounts and other specialist modules use the secure embedded Studio browser.
- A Studio module tap opens its owner workspace. `Preview` and `Desktop Tools` are not owner-workspace modes; public viewing is a separate explicit action.
- The Studio browser includes native title, close, back, refresh, loading, offline and session-expired states; allowlists PLUGGD `/studio/*`, intercepts external navigation and uses a short-lived single-use route-bound handoff with no access/refresh token in URLs, logs or persistent storage.
- Each Phase 9 source lane is limited to the exact files recorded in `PROGRESS.md`; completed public, Maps and subsequent audio/lyrics/native-creation lanes remain separately bounded.
- No production migration/deploy, merge/push, build/archive/upload, or App Store submission is implied by source completion.

### Complete-parity acceptance summary

- Home/Discover depth, complete THE PLUG articles, Creators, Community, commerce, Opportunities/Event authenticated states and public navigation match the approved mobile-web capability.
- Maps becomes a full-screen native Mapbox canvas with clusters, overlays, filters, selected-signal sheet, routes, explicit location consent and accessible list alternative.
- Real 256-peak waveforms and published timed per-track lyrics work across relevant playback and owner workflows.
- Native Studio genuinely creates/manages frequent content; advanced modules embed exact authenticated Studio pages.
- Current Simulator, authenticated workflows, physical-device accessibility/media/network/StoreKit checks and exact archived-binary inspection must pass before final human-approved submission.

## Phase 8I release closeout and Live function deployment

- Goal: close the recorded integration items without reopening accepted product lanes.
- Correct only the Deno type failures in `supabase/functions/manage-live-sessions/index.ts`, preserve the verified taxonomy/ownership validation, then deploy that exact function to project `qkwvqmubhyondemhasjp`.
- No Live session or database content may be created by the deployment step.
- Refresh the exact source manifest, stage only reviewed source/test/record paths, create a reproducible Build 8 commit, and keep generated evidence/temp/Supabase CLI residue excluded.
- Physical-device and App Store evidence remain separate gates and must not be claimed without the registered iPhone or live App Store readback.
- Allowed source: `supabase/functions/manage-live-sessions/index.ts`; task records. Later staging/build metadata requires the explicit refreshed manifest boundary.
- Required checks before deploy: Deno check, focused Live contract, scoped diff hygiene.
- No build/archive/upload/submission until the source commit and physical-device availability gates are recorded.

## Phase 8H Listening Floor CTA geometry

- Goal: the Listening Floor `Open release` and priced `Support — £…` text CTA variants must have comfortable horizontal breathing room and a restrained rounded-rectangle shape instead of an oversized full pill.
- Preserve the current `Open release` label, internal release route, playback controls, release data, save action, circular icon controls, global player/dock and all unrelated layouts.
- The text must remain on one line and scale safely on compact devices without touching the button edges.
- Allowed product/test files: `pluggd-mobile/src/features/editorial/ListeningFloorScreen.tsx`; `pluggd-mobile/scripts/verify-mobile-product-pages-contract.mjs`.
- Allowed coordination files: `.ai/ACTIVE_TASKS.md`; `.ai/tasks/ios-native-parity-build8-recovery/{CONTRACT,PROGRESS,VERIFY}.md`.
- Required checks: focused Product contract; `npx tsc --noEmit --pretty false`; scoped diff hygiene.
- Required rendered proof: current Listening Floor featured release in the existing iPhone Simulator, showing the padded CTA without clipping or overlap.
- No build/archive/upload, production/Supabase mutation, Git action, dependency change or App Store action.

## Phase 8G Creator Studio catalog-routing correction

- Goal: Studio creator actions and Apps open creator-management modules, never public catalogue indexes as their primary destination.
- Releases, Beat Store, Mixes and Soundboards use the creator's real owned Studio catalog rows under an internal `/studio/catalog` route.
- Default/universal modules open management directly. Optional unplugged modules must ask whether to add the module, persist the existing module setting only after confirmation, then open management.
- Remove `Preview` from Studio catalog launch cards. Studio catalog management must not route back to public catalogue pages; creator workflows stay internal or creator-facing.
- Owned Soundboard rows may enter the existing real owner editor only through a `/studio/soundboards/[id]` alias; that alias must default to editor mode and return to Studio catalog rather than the public index.
- Julius Vero's authenticated artist account must show its real owned release in Releases management.
- An owned Release, Beat or Mix row must open an actionable internal Studio workspace, not a passive selected-state card. The workspace may use existing creator workflows such as attached promotion, splits and new-draft preparation, but must not send the primary management action to a public catalogue page.
- Preserve the existing Studio dock, Apps separation, role rules, creator-access gate, public catalogue routes outside Studio, and all unrelated Build 8 work.
- Verification: focused Studio contract, TypeScript, scoped diff hygiene, and authenticated Simulator taps for Releases, the actionable Echoes workspace, Soundboards and one optional unplugged module prompt without accidental public navigation.

## Identity

- TASK_NAME=ios-native-parity-build8-recovery
- TASK_FOLDER=.ai/tasks/ios-native-parity-build8-recovery
- CREATED_DATE=2026-08-15
- OWNER=Orchestrator thread `01a006cc-8d9a-7b23-b06a-f1b75aa36043`
- BRANCH=codex/ios-carnival-live-review-v5
- WORKTREE_PATH=/Users/apple/pluggd-mobile-workspace
- BASE_BRANCH=main
- TARGET_BRANCH=main

## Locked release facts

- Build 7 is actual attempt 20 and is not final.
- The next candidate is Build 8 / attempt 21.
- The only approved differences from the accepted baseline are the current Home, current Discover, and current font.
- Mixes were already playing; do not spend recovery usage re-investigating playback unless the orchestrator assigns a narrowly scoped lane with new evidence.

## Goal

Coordinate a controlled Build 8 recovery that restores required native/web parity and App Review completeness without broad redesign, regressions, duplicated investigation, or unapproved release actions.

## Authorised Phase 8D — Release-detail public full streaming

- USER_APPROVAL=`Yes, make full audio streaming public while keeping downloads gated.`
- Release detail must use the existing shared `releasePlayableUrl` path already used by Search for public streaming.
- Creator-supplied track audio may stream publicly when rights/takedown checks permit; imported catalogue-reference rows remain excluded by the shared resolver/current guards.
- `download_url` remains a playback-source fallback only through the existing resolver. No raw download action or URL is exposed publicly.
- Download purchase, credit unlock, owned state, hosted checkout and every download UI action remain gated exactly as before.
- Preserve every accepted Product/layout/navigation lane and all unrelated dirty files.
- Allowed product/test files: `pluggd-mobile/app/release/[id].tsx`; `pluggd-mobile/scripts/verify-mobile-product-pages-contract.mjs`.
- Allowed coordination files: `.ai/ACTIVE_TASKS.md`; `.ai/tasks/ios-native-parity-build8-recovery/{CONTRACT,PROGRESS,VERIFY}.md`.
- Required source checks: focused Product contract; `npx tsc --noEmit --pretty false`; scoped diff hygiene.
- Required rendered proof: existing iPhone Simulator, real “Still ah Link” Release detail, public Listen action starts playback; signed-out Download remains protected.
- No build/archive/upload, production/Supabase mutation, Git action, dependency change or App Store action.

## Authorised Phase 8E — Home event-detail route repair

- SERIAL_QA_DEFECT=The lower Home `Open event Nile Rodgers & CHIC - 17 August` target registers a tap but remains on Home.
- Preserve the accepted Home layout, whole-card target, real event data, CTA wording and haptic behaviour.
- Bind the card to the existing native `/events/[id]` route with the exact real event ID using an explicit dynamic pathname/params action.
- Allowed product/test files: `pluggd-mobile/src/features/home/MusicDiscoveryHome.tsx`; `pluggd-mobile/scripts/verify-mobile-home-carnival-completion-contract.mjs`.
- Allowed coordination files: `.ai/ACTIVE_TASKS.md`; `.ai/tasks/ios-native-parity-build8-recovery/{CONTRACT,PROGRESS,VERIFY}.md`.
- Required source checks: focused Home contract; `npx tsc --noEmit --pretty false`; scoped diff hygiene.
- Required rendered proof is serially owned by the whole-app walkthrough agent: tap the Nile Rodgers whole-card target and confirm matching Event detail opens. This lane must not compete for the device.
- No other Home/Event/Live/product edit, build/archive/upload, production/Supabase mutation, Git action or App Store action.

## Locked P0 implementation lanes

1. Durable private-Mix signing.
2. Full Studio menu and web/mobile parity.
3. Native record-deck Listening Room matching the existing mobile web implementation.
4. Internal Terms and Privacy experiences.
5. Real Opportunities implementation.
6. Creator and share correctness.
7. Removal of internal, implementation-facing, placeholder, and prototype copy.

These are orchestration lanes, not permission to edit. Each lane requires an explicit non-overlapping assignment before `CODE_EDIT_ALLOWED` may change.

## Current Phase 1 scope

- Create the persistent task contract and active-task registry entry.
- Record the frozen release facts and P0 lanes exactly.
- Attribute every current modified/untracked status path to known prior work where evidence exists.
- Preserve uncertain ownership explicitly rather than guessing.

## Authorised Phase 2 lane — Creator Studio navigation shell

- Implement only the Creator Studio navigation-shell regression.
- The Studio top/leading control must open a complete native Studio section menu patterned on the existing web Studio navigation.
- The top/leading control must not push `/studio/apps`; Apps remains in the existing Studio bottom dock.
- Every exposed destination must be an existing working native route/screen.
- No fake buttons, placeholder routes, external web fallbacks, or broad Studio-module implementation are allowed in this lane.
- Preserve the approved Home, Discover, font, Studio dock, and every other route/layout.

## Authorised Phase 3 lane — internal native Terms and Privacy

- Create complete Expo Router native legal-reader routes for Terms and Privacy using the current canonical PLUGGD legal content as read-only source truth.
- Use native React Native/Expo screen patterns only; no external browser, WebView, or new dependency.
- Route every current user-facing Terms/Privacy tap that calls `Linking.openURL(LEGAL_URLS.terms/privacy)` internally, including purchase disclosures, Privacy settings, and signup consent links.
- Preserve purchase disclosures, signup consent semantics, account deletion and privacy controls, App Store metadata URLs, Home, Discover, font, and the completed Studio navigation lane.
- No placeholder, abbreviated policy, fake action, or unrelated legal/product rewrite is allowed.

## Authorised Phase 4 lane — real native Opportunities list and detail

- Create genuine Expo Router native `/opportunities` and `/opportunities/[id]` flows backed only by the existing Supabase Opportunities tables and contracts.
- Show the real published inventory, supported search/category/delivery filters, truthful deadline/location/funding/eligibility presentation, a real detail screen, persisted save/application/readiness state only where the backend supports it, and a working official application destination.
- Replace only the `will appear here` Open Opportunities placeholder in `EventsBoardScreen.tsx` with a real internal `/opportunities` entry point.
- Use the named existing web Opportunities files as read-only source truth; do not edit web code, schema, RLS, migrations, production data, or dependencies.
- No seed data, placeholders, fake matches, fake deadlines, AI ranking, frontend-only saved/application state, or fake/non-working actions.
- Preserve Home, Discover, font, Carnival, Events outside the entry-point replacement, prior Studio/legal lanes, and all unrelated dirty files.

## Out of scope until reauthorised

- Product/source edits of any kind.
- Product-scope re-audit.
- Builds, bundling, dependency changes, Simulator, iPhone/iPad, or device work.
- Supabase, storage, production, browser-admin, or App Store Connect mutations.
- App Review replies, uploads, submissions, or release actions.
- Commits, pushes, merges, cherry-picks, rebases, branch changes, deletions, or cleanup.
- Altering or deleting any pre-existing modified/untracked path.

## Allowed changes in Phase 1

- `.ai/ACTIVE_TASKS.md`
- `.ai/tasks/ios-native-parity-build8-recovery/CONTRACT.md`
- `.ai/tasks/ios-native-parity-build8-recovery/PROGRESS.md`
- `.ai/tasks/ios-native-parity-build8-recovery/VERIFY.md`

## Allowed source changes in Phase 2

- `pluggd-mobile/src/features/studio/StudioScreens.tsx`
- `pluggd-mobile/src/features/studio/studio-data.ts`
- Focused Studio navigation tests/scripts whose filenames explicitly identify this lane.
- No additional source file may be touched unless it is first added to this contract and is strictly necessary.

## Allowed source changes in Phase 3

- `pluggd-mobile/app/legal/terms.tsx` (new)
- `pluggd-mobile/app/legal/privacy.tsx` (new)
- `pluggd-mobile/src/features/legal/LegalReaderScreen.tsx` (new)
- `pluggd-mobile/src/features/legal/legalContent.ts` (new)
- `pluggd-mobile/src/components/PurchaseLegalLinks.tsx`
- `pluggd-mobile/app/settings/privacy.tsx`
- `pluggd-mobile/app/auth/signup.tsx`
- `pluggd-mobile/scripts/verify-mobile-native-legal-reader-contract.mjs` (new focused contract)
- `pluggd-mobile/scripts/verify-ios-app-store-readiness-contract.mjs` (existing readiness assertion updated for internal legal routing)
- Task records under `.ai/tasks/ios-native-parity-build8-recovery/` and the existing `.ai/ACTIVE_TASKS.md` row.
- No additional source file may be touched unless it is first added to this contract and is strictly necessary.

## Allowed source changes in Phase 4

- `pluggd-mobile/app/opportunities/index.tsx` (new thin Expo route)
- `pluggd-mobile/app/opportunities/[id].tsx` (new thin Expo route)
- `pluggd-mobile/src/features/opportunities/OpportunityScreens.tsx` (new native list/detail UI)
- `pluggd-mobile/src/features/opportunities/opportunityService.ts` (new existing-backend data/types/presentation contract)
- `pluggd-mobile/src/features/editorial/EventsBoardScreen.tsx` (replace only the Open Opportunities placeholder with an internal entry point)
- `pluggd-mobile/scripts/verify-mobile-opportunities-contract.mjs` (new focused contract)
- Task records under `.ai/tasks/ios-native-parity-build8-recovery/` and the existing `.ai/ACTIVE_TASKS.md` row.
- No additional source/test file may be touched unless it is first added to this contract and is strictly necessary.

## Authorised Phase 4B rendered visual-fix expansion

- `pluggd-mobile/src/features/opportunities/OpportunityScreens.tsx` for the recorded list overlap/image hierarchy and compact match-first detail corrections only.
- `pluggd-mobile/src/features/opportunities/opportunityService.ts` only to return the bundled Early Career Promoter artwork source while preserving existing remote artwork/logo behaviour for every other record.
- `pluggd-mobile/assets/opportunities/early-career-promoter-hero.png` (new, exact copy of the already-approved web campaign/card artwork; no generated or replacement art).
- `pluggd-mobile/scripts/verify-mobile-opportunities-contract.mjs` for the focused visual/source regression assertions.
- Existing task records only.
- No other source, asset, route, service, web, Soundboards, build, production, Git, or release change is authorised.

## Authorised Phase 5 Opportunities web-authority parity lane

- WEB_AUTHORITY=`/Users/apple/PLUGGD_NEW` main commit `cceaee6fd170e16adb85d83d95cebd7a80883e47`, read-only.
- VISUAL_AUTHORITY=`/Users/apple/Downloads/ChatGPT Image Aug 16, 2026 at 04_28_17 PM.png` plus the final Opportunities evidence recorded in `/Users/apple/PLUGGD_NEW/design-qa.md`.
- Continue from the rendered-verified Phase 4 native list/detail; do not repeat a global audit or replace accepted native navigation/chrome.
- Reconcile only native Opportunities list, detail, filters, matching, eligibility/missing-fact, organiser identity/artwork, save/preparation/application state and official action presentation with the accepted current web experience.
- Required behaviours remain backed by real current Supabase inventory and existing deterministic matching/application contracts; no mock count, score, reason, image, category, deadline or state may be introduced.
- Add a full-screen native filters experience only from model-backed fields present on the real inventory: category, creator role, genre, career stage, delivery, deadline, signed-in match/saved state and deterministic sort modes.
- Add compact native detail actions that remain accessible above the approved global bottom chrome and perform safe official apply plus real save/preparing/ready/applied flows.
- Use record metadata and verified official artwork first; use verified organiser logo/domain identity fallbacks and a neutral approved creator image only when no specific opportunity artwork exists. No capital-letter placeholder tile.
- Allowed source files: `pluggd-mobile/src/features/opportunities/OpportunityScreens.tsx`, `pluggd-mobile/src/features/opportunities/opportunityService.ts`, thin existing `pluggd-mobile/app/opportunities/index.tsx` and `pluggd-mobile/app/opportunities/[id].tsx` only if route wiring requires correction, `pluggd-mobile/assets/opportunities/opportunities-creator-hero.webp` as an exact authority asset copy, and `pluggd-mobile/scripts/verify-mobile-opportunities-contract.mjs`.
- Approved exact shared-header expansion: `pluggd-mobile/src/lib/appChromeVisibility.ts` and its focused `pluggd-mobile/scripts/verify-android-adaptive-navigation-contract.mjs` only. `/opportunities` and `/opportunities/*` must be marked as owning their dedicated headers so the list `DiscoveryHeader` and detail back/share bar never stack beneath the global top header; global bottom player/dock behaviour must remain unchanged.
- Existing task records are allowed. No other Soundboards, Discover, Home, build metadata, shared navigation, production, App Store, Git-history or unrelated dirty file is authorised. Stop before any further shared-file expansion.
- Required evidence: focused Opportunities and route contracts, TypeScript, scoped diff hygiene, and fresh Simulator list/detail/filter plus authenticated automatic-match/application-state evidence where the existing safe session permits it.

## Queued pre-Build 8 native parity phases — record only

- GLOBAL_TOP_BAR_PARITY: enlarge and properly space the avatar, notification bell, search and Live controls; enforce accessible touch targets and safe-area behaviour across main and detail screens. This is a later dedicated shared-shell phase and is not authorised for implementation during Opportunities.
- GLOBAL_PLAYER_PARITY: match the supported web player behaviour and visual standard. Use a real active waveform tied to actual playback/seek progress and a polished lyrics view only when real lyrics exist; inspect current native dependencies and use the appropriate native animation system. Never fabricate waveform data, synchronised timing or lyrics.
- GLOBAL_PLAYER_CLOSE_SEMANTICS: minimise/collapse and close are separate actions. Preserve collapse with playback continuing. Add a visible accessible `×` close action matching web behaviour that stops playback, clears the active track/media and queue context as appropriate, dismisses compact/full-screen player UI and does not restart unexpectedly on navigation.
- LATER_PLAYER_EVIDENCE: playback, pause, seek, queue, repeat, shuffle, share and route behaviour where supported by web; live waveform progress; lyrics present, absent and long-text states; background/interruption handling; close while playing/paused, from compact/full-screen, after seek and with queue/repeat state; VoiceOver labels/touch targets; Simulator and device proof.

## Authorised Phase 6 global top-bar and player parity lane

- Improve only the shared compact iOS top bars and the global native player against the already-recorded web behaviour and current native rendered baseline.
- Shared top bars must preserve Home, Live, search, notifications and account routes while increasing icon/avatar scale, spacing and accessible touch targets. Safe areas must remain correct on shared main and detail surfaces.
- Minimise/collapse and close are distinct. Minimise keeps playback and queue context alive. Close uses the current web semantics: stop/reset native playback, clear the active track and queue, dismiss compact/full-screen UI and prevent navigation from unexpectedly resurrecting playback.
- The compact player must expose a visible accessible close action in expanded and collapsed states without removing the existing expand/collapse control.
- The full player must preserve playback, seek, previous/next, shuffle, repeat, save, share, queue and source navigation while adding a separate close action.
- A waveform may render only from real current backend waveform data and must use actual playback position/duration for active progress and seeking. When real waveform data is absent, retain an honest progress rail; do not generate deterministic, random or decorative amplitude data.
- A lyrics view may use only real published release lyrics. Loading, absent and long-text states must be truthful; do not generate or infer lyrics or synchronised timing.
- The public Soundboard detail route may default the visible global player to its existing collapsed form so board content is not obscured. Global chrome must remain present and users must still be able to expand or close it.
- Allowed source files: `pluggd-mobile/components/MobileHeader.tsx`; `pluggd-mobile/src/features/discovery/DiscoveryHeader.tsx`; `pluggd-mobile/src/context/PlaybackProvider.tsx`; `pluggd-mobile/components/MiniPlayer.tsx`; `pluggd-mobile/components/liquid-glass/GlassMiniPlayer.tsx`; `pluggd-mobile/app/player.tsx`; new focused `pluggd-mobile/scripts/verify-mobile-global-shell-player-contract.mjs`; existing task records.
- No Opportunities, Soundboard product/canvas source, AppChrome policy, dock/navigation routes, dependency, build metadata, production, App Store or Git-history change is authorised. Stop before any additional shared-file expansion.
- Required evidence: focused shell/player contract; relevant existing route, adaptive-navigation and playback contracts; `npx tsc --noEmit`; scoped diff hygiene; fresh Simulator shared-header, expanded/collapsed/closed compact player, full player, real-waveform/fallback, lyrics present/absent where reachable, and Soundboard route-clearance evidence.

## Authorised Phase 7A Home/Carnival completion lane

- Complete only the user's recorded Home/Carnival note matrix without redesigning accepted Home sections or reopening other product lanes.
- The featured release action must use truthful copy and open the release detail; it must never imply that streaming access is unlocked.
- Carnival story titles must remain fully legible on cards and in the native reader header. Build My Carnival must present a visually composed, step-led planning surface. Carnival back/share controls must remain above the safe area and shared chrome.
- The Next Wave visible set must use multiple real current creator/community-room items when inventory provides them; every tile must be a working destination. No invented creator, room, score or engagement value.
- Home Soundboard artwork preview and explicit Open Board action must both route to the same real board. The full Happening Now event card must open; Tickets/RSVP/Details copy must remain derived from real price state and spacing must preserve readability.
- Drops & Tools must appear in this exact order with real routes: PLUGGD DJ to the existing native mix-upload tool `/creator/upload?type=mix` (not the listening-only `/mixes` route); BeatPlug to `/market/beats`; Creator Studio to `/studio`.
- Preserve accepted Mixes, New Releases, From THE PLUG and Make It Yours layouts. Do not edit Release detail, Mixes page, Discover, Community, Events index/detail, Store, player/global shell, shared navigation, build/App Store metadata, dependencies, auth, production or Git history.
- Allowed files only: `pluggd-mobile/src/features/home/MusicDiscoveryHome.tsx`; `pluggd-mobile/src/features/home/homeDiscoveryData.ts`; `pluggd-mobile/src/features/carnival/CarnivalHubScreen.tsx`; `pluggd-mobile/app/carnival/story/[slug].tsx`; new `pluggd-mobile/scripts/verify-mobile-home-carnival-completion-contract.mjs`; existing task records.
- Required evidence: focused Phase 7A contract, `npx tsc --noEmit`, scoped diff hygiene, and one fresh iPhone Simulator Home/Carnival pass covering every matrix item.

### Phase 7A orchestration split

- This writer relinquishes `pluggd-mobile/src/features/carnival/CarnivalHubScreen.tsx` and `pluggd-mobile/app/carnival/story/[slug].tsx` without editing them. Carnival title, route-builder composition and safe back/share requirements remain in the master matrix for a separate non-overlapping lane.
- This writer's exact remaining source authority is `pluggd-mobile/src/features/home/MusicDiscoveryHome.tsx`, `pluggd-mobile/src/features/home/homeDiscoveryData.ts`, and `pluggd-mobile/scripts/verify-mobile-home-carnival-completion-contract.mjs` only.
- This lane must complete the Home release action, Next Wave, Soundboard preview/Open Board, Happening Now and Drops & Tools requirements, preserve accepted Home sections, and capture one fresh Home Simulator pass.

## Phase 8 integration boundary — authenticated and compact current-source Simulator gate complete

- Current phase is `PHASE_8F_AUTHENTICATED_AND_COMPACT_GATE_COMPLETE`; `AUDIT_REQUIRED=false` and `CODE_EDIT_ALLOWED=false` remain controlling for this master record.
- `/tmp/pluggd-user-notes-acceptance-matrix.md` is the 75-point acceptance matrix. Later recorded lane evidence supersedes stale snapshot statuses, especially Home; unresolved Product and auth/data-dependent rows remain pending.
- `/tmp/pluggd-build8-source-manifest.md` is the source-provenance/staging aid. It does not authorise staging, commit, build, archive, upload, production or App Store action. Preserve its prior-recovery, generated-artifact and temp-residue exclusions.
- Verified and frozen lanes are Home, Carnival, Discover, Community, Store public flow, Opportunities source/signed-out flow, public Soundboards, Studio/legal source, global header/player core interactions and interaction polish/haptic source assertions.
- Product source/check lanes are frozen and their returned evidence has been incorporated. The serial gate resolved and retested Home event routing, compact Opportunities filter accessibility, Carnival deep linking, player/commerce clearance, Release source replacement and Mix playback.
- Auth/data-dependent evidence must remain explicit rather than fabricated. Signed-in Opportunities Save/Prepare and authenticated Studio drawer/Apps now pass. Soundboard owner editor, real non-empty waveform, real lyrics present/long-text, Live viewer/overlay/composer without a current session, physical haptics, VoiceOver and background/interruption remain blocked/unclaimed.
- The one-pass normal/compact integrated Simulator matrix is recorded at `/tmp/pluggd-build8-whole-app-walkthrough-matrix.md`, with evidence under `/tmp/pluggd-build8-whole-app-walkthrough/` and its contact sheet. Accepted lane checks must not be repeated without a concrete failure or changed source.
- The integrated result is 52 PASS, 7 accepted focused regression passes, 9 QA-blocked rows, zero pending rows and zero remaining concrete failures. K09/K10 pass after a width/height-bounded compact full-player layout correction verified at 375x667.
- Live lobby option 3 is source/check/render/design-QA PASS on normal and compact current-source Simulators without creating or publishing a room. The non-blocking P3 wordmark-crop note is recorded in `/tmp/pluggd-live-option3-design-qa.md`.
- The exact controlling next action is: `review only the nine recorded external-state/device blockers, then request human approval before Build 8 archive/upload/submission.` No archive, upload, production, Git or App Store action is authorised by this contract.

## Acceptance criteria for Phase 1

1. Registry matches branch `codex/ios-carnival-live-review-v5` and worktree `/Users/apple/pluggd-mobile-workspace`.
2. `AUDIT_REQUIRED=false` and `CODE_EDIT_ALLOWED=false` are persistent.
3. Build/attempt facts, approved differences, and all seven P0 lanes are recorded.
4. The pre-record dirty tree is grouped as source/support files, generated Build/QA artifacts, and unknown residue needing attribution.
5. No non-`.ai` path changes during Phase 1.
6. Work stops after records and attribution are complete.

## Acceptance criteria for Phase 2

1. The Studio top/leading control opens the native Studio section menu and never routes directly to `/studio/apps`.
2. The menu is complete relative to the existing native Studio sections patterned on the web Studio navigation.
3. Every visible destination resolves to an existing working native Studio route/screen.
4. Apps remains available in the unchanged bottom dock without duplication as the top-control action.
5. No placeholder, fake, external-web, or unimplemented destination is exposed.
6. TypeScript and focused Studio navigation checks pass.
7. Fresh authenticated Simulator evidence confirms the menu opens and routes correctly; if authentication blocks access, record the blocker and stop without blind UI edits.
8. No unrelated dirty path, generated artifact, backend, App Store, Git history, dependency, Home, Discover, font, dock, route, or layout change occurs.

## Acceptance criteria for Phase 3

1. `/legal/terms` and `/legal/privacy` render complete canonical policy content as native screens.
2. Purchase, Privacy-settings, and signup legal taps navigate internally and never call `Linking.openURL` for Terms or Privacy.
3. Signup consent text/semantics, purchase renewal disclosures, account deletion, privacy controls, and external App Store metadata URLs remain unchanged.
4. Native readers provide working back/close navigation, readable hierarchy, safe-area handling, and shared bottom-chrome clearance without dependencies or WebView.
5. Focused legal route/link/content contracts, `npx tsc --noEmit`, and scoped diff hygiene pass.
6. Fresh rendered evidence is captured only if an existing session is already reachable; otherwise record the blocker without booting/building/installing.
7. No unrelated P0 lane or external-system action occurs.

## Acceptance criteria for Phase 4

1. `/opportunities` queries only real existing `opportunities` rows with public open statuses and renders loading, error, empty, refresh, search, category, and delivery states without seed/fallback listings.
2. `/opportunities/[id]` resolves a real published opportunity by slug or UUID and renders canonical organiser, description, deadline, location, funding/value, eligibility, verification, and official-source data without invented values.
3. Signed-in save, application status, checklist/readiness, and item completion use existing `user_opportunities`, `opportunity_application_items`, and `user_opportunity_items` backend contracts; signed-out actions route to login; no frontend-only persisted state.
4. Official application, guidelines, and source actions accept only safe HTTP(S) URLs and work when the backend supplies them; absent destinations are stated honestly and expose no dead button.
5. The Events Open Opportunities panel routes internally to `/opportunities` and no longer says opportunities `will appear here`.
6. Focused Opportunities contracts, `npx tsc --noEmit`, relevant existing route/copy contracts, and scoped diff hygiene pass.
7. Fresh rendered evidence is captured only if an existing session is already reachable; otherwise record the blocker without booting/building/installing or mutating authentication.
8. No web, schema/RLS, Supabase production, App Store, Git history, dependency, other P0 lane, or unrelated dirty-path change occurs.

## Verification requirements

- Read-only Git status and diff metadata only.
- No product, browser, Simulator, device, backend, or App Store verification in Phase 1.
- A final Git status comparison must show that the only new Phase 1 paths are the authorised `.ai` records.

## Rollback criteria

- Do not roll back, delete, or clean anything under the current freeze. If a record is wrong, correct only the affected `.ai` record after orchestrator instruction.

## Branch and cleanup criteria

- MERGE_TARGET=main
- TEMP_BRANCH_ALLOWED=false
- TEMP_WORKTREE_ALLOWED=false
- BRANCH_CLEANUP_REQUIRED=false
- WORKTREE_CLEANUP_REQUIRED=false
- ACTIVE_TASKS_REGISTRY_UPDATE_REQUIRED=true

## Notes

## Phase 8J Native Published Lyrics Scope (2026-08-17)

- Allowed product files: `pluggd-mobile/src/features/studio/studio-data.ts`, `pluggd-mobile/src/features/studio/StudioScreens.tsx`, and `pluggd-mobile/scripts/verify-mobile-studio-web-parity-contract.mjs`.
- Published lyrics use the existing owner release's `public.releases.lyrics` field already consumed by the native full player; no late schema migration or private-draft substitution is allowed.
- The internal Release workspace exposes Add published lyrics when empty and Edit published lyrics when present, with a multiline native editor and owner-filtered persistence.
- Empty lyrics cannot silently publish or erase lyrics. No public release-page detour, invented content, build, archive, upload, or App Store action is authorised.

- This contract records scope; it does not authorise implementation.
- Existing dirty files and artifacts belong to prior work unless an implementation lane later proves otherwise.
# Phase 17 Build 13 phone candidate and App Store resubmission contract - 2026-08-28

The founder has approved the exact Phase 16 Simulator state and explicitly authorises freezing it as iOS Build 13, committing only the reviewed task-owned changes, producing and installing that exact development-signed Release build on Ishola's paired iPhone, updating the authorised content-rights document from Build 10 to Build 13, and preparing the corresponding App Store resubmission.

- TARGET=`com.pluggd.mobile`, marketing version `1.0.0`, iOS build `13`; source branch `codex/ios-build12-live-community-carnival`; worktree `/private/tmp/pluggd-ios-build12-live-community`.
- COMMIT_SCOPE=Phase 16 product files, iOS build-number authority, Build 13 review documents and these task records only. Preserve `pluggd-mobile/.env` and `.playwright-cli/` unstaged and untouched. Do not absorb unrelated generated, secret, signing or temporary files.
- DEVICE_GATE=After staged-manifest and focused hygiene checks, make one local reproducible commit; build one development-signed Release `iphoneos` candidate from that exact commit; validate bundle/version/team/signature/bundle hash; install, launch and read back Build 13 on the exact paired iPhone. Build 12 and its commit remain rollback authorities.
- RIGHTS_DOCUMENT=Use the founder-supplied signed PDF only as the authorised visual/content source. Produce a separate Build 13 PDF without overwriting the original, preserve the visible signature and all substantive wording, change only stale build-number references, render every page and inspect it. Record that editing a signed PDF creates a new document version whose visible signature is preserved but whose cryptographic signature, if any, must be revalidated or re-signed before Apple submission.
- APP_STORE_PREPARATION=After the device candidate is proven, prepare the Build 13 archive/export/upload and App Store Connect build selection, review notes, Guideline 2.1 response, IAP/tester/reviewer-access checks and attachment set from current facts only. The founder's new physical video is a required attachment and must finish processing before final submission.
- STOP_BOUNDARIES=Do not fabricate a signature, video, credential, purchase, Restore result, deletion result or reviewer evidence. Stop at any Apple legal agreement, Account Holder-only confirmation, missing/failed attachment, unresolved processing error or final Submit for Review action until all required current evidence is present and the founder has supplied/approved the recording.
- CONSEQUENTIAL_AUTHORITY=Local commit, Build 13 phone install, PDF versioning, archive/export/upload, processed-build selection and truthful App Store preparation are authorised. No production/backend mutation, purchase, merge, push, deployment, destructive cleanup or final submission without the complete evidence gate.
