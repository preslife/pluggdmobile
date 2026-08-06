# Native Split Engine on mobile

**Date:** 2026-08-06
**Project:** 9XHUB (`qkwvqmubhyondemhasjp`)
**Status:** shipped in the app; two backend observations below need your decision

`/studio/splits` was a marketing explainer whose buttons opened
`pluggd.fm/studio/splits`. It is now a working tool: list, create, edit shares,
send for approval, approve or decline, lock, and read the signed record. No
backend was written — every rule still lives in Postgres.

## RLS was checked before any UI was written

Verified against the live database and read off
`20260510014000_fix_split_engine_rls_recursion.sql` and
`20260523120000_connect_card_tap_split_sheet.sql`, not assumed.

| Table | SELECT for a signed-in creator |
|---|---|
| `split_agreements` | owner **or** admin **or** participant |
| `split_agreement_participants` | your own row **or** owner/admin |
| `split_versions` | owner **or** admin **or** participant |
| `split_approvals` | your own row **or** owner/admin |
| `split_documents` | owner **or** admin **or** participant (service writes only) |

Anonymous reads return `[]` on every one of these, which is correct — these are
private legal records. All seven RPCs are granted to `authenticated`.

**The one that shapes the UI:** `split_agreement_participants` resolves to
*your own row or owner/admin* — being a participant is not enough. A
collaborator opening a sheet to approve it can read the agreement and their own
row, but **not the other participants**. Approving a split you cannot see would
be worthless, so for a non-owner the app renders the **version snapshot**
instead, which `split_versions` does expose to participants. `SplitDetailData`
carries both `participants` (live, owner) and `snapshotParticipants` (snapshot,
collaborator).

Because a silent empty list is exactly how the `public.profiles` gap hid for so
long (see `PUBLIC_PROFILE_READS_2026-08-05.md`), the loaders in
`src/features/studio/split-engine.ts` **throw** rather than using
`safeList`/`safeMaybe`. That is not defensive noise — it immediately surfaced a
wrong column name during verification that would otherwise have shown up as an
empty picker.

## Two things worth your decision

### 1. `session` agreements exist but cannot be created

Live data contains agreements with `content_type = 'session'` — Julius Vero has
five of them. But:

- `split_agreements_content_type_check` in the core migration allows only
  `beat`, `release`, `pack`
- `fn_split_engine_owner_user_id` raises `invalid_content_type` for anything else

So the deployed constraint and the migration on disk disagree, and sessions can
be read but never created or re-created. The app reflects reality: it renders
`session` correctly wherever it appears, and offers only release/beat/pack when
starting a new sheet (`CreatableContentType`). **If sessions are meant to be
first-class, `fn_split_engine_owner_user_id` needs a `session` branch pointing at
whichever table owns them.** The original brief asked for "release / beat /
session", which is why this is called out rather than quietly dropped.

### 2. Editing a sent sheet silently resets approvals

`fn_upsert_split_participant` and `fn_delete_split_participant` call
`fn_prepare_split_agreement_revision`, which reopens a non-draft agreement as a
draft and supersedes the pending version. That is sound, but destructive from
the creator's point of view. The app now warns before saving:

> Saving reopens this sheet as a draft and clears approvals already given.

## Flow the app implements

`draft` → add collaborators → all three columns must total 100% →
`fn_submit_split_for_approval` (snapshots participants, creates approval rows,
auto-approves the submitter and anyone not requiring approval) → `pending_approval`
→ each participant calls `fn_approve_split` → `approved` when none are pending,
back to `draft` if anyone declines → owner calls `fn_lock_split_version` →
`locked`, prior locked versions become `superseded`.

Validation requires **all three** of revenue, publishing and content ID to hit
100% within 0.01, and at least one participant. The totals bar in the app mirrors
this so the send button is only enabled when the server would accept it; the
server remains the authority.

## A repo-wide rendering bug found on the way

**Function styles on `Pressable` are silently dropped in this app.** With
NativeWind v4's JSX runtime (`importSource: "nativewind"` plus the
`react-native-css-interop` babel plugin), this renders with no styles at all:

```tsx
<Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]} />
```

while this works:

```tsx
<Pressable style={styles.row} />
<Pressable style={[styles.row, active && styles.rowActive]} />
```

Rows collapse to a column, backgrounds and radii vanish. The codebase already
uses the plain form at 228 call sites, which is why this went unnoticed — but
**14 call sites in `StudioScreens.tsx` still use the function form and are
rendering unstyled today**, including `studioExitButton` (the Studio back button,
which should be a 44×42 bordered pill and currently renders as a bare arrow).
Those are outside the scope of this change and were left alone.

## Files

- `src/features/studio/split-engine.ts` — types, loaders, RPC wrappers
- `src/features/studio/SplitEngineScreens.tsx` — list panel, create picker, sheet
- `src/features/studio/studio-tokens.ts` — palette shared with `StudioScreens`
- `app/studio/splits/new.tsx`, `app/studio/splits/[id].tsx` — new routes
- `studio-data.ts` — the splits module is now `status: 'native'`
- `verify-mobile-studio-web-parity-contract.mjs` — asserts the module reaches the
  RPCs and that no path back to `pluggd.fm/studio/splits` survives

## Verified

43/43 contracts, `tsc --noEmit` clean, and driven on the booted iPhone Air as
Julius Vero: the list renders live agreements with status, a draft sheet shows
100/100/100 validating green with editable shares, a locked sheet is read-only
with its version history and signed document, and the create picker lists owned
content with artwork.

Not exercised by a real tap: the collaborator search modal and the final
create-on-tap write. The simulator MCP tool reports a false
"Xcode is installed but not selected" error, so there was no way to inject touch
events; navigation was done by deep link. Creating a new agreement also seeds
release licensing options as a side effect, so it was left untriggered rather
than writing to production data unprompted.
