# Regression & QA Checklist (2025-10)

_Last updated: 2025-10-17_

## Dynamic OG Image Service
- [ ] Hit `https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/generate-og-image?title=Test&description=Example&type=release` and confirm PNG renders with correct badge and gradients.
- [ ] Share a release and confirm `<meta property="og:image">` points to the new function URL.
- [ ] Verify social debuggers (X, Facebook) render the updated preview.

## Creator Growth Analytics
- [ ] Load Creator Growth dashboard as a host; verify `creator_growth_profile_fetch_start/success` events in `system_logs`.
- [ ] Generate or update referral codes and confirm structured events (`generate_referral_code_*`, `update_referral_code_*`).
- [ ] Copy/share referral link and ensure `copy_referral_link` / `share_referral_link_*` events fire.

## Checkout Observability
- [ ] Run hybrid checkout flow in staging; confirm `checkout_*` telemetry spans cover balance, tax, and payment polling.
- [ ] Trigger checkout error (e.g., decline) and confirm `checkout_purchase_failed` event includes error payload.

## Automated Tests
- [ ] `npm run test` (now silent for GlobalPlayer and Library harness warnings).
- [ ] Smoke `npm run build` to ensure OG helper additions compile.

## Manual Smoke
- [ ] Start dev server (`npm run dev`) and validate Agora call join still works in live session room.
- [ ] Confirm Library downloads still function with tooltip/share interactions after mock adjustments.

## Lighthouse Snapshots (2025-10-17)
- [x] Capture desktop Lighthouse audits for the primary landing, credits checkout, and studio dashboards.
- [x] Track follow-up items called out in the reports below.

| Page | Performance | Accessibility | Best Practices | SEO | Key Findings |
|------|-------------|---------------|----------------|-----|--------------|
| Landing (`/`) | 0.71 | 0.95 | 0.96 | 0.92 | Largest bundle still 5.8 MB; next pass should target code-splitting the hero and Magenta audio helpers. |
| Credits checkout (`/credits/purchase`) | 0.94 | 0.94 | 0.96 | 1.00 | New heading structure and tap targets resolved previous heading-order and contrast violations. |
| Studio (`/studio`) | 0.90 | 0.94 | 0.96 | 1.00 | Sidebar skip link works; consider lazy-loading analytics widgets to claw back perf headroom. |

- [ ] Re-run the Lighthouse set after the next round of bundle optimisations (goal: landing performance ≥ 0.80).
- [x] Document resolved a11y items: hero audience toggle now focus-visible, checkout FAQ uses consistent heading levels, and studio navigation exposes skip link/ARIA labels.
