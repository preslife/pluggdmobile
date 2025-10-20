# Build Guide Audit & Completion Plan

_Last updated: 2025-10-14_

## Summary
- Stripe checkout, order reconciliation, and tip settlement now match the build guide expectations with session metadata, webhook updates, success routing, and logging in place.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L61-L90】【F:supabase/functions/stripe-webhook/index.ts†L500-L721】【F:src/pages/StoreSuccess.tsx†L1-L214】
- Secure download surfaces and reporting tooling are live, but gating, memberships, and CRM integrations still rely on missing Supabase RPCs and Stripe synchronisation workflows.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L90-L140】【F:src/hooks/useMembershipTiers.ts†L181-L337】【F:supabase/migrations/20250921_membership_tiers_schema.sql†L59-L187】【F:supabase/migrations/20250925093000_post_mvp_revenue_alignment.sql†L1-L49】
- Creator Studio modules pull real campaign and CRM data directly from tables, yet the build guides call for service-layer RPCs, Discord sync tooling, and analytics/logging coverage that are not wired up, leaving critical flows brittle or incomplete.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L116-L189】【F:src/components/CreatorStudio/modules/EnhancedCrowdfundingModule.tsx†L1-L197】【F:src/components/CreatorStudio/modules/EnhancedCRMModule.tsx†L1-L200】【F:src/lib/logger.ts†L1-L160】
- Critical launch requirements remain unmet around SEO image generation, observability coverage, and accessibility QA; i18next-based localisation scaffolding now exists but still requires translation expansion and QA to satisfy roadmap launch gates.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L5-L39】【F:BUILD GUIDES/PLUGGD_MASTER_FEATURESPEC.MD†L4-L15】【F:src/lib/seo.ts†L53-L64】【F:src/lib/i18n/index.ts†L1-L32】

## Remaining Gaps & Recommended Tasks

| Area | Gap Description | Recommended Actions | References |
| --- | --- | --- | --- |
| SEO & Sharing | Dynamic OG image generation has not been implemented; pages rely on static fallbacks despite the roadmap calling for per-entity OG rendering. | Build an OG image generator function (edge route or Supabase function) that renders release/beat/profile art, wire `setMeta` to inject generated URLs, and add regression tests for share cards. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L5-L8】【F:src/lib/seo.ts†L53-L64】 |
| Observability Coverage | Logging utilities exist; checkout success funnel now emits structured events, but membership changes and gating denials still lack coverage required by the roadmap. | Add `logger` or `system_logs` emissions in checkout hooks, library downloads, membership mutations, invite acceptance, and report moderation, and validate dashboards capture these events. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L9-L39】【F:src/pages/StoreSuccess.tsx†L41-L214】【F:src/components/checkout/CheckoutModal.tsx†L1-L120】【F:src/lib/logger.ts†L200-L320】 |
| Internationalisation | i18next localisation stack now initialises at app boot with locale persistence, but only core scaffolding and partial Spanish strings exist—most components still render English copy and lack QA artefacts. | Expand translation coverage across feature modules, add automated checks for locale/currency/date formatting, expose language switcher journeys, and document localisation QA runs. | 【F:BUILD GUIDES/PLUGGD_MASTER_FEATURESPEC.MD†L4-L15】【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L27-L32】【F:src/lib/i18n/resources.ts†L1-L155】【F:src/hooks/useTranslation.tsx†L1-L132】 |
| Mobile & Accessibility QA | Guides call for a focused 360–428px responsive pass and accessibility audits; no dedicated test artefacts or Lighthouse runs are checked in. | Execute responsive QA on landing rails, Studio modules, and checkout; document fixes (tap targets, scroll snapping). Run automated accessibility checks (axe/Lighthouse) and capture findings. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L17-L18】【F:BUILD GUIDES/PLUGGD_MASTER_FEATURESPEC.MD†L4-L11】 |
| Live & Battles polish | Live sessions and contest infrastructure exist but lack production-grade schedules/now-playing tiles and public UI per the roadmap. | Flesh out `/live` schedule components with real-time status, integrate contest/battle flows with `advance-battle-rounds`, and expose participation CTAs. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L20-L23】【F:supabase/functions/advance-battle-rounds/index.ts†L1-L160】 |
| Inbox & Messaging | Unified inbox scaffolding is present without authenticated pagination/composer wiring. | Connect MessagingCenter to Supabase inbox tables, enforce RLS scopes, add pagination & send actions, and provide creator notifications when new messages land. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L20-L24】【F:src/components/MessagingCenter.tsx†L1-L200】 |
| Wallet & Credits Compliance | Wallet UI and functions exist, but ledger invariants, legal copy, and automated tests requested in the roadmap are missing. | Add integration tests for credit spends/refunds, enforce ledger balance constraints in Supabase, surface compliance copy in Wallet, and document manual reconciliation steps. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L24-L40】【F:src/pages/Wallet.tsx†L1-L120】 |
| Course Catalogue | Course payments exist, yet course catalogue, enrollment progress, and completion UX require finalisation per the roadmap. | Connect course listings to Supabase tables, expose progress tracking in fan dashboards, add completion certificates, and ensure enrolment hooks tie into payments. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L24-L26】【F:src/pages/Education.tsx†L1-L160】 |
| Notification Preferences | Notification center shows events but lacks preference management mandated by roadmap. | Implement notification settings under account preferences, add Supabase `notification_prefs` mutations, and respect opt-out flags when emitting events. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L186-L195】【F:src/components/NotificationCenter.tsx†L1-L120】 |
| SEO Consistency | Several routes rely on implicit metadata; roadmap demands consistent `SEOHelmet` usage and sitemap coverage validation. | Audit each route for `setMeta` usage, enforce metadata components, and schedule automated sitemap generation/verification in CI. | 【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L169-L185】【F:src/pages/Index.tsx†L200-L318】 |

