# Release Readiness Runbook

This runbook captures the pre-flight steps that must be completed before tagging a production release. It replaces the ad-hoc launch notes and ties directly into the regression checklist.

## 1. Planning & Approvals
- Confirm scope with product/engineering leads; ensure rollout notes cover memberships, wallet, messaging, and live updates.
- Verify migrations and feature flags are listed in the release ticket with owners.
- Schedule release window and notify support/community teams.

## 2. QA Sign-off
- Complete every item in [`docs/qa-regression-checklist.md`](./qa-regression-checklist.md); attach the exported checklist to the release ticket.
- Review attached artifacts for Stripe, gating, and OG sharing scenarios.
- Capture any deviations as bugs with mitigation/rollback plans.

## 3. Data & Observability
- Confirm Supabase logs/metrics dashboards for checkout, memberships, and live sessions are green.
- Snapshot wallet ledger balances and membership subscription counts for post-release comparison.
- Ensure alerting rules cover Stripe webhook failures, Agora disconnects, and messaging queue delays.

## 4. Deployment Steps
1. Merge release branch and tag (e.g., `v2025.10.x`).
2. Run `npm run build` and Supabase migrations in staging; verify success before production.
3. Promote edge functions (OG generator, wallet webhooks) and confirm version numbers.
4. Deploy production build via CI; monitor until completion.

## 5. Post-Release Checklist
- Smoke test live session entry, membership gating, wallet debits, and messaging notifications in production.
- Review Stripe payouts/charges for anomalies within the first hour.
- Update release notes with links to artifacts stored under `docs/artifacts/`.
- Close release ticket once monitoring window elapses with no severity-1 incidents.
