import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { getStorefront } from 'react-native-iap';
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
  | 'credits'
  | 'stripe_checkout'
  | 'unavailable';

export type CommercePolicyRequest = {
  kind: PurchaseKind;
  itemId?: string | null;
  optionId?: string | null;
  classification?: 'digital' | 'physical' | 'virtual' | 'professional_off_app' | null;
};

export type CommercePolicyDecision = {
  permittedRail: PaymentRail;
  storefront: string | null;
  reason: string;
  requiredEntitlement: string | null;
  cta: string | null;
  policyVersion: string | null;
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
  storefront: null,
  reason: 'This purchase is not available in your current storefront.',
  requiredEntitlement: null,
  cta: null,
  policyVersion: null,
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

export async function detectAppleStorefront(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  if (detectedStorefront !== undefined) return detectedStorefront;
  if (storefrontPromise) return storefrontPromise;

  storefrontPromise = (async () => {
    try {
      const storefront = (await getStorefront()) as
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

function normalizeRail(value: unknown): PaymentRail {
  if (
    value === 'apple_iap' ||
    value === 'apple_subscription' ||
    value === 'credits' ||
    value === 'stripe_checkout'
  ) {
    return value;
  }
  return 'unavailable';
}

function normalizePolicy(
  data: unknown,
  requestedStorefront: string | null,
): CommercePolicyDecision {
  const source =
    data && typeof data === 'object' && 'decision' in data
      ? (data as { decision?: unknown }).decision
      : data;
  if (!source || typeof source !== 'object') return { ...RESTRICTED, storefront: requestedStorefront };

  const row = source as Record<string, unknown>;
  const permittedRail = normalizeRail(row.permittedRail ?? row.permitted_rail ?? row.rail);
  return {
    permittedRail,
    storefront:
      typeof row.storefront === 'string' ? row.storefront : requestedStorefront,
    reason:
      typeof row.reason === 'string'
        ? row.reason
        : permittedRail === 'unavailable'
          ? RESTRICTED.reason
          : 'Purchase method confirmed.',
    requiredEntitlement:
      typeof (row.requiredEntitlement ?? row.required_entitlement) === 'string'
        ? String(row.requiredEntitlement ?? row.required_entitlement)
        : null,
    cta: typeof row.cta === 'string' ? row.cta : null,
    policyVersion:
      typeof (row.policyVersion ?? row.policy_version) === 'string'
        ? String(row.policyVersion ?? row.policy_version)
        : null,
  };
}

export async function resolveCommercePolicy(
  request: CommercePolicyRequest,
): Promise<CommercePolicyDecision> {
  const storefront = await detectAppleStorefront();
  if (Platform.OS === 'ios' && !storefront) return RESTRICTED;

  try {
    const { data, error } = await supabase.functions.invoke('resolve-commerce-policy', {
      body: {
        purchaseKind: request.kind,
        itemId: request.itemId ?? null,
        optionId: request.optionId ?? null,
        classification: request.classification ?? null,
        storefront,
        platform: Platform.OS,
      },
    });
    if (error) throw error;
    return normalizePolicy(data, storefront);
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
