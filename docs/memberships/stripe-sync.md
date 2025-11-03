# Membership tier Stripe sync flow

The Studio "Memberships & Subscriptions" module now talks directly to Supabase via the RPC helpers defined in
`supabase/migrations/20250902120000_membership_tier_rpc.sql`. These helpers insert/update `membership_tiers` and enqueue
jobs in `membership_tier_sync_queue` so the `membership-tier-sync` edge function can build Stripe products/prices via
`membership-tier-stripe`.

## RPC summary

| Function | Purpose |
| --- | --- |
| `create_membership_tier(p_input jsonb)` | Validates actor + owner, persists the new tier, and enqueues a `create` sync job. |
| `update_membership_tier(p_tier_id uuid, p_input jsonb)` | Applies updates, flips `stripe_sync_status` back to `pending`, and schedules a Stripe `update`. |
| `delete_membership_tier(p_tier_id uuid)` | Removes the tier and queues a `delete` sync to disable Stripe products/prices. |

All three functions attach `actor_id` metadata so downstream logging ties the request back to the Studio user.

## Operational notes

- The RPCs raise structured errors with `details` codes (`not_authenticated`, `duplicate_slug`, `tier_not_found`, etc.). The
  Studio hook surfaces these strings for toast messaging.
- `stripe_sync_status` is set to `pending` during mutations; the sync worker overwrites it with `processing`/`synced`/`error`
  states as it runs. Keep the worker warm so membership pricing reaches Stripe quickly.
- Queue payloads embed the full tier row in JSON. This keeps the edge function idempotent even if the tier is deleted before
  the job executes.
