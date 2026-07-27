import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { endConnection, initConnection } from 'react-native-iap';

type StoreKitContextValue = {
  ready: boolean;
  connectionError: string | null;
};

const StoreKitContext = createContext<StoreKitContextValue>({
  ready: false,
  connectionError: null,
});

export function StoreKitProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(Platform.OS !== 'ios');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let mounted = true;
    initConnection()
      .then(() => {
        if (mounted) {
          setReady(true);
          setConnectionError(null);
        }
      })
      .catch((error: any) => {
        if (mounted) setConnectionError(error?.message ?? 'Could not connect to the App Store.');
      });
    return () => {
      mounted = false;
      void endConnection();
    };
  }, []);

  const value = useMemo(() => ({ ready, connectionError }), [ready, connectionError]);
  return <StoreKitContext.Provider value={value}>{children}</StoreKitContext.Provider>;
}

export function useStoreKit() {
  return useContext(StoreKitContext);
}
