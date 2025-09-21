import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEBHOOK-DELIVERY] ${step}${detailsStr}`);
};

const createSignature = async (payload: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, dataData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const deliverWebhook = async (url: string, payload: any, secret: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = await createSignature(payloadString, secret);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pluggd-Signature': `sha256=${signature}`,
        'User-Agent': 'Pluggd-Webhooks/1.0',
      },
      body: payloadString,
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook delivery started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { event_type, user_id, data } = await req.json();
    
    if (!event_type || !user_id || !data) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Processing webhook delivery", { event_type, user_id });

    // Get active webhook endpoints for this user and event
    const { data: endpoints, error: endpointsError } = await supabaseClient
      .from('webhook_endpoints')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .contains('events', [event_type]);

    if (endpointsError) {
      logStep("Error fetching endpoints", { error: endpointsError });
      return new Response(JSON.stringify({ error: "Failed to fetch webhooks" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!endpoints || endpoints.length === 0) {
      logStep("No endpoints found for event", { event_type, user_id });
      return new Response(JSON.stringify({ message: "No webhooks configured for this event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare webhook payload
    const payload = {
      event: event_type,
      created_at: new Date().toISOString(),
      data: data
    };

    // Deliver to each endpoint with retry logic
    const deliveryPromises = endpoints.map(async (endpoint) => {
      const deliveryId = crypto.randomUUID();
      
      // Create delivery record
      await supabaseClient
        .from('webhook_deliveries')
        .insert({
          id: deliveryId,
          endpoint_id: endpoint.id,
          event_type,
          payload_json: payload,
          status: 'pending',
          attempt_count: 0
        });

      // Attempt delivery with exponential backoff
      let attempt = 0;
      const maxAttempts = 5;
      let lastError = '';
      
      while (attempt < maxAttempts) {
        attempt++;
        
        const result = await deliverWebhook(endpoint.url, payload, endpoint.secret);
        
        if (result.success) {
          // Mark as delivered
          await supabaseClient
            .from('webhook_deliveries')
            .update({
              status: 'delivered',
              attempt_count: attempt,
              delivered_at: new Date().toISOString()
            })
            .eq('id', deliveryId);
          
          logStep("Webhook delivered successfully", { endpoint: endpoint.url, attempts: attempt });
          break;
        } else {
          lastError = result.error || 'Unknown error';
          logStep("Webhook delivery failed", { endpoint: endpoint.url, attempt, error: lastError });
          
          // Update attempt count
          await supabaseClient
            .from('webhook_deliveries')
            .update({
              attempt_count: attempt,
              last_error: lastError
            })
            .eq('id', deliveryId);
          
          if (attempt < maxAttempts) {
            // Exponential backoff: 2^attempt seconds
            const delayMs = Math.pow(2, attempt) * 1000;
            await sleep(delayMs);
          } else {
            // Mark as failed after all attempts
            await supabaseClient
              .from('webhook_deliveries')
              .update({
                status: 'failed',
                last_error: lastError
              })
              .eq('id', deliveryId);
          }
        }
      }
    });

    await Promise.allSettled(deliveryPromises);

    return new Response(JSON.stringify({ 
      message: "Webhook delivery processing completed",
      endpoints_processed: endpoints.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("Unexpected error", { error: error.message });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});