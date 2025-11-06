# Trust & Safety & Notifications — Staging Validation

_Use this checklist whenever trust-safety or notification features ship. Follow the steps sequentially against the staging environment._

## 0. Prerequisites
- Staging Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, service-role key).
- Test accounts:
  - **Admin** user (has `user_roles.role = 'admin'`).
  - **Creator** user with published release/beat.
  - **Fan** user for reporting/blocking scenarios.
- Optional: Stripe test mode enabled for purchase-triggered notifications.

## 1. Environment Setup
1. Export staging env vars locally (or update `.env.stage`):
   ```bash
   export VITE_SUPABASE_URL="https://<stage>.supabase.co"
   export VITE_SUPABASE_ANON_KEY="<anon>"
   export SUPABASE_SERVICE_ROLE_KEY="<service>"
   export STRIPE_SECRET_KEY="<stripe_test_key>"
   ```
2. Run the web app against staging data:
   ```bash
   npm run dev -- --mode staging
   ```
3. Open separate browser sessions (or private windows) for admin, creator, and fan accounts.

## 2. Content Reporting
1. As the **fan**, open a published release (`/release/:id`) and click **Report**.
2. Select a reason (e.g., “Inappropriate Content”), optionally add details, and submit.
3. Verify row creation:
   ```sql
   select id, target_type, reason, status
   from public.content_reports
   order by created_at desc
   limit 1;
   ```
   Status should be `pending`.
4. As **admin**, navigate to `/admin/catalog/moderation`.
   - Confirm the new report is listed with accurate metadata.
   - Change its status (e.g., resolve / dismiss) and ensure the change persists in Supabase.

## 3. User Blocking
1. Still as the **fan**, visit the creator’s profile and press **Block**.
2. Confirm success toast, then attempt to follow or DM the creator—interaction should be prevented.
3. Check the database:
   ```sql
   select blocker_id, blocked_user_id, status
   from public.user_blocks
   where blocker_id = '<fan_user_uuid>';
   ```
4. Use the **Unblock** action and repeat the query to ensure the record is cleared.

## 4. Notification Dispatch
1. Obtain a bearer token for the admin session (inspect storage or use Supabase CLI).
2. Trigger the broadcast function:
   ```bash
   curl -X POST "$VITE_SUPABASE_URL/functions/v1/broadcast-notification" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
           "recipients": ["<fan_user_uuid>"],
           "type": "order",
           "title": "Test order update",
           "message": "Your order is ready in staging.",
           "payload": {"demo": true}
         }'
   ```
3. In the fan session:
   - A toast should appear immediately.
   - Notification bell count increments; `/notifications` lists the new entry.
4. Test “Mark all read” in the notification center and confirm `read_at` updates:
   ```sql
   select id, read_at
   from public.notifications
   where user_id = '<fan_user_uuid>'
   order by created_at desc
   limit 5;
   ```

## 5. System Logs & Metrics
1. Query structured logs to confirm instrumentation:
   ```sql
   select timestamp, action, metadata
   from public.system_logs
   where component in ('broadcast_notification', 'submit_report', 'block_user')
   order by timestamp desc
   limit 20;
   ```
2. Review any Supabase dashboards or SQL views created for observability (see `docs/observability.md`).

## 6. Cleanup
- Remove test reports or unblock records if they shouldn’t persist.
- Log out of staging accounts and clear any local bearer tokens.

## Notes
- For membership-triggered notifications, run a Stripe test subscription flow and repeat section 4 targeting membership events.
- Update this document when new trust-safety or notification surfaces are introduced.
