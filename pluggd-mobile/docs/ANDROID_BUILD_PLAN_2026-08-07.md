# PLUGGD for Android — build plan

**Date:** 2026-08-07
**Status:** proposal, needs decisions in §7 before work starts
**Context:** iOS 1.0 submitted for review. This plan reuses that codebase rather
than starting a second app.

---

## 1. The premise, corrected before we build on it

The working assumption was "Android doesn't have the same restrictions, so we can
put the web payments back". **That is half right, and the wrong half is expensive.**

Google Play's Payments policy requires **Google Play Billing for in-app digital
goods and content**, in the same way Apple requires IAP. Credit packs and creator
memberships are digital, so on a plain reading they need Play Billing. Shipping
them on Stripe because "Android is open" is the single fastest way to get the app
suspended, and suspension on Play is harder to recover from than an Apple
rejection because it can take the listing down rather than block an update.

What **is** genuinely different, and worth real money:

| | Apple | Google Play |
|---|---|---|
| Billing required for in-app digital goods | Yes | Yes |
| Linking out to your own checkout | Tightly restricted, entitlement-gated, storefront-by-storefront | **Materially open in the US** (following *Epic v. Google*) and **in the EU** (DMA). Steering permitted rather than exceptional |
| Running your own billing *alongside* the store's | No | **Yes — User Choice Billing**, in a long list of markets, at roughly 4 percentage points off the service fee |
| Physical goods, real-world services | Exempt | Exempt, same |
| Per-tier product provisioning | One product per creator tier, per §"StoreKit catalogue" | **Base plans and offers under one subscription** — far less provisioning |

So the honest strategy is not "escape the store tax". It is:

1. Implement Play Billing properly for digital goods, so the app is compliant by default.
2. Use the **legitimate** steering and User Choice Billing routes to move margin
   back where the jurisdiction allows it.
3. Keep the exempt categories — beat licences, tickets, merch — on Stripe exactly
   as they already are, which is easier on Play than on iOS.

> **Verify before building.** This specific area moved repeatedly through 2024–25
> and is still moving. Read the current Play Payments policy and the current User
> Choice Billing market list at implementation time rather than trusting this
> table or my knowledge cutoff. Everything else in this plan is grounded in our
> own code and does not carry that risk.

---

## 2. What ports unchanged — and it is most of it

The commerce layer was built rail-abstracted, which turns out to be the single
biggest asset we have going into Android.

**`src/commerce/policy.ts` is already platform-aware.**

- `resolveCommercePolicy()` sends `platform: Platform.OS` to the server and does
  nothing clever locally. The rail decision is **entirely server-side**.
- Line 170 already reads `if (Platform.OS === 'ios' && !storefront) return RESTRICTED`
  — Android is already excluded from the Apple storefront gate rather than
  falling through it.
- `PaymentRail` already includes `stripe_checkout` and `credits`.
- `openHostedCheckout()` uses `WebBrowser.openAuthSessionAsync`, which behaves
  the same on Android. Return-URL parsing and `reconcileHostedCheckout()` are
  platform-agnostic.

**The consequence: most of the Android commerce work is a server policy change,
not a client rewrite.** Adding `google_play_iap` / `google_play_subscription` to
the rail union and teaching `resolve-commerce-policy` about Android gets us most
of the way.

**Also free:**

- `react-native-iap` is the **same library** for Play Billing. No second SDK.
- `expo-glass-effect` is confined to `components/PluggdPrimitives.tsx` and already
  gated behind `canUseGlassEffect()` → `Platform.OS === 'ios'`, with a
  `theme.colors.glassFallback`. Android already degrades correctly. **No work.**
- Events maps share Mapbox geocoding and styling. Android uses the interactive
  Mapbox mobile SDK through `@rnmapbox/maps`; iOS retains its submitted native
  map and browser exports retain the Mapbox **Static Images API** fallback.
- Agora, TrackPlayer, MMKV, Reanimated, Skia-free SVG, expo-video, expo-camera all
  support Android.
- The whole Studio, Split Engine, discovery, editorial and design-system work is
  plain React Native. Nothing iOS-specific.
