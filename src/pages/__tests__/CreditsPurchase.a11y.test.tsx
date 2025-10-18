import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import CreditsPurchase from '../CreditsPurchase';
import { configureAxe } from 'jest-axe';

const runAxe = configureAxe();

vi.mock('@/components/DomainAwareNavigation', () => ({
  __esModule: true,
  default: () => <nav aria-label="Primary navigation" />,
}));

vi.mock('@/components/checkout/CreditBalance', () => ({
  CreditBalance: ({ className }: { className?: string }) => (
    <div aria-label="Mock credit balance" className={className}>
      Balance
    </div>
  ),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/services/credits/credit-system', () => ({
  creditSystem: {
    purchaseCreditsWithStripe: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/seo', () => ({
  setMeta: vi.fn(),
}));

describe('CreditsPurchase page accessibility', () => {
  it('meets axe guidelines @a11y', async () => {
    const { container } = render(<CreditsPurchase />);

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });
});
