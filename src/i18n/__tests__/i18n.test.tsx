import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import i18n from '@/lib/i18n';
import { t } from '@/lib/translations';

const DEFAULT_LOCALE = 'en-GB';

describe('i18n translations (compat)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  afterAll(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it('returns english copy by default', () => {
    expect(t('common.loading')).toBe('Loading...');
  });

  it('returns translated copy when locale is available', async () => {
    await i18n.changeLanguage('es-ES');
    expect(t('common.loading', 'es-ES')).toBe('Cargando...');
  });

  it('falls back to base strings when translation is missing', async () => {
    await i18n.changeLanguage('es-ES');
    expect(t('marketplace.merchandise', 'es-ES')).toBe('Merchandise');
  });
});
