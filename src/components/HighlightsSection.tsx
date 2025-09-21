import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const HighlightsSection = () => {
  const highlights = [
    {
      title: "FYBY Collaboration Hub",
      description: "Find Your Beat Yourself - Instantly connect with the right collaborators using smart matching, messaging, and secure project sharing.",
      features: ["Real-time matching", "Project management", "Secure file sharing"],
      icon: "🤝",
      gradient: "bg-gradient-primary",
      cta: "Start Collaborating"
    },
    {
      title: "Exclusive Beat Store",
      description: "Premium beats, exclusive rights, and sync licensing opportunities",
      features: ["Exclusive rights", "Sync licensing", "High-quality stems"],
      icon: "🎵",
      gradient: "bg-gradient-accent",
      cta: "Browse Beats"
    },
    {
      title: "Professional Tools",
      description: "Create smarter with AI-powered lyric generators, instant contract templates, and auto-split sheet generation — everything you need to stay professional.",
      features: ["Barflow integration", "Smart contracts", "Split sheets"],
      icon: "🛠️",
      gradient: "bg-gradient-card",
      cta: "Access Tools"
    },
    {
      title: "Industry Education",
      description: "Master your craft with expert-led courses on production, sync licensing, and the music business. Unlock knowledge that powers careers.",
      features: ["Expert instructors", "Live sessions", "Certification"],
      icon: "🎓",
      gradient: "bg-gradient-hero",
      cta: "Start Learning"
    }
  ];

  return (
    <section id="highlights" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-accent/20 text-accent border-accent/30">
            🌟 Platform Highlights
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything You Need to Build Your{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Legacy
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From collaboration to monetization, we provide all the tools and connections 
            you need to build a successful music career.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {highlights.map((highlight, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-glow transition-all duration-500 hover:scale-[1.02] bg-gradient-card border-border/50"
            >
              <CardHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-full ${highlight.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                  {highlight.icon}
                </div>
              </div>
                <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                  {highlight.title}
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  {highlight.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3 mb-8">
                  {highlight.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Link to={
                  highlight.cta === "Start Collaborating" ? "/collaborate" :
                  highlight.cta === "Browse Beats" ? "/marketplace" :
                  highlight.cta === "Access Tools" ? "/tools" :
                  highlight.cta === "Start Learning" ? "/education" : "#"
                }>
                  <Button 
                    variant="glow" 
                    className="w-full group-hover:shadow-glow transition-all duration-300"
                  >
                    {highlight.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-card p-8 rounded-2xl border border-border/50 shadow-card">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Launch Your Music Career?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join the fastest-growing music collaboration platform. Free forever — upgrade only when you're ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/community">
                <Button variant="hero" size="lg">
                  Join Free
                </Button>
              </Link>
              <Link to="/tools">
                <Button variant="outline" size="lg">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HighlightsSection;