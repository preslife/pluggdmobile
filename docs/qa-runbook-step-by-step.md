# QA Runbook – Step-by-Step (Non-Obvious Tasks)

Use this as a companion to `docs/qa-regression-checklist.md`. It focuses on the steps that are not straightforward UI clicks. Keep notes of pass/fail and evidence (screenshots or log snippets).

## Prerequisites
- You have environment variables set in `.env` (Stripe test keys, Supabase keys, `VITE_MAPBOX_TOKEN`, Agora keys).
- App is running locally (`npm install`, then `npm run dev`) and Supabase is reachable.
- Access to:
  - Supabase Dashboard (SQL editor, Logs, Storage)
  - Stripe Dashboard (test mode)
  - Resend/email provider dashboard (if available) for email verification
  - Browser devtools (Network tab, console)

## How to Check Supabase Logs Quickly
1) Go to Supabase Dashboard → Project → Logs.
2) Use filters:
   - `function: generate-og-image` for OG image calls.
   - `rpc: get_follow_feed` or other RPC names when validating feeds/catalog.
   - `channel: system_logs` for structured app logs.
3) Time-range: set to “Last 15 minutes” when you trigger an action so the event appears.

## Dynamic OG Image Service
1) In a browser, open:  
   `https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/generate-og-image?title=Test&description=Example&type=release`
2) Expect: A PNG download/render with the title/description and badge.
3) Validate logs: Supabase Dashboard → Logs → filter `function: generate-og-image`. Confirm 200 response and no errors.

## Creator Growth Analytics (events + Supabase data)
1) Open Studio → Analytics → Growth. Interact (filter/change date) to trigger events.
2) In a new tab, open Supabase Dashboard → SQL and run:  
   `select event_name, payload->>'profile_id' as profile_id from system_logs where event_name ilike 'creator_growth_%' order by created_at desc limit 20;`
3) Expect recent `creator_growth_profile_fetch_start/success` rows matching your profile.
4) For referral code actions, run:  
   `select event_name, payload from system_logs where event_name like 'generate_referral_code%' or event_name like 'update_referral_code%' order by created_at desc limit 20;`

## Search Experience & Mobile UX (network debounce)
1) Open `/search`, type a query, watch the Network tab. Verify requests are ~250 ms after typing stops.
2) Keyboard: Use arrow keys/Home/End and Enter; confirm highlighted card opens.
3) Mobile widths: set devtools to 360–428 px. Ensure buttons meet ~44 px height. Note any horizontal scroll.

## Catalog Management (RPC verification)
1) Go to `/studio/catalog`. Switch tabs (Releases, Beats, Packs, Merch, Bundles, Collectibles), type a search term, change status filter.
2) In Network tab, look for Supabase POST calls to `/rest/v1/rpc/get_catalog_items`. Confirm payload includes tab type, filters, search, sort.
3) In Supabase Logs, filter `rpc: get_catalog_items` to confirm queries succeed (200) and return recent timestamps.

## Social Feed (get_follow_feed)
1) Seed follow relationships if needed (via existing UI): follow at least one creator.
2) Visit `/home`. Scroll to trigger “load more”.
3) Network tab: confirm `/rest/v1/rpc/get_follow_feed` requests with `p_user_id`, `p_limit`, `p_offset`.
4) Supabase Logs: filter `rpc: get_follow_feed`; expect descending timestamps and no errors.

## Unified Inbox (cron jobs and fetch RPC)
1) Connect Gmail/Discord via Studio → Plugins.
2) Click “Manual poll” for each provider.
3) Network tab: confirm `get_unified_inbox_messages` RPC calls.
4) Supabase Logs: filter `cron.job`; run SQL:  
   `select jobname, schedule from cron.job where jobname like 'inbox-fetch-%';`  
   Expect entries for gmail/discord/youtube/instagram.

## Checkout Observability
1) Run a successful checkout (test card `4242 4242 4242 4242`) and a declined one (e.g., `4000 0000 0000 0002`).
2) Supabase Logs: filter `event_name: checkout_*` in `system_logs`.
3) SQL check:  
   `select * from public.vw_checkout_activity_daily order by activity_date desc limit 7;`  
   Expect rows for the dates you tested with status and revenue columns populated.

## Memberships & Gating
1) Create a tier and publish.
2) Trigger gated content access:
   - As non-member: open gated post/release, expect lock screen.
   - As member (after purchase/upgrade): reload, expect unlocked.
3) Supabase: check membership state via SQL:  
   `select status, current_period_end from memberships order by updated_at desc limit 5;`
