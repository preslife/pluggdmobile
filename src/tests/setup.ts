import '@testing-library/jest-dom/vitest';

import i18n from '@/lib/i18n';
import { translationResources } from '@/lib/i18n/resources';

const ensureLocaleResources = (locale: keyof typeof translationResources) => {
  const localeResources = translationResources[locale];
  if (!localeResources) return;

  Object.entries(localeResources).forEach(([namespace, bundle]) => {
    if (!i18n.hasResourceBundle(locale, namespace)) {
      i18n.addResourceBundle(locale, namespace, bundle, true, true);
    }
  });
};

beforeAll(() => {
  ensureLocaleResources('en-GB');
  ensureLocaleResources('es-ES');
});
