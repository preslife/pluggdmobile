# Android update verification ledger

Mark only current, exact-source evidence as passed.

| Gate | Current result |
| --- | --- |
| Build 20/21 source identity and isolated branch | PASS: reviewed two-file Build 21 carryover, no iOS build/config edits |
| Shared and Android source/behavior suites | PASS: 110/110 source checks; 46/46 platform-plan hook/adapter fixtures; 18/18 iOS/Android upload/service mocks |
| TypeScript / Expo Doctor | PASS: tsc; Doctor 18/18 |
| Production Android JS export | PASS: Build21 upload carryover, 3,165 modules/94 assets; `index-1babd61a070277ff54a861bf326faf0a.hbc` |
| Clean Android config / merged manifest | CNG/config PASS: min 24, target/compile 36, address-book reads blocked; compiled merged manifest PENDING |
| Signed AAB / Billing / 16 KB native inspection | e0 AAB signature/Billing9.1.0/manifest/BundleConfig/LOAD PASS; GNU_RELRO alignment FAIL (40 arm64, 41 x86_64), runtime PENDING; AAB predates Build 21 upload carryover |
| Current phone/tablet/foldable rendered QA | PENDING |
| Google credits / memberships / platform plans / restoration | PENDING |
| Audio, media editor, Maps, Battle and lifecycle checks | PENDING |
| Privacy / Data Safety / Play app declarations | PENDING: updated SDK inventory; current canonical deletion page renders NotFound, existing Play preview URL returns 410 |
| Internal Play upload and exact-build test | PENDING |
| Public update submission / 100% / automatic publication | PENDING |

Do not reuse the historical August checkbox results as verification of this update.

## Reproducible local evidence

- From `pluggd-mobile`: `npm run verify:android-update` runs the dynamic complete Android source list, TypeScript and official Expo Doctor. Complete runner exited 0; after the equal-admin guard correction, latest hook fixture passes 46/46, full source-only runner passes 109/109 and TypeScript passes. Doctor 18/18 remains valid because dependencies/config are unchanged by that narrow correction.
- `node scripts/verify-android-contact-form-contract.mjs` and `patch --dry-run -p1 -i .../patches/expo-contacts+15.0.11.patch` pass. Dry-run did not modify shared iOS dependencies.
- `EXPO_PUBLIC_APP_ENV=production ANDROID_VERSION_CODE=14 node node_modules/expo/bin/cli prebuild --platform android --no-install` passes. Ignored generated Android project is not a source patch.
- Current production export is `/private/tmp/pluggd-android-build21-export-current`; export uses production public configuration without printing secret values. The earlier Build20 export belongs to e0 candidate provenance only.
- `git diff --check` passes. No iOS/main changes, backend deployment, signed build, real purchase or submission is inferred from these checks.

Backend check commands and migration/activation/rollback gates are recorded independently in `.worktrees/android-build20-commerce/.ai/tasks/android-build20-commerce/VERIFY.md`; they must be reviewed at its final exact SHA before deployment.

## Play and public-page preparation

- Correct Chrome PLUGGD owner account: verified. Production v13 remains at 100%, managed publishing off; no update submitted.
- Starter monthly and yearly: saved Draft, each persisted GBP/USD/EUR grid checked across 112 rows with zero mismatches. Monthly GBP4.99/USD5.99/EUR5.49; yearly GBP49.00/USD59.00/EUR54.00. Other currencies retain Google conversion. Four Creator/Pro products and real purchase tests remain required; no plan activated.
- Canonical deletion page: HTTP200 is not proof. Current Chrome shows NotFound; Console detects old preview URL HTTP410. Selective page/privacy restoration is in the isolated web lane and is not live. No destructive live account-deletion test is authorised.
- Mapbox 10.3.5/Android Maps11.20.1 telemetry is collected/shared for independent Mapbox analytics; device/session IDs included. Both MapView attribution controls are retained, but device opt-out operation is not yet verified. Firebase installation-ID/FCM activation needs exact compiled Google-services proof; notification refusal is not an installation-ID opt-out.
