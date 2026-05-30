# Mobile Supabase Public Loader QA - 2026-05-30

Baseline commit: `46925e6da7df3f0541e67a08ef7469f69210ba04`

Scope:
- Public routes only.
- Navigation and Apple/IAP architecture were not changed.
- No migrations were added.

## Baseline Failures

The prior browser run reported 19 total Supabase `400` / `404` / `406` responses. Route-aware capture showed these were 15 unique request failures; the four Home loaders also ran during signed-out launch, giving the 19 total occurrences.

| # | Route | Request | Status | Classification | Visible UI Impact |
|---|---|---|---:|---|---|
| 1 | signed-out launch | `membership_tiers` | 400 | Missing columns/filter: queried `title`, `creator_id`, `cover_image_url`, `is_active`; table uses `name`, `owner_id`, `image_url`, `status`. | No visible break; campaign/membership rail fell back empty. |
| 2 | signed-out launch | `live_sessions` | 400 | Missing columns/order: queried `viewer_count`, `started_at`, `replay_url`; table uses `scheduled_for`, `recording_url`, `created_at`. | No visible break; live rail used other data/fallback. |
| 3 | signed-out launch | `crowdfunding_campaigns` | 404 | Missing optional table/module. | No visible break; campaign rail fell back empty. |
| 4 | signed-out launch | `campaigns` | 400 | Missing columns/filter: queried `name`, `description`, `cover_image_url`, `image_url`; table uses `title`, `cover_url`, enum `status`. | No visible break; campaign rail fell back empty. |
| 5 | Home | `membership_tiers` | 400 | Same as signed-out launch. | No visible break; campaign/membership rail fell back empty. |
| 6 | Home | `live_sessions` | 400 | Same as signed-out launch. | No visible break; live rail used other data/fallback. |
| 7 | Home | `crowdfunding_campaigns` | 404 | Missing optional table/module. | No visible break; campaign rail fell back empty. |
| 8 | Home | `campaigns` | 400 | Same as signed-out launch. | No visible break; campaign rail fell back empty. |
| 9 | Discover | `session_rooms` | 400 | Missing columns: queried `category`, `viewer_count`, `scheduled_for`, `thumbnail_url`, `creator_avatar_url`; table exposes core room fields only. | No visible break; live section fell back empty. |
| 10 | Discover | `social_trending_hashtags` | 400 | Missing column: queried `hashtag`; table exposes `tag` and `post_count`. | No visible break; hashtags section fell back empty. |
| 11 | Community | `hubs` | 400 | Missing columns/filter: queried `name`, `cover_image_url`, `avatar_url`, `member_count`, `visibility`; current hub shape uses `subtitle`, `hero_image_url`, `hub_type`, `status`. | No visible break; hubs section fell back empty. |
| 12 | Community | `crowdfunding_campaigns` | 404 | Missing optional table/module. | No visible break; crowdfund section fell back empty. |
| 13 | Community | `community_prompts` | 404 | Missing optional table/module. | No visible break; prompt section fell back empty. |
| 14 | Community | `blog_posts` | 400 | Missing columns/filter: queried `slug`, `description`, `cover_image_url`, `image_url`, `status`; table uses `excerpt`, `featured_image_url`, `is_published`. | No visible break; editorial section fell back empty. |
| 15 | Community | `contests` | 400 | Missing columns: queried `name`, `image_url`, `ends_at`; table uses `title`, `cover_image_url`, `end_date`. | No visible break; contests section fell back empty. |
| 16 | Market | `store_products` | 400 | Missing columns: queried `name`, `cover_image_url`, `price_cents`, `kind`, `slug`; table uses `title`, `image_url`, `price`, `product_type`. | No visible break; merch rail fell back empty. |
| 17 | Market | `creator_merchandise` | 400 | Missing columns: queried `name`, `cover_image_url`, `price_cents`, `kind`, `slug`; table uses `title`, `image_url`, `price`, `product_type`, `status`. | No visible break; merch rail fell back empty. |
| 18 | Membership detail | `profiles` | 406 | Empty object handling: `.single()` was used when no profile row was visible for the tier owner ID. | No visible break; page used membership tier fallback content. |
| 19 | Live | `live_sessions` | 400 | Same `live_sessions` column/order mismatch as Home. | No visible break; live page used other data/fallback. |

## Fixes Applied

- Updated Home campaign and membership loaders to use existing columns and valid enum filters.
- Removed direct requests to absent optional modules `crowdfunding_campaigns` and `community_prompts`.
- Updated `live_sessions` loaders to use `scheduled_for`, `recording_url`, `thumbnail_url`, `creator_id`, and `created_at`.
- Updated Discover live-room and hashtag queries to use available columns.
- Updated Community hub, contest, blog, and optional prompt/crowdfund sections to use schema-backed columns or honest empty states.
- Updated Market product/merch loaders to use schema-backed columns.
- Changed Membership detail profile fetch from `.single()` to `.maybeSingle()` for honest empty handling.

## Post-Fix Result

Route-aware public QA after the patch:

- Routes checked: Home, Discover, Community, Events, Market, Wallet, Release detail, Beat detail, Membership index, Membership detail, Event detail, Live, Purchases, Settings.
- Supabase public loader failures: `0`.
- Visible UI impact after fix: none detected.

Signed-in creator QA after the patch:

- Session source: existing local simulator session for `com.pluggd.mobile`; no credentials were printed or committed.
- Creator role verified from profile/roles before browser QA.
- Checked creator `CreateActionSheet`, avatar account sheet, Wallet/Credits, Purchases, Memberships, and Settings restore-purchase links.
- Signed-in Supabase loader failures after fix: `0`.
- Signed-in visible UI issues after fix: `0`.

Additional signed-in optional-loader fixes:

- Skipped absent optional `user_badges` and `user_rewards` modules.
- Changed `challenge_votes` lookup from missing `user_id` to existing `voter_id`.
- Removed missing `profiles.display_name` from the followed-profile loader.
