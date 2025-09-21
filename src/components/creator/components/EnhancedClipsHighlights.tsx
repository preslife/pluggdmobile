import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Film, Eye, Heart, Share2, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Clip {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
  duration: number;
  views: number;
  likes: number;
  created_at: string;
  is_featured: boolean;
}

interface ClipsHighlightsProps {
  creatorId: string;
}

/**
 * EnhancedClipsHighlights - Implements spec requirement for "Clips highlights"
 * Shows featured video clips, shorts, and highlights from the creator
 */
export const EnhancedClipsHighlights = ({ creatorId }: ClipsHighlightsProps) => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);

  useEffect(() => {
    fetchClips();
  }, [creatorId]);

  const fetchClips = async () => {
    try {
      setLoading(true);
      
      // In production, fetch from clips table
      // For now, use mock data
      const mockClips: Clip[] = [
        {
          id: '1',
          title: 'Studio Session Highlights',
          thumbnail_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400',
          video_url: '#',
          duration: 45,
          views: 1234,
          likes: 89,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          is_featured: true
        },
        {
          id: '2',
          title: 'Beat Making Process',
          thumbnail_url: 'https://images.unsplash.com/photo-1563330232-57114bb0823c?w=400',
          video_url: '#',
          duration: 120,
          views: 3456,
          likes: 234,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          is_featured: true
        },
        {
          id: '3',
          title: 'Live Performance Clip',
          thumbnail_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
          video_url: '#',
          duration: 90,
          views: 5678,
          likes: 456,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_featured: false
        }
      ];
      
      setClips(mockClips);
    } catch (error) {
      console.error('Error fetching clips:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Clips & Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-32 h-20 bg-secondary rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clips.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Clips & Highlights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No clips available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Clips & Highlights
          </CardTitle>
          {clips.length > 3 && (
            <Button variant="ghost" size="sm">
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {clips.map((clip) => (
          <div 
            key={clip.id} 
            className="flex gap-3 group cursor-pointer hover:bg-secondary/50 p-2 rounded-lg transition-colors"
            onClick={() => setSelectedClip(clip)}
          >
            {/* Thumbnail */}
            <div className="relative w-32 h-20 flex-shrink-0">
              <img 
                src={clip.thumbnail_url} 
                alt={clip.title}
                className="w-full h-full object-cover rounded-md"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                <Play className="w-8 h-8 text-white" />
              </div>
              <Badge className="absolute bottom-1 right-1 text-xs bg-black/70">
                {formatDuration(clip.duration)}
              </Badge>
              {clip.is_featured && (
                <Badge className="absolute top-1 left-1 text-xs" variant="default">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {clip.title}
              </h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatViews(clip.views)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {clip.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(clip.created_at)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Call to Action */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {clips.length} clips available
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button variant="default" size="sm">
                <Play className="w-4 h-4 mr-1" />
                Watch All
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedClipsHighlights;
