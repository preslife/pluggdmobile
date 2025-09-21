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

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { samplePackId, downloadUrl } = await req.json();
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user has purchased this pack
    const { data: purchase, error: purchaseError } = await supabaseService
      .from('sample_pack_purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('sample_pack_id', samplePackId)
      .single();

    if (purchaseError && purchaseError.code !== 'PGRST116') {
      throw purchaseError;
    }

    if (!purchase) {
      throw new Error('No purchase found for this sample pack');
    }

    // Check download limits
    if (purchase.downloads_used >= purchase.download_limit) {
      throw new Error('Download limit exceeded');
    }

    // Check if download has expired
    if (purchase.download_expires_at && new Date(purchase.download_expires_at) < new Date()) {
      throw new Error('Download link has expired');
    }

    // Update download count
    await supabaseService
      .from('sample_pack_purchases')
      .update({ 
        downloads_used: purchase.downloads_used + 1,
        last_download_at: new Date().toISOString()
      })
      .eq('id', purchase.id);

    // Update sample pack total downloads
    await supabaseService
      .from('sample_packs')
      .update({ 
        total_downloads: supabaseService.sql`total_downloads + 1`
      })
      .eq('id', samplePackId);

    // Generate secure download URL from Supabase Storage
    const { data: urlData, error: urlError } = await supabaseService.storage
      .from('sample-pack-files')
      .createSignedUrl(downloadUrl, 3600); // 1 hour expiry

    if (urlError) throw urlError;

    return new Response(JSON.stringify({ 
      downloadUrl: urlData.signedUrl,
      downloadsRemaining: purchase.download_limit - purchase.downloads_used - 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[download-sample-pack] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});