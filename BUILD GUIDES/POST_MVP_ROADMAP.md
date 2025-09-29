# Post-MVP Delivery Roadmap (Updated)

## Beyond MVP — current state

- **Ready with light polish**
  - SEO meta system: `SEOHelmet`, `CreatorSEO`, `setMeta` live; remaining gaps are dynamic OG image generation plus consistent per-route usage.
  - Orders History: DB and Admin views exist; add user page (`/account/orders`) and link from purchases.
  - Search UX: Full page exists with sectioned results/filters; add debounce, keyboard navigation, and 0-results components.
  - Observability: `system_logs` + `user_properties` tables and client libs exist; add emit points on key events.

- **Partially implemented (infrastructure present)**
  - Email/receipts: Edge `send-lifecycle-emails` and templates under `src/templates/email/*` exist; connect to invite, order receipt, tip receipt events.
  - Membership tiers: `EnhancedMembershipsModule` renders tier CRUD with mock data; hook it to `membership_tiers`/`memberships`, Stripe products, and Label Studio navigation.
  - Content gating: `SubscriptionGatedContent` wrapper and release gating exist; align gating controls with membership tiers and content editors.
  - Discord sync UI: Creator Studio navigation exposes the Discord panel; wire it to membership role sync RPCs and error states.
  - Playlists: Hooks/components exist for private playlists; extend to public/sharing later.
  - Mobile responsiveness: Layouts mostly responsive; run pass for 360–428px, rails scroll, and tap targets.
  - Label invites: RPCs + roster UI + pending list are shipped; remaining work is automated email dispatch, acceptance toasts, and audit coverage.

- **Scaffolded/prototypes (v2+ candidates with head start)**
  - Live/Sessions: Routes/components plus basic functions; add schedule list and “now playing” tile.
  - Battles/Contests: Functions like `advance-battle-rounds` and reminder sender exist; productize UI flows.
  - Messaging/Inbox: `UnifiedInbox`, `MessagingCenter` and fetchers (`inbox-fetch-*`) exist; wire auth, pagination, and composer.
  - Wallet/Credits: Multiple functions (`create-credits-checkout`, `cash-out-credits`, etc.) and pages (`Wallet.tsx`, `WalletActivity`) exist; finalize ledgers, RLS, and legal copy.
  - Courses: Viewer and `create-course-payment` exist; define catalog, access control, and completion.

- **Not started or minimal**
  - Feed from follows: No cohesive feed rail; build query + rail on Home/Profile.
  - Reporting/Blocking: Add DB tables + RPCs, RLS, and Admin review queue.
  - Notifications: DB table exists; add notification prefs and in-app delivery wiring (keep toasts-only for now).
  - i18n: No framework; defer.

## Suggested post-MVP sequence (short)

1. SEO/OG rollout + sitemap, then Orders History page  
2. Email receipts/invites/tips wired to events  
3. Search UX polish + Mobile pass  
4. Logs coverage on key flows  
5. Label invites email dispatch + audits  
6. Release downloads via signed URLs after purchase

---

## Delivery plan to finish app to spec

### Milestones and timeline (suggested)
- **Milestone A (Week 1–2)**: Revenue flows E2E, membership tier CRUD wiring, access gating QA, logs
- **Milestone B (Week 3–4)**: Orders history, SEO/OG+sitemap, Search polish, Mobile pass
- **Milestone C (Week 5–6)**: Fan subscription checkout, content gating fan experience, label invite email dispatch+audits, downloads (signed URLs), email receipts
- **Milestone D (Week 7–8)**: Reporting/Blocking, Notifications (in-app), Admin coverage, Performance+Accessibility
- **Milestone E (Week 9–10)**: V2 features: Playlists public/sharing, Feed from follows, Inbox, Credits/Wallet, Live schedule tile, Courses catalog

### Workstreams and concrete tasks

#### 1) Commerce: Checkout, Orders, Tips (blockers first)
- Checkout E2E
  - Edit `supabase/functions/enhanced-store-checkout/index.ts`:
    - Add `metadata.type = 'store_purchase'`
    - Persist `payment_id: session.id` in `orders` or update webhook to match `stripe_session_id`.
  - Edit `supabase/functions/stripe-webhook/index.ts`:
    - For `store_purchase`: match on `payment_id` or `stripe_session_id`; set `orders.status = 'completed'`, set `paid_at`, sanity-check totals.
    - Emit to `system_logs`.
  - Create `src/pages/StoreSuccess.tsx` and route; show order by `session_id`.
  - Client UX: toasts on create/fail; redirect back with `?session_id=...`.
- Tips finalization
  - `stripe-webhook`: add handler for `metadata.type === 'artist_tip'` to mark `artist_tips.status = 'succeeded'`, set amounts/receipt id; log event.
  - UI: success banner already read via `?tip_sent=true`.
- Orders model hygiene
  - Align statuses to a single vocabulary: `pending` → `completed`/`failed`; add `paid_at`.
  - Add indexes on `orders.user_id`, `orders.payment_id`, `order_items.order_id`.

