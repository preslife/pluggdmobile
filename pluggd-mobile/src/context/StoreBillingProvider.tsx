import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { getStoreBillingAdapter } from '../billing';
import { withStoreTimeout } from '../billing/storeOperation';
import type { StoreBillingAdapter } from '../billing/types';

type StoreBillingContextValue = {
  ready: boolean;
  connectionError: string | null;
  adapter: StoreBillingAdapter | null;
  retryConnection: () => Promise<boolean>;
};

const StoreBillingContext = createContext<StoreBillingContextValue>({
  ready: false,
  connectionError: null,
  adapter: null,
  retryConnection: async () => false,
});

export function StoreBillingProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => getStoreBillingAdapter(Platform.OS), []);
  const [ready, setReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const mounted = useRef(false);
  const connecting = useRef<Promise<boolean> | null>(null);
  const retryConnection = useCallback((): Promise<boolean> => {
    if (!adapter) return Promise.resolve(false);
    if (connecting.current) return connecting.current;
    setConnectionError(null);
    setReady(false);
    const attempt = (async () => {
      try {
        const connected = await withStoreTimeout(adapter.connect(), `${adapter.storeName} did not connect. Please try again.`);
        if (!connected) throw new Error(`Could not connect to ${adapter.storeName}. Please try again.`);
        if (mounted.current) setReady(true);
        return true;
      } catch (error: unknown) {
        if (mounted.current) {
          setReady(false);
          setConnectionError(error instanceof Error ? error.message : `Could not connect to ${adapter.storeName}.`);
        }
        return false;
      } finally {
        connecting.current = null;
      }
    })();
    connecting.current = attempt;
    return attempt;
  }, [adapter]);

  useEffect(() => {
    mounted.current = true;
    void retryConnection();
    return () => {
      mounted.current = false;
      void adapter?.disconnect();
    };
  }, [adapter, retryConnection]);

  const value = useMemo(
    () => ({ ready, connectionError, adapter, retryConnection }),
    [ready, connectionError, adapter, retryConnection],
  );
  return <StoreBillingContext.Provider value={value}>{children}</StoreBillingContext.Provider>;
}

export function useStoreBilling() {
  return useContext(StoreBillingContext);
}
