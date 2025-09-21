import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-PAYOUT] ${step}${detailsStr}`);
};

// PayPal API helper functions
async function getPayPalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  const paypalApiBase = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.sandbox.paypal.com"; // sandbox for testing
  
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${paypalApiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createPayPalPayout(accessToken: string, payoutData: any) {
  const paypalApiBase = Deno.env.get("PAYPAL_API_BASE") || "https://api-m.sandbox.paypal.com";
  
  const response = await fetch(`${paypalApiBase}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payoutData)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`PayPal payout failed: ${response.statusText} - ${errorData}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, payoutIds } = await req.json();

    if (!userId || !payoutIds || !Array.isArray(payoutIds)) {
      throw new Error("Invalid request: userId and payoutIds array required");
    }

    // Get user profile with PayPal email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error("User profile not found");
    }

    // For now, we'll use the user's email as PayPal email
    // In production, you'd want a separate field for PayPal email
    const paypalEmail = profile.email || profile.user_id; // Fallback for testing

    // Get pending payouts for this user
    const { data: payouts, error: payoutsError } = await supabase
      .from('producer_payouts')
      .select('*')
      .in('id', payoutIds)
      .eq('producer_id', userId)
      .eq('payout_status', 'pending');

    if (payoutsError || !payouts?.length) {
      throw new Error("No valid pending payouts found");
    }

    logStep("Found payouts", { count: payouts.length, totalAmount: payouts.reduce((sum, p) => sum + p.net_amount, 0) });

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    
    // Prepare PayPal payout batch
    const payoutBatch = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}_${userId}`,
        email_subject: "You have a payout from BeatMarketplace!",
        email_message: "You have received a payout for your beat sales. Thanks for being part of our community!"
      },
      items: payouts.map((payout, index) => ({
        recipient_type: "EMAIL",
        amount: {
          value: payout.net_amount.toFixed(2),
          currency: "USD"
        },
        receiver: paypalEmail,
        note: `Beat sales payout for purchase ${payout.purchase_id}`,
        sender_item_id: `${payout.id}_${index}`
      }))
    };

    // Create PayPal payout
    const paypalResponse = await createPayPalPayout(accessToken, payoutBatch);
    
    logStep("PayPal payout created", { batchId: paypalResponse.batch_header?.payout_batch_id });

    // Update payout records
    const updatePromises = payouts.map(payout => 
      supabase
        .from('producer_payouts')
        .update({
          payout_status: 'processing',
          stripe_transfer_id: paypalResponse.batch_header?.payout_batch_id || null,
          processed_at: new Date().toISOString()
        })
        .eq('id', payout.id)
    );

    await Promise.all(updatePromises);

    logStep("Payouts updated to processing status");

    return new Response(JSON.stringify({
      success: true,
      batch_id: paypalResponse.batch_header?.payout_batch_id,
      processed_count: payouts.length,
      total_amount: payouts.reduce((sum, p) => sum + p.net_amount, 0)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});