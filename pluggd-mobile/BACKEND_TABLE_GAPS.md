# Mobile → Backend table gaps

_Generated from a data-layer audit on 2026-06-29. The mobile app queries 81 distinct
tables; 8 of them do not exist in the live Supabase project. The mobile code degrades
gracefully in every case (queries go through `safeList()` / caught errors, so nothing
crashes), but four of these gate real user features that currently no-op or show an
empty state. **These are backend-provisioning items — the mobile code is correct.**_

## A. Gate a real feature — please create these tables (or confirm intentionally deferred)

| Table | Used by | Effect today |
|---|---|---|
| `conversation_threads` | `src/features/culture/mobileServices.ts` `loadInboxThreads()` (~L2638) | DM **Inbox always shows the empty state**. (Also why the `/inbox/[id]` thread route is unreachable — there's nothing to tap. Build the `/inbox/[id]` detail screen when this ships.) |
| `playlist_follows` | `mobileServices.ts` follow/unfollow (~L1131–1137) | "Follow playlist" silently no-ops (insert/delete caught). |
| `push_tokens` | `mobileServices.ts` `registerPushToken()` (~L2658) | Push-notification device registration silently fails. (Code is contract-pinned, so the reference is intentional — table just isn't provisioned.) |
| `social_reports` | `src/features/culture/mobileSocial.ts` report flow (~L652) | "Report post" silently fails. |

## B. Harmless — feature already works via an existing primary table

These are legacy fallback / supplementary sources. The primary table exists and is used
first, so the missing table never affects behavior. No action required (safe to leave, or
delete the dead fallback branch if you want to tidy the code).

| Missing fallback | Primary table actually used (exists) | Code |
|---|---|---|
| `user_playlists` | `playlists` | `loadPlaylists()` ~L1012 |
| `playlist_tracks` | `playlist_items` | `loadPlaylistTracks()` ~L1030 |
| `merch_products` | `store_products` | `loadCreatorStorefront()` ~L1143 |
| `creator_memberships` | `membership_tiers` | `loadCreatorMemberships()` ~L1174 |

## How to re-check

```bash
# from pluggd-mobile/, with EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in .env
# a missing table returns PostgREST error 42P01 ("relation ... does not exist")
curl -s "$URL/rest/v1/<table>?select=*&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
