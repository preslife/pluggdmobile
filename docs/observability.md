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

### 5. Wallet & Credits
- **Wallet Fetch Latency** – compare `wallet_balance_fetch_success` and `wallet_ledger_fetch_success` durations produced by `useWallet`'s `trackPromise` wrapper.
- **Wallet Mutation Success** – success vs failure of `wallet_spend_*`, `wallet_cashout_*`, and `wallet_apply_subscription_*` events.
- **Cash-out Compliance Blocks** – monitor the `wallet_cashout_failed` metadata (`code`, `compliance_block`) to detect payout issues.

### 6. Messaging & Downloads
- **Messaging Center Engagement** – count `messaging_center_opened/closed` events and `inbox_send_*` outcomes with associated workspace metadata.
- **Secure Download Outcomes** – rate of `download_request_received` vs warnings (`release_limit_reached`, `release_expired`, etc.) from the `download-signed-url` edge function.
- **Inbox Harvesting** – track `inbox_fetch_*` start/complete/error events for Discord, Gmail, Instagram, and YouTube connectors.

## Alerts

| Alert | Condition | Suggested Action |
| --- | --- | --- |
| **Stripe Webhook Error Rate** | >5% of events in a 15 minute window emit `stripe_webhook` errors (e.g. `charge_reversal_recredit_failed`, `split_attribution_failed`). | Inspect the `stripe-webhook` function logs and Stripe dashboard for incident details. |
| **Checkout Purchase Failure Spike** | 10 consecutive `checkout_purchase_failed` or `checkout_payment_poll_timeout` events. | Validate Stripe availability and investigate recent releases causing payment issues. |
| **Membership Mutation Failures** | Any sustained `membership_tier_*_failed` event >3/min. | Review Supabase table availability and user actions in Studio. |
| **Moderation Dashboard Fetch Failures** | Two consecutive `moderation_dashboard_fetch_failed` events. | Check Supabase read replicas and moderation tables for schema changes. |
| **Store Success Order Fetch Errors** | More than 5 `store_success_order_fetch_failed` events in 10 minutes. | Confirm order ingestion and ensure Stripe session IDs match Supabase records. |
| **System Log Insert Failures** | Presence of `[system_logs] insert_failed` warnings for more than 1 minute. | Validate that the `system_logs` table is writable and investigate quota limits. |
| **Wallet Cash-out Errors** | `wallet_cashout_failed` events >3 in 15 minutes or any event with `compliance_block=true`. | Investigate payout service availability and compliance responses. |
| **Download Access Denied** | `release_access_denied` or `release_limit_reached` events >5 in 10 minutes. | Review purchase entitlements and download limits for the affected releases. |
| **Inbox Fetch Failures** | `inbox_fetch_failed` events for any provider occurring on consecutive cron runs. | Inspect connector credentials and third-party API quotas for the affected provider. |

## Event Catalogue

### Wallet & Credits
| Event | Emitted By | Description | Key Metadata |
| --- | --- | --- | --- |
| `wallet_balance_fetch_start/_success/_error` | `useWallet.trackPromise` | Lifecycle around balance refresh requests. | `user_id`, `durationMs` (success/error), `limit` when applicable. |
| `wallet_ledger_fetch_start/_success/_error` | `useWallet.trackPromise` | Ledger fetch instrumentation for transaction history. | `user_id`, `limit`, `durationMs`. |
| `wallet_spend_attempt` | `useWallet` | User-initiated spend prior to RPC call. | `amount`, `kind`, `ref_type`, `ref_id`. |
| `wallet_spend_denied` | `useWallet` | Attempt rejected client-side due to insufficient credits. | `amount`, `available_credits`, `kind`. |
| `wallet_spend_failed` | `useWallet` | Spend RPC failure (client- or server-side). | `error`, `amount`, `kind`, `user_id`. |
| `wallet_cashout_failed` | `useWallet` | Cash-out request failure, including compliance metadata. | `user_id`, `amount`, `code`, `compliance_block`. |
| `wallet_apply_subscription_failed` | `useWallet` | Subscription application failure. | `user_id`, `amount`, `code`. |

