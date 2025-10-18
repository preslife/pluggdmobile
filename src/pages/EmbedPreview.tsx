import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Play, Pause, ExternalLink } from "lucide-react";
import { usePageMetadata } from "@/hooks/usePageMetadata";

interface EmbedContent {
  id: string;
  title: string;
  artist?: string;
  producer_name?: string;
  image_url?: string;
  cover_art_url?: string;
  audio_url?: string;
  preview_url?: string;
  price?: number;
  genre?: string;
  bpm?: number;
  type: 'beat' | 'release';
}

export default function EmbedPreview() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [content, setContent] = useState<EmbedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const metaTitle = content
    ? `${content.title}${content.artist ? ` — ${content.artist}` : ''} | Pluggd`
    : 'Embedded Preview — Pluggd';
  const metaDescription = content
    ? `Preview ${content.type === 'beat' ? 'beat' : 'release'} "${content.title}" directly from Pluggd.`
    : 'Preview releases and beats using the Pluggd embeddable player.';

  usePageMetadata({
    title: metaTitle,
    description: metaDescription,
    path: type && id ? `/embed/${type}/${id}` : '/embed',
    image: content?.image_url || content?.cover_art_url || undefined,
  });
  
  // Parse settings from URL
  const urlParams = new URLSearchParams(window.location.search);
  const theme = urlParams.get('theme') === 'light' ? 'light' : 'dark';
  const accent = urlParams.get('accent') || '#6366f1';
  const size = urlParams.get('size') || 'card';

  useEffect(() => {
    fetchContent();
  }, [type, id]);

  const fetchContent = async () => {
    if (!type || !id) return;

    try {
      if (type === 'beat') {
        const response = await supabase
          .from('beats')
          .select('id, title, producer_name, image_url, audio_url, price, genre, bpm')
          .eq('id', id)
          .eq('is_published', true)
          .maybeSingle();

        if (response.error) throw response.error;
        if (response.data) {
          setContent({
            id: response.data.id,
            title: response.data.title,
            producer_name: response.data.producer_name,
            image_url: response.data.image_url,
            audio_url: response.data.audio_url,
            price: response.data.price,
            genre: response.data.genre,
            bpm: response.data.bpm,
            type: 'beat'
          });
        }
      } else if (type === 'release') {
        // Create mock data since releases table doesn't exist yet
        setContent({
          id: id,
          title: 'Sample Release',
          artist: 'Sample Artist',
          cover_art_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
          preview_url: null,
          price: 9.99,
          genre: 'Hip Hop',
          type: 'release'
        });
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!content) return;

    const audioUrl = content.audio_url || content.preview_url;
    if (!audioUrl) return;

    if (audio && !audio.paused) {
      audio.pause();
      setPlaying(false);
    } else {
      if (audio) {
        audio.play();
        setPlaying(true);
      } else {
        const newAudio = new Audio(audioUrl);
        newAudio.addEventListener('ended', () => setPlaying(false));
        newAudio.addEventListener('error', () => setPlaying(false));
        newAudio.play().then(() => {
          setPlaying(true);
          setAudio(newAudio);
        }).catch(() => setPlaying(false));
      }
    }

    // Log analytics
    supabase.functions.invoke('analytics-processor', {
      body: [{
        event_name: 'embed_play',
        properties: { content_type: type, content_id: id },
        user_id: null,
        session_id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }]
    }).catch(console.error);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'compact': return 'w-80 h-20';
      case 'full': return 'w-full h-48';
      default: return 'w-96 h-32';
    }
  };

  const getThemeClasses = () => {
    return theme === 'dark'
      ? 'bg-gray-900 text-white border-gray-700'
      : 'bg-white text-gray-900 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Content not found</p>
      </div>
    );
  }

  const imageUrl = content.image_url || content.cover_art_url;
  const artistName = content.artist || content.producer_name;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div 
        className={`${getSizeClasses()} ${getThemeClasses()} rounded-lg border p-4 flex items-center gap-4 shadow-lg`}
        style={{ borderColor: accent }}
      >
        {/* Artwork */}
        {imageUrl && (
          <div className="flex-shrink-0">
            <img 
              src={imageUrl} 
              alt={content.title}
              className={`rounded object-cover ${
                size === 'compact' ? 'w-12 h-12' : 
                size === 'card' ? 'w-16 h-16' : 'w-24 h-24'
              }`}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold truncate ${
            size === 'compact' ? 'text-sm' : 'text-base'
          }`}>
            {content.title}
          </h3>
          <p className={`text-opacity-80 truncate ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          } ${size === 'compact' ? 'text-xs' : 'text-sm'}`}>
            {artistName}
          </p>
          
          {size !== 'compact' && (
            <div className="flex items-center gap-2 mt-1">
              {content.genre && (
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: accent, color: 'white' }}>
                  {content.genre}
                </span>
              )}
              {content.bpm && (
                <span className="text-xs text-opacity-60">
                  {content.bpm} BPM
                </span>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <Button
            size={size === 'compact' ? 'sm' : 'default'}
            variant="ghost"
            onClick={togglePlay}
            className="p-2"
            style={{ color: accent }}
          >
            {playing ? (
              <Pause className={size === 'compact' ? 'w-4 h-4' : 'w-5 h-5'} />
            ) : (
              <Play className={size === 'compact' ? 'w-4 h-4' : 'w-5 h-5'} />
            )}
          </Button>
          
          {size !== 'compact' && (
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="p-2"
              style={{ color: accent }}
            >
              <a 
                href={`${window.location.origin}/${content.type === 'beat' ? 'beat' : 'release'}/${content.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}