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

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
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
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

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
    const { data: artistAnalytics, error: artistError } = await supabaseService
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
          const views = parseInt(stats.viewCount || '0');
          const likes = parseInt(stats.likeCount || '0');
          const comments = parseInt(stats.commentCount || '0');

          totalViews += views;
          totalLikes += likes;
          totalComments += comments;

          await supabaseService
            .from('track_analytics')
            .upsert({
              artist_analytics_id: artistAnalytics.id,
              track_id: video.id.videoId,
              track_name: video.snippet.title,
              streams: 0, // YouTube doesn't have streams
              likes,
              comments,
              shares: 0, // Not available in basic API
              views,
              date_recorded: new Date().toISOString().split('T')[0],
            });

          analytics.push({
            title: video.snippet.title,
            channel: channel.snippet.title,
            views,
            likes,
            comments,
          });
        }
      }
    }

    // Simulate audience analytics for YouTube
    const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55+'];
    const countries = ['US', 'UK', 'CA', 'DE', 'AU'];
    
    for (const ageRange of ageRanges) {
      for (const country of countries) {
        await supabaseService
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

    const metricDate = new Date().toISOString().split('T')[0];
    const kpiRows = [
      { key: 'total_views', value: totalViews },
      { key: 'total_likes', value: totalLikes },
      { key: 'total_comments', value: totalComments },
      { key: 'total_subscribers', value: Number(channel.statistics?.subscriberCount ?? 0) },
    ].filter(entry => Number.isFinite(entry.value));

    if (kpiRows.length > 0) {
      const periodStart = `${metricDate}T00:00:00Z`;
      const periodEnd = `${metricDate}T23:59:59.999Z`;

      const { error: deleteError } = await supabaseService
        .from('creator_kpi_events')
        .delete()
        .eq('creator_id', user.id)
        .eq('source', 'fetch-youtube-analytics')
        .gte('occurred_at', periodStart)
        .lte('occurred_at', periodEnd);

      if (deleteError) {
        console.error('Failed to prune existing YouTube KPI events', deleteError);
      }

      const { error: insertError } = await supabaseService
        .from('creator_kpi_events')
        .insert(
          kpiRows.map(entry => ({
            creator_id: user.id,
            event_name: 'youtube_sync',
            source: 'fetch-youtube-analytics',
            occurred_at: `${metricDate}T23:59:59Z`,
            metric_date: metricDate,
            kpi_key: entry.key,
            kpi_value: entry.value,
            metadata: {
              channel_id: channelId,
              metric_date: metricDate,
            },
          }))
        );

      if (insertError) {
        console.error('Failed to store YouTube KPI events', insertError);
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