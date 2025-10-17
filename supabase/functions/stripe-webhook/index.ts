import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  createDownloadRecords,
  handleChargeReversal,
  syncMembershipFromSubscription,
  type Logger,
} from "./helpers.ts";

const logStep: Logger = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Handle split attribution for digital purchases
const handleSplitAttribution = async (session: any, supabaseClient: any, stripe: any) => {
  try {
    logStep("Processing split attribution", { sessionId: session.id });

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
          logStep("No splits or fallback creator available", { contentType, contentId });
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
          logStep("Error creating fallback statement", { error: statementError.message });
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
          logStep("Error creating creator statement", { error: statementError.message, split });
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
          logStep("Error creating split payout", { error: payoutError.message, split });
        } else {
          logStep("Created split payout", {
            payeeId: split.payee_user_id,
            percent,
            amount: netShare,
          });
        }
      }
    }
  } catch (error: any) {
    logStep("Error in split attribution", { error: error.message });
  }
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });

        if (session.metadata?.transaction_type === 'crowdfunding_contribution') {
          const campaignId = session.metadata.campaign_id;
          const supporterId = session.metadata.user_id ?? null;
          const rewardId = session.metadata.reward_id ?? null;
          const supporterNote = session.metadata.supporter_note ?? null;
          const campaignSlug = session.metadata.campaign_slug ?? null;
          const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
          const amountCents = session.amount_total ?? Number(session.metadata.amount_cents ?? 0);

          if (!campaignId || !amountCents) {
            logStep('Crowdfunding contribution missing campaign or amount metadata', { sessionId: session.id });
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
            logStep('Failed to record crowdfunding contribution', { error: supporterError.message, sessionId: session.id });
            break;
          }

          logStep('Crowdfunding contribution recorded', {
            supporterId: supporterRecord?.supporter_id,
            campaignId,
            amountCents,
          });

          try {
            await supabaseClient
              .from('system_logs')
              .insert({
                level: 2,
                message: 'Crowdfunding contribution completed',
                user_id: supporterId ?? null,
                session_id: session.id,
                component: 'crowdfunding.checkout',
                action: 'contribution_completed',
                metadata: {
                  campaign_id: campaignId,
                  reward_id: rewardId,
                  amount_cents: amountCents,
                  payment_intent: paymentIntentId,
                },
              });
          } catch (logError) {
            const errorMessage = logError instanceof Error ? logError.message : String(logError);
            logStep('Failed to insert crowdfunding contribution log', { error: errorMessage });
          }

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
            logStep('Crowdfunding receipt generation failed', { error: receiptError.message });
          }

          break;
        }

        // Check if this is a credits top-up
        if (session.metadata?.transaction_type === 'credits_topup') {
          const userId = session.metadata.user_id;
          const creditsAmount = parseInt(session.metadata.credits_amount);

          if (userId && creditsAmount) {
            logStep("Processing credits top-up", { userId, creditsAmount });
            
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
              logStep("Error creating credits ledger entry", { error: ledgerError.message });
            } else {
              logStep("Credits top-up completed successfully", { userId, creditsAmount });
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
              logStep('Failed to parse hybrid purchase items', { sessionId: session.id, error: message });
            }
          }

          if (userId) {
            await createDownloadRecords(supabaseClient, userId, purchaseItems, session.id, logStep);
          } else {
            logStep('Hybrid purchase missing user metadata', { sessionId: session.id });
          }

          break;
        }

        // Handle split attribution for purchases
        await handleSplitAttribution(session, supabaseClient, stripe);
        
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

                logStep("Subscription created in database", { userId, tier, subscriptionId: subscription.id });

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
                  logStep("Discord sync failed", { error: discordError.message });
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
          logStep("Processing one-time payment", { sessionId: session.id, type: session.metadata?.type });
          
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
              logStep("Course purchase error", { error: purchaseError.message });
            } else {
              logStep("Course purchase recorded successfully");
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
              logStep('Release purchase lookup by session failed', { error: purchaseBySessionError.message, sessionId: session.id });
            }

            let purchase = purchaseBySession ?? null;

            if (!purchase && paymentIntentId) {
              const { data: purchaseByIntent, error: purchaseByIntentError } = await supabaseClient
              .from('release_purchases')
                .select('id, user_id, release_id, amount_paid, status, stripe_session_id, stripe_payment_intent_id, purchased_at, download_expires_at, is_preorder, available_at, gift_recipient_email, gift_recipient_name, gift_message')
                .eq('stripe_payment_intent_id', paymentIntentId)
                .maybeSingle();

              if (purchaseByIntentError) {
                logStep('Release purchase lookup by intent failed', { error: purchaseByIntentError.message, paymentIntentId });
              }

              purchase = purchaseByIntent ?? null;
            }

            if (!purchase) {
              logStep('Release purchase record not found for session', { sessionId: session.id, paymentIntentId });
              break;
            }

            if (purchase.status === 'completed') {
              logStep('Release purchase already completed', { purchaseId: purchase.id, sessionId: session.id });
              break;
            }

            const storedAmountCents = Math.round(Number(purchase.amount_paid ?? 0) * 100);
            if (sessionTotal !== null && Math.abs(storedAmountCents - sessionTotal) > 1) {
              logStep('Release purchase amount mismatch', {
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
                logStep('Release lookup failed during purchase completion', { error: releaseLookupError.message, releaseId: purchase.release_id });
              }

              if (releaseDetails?.download_expires_days) {
                const baseDate = purchase.purchased_at ? new Date(purchase.purchased_at) : new Date();
                baseDate.setDate(baseDate.getDate() + releaseDetails.download_expires_days);
                downloadExpiresAt = baseDate.toISOString();
              }

              try {
                await supabaseClient
                  .from('system_logs')
                  .insert({
                    level: 2,
                    message: 'Release purchase completed',
                    user_id: purchase.user_id ?? session.metadata?.userId ?? null,
                    session_id: session.id,
                    component: 'releases.checkout',
                    action: 'release_purchase_completed',
                    metadata: {
                      purchase_id: purchase.id,
                      release_id: purchase.release_id,
                      release_title: releaseDetails?.title,
                      release_artist: releaseDetails?.artist,
                      amount_paid: sessionTotal !== null ? sessionTotal / 100 : purchase.amount_paid,
                      currency: session.currency,
                      download_preparation: 'queued',
                    },
                  });
              } catch (logError) {
                const errorMessage = logError instanceof Error ? logError.message : String(logError);
                logStep('Release purchase log insert failed', { error: errorMessage, purchaseId: purchase.id });
              }
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
              logStep('Release purchase update error', { error: purchaseUpdateError.message, purchaseId: purchase.id });
            } else {
              logStep('Release purchase marked as completed', { purchaseId: purchase.id, sessionId: session.id });

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
                  logStep('Gift queue update failed', { error: giftUpdateError });
                }
              }
            }
          } else if (session.metadata?.type === 'store_purchase') {
            const sessionTotal = session.amount_total ? session.amount_total / 100 : null;
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

            const { data: existingOrder, error: existingOrderError } = await supabaseClient
              .from('orders')
              .select('id, user_id, total_amount')
              .eq('payment_id', session.id)
              .maybeSingle();

            let orderRecord = existingOrder;

            if (!orderRecord && !existingOrderError) {
              const { data: legacyOrder, error: legacyError } = await supabaseClient
                .from('orders')
                .select('id, user_id, total_amount')
                .eq('stripe_session_id', session.id)
                .maybeSingle();

              if (legacyError) {
                logStep('Legacy order lookup failed', { error: legacyError.message, sessionId: session.id });
              }
              orderRecord = legacyOrder ?? null;
            }

            if (!orderRecord) {
              logStep('Order not found for session', { sessionId: session.id });
            } else {
              const updatePayload: Record<string, unknown> = {
                status: 'completed',
                updated_at: new Date().toISOString(),
              };

              if (sessionTotal !== null) {
                updatePayload.total_amount = sessionTotal;
              }

              updatePayload['paid_at'] = new Date().toISOString();
              updatePayload['payment_provider'] = 'stripe';

              const { error: orderUpdateError } = await supabaseClient
                .from('orders')
                .update(updatePayload)
                .eq('id', orderRecord.id);

              if (orderUpdateError) {
                logStep('Order update error', { error: orderUpdateError.message, orderId: orderRecord.id });
              } else {
                logStep('Store order completed', { sessionId: session.id, orderId: orderRecord.id });

                try {
                  await supabaseClient
                    .from('system_logs')
                    .insert({
                      level: 2,
                      message: 'Store order completed',
                      user_id: orderRecord.user_id,
                      session_id: session.id,
                      component: 'store.checkout',
                      action: 'order_completed',
                      metadata: {
                        order_id: orderRecord.id,
                        amount: sessionTotal ?? orderRecord.total_amount,
                        payment_intent: paymentIntentId,
                        currency: session.currency,
                      },
                    });
                } catch (logError) {
                  const errorMessage = logError instanceof Error ? logError.message : String(logError);
                  logStep('System log insert failed', { error: errorMessage, orderId: orderRecord.id });
                }
              }
            }
          } else if (session.metadata?.type === 'artist_tip') {
            const tipTotal = session.amount_total ? session.amount_total / 100 : null;
            const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;

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
                logStep('Artist tip lookup by payment intent failed', { error: tipIntentError.message });
              }
              tip = tipByIntent ?? null;
            }

            if (!tip) {
              logStep('Artist tip record not found', { sessionId: session.id, paymentIntentId });
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
                logStep('Artist tip update error', { error: tipUpdateError.message, tipId: tip.id });
              } else {
                logStep('Artist tip settled', { tipId: tip.id, sessionId: session.id });

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

                  const emailPromises = [
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
                  ];

                  await Promise.allSettled(emailPromises);
                } catch (emailError) {
                  const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
                  logStep('Artist tip email notification failed', { error: errorMessage, tipId: tip.id });
                }

                try {
                  await supabaseClient
                    .from('system_logs')
                    .insert({
                      level: 2,
                      message: 'Artist tip completed',
                      user_id: tip.artist_id,
                      session_id: session.id,
                      component: 'tips.checkout',
                      action: 'tip_completed',
                      metadata: {
                        tip_id: tip.id,
                        fan_id: tip.fan_id,
                        amount: tipTotal ?? tip.amount,
                      },
                    });
                } catch (logError) {
                  const errorMessage = logError instanceof Error ? logError.message : String(logError);
                  logStep('Artist tip log insert failed', { error: errorMessage, tipId: tip.id });
                }
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
                logStep("Commission update error", { error: updateError.message });
              } else {
                logStep("Commission funded", { commissionId });
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
              logStep("Beat not found", { beatId, error: beatError?.message });
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
                    
                    logStep("Receipt PDF generated", { 
                      purchaseId: purchase.id, 
                      pdfUrl: receiptResponse.data.pdf_url 
                    });
                  }
                } catch (receiptError: any) {
                  logStep("Receipt generation failed", { error: receiptError.message });
                }
              }

              if (purchaseError) {
                logStep("Purchase recording error", { error: purchaseError.message });
              } else {
                logStep("Purchase recorded", { purchaseId: purchase.id });

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

                    logStep("Automatic Stripe transfer completed", { 
                      transferId: transfer.id,
                      producerId: beat.user_id, 
                      netAmount 
                    });

                  } catch (transferError: any) {
                    logStep("Stripe transfer failed, creating PayPal payout record", { 
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

                  logStep("Created PayPal payout record (no Stripe Connect)", { 
                    producerId: beat.user_id, 
                    netAmount 
                  });
                }
              }
            }
          } else if (session.metadata?.type === 'beat_license') {
            // Handle new beat licensing system
            logStep("Processing beat license sale", { sessionId: session.id });
            
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
              logStep("Error creating beat sale record", { error: beatSaleError });
            } else {
              logStep("Beat sale recorded successfully");

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

                  logStep("Stripe transfer created", { transferId: transfer.id });
                } catch (transferError: any) {
                  logStep("Stripe transfer failed, marking as pending", { error: transferError.message });
                  
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

                logStep("Payout marked as pending (no Stripe Connect)", { producerId });
              }
            }
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep('Processing subscription lifecycle event', {
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
            logStep('Failed to reconcile fan_subscriptions entry', {
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
        logStep('Processing subscription lifecycle event', {
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
              logStep('Failed to reconcile fan_subscriptions entry', {
                error: fanSubscriptionError.message,
                fanId: membershipResult.userId,
                creatorId: membershipResult.creatorId,
              });
            }
          }
          break;
        }

        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });

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

            logStep("Subscription updated in database", { subscriptionId: subscription.id });

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
              logStep("Discord sync failed", { error: discordError.message });
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id });
        
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

            logStep("Subscription cancelled in database", { subscriptionId: subscription.id });

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
              logStep("Discord sync failed", { error: discordError.message });
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
        logStep('Charge refunded', { chargeId: charge.id, amount_refunded: charge.amount_refunded });
        await handleChargeReversal(supabaseClient, charge, event.id, 'refund', logStep);
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        logStep('Charge failed', { chargeId: charge.id });
        await handleChargeReversal(supabaseClient, charge, event.id, 'failure', logStep);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
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
