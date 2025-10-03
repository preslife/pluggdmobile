# Post-MVP Remaining Tasks — Detailed Execution Plan

**Context**: Phases 4/Stage 4 delivered public API, webhooks, integrations, and PWA/notifications. The remaining scope covers revenue completion, memberships, gating, Studio hardening, and trust/safety. This plan expands the "Delivery plan to finish app to spec" roadmap into actionable work packets that can be picked up sequentially. Each packet lists prerequisites, implementation outline, QA/analytics needs, and cross-team dependencies.

---

## Milestone A (Weeks 1–2) — Revenue & Access Foundations

### A1. Store Checkout Finalisation
- **Prereqs**: Stripe secrets loaded; `orders`, `order_items`, `artist_tips` schemas verified; webhook endpoint live.
- **Implementation Steps**:
  1. Extend `supabase/functions/enhanced-store-checkout/index.ts`
     - Set `metadata.type = 'store_purchase'` and include `user_id`, `cart_item_ids` for reconciliation.
     - Persist a provisional `payment_id = session.id` when creating the checkout session.
     - Return checkout URL + session ID to client for redirect + success routing.
  2. Update `supabase/functions/stripe-webhook/index.ts`
     - On `checkout.session.completed` with matching metadata, locate order by `payment_id`.
     - Mark `orders.status = 'completed'`, populate `paid_at`, `payment_provider = 'stripe'`.
     - Insert/confirm `order_items` and ensure license tiers align with selected products.
     - Emit structured log to `system_logs`.
  3. Frontend: add `/store/success` route that reads `session_id` query param, fetches order summary, and handles failure states.
  4. Add toast/redirect handling inside cart/checkout hooks when Stripe session creation fails or completes.
- **QA / Analytics**:
  - Manual purchase flow against Stripe test keys.
  - Verify `orders`, `order_items`, `system_logs` rows.
  - Add log-based dashboard panel for purchase funnel.
- **Dependencies**: Confirm webhook secret in Supabase project; align with any existing checkout flows (beats/releases) to avoid regressions.

### A2. Artist Tip Settlement
- **Implementation Steps**:
  1. Within `stripe-webhook`, add branch for `metadata.type === 'artist_tip'` that updates `artist_tips` with `status='succeeded'`, `paid_at`, `stripe_payment_intent_id`.
  2. Trigger `send-lifecycle-emails` for fan/creator receipts (reuse templating system).
  3. Ensure tipping UI observes status field to show success banner.
- **QA**: Simulate tipping session; confirm email dispatch in logs; verify RLS prevents other users from reading tips.

### A3. Secure Downloads via Signed URLs
- **Implementation Steps**:
  1. Audit `download-signed-url` edge function to ensure it checks ownership via `orders`/`order_items`.
  2. Update `ReleaseDetail` (and relevant beat/sample pack components) to render `SecureDownloadButton` when `hasPurchased`.
  3. Handle expiration errors with retry + toast fallback; log denials to `system_logs`.
- **QA**: Attempt download as non-owner, owner (fresh + expired link), and after refund.

### A4. Orders Data Hygiene
- **Implementation Steps**:
  1. Align `orders.status` enumerations (add migration if needed); set defaults for new rows.
  2. Add DB indexes on `orders.user_id`, `orders.payment_id`, `order_items.order_id`.
  3. Backfill existing rows with consistent status + `paid_at` where possible.
- **Dependencies**: Migration order with Stripe webhook changes to avoid race conditions.

---

## Milestone B (Weeks 3–4) — Account Surfaces & SEO

### B1. Orders History Page
- **Frontend**:
  - Create `src/pages/AccountOrders.tsx` with tabs for purchases and tips.
  - Use existing hooks (`useOrders`, `useOrderItems`) or create new typed queries hitting Supabase view/RPC.
  - Provide receipt links (PDF/download), status chips, totals.
  - Link page from `/account` sidebar and purchase success flows.
- **Backend**:
  - Expose RPC `get_orders_for_user(p_user_id uuid)` that aggregates items and totals.
  - Ensure RLS + pagination support.
