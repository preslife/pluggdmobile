import { useCallback } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { t as translate, hasTranslation, plural } from '@/lib/translations';

/**
 * Hook for handling translations with automatic locale detection
 * and parameter interpolation
 */
export const useTranslation = () => {
  const { settings } = useLocalization();

  /**
   * Get translation for a given key
   * @param key - Translation key (e.g., 'auth.signIn' or 'common.loading')
   * @param params - Parameters for string interpolation
   */
  const t = useCallback((
    key: string, 
    params?: Record<string, string | number>
  ): string => {
    return translate(key, settings.locale, params);
  }, [settings.locale]);

  /**
   * Check if a translation exists for a given key
   */
  const exists = useCallback((key: string): boolean => {
    return hasTranslation(key, settings.locale);
  }, [settings.locale]);

  /**
   * Pluralization helper with automatic locale detection
   */
  const pluralize = useCallback((
    count: number,
    singular: string,
    pluralForm: string
  ): string => {
    return plural(count, singular, pluralForm, settings.locale);
  }, [settings.locale]);

  /**
   * Format a number with locale-appropriate formatting
   */
  const formatNumber = useCallback((value: number): string => {
    try {
      return new Intl.NumberFormat(settings.locale).format(value);
    } catch (error) {
      console.warn('Number formatting error:', error);
      return value.toString();
    }
  }, [settings.locale]);

  /**
   * Format a date with locale-appropriate formatting
   */
  const formatDate = useCallback((
    date: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ): string => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(settings.locale, options).format(dateObj);
    } catch (error) {
      console.warn('Date formatting error:', error);
      return 'Invalid date';
    }
  }, [settings.locale]);

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
      return new Intl.NumberFormat(settings.locale, {
        style: 'currency',
        currency: currencyCode,
        ...options
      }).format(amount);
    } catch (error) {
      console.warn('Currency formatting error:', error);
      const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
      return `${symbol}${amount.toFixed(2)}`;
    }
  }, [settings.locale, settings.currency]);

  /**
   * Get the current locale
   */
  const locale = settings.locale;

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