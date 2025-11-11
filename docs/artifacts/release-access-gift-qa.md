# Release Access Cache & Gift Queue QA Notes

These steps document the remaining validation work that should run on any environment (staging or ephemeral) now that the schema and functions are in place. Kick these off from the cloud runner if you need access to live secrets.

## 1. Release Access Cache Verification

1. Pick a release ID that your test user owns and another account that has **not** purchased it.
2. Issue the RPC twice for the same user+release pair:

   ```bash
   curl -i \
     -H "Authorization: Bearer $TEST_USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"releaseId":"<release_id>"}' \
     "$SUPABASE_URL/functions/v1/verify-release-access"
   ```

3. On the first call expect `verify_release_access_cache_miss` in `system_logs` and no `release_access_cache` row beforehand.
4. On the second call confirm:
   - HTTP 200 with identical payload.
   - `verify_release_access_cache_hit` log entry with a sane `cache_age_ms`.
   - `public.release_access_cache` now contains the (user_id, release_id) row with updated `updated_at`.
5. Repeat the same steps for a preorder scenario (set `available_at` in the future) to make sure `preorder_pending` toggles `verify_release_access_preorder_block`.

## 2. Instant-Release Gift Flow

1. Purchase any release as a gift where `available_at <= now()`. Capture the returned `claim_token`.
2. Check `public.release_gift_queue` for the new row: `status = 'pending'`, `deliver_at` ~ now.
3. Manually invoke the cron:

   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/process-gift-queue" \
     -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
     -H "x-cron-secret: $GIFT_QUEUE_CRON_SECRET"
   ```

4. Expect `gift_queue_poll_started`, `gift_queue_delivery_success`, and `gift_queue_run_summary` events in `system_logs`.
5. Verify:
   - `release_gift_queue.status` transitions to `delivered`.
   - Purchaser + recipient receive `notifications` rows (respecting `notify_purchases` preference).
   - Email provider logs the Resend dispatch.

## 3. Preorder Gift Flow

1. Create/purchase a release gift where `available_at` is in the future.
2. Inspect the queue row: `status = 'scheduled'`, `deliver_at` matches release availability.
3. Run the cron early and expect no delivery: `gift_queue_run_summary` should show `delivered=0`, `scheduled > 0`.
4. Update the record (`deliver_at = now()`) or advance the release availability, rerun the cron, and confirm the same assertions as the instant flow.

## 4. Observability Dashboard Follow-ups

- Add BigQuery/Supabase SQL panels for:
  - Cache effectiveness: ratio of `verify_release_access_cache_hit` to `verify_release_access_cache_miss`.
  - Gift queue health: pending vs scheduled backlog, last `gift_queue_delivery_failed`.
- Export the queries to `docs/observability.md` once the panels exist so the next operator can rebuild them if needed.

> **Next action for the cloud runner:** execute the curls above against staging, capture the resulting logs/IDs, and drop them into the release ticket so we can mark the Milestone A/D gating work as verified.
