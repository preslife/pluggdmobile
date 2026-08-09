import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getStoreBillingAdapter } from '../billing';
import type { StoreBillingProviderName } from '../billing/types';
import { supabase } from '../lib/supabase';

export type PurchaseKind =
  | 'credit_pack'
  | 'release_unlock'
  | 'tip'
  | 'live_gift'
  | 'creator_membership'
  | 'beat_license'
  | 'event_ticket'
  | 'physical_merch';

export type PaymentRail =
  | 'apple_iap'
  | 'apple_subscription'
  | 'google_play_iap'
  | 'google_play_subscription'
  | 'google_play_billing'
  | 'credits'
  | 'stripe_physical'
  | 'external_web_checkout'
  | 'stripe_checkout'
  | 'unavailable';

export type CommercePlatform = 'ios' | 'android' | 'web';

export type CommerceProductMapping = {
  catalogProductId: string;
  provider: 'apple_app_store' | 'google_play';
  appId: string;
  productId: string;
  basePlanId: string | null;
  offerId: string | null;
  entitlementKey: string;
};

export type CommercePolicyChoice = {
  rail: PaymentRail;
  cta: string | null;
  productMapping: CommerceProductMapping | null;
  requiredDisclosure: string | null;
  requiredProgram: string | null;
  managementUrl: string | null;
};

export type CommerceKillSwitchState = {
  active: boolean;
  global: boolean;
  rule: boolean;
  rails: Partial<Record<PaymentRail, boolean>>;
  externalCheckoutDefaultOff: true;
};

export type CommercePolicyRequest = {
  kind: PurchaseKind;
  itemId?: string | null;
  optionId?: string | null;
  classification?: 'digital' | 'physical' | 'virtual' | 'professional_off_app' | null;
  requestedRail?: PaymentRail | null;
  productId?: string | null;
  basePlanId?: string | null;
  offerId?: string | null;
};

export type CommercePolicyDecision = {
  permittedRail: PaymentRail;
  billingProvider: StoreBillingProviderName | null;
  storefront: string | null;
  reason: string;
  requiredEntitlement: string | null;
  cta: string | null;
  policyVersion: string | null;
  platform: CommercePlatform | null;
  market: string | null;
  purchaseKind: PurchaseKind | null;
  allowedChoices: CommercePolicyChoice[];
  productMapping: CommerceProductMapping | null;
  billingAccountToken: string | null;
  requiredDisclosure: string | null;
  requiredProgram: string | null;
  managementUrl: string | null;
  denialReason: string | null;
  killSwitchState: CommerceKillSwitchState;
};

export type HostedCheckoutState = 'success' | 'cancelled' | 'pending' | 'failed';

export type HostedCheckoutResult = {
  state: HostedCheckoutState;
  returnUrl?: string | null;
  message?: string | null;
};

export type CheckoutReconciliation = {
  state: HostedCheckoutState;
  orderId: string | null;
  entitlementId: string | null;
  message: string | null;
};

const RESTRICTED: CommercePolicyDecision = {
  permittedRail: 'unavailable',
  billingProvider: null,
  storefront: null,
  reason: 'This purchase is not available in your current storefront.',
  requiredEntitlement: null,
  cta: null,
  policyVersion: null,
  platform: null,
  market: null,
  purchaseKind: null,
  allowedChoices: [],
  productMapping: null,
  billingAccountToken: null,
  requiredDisclosure: null,
  requiredProgram: null,
  managementUrl: null,
  denialReason: 'This purchase is not available in your current storefront.',
  killSwitchState: {
    active: false,
    global: false,
    rule: false,
    rails: {},
    externalCheckoutDefaultOff: true,
  },
};

let detectedStorefront: string | null | undefined;
let storefrontPromise: Promise<string | null> | null = null;

// StoreKit reports ISO 3166-1 alpha-3 codes. Policy rules use alpha-2 codes.
// This is code normalization only; purchase eligibility remains entirely remote.
const APPLE_STOREFRONT_TO_POLICY_CODE: Record<string, string> = {
  USA: 'US',
  GBR: 'GB',
  CAN: 'CA',
  AUS: 'AU',
  KOR: 'KR',
  NLD: 'NL',
  DEU: 'DE',
  FRA: 'FR',
  IRL: 'IE',
  ESP: 'ES',
  ITA: 'IT',
  JPN: 'JP',
  NZL: 'NZ',
};

function normalizeStorefrontCode(value: string | null | undefined) {
  const code = value?.trim().toUpperCase() ?? '';
  if (/^[A-Z]{2}$/.test(code)) return code;
  return APPLE_STOREFRONT_TO_POLICY_CODE[code] ?? null;
}

