import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-RELEASE-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const {
      releaseId,
      amount,
      payWhatYouWant,
      giftRecipientEmail,
      giftRecipientName,
      giftMessage
    } = await req.json();
    if (!releaseId) throw new Error("Release ID is required");
    
    logStep("Request data", { releaseId, amount, payWhatYouWant, giftRecipientEmail: Boolean(giftRecipientEmail) });

    // Get release info
    const { data: release, error: releaseError } = await supabaseClient
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (releaseError || !release) {
      throw new Error("Release not found");
    }

    logStep("Release found", { release: release.title, artist: release.artist });

    const releasePrice = typeof release.price === 'number' ? release.price : Number(release.price ?? 0);
    const releaseMinimumPrice = typeof release.minimum_price === 'number'
      ? release.minimum_price
      : Number(release.minimum_price ?? 0);

    const releaseDigitalDate = release.digital_release_date ? new Date(release.digital_release_date) : null;
    const releaseDate = release.release_date ? new Date(release.release_date) : null;
    const preorderAvailableAt = release.preorder_available_at
      ? new Date(release.preorder_available_at)
      : releaseDigitalDate ?? releaseDate;

    const now = new Date();
    const isPreorder = Boolean(
      release.preorder_enabled &&
        preorderAvailableAt &&
        preorderAvailableAt.getTime() > now.getTime()
    );

    const availabilityDate = preorderAvailableAt ?? releaseDigitalDate ?? releaseDate ?? now;
    const availabilityIso = availabilityDate.toISOString();

    const isGift = Boolean(giftRecipientEmail);
    const claimToken = isGift ? crypto.randomUUID().replace(/-/g, "") : null;
    if (isGift && !release.allow_gifting) {
      throw new Error("Gifting is not enabled for this release.");
    }
    if (isGift && typeof giftRecipientEmail === 'string') {
      const trimmed = giftRecipientEmail.trim();
      if (!trimmed.includes('@')) {
        throw new Error("Enter a valid recipient email address.");
      }
    }

    // Check if user already purchased this release
    const { data: existingPurchase, error: existingPurchaseError } = await supabaseClient
      .from('release_purchases')
      .select('id, status, stripe_session_id')
      .eq('user_id', user.id)
      .eq('release_id', releaseId)
      .maybeSingle();

    if (existingPurchaseError && existingPurchaseError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing purchases: ${existingPurchaseError.message}`);
    }

    if (existingPurchase?.status === 'completed' && !isGift && !isPreorder) {
      throw new Error("You have already purchased this release");
    }

    // Determine price
    let finalAmount = releasePrice || 0;
    if (payWhatYouWant && amount) {
      const minPrice = releaseMinimumPrice || 0;
      if (amount < minPrice) {
        throw new Error(`Minimum price is ${minPrice / 100} ${release.currency || 'GBP'}`);
      }
      finalAmount = amount;
    } else if (release.pay_what_you_want && amount) {
      // Also handle PWYW validation when amount is provided
      const minPrice = releaseMinimumPrice || 0;
      if (amount < minPrice) {
        throw new Error(`Minimum price is ${minPrice / 100} ${release.currency || 'GBP'}`);
      }
      finalAmount = amount;
    }

    if (finalAmount <= 0) {
      throw new Error("Invalid purchase amount");
    }

    logStep("Final amount calculated", { finalAmount });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${release.title} - ${release.artist}`,
              description: `Digital release by ${release.artist}`,
              images: release.cover_art_url ? [release.cover_art_url] : undefined,
            },
            unit_amount: Math.round(finalAmount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/release/${releaseId}?purchased=true`,
      cancel_url: `${req.headers.get("origin")}/release/${releaseId}`,
      metadata: {
        userId: user.id,
        releaseId: releaseId,
        type: 'release_purchase',
        is_preorder: isPreorder ? 'true' : 'false',
        available_at: availabilityIso,
        is_gift: isGift ? 'true' : 'false',
        gift_recipient_email: giftRecipientEmail ?? '',
        gift_recipient_name: giftRecipientName ?? '',
        gift_claim_token: claimToken ?? ''
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create pending purchase record
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const purchasePayload = {
      user_id: user.id,
      purchaser_id: user.id,
      release_id: releaseId,
      amount_paid: finalAmount,
      status: 'pending' as const,
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      purchased_at: new Date().toISOString(),
      paid_at: null,
      download_expires_at: null,
      is_preorder: isPreorder,
      available_at: availabilityIso,
      gift_recipient_email: isGift ? (giftRecipientEmail?.trim() ?? null) : null,
      gift_recipient_name: isGift ? (giftRecipientName?.trim() ?? null) : null,
      gift_message: isGift ? (giftMessage?.trim() ?? null) : null
    };

    let purchaseRecordId: string | null = null;

    const reuseExisting = existingPurchase && existingPurchase.status !== 'completed' && !isGift && !isPreorder;

    if (reuseExisting) {
      const { data: updated, error } = await supabaseService
        .from('release_purchases')
        .update({
          ...purchasePayload,
          downloads_used: 0,
          last_download_at: null,
        })
        .eq('id', existingPurchase!.id)
        .select('id')
        .maybeSingle();

      if (error) {
        logStep("Purchase record creation failed", { error });
      } else {
        purchaseRecordId = updated?.id ?? existingPurchase!.id;
        logStep("Purchase record refreshed", {
          purchaseId: purchaseRecordId,
          status: purchasePayload.status,
        });
      }
    } else {
      const { data: inserted, error } = await supabaseService
        .from('release_purchases')
        .insert(purchasePayload)
        .select('id')
        .maybeSingle();

      if (error) {
        logStep("Purchase record creation failed", { error });
      } else {
        purchaseRecordId = inserted?.id ?? null;
        logStep("Purchase record created", {
          purchaseId: purchaseRecordId,
          status: purchasePayload.status,
        });
      }
    }

    if (isGift) {
      try {
        await supabaseService
          .from('release_gift_queue')
          .insert({
            release_id: releaseId,
            purchase_id: purchaseRecordId,
            purchaser_id: user.id,
            recipient_email: giftRecipientEmail?.trim() ?? '',
            recipient_name: giftRecipientName?.trim() || null,
            gift_message: giftMessage?.trim() || null,
            status: 'pending',
            deliver_at: availabilityIso,
            claim_token: claimToken
          });
      } catch (giftError) {
        logStep("Gift queue insert failed", { error: giftError });
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-release-purchase", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