## Status Overview

| Area | Build Guide Expectation | Current Implementation | Gap / Risk |
| --- | --- | --- | --- |
| Commerce (orders, tips) | Webhook finalises orders, tips, adds logs; `/store/success` route.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L61-L90】 | `stripe-webhook` marks sessions completed, logs, triggers emails; Store success fetches order by `payment_id` and clears cart.【F:supabase/functions/stripe-webhook/index.ts†L525-L721】【F:src/pages/StoreSuccess.tsx†L41-L214】 | Verified in staging only; need automated tests & Stripe metadata contract documentation. |
| Secure downloads & gating | Use signed URL button post-purchase; gate via `SubscriptionGatedContent` tied to membership tiers.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L74-L115】 | Download button rendered when `purchaseMetadata` exists; gating wrapper used in detail views.【F:src/pages/ReleaseDetail.tsx†L397-L509】【F:src/components/SubscriptionGatedContent.tsx†L33-L119】 | No linkage between editors and `membership_access_rules`; gating is not configurable in Studio. |
| Membership tiers & fan subs | Replace mocks with Supabase RPCs and Stripe sync; expose Discord sync panel.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L90-L123】 | Front-end calls `supabase.rpc('create_membership_tier')`, edge `membership-tier-stripe` exists.【F:src/hooks/useMembershipTiers.ts†L181-L337】【F:supabase/functions/membership-tier-stripe/index.ts†L1-L160】 | RPCs absent from migrations; no automation to invoke Stripe sync; UI errors when RPC returns 404; Discord tab missing implementation. |
| Creator Studio modules | Catalog, CRM, crowdfunding, collaborations, etc. should rely on backend views/RPCs and analytics logging.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L116-L189】 | Crowdfunding & CRM modules query Supabase directly; CRM expects RPC `get_crm_contacts`.【F:src/components/CreatorStudio/modules/EnhancedCrowdfundingModule.tsx†L141-L189】【F:src/components/CreatorStudio/modules/EnhancedCRMModule.tsx†L110-L200】 | RPC definitions like `get_crm_contacts` not shipped; lack of pagination, role-aware filtering, audit logging. |
| Notifications & reporting | Deliver in-app notifications, reporting queue, moderation tools.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L188-L205】 | Notification bell subscribes to realtime table; content reports table + dashboard exist.【F:src/components/NotificationBell.tsx†L26-L200】【F:supabase/migrations/20250814213228_567218bc-43f8-40e8-b6e1-166135d683d0.sql†L19-L91】【F:src/components/ModerationDashboard.tsx†L62-L235】 | Missing preferences, batching, admin workflow automation; no analytics instrumentation for moderation decisions. |
| Observability & analytics | Emit system logs for key flows and surface dashboards.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L205-L214】 | Logger utility ready; checkout/tip flows log to `system_logs`.【F:src/lib/logger.ts†L1-L160】【F:supabase/functions/stripe-webhook/index.ts†L573-L719】 | Logger rarely imported; need standard hooks + dashboards per milestone checklist. |
| SEO, sitemap, OG | Ensure SEO meta usage and sitemap generation across entities.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L214-L231】 | `setMeta` used on success page; `generate-sitemap` function present.【F:src/pages/StoreSuccess.tsx†L102-L214】【F:supabase/functions/generate-sitemap/index.ts†L1-L160】 | Dynamic OG image route not implemented; many pages lack `setMeta`. |

## Detailed Follow-Up Plan

### 1. Commerce Hardening
1. Add Vitest coverage for `create-store-checkout` hook to assert metadata/redirect contract before Stripe webhook fires. 
2. Document webhook payload shapes and idempotency expectations inside `/docs/commerce.md` (new file). 
3. Expand `StoreSuccess` to retry fetch on 404 and capture telemetry via `logger` for funnel analysis. ✅ Logging added across success, error, and release receipt flows.【F:src/pages/StoreSuccess.tsx†L41-L214】【F:src/lib/logger.ts†L200-L320】

