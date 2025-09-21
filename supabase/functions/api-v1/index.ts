import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper function to hash token for verification
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to authenticate API request
async function authenticateRequest(authHeader: string | null) {
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const tokenHash = await hashToken(token);

  // Find token in database
  const { data: tokenData, error } = await supabase
    .from('api_tokens')
    .select('*, profiles!inner(user_id)')
    .eq('token_hash', tokenHash)
    .eq('revoked', false)
    .single();

  if (error || !tokenData) {
    throw new Error('Invalid or revoked token');
  }

  // Check rate limit
  const { data: recentRequests } = await supabase
    .from('analytics_events')
    .select('id')
    .eq('user_id', tokenData.profiles.user_id)
    .eq('event_name', 'api_request')
    .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute

  const requestCount = recentRequests?.length || 0;
  if (requestCount >= tokenData.rate_limit_per_min) {
    throw new Error('Rate limit exceeded');
  }

  return tokenData;
}

// Helper function to log API request
async function logApiRequest(tokenData: any, endpoint: string, method: string, success: boolean) {
  try {
    // Log to analytics
    await supabase
      .from('analytics_events')
      .insert({
        user_id: tokenData.profiles.user_id,
        event_name: 'api_request',
        properties: {
          token_id: tokenData.id,
          endpoint,
          method,
          success,
          timestamp: new Date().toISOString()
        }
      });

    // Update token last used
    await supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id);
  } catch (error) {
    console.error('Error logging API request:', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const endpoint = url.pathname;
  let tokenData = null;

  try {
    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    tokenData = await authenticateRequest(authHeader);

    let responseData = null;
    let success = true;

    // Handle different API endpoints
    if (endpoint === '/releases' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('releases')
        .select(`
          id,
          title,
          artist,
          genre,
          cover_art_url,
          release_date,
          price,
          download_price,
          created_at
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      responseData = { releases: data };

    } else if (endpoint === '/beats' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('beats')
        .select(`
          id,
          title,
          producer_name,
          genre,
          bpm,
          key,
          price,
          image_url,
          created_at
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      responseData = { beats: data };

    } else if (endpoint.startsWith('/release/') && req.method === 'GET') {
      const releaseId = endpoint.split('/')[2];
      const { data, error } = await supabase
        .from('releases')
        .select(`
          id,
          title,
          artist,
          description,
          genre,
          cover_art_url,
          preview_url,
          release_date,
          price,
          download_price,
          stream_count,
          download_count,
          created_at
        `)
        .eq('id', releaseId)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      responseData = { release: data };

    } else if (endpoint.startsWith('/beat/') && req.method === 'GET') {
      const beatId = endpoint.split('/')[2];
      const { data, error } = await supabase
        .from('beats')
        .select(`
          id,
          title,
          producer_name,
          description,
          genre,
          bpm,
          key,
          price,
          image_url,
          audio_url,
          stream_count,
          download_count,
          created_at
        `)
        .eq('id', beatId)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      responseData = { beat: data };

    } else {
      success = false;
      throw new Error(`Endpoint not found: ${endpoint}`);
    }

    // Log successful request
    await logApiRequest(tokenData, endpoint, req.method, success);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('API Error:', error);

    // Log failed request if we have token data
    if (tokenData) {
      await logApiRequest(tokenData, endpoint, req.method, false);
    }

    const status = error.message.includes('Rate limit') ? 429 :
                   error.message.includes('Invalid') ? 401 :
                   error.message.includes('not found') ? 404 : 500;

    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);