- All 43 contracts are source-text assertions and keep working.

---

## 3. What does not exist yet

**`app.config.ts` has no `android` block at all.** There is a full `ios` block —
bundle id, entitlements, infoPlist, privacy manifests — and no counterpart. Same
in `eas.json`: every build profile has an `ios` key and no `android` key.

That is the foundational gap. Required:

- `android.package` (`com.pluggd.mobile`), `versionCode` strategy
- Adaptive icon, splash, notification icon and colour
- Permissions, declared explicitly rather than inherited:
  camera, microphone (Agora), `POST_NOTIFICATIONS` (Android 13+),
  `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (TrackPlayer),
  `com.android.vending.BILLING`
- `intentFilters` for the `pluggd://` scheme **and** App Links (`https://pluggd.fm`)
  with `assetlinks.json` hosted — the iOS build has Universal Links equivalents
- `expo-build-properties` for `compileSdk` / `targetSdk` (Play requires a recent
  target; check the current floor at build time)
- `googleServicesFile` for FCM
- EAS `android` profiles + a service-account JSON for `eas submit`

**Auth:** `expo-apple-authentication` is iOS-only. Apple Sign In is *required* by
Apple when other social logins exist; on Android it is neither required nor
available. Android needs **Google Sign-In** as the platform-native option.
`src/features/auth/apple-sign-in.ts` is already isolated, so this is an additive
sibling module, not a refactor.

**Notifications:** `expo-notifications` needs FCM credentials, a notification
channel, and the Android 13+ runtime permission prompt. The iOS build's
`aps-environment` entitlement has no Android analogue.

---

## 4. The Android commerce matrix

Proposed counterpart to the iOS matrix in
`PLUGGD_IOS_HYBRID_COMMERCE_ARCHITECTURE_2026-07-27.md`. Same principle: the rail
follows what the customer actually receives.

| Purchase | iOS rail today | Android rail | Change |
|---|---|---|---|
| Credit pack | Apple consumable IAP | **Play Billing consumable** | Direct port |
| Release unlock | Credits | Credits | None |
| Release cash purchase | Hosted checkout, US only | **Hosted checkout, US + EU + UCB markets** | **Wider** — steering is permitted in more places |
| Tip / live gift | Credits only | Credits; **evaluate UCB** | Treat as digital. Do not assume "P2P exemption" |
| Creator membership | Apple sub, **one product per creator tier** | **Play sub with base plans + offers** | **Much cheaper to provision** |
| Beat licence | Stripe Checkout | Stripe Checkout | Direct port, fewer constraints |
| Physical event ticket | Stripe Checkout | Stripe Checkout | Direct port |
| Paid virtual event | Apple-compatible or unavailable | Play Billing or unavailable | Same posture |
| Physical merch | Stripe Checkout | Stripe Checkout | Direct port |
| Creator settlement | Stripe Connect | Stripe Connect | Unchanged |

**The two real wins:**

1. **Membership provisioning.** The iOS design needs a unique Apple product per
   creator tier, provisioned by a scheduled worker that polls Apple for approval
   before the buy button activates. Play's subscription model — one subscription
   with multiple base plans and offers — should collapse a large amount of that
   machinery. This is the biggest engineering saving available and worth
   designing deliberately rather than porting the Apple shape across.

2. **Steering.** Release cash purchase is US-only on iOS because of
   entitlement-by-storefront rules. On Android the same flow should be available
   considerably more widely.

---

## 5. Server work

Client changes are small; these are the substantive ones.

- **`resolve-commerce-policy`** — accept `platform: 'android'`, resolve Play rails,
  apply Android steering rules by market. Keep fail-closed: unknown market →
  `unavailable`, exactly as today.
- **`validate-iap-receipt`** — Apple-only today. Needs a sibling for **Play
  Billing purchase-token verification** via the Google Play Developer API.
- **`apple-server-notification`** — needs a **Real-Time Developer Notifications**
  counterpart (Pub/Sub) for renewals, cancellations, refunds, grace periods.
- **`provision-membership-iap`** — needs the Play equivalent, and should be
  designed around base plans rather than mirroring one-product-per-tier.
