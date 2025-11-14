import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    const { creatorId, priceCents } = await req.json();
    
    if (!creatorId || !priceCents) {
      throw new Error('Missing required parameters');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get creator's Stripe account
    const { data: creatorData, error: creatorError } = await supabaseService
      .from('profiles')
      .select('stripe_account_id, user_subscriptions(*)')
      .eq('user_id', creatorId)
      .maybeSingle();

    if (creatorError || !creatorData?.stripe_account_id) {
      throw new Error('Creator not found or Stripe account not connected');
    }

    // Check if Stripe account is complete
    const account = await stripe.accounts.retrieve(creatorData.stripe_account_id);
    if (!account.charges_enabled) {
      throw new Error('Creator cannot receive payments yet');
    }

    // Determine application fee based on creator's tier
    let applicationFeePercent = 15; // Default 15%
    if (creatorData.user_subscriptions?.length > 0) {
      const subscription = creatorData.user_subscriptions[0];
      switch (subscription.tier) {
        case 'creator':
          applicationFeePercent = 10;
          break;
        case 'pro':
          applicationFeePercent = 5;
          break;
        default:
          applicationFeePercent = 15;
      }
    }

    // Create or get Stripe customer
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Creator Support Subscription',
              description: 'Monthly support for creator content'
            },
            unit_amount: priceCents,
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/creator/${creatorId}?success=true`,
      cancel_url: `${req.headers.get('origin')}/creator/${creatorId}?canceled=true`,
      payment_intent_data: {
        application_fee_amount: Math.round(priceCents * (applicationFeePercent / 100)),
        transfer_data: {
          destination: creatorData.stripe_account_id,
        },
      },
      metadata: {
        creator_id: creatorId,
        fan_id: user.id,
        price_cents: priceCents.toString()
      }
    });

    await supabaseService
      .from('fan_subscriptions')
      .upsert(
        {
          fan_id: user.id,
          creator_id: creatorId,
          price_cents: priceCents,
          status: 'pending',
          currency: 'USD',
          metadata: {
            checkout_session_id: session.id,
          },
        },
        { onConflict: 'fan_id,creator_id' },
      );

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
