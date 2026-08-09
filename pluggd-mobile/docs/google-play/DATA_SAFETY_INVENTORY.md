# Google Play Data Safety inventory

This inventory is the source for the Play Data Safety form. Re-run the SDK and
network data-flow audit against the final AAB before submission. Regional hosted
checkout does not remove the need to disclose purchase and transaction data
processed by PLUGGD's backend.

| Data category | Collected | Shared | Primary purpose | Handling |
|---|---:|---:|---|---|
| Name and public profile | Yes | No | Account and creator profile | Linked to account; encrypted in transit |
| Email address | Yes | No | Authentication, safety, support | Linked; not public by default |
| User ID | Yes | No | Authentication, abuse prevention, entitlements | Supabase identifier and opaque billing binding |
| Purchase history | Yes | With payment provider | Billing, fulfilment, fraud, refunds | Play/Stripe/Apple identifiers; no raw card data |
| Payment information | Provider processed | With payment provider | Completing purchases | Raw card/bank details remain on Play or Stripe-hosted surfaces |
| Photos and videos | User optional | No | Profile and UGC | User-selected uploads |
| Audio files and voice | User optional | No | Music uploads and Live | User-selected uploads/live transport |
| Messages, posts, comments | User optional | No | Community and support | Moderated UGC linked to account |
| Contacts | User optional | No | Explicit Connect Card save action | System contact form; PLUGGD does not upload address book |
| Precise location | No by default | No | Not required | Event search uses chosen place/coordinates, not background location |
| Approximate location/country | Yes | No | Regional content and commerce policy | Storefront/locale/IP-derived market where required |
| App interactions | Yes | Analytics processors if configured | Reliability and product analytics | No cross-company advertising tracking |
| Crash diagnostics | Conditional | Sentry/Google | Reliability and security | Sentry activates only when its DSN is configured; default PII, screenshots, view hierarchy, logs, and replay are disabled; production retention policy required |
| Device identifiers | Yes | Google/notification provider | Push, security, billing | Expo/FCM push token and Play billing identifiers |
| Files and documents | User optional | No | Beat licences, exports, uploads | App-scoped or signed URLs; access-controlled |

## Security and deletion assertions

- Data is encrypted in transit; sensitive server-held data must use provider
  encryption at rest and least-privilege access.
- PLUGGD does not sell personal data or use app data for cross-app advertising
  tracking.
- Users can initiate permanent account deletion in the app and from the public
  deletion URL. Statutory transaction, fraud, tax, and licence records may be
  retained only as described by the privacy policy.
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
