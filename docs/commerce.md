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

## Testing & Observability

- `useCheckout` has Vitest coverage for metadata construction, redirect behavior, and error propagation using mocked Stripe session responses.【F:src/hooks/__tests__/useCheckout.test.ts†L1-L120】
- `createStoreCheckoutSession` is tested against mocked Supabase responses to validate success, error, and missing URL scenarios.【F:src/services/checkout/__tests__/storeCheckout.test.ts†L1-L69】
- `StoreSuccess` retries order lookups up to three times, logging telemetry for every attempt so dashboards can distinguish transient Supabase latency from genuine failures.【F:src/pages/StoreSuccess.tsx†L9-L207】

These tests, combined with telemetry emitted during checkout and post-payment reconciliation, provide defense-in-depth to detect integration regressions quickly.
