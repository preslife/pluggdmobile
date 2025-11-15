import { supabase } from '@/integrations/supabase/client';

export interface CreditPolicy {
  maxCartPercent: number;
}

const DEFAULT_POLICY: CreditPolicy = {
  maxCartPercent: 0.5,
};

class CreditPolicyService {
  async getCurrentPolicy(): Promise<CreditPolicy> {
    try {
      const { data, error } = await supabase
        .from('credit_rules')
        .select('max_cart_percent')
        .order('effective_at', { ascending: false, nullsLast: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn('Failed to load credit policy, using default:', error);
        }
        return DEFAULT_POLICY;
      }

      const maxCartPercent = Number(data?.max_cart_percent);
      if (!Number.isFinite(maxCartPercent) || maxCartPercent <= 0) {
        return DEFAULT_POLICY;
      }

      return { maxCartPercent };
    } catch (error) {
      console.warn('Unexpected error loading credit policy, using default:', error);
      return DEFAULT_POLICY;
    }
  }
}

export const creditPolicyService = new CreditPolicyService();
