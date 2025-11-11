# Regression & QA Checklist (2025-10)

_Last updated: 2025-10-17_

## Dynamic OG Image Service
- [ ] Hit `https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/generate-og-image?title=Test&description=Example&type=release` and confirm PNG renders with correct badge and gradients.
- [ ] Share a release and confirm `<meta property="og:image">` points to the new function URL.
- [ ] Verify social debuggers (X, Facebook) render the updated preview.

## Creator Growth Analytics
- [ ] Load Creator Growth dashboard as a host; verify `creator_growth_profile_fetch_start/success` events in `system_logs`.
- [ ] Generate or update referral codes and confirm structured events (`generate_referral_code_*`, `update_referral_code_*`).
- [ ] Copy/share referral link and ensure `copy_referral_link` / `share_referral_link_*` events fire.

## Search Experience & Mobile UX
- [ ] On `/search`, type a query and confirm results debounce after ~250 ms, with arrow/home/end keys moving focus between cards and Enter opening the highlighted result.
- [ ] Verify tab-specific empty states (Music/Beats/Creators) render contextual guidance that references the active query.
- [ ] In mobile emulation (360–428 px), confirm hero toggles, CTA buttons, and streaming links on `/` and `/release/:id` meet the 44 px tap-target requirement.
- [ ] On `/marketplace`, validate trending tag chips, view-mode toggles, and CTA buttons remain accessible on small screens.
- [ ] On `/store`, toggle filters on/off via the new mobile filter control and ensure the catalog + filter column stack without horizontal scrolling.
- [ ] Still on `/store`, open the cart sidebar and verify the checkout, clear-cart, and quantity buttons provide full-width 44 px tap areas on mobile.
## Checkout Observability
- [ ] Run hybrid checkout flow in staging; confirm `checkout_*` telemetry spans cover balance, tax, and payment polling.
- [ ] Trigger checkout error (e.g., decline) and confirm `checkout_purchase_failed` event includes error payload.

## Memberships & Gating
- [ ] Create a multi-tier membership and ensure tier metadata syncs to `membership_tiers`.
- [ ] Publish a gated drop; as a non-member confirm `SubscriptionGatedContent` renders the lock screen.
- [ ] Upgrade to the required tier and confirm gated assets unlock without a browser refresh.
- [ ] Validate Discord role sync (`discord-sync-subscriber`) grants roles that match tier access.
- [ ] Capture gating state transition (see [`docs/artifacts/membership-gating-check.md`](./artifacts/membership-gating-check.md)).
- [ ] Hit `verify-release-access` twice for the same user/release pair and confirm the second request logs `verify_release_access_cache_hit` plus a fresh row in `public.release_access_cache`.

## Wallet & Credits
- [ ] Seed wallet with promo credits and confirm new balance renders in `WalletBalanceCard`.
- [ ] Execute a purchase using split tender (credits + card) and confirm debits in ledger tables.
- [ ] Refund a purchase and confirm wallet balance & transaction history reflect reversal.
- [ ] Verify weekly wallet email digest still sends via `wallet_digest_cron` after ledger updates.

## Messaging & Inbox
- [ ] Send fan → creator DM and confirm it appears instantly via Supabase real-time channel.
- [ ] Test attachments in Studio inbox (`UploadAttachment`), ensuring virus scan webhook updates status.
- [ ] Archive a conversation and ensure it no longer surfaces in default Inbox filter.
- [ ] Validate push/email notifications fire for unread message thresholds.

## Trust & Safety (Reporting & Blocking)
- [ ] Submit a report from a release or beat and confirm the submit-report edge function logs the request and RLS allows only the reporter to view the ticket.
- [ ] Visit Studio → Admin → Moderation Queue, resolve a pending report, and verify state transitions (investigating → resolved → archived) as well as the moderation system log entry.
- [ ] Invoke the block-user and unblock-user edge functions, ensuring blocked users are prevented from re-submitting reports or interacting until the block is revoked.
- [ ] Upload a release split agreement in Studio and confirm a `release_split_document_uploaded` log appears with the correct release id + uploader metadata.

