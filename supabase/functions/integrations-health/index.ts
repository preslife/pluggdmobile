import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check admin role using RPC if available
    let isAdmin = false;
    try {
      const { data: hasRole } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      isAdmin = !!hasRole;
    } catch (_) {
      isAdmin = false;
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const result = {
      supabase: {
        url: !!Deno.env.get("SUPABASE_URL"),
        anonKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
      },
      stripe: {
        secretKey: !!Deno.env.get("STRIPE_SECRET_KEY"),
        webhookSecret: !!Deno.env.get("STRIPE_WEBHOOK_SECRET"),
      },
      openai: {
        apiKey: !!Deno.env.get("OPENAI_API_KEY"),
      },
      spotify: {
        clientId: !!Deno.env.get("SPOTIFY_CLIENT_ID"),
        clientSecret: !!Deno.env.get("SPOTIFY_CLIENT_SECRET"),
      },
      youtube: {
        apiKey: !!Deno.env.get("YOUTUBE_API_KEY"),
      },
      elevenlabs: {
        apiKey: !!Deno.env.get("ELEVENLABS_API_KEY"),
      },
      hume: {
        apiKey: !!Deno.env.get("HUME_API_KEY"),
        secretKey: !!Deno.env.get("HUME_SECRET_KEY"),
      },
      resend: {
        apiKey: !!Deno.env.get("RESEND_API_KEY"),
      },
      paypal: {
        clientId: !!Deno.env.get("PAYPAL_CLIENT_ID"),
        clientSecret: !!Deno.env.get("PAYPAL_CLIENT_SECRET"),
      },
    };

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
