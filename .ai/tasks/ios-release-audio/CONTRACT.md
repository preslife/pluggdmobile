# Native release music editor

Goal: bring the released Community music model to the iOS app with an audio workflow matching the supplied TikTok/Instagram references and PLUGGD's established design.

Baseline: installed Build 15 source a9a647d545763bcc90d2c6babb1473f59870b86b (native playback PR #4 remains independently open). Branch codex/ios-release-audio; isolated worktree /private/tmp/pluggd-ios-release-audio. Preserve the original dirty review checkout and existing Build 13–15 artifacts.

Acceptance:
1. A media-first photo/video editor, working library/camera selection, visible media preview and a clear Add music action.
2. A searchable real public-streamable catalogue sheet with cover, title, artist, duration, audition, real saved/recent selections and loading/error/empty states. No dummy Trending/For You tabs or invented counts.
3. A smooth draggable waveform and trim controls with explicit selected start/end/duration, 15/30-second presets within current backend bounds, thumb-sized targets and VoiceOver adjustments. Keep media visible while choosing/editing audio.
4. Exact selected-segment audition, original/music volume and timeline placement; pause competing audio and stop on navigation/background. No full-track source URL returned to the native composer.
5. Real authenticated private upload/render/finished preview/ready-only publication using the deployed APIs; exact recipe and attribution persistence, idempotent retries and resumable drafts. Preserve existing posting audience and destinations.
6. Native release Use this audio, post attribution/reuse and protected public/private derivative playback with fresh session checks and useful unavailable/error states.
7. Preserve existing ordinary posts, polls, release playback, commerce and the active review build. Reuse dependencies and services; no backend migration or entitlement-policy change.
8. Focused behavior checks, TypeScript and one assembled native integration/build gate; inspect actual native render and gestures, and distinguish simulator evidence from physical-device proof.

Allowed surfaces: new src/features/social-music modules and app/create-music-post.tsx; narrow composer/release/feed/model/media-viewer wiring; current existing upload helper/playback hooks; task records and focused behavior tests. Dependency/config changes only if a demonstrated build requirement warrants them. Reference capture/camera effects, general editor overlays/filters, recommendation algorithms and unrelated product redesigns are excluded.

Endpoint: complete checked native implementation and a reviewable/testable iOS candidate. App Store Connect upload/submission and merging native main require the concrete release gate and applicable user authority; do all implementation/build/verification first. No native external submission or branch/worktree deletion is inferred from the earlier web release.

Recovery: retain installed Build 15 and its source; retain prior binaries. New candidate remains isolated until checked. Existing live web/backend stays intact; temporary native test content is private and follows the existing approved cleanup policy. Published media/attribution are retained.

2026-09-30 connected-phone extension: The user asked to include relevant recent work and proceed with the connected iPhone. Include the missing native equivalent of the recently released Live lobby recovery: primary room request errors remain errors, cached rooms survive refresh failure, and lobby/swipe feed expose safe retry/loading states. Allowed additional surfaces are mobileServices.ts, the two Live discovery screens, a small Live error/loader helper and focused failure/cache check. Native active-room status polling already exists and ignores failed/late status responses; no active-call refactor is required. Approve local production-configured Build 16, existing ad hoc signing, installation/update on the paired iPhone and launch/readback. This is an in-place update preserving app data; no uninstall. Main merge and App Store/TestFlight upload remain separate unapproved actions.
