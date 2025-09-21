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

  try {
    const { product_id, price_id, referrer_code, payment_type = 'one_time' } = await req.json();
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16'
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const sessionData: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/cancel`,
      metadata: {
        user_id: user.id,
        product_id,
        referrer_code: referrer_code || ''
      }
    };

    if (payment_type === 'subscription') {
      sessionData.mode = 'subscription';
      sessionData.line_items = [{
        price: price_id,
        quantity: 1
      }];
    } else {
      sessionData.mode = 'payment';
      sessionData.line_items = [{
        price_data: {
          currency: 'gbp',
          product_data: { name: 'Purchase' },
          unit_amount: 999, // £9.99 in pence
        },
        quantity: 1
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    // Store pending order with referrer info
    if (referrer_code) {
      await supabaseService
        .from('orders')
        .insert({
          user_id: user.id,
          stripe_session_id: session.id,
          amount: payment_type === 'subscription' ? 999 : 999,
          currency: 'gbp',
          status: 'pending',
          referrer_code
        });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Enhanced checkout error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Checkout failed' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});