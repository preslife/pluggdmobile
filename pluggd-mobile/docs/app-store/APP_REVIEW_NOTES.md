# App Review Notes — Build 5

> Copy this into App Store Connect only after every unchecked item in the v5
> release gate is complete. Replace bracketed secure values in App Store
> Connect; never commit credentials or private attachment links.

1. **Physical-device recording**
   Attachment: `PLUGGD_Build5_Physical_Device_Walkthrough.mov`. Backup link:
   `[PRIVATE_REVIEW_LINK]`. Recorded from a fresh Build 5 install on an iPhone
   15 Pro Max running iOS 26.5.2 (23F84). It demonstrates cold launch,
   sign-in, playback, Discover, Carnival, Community safety, Wallet purchase,
   Live gifting/moderation, membership/restore, Creator Studio, permissions and
   in-app account deletion. No credentials or private notifications are shown.

2. **Tested devices**
   iPhone 15 Pro Max — iOS 26.5.2 (23F84); iPhone 17 Pro Max simulator — iOS
   26.2; iPad Air 11-inch (M3) simulator in iPhone compatibility mode — iPadOS
   26.2. Fresh-install, upgrade, signed-out, fan, creator,
   offline, denied-permission and interrupted-purchase states were checked.

3. **Purpose and audience**
   PLUGGD is for music fans and independent creators. It helps fans discover and
   play creator-authorized releases, mixes, beats and soundboards; follow scenes,
   events and editorial; join Community and Live rooms; support creators; and
   manage saved music and purchases. Creators publish work, host Live rooms and
   manage their presence in Creator Studio.

4. **Access and navigation**
   Fan reviewer account: use the secure Review Account username/password fields.
   Creator reviewer account: `[CREATOR_REVIEW_USERNAME]` /
   `[CREATOR_REVIEW_PASSWORD]` (enter only in App Store Connect). Registration is
   also open. Home has immediate playback. Discover includes Carnival, Live and
   THE PLUG. Community item menu → Report or Block. Avatar → Settings → Privacy &
   safety → Delete account. Avatar → Restore Purchases. Creator account → Avatar
   → Studio. No invite or sample file is required.

5. **External services**
   Supabase (database, authentication, storage and server functions), Apple and
   Google sign-in, Apple StoreKit/App Store Server API, Agora (Live audio/video),
   Mapbox (interactive maps without device-location permission), Expo/APNs
   notifications, Sentry (diagnostics) and Stripe-hosted Checkout/Connect for
   policy-eligible off-app or physical commerce. No generative AI is required
   for the reviewed core flow.

6. **Regional behaviour**
   Apple prices are storefront-localized. Credits and available memberships use
   Apple billing. External release checkout is US-first. Professional beat
   licences, verified physical-event tickets and physical merchandise appear
   only where server policy and classification allow; unknown storefronts fail
   closed. Carnival editorial is globally readable and concerns a UK event.

7. **Content rights and safety**
   Attachment: `PLUGGD_Content_Rights_Statement_Build5.pdf`. Review media uses
   PLUGGD/creator-authorized material. Third-party catalogue metadata has no
   playable URL and cannot enter the player. Uploaders warrant rights; PLUGGD
   operates reporting, blocking, filtering and takedown processes. Rights and
   safety contact: support@pluggd.fm. Community Guidelines:
   https://www.pluggd.fm/community-guidelines

8. **In-App Purchases**
   Credit packs (500, 1,050, 2,750, 5,750 and 12,000) are Apple consumables used
   only for release unlocks and fixed-value tips/Live gifts; credits do not
   expire. Creator memberships are Apple auto-renewable subscriptions. Paths:
   Avatar → Wallet / Credits → Buy credits; Release → Unlock; Live room → Gift;
   Creator profile → Membership tiers. Membership screens show title, monthly
   period, localized price, renewal/cancellation wording, Restore Purchases,
   Terms of Use (https://www.pluggd.fm/terms) and Privacy Policy
   (https://www.pluggd.fm/privacy). The App Store description also links to
   Apple's Standard EULA. Professional beat licences,
   eligible real-world tickets and physical merchandise are not bought with
   credits and use hosted checkout only where policy permits.
