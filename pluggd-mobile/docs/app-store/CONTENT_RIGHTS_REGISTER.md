# Content Rights Register

Complete this register before submission. No screenshot, preview video, seeded
review account or review build should present material without a recorded basis
for product and, separately, App Store marketing use.

| Asset/content group | Current evidence | App Store marketing | In product | Required action |
|---|---|---:|---:|---|
| PLUGGD logo and wordmark | Repository brand assets and company use | Pending owner confirmation | Pending owner confirmation | Record the company-owned source file and approver. |
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
| Live and Go Live empty-state UI | PLUGGD UI, logo and account initial only | Pending brand confirmation | Yes | After logo ownership is recorded, these are the lowest-risk screenshot candidates. |

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
