import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import {
  consumeLaunchAccessNotice,
  enforceLaunchAccess,
  storeLaunchAccessNotice,
} from "../features/auth/launch-access";
import { registerMobilePushToken } from "../lib/localNotifications";
import { supabase } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  launchAccessNotice: string | null;
  clearLaunchAccessNotice: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  launchAccessNotice: null,
  clearLaunchAccessNotice: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [launchAccessNotice, setLaunchAccessNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const clearStaleSession = async () => {
      await supabase.auth.signOut({ scope: 'local' });
      if (!mounted) return;
      setSession(null);
      setUser(null);
    };

    const applySession = async (nextSession: Session | null) => {
      const access = await enforceLaunchAccess(nextSession);
      if (!mounted) return;

      if (!access.allowed) {
        const message =
          access.message ?? 'Access code required for new accounts during early access.';
        await storeLaunchAccessNotice(message);
        setLaunchAccessNotice(message);
        setSession(null);
        setUser(null);
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        const storedNotice = await consumeLaunchAccessNotice();
        if (storedNotice && mounted) setLaunchAccessNotice(storedNotice);
        await applySession(data.session);
      })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes('refresh token')) {
          await clearStaleSession();
          return;
        }
        console.error('[AuthProvider] Failed to restore session:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      void applySession(newSession);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void registerMobilePushToken({ requestPermission: false });
  }, [user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setSession(null);
  };

  const clearLaunchAccessNotice = async () => {
    await consumeLaunchAccessNotice();
    setLaunchAccessNotice(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, launchAccessNotice, clearLaunchAccessNotice, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
