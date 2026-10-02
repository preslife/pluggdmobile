# Google Play Data Safety inventory

This inventory is the source for the Play Data Safety form. Re-run the SDK and
network data-flow audit against the final AAB before submission. Regional hosted
checkout does not remove the need to disclose purchase and transaction data
processed by PLUGGD's backend.

## Android update audit — 2026-10-02

This update includes Build 20's Maps signals, date-of-birth age gate, private
Connect Card views, support and creator financial tools. The August inventory
must not be copied unchanged into the update's Play declaration. In particular,
location is **collected optionally**, not "not collected": signal submissions
send coordinates to Supabase even when the user positions the map manually.

The table records actual processing. "Shared" in the Play questionnaire has a
specific definition: an on-behalf-of-PLUGGD service provider or a clearly
user-initiated transfer may qualify for an exemption. Do not equate a vendor
name with either exemption automatically; confirm the integration and current
vendor data-use terms. See Google's [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

| Data category | Collected | Shared | Primary purpose | Handling |
|---|---:|---:|---|---|
| Name and public profile | Yes | User-selected public visibility | Account and creator profile | Linked to account; encrypted in transit |
| Email address | Yes | No | Authentication, safety, support | Linked; not public by default |
| Phone number | User optional | User-selected Connect Card audience | Professional contact | Public/business/contract details follow view and token permissions |
| Address | User optional | Authorised Connect Card audience | Professional contact and contracts | Protected business/contract details, not address-book import |
| Other personal information | Yes for age gate; professional fields optional | User-selected professional fields only | Age assurance and creator identity | Date of birth enforces 16+ accounts/18+ Battle participation; nationality and private professional details remain access-controlled |
| User ID | Yes | No | Authentication, abuse prevention, entitlements | Supabase identifier and opaque billing binding |
| Purchase history | Yes | With payment provider | Billing, fulfilment, fraud, refunds | Play/Stripe/Apple identifiers; no raw card data |
| Payment information | No raw card/bank collection by PLUGGD | Provider-direct | Completing purchases | Play/Stripe collect directly under their own terms; disclose any financial information actually returned to PLUGGD |
| Other financial information | Creator optional | Provider-assisted payout processing | Creator earnings, payouts and accounting | Earnings balances, payout history and transaction records linked to account; private to authorised creator/administration |
| Photos and videos | User optional | No | Profile and UGC | User-selected uploads |
| Audio files and voice | User optional | No | Music uploads and Live | User-selected uploads/live transport |
| Messages, posts, comments | User optional | User-selected recipients/public audience | Community and support | Moderated UGC and support correspondence linked to account |
| Contacts/address book | No | Explicit system-form transfer only | Connect Card save action | Android new-contact form; READ_CONTACTS/WRITE_CONTACTS blocked; PLUGGD does not read or upload the address book |
| Precise location | User optional | Mapbox processing; explicitly chosen venue visibility | Maps discovery, directions and signal publication | Device or selected coordinates; submitted signal coordinates stored privately with account; no background location |
| Approximate location/country | Yes; Maps location optional | Approved approximate signals visible publicly | Regional discovery and commerce policy | Public signals use coarse area unless a venue is explicitly selected; storefront/locale/IP-derived market where required |
| App interactions | Yes | Analytics processors if configured | Reliability and product analytics | No cross-company advertising tracking |
| Crash diagnostics | Conditional | Sentry/Google | Reliability and security | Sentry activates only when its DSN is configured; default PII, screenshots, view hierarchy, logs, and replay are disabled; production retention policy required |
| Device identifiers | Yes | Google/notification provider | Push, security, billing | Expo/FCM push token and Play billing identifiers |
| Files and documents | User optional | No | Beat licences, exports, uploads | App-scoped or signed URLs; access-controlled |

Evidence: `src/features/maps/mapSignalsService.ts` submits `p_latitude` and
`p_longitude`; `src/features/maps/MapSignalsScreen.tsx` optionally uses device
location; `src/features/connect/ConnectCardScreen.tsx` opens only a new-contact
system form; `src/features/legal/legalContent.ts` section 11 describes these
flows. Sentry's production DSN was absent during the 2026-10-02 environment
check; installed SDK presence alone is not evidence of active Sentry collection.

## Security and deletion assertions

- Data is encrypted in transit; sensitive server-held data must use provider
  encryption at rest and least-privilege access.
- PLUGGD does not sell personal data or use app data for cross-app advertising
  tracking.
- Users can initiate permanent account deletion in the app and from
  `https://www.pluggd.fm/account-deletion`. Statutory transaction, fraud, tax,
  and licence records may be retained only as described by the privacy policy.
- Notification URLs, OAuth callbacks, and hosted-checkout callbacks accept only
  PLUGGD-owned hosts and approved internal routes.
- Google Play purchase tokens, Apple signed transactions, and Stripe IDs are
  server-verified and stored only as required for fulfilment, disputes, and
  reconciliation.
- Purchased fan credits and creator cash earnings are separate accounting
  concepts; creator payout details are not exposed to fans.

## Final-AAB audit procedure

1. Produce the exact Play candidate AAB from a clean lockfile.
2. Record every SDK from the Gradle dependency report and Expo config.
3. Compare each SDK's current data collection and sharing behavior with this
   table and the Play SDK Index.
4. Exercise auth, notifications, Maps, Live, uploads, playback, credits,
   subscriptions, Stripe checkout, support, export, and deletion through a
   recording proxy/log review without capturing production secrets.
5. Update this file, the public privacy policy, and Play Console together before
   submission if any behavior differs.
