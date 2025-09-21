import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Heart, Share2, ShoppingCart } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
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
  profiles: {
    username: string;
    full_name: string;
  } | null;
};

const Favorites = () => {
  const { user } = useAuth();
  const { favorites, toggleFavorite, isFavorited, loading: favoritesLoading } = useFavorites();
  const { state, actions } = useGlobalPlayer();
  const { currentTrack, isPlaying } = state;
  const [favoriteBeats, setFavoriteBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && favorites.length > 0) {
      fetchFavoriteBeats();
    } else {
      setLoading(false);
    }
  }, [user, favorites]);

  const fetchFavoriteBeats = async () => {
    if (!user || favorites.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Fetch beats that are in the user's favorites
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('*')
        .in('id', favorites)
        .eq('is_published', true);

      if (beatsError) throw beatsError;

      // Get unique user IDs from beats
      const userIds = [...new Set(beatsData?.map(beat => beat.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine beats with profile data
      const beatsWithProfiles = beatsData?.map(beat => ({
        ...beat,
        profiles: profilesData?.find(profile => profile.user_id === beat.user_id) || null
      })) || [];

      setFavoriteBeats(beatsWithProfiles);
    } catch (error) {
      console.error('Error fetching favorite beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayBeat = (beat: Beat) => {
    if (!beat.audio_url) return;
    
    const track = {
      id: beat.id,
      title: beat.title,
      artist: (beat as any).uploaded_by_admin ? ((beat as any).producer_name || 'Internal Producer') : (beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist'),
      src: beat.audio_url,
      artwork: beat.image_url
    };

    actions.play(track);
    
    // Set up the entire favorites collection as the queue
    const allTracks = favoriteBeats.map(b => ({
      id: b.id,
      title: b.title,
      artist: (b as any).uploaded_by_admin ? ((b as any).producer_name || 'Internal Producer') : (b.profiles?.full_name || b.profiles?.username || 'Unknown Artist'),
      src: b.audio_url,
      artwork: b.image_url
    })).filter(t => t.src);
    
    actions.setQueue(allTracks);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="pt-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center py-12">
            <h1 className="text-4xl font-bold mb-4">Favorites</h1>
            <p className="text-muted-foreground mb-8">
              Sign in to view your favorite beats
            </p>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || favoritesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="pt-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
                My Favorites
              </h1>
              <p className="text-muted-foreground text-lg">
                Loading your favorite beats...
              </p>
            </div>
            <LoadingSkeleton count={6} variant="card" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="pt-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              My Favorites
            </h1>
            <p className="text-muted-foreground text-lg">
              {favoriteBeats.length} saved beats
            </p>
          </div>

          {favoriteBeats.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start exploring the marketplace and save beats you love!
                </p>
                <Link to="/marketplace">
                  <Button>Browse Beats</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoriteBeats.map((beat) => (
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
                        <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>
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
                        className="w-14 h-14 rounded-full shadow-lg hover:scale-110 transition-transform"
                      >
                        {currentTrack?.id === beat.id && isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <Link to={`/beat/${beat.id}`} className="hover:text-primary transition-colors">
                        <h3 className="font-bold text-lg line-clamp-1">{beat.title}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {beat.profiles?.full_name || beat.profiles?.username || 'Unknown Artist'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{beat.bpm ? `${beat.bpm} BPM` : 'BPM N/A'}</span>
                        <span>•</span>
                        <span>{beat.key || 'Key N/A'}</span>
                      </div>
                      <div className="text-lg font-bold text-primary">
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
                        <Button size="sm" variant="default" className="text-xs">
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Buy
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;