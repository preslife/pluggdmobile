# Commerce & Stripe Integration

This document explains how our storefront checkout works, the metadata we attach to Stripe sessions, and how webhook events remain idempotent across multiple commerce surfaces.

## Checkout Flow Overview

1. The client prepares cart context via `useCheckout` and calls the Supabase `create-store-checkout` function to create a Stripe Checkout session.【F:src/hooks/useCheckout.ts†L1-L160】【F:src/services/checkout/storeCheckout.ts†L1-L65】
2. Supabase loads product data, builds a Stripe session with metadata, persists an `orders` row, and returns the hosted checkout URL to the client.【F:supabase/functions/create-store-checkout/index.ts†L19-L201】
3. The customer completes payment on Stripe and returns to the `StoreSuccess` page, which re-fetches the order with retry logic and emits telemetry for observability.【F:src/pages/StoreSuccess.tsx†L1-L207】
4. Stripe sends webhook events to Supabase where we finalize orders, unlock digital goods, and log activity in `system_logs` for auditing.【F:supabase/functions/stripe-webhook/index.ts†L172-L680】

## Checkout Session Metadata

The checkout hook enriches every request with aggregate metadata so Stripe webhooks can reconcile orders even if line items change client-side.【F:src/hooks/useCheckout.ts†L40-L109】 Metadata contains:

- `itemCount`, `totalQuantity`, and `totalAmount` summarizing the cart.【F:src/hooks/useCheckout.ts†L74-L96】
- `itemIds` for deduplicating server-side fulfillment.【F:src/hooks/useCheckout.ts†L74-L96】
- `lineItems` including product IDs, normalized quantities, and optional prices for analytics.【F:src/hooks/useCheckout.ts†L61-L83】
- Optional custom metadata (e.g., attribution channel) merged from the caller after removing undefined fields.【F:src/hooks/useCheckout.ts†L84-L96】

The checkout service ensures only defined values reach the edge function and logs both the request and normalized response for traceability.【F:src/services/checkout/storeCheckout.ts†L23-L63】

## Stripe Webhook Payloads

Supabase handles multiple commerce scenarios inside `stripe-webhook`:

- **Crowdfunding contributions** leverage metadata fields such as `campaign_id`, `reward_id`, `supporter_note`, and `campaign_slug`. Contributions are upserted on `stripe_payment_intent_id` to avoid duplicates and a receipt generation function runs asynchronously.【F:supabase/functions/stripe-webhook/index.ts†L186-L280】
- **Credits top-ups** consume `metadata.user_id` and `metadata.credits_amount` to credit the wallet ledger with a `topup` entry linked to the Stripe session.【F:supabase/functions/stripe-webhook/index.ts†L282-L335】
- **Hybrid purchases** parse `metadata.purchase_items` to unlock digital downloads immediately after Stripe confirms payment.【F:supabase/functions/stripe-webhook/index.ts†L336-L366】
- **Store orders** look up the pre-created `orders` row by `payment_id` or legacy `stripe_session_id`, update totals, stamp `paid_at`, and write a `system_logs` entry with the Stripe payment intent for observability.【F:supabase/functions/stripe-webhook/index.ts†L566-L638】
- **Artist tips** update `artist_tips` records, ensuring the final amount, payment intent, and status are persisted before triggering fan/artist notifications.【F:supabase/functions/stripe-webhook/index.ts†L639-L720】

Each branch inspects `session.metadata.type` (e.g., `store_purchase`, `artist_tip`, `crowdfunding_contribution`) so new commerce surfaces should namespace metadata accordingly.【F:supabase/functions/stripe-webhook/index.ts†L562-L640】

## Idempotency Guarantees

We rely on several layers to keep webhook processing idempotent:

