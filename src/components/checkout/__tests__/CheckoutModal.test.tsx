import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutModal } from '../CheckoutModal';

const hoistedMocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  getBalanceSummaryMock: vi.fn(),
  processPurchaseMock: vi.fn(),
  invokeMock: vi.fn(),
  getPolicyMock: vi.fn(),
}));

const {
  toastMock,
  getBalanceSummaryMock,
  processPurchaseMock,
  invokeMock,
  getPolicyMock,
} = hoistedMocks;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: hoistedMocks.toastMock }),
}));

vi.mock('@/services/credits/credit-system', () => ({
  creditSystem: {
    getBalanceSummary: hoistedMocks.getBalanceSummaryMock,
    processPurchase: hoistedMocks.processPurchaseMock,
  },
}));

vi.mock('@/services/credits/credit-policy', () => ({
  creditPolicyService: {
    getCurrentPolicy: hoistedMocks.getPolicyMock,
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: hoistedMocks.invokeMock,
    },
  },
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value: number[]; onValueChange: (value: number[]) => void }) => (
    <input
      type="range"
      value={value[0] ?? 0}
      min={0}
      max={value[0] ?? 0}
      onChange={(event) => onValueChange([Number(event.target.value)])}
      data-testid="mock-slider"
    />
  ),
}));

const originalLocation = window.location;

beforeEach(() => {
  toastMock.mockReset();
  getBalanceSummaryMock.mockReset();
  processPurchaseMock.mockReset();
  invokeMock.mockReset();
  getPolicyMock.mockReset();

  getBalanceSummaryMock.mockResolvedValue({
    balance_credits: 200,
    pending_credits: 0,
    available_credits: 200,
    total_earned: 400,
    total_spent: 200,
  });

  invokeMock.mockResolvedValue({
    data: {
      url: 'https://stripe.test/checkout',
      sessionId: 'sess_123',
      paymentIntentId: 'pi_456',
    },
  });

  processPurchaseMock.mockResolvedValue({
    creditsUsed: 50,
    cashDue: 50,
    totalCost: 100,
    message: 'Additional payment required',
  });

  getPolicyMock.mockResolvedValue({ maxCartPercent: 0.5 });

  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  Object.defineProperty(window, 'location', {
    value: { href: '' },
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    configurable: true,
  });
});

describe('CheckoutModal hybrid checkout flow', () => {
  it('applies credits and redirects to Stripe for remaining balance', async () => {
    render(
      <CheckoutModal
        isOpen
        onClose={() => {}}
        items={[{ id: 'beat-1', type: 'beat', title: 'Beat One', price: 100 }]}
      />
    );

    await waitFor(() => expect(getBalanceSummaryMock).toHaveBeenCalled());
    await waitFor(() => expect(getPolicyMock).toHaveBeenCalled());

    const actionButton = await screen.findByRole('button', {
      name: /apply 50 credits & pay/i,
    });

    fireEvent.click(actionButton);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'enhanced-store-checkout',
        expect.objectContaining({
          body: expect.objectContaining({ manualAmountCredits: 50 }),
        })
      );
      expect(processPurchaseMock).toHaveBeenCalledWith(
        'user-123',
        expect.any(Array),
        expect.objectContaining({
          stripeCheckoutSessionId: 'sess_123',
          stripePaymentIntentId: 'pi_456',
        })
      );
    });

    expect((window.location as any).href).toBe('https://stripe.test/checkout');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Continue to Payment' })
    );
  });
});
