import i18n, { type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translationResources } from './resources';
import { DEFAULT_LOCALE } from '@/lib/locales';

const initialized = i18n.isInitialized;

if (!initialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: translationResources as unknown as Resource,
      lng: DEFAULT_LOCALE,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: Object.keys(translationResources),
      defaultNS: 'translation',
      interpolation: {
        escapeValue: false
      },
      returnNull: false,
      keySeparator: '.',
      nsSeparator: ':'
    })
    .catch(error => {
      console.error('Failed to initialise i18next', error);
    });
}

export default i18n;
