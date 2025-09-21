import { supabase } from '@/integrations/supabase/client';

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'purchase' | 'spend' | 'refund' | 'earn';
  description: string;
  metadata?: {
    product_id?: string;
    product_type?: 'beat' | 'release' | 'pack' | 'license';
    stripe_payment_intent_id?: string;
    stripe_charge_id?: string;
  };
  created_at: string;
}

export interface CreditBalance {
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  last_updated: string;
}

export interface PurchaseItem {
  id: string;
  type: 'beat' | 'release' | 'pack' | 'license';
  title: string;
  price: number;
  license_type?: 'basic' | 'premium' | 'exclusive';
  metadata?: Record<string, any>;
}

class CreditSystemService {
  /**
   * Get user's current credit balance
   */
  async getBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No row found
        // Initialize balance for new user
        await this.initializeBalance(userId);
        return 0;
      }
      throw error;
    }

    return data?.balance || 0;
  }

  /**
   * Initialize credit balance for new user
   */
  private async initializeBalance(userId: string): Promise<void> {
    const { error } = await supabase
      .from('credit_balances')
      .insert({
        user_id: userId,
        balance: 0,
        total_earned: 0,
        total_spent: 0
      });

    if (error) {
      throw error;
    }
  }

  /**
   * Add credits to user's balance
   */
  async addCredits(
    userId: string, 
    amount: number, 
    description: string,
    metadata?: CreditTransaction['metadata']
  ): Promise<CreditTransaction> {
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_metadata: metadata || {}
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Spend credits from user's balance
   */
  async spendCredits(
    userId: string, 
    amount: number, 
    description: string,
    metadata?: CreditTransaction['metadata']
  ): Promise<CreditTransaction> {
    // Check balance first
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient credits');
    }

    const { data, error } = await supabase.rpc('spend_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_description: description,
      p_metadata: metadata || {}
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Process a purchase using credits
   */
  async processPurchase(
    userId: string, 
    items: PurchaseItem[]
  ): Promise<{
    success: boolean;
    transactions: CreditTransaction[];
    totalCost: number;
    message: string;
  }> {
    const totalCost = items.reduce((sum, item) => sum + item.price, 0);
    
    if (totalCost === 0) {
      // Free items - just create download records
      await this.createDownloadRecords(userId, items);
      return {
        success: true,
        transactions: [],
        totalCost: 0,
        message: 'Free download successful'
      };
    }

    const balance = await this.getBalance(userId);
    if (balance < totalCost) {
      return {
        success: false,
        transactions: [],
        totalCost,
        message: `Insufficient credits. You need ${totalCost} credits but only have ${balance}.`
      };
    }

    try {
      const transactions: CreditTransaction[] = [];
      
      // Process each item purchase
      for (const item of items) {
        if (item.price > 0) {
          const transaction = await this.spendCredits(
            userId,
            item.price,
            `Purchase: ${item.title}`,
            {
              product_id: item.id,
              product_type: item.type,
              license_type: item.license_type
            }
          );
          transactions.push(transaction);
        }
      }

      // Create download records
      await this.createDownloadRecords(userId, items);

      return {
        success: true,
        transactions,
        totalCost,
        message: 'Purchase successful'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create download records for purchased items
   */
  private async createDownloadRecords(userId: string, items: PurchaseItem[]): Promise<void> {
    const downloadRecords = items.map(item => ({
      user_id: userId,
      product_id: item.id,
      product_type: item.type,
      license_type: item.license_type || 'basic',
      metadata: item.metadata || {}
    }));

    const { error } = await supabase
      .from('user_downloads')
      .insert(downloadRecords);

    if (error) {
      throw error;
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Get user's purchased items
   */
  async getPurchasedItems(
    userId: string,
    productType?: 'beat' | 'release' | 'pack'
  ): Promise<any[]> {
    let query = supabase
      .from('user_downloads')
      .select(`
        *,
        beats(id, title, image_url, audio_url, genre, bpm, key, tags),
        releases(id, title, cover_art_url, artist, genre, description)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (productType) {
      query = query.eq('product_type', productType);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Check if user has purchased a specific item
   */
  async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_downloads')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .limit(1);

    if (error) {
      throw error;
    }

    return data && data.length > 0;
  }

  /**
   * Purchase credits with Stripe
   */
  async purchaseCreditsWithStripe(
    userId: string,
    creditAmount: number,
    priceInCents: number
  ): Promise<{ clientSecret: string }> {
    const { data, error } = await supabase.functions.invoke('create-credit-purchase', {
      body: {
        userId,
        creditAmount,
        priceInCents
      }
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Confirm credit purchase after Stripe payment
   */
  async confirmCreditPurchase(paymentIntentId: string): Promise<CreditTransaction> {
    const { data, error } = await supabase.functions.invoke('confirm-credit-purchase', {
      body: {
        paymentIntentId
      }
    });

    if (error) {
      throw error;
    }

    return data;
  }
}

export const creditSystem = new CreditSystemService();