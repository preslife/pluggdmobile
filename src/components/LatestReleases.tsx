import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Heart, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShareToEarnModal } from "@/components/ShareToEarnModal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";

interface Release {
  id: string;
  title: string;
  artist: string;
  genre: string;
  cover_art_url: string;
  preview_url?: string;
  download_url?: string;
  release_type: string;
  total_plays: number;
  created_at: string;
  approved: boolean;
  status: string;
  user_id: string;
}

const LatestReleases = () => {
  const { user } = useAuth();
  const { 
    state: { currentTrack, isPlaying }, 
    actions: { play, pause, setQueue } 
  } = useGlobalPlayer();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedReleases, setLikedReleases] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchReleases();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('releases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'releases'
        },
        () => {
          fetchReleases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, artist, genre, cover_art_url, preview_url, download_url, release_type, total_plays, created_at, approved, status, user_id')
        .eq('approved', true)
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error('Error fetching releases:', error);
      toast({
        title: "Error loading releases",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRelease = async (release: Release) => {
    const audioSrc = release.download_url || release.preview_url;
    if (!audioSrc) return;
    
    // Set up the entire releases collection as the queue first
    const allTracks = releases.map(r => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      src: r.download_url || r.preview_url,
      artwork: r.cover_art_url,
      releaseId: r.id,
      userId: r.user_id,
      type: 'release' as const
    })).filter(t => t.src); // Only include releases with audio URLs
    
    // Find the index of the clicked release in the queue
    const clickedReleaseIndex = allTracks.findIndex(t => t.id === release.id);
    
    // Set queue with the correct starting index
    setQueue(allTracks, clickedReleaseIndex >= 0 ? clickedReleaseIndex : 0);
    
    // Start playing
    if (clickedReleaseIndex >= 0) {
      play(allTracks[clickedReleaseIndex]);
    }
    
    // Track play for analytics
    try {
      await supabase.from('release_plays').insert({
        release_id: release.id,
        device_type: 'web'
      });
    } catch (error) {
      console.error('Error tracking play:', error);
    }
  };

  const toggleLike = (id: string) => {
    const newLiked = new Set(likedReleases);
    if (newLiked.has(id)) {
      newLiked.delete(id);
      toast({
        title: "Removed from favorites",
        description: "Track removed from your favorites",
      });
    } else {
      newLiked.add(id);
      toast({
        title: "Added to favorites",
        description: "Track added to your favorites",
      });
    }
    setLikedReleases(newLiked);
  };

  const shareRelease = async (release: Release) => {
    try {
      await navigator.share({
        title: `${release.title} by ${release.artist}`,
        text: `Check out this ${release.genre} track on Pluggd!`,
        url: `${window.location.origin}/release/${release.id}`
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/release/${release.id}`);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="h-8 bg-muted animate-pulse rounded w-48"></div>
            <div className="h-10 bg-muted animate-pulse rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">Latest Releases</h2>
            <p className="text-muted-foreground">Fresh tracks from the community</p>
          </div>
          {user && (
            <ShareToEarnModal
              shareUrl={`${window.location.origin}?ref=releases`}
              shareTitle="Check out the latest releases on Pluggd!"
              shareDescription="Discover fresh music and earn credits by sharing"
            >
              <Button variant="outline">Share & Earn</Button>
            </ShareToEarnModal>
          )}
          <Link to="/releases">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {releases.map((release) => (
            <Card key={release.id} className="overflow-hidden group hover:shadow-glow transition-all duration-300">
              <div className="relative aspect-square">
                <img
                  src={release.cover_art_url || '/placeholder.svg'}
                  alt={release.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-white hover:bg-primary/20 w-16 h-16 rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentTrack?.id === release.id && isPlaying) {
                        pause();
                      } else {
                        handlePlayRelease(release);
                      }
                    }}
                  >
                    {currentTrack?.id === release.id && isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8" />
                    )}
                  </Button>
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary">{release.release_type}</Badge>
                </div>
                <div className="absolute top-3 left-3 flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`text-white hover:bg-white/20 w-8 h-8 rounded-full ${
                      likedReleases.has(release.id) ? 'text-red-500' : ''
                    }`}
                    onClick={() => toggleLike(release.id)}
                  >
                    <Heart className={`w-4 h-4 ${likedReleases.has(release.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 w-8 h-8 rounded-full"
                    onClick={() => shareRelease(release)}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Link to={`/release/${release.id}`}>
                    <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors">
                      {release.title}
                    </h3>
                  </Link>
                  <p className="text-muted-foreground truncate">{release.artist}</p>
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline">{release.genre}</Badge>
                    <span className="text-muted-foreground">{release.total_plays} plays</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {releases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No releases yet</p>
            <Link to="/releases/create">
              <Button>Upload Your First Track</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestReleases;