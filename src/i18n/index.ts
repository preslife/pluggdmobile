import { LocaleCode, SUPPORTED_LOCALES } from '@/contexts/LocalizationContext';
import enGB from './messages/en-GB.json';
import enUS from './messages/en-US.json';
import esES from './messages/es-ES.json';

export const DEFAULT_LOCALE: LocaleCode = 'en-GB';

const localeOverrides: Partial<Record<LocaleCode, Record<string, string>>> = {
  'en-US': enUS,
  'es-ES': esES,
};

const buildMessages = (locale: LocaleCode): Record<string, string> => {
  const overrides = localeOverrides[locale];
  return overrides ? { ...enGB, ...overrides } : { ...enGB };
};

export const MESSAGES_BY_LOCALE: Record<LocaleCode, Record<string, string>> = Object.keys(SUPPORTED_LOCALES)
  .map(locale => locale as LocaleCode)
  .reduce((acc, locale) => {
    acc[locale] = buildMessages(locale);
    return acc;
  }, {} as Record<LocaleCode, Record<string, string>>);

export const getMessages = (locale: LocaleCode): Record<string, string> => {
  return MESSAGES_BY_LOCALE[locale] ?? buildMessages(DEFAULT_LOCALE);
};

export const getSupportedLocales = () => Object.keys(SUPPORTED_LOCALES) as LocaleCode[];
