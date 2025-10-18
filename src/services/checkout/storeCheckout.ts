import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/hooks/useCart';
import { logger } from '@/lib/logger';

export interface StoreCheckoutItem {
  productId: string;
  quantity?: number;
  price?: number;
  title?: string;
  metadata?: Record<string, any>;
}

export interface StoreCheckoutRequest {
  cartItems: StoreCheckoutItem[];
  metadata?: Record<string, any>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface StoreCheckoutResponse {
  url: string;
  sessionId: string | null;
  orderId: string | null;
  raw: unknown;
}

const sanitize = (value: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)
  );

export const createStoreCheckoutSession = async (
  request: StoreCheckoutRequest
): Promise<StoreCheckoutResponse> => {
  const payload = sanitize({
    cartItems: request.cartItems,
    metadata: request.metadata,
    successUrl: request.successUrl,
    cancelUrl: request.cancelUrl,
  });

  void logger.info('createStoreCheckoutSession:request', {
    component: 'checkout.service',
    itemCount: request.cartItems.length,
    hasMetadata: Boolean(request.metadata && Object.keys(request.metadata).length > 0),
  });

  const { data, error } = await supabase.functions.invoke('create-store-checkout', {
    body: payload,
  });

  if (error) {
    const message = error.message ?? 'Failed to create checkout session';
    const errorObject = error instanceof Error ? error : undefined;
    void logger.error('createStoreCheckoutSession:error', { message }, errorObject);
    throw new Error(message);
  }

  const sessionData = data as Record<string, any> | null;
  const url = sessionData?.url ?? sessionData?.checkoutUrl;

  if (!url) {
    throw new Error('Checkout session did not return a redirect URL');
  }

  const response: StoreCheckoutResponse = {
    url,
    sessionId: sessionData?.sessionId ?? sessionData?.id ?? null,
    orderId: sessionData?.orderId ?? null,
    raw: sessionData,
  };

  void logger.info('createStoreCheckoutSession:success', {
    component: 'checkout.service',
    sessionId: response.sessionId,
    orderId: response.orderId,
  });

  return response;
};

export type CheckoutCartItem = CartItem;
