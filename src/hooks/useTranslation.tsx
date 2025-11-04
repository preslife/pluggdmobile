import { useCallback, useEffect } from 'react';
import { useTranslation as useI18nextTranslation } from 'react-i18next';
import {
  useLocalization,
  type LocalizationSettings
} from '@/contexts/LocalizationContext';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/locales';

/**
 * Hook for handling translations with automatic locale detection
 * and parameter interpolation
 */
const FALLBACK_SETTINGS: LocalizationSettings = {
  locale: DEFAULT_LOCALE,
  currency: SUPPORTED_LOCALES[DEFAULT_LOCALE].currency,
  timezone: SUPPORTED_LOCALES[DEFAULT_LOCALE].timezone,
  dateFormat: 'auto',
  timeFormat: '24h'
};

export const useTranslation = () => {
  const { t: i18nTranslate, i18n } = useI18nextTranslation();

  let localizationSettings: LocalizationSettings = {
    ...FALLBACK_SETTINGS,
    locale: (i18n.language as LocalizationSettings['locale']) || FALLBACK_SETTINGS.locale,
  };
  let shouldSyncWithLocalization = false;

  try {
    const { settings } = useLocalization();
    localizationSettings = settings;
    shouldSyncWithLocalization = true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('useTranslation falling back to default localization', error);
    }
  }

  useEffect(() => {
    if (shouldSyncWithLocalization && localizationSettings.locale && i18n.language !== localizationSettings.locale) {
      void i18n.changeLanguage(localizationSettings.locale);
    }
  }, [i18n, localizationSettings.locale, shouldSyncWithLocalization]);

  /**
   * Get translation for a given key
   * @param key - Translation key (e.g., 'auth.signIn' or 'common.loading')
   * @param params - Parameters for string interpolation
   */
  const t = useCallback((
    key: string, 
    params?: Record<string, string | number>
  ): string => {
    return i18nTranslate(key, params);
  }, [i18nTranslate]);

  /**
   * Check if a translation exists for a given key
   */
  const exists = useCallback((key: string): boolean => {
    return i18n.exists(key, { lng: localizationSettings.locale });
  }, [i18n, localizationSettings.locale]);

  /**
   * Pluralization helper with automatic locale detection
   */
  const pluralize = useCallback((
    count: number,
    singular: string,
    pluralForm: string
  ): string => {
    try {
      const rule = new Intl.PluralRules(localizationSettings.locale).select(count);
      return rule === 'one' ? singular : pluralForm;
    } catch (error) {
      console.warn('Pluralization fallback triggered:', error);
      return count === 1 ? singular : pluralForm;
    }
  }, [localizationSettings.locale]);

  /**
   * Format a number with locale-appropriate formatting
   */
  const resolvedLocale = localizationSettings.locale || i18n.language || DEFAULT_LOCALE;

  const formatNumber = useCallback((value: number): string => {
    try {
      return new Intl.NumberFormat(resolvedLocale).format(value);
    } catch (error) {
      console.warn('Number formatting error:', error);
      return value.toString();
    }
  }, [resolvedLocale]);

  /**
   * Format a date with locale-appropriate formatting
   */
  const formatDate = useCallback((
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(resolvedLocale, options).format(dateObj);
    } catch (error) {
      console.warn('Date formatting error:', error);
      return 'Invalid date';
    }
  }, [resolvedLocale]);

  /**
   * Format currency with locale-appropriate formatting
   */
  const formatCurrency = useCallback((
    amount: number,
    currency?: string,
    options?: Intl.NumberFormatOptions
  ): string => {
    try {
      const currencyCode = currency || localizationSettings.currency;
      return new Intl.NumberFormat(resolvedLocale, {
        style: 'currency',
        currency: currencyCode,
        ...options
      }).format(amount);
    } catch (error) {
      console.warn('Currency formatting error:', error);
      const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
      return `${symbol}${amount.toFixed(2)}`;
    }
  }, [resolvedLocale, localizationSettings.currency]);

  /**
   * Get the current locale
   */
  const locale = resolvedLocale;

  /**
   * Get the current currency
   */
  const currency = localizationSettings.currency;

  /**
   * Get the current timezone
   */
  const timezone = localizationSettings.timezone;

  return {
    t,
    exists,
    pluralize,
    formatNumber,
    formatDate,
    formatCurrency,
    locale,
    currency,
    timezone
  };
};

export default useTranslation;