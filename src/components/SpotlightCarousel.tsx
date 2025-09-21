import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Star, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTrendingContent } from "@/hooks/useTrendingContent";
import { useGlobalPlayer } from "@/components/GlobalPlayer/GlobalPlayer";
import {
  EnhancedCarousel,
  EnhancedCarouselContent,
  EnhancedCarouselItem,
  EnhancedCarouselNext,
  EnhancedCarouselPrevious,
  EnhancedCarouselDots,
} from "@/components/ui/enhanced-carousel";
import { AnimatedSection } from "@/components/ScrollAnimationProvider";

interface Release {
  id: string;
  title: string;
  artist: string;
  genre: string;
  cover_art_url: string;
  preview_url: string;
  release_type: string;
  total_plays: number;
  spotlight: boolean;
  user_id: string;
}

const SpotlightCarousel = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { items: trendingItems } = useTrendingContent('release', 5);
  const { 
    state: { currentTrack, isPlaying }, 
    actions: { play, pause, setQueue } 
  } = useGlobalPlayer();

  useEffect(() => {
    fetchSpotlightReleases();
  }, []);

  const fetchSpotlightReleases = async () => {
    try {
      // Get trending release IDs
      const trendingReleaseIds = trendingItems
        .filter(item => item.content_type === 'release')
        .map(item => item.content_id);

      let query = supabase
        .from('releases')
        .select('*')
        .eq('approved', true)
        .eq('status', 'live');

      // If we have trending data, prioritize those, otherwise use spotlight
      if (trendingReleaseIds.length > 0) {
        query = query.in('id', trendingReleaseIds);
      } else {
        query = query.eq('spotlight', true);
      }

      const { data, error } = await query
        .order('total_plays', { ascending: false })
        .limit(8);

      if (error) throw error;
      setReleases(data || []);
    } catch (error) {
      console.error('Error fetching spotlight releases:', error);
      toast({
        title: "Error loading spotlight releases",
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

  const shareRelease = async (release: Release) => {
    try {
      await navigator.share({
        title: `${release.title} by ${release.artist}`,
        text: `Check out this spotlight track on Pluggd!`,
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
    <AnimatedSection direction="up" className="py-16 ambient-glow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <Star className="w-8 h-8 text-gold fill-current" />
              Spotlight
            </h2>
            <p className="text-muted-foreground">Editor's picks and trending hits</p>
          </div>
          <Link to="/releases?filter=spotlight">
            <Button variant="outline">View All Spotlight</Button>
          </Link>
        </div>

        <EnhancedCarousel 
          className="w-full" 
          autoplay={true} 
          autoplayDelay={5000}
          pauseOnHover={true}
          dragFree={true}
        >
          <EnhancedCarouselContent className="-ml-2 md:-ml-4">
            {releases.map((release) => (
              <EnhancedCarouselItem key={release.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <Card className="overflow-hidden group card-ambient hover:shadow-premium transition-all duration-300 border-gold/20 hover-glow-gold">
                  <div className="relative aspect-square">
                    <img
                      src={release.cover_art_url || '/placeholder.svg'}
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100"></div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button
                        size="lg"
                        variant="ghost"
                        className="text-white hover:bg-gold/20 w-16 h-16 rounded-full border border-gold/30 hover-glow-gold transition-glow"
                        onClick={() => {
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
                      <Badge className="bg-gold text-gold-foreground border-gold/30">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        SPOTLIGHT
                      </Badge>
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
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <Link to={`/release/${release.id}`}>
                        <h3 className="font-bold text-xl text-white mb-1 hover:text-gold transition-colors">
                          {release.title}
                        </h3>
                      </Link>
                      <p className="text-white/80 text-lg">{release.artist}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="border-white/30 text-white">
                          {release.genre}
                        </Badge>
                        <span className="text-white/60 text-sm">{release.total_plays} plays</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </EnhancedCarouselItem>
            ))}
          </EnhancedCarouselContent>
          <EnhancedCarouselPrevious />
          <EnhancedCarouselNext />
          <EnhancedCarouselDots slideCount={releases.length} />
        </EnhancedCarousel>
      </div>
    </AnimatedSection>
  );
};

export default SpotlightCarousel;