# PLUGGD iOS Hybrid Commerce Architecture

**Status:** Canonical  
**Effective:** 27 July 2026  
**Supersedes:** mobile guidance that routes every iOS purchase through credits or
disables professional beat licensing and real-world ticket checkout.

This decision preserves PLUGGD's creator economy while keeping each iOS purchase
on the payment rail appropriate to what the customer receives. Payment providers
fund transactions; PLUGGD's backend remains the source of truth for ownership,
access, refunds and creator settlement.

## Commerce matrix

| Purchase | iOS rail | Rule |
| --- | --- | --- |
| Credit pack | Apple consumable IAP | Server verified, idempotent and non-expiring |
| Release unlock | PLUGGD credits | Available in every storefront |
| Release cash purchase | Hosted external checkout | US storefront initially; approved entitled storefronts only thereafter |
| Tip or live gift | PLUGGD credits | No direct Stripe payment in iOS |
| PLUGGD Creator or Pro plan | Apple auto-renewable subscription | Platform creator tools; separate group and entitlement from creator memberships |
| Creator membership | Apple auto-renewable subscription | One unique Apple product per creator tier |
| Beat licence | Hosted Stripe Checkout | Professional licence for off-app creative use; credits are not accepted |
| Physical event ticket | Hosted Stripe Checkout | Only for a verified real-world event |
| Paid virtual event | Apple-compatible purchase or unavailable | Never sent through external checkout |
| Physical merchandise | Hosted Stripe Checkout | Digital packs and downloads are excluded |
| Creator settlement | Stripe Connect | Payout infrastructure, not an in-app unlock rail |

## Policy and storefront rules

- A server-owned commerce policy resolves each purchase to `apple_iap`,
  `apple_subscription`, `credits`, `stripe_checkout` or `unavailable`.
- The policy considers purchase kind, item classification, Apple storefront,
  approved entitlement configuration and remote kill switches.
- Unknown storefronts, failed policy requests and unclassified items fail closed.
  A restricted customer may browse, save or preview an item, but does not see an
  ineligible purchase action.
- Release unlock with credits remains usable everywhere. An external release CTA
  is US-first and is enabled elsewhere only after the relevant entitlement and
  configuration are approved.
- Beat licensing is described accurately as usage rights and professional
  deliverables for work outside PLUGGD. It is not presented as a substitute for
  buying in-app listening content.
- Event organisers cannot make a paid virtual experience eligible for Stripe by
  changing public-facing copy. Real-world classification is trusted server data.

## StoreKit catalogue

- Credit packs use the approved consumable product catalogue.
- PLUGGD platform plans use six permanent product IDs following
  `com.pluggd.mobile.plan.{starter|creator|pro}.{monthly|yearly}` in one
  `PLUGGD Creator Plans` subscription group. Pro is service level 1, Creator 2
  and Starter 3; monthly and yearly variants share their tier's level. They
  write the shared `user_subscriptions` entitlement and never create or replace
  a fan-to-creator membership.
- Platform-plan identity, tier, cycle and service level are resolved from the
  server-owned `platform_subscription_products` catalogue. Commission and
  feature definitions come from `platform_pricing_config`; the client supplies
  the signed App Store transaction, never an authoritative tier or price.
- A paid plan started outside the App Store remains managed at its original
  billing source. Apple lifecycle notifications must not downgrade an active
  externally billed entitlement.
- Creator memberships use a fixed set of supported Apple price points, but every
  sellable creator tier has its own Apple product ID.
- One Apple subscription group represents one creator's membership programme.
- The backend maps a verified product ID to its creator and membership tier.
  Creator or tier identity is never trusted from the purchase request.
- A missing, inactive or unprovisioned Apple product produces a browse-only tier,
  not a fallback purchase button.
- Existing shared-price SKU subscriptions retain access during migration and
  must not be charged again.
- Creator catalogue provisioning is queued only after PLUGGD approval. The
  scheduled server worker creates or reconciles the creator's subscription
  group, unique tier products, localisations, approved price point,
  availability and App Review screenshot, then polls Apple for approval before
  activating the mobile purchase control.
- Fan purchases do not create subscription groups or products. A fan may hold
  one product from each of many creator groups, which allows simultaneous
  memberships to different creators at the same price without identity
  collision.

## Hosted checkout and entitlement rules

- Hosted Stripe Checkout is the iOS v1 external checkout implementation. The
  native Stripe SDK is intentionally not included.
- Mobile sends trusted identifiers such as beat ID, licence ID, contract
  reference, event ID, ticket tier ID and quantity. It never sends an
  authoritative price.
- Checkout URLs and return URLs are issued by the backend and opened through the
  approved in-app browser flow.
- Success screens are provisional until the relevant signed provider webhook has
  created or refreshed the backend entitlement.
- Webhook and checkout processing is idempotent. Refunds, revocations and
  chargebacks update entitlements, inventory and settlements as required.
- Previously acquired access works across web and app, regardless of whether its
  source was Apple, credits, Stripe or an approved administrative grant.

## Beat agreement formation and delivery

- The four platform catalogue agreements are `basic_lease`, `premium_lease`,
  `unlimited_lease` and `exclusive_rights`. Their production wording is held in
  `contract_templates`; an executed contract keeps an immutable legal snapshot.
- Accepting licence terms and requesting immediate digital delivery are separate
  affirmative actions. The delivery control is unticked by default and records
  its exact wording, version, timestamp, client address and user agent.
- An Exclusive offer is disabled until the authenticated beat owner deliberately
  records the versioned producer authorisation. A generic pre-authorised string
  is not sufficient.
- Exclusive means an exclusive licence for future Beat use. Prior valid leases
  survive. It does not silently assign the Beat copyright, composition interest
  or moral rights. Any copyright assignment requires a separate signed instrument.
- Checkout begins only after the server has resolved the trusted option, complete
  agreement, buyer signature, delivery consent and current producer authorisation.
  Credits and generic cart checkout are rejected for beat licences.
- Verified Stripe webhook completion creates the purchase and settlement record,
  stores the immutable licence PDF and enables the web delivery route. The mobile
  record exposes the retained agreement but does not present the professional file
  as an in-app digital unlock.
- On 1 August 2026 the product owner approved the default 50/50
  producer-side/artist-side composition assumption and PLUGGD's precise
  marketplace/intermediary role as the launch commercial baseline.
  Independent UK music/consumer counsel review remains recommended before
  material transaction volume or any marketing claim based on those terms and
  is not represented as having occurred.

## App Review posture

The implementation follows the current Apple App Review categories: Apple IAP
for in-app digital consumption and currency, Apple subscriptions for recurring
digital memberships, and external payment for professional off-app licences,
physical goods and real-world services. Storefront-specific external-link rules
are enforced by policy rather than by copy or client-side assumptions.

Review metadata must describe the enabled flows plainly. It must never describe
the architecture as a loophole, bypass or way to avoid Apple fees.

## Release gates

Do not submit or enable a rail in production until:

1. StoreKit products, the PLUGGD Plans group and unique creator-tier mappings are provisioned.
2. Apple signed-transaction and server-notification verification pass in sandbox.
3. Stripe production checkout, webhook signing, Apple Pay availability and
   mobile return links pass end to end.
4. Beat price tampering, contract state, webhook replay, refund and revocation
   tests pass.
5. Ticket classification, inventory locking, oversell, refund and QR issuance
   tests pass.
6. Storefront default-deny and all remote kill switches are tested.
7. Product/legal has approved the beat-licensing and event-classification stance.