**Acceptance**: New order completes via Stripe → `orders.status = 'completed'`, items written, `/store/success` renders summary.

#### 2) Secure access and downloads
- Secure downloads
  - Use existing `SecureDownloadButton` within `ReleaseDetail` when `hasPurchased` is true; surface signed download CTA.
  - Ensure `download-signed-url` validates ownership and returns short-lived links; handle failure toasts.
  - Add regression tests/manual checklist for download expiry and repeat requests.
- Access QA
  - Run pass to confirm `verify-release-access` gating is enforced across carousel/detail; log metrics on access denials for analytics.

**Acceptance**: Non-owners only get preview; purchased users see “Download” leveraging signed URLs and successful fetch.

#### 3) Orders history (user-facing)
- Page `src/pages/AccountOrders.tsx`: table of orders and `order_items` with totals/status; links to receipts/downloads.
- Add nav entry from profile/settings.

**Acceptance**: Authenticated user sees past orders with correct totals; can open receipt and download items they own.

#### 4) Membership tiers & fan subscriptions
- Creator Studio grounding
  - Replace mock data in `EnhancedMembershipsModule` with `membership_tiers`/`memberships` queries via a `useMembershipTiers` hook.
  - Persist create/update/delete via Supabase RPCs; create Stripe products/prices and store IDs for billing.
  - Surface tier stats using real metrics (or hide cards until data lands) and refresh after mutations.
- Fan experience
  - Update `MembershipWidget`, label pages, and profile CTAs to pull live tier data and expose subscribe/cancel actions.
  - Ensure checkout flow reuses existing Stripe helpers; record memberships in DB and sync status on webhook.
- Discord integration
  - Implement the Discord tab in Creator Studio to display connection state, manual sync, and error handling.
  - Use `membership_discord_tokens` and related functions to gate role granting/revocation.

**Acceptance**: Creators can create/edit tiers that persist in Supabase/Stripe; fans can subscribe/cancel; Discord roles sync based on membership status.

#### 5) Content gating integration
- Creator tools
  - Add gating controls to releases, beats, and membership posts referencing `membership_access_rules`; surface them in Catalog/Studio editors.
  - Provide preview mode via `SubscriptionGatedContent` so creators see locked states before publishing.
- Fan experience
  - Detect gated content across feeds/label pages and display blurred previews with tier call-to-actions.
  - Respect membership status when resolving audio/download access and unlock immediately after purchase.
- Analytics
  - Log gate impressions/unlocks via `system_logs` or membership metrics tables for future insights.

**Acceptance**: Creators assign tiers per asset; fans see accurate paywalls; unlocking content updates instantly after membership status changes.

#### 6) Labels / Teams invites (polish)
- Email dispatch — ✅ wired through `send-lifecycle-emails` so new + resent invites deliver magic-link mailers.
- Acceptance UX
  - Surface success toasts/banners when an invite is accepted; ensure roster refresh.
  - Track acceptance events in `system_logs` for audit and attach invite metadata.
- RLS + audit
  - Review invite-related RLS policies and add coverage for service-role email sender.
- Acceptance UX
  - Surface success toasts/banners when an invite is accepted; ensure roster refresh.
  - Track acceptance events in `system_logs` for audit and attach invite metadata.
- RLS + audit
  - Review invite-related RLS policies and add coverage for service-role email sender.

**Acceptance**: Owner sends invite → email delivered; recipient accepts via link and sees confirmation; roster + logs updated automatically.

#### 7) SEO/OG and Sitemap
- Apply `SEOHelmet` consistently on: `ReleaseDetail`, `BeatDetail`, `Profile/Artist`, `Label` (in progress — Store/Index pending).
- OG images
  - Add an OG image generator (edge route or serverless) that renders cover/artist; wire `og:image` per page.
- Sitemap
  - Use/extend `supabase/functions/generate-sitemap/` (and `sitemap-router/`) to publish URLs for releases, beats, profiles, labels.

**Acceptance**: Pages render correct meta; social share previews show custom OG images; `sitemap.xml` includes public entities.

#### 8) Search polish
- `src/pages/SearchPage.tsx`:
  - Add input debounce (300ms), keyboard navigation for results, explicit 0-results affordances per tab.
  - Persist filters in URL; ensure “clear filters” resets queries.
- Optional: server-side search RPC for ranking/unified index.

**Acceptance**: Typing is debounced; arrow keys move focus; empty states communicate options; deep links preserve filters.

#### 9) Notifications and Reporting (minimal MVP)
- Reporting/Blocking
  - DB: tables `content_reports`, `user_blocks`; RLS; RPCs `report_content`, `block_user`.
  - UI: report buttons on `ReleaseDetail`, `BeatDetail`, `Profile`; admin queue in `Admin.tsx`.
- Notifications (in-app only)
  - `notifications` table exists; add `notification_prefs`.
  - Add `NotificationBell` polling and light `NotificationCenter` detail panel (already scaffolded).
  - Create on: invite sent/accepted, order completed, tip succeeded, follow.

**Acceptance**: Users can report content; admins can review; in-app notification count and list update on key events.

