import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { formatCurrency } from '@/lib/utils';

import {
  Play,
  Pause,
  Disc,
  Download,
  Eye,
  Heart,
  Plus,
  Music,
  TrendingUp,
  Star,
  Calendar,
  Filter
} from 'lucide-react';

interface Beat {
  id: string;
  title: string;
  description?: string;
  genre: string;
  bpm: number;
  key?: string;
  price: number;
  audio_url?: string;
  image_url?: string;
  tags: string[];
  plays_count: number;
  likes_count: number;
  is_featured: boolean;
  created_at: string;
  producer_name: string;
}

interface CreatorProfile {
  user_id: string;
  username: string;
}

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
}

interface BeatsTabProps {
  profile: CreatorProfile;
  stats: any;
  visitorStatus: VisitorStatus | null;
  count?: number;
}

export const BeatsTab = ({ profile, visitorStatus, count }: BeatsTabProps) => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'featured'>('newest');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const { 
    state: { currentTrack, isPlaying }, 
    actions: { play } 
  } = useGlobalPlayer();

  useEffect(() => {
    fetchBeats();
  }, [profile.user_id, sortBy, genreFilter]);

  const fetchBeats = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('beats')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('is_published', true);

      if (genreFilter) {
        query = query.eq('genre', genreFilter);
      }

      // Apply sorting
      switch (sortBy) {
        case 'featured':
          query = query.eq('is_featured', true).order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('plays_count', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(12);

      if (error) throw error;
      setBeats(data || []);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayToggle = (beat: Beat) => {
    if (!beat.audio_url) return;

    const track = {
      id: beat.id,
      title: beat.title,
      artist: beat.producer_name || 'Producer',
      src: beat.audio_url,
      artwork: beat.image_url
    };

    if (currentTrack?.id === beat.id && isPlaying) {
      play(track, false); // Pause
    } else {
      play(track);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (beats.length === 0) {
    return (
      <div className="text-center py-12">
        <Disc className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No Beats Yet</h3>
        <p className="text-muted-foreground mb-4">
          {visitorStatus?.isOwner 
            ? "Upload your first beat to get started"
            : "This creator hasn't uploaded any beats yet"
          }
        </p>
        {visitorStatus?.isOwner && (
          <Button asChild>
            <Link to="/beats/new">
              <Plus className="w-4 h-4 mr-2" />
              Upload Beat
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const uniqueGenres = [...new Set(beats.map(beat => beat.genre))];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Beats Collection</h2>
          <p className="text-muted-foreground">{count} published beats</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Genre Filter */}
          {uniqueGenres.length > 1 && (
            <div className="flex gap-1">
              <Button
                variant={genreFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenreFilter(null)}
              >
                All
              </Button>
              {uniqueGenres.slice(0, 4).map((genre) => (
                <Button
                  key={genre}
                  variant={genreFilter === genre ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGenreFilter(genre)}
                >
                  {genre}
                </Button>
              ))}
            </div>
          )}

          {/* Sort Options */}
          <div className="flex gap-1">
            {['newest', 'popular', 'featured'].map((sort) => (
              <Button
                key={sort}
                variant={sortBy === sort ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(sort as any)}
                className="capitalize"
              >
                {sort === 'newest' && <Calendar className="w-4 h-4 mr-2" />}
                {sort === 'popular' && <TrendingUp className="w-4 h-4 mr-2" />}
                {sort === 'featured' && <Star className="w-4 h-4 mr-2" />}
                {sort}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Beats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {beats.map((beat) => {
          const isCurrentTrack = currentTrack?.id === beat.id;
          const isTrackPlaying = isCurrentTrack && isPlaying;

          return (
            <Card key={beat.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Beat Artwork */}
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    {beat.image_url ? (
                      <img
                        src={beat.image_url}
                        alt={beat.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Disc className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      {beat.audio_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePlayToggle(beat)}
                          className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/20"
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        asChild
                        className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/20"
                      >
                        <Link to={`/beat/${beat.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/20"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {beat.is_featured && (
                      <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {beat.price === 0 && (
                      <Badge variant="secondary" className="bg-green-500 text-white text-xs">
                        Free
                      </Badge>
                    )}
                  </div>

                  {/* BPM Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-black/50 text-white border-white/30 text-xs">
                      {beat.bpm} BPM
                    </Badge>
                  </div>
                </div>

                {/* Beat Info */}
                <div className="p-4">
                  <div className="space-y-2">
                    <div>
                      <Link to={`/beat/${beat.id}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                          {beat.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">by {beat.producer_name}</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>{beat.genre}</span>
                        {beat.key && <span>Key: {beat.key}</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{beat.plays_count?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{beat.likes_count?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                      <span>{new Date(beat.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Tags */}
                    {beat.tags && beat.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {beat.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {beat.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{beat.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {beat.price === 0 ? 'Free' : formatCurrency(beat.price)}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/beat/${beat.id}`}>
                            View
                          </Link>
                        </Button>
                        {beat.price > 0 && (
                          <Button size="sm">
                            License
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      {beats.length >= 12 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Beats
          </Button>
        </div>
      )}
    </div>
  );
};

export default BeatsTab;