## Notifications v1
- [ ] Trigger an order, artist tip, and membership subscription to confirm `broadcast-notification` delivers in-app notifications that appear in the bell dropdown and Notification Center (unread counts reflect `read_at`).
- [ ] Update notification preferences and ensure opt-out users do not receive new notifications for that category.
- [ ] Run `npm run smoke:staging` with staging credentials and confirm the broadcast smoke test delivers to the configured recipient (toast + notification row + system log).

## Live & Interactive Sessions
- [ ] Schedule a live session with ticketing and confirm countdown surfaces on `/live` rail.
- [ ] Join as host and fan; ensure Agora session connects and stage controls (mute/pin) work.
- [ ] Trigger merch drop mid-session and validate pinned call-to-action surfaces for attendees.
- [ ] End session and confirm VOD stub + chat transcript persist to library entries.

## Stripe Commerce Flows (Manual QA)
1. **Creator onboarding** – Launch Stripe Connect onboarding from Studio → Financials. Complete flow and verify `stripe_connect_onboarded` event + payout settings in Supabase.
2. **Membership purchase** – Buy a membership tier using Checkout. Confirm subscription, invoice, and fulfillment webhooks fire. Reference [`docs/artifacts/stripe-subscription-flow.md`](./artifacts/stripe-subscription-flow.md).
3. **One-time checkout** – Purchase a release/beat bundle; ensure payment intent logs include tax + fee breakdown.
4. **Dispute simulation** – Use Stripe test card `4000 0000 0000 0259`, mark evidence submitted in dashboard, and confirm webhook updates case status in `stripe_disputes`.
5. **Payout rehearsal** – Trigger manual payout in Stripe dashboard and verify ledger settlement + email receipt.

## Release Gifting
- [ ] Purchase an instant-release gift and verify the `release_gift_queue` row moves from `pending` → `delivered`, `gift_queue_run_summary` logs the poll, and purchaser/recipient notifications are inserted.
- [ ] Simulate a preorder gift (set `available_at` in the future), ensure the queue status remains `scheduled`, then advance `deliver_at` and rerun the cron to confirm delivery + email succeed.

## Gated Content Verification (Manual QA)
1. Publish gated post with tier restrictions and confirm fans below tier see upsell modal.
2. As qualifying member, load post and validate downloadable assets (stems, bonus video) stream through signed URL.
3. Toggle gating off → on and ensure cache clears across storefront. Document states in [`docs/artifacts/membership-gating-check.md`](./artifacts/membership-gating-check.md).

## OG Sharing Manual Validation
1. Generate OG preview via new function, download output, and cross-check gradients/logo placement (see [`docs/artifacts/og-sharing-debug.md`](./artifacts/og-sharing-debug.md)).
2. Share release, membership, and live session URLs to X/Facebook debuggers; confirm they show refreshed OG asset + summary text.
3. Validate fallback meta tags populate for unpublished/scheduled content.
4. Smoke test smartlink short URLs to verify they redirect with updated `<meta property>` payloads.

## Automated Tests
- [ ] `npm run test` (now silent for GlobalPlayer and Library harness warnings).
- [ ] Smoke `npm run build` to ensure OG helper additions compile.
- [ ] `PLAYWRIGHT_BASE_URL=http://localhost:4173 npm run test:e2e` (or point to staging URL) for cross-browser smoke coverage.

## Manual Smoke
- [ ] Start dev server (`npm run dev`) and validate Agora call join still works in live session room.
- [ ] Confirm Library downloads still function with tooltip/share interactions after mock adjustments.

## Observability & Dashboards
- [ ] Query `analytics.platform_observability_funnels` to verify order, tip, report, and notification metrics update after test runs.
- [ ] Audit `system_logs` entries for submit-report, review-report, block-user, unblock-user, and broadcast-notification actions to ensure correlation IDs and metadata are present.

## Release Process Alignment
- [ ] Reference the [Release Readiness Runbook](./release-readiness.md) and ensure all pre-flight gates list this checklist as a blocking item.
- [ ] Attach exported checklist (or linked Notion copy) to the release ticket before tagging production.