### 2. Secure Downloads & Content Gating
1. Extend release/beat/sample editors to persist gating rules to `membership_access_rules` and surface tier selector in Studio UI; add RPCs for read/write to avoid direct table writes.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L104-L114】【F:supabase/migrations/20250921_membership_tiers_schema.sql†L180-L373】
2. Update public-facing pages to query gating metadata and conditionally wrap audio/cards with `SubscriptionGatedContent`, providing tier CTA context pulled from memberships hook.【F:src/components/SubscriptionGatedContent.tsx†L33-L119】
3. Instrument `download-signed-url` and gating denials to `system_logs` to monitor abuse attempts.

### 3. Membership & Fan Subscriptions
1. Ship Supabase RPCs `create_membership_tier`, `update_membership_tier`, `delete_membership_tier` with role checks and Stripe sync triggers (post-commit call to `membership-tier-stripe`).【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L90-L123】【F:src/hooks/useMembershipTiers.ts†L259-L337】
2. Build background job or trigger to enqueue tier changes to Stripe, ensuring `stripe_product_id`/`price` columns stay in sync; update hook to surface errors from service function.【F:supabase/functions/membership-tier-stripe/index.ts†L19-L160】
3. Implement `/studio/memberships/discord` page exposing status, manual sync, and error messaging using `membership_discord_tokens` schema.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L96-L103】
4. Audit `create-fan-subscription` and webhook handling to ensure membership rows update tier counts and unlock content immediately; add integration tests around subscribe/cancel flows.【F:supabase/functions/create-fan-subscription/index.ts†L1-L120】【F:supabase/functions/stripe-webhook/index.ts†L1028-L1083】

### 4. Creator Studio Module Alignment
1. Backfill missing Supabase RPCs/views referenced by UI (e.g., `get_crm_contacts`, catalog listing helpers) to encapsulate joins and RLS; document expected payloads.【F:src/components/CreatorStudio/modules/EnhancedCRMModule.tsx†L110-L200】【F:src/integrations/supabase/types.ts†L8220-L8273】
2. Introduce pagination + filter params to large queries (campaigns, CRM contacts) to avoid client load spikes.【F:src/components/CreatorStudio/modules/EnhancedCrowdfundingModule.tsx†L141-L189】
3. Wire analytics chips in Catalog/CRM modules to `metrics` tables and pipe actions (publish, delete, sync) into `system_logs` using `logger` helper.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L116-L166】【F:src/lib/logger.ts†L1-L160】
4. Add role-aware guardrails in Studio context (label editors vs. creators) to satisfy RLS expectations from build plan.【F:BUILD GUIDES/LABELS_IMPLEMENTATION_PLAN.md†L201-L276】

### 5. Notifications & Moderation Enhancements
1. Create notification preference table + UI toggles; update bell component to respect unread counts server-side instead of optimistic increments.【F:src/components/NotificationBell.tsx†L26-L200】【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L188-L205】
2. Build admin review queue actions tied to edge functions for approving/closing reports, logging each decision for audit.【F:src/components/ModerationDashboard.tsx†L62-L235】
3. Batch notifications for high-volume events and ensure push/email fallbacks remain optional but documented.

### 6. Observability & Analytics
1. Standardise `logger` usage via hooks (`useLogger`) and call within checkout, membership, invitations, reporting flows per build guide.【F:src/lib/logger.ts†L1-L160】【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L205-L214】
2. Populate `/docs/observability.md` with log levels, dashboards, and alert thresholds; ensure edge functions emit structured logs consistently.
3. Align analytics events with KPI list (GMV, membership churn, gate unlock rate) by expanding Supabase functions emitting metrics rows.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L205-L214】

### 7. SEO, Sitemap, and OG Coverage
1. Implement OG image generator endpoint (e.g., `/api/og/:entity`) and reference from Release/Beat/Profile pages.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L214-L231】
2. Enforce `setMeta` usage across core routes (catalog, playlists, Studio) via lint rule or test snapshot.【F:src/pages/StoreSuccess.tsx†L102-L214】
3. Expand sitemap function to include playlists, labels, and campaigns once respective slugs are exposed.【F:supabase/functions/generate-sitemap/index.ts†L1-L160】

## Next Steps
1. **Prioritise SEO & Observability Enhancements** – Ship OG generator, metadata audits, and instrumentation alongside CI checks so analytics and social previews meet launch standards.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L5-L39】【F:src/lib/seo.ts†L53-L64】
2. **Plan an i18n/Accessibility Sprint** – Introduce localisation scaffolding, run Lighthouse/Axe audits, and remediate critical findings to satisfy global conventions.【F:BUILD GUIDES/PLUGGD_MASTER_FEATURESPEC.MD†L4-L15】
3. **Productise Communication & Live Modules** – Wire the messaging centre, live schedule UI, and contest flows to deliver the community features promised in the roadmap.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L20-L24】
4. **Harden Wallet, Courses, and Notification Preferences** – Close the remaining compliance and lifecycle gaps so fans, creators, and admins experience reliable financial and learning flows.【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L24-L40】【F:BUILD GUIDES/POST_MVP_ROADMAP.md†L186-L200】
