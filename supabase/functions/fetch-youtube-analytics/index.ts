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

    const { channelId } = await req.json();
    if (!channelId) {
      throw new Error('YouTube Channel ID is required');
    }

    // Get channel's videos
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&maxResults=10&order=relevance&key=${Deno.env.get('YOUTUBE_API_KEY')}`
    );

    if (!searchResponse.ok) {
      throw new Error('Failed to fetch YouTube data');
    }

    const searchData = await searchResponse.json();
    const analytics = [];

    // Get channel information
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${Deno.env.get('YOUTUBE_API_KEY')}`
    );

    if (!channelResponse.ok) {
      throw new Error('Failed to fetch channel data from YouTube');
    }

    const channelData = await channelResponse.json();
    const channel = channelData.items[0];

    // Create or update artist analytics for YouTube
    const { data: artistAnalytics, error: artistError } = await supabaseClient
      .from('artist_analytics')
      .upsert({
        user_id: user.id,
        platform: 'youtube',
        artist_id: channelId,
        artist_name: channel.snippet.title,
      })
      .select()
      .single();

    if (artistError) {
      console.error('Error creating artist analytics:', artistError);
      throw new Error('Failed to create artist analytics');
    }

    for (const video of searchData.items) {
      // Get video statistics
      const statsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${video.id.videoId}&key=${Deno.env.get('YOUTUBE_API_KEY')}`
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        const stats = statsData.items[0]?.statistics;

        if (stats) {
          // Store track analytics
          await supabaseClient
            .from('track_analytics')
            .upsert({
              artist_analytics_id: artistAnalytics.id,
              track_id: video.id.videoId,
              track_name: video.snippet.title,
              streams: 0, // YouTube doesn't have streams
              likes: parseInt(stats.likeCount || '0'),
              comments: parseInt(stats.commentCount || '0'),
              shares: 0, // Not available in basic API
              views: parseInt(stats.viewCount || '0'),
              date_recorded: new Date().toISOString().split('T')[0],
            });

          analytics.push({
            title: video.snippet.title,
            channel: channel.snippet.title,
            views: parseInt(stats.viewCount || '0'),
            likes: parseInt(stats.likeCount || '0'),
            comments: parseInt(stats.commentCount || '0'),
          });
        }
      }
    }

    // Simulate audience analytics for YouTube
    const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];
    const countries = ['US', 'UK', 'CA', 'DE', 'AU'];
    
    for (const ageRange of ageRanges) {
      for (const country of countries) {
        await supabaseClient
          .from('audience_analytics')
          .upsert({
            artist_analytics_id: artistAnalytics.id,
            platform: 'youtube',
            age_range: ageRange,
            country,
            percentage: Math.random() * 25,
            listener_count: Math.floor(Math.random() * 8000) + 200,
            date_recorded: new Date().toISOString().split('T')[0],
          });
      }
    }

    return new Response(JSON.stringify({ success: true, analytics }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-youtube-analytics:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});