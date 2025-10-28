import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  createDownloadRecords,
  handleChargeReversal,
  syncMembershipFromSubscription,
  type Logger,
} from "./helpers.ts";
import { createPreferenceCache, shouldSendNotification } from "../_shared/notificationPreferences.ts";

type SystemLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

const LEVEL_TO_NUMBER: Record<SystemLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

interface SystemLoggerContext {
  component: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

interface SystemLogger extends Logger {
  with: (metadata: Record<string, unknown>) => Logger;
}

const emitSystemLog = async (
  client: any,
  context: SystemLoggerContext,
  level: SystemLogLevel,
  event: string,
  metadata?: Record<string, unknown>,
) => {
  const payload = {
    level: LEVEL_TO_NUMBER[level],
    message: event,
    action: event,
    component: context.component,
    session_id: context.requestId ?? null,
    timestamp: new Date().toISOString(),
    metadata,
  };
  console.log(JSON.stringify({ source: 'system_logs', ...payload }));
  try {
    await client.from('system_logs').insert([payload]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[system_logs] insert_failed', { event, message });
  }
};

const createSystemLogger = (client: any, context: SystemLoggerContext): SystemLogger => {
  const baseMetadata = context.metadata ?? {};
  const emit = (level: SystemLogLevel, event: string, extra?: Record<string, unknown>) =>
    emitSystemLog(client, context, level, event, { ...baseMetadata, ...(extra ?? {}) });

  const logger: SystemLogger = {
    info: (event, details) => emit('info', event, details),
    warn: (event, details) => emit('warn', event, details),
    error: (event, details) => emit('error', event, details),
    with: (metadata: Record<string, unknown>) =>
      createSystemLogger(client, {
        ...context,
        metadata: { ...baseMetadata, ...metadata },
      }),
  };

  return logger;
};


const normalizeEventName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const scopeLogger = (logger: Logger, metadata: Record<string, unknown>): Logger => ({
  info: (event: string, details?: Record<string, unknown>) => logger.info(event, { ...metadata, ...(details ?? {}) }),
  warn: (event: string, details?: Record<string, unknown>) => logger.warn(event, { ...metadata, ...(details ?? {}) }),
  error: (event: string, details?: Record<string, unknown>) => logger.error(event, { ...metadata, ...(details ?? {}) }),
});

// Handle split attribution for digital purchases
const handleSplitAttribution = async (
  session: any,
  supabaseClient: any,
  stripe: any,
  logger: Logger,
) => {
  try {
    await logger.info('split_attribution_processing', { sessionId: session.id });

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
    });

    for (const item of lineItems.data) {
      const product = item.price.product;
      const metadata = product.metadata || {};
      const contentType = metadata.content_type;
      const contentId = metadata.content_id;

      if (!contentType || !contentId) continue;

      const { data: splits, error: splitsError } = await supabaseClient
        .from('content_splits')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId);

      if (splitsError) {
        throw splitsError;
      }

      const grossAmount = item.amount_total || 0;
      const currency = session.currency || 'gbp';
      const platformFeeRate = 0.15;
      const platformFee = Math.round(grossAmount * platformFeeRate);
      const netAmount = grossAmount - platformFee;

      const fallbackCreator =
        metadata.creator_id ||
        metadata.owner_id ||
        session.metadata?.creator_id ||
        session.metadata?.seller_id;

      if (!splits || splits.length === 0) {
        if (!fallbackCreator) {
          await logger.warn('split_attribution_missing_recipient', { contentType, contentId, sessionId: session.id });
          continue;
        }

        const { error: statementError } = await supabaseClient
          .from('creator_statements')
          .insert({
            user_id: fallbackCreator,
            content_type: contentType,
            content_id: contentId,
            source_type: 'order',
            source_id: session.id,
            gross_amount_cents: grossAmount,
            fee_amount_cents: platformFee,
            net_amount_cents: netAmount,
            split_percent: 100,
            currency,
            metadata: {
              product_name: product?.name,
              stripe_session_id: session.id,
              line_item_id: item.id,
            },
          });

        if (statementError) {
          await logger.error('split_attribution_fallback_statement_failed', {
            error: statementError.message,
            contentType,
            contentId,
            sessionId: session.id,
          });
        }

        continue;
      }

      for (const split of splits) {
        const percent = Number(split.percent) || 0;
        const grossShare = Math.round(grossAmount * (percent / 100));
        const feeShare = Math.round(platformFee * (percent / 100));
        const netShare = Math.round(netAmount * (percent / 100));

        const { error: statementError } = await supabaseClient
          .from('creator_statements')
          .insert({
            user_id: split.payee_user_id,
            content_type: contentType,
            content_id: contentId,
            source_type: 'order',
            source_id: session.id,
            gross_amount_cents: grossShare,
            fee_amount_cents: feeShare,
            net_amount_cents: netShare,
            split_percent: percent,
            currency,
            metadata: {
              product_name: product?.name,
              stripe_session_id: session.id,
              line_item_id: item.id,
            },
          });

        if (statementError) {
          await logger.error('split_attribution_statement_failed', {
            error: statementError.message,
            split,
            sessionId: session.id,
          });
        }

        const { error: payoutError } = await supabaseClient
          .from('producer_payouts')
          .insert({
            producer_id: split.payee_user_id,
            beat_id: contentType === 'beat' ? contentId : null,
            purchase_id: session.id,
            gross_amount: grossShare,
            platform_fee: feeShare,
            net_amount: netShare,
            payout_status: 'pending',
          });

        if (payoutError) {
          await logger.error('split_payout_create_failed', {
            error: payoutError.message,
            split,
            sessionId: session.id,
          });
        } else {
          await logger.info('split_payout_created', {
            payeeId: split.payee_user_id,
            percent,
            amount: netShare,
            sessionId: session.id,
          });
        }
      }
    }
  } catch (error: any) {
    await logger.error('split_attribution_failed', { error: error.message, sessionId: session.id });
  }
};

