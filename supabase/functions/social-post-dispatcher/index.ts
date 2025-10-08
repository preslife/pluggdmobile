import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logSystemEvent(
  supabase: any,
  entry: { level: number; message: string; action: string; user_id?: string; metadata?: Record<string, unknown> }
) {
  try {
    await supabase.from('system_logs').insert({
      level: entry.level,
      message: entry.message,
      action: entry.action,
      user_id: entry.user_id ?? null,
      component: 'social_post_dispatcher',
      metadata: entry.metadata || {}
    });
  } catch (error) {
    console.error('Failed to write system log entry', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get posts that are due to be sent
    const { data: pendingPosts, error: postsError } = await supabase
      .from('social_posts')
      .select('*')
      .eq('status', 'queued')
      .not('scheduled_at', 'is', null)
      .lt('scheduled_at', new Date().toISOString());

    if (postsError) {
      console.error('Error fetching pending posts:', postsError);
      throw postsError;
    }

    console.log(`Processing ${pendingPosts?.length || 0} scheduled posts`);
    await logSystemEvent(supabase, {
      level: 1,
      message: 'Dispatch run started',
      action: 'dispatch_run_started',
      metadata: { pendingPosts: pendingPosts?.length || 0 }
    });

    let processed = 0;
    let failed = 0;

    for (const post of pendingPosts || []) {
      try {
        await logSystemEvent(supabase, {
          level: 1,
          message: 'Post dispatch started',
          action: 'post_dispatch_started',
          user_id: post.user_id,
          metadata: { post_id: post.id, destinations: post.destinations }
        });

        const messageIds = await processPost(supabase, post);
        await logSystemEvent(supabase, {
          level: 1,
          message: 'Post dispatch completed',
          action: 'post_dispatch_completed',
          user_id: post.user_id,
          metadata: { post_id: post.id, destinations: Object.keys(messageIds), messageIds }
        });
        processed++;
      } catch (error) {
        console.error(`Failed to process post ${post.id}:`, error);

        // Mark as failed
        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            provider_message_ids: { error: error.message }
          })
          .eq('id', post.id);

        await logSystemEvent(supabase, {
          level: 3,
          message: 'Post dispatch failed',
          action: 'post_dispatch_failed',
          user_id: post.user_id,
          metadata: { post_id: post.id, error: String(error) }
        });
        failed++;
      }
    }

    await logSystemEvent(supabase, {
      level: 1,
      message: 'Dispatch run completed',
      action: 'dispatch_run_completed',
      metadata: { processed, failed }
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in social-post-dispatcher:', error);
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await logSystemEvent(supabase, {
        level: 3,
        message: 'Dispatcher run failed',
        action: 'dispatch_run_failed',
        metadata: { error: String(error) }
      });
    } catch (logError) {
      console.error('Failed to log dispatcher failure', logError);
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function processPost(supabase: any, post: any): Promise<Record<string, string>> {
  const messageIds: Record<string, string> = {};

  // Get user's social connections
  const { data: connections } = await supabase
    .from('social_connections')
    .select('provider, connection_data')
    .eq('user_id', post.user_id)
    .in('provider', post.destinations);
  
  const connectionMap = new Map(connections?.map(c => [c.provider, c.connection_data]) || []);
  
  for (const destination of post.destinations) {
    try {
      let messageId: string | null = null;
      const connectionData = connectionMap.get(destination);

      if (!connectionData) {
        messageIds[destination] = `error: No connection found for ${destination}`;
        await logSystemEvent(supabase, {
          level: 3,
          message: 'Destination dispatch failed: missing connection',
          action: 'destination_missing_connection',
          user_id: post.user_id,
          metadata: { post_id: post.id, destination }
        });
        continue;
      }

      switch (destination) {
        case 'twitter':
          messageId = await postToTwitter(post, connectionData);
          break;
        case 'instagram':
          messageId = await postToInstagram(post, connectionData);
          break;
        case 'discord':
          messageId = await postToDiscord(post, connectionData);
          break;
        case 'tiktok':
          messageId = await postToTikTok(post, connectionData);
          break;
        default:
          console.warn(`Unknown destination: ${destination}`);
          continue;
      }

      if (messageId) {
        messageIds[destination] = messageId;
        await logSystemEvent(supabase, {
          level: 1,
          message: 'Destination dispatched successfully',
          action: 'destination_dispatched',
          user_id: post.user_id,
          metadata: { post_id: post.id, destination, messageId }
        });
      }
    } catch (error) {
      console.error(`Failed to post to ${destination}:`, error);
      messageIds[destination] = `error: ${error.message}`;
      await logSystemEvent(supabase, {
        level: 3,
        message: 'Destination dispatch failed',
        action: 'destination_dispatch_failed',
        user_id: post.user_id,
        metadata: { post_id: post.id, destination, error: String(error) }
      });
    }
  }

  // Update post with results
  await supabase
    .from('social_posts')
    .update({
      status: Object.values(messageIds).some(id => id.startsWith('error:')) ? 'partial' : 'posted',
      provider_message_ids: messageIds
    })
    .eq('id', post.id);

  console.log(`Posted to ${Object.keys(messageIds).length} destinations for post ${post.id}`);
  return messageIds;
}

// Social media posting implementations

async function postToTwitter(post: any, connectionData: any): Promise<string> {
  const { access_token, access_token_secret } = connectionData;
  
  if (!access_token || !access_token_secret) {
    throw new Error('Twitter access tokens not found');
  }

  // For now, return a mock ID - real implementation would use Twitter API v2
  // Would need to implement OAuth 1.0a signing for Twitter API
  console.log(`Would post to Twitter: ${post.body}`);
  return `twitter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function postToInstagram(post: any, connectionData: any): Promise<string> {
  const { access_token, ig_business_account_id } = connectionData;
  
  if (!access_token || !ig_business_account_id) {
    throw new Error('Instagram access token or business account ID not found');
  }

  // Create media container
  const mediaUrl = `https://graph.facebook.com/v18.0/${ig_business_account_id}/media`;
  const mediaPayload = {
    caption: post.body,
    access_token
  };

  // Add media if present
  if (post.media_paths && post.media_paths.length > 0) {
    const mediaUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/release-artwork/${post.media_paths[0]}`;
    
    // Determine media type
    const isVideo = post.media_paths[0].includes('.mp4') || post.media_paths[0].includes('.mov');
    if (isVideo) {
      mediaPayload.media_type = 'VIDEO';
      mediaPayload.video_url = mediaUrl;
    } else {
      mediaPayload.image_url = mediaUrl;
    }
  }

  const mediaResponse = await fetch(mediaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(mediaPayload).toString()
  });

  const mediaResult = await mediaResponse.json();
  
  if (!mediaResponse.ok) {
    throw new Error(`Instagram media creation failed: ${mediaResult.error?.message}`);
  }

  // Publish the media
  const publishUrl = `https://graph.facebook.com/v18.0/${ig_business_account_id}/media_publish`;
  const publishPayload = {
    creation_id: mediaResult.id,
    access_token
  };

  const publishResponse = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(publishPayload).toString()
  });

  const publishResult = await publishResponse.json();
  
  if (!publishResponse.ok) {
    throw new Error(`Instagram publish failed: ${publishResult.error?.message}`);
  }

  return publishResult.id;
}

async function postToDiscord(post: any, connectionData: any): Promise<string> {
  const { webhook_url, channel_id, bot_token } = connectionData;
  
  if (webhook_url) {
    // Use webhook
    const payload = {
      content: post.body,
      username: 'Pluggd'
    };

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    return `discord_webhook_${Date.now()}`;
  } else if (bot_token && channel_id) {
    // Use bot token
    const payload = {
      content: post.body
    };

    const response = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${bot_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord bot post failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  } else {
    throw new Error('Discord webhook URL or bot token not found');
  }
}

async function postToTikTok(post: any, connectionData: any): Promise<string> {
  // TikTok posting requires special approval for the Content Posting API
  // For now, we'll mark as "export" for manual posting
  console.log(`TikTok export prepared for: ${post.body}`);
  return `tiktok_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}