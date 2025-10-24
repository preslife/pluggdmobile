# Locale QA Guide

This playbook drives bilingual (English `en-GB` and Spanish `es-ES`) verification ahead of every release. It combines the latest product-surface checklist with practical steps for switching locales and capturing regressions.

## Locale Switching

1. Open **Settings → Localization** (renders via `<LocaleSettings />`). Choose **English (UK)** or **Español (España)**. Saving persists the selection through `LocalizationContext` and local storage for guests, so a refresh keeps the language active.  
2. To force a refresh in dev, run `localStorage.setItem('pluggd_locale_settings', JSON.stringify({ ...current, locale: 'es-ES' }))` in DevTools, then reload.  
3. Confirm the toast appears and the UI rehydrates in the chosen locale before moving on to validation.

## Manual Verification Steps

Work through the key surfaces in both locales (English first, then Spanish). Capture screenshots or DOM notes for anything mis-translated or formatted incorrectly.

1. **Education (`/education`)** – hero copy, stats, admin/upgrade buttons, toast messages.  
2. **Wallet (`/wallet`)** – overview cards, ledger snapshot, quick actions, filters. Verify currency/credit/date formatting respects the locale.  
3. **Live (`/live`)** – hero headline, CTA buttons, schedule cards (status text, localised timestamps).  
4. **Messaging / Unified Inbox (`/inbox` or via Creator Studio)** – header, filters, search placeholders, tabs and provider selectors.  
5. **Fallback check** – briefly toggle the network offline and reload to ensure translation keys do not leak; default copy should remain human-friendly.

## Automation & Regression

- Run targeted i18n suites: `npm run test -- --run src/lib/__tests__/i18n.test.ts src/i18n/__tests__/i18n.test.tsx`.  
- Execute the full integration pass (`npm run test:integration`) to confirm Education, Wallet, Live, and Messaging specs succeed for both locales.  
- Record findings in `docs/qa-regression-checklist.md` and attach artefacts (screenshots, logs) to the release ticket.

## Sign-off Checklist

- [ ] Locale toggle verified in-app and persists after refresh.  
- [ ] Manual spot-checks complete for Education, Wallet, Live, Messaging in `en-GB` and `es-ES`.  
- [ ] Currency, credits, and date/times display locale-aware formatting.  
- [ ] Automated locale tests (`npm run test:integration`) pass.  
- [ ] Any gaps logged in `docs/content/untranslated-log.md` with component + translation key references.

## References

- Translation resources: `src/lib/i18n/resources.ts`  
- Locale metadata: `src/lib/locales.ts`  
- Copy decks & glossary: `docs/content/`  
- Reporting template: `docs/qa-regression-checklist.md`
