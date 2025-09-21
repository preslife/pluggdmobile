import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-RELEASE-ACCESS] ${step}${detailsStr}`);
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

    const { releaseId } = await req.json();
    if (!releaseId) throw new Error("Release ID is required");
    
    logStep("Request data", { releaseId });

    // Get user if authenticated
    let userId = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) {
        logStep("Authentication failed", { error: userError.message });
      } else if (userData.user) {
        userId = userData.user.id;
        logStep("User authenticated", { userId });
      }
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Use the can_access_release function
    const { data: accessResult, error: accessError } = await supabaseService
      .rpc('can_access_release', {
        p_user_id: userId,
        p_release_id: releaseId
      });

    if (accessError) {
      logStep("Access check failed", { error: accessError });
      throw accessError;
    }

    const hasAccess = accessResult === true;
    logStep("Access check completed", { hasAccess });

    // If user has access and is authenticated, check if they purchased it
    let hasPurchased = false;
    if (hasAccess && userId) {
      const { data: purchaseData } = await supabaseService
        .rpc('has_purchased_release', {
          p_user_id: userId,
          p_release_id: releaseId
        });
      hasPurchased = purchaseData === true;
    }

    // Get release info for additional context
    const { data: release, error: releaseError } = await supabaseService
      .from('releases')
      .select('price, is_premium_content, approval_status, scheduled_publish_date')
      .eq('id', releaseId)
      .single();

    if (releaseError) {
      logStep("Release info fetch failed", { error: releaseError });
      throw releaseError;
    }

    // Check if release is published
    const isPublished = release.approval_status === 'approved' || release.approval_status === 'auto_approved';
    const isScheduled = release.scheduled_publish_date && new Date(release.scheduled_publish_date) > new Date();

    return new Response(JSON.stringify({ 
      hasAccess: hasAccess && isPublished && !isScheduled,
      hasPurchased,
      needsPurchase: release.price > 0 && !hasPurchased,
      isPremium: release.is_premium_content,
      isScheduled,
      isPublished
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-release-access", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});