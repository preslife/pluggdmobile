import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Trigger webhook delivery for this event
    const webhookResponse = await supabaseClient.functions.invoke('webhook-delivery', {
      body: { event_type, user_id, data }
    });

    console.log(`[WEBHOOK-TRIGGER] Triggered ${event_type} for user ${user_id}`, { 
      success: !webhookResponse.error,
      error: webhookResponse.error 
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Event webhook triggered"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[WEBHOOK-TRIGGER] Error:", error.message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});