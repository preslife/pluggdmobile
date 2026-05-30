# PLUGGD iOS Handoff - 2026-05-18

## Current Direction

The app is being completed page by page with exact implementation requirements. No feature should be treated as a light placeholder. The web app in `/Users/apple/PLUGGD_NEW` remains read-only and is the source of truth for full product behavior.

Bottom nav is currently:

`Home | Stage | Live | Backstage | MyPLUGGD`

Search is a top-bar utility, not a bottom tab.

## Completed Recent Passes

- Home rebuilt as the public PLUGGD front door, not the personal social feed.
- MyPLUGGD rebuilt as the personal social home with `Feed | Circles | Library | Activity`.
- Stage rebuilt to the specified media discovery order.
- Live rebuilt to the specified real-time session order.
- Backstage rebuilt to the specified community/event/forum/ticket-thread order.
- Backstage detail now uses `Posts | Threads | Rooms | Events | Soundboards | Drops`.
- Board detail now uses `Latest | Hot | Tickets | Audio | Events | Questions`.
- Backstage violet sub-accent is now documented and enforced.
- Satoshi Black is enforced for Backstage community cluster headers.
- Real Inter Semi-Bold is loaded and used for Backstage active forums, hot topic threads, and user/count updates.

## Verification At Handoff

Last completed verification after Backstage violet/type update:

- `npx tsc --noEmit`: passed.
- all `scripts/verify-mobile-*.mjs`: passed.
- `npx expo-doctor`: passed, 17/17 checks.
- `git diff --check`: passed.

## Key Files Touched In Latest Pass

- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/features/backstage/backstage-world-screen.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/backstage/[id].tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/community/boards/[slug].tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/community/events/[id].tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/design/typography.ts`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/src/design/tokens.ts`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/app/_layout.tsx`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-backstage-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/scripts/verify-mobile-typography-contract.mjs`
- `/Users/apple/pluggd-mobile-workspace/pluggd-mobile/docs/PLUGGD_IOS_BACKSTAGE_PAGE_TASKS_2026-05-17.md`

## Important Guardrails

- Do not edit `/Users/apple/PLUGGD_NEW`.
- Do not introduce fake counts, fake live states, fake tickets, fake attendee stacks, or fake placeholder rows.
- Do not route board/event/room cards directly to composer unless the UI element is an explicit composer action.
- Keep creator admin out of fan-facing tabs.
- Keep unsupported payment/ticket/QR behavior hidden or honest.
- If mobile is weaker than the web implementation, it is not good enough.

## Suggested Next Page-By-Page Continuation

Continue with the next explicit page spec the user provides. If no new spec is provided, the next highest-value pass is contextual/detail surfaces:

- Profile and edit profile.
- Composer and thread detail polish.
- Event detail and ticket discussion.
- Release, beat, mix, soundboard, sample pack, playlist details.
- Wallet/tickets.
- Notifications/inbox.
- Creator Mode.

Each page should get its own task sheet and contract updates before being considered complete.
