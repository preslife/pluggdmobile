import type { ManualEntryInput } from '../process-credits-transaction/manualFallback.ts';
import { performManualTransactionFallback } from '../process-credits-transaction/manualFallback.ts';

const WALLET_TRANSACTION_RPC = 'wallet_process_transaction';

type LoggerLike = {
  warn?: (event: string, details?: Record<string, unknown>) => Promise<void> | void;
};

export interface WalletTransactionInput {
  userId: string;
  amountCredits: number;
  kind: string;
  refType?: string | null;
  refId?: string | null;
  counterpartyUserId?: string | null;
  meta?: Record<string, any> | null;
  manualEntry?: ManualEntryInput;
  reversalOfEntryId?: string | null;
}

export interface WalletTransactionResponse {
  ledgerEntryId: string;
  manualEntryId: string | null;
  usedFallback: boolean;
  counterpartyError?: string | null;
}

interface RecordWalletTransactionOptions {
  fallbackOnError?: boolean;
  logger?: LoggerLike;
  correlationId?: string;
}

const normalizeTransactionResponse = (data: any) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected wallet transaction response');
  }

  const ledgerEntryId =
    (data as any).ledgerEntryId ||
    (data as any).ledger_entry_id ||
    (data as any).ledger_id ||
    (data as any).id;

  if (!ledgerEntryId || typeof ledgerEntryId !== 'string') {
    throw new Error('Wallet transaction response missing ledger entry id');
  }

  const manualEntryId =
    typeof (data as any).manualEntryId === 'string'
      ? (data as any).manualEntryId
      : typeof (data as any).manual_entry_id === 'string'
      ? (data as any).manual_entry_id
      : null;

  return {
    ledgerEntryId,
    manualEntryId,
  };
};

const isComplianceError = (error: any) => {
  const message = typeof error?.message === 'string' ? error.message : '';
  return message.includes('WALLET_BALANCE_NEGATIVE');
};

const toManualPayload = (input: WalletTransactionInput) => ({
  amount_credits: input.amountCredits,
  kind: input.kind,
  ref_type: input.refType ?? null,
  ref_id: input.refId ?? null,
  counterparty_user_id: input.counterpartyUserId ?? null,
  meta: input.meta ?? {},
  manual_entry: input.manualEntry ?? undefined,
  reversal_of_entry_id: input.reversalOfEntryId ?? null,
});

export const recordWalletTransaction = async (
  supabaseClient: any,
  input: WalletTransactionInput,
  options: RecordWalletTransactionOptions = {},
): Promise<WalletTransactionResponse> => {
  const { fallbackOnError = true, logger, correlationId } = options;

  const rpcPayload = {
    user_id: input.userId,
    amount_credits: input.amountCredits,
    kind: input.kind,
    ref_type: input.refType ?? null,
    ref_id: input.refId ?? null,
    counterparty_user_id: input.counterpartyUserId ?? null,
    meta: input.meta ?? {},
    manual_entry: input.manualEntry ?? undefined,
    reversal_of_entry_id: input.reversalOfEntryId ?? null,
  };

  let rpcResponse: { data: unknown; error: any } | null = null;
  let rpcError: any = null;

  try {
    rpcResponse = await supabaseClient.rpc(
      WALLET_TRANSACTION_RPC,
      rpcPayload as Record<string, unknown>,
    );
  } catch (error) {
    rpcError = error;
    rpcResponse = { data: null, error };
  }

  const data = rpcResponse?.data ?? null;
  const error = rpcResponse?.error ?? rpcError;

  if (!error && data) {
    const normalized = normalizeTransactionResponse(data);
    return {
      ledgerEntryId: normalized.ledgerEntryId,
      manualEntryId: normalized.manualEntryId,
      usedFallback: false,
      counterpartyError: null,
    };
  }

  if (!fallbackOnError || !error || isComplianceError(error)) {
    throw error ?? new Error('Wallet transaction failed without error context');
  }

  logger?.warn?.('wallet_transaction_rpc_failed', {
    message: typeof error?.message === 'string' ? error.message : 'unknown_error',
    correlation_id: correlationId,
  });

  const fallbackResult = await performManualTransactionFallback(
    supabaseClient,
    input.userId,
    toManualPayload(input),
  );

  return {
    ledgerEntryId: fallbackResult.ledgerEntryId,
    manualEntryId: fallbackResult.manualEntryId,
    usedFallback: true,
    counterpartyError: fallbackResult.counterpartyError,
  };
};
