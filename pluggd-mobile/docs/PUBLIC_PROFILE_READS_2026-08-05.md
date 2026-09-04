# Creator names are invisible to signed-out readers

**Date:** 2026-08-05
**Project:** 9XHUB (`qkwvqmubhyondemhasjp`)
**Status:** diagnosed, client-side mitigation shipped, backend fix **not applied — needs your decision**

## What you saw

Every Soundboard card read "Creator" instead of the creator's name.

## Why

`public.profiles` has exactly two SELECT policies:

| Policy | `USING` |
|---|---|
| Users can view own profile and admins can view all | `auth.uid() = user_id OR <admin>` |
| Users can view profiles when authenticated | `auth.uid() IS NOT NULL` |

There is no anonymous read. Verified directly against the live database with the anon key:

```
GET /rest/v1/profiles?select=user_id&limit=5   ->  []
content-range: */0
```

The rows exist and are populated — Zemi, Lexi Beats, Fly Jones, Black Loyalty are all there with `is_creator = true`. They are simply invisible until you sign in.

**Signed in, names render correctly.** This only affects signed-out browsing — which is the state App Review will be in for most of a first pass, and the state anyone gets before they make an account.

## Everywhere this surfaces

- **Soundboards** — every byline read "Creator"
- **Discover → Creators to Watch** — returned nothing from `profiles`; now derived from release/beat/mix owner fields instead, which are denormalised on the content rows and readable anonymously
- **Search** — creator and user rows collapsed to duplicate React keys (`creator-undefined`), which can drop results, not just warn
- Any other surface reading `profiles` while logged out

## Why it can't be fixed by opening the table

RLS is row-level, not column-level. A policy granting `anon` SELECT on `profiles` exposes **every column of every matching row**, and the table holds:

- `date_of_birth`
- `verification_note`
- `verification_status`

Date of birth is personal data. Do not add a blanket anon SELECT policy to this table.

## Recommended fix: a public projection

A view exposing only the fields that are already public on creator pages.

```sql
create or replace view public.public_profiles
with (security_invoker = off) as
select
  user_id,
  id,
  username,
  full_name,
  avatar_url,
  cover_image_url,
  bio,
  city,
  user_type,
  profile_type,
  is_creator,
  is_verified
from public.profiles
where is_creator = true or user_type in ('artist', 'producer', 'industry');

grant select on public.public_profiles to anon, authenticated;
```

Notes before running it:

- `security_invoker = off` is what lets the view bypass the base table's RLS. That is the point, and it is why the column list must stay tight — **audit it before applying**, and add nothing to it later without the same scrutiny.
- The `where` clause limits exposure to creator-type accounts. Ordinary fan accounts stay private. Drop that clause only if you want every user publicly listable.
- Confirm `bio` and `cover_image_url` are genuinely public on the web creator page before including them; remove them if not.

Then repoint the mobile reads at the view:

| File | Currently |
|---|---|
| `src/features/editorial/SoundboardsIndexScreen.tsx` | `.from('profiles')` |
| `src/lib/mobileContent.ts` (feed loader, ~line 505) | `.from('profiles')` |
| `src/features/search/search-discovery-screen.tsx` | via `mobileServices` |

The web app should use it too — it has the same blind spot signed out.

## What shipped instead, for now

- Soundboard cards show the real name when available and the board's last activity when not, rather than the word "Creator"
- Creators to Watch derives from content owners, so it populates signed-out
- Profile list keys fall back to the array index, so rows can no longer collide

These are honest fallbacks, not the fix. Once the view exists, the Soundboards fallback should go back to showing names.
