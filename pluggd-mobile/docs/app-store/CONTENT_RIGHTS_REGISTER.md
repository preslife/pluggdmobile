# Content Rights Register

Complete this register before submission. No screenshot, preview video, seeded
review account or review build should present material without a recorded basis
for product and, separately, App Store marketing use.

| Asset/content group | Current evidence | App Store marketing | In product | Required action |
|---|---|---:|---:|---|
| PLUGGD logo and wordmark | Repository brand assets, company use and the Account Holder's 1 August 2026 App Store submission direction/content-rights confirmation | Yes | Yes | Approved for PLUGGD product and App Store presentation by the Account Holder. |
| App icon and splash art | `pluggd-mobile/assets/` | Pending owner confirmation | Pending owner confirmation | Record designer/source and assignment to PLUGGD. |
| Still ah Link — Elevatetoday | Production release `85802…`; `distribution_rights_confirmed=true`, `rights_status=pluggd_existing`, `approval_status=auto_approved`; creator Terms grant in `src/pages/Terms.tsx` | Conditional | Yes | Record the exact creator acceptance/audit row and legal confirmation that promotional use covers App Store screenshots. |
| Omo ita — AWABOYZ | Production release `c1e09…` with the same rights/approval flags | Conditional | Yes | Record acceptance timestamp and marketing-use confirmation. |
| MUSE EP — D’YANI | Production release `fe3f6…` with the same rights/approval flags | Conditional | Yes | Record acceptance timestamp and marketing-use confirmation. |
| Other release artwork/audio | Creator catalogue metadata varies | Pending | Pending per item | Add creator agreement/licence reference or exclude it. |
| Beat artwork/audio | No complete marketing-rights evidence attached here | Pending | Pending per item | Clear each beat visible in Home/Discover screenshots or exclude those screenshots. |
| Mix artwork/audio | No complete marketing-rights evidence attached here | Pending | Pending per item | Clear each mix and selector image or exclude it. |
| Soundboard artwork/audio | User/creator submissions | Pending | Pending per item | Record uploader rights assertion and marketing permission. |
| Event artwork/photography | Event partner/photographer | Pending | Pending per item | Add promoter/photographer release and event classification. |
| Profile images and avatars | Creator/user supplied | Pending | Pending per item | Obtain explicit screenshot/marketing permission or use cleared test identities. |
| Kxngdom membership image | Creator identity and tier presentation | Pending | Yes for provisioned tier | Obtain creator approval before using `11-membership-review.png` in App Store Connect. |
| Live and Go Live empty-state UI | PLUGGD UI and wordmark only; no creator or third-party media | Yes | Yes | `artifacts/app-store/submission-2026-08-01/01-go-live-6.5.png` is the approved public upload. |

## Existing product assertions

- `src/components/EnhancedReleaseBuilder.tsx` requires creators to confirm
  distribution rights before publishing.
- `src/pages/Terms.tsx` contains the creator licence used to operate and promote
  the service. Legal/product sign-off must still record whether each selected
  screenshot is within that licence.
- Production rights flags are evidence, not a substitute for the underlying
  acceptance record or third-party contributor releases.

Release gate: every `Pending` or `Conditional` item visible in submitted
metadata must be resolved to `Yes` with retrievable evidence, or the material
must be replaced with cleared PLUGGD-owned/test content.

## Submitted public set

- `artifacts/app-store/submission-2026-08-01/01-go-live-6.5.png`
  (1284×2778) — PLUGGD Live Studio UI and PLUGGD wordmark only.
- Uploaded to the 6.5-inch iPhone slot on 1 August 2026.
- All catalogue artwork, avatars, event photography and creator imagery remain
  excluded from the public App Store set until their individual evidence is
  linked above.
