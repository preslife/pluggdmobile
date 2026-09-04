# App Store and Hybrid Commerce Server Configuration

The IAP functions use Apple App Store Server API payload types and a
Supabase-Edge-compatible WebCrypto verifier built on `@peculiar/x509` and
`jose`. It validates the same Apple trust boundary directly: ES256, the full
x5c chain, pinned Apple G2/G3 roots, Apple leaf/intermediate purpose OIDs,
certificate dates and signatures, JWS signature, bundle ID, numeric Apple App
ID and environment. The functions fail closed: an entitlement is never granted
if signed-data verification, app identity matching, product allowlisting,
transaction matching or app-account-token matching fails.

Store these as Supabase function secrets:

```text
APPLE_BUNDLE_ID=com.pluggd.mobile
APPLE_APP_ID=6765738727
APPLE_IAP_ENVIRONMENT=Both
APPLE_ROOT_CA_G2_BASE64=<base64 DER or PEM certificate bytes>
APPLE_ROOT_CA_G3_BASE64=<base64 DER or PEM certificate bytes>
ACCOUNT_DELETION_AUDIT_SALT=<strong random production secret>
```

Download current Apple Root CA certificates only from Apple PKI. Keep certificate rotation in the release calendar. Production and sandbox signed data are each verified with the environment-specific verifier; accepting `Both` supports TestFlight without weakening signature or app identity checks.

Production configuration was verified on 28 July 2026 for Supabase project
`qkwvqmubhyondemhasjp`. Apple root G2/G3 certificates were downloaded directly
from Apple PKI and validated before installation. Secret values remain outside
the repository.

## Sign in with Apple

The production identity configuration is:

```text
APPLE_TEAM_ID=37X2468U5U
APPLE_KEY_ID=YR9NGV4BVT
APPLE_SERVICES_ID=com.pluggd.mobile.web
APPLE_NATIVE_CLIENT_ID=com.pluggd.mobile
APPLE_CALLBACK_URL=https://qkwvqmubhyondemhasjp.supabase.co/auth/v1/callback
```

The Supabase Apple provider is enabled for both
`com.pluggd.mobile.web` and `com.pluggd.mobile`. Its signed client secret was
created on 28 July 2026 and must be rotated before 24 January 2027. Never commit
the `.p8` private key or generated client secret.

## Commerce policy

Storefront and purchase eligibility are server-owned. Do not ship a client-only
country allowlist as the authority for an external purchase action.

Configure the deployed policy with:

```text
IOS_EXTERNAL_RELEASE_US_ENABLED=true
IOS_EXTERNAL_RELEASE_ENTITLED_STOREFRONTS=<empty until approved>
IOS_BEAT_LICENSE_CHECKOUT_ENABLED=<release-controlled>
IOS_EVENT_TICKET_CHECKOUT_ENABLED=<release-controlled>
IOS_PHYSICAL_MERCH_CHECKOUT_ENABLED=<release-controlled>
IOS_CHECKOUT_RETURN_URLS=pluggd://commerce/success,pluggd://commerce/cancel,https://www.pluggd.fm/...
```

Names may be mapped to the deployment platform's secret/config convention, but
the behaviour is mandatory:

- Unknown storefront, missing configuration or policy failure resolves to
  `unavailable`.
- External release checkout is US-first.
- Beat checkout requires a published professional licence, complete immutable
  legal text, buyer signature, separate versioned immediate-delivery consent
  and—when Exclusive—fresh authenticated producer authorisation.
- Ticket checkout requires a verified real-world event classification.
- Digital merchandise and paid virtual-event checkout remain unavailable.
- Every externally enabled rail has an independent remote kill switch.

## Stripe-hosted checkout

Store production values only in Supabase function secrets:

```text
STRIPE_SECRET_KEY=<production secret>
STRIPE_WEBHOOK_SECRET=<signed endpoint secret>
```

The mobile bundle contains neither value and does not include the native Stripe
SDK. Checkout sessions are created by authenticated edge functions from trusted
catalogue identifiers and server-resolved prices. Success and cancel URLs must be
selected from the configured allowlist, never copied from an arbitrary request
origin.

The Stripe webhook remains the authority for paid completion, refunds,
revocations and chargebacks. Verify its signature before any entitlement,
inventory or settlement mutation. Checkout and webhook handlers must use stable
idempotency keys.

Before submission, verify:

- production webhook delivery and replay handling;
- Apple Pay availability in hosted Checkout where supported;
- mobile success/cancel deep-link return;
- foreground reconciliation after delayed webhook delivery;
- beat, release and ticket kill switches;
- no raw card details are received or stored by PLUGGD.

See `../PLUGGD_IOS_HYBRID_COMMERCE_ARCHITECTURE_2026-07-27.md` for the canonical
payment matrix.