### Messaging Center
| Event | Emitted By | Description | Key Metadata |
| --- | --- | --- | --- |
| `messaging_center_opened/closed` | `MessagingCenter` | Tracks when the inbox panel is toggled. | `workspace`, `unread_count`. |
| `inbox_send_attempt/success/error` | `MessagingCenter` | Lifecycle around sending a reply. | `channel`, `provider`, `thread_id`, `error`. |

### Downloads & Library
| Event | Emitted By | Description | Key Metadata |
| --- | --- | --- | --- |
| `download_request_received` | `download-signed-url` edge function | Entry point for any secure download invocation. | `purchaseId`, `purchaseType`, `user_id`. |
| `download_issued` | `download-signed-url` edge function | Signed URL generation completed. | `bucket`, `path`, `expires_in_seconds`. |
| `release_limit_reached` / `release_expired` / `beat_limit_reached` / `sample_pack_limit_reached` | `download-signed-url` edge function | Guards preventing downloads when entitlements are exhausted or expired. | `purchaseId`, `purchaseType`, `downloadCount`, `limit`. |
| `release_access_denied` / `beat_access_denied` / `sample_pack_access_denied` | `download-signed-url` edge function | Authentication or ownership failure for the request. | `purchaseId`, `purchaseType`, `user_id`. |
| `download_failed` | `download-signed-url` edge function | Unexpected failure when issuing the signed URL. | `purchaseId`, `purchaseType`, `error`. |
| `library_tab_viewed` | `Library` & `DashboardTabs` components | Tracks library tab activity. | `tab`, `workspace`, `correlation_id`. |
| `library_download_reset_requested` / `library_download_reset_failed` | `Library` page | Download reset workflow instrumentation. | `purchase_id`, `purchase_type`, `durationMs`, `error`. |
| `library_download_started` / `library_download_failed` | `Library` page | Download initiation from the client. | `purchase_id`, `purchase_type`, `error`. |

### Membership Edge Functions
| Event | Emitted By | Description | Key Metadata |
| --- | --- | --- | --- |
| `membership_tier_sync_start/_success/_retry/_failed` | `membership-tier-stripe` edge function | Stripe sync lifecycle for tier mutations. | `tier_id`, `action`, `job_id`, `attempt`, `actor_id`. |
| `membership_tier_sync_queue_poll/_complete/_failed` | `membership-tier-sync` edge function | Queue processor telemetry. | `limit`, `include_failed`, `processed`, `results`. |
| `membership_tier_sync_job_start/_success/_failed` | `membership-tier-sync` edge function | Per-job execution status. | `job_id`, `tier_id`, `action`, `attempts`, `max_attempts`. |

### Inbox Fetchers
| Event | Emitted By | Description | Key Metadata |
| --- | --- | --- | --- |
| `inbox_fetch_start/_complete` | Inbox edge functions (`inbox-fetch-*`) | Cron execution lifecycle per provider. | `provider`, `processed`, `connections`. |
| `inbox_fetch_provider_error` | Inbox edge functions | Third-party API errors for a provider. | `provider`, `status`, `user_id`. |
| `inbox_fetch_connection_failed` | Inbox edge functions | Per-user connector failure. | `provider`, `user_id`, `error`. |
| `inbox_fetch_failed` | Inbox edge functions | Fatal function failure preventing completion. | `provider`, `error`. |

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
- For Supabase functions, use `createSystemLogger` from `supabase/functions/_shared/systemLog.ts` to enrich context instead of direct `console.log` or manual `system_logs` inserts.
- When adding new flows, capture `_start`, `_success`, and `_error` variants so the existing dashboards automatically compute success rates.
- Always include `correlation_id` when chaining client and edge-function events to stitch traces across systems.
