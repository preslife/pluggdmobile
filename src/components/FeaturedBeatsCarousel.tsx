import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Share2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ShareToEarnModal } from "@/components/ShareToEarnModal";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

interface Beat {
  id: string;
  title: string;
  producer_name: string;
  genre: string;
  bpm: number;
  image_url: string;
  audio_url: string;
  license_prices: any;
}

export const FeaturedBeatsCarousel = () => {
  const { user } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedBeats();
  }, []);

  const fetchFeaturedBeats = async () => {
    try {
      const { data, error } = await supabase
        .from('beats')
        .select('*')
        .eq('is_featured', true)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setBeats(data || []);
    } catch (error) {
      console.error('Error fetching featured beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = async (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      // Could add beat play tracking here if needed
    }
  };

  const shareBeat = async (beat: Beat) => {
    const url = `${window.location.origin}/beat/${beat.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: beat.title,
          text: `Check out this featured beat by ${beat.producer_name}`,
          url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const getLowestPrice = (licensePrices: any) => {
    if (!licensePrices || typeof licensePrices !== 'object') return 25;
    const prices = Object.values(licensePrices).filter(price => typeof price === 'number' && price > 0);
    return prices.length > 0 ? Math.min(...(prices as number[])) : 25;
  };

  if (loading || beats.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Featured Beats</h2>
          <p className="text-muted-foreground">Premium beats handpicked by our team</p>
        </div>
        <div className="flex gap-2">
          {user && (
            <ShareToEarnModal
              shareUrl={`${window.location.origin}?ref=beats`}
              shareTitle="Check out these featured beats on Pluggd!"
              shareDescription="Discover premium beats and earn credits by sharing"
            >
              <Button variant="outline" size="sm">Share & Earn</Button>
            </ShareToEarnModal>
          )}
          <Button variant="outline" asChild>
            <Link to="/beats">View All Beats</Link>
          </Button>
        </div>
      </div>

      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {beats.map((beat) => (
            <CarouselItem key={beat.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="aspect-square overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
                      {beat.image_url ? (
                        <img
                          src={beat.image_url}
                          alt={beat.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <div className="text-center text-muted-foreground">
                            <div className="text-4xl mb-2">🎵</div>
                            <p className="text-sm">{beat.title}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => togglePlay(beat.id)}
                        className="bg-white/10 backdrop-blur-sm hover:bg-white/20"
                      >
                        {playingId === beat.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => shareBeat(beat)}
                        className="bg-white/10 backdrop-blur-sm hover:bg-white/20"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <Link to={`/beat/${beat.id}`} className="block">
                      <h3 className="font-semibold mb-1 hover:text-primary transition-colors">
                        {beat.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        by {beat.producer_name}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{beat.genre}</span>
                        <span>{beat.bpm} BPM</span>
                      </div>
                      <div className="mt-2 text-sm font-medium">
                        From ${getLowestPrice(beat.license_prices)}
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
};

export default FeaturedBeatsCarousel;