serve(async (req) => {
  try {
    await logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const preferenceCache = createPreferenceCache();

    const requestId = crypto.randomUUID();
    const requestUrl = new URL(req.url);
    const baseLogger = createSystemLogger(supabaseClient, {
      component: 'supabase.stripe-webhook',
      requestId,
      metadata: { path: requestUrl.pathname, method: req.method },
    });
    let currentLogger: Logger = baseLogger;
    const logStep = (message: string, details?: Record<string, unknown>) =>
      currentLogger.info(normalizeEventName(message), { message, ...(details ?? {}) });

    await logStep('Webhook received');

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    currentLogger = baseLogger.with({ eventId: event.id, eventType: event.type });
    await logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await logStep("Checkout session completed", { sessionId: session.id });

        if (session.metadata?.transaction_type === 'crowdfunding_contribution') {
          const campaignId = session.metadata.campaign_id;
          const supporterId = session.metadata.user_id ?? null;
          const rewardId = session.metadata.reward_id ?? null;
          const supporterNote = session.metadata.supporter_note ?? null;
          const campaignSlug = session.metadata.campaign_slug ?? null;
          const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
          const amountCents = session.amount_total ?? Number(session.metadata.amount_cents ?? 0);

          if (!campaignId || !amountCents) {
            await logStep('Crowdfunding contribution missing campaign or amount metadata', { sessionId: session.id });
            break;
          }

          const upsertPayload: Record<string, unknown> = {
            campaign_id: campaignId,
            supporter_id: supporterId,
            reward_id: rewardId || null,
            contribution_amount_cents: amountCents,
            status: 'pledged',
            stripe_payment_intent_id: paymentIntentId,
            stripe_session_id: session.id,
            metadata: {
              supporter_note: supporterNote,
              stripe_customer_id: session.customer,
              currency: session.currency,
              campaign_slug: campaignSlug,
            },
          };

          const { data: supporterRecord, error: supporterError } = await supabaseClient
            .from('campaign_supporters')
            .upsert(upsertPayload, { onConflict: 'stripe_payment_intent_id' })
            .select()
            .single();

          if (supporterError) {
            await logStep('Failed to record crowdfunding contribution', { error: supporterError.message, sessionId: session.id });
            break;
          }

          await logStep('Crowdfunding contribution recorded', {
            supporterId: supporterRecord?.supporter_id,
            campaignId,
            amountCents,
          });

          await scopeLogger(currentLogger, { scope: 'crowdfunding', sessionId: session.id }).info(
            'crowdfunding_contribution_completed',
            {
              supporterId: supporterRecord?.supporter_id,
              campaignId,
              rewardId,
              amountCents,
              paymentIntentId,
            },
          );

          try {
            await supabaseClient.functions.invoke('generate-receipt', {
              body: {
                type: 'campaign_contribution',
                payment_id: paymentIntentId ?? session.id,
                stripe_reference: paymentIntentId,
                metadata: {
                  campaign_id: campaignId,
                  supporter_id: supporterId,
                  reward_id: rewardId,
                },
              },
            });
          } catch (receiptError: any) {
            await logStep('Crowdfunding receipt generation failed', { error: receiptError.message });
          }

          break;
        }

        // Check if this is a credits top-up
        if (session.metadata?.transaction_type === 'credits_topup') {
          const userId = session.metadata.user_id;
          const creditsAmount = parseInt(session.metadata.credits_amount);

          if (userId && creditsAmount) {
            await logStep("Processing credits top-up", { userId, creditsAmount });
            
            // Create ledger entry for credits top-up
            const { error: ledgerError } = await supabaseClient
              .from('wallet_ledger')
              .insert({
                user_id: userId,
                kind: 'topup',
                amount_credits: creditsAmount,
                ref_type: 'stripe_checkout',
                ref_id: session.id,
                meta: {
                  stripe_session_id: session.id,
                  amount_total: session.amount_total,
                  currency: session.currency
                }
              });
            
            if (ledgerError) {
              await logStep("Error creating credits ledger entry", { error: ledgerError.message });
            } else {
              await logStep("Credits top-up completed successfully", { userId, creditsAmount });
            }
          }
          break;
        }

        if (session.metadata?.transaction_type === 'hybrid_purchase') {
          const userId = session.metadata.user_id;
          const purchaseItemsRaw = session.metadata.purchase_items;

          let purchaseItems: any[] = [];
          if (purchaseItemsRaw) {
            try {
              purchaseItems = JSON.parse(purchaseItemsRaw);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              await logStep('Failed to parse hybrid purchase items', { sessionId: session.id, error: message });
            }
          }

          if (userId) {
            await createDownloadRecords(
              supabaseClient,
              userId,
              purchaseItems,
              session.id,
              scopeLogger(currentLogger, { scope: 'download_records', sessionId: session.id, userId }),
            );
          } else {
            await logStep('Hybrid purchase missing user metadata', { sessionId: session.id });
          }

          break;
        }

        // Handle split attribution for purchases
        await handleSplitAttribution(
          session,
          supabaseClient,
          stripe,
          scopeLogger(currentLogger, { scope: 'split_attribution', sessionId: session.id }),
        );
        
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = session.customer as string;
          const customer = await stripe.customers.retrieve(customerId);
          
          if ('email' in customer && customer.email) {
            // Determine tier from price
            const priceId = subscription.items.data[0].price.id;
            const price = await stripe.prices.retrieve(priceId);
            const amount = price.unit_amount || 0;
            
            let tier: 'creator' | 'pro' = 'creator';
            if (amount > 1000) {
              tier = 'pro';
            }

            // Get user ID from metadata or customer
            let userId = session.metadata?.user_id;
            if (!userId && 'metadata' in customer) {
              userId = customer.metadata?.user_id;
            }

              if (userId) {
                await supabaseClient.from("user_subscriptions").upsert({
                  user_id: userId,
                  tier,
                  status: 'active',
                  stripe_subscription_id: subscription.id,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

                await logStep("Subscription created in database", { userId, tier, subscriptionId: subscription.id });

                // Trigger Discord role sync for new subscription
                try {
                  await supabaseClient.functions.invoke('discord-sync-subscriber', {
                    body: {
                      creator_id: userId,
                      fan_user_id: userId,
                      action: 'grant'
                    }
                  });
                } catch (discordError: any) {
                  await logStep("Discord sync failed", { error: discordError.message });
                }

                // Send welcome email
                await supabaseClient.functions.invoke('send-subscription-email', {
                  body: {
                    type: 'subscription_created',
                    email: customer.email,
                    tier,
                    user_id: userId
                  }
                });
              }
          }
        } else if (session.mode === 'payment') {
          // Handle one-time payments (beats, courses, store)
          await logStep("Processing one-time payment", { sessionId: session.id, type: session.metadata?.type });
          
          if (session.metadata?.type === 'course_purchase') {
            // Handle course purchase
            const { error: purchaseError } = await supabaseClient
              .from('course_purchases')
              .insert({
                user_id: session.metadata.userId,
                course_id: session.metadata.courseId,
                amount_paid: session.amount_total ? session.amount_total / 100 : 0,
                stripe_payment_intent_id: session.payment_intent as string
              });

            if (purchaseError) {
              await logStep("Course purchase error", { error: purchaseError.message });
            } else {
              logStep("Course purchase recorded successfully");

              const { error: progressError } = await supabaseClient
                .from('user_course_progress')
                .upsert({
                  user_id: session.metadata.userId,
                  course_id: session.metadata.courseId,
                  completion_percentage: 0,
                  progress_data: { completed_lessons: [] },
                  last_accessed_at: new Date().toISOString(),
                }, { onConflict: 'user_id,course_id' });

              if (progressError) {
                logStep("Course enrollment sync failed", { error: progressError.message });
              } else {
                logStep("Course enrollment synced to progress table");
              }
              await logStep("Course purchase recorded successfully");
            }
          } else if (session.metadata?.type === 'release_purchase') {
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
            const sessionTotal = session.amount_total ?? null;

            const { data: purchaseBySession, error: purchaseBySessionError } = await supabaseClient
              .from('release_purchases')
              .select('id, user_id, release_id, amount_paid, status, stripe_session_id, stripe_payment_intent_id, purchased_at, download_expires_at, is_preorder, available_at, gift_recipient_email, gift_recipient_name, gift_message')
              .eq('stripe_session_id', session.id)
              .maybeSingle();

            if (purchaseBySessionError) {
              await logStep('Release purchase lookup by session failed', { error: purchaseBySessionError.message, sessionId: session.id });
            }

            let purchase = purchaseBySession ?? null;

            if (!purchase && paymentIntentId) {
              const { data: purchaseByIntent, error: purchaseByIntentError } = await supabaseClient
              .from('release_purchases')
                .select('id, user_id, release_id, amount_paid, status, stripe_session_id, stripe_payment_intent_id, purchased_at, download_expires_at, is_preorder, available_at, gift_recipient_email, gift_recipient_name, gift_message')
                .eq('stripe_payment_intent_id', paymentIntentId)
                .maybeSingle();

              if (purchaseByIntentError) {
                await logStep('Release purchase lookup by intent failed', { error: purchaseByIntentError.message, paymentIntentId });
              }

              purchase = purchaseByIntent ?? null;
            }

            if (!purchase) {
              await logStep('Release purchase record not found for session', { sessionId: session.id, paymentIntentId });
              break;
            }

            if (purchase.status === 'completed') {
              await logStep('Release purchase already completed', { purchaseId: purchase.id, sessionId: session.id });
              break;
            }

            const storedAmountCents = Math.round(Number(purchase.amount_paid ?? 0) * 100);
            if (sessionTotal !== null && Math.abs(storedAmountCents - sessionTotal) > 1) {
              await logStep('Release purchase amount mismatch', {
                purchaseId: purchase.id,
                storedAmountCents,
                sessionTotal,
              });
            }

            let downloadExpiresAt = purchase.download_expires_at;
            if (purchase.release_id) {
              const { data: releaseDetails, error: releaseLookupError } = await supabaseClient
                .from('releases')
                .select('id, download_expires_days, title, artist, user_id')
                .eq('id', purchase.release_id)
                .maybeSingle();

              if (releaseLookupError) {
                await logStep('Release lookup failed during purchase completion', { error: releaseLookupError.message, releaseId: purchase.release_id });
              }

              if (releaseDetails?.download_expires_days) {
                const baseDate = purchase.purchased_at ? new Date(purchase.purchased_at) : new Date();
                baseDate.setDate(baseDate.getDate() + releaseDetails.download_expires_days);
                downloadExpiresAt = baseDate.toISOString();
              }

              await scopeLogger(currentLogger, {
                scope: 'release_purchase',
                sessionId: session.id,
                purchaseId: purchase.id,
              }).info('release_purchase_completed', {
                userId: purchase.user_id ?? session.metadata?.userId ?? null,
                releaseId: purchase.release_id,
                releaseTitle: releaseDetails?.title,
                releaseArtist: releaseDetails?.artist,
                amountPaid: sessionTotal !== null ? sessionTotal / 100 : purchase.amount_paid,
                currency: session.currency,
                downloadPreparation: 'queued',
              });
            }

            const updatePayload: Record<string, unknown> = {
              status: 'completed',
              paid_at: new Date().toISOString(),
              stripe_session_id: session.id,
              download_expires_at: downloadExpiresAt,
            };

            if (sessionTotal !== null) {
              updatePayload['amount_paid'] = sessionTotal / 100;
            }

            if (paymentIntentId) {
              updatePayload['stripe_payment_intent_id'] = paymentIntentId;
            }

            if (session.metadata?.available_at) {
              updatePayload['available_at'] = session.metadata.available_at;
            }

            if (session.metadata?.is_preorder === 'true') {
              updatePayload['is_preorder'] = true;
            }

            if (!updatePayload['available_at'] && purchase.available_at) {
              updatePayload['available_at'] = purchase.available_at;
            }

            if (updatePayload['is_preorder'] === undefined && purchase.is_preorder) {
              updatePayload['is_preorder'] = purchase.is_preorder;
            }

            const { error: purchaseUpdateError } = await supabaseClient
              .from('release_purchases')
              .update(updatePayload)
              .eq('id', purchase.id);

            if (purchaseUpdateError) {
              await logStep('Release purchase update error', { error: purchaseUpdateError.message, purchaseId: purchase.id });
            } else {
              await logStep('Release purchase marked as completed', { purchaseId: purchase.id, sessionId: session.id });

              if (purchase.gift_recipient_email) {
                try {
                  await supabaseClient
                    .from('release_gift_queue')
                    .update({
                      status: 'scheduled',
                      deliver_at: updatePayload['available_at'] ?? purchase.available_at ?? new Date().toISOString(),
                      purchase_id: purchase.id,
                    })
                    .eq('purchase_id', purchase.id);
                } catch (giftUpdateError) {
                  await logStep('Gift queue update failed', { error: giftUpdateError });
                }
              }
            }
          } else if (session.metadata?.type === 'store_purchase') {
            const sessionTotal = session.amount_total ? session.amount_total / 100 : null;
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
            const storeLogger = scopeLogger(currentLogger, {
              scope: 'store_order',
              sessionId: session.id,
            });

            await storeLogger.info('store_order_reconciliation_started', {
              paymentIntent: paymentIntentId,
              total: sessionTotal,
              cartItemIds: session.metadata?.cart_item_ids ?? null,
            });

            const { data: existingOrder, error: existingOrderError } = await supabaseClient
              .from('orders')
              .select('id, user_id, total_amount, status, paid_at, payment_provider, shipping_address')
              .eq('payment_id', session.id)
              .maybeSingle();

            let orderRecord = existingOrder;

            if (!orderRecord && !existingOrderError) {
              const { data: legacyOrder, error: legacyError } = await supabaseClient
                .from('orders')
                .select('id, user_id, total_amount, status, paid_at, payment_provider, shipping_address')
                .eq('stripe_session_id', session.id)
                .maybeSingle();

              if (legacyError) {
                await storeLogger.error('store_order_legacy_lookup_failed', {
                  error: legacyError.message,
                });
              }
              orderRecord = legacyOrder ?? null;
            }

            if (!orderRecord) {
              await storeLogger.error('store_order_missing', {
                message: 'Order not found for Stripe session',
              });
            } else {
              const nowIso = new Date().toISOString();
              const paidAt =
                typeof session.created === 'number'
                  ? new Date(session.created * 1000).toISOString()
                  : nowIso;

              const shippingAddress = session.shipping_details
                ? {
                    name: session.shipping_details.name,
                    address: session.shipping_details.address,
                    phone: session.shipping_details.phone,
                  }
                : orderRecord.shipping_address;

              const updatePayload: Record<string, unknown> = {
                status: 'completed',
                updated_at: nowIso,
                paid_at: orderRecord.paid_at ?? paidAt,
                payment_provider:
                  orderRecord.payment_provider && orderRecord.payment_provider.length > 0
                    ? orderRecord.payment_provider
                    : 'stripe',
                stripe_session_id: session.id,
                payment_id: session.id,
              };

              if (shippingAddress) {
                updatePayload['shipping_address'] = shippingAddress;
              }

              if (sessionTotal !== null) {
                updatePayload.total_amount = sessionTotal;
              }

              const { error: orderUpdateError } = await supabaseClient
                .from('orders')
                .update(updatePayload)
                .eq('id', orderRecord.id);

              if (orderUpdateError) {
                await storeLogger.error('store_order_update_failed', {
                  orderId: orderRecord.id,
                  error: orderUpdateError.message,
                });
              } else {
                await storeLogger.info('store_order_updated', {
                  orderId: orderRecord.id,
                  userId: orderRecord.user_id,
                  total: sessionTotal ?? orderRecord.total_amount,
                  paymentIntent: paymentIntentId,
                  paidAt: updatePayload.paid_at,
                });

                const { data: orderItems, error: orderItemsError } = await supabaseClient
                  .from('order_items')
                  .select('id, product_id, quantity, price, kind')
                  .eq('order_id', orderRecord.id);

                if (orderItemsError) {
                  await storeLogger.error('store_order_items_fetch_failed', {
                    orderId: orderRecord.id,
                    error: orderItemsError.message,
                  });
                } else if (!orderItems || orderItems.length === 0) {
                  await storeLogger.warn('store_order_items_missing', {
                    orderId: orderRecord.id,
                  });

                  try {
                    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                      expand: ['data.price.product'],
                    });

                    const itemsToInsert = lineItems.data
                      .map((lineItem) => {
                        const metadata =
                          lineItem.price?.product && typeof lineItem.price.product !== 'string'
                            ? (lineItem.price.product.metadata ?? {})
                            : {};
                        const productId = typeof metadata.product_id === 'string' ? metadata.product_id : null;

                        if (!productId) {
                          return null;
                        }

                        const quantity = lineItem.quantity ?? 1;
                        const priceTotal = (lineItem.amount_total ?? 0) / 100;
                        const unitPrice = quantity > 0 ? priceTotal / quantity : priceTotal;

                        return {
                          order_id: orderRecord.id,
                          product_id: productId,
                          quantity,
                          price: unitPrice,
                          kind: typeof metadata.product_type === 'string' ? metadata.product_type : null,
                          creator_id: typeof metadata.user_id === 'string' ? metadata.user_id : null,
                        };
                      })
                      .filter((value): value is {
                        order_id: string;
                        product_id: string;
                        quantity: number;
                        price: number;
                        kind: string | null;
                        creator_id: string | null;
                      } => Boolean(value));

                    if (itemsToInsert.length > 0) {
                      const { error: insertError } = await supabaseClient.from('order_items').insert(itemsToInsert);

                      if (insertError) {
                        await storeLogger.error('store_order_items_backfill_failed', {
                          orderId: orderRecord.id,
                          error: insertError.message,
                        });
                      } else {
                        await storeLogger.info('store_order_items_backfilled', {
                          orderId: orderRecord.id,
                          itemCount: itemsToInsert.length,
                        });
                      }
                    }
                  } catch (lineItemError) {
                    await storeLogger.error('store_order_items_recovery_failed', {
                      error: lineItemError instanceof Error ? lineItemError.message : String(lineItemError),
                    });
                  }
                } else {
                  const expectedCount = (() => {
                    if (typeof session.metadata?.cart_item_ids_json === 'string') {
                      try {
                        const parsed = JSON.parse(session.metadata.cart_item_ids_json);
                        if (Array.isArray(parsed)) return parsed.length;
                      } catch (_ignore) {
                        return orderItems.length;
                      }
                    }
                    return orderItems.length;
                  })();

                  if (expectedCount !== orderItems.length) {
                    await storeLogger.warn('store_order_item_count_mismatch', {
                      orderId: orderRecord.id,
                      expectedCount,
                      actualCount: orderItems.length,
                    });
                  }
                }
              }
            }
          } else if (session.metadata?.type === 'artist_tip') {
            const tipTotal = session.amount_total ? session.amount_total / 100 : null;
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
            const tipLogger = scopeLogger(currentLogger, {
              scope: 'artist_tip',
              sessionId: session.id,
            });

            await tipLogger.info('artist_tip_reconciliation_started', {
              amount: tipTotal,
              paymentIntent: paymentIntentId,
            });

            const { data: tipRecord, error: tipLookupError } = await supabaseClient
              .from('artist_tips')
              .select('id, fan_id, artist_id, amount, message, stripe_payment_intent_id')
              .eq('stripe_session_id', session.id)
              .maybeSingle();

            let tip = tipRecord;

            if (!tip && !tipLookupError && paymentIntentId) {
              const { data: tipByIntent, error: tipIntentError } = await supabaseClient
                .from('artist_tips')
                .select('id, fan_id, artist_id, amount, message, stripe_payment_intent_id')
                .eq('stripe_payment_intent_id', paymentIntentId)
                .maybeSingle();

              if (tipIntentError) {
                await logStep('Artist tip lookup by payment intent failed', { error: tipIntentError.message });
              }
              tip = tipByIntent ?? null;
            }

            if (!tip) {
              await tipLogger.error('artist_tip_missing_record', {
                paymentIntent: paymentIntentId,
              });
            } else {
              const updatePayload: Record<string, unknown> = {
                status: 'succeeded',
                paid_at: new Date().toISOString(),
              };

              if (paymentIntentId) {
                updatePayload['stripe_payment_intent_id'] = paymentIntentId;
              }

              if (tipTotal !== null) {
                updatePayload['amount'] = tipTotal;
              }

              const { error: tipUpdateError } = await supabaseClient
                .from('artist_tips')
                .update(updatePayload)
                .eq('id', tip.id);

              if (tipUpdateError) {
                await tipLogger.error('artist_tip_update_failed', {
                  tipId: tip.id,
                  error: tipUpdateError.message,
                });
              } else {
                await tipLogger.info('artist_tip_settled', {
                  tipId: tip.id,
                  fanId: tip.fan_id,
                  artistId: tip.artist_id,
                  amount: tipTotal ?? tip.amount,
                });

                const siteUrl = Deno.env.get('SITE_URL') ?? 'https://pluggd.fm';

                try {
                  const [{ data: artistProfile }, { data: fanProfile }] = await Promise.all([
                    supabaseClient
                      .from('profiles')
                      .select('full_name, username')
                      .eq('user_id', tip.artist_id)
                      .maybeSingle(),
                    supabaseClient
                      .from('profiles')
                      .select('full_name, username')
                      .eq('user_id', tip.fan_id)
                      .maybeSingle(),
                  ]);

                  const artistName = artistProfile?.full_name || artistProfile?.username || 'your favorite creator';
                  const fanName = fanProfile?.full_name || fanProfile?.username || null;
                  const tipAmount = tipTotal ?? tip.amount ?? 0;

                  const emailPromises: Array<Promise<unknown>> = [];

                  const notifyFan = await shouldSendNotification(
                    supabaseClient as any,
                    preferenceCache,
                    tip.fan_id,
                    'notify_purchases',
                  );

                  if (notifyFan) {
                    emailPromises.push(
                      supabaseClient.functions.invoke('send-lifecycle-emails', {
                        body: {
                          user_id: tip.fan_id,
                          email_type: 'fan_tip_receipt',
                          user_data: {
                            amount: tipAmount,
                            artist_name: artistName,
                            artist_url: `${siteUrl}/artist/${tip.artist_id}`,
                            message: tip.message,
                          },
                        },
                      }),
                    );
                  } else {
                    await logStep('Skipping fan tip receipt email due to preferences', { fanId: tip.fan_id });
                  }

                  const notifyArtist = await shouldSendNotification(
                    supabaseClient as any,
                    preferenceCache,
                    tip.artist_id,
                    'notify_supporters',
                  );

                  if (notifyArtist) {
                    emailPromises.push(
                      supabaseClient.functions.invoke('send-lifecycle-emails', {
                        body: {
                          user_id: tip.artist_id,
                          email_type: 'creator_tip_notification',
                          user_data: {
                            amount: tipAmount,
                            fan_name: fanName,
                            message: tip.message,
                          },
                        },
                      }),
                    );
                  } else {
                    await logStep('Skipping creator tip notification due to preferences', { artistId: tip.artist_id });
                  }

                  if (emailPromises.length > 0) {
                    await Promise.allSettled(emailPromises);
                  }
                } catch (emailError) {
                  const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
                  await logStep('Artist tip email notification failed', { error: errorMessage, tipId: tip.id });
                }

                await scopeLogger(currentLogger, {
                  scope: 'artist_tip',
                  sessionId: session.id,
                  tipId: tip.id,
                }).info('artist_tip_completed', {
                  artistId: tip.artist_id,
                  fanId: tip.fan_id,
                  amount: tipTotal ?? tip.amount,
                });
              }
            }
          } else if (session.metadata?.type === 'commission_funding') {
            // Handle commission funding - mark commission as funded
            const commissionId = session.metadata.commissionId;
            if (commissionId) {
              const { error: updateError } = await supabaseClient
                .from('commission_requests')
                .update({
                  status: 'funded',
                  stripe_payment_intent_id: session.payment_intent as string,
                  updated_at: new Date().toISOString()
                })
                .eq('id', commissionId);

              if (updateError) {
                await logStep("Commission update error", { error: updateError.message });
              } else {
                await logStep("Commission funded", { commissionId });
              }
            }
          } else if (session.metadata?.beatId) {
            // Handle beat purchase and create producer payout
            const beatId = session.metadata.beatId;
            const userId = session.metadata.userId;
            const amount = session.amount_total ? session.amount_total / 100 : 0;

            // Get beat details to find producer
            const { data: beat, error: beatError } = await supabaseClient
              .from('beats')
              .select('user_id')
              .eq('id', beatId)
              .single();

            if (beatError || !beat) {
              await logStep("Beat not found", { beatId, error: beatError?.message });
            } else {
              // Record the purchase
              const { data: purchase, error: purchaseError } = await supabaseClient
                .from('purchases')
                .insert({
                  buyer_id: userId,
                  beat_id: beatId,
                  amount: amount,
                  status: 'completed',
                  stripe_payment_intent_id: session.payment_intent as string
                })
                .select()
                .single();

              // Generate receipt PDF after successful purchase
              if (!purchaseError && purchase) {
                try {
                  const receiptResponse = await supabaseClient.functions.invoke('generate-receipt', {
                    body: {
                      payment_id: purchase.id,
                      stripe_reference: session.payment_intent as string,
                      type: 'purchase'
                    }
                  });
                  
                  if (receiptResponse.data?.pdf_url) {
                    // Update purchase with receipt URL
                    await supabaseClient
                      .from('purchases')
                      .update({ license_pdf_url: receiptResponse.data.pdf_url })
                      .eq('id', purchase.id);
                    
                    await logStep("Receipt PDF generated", { 
                      purchaseId: purchase.id, 
                      pdfUrl: receiptResponse.data.pdf_url 
                    });
                  }
                } catch (receiptError: any) {
                  await logStep("Receipt generation failed", { error: receiptError.message });
                }
              }

              if (purchaseError) {
                await logStep("Purchase recording error", { error: purchaseError.message });
              } else {
                await logStep("Purchase recorded", { purchaseId: purchase.id });

                // Check if producer has Stripe Connect account
                const { data: stripeAccount, error: stripeError } = await supabaseClient
                  .from('producer_stripe_accounts')
                  .select('stripe_account_id, onboarding_complete')
                  .eq('user_id', beat.user_id)
                  .eq('onboarding_complete', true)
                  .single();

                const platformFeeRate = 0.10;
                const grossAmount = amount;
                const platformFee = grossAmount * platformFeeRate;
                const netAmount = grossAmount - platformFee;

                if (stripeAccount && !stripeError) {
                  // Automatic Stripe Connect transfer
                  try {
                    const transfer = await stripe.transfers.create({
                      amount: Math.round(netAmount * 100), // Convert to cents
                      currency: 'usd',
                      destination: stripeAccount.stripe_account_id,
                      description: `Beat sale payout for ${session.metadata?.beatTitle}`,
                      metadata: {
                        beat_id: beatId,
                        purchase_id: purchase.id,
                        producer_id: beat.user_id
                      }
                    });

                    // Record successful Stripe transfer
                    await supabaseClient
                      .from('producer_payouts')
                      .insert({
                        producer_id: beat.user_id,
                        beat_id: beatId,
                        purchase_id: purchase.id,
                        gross_amount: grossAmount,
                        platform_fee: platformFee,
                        net_amount: netAmount,
                        payout_status: 'completed',
                        stripe_transfer_id: transfer.id,
                        processed_at: new Date().toISOString()
                      });

                    await logStep("Automatic Stripe transfer completed", { 
                      transferId: transfer.id,
                      producerId: beat.user_id, 
                      netAmount 
                    });

                  } catch (transferError: any) {
                    await logStep("Stripe transfer failed, creating PayPal payout record", { 
                      error: transferError.message 
                    });
                    
                    // Fallback to PayPal payout system
                    await supabaseClient
                      .from('producer_payouts')
                      .insert({
                        producer_id: beat.user_id,
                        beat_id: beatId,
                        purchase_id: purchase.id,
                        gross_amount: grossAmount,
                        platform_fee: platformFee,
                        net_amount: netAmount,
                        payout_status: 'pending'
                      });
                  }
                } else {
                  // No Stripe Connect account - use PayPal payout system
                  await supabaseClient
                    .from('producer_payouts')
                    .insert({
                      producer_id: beat.user_id,
                      beat_id: beatId,
                      purchase_id: purchase.id,
                      gross_amount: grossAmount,
                      platform_fee: platformFee,
                      net_amount: netAmount,
                      payout_status: 'pending'
                    });

                  await logStep("Created PayPal payout record (no Stripe Connect)", { 
                    producerId: beat.user_id, 
                    netAmount 
                  });
                }
              }
            }
          } else if (session.metadata?.type === 'beat_license') {
            // Handle new beat licensing system
            await logStep("Processing beat license sale", { sessionId: session.id });
            
            const beatId = session.metadata.beat_id;
            const producerId = session.metadata.producer_id;
            const artistId = session.metadata.artist_id;
            const licenseFee = parseInt(session.metadata.license_fee_pence || "0");
            const platformFee = parseInt(session.metadata.platform_fee_pence || "0");
            const producerEarnings = parseInt(session.metadata.producer_earnings_pence || "0");

            // Create beat sale record in the new table
            const { error: beatSaleError } = await supabaseClient
              .from('beat_sales')
              .insert({
                beat_id: beatId,
                buyer_id: artistId,
                producer_id: producerId,
                license_type: 'basic', // Default license type
                sale_price: licenseFee / 100, // Convert to pounds
                commission_rate: 20.0, // 20% platform fee
                producer_earnings: producerEarnings / 100,
                platform_fee: platformFee / 100,
                currency: 'GBP',
                payout_status: 'pending'
              });

            if (beatSaleError) {
              await logStep("Error creating beat sale record", { error: beatSaleError });
            } else {
              await logStep("Beat sale recorded successfully");

              // Get producer's Stripe account for payout
              const { data: stripeAccount } = await supabaseClient
                .from('producer_stripe_accounts')
                .select('*')
                .eq('user_id', producerId)
                .eq('onboarding_complete', true)
                .single();

              // Create payout record based on setup
              if (stripeAccount) {
                // Create Stripe transfer for immediate payout
                try {
                  const transfer = await stripe.transfers.create({
                    amount: producerEarnings, // Amount in pence
                    currency: 'gbp',
                    destination: stripeAccount.stripe_account_id,
                    metadata: {
                      beat_id: beatId,
                      artist_id: artistId,
                      type: 'beat_license_payout'
                    }
                  });

                  // Update beat sale with successful payout
                  await supabaseClient
                    .from('beat_sales')
                    .update({ payout_status: 'paid' })
                    .eq('beat_id', beatId)
                    .eq('buyer_id', artistId);

                  // Record successful payout
                  await supabaseClient
                    .from('payout_records')
                    .insert({
                      user_id: producerId,
                      beat_id: beatId,
                      amount: producerEarnings / 100, // Convert to pounds
                      payout_method: 'stripe',
                      payout_status: 'completed',
                      payout_reference: transfer.id,
                      processed_at: new Date().toISOString()
                    });

                  await logStep("Stripe transfer created", { transferId: transfer.id });
                } catch (transferError: any) {
                  await logStep("Stripe transfer failed, marking as pending", { error: transferError.message });
                  
                  // Create pending payout record
                  await supabaseClient
                    .from('payout_records')
                    .insert({
                      user_id: producerId,
                      beat_id: beatId,
                      amount: producerEarnings / 100,
                      payout_method: 'stripe',
                      payout_status: 'failed'
                    });
                }
              } else {
                // Mark as pending for PayPal or manual processing
                await supabaseClient
                  .from('payout_records')
                  .insert({
                    user_id: producerId,
                    beat_id: beatId,
                    amount: producerEarnings / 100,
                    payout_method: 'paypal',
                    payout_status: 'pending'
                  });

                await logStep("Payout marked as pending (no Stripe Connect)", { producerId });
              }
            }
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await logStep('Processing subscription lifecycle event', {
          subscriptionId: subscription.id,
          status: subscription.status,
          type: event.type,
        });

        const membershipResult = await syncMembershipFromSubscription(
          supabaseClient,
          subscription,
          logStep
        );

        if (
          membershipResult?.processed &&
          membershipResult.userId &&
          membershipResult.creatorId
        ) {
          const stripeCustomerId =
            membershipResult.stripeCustomerId ||
            (typeof subscription.customer === 'string'
              ? subscription.customer
              : (subscription.customer as Stripe.Customer)?.id ?? null);

          const { error: fanSubscriptionError } = await supabaseClient
            .from('fan_subscriptions')
            .update({
              status: membershipResult.status,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString(),
            })
            .eq('fan_id', membershipResult.userId)
            .eq('creator_id', membershipResult.creatorId);

          if (fanSubscriptionError) {
            await logStep('Failed to reconcile fan_subscriptions entry', {
              error: fanSubscriptionError.message,
              fanId: membershipResult.userId,
              creatorId: membershipResult.creatorId,
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await logStep('Processing subscription lifecycle event', {
          subscriptionId: subscription.id,
          status: subscription.status,
          type: event.type,
        });

        const membershipResult = await syncMembershipFromSubscription(
          supabaseClient,
          subscription,
          logStep
        );

        if (membershipResult?.processed) {
          if (membershipResult.userId && membershipResult.creatorId) {
            const stripeCustomerId =
              membershipResult.stripeCustomerId ||
              (typeof subscription.customer === 'string'
                ? subscription.customer
                : (subscription.customer as Stripe.Customer)?.id ?? null);

            const { error: fanSubscriptionError } = await supabaseClient
              .from('fan_subscriptions')
              .update({
                status: membershipResult.status,
                stripe_subscription_id: subscription.id,
                stripe_customer_id: stripeCustomerId,
                updated_at: new Date().toISOString(),
              })
              .eq('fan_id', membershipResult.userId)
              .eq('creator_id', membershipResult.creatorId);

            if (fanSubscriptionError) {
              await logStep('Failed to reconcile fan_subscriptions entry', {
                error: fanSubscriptionError.message,
                fanId: membershipResult.userId,
                creatorId: membershipResult.creatorId,
              });
            }
          }
          break;
        }

        await logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if ('email' in customer && customer.email) {
          // Update subscription in database
          const { data: existingSub } = await supabaseClient
            .from("user_subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (existingSub) {
            await supabaseClient.from("user_subscriptions").update({
              status: subscription.status === 'active' ? 'active' : 'inactive',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("stripe_subscription_id", subscription.id);

            await logStep("Subscription updated in database", { subscriptionId: subscription.id });

            // Trigger Discord role sync for subscription update
            try {
              await supabaseClient.functions.invoke('discord-sync-subscriber', {
                body: {
                  creator_id: existingSub.user_id,
                  fan_user_id: existingSub.user_id,
                  action: 'sync'
                }
              });
            } catch (discordError: any) {
              await logStep("Discord sync failed", { error: discordError.message });
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await logStep("Subscription cancelled", { subscriptionId: subscription.id });
        
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        
        if ('email' in customer && customer.email) {
          // Update subscription to free tier
          const { data: existingSub } = await supabaseClient
            .from("user_subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (existingSub) {
            await supabaseClient.from("user_subscriptions").update({
              tier: 'free',
              status: 'inactive',
              stripe_subscription_id: null,
              current_period_start: null,
              current_period_end: null,
              updated_at: new Date().toISOString(),
            }).eq("stripe_subscription_id", subscription.id);

            await logStep("Subscription cancelled in database", { subscriptionId: subscription.id });

            // Trigger Discord role revoke for cancelled subscription
            try {
              await supabaseClient.functions.invoke('discord-sync-subscriber', {
                body: {
                  creator_id: existingSub.user_id,
                  fan_user_id: existingSub.user_id,
                  action: 'revoke'
                }
              });
            } catch (discordError: any) {
              await logStep("Discord sync failed", { error: discordError.message });
            }

            // Send cancellation email
            await supabaseClient.functions.invoke('send-subscription-email', {
              body: {
                type: 'subscription_cancelled',
                email: customer.email,
                user_id: existingSub.user_id
              }
            });
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await logStep('Charge refunded', { chargeId: charge.id, amount_refunded: charge.amount_refunded });
        await handleChargeReversal(
          supabaseClient,
          charge,
          event.id,
          'refund',
          scopeLogger(currentLogger, { scope: 'charge_reversal', eventId: event.id, chargeId: charge.id, reason: 'refund' }),
        );
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        await logStep('Charge failed', { chargeId: charge.id });
        await handleChargeReversal(
          supabaseClient,
          charge,
          event.id,
          'failure',
          scopeLogger(currentLogger, { scope: 'charge_reversal', eventId: event.id, chargeId: charge.id, reason: 'failure' }),
        );
        break;
      }

      default:
        await logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to trigger webhooks
async function triggerWebhook(supabaseClient: any, eventType: string, userId: string, data: any) {
  try {
    await supabaseClient.functions.invoke('trigger-webhook', {
      body: {
        event_type: eventType,
        user_id: userId,
        data: data
      }
    });
  } catch (error) {
    console.error(`Failed to trigger ${eventType} webhook:`, error);
  }
}

export { handleChargeReversal, createDownloadRecords };
