# App Store Hardening Validation Report

Validated on 27 July 2026 from branch `codex/app-store-readiness`.

## Completed locally

- Mobile release contracts, TypeScript and native dependency checks pass.
- Expo Doctor passes all 18 checks.
- Production web bundle builds successfully.
- Trust, safety, moderation, account deletion and Apple purchase edge-function
  tests pass, including recent-authentication enforcement and anonymisation of
  retained purchase records.
- A production-configured iOS Release simulator build succeeds using the iPhone
  17 Pro Max destination.
- The built application passes Xcode's shallow Store validation and includes an
  iPhone-only device family, privacy manifest and required permission strings.
- Native simulator smoke tests confirm immediate one-tap playback, persistent
  mini-player navigation, signed-out account access, the 16+ registration
  declaration, and production removal of the development access-code field.

## Implemented release safeguards

- Production registration is open while development/preview launch access is
  environment controlled.
- Digital credits and memberships use StoreKit with server-side signed-data
  verification before entitlement delivery.
- Reporting, blocking and blocked-author filtering cover posts, comments,
  stories, profiles, search, recommendations, notifications and live chat.
- User-created media is quarantined for server moderation before publication.
- Sensitive releases are hidden by default and only shown after an eligible
  account explicitly enables them.
- Account export creates a private, expiring archive with account records and a
  manifest of owned storage objects.
- Account deletion requires recent authentication, removes identity and authored
  data, clears device tokens and uploads, and anonymises legally retained
  purchase records.

## External release gates

These steps require production accounts, credentials, legal evidence or real
App Store infrastructure and cannot be completed from the local workspace:

1. Link the EAS project and configure the Apple team, distribution signing and
   provisioning profile.
2. Create/confirm the App Store Connect app record and numeric Apple App ID.
3. Deploy the new Supabase migration and edge functions with the production
   secrets listed in `SERVER_CONFIGURATION.md`.
4. Configure the approved StoreKit products and App Store Server Notification V2
   endpoints, then complete sandbox purchase, restore, renewal, refund and revoke
   tests.
5. Produce a signed device archive and TestFlight build; complete the physical
   device, VoiceOver, Dynamic Type, Reduce Motion, permission and network-state
   matrix.
6. Clear every asset in `CONTENT_RIGHTS_REGISTER.md`, provide a monitored reviewer
   account, and obtain final legal approval for the Terms, Privacy Policy and
   Community Guidelines.
7. Capture final App Store screenshots from the signed production/TestFlight
   build using only rights-cleared content.

Do not submit until every external gate and every unchecked item in
`RELEASE_CHECKLIST.md` is complete.
