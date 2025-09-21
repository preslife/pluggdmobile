import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Handle split attribution for digital purchases
const handleSplitAttribution = async (session: any, supabaseClient: any, stripe: any) => {
  try {
    logStep("Processing split attribution", { sessionId: session.id });

    // Get line items from the session
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product']
    });

    for (const item of lineItems.data) {
      const product = item.price.product;
      const metadata = product.metadata || {};
      
      // Determine content type and ID from metadata
      const contentType = metadata.content_type;
      const contentId = metadata.content_id;
      
      if (!contentType || !contentId) continue;

      // Get splits for this content
      const { data: splits, error: splitsError } = await supabaseClient
        .from('content_splits')
        .select('*')
        .eq('content_type', contentType)
        .eq('content_id', contentId);

      if (splitsError || !splits || splits.length === 0) {
        logStep("No splits found, using single creator payout", { contentType, contentId });
        continue;
      }

      const grossAmount = item.amount_total;
      const platformFeeRate = 0.15; // 15% platform fee
      const platformFee = Math.round(grossAmount * platformFeeRate);
      const netAmount = grossAmount - platformFee;

      // Create payout records for each split
      for (const split of splits) {
        const splitAmount = Math.round(netAmount * (split.percent / 100));
        
        const { error: payoutError } = await supabaseClient
          .from('producer_payouts')
          .insert({
            producer_id: split.payee_user_id,
            beat_id: contentType === 'beat' ? contentId : null,
            purchase_id: session.id,
            gross_amount: grossAmount,
            platform_fee: platformFee,
            net_amount: splitAmount,
            payout_status: 'pending'
          });

        if (payoutError) {
          logStep("Error creating split payout", { error: payoutError, split });
        } else {
          logStep("Created split payout", { 
            payeeId: split.payee_user_id, 
            percent: split.percent, 
            amount: splitAmount 
          });
        }
      }
    }
  } catch (error) {
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
          } else if (session.metadata?.type === 'store_purchase') {
            // Handle store purchase - update order status
            const { error: orderError } = await supabaseClient
              .from('orders')
              .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('payment_id', session.id);

            if (orderError) {
              logStep("Order update error", { error: orderError.message });
            } else {
              logStep("Store order completed", { sessionId: session.id });
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

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
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