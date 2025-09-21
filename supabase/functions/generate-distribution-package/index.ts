import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DISTRIBUTION-PACKAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { release_id } = await req.json();
    if (!release_id) {
      throw new Error('Release ID is required');
    }

    logStep("Processing release", { release_id });

    // Create Supabase clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    logStep("User authenticated", { userId: user.id });

    // Fetch release data
    const { data: release, error: releaseError } = await supabaseService
      .from('releases')
      .select('*')
      .eq('id', release_id)
      .eq('user_id', user.id)
      .single();

    if (releaseError || !release) {
      throw new Error('Release not found or access denied');
    }

    logStep("Release fetched", { title: release.title, artist: release.artist });

    // Create distribution metadata
    const distributionMetadata = {
      release: {
        id: release.id,
        title: release.title,
        artist: release.artist,
        description: release.description,
        genre: release.genre,
        release_type: release.release_type,
        release_date: release.release_date,
        digital_release_date: release.digital_release_date,
        upc_code: release.upc_code,
        isrc_code: release.isrc_code,
        explicit: release.explicit || false,
        is_instrumental: release.is_instrumental || false,
        lyrics: release.lyrics,
        credits: release.credits_json || [],
        distributor_provider: release.distributor_provider || 'manual',
        smartlink_slug: release.smartlink_slug,
        dsp_links: release.dsp_links || {},
        price: release.price,
        download_price: release.download_price,
        created_at: release.created_at
      },
      tracks: [
        {
          track_number: 1,
          title: release.title,
          artist: release.artist,
          duration: null, // TODO: Extract from audio file if available
          file_path: release.download_url ? `tracks/${release.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3` : null
        }
      ],
      package_info: {
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        package_version: '1.0',
        format: 'pluggd_distribution_v1'
      }
    };

    logStep("Metadata created", { tracks: distributionMetadata.tracks.length });

    // Generate signed URLs for assets
    const packageAssets = {
      metadata: distributionMetadata,
      files: []
    };

    // Add audio file reference if available
    if (release.download_url) {
      const audioFileName = release.download_url.split('/').pop();
      if (audioFileName) {
        const { data: audioSignedUrl } = await supabaseService.storage
          .from('release-audio')
          .createSignedUrl(audioFileName, 3600);

        if (audioSignedUrl?.signedUrl) {
          packageAssets.files.push({
            type: 'audio',
            original_filename: audioFileName,
            download_url: audioSignedUrl.signedUrl,
            local_path: `tracks/${release.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
          });
        }
      }
    }

    // Add cover art reference if available
    if (release.cover_art_url) {
      const artworkFileName = release.cover_art_url.split('/').pop();
      if (artworkFileName) {
        const { data: artworkSignedUrl } = await supabaseService.storage
          .from('release-artwork')
          .createSignedUrl(artworkFileName, 3600);

        if (artworkSignedUrl?.signedUrl) {
          packageAssets.files.push({
            type: 'artwork',
            original_filename: artworkFileName,
            download_url: artworkSignedUrl.signedUrl,
            local_path: 'artwork/cover.jpg'
          });
        }
      }
    }

    logStep("Package assets prepared", { file_count: packageAssets.files.length });

    // Create package manifest
    const packageManifest = {
      package_id: `dist_${release_id}_${Date.now()}`,
      release_id: release_id,
      created_at: new Date().toISOString(),
      created_by: user.id,
      assets: packageAssets,
      instructions: {
        distribution_ready: true,
        required_files: [
          'metadata.json - Release metadata and track information',
          'tracks/ - High-quality audio files',
          'artwork/ - Cover art (minimum 3000x3000px recommended)'
        ],
        next_steps: [
          '1. Download all referenced files using the provided signed URLs',
          '2. Verify metadata accuracy',
          '3. Ensure audio files meet distributor requirements',
          '4. Submit to chosen distribution platform',
          '5. Update DSP links in Pluggd once live'
        ],
        notes: [
          'Signed URLs expire in 1 hour',
          'Package generated for manual distribution workflow',
          'Contact support for automated distribution setup'
        ]
      }
    };

    // Store package reference in database (for future tracking)
    const packagePath = `distribution_packages/${release_id}/${packageManifest.package_id}`;
    
    // Log the distribution package creation
    await supabaseService
      .from('download_events')
      .insert({
        user_id: user.id,
        purchase_id: release_id,
        purchase_type: 'distribution_package',
        file_path: packagePath
      });

    // Update release distribution status
    await supabaseService
      .from('releases')
      .update({ 
        distribution_status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq('id', release_id);

    logStep("Package generated successfully", { package_id: packageManifest.package_id });

    return new Response(JSON.stringify({
      success: true,
      package: packageManifest,
      message: 'Distribution package generated successfully'
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
      status: 200,
    });

  } catch (error) {
    logStep("ERROR", { message: error.message });
    console.error('Distribution package generation error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Package generation failed',
      success: false
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
      status: 500,
    });
  }
});