import { useCallback, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTranslation as useI18nextTranslation } from 'react-i18next';

/**
 * Hook for handling translations with automatic locale detection
 * and parameter interpolation
 */
export const useTranslation = () => {
  const { settings } = useLocalization();
  const { t: i18nTranslate, i18n } = useI18nextTranslation();

  useEffect(() => {
    if (settings.locale && i18n.language !== settings.locale) {
      void i18n.changeLanguage(settings.locale);
    }
  }, [i18n, settings.locale]);

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
    return i18n.exists(key, { lng: settings.locale });
  }, [i18n, settings.locale]);

  /**
   * Pluralization helper with automatic locale detection
   */
  const pluralize = useCallback((
    count: number,
    singular: string,
    pluralForm: string
  ): string => {
    try {
      const rule = new Intl.PluralRules(settings.locale).select(count);
      return rule === 'one' ? singular : pluralForm;
    } catch (error) {
      console.warn('Pluralization fallback triggered:', error);
      return count === 1 ? singular : pluralForm;
    }
  }, [settings.locale]);

  /**
   * Format a number with locale-appropriate formatting
   */
  const resolvedLocale = settings.locale || i18n.language || 'en-GB';

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
      const currencyCode = currency || settings.currency;
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
  }, [resolvedLocale, settings.currency]);

  /**
   * Get the current locale
   */
  const locale = resolvedLocale;

  /**
   * Get the current currency
   */
  const currency = settings.currency;

  /**
   * Get the current timezone
   */
  const timezone = settings.timezone;

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