export async function detectStorefront(): Promise<string | null> {
  const adapter = getStoreBillingAdapter(Platform.OS);
  if (!adapter) return null;
  if (detectedStorefront !== undefined) return detectedStorefront;
  if (storefrontPromise) return storefrontPromise;

  storefrontPromise = (async () => {
    try {
      const storefront = (await adapter.getStorefront()) as
        | string
        | { countryCode?: string | null }
        | null
        | undefined;
      const rawCode =
        typeof storefront === 'string'
          ? storefront.toUpperCase()
          : storefront?.countryCode?.toUpperCase() ?? null;
      detectedStorefront = normalizeStorefrontCode(rawCode);
    } catch (error) {
      console.warn('[commerce] Storefront detection failed; restricting checkout.', error);
      detectedStorefront = null;
    } finally {
      storefrontPromise = null;
    }
    return detectedStorefront;
  })();

  return storefrontPromise;
}

// Retained for the submitted iOS hook/API while storefront detection is now
// provider-neutral and also returns Google Play's billing country on Android.
export async function detectAppleStorefront(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  return detectStorefront();
}

function normalizeRail(value: unknown, purchaseKind?: PurchaseKind | null): PaymentRail {
  if (value === 'google_play_billing') {
    return purchaseKind === 'creator_membership'
      ? 'google_play_subscription'
      : 'google_play_iap';
  }
  if (
    value === 'apple_iap' ||
    value === 'apple_subscription' ||
    value === 'google_play_iap' ||
    value === 'google_play_subscription' ||
    value === 'credits' ||
    value === 'stripe_physical' ||
    value === 'external_web_checkout' ||
    value === 'stripe_checkout'
  ) {
    return value;
  }
  return 'unavailable';
}

function optionalString(row: Record<string, unknown>, camel: string, snake: string) {
  const value = row[camel] ?? row[snake];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeProductMapping(value: unknown): CommerceProductMapping | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const provider = row.provider;
  const catalogProductId = optionalString(row, 'catalogProductId', 'catalog_product_id');
  const appId = optionalString(row, 'appId', 'app_id');
  const productId = optionalString(row, 'productId', 'product_id');
  const entitlementKey = optionalString(row, 'entitlementKey', 'entitlement_key');
  if (
    (provider !== 'apple_app_store' && provider !== 'google_play') ||
    !catalogProductId ||
    !appId ||
    !productId ||
    !entitlementKey
  ) {
    return null;
  }
  return {
    catalogProductId,
    provider,
    appId,
    productId,
    basePlanId: optionalString(row, 'basePlanId', 'base_plan_id'),
    offerId: optionalString(row, 'offerId', 'offer_id'),
    entitlementKey,
  };
}

function normalizeChoice(value: unknown, purchaseKind: PurchaseKind | null): CommercePolicyChoice | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const rail = normalizeRail(row.rail, purchaseKind);
  if (rail === 'unavailable') return null;
  return {
    rail,
    cta: typeof row.cta === 'string' ? row.cta : null,
    productMapping: normalizeProductMapping(row.productMapping ?? row.product_mapping),
    requiredDisclosure: optionalString(row, 'requiredDisclosure', 'required_disclosure'),
    requiredProgram: optionalString(row, 'requiredProgram', 'required_program'),
    managementUrl: optionalString(row, 'managementUrl', 'management_url'),
  };
}

function normalizeKillSwitch(
  value: unknown,
  purchaseKind: PurchaseKind | null,
): CommerceKillSwitchState {
  if (!value || typeof value !== 'object') return RESTRICTED.killSwitchState;
  const row = value as Record<string, unknown>;
  const rawRails = row.rails && typeof row.rails === 'object'
    ? row.rails as Record<string, unknown>
    : {};
  const rails: Partial<Record<PaymentRail, boolean>> = {};
  for (const [rawRail, enabled] of Object.entries(rawRails)) {
    const rail = normalizeRail(rawRail, purchaseKind);
    if (rail !== 'unavailable' && typeof enabled === 'boolean') rails[rail] = enabled;
  }
  return {
    active: row.active === true,
    global: row.global === true,
    rule: row.rule === true,
    rails,
    externalCheckoutDefaultOff: true,
  };
}

