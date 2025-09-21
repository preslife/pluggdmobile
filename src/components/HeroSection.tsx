import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const HeroSection = () => {
  const { user } = useAuth();
  
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/lovable-uploads/2c459a02-2523-4950-b2d0-83b46ff62f1e.png)' }}
      ></div>
      
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
          {/* Badge */}
          <div className="flex justify-center">
            <Badge className="bg-gradient-accent text-accent-foreground px-4 py-2 text-sm font-medium border-accent/30">
              🎵 The Future of Music Collaboration
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Pluggd</span>
              <span className="text-foreground"> — Get Plugged In</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The creator hub for music: marketplace, community, tools, and live sessions.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!user && (
              <Link to="/auth">
                <Button variant="hero" size="lg" className="text-lg px-8 py-6">
                  Get Plugged In
                </Button>
              </Link>
            )}
            <Link to="/live">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Join the Session
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="premium" size="lg" className="text-lg px-8 py-6">
                Explore Premium Beats
              </Button>
            </Link>
          </div>

        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;