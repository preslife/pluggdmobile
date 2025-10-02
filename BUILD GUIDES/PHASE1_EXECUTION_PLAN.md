# Phase 1 Execution Plan — Fan Commerce & Playback MVP

## Objectives
- Deliver the `/me` Library experience with real purchases, downloads, and receipts so fans can retrieve the content they own immediately after checkout, aligning with the master spec requirements for the private dashboard library surface.【F:BUILD GUIDES/PLUGGD_MASTER_FEATURESPEC.MD†L323-L349】
- Harden wallet and checkout flows so credits, card payments, and fulfillment stay in sync with orders and receipts, meeting the credit/checkout acceptance criteria in the fan specification.【F:BUILD GUIDES/PLUGGD_MASTER_FEATURESPEC.MD†L348-L356】
- Ensure the global audio player and download infrastructure respect ownership and gating rules, enabling full playback for owned items and secure delivery for downloads as defined in the streaming acceptance standards.【F:BUILD GUIDES/PLUGGD_MASTER_FEATURESPEC.MD†L339-L346】

## Workstream A — Library & Delivery
1. **Data Plumbing & Contracts**
   - Audit Supabase tables (`purchases`, `release_purchases`, `sample_pack_purchases`, `download_events`, `receipts`, `licenses`) to confirm columns exposed via RLS for fan access.
   - Create a dedicated library service (`src/services/library`) that aggregates purchases by type, normalizes metadata (title, artwork, preview/full URLs, license links), and merges receipt/license references.
   - Add typed responses and caching primitives (React Query or custom hook) to keep the library view responsive when switching tabs.

2. **UI Integration**
   - Replace placeholder library UI with a tabbed experience: `All`, `Beats`, `Releases`, `Sample Packs`, `Memberships`, `Courses` (the last two can display informative empty states until data sources land).
   - Embed the download tracker, license viewer, and receipt list within the `All` view; expose filters (search, type, purchase date, creator) and a quick action to jump to detailed order history.
   - Surface contextual CTAs based on ownership (e.g., "Request more downloads" only when limit exceeded, "View license" when available).

3. **Receipts & Licenses**
   - Wire the existing `generate-receipt` edge function to the library view, caching the latest receipt status and allowing PDF regeneration.
   - Expose license documents (PDF or HTML) alongside each purchase, with support contact if the artifact is missing or expired.
   - Implement download limit warnings and support escalation (ticket/email trigger) from the library when fans exhaust downloads.

4. **Quality Gates**
   - Loading states for fetches, optimistic UI for download count updates, and error toasts tied into the global notification pattern.
   - Accessibility audit (keyboard navigation, focus states, semantic headings) across the library components.
   - Analytics events: `library_viewed`, `library_download_started`, `library_receipt_viewed`, `library_license_opened`.

## Workstream B — Wallet & Checkout Reliability
1. **Credits Ledger Enforcement**
   - Reconcile credit spend flows in `creditSystem` with Supabase ledgers, ensuring every spend has a mirrored earn/refund entry when reversed.
   - Add invariants/tests for the wallet helper to catch negative balances or credit over-application.

2. **Checkout Modal Hardening**
   - Unify release, beat, sample pack, and membership purchases through a single checkout modal path that calculates line items (subtotal, credits, tax, total) before invoking edge functions.
   - Introduce post-payment reconciliation: poll webhook/edge function statuses, update purchase records, and surface receipt download links immediately after success.

3. **Order History & Receipts**
   - Extend the `/wallet` or `/orders` route to list combined purchases with links back to the library; tie into the same receipt/license data source built in Workstream A.
   - Provide refund status indicators and helpful actions (contact support, view policy) in alignment with spec expectations.

4. **Testing & Monitoring**
   - Integration tests for credits application logic (Jest + Supabase test harness) and Cypress happy-path purchase flows.
   - Observability: log purchase/receipt failures with correlation IDs, and add Supabase function metrics dashboards.

## Workstream C — Playback & Fulfillment
1. **Ownership-aware Playback**
   - Extend the global player context to differentiate between owned, preview, and locked tracks; unlock full streaming when library data confirms ownership.
   - Add gating badges and messages in the queue for locked content, encouraging purchase or membership upgrade.

2. **Download & Streaming Security**
   - Update the `download-signed-url` function to enforce SKU-specific expiration rules (e.g., 72 hours for releases, 7 days for packs) and rotate signatures on each request.
   - Track download attempts, surfacing warnings when limits are approached, and allow creators/admins to grant additional downloads via Supabase triggers.

3. **Player & Library Bridge**
   - Provide "Play in Queue" and "Add to Playlist" actions from each library item, reusing the global player queue management.
   - Ensure license and receipt access remains available while playback is active (non-blocking overlays or modals).

4. **QA & Acceptance**
   - Regression test playback persistence across navigation, verifying purchased items stream fully and previews truncate correctly.
   - Confirm that downloads increment counters, receipts render, and credit balances update in real time after purchases.

## Sequencing & Milestones
1. **Sprint 1 (Week 1)**
   - Finish data audit, create library service + hook, integrate DownloadTracker with normalized data, and add loading/error states.
   - Ship initial library UI with `All` tab and aggregated purchases.

2. **Sprint 2 (Week 2)**
   - Harden checkout modal with unified flow, connect receipts/licenses to the library, and expose order history ties.
   - Implement analytics instrumentation and add integration tests for credits + purchase flows.

3. **Sprint 3 (Week 3)**
   - Expand playback gating, finalize download security rules, polish UI/UX (filters, search, support actions), and close QA gap.
   - Prepare documentation for support and creator enablement (FAQ, troubleshooting steps).

## Dependencies & Risks
- **Supabase Policies:** Ensure RLS policies permit fans to access their own purchases, download events, and receipts without exposing other users' data.
- **Stripe Webhooks:** Verify existing webhook handlers emit consistent events so checkout reconciliation remains accurate.
- **Asset Storage:** Confirm assets referenced in purchases (audio files, license PDFs) exist in storage buckets with correct ACLs; add migration scripts if needed.

## Definition of Done
- Fans can view every owned item, stream it in full, download within limits, and retrieve receipts/licenses without contacting support.
- Credits and card purchases both land in the same order ledger, with balances updating instantly and no orphaned transactions.
- Monitoring dashboards and analytics show successful purchase-to-delivery funnels, and QA sign-off confirms parity with the master spec for Phase 1 scope.
