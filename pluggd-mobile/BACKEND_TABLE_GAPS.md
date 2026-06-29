# Mobile → Backend table gaps

_Generated from a data-layer audit on 2026-06-29. The mobile app queries 81 distinct
tables and 29 RPCs. **All 29 RPCs exist.** 8 referenced tables do not exist in the live
Supabase project — but after tracing each, only **2** actually gate a feature; the other
6 are harmless (the feature already works via an existing primary table or RPC). The
mobile code degrades gracefully in every case (`safeList()` / caught errors — nothing
crashes). **These are backend-provisioning items; the mobile code is correct.**_

## A. Genuine feature gaps — please create these tables (or confirm intentionally deferred)

| Table | Used by | Effect today |
|---|---|---|
| `conversation_threads` | `src/features/culture/mobileServices.ts` `loadInboxThreads()` (~L2638) | DM **Inbox always shows its empty state** (no RPC alternative). This is also why the `/inbox/[id]` thread route is unreachable — there's nothing to tap. Build the `/inbox/[id]` detail screen when this ships. |
| `playlist_follows` | `mobileServices.ts` follow/unfollow (~L1131–1137) | "Follow playlist" silently no-ops (insert/delete caught; no RPC alternative). |

## B. Harmless — feature already works via an existing primary table or RPC

No action required (optionally delete the dead fallback to tidy the code).

| Missing table | Feature actually works via | Code |
|---|---|---|
| `user_playlists` | primary table `playlists` | `loadPlaylists()` ~L1012 |
| `playlist_tracks` | primary table `playlist_items` | `loadPlaylistTracks()` ~L1030 |
| `merch_products` | primary table `store_products` | `loadCreatorStorefront()` ~L1143 |
| `creator_memberships` | primary table `membership_tiers` | `loadCreatorMemberships()` ~L1174 |
| `social_reports` | **RPC `report_social_post`** (exists); table is an unreached fallback | `reportSocialPost()` mobileSocial.ts ~L641 |
| `push_tokens` | **RPC `upsert_mobile_push_token`** (exists) in `src/lib/localNotifications.ts` (the real expo-notifications path) | the table-based `registerPushToken()` (mobileServices.ts ~L2654) is **unused dead code** |

## Minor cleanup (optional, mobile-side)
- `registerPushToken()` in `mobileServices.ts` is never called — push registration goes
  through the `upsert_mobile_push_token` RPC. Safe to delete.

## How to re-check

```bash
# from pluggd-mobile/, with EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in .env
# table: a missing one returns PostgREST 42P01 ("relation ... does not exist")
curl -s "$URL/rest/v1/<table>?select=*&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
# rpc: probe with a bogus arg so it never executes; a real function name still
# returns a "Perhaps you meant to call public.<fn>(...)" hint, a missing one does not
curl -s "$URL/rest/v1/rpc/<fn>" -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d '{"__probe__":1}'
```
