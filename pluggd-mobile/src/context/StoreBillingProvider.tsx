import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { getStoreBillingAdapter } from '../billing';
import type { StoreBillingAdapter } from '../billing/types';

type StoreBillingContextValue = {
  ready: boolean;
  connectionError: string | null;
  adapter: StoreBillingAdapter | null;
};

const StoreBillingContext = createContext<StoreBillingContextValue>({
  ready: false,
  connectionError: null,
  adapter: null,
});

export function StoreBillingProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => getStoreBillingAdapter(Platform.OS), []);
  const [ready, setReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!adapter) return;
    let mounted = true;
    adapter
      .connect()
      .then(() => {
        if (mounted) {
          setReady(true);
          setConnectionError(null);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setReady(false);
          setConnectionError(
            error instanceof Error
              ? error.message
              : `Could not connect to ${adapter.storeName}.`,
          );
        }
      });
    return () => {
      mounted = false;
      void adapter.disconnect();
    };
  }, [adapter]);

  const value = useMemo(
    () => ({ ready, connectionError, adapter }),
    [ready, connectionError, adapter],
  );
  return <StoreBillingContext.Provider value={value}>{children}</StoreBillingContext.Provider>;
}

export function useStoreBilling() {
  return useContext(StoreBillingContext);
}
