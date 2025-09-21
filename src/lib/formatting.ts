import { LocaleCode, SUPPORTED_LOCALES } from '@/contexts/LocalizationContext';

// ====== DATE FORMATTING ======

export interface DateFormatOptions {
  locale?: LocaleCode;
  timezone?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  timeFormat?: '12h' | '24h';
  includeTime?: boolean;
  includeTimezone?: boolean;
  relative?: boolean; // Show "2 hours ago" style
}

/**
 * Format a date according to user's locale and preferences
 */
export const formatDate = (
  date: string | Date | number,
  options: DateFormatOptions = {}
): string => {
  const {
    locale = 'en-GB',
    timezone,
    dateStyle = 'medium',
    timeStyle = 'short',
    timeFormat = '24h',
    includeTime = false,
    includeTimezone = false,
    relative = false
  } = options;

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    // Return relative time if requested
    if (relative) {
      return formatRelativeTime(dateObj, { locale, timezone });
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      dateStyle: includeTime ? undefined : dateStyle,
      timeStyle: includeTime ? timeStyle : undefined,
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      hour12: timeFormat === '12h'
    };

    // If both date and time are needed, use explicit format
    if (includeTime && !relative) {
      formatOptions.year = 'numeric';
      formatOptions.month = dateStyle === 'short' ? 'numeric' : 'short';
      formatOptions.day = 'numeric';
      formatOptions.hour = 'numeric';
      formatOptions.minute = '2-digit';
      
      if (includeTimezone) {
        formatOptions.timeZoneName = 'short';
      }
    }

    const formatter = new Intl.DateTimeFormat(locale, formatOptions);
    return formatter.format(dateObj);
  } catch (error) {
    console.warn('Date formatting error:', error);
    // Fallback to simple format
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-GB');
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "in 5 minutes")
 */
export const formatRelativeTime = (
  date: string | Date | number,
  options: { locale?: LocaleCode; timezone?: string } = {}
): string => {
  const { locale = 'en-GB' } = options;
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffDays) >= 1) {
      return rtf.format(diffDays, 'day');
    } else if (Math.abs(diffHours) >= 1) {
      return rtf.format(diffHours, 'hour');
    } else if (Math.abs(diffMinutes) >= 1) {
      return rtf.format(diffMinutes, 'minute');
    } else {
      return rtf.format(diffSeconds, 'second');
    }
  } catch (error) {
    console.warn('Relative time formatting error:', error);
    return 'Just now';
  }
};

/**
 * Format duration in seconds to human readable format
 */
export const formatDuration = (seconds: number, options: { locale?: LocaleCode } = {}): string => {
  const { locale = 'en-GB' } = options;
  
  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.warn('Duration formatting error:', error);
    return '0:00';
  }
};

// ====== CURRENCY FORMATTING ======

export interface CurrencyFormatOptions {
  locale?: LocaleCode;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  showCurrency?: boolean;
  compact?: boolean; // Show "1.2K" instead of "1,200"
}

/**
 * Format currency with proper symbols and locale-aware formatting
 */
export const formatCurrency = (
  amount: number,
  options: CurrencyFormatOptions = {}
): string => {
  const {
    locale = 'en-GB',
    currency = 'GBP',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrency = true,
    compact = false
  } = options;

  try {
    const formatOptions: Intl.NumberFormatOptions = {
      style: showCurrency ? 'currency' : 'decimal',
      currency: showCurrency ? currency : undefined,
      minimumFractionDigits,
      maximumFractionDigits
    };

    if (compact && Math.abs(amount) >= 1000) {
      formatOptions.notation = 'compact';
      formatOptions.compactDisplay = 'short';
    }

    const formatter = new Intl.NumberFormat(locale, formatOptions);
    return formatter.format(amount);
  } catch (error) {
    console.warn('Currency formatting error:', error);
    // Fallback formatting
    return showCurrency ? `£${amount.toFixed(2)}` : amount.toFixed(2);
  }
};

/**
 * Format credits with GBP conversion (keeping existing functionality)
 */