- **`stripe-webhook`, `reconcile-commerce-checkout`, `commerce-document-url`,
  `update-stripe-account-status`** — platform-agnostic. **No change.**

Entitlements must stay source-agnostic. The existing rule — *"previously acquired
access works across web and app, regardless of whether its source was Apple,
credits, Stripe or an approved administrative grant"* — must extend to Play, so a
membership bought on iOS is honoured on Android and vice versa.

---

## 6. Phasing

**Phase 0 — Decisions (§7).** Nothing else starts cleanly without these.

**Phase 1 — It builds and runs.** Android block in `app.config.ts`, EAS profiles,
icons/splash, permissions, FCM, deep links + App Links. Dev build on an emulator.
Exit: app boots, signs in, plays audio, navigates.

**Phase 2 — Parity without money.** Google Sign-In. Notification channels and the
Android 13+ permission prompt. TrackPlayer foreground service. Agora mic
permissions. Back-gesture and hardware-back behaviour across the router. Design QA
on Android type rendering (Sora/Satoshi metrics differ) and the glass fallbacks.
Exit: everything except purchases works.

**Phase 3 — Exempt commerce.** Beat licences, tickets, merch — all Stripe, all
already built. Lowest-risk revenue and it validates the whole hosted-checkout loop
on Android. Exit: a real beat licence purchased end to end on a device.

**Phase 4 — Play Billing.** Credit packs first (consumables, simplest), then
memberships. Server verification, RTDN, entitlement reconciliation.
Exit: sandbox purchase → verified entitlement → survives reinstall.

**Phase 5 — Steering and UCB.** Only once 3 and 4 are solid. Enable wider external
release purchase where permitted; evaluate User Choice Billing per market.

**Phase 6 — Store readiness.** Play Console listing, data safety form (maps
closely to our existing `PRIVACY_LABEL_INVENTORY.md`), content rating, 6.9"-style
Android screenshots, closed → open testing track.

Phases 1–3 are the ones that produce a shippable, earning app. 4–5 are where the
policy risk lives, and they benefit from being sequenced after the app is proven.

---

## 7. Decisions needed from you

1. **Do we ship Android before Play Billing is done?** Phases 1–3 give a working
   app with beat/ticket/merch revenue and no digital purchases. It is legitimate
   to launch that way and add credits/memberships after. Faster to market, but the
   first release cannot sell credits.
2. **Membership model.** Port the Apple one-product-per-tier shape for
   consistency, or design Play-native base plans and accept two provisioning
   models? I recommend Play-native — the saving is large and the abstraction
   already lives server-side.
3. **User Choice Billing — in or out?** Real margin, real integration and
   reporting burden. Probably a Phase 5 question, but it shapes the Phase 4 schema.
4. **Minimum Android version.** Affects Agora, TrackPlayer and glass fallbacks.
5. **Tablets.** iOS is `supportsTablet: false`. Play surfaces large-screen quality
   in listings; do we care yet?
6. **One codebase or a branch?** Strong recommendation: one codebase, platform
   gates. The commerce layer is already built for it and a fork would immediately
   diverge.

---

## 8. Risks

- **Treating Android as unrestricted.** The top risk, and the reason §1 leads.
  Suspension is worse than rejection.
- **Policy drift.** Verify Play's current payments and UCB text at build time.
- **Membership entitlement collisions** across Apple, Play and Stripe for the same
  user. The source-agnostic rule must be tested, not assumed.
- **Fragmentation.** Audio focus, background playback and notification behaviour
  vary by OEM far more than on iOS. Budget real device testing, not just emulator.
- **Type rendering.** The design system is tightly tuned; Sora/Satoshi metrics and
  Android font scaling will need a QA pass, and our contracts do not catch visual
  regressions.
- **Deep links.** App Links need `assetlinks.json` hosted on pluggd.fm and
  verified, or links silently open the browser instead.

---

## 9. First commit

`app.config.ts` Android block + `eas.json` Android profiles + a dev build running
on an emulator. That single step converts every remaining question from
theoretical to testable.
