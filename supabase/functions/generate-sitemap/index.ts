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
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate XML sitemap
    const baseUrl = req.headers.get('origin') || 'https://pluggd.fm';
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/store</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/education</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/community</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add public creator profiles
    const { data: creators } = await supabaseService
      .from('profiles')
      .select('username, user_id, updated_at')
      .eq('is_creator', true)
      .not('username', 'is', null)
      .limit(1000);

    if (creators) {
      for (const creator of creators) {
        sitemap += `  <url>
    <loc>${baseUrl}/profile/${creator.username}</loc>
    <lastmod>${new Date(creator.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Add published releases
    const { data: releases } = await supabaseService
      .from('releases')
      .select('id, title, updated_at, smartlink_slug')
      .eq('status', 'published')
      .limit(1000);

    if (releases) {
      for (const release of releases) {
        sitemap += `  <url>
    <loc>${baseUrl}/release/${release.id}</loc>
    <lastmod>${new Date(release.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        
        // Add SmartLink if available
        if (release.smartlink_slug) {
          sitemap += `  <url>
    <loc>${baseUrl}/r/${release.smartlink_slug}</loc>
    <lastmod>${new Date(release.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }
    }

    // Add published beats
    const { data: beats } = await supabaseService
      .from('beats')
      .select('id, updated_at')
      .eq('is_published', true)
      .limit(1000);

    if (beats) {
      for (const beat of beats) {
        sitemap += `  <url>
    <loc>${baseUrl}/beat/${beat.id}</loc>
    <lastmod>${new Date(beat.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    sitemap += `</urlset>`;

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Sitemap generation failed' 
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
      status: 500,
    });
  }
});