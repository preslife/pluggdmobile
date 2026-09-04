import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  CheckoutModal,
  PURCHASE_TYPE_CONFIG,
  getPurchaseTypeConfig,
} from '../CheckoutModal';
import type { PurchaseItem, PurchaseItemType } from '@/services/credits/credit-system';
import { configureAxe } from 'jest-axe';

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

const runAxe = configureAxe({
  rules: {
    'scrollable-region-focusable': { enabled: false },
  },
});

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
  isCreditPurchaseItem: (item: PurchaseItem) => item.type === 'release',
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
let openSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
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

  invokeMock.mockImplementation((functionName: string) => Promise.resolve({
    data: functionName === 'get-checkout-session'
      ? {
          status: 'complete',
          payment_status: 'paid',
          payment_intent_id: 'pi_456',
        }
      : {
          url: 'https://stripe.test/checkout',
          sessionId: 'sess_123',
          paymentIntentId: 'pi_456',
        },
    error: null,
  }));

  processPurchaseMock.mockImplementation((_userId, purchaseItems: PurchaseItem[], options) => {
    const totalCost = purchaseItems.reduce((sum, item) => sum + item.price, 0);
    const eligibleCredits = purchaseItems
      .filter((item) => item.type === 'release')
      .reduce((sum, item) => sum + item.price, 0);
    const creditsUsed = Math.min(
      options?.requestedCredits ?? eligibleCredits,
      eligibleCredits,
      Math.floor(totalCost * 0.5),
    );
    const result = {
      creditsUsed,
      cashDue: totalCost - creditsUsed,
      totalCost,
      message: totalCost > creditsUsed ? 'Additional payment required' : 'Purchase complete',
      appliedCredits: creditsUsed,
      maxCreditsAllowed: creditsUsed,
      cartTotal: totalCost,
    };
    if (options?.previewOnly) {
      return Promise.resolve(result);
    }
    return Promise.resolve(result);
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

afterEach(() => {
  openSpy?.mockRestore();
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
      sample_pack: 'Sample Pack',
      membership: 'Membership',
      course: 'Course',
    };

    const enrichedCheckoutItems = checkoutItems.map((item) => ({
      ...item,
      metadata: {
        type_label: typeLabels[item.type] ?? item.type,
        ...(item.metadata ?? {}),
      },
    }));

    render(
      <CheckoutModal
        isOpen
        onClose={() => {}}
        items={checkoutItems}
      />
    );

    await waitFor(() => expect(getBalanceSummaryMock).toHaveBeenCalled());
    await waitFor(() => expect(getPolicyMock).toHaveBeenCalled());

    expect(await screen.findAllByText('Release')).not.toHaveLength(0);
    expect(screen.getAllByText('Sample Pack')).not.toHaveLength(0);
    expect(screen.getAllByText('Membership')).not.toHaveLength(0);
    expect(screen.getAllByText('Course')).not.toHaveLength(0);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Items (4)')).toBeInTheDocument();

    const actionButton = await screen.findByRole('button', {
      name: /apply 20 credits & pay/i,
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
        }),
      );
    });

    await waitFor(() => {
      expect(processPurchaseMock).toHaveBeenNthCalledWith(
        1,
        'user-123',
        enrichedCheckoutItems,
        expect.objectContaining({
          previewOnly: true,
          cartTotal: 70,
        }),
      );
    });

    await waitFor(() => {
      expect(processPurchaseMock).toHaveBeenNthCalledWith(
        2,
        'user-123',
        enrichedCheckoutItems,
        expect.objectContaining({
          stripeCheckoutSessionId: 'sess_123',
          stripePaymentIntentId: 'pi_456',
        }),
      );
    });

    expect((window.location as any).href).toBe('https://stripe.test/checkout');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Complete Your Payment' })
    );
  });

  it('routes beats to the signed licence flow instead of generic checkout', async () => {
    render(
      <CheckoutModal
        isOpen
        onClose={() => {}}
        items={[
          {
            id: 'beat-1',
            type: 'beat',
            title: 'Beat One',
            price: 30,
            license_type: 'premium',
          },
        ]}
      />
    );

    expect(await screen.findByText('Choose your beat licence')).toBeInTheDocument();
    expect(screen.getByText(/usage rights and a licence agreement/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Review licences' }));

    expect((window.location as any).href).toBe('/beat/beat-1');
    expect(invokeMock).not.toHaveBeenCalledWith('enhanced-store-checkout', expect.anything());
  });

  it('has no accessibility violations in default state @a11y', async () => {
    const checkoutItems: PurchaseItem[] = [
      {
        id: 'release-axe',
        type: 'release',
        title: 'Accessibility Release',
        price: 20,
        metadata: { cover_art: 'cover.jpg' },
      },
    ];

    const { container } = render(
      <CheckoutModal
        isOpen
        onClose={() => {}}
        items={checkoutItems}
      />
    );

    await waitFor(() => expect(getBalanceSummaryMock).toHaveBeenCalled());

    const results = await runAxe(container);
    expect(results.violations).toHaveLength(0);
  });
});

describe('CheckoutModal purchase type configuration', () => {
  const purchaseTypeEntries = Object.entries(PURCHASE_TYPE_CONFIG) as Array<
    [PurchaseItem['type'], ReturnType<typeof getPurchaseTypeConfig>]
  >;

  purchaseTypeEntries.forEach(([type, config]) => {
    it(`renders ${type} items without crashing`, async () => {
      expect(() =>
        render(
          <CheckoutModal
            isOpen
            onClose={() => {}}
            items={[
              {
                id: `${type}-item`,
                type,
                title: `${config.label} Example`,
                price: 10,
              },
            ]}
          />
        )
      ).not.toThrow();

      await waitFor(() => expect(getBalanceSummaryMock).toHaveBeenCalled());
      await waitFor(() => expect(getPolicyMock).toHaveBeenCalled());

      expect(screen.getAllByText(config.label)).not.toHaveLength(0);
    });
  });
});
