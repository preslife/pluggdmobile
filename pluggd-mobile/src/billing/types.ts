import type {
  Product,
  ProductSubscription,
  Purchase,
  ErrorCode,
} from 'expo-iap';

export type StoreBillingProviderName = 'apple' | 'google';
export type StoreProduct = Product | ProductSubscription;
export type StorePurchase = Purchase;
export type StorePurchaseError = Error & {
  code?: ErrorCode | string;
  productId?: string | null;
  debugMessage?: string;
  responseCode?: number;
};
export type StoreProductType = 'in-app' | 'subs';

export type StoreVerificationRequest = {
  functionName: 'validate-iap-receipt' | 'validate-google-play-purchase';
  body: Record<string, unknown>;
};

export type StoreBillingPurchaseInput = {
  sku: string;
  accountId: string;
  profileId?: string | null;
};

export type StoreBillingSubscriptionInput = StoreBillingPurchaseInput & {
  product: StoreProduct;
  basePlanId?: string | null;
  offerId?: string | null;
};

export type StoreBillingAdapter = {
  provider: StoreBillingProviderName;
  storeName: 'App Store' | 'Google Play';
  accountName: 'Apple ID' | 'Google Play account';
  creditRail: 'apple_iap' | 'google_play_iap';
  subscriptionRail: 'apple_subscription' | 'google_play_subscription';
  subscriptionManagementUrl: (sku?: string | null) => string;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<unknown>;
  fetchProducts: (skus: string[], type: StoreProductType) => Promise<StoreProduct[]>;
  getAvailablePurchases: () => Promise<StorePurchase[]>;
  finishTransaction: (purchase: StorePurchase, isConsumable: boolean) => Promise<void>;
  listenForPurchases: (listener: (purchase: StorePurchase) => void) => { remove: () => void };
  listenForErrors: (listener: (error: StorePurchaseError) => void) => { remove: () => void };
  requestProduct: (input: StoreBillingPurchaseInput) => Promise<unknown>;
  requestSubscription: (input: StoreBillingSubscriptionInput) => Promise<unknown>;
  getStorefront: () => Promise<string | null>;
  buildVerificationRequest: (
    purchase: StorePurchase,
    kind: 'credits' | 'subscription',
    accountId: string,
  ) => Promise<StoreVerificationRequest>;
};

export function storeProductId(product: StoreProduct) {
  return product.id;
}

export function storeProductPrice(product: StoreProduct | null) {
  return product?.displayPrice ?? '';
}