export const formatCredits = (
  credits: number,
  options: { locale?: LocaleCode; showConversion?: boolean } = {}
): string => {
  const { locale = 'en-GB', showConversion = false } = options;
  const CREDITS_PER_GBP = 100;

  try {
    const formatter = new Intl.NumberFormat(locale);
    const formattedCredits = formatter.format(credits);
    
    if (showConversion) {
      const gbp = credits / CREDITS_PER_GBP;
      const formattedGBP = formatCurrency(gbp, { locale, currency: 'GBP' });
      return `${formattedCredits} credits (${formattedGBP})`;
    }
    
    return `${formattedCredits} credits`;
  } catch (error) {
    console.warn('Credits formatting error:', error);
    return `${credits} credits`;
  }
};

// ====== NUMBER FORMATTING ======

export interface NumberFormatOptions {
  locale?: LocaleCode;
  style?: 'decimal' | 'percent' | 'unit';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
  unit?: string;
  unitDisplay?: 'short' | 'long' | 'narrow';
}

/**
 * Format numbers with locale-aware formatting
 */
export const formatNumber = (
  value: number,
  options: NumberFormatOptions = {}
): string => {
  const {
    locale = 'en-GB',
    style = 'decimal',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    compact = false,
    unit,
    unitDisplay = 'short'
  } = options;

  try {
    const formatOptions: Intl.NumberFormatOptions = {
      style,
      minimumFractionDigits,
      maximumFractionDigits
    };

    if (compact && Math.abs(value) >= 1000) {
      formatOptions.notation = 'compact';
      formatOptions.compactDisplay = 'short';
    }

    if (style === 'unit' && unit) {
      formatOptions.unit = unit;
      formatOptions.unitDisplay = unitDisplay;
    }

    const formatter = new Intl.NumberFormat(locale, formatOptions);
    return formatter.format(value);
  } catch (error) {
    console.warn('Number formatting error:', error);
    return value.toString();
  }
};

/**
 * Format percentage values
 */
export const formatPercent = (
  value: number,
  options: { locale?: LocaleCode; minimumFractionDigits?: number } = {}
): string => {
  const { locale = 'en-GB', minimumFractionDigits = 1 } = options;
  
  return formatNumber(value / 100, {
    locale,
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits: 2
  });
};

// ====== TIMEZONE UTILITIES ======

/**
 * Get user's timezone or fallback to system timezone
 */
export const getUserTimezone = (userTimezone?: string): string => {
  return userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

/**
 * Convert date to user's timezone
 */
export const convertToUserTimezone = (
  date: string | Date | number,
  timezone?: string
): Date => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const userTz = getUserTimezone(timezone);
  
  // Create a date in the user's timezone
  const formatter = new Intl.DateTimeFormat('sv-SE', { // ISO format
    timeZone: userTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const parts = formatter.format(dateObj);
  return new Date(parts.replace(' ', 'T'));
};

/**
 * Get timezone display name
 */
export const getTimezoneDisplayName = (
  timezone?: string,
  locale: LocaleCode = 'en-GB'
): string => {
  const tz = getUserTimezone(timezone);
  
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      timeZoneName: 'long'
    });
    
    const parts = formatter.formatToParts(new Date());
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    return timeZonePart?.value || tz;
  } catch (error) {
    console.warn('Timezone display name error:', error);
    return tz;
  }
};

// ====== VALIDATION UTILITIES ======

/**
 * Check if a locale is supported
 */
export const isSupportedLocale = (locale: string): locale is LocaleCode => {
  return locale in SUPPORTED_LOCALES;
};

/**
 * Check if a currency code is supported
 */
export const isSupportedCurrency = (currency: string): boolean => {
  const supportedCurrencies = new Set(
    Object.values(SUPPORTED_LOCALES).map(config => config.currency)
  );
  return supportedCurrencies.has(currency);
};

/**
 * Get fallback locale for unsupported locale
 */
export const getFallbackLocale = (requestedLocale: string): LocaleCode => {
  // Try language match first (e.g., 'en' from 'en-CA')
  const language = requestedLocale.split('-')[0];
  const languageMatch = Object.keys(SUPPORTED_LOCALES).find(locale => 
    locale.startsWith(language + '-')
  ) as LocaleCode;
  
  if (languageMatch) {
    return languageMatch;
  }
  
  // Default fallback
  return 'en-GB';
};