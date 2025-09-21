import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface WalletBalance {
  balance_credits: number;
  pending_credits: number;
  available_credits: number;
}

interface WalletLedgerEntry {
  id: string;
  kind: 'topup' | 'spend_tip' | 'spend_purchase' | 'spend_battle' | 'award_prize' | 'convert_cashout' | 'convert_sub_applied';
  amount_credits: number;
  ref_type?: string;
  ref_id?: string;
  counterparty_user_id?: string;
  meta?: Record<string, any>;
  created_at: string;
}

interface WalletContextType {
  balance: WalletBalance;
  ledger: WalletLedgerEntry[];
  loading: boolean;
  refreshBalance: () => Promise<void>;
  refreshLedger: () => Promise<void>;
  topUpCredits: (amount: number) => Promise<{ url?: string; error?: string }>;
  spendCredits: (amount: number, kind: WalletLedgerEntry['kind'], ref_type?: string, ref_id?: string, counterparty_id?: string) => Promise<{ success: boolean; error?: string }>;
  cashOutCredits: (amount: number) => Promise<{ success: boolean; error?: string }>;
  applyCreditsToSubscription: (amount: number) => Promise<{ success: boolean; error?: string }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Credits to GBP conversion rate
const CREDITS_PER_GBP = 100;

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  
  // Safely try to use toast - will be undefined if toast context not available yet
  let toast: any;
  try {
    const toastHook = useToast();
    toast = toastHook.toast;
  } catch {
    // Toast context not available yet - create a no-op function
    toast = () => {};
  }
  
  const [balance, setBalance] = useState<WalletBalance>({
    balance_credits: 0,
    pending_credits: 0,
    available_credits: 0
  });
  
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshBalance = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_wallet_balance', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      
      setBalance((data as any) || {
        balance_credits: 0,
        pending_credits: 0,
        available_credits: 0
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet balance",
        variant: "destructive"
      });
    }
  };

  const refreshLedger = async (limit = 50) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallet_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      setLedger((data as any) || []);
    } catch (error) {
      console.error('Error fetching wallet ledger:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transaction history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const topUpCredits = async (amount: number) => {
    if (!user) return { error: 'User not authenticated' };
    
    try {
      const { data, error } = await supabase.functions.invoke('create-credits-checkout', {
        body: { credits_requested: amount }
      });
      
      if (error) throw error;
      
      return { url: data.url };
    } catch (error) {
      console.error('Error creating credits checkout:', error);
      return { error: 'Failed to create checkout session' };
    }
  };

  const spendCredits = async (
    amount: number, 
    kind: WalletLedgerEntry['kind'], 
    ref_type?: string, 
    ref_id?: string, 
    counterparty_id?: string
  ) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    if (balance.available_credits < amount) {
      return { success: false, error: 'Insufficient credits' };
    }
    
    try {
      const { error } = await supabase.functions.invoke('process-credits-transaction', {
        body: {
          amount_credits: -amount,
          kind,
          ref_type,
          ref_id,
          counterparty_user_id: counterparty_id
        }
      });
      
      if (error) throw error;
      
      await refreshBalance();
      await refreshLedger();
      
      return { success: true };
    } catch (error) {
      console.error('Error spending credits:', error);
      return { success: false, error: 'Failed to process transaction' };
    }
  };

  const cashOutCredits = async (amount: number) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    try {
      const { error } = await supabase.functions.invoke('cash-out-credits', {
        body: { amount_credits: amount }
      });
      
      if (error) throw error;
      
      await refreshBalance();
      await refreshLedger();
      
      toast({
        title: "Cash-out Requested",
        description: "Your cash-out request has been processed. You'll receive payment within 3-5 business days."
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error cashing out credits:', error);
      return { success: false, error: 'Failed to process cash-out' };
    }
  };

  const applyCreditsToSubscription = async (amount: number) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    try {
      const { error } = await supabase.functions.invoke('apply-credits-to-subscription', {
        body: { amount_credits: amount }
      });
      
      if (error) throw error;
      
      await refreshBalance();
      await refreshLedger();
      
      toast({
        title: "Credits Applied",
        description: "Credits have been applied to your subscription. They will be used on your next billing cycle."
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error applying credits to subscription:', error);
      return { success: false, error: 'Failed to apply credits' };
    }
  };

  useEffect(() => {
    if (user) {
      refreshBalance();
      refreshLedger();
    }
  }, [user]);

  return (
    <WalletContext.Provider value={{
      balance,
      ledger,
      loading,
      refreshBalance,
      refreshLedger,
      topUpCredits,
      spendCredits,
      cashOutCredits,
      applyCreditsToSubscription
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const formatCredits = (credits: number, options?: { locale?: string; showConversion?: boolean }) => {
  const { locale = 'en-GB', showConversion = false } = options || {};
  const formattedCredits = new Intl.NumberFormat(locale).format(credits);
  
  if (showConversion) {
    const gbp = creditsToGBP(credits);
    return `${formattedCredits} credits (£${gbp.toFixed(2)})`;
  }
  
  return `${formattedCredits} credits`;
};

export const formatCreditsWithGBP = (credits: number, locale: string = 'en-GB') => {
  return formatCredits(credits, { locale, showConversion: true });
};

export const creditsToGBP = (credits: number) => {
  return credits / CREDITS_PER_GBP;
};

export const gbpToCredits = (gbp: number) => {
  return Math.round(gbp * CREDITS_PER_GBP);
};