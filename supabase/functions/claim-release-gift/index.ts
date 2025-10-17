import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimRequest {
  token?: string;
}

interface GiftRecord {
  id: string;
  release_id: string;
  purchase_id: string | null;
  purchaser_id: string | null;
  recipient_email: string;
  claim_token: string;
  claimed_at: string | null;
  claimed_by: string | null;
  delivered_at: string | null;
  releases?: {
    id: string;
    title: string;
    artist: string;
    cover_art_url: string | null;
  } | null;
  purchase?: {
    id: string;
    status: string;
    user_id: string | null;
  } | null;
}

const siteUrl = Deno.env.get("SITE_URL") ?? "https://pluggd.fm";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as ClaimRequest;
    const claimToken = body?.token?.trim();

    if (!claimToken) {
      return new Response(
        JSON.stringify({ error: "Missing claim token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: gift, error: giftError } = await supabaseService
      .from<GiftRecord>("release_gift_queue")
      .select(`
        id,
        release_id,
        purchase_id,
        purchaser_id,
        recipient_email,
        claim_token,
        claimed_at,
        claimed_by,
        delivered_at,
        releases:release_id (
          id,
          title,
          artist,
          cover_art_url
        ),
        purchase:purchase_id (
          id,
          status,
          user_id
        )
      `)
      .eq("claim_token", claimToken)
      .maybeSingle();

    if (giftError || !gift) {
      return new Response(
        JSON.stringify({ error: "Gift not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!gift.delivered_at) {
      return new Response(
        JSON.stringify({ error: "Gift is not ready to be claimed yet" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (gift.claimed_at) {
      return new Response(
        JSON.stringify({ error: "Gift has already been claimed" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userEmail = user.email?.trim()?.toLowerCase() ?? "";
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "Your account is missing an email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (gift.recipient_email.trim().toLowerCase() !== userEmail) {
      return new Response(
        JSON.stringify({
          error: "This gift was sent to a different email address",
          expectedEmail: gift.recipient_email,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ensure there is a purchase record we can assign to the recipient
    let purchaseId = gift.purchase?.id ?? null;
    if (!purchaseId && gift.release_id) {
      const { data: purchaseInsert, error: insertError } = await supabaseService
        .from("release_purchases")
        .insert({
          release_id: gift.release_id,
          user_id: user.id,
          purchaser_id: gift.purchaser_id ?? user.id,
          status: "completed",
          amount_paid: 0,
          purchased_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
          available_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (insertError || !purchaseInsert) {
        return new Response(
          JSON.stringify({ error: "Unable to create download access for gift" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      purchaseId = purchaseInsert.id;
    }

    if (!purchaseId) {
      return new Response(
        JSON.stringify({ error: "Purchase record unavailable for this gift" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: purchaseUpdateError } = await supabaseService
      .from("release_purchases")
      .update({
        user_id: user.id,
        purchaser_id: gift.purchaser_id ?? user.id,
        status: "completed",
        paid_at: new Date().toISOString(),
      })
      .eq("id", purchaseId);

    if (purchaseUpdateError) {
      return new Response(
        JSON.stringify({ error: "Unable to grant access to this release" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: queueUpdateError } = await supabaseService
      .from("release_gift_queue")
      .update({
        purchase_id: purchaseId,
        claimed_at: new Date().toISOString(),
        claimed_by: user.id,
        status: "delivered",
      })
      .eq("id", gift.id);

    if (queueUpdateError) {
      return new Response(
        JSON.stringify({ error: "Unable to record gift claim" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabaseService.from("system_logs").insert({
      level: 2,
      message: "Gift claimed",
      component: "releases.gifting",
      action: "gift_claimed",
      user_id: user.id,
      metadata: {
        gift_id: gift.id,
        release_id: gift.release_id,
        purchase_id: purchaseId,
      },
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        ok: true,
        release: {
          id: gift.releases?.id ?? gift.release_id,
          title: gift.releases?.title ?? "Release",
          artist: gift.releases?.artist ?? undefined,
          cover_art_url: gift.releases?.cover_art_url ?? null,
        },
        libraryUrl: `${siteUrl.replace(/\/$/, "")}/library`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[claim-release-gift] Unexpected error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
