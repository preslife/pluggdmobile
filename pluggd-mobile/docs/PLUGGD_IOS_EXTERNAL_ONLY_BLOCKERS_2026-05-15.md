# PLUGGD iOS External-Only Blockers

Status as of 2026-05-15 after the local gap-completion pass.

## Locally Closed

- Consumer-first app shell: Home, Stage, Live, Backstage, Search only.
- Hidden legacy tabs now redirect into the new shell/contextual routes.
- Supabase mobile contracts exist for generic saves, room reminders, native push tokens, mobile clips, and dynamic ticket entry tokens.
- `send-push-notification` Edge Function is deployed with web push preserved and Expo native push added.
- Tickets render real static or rotating QR payloads only.
- Ticket Scan supports camera QR scanning and dynamic/static verification.
- Upload Clip uses Supabase Storage and `mobile_clips` metadata.
- StoreKit credit packs and the `100 credits = £1` model are preserved.
- App typography tokens now target Neue Montreal, Neue Haas Grotesk, and ABC Diatype Monument.
- Automated verification has contract coverage for navigation, commerce, fake data, backend wiring, player persistence, wallet/IAP, Backstage, Live, Stage, Search, typography, and image caching.

## External/Product Decisions Still Required

1. Native physical ticket purchase
   - Needs final payment contract and App Store compliance decision.
   - Until then, iOS must keep ticket purchase CTAs to RSVP/save/status or a future native payment path.

2. Apple Wallet passes
   - Needs Pass Type ID, PassKit certificate, pass signing service, payload format, and revocation/update strategy.
   - The app must not show Apple Wallet add buttons until this exists.

3. Licensed production fonts
   - Add licensed font binaries for Neue Montreal, Neue Haas Grotesk, and ABC Diatype Monument.
   - See `docs/PLUGGD_IOS_TYPOGRAPHY_2026-05-15.md` for expected filenames and load plan.

4. Real role-bearing QA accounts
   - Need one fan account, one creator account, and one promoter/venue account with correct backend roles and permissions.
   - Required to finish signed-in manual QA for Creator Mode, ticket scanning, clip upload, wallet tickets, and role-gated flows.

5. StoreKit sandbox/App Store Connect QA
   - Requires sandbox tester and App Store Connect product availability for the four approved credit packs.
   - Needed to verify purchase, restore, receipt validation, and ledger settlement end to end outside local simulator checks.

6. Production moderation/payment policy
   - Live co-host approval, advanced moderation, gift settlement, and payout-facing workflows need final backend/product contracts.
   - Heavy Creator Studio remains desktop/web only.

## Not External Anymore

- Generic saved content backend model.
- Room-keyed live reminders.
- Mobile push-token backend storage and Expo delivery.
- Mobile clip storage/API.
- Dynamic ticket QR/token backend.
- Stale hidden tab route cleanup.
