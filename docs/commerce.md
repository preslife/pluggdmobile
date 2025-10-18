# Commerce & Wallet Reconciliation Procedures

This document outlines how the commerce team verifies wallet balances, reconciles them against payment processors, and documents any manual adjustments. These procedures assume familiarity with Supabase SQL tools and Stripe dashboards.

## Daily reconciliation checklist

1. **Confirm the ledger integrity triggers are healthy.**
   - Run `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'wallet_ledger_enforce_balance%';` in the analytics database. The trigger created in `20250926020000_wallet_ledger_balance_integrity.sql` must be enabled. If it is disabled, re-enable it with `ALTER TABLE public.wallet_ledger ENABLE TRIGGER wallet_ledger_enforce_balance_trigger;` and notify the engineering team.
   - Inspect the `wallet_ledger_balance_non_negative` constraint via `\\d public.wallet_ledger` to ensure it remains in place.

2. **Reconcile credits sold vs. Stripe payouts.**
   - Export a CSV of Stripe credit top ups for the previous day, grouped by customer and checkout session.
   - Query Supabase for matching rows: `SELECT * FROM public.wallet_ledger WHERE kind = 'topup' AND created_at::date = CURRENT_DATE - INTERVAL '1 day';`
   - Differences must be noted in the reconciliation log and investigated before end-of-day sign-off.

3. **Check pending vs. available credits.**
   - Use `SELECT * FROM public.v_wallet_balances ORDER BY pending_credits DESC LIMIT 50;` to inspect large pending balances. Pending credits should age out after 48 hours. Escalate anything older than three days.
   - For any discrepancy, cross-reference Stripe dispute or refund reports to confirm whether a manual reversal is required.

4. **Validate refunds and clawbacks.**
   - Run `SELECT * FROM public.wallet_ledger WHERE meta->>'reason' IN ('refund', 'chargeback') AND created_at::date = CURRENT_DATE - INTERVAL '1 day';`
   - Ensure every reversing entry has a matching original `ref_id` and `counterparty_user_id`. Missing references indicate a failed webhook that requires manual repair.

5. **Sign off and archive.**
   - Summarise the day's findings in the shared reconciliation Google Sheet (tab: `Wallet Ledger`). Include columns for date, reviewer, total credits sold, total refunds, and outstanding investigations.
   - Archive supporting exports (Stripe CSV, Supabase query results) in the `s3://pluggd-ops-reports/<YYYY-MM-DD>/` bucket.

## Handling exceptions

- **Trigger violation:** If an insert fails with `Insufficient credits`, confirm whether the user attempted to overspend. If the failure stems from manual intervention, recreate the ledger entry via the `process-credits-transaction` function so balance columns remain correct.
- **Manual adjustments:** Any direct SQL `INSERT` into `wallet_ledger` must include a support ticket reference in `meta->>'case_id'` and be approved by finance. After insertion, verify `balance_before` and `balance_after` against the user's historical ledger.
- **Chargebacks:** When Stripe notifies us of a chargeback, run the `handleChargeReversal` function manually if the webhook was missed. Document the charge ID, ledger IDs affected, and communication with the customer.

## Reporting cadence

- **Weekly:** Produce a report summarising total credits sold, spent, and refunded. Use the ledger snapshot query:
  ```sql
  SELECT
    date_trunc('week', created_at) AS week,
    SUM(CASE WHEN amount_credits > 0 THEN amount_credits ELSE 0 END) AS credits_in,
    SUM(CASE WHEN amount_credits < 0 THEN amount_credits ELSE 0 END) AS credits_out
  FROM public.wallet_ledger
  GROUP BY 1
  ORDER BY 1 DESC;
  ```
- **Monthly:** Reconcile cumulative wallet balances against deferred revenue accounts in the general ledger. Export `v_wallet_balances` and compare to accounting system balances. Differences greater than £50 require an incident ticket.

Maintaining these routines keeps wallet liabilities in line with processor settlements and ensures that support, finance, and engineering teams have a shared, auditable source of truth.
