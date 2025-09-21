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
    const { releaseId } = await req.json();

    if (!releaseId) {
      return new Response(
        JSON.stringify({ error: "Release ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Initialize Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Initialize Supabase client with service role for database access
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if user has purchased this release or if it's free
    const { data: release, error: releaseError } = await supabaseService
      .from('releases')
      .select('download_url, price, user_id')
      .eq('id', releaseId)
      .eq('approved', true)
      .eq('status', 'live')
      .single();

    if (releaseError || !release) {
      return new Response(
        JSON.stringify({ error: "Release not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check access permissions
    let hasAccess = false;

    // Free releases - everyone can download
    if (release.price === 0) {
      hasAccess = true;
    }
    // User owns the release
    else if (release.user_id === user.id) {
      hasAccess = true;
    }
    // Check if user purchased it
    else {
      const { data: purchase } = await supabaseService
        .from('release_purchases')
        .select('id, downloads_used, download_expires_at')
        .eq('user_id', user.id)
        .eq('release_id', releaseId)
        .single();

      if (purchase) {
        // Check if download hasn't expired and user hasn't exceeded download limit
        const now = new Date();
        const expiresAt = purchase.download_expires_at ? new Date(purchase.download_expires_at) : null;
        
        if (!expiresAt || now < expiresAt) {
          if (purchase.downloads_used < 3) { // Max 3 downloads
            hasAccess = true;
            
            // Increment download count
            await supabaseService
              .from('release_purchases')
              .update({ 
                downloads_used: purchase.downloads_used + 1,
                last_download_at: now.toISOString()
              })
              .eq('id', purchase.id);
          }
        }
      }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Access denied. Purchase required or download limit exceeded." }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!release.download_url) {
      return new Response(
        JSON.stringify({ error: "Download not available for this release" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate signed URL that expires in 1 hour
    const { data: signedUrlData, error: urlError } = await supabaseService.storage
      .from('release-audio')
      .createSignedUrl(release.download_url, 3600);

    if (urlError || !signedUrlData) {
      console.error('Error creating signed URL:', urlError);
      return new Response(
        JSON.stringify({ error: "Unable to generate download link" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Log download event
    try {
      await supabaseService
        .from('download_events')
        .insert({
          user_id: user.id,
          purchase_id: releaseId,
          purchase_type: 'release',
          file_path: release.download_url
        });
    } catch (logError) {
      console.error('Failed to log download event:', logError);
      // Don't fail the download if logging fails
    }

    return new Response(
      JSON.stringify({ 
        downloadUrl: signedUrlData.signedUrl,
        expiresIn: 3600 // 1 hour
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});