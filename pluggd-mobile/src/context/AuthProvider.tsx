import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import {
  consumeLaunchAccessNotice,
  enforceLaunchAccess,
  storeLaunchAccessNotice,
} from "../features/auth/launch-access";
import { LAUNCH_ACCESS_REQUIRED } from "../config/environment";
import { registerMobilePushToken } from "../lib/localNotifications";
import { supabase } from "../lib/supabase";
import { clearSupabaseAuthStorage } from "../lib/storage";
import { privateDateOfBirth } from "../features/auth/private-date-of-birth";
import { roomViewState } from "../features/listeningRoom/roomViewState";
import { clearPendingSplitReturn } from "../features/studio/splitPendingReturn";

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

  useEffect(() => { void privateDateOfBirth.cleanupExpired().catch(() => undefined); }, []);

  useEffect(() => {
    let mounted = true;
    let previousAccountId: string | null = null;

    const clearStaleSession = async () => {
      clearPendingSplitReturn();
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      await clearSupabaseAuthStorage().catch(() => undefined);
      if (!mounted) return;
      setSession(null);
      setUser(null);
    };

    const applySession = async (nextSession: Session | null) => {
      if (!mounted) return;
      const nextAccountId = nextSession?.user.id ?? null;
      // Preserve a guest invitation through first sign-in; never carry it
      // between authenticated accounts or past a sign-out.
      if (previousAccountId !== nextAccountId) roomViewState.clear();
      if (previousAccountId && previousAccountId !== nextAccountId) clearPendingSplitReturn();
      previousAccountId = nextAccountId;
      if (!LAUNCH_ACCESS_REQUIRED) {
        if (!mounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }

      const access = await enforceLaunchAccess(nextSession);
      if (!mounted) return;

      if (!access.allowed) {
        clearPendingSplitReturn();
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

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') clearPendingSplitReturn();
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

  // Run outside Supabase's auth callback. Email confirmation may establish a
  // session long after signup; only this identity's expiring local intent is read.
  useEffect(() => {
    if (!session?.user.id) return;
    let current = true;
    const timer = setTimeout(() => {
      void privateDateOfBirth.resumeSignup(session.user.id, () => current).catch(() => {
        // Retain the intent for retry in the in-app DOB prompt. Never log DOB.
      });
    }, 0);
    return () => { current = false; clearTimeout(timer); };
  }, [session?.user.id, session?.access_token]);

  const signOut = async () => {
    clearPendingSplitReturn();
    roomViewState.clear();
    if (session?.access_token) {
      await supabase.functions
        .invoke('mobile-studio-handoff', { body: { action: 'revoke' } })
        .catch(() => undefined);
    }
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    await clearSupabaseAuthStorage().catch(() => undefined);
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