- **QA**: Fixtures for user with no orders, multiple orders, failed payments.

### B2. SEO & OG Coverage
- **Implementation Steps**:
  1. Build dynamic OG image generator (Edge function or `/api/og/*` route) supporting releases, beats, profiles, label pages.
  2. Audit page-level SEO Helmet usage; add `setMeta` invocations to missing routes.
  3. Generate XML sitemap via build-time script (`scripts/generate-sitemap.ts`) reading slug lists from Supabase.
  4. Add tests to ensure canonical URLs + social tags present.
- **Dependencies**: Ensure Supabase service role key available to sitemap script; coordinate with hosting pipeline.

### B3. Search UX Polish
- **Tasks**:
  - Add input debounce (250ms) and keyboard navigation to search results component.
  - Provide "no results" empty states for each section (beats, releases, creators).
  - Ensure filters persist via query params.
- **QA**: Cypress smoke for search interactions on desktop/mobile.

### B4. Mobile Responsiveness Pass
- **Scope**: Focus on 360–428px widths across landing, catalog, Studio modules, feed rails.
- **Steps**:
  - Use responsive testing checklist; adjust CSS variables, stack layout for rails.
  - Increase tap targets to 44px where missing.
  - Validate bottom sheets/drawers render without overflow.
- **QA**: Percy or manual screenshots across critical views; run Lighthouse mobile.

---

## Milestone C (Weeks 5–6) — Memberships & Fan Experience

### C1. Membership Tier CRUD Wiring
- **Backend**:
  - Create RPCs (`create_membership_tier`, `update_membership_tier`, `delete_membership_tier`) to encapsulate RLS checks.
  - Integrate Stripe product/price creation using service role server-side helper; persist Stripe IDs on tiers.
- **Frontend**:
  - Swap `EnhancedMembershipsModule` mock fetch with real hook hitting new RPCs.
  - Add optimistic updates and error states; refresh tier stats after mutations.
- **QA**: Unit tests for hook; integration test creating/updating/deleting tiers.

### C2. Fan Subscription Checkout & Lifecycle
- **Steps**:
  1. Extend checkout edge function to accept `membership_tier_id`; set metadata for webhook reconciliation.
  2. Webhook: map subscription events to `memberships` table; mark `status`, `current_period_end`, `cancel_at`.
  3. UI: Update `MembershipWidget` to show real tiers, handle subscribe/cancel buttons, and surface benefits copy.
- **QA**: Stripe subscription sandbox flows, including cancellation and renewal.

### C3. Discord Sync Panel
- **Implementation**:
  - Build Creator Studio Discord tab referencing tokens/status stored on `profiles`.
  - Add actions to initiate manual sync (`discord-sync-subscriber`), display last sync timestamp, and error messages.
  - Hook membership webhook to enqueue grant/revoke actions (reuse `membership_discord_tokens`).
- **QA**: Mock Discord API responses; confirm graceful failure when guild/role missing.

### C4. Content Gating Alignment
- **Steps**:
  - Extend content editors (releases, beats, posts) with gating selector referencing `membership_access_rules`.
  - Use `SubscriptionGatedContent` wrapper on feed/public pages to blur locked content.
  - Immediately unlock gated assets upon membership creation (listen to membership status changes).
- **Analytics**: Emit `gate_impression`, `gate_unlock` events.

---

## Milestone D (Weeks 7–8) — Trust, Safety, Notifications

### D1. Reporting & Blocking
- **Database**:
  - Add tables: `content_reports`, `user_blocks`, plus enums for reasons/status.
  - Define RLS so reporters and admins can view their entries; ensure blocked users can’t interact.
- **Edge Functions**:
  - `submit-report`, `review-report`, `block-user`, `unblock-user` with auditing.
- **UI**:
  - Report modals on posts/releases/beats/profiles; admin moderation queue in Studio/Admin.
- **QA**: Scenario walkthrough for reporting + admin resolution; confirm blocked interactions prevented client-side and via RLS.

