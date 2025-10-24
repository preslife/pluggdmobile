# Locale QA Checklist & Regression Sign-off

## Purpose
Use this playbook to validate English (`en-GB`) and Spanish (`es-ES`) experiences across the four customer surfaces we ship in every release: Landing (`/`), Marketplace (`/marketplace`), Library (`/library`), and Wallet (`/wallet`). Reference the shared translation resources in `src/lib/i18n/resources.ts` alongside the copy decks checked into `docs/content/` to keep UI text and localisation states aligned.【F:src/lib/i18n/resources.ts†L1-L335】【F:docs/content/landing.en.md†L1-L11】【F:docs/content/landing.es.md†L1-L11】【F:docs/content/marketplace.en.md†L1-L11】【F:docs/content/library.en.md†L1-L11】【F:docs/content/wallet.es.md†L1-L11】

## Locale Switching Instructions
1. Navigate to **Settings → Localization** in the app shell and open the Locale settings card (renders via `<LocaleSettings />`).【F:src/components/LocaleSettings.tsx†L1-L200】
2. Choose **English (UK)** (`en-GB`) or **Español (España)** (`es-ES`) from the language select. Saving updates the persisted localisation settings through the shared `LocalizationContext` provider, which also writes to local storage for guests.【F:src/components/LocaleSettings.tsx†L18-L80】【F:src/contexts/LocalizationContext.tsx†L1-L170】
3. Confirm the toast confirms success, then hard-refresh once so the i18next client rehydrates with the stored locale. For quick toggles during QA, you can also run `localStorage.setItem('pluggd_locale_settings', JSON.stringify({ ...current, locale: 'es-ES' }))` in DevTools and reload to force the Spanish session.【F:src/contexts/LocalizationContext.tsx†L70-L120】

## Page-by-Page Validation Checklist
For each page, complete the English run first, capture screenshots or DOM selectors for any mismatches, then repeat in Spanish.

### 1. Landing (`/`)
1. Load the page in English and confirm header nav, hero CTAs, and footer links match the English deck values for `navigation.*` and `common.*` keys.【F:docs/content/landing.en.md†L1-L11】
2. Switch to Spanish, refresh, and verify the same surfaces update to the Spanish deck (note that Marketplace remains English because the translation fallback shows outstanding work—log any unexpected residual English strings).【F:docs/content/landing.es.md†L1-L11】
3. Exercise the hero CTAs and ensure downstream routes inherit the selected locale—`useTranslation` will propagate the setting through hooks, so verify the currency/date formatting widgets reflect the new locale.【F:src/hooks/useTranslation.tsx†L1-L120】

### 2. Marketplace (`/marketplace`)
1. In English, confirm each category tab and merchandising section renders the exact strings from the Marketplace copy deck.【F:docs/content/marketplace.en.md†L1-L11】
2. In Spanish, validate that existing overrides render (currently limited; strings falling back to English should be filed for localisation follow-up).【F:docs/content/marketplace.es.md†L1-L11】【F:src/lib/i18n/resources.ts†L232-L295】
3. Add an item to cart in both locales and check buttons (`Add to Cart`, `Buy Now`) preserve translation consistency and do not revert after navigation.【F:docs/content/marketplace.en.md†L6-L11】

### 3. Library (`/library`)
1. Compare table headers, filter/sort labels, and action buttons against the Library copy decks in English and Spanish.【F:docs/content/library.en.md†L1-L11】【F:docs/content/library.es.md†L1-L11】
2. Confirm download buttons respect `marketplace.download` translations and that fallback English strings are logged for localisation since no Spanish override exists yet.【F:docs/content/library.es.md†L7-L11】【F:src/lib/i18n/resources.ts†L96-L150】
3. Validate pluralisation and number formatting for plays/download counts via `useTranslation().formatNumber` to ensure locale-specific separators render correctly.【F:src/hooks/useTranslation.tsx†L53-L90】

### 4. Wallet (`/wallet`)
1. Confirm balance, credit summaries, and transaction table headings match the English copy deck.【F:docs/content/wallet.en.md†L1-L11】
2. Switch to Spanish and check that overridden wallet strings render (`Saldo`, `Créditos`, etc.) and no status badge reverts to English.【F:docs/content/wallet.es.md†L1-L11】【F:src/lib/i18n/resources.ts†L238-L320】
3. Trigger a test transaction (top-up or refund) and ensure new rows use locale-aware currency/date formatting via `useTranslation().formatCurrency` and `formatDate`. Capture any raw ISO timestamps or English currency symbols for follow-up.【F:src/hooks/useTranslation.tsx†L74-L120】

## Regression Sign-off & Issue Logging
- **Review cadence:** Localisation QA lead performs this checklist every Wednesday ahead of the release readiness run, and again during the release train dry-run documented in the regression checklist.【F:docs/qa-regression-checklist.md†L1-L120】
- **Approvers:** Localisation QA lead signs off, then shares artefacts with the product release manager for inclusion in the overall regression pack. Engineering owns automated test health (see below).
- **Tooling:** Use the in-app Locale settings UI plus DevTools locale overrides, store console logs/screenshots in the release ticket, and append any string-level issues to the untranslated log.
- **Logging untranslated strings:** Append each gap (with page, selector, screenshot link, and owner) to `docs/content/untranslated-log.md` so localisation can backfill translations and update `src/lib/i18n/resources.ts`/copy decks before the next cycle.【F:docs/content/untranslated-log.md†L1-L8】【F:src/lib/i18n/resources.ts†L1-L335】

## Automated Multilingual Tests
- Run the targeted i18n unit suites: `npm run test -- --run src/lib/__tests__/i18n.test.ts src/i18n/__tests__/i18n.test.tsx` to assert default/fallback behaviours for English and Spanish locales.【F:package.json†L7-L15】【F:src/lib/__tests__/i18n.test.ts†L1-L28】【F:src/i18n/__tests__/i18n.test.tsx†L1-L28】
- Include the full regression command (`npm run test`) during sign-off to catch any additional localisation regressions surfaced by shared fixtures.【F:package.json†L7-L15】

> _Tip:_ When tests fail because of missing overrides, prioritise updating the relevant copy deck under `docs/content/` and then patch `src/lib/i18n/resources.ts` so UI strings and automated coverage stay in sync.【F:docs/content/wallet.es.md†L1-L11】【F:src/lib/i18n/resources.ts†L1-L335】
