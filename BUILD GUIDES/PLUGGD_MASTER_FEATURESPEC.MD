Pluggd — Master Feature Specification
What Pluggd is Pluggd is a creator-first music platform that fuses commerce, community, creation, and growth. Creators sell releases, license beats, offer sound packs, run live sessions, teach courses, manage memberships and campaigns, collaborate, and get paid — while fans discover, stream, playlist, buy, tip, subscribe, attend live, and learn.
The differentiator The differentiator is Plug-ins/Channels: connect Instagram/YouTube/TikTok/X/SoundCloud/Discord/Mailchimp/Substack/Patreon, post once with per-channel variants, schedule, reply from a unified inbox (where APIs allow), and see which posts drove sales, tips, tickets, and plays on Pluggd.
Global Conventions [v2: 1, 2] (This section is a new, high-level addition from Source v2, providing critical system-wide details not present in Source v1.)
• Accessibility: keyboardable, visible focus, ARIA, 4.5:1 text contrast. [v2: 1]
• Performance: responsive, SSR/ISR where useful, image/CDN, code-splitting. [v2: 1]
• Security: RLS on Supabase, signed URLs for assets, KYC/AML for payouts. [v2: 2]
• Observability: structured logs, error monitoring, product analytics. [v2: 2]
• Internationalization: currency/locale display; copy uses neutral English; dates are locale-aware. [v2: 2]
• Env fallbacks: if secrets missing, render safe placeholders (no crashes). [v2: 2]
• Sticky layout offsets: global CSS var --masthead-h used to avoid overlap with sticky header and audio player. [v2: 2]
Primary users
• Fans — discover/stream, playlist, buy/tip, memberships, live, courses.
• Creators/Teams — sell & license, live, courses, memberships, collabs, distribution (v2), cross-post growth via Plug-ins, analytics, payouts.
• Admins — safety, reviews, scheduling, finance, analytics, feature flags.
--------------------------------------------------------------------------------
1) Discovery & Navigation
Goal: get fans into content fast; route them to Creator Pages that convert.
• Homepage hero (BeatStars-style): rotating artwork backdrop with left-edge blend; role-aware headline; manual prev/next. (P0, MVP)
• Hero search tabs: Fans → Music / Creators / Beats; Creators → Beats / Music / Creators. Routes to /search?q=&type=. (P0, MVP)
• Dynamic first rail: Fans → Trending Music; Creators → Trending Beats. (P0, MVP)
• Popular Genres chips: filter first rail; clear chip; smooth-scroll to rail. (P0, MVP)
• Active Collaborations carousel; Upcoming Live carousel. (P1, MVP)
• Why Pluggd conversion band; How it works (role-aware 3 steps + trust chips). (P1, MVP)
• Studio Preview (mini dashboard: messages, invites, earnings sparkline, tasks + CTA). (P2, v1.1)
• Placements (“Made with Pluggd”) grid. (P2, v1.1)
• FAQ. (P3, MVP)
• Polish: parallax/ambient glows; user-controlled carousels. (P2, v1.1)
• Global sticky header: transparent over hero → solid on scroll; role toggle persists. (P0, MVP)
• Footer: Trust & Safety links. (P0, MVP)
• Search/Explore pages with tabs (Music/Beats/Creators), filters (genre, price; bpm/key for beats), sorts (trending/new), pagination/infinite. (P0, MVP)
• Creators directory (follow/support). (P1, v1.1)
• Recommendations (follow/genre-based). (P2, v2)
• Navigation prefetch (warmRoute(href,image?)). (P2, v1.1)
Acceptance: hero blend hides left artwork edge; search routes with q&type; genre filter applies and scrolls; carousels keyboard accessible.
--------------------------------------------------------------------------------
2) Streaming & Playlists
• Global player: sticky micro-player + expandable; queue; play/pause/seek; add to queue/play next. (P0, MVP)
• Access: full streams for items marked streamable or owned; 30–60s previews when gated. (P0, MVP)
• Playlists: create/edit, reorder, public/private, share links. (P1, MVP)
• Collaborative & followable playlists + editorial submission. (P2, v1.1)
• Charts & radio (basic radio from track/artist/genre). (P2, v1.1)
• Advanced: shuffle/repeat, crossfade/gapless, loudness normalization, quality selector. (P3, v2)
Acceptance: audio never stops on route changes; purchased items stream full; playlist privacy enforced; play events tracked.
--------------------------------------------------------------------------------
3) Storefronts & Digital Products
Releases (Bandcamp-class)
• Detail page: player, buy, description, credits/liners (ISRC/UPC optional), lyrics, tags/genres; instant secure downloads; receipts. (P0, MVP)
• Pre-orders; name-your-price; gifts; wishlists; formats (WAV/FLAC/ALAC/MP3). (P2, v1.1)
• Optional sync/licensing on releases. (P3, v2)
Beats (BeatStars-class)
• License tiers (basic/premium/unlimited) with clear terms + comparison; BPM/key; tags; watermarked preview; stems. (P0, MVP)
• License/EULA generator (PDF at checkout); bulk deals/coupons; bundles/upsells. (P1, v1.1)
• Free download with email gate; embed store/player widget. (P2, v1.1)
Sound Packs
• Pack listing/detail (DAW compatibility, contents, demo); versioning/updates; instant delivery. (P1, v1.1)
Merch (physical/digital)
• Product variants/SKUs/inventory; vinyl pre-order batching; shipping rules. (P3, v2)
NFTs/Collectibles
• Tokenized drops/collectibles; unlocks; custody model TBD; compliance gating. (P3, v2)
Acceptance: secure signed URLs for downloads; license PDFs generated; stems downloadable post-purchase; bundles reflect discounts.
--------------------------------------------------------------------------------
4) Credits, Cart & Checkout
• Credits wallet: buy/earn; never expire; apply at checkout (max % rule); ledger with reasons. (P0, MVP)
• Cart/checkout: taxes/VAT, receipts/invoices, refunds, anti-fraud basics. (P0, MVP)
• Coupons/discounts; tips/gifts on creator pages (stickers/spotlight v1.1). (P1, MVP→v1.1)
Acceptance: credits applied pre-tax (config); refund restores credits/charges clawbacks; order records reconcile with payouts.
--------------------------------------------------------------------------------
5) Splits & Payouts
• Per-product split setup; offers/accept; lock on first sale; versioning as needed. (P0, MVP)
• Auto-routing payouts (Stripe Connect); statements/history; downloadable reports. (P0, MVP)
• Split sheets/contracts vault. (P2, v1.1)
Acceptance: payouts equal orders minus fees/splits; statements export; locked splits after first sale.
--------------------------------------------------------------------------------
6) Creator Studio (Back-office)
Creator Spec — Studio + Creator Page (Full)
Purpose The Creator Studio is the back-office where creators run their business. It powers the public Creator Page (their storefront + link-in-bio) and marketplace listings (search, rails, playlists, charts).
Primary users Solo creators, small teams (managers, collaborators), instructors/hosts.
IA (left sidebar)
1. Dashboard
2. Catalog (Releases • Beats • Sound Packs • Bundles • Merch & Collectibles (v2))
3. Plug-ins / Channels (Connect • Composer • Scheduler • Inbox (v2) • Analytics • Smart Links)
4. Live (Sessions • Tickets • Recordings)
5. Courses (Builder • Pricing • Enrollments)
6. Memberships (Tiers • Perks • Posts • Discord Sync)
7. Crowdfunding (Campaigns • Rewards • Updates • Risk)
8. Collaborations (Projects • Applicants • Messages • Milestones/Escrow)
9. Analytics (Sales • Plays • Funnels • Sources/UTM • Post ROI)
10. CRM & Audience (Customers • Followers • Members • Segments • Exports)
11. Storefront & Profile (Theme • Featured • Navigation • Domain)
12. Financials (Orders • Refunds • Payouts/Statements • Splits • Tax/KYC)
13. Settings (Account • Team • Notifications • Integrations • Defaults • Distribution (v2) • Legal Vault)
14. Partnerships & Mentorship (v2) (Brand campaigns • 1:1 mentorship)
Module specs (what + key actions + connections + acceptance) (This section draws extensively from Source v1 due to its much higher level of detail for each module compared to Source v2's brief summaries.)
1. Dashboard
    ◦ What: at-a-glance performance + inbox/ops.
    ◦ UI: earnings sparkline (7/30d, %), today’s sales, top products, tickets sold, membership count, unread messages, invites, tasks, upcoming live; Quick Add (release/beat/pack/live/course/post).
    ◦ Connects: Orders, Payouts, Messages, Tasks, Catalog, Live, Plug-ins.
    ◦ Acceptance: widgets load independently with retries; totals reconcile with Analytics.
2. Catalog
    ◦ Entities: Releases, Beats (+license_tiers), Sound Packs (versioning), Bundles, Merch (v2), Collectibles/NFTs (v2).
    ◦ Fields: title, cover, price, tags/genres, preview_url, files/stems, versioning (packs), license templates (beats), visibility (draft/published), splits, inventory (merch), chain/collection (NFTs).
    ◦ Actions: create/edit, upload, pricing, license PDF gen (beats), version bump (packs), bundle items, publish, feature pin.
    ◦ Connects: Creator Page (instant reflect), Checkout/Delivery, Splits/Payouts, Plug-ins (auto-post on publish), Storage.
    ◦ Acceptance: publish visible <5s; secure signed downloads; stems delivered post-purchase; bundles show savings; merch excluded from instant delivery; NFT mint/claim logged if enabled.
3. Plug-ins / Channels (moat)
    ◦ Connect: OAuth IG Business/FB Pages, YouTube, TikTok Business, X/Twitter, SoundCloud, Discord, Mailchimp/Substack, Patreon.
    ◦ Composer: write once → per-channel variants (length, tags, mentions), attach cover/video/clip, inject smart link with UTM + shortlink.
    ◦ Scheduler: calendar, time-zone aware, retries/backoff, bulk schedule; automations on publish/live/course/campaign.
    ◦ Inbox (v2): comments/mentions where APIs allow; saved replies; assignment; moderation (hide/ban where available); deep-link when read-only.
    ◦ Analytics: per-post/per-channel metrics; closed-loop attribution to Pluggd sales/plays/tips/tickets via shortlinks + UTM.
    ◦ Acceptance: every dispatched post stores post_targets + status; network failures retried with exponential backoff; attribution visible in Analytics with post→order/plays join; shortlinks unfurl cleanly.
4. Live
    ◦ Create: title, start/duration, price, capacity, cover, room settings; ticket link.
    ◦ Run: ticketing & reminders (24h/1h, ICS), gated room (chat/screen/audio), host controls; Meet & Greets (v2) 1:1 or group.
    ◦ After: recording/VOD attach to buyers; Premieres (v2) with live chat; chapters/timecodes.
    ◦ Connects: Orders/Payouts, Library (fan VOD), Creator Page (Upcoming), Plug-ins (announce), CRM (attendees).
    ◦ Acceptance: seat caps enforced; ticket-only access; VOD availability toggled; ICS downloadable.
5. Courses (LMS)
    ◦ Builder: modules/lessons/quizzes/resources, pricing; optional live classes.
    ◦ Access: purchase/credits/membership; progress; certificates (opt).
    ◦ Connects: Orders/Enrollments, Live (for classes), Creator Page (Courses), Payouts, Plug-ins.
    ◦ Acceptance: purchase grants access; progress persists; instructor payout pipelines run.
6. Memberships (v2)
    ◦ Tiers & perks: gated posts/downloads, Discord role sync, trials, coupons.
    ◦ Connects: Creator Page Join block, CRM segments, Checkout, Plug-ins (member posts).
    ◦ Acceptance: gating strict (cache + server); role sync completes within minutes; cancel/pause updates access.
7. Crowdfunding
    ◦ Campaigns: goal, deadline, tiers/rewards, updates, admin risk review.
    ◦ Payouts: on completion (or staged); refunds policy; receipts.
    ◦ Connects: Orders/Payouts, Creator Page (Campaign), Plug-ins (announce), Analytics (conversion).
    ◦ Acceptance: contributions count to goal; rewards tracked; state machine (draft → reviewing → live → success/failed → fulfilled).
8. Collaborations
    ◦ Projects: brief (roles, budget, due, skills/tags, files); applicants; messaging; milestones/escrow (opt); revisions; file handoff; reviews/ratings (v2).
    ◦ Connects: Studio Dashboard (invites/tasks), Files, Payouts/Splits, Catalog (convert deliverables).
    ◦ Acceptance: applicant notifications; escrow release controls; final delivery links preserved.
9. Analytics
    ◦ Dashboards: sales/GMV, plays/likes, conversion by product, source/UTM, cohort retention, live/course performance.
    ◦ Post ROI: per Plug-ins post attribution to sales/plays; funnels from post → click → view → purchase/play.
    ◦ Acceptance: totals reconcile with Orders; date/UTC consistent; filters persist in URL.
10. CRM & Audience
    ◦ People: buyers, followers, members, students; segments; exports; LTV; last activity.
    ◦ Messaging: saved replies; newsletter bridge (Mailchimp/Substack) or Discord role broadcast.
    ◦ Acceptance: segment rules compute <5s (≤50k contacts); CSV exports succeed; unsubscribe honored.
11. Storefront & Profile (Creator Page config)
    ◦ Branding: cover/avatar/accent, bio/links, tabs order, featured items, bundles, custom domain.
    ◦ Acceptance: instant reflect to public page; SEO schema/OG updated; share cards correct.
12. Financials
    ◦ Views: Orders (filters/refunds), Payouts/Statements, Splits matrix per product, Tax/KYC.
    ◦ Acceptance: payouts match orders minus fees/splits; downloadable statements; KYC status blocks payouts until complete.
13. Settings
    ◦ Account/Team, Notifications, Security, Integrations (Plug-ins), Defaults (license templates, pricing), Legal Vault (contracts, split sheets).
    ◦ Distribution (v2): DSP delivery hub (Spotify/Apple/YT Music etc.), metadata/IDs (UPC/ISRC/ISWC/PROs), QC statuses, redelivery; royalty ingestion & statements.
    ◦ Acceptance: RLS & roles enforced; webhooks idempotent; distro jobs reflect statuses.
14. Partnerships & Mentorship (v2)
    ◦ Brand partnerships: inbound briefs, proposals, deliverables, payouts.
    ◦ Mentorship: 1:1 slots, booking, payments, materials handoff.
    ◦ Acceptance: booking windows enforced; payouts tracked; deliverables attached.
--------------------------------------------------------------------------------
Creator Page (public)
• Hero: cover, avatar, handle, one-line blurb, socials; adaptive primary CTA (New fan: Follow; Warm: Buy/Tip; Superfan: Subscribe).
• Tabs: Music, Beats, Store (packs/merch), Live, Courses, Community, About — auto-reorders based on what they sell.
• Blocks: Featured rail; Membership widget; Upcoming Live; Courses; Collab open card; Clips (shorts) highlights; Placements/Testimonials; smart links (minimal).
• Conversion notes: “Save 10% when you follow” nudge; email notify opt-in; social proof (supporters/drops/next live).
• SEO: Person/MusicGroup + Product schema; fast LCP; clean OG.
Acceptance:
• All CTAs route without auth-walls unless purchase.
• Tabs respect feature toggles (e.g., no Courses tab if none).
• Metrics for impressions/clicks recorded for funnels.
--------------------------------------------------------------------------------
Data model (Studio + Creator Page)
• Catalog: releases, beats, license_tiers, packs, bundles, merch_products (v2), merch_variants (v2), inventory (v2), collectibles (v2)
• Commerce: orders, order_items, credits_ledger, coupons, refunds
• Financials: splits, payouts, statements, tax_profiles
• Live: live_sessions, live_tickets, recordings
• LMS: courses, lessons, enrollments, resources
• Memberships: membership_tiers, memberships, gated_posts
• Crowdfunding: campaigns, campaign_supporters
• Collab: collaborations, collab_applicants, messages, milestones
• Plug-ins: social_accounts, oauth_tokens, social_posts, post_targets, shortlinks, social_metrics, inbox_messages
• Audience: profiles, follows, customers
• Clips (v2): clips, clip_remixes
• Gamification (refs): leaderboards, leaderboard_entries, quests, quest_assignments, quest_completions, badges, badge_awards, streaks, referral_links, referral_conversions, credit_rules
• Analytics views: trending, genre_popularity_last_30d, earnings_daily, view_hub_threads
--------------------------------------------------------------------------------
Acceptance (global)
• Lists: search/sort/filter + empty/error + retry.
• Drafts autosave; publish confirms destructive effects (e.g., lock splits).
• Signed URLs for downloads; purchase gates enforced.
• Webhooks/queues idempotent; analytics totals reconcile; timezone-safe.
• A11y: keyboard nav, focus states, ARIA labels.
--------------------------------------------------------------------------------
Phasing
• MVP: Dashboard, Catalog (releases/beats/packs), Splits & Payouts, Live (tickets/reminders), Collabs (basic), Storefront/Profile, Financials, Settings, Credits/Tips, Creator Page (baseline).
• v1.1: Plug-ins (connect/composer/scheduler/smart links + basic attribution), Courses, Crowdfunding, CRM, Playlists/editorial submission hooks, Studio Preview on homepage, Placements.
• v2: Plug-ins Inbox + advanced ROI, Memberships, Short-form Clips/Remix, Distribution, Rights/ID tools, Merch & Collectibles, Partnerships & Mentorship, Mobile controls.
Detailed Phasing (with priorities)
• Dashboard (earnings sparkline, today’s sales, top products, tickets, memberships, messages/invites, tasks, upcoming live). (P0, MVP)
• Catalog (Releases, Beats, Packs, Bundles): pricing, license templates, files/stems storage, instant delivery. (P0, MVP)
• Plug-ins/Channels (Connect, Composer, Scheduler, Inbox, Analytics). (P1, v1.1; Inbox advanced v2)
• Live (sessions/tickets/reminders/recordings). (P0, MVP)
• Courses (builder, pricing, enrollments, optional live classes). (P1, v1.1)
• Memberships (tiers/perks, gated posts/downloads, Discord role sync). (P2, v2)
• Crowdfunding (tiers/rewards, updates). (P2, v1.1)
• Collaborations (projects/applicants/messaging; milestones/escrow optional). (P0, MVP; escrow v1.1)
• Analytics (sales, plays/likes, conversion, sources/UTM, post ROI). (P1, v1.1→v2)
• CRM (buyers, followers, members; segments & exports). (P1, v1.1)
• Storefront & Profile (theme, featured, bundles, domain mapping). (P1, v1.1)
• Financials (orders/refunds, payouts/statements, splits, KYC/Tax). (P0, MVP)
• Settings (account/team, notifications, integrations, defaults, legal vault). (P0, MVP)
--------------------------------------------------------------------------------
7) Plug-ins / Channels (Moat)
• OAuth Connect: IG Business/FB Pages, YouTube, TikTok Business, X/Twitter, SoundCloud, Discord, Mailchimp/Substack, Patreon. (P1, v1.1)
• Composer: write once, per-channel variants (length, tags, mentions); attach cover/video/clip; smart links/UTM. (P1, v1.1)
• Scheduler/Queue: calendar; retries/backoff; publish hooks (auto-post on release/beat/live/course). (P1, v1.1)
• Inbox: comments/mentions (where APIs allow); saved replies; assignment; moderation. (P2, v2)
• Analytics: impressions/clicks/followers by channel; closed-loop attribution to sales/plays on Pluggd. (P1→P2, v1.1→v2)
• Smart link / link-in-bio: auto-pull latest, theming, analytics. (P1, v1.1)
Acceptance: scheduled posts dispatch; failures show retry; UTMs present; sales/plays show attributed post & channel.
--------------------------------------------------------------------------------
8) Community Hub
• Mode Select: Create / Collaborate / Learn / Earn; reorders spotlights, updates shortcuts. (P2, v1.1)
• Hero metrics: members, active this week, contests running, sessions. (P2, v1.1)
• Quick Actions: right column utilities. (P3, v1.1)
• Contests & Challenges: branded competitions with prizes. (P2, v1.1)
• Community Radio: shared queue; now playing; up next; listeners. (P3, v1.1)
• Forums & Threads: feedback, wins, general; thread list from view_hub_threads. (P2, v1.1)
• Daily Prompts: creative prompts with tags; CTA. (P2, v1.1)
• Creator Spotlight card; Announcements bar (gradient banner). (P2, v1.1)
• Exclusive Fan Clubs (private groups per artist). (P3, v2)
Acceptance: hub payload from Supabase RPC/view; radio queue updates in real time; threads sortable; prompts daily windowed.
--------------------------------------------------------------------------------
9) Gamification (XP, Streaks, Badges, Quests, Leaderboards)
Gamification & Credits — Updated Spec
Goals Drive repeat behaviors (discover, buy, tip, attend, learn, collaborate) and make progress visible (levels, badges, streaks) and valuable (credits, perks).
XP & Levels
• XP is non-monetary; daily caps to prevent farming (default 2,000 XP/day per user; 500 XP/creator fan-to-creator cap).
• Level curve: XP_to_level_n = BASE * n^1.5 (BASE=100).
• Idempotent XP events; audited with hashes.
Fan XP defaults
• Complete profile +200; Follow +20 (cap 10/day); First play per creator/day +5 (cap 20 creators/day); Like/Save +5 (cap 30/day); Add to playlist & listen ≥60% +25; Comment (not flagged) +10 (cap 20/day); Purchase +1 XP/£ (cap +250/order); Tip +1 XP/£ (cap +200/day); Attend live +80 (+50 if VOD ≥70%); Lesson complete +10 (cap +150/day); Daily/Weekly quests +50/+200; Referral (first buyer) +300.
Creator XP defaults
• Publish approved product +150; First 100 plays unique +100; First 10 sales +200; Live hosted with ≥10 attendees +250; Collab completed 5★ +300; Course with ≥70% avg completion +500 (1x per course).
Badges & Streaks
• Badges: Supporter I/II/III (spend), Patron (3-month membership), Curator (playlist followers), Early Adopter (time-boxed), Live Regular (5/20/50), Collab Crew (3/10), Educated (1/5 courses), Top Fan (per creator 90d), Seasonal winner.
• Streaks: day = any qualifying action; freeze tokens (earn 1 per 7-day streak; max 3; auto-used on miss); 7-day +25 XP, 30-day +200 XP + 100 credits.
Quests & Seasons
• Daily (3) and Weekly (2) assignments; reroll if user repeats same quest too often.
• Seasonal events (genre jams, collab weeks, placement hunts) with unique badges + prizes; seasonal leaderboards.
Leaderboards
• Global 30d XP; by genre creators; per-creator Top Fans (last 90d). Privacy opt-out; if opted out, show as “anonymous”.
Credits Economy
• Utility currency (non-cash, non-withdrawable). Default 1 credit = £0.01.
• Earn: 2% cashback (config), quests, streaks, referrals (e.g., +500 after first purchase), promos, membership stipends (per-tier).
• Spend: digital purchases (releases, beats, packs, tickets, courses, memberships), tips/gifts.
• Rules: default max 50% of cart payable with credits; per-product overrides; pre-tax vs post-tax configurable (recommend pre-tax).
• Refunds/chargebacks: restore spent credits; claw back earn credits; allow negative balance which auto-recovers on next earn.
Anti-abuse & Trust Rate limits; per-action caps; quality gates (≥30s or ≥60% listen); device/IP checks; referral KYC gate; clawbacks; manual review for spikes.
UX surfaces
• Header: XP bar + level chip; Credits pill.
• /me: XP timeline; Quests panel; Streak flame; Badges shelf; Leaderboards module; Referrals.
• Creator Pages: show Top Fans (90d).
• Checkout: “Use credits” toggle + slider; clear line items.
• Toasts: show “+50 XP • +10 credits” earn events; subtle confetti on level-up.
Data model
• XP: xp_balances, xp_events, streaks
• Badges/Quests: badges, badge_awards, quests, quest_assignments, quest_completions
• Leaderboards: leaderboards, leaderboard_entries
• Credits: credits_ledger, credit_rules
• Referrals: referral_links, referral_conversions
Acceptance
• XP/credit events idempotent; caps enforced; level-ups/streaks correct across timezones (store UTC).
• Checkout always respects max credits %; receipts/ledgers reconcile.
• Refunds/chargebacks produce balancing ledger entries.
• Privacy opt-out hides user identity on boards everywhere.
• A11y: badges/levels readable without color; tooltips/localization supported.
Phasing
• MVP: XP basics, daily cap, level bar; Credits wallet + checkout + refunds/clawbacks; Badges (Supporter/Early/Live), Streaks, Quests (2 daily/1 weekly), Leaderboards (Global XP + per-creator Top Fans), UI surfaces in header & /me.
• v1.1: Referrals, Curator badges, seasonal events + admin rules editor, live/VOD + course XP ties, playlist submission quests, membership credit stipends.
• v2: Per-genre/region boards, prize pools, advanced anti-abuse signals, mobile rewards/offline handling, push for streak saves.
--------------------------------------------------------------------------------
10) Live Sessions & Events
• Create/schedule: title, start/duration, price, capacity, cover, room settings. (P0, MVP)
• Ticketing & reminders (24h/1h + ICS). (P0, MVP)
• Live room: chat, screen/audio share; gated by ticket; host controls. (P0, MVP)
• Recording/VOD to buyer library; Premieres with chat; chapters. (P2, v1.1→v2)
• Meet & Greets (1:1 or group). (P3, v2)
• Public Live schedule page. (P1, MVP)
• Host payouts/reporting. (P1, MVP)
--------------------------------------------------------------------------------
11) Courses / Academy (LMS)
• Course marketplace + builder (modules/lessons/quizzes/resources). (P1, v1.1)
• Live classes with interactivity; progress tracking; certificates (opt). (P2, v1.1→v2)
• Access/pricing: purchase/credits/membership; instructor payouts. (P1, v1.1)
--------------------------------------------------------------------------------
12) Memberships (Patreon-class)
• Tiers & perks: gated posts/downloads; Discord role sync; trials; coupons. (P2, v2)
• Member feed; churn-save nudges; payouts. (P3, v2)
--------------------------------------------------------------------------------
13) Crowdfunding
• Campaigns: goal, tiers/rewards, updates; risk/compliance review; payouts & refunds. (P2, v1.1)
--------------------------------------------------------------------------------
14) Collaborations Marketplace
• Browse projects (budget, due, genre, role); apply; messaging; status (open/in progress/closed). (P0, MVP)
• Milestones/escrow; revisions; file handoff; reviews/ratings. (P2, v1.1→v2)
--------------------------------------------------------------------------------
15) Distribution to DSPs (optional expansion)
• DSP delivery hub (Spotify/Apple/YouTube Music, etc.). (P3, v2)
• Metadata/IDs (UPC/ISRC/ISWC/PROs; contributors). (P3, v2)
• Royalty ingestion & statements; Content ID/fingerprinting; duplicate detection. (P3, v2)
--------------------------------------------------------------------------------
16) Creator Page (public storefront)
(This is a re-statement/summary of the more detailed "Creator Page (public)" section provided earlier, retaining for completeness per Source v1's structure.)
• Hero: cover, avatar, handle, blurb, socials; primary CTAs (Follow/Tip/Subscribe) adaptive by visitor. (P0, MVP)
• Tabs: Music, Beats, Store (packs/merch), Live, Courses, Community, About. Auto-reorder based on what they sell. (P1, v1.1)
• Featured rail; Membership widget; Upcoming Live and Courses; Collab open card; Clips highlights; placements/testimonials. (P1, v1.1)
• Smart links minimal and not competing with CTAs; SEO/schema. (P1, v1.1)
--------------------------------------------------------------------------------
17) Fan Profile & Dashboard
Fan Spec — Profile + Dashboard + Streaming (Full)
Purpose Give fans a clean place to stream, collect, and support: library, playlists/queue, tickets/VOD, courses, memberships, crowdfunding, credits, and settings. Public profile is shareable with strong privacy.
Public Fan Profile (/u/[handle])
• Header: avatar, banner, display name, @handle, bio, links, badges (privacy-aware).
• Stats: followers, following, public playlists count.
• CTAs: Follow, Message (optional; privacy-gated).
• Tabs:
    1. Playlists (public; collaborative badge; follower counts)
    2. Follows (creators they follow)
    3. Activity (likes/reposts/comments; fully privacy-toggleable)
    4. About (bio, links, badges)
