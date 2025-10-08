import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDITS_PER_GBP = 100;

const logStep = (step: string, details?: any) => {
  console.log(`[Enhanced Store Checkout] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Request received', { method: req.method });

    const {
      cartItems = [],
      shippingAddress,
      manualAmountCredits,
      paymentMetadata = {},
      crowdfundingContribution
    } = await req.json();
    logStep('Parsed request body', {
      cartItemsCount: cartItems?.length,
      manualAmountCredits,
      crowdfundingContribution: crowdfundingContribution ? 'present' : 'absent'
    });

    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep('Found existing Stripe customer', { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      logStep('Created new Stripe customer', { customerId });
    }

    if (crowdfundingContribution) {
      const { campaignId, rewardId, amountCents, note, campaignSlug } = crowdfundingContribution;
      if (!campaignId || typeof amountCents !== 'number' || amountCents <= 0) {
        throw new Error('Invalid crowdfunding contribution payload');
      }

      const origin = req.headers.get('origin') ?? Deno.env.get('SITE_URL') ?? 'https://pluggd.fm';
      const metadata: Record<string, string> = {
        user_id: user.id,
        transaction_type: 'crowdfunding_contribution',
        campaign_id: campaignId,
        amount_cents: String(amountCents),
      };

      if (rewardId) {
        metadata['reward_id'] = rewardId;
      }

      if (note) {
        metadata['supporter_note'] = note;
      }

      if (campaignSlug) {
        metadata['campaign_slug'] = campaignSlug;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Crowdfunding contribution',
                description: 'Support a creator campaign on PLUGGD',
                metadata: {
                  campaign_id: campaignId,
                  reward_id: rewardId ?? '',
                },
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/campaigns/${campaignSlug ?? campaignId}?support=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/campaigns/${campaignSlug ?? campaignId}?support=cancelled`,
        metadata,
      });

      logStep('Created crowdfunding checkout session', { sessionId: session.id, amountCents });

      return new Response(JSON.stringify({
        url: session.url,
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (manualAmountCredits && manualAmountCredits > 0) {
      const manualAmountPence = Math.round((manualAmountCredits / CREDITS_PER_GBP) * 100);
      if (manualAmountPence <= 0) {
        throw new Error('Manual checkout amount must be greater than zero');
      }

      const origin = req.headers.get('origin') ?? Deno.env.get('SITE_URL') ?? 'https://pluggd.fm';
      const metadata: Record<string, string> = {
        user_id: user.id,
        transaction_type: typeof paymentMetadata.transaction_type === 'string' ? paymentMetadata.transaction_type : 'hybrid_purchase',
        manual_amount_credits: manualAmountCredits.toString(),
      };

      if (paymentMetadata.credits_applied !== undefined) {
        metadata['credits_applied'] = String(paymentMetadata.credits_applied);
      }
      if (paymentMetadata.total_cost_credits !== undefined) {
        metadata['total_cost_credits'] = String(paymentMetadata.total_cost_credits);
      }
      if (paymentMetadata.max_credit_percentage !== undefined) {
        metadata['max_credit_percentage'] = String(paymentMetadata.max_credit_percentage);
      }
      if (paymentMetadata.items) {
        try {
          metadata['purchase_items'] = JSON.stringify(paymentMetadata.items);
        } catch (jsonError) {
          logStep('Failed to serialize purchase items', { error: jsonError instanceof Error ? jsonError.message : String(jsonError) });
        }
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'PLGD Checkout Balance',
                description: 'Remaining balance for hybrid credit purchase',
              },
              unit_amount: manualAmountPence,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/library?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?payment=cancelled`,
        metadata,
      });

      logStep('Created manual checkout session', { sessionId: session.id, amountPence: manualAmountPence });

      return new Response(JSON.stringify({
        url: session.url,
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get product details from different tables based on cart items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
      creator_id?: string | null;
      kind?: string | null;
    }> = [];
    const cartItemIds: string[] = [];
    let hasPhysicalProducts = false;
    let orderSubtotal = 0;

    // Create Supabase service client for data operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    for (const item of cartItems) {
      let productData: any = null;
      let productType = 'digital';

      // Try to find the product in different tables
      // First check store_products (physical items)
      const { data: storeProduct } = await supabaseService
        .from('store_products')
        .select('*')
        .eq('id', item.productId)
        .single();

      if (storeProduct) {
        productData = storeProduct;
        productType = storeProduct.product_type || 'physical';
        if (productType === 'physical' || productType === 'hardware') {
          hasPhysicalProducts = true;
        }
      } else {
        // Check beats table
        const { data: beat } = await supabaseService
          .from('beats')
          .select('*')
          .eq('id', item.productId)
          .single();

        if (beat) {
          productData = {
            id: beat.id,
            title: beat.title,
            price: beat.price,
            image_url: beat.image_url,
            product_type: 'beat'
          };
          productType = 'beat';
        } else {
          // Check releases table
          const { data: release } = await supabaseService
            .from('releases')
            .select('*')
            .eq('id', item.productId)
            .single();

          if (release) {
            productData = {
              id: release.id,
              title: release.title,
              price: release.download_price || release.price || 0,
              image_url: release.cover_art_url,
              product_type: 'release'
            };
            productType = 'release';
          } else {
            // Check sample_packs table
            const { data: samplePack } = await supabaseService
              .from('sample_packs')
              .select('*')
              .eq('id', item.productId)
              .single();

            if (samplePack) {
              productData = {
                id: samplePack.id,
                title: samplePack.title,
                price: samplePack.price,
                image_url: samplePack.cover_art_url,
                product_type: 'sample_pack'
              };
              productType = 'sample_pack';
            }
          }
        }
      }

      if (!productData) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      logStep('Found product', { productId: item.productId, type: productType });

      cartItemIds.push(item.productId);

      // Create Stripe line item
      const unitPrice = item.selectedOptions?.customPrice || productData.price;
      const quantity = item.quantity || 1;

      const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: productData.title,
            images: productData.image_url ? [productData.image_url] : undefined,
            metadata: {
              product_id: productData.id,
              product_type: productType,
              user_id: user.id,
            },
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      };

      lineItems.push(lineItem);
      orderSubtotal += unitPrice * quantity;

      // Store order item details
      orderItems.push({
        product_id: productData.id,
        quantity,
        price: unitPrice,
        creator_id: productData.owner_id || productData.user_id || null,
        kind: productType,
      });
    }

    logStep('Created line items', { count: lineItems.length, hasPhysicalProducts });

    // Configure Stripe session
    const sessionConfig: any = {
      customer: customerId,
      line_items: lineItems,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/store`,
      metadata: {
        type: 'store_purchase',
        user_id: user.id,
        cart_item_ids: cartItemIds.join(','),
      },
    };

    // Add shipping configuration if physical products are present
    if (hasPhysicalProducts) {
      sessionConfig.shipping_address_collection = {
        allowed_countries: ['GB', 'US', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
      };
      
      sessionConfig.shipping_options = [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 500, // £5.00 standard shipping
              currency: 'gbp',
            },
            display_name: 'Standard Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 3,
              },
              maximum: {
                unit: 'business_day',
                value: 7,
              },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 1500, // £15.00 express shipping
              currency: 'gbp',
            },
            display_name: 'Express Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 1,
              },
              maximum: {
                unit: 'business_day',
                value: 3,
              },
            },
          },
        },
      ];
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep('Created Stripe session', { sessionId: session.id });

    // Create order record in database
    const { data: order, error: orderError } = await supabaseService
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: orderSubtotal,
        status: 'pending',
        payment_id: session.id,
        shipping_address: hasPhysicalProducts ? shippingAddress : null,
      })
      .select()
      .single();

    if (orderError) {
      logStep('Order creation error', orderError);
      throw orderError;
    }

    logStep('Created order record', { orderId: order.id });

    // Create order items
    const orderItemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseService
      .from('order_items')
      .insert(orderItemsWithOrderId);

    if (itemsError) {
      logStep('Order items creation error', itemsError);
      throw itemsError;
    }

    logStep('Created order items', { count: orderItemsWithOrderId.length });

    try {
      await supabaseService
        .from('system_logs')
        .insert({
          level: 2,
          message: 'Checkout session initiated',
          user_id: user.id,
          session_id: session.id,
          component: 'store.checkout',
          action: 'checkout_session_created',
          metadata: {
            order_id: order.id,
            item_count: orderItemsWithOrderId.length,
            has_physical: hasPhysicalProducts,
          },
        });
    } catch (logError) {
      const errorMessage = logError instanceof Error ? logError.message : String(logError);
      logStep('System log insert failed', { error: errorMessage });
    }

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        orderId: order.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    logStep('Error occurred', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
