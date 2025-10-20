export const SUPPORTED_LOCALES = {
  'en-US': {
    name: 'English (US)',
    currency: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    flag: '🇺🇸'
  },
  'en-GB': {
    name: 'English (UK)',
    currency: 'GBP',
    timezone: 'Europe/London',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇬🇧'
  },
  'en-CA': {
    name: 'English (Canada)',
    currency: 'CAD',
    timezone: 'America/Toronto',
    dateFormat: 'yyyy-MM-dd',
    flag: '🇨🇦'
  },
  'en-AU': {
    name: 'English (Australia)',
    currency: 'AUD',
    timezone: 'Australia/Sydney',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇦🇺'
  },
  'de-DE': {
    name: 'Deutsch (Deutschland)',
    currency: 'EUR',
    timezone: 'Europe/Berlin',
    dateFormat: 'dd.MM.yyyy',
    flag: '🇩🇪'
  },
  'fr-FR': {
    name: 'Français (France)',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇫🇷'
  },
  'es-ES': {
    name: 'Español (España)',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇪🇸'
  },
  'it-IT': {
    name: 'Italiano (Italia)',
    currency: 'EUR',
    timezone: 'Europe/Rome',
    dateFormat: 'dd/MM/yyyy',
    flag: '🇮🇹'
  },
  'ja-JP': {
    name: '日本語 (日本)',
    currency: 'JPY',
    timezone: 'Asia/Tokyo',
    dateFormat: 'yyyy/MM/dd',
    flag: '🇯🇵'
  },
  'ko-KR': {
    name: '한국어 (대한민국)',
    currency: 'KRW',
    timezone: 'Asia/Seoul',
    dateFormat: 'yyyy.MM.dd',
    flag: '🇰🇷'
  }
} as const;

export type LocaleCode = keyof typeof SUPPORTED_LOCALES;

export interface LocaleConfig {
  name: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  flag: string;
}

export const DEFAULT_LOCALE: LocaleCode = 'en-GB';