### D2. Notifications v1 (In-App)
- **Backend**:
  - Expand existing `notifications` table with type enums, payload schema, read timestamps.
  - Implement edge function `broadcast-notification` used by events (orders, memberships, reports).
- **Frontend**:
  - Add notification dropdown/panel with pagination, mark-as-read, and preference toggles in settings.
  - Keep push notifications optional; rely on toasts + in-app feed for MVP.
- **QA**: Integration tests ensuring notifications appear for events triggered in QA scripts.

### D3. Observability Coverage
- **Tasks**:
  - Instrument key flows (checkout success/failure, membership changes, gating errors, report submissions) with `system_logs` and metrics tables.
  - Build LogRocket/Sentry dashboards or Supabase charts for quick triage.
- **QA**: Validate logs via staged test events.

---

## Milestone E (Weeks 9–10) — V2 Enhancements

### E1. Public Playlists & Sharing
- Extend existing playlist scaffolding to allow public toggle, slugged pages, and share links.
- Add collaborative permissions (owner + invited editors) with Supabase RLS updates.

### E2. Social Feed from Follows
- Build feed query that aggregates posts/tracks from followed creators; implement infinite scroll and fallback to trending.
- Surface follow CTA if feed empty; ensure caching for performance.

### E3. Unified Inbox Hardening
- Wire authentication, pagination, and message composer for Gmail/Discord; ensure token refresh flows are handled server-side.
- Add automated polling schedules via Supabase cron for each provider.

### E4. Credits & Wallet Completion
- Finalize ledger calculations (credits earned/spent); ensure checkout uses credits balance before Stripe charges.
- Implement cash-out flow with compliance checks and Connect payouts; include legal copy and receipt exports.

### E5. Live Sessions Enhancements
- Add schedule list with filtering, "Now Playing" tile, and reminders integration with notifications.

### E6. Courses Catalog & Completion Tracking
- Define course catalog page, lesson progression tracking, completion certificates, and tie purchases to gated course access.

---

## Cross-Cutting Workstreams

### X1. QA & Testing Strategy
- Introduce Playwright smoke suite for checkout, memberships, gating, reporting.
- Extend Cypress coverage where available; add Jest unit tests for new hooks and utilities.

### X2. Documentation & Support
- Update `/docs` with commerce, memberships, and moderation guides.
- Add support runbooks for finance reconciliation, membership disputes, and abuse handling.

### X3. Release Management
- Maintain feature flags (`RELEASE_DOWNLOADS_ENABLED`, `MEMBERSHIPS_ENABLED`, etc.) for safe rollout.
- Use build journal/backups before migrations; provide rollback steps per milestone.

### X4. Analytics & KPIs
- Define dashboards for GMV, conversion, membership churn, gated content unlock rate, report resolution time.
- Wire events to existing analytics warehouse (if available) or Supabase analytics tables.

---

## Dependency & Risk Matrix

| Area | Key Dependencies | Risks | Mitigations |
| --- | --- | --- | --- |
| Checkout | Stripe webhooks, orders schema | Race conditions between checkout + webhook | Use idempotency keys; add integration tests |
| Memberships | Stripe subscriptions, Discord API | API rate limits, token expiry | Queue retries, background sync cron |
| Gating | Accurate membership state | Stale cache causing lockouts | Subscribe to realtime channel; include grace period |
| Reporting | Moderation staffing | Abuse of report system | Rate limit submissions, add spam heuristics |
| Notifications | Browser permissions, push keys | Low opt-in, inconsistent delivery | Provide fallback email/toasts, track delivery metrics |
| Wallet | Compliance requirements | Regulatory/legal hurdles | Consult legal before launch; feature flag payouts |

---

## Next Steps Checklist
1. Confirm Stripe keys, Supabase config, and email templates readiness.
2. Stand up shared staging data for QA flows (sample orders, memberships, gated content).
3. Sequence migrations with transaction-safe scripts; capture snapshots pre/post deploy.
4. Kick off Milestone A implementation with dedicated branch and work tickets for A1–A4.
5. Schedule weekly review to adjust prioritisation as milestones progress.

