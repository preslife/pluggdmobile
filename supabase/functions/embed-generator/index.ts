import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface EmbedRequest {
  contentId: string;
  contentType: 'release' | 'beat' | 'playlist';
  settings: {
    size: 'compact' | 'card' | 'large';
    theme: 'light' | 'dark';
    accent: string;
    autoplay: boolean;
    showArtwork?: boolean;
    showDescription?: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const { contentId, contentType, settings }: EmbedRequest = await req.json();

      // Validate content exists and is accessible
      let content = null;
      if (contentType === 'release') {
        const { data } = await supabase
          .from('releases')
          .select('id, title, artist, cover_art_url, audio_url')
          .eq('id', contentId)
          .single();
        content = data;
      } else if (contentType === 'beat') {
        const { data } = await supabase
          .from('beats')
          .select('id, title, artist, artwork_url, audio_url')
          .eq('id', contentId)
          .single();
        content = data;
      }

      if (!content) {
        throw new Error('Content not found');
      }

      // Generate embed HTML
      const embedHtml = generateEmbedHtml(content, contentType, settings);
      
      // Generate embed URL for iframe
      const embedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/embed-player?id=${contentId}&type=${contentType}&settings=${encodeURIComponent(JSON.stringify(settings))}`;

      // Log embed generation
      console.log('Embed generated:', { contentId, contentType, settings });

      return new Response(JSON.stringify({
        success: true,
        embedHtml,
        embedUrl,
        content
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Serve the actual embed player
      const url = new URL(req.url);
      const contentId = url.searchParams.get('id');
      const contentType = url.searchParams.get('type');
      const settingsParam = url.searchParams.get('settings');
      
      if (!contentId || !contentType) {
        throw new Error('Missing required parameters');
      }

      const settings = settingsParam ? JSON.parse(decodeURIComponent(settingsParam)) : {};
      
      // Get content data
      let content = null;
      if (contentType === 'release') {
        const { data } = await supabase
          .from('releases')
          .select('*')
          .eq('id', contentId)
          .single();
        content = data;
      }

      if (!content) {
        throw new Error('Content not found');
      }

      const playerHtml = generatePlayerHtml(content, contentType, settings);

      return new Response(playerHtml, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html',
          'X-Frame-Options': 'ALLOWALL'
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in embed-generator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function generateEmbedHtml(content: any, contentType: string, settings: any): string {
  const baseUrl = Deno.env.get('SUPABASE_URL');
  const embedUrl = `${baseUrl}/functions/v1/embed-player?id=${content.id}&type=${contentType}&settings=${encodeURIComponent(JSON.stringify(settings))}`;
  
  const dimensions = getDimensions(settings.size);
  
  return `<iframe 
    src="${embedUrl}" 
    width="${dimensions.width}" 
    height="${dimensions.height}"
    frameborder="0" 
    allow="autoplay; encrypted-media"
    style="border-radius: 8px;">
  </iframe>`;
}

function generatePlayerHtml(content: any, contentType: string, settings: any): string {
  const theme = settings.theme || 'dark';
  const accent = settings.accent || '#6366f1';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${content.title} - Pluggd Player</title>
  <style>
    body {
      margin: 0;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
    }
    .player {
      display: flex;
      align-items: center;
      gap: 12px;
      background: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
      border-radius: 8px;
      padding: 12px;
    }
    .artwork {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      object-fit: cover;
    }
    .info {
      flex: 1;
    }
    .title {
      font-weight: bold;
      margin: 0 0 4px 0;
      font-size: 14px;
    }
    .artist {
      color: ${theme === 'dark' ? '#888' : '#666'};
      margin: 0;
      font-size: 12px;
    }
    .play-btn {
      background: ${accent};
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .play-btn:hover {
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="player">
    ${settings.showArtwork !== false ? `<img src="${content.cover_art_url || content.artwork_url || ''}" alt="Artwork" class="artwork" />` : ''}
    <div class="info">
      <h3 class="title">${content.title || 'Untitled'}</h3>
      <p class="artist">${content.artist || 'Unknown Artist'}</p>
    </div>
    <button class="play-btn" onclick="togglePlay()">
      <span id="play-icon">▶</span>
    </button>
  </div>
  
  <audio id="audio" ${settings.autoplay ? 'autoplay' : ''}>
    <source src="${content.audio_url}" type="audio/mpeg">
  </audio>

  <script>
    const audio = document.getElementById('audio');
    const playIcon = document.getElementById('play-icon');
    
    function togglePlay() {
      if (audio.paused) {
        audio.play();
        playIcon.textContent = '⏸';
      } else {
        audio.pause();
        playIcon.textContent = '▶';
      }
    }
    
    audio.addEventListener('ended', () => {
      playIcon.textContent = '▶';
    });
    
    // Track play events
    audio.addEventListener('play', () => {
      fetch('${Deno.env.get('SUPABASE_URL')}/functions/v1/analytics-processor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          eventName: 'embed_player_play',
          properties: { contentId: '${content.id}', contentType: '${contentType}' }
        }])
      });
    });
  </script>
</body>
</html>`;
}

function getDimensions(size: string) {
  switch (size) {
    case 'compact':
      return { width: 300, height: 100 };
    case 'large':
      return { width: 500, height: 200 };
    default: // card
      return { width: 400, height: 150 };
  }
}

serve(handler);