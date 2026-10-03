# Google Play Data Safety inventory

This inventory is the source for the Play Data Safety form. Re-run the SDK and
network data-flow audit against the final AAB before submission. Regional hosted
checkout does not remove the need to disclose purchase and transaction data
processed by PLUGGD's backend.

## Android update audit — 2026-10-02/03

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
| Address | User optional | On-behalf shipping/payment processing and user-selected professional audience | Physical fulfilment and professional account details | Stripe checkout returns shipping address to the PLUGGD orders ledger; the controlled hosted Connect Card saves optional company_address. Not address-book import |
| Other personal information | Yes for age gate; professional fields optional | User-selected professional fields only | Age assurance and creator identity | Date of birth enforces 16+ accounts/18+ Battle participation; nationality and private professional details remain access-controlled |
| User ID | Yes | No | Authentication, abuse prevention, entitlements | Supabase identifier and opaque billing binding |
| Purchase history | Yes | With payment provider | Billing, fulfilment, fraud, refunds | Play/Stripe/Apple identifiers; no raw card data |
| Payment information | No raw card/bank collection by PLUGGD | Provider-direct | Completing purchases | Play/Stripe collect directly under their own terms; disclose any financial information actually returned to PLUGGD |
| Other financial information | Creator optional | Provider-assisted payout processing | Creator earnings, payouts and accounting | Earnings balances, payout history and transaction records linked to account; private to authorised creator/administration |
| Photos and videos | User optional | No | Profile and UGC | User-selected uploads |
| Audio files and voice | User optional | No | Music uploads and Live | User-selected uploads/live transport |
| Messages, posts, comments | User optional | User-selected recipients/public audience | Community and support | Moderated UGC and support correspondence linked to account |
| Contacts/address book | No | Explicit system-form transfer only | Connect Card save action | Android new-contact form; READ_CONTACTS/WRITE_CONTACTS blocked; PLUGGD does not read or upload the address book |
| Precise location | User optional | Yes: Mapbox location/telemetry processing; explicitly chosen venue visibility | App functionality and Mapbox analytics | Device or selected coordinates; submitted signal coordinates stored privately with account; no background location; SDK attribution supplies telemetry opt-out |
| Approximate location/country | Yes; Maps location optional, other regional collection may be required | Yes: Mapbox processing; approved approximate signals visible publicly | App functionality, regional commerce policy and Mapbox analytics | Public signals use coarse area unless a venue is explicitly selected; storefront/locale/IP-derived market where required; do not mark the whole category optional without checking every collection path |
| App interactions | Yes | Yes: Mapbox independent map-use analytics; other processors only if configured | Reliability and product analytics | Mapbox telemetry is not omitted under a blanket service-provider exemption; no cross-company advertising tracking |
| Crash diagnostics | Conditional | Sentry/Google | Reliability and security | Sentry activates only when its DSN is configured; default PII, screenshots, view hierarchy, logs, and replay are disabled; production retention policy required |
| Device identifiers | Yes; required when Firebase auto-init is configured | Yes for Mapbox telemetry session IDs; Firebase/Expo processing may qualify as an on-behalf-of service-provider exemption | App functionality, push, security, billing and Mapbox analytics | Expo/FCM push token, Firebase installation ID, Play billing identifiers and rotating Mapbox telemetry session IDs; declining notification permission alone does not stop Firebase installation-ID collection |
| Files and documents | User optional | No | Beat licences, exports, uploads | App-scoped or signed URLs; access-controlled |

Evidence: `src/features/maps/mapSignalsService.ts` submits `p_latitude` and
`p_longitude`; `src/features/maps/MapSignalsScreen.tsx` optionally uses device
location; `src/features/connect/ConnectCardScreen.tsx` opens only a new-contact
system form; `src/features/legal/legalContent.ts` section 11 describes these
flows. Sentry's production DSN was absent during the 2026-10-02 environment
check; installed SDK presence alone is not evidence of active Sentry collection.

Mapbox telemetry is transferred before anonymisation and is used for Mapbox's
own service improvement; do not omit it under a blanket processor, ephemeral or
fully-anonymous exemption. Both native MapViews retain attribution controls in
source, but the user-facing opt-out still needs rendered device verification.
FCM/Firebase Installations auto-init is not disabled in source; confirm its
Google-services configuration in the exact compiled candidate. References:
[Mapbox privacy FAQ](https://www.mapbox.com/legal/legal-faq),
[Mapbox telemetry](https://www.mapbox.com/telemetry), and
[Firebase Play disclosure](https://firebase.google.com/docs/android/play-data-disclosure).

Hosted address evidence at deployed web source d2c754f0: the native basket calls
enhanced-store-checkout; physical goods request shipping_address_collection.
stripe-webhook receives shipping_details.address and passes it through
storeInventoryAccounting to complete_store_order_with_inventory, which persists
orders.shipping_address. CreatorStudio/modules/ConnectCardModule saves optional
company_address from the first-party professional form opened by the native
editor. A native-only input search would miss both controlled hosted paths.

On 3 October the updated questionnaire was saved in Play Console for review,
including optional address/phone/other personal/creator financial data, optional
precise location, Mapbox location/interactions/IDs analytics sharing, and required
device IDs. Existing v13 payment/crash disclosures were retained. This is not a
claim that Sentry is active in v15 or that the app update has been submitted.
Partial-data deletion remains a separate capability: the current form retains
No; no new dedicated request URL or partial-deletion claim was introduced.
Account deletion is available through the URL below.

## Security and deletion assertions

- Data is encrypted in transit; sensitive server-held data must use provider
  encryption at rest and least-privilege access.
- PLUGGD does not sell personal data or use app data for cross-app advertising
  tracking.
- Users can initiate permanent account deletion in the app. The public URL
  `https://www.pluggd.fm/account-deletion` was restored in web source d2c754f0,
  verified HTTP200 and rendered at390/1440, and validated/saved in Play Console.
  No destructive live-account test was performed. Statutory transaction, fraud, tax,
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
