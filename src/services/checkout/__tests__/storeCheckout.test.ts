import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoreCheckoutSession } from '../storeCheckout';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    userAction: vi.fn(),
  },
}));

describe('createStoreCheckoutSession', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('returns a normalized response when Stripe session data is present', async () => {
    invokeMock.mockResolvedValue({
      data: {
        url: 'https://stripe.test/checkout',
        sessionId: 'sess_789',
        orderId: 'order_555',
        extra: 'value',
      },
      error: null,
    });

    const result = await createStoreCheckoutSession({
      cartItems: [{ productId: 'prod_1', quantity: 2, price: 12 }],
      metadata: { channel: 'storefront' },
      successUrl: 'https://pluggd.local/success',
    });

    expect(invokeMock).toHaveBeenCalledWith('create-store-checkout', {
      body: {
        cartItems: [{ productId: 'prod_1', quantity: 2, price: 12 }],
        metadata: { channel: 'storefront' },
        successUrl: 'https://pluggd.local/success',
      },
    });

    expect(result).toEqual({
      url: 'https://stripe.test/checkout',
      sessionId: 'sess_789',
      orderId: 'order_555',
      raw: {
        url: 'https://stripe.test/checkout',
        sessionId: 'sess_789',
        orderId: 'order_555',
        extra: 'value',
      },
    });
  });

  it('throws when the serverless function returns an error', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: 'Stripe rejected payload' },
    });

    await expect(
      createStoreCheckoutSession({
        cartItems: [{ productId: 'prod_1', quantity: 1 }],
      })
    ).rejects.toThrow('Stripe rejected payload');
  });

  it('throws when the response does not include a redirect URL', async () => {
    invokeMock.mockResolvedValue({
      data: { sessionId: 'sess_123' },
      error: null,
    });

    await expect(
      createStoreCheckoutSession({
        cartItems: [{ productId: 'prod_2', quantity: 1 }],
      })
    ).rejects.toThrow('Checkout session did not return a redirect URL');
  });
});
