import { describe, it, expect, beforeEach, afterAll } from 'vitest';

import i18n from '@/lib/i18n';
import { formatDateLocalized, formatNumberLocalized } from '@/lib/i18n/formatting';
import { DEFAULT_LOCALE } from '@/lib/locales';

const TEST_DATE = new Date(Date.UTC(2024, 5, 15, 14, 30, 0));
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: '2-digit'
};

describe('i18n formatting helpers', () => {
  beforeEach(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  afterAll(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it('formats numbers with the active locale by default', () => {
    expect(formatNumberLocalized(1234567.89)).toBe('1,234,567.89');
  });

  it('formats numbers using Spanish locale output', async () => {
    await i18n.changeLanguage('es-ES');

    expect(formatNumberLocalized(1234567.89)).toBe('1.234.567,89');
  });

  it('formats dates with the active locale by default', () => {
    expect(formatDateLocalized(TEST_DATE, DATE_OPTIONS)).toBe('15 June 2024');
  });

  it('formats dates in Spanish when locale changes', async () => {
    await i18n.changeLanguage('es-ES');

    expect(formatDateLocalized(TEST_DATE, DATE_OPTIONS)).toBe('15 de junio de 2024');
  });
});
