import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!;
    
    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      audioFileId, 
      filePath, 
      fileSize, 
      fileName,
      fileType 
    } = await req.json();

    console.log('Processing audio upload:', { audioFileId, fileName, fileSize });

    // Validate file upload against user limits
    const { data: fileLimits } = await supabaseClient
      .rpc('get_user_file_limits', { p_user_id: user.id });

    if (!fileLimits) {
      return new Response(JSON.stringify({ error: 'Could not get file limits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check file size limit
    const fileSizeMB = fileSize / (1024 * 1024);
    if (fileSizeMB > fileLimits.max_file_size_mb) {
      return new Response(JSON.stringify({ 
        error: `File too large. Max size: ${fileLimits.max_file_size_mb}MB` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check file format
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (!fileLimits.allowed_formats.includes(fileExtension)) {
      return new Response(JSON.stringify({ 
        error: `File format not allowed. Allowed: ${fileLimits.allowed_formats.join(', ')}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process audio file metadata (basic implementation)
    const processAudioMetadata = async () => {
      // In a real implementation, you would use a library like FFmpeg
      // to extract audio metadata and generate waveforms
      // For now, return simulated metadata
      return {
        duration_seconds: Math.floor(Math.random() * 240) + 60, // 1-5 minutes
        sample_rate: 44100,
        bit_rate: 320000,
        waveform_data: null // Would contain waveform visualization data
      };
    };

    // Start background processing without blocking the response
    const backgroundProcessing = (async () => {
      try {
        console.log(`Starting background processing for: ${audioFileId}`);
        
        // Extract metadata
        const metadata = await processAudioMetadata();

        // Generate streaming URL
        const { data: streamData } = supabaseClient.storage
          .from('audio-files')
          .getPublicUrl(filePath);

        // Update audio file record with processing results
        const { error: updateError } = await supabaseClient
          .from('audio_files')
          .update({
            stream_url: streamData.publicUrl,
            duration_seconds: metadata.duration_seconds,
            sample_rate: metadata.sample_rate,
            bit_rate: metadata.bit_rate,
            waveform_data: metadata.waveform_data,
            processing_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', audioFileId);

        if (updateError) throw updateError;

        // Update user file quotas
        const { error: quotaError } = await supabaseClient
          .rpc('update_file_quotas', {
            p_user_id: user.id,
            p_file_size: fileSize
          });

        if (quotaError) throw quotaError;

        console.log(`Successfully processed audio file: ${audioFileId}`);
      } catch (error) {
        console.error('Background processing error:', error);
        
        // Mark as failed
        await supabaseClient
          .from('audio_files')
          .update({
            processing_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', audioFileId);
      }
    });

    // Use EdgeRuntime.waitUntil to handle background processing
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(backgroundProcessing());
    } else {
      // Fallback for environments without EdgeRuntime.waitUntil
      backgroundProcessing().catch(console.error);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Audio processing started',
      audioFileId 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Audio processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});