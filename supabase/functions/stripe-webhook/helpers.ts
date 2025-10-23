export interface Logger {
  info: (event: string, details?: Record<string, unknown>) => Promise<void> | void;
  warn: (event: string, details?: Record<string, unknown>) => Promise<void> | void;
  error: (event: string, details?: Record<string, unknown>) => Promise<void> | void;
}

const mapStripeStatusToMembershipStatus = (
  status: string | null | undefined
): 'active' | 'cancelled' | 'expired' | 'past_due' => {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete_expired':
      return 'expired';
    default:
      return 'active';
  }
};

const mapIntervalToBillingPeriod = (
  interval: string | null | undefined
): 'monthly' | 'yearly' | 'lifetime' => {
  if (!interval) return 'monthly';
  switch (interval) {
    case 'year':
    case 'annual':
      return 'yearly';
    case 'month':
      return 'monthly';
    case 'forever':
    case 'lifetime':
      return 'lifetime';
    default:
      return 'monthly';
  }
};

interface SyncMembershipOptions {
  discordSync?: (input: { creatorId: string; fanId: string; action: 'grant' | 'revoke' }) => Promise<void>;
}

export const syncMembershipFromSubscription = async (
  supabaseClient: any,
  subscription: any,
  logger: Logger,
  options: SyncMembershipOptions = {}
) => {
  if (!subscription) {
    await logger.warn('membership_sync_missing_subscription', { subscriptionId: subscription?.id ?? null });
    return { processed: false };
  }

  const metadata = subscription.metadata || {};
  const tierId =
    metadata.membershipTierId ||
    metadata.membership_tier_id ||
    metadata.tier_id ||
    null;

  if (!tierId) {
    await logger.warn('membership_sync_missing_tier_metadata', { subscriptionId: subscription.id });
    return { processed: false };
  }

  const fanId = metadata.fanId || metadata.fan_id || metadata.user_id || null;
  const creatorIdFromMetadata = metadata.creatorId || metadata.creator_id || null;
  const stripePriceId =
    metadata.stripe_price_id ||
    metadata.price_id ||
    subscription?.items?.data?.[0]?.price?.id ||
    null;

  const billingInterval =
    subscription?.items?.data?.[0]?.plan?.interval ||
    subscription?.items?.data?.[0]?.price?.recurring?.interval ||
    null;

  const billing_period = mapIntervalToBillingPeriod(billingInterval);
  const membershipStatus = mapStripeStatusToMembershipStatus(subscription.status);

  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const cancelAt = subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000).toISOString()
    : null;
  const cancelledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : membershipStatus === 'cancelled'
      ? new Date().toISOString()
      : null;

  const metadataPayload = {
    ...(stripePriceId ? { stripe_price_id: stripePriceId } : {}),
    cancel_at: cancelAt,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    stripe_status: subscription.status,
  };

  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id || null;

  const { data: tierRow, error: tierError } = await supabaseClient
    .from('membership_tiers')
    .select('id, owner_id, owner_type, name')
    .eq('id', tierId)
    .maybeSingle();

  if (tierError) {
    await logger.error('membership_sync_tier_lookup_error', { error: tierError.message, tierId });
    return { processed: false, error: tierError };
  }

  if (!tierRow) {
    await logger.warn('membership_sync_missing_tier', { tierId });
    return { processed: false };
  }

  const membershipUpdate = {
    billing_period,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    status: membershipStatus,
    metadata: metadataPayload,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: stripeCustomerId,
    cancelled_at: cancelledAt,
    expires_at: subscription.cancel_at_period_end && currentPeriodEnd ? currentPeriodEnd : null,
    updated_at: new Date().toISOString(),
  };

  const { data: existingMembership, error: membershipLookupError } = await supabaseClient
    .from('memberships')
    .select('id, user_id, status')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (membershipLookupError) {
    await logger.error('membership_lookup_error', { error: membershipLookupError.message, subscriptionId: subscription.id });
    return { processed: false, error: membershipLookupError };
  }

  let membershipId: string | null = existingMembership?.id ?? null;
  let membershipUserId: string | null = existingMembership?.user_id ?? null;

  if (!membershipId && fanId) {
    const { data: membershipByUser, error: membershipByUserError } = await supabaseClient
      .from('memberships')
      .select('id, user_id, status')
      .eq('user_id', fanId)
      .eq('tier_id', tierId)
      .maybeSingle();

    if (membershipByUserError) {
      await logger.error('membership_user_lookup_error', { error: membershipByUserError.message, tierId, fanId });
      return { processed: false, error: membershipByUserError };
    }

    if (membershipByUser) {
      membershipId = membershipByUser.id;
      membershipUserId = membershipByUser.user_id;
    }
  }

  if (membershipId) {
    const { error: updateError } = await supabaseClient
      .from('memberships')
      .update({
        ...membershipUpdate,
        tier_id: tierId,
        user_id: membershipUserId ?? fanId,
      })
      .eq('id', membershipId);

    if (updateError) {
      await logger.error('membership_update_failed', { error: updateError.message, membershipId });
      return { processed: false, error: updateError };
    }
  } else if (fanId) {
    const insertPayload = {
      ...membershipUpdate,
      tier_id: tierId,
      user_id: fanId,
      started_at: currentPeriodStart,
      support_amount: 0,
    };

    const { data: insertResult, error: insertError } = await supabaseClient
      .from('memberships')
      .insert(insertPayload)
      .select('id, user_id')
      .maybeSingle();

    if (insertError) {
      await logger.error('membership_create_failed', { error: insertError.message, tierId, fanId });
      return { processed: false, error: insertError };
    }

    membershipId = insertResult?.id ?? null;
    membershipUserId = insertResult?.user_id ?? fanId;
  } else {
    await logger.warn('membership_sync_missing_fan', {
      subscriptionId: subscription.id,
      tierId,
      fanId,
    });
    return { processed: false };
  }

  const { count: activeCount, error: countError } = await supabaseClient
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('tier_id', tierId)
    .eq('status', 'active');

  if (countError) {
    await logger.error('membership_active_count_failed', { error: countError.message, tierId });
  } else {
    const { error: tierUpdateError } = await supabaseClient
      .from('membership_tiers')
      .update({ current_members: activeCount ?? 0 })
      .eq('id', tierId);

    if (tierUpdateError) {
      await logger.error('membership_tier_count_update_failed', { error: tierUpdateError.message, tierId });
    }
  }

  try {
    await supabaseClient
      .from('system_logs')
      .insert({
        level: membershipStatus === 'active' ? 1 : 2,
        component: 'memberships.webhook',
        action: 'membership_sync',
        user_id: membershipUserId ?? fanId,
        message: `Membership ${membershipStatus}`,
        metadata: {
          membership_id: membershipId,
          tier_id: tierId,
          tier_name: tierRow.name,
          stripe_subscription_id: subscription.id,
          stripe_status: subscription.status,
          current_period_end: currentPeriodEnd,
          cancel_at: cancelAt,
        },
      });
  } catch (logError: any) {
    await logger.error('membership_log_insert_failed', { error: logError.message, tierId });
  }

  const creatorId = creatorIdFromMetadata || tierRow.owner_id;
  const discordAction =
    membershipStatus === 'active'
      ? 'grant'
      : membershipStatus === 'cancelled' || membershipStatus === 'expired'
        ? 'revoke'
        : null;

  if (creatorId && membershipUserId && discordAction) {
    try {
      if (options.discordSync) {
        await options.discordSync({
          creatorId,
          fanId: membershipUserId,
          action: discordAction,
        });
      } else if (supabaseClient?.functions?.invoke) {
        await supabaseClient.functions.invoke('discord-sync-subscriber', {
          body: {
            creator_id: creatorId,
            fan_user_id: membershipUserId,
            action: discordAction,
          },
        });
      }
    } catch (discordError: any) {
      await logger.warn('membership_discord_sync_failed', { error: discordError.message, creatorId, membershipId });
    }
  }

  return {
    processed: true,
    membershipId,
    tierId,
    userId: membershipUserId ?? fanId ?? null,
    status: membershipStatus,
    currentPeriodStart,
    currentPeriodEnd,
    creatorId: creatorIdFromMetadata || tierRow.owner_id,
    stripeCustomerId,
  };
};

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
    await logger.error('download_record_create_failed', { error: error.message, userId, sessionId });
  } else {
    await logger.info('download_records_created', { count: downloadRecords.length, userId, sessionId });
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
    await logger.warn('charge_reversal_missing_charge', { eventId });
    return;
  }

  const metadata = charge.metadata || {};
  const userId = metadata.user_id;
  if (!userId) {
    await logger.warn('charge_reversal_missing_user_metadata', { chargeId: charge.id });
    return;
  }

  const creditsApplied = metadata.credits_applied ? parseInt(metadata.credits_applied) : 0;
  if (!creditsApplied || Number.isNaN(creditsApplied) || creditsApplied <= 0) {
    await logger.warn('charge_reversal_no_credits', { chargeId: charge.id, creditsApplied });
    return;
  }

  const { data: existingEntry } = await supabaseClient
    .from('wallet_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('meta->>stripe_event_id', eventId)
    .maybeSingle();

  if (existingEntry) {
    await logger.info('charge_reversal_already_processed', { chargeId: charge.id, eventId });
    return;
  }

  let reversalOfEntryId: string | null = null;

  const { data: originalEntry } = await supabaseClient
    .from('wallet_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', 'spend_purchase')
    .eq('meta->>stripe_charge_id', charge.id)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (originalEntry?.id) {
    reversalOfEntryId = originalEntry.id;
  } else {
    await logger.warn('charge_reversal_original_entry_missing', { chargeId: charge.id, userId });
  }

  const { error } = await supabaseClient
    .from('wallet_ledger')
    .insert({
      user_id: userId,
      kind: 'award_prize',
      amount_credits: creditsApplied,
      ref_type: 'stripe_charge',
      ref_id: charge.id,
      reversal_of_entry_id: reversalOfEntryId,
      meta: {
        stripe_charge_id: charge.id,
        stripe_event_id: eventId,
        reason,
        credits_applied: creditsApplied,
        manual_amount_credits: metadata.manual_amount_credits,
      },
    });

  if (error) {
    await logger.error('charge_reversal_recredit_failed', { error: error.message, chargeId: charge.id });
  } else {
    await logger.info('charge_reversal_recredited', { chargeId: charge.id, creditsApplied, reason });
  }
};
