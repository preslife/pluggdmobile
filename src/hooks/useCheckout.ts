import { useCallback, useMemo, useState } from 'react';
import { useCart } from '@/hooks/useCart';
import type { CartItem } from '@/hooks/useCart';
import { logger } from '@/lib/logger';
import { telemetry } from '@/services/analytics/telemetry';
import { redirectTo } from '@/lib/redirect';
import {
  createStoreCheckoutSession,
  type StoreCheckoutItem,
} from '@/services/checkout/storeCheckout';

export interface CheckoutMetadata {
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  itemIds: string[];
  lineItems: Array<{
    productId: string;
    quantity: number;
    price?: number;
  }>;
  [key: string]: unknown;
}

export interface StartCheckoutOptions {
  items?: CheckoutItem[];
  metadata?: Record<string, any>;
  successUrl?: string;
  cancelUrl?: string;
  clearCartOnSuccess?: boolean;
  onRedirect?: (url: string) => void;
}

export type CheckoutItem = Partial<CartItem> & {
  productId?: string;
  metadata?: Record<string, any>;
};

interface CheckoutResult {
  startCheckout: (options?: StartCheckoutOptions) => Promise<any>;
  isProcessing: boolean;
  error: string | null;
  lastMetadata: CheckoutMetadata | null;
  lastSessionId: string | null;
  resetError: () => void;
}

const sanitizeObject = (value: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  );

const resolveProductId = (item: CheckoutItem): string => {
  const id = item.productId ?? (item as any).id;
  if (!id) {
    throw new Error('Checkout items must include a productId');
  }
  return id;
};

const toCheckoutItem = (item: CheckoutItem): StoreCheckoutItem => {
  const productId = resolveProductId(item);
  const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  const metadata = item.metadata ?? (item as any).selectedOptions ?? undefined;

  return sanitizeObject({
    productId,
    quantity,
    price: item.price,
    title: item.title,
    metadata,
  }) as StoreCheckoutItem;
};

const buildMetadata = (items: CheckoutItem[], extra: Record<string, any> = {}): CheckoutMetadata => {
  const summary = items.reduce(
    (acc, item) => {
      const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      const price = typeof item.price === 'number' ? item.price : 0;
      acc.totalQuantity += quantity;
      acc.totalAmount += price * quantity;
      acc.itemIds.push(resolveProductId(item));
      acc.lineItems.push(
        sanitizeObject({
          productId: resolveProductId(item),
          quantity,
          price: typeof item.price === 'number' ? item.price : undefined,
        })
      );
      return acc;
    },
    {
      totalQuantity: 0,
      totalAmount: 0,
      itemIds: [] as string[],
      lineItems: [] as CheckoutMetadata['lineItems'],
    }
  );

  const metadata = {
    itemCount: items.length,
    totalQuantity: summary.totalQuantity,
    totalAmount: summary.totalAmount,
    itemIds: summary.itemIds,
    lineItems: summary.lineItems,
    ...extra,
  } satisfies CheckoutMetadata;

  return sanitizeObject(metadata) as CheckoutMetadata;
};

export const useCheckout = (): CheckoutResult => {
  const items = useCart((state) => state.items);
  const clearCart = useCart((state) => state.clearCart);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<CheckoutMetadata | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const startCheckout = useCallback<CheckoutResult['startCheckout']>(
    async (options = {}) => {
      const checkoutItems = (options.items ?? items).filter((item) => {
        const quantity = typeof item?.quantity === 'number' ? item.quantity : 1;
        return quantity > 0;
      });

      if (checkoutItems.length === 0) {
        const message = 'Your cart is empty';
        setError(message);
        telemetry.checkout('empty_cart', { reason: 'startCheckout' });
        return { error: message };
      }

      const metadata = buildMetadata(checkoutItems, options.metadata);

      setIsProcessing(true);
      setError(null);
      telemetry.checkout('start', {
        itemCount: metadata.itemCount,
        totalAmount: metadata.totalAmount,
      });

      try {
        const response = await createStoreCheckoutSession({
          cartItems: checkoutItems.map(toCheckoutItem),
          metadata,
          successUrl: options.successUrl,
          cancelUrl: options.cancelUrl,
        });

        setLastMetadata(metadata);
        setLastSessionId(response.sessionId);

        telemetry.checkout('session_created', {
          sessionId: response.sessionId,
          orderId: response.orderId,
          itemCount: metadata.itemCount,
        });

        if (options.clearCartOnSuccess) {
          clearCart();
          telemetry.checkout('cart_cleared', {
            sessionId: response.sessionId,
            reason: 'checkout_initiated',
          });
        }

        const redirectUrl = response.url;

        if (options.onRedirect) {
          options.onRedirect(redirectUrl);
        } else {
          redirectTo(redirectUrl);
        }

        return { ...response, metadata };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start checkout';
        setError(message);
        setLastSessionId(null);
        telemetry.checkout('error', {
          message,
          itemCount: metadata.itemCount,
        });
        void logger.error('Checkout start failed', { message, metadata }, err instanceof Error ? err : undefined);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [items, clearCart]
  );

  return useMemo(
    () => ({
      startCheckout,
      isProcessing,
      error,
      lastMetadata,
      lastSessionId,
      resetError,
    }),
    [startCheckout, isProcessing, error, lastMetadata, lastSessionId, resetError]
  );
};
