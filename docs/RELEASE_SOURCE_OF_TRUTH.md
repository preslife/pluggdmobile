# Native release source

Build 13 implementation is frozen at `a09806dac79a7002bf091edbd151b09839bfc64d`; its completed review handoff is `fe6c9cdbe773741f20a8dd779a507f80f6ebe30b`. The saved release record confirms Apple processed and selected `1.0.0 (13)` and the draft has 15 ready items. The founder's walkthrough videos, final attachment readback and explicit Submit for Review approval remain the handoff.

The 2026-09-04 source reconciliation preserves that exact application code in a clean main-based snapshot. GitHub blocked the original commit chain because an older Build 8 commit contained a Mapbox download secret; Mapbox token values are now removed from the committed EAS profiles. Future builds must supply their Mapbox configuration through the existing local environment or managed EAS environment; never commit download tokens. This source cleanup does not alter the already uploaded binary. The original local history remains preserved; it is not bypassed or force-pushed. Generated screenshots, build outputs and signed review PDFs remain local rather than being added to public source history. It changes only release coordination and disables the obsolete native production migration runner. Saving or merging these commits does not create or submit a new app binary.

Workflow: use an isolated branch, verify the change, merge and push to `preslife/pluggdmobile` main. Use the existing frozen build for the current App Store handoff; rebuilds, uploads and final submission are separate actions.

The shared production backend is owned by `preslife/PLUGGD_Build`. Reconcile native backend work into that repository's canonical migrations and function source before deploying. Do not run this repository's legacy migrations against production: many were manually applied and later reconciled under different canonical versions.

The original dirty native workspace and earlier worktrees remain preserved. Do not merge their older file copies over this frozen candidate simply because they appear uncommitted. The coordinating task is `.ai/tasks/platform-release-reconciliation` in PLUGGD_Build.
