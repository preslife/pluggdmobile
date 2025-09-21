import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get Spotify access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${Deno.env.get('SPOTIFY_CLIENT_ID')}:${Deno.env.get('SPOTIFY_CLIENT_SECRET')}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get Spotify access token');
    }

    const { access_token } = await tokenResponse.json();

    const { artistId } = await req.json();
    if (!artistId) {
      throw new Error('Spotify Artist ID is required');
    }

    // Get artist information
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!artistResponse.ok) {
      throw new Error('Failed to fetch artist data from Spotify');
    }

    const artist = await artistResponse.json();
    const analytics = [];
    // Create or update artist analytics
    const { data: artistAnalytics, error: artistError } = await supabaseClient
      .from('artist_analytics')
      .upsert({
        user_id: user.id,
        platform: 'spotify',
        artist_id: artist.id,
        artist_name: artist.name,
      })
      .select()
      .single();

    if (artistError) {
      console.error('Error creating artist analytics:', artistError);
      throw new Error('Failed to create artist analytics');
    }

    // Get artist's top tracks
    const tracksResponse = await fetch(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (tracksResponse.ok) {
      const tracksData = await tracksResponse.json();
      
      for (const track of tracksData.tracks.slice(0, 3)) {
        // Simulate track analytics data
        const streams = Math.floor(Math.random() * 100000) + 10000;
        const likes = Math.floor(streams * 0.05);
        const comments = Math.floor(streams * 0.01);
        const shares = Math.floor(streams * 0.02);

        await supabaseClient
          .from('track_analytics')
          .upsert({
            artist_analytics_id: artistAnalytics.id,
            track_id: track.id,
            track_name: track.name,
            streams,
            likes,
            comments,
            shares,
            views: 0, // Spotify doesn't have views
            date_recorded: new Date().toISOString().split('T')[0],
          });
      }
    }

    // Simulate audience analytics
    const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];
    const countries = ['US', 'UK', 'CA', 'DE', 'AU'];
    
    for (const ageRange of ageRanges) {
      for (const country of countries) {
        await supabaseClient
          .from('audience_analytics')
          .upsert({
            artist_analytics_id: artistAnalytics.id,
            platform: 'spotify',
            age_range: ageRange,
            country,
            percentage: Math.random() * 20,
            listener_count: Math.floor(Math.random() * 5000) + 100,
            date_recorded: new Date().toISOString().split('T')[0],
          });
      }
    }

    analytics.push({
      artist: artist.name,
      followers: artist.followers.total,
      popularity: artist.popularity,
    });

    return new Response(JSON.stringify({ success: true, analytics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-spotify-analytics:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});