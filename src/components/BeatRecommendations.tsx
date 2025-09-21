import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Heart, ShoppingCart, Sparkles, Share2 } from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { useFavorites } from '@/hooks/useFavorites';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import ShareModal from '@/components/ShareModal';
import { formatCurrency } from '@/lib/utils';

type Beat = {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  tags: string[];
  audio_url: string;
  image_url: string;
  created_at: string;
  uploaded_by_admin: boolean;
  producer_name: string;
  profiles: {
    username: string;
    full_name: string;
  } | null;
};

interface BeatRecommendationsProps {
  currentBeat: Beat;
  title?: string;
  limit?: number;
}

const BeatRecommendations = ({ 
  currentBeat, 
  title = "You Might Also Like", 
  limit = 6 
}: BeatRecommendationsProps) => {
  const { recommendations, loading } = useRecommendations(currentBeat, limit);
  const { 
    state: { currentTrack, isPlaying }, 
    actions: { play } 
  } = useGlobalPlayer();
  const { toggleFavorite, isFavorited } = useFavorites();

  const handlePlayBeat = (beat: Beat) => {
    if (!beat.audio_url) return;
    
    const track = {
      id: beat.id,
      title: beat.title,
      artist: beat.uploaded_by_admin ? (beat.producer_name || 'Internal Producer') : (beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist'),
      src: beat.audio_url,
      artwork: beat.image_url
    };

    play(track);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LoadingSkeleton count={limit} variant="card" />
        </div>
      </div>
    );
  }

  if (!recommendations.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((beat) => (
          <Card key={beat.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="relative">
              {/* Beat Artwork */}
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
                {beat.image_url ? (
                  <img 
                    src={beat.image_url} 
                    alt={beat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
                )}
              </div>
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePlayBeat(beat);
                  }}
                  className="w-12 h-12 rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  {currentTrack?.id === beat.id && isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-1" />
                  )}
                </Button>
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              <div>
                <Link to={`/beat/${beat.id}`} className="hover:text-primary transition-colors">
                  <h4 className="font-semibold text-base line-clamp-1">{beat.title}</h4>
                </Link>
                 <p className="text-sm text-muted-foreground">
                   {beat.uploaded_by_admin ? (beat.producer_name || 'Internal Producer') : (beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist')}
                 </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{beat.bpm ? `${beat.bpm} BPM` : 'BPM N/A'}</span>
                  <span>•</span>
                  <span>{beat.key || 'Key N/A'}</span>
                </div>
                <div className="text-base font-bold text-primary">
                  {formatCurrency(beat.price)}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{beat.genre}</Badge>
                {beat.tags && beat.tags.slice(0, 1).map((tag, tagIndex) => (
                  <Badge key={tagIndex} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(beat.id);
                    }}
                  >
                    <Heart className={`w-4 h-4 ${isFavorited(beat.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <ShareModal beat={beat}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </ShareModal>
                </div>
                <Link to={`/beat/${beat.id}`}>
                  <Button size="sm" variant="outline" className="text-xs">
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Buy
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BeatRecommendations;