4) Discord sync: if enabled, check Supabase Logs for `function: discord-sync-subscriber`.

## LMS / Learn
1) Set `VITE_FEATURE_LMS=true` in `.env` and restart dev server if needed.
2) Visit `/learn` and interact with filters.
3) Network: look for `get_lms_courses` RPC calls; confirm 200.
4) Complete lessons; run SQL:  
   `select * from lms_course_progress order by updated_at desc limit 5;`  
   Expect your user ID and percent updates.

## Wallet & Credits
1) Seed credits if UI supports it (promo or admin grant). Note balance.
2) Make a purchase using credits (split tender if available).
3) SQL checks:  
   - Ledger: `select * from wallet_ledger order by created_at desc limit 10;`  
   - Balances: `select * from wallet_balances order by updated_at desc limit 5;`
   Expect new debit/credit rows matching your actions.

## Messaging & Inbox (real-time)
1) Send a DM fan → creator. Confirm immediate appearance.
2) Supabase Logs: filter `channel: realtime` and table `messages` to see insert events.

## Trust & Safety (Reporting & Blocking)
1) Submit a report from a release/beat page.
2) SQL:  
   `select status, reporter_id from content_reports order by created_at desc limit 5;`  
   Expect your report with `status = 'pending'`.
3) Block/unblock a user via the provided UI; confirm RPC success in Network tab (`block_user`, `unblock_user`).

## Notifications v1
1) Trigger an order, tip, and membership subscription.
2) Supabase Logs: filter `function: broadcast-notification`.
3) SQL:  
   `select type, read_at from notifications order by created_at desc limit 10;`  
   Expect new rows with `read_at` null until you open them.

## Lifecycle Emails
1) Create a new fan and creator account. Complete a store checkout.
2) Check email provider dashboard (Resend or similar) for `fan_welcome`, `creator_welcome`, `order_receipt_email`, `creator_first_earnings`.
3) If dashboard not available, use Supabase Logs filter `function: send-*` (e.g., `send-subscription-email`) to confirm dispatch attempts.

## Live Sessions (Agora)
1) Schedule a live session with tickets.
2) Join as host and as attendee in another browser/incognito.
3) Confirm Agora connects: in Network tab, look for `create-live-session-token` function call returning 200.
4) SQL:  
   `select status, started_at, ended_at from live_sessions order by updated_at desc limit 5;`  
   Expect the session you created to move to “live” then update on end.

## Stripe Commerce Flows (Manual)
1) **Creator onboarding**: Start Stripe Connect onboarding from Studio → Financials. In Stripe test dashboard, confirm account created. Supabase SQL:  
   `select onboarding_status from stripe_connect_accounts order by updated_at desc limit 5;`
2) **Membership purchase**: Buy a membership tier; check Supabase `memberships` table and Stripe test subscription record.
3) **One-time checkout**: Buy a release/beat bundle; verify order row in `store_orders` (or equivalent order table) via SQL ordered by created_at.
4) **Dispute simulation**: In Stripe test dashboard, use dispute test card (`4000 0000 0000 0259`), mark evidence submitted; Supabase Logs filter `event.type: charge.dispute.*`.
5) **Payout rehearsal**: Trigger a manual payout in Stripe test; SQL:  
   `select * from payout_records order by created_at desc limit 5;`

## Release Gifting
1) Purchase a gift (scheduled and instant).
2) SQL:  
   `select status from release_gift_queue order by created_at desc limit 5;`  
   Expect `pending` → `delivered` after cron/processing.
3) Supabase Logs: filter `gift_queue_run_summary` events.

## Gated Content Verification
1) Publish gated post with tier restriction.
2) As non-qualifying user: confirm lock screen.
3) As qualifying user: confirm download/stream works and signed URL loads (check Network for 200 on asset URL).
4) Supabase SQL:  
   `select * from release_access_cache order by created_at desc limit 5;`  
   Expect a cache row when you hit `verify-release-access`.

## OG Sharing Manual Validation
1) Open social debuggers:
   - X Card Validator: paste your release/membership/live URL.
   - Facebook Sharing Debugger: paste URL, hit “Scrape Again”.
2) Confirm refreshed `og:image` and summary text.
3) If using smartlinks/short URLs, click them and confirm redirect + meta tags (Network: follow 301/302 to final page).

## Automated Tests (when you have CLI access)
- `npm run lint`
- `npm run test`
- `PLAYWRIGHT_BASE_URL=http://localhost:4173 npm run test:e2e`
If anything fails, capture the failing spec name and error message.
