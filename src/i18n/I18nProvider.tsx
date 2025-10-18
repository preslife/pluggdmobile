import React, { PropsWithChildren, useMemo } from 'react';
import { IntlProvider } from 'react-intl';
import { LocalizationProvider, useLocalization } from '@/contexts/LocalizationContext';
import { DEFAULT_LOCALE, getMessages } from './index';

const IntlBridge: React.FC<PropsWithChildren> = ({ children }) => {
  const { settings } = useLocalization();

  const messages = useMemo(() => getMessages(settings.locale), [settings.locale]);

  return (
    <IntlProvider
      locale={settings.locale}
      defaultLocale={DEFAULT_LOCALE}
      messages={messages}
      onError={(err) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[i18n] Missing translation', err);
        }
      }}
    >
      {children}
    </IntlProvider>
  );
};

export const I18nProvider: React.FC<PropsWithChildren> = ({ children }) => (
  <LocalizationProvider>
    <IntlBridge>{children}</IntlBridge>
  </LocalizationProvider>
);

export default I18nProvider;