- Stripe emits unique `event.id` values, and our handler simply exits early when records already exist (e.g., upserting crowdfunding supporters on `stripe_payment_intent_id`).【F:supabase/functions/stripe-webhook/index.ts†L212-L240】
- Store orders are fetched by the Stripe session ID and only updated if the row exists, preventing duplicate inserts on webhook retries.【F:supabase/functions/stripe-webhook/index.ts†L566-L614】
- Artist tips and hybrid purchase fulfillment perform secondary lookups on the payment intent to guard against out-of-order events.【F:supabase/functions/stripe-webhook/index.ts†L639-L693】
- The checkout hook’s metadata includes `itemIds` and totals, giving webhook code deterministic signals to verify the cart that generated the session.【F:src/hooks/useCheckout.ts†L61-L109】

When adding new event handlers, prefer `upsert` or `update` statements scoped by Stripe IDs, avoid mutating state when the target row is already finalized, and capture a `system_logs` entry so operations have an audit trail.【F:supabase/functions/stripe-webhook/index.ts†L566-L638】

## Membership Gating & Discord Sync

- The `public.gated_content` table now powers membership gating for releases, beats, posts, and sample packs. Edge functions expose three RPCs for Studio editors: `get_membership_access_rules`, `upsert_membership_access_rules`, and `delete_membership_access_rules`. These map directly to the new Supabase view `membership_access_rules`, allowing the UI to fetch/update gating metadata atomically.【F:supabase/migrations/20251001090000_membership_access_rules.sql†L1-L142】
- `check_content_access` guards every gated fetch, while `can_access_release` now defers to membership rules before honoring purchases. Premium releases without explicit gates fall back to active memberships owned by the release owner, ensuring legacy `is_premium_content` drops respect supporter tiers.【F:supabase/migrations/20251001091500_update_release_access.sql†L1-L55】
- A backfill migration seeds `gated_content` entries for any historical premium releases, normalises missing owner metadata for beats/posts, and widens the table constraint so beats/sample packs can be gated moving forward.【F:supabase/migrations/20251001090000_membership_access_rules.sql†L1-L186】
- `verify-release-access` now emits structured `system_logs` entries and calls `can_access_release`, returning a correlation ID, purchase metadata, and gating verdict for the client. Any downstream 4xx/5xx responses include consistent log breadcrumbs for moderation review.【F:supabase/functions/verify-release-access/index.ts†L1-L170】

### Membership Lifecycle Notifications & Discord Roles
- Stripe webhooks handle renewals (`invoice.payment_succeeded`) in addition to create/update/cancel events. Renewals sync the membership record, enqueue a Discord sync, and broadcast “Membership renewed” notifications to both the fan and creator while respecting `notificationPreferences`.【F:supabase/functions/stripe-webhook/index.ts†L1490-L1636】【F:supabase/functions/broadcast-notification/handler.ts†L128-L199】
- `discord-sync-subscriber` was rewritten to use structured logging, membership-tier lookups, and per-role audit logs. It now updates `membership_discord_tokens` after each sync so Cron runs can detect drift.【F:supabase/functions/discord-sync-subscriber/index.ts†L1-L248】
- A scheduled companion function `discord-sync-cron` scans recently-updated memberships (grant/renew/cancel) and replays syncs for supporters even if a webhook was missed. Pair it with Supabase Scheduler (hourly) to keep Discord roles aligned.【F:supabase/functions/discord-sync-cron/index.ts†L1-L135】
- Both functions are listed in `supabase/config.toml` with `verify_jwt = false`, ready for deployment with either direct HTTPS triggers or Supabase Scheduler jobs.【F:supabase/config.toml†L63-L70】

## Testing & Observability

- `useCheckout` has Vitest coverage for metadata construction, redirect behavior, and error propagation using mocked Stripe session responses.【F:src/hooks/__tests__/useCheckout.test.ts†L1-L120】
- `createStoreCheckoutSession` is tested against mocked Supabase responses to validate success, error, and missing URL scenarios.【F:src/services/checkout/__tests__/storeCheckout.test.ts†L1-L69】
- `StoreSuccess` retries order lookups up to three times, logging telemetry for every attempt so dashboards can distinguish transient Supabase latency from genuine failures.【F:src/pages/StoreSuccess.tsx†L9-L207】

These tests, combined with telemetry emitted during checkout and post-payment reconciliation, provide defense-in-depth to detect integration regressions quickly.
