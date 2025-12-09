# Regression & QA Checklist (2025-10)

_Last updated: 2025-10-17_

## Dynamic OG Image Service
- [x] Hit `https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/generate-og-image?title=Test&description=Example&type=release` and confirm PNG renders with correct badge and gradients.
- [ ] Share a release and confirm `<meta property="og:image">` points to the new function URL.
- [ ] Verify social debuggers (X, Facebook) render the updated preview.

## Creator Growth Analytics
- [ ] Load Creator Growth dashboard as a host; verify `creator_growth_profile_fetch_start/success` events in `system_logs`.
- [ ] Generate or update referral codes and confirm structured events (`generate_referral_code_*`, `update_referral_code_*`).
- [ ] Copy/share referral link and ensure `copy_referral_link` / `share_referral_link_*` events fire.
- [ ] Visit Studio → Analytics and confirm the KPI + Attribution section mirrors data from `creator_kpi_daily_personal` (views → plays → revenue and conversion rates per post/UTM source).
- [ ] Publish a social post via Plug-ins (with tracking link), wait for ingestion, query `creator_kpi_daily_personal` for that post, and verify the Studio attribution table matches the Supabase row (views, plays, fan revenue).

## Search Experience & Mobile UX
- [ ] On `/search`, type a query and confirm results debounce after ~250 ms, with arrow/home/end keys moving focus between cards and Enter opening the highlighted result.
- [ ] Verify tab-specific empty states (Music/Beats/Creators) render contextual guidance that references the active query.
- [ ] In mobile emulation (360–428 px), confirm hero toggles, CTA buttons, and streaming links on `/` and `/release/:id` meet the 44 px tap-target requirement.
- [ ] On `/marketplace`, validate trending tag chips, view-mode toggles, and CTA buttons remain accessible on small screens.
- [ ] On `/store`, toggle filters on/off via the new mobile filter control and ensure the catalog + filter column stack without horizontal scrolling.
- [ ] Still on `/store`, open the cart sidebar and verify the checkout, clear-cart, and quantity buttons provide full-width 44 px tap areas on mobile.

## Catalog Management
- [ ] Visit `/studio/catalog` as a profile owner and confirm each tab (Releases, Beats, Packs, Merch, Bundles, Collectibles) updates via the `get_catalog_items` RPC when filters/search/sort values change (check the Supabase request payload).
- [ ] Exercise the status filter + debounced search box; ensure empty states render per tab and the `highlight` query parameter still applies the visual emphasis to the targeted card.
- [ ] Validate the 30-day revenue/sales/plays/subscriber cards match `creator_metrics` totals for the active profile (spot-check via Supabase SQL runner).

## Social Feed
- [ ] Seed `user_follows` rows in staging, load `/home`, and confirm the Following tab uses the `get_follow_feed` RPC (check Supabase logs) with infinite scroll bringing back releases, beats, and posts in descending order.
- [ ] Remove all follow relationships and ensure the CTA to discover creators plus trending fallback renders; re-follow a creator to confirm the feed repopulates without refresh.
- [ ] Trigger a social post + release for a followed creator and verify the card shows the correct avatar, body copy, and tip/listen controls. Test `load more` sentinel behavior on mobile.

## Unified Inbox
- [ ] Connect Gmail & Discord via Studio → Plugins and confirm the Inbox page reflects connection status + last sync timestamp.
- [ ] Run a manual poll from the Inbox UI for each provider and verify `cron.job` schedules (`inbox-fetch-*`) appear in Supabase plus new rows land in `unified_inbox`.
- [ ] Use the message filters/search to drive the `get_unified_inbox_messages` RPC (watch Supabase logs) and ensure composer actions (`inbox-send-gmail`, `inbox-send-discord`) deliver and refresh the list.
## Checkout Observability
- [ ] Run hybrid checkout flow in staging; confirm `checkout_*` telemetry spans cover balance, tax, and payment polling.
- [ ] Trigger checkout error (e.g., decline) and confirm `checkout_purchase_failed` event includes error payload.
- [ ] Query `select * from public.vw_checkout_activity_daily limit 7;` to verify the new checkout observability view reflects recent completed/failed orders and revenue (no gaps for days with activity).

## Memberships & Gating
- [ ] Create a multi-tier membership and ensure tier metadata syncs to `membership_tiers`.
- [ ] Publish a gated drop; as a non-member confirm `SubscriptionGatedContent` renders the lock screen.
- [ ] Upgrade to the required tier and confirm gated assets unlock without a browser refresh.
- [ ] Validate Discord role sync (`discord-sync-subscriber`) grants roles that match tier access.
- [ ] Capture gating state transition (see [`docs/artifacts/membership-gating-check.md`](./artifacts/membership-gating-check.md)).
- [ ] Hit `verify-release-access` twice for the same user/release pair and confirm the second request logs `verify_release_access_cache_hit` plus a fresh row in `public.release_access_cache`.

