import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getAcademyBasePath } from '@/lib/academyRoutes';

const FeaturesPreview = () => {
  const academyPath = getAcademyBasePath();
  const features = [
    {
      category: "Collaboration",
      title: "FYBY Hub",
      description: "Advanced matching algorithm connects you with the perfect collaborators",
      status: "Live",
      preview: "💫 Smart Matching • 🎯 Project Management • 💬 Real-time Chat",
      link: "/collaborate",
      accessible: true
    },
    {
      category: "Marketplace",
      title: "Beat Store",
      description: "Discover the hottest instrumentals or sell your own. Standard, premium, and custom licenses available — and sync-ready for pro users.",
      status: "Live",
      preview: "🎵 Hot Instrumentals • 📜 Multiple Licenses • 🎬 Sync-Ready",
      link: "/marketplace",
      accessible: true
    },
    {
      category: "Tools",
      title: "Professional Tools",
      description: "Create smarter with AI-powered lyric generators, instant contract templates, and auto-split sheet generation — everything you need to stay professional.",
      status: "Live",
      preview: "🤖 AI Generators • 📜 Instant Contracts • 📊 Auto Split Sheets",
      link: "/tools",
      accessible: true
    },
    {
      category: "Education",
      title: "Industry Education",
      description: "Master your craft with expert-led courses on production, sync licensing, and the music business. Unlock knowledge that powers careers.",
      status: "Live",
      preview: "👨‍🏫 Expert-Led • 🏆 Career-Focused • 📚 Industry Secrets",
      link: academyPath,
      accessible: true
    },
    {
      category: "Business",
      title: "Premium Analytics",
      description: "Track your growth with powerful analytics, deep market insights, and real-time revenue breakdowns.",
      status: "Premium",
      preview: "📊 Growth Tracking • 🎯 Market Insights • 💰 Revenue Analytics",
      link: "/tools",
      accessible: false
    },
    {
      category: "Network",
      title: "Pro Directory",
      description: "Access a verified directory of managers, publishers, label reps, A&Rs, and sync agents — with built-in messaging and availability calendars.",
      status: "Live",
      preview: "✅ Verified Pros • 💬 Built-in Messaging • 📅 Availability",
      link: "/directory",
      accessible: true
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live":
        return "bg-primary/20 text-primary border-primary/30";
      case "Beta":
        return "bg-accent/20 text-accent border-accent/30";
      case "Premium":
        return "bg-gold/20 text-gold border-gold/30";
      case "Coming Soon":
        return "bg-muted/20 text-muted-foreground border-muted/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  return (
    <section id="features" className="relative py-24 bg-muted/30 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: 'url(/lovable-uploads/7a7e071e-72b3-4824-aead-f1d0760f6374.png)' }}
      ></div>
      
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-background/50"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            🚀 Feature Preview
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Powerful Features{" "}
            <span className="bg-gradient-accent bg-clip-text text-transparent">
              Built for Artists
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover the comprehensive suite of tools and services designed to accelerate 
            your music career and streamline your creative process.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-glow transition-all duration-500 hover:scale-[1.02] bg-background/80 backdrop-blur-sm border-border/50"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-medium">
                    {feature.category}
                  </Badge>
                  <Badge className={`text-xs ${getStatusColor(feature.status)}`}>
                    {feature.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.preview}
                  </p>
                </div>
                
                {feature.accessible ? (
                  <Link to={feature.link}>
                    <Button 
                      variant={feature.status === "Live" ? "default" : feature.status === "Premium" ? "premium" : "glow"} 
                      className="w-full transition-all duration-300"
                    >
                      {feature.status === "Live" ? "Access Now" : 
                       feature.status === "Premium" ? "View Premium" : "Try Now"}
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="outline"
                    className="w-full transition-all duration-300"
                    disabled
                  >
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Development Roadmap Teaser */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-card p-8 rounded-2xl border border-border/50 shadow-card">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              🛣️ Development Roadmap
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              We're constantly evolving our platform based on community feedback. 
              Join our beta program to get early access to new features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/beta-program">
                <Button variant="premium" size="lg">
                  Join Beta Program
                </Button>
              </Link>
              <Link to="/roadmap">
                <Button variant="outline" size="lg">
                  View Full Roadmap
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesPreview;
