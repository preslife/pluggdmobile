# Locale QA Guide

This guide outlines the checks required to verify bilingual coverage across the Pluggd web experience.

## Manual verification steps

1. **Launch the app** and ensure you can toggle between English (en-GB) and Spanish (es-ES) via the locale controls in settings or the header selector.
2. **Navigate to primary surfaces** and validate copy and formatting in both locales:
   - Education dashboard hero, stats, and admin actions.
   - Wallet overview, ledger entries, and wallet activity filters.
   - Live landing page hero, CTA buttons, and schedule cards.
   - Messaging (Unified Inbox) header, filters, and search placeholders.
3. **Check formatted data** while switching locales:
   - Currency, credits, and ledger timestamps reflect the active locale.
   - Live schedule entries display localized dates and translated status/action text.
   - Inbox filters and search inputs show localized placeholders.
4. **Exercise locale persistence** by refreshing the page after switching languages and confirming the selected locale remains active.
5. **Validate fallbacks** by temporarily disconnecting network requests (e.g., using dev tools) to confirm translation keys do not leak and default copy still renders gracefully.

## Sign-off checklist

- [ ] Automated integration tests (`npm run test:integration`) pass for both locales.
- [ ] Manual spot-checks completed for Education, Wallet, Live, and Messaging pages in en-GB and es-ES.
- [ ] Currency, number, and date formatting confirmed to match locale expectations.
- [ ] Screenshots (or screen recordings) captured for QA archive when regressions are discovered.
- [ ] Any missing or incorrect translations logged with links to the offending component and translation key.

## Resources for translators & QA

- **Translation resources:** [`src/lib/i18n/resources.ts`](../../src/lib/i18n/resources.ts)
- **Locale configuration reference:** [`src/lib/locales.ts`](../../src/lib/locales.ts)
- **Product glossary & copy decks:** `docs/artifacts/copy-decks/` (update shared deck when text changes).
- **Reporting template:** Use `docs/qa-regression-checklist.md` to capture findings and sign-off notes.
