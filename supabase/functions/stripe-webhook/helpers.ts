export type Logger = (message: string, details?: any) => void;

export const createDownloadRecords = async (
  supabaseClient: any,
  userId: string,
  items: any[],
  sessionId: string,
  logger: Logger
) => {
  if (!items || items.length === 0) {
    return;
  }

  const downloadRecords = items.map((item) => ({
    user_id: userId,
    product_id: item.id,
    product_type: item.type,
    license_type: item.license_type || 'basic',
    metadata: {
      ...(item.metadata || {}),
      source: 'stripe_hybrid_purchase',
      stripe_session_id: sessionId,
    },
  }));

  const { error } = await supabaseClient
    .from('user_downloads')
    .insert(downloadRecords);

  if (error) {
    logger('Failed to create download records', { error: error.message, userId, sessionId });
  } else {
    logger('Created download records for hybrid purchase', { count: downloadRecords.length, userId, sessionId });
  }
};

export const handleChargeReversal = async (
  supabaseClient: any,
  charge: { id: string; metadata?: Record<string, any> | null } | null,
  eventId: string,
  reason: 'refund' | 'failure',
  logger: Logger
) => {
  if (!charge) {
    logger('Charge reversal skipped - missing charge object', { eventId });
    return;
  }

  const metadata = charge.metadata || {};
  const userId = metadata.user_id;
  if (!userId) {
    logger('Charge reversal skipped - no user metadata', { chargeId: charge.id });
    return;
  }

  const creditsApplied = metadata.credits_applied ? parseInt(metadata.credits_applied) : 0;
  if (!creditsApplied || Number.isNaN(creditsApplied) || creditsApplied <= 0) {
    logger('Charge reversal skipped - no credits to return', { chargeId: charge.id, creditsApplied });
    return;
  }

  const { data: existingEntry } = await supabaseClient
    .from('wallet_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('meta->>stripe_event_id', eventId)
    .maybeSingle();

  if (existingEntry) {
    logger('Charge reversal already processed', { chargeId: charge.id, eventId });
    return;
  }

  const { error } = await supabaseClient
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      kind: 'award_prize',
      amount_credits: creditsApplied,
      ref_type: 'stripe_charge',
      ref_id: charge.id,
      meta: {
        stripe_charge_id: charge.id,
        stripe_event_id: eventId,
        reason,
        credits_applied: creditsApplied,
        manual_amount_credits: metadata.manual_amount_credits,
      },
    });

  if (error) {
    logger('Failed to recredit wallet on charge reversal', { error: error.message, chargeId: charge.id });
  } else {
    logger('Recredited wallet after charge reversal', { chargeId: charge.id, creditsApplied, reason });
  }
};
