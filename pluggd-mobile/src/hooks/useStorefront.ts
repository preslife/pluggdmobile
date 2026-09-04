/**
 * useStorefront — detects the active App Store / Google Play storefront.
 *
 * Used for future region-aware compliance decisions. Digital purchase CTAs in
 * the iOS app still default to no external checkout unless PLUGGD has a
 * confirmed native entitlement/payment contract for that item.
 *
 * expo-iap normalizes the platform billing storefront country code.
 */
import { useEffect, useState } from 'react';
import { detectStorefront } from '../commerce/policy';

export function useStorefront() {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void detectStorefront().then((code) => {
      if (!mounted) return;
      setCountryCode(code);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return {
    countryCode,
    region: 'restricted' as const,
    loading,
    isUS: false,
    isEntitled: false,
    isRestricted: true,
    canShowExternalLink: false,
  };
}