function normalizePolicy(
  data: unknown,
  requestedStorefront: string | null,
  requestedKind: PurchaseKind,
): CommercePolicyDecision {
  const source =
    data && typeof data === 'object' && 'decision' in data
      ? (data as { decision?: unknown }).decision
      : data;
  if (!source || typeof source !== 'object') return { ...RESTRICTED, storefront: requestedStorefront };

  const row = source as Record<string, unknown>;
  const rawPurchaseKind = row.purchaseKind ?? row.purchase_kind;
  const purchaseKind = typeof rawPurchaseKind === 'string' && [
    'credit_pack',
    'release_unlock',
    'tip',
    'live_gift',
    'creator_membership',
    'beat_license',
    'event_ticket',
    'physical_merch',
  ].includes(rawPurchaseKind)
    ? rawPurchaseKind as PurchaseKind
    : requestedKind;
  const killSwitchState = normalizeKillSwitch(
    row.killSwitchState ?? row.kill_switch_state,
    purchaseKind,
  );
  const normalizedRail = normalizeRail(
    row.permittedRail ?? row.permitted_rail ?? row.rail,
    purchaseKind,
  );
  const permittedRail = killSwitchState.active ? 'unavailable' : normalizedRail;
  const rawProvider = row.billingProvider ?? row.billing_provider ?? row.provider;
  const billingProvider =
    rawProvider === 'apple' || rawProvider === 'apple_app_store'
      ? 'apple'
      : rawProvider === 'google' || rawProvider === 'google_play'
        ? 'google'
        : permittedRail === 'apple_iap' || permittedRail === 'apple_subscription'
          ? 'apple'
          : permittedRail === 'google_play_iap' || permittedRail === 'google_play_subscription'
            ? 'google'
            : null;
  const rawPlatform = row.platform;
  const platform = rawPlatform === 'ios' || rawPlatform === 'android' || rawPlatform === 'web'
    ? rawPlatform
    : null;
  const rawChoices = row.allowedChoices ?? row.allowed_choices;
  const allowedChoices = Array.isArray(rawChoices)
    ? rawChoices
        .map((choice) => normalizeChoice(choice, purchaseKind))
        .filter((choice): choice is CommercePolicyChoice => Boolean(choice))
    : [];
  const reason = killSwitchState.active
    ? 'This purchase is temporarily unavailable.'
    : typeof row.reason === 'string'
      ? row.reason
      : permittedRail === 'unavailable'
        ? RESTRICTED.reason
        : 'Purchase method confirmed.';
  return {
    permittedRail,
    billingProvider,
    storefront: normalizeStorefrontCode(
      typeof row.storefront === 'string' ? row.storefront : requestedStorefront,
    ),
    reason,
    requiredEntitlement:
      typeof (row.requiredEntitlement ?? row.required_entitlement) === 'string'
        ? String(row.requiredEntitlement ?? row.required_entitlement)
        : null,
    cta: typeof row.cta === 'string' ? row.cta : null,
    policyVersion:
      typeof (row.policyVersion ?? row.policy_version) === 'string'
        ? String(row.policyVersion ?? row.policy_version)
        : null,
    platform,
    market: normalizeStorefrontCode(
      typeof row.market === 'string' ? row.market : requestedStorefront,
    ),
    purchaseKind,
    allowedChoices,
    productMapping: normalizeProductMapping(row.productMapping ?? row.product_mapping),
    billingAccountToken: optionalString(row, 'billingAccountToken', 'billing_account_token'),
    requiredDisclosure: optionalString(row, 'requiredDisclosure', 'required_disclosure'),
    requiredProgram: optionalString(row, 'requiredProgram', 'required_program'),
    managementUrl: optionalString(row, 'managementUrl', 'management_url'),
    denialReason: optionalString(row, 'denialReason', 'denial_reason') ??
      (permittedRail === 'unavailable' ? reason : null),
    killSwitchState,
  };
}

export async function resolveCommercePolicy(
  request: CommercePolicyRequest,
): Promise<CommercePolicyDecision> {
  const billingAdapter = getStoreBillingAdapter(Platform.OS);
  const storefront = await detectStorefront();
  if (billingAdapter && !storefront) {
    return { ...RESTRICTED, billingProvider: billingAdapter.provider };
  }

  try {
    const { data, error } = await supabase.functions.invoke('resolve-commerce-policy', {
      body: {
        purchaseKind: request.kind,
        itemId: request.itemId ?? null,
        optionId: request.optionId ?? null,
        classification: request.classification ?? null,
        requestedRail: request.requestedRail ?? null,
        productId: request.productId ?? null,
        basePlanId: request.basePlanId ?? null,
        offerId: request.offerId ?? null,
        storefront,
        platform: Platform.OS,
        billingProvider: billingAdapter?.provider ?? null,
      },
    });
    if (error) throw error;
    return normalizePolicy(data, storefront, request.kind);
  } catch (error) {
    console.warn('[commerce] Policy resolution failed; restricting checkout.', error);
    return { ...RESTRICTED, storefront };
  }
}