## LMS / Learn
- [ ] Browse `/learn` with `VITE_FEATURE_LMS=true` and confirm catalog filters/search call `get_lms_courses`; cards should show instructor/difficulty/pricing pulled from Supabase.
- [ ] Open `/learn/:slug` as a non-entitled user and ensure only preview lessons display, the lock banner renders, and the CTA routes through auth → membership → purchase depending on access metadata.
- [ ] Complete at least two lessons, reload, and verify `lms_course_progress` updates (`completed_lesson_ids`, `percent_complete`, `last_accessed`).
- [ ] Click “Log perfect attempt” on a quiz card; confirm `lms_quiz_attempts` logs the row and the quiz stats refresh (attempt count/best score).
- [ ] Purchase a course via the purchase CTA (or call `record_lms_course_purchase`) and ensure lessons unlock immediately plus `lms_course_purchases`/`lms_course_entitlements` contain the row.
- [ ] Sign in as the instructor, edit pricing via the admin controls, and verify `lms_course_pricing` reflects the saved values; grant manual access to a test user and confirm they can view the course without purchasing.
- [ ] Toggle “membership only” in the pricing panel, downgrade to a free tier, and confirm `can_access_lms_course` blocks lessons until the user re-upgrades or gets a manual grant.

## Wallet & Credits
- [ ] Seed wallet with promo credits and confirm new balance renders in `WalletBalanceCard`.
- [ ] Execute a purchase using split tender (credits + card) and confirm debits in ledger tables.
- [ ] Refund a purchase and confirm wallet balance & transaction history reflect reversal.
- [ ] Force a temporary failure of `wallet_process_transaction` (toggle the RPC off in staging or simulate via feature flag) and confirm fallback ledger inserts still credit/debit correctly, including charge-reversal replays.
- [ ] Start checkout with credits applied, cancel the Stripe session, and ensure wallet credits remain unchanged (preview-only deduction should not run until Stripe payment confirms).
- [ ] Verify weekly wallet email digest still sends via `wallet_digest_cron` after ledger updates.
- [ ] Attempt a wallet cash-out with Stripe Connect onboarding incomplete or on compliance hold; confirm the Wallet Cash Out tab surfaces the onboarding CTA/compliance banner and blocks the request without debiting credits.
- [ ] From Wallet → Activity, open a ledger receipt (`spend_purchase` or `convert_cashout`) and confirm the `generate-receipt` function renders HTML with the matching ledger id.

## Messaging & Inbox
- [ ] Send fan → creator DM and confirm it appears instantly via Supabase real-time channel.
- [ ] Test attachments in Studio inbox (`UploadAttachment`), ensuring virus scan webhook updates status.
- [ ] Archive a conversation and ensure it no longer surfaces in default Inbox filter.
- [ ] Validate push/email notifications fire for unread message thresholds.
- [ ] Hit `cron.job` via SQL (e.g., `select jobname, schedule from cron.job where jobname like 'inbox-fetch-%';`) and verify the Gmail/Discord/YouTube/Instagram fetch jobs exist with the updated intervals plus the correct `net.http_post` payload.

## Trust & Safety (Reporting & Blocking)
- [ ] Submit a report from a release or beat and confirm the submit-report edge function logs the request and RLS allows only the reporter to view the ticket.
- [ ] Visit Studio → Admin → Moderation Queue, resolve a pending report, and verify state transitions (investigating → resolved → archived) as well as the moderation system log entry.
- [ ] Invoke the block-user and unblock-user edge functions, ensuring blocked users are prevented from re-submitting reports or interacting until the block is revoked.
- [ ] Upload a release split agreement in Studio and confirm a `release_split_document_uploaded` log appears with the correct release id + uploader metadata.

## Notifications v1
- [ ] Trigger an order, artist tip, and membership subscription to confirm `broadcast-notification` delivers in-app notifications that appear in the bell dropdown and Notification Center (unread counts reflect `read_at`).
- [ ] Update notification preferences and ensure opt-out users do not receive new notifications for that category.
- [ ] Run `npm run smoke:staging` with staging credentials and confirm the broadcast smoke test delivers to the configured recipient (toast + notification row + system log).

## Lifecycle Emails
- [ ] Create a fresh fan and creator account (or trigger the signup webhook) and confirm `fan_welcome`/`creator_welcome` emails arrive via the Resend log. Toggle creator mode in Studio to re-run the creator welcome flow if needed.
- [ ] Complete a store checkout and verify the purchaser receives the library/receipt email. Inspect `analytics_events` for an `order_receipt_email` row tied to the `order_id` and ensure repeat webhooks do not duplicate the email.
- [ ] For a creator without prior sales, trigger a tip or store purchase and confirm a single `creator_first_earnings` email plus `analytics_events` entry (`event_name = first_earnings`). Subsequent sales should skip the email.

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
- [ ] Pull `select * from public.vw_membership_activity_daily limit 7;` to ensure membership observability covers new vs churned subscribers plus active MRR data for dashboards.

## Release Process Alignment
- [ ] Reference the [Release Readiness Runbook](./release-readiness.md) and ensure all pre-flight gates list this checklist as a blocking item.
- [ ] Attach exported checklist (or linked Notion copy) to the release ticket before tagging production.
