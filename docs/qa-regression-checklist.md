# Regression & QA Checklist (2025-10)

_Last updated: 2025-10-14_

## Dynamic OG Image Service
- [ ] Hit `https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/generate-og-image?title=Test&description=Example&type=release` and confirm PNG renders with correct badge and gradients.
- [ ] Share a release and confirm `<meta property="og:image">` points to the new function URL.
- [ ] Verify social debuggers (X, Facebook) render the updated preview.

## Creator Growth Analytics
- [ ] Load Creator Growth dashboard as a host; verify `creator_growth_profile_fetch_start/success` events in `system_logs`.
- [ ] Generate or update referral codes and confirm structured events (`generate_referral_code_*`, `update_referral_code_*`).
- [ ] Copy/share referral link and ensure `copy_referral_link` / `share_referral_link_*` events fire.

## Checkout Observability
- [ ] Run hybrid checkout flow in staging; confirm `checkout_*` telemetry spans cover balance, tax, and payment polling.
- [ ] Trigger checkout error (e.g., decline) and confirm `checkout_purchase_failed` event includes error payload.

## Memberships & Gating
- [ ] Create a multi-tier membership and ensure tier metadata syncs to `membership_tiers`.
- [ ] Publish a gated drop; as a non-member confirm `SubscriptionGatedContent` renders the lock screen.
- [ ] Upgrade to the required tier and confirm gated assets unlock without a browser refresh.
- [ ] Validate Discord role sync (`discord-sync-subscriber`) grants roles that match tier access.
- [ ] Capture gating state transition (see [`docs/artifacts/membership-gating-check.md`](./artifacts/membership-gating-check.md)).

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

## Manual Smoke
- [ ] Start dev server (`npm run dev`) and validate Agora call join still works in live session room.
- [ ] Confirm Library downloads still function with tooltip/share interactions after mock adjustments.

## Release Process Alignment
- [ ] Reference the [Release Readiness Runbook](./release-readiness.md) and ensure all pre-flight gates list this checklist as a blocking item.
- [ ] Attach exported checklist (or linked Notion copy) to the release ticket before tagging production.
