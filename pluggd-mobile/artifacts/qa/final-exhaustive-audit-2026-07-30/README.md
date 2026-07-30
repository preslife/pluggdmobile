# PLUGGD final mobile visual and release audit

Date: 30 July 2026
Branch: `codex/ios-hybrid-commerce`

## Outcome

- Home retains the new editorial discovery system while holding its hierarchy on both the iPhone 17 Pro Max and a 375×667 compact iPhone.
- The first viewport exposes immediate playback, balanced release/beat discovery, the live signal, search, profile access and the persistent dock.
- Community now requests the latest feed and defensively orders enriched posts newest-first.
- Authentication, fan onboarding, creator onboarding, Studio, creator events, tickets, memberships and wallet were checked at normal and accessibility text sizes.
- The dock, forms, buttons and information cards retain usable spacing, labels and touch targets at compact and enlarged layouts.
- Home parallax, the live ticker and loading shimmer respect Reduce Motion in code; the ticker becomes static instead of disappearing.
- Increase Contrast was enabled on the compact simulator and the Home hierarchy remained legible.

## Selected evidence

- `home-normal-final.png` — iPhone 17 Pro Max Home
- `home-compact-release.png` — clean Release build on 375×667 compact iPhone
- `home-compact-increase-contrast.png` — compact Home with Increase Contrast enabled
- `community-compact-final.png` — compact Community with Latest selected
- `login-normal-final.png` and `login-large-text-final.png`
- `role-large-text-fixed.png` and `fan-setup-large-text.png`
- `creator-onboarding-large-text.png`
- `studio-normal-final.png` and `studio-large-text-capped.png`
- `creator-events-normal-final.png`
- `tickets-normal-final.png`
- `memberships-normal-final.png`
- `wallet-normal-final.png`

## Verification

- `npm run verify:mobile` — passed
  - every mobile contract passed
  - TypeScript passed
  - Expo Doctor passed 18/18
- Native Release simulator build — passed
  - configuration: Release
  - destination: compact iPhone simulator
  - signing disabled for local simulator verification only
- `git diff --check` — passed

The Release screenshot is intentionally from a clean production-mode bundle, without Metro, LogBox or debug notification overlays.
