import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareToEarnModal } from "@/components/ShareToEarnModal";
import pluggdLogo from "@/assets/pluggdt.png";
interface FeaturedArtist {
  id: string;
  name: string;
  image_url: string;
  spotify_url?: string;
}
interface Challenge {
  id: string;
  title: string;
  status: string;
  prize_description?: string;
}
const EnhancedHeroSection = () => {
  const {
    user
  } = useAuth();
  const [featuredArtists, setFeaturedArtists] = useState<FeaturedArtist[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchDynamicContent = async () => {
      try {
        // Fetch featured artists
        const {
          data: artists
        } = await supabase.from('artists').select('id, name, image_url, spotify_url').eq('is_featured', true).limit(3);

        // Fetch active challenge
        const {
          data: challenges
        } = await supabase.from('monthly_challenges').select('id, title, status, prize_description').eq('status', 'active').limit(1);
        setFeaturedArtists(artists || []);
        setActiveChallenge(challenges?.[0] || null);
      } catch (error) {
        console.error('Error fetching dynamic content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDynamicContent();
  }, []);
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
      backgroundImage: 'url(/uploads/2c459a02-2523-4950-b2d0-83b46ff62f1e.png)'
    }}></div>
      
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-background/80"></div>
      
      {/* Additional Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary))_0%,_transparent_50%)] opacity-20"></div>
      
      {/* Floating Music Notes Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 text-primary opacity-30 animate-bounce">♪</div>
        <div className="absolute top-40 right-20 w-6 h-6 text-accent opacity-40 animate-pulse">♫</div>
        <div className="absolute bottom-32 left-20 w-5 h-5 text-primary-glow opacity-30 animate-bounce delay-300">♪</div>
        <div className="absolute bottom-20 right-32 w-4 h-4 text-accent opacity-35 animate-pulse delay-500">♫</div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          {/* Dynamic Badge */}
          <div className="flex justify-center">
            {loading ? <Skeleton className="h-8 w-64" /> : activeChallenge ? <Badge className="bg-gradient-accent text-accent-foreground px-4 py-2 text-sm font-medium border-accent/30">
                🏆 {activeChallenge.title} - {activeChallenge.prize_description}
              </Badge> : <Badge className="bg-gradient-accent text-accent-foreground px-4 py-2 text-sm font-medium border-accent/30">
                🎵 The Future of Music Collaboration
              </Badge>}
          </div>

          {/* Logo and Main Heading */}
          <div className="space-y-6">
            <div className="flex justify-center mb-8">
              <img src={pluggdLogo} alt="Pluggd Logo" className="h-64 md:h-80 lg:h-72 w-auto" />
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              
              <span className="text-foreground text-5xl"> Get Plugged In</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The creator hub for music: marketplace, community, tools, and live sessions.
            </p>
          </div>

          {/* Featured Artists */}
          {!loading && featuredArtists.length > 0 && <div className="flex justify-center space-x-4 mb-8">
              <span className="text-sm text-muted-foreground mr-2">Featured artists:</span>
              {featuredArtists.map(artist => <div key={artist.id} className="flex items-center space-x-2">
                  <img src={artist.image_url} alt={artist.name} className="w-8 h-8 rounded-full border-2 border-primary/50" />
                  <span className="text-sm font-medium text-foreground">{artist.name}</span>
                </div>)}
            </div>}

          {/* CTA Buttons - Context-aware and simplified */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
            {!user ? (
              <>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button variant="hero" size="lg" className="text-lg px-8 py-6 shadow-glow w-full">
                    Get Started
                  </Button>
                </Link>
                <Link to="/marketplace" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full">
                    Explore Beats
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/marketplace" className="w-full sm:w-auto">
                  <Button variant="premium" size="lg" className="text-lg px-8 py-6 shadow-premium w-full">
                    Explore Premium Beats
                  </Button>
                </Link>
                <Link to="/live" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full">
                    Join Live Session
                  </Button>
                </Link>
                <ShareToEarnModal
                  shareUrl={`${window.location.origin}?ref=hero`}
                  shareTitle="Check out Pluggd!"
                  shareDescription="The creator hub for music: marketplace, community, tools, and live sessions."
                >
                  <Button variant="outline" size="lg" className="text-lg px-6 py-6 w-full sm:w-auto">
                    Share & Earn
                  </Button>
                </ShareToEarnModal>
              </>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">10K+</div>
              <div className="text-sm text-muted-foreground">Creators</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">50K+</div>
              <div className="text-sm text-muted-foreground">Beats</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gold">100K+</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
          </div>

        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>;
};
export default EnhancedHeroSection;