import type { ReactElement, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import i18n from '@/lib/i18n';
import { DEFAULT_LOCALE, type LocaleCode, SUPPORTED_LOCALES } from '@/lib/locales';
import {
  LocalizationTestProvider,
  createTestLocalizationValue,
} from '@/contexts/LocalizationContext';

export interface RenderWithLocaleOptions extends Omit<RenderOptions, 'wrapper'> {
  locale?: LocaleCode;
  routerInitialEntries?: string[];
}

export const setLocaleForTest = async (locale: LocaleCode) => {
  await i18n.changeLanguage(locale);
};

export const renderWithLocale = async (
  ui: ReactElement,
  options: RenderWithLocaleOptions = {},
) => {
  const { locale = DEFAULT_LOCALE, routerInitialEntries = ['/'], ...renderOptions } = options;

  await setLocaleForTest(locale);

  const localizationValue = createTestLocalizationValue({
    settings: {
      locale,
      currency: SUPPORTED_LOCALES[locale].currency,
      timezone: SUPPORTED_LOCALES[locale].timezone,
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={routerInitialEntries}>
      <I18nextProvider i18n={i18n}>
        <LocalizationTestProvider value={localizationValue}>
          {children}
        </LocalizationTestProvider>
      </I18nextProvider>
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
