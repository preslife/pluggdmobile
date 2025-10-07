import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  purchaseId?: string;
  purchaseType?: string;
  productId?: string;
  title?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: RequestBody = await req.json();
    const { purchaseId, purchaseType, productId, title } = body;

    if (!purchaseId || !purchaseType) {
      return new Response(
        JSON.stringify({ error: "purchaseId and purchaseType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = userData.user;

    const supabaseService = createClient(supabaseUrl, supabaseServiceRole, { auth: { persistSession: false } });
    const metadata = {
      purchaseId,
      purchaseType,
      productId: productId ?? null,
      title: title ?? null,
      userId: user.id,
      userEmail: user.email ?? null,
      requestedAt: new Date().toISOString(),
    };

    try {
      await supabaseService.from("support_tickets").insert({
        user_id: user.id,
        status: "open",
        source: "library",
        category: "downloads",
        subject: `Download reset: ${purchaseType}`,
        description: `User requested a download reset for ${title ?? purchaseId}.`,
        metadata,
      } as Record<string, unknown>);
    } catch (error) {
      console.error("Failed to log support ticket", error);
    }

    try {
      await supabaseService.from("system_logs").insert({
        level: 2,
        message: "Download reset requested",
        component: "downloads",
        action: "download_reset_requested",
        user_id: user.id,
        metadata,
      });
    } catch (error) {
      console.error("Failed to log system event", error);
    }

    const opsWebhook = Deno.env.get("OPS_SUPPORT_WEBHOOK_URL");
    if (opsWebhook) {
      try {
        await fetch(opsWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "download_reset_request",
            user: { id: user.id, email: user.email },
            payload: metadata,
          }),
        });
      } catch (error) {
        console.error("Failed to notify ops webhook", error);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unhandled error in request-download-reset", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
