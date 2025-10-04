import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userResult, error: userError } = await serviceClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Unable to authenticate user: ${userError.message}`);
    }

    const user = userResult.user;
    if (!user) {
      throw new Error("User not found");
    }

    const body = await req.json();
    const roomId: string | undefined = body?.room_id ?? body?.roomId;
    const giftId: string | undefined = body?.gift_id ?? body?.giftId;
    const quantity: number = Math.max(1, Number(body?.quantity) || 1);
    const message: string | undefined = body?.message?.toString();
    const animationVariant: string | undefined = body?.animation_variant?.toString();

    if (!roomId || !giftId) {
      throw new Error("room_id and gift_id are required");
    }

    const { data: eventId, error: giftError } = await serviceClient.rpc('perform_live_gift', {
      p_sender: user.id,
      p_room_id: roomId,
      p_gift_id: giftId,
      p_quantity: quantity,
      p_message: message ?? null,
      p_animation_variant: animationVariant ?? null,
    });

    if (giftError) {
      throw new Error(giftError.message);
    }

    const { data: giftEvent, error: fetchError } = await serviceClient
      .from('live_gift_events')
      .select(`
        id,
        room_id,
        sender_id,
        quantity,
        total_credits,
        message,
        animation_variant,
        created_at,
        live_gift_catalog(id, slug, label, credit_cost, animation_url, thumbnail_url)
      `)
      .eq('id', eventId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const { data: balanceData } = await serviceClient.rpc('get_wallet_balance', {
      p_user_id: user.id,
    });

    return new Response(JSON.stringify({
      event: giftEvent,
      balance: balanceData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[send-live-gift]', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
