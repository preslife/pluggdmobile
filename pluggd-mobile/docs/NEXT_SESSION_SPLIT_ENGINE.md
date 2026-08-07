# Next session — build native split sheets

Paste the block below into a new session.

---

Build a native Split Engine in the PLUGGD mobile app. Right now `/studio/splits`
is a marketing explainer whose two buttons call
`Linking.openURL('https://pluggd.fm/studio/splits')` — a creator on iPhone cannot
create or sign a split sheet at all. This is a headline feature, so it needs to
work in the app.

**Work in:** `/Users/apple/pluggd-mobile-workspace/.claude/worktrees/pluggd-mobile-design-compare-eaabc5`
on branch `claude/pluggd-aaa-pass` (29 commits, based on the shipping tree
`codex/app-store-submission-final`). The Expo app is in `pluggd-mobile/`.

**Do NOT write any backend.** It is already complete — 12 tables and 20 RPCs in
Supabase project `qkwvqmubhyondemhasjp` (9XHUB). All validation, percentage
maths, approvals, versioning and document generation are server-side.

Tables: `split_agreements`, `split_agreement_participants`, `split_approvals`,
`split_versions`, `split_documents`, `split_document_deliveries`,
`split_join_sessions`, `splits`, `content_splits`.

RPCs to call:
- `fn_get_split_engine_overview` — list a creator's agreements
- `fn_create_split_agreement`
- `fn_upsert_split_participant` / `fn_delete_split_participant`
- `fn_validate_split_agreement`
- `fn_submit_split_for_approval`
- `fn_approve_split`
- `fn_lock_split_version`
- `fn_prepare_split_agreement_revision`

**Check first, before writing UI:** confirm RLS on those tables lets a signed-in
creator read and write their own agreements from the app. An identical
assumption bit us on `public.profiles`, which turned out to deny all reads to
signed-out users and silently returned empty — the fix was a `public_profiles`
view (see `docs/PUBLIC_PROFILE_READS_2026-08-05.md`). Verify with the anon and an
authenticated key rather than assuming.

**Reference implementation (read, don't copy wholesale):**
`/Users/apple/PLUGGD_NEW/src/components/split-engine/TapSplitSheet.tsx` (1,214
lines) and `src/components/CreatorStudio/modules/SplitEngineModule.tsx` (3,313).
That is desktop-grade tooling; mobile needs a focused subset — roughly a list
screen plus a create/edit screen, ~500-700 lines. Ignore
`src/pages/InstantSplitEngine.tsx`, which is a demo page calling
`fn_get_split_engine_demo_payload`.

**Scope:**
1. List the creator's agreements with status
2. Create an agreement against a release / beat / session
3. Add and remove collaborators with percentages, validating to 100%
4. Submit for approval, and approve as a participant
5. Show locked versions and any generated document

**Replace:** the explainer block at `pluggd-mobile/src/features/studio/StudioScreens.tsx`
lines ~1900-1995, and both `Linking.openURL` calls to `pluggd.fm/studio/splits`
(lines ~1925 and ~1991).

**Verifying on the simulator — this all works now, use it:**
- An iPhone Air simulator is booted with a current dev build installed
- Metro: `cd pluggd-mobile && npx expo start --web --port 8081` (also serves iOS)
- Load the app: `xcrun simctl openurl booted "exp+pluggd://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`
- Navigate: `xcrun simctl openurl booted "pluggd://studio/splits"`
- Screenshot: `xcrun simctl io booted screenshot out.png`
- The account is already signed in as Julius Vero
- **Always `export LANG=en_US.UTF-8` before any `pod` command** — without it
  CocoaPods crashes in `unicode_normalize` and the error looks like a Ruby
  version problem. It isn't.
- The `mcp__Claude_Code_iOS_Simulator__control` tool reports a false
  "Xcode not selected" error. Ignore it; `xcrun simctl` works fine.

**Guardrails:**
- Run `node scripts/verify-*.mjs` before committing — all 43 must pass
- `npx tsc --noEmit` must be clean
- Match the surrounding Studio visual language (Sora/Satoshi, `#ff6600`, warm
  near-black). Do not introduce violet; it was deliberately retired.
- Page titles use `pluggdTextStyles.pageTitle` (Sora ExtraBold 32/36)
- Reserve bottom space with `useBottomChromeInset()` on scrolling screens

Context on the design direction and what is still open is in
`pluggd-mobile/docs/DESIGN_DIRECTION_AND_PAGE_PLAN_2026-08-04.md`.
