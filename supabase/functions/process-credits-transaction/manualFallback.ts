import type { CreditsTransactionPayload } from './logic.ts';

type JsonRecord = Record<string, any>;

export type ManualEntryInput = {
  order_id?: string | null;
  item_type?: string | null;
  item_id?: string | null;
  operator_id?: string | null;
  direction?: 'debit' | 'credit';
  amount_credits?: number | null;
  metadata?: JsonRecord | null;
} | null;

export interface ManualTransactionPayload extends CreditsTransactionPayload {
  manual_entry?: ManualEntryInput;
  reversal_of_entry_id?: string | null;
}

export interface ManualTransactionResult {
  ledgerEntryId: string;
  manualEntryId: string | null;
  counterpartyError: string | null;
}

function normalizeMeta(meta: unknown): JsonRecord {
  if (!meta || typeof meta !== 'object') {
    return {};
  }
  return meta as JsonRecord;
}

function normalizeInsertResponse(response: any) {
  if (!response) {
    return { data: null, error: null };
  }

  if (typeof response.then === 'function' && typeof response.select !== 'function') {
    return response;
  }

  if (typeof response.select === 'function') {
    return response.select('id').single().then((result: any) => ({
      data: result?.data ? [{ id: result.data.id }] : null,
      error: result?.error ?? null,
    }));
  }

  return response;
}

export async function performManualTransactionFallback(
  supabaseClient: any,
  userId: string,
  payload: ManualTransactionPayload,
): Promise<ManualTransactionResult> {
  const {
    amount_credits,
    kind,
    ref_type,
    ref_id,
    counterparty_user_id,
    meta,
    manual_entry,
    reversal_of_entry_id,
  } = payload;

  const normalizedMeta = normalizeMeta(meta);

  const ledgerEntryId = crypto.randomUUID();
  const { error: ledgerError } = await supabaseClient.from('wallet_ledger').insert({
    id: ledgerEntryId,
    user_id: userId,
    kind,
    amount_credits,
    ref_type: ref_type ?? null,
    ref_id: ref_id ?? null,
    counterparty_user_id: counterparty_user_id ?? null,
    meta: normalizedMeta,
    reversal_of_entry_id: reversal_of_entry_id ?? null,
  } as JsonRecord);

  if (ledgerError) {
    throw new Error(`Ledger insert failed: ${ledgerError.message}`);
  }

  let manualEntryId: string | null = null;

  if (manual_entry) {
    const manualPayload: JsonRecord = {
      ledger_entry_id: ledgerEntryId,
      user_id: userId,
      order_id: manual_entry.order_id ?? ref_id ?? null,
      item_type: manual_entry.item_type ?? normalizedMeta?.product_type ?? null,
      item_id: manual_entry.item_id ?? normalizedMeta?.product_id ?? null,
      operator_id: manual_entry.operator_id ?? userId,
      direction: manual_entry.direction ?? (amount_credits < 0 ? 'debit' : 'credit'),
      amount_credits: manual_entry.amount_credits ?? Math.abs(amount_credits),
      metadata: manual_entry.metadata ?? { ...normalizedMeta, kind },
    };

    Object.keys(manualPayload).forEach((key) => {
      if (manualPayload[key] === undefined) {
        delete manualPayload[key];
      }
    });

    const manualInsert = supabaseClient.from('wallet_manual_entries').insert(manualPayload as JsonRecord);
    const { data: manualData, error: manualError } = await normalizeInsertResponse(manualInsert);

    if (manualError) {
      const message = typeof manualError?.message === 'string' ? manualError.message : String(manualError);
      console.error(
        '[PROCESS-CREDITS-TRANSACTION] Manual entry insert failed during fallback',
        { error: message },
      );
    } else {
      const insertedManual = Array.isArray(manualData) ? manualData[0] : manualData;
      if (insertedManual?.id) {
        manualEntryId = insertedManual.id as string;
      }
    }
  }

  let counterpartyError: string | null = null;

  if (counterparty_user_id && (kind === 'spend_tip' || kind === 'spend_purchase')) {
    const counterpartyPayload: JsonRecord = {
      id: crypto.randomUUID(),
      user_id: counterparty_user_id,
      kind: kind === 'spend_tip' ? 'spend_tip' : 'spend_purchase',
      amount_credits: Math.abs(amount_credits),
      ref_type: ref_type ?? null,
      ref_id: ref_id ?? null,
      counterparty_user_id: userId,
      meta: normalizedMeta,
    };

    const { error: counterpartyInsertError } = await supabaseClient
      .from('wallet_ledger')
      .insert(counterpartyPayload as JsonRecord);

    if (counterpartyInsertError) {
      counterpartyError =
        typeof counterpartyInsertError?.message === 'string'
          ? counterpartyInsertError.message
          : String(counterpartyInsertError);
    }
  }

  return {
    ledgerEntryId,
    manualEntryId,
    counterpartyError,
  };
}
