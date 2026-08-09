import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  getStorefront,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';
import type { StoreBillingAdapter, StoreProduct } from '../types';

export const APPLE_SUBSCRIPTION_MANAGEMENT_URL =
  'https://apps.apple.com/account/subscriptions';

function asProducts(value: Awaited<ReturnType<typeof fetchProducts>>): StoreProduct[] {
  return Array.isArray(value) ? (value as StoreProduct[]) : [];
}

export const appleBillingAdapter: StoreBillingAdapter = {
  provider: 'apple',
  storeName: 'App Store',
  accountName: 'Apple ID',
  creditRail: 'apple_iap',
  subscriptionRail: 'apple_subscription',
  subscriptionManagementUrl: () => APPLE_SUBSCRIPTION_MANAGEMENT_URL,
  connect: () => initConnection(),
  disconnect: () => endConnection(),
  fetchProducts: async (skus, type) => asProducts(await fetchProducts({ skus, type })),
  getAvailablePurchases,
  finishTransaction: (purchase, isConsumable) =>
    finishTransaction({ purchase, isConsumable }),
  listenForPurchases: purchaseUpdatedListener,
  listenForErrors: purchaseErrorListener,
  requestProduct: ({ sku, accountId }) =>
    requestPurchase({
      request: {
        apple: {
          sku,
          appAccountToken: accountId,
          andDangerouslyFinishTransactionAutomatically: false,
        },
      },
      type: 'in-app',
    }),
  requestSubscription: ({ sku, accountId }) =>
    requestPurchase({
      request: {
        apple: {
          sku,
          appAccountToken: accountId,
          andDangerouslyFinishTransactionAutomatically: false,
        },
      },
      type: 'subs',
    }),
  getStorefront: async () => getStorefront(),
  buildVerificationRequest: async (purchase, kind) => ({
    functionName: 'validate-iap-receipt',
    body: {
      receipt_data: purchase.purchaseToken,
      product_id: purchase.productId,
      transaction_id: purchase.transactionId,
      platform: 'ios',
      ...(kind === 'subscription' ? { type: 'subscription' } : {}),
    },
  }),
};
