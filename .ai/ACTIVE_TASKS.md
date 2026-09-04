# Active PLUGGD Tasks

This is the controlling task registry for this mobile worktree. Match both branch and worktree before resuming work.

| Status | Task | Task folder | Branch | Worktree | Base | Target | Next action | Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ACTIVE | iOS Complete-Parity Integration | `.ai/tasks/ios-native-parity-build8-recovery` | `codex/ios-build12-live-community-carnival` | `/private/tmp/pluggd-ios-build12-live-community` | `f9dc4194` | `main` | Complete the bounded Build 13 PLUGGD Plans lane: secure provider-neutral Free/Starter/Creator/Pro entitlement source, six-product StoreKit lifecycle, native Plans screen and Account/Studio entry points; then run focused source/render gates before one replacement phone build. | Preserve the original dirty web/mobile checkouts, Build 11/12/13 rollback artifacts, local `.env`, `.playwright-cli/` and the now-stale successful pre-Plans Build 13 archive. No production deploy/migration, merge, push, archive upload, App Store mutation or submission outside its recorded gate. |

## Status values

- `ACTIVE`: The task exists and is awaiting or performing authorised work.
- `BLOCKED`: Progress requires an explicitly recorded external decision or dependency.
- `READY_TO_MERGE`: Verification passed and explicit integration approval is still required.
- `MERGED`: Work is on the target branch and cleanup is recorded.
- `CLOSED`: No work remains.

## Rules

- Do not resume this task from another branch or worktree.
- Read the task `CONTRACT.md` and `PROGRESS.md` before acting.
- Do not re-audit when `AUDIT_REQUIRED=false`.
- Do not edit product/source code when `CODE_EDIT_ALLOWED=false`.
- Never merge into `main`, mutate production, or submit an App Store build without explicit user approval.
