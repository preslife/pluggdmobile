# iOS App Review Notes Draft

Last updated: 2026-07-27

This draft is plain-language App Review context for the PLUGGD iOS commerce model. It intentionally avoids secrets, private keys, tester credentials, and implementation-only values.

## Commerce model summary

PLUGGD uses Apple IAP consumables for in-app credits. Credits are purchased in the iOS app through StoreKit, are credited to the user's PLUGGD wallet after server-side receipt validation, and credits do not expire.

Tips use Apple-backed credits in iOS. A user buys credits through Apple IAP, then uses those credits to tip digital content providers or creators inside the app.

Memberships use Apple auto-renewable subscriptions in iOS. Subscription product IDs are mapped to creator membership tiers, and active subscription state is maintained through Apple receipt validation and App Store Server Notifications.

Releases have an Apple-backed in-app unlock route. Users can unlock eligible in-app release access with PLUGGD credits purchased through Apple IAP. Optional external checkout is US-first and appears in another storefront only after the relevant entitlement and server configuration are approved.

Beat checkout is framed as professional beat licensing for off-app creative use. Beat licensing is not a generic in-app digital-goods checkout path; it supports professional licensing workflows for creators using the beat outside the app.

Event tickets are for verified real-world/off-app events and use hosted checkout where applicable. Ticket purchase and attendance relate to venue access or an off-app experience, not in-app premium content unlocks. Paid virtual events do not use this checkout.

Physical merchandise may use hosted checkout. Paid digital sample packs and
downloads are not offered through external checkout in iOS v1.

Stripe Connect is creator payout infrastructure. It is used for creator onboarding, payouts, and settlement, not for user-facing in-app digital unlocks that must use Apple IAP.

## App Review-safe notes

- In-app currency: PLUGGD credits are Apple IAP consumables.
- Expiry: credits do not expire.
- Tipping: in-app tips use Apple-backed credits.
- Subscriptions: iOS memberships use Apple auto-renewable subscriptions.
- Product identity: every sellable creator tier maps to a unique Apple product.
- Digital release unlocks: iOS provides an Apple-backed credit unlock path.
- Beat licensing: professional licensing checkout is for off-app creative use.
- Events: event ticket checkout is for real-world/off-app attendance.
- Merchandise: hosted checkout is limited to physical goods.
- Payouts: Stripe Connect supports creator payouts and is not an alternate in-app unlock payment method.

## Do-not-change notes

- Do not add Stripe, web checkout, or external checkout links for iOS in-app digital goods that require Apple IAP.
- Do not rename StoreKit product IDs without updating backend mappings and App Store Connect.
- Do not make credits expire.
- Do not use credits for beat licences, memberships, tickets or merchandise.
- Do not reuse one membership product ID for multiple creators.
- Do not describe beat licensing as a generic in-app purchase replacement.
- Do not describe Stripe Connect as a user payment method for in-app digital unlocks.
