import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { releaseId } = await req.json();

    if (!releaseId) {
      throw new Error('Release ID is required');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Fetch release data
    const { data: release, error: releaseError } = await supabaseClient
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .eq('user_id', user.id)
      .single();

    if (releaseError || !release) {
      throw new Error('Release not found or access denied');
    }

    // Create metadata JSON for distribution
    const distributionMetadata = {
      release: {
        title: release.title,
        artist: release.artist,
        description: release.description,
        genre: release.genre,
        release_type: release.release_type,
        upc_code: release.upc_code,
        release_date: release.release_date,
        digital_release_date: release.digital_release_date,
        created_at: release.created_at,
        distribution_settings: release.distribution_settings
      },
      tracks: [],
      export_info: {
        export_date: new Date().toISOString(),
        exported_by: user.id,
        export_format: 'distribution_package'
      }
    };

    // Create service client for signed URLs
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate signed URLs for audio files if they exist
    const audioUrls = [];
    if (release.preview_url) {
      const { data: previewUrl } = await supabaseService.storage
        .from('release-audio')
        .createSignedUrl(release.preview_url.split('/').pop(), 3600);
      
      if (previewUrl?.signedUrl) {
        audioUrls.push({
          type: 'preview',
          url: previewUrl.signedUrl,
          filename: `${release.title}_preview.mp3`
        });
      }
    }

    if (release.download_url) {
      const { data: downloadUrl } = await supabaseService.storage
        .from('release-audio')
        .createSignedUrl(release.download_url.split('/').pop(), 3600);
      
      if (downloadUrl?.signedUrl) {
        audioUrls.push({
          type: 'full_track',
          url: downloadUrl.signedUrl,
          filename: `${release.title}_full.mp3`
        });
      }
    }

    // Generate signed URL for cover art
    let coverArtUrl = null;
    if (release.cover_art_url) {
      const { data: coverUrl } = await supabaseService.storage
        .from('release-artwork')
        .createSignedUrl(release.cover_art_url.split('/').pop(), 3600);
      
      if (coverUrl?.signedUrl) {
        coverArtUrl = {
          url: coverUrl.signedUrl,
          filename: `${release.title}_cover.jpg`
        };
      }
    }

    // Create export package
    const exportPackage = {
      metadata: distributionMetadata,
      audio_files: audioUrls,
      cover_art: coverArtUrl,
      platforms: {
        spotify: release.distribution_settings?.spotify || false,
        apple_music: release.distribution_settings?.apple_music || false,
        youtube_music: release.distribution_settings?.youtube_music || false
      },
      instructions: {
        message: 'This package contains all files and metadata needed for distribution.',
        required_files: [
          'High-quality audio files (WAV/FLAC preferred)',
          'Cover artwork (minimum 3000x3000px)',
          'Metadata JSON file',
          'Distribution platform selection'
        ],
        next_steps: [
          'Review all metadata for accuracy',
          'Ensure audio files meet platform requirements',
          'Submit to selected distribution platforms',
          'Monitor release status'
        ]
      }
    };

    // Store export event in database
    await supabaseService
      .from('download_events')
      .insert({
        user_id: user.id,
        purchase_id: releaseId,
        purchase_type: 'distribution_export',
        file_path: `distribution_packages/${releaseId}`
      });

    return new Response(JSON.stringify(exportPackage), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
      status: 200,
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Export failed' 
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
      status: 500,
    });
  }
});