• Privacy: per-tab visibility (Public / Followers-only / Private).
• Share: profile URL; social cards.
Private Fan Dashboard (/me/*)
1. Overview: credits balance, recent purchases, upcoming live, memberships, course progress, For You row (recs), recent follows.
2. Library: purchases (releases, beats, packs) with downloads, license PDFs, receipts; filters, search.
3. Playlists & Collections: create/edit, drag-reorder, public/private, collaborative (v1.1), followable (v1.1); editorial submission.
4. Live & Tickets: upcoming (join, ICS add-to-calendar), reminders (24h/1h), past sessions (VOD if available).
5. Courses (Learning): enrolled courses, progress, resume, certificates (if any).
6. Memberships: active tiers, perks access (gated posts/downloads), billing (cancel/pause).
7. Crowdfunding: backed campaigns; rewards status; updates.
8. Feed & Follows: new drops from followed creators; per-creator notification prefs (all/only live/none).
9. Messages/Inbox (v2): creator messages (announcements/support); block/mute/report; read-receipts toggle.
10. Wallet & Orders: credits balance, add credits, ledger (earn/spend, clawbacks), gift codes; orders & receipts; refunds status; referrals (v2).
11. Profile & Settings: profile info, handle, links, privacy per tab, notifications (email/push), security (2FA, sessions), data export/delete (GDPR).
12. Fan Clubs (v2): joined clubs, creator-private feeds, leave/renew.
Streaming & Playlists
• Global player (MVP): persistent mini-player + expanded; queue; play/pause/seek; “play next”/“add to queue”.
• Access: full streams for items streamable or owned; 30–60s previews for gated items; beats can preview watermarked.
• Playlists: create/edit; add from anywhere; reorder; privacy; share links.
• v1.1: collaborative & followable playlists; editorial submission; basic radio from track/artist/genre.
• v2: shuffle/repeat, crossfade/gapless, loudness normalization, quality selector; recommendations; offline for purchased (encrypted cache).
Acceptance: audio persists across route changes; purchased items stream full; previews for others; signed URLs for media; play events tracked for charts.
Credits & Checkout (fan surfaces)
• Credits wallet: buy/earn; never expire; max % per cart default 50% (configurable); ledger reasons (earn/spend/refund).
• Earn sources: cashback, quests, streaks, referrals, promotions, membership stipends.
• Refunds/chargebacks: restore spent credits; claw back earn credits; negative balance flagged and auto-recovered on next earn.
• Checkout: clear line items (subtotal, credits, tax, total).
Gamification (fan surfaces)
• Header: XP bar + level chip.
• /me: Quests panel; Streaks indicator; Badges shelf; Leaderboards module; Per-creator Top Fans on Creator Pages (privacy opt-out respected).
• Rewards to credits/XP match rules below.
Data model (fan)
• User/Audience: profiles, follows, likes, user_settings
• Library & Orders: orders, order_items, receipts, downloads, licenses
• Playlists: playlists, playlist_items, playlist_collaborators
• Live: live_tickets, recordings
• Courses: enrollments
• Memberships: membership_tiers, memberships, gated_posts
• Crowdfunding: campaigns, campaign_supporters
• Wallet: credits_ledger (+ credit_rules)
• Referrals: referral_links, referral_conversions
• Moderation: reports
Acceptance (high level)
• Purchases → instant Library + license PDF + receipt.
• Live: ticket holders only; reminders sent; VOD appears when enabled.
• Courses: progress persists; enrollments gate access.
• Memberships: gating + Discord role sync enforced.
• Wallet & Orders: ledger atomic; receipts exportable; refunds consistent.
• Playlists: drag/reorder persists; sharing honors privacy; collab permissions enforced.
• Privacy & Safety: per-tab visibility; block/mute/report works.
• A11y & Perf: keyboard nav; infinite/paged lists are smooth.
Phasing
• MVP: Auth, Library, Playlists (basic), Global player, Live tickets + reminders + ICS, Orders & Wallet (credits), Settings/Privacy, public Profile, Feed of followed.
• v1.1: Collaborative/followable playlists, editorial submissions, VOD, Course enrollments, Crowdfunding backed view, Gamification panel (basic), Recommendations row.
• v2: Inbox/DMs, Fan Clubs, Meet & Greets, Advanced streaming features, Offline for purchased, Referrals view.
• Public profile /u/[handle]: avatar/banner, bio, stats, tabs (Playlists, Follows, Activity—privacy-gated, About). (P1, MVP)
• Private dashboard /me: Overview, Library (purchases/downloads/licenses/receipts), Playlists, Live & Tickets (with VOD), Courses (progress), Memberships, Crowdfunding, Feed & Follows, Wallet & Orders (credits), Settings/Privacy. (P0, MVP→v1.1)
--------------------------------------------------------------------------------
18) Admin & Moderation (EPIC)
• Overview KPIs; charts/deltas. (P1, v1.1)
• Moderation queue (flagged content); Approve/Reject/Hide/Ban. (P1, v1.1)
• Contests manager; Live scheduler; Courses review; Campaigns (crowdfunding). (P2, v1.1)
• Members & roles; Forum admin; Announcements/Prompts/Quests/Badges; Events calendar. (P2, v1.1)
• Analytics series panel; Finance (campaign payouts); Support inbox (tickets); Feature flags; Settings; Audit log; Command bar ⌘K. (P2, v1.1)
--------------------------------------------------------------------------------
19) Trust, Safety & Legal
• Content pages: Licensing 101, Dispute Resolution, Content ID Guide, Creator Bill of Rights. (P0, MVP)
• Reporting/DMCA; moderation tooling; strike system. (P0, MVP)
• Fees disclosure; Privacy/Terms/Cookie consent/GDPR. (P0, MVP)
• KYC/AML, VAT MOSS, age gating/explicit tags; Content ID dispute helper. (P1, v1.1→v2)
--------------------------------------------------------------------------------
20) Data, Infra & System
• Supabase schema: profiles, releases, beats, license_tiers, packs, bundles, genres, collaborations, live_sessions, orders, order_items, credits_ledger, coupons, payouts, placements, messages, tasks, courses, lessons, enrollments, memberships, membership_tiers, gated_posts, campaigns, social_accounts, oauth_tokens, social_posts, post_targets, shortlinks, social_metrics, inbox_messages, playlists, playlist_items, playlist_collaborators, follows. (P0, MVP→v1.1)
• Views/RPC: trending, genre_popularity_last_30d, earnings_daily, view_hub_threads, fn_hub_payload, etc. (P1, MVP→v1.1)
• Storage: cover art, previews, masters, stems, pack zips, course assets, recordings. (P0, MVP)
• Audio previews pipeline: process masters → preview clips; watermarks for beats. (P0, MVP)
• System NFRs: SEO/OG/schema.org (MusicRecording/Product), sitemaps; performance (image opt, SSR/ISR, caching/CDN); accessibility (focus/ARIA/contrast); i18n (currency/locale); observability (logs, error monitoring, analytics). (P0, MVP)
• Resilience: environment fallbacks (no env → placeholders), “retry on error” patterns; parallel data-load on homepage; sticky action dock offsets. (P1, MVP→v1.1)
--------------------------------------------------------------------------------
21) APIs, Embeds & Integrations
• Embeddable player / store + oEmbed; public read-only API for catalogs/playlists. (P2, v1.1→v2)
• Plug-ins provider adapters with rate limits & webhooks; link-in-bio builder. (P1, v1.1)
--------------------------------------------------------------------------------
22) Mobile
• iOS/Android: streaming, purchases, library, playlists; offline for purchased items; background audio; push for releases/live. (P3, v2)
--------------------------------------------------------------------------------
Key Acceptance (cross-cutting)
• All lists: search/sort/filter + empty & error states + retry.
• Drafts autosave; publish confirms destructive effects (e.g., locking splits).
• Signed URLs for downloads; purchase gates respected everywhere.
• Webhooks/queues idempotent; analytics totals reconcile to orders/payouts; timezone-safe.
• A11y: keyboard nav, readable focus states, ARIA labels; motion reduced if OS prefers.
--------------------------------------------------------------------------------
System Flow (text diagram) [v2: 50, 51, 52] (This is a new, high-level diagrammatic detail added from Source v2, providing a clear visual overview of user journeys and system interactions not present in Source v1.)
[Visitor] [v2: 50] │ [v2: 50] ├─▶ 1) Homepage (Hero + Tabs + Rails) ──▶ 1.2 Search/Explore [v2: 50] │ │ [v2: 50] │ ├─▶ Creator Page (public storefront) [v2: 50] │ │ │ [v2: 51] │ │ ├─▶ Store: Releases/Beats/Packs/Merch ─▶ Cart/Checkout ─▶ Orders [v2: 51] │ │ ├─▶ Live Sessions ─▶ Tickets/Reminders ─▶ Room ─▶ VOD [v2: 51] │ │ ├─▶ Courses ─▶ Enrollments/Progress [v2: 51] │ │ ├─▶ Memberships ─▶ Gated Posts/Discord Sync [v2: 51] │ │ └─▶ Collab Briefs ─▶ Apply/Messaging [v2: 51] │ │ [v2: 51] │ └─▶ Community Hub ─▶ Contests/Forum/Radio/Prompts/Calendar/Quests [v2: 51] │ [v2: 51] [Fan Auth] ─▶ /me (Library, Playlists, Live & Tickets, Courses, Memberships, Crowdfunding, Wallet & Orders, Settings) [v2: 51] │ │ [v2: 51] │ └─▶ Global Player / Queue / Radio [v2: 51] │ [v2: 51] [Creator Auth] ─▶ Studio (Dashboard, Catalog, Plug-ins, Live, Courses, Memberships, Crowdfunding, Collabs, [v2: 51] │ Analytics, CRM, Storefront, Financials, Settings, Distribution v2) [v2: 52] │ ├─▶ Publish → Creator Page & Marketplace [v2: 52] │ ├─▶ Plug-ins Scheduler → Social posts (UTM/Shortlink) → ROI to Sales/Plays [v2: 52] │ └─▶ Splits/Payouts/Statements [v2: 52] │ [v2: 52] [Admin] ─▶ Admin Dashboard (Moderation, Reviews, Scheduling, Finance, Support, Feature Flags, Audit) [v2: 52]
--------------------------------------------------------------------------------
MVP → v1.1 → v2 (by priority)
(This phasing summary from Source v1 is more detailed with priority levels and specific feature inclusions than Source v2's "Phasing (roll-up).")
MVP (P0–P1 core)
• Discovery: hero, role toggle, search tabs, dynamic rail, genres; Active Collabs, Upcoming Live; FAQ, footer, sticky header.
• Streaming & Playlists (basic), Global player, library & purchases, cart/checkout, credits wallet, coupons, refunds.
• Products: Releases, Beats (tiers/watermark/stems), Sound packs (basic delivery).
• Splits & payouts; audio previews pipeline.
• Studio: Dashboard, Catalog, Live (tickets/reminders), Collaborations (basic), Financials, Settings, Storefront basics.
• Fan profile/dashboard (Library, Playlists, Live tickets, Wallet & Orders, Settings).
• Trust & Safety pages, DMCA/reporting, policies.
• Data/Infra foundations + views/RPC for trending.
v1.1 (P1–P2 growth)
• Plug-ins (connect, composer, scheduler, smart links, basic metrics/attribution).
• Courses (builder + marketplace); Crowdfunding; CRM (segments/exports).
• Playlists: collaborative/followable; editorial submission; Charts/Radio (basic).
• Studio Preview, Placements, Why/How polish, navigation prefetch, “retry on error” patterns.
• Admin workspace (moderation, contests, live scheduler, courses review, campaigns, announcements/prompts/quests/badges, events calendar, feature flags).
• Badges (first set), Quests (daily/weekly), Leaderboards (global & per-creator top fans).
• Release pre-orders, name-your-price, gifts; Sound pack versioning; bundles; download codes.
v2 (P2–P3 scale & moats)
• Plug-ins Inbox & advanced analytics; Memberships; Short-form clips/remix; Distribution hub; Rights/ID tools.
• Advanced streaming (crossfade/gapless, normalization, quality selector) + recommendations.
• Fan clubs; Meet & Greets; Merch store; NFTs/collectibles (if desired).
• Mobile apps; curator program with payouts; advanced admin analytics and finance.
--------------------------------------------------------------------------------
Implementation pointers (dev-ready)
• Routing: /search, /beats/[id], /releases/[id], /live/[id], /collab/[id], /u/[handle], /studio/*, /course/[id], /campaign/[id].
• Player state: single global store (queue, item, position, source).
• Attribution: all outbound Plug-ins posts use short links with UTM; orders and plays join on utm_medium/source/campaign + shortlink_id.
• Security: RLS on Supabase; role-based access in Studio; signed download URLs; webhook HMAC.
• Compliance: KYC via Stripe Connect; VAT MOSS; cookie consent; age flag; explicit lyrics flag.

