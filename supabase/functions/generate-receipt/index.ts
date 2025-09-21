import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptRequest {
  payment_id: string;
  stripe_reference?: string;
  type?: 'purchase' | 'payout' | 'subscription';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get the authorization token from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payment_id, stripe_reference, type = 'purchase' }: ReceiptRequest = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'Payment ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch payment details based on type
    let paymentData: any = null;
    let receiptData: any = {};

    switch (type) {
      case 'purchase':
        const { data: purchaseData, error: purchaseError } = await supabaseClient
          .from('release_purchases')
          .select(`
            *,
            releases (
              title,
              artist,
              cover_art_url
            )
          `)
          .eq('id', payment_id)
          .eq('user_id', user.id)
          .single();

        if (purchaseError || !purchaseData) {
          return new Response(
            JSON.stringify({ error: 'Purchase not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        paymentData = purchaseData;
        receiptData = {
          type: 'purchase',
          title: 'Purchase Receipt',
          item_name: `${purchaseData.releases?.title} by ${purchaseData.releases?.artist}`,
          amount: purchaseData.amount_paid,
          date: purchaseData.purchased_at,
          payment_method: 'Credit Card',
          reference: purchaseData.stripe_payment_intent_id,
          download_url: purchaseData.download_url,
          expires_at: purchaseData.download_expires_at
        };
        break;

      case 'payout':
        const { data: payoutData, error: payoutError } = await supabaseClient
          .from('payout_records')
          .select('*')
          .eq('id', payment_id)
          .eq('user_id', user.id)
          .single();

        if (payoutError || !payoutData) {
          return new Response(
            JSON.stringify({ error: 'Payout not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        paymentData = payoutData;
        receiptData = {
          type: 'payout',
          title: 'Payout Receipt',
          item_name: 'Creator Earnings Payout',
          amount: payoutData.amount,
          date: payoutData.processed_at || payoutData.created_at,
          payment_method: payoutData.payout_method,
          reference: payoutData.payout_reference,
          status: payoutData.payout_status
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid payment type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Get user profile for receipt
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', user.id)
      .single();

    // Generate receipt HTML
    const receiptHtml = generateReceiptHTML({
      ...receiptData,
      user_name: profileData?.full_name || profileData?.username || user.email,
      user_email: user.email,
      receipt_id: payment_id.slice(0, 8).toUpperCase(),
      company_name: 'Pluggd.fm',
      company_address: 'Digital Music Platform'
    });

    // For now, return the receipt data
    // In production, you might want to generate a PDF or send via email
    return new Response(
      JSON.stringify({
        success: true,
        receipt_data: receiptData,
        receipt_html: receiptHtml,
        message: 'Receipt generated successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Receipt generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateReceiptHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${data.receipt_id}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .receipt-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; }
        .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${data.company_name}</h1>
        <p>${data.company_address}</p>
        <h2>${data.title}</h2>
      </div>
      
      <div class="receipt-details">
        <div class="row">
          <span class="label">Receipt ID:</span>
          <span>${data.receipt_id}</span>
        </div>
        <div class="row">
          <span class="label">Date:</span>
          <span>${new Date(data.date).toLocaleDateString()}</span>
        </div>
        <div class="row">
          <span class="label">Customer:</span>
          <span>${data.user_name} (${data.user_email})</span>
        </div>
        <div class="row">
          <span class="label">Item:</span>
          <span>${data.item_name}</span>
        </div>
        <div class="row">
          <span class="label">Payment Method:</span>
          <span>${data.payment_method}</span>
        </div>
        ${data.reference ? `
        <div class="row">
          <span class="label">Transaction ID:</span>
          <span>${data.reference}</span>
        </div>
        ` : ''}
        <hr style="margin: 20px 0;">
        <div class="row">
          <span class="label">Total Amount:</span>
          <span class="amount">$${Number(data.amount).toFixed(2)}</span>
        </div>
      </div>
      
      ${data.download_url ? `
      <div class="receipt-details">
        <h3>Download Information</h3>
        <div class="row">
          <span class="label">Download Link:</span>
          <span><a href="${data.download_url}">Download Now</a></span>
        </div>
        ${data.expires_at ? `
        <div class="row">
          <span class="label">Expires:</span>
          <span>${new Date(data.expires_at).toLocaleDateString()}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <div class="footer">
        <p>Thank you for your purchase!</p>
        <p>For support, contact us at support@pluggd.fm</p>
      </div>
    </body>
    </html>
  `;
}