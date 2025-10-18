import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mic, 
  Music, 
  PenTool, 
  Zap, 
  Brain, 
  FileText, 
  BarChart3, 
  Headphones,
  Crown,
  Lock,
  Check,
  Star,
  FileMusic,
  Users,
  Music2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import Barflow from "@/components/Barflow";
import { MobileBeatMaker } from "@/components/MobileBeatMaker";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageMetadata } from "@/hooks/usePageMetadata";

import { Link, useNavigate } from "react-router-dom";

const Tools = () => {
  const { user } = useAuth();
  const { subscription, usage, checkToolUsage, getTierLimits, incrementUsage, isAdmin } = useSubscription();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  usePageMetadata({
    title: "Creator Tools — Pluggd",
    description: "Access AI music apps, analytics, monetization, and collaboration tools available within Pluggd.",
    path: "/tools",
  });

  const toolCategories = [
    { id: "all", name: "All Tools", icon: Zap },
    { id: "creative", name: "Creative", icon: PenTool },
    { id: "business", name: "Business", icon: FileText },
    { id: "analytics", name: "Analytics", icon: BarChart3 },
    { id: "audio", name: "Audio", icon: Headphones }
  ];

  const tools = [
    {
      id: 1,
      name: "Barflow AI Suite",
      description: "Advanced AI-powered music composition and arrangement",
      category: "creative",
      isPremium: false,
      tier: "free",
      status: "live",
      icon: FileMusic,
      features: ["AI Composition", "Arrangement Tools", "Real-time Generation"],
      component: "barflow"
    },
    {
      id: "xbeatstudio",
      name: "XBEATSTUDIO",
      description: "Professional MPC-style drum machine with step sequencer, MIDI, neural AI, and advanced audio features",
      category: "audio",
      icon: Music,
      isPremium: false,
      tier: "free",
      status: "live",
      features: ["16-step sequencer", "Sample editing & waveform display", "Pattern management", "Neural drum generation", "MIDI support", "Audio effects", "Real-time mixing", "Audio export"],
      component: "route",
      route: "/xbeatstudio"
    },
    {
      id: "airtrax-studio",
      name: "AirTrax Studio",
      description: "Gesture controlled music production - Transform hand gestures into music",
      categories: ["audio", "creative"],
      icon: Music2,
      isPremium: false,
      tier: "free",
      status: "live",
      features: ["Gesture-to-Music Creation", "Dual-Mode Performance", "Professional DAW Interface", "Custom Instrument Support", "Real-Time Visualization", "Advanced Audio Processing", "Project Management"],
      component: "route",
      route: "/airtrax-studio"
    },
    {
      id: 4,
      name: "Analytics Dashboard",
      description: "Track music performance with detailed insights",
      category: "analytics",
      isPremium: false,
      tier: "free",
      status: "live",
      icon: BarChart3,
      features: ["Platform Analytics", "Revenue Tracking", "Audience Insights"]
    }
  ];

  const filteredTools = activeCategory === "all" 
    ? tools 
    : tools.filter(tool => {
        if (tool.categories) {
          return tool.categories.includes(activeCategory);
        }
        return tool.category === activeCategory;
      });

  const handleToolAccess = async (tool: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use tools",
        variant: "destructive",
      });
      return;
    }

    const currentTier = subscription?.tier || 'free';
    const limits = getTierLimits();

    // Check tier access (skip for admins)
    if (!isAdmin) {
      if (tool.tier === 'creator' && currentTier === 'free') {
        toast({
          title: "Creator Plan Required",
          description: `${tool.name} requires Creator or Pro subscription`,
          variant: "destructive",
        });
        return;
      }

      if (tool.tier === 'pro' && currentTier !== 'pro') {
        toast({
          title: "Pro Plan Required", 
          description: `${tool.name} is only available for Pro subscribers`,
          variant: "destructive",
        });
        return;
      }
    }

    // Check daily usage limits
    if (!checkToolUsage()) {
      toast({
        title: "Daily Limit Reached",
        description: `You've reached your daily limit of ${limits.maxToolUsagePerDay} tool uses. Upgrade for unlimited access.`,
        variant: "destructive",
      });
      return;
    }

    // Increment usage and launch tool
    await incrementUsage('tool_usage_today');
    
    if (tool.component === "barflow" || tool.id === 1) {
      setActiveCategory("barflow");
    } else if (tool.component === "route" && tool.route) {
      navigate(tool.route);
    } else if (tool.id === 4) {
      navigate("/analytics");
    } else {
      toast({
        title: "Tool Launched",
        description: `Opening ${tool.name}...`,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Live</Badge>;
      case "beta":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Beta</Badge>;
      case "coming-soon":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Coming Soon</Badge>;
      default:
        return null;
    }
  };

  // Show Barflow when selected
  if (activeCategory === "barflow") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setActiveCategory("all")}
              className="mb-4"
            >
              ← Back to Tools
            </Button>
          </div>
          {isMobile ? <MobileBeatMaker /> : <Barflow />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Professional</span>
            {" "}
            <span className="text-foreground">Tools</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Powerful tools to enhance your music creation process. From free essentials to premium advanced features.
          </p>
        </div>

        {/* Tool Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {toolCategories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              onClick={() => setActiveCategory(category.id)}
              className="flex items-center gap-2"
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </Button>
          ))}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {filteredTools.map((tool) => (
            <Card key={tool.id} className="group hover:shadow-glow transition-all duration-300 relative">
              {tool.isPremium && (
                <div className="absolute top-3 right-3">
                  <Crown className="w-5 h-5 text-gold" />
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-full flex items-center justify-center">
                  <tool.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CardTitle className="text-lg">{tool.name}</CardTitle>
                  {getStatusBadge(tool.status)}
                </div>
                <CardDescription className="text-sm">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {tool.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-3 h-3 text-green-500" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tool.tier === 'pro' && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Crown className="w-3 h-3 mr-1" />
                        Pro Only
                      </Badge>
                    )}
                    {tool.tier === 'creator' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Creator+
                      </Badge>
                    )}
                  </div>
                  {tool.isPremium && (
                    <Badge variant="outline" className="text-xs">
                      Premium
                    </Badge>
                  )}
                </div>

                <Button 
                  onClick={() => handleToolAccess(tool)}
                  className="w-full"
                  variant={tool.isPremium ? "premium" : "hero"}
                  disabled={tool.status === "coming-soon"}
                >
                  {tool.isPremium ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Upgrade to Access
                    </>
                  ) : (
                    "Use Tool"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upgrade Section */}
        <div className="mt-16">
          <Card className="bg-gradient-accent border-accent/30">
            <CardContent className="text-center py-12">
              <Crown className="w-12 h-12 mx-auto mb-4 text-accent-foreground" />
              <h3 className="text-2xl font-bold mb-4 text-accent-foreground">
                Unlock Premium Tools
              </h3>
              <p className="text-accent-foreground/80 mb-6 max-w-2xl mx-auto">
                Get access to advanced AI-powered tools, professional features, and priority support with our premium plans.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg">
                  View Pricing Plans
                </Button>
                <Button variant="outline" size="lg" className="border-accent-foreground/20 text-accent-foreground hover:bg-accent-foreground/10">
                  Start Free Trial
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tools;
