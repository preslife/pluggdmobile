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
import { detectAppleStorefront } from '../commerce/policy';

export function useStorefront() {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void detectAppleStorefront().then((code) => {
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
