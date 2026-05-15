/**
 * useStorefront — detects the user's Apple App Store storefront/region.
 *
 * Used for future region-aware compliance decisions. Digital purchase CTAs in
 * the iOS app still default to no external checkout unless PLUGGD has a
 * confirmed native entitlement/payment contract for that item.
 *
 * Uses react-native-iap's getStorefront() which wraps SKStorefront.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

// ─── Storefront config ────────────────────────────────────────────────
export type StorefrontRegion = 'us' | 'entitled' | 'restricted';

const US_STOREFRONTS = ['USA'];

// Regions where Apple has approved external purchase entitlements
// Update this list as Apple grants entitlements
const ENTITLED_STOREFRONTS = [
  'KOR', // South Korea
  'NLD', // Netherlands (dating apps — may not apply)
  // Add more as Apple approves entitlements for music/streaming
];

interface StorefrontState {
  countryCode: string | null;
  region: StorefrontRegion;
  loading: boolean;
  detected: boolean;
  setStorefront: (code: string) => void;
}

function resolveRegion(countryCode: string): StorefrontRegion {
  if (US_STOREFRONTS.includes(countryCode)) return 'us';
  if (ENTITLED_STOREFRONTS.includes(countryCode)) return 'entitled';
  return 'restricted';
}

export const useStorefrontStore = create<StorefrontState>((set) => ({
  countryCode: null,
  region: 'restricted', // default to most restrictive
  loading: true,
  detected: false,
  setStorefront: (code: string) =>
    set({
      countryCode: code,
      region: resolveRegion(code),
      loading: false,
      detected: true,
    }),
}));

export function useStorefront() {
  const store = useStorefrontStore();

  useEffect(() => {
    if (store.detected || Platform.OS !== 'ios') {
      if (Platform.OS !== 'ios') {
        useStorefrontStore.setState({ loading: false });
      }
      return;
    }

    async function detect() {
      try {
        // react-native-iap exposes storefront info
        // Fallback: we can also call our edge function
        const { getStorefront } = await import('react-native-iap');
        const storefront = (await getStorefront()) as
          | string
          | { countryCode?: string }
          | null
          | undefined;
        const countryCode =
          typeof storefront === 'string'
            ? storefront
            : storefront?.countryCode;

        if (countryCode) {
          store.setStorefront(countryCode);
        } else {
          // Fallback — default to restricted
          useStorefrontStore.setState({ loading: false });
        }
      } catch (err) {
        console.warn('[useStorefront] detection failed, defaulting to restricted:', err);
        useStorefrontStore.setState({ loading: false });
      }
    }

    detect();
  }, [store.detected]);

  return {
    countryCode: store.countryCode,
    region: store.region,
    loading: store.loading,
    isUS: store.region === 'us',
    isEntitled: store.region === 'entitled',
    isRestricted: store.region === 'restricted',
    canShowExternalLink: false,
  };
}