#### 10) Observability and analytics
- `src/lib/logger.ts`: call on key flows (release publish, checkout create/success/error, tip success, invite send/accept, follow, report).
- `user_properties` via `useAnalytics`:
  - Update on purchases, follows, plays, tips; record simple traits (genres of interest).
- Dashboards (optional): simple admin view for `system_logs` WARN+.

**Acceptance**: Logs appear for all critical flows; user properties rows change on actions.

#### 11) Mobile, Performance, Accessibility
- Mobile
  - Audit key pages/components at 360–428px: carousels drag, tap targets ≥44px, nav overflow, player controls.
- Performance
  - Code-split heavy pages (`CreatorStudio`, `Community`), defer non-critical scripts, optimize images (sizes/srcset), limit large queries.
- Accessibility
  - Focus states, skip links, ARIA on players/forms, color contrast 4.5:1, keyboard traps fixed.

**Acceptance**: Lighthouse mobile ≥80; a11y top issues resolved; no layout shifts on key routes.

#### 12) Admin console coverage
- Ensure orders, tips, reports, labels governance (transfer/delete) visible and actionable.
- Protect with RLS and admin role checks.

**Acceptance**: Admin can view and adjust essential entities; actions audited via `system_logs`.

#### 13) V2 features to spec

- Playlists (public/sharing)
  - Extend current private CRUD (`usePlaylist.tsx`) with public visibility, share links, and embeddable view.
  - RLS: public read, owner write; invite collaborator (optional).
- Feed from follows
  - Build “From creators you follow” rail (releases, beats, announcements) on `Index` and `Profile`.
  - Query followed creator IDs + recent content.
- Messaging/Inbox
  - Wire `UnifiedInbox` to backend fetchers (`inbox-fetch-*`), add composer (DB or provider integrations), paginate, basic read/unread.
- Credits/Wallet
  - Finalize ledger RLS and summaries; wire `create-credits-checkout` to UI (`CreditsPurchase.tsx`); receipts and balance updates.
  - Cash-out and payouts flows gated behind KYC (if applicable).
- Live/Sessions
  - Now-playing tile on Home; sessions list; join CTA; playback/embed stubs.
- Courses
  - Catalog page, detail page, access gate; hook existing `create-course-payment`.

**Acceptance (per feature)**: Public playlist share URL works; feed rail shows recent followed content; inbox sends/receives with auth; credits purchase updates wallet; live tile shows current; courses purchase unlocks lessons.

### Data, security, and ops

- RLS audit
  - Tables: `orders`, `order_items`, `artist_tips`, `playlists`, `playlist_items`, `notifications`, `content_reports`, `label_invitations`, `system_logs`, `user_properties`.
  - Ensure all writes use service role where needed; reads scoped to owner or public.
- Migrations
  - Add `orders.paid_at`; unify status enum; add missing indexes; add `notifications`, `content_reports`, `user_blocks` schemas.
- Secrets/env
  - Stripe keys, webhook secret, mail provider keys, OG generator secrets, Supabase service key (edge only).
- Webhooks
  - Register `stripe-webhook` endpoint in Stripe dashboard (test + prod), verify signature.

### Test plan (high level)

- Payments: single-item, mixed cart, tip; success and cancel; webhook reliability (replay).
- Access: pre- and post-purchase download gating; signed download validity and expiry.
- Invites: send, accept (new+existing user), expire, resend, cancel; role checks.
- Search: debounce, keyboard nav, empty states, filters persist.
- SEO: meta/OG tags across pages; sitemap contains public entities.
- Mobile: tap targets, rails scroll, players.
- RLS: ensure users cannot access others’ orders/tips; logs not publicly readable; admin-only reads.

### Ticket seed (files to touch)

- `supabase/functions/enhanced-store-checkout/index.ts`: add `metadata.type`, set `payment_id`
- `supabase/functions/stripe-webhook/index.ts`: add `artist_tip` branch; support `stripe_session_id` fallback; emit logs
- `src/pages/StoreSuccess.tsx`: new page; route in `App.tsx`
- `src/pages/AccountOrders.tsx`: new page; link from profile/settings
- `src/pages/ReleaseDetail.tsx`: surface secure download CTA when purchased
- `src/components/LabelStudio/LabelRosterModule.tsx`: wire email dispatch triggers/resend toasts
- `src/components/SEOHelmet.tsx` usages added to key pages; OG generator integration
- `src/pages/SearchPage.tsx`: debounce, keyboard nav, 0-results components
- `src/components/CreatorStudio/modules/EnhancedMembershipsModule.tsx`: swap mock data for Supabase/Stripe calls
- `src/hooks/useMembershipTiers.ts`: new hook for tier CRUD and caching
- `src/components/SubscriptionGatedContent.tsx` & associated editors: tier-aware gating previews and unlock states
- `src/pages/Auth.tsx`: add account-type selection and label onboarding
- New DB migrations: statuses, indexes, notifications, reporting, blocks
- Logging calls in: `ReleaseBuilder`, checkout/tip flows, invite flows, follow actions
