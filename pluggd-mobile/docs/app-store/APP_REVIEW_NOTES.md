# App Review Notes

## Review focus

PLUGGD is an iPhone music-discovery and creator-community app. The opening Home
screen contains playable music immediately. Discover explores releases, mixes,
beats, soundboards, scenes and cities. Community includes user-generated posts.
Events surfaces verified live culture, with saved music and purchases available
from the account area. A persistent mini-player opens the full player.

## Account access

Production registration is open and does not require an invite code. Supply a dedicated review account in App Store Connect immediately before submission; do not commit its credentials to the repository.

Recommended reviewer path:

1. Create an account or sign in with the App Review account.
2. On Home, tap the first play control.
3. Move between Home, Discover, Community and Events to confirm uninterrupted playback.
4. Open Discover to inspect scene, genre, city, event, mix, beat and soundboard routes.
5. Open a Community post’s overflow menu to see Report and Block.
6. Open Settings → Privacy & safety to see age-aware filters, blocked accounts, data export and account deletion.
7. Open Wallet or a creator Membership to test StoreKit products and Restore Purchases.
8. Open a published beat, choose a professional usage licence, review its terms
   and continue to the reviewer-ready hosted checkout.
9. Open a verified real-world event, choose a ticket tier and continue to the
   reviewer-ready hosted ticket checkout.

## User-generated content safety

- Report with a specific reason is available on community posts, comments, stories,
  public profiles and live rooms.
- Block is available from those same safety menus, with unblock management in
  Settings → Privacy & safety → Blocked accounts.
- Blocked authors are removed from Home and Community feeds, search,
  recommendations, stories, notifications, comments and live-room chat.
- Text and media submissions receive server-side pre-publication moderation. Media and risk-signalled submissions are held in a private moderation queue.
- Community Guidelines: https://www.pluggd.fm/community-guidelines
- Safety contact: support@pluggd.fm

## Purchases

PLUGGD uses a category-specific hybrid commerce model:

- Credit packs are Apple consumable in-app purchases. Credits do not expire and
  can be used for release unlocks, tips and live gifts.
- Creator memberships are Apple auto-renewable subscriptions. Every sellable
  creator tier maps to its own App Store product.
- Professional beat licences use hosted Stripe Checkout. The purchase grants
  usage rights and professional files for creative work outside the app; credits
  cannot purchase beat licences.
- Eligible ticket checkout is limited to verified real-world events. Paid
  virtual events are not routed through Stripe.
- Physical merchandise may use hosted checkout. Paid digital sample packs and
  downloads are not sold through external checkout in iOS v1.
- Release access always has an Apple-backed credit unlock path. An optional
  external release CTA is enabled in the United States storefront initially and
  only in separately approved entitled storefronts thereafter.
- Stripe Connect supports creator settlement and payouts; it is not an
  alternative in-app digital unlock method.

External actions are resolved by server-owned policy and fail closed when the
storefront, entitlement or item classification cannot be confirmed. The app does
not include the native Stripe SDK; eligible external purchases use secure hosted
checkout and return to PLUGGD, where access is refreshed after the signed
provider webhook completes.

The app includes Restore Purchases and a link to Apple subscription management.
App Store Server Notification V2 and client StoreKit 2 transactions are
cryptographically verified using Apple's official server library before
entitlements are granted.

## Account deletion

Settings → Privacy & safety → Delete account performs immediate server-side deletion after recent authentication and typing `DELETE`. The screen explains that Apple subscriptions must be cancelled separately and links to Apple subscription settings.

## Hardware permissions

- Camera: event ticket scanning or user-created live/profile content.
- Microphone: joining or hosting live audio rooms.
- Photo library: selecting profile/creator media; saving an export only on request.

## External dependencies for review

The Supabase production deployment, Apple IAP products, App Store Server Notification URL, Apple root certificates and App Apple ID must be configured before the review build is uploaded. The release checklist documents the exact gate.
