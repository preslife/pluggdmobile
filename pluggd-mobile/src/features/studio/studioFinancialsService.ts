import { supabase } from '../../lib/supabase';

export type StudioWalletBalance = {
  balanceCredits: number;
  pendingCredits: number;
  availableCredits: number;
};

export type StudioWalletActivity = {
  id: string;
  kind: string;
  amountCredits: number;
  createdAt: string;
};

export type StudioPayout = {
  id: string;
  source: 'catalogue' | 'creator_cashout';
  amount: number;
  currency: 'GBP' | 'USD';
  status: string;
  method: string | null;
  reference: string | null;
  requestedAt: string;
  processedAt: string | null;
};

export type StudioFinancialsWorkspace = {
  userId: string;
  balance: StudioWalletBalance;
  activity: StudioWalletActivity[];
  payouts: StudioPayout[];
  partialErrors: string[];
};

const numberValue = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function loadStudioFinancialsWorkspace(): Promise<StudioFinancialsWorkspace> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error('Sign in with a creator account to view Financials.');

  const [balanceResult, activityResult, payoutsResult, cashoutsResult] = await Promise.allSettled([
    (supabase as any).rpc('get_wallet_balance', { p_user_id: user.id }),
    (supabase as any)
      .from('wallet_ledger')
      .select('id,kind,amount_credits,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase as any)
      .from('payout_records')
      .select('id,user_id,amount,payout_method,payout_status,payout_reference,processed_at,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase as any)
      .from('creator_wallet_cashouts')
      .select('id,creator_id,usd_amount,status,payout_reference,requested_at,processed_at')
      .eq('creator_id', user.id)
      .order('requested_at', { ascending: false })
      .limit(20),
  ]);

  const partialErrors: string[] = [];
  const settledData = (result: PromiseSettledResult<any>, label: string) => {
    if (result.status === 'rejected') {
      partialErrors.push(label);
      return null;
    }
    if (result.value?.error) {
      partialErrors.push(label);
      return null;
    }
    return result.value?.data ?? null;
  };

  const balanceRow = settledData(balanceResult, 'Wallet balance') || {};
  const activityRows = settledData(activityResult, 'Wallet activity') || [];
  const payoutRows = settledData(payoutsResult, 'Catalogue payouts') || [];
  const cashoutRows = settledData(cashoutsResult, 'Creator cash-outs') || [];

  const payouts: StudioPayout[] = [
    ...payoutRows.map((row: any) => ({
      id: String(row.id),
      source: 'catalogue' as const,
      amount: numberValue(row.amount),
      currency: 'GBP' as const,
      status: String(row.payout_status || 'pending'),
      method: row.payout_method ? String(row.payout_method) : null,
      reference: row.payout_reference ? String(row.payout_reference) : null,
      requestedAt: String(row.created_at),
      processedAt: row.processed_at ? String(row.processed_at) : null,
    })),
    ...cashoutRows.map((row: any) => ({
      id: String(row.id),
      source: 'creator_cashout' as const,
      amount: numberValue(row.usd_amount),
      currency: 'USD' as const,
      status: String(row.status || 'pending'),
      method: null,
      reference: row.payout_reference ? String(row.payout_reference) : null,
      requestedAt: String(row.requested_at),
      processedAt: row.processed_at ? String(row.processed_at) : null,
    })),
  ].sort((left, right) => Date.parse(right.requestedAt) - Date.parse(left.requestedAt));

  return {
    userId: user.id,
    balance: {
      balanceCredits: numberValue(balanceRow.balance_credits),
      pendingCredits: numberValue(balanceRow.pending_credits),
      availableCredits: numberValue(balanceRow.available_credits),
    },
    activity: activityRows.map((row: any) => ({
      id: String(row.id),
      kind: String(row.kind || 'activity'),
      amountCredits: numberValue(row.amount_credits),
      createdAt: String(row.created_at),
    })),
    payouts,
    partialErrors,
  };
}
