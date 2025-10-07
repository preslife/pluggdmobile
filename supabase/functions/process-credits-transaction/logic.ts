export type WalletTransactionKind =
  | 'topup'
  | 'spend_tip'
  | 'spend_purchase'
  | 'spend_battle'
  | 'award_prize'
  | 'convert_cashout'
  | 'convert_sub_applied'
  | 'spend_gift'
  | 'earn_gift';

export interface CreditsTransactionPayload {
  amount_credits: number;
  kind: WalletTransactionKind;
  ref_type?: string | null;
  ref_id?: string | null;
  counterparty_user_id?: string | null;
  meta?: Record<string, any> | null;
}

interface SupabaseQueryBuilder<T> {
  insert(values: T | T[]): Promise<{ error: { message: string } | null }>;
}

interface SupabaseRpcResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface SupabaseClientLike {
  rpc<T = unknown>(fn: string, params: Record<string, any>): Promise<SupabaseRpcResponse<T>>;
  from<T extends Record<string, any>>(table: string): SupabaseQueryBuilder<T>;
}

export async function processCreditsTransaction(
  supabaseClient: SupabaseClientLike,
  userId: string,
  payload: CreditsTransactionPayload,
) {
  const { amount_credits, kind, ref_type, ref_id, counterparty_user_id, meta = {} } = payload;

  if (amount_credits === undefined || amount_credits === null || !kind) {
    throw new Error('Invalid transaction data');
  }

  if (amount_credits < 0) {
    const { data: balanceData, error: balanceError } = await supabaseClient.rpc<{ available_credits: number }>(
      'get_wallet_balance',
      { p_user_id: userId },
    );

    if (balanceError) {
      throw new Error(`Balance check failed: ${balanceError.message}`);
    }

    const availableCredits = Number((balanceData as any)?.available_credits ?? 0);
    if (availableCredits < Math.abs(amount_credits)) {
      throw new Error('Insufficient credits');
    }
  }

  const { error: ledgerError } = await supabaseClient
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      kind,
      amount_credits,
      ref_type,
      ref_id,
      counterparty_user_id,
      meta,
    } as any);

  if (ledgerError) {
    throw new Error(`Ledger insert failed: ${ledgerError.message}`);
  }

  let counterpartyError: string | null = null;

  if (counterparty_user_id && (kind === 'spend_tip' || kind === 'spend_purchase')) {
    const counterpartyKind = kind === 'spend_tip' ? 'spend_tip' : 'spend_purchase';
    const { error: counterpartyInsertError } = await supabaseClient.from('wallet_ledger').insert({
      user_id: counterparty_user_id,
      kind: counterpartyKind,
      amount_credits: Math.abs(amount_credits),
      ref_type,
      ref_id,
      counterparty_user_id: userId,
      meta,
    } as any);

    if (counterpartyInsertError) {
      counterpartyError = counterpartyInsertError.message;
    }
  }

  return { success: true, counterparty_error: counterpartyError };
}