export function useCommercePolicy(request: CommercePolicyRequest | null) {
  const requestKey = useMemo(() => JSON.stringify(request), [request]);
  const [decision, setDecision] = useState<CommercePolicyDecision>(RESTRICTED);
  const [loading, setLoading] = useState(Boolean(request));

  const refresh = useCallback(async () => {
    if (!request) {
      setDecision(RESTRICTED);
      setLoading(false);
      return RESTRICTED;
    }
    setLoading(true);
    const next = await resolveCommercePolicy(request);
    setDecision(next);
    setLoading(false);
    return next;
  }, [requestKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...decision,
    loading,
    available: !loading && decision.permittedRail !== 'unavailable',
    refresh,
  };
}

const CHECKOUT_RETURN_URL = 'pluggd://commerce/success';

function parseCheckoutState(url?: string | null): HostedCheckoutState {
  if (!url) return 'pending';
  const normalized = url.toLowerCase();
  if (normalized.includes('cancel') || normalized.includes('status=cancelled')) return 'cancelled';
  if (normalized.includes('status=failed') || normalized.includes('error=')) return 'failed';
  if (normalized.includes('success') || normalized.includes('status=complete')) return 'success';
  return 'pending';
}

export async function openHostedCheckout(
  checkoutUrl: string,
  options?: {
    returnUrl?: string;
    reconcile?: () => Promise<HostedCheckoutState | void>;
  },
): Promise<HostedCheckoutResult> {
  if (!/^https:\/\//i.test(checkoutUrl)) {
    return { state: 'failed', message: 'The secure checkout link was invalid.' };
  }

  try {
    const returnUrl = options?.returnUrl ?? CHECKOUT_RETURN_URL;
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl, {
      preferEphemeralSession: false,
      showInRecents: true,
    });
    let state: HostedCheckoutState =
      result.type === 'cancel' || result.type === 'dismiss'
        ? 'cancelled'
        : parseCheckoutState('url' in result ? result.url : null);

    if (options?.reconcile && state !== 'cancelled') {
      state = (await options.reconcile()) ?? state;
    }
    return {
      state,
      returnUrl: 'url' in result ? result.url : null,
    };
  } catch (error) {
    return {
      state: 'failed',
      message: error instanceof Error ? error.message : 'Unable to open secure checkout.',
    };
  }
}

export async function reconcileHostedCheckout(input: {
  kind: 'beat_license' | 'event_ticket' | 'release_unlock' | 'physical_merch';
  sessionId?: string | null;
  itemId?: string | null;
}): Promise<CheckoutReconciliation> {
  if (!input.sessionId) {
    return {
      state: 'pending',
      orderId: null,
      entitlementId: null,
      message: 'Payment confirmation is still pending.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('reconcile-commerce-checkout', {
      body: {
        purchaseKind: input.kind,
        sessionId: input.sessionId,
        itemId: input.itemId ?? null,
      },
    });
    if (error) throw error;
    const row = (data ?? {}) as Record<string, unknown>;
    const rawState = String(row.state ?? row.status ?? 'pending').toLowerCase();
    const state: HostedCheckoutState =
      rawState === 'success' || rawState === 'complete' || rawState === 'completed' || rawState === 'paid'
        ? 'success'
        : rawState === 'cancelled' || rawState === 'canceled'
          ? 'cancelled'
          : rawState === 'failed' || rawState === 'refunded' || rawState === 'revoked'
            ? 'failed'
            : 'pending';
    return {
      state,
      orderId: typeof (row.orderId ?? row.order_id) === 'string' ? String(row.orderId ?? row.order_id) : null,
      entitlementId:
        typeof (row.entitlementId ?? row.entitlement_id) === 'string'
          ? String(row.entitlementId ?? row.entitlement_id)
          : null,
      message: typeof row.message === 'string' ? row.message : null,
    };
  } catch (error) {
    return {
      state: 'pending',
      orderId: null,
      entitlementId: null,
      message: 'Payment received. PLUGGD is waiting for verified confirmation.',
    };
  }
}

export function useCheckoutReconciliation(
  reconcile: () => Promise<void>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void reconcile();
    });
    return () => subscription.remove();
  }, [enabled, reconcile]);
}
