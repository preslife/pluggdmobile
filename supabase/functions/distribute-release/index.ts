import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { releaseId, platforms, distributionSettings } = await req.json();

    console.log('Starting distribution for release:', releaseId, 'to platforms:', platforms);

    // Mock platform APIs (in real implementation, these would be actual API calls)
    const platformAPIs = {
      spotify: {
        name: 'Spotify',
        submitRelease: async (release: any) => {
          console.log('Submitting to Spotify:', release.title);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return {
            success: Math.random() > 0.1,
            externalId: `spotify_${Math.random().toString(36).substr(2, 9)}`,
            estimatedLiveDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            message: 'Submitted successfully to Spotify'
          };
        }
      },
      appleMusic: {
        name: 'Apple Music',
        submitRelease: async (release: any) => {
          console.log('Submitting to Apple Music:', release.title);
          await new Promise(resolve => setTimeout(resolve, 1500));
          return {
            success: Math.random() > 0.1,
            externalId: `apple_${Math.random().toString(36).substr(2, 9)}`,
            estimatedLiveDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            message: 'Submitted successfully to Apple Music'
          };
        }
      },
      youtubeMusic: {
        name: 'YouTube Music',
        submitRelease: async (release: any) => {
          console.log('Submitting to YouTube Music:', release.title);
          await new Promise(resolve => setTimeout(resolve, 800));
          return {
            success: Math.random() > 0.1,
            externalId: `youtube_${Math.random().toString(36).substr(2, 9)}`,
            estimatedLiveDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            message: 'Submitted successfully to YouTube Music'
          };
        }
      },
      soundcloud: {
        name: 'SoundCloud',
        submitRelease: async (release: any) => {
          console.log('Submitting to SoundCloud:', release.title);
          await new Promise(resolve => setTimeout(resolve, 500));
          return {
            success: Math.random() > 0.05,
            externalId: `soundcloud_${Math.random().toString(36).substr(2, 9)}`,
            estimatedLiveDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            message: 'Submitted successfully to SoundCloud'
          };
        }
      }
    };

    // Get release details (mock)
    const releaseData = {
      id: releaseId,
      title: 'Sample Release',
      artist: 'Demo Artist',
      genre: 'Hip Hop',
      audioUrl: 'https://example.com/audio.mp3',
      coverArt: 'https://example.com/cover.jpg',
      isrc: `US-XYZ-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      metadata: {
        explicit: false,
        releaseDate: new Date().toISOString(),
        copyrightOwner: 'Demo Artist',
        publishingRights: 'All rights reserved'
      }
    };

    // Process distribution to each platform
    const distributionResults = [];
    
    for (const platformId of platforms) {
      const platform = platformAPIs[platformId as keyof typeof platformAPIs];
      
      if (!platform) {
        console.log(`Platform ${platformId} not supported`);
        distributionResults.push({
          platform: platformId,
          success: false,
          error: 'Platform not supported'
        });
        continue;
      }

      try {
        const result = await platform.submitRelease(releaseData);
        
        // In real implementation, save to distribution_status table
        console.log(`Distribution result for ${platform.name}:`, result);
        
        distributionResults.push({
          platform: platformId,
          platformName: platform.name,
          success: result.success,
          externalId: result.externalId,
          estimatedLiveDate: result.estimatedLiveDate,
          message: result.message,
          submittedAt: new Date().toISOString()
        });

      } catch (error) {
        console.error(`Distribution failed for ${platform.name}:`, error);
        distributionResults.push({
          platform: platformId,
          platformName: platform.name,
          success: false,
          error: error.message,
          submittedAt: new Date().toISOString()
        });
      }
    }

    // Generate ISRC if not provided
    if (!releaseData.isrc) {
      releaseData.isrc = `US-XYZ-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
    }

    const response = {
      success: true,
      releaseId,
      isrcCode: releaseData.isrc,
      distributionResults,
      summary: {
        totalPlatforms: platforms.length,
        successfulSubmissions: distributionResults.filter(r => r.success).length,
        failedSubmissions: distributionResults.filter(r => !r.success).length
      },
      estimatedGoLiveDate: Math.min(...distributionResults
        .filter(r => r.success && r.estimatedLiveDate)
        .map(r => new Date(r.estimatedLiveDate!).getTime())
      )
    };

    console.log('Distribution completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Distribution error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Distribution failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})