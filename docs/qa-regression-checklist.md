# Regression & QA Checklist (2025-10)

_Last updated: 2025-10-14_

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

## Sitemap & SEO Metadata
- [ ] `npm run lint` (fails if any route is missing `setMeta`/`usePageMetadata` coverage).
- [ ] `npm run sitemap:generate` and confirm playlists, label storefronts, and crowdfunding campaigns appear in the XML payload.
