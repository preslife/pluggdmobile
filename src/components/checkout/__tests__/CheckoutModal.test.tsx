import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutModal } from '../CheckoutModal';
import type { PurchaseItem, PurchaseItemType } from '@/services/credits/credit-system';

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
    const checkoutItems: PurchaseItem[] = [
      {
        id: 'release-1',
        type: 'release',
        title: 'Debut Release',
        price: 20,
        metadata: { cover_art: 'cover.jpg' },
      },
      {
        id: 'beat-1',
        type: 'beat',
        title: 'Beat One',
        price: 30,
        license_type: 'premium',
        metadata: { bpm: 120 },
      },
      {
        id: 'pack-1',
        type: 'sample_pack',
        title: 'Producer Pack',
        price: 0,
        metadata: { sample_count: 50 },
      },
      {
        id: 'membership-1',
        type: 'membership',
        title: 'Gold Membership',
        price: 30,
        metadata: { tier_id: 'tier-123' },
      },
      {
        id: 'course-1',
        type: 'course',
        title: 'Mixing Masterclass',
        price: 20,
        metadata: { instructor: 'DJ Test' },
      },
    ];

    const typeLabels: Partial<Record<PurchaseItemType, string>> = {
      release: 'Release',
      beat: 'Beat',
      sample_pack: 'Sample Pack',
      membership: 'Membership',
      course: 'Course',
    };

    render(
      <CheckoutModal
        isOpen
        onClose={() => {}}
        items={checkoutItems}
      />
    );

    await waitFor(() => expect(getBalanceSummaryMock).toHaveBeenCalled());
    await waitFor(() => expect(getPolicyMock).toHaveBeenCalled());

    expect(await screen.findByText('Release')).toBeInTheDocument();
    expect(screen.getByText(/Beat • Premium license/i)).toBeInTheDocument();
    expect(screen.getByText('Sample Pack')).toBeInTheDocument();
    expect(screen.getByText('Membership')).toBeInTheDocument();
    expect(screen.getByText('Course')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Items (5)')).toBeInTheDocument();

    const actionButton = await screen.findByRole('button', {
      name: /apply 50 credits & pay/i,
    });

    fireEvent.click(actionButton);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'enhanced-store-checkout',
        expect.objectContaining({
          body: expect.objectContaining({
            manualAmountCredits: 50,
            paymentMetadata: expect.objectContaining({
              items: checkoutItems.map((item) => ({
                id: item.id,
                type: item.type,
                title: item.title,
                price: item.price,
                license_type: item.license_type,
              metadata: expect.objectContaining({
                ...(item.metadata ?? {}),
                type_label: typeLabels[item.type] ?? item.type,
              }),
            })),
          }),
        }),
      })
    );
      expect(processPurchaseMock).toHaveBeenCalledWith(
        'user-123',
        checkoutItems.map((item) => ({
          ...item,
          metadata: {
            type_label: typeLabels[item.type] ?? item.type,
            ...(item.metadata ?? {}),
          },
        })),
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
