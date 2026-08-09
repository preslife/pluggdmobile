# Mobile dependency security audit — 2026-08-08

Scope: the exact `package-lock.json` on `codex/android-v1` after adding
`@sentry/react-native@7.2.0` and migrating billing to `expo-iap@5.0.1`.

Command: `npm audit --json` (no automated fix or force operation was run).

## Result

NPM reports 34 vulnerable package records: 1 low, 16 moderate, 16 high, and 1
critical. Eight root dependencies are marked vulnerable, but every root-level
mark is inherited from a transitive dependency. The audit contains no advisory
whose vulnerable implementation is authored directly in PLUGGD application
code or in a root dependency's mobile runtime implementation.

The critical record is `shell-quote@1.8.3`, reached through
`react-native -> react-devtools-core`. No PLUGGD application import or runtime
call to `shell-quote` was found. The affected package is part of React Native's
development tooling dependency graph, not a customer-controlled command parser
in PLUGGD.

The only located advisory-bearing package imported by the mobile JavaScript
runtime is `nanoid@3.3.11`, through React Navigation. The published findings
require a negative or zero size passed to non-secure/custom generators. React
Navigation's installed sources call `nanoid()` with its fixed positive default;
no attacker-controlled size is passed, so no reachable denial-of-service path
was found in the installed app.

The other concrete advisories resolve through build-time, development, or CNG
tooling, including Expo CLI/config, Metro, Babel, PostCSS, image metadata,
AJV/`fast-uri`, YAML parsers, glob/brace expansion, tar, Undici, and Xcode
project generation. They can affect a developer or CI process if that process
feeds untrusted files, archives, YAML, CSS, URLs, or glob expressions into the
affected tool. CI must therefore build only reviewed repository inputs and
trusted release assets.

## Release disposition

No directly exploitable installed-app path was identified, but the dependency
audit is not clean and remains a release risk to track. Do not apply npm's
suggested Expo 57 upgrade or React Native 0.72 downgrade automatically: those
are cross-SDK changes and are not safe patch fixes for this Expo 54/RN 0.81
application.

Before production submission:

1. Re-run `npm audit --json` and Expo Doctor against the frozen release lock.
2. Take all supported Expo SDK 54 patch updates and re-evaluate their native and
   iOS compatibility before considering any lockfile override.
3. Confirm the production bundle does not contain React DevTools or
   `shell-quote`, and retain this evidence with the AAB audit.
4. Re-check React Navigation's `nanoid` calls after any router upgrade; require
   a patched transitive version when Expo's supported dependency set permits it.
5. Keep CI inputs trusted and pin the lockfile until the tooling advisories are
   cleared by compatible upstream releases.

This is a reachability review, not proof that a vulnerable dependency can be
ignored indefinitely. New advisories or application imports can change the
decision and require a fresh review.

## Final local release recheck — 2026-08-09

`npm audit --omit=dev --audit-level=critical` was rerun against the frozen
lockfile. The result remains 34 records: 1 low, 16 moderate, 16 high, and 1
critical. No automated fix was applied because npm's proposed changes cross the
supported Expo/RN boundary.

The exact minified AAB's Hermes bytecode was searched again for `shell-quote`,
`react-devtools-core`, and React DevTools markers; none were present. R8's
`usage.txt` records the development-support classes as removed. This confirms
the critical command-parser advisory is absent from the shipped JavaScript
runtime in the audited local artifact; it does not waive the clean EAS build
and fresh pre-submission advisory check.
