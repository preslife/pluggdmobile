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
  Music,
  Eye,
  Heart,
  Download,
  ExternalLink,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  Plus
} from 'lucide-react';

interface Release {
  id: string;
  title: string;
  artist: string;
  description?: string;
  cover_art_url?: string;
  preview_url?: string;
  price: number;
  total_plays: number;
  total_likes: number;
  genre?: string;
  duration?: number;
  created_at: string;
  status: string;
  is_featured: boolean;
  tags?: string[];
  streaming_links?: {
    spotify?: string;
    apple_music?: string;
    soundcloud?: string;
    youtube?: string;
  };
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

interface MusicTabProps {
  profile: CreatorProfile;
  stats: any;
  visitorStatus: VisitorStatus | null;
  count?: number;
}

export const MusicTab = ({ profile, visitorStatus, count }: MusicTabProps) => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'featured'>('newest');
  const { 
    state: { currentTrack, isPlaying }, 
    actions: { play } 
  } = useGlobalPlayer();

  useEffect(() => {
    fetchReleases();
  }, [profile.user_id, sortBy]);

  const fetchReleases = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('releases')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('status', 'live')
        .eq('approved', true);

      // Apply sorting
      switch (sortBy) {
        case 'featured':
          query = query.eq('is_featured', true).order('created_at', { ascending: false });
          break;
        case 'popular':
          query = query.order('total_plays', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(12);

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error('Error fetching releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayToggle = (release: Release) => {
    if (!release.preview_url) return;

    const track = {
      id: release.id,
      title: release.title,
      artist: release.artist,
      src: release.preview_url,
      artwork: release.cover_art_url
    };

    if (currentTrack?.id === release.id && isPlaying) {
      play(track, false); // Pause
    } else {
      play(track);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  if (releases.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">No Music Yet</h3>
        <p className="text-muted-foreground mb-4">
          {visitorStatus?.isOwner 
            ? "Upload your first release to get started"
            : "This creator hasn't released any music yet"
          }
        </p>
        {visitorStatus?.isOwner && (
          <Button asChild>
            <Link to="/releases/new">
              <Plus className="w-4 h-4 mr-2" />
              Upload Music
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sorting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Music Releases</h2>
          <p className="text-muted-foreground">{count} published releases</p>
        </div>
        
        <div className="flex gap-2">
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

      {/* Releases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {releases.map((release) => {
          const isCurrentTrack = currentTrack?.id === release.id;
          const isTrackPlaying = isCurrentTrack && isPlaying;

          return (
            <Card key={release.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Cover Art */}
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    {release.cover_art_url ? (
                      <img
                        src={release.cover_art_url}
                        alt={release.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Music className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      {release.preview_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePlayToggle(release)}
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
                        <Link to={`/release/${release.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {release.is_featured && (
                      <Badge variant="secondary" className="bg-yellow-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {release.price === 0 && (
                      <Badge variant="secondary" className="bg-green-500 text-white">
                        Free
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Release Info */}
                <div className="p-4">
                  <div className="space-y-2">
                    <div>
                      <Link to={`/release/${release.id}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                          {release.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">by {release.artist}</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {release.genre && <span>{release.genre}</span>}
                        {release.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(release.duration)}
                          </span>
                        )}
                      </div>
                      <span>{new Date(release.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{release.total_plays.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{release.total_likes.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {release.tags && release.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {release.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Price & Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        {release.price > 0 && (
                          <span className="font-semibold">
                            {formatCurrency(release.price)}
                          </span>
                        )}
                        
                        {/* Streaming Links */}
                        {release.streaming_links && (
                          <div className="flex gap-1">
                            {Object.entries(release.streaming_links).map(([platform, url]) => (
                              url && (
                                <Button
                                  key={platform}
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-6 w-6 p-0"
                                >
                                  <a href={url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </Button>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/release/${release.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      {releases.length >= 12 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Releases
          </Button>
        </div>
      )}
    </div>
  );
};

export default MusicTab;