import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Heart, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTrendingContent } from "@/hooks/useTrendingContent";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Release {
  id: string;
  title: string;
  artist: string;
  genre: string;
  cover_art_url: string;
  preview_url: string;
  release_type: string;
  total_plays: number;
  created_at: string;
  user_id: string;
}

const NewThisWeekCarousel = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { items: trendingItems } = useTrendingContent('release', 8);
  const { 
    state: { currentTrack, isPlaying }, 
    actions: { play, pause, setQueue } 
  } = useGlobalPlayer();

  useEffect(() => {
    fetchNewReleases();
  }, []);

  const fetchNewReleases = async () => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get trending release IDs from this week
      const trendingReleaseIds = trendingItems
        .filter(item => item.content_type === 'release')
        .map(item => item.content_id);

      const query = supabase
        .from('releases')
        .select('*')
        .eq('approved', true)
        .eq('status', 'live')
        .gte('created_at', oneWeekAgo.toISOString());

      // If we have trending data from this week, use it for sorting
      if (trendingReleaseIds.length > 0) {
        const { data, error } = await query.order('created_at', { ascending: false }).limit(20);
        if (error) throw error;
        
        // Sort by trending score first, then by recency
        const sortedData = (data || []).sort((a, b) => {
          const aIndex = trendingReleaseIds.indexOf(a.id);
          const bIndex = trendingReleaseIds.indexOf(b.id);
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setReleases(sortedData.slice(0, 10));
      } else {
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        setReleases(data || []);
      }
    } catch (error) {
      console.error('Error fetching new releases:', error);
      toast({
        title: "Error loading new releases",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRelease = async (release: Release) => {
    const audioSrc = release.preview_url;
    if (!audioSrc) return;
    
    // Set up the entire releases collection as the queue first
    const allTracks = releases.map(r => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      src: r.preview_url,
      artwork: r.cover_art_url,
      releaseId: r.id,
      userId: r.user_id,
      type: 'release' as const
    })).filter(t => t.src); // Only include releases with audio URLs
    
    // Find the index of the clicked release in the queue
    const clickedReleaseIndex = allTracks.findIndex(t => t.id === release.id);
    
    // Set queue with the correct starting index
    actions.setQueue(allTracks, clickedReleaseIndex >= 0 ? clickedReleaseIndex : 0);
    
    // Start playing
    if (clickedReleaseIndex >= 0) {
      actions.play(allTracks[clickedReleaseIndex]);
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

  const shareRelease = async (release: Release) => {
    try {
      await navigator.share({
        title: `${release.title} by ${release.artist}`,
        text: `Check out this new ${release.genre} track on Pluggd!`,
        url: `${window.location.origin}/release/${release.id}`
      });
    } catch (error) {
      navigator.clipboard.writeText(`${window.location.origin}/release/${release.id}`);
      toast({
        title: "Link copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  if (loading || releases.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">New This Week</h2>
            <p className="text-muted-foreground">Fresh drops from the last 7 days</p>
          </div>
          <Link to="/releases?filter=new">
            <Button variant="outline">View All New</Button>
          </Link>
        </div>

        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {releases.map((release) => (
              <CarouselItem key={release.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-glow transition-all duration-300">
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
                        onClick={() => {
                          if (state.currentTrack?.id === release.id && state.isPlaying) {
                            actions.pause();
                          } else {
                            handlePlayRelease(release);
                          }
                        }}
                      >
                        {state.currentTrack?.id === release.id && state.isPlaying ? (
                          <Pause className="w-8 h-8" />
                        ) : (
                          <Play className="w-8 h-8" />
                        )}
                      </Button>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-green-500 text-white">NEW</Badge>
                    </div>
                    <div className="absolute top-3 left-3">
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
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};

export default NewThisWeekCarousel;