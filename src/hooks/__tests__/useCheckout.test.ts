import { act, renderHook } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCheckout } from '../useCheckout';
import { useCart } from '../useCart';
import { createStoreCheckoutSession } from '@/services/checkout/storeCheckout';
import { telemetry } from '@/services/analytics/telemetry';
import { redirectTo } from '@/lib/redirect';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    userAction: vi.fn(),
  },
}));

vi.mock('@/services/analytics/telemetry', () => ({
  telemetry: {
    checkout: vi.fn(),
    store: vi.fn(),
    track: vi.fn(),
  },
}));

vi.mock('@/services/checkout/storeCheckout', () => ({
  createStoreCheckoutSession: vi.fn(),
}));

vi.mock('@/lib/redirect', () => ({
  redirectTo: vi.fn(),
}));

describe('useCheckout', () => {
  const createSessionMock = createStoreCheckoutSession as unknown as ReturnType<typeof vi.fn>;
  const telemetryMock = telemetry as unknown as {
    checkout: ReturnType<typeof vi.fn>;
    store: ReturnType<typeof vi.fn>;
    track: ReturnType<typeof vi.fn>;
  };
  const redirectMock = redirectTo as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    redirectMock.mockClear();
    createSessionMock.mockReset();
    telemetryMock.checkout.mockReset();
    telemetryMock.store.mockReset();
    telemetryMock.track.mockReset();

    createSessionMock.mockResolvedValue({
      url: 'https://stripe.test/checkout',
      sessionId: 'sess_123',
      orderId: 'order_123',
      raw: { id: 'sess_123' },
    });

    act(() => {
      useCart.setState({
        items: [],
      });
    });
  });

  it('builds rich checkout metadata before invoking the server function', async () => {
    act(() => {
      useCart.setState({
        items: [
          { productId: 'prod_1', price: 10, quantity: 2, title: 'Alpha Pack' },
          {
            productId: 'prod_2',
            price: 5,
            quantity: 1,
            title: 'Beta Pack',
            selectedOptions: { format: 'wav' },
          },
        ],
      });
    });

    const redirectSpy = vi.fn();
    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      await result.current.startCheckout({
        metadata: { channel: 'storefront', optional: undefined },
        onRedirect: redirectSpy,
      });
    });

    expect(createSessionMock).toHaveBeenCalledWith({
      cartItems: [
        {
          productId: 'prod_1',
          quantity: 2,
          price: 10,
          title: 'Alpha Pack',
        },
        {
          productId: 'prod_2',
          quantity: 1,
          price: 5,
          title: 'Beta Pack',
          metadata: { format: 'wav' },
        },
      ],
      metadata: expect.objectContaining({
        itemCount: 2,
        totalQuantity: 3,
        totalAmount: 25,
        itemIds: ['prod_1', 'prod_2'],
        channel: 'storefront',
      }),
      cancelUrl: undefined,
      successUrl: undefined,
    });

    expect(result.current.lastMetadata).toMatchObject({
      itemCount: 2,
      totalQuantity: 3,
      totalAmount: 25,
      itemIds: ['prod_1', 'prod_2'],
    });
    expect(result.current.lastSessionId).toBe('sess_123');
    expect(redirectSpy).toHaveBeenCalledWith('https://stripe.test/checkout');
  });

  it('redirects via window.location.assign when no custom handler is provided', async () => {
    act(() => {
      useCart.setState({
        items: [{ productId: 'prod_1', price: 10, quantity: 1 }],
      });
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      await result.current.startCheckout();
    });

    expect(redirectMock).toHaveBeenCalledWith('https://stripe.test/checkout');
    expect(result.current.error).toBeNull();
  });

  it('exposes the error state when checkout session creation fails', async () => {
    createSessionMock.mockRejectedValueOnce(new Error('stripe unavailable'));

    act(() => {
      useCart.setState({
        items: [{ productId: 'prod_1', price: 12, quantity: 1 }],
      });
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      try {
        await result.current.startCheckout();
      } catch (error) {
        expect((error as Error).message).toBe('stripe unavailable');
      }
    });

    expect(result.current.error).toBe('stripe unavailable');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
