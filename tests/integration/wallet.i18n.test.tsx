import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithLocale } from '@/lib/i18n/test-utils';
import Wallet from '@/pages/Wallet';
import type { LocaleCode } from '@/lib/locales';
import { formatCurrency, formatDate, formatCredits } from '@/lib/formatting';
import { SUPPORTED_LOCALES } from '@/lib/locales';

const walletState = {
  balance: {
    balance_credits: 1500,
    available_credits: 1500,
    pending_credits: 0,
  },
  ledger: [
    {
      id: 'entry-1',
      kind: 'topup',
      amount_credits: 1500,
      ref_type: 'Top Up',
      created_at: '2024-01-15T12:30:00Z',
    },
  ],
  loading: false,
  refreshLedger: vi.fn(),
};

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => walletState,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  formatCreditsWithGBP: (credits: number) => `${credits} credits`,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({ logEvent: vi.fn() }),
}));

vi.mock('@/components/WalletOverview', () => ({
  WalletOverview: () => <div data-testid="wallet-overview" />,
}));

vi.mock('@/components/WalletTopUp', () => ({
  WalletTopUp: () => <div data-testid="wallet-topup" />,
}));

vi.mock('@/components/WalletCashOut', () => ({
  WalletCashOut: () => <div data-testid="wallet-cashout" />,
}));

vi.mock('@/lib/seo', () => ({
  setMeta: vi.fn(),
}));

describe('Wallet page i18n integration', () => {
  beforeEach(() => {
    walletState.refreshLedger.mockReset();
  });

  const renderWallet = (locale: LocaleCode) => renderWithLocale(<Wallet />, { locale });

  it('renders English wallet content with localized formatting', async () => {
    await renderWallet('en-GB');
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Wallet' })).toBeInTheDocument();
    expect(screen.getByText('Compliance notice')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Activity' }));

    const expectedCredits = formatCredits(Math.abs(walletState.ledger[0].amount_credits), { locale: 'en-GB' });
    const expectedCurrency = formatCurrency(Math.abs(walletState.ledger[0].amount_credits / 100), { locale: 'en-GB' });

    const creditDisplays = screen.getAllByText(content => content.trim().startsWith('+'));
    expect(creditDisplays[0].textContent).toBe(`+${expectedCredits}`);

    const currencyDisplays = screen.getAllByText(content =>
      content.replace(/\u00a0/g, ' ') === expectedCurrency.replace(/\u00a0/g, ' ')
    );
    expect(currencyDisplays.length).toBeGreaterThan(0);

    const expectedDate = formatDate(new Date(walletState.ledger[0].created_at), {
      locale: 'en-GB',
      timezone: SUPPORTED_LOCALES['en-GB'].timezone,
      includeTime: true,
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('renders Spanish wallet content with localized formatting', async () => {
    await renderWallet('es-ES');
    const user = userEvent.setup();

    expect(await screen.findByRole('heading', { name: 'Billetera' })).toBeInTheDocument();
    expect(screen.getByText('Aviso de cumplimiento')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /activity/i }));

    const expectedCredits = formatCredits(Math.abs(walletState.ledger[0].amount_credits), { locale: 'es-ES' });
    const expectedCurrency = formatCurrency(Math.abs(walletState.ledger[0].amount_credits / 100), { locale: 'es-ES' });

    const creditDisplays = screen.getAllByText(content => content.trim().startsWith('+'));
    expect(creditDisplays[0].textContent).toBe(`+${expectedCredits}`);

    const currencyDisplays = screen.getAllByText(content =>
      content.replace(/\u00a0/g, ' ') === expectedCurrency.replace(/\u00a0/g, ' ')
    );
    expect(currencyDisplays.length).toBeGreaterThan(0);

    const expectedDate = formatDate(new Date(walletState.ledger[0].created_at), {
      locale: 'es-ES',
      timezone: SUPPORTED_LOCALES['es-ES'].timezone,
      includeTime: true,
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });
});
