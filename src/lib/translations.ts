import i18n from '@/lib/i18n';
import type { LocaleCode } from '@/lib/locales';
import {
  baseTranslation,
  translationResources,
  type TranslationShape
} from '@/lib/i18n/resources';

export const translations = {
  en: baseTranslation
} as const;

export type TranslationKey = keyof typeof translations.en;

export interface TranslationNamespace {
  [key: string]: string | TranslationNamespace;
}

export const resources = translationResources;

export function t(
  key: string,
  locale: LocaleCode | string = i18n.language,
  params?: Record<string, string | number>
): string {
  try {
    const translator = i18n.getFixedT(locale);
    return translator(key, params);
  } catch (error) {
    console.warn('Translation lookup failed', { key, locale, error });
    return i18n.t(key, params);
  }
}

export function hasTranslation(
  key: string,
  locale: LocaleCode | string = i18n.language
): boolean {
  return i18n.exists(key, { lng: locale });
}

export function getAllTranslationKeys(
  obj: TranslationShape = baseTranslation,
  prefix = ''
): string[] {
  let keys: string[] = [];

  Object.keys(obj).forEach(currentKey => {
    const value = obj[currentKey as keyof TranslationShape];
    const newPrefix = prefix ? `${prefix}.${currentKey}` : currentKey;

    if (typeof value === 'string') {
      keys.push(newPrefix);
    } else if (value && typeof value === 'object') {
      keys = keys.concat(getAllTranslationKeys(value as TranslationNamespace, newPrefix));
    }
  });

  return keys;
}

export function plural(
  count: number,
  singular: string,
  pluralForm: string,
  locale: LocaleCode | string = i18n.language
): string {
  try {
    const rules = new Intl.PluralRules(locale);
    const form = rules.select(count);
    return form === 'one' ? singular : pluralForm;
  } catch (error) {
    console.warn('Pluralisation fallback triggered', { locale, error });
    return count === 1 ? singular : pluralForm;
  }
}

export function formatNumber(value: number, locale: LocaleCode | string = i18n.language): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch (error) {
    console.warn('Number formatting error:', error);
    return value.toString();
  }
}

export type { TranslationShape };
