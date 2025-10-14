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

const sanitizeFileName = (value: string) =>
  value?.replace(/[^a-zA-Z0-9]/g, '_') || 'track';

const getFileExtension = (value: string | null) => {
  if (!value) return '.mp3';
  const withoutQuery = value.split('?')[0] || value;
  const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
  return match ? `.${match[1]}` : '.mp3';
};

type StorageLocation = {
  bucket: string;
  path: string;
  isPublic: boolean;
};

const extractStorageLocation = (input: string | null): StorageLocation | null => {
  if (!input) return null;

  try {
    const url = new URL(input);
    const parts = url.pathname.split('/');
    const objectIndex = parts.findIndex(part => part === 'object');
    if (objectIndex !== -1) {
      const mode = parts[objectIndex + 1];
      const bucket = parts[objectIndex + 2];
      const path = parts.slice(objectIndex + 3).join('/');
      return { bucket, path, isPublic: mode === 'public' };
    }
  } catch {
    // Not a full storage URL
  }

  const normalized = input.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\//, '');
  const directMatch = normalized.match(/^(public|sign)\/([a-zA-Z0-9-]+)\/(.+)$/);
  if (directMatch) {
    const [, mode, bucket, path] = directMatch;
    return { bucket, path, isPublic: mode === 'public' };
  }

  const releaseAudioMatch = input.match(/^release-audio\/(.+)$/);
  if (releaseAudioMatch) {
    return { bucket: 'release-audio', path: releaseAudioMatch[1], isPublic: false };
  }

  const releaseArtworkMatch = input.match(/^release-artwork\/(.+)$/);
  if (releaseArtworkMatch) {
    return { bucket: 'release-artwork', path: releaseArtworkMatch[1], isPublic: false };
  }

  return null;
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

    type ReleaseTrack = {
      track_number: number | null;
      title: string | null;
      duration: number | null;
      audio_url: string | null;
    };

    const { data: releaseTracks, error: releaseTracksError } = await supabaseService
      .from('release_tracks')
      .select('track_number, title, duration, audio_url')
      .eq('release_id', release_id)
      .order('track_number', { ascending: true });

    if (releaseTracksError) {
      logStep('Failed to fetch release tracks', { error: releaseTracksError.message });
    }

    const typedTracks = (releaseTracks as ReleaseTrack[] | null) ?? [];
    const hasTrackData = typedTracks.length > 0;

    const trackAssetEntries: { trackNumber: number; audioUrl: string | null; localPath: string | null }[] = [];

    const tracksMetadata = (hasTrackData
      ? typedTracks
      : [{
          track_number: 1,
          title: release.title,
          duration: null,
          audio_url: release.download_url ?? null,
        } as ReleaseTrack]
    ).map((track, index) => {
      const trackNumber = track.track_number ?? index + 1;
      const title = track.title || `Track ${trackNumber}`;
      const effectiveAudioUrl = track.audio_url ?? (!hasTrackData ? release.download_url ?? null : null);
      const extension = getFileExtension(effectiveAudioUrl);
      const sanitizedTitle = sanitizeFileName(title);
      const localPath = effectiveAudioUrl
        ? `tracks/${String(trackNumber).padStart(2, '0')}_${sanitizedTitle}${extension}`
        : null;

      trackAssetEntries.push({
        trackNumber,
        audioUrl: effectiveAudioUrl,
        localPath,
      });

      return {
        track_number: trackNumber,
        title,
        artist: release.artist,
        duration: typeof track.duration === 'number' ? track.duration : null,
        file_path: localPath,
      };
    });

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
      tracks: tracksMetadata,
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
      files: [] as Array<{
        type: string;
        original_filename: string;
        download_url: string;
        local_path: string;
      }>
    };

    for (const entry of trackAssetEntries) {
      if (!entry.audioUrl || !entry.localPath) continue;

      const storageLocation = extractStorageLocation(entry.audioUrl);
      let downloadUrl = entry.audioUrl;
      let originalFilename = entry.localPath.split('/').pop() || entry.localPath;

      if (storageLocation) {
        originalFilename = storageLocation.path.split('/').pop() || originalFilename;

        if (storageLocation.isPublic) {
          const { data } = supabaseService.storage
            .from(storageLocation.bucket)
            .getPublicUrl(storageLocation.path);

          downloadUrl = data?.publicUrl ?? entry.audioUrl;
        } else {
          const { data, error } = await supabaseService.storage
            .from(storageLocation.bucket)
            .createSignedUrl(storageLocation.path, 3600);

          if (error) {
            logStep('Failed to sign audio file', { error: error.message, path: storageLocation.path });
            continue;
          }

          downloadUrl = data?.signedUrl ?? entry.audioUrl;
        }
      }

      packageAssets.files.push({
        type: 'audio',
        original_filename: originalFilename,
        download_url: downloadUrl,
        local_path: entry.localPath,
      });
    }

    if (release.cover_art_url) {
      const artworkLocation = extractStorageLocation(release.cover_art_url);
      const artworkExtension = getFileExtension(release.cover_art_url);
      const artworkLocalPath = `artwork/cover${artworkExtension}`;

      if (artworkLocation) {
        let artworkUrl: string | null = null;

        if (artworkLocation.isPublic) {
          const { data } = supabaseService.storage
            .from(artworkLocation.bucket)
            .getPublicUrl(artworkLocation.path);

          artworkUrl = data?.publicUrl ?? release.cover_art_url;
        } else {
          const { data, error } = await supabaseService.storage
            .from(artworkLocation.bucket)
            .createSignedUrl(artworkLocation.path, 3600);

          if (error) {
            logStep('Failed to sign artwork file', { error: error.message, path: artworkLocation.path });
          } else {
            artworkUrl = data?.signedUrl ?? release.cover_art_url;
          }
        }

        if (artworkUrl) {
          packageAssets.files.push({
            type: 'artwork',
            original_filename: artworkLocation.path.split('/').pop() || `cover${artworkExtension}`,
            download_url: artworkUrl,
            local_path: artworkLocalPath,
          });
        }
      } else {
        packageAssets.files.push({
          type: 'artwork',
          original_filename: `cover${artworkExtension}`,
          download_url: release.cover_art_url,
          local_path: artworkLocalPath,
        });
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