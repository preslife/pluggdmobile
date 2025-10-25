import i18n from '@/lib/i18n';
import { DEFAULT_LOCALE } from '@/lib/locales';

const FALLBACK_LOCALE = DEFAULT_LOCALE;

type SupportedDateInput = Date | number | string;

function resolveLocale(locale?: string): string {
  const activeLocale = locale ?? i18n.language;
  return activeLocale && typeof activeLocale === 'string' ? activeLocale : FALLBACK_LOCALE;
}

export function formatNumberLocalized(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale?: string
): string {
  const resolvedLocale = resolveLocale(locale);

  try {
    return new Intl.NumberFormat(resolvedLocale, options).format(value);
  } catch (error) {
    console.warn('[i18n] Failed to format number', { value, locale: resolvedLocale, error });
    return value.toString();
  }
}

const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short'
};

function toDate(value: SupportedDateInput): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const candidate = new Date(value);
  return isNaN(candidate.getTime()) ? null : candidate;
}

export function formatDateLocalized(
  value: SupportedDateInput,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  const date = toDate(value);
  if (!date) {
    return String(value);
  }

  const resolvedLocale = resolveLocale(locale);
  const resolvedOptions = options ?? DEFAULT_DATETIME_OPTIONS;

  try {
    return new Intl.DateTimeFormat(resolvedLocale, resolvedOptions).format(date);
  } catch (error) {
    console.warn('[i18n] Failed to format date', { value, locale: resolvedLocale, error });
    return date.toString();
  }
}
