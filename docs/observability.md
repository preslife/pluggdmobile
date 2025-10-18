# Observability Guide

This document outlines the signals and workflows available to monitor the health of the commerce, membership, and moderation surfaces across Pluggd.

## Dashboards

### 1. Checkout & Store Health
- **Stripe Webhook Throughput** – count of `stripe-webhook` invocations grouped by event type.
- **Checkout Modal Conversion** – ratio of `checkout_purchase_completed` vs `checkout_purchase_failed` events logged from the checkout modal.
- **Hybrid Purchase Fulfilment** – number of download records created vs missing user metadata (`hybrid purchase` guard rail).
- **Store Success Page Errors** – aggregate of `store_success_order_fetch_failed` and `store_success_order_not_found` events.

### 2. Membership & Subscriptions
- **Membership Tier Mutations** – volume and error rate for create/update/delete actions emitted by `useMembershipTiers`.
- **Subscription Gating** – warnings for gate configuration and tier lookups surfaced via `SubscriptionGatedContent` instrumentation.
- **Stripe Subscription Lifecycles** – counts of `subscription_created`, `subscription_updated`, `subscription_cancelled`, and `charge_refunded/failed` webhook events.

### 3. Moderation Operations
- **Dashboard Load Latency** – measure `moderation_dashboard_fetch_success` timings to ensure content queues load quickly.
- **Action Outcomes** – success vs failure of `moderation_action_*` events split by moderator and action type.
- **Report Intake** – pending reports from `moderation_dashboard_fetch_success` metadata to highlight backlog growth.

### 4. System Reliability
- **Edge Function Errors** – any `split_attribution_failed`, `crowdfunding_contribution_missing_*`, or `artist_tip_*` error events emitted by Supabase edge functions.
- **System Log Insertion Failures** – watch for `[system_logs] insert_failed` console errors surfaced via the shared logger in edge functions.

## Alerts

| Alert | Condition | Suggested Action |
| --- | --- | --- |
| **Stripe Webhook Error Rate** | >5% of events in a 15 minute window emit `stripe_webhook` errors (e.g. `charge_reversal_recredit_failed`, `split_attribution_failed`). | Inspect the `stripe-webhook` function logs and Stripe dashboard for incident details. |
| **Checkout Purchase Failure Spike** | 10 consecutive `checkout_purchase_failed` or `checkout_payment_poll_timeout` events. | Validate Stripe availability and investigate recent releases causing payment issues. |
| **Membership Mutation Failures** | Any sustained `membership_tier_*_failed` event >3/min. | Review Supabase table availability and user actions in Studio. |
| **Moderation Dashboard Fetch Failures** | Two consecutive `moderation_dashboard_fetch_failed` events. | Check Supabase read replicas and moderation tables for schema changes. |
| **Store Success Order Fetch Errors** | More than 5 `store_success_order_fetch_failed` events in 10 minutes. | Confirm order ingestion and ensure Stripe session IDs match Supabase records. |
| **System Log Insert Failures** | Presence of `[system_logs] insert_failed` warnings for more than 1 minute. | Validate that the `system_logs` table is writable and investigate quota limits. |

## Log Schema

All application and edge-function logs are normalised into the `system_logs` table with the structure below:

| Field | Type | Description |
| --- | --- | --- |
| `timestamp` | ISO timestamp | UTC time when the event was recorded. |
| `level` | Integer (0–4) | Mapped from `LogLevel` enum (`0=debug`, `1=info`, `2=warn`, `3=error`, `4=critical`). |
| `message` | string | Human readable summary of the event. Matches the action identifier for structured logs. |
| `action` | string | Machine-friendly event key (snake_case). Used in dashboards and alert queries. |
| `component` | string | Logical component emitting the event (`CheckoutModal`, `store_success`, `supabase.stripe-webhook`, etc.). |
| `session_id` | string or null | Client session identifier or Supabase request id when present. |
| `user_id` | string or null | Populated when the active user is known. |
| `metadata` | JSONB | Arbitrary structured payload containing contextual fields (e.g. `scope`, `orderId`, `releaseId`, `durationMs`, `error`). |

### Metadata Conventions
- **scope** – used to group logs within an operation (`download_records`, `charge_reversal`, `crowdfunding`).
- **event identifiers** – keys such as `sessionId`, `orderId`, `tierId`, or `tipId` should remain camelCase to align with existing dashboards.
- **errors** – include `error` with `message`, and, when available, contextual ids to aid triage.
- **performance** – add `durationMs` for timed operations captured via the `trackPromise` helper.

## Operational Tips
- Use the new `useLogger` hook to create scoped loggers in React components. Always attach `component`, `feature`, and `view` metadata for consistent filtering.
- For Supabase functions, prefer `scopeLogger(baseLogger, metadata)` to enrich log context instead of direct `console.log` or manual `system_logs` inserts.
- When adding new flows, capture `_start`, `_success`, and `_error` variants so the existing dashboards automatically compute success rates.
