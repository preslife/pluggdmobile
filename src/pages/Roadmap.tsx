import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { usePageMetadata } from "@/hooks/usePageMetadata";

const Roadmap = () => {
  usePageMetadata({
    title: "Product Roadmap — Pluggd",
    description: "Explore the Pluggd feature roadmap and see what's shipping next for creators and fans.",
    path: "/roadmap",
  });

  const roadmapItems = [
    {
      quarter: "Q1 2025",
      status: "Completed",
      items: [
        {
          title: "Core Platform Launch",
          description: "Basic collaboration platform with project management and user matching",
          priority: "High",
          icon: "🚀"
        },
        {
          title: "Beat Marketplace",
          description: "Buy and sell beats with transparent licensing system",
          priority: "High",
          icon: "🎵"
        },
        {
          title: "Professional Directory",
          description: "Connect with industry professionals and verified artists",
          priority: "Medium",
          icon: "🌐"
        }
      ]
    },
    {
      quarter: "Q2 2025",
      status: "Completed",
      items: [
        {
          title: "AI Music Tools",
          description: "Basic AI-powered tools for lyrics generation and music creation",
          priority: "High",
          icon: "🤖"
        },
        {
          title: "Education Platform",
          description: "Course system with certified instructors and learning paths",
          priority: "Medium",
          icon: "📚"
        },
        {
          title: "Analytics Dashboard",
          description: "Basic analytics and insights for artist performance tracking",
          priority: "Medium",
          icon: "📊"
        }
      ]
    },
    {
      quarter: "Q3 2025",
      status: "In Progress",
      items: [
        {
          title: "AI Music Generator",
          description: "Generate backing tracks, chord progressions, and melodies using AI",
          priority: "High",
          icon: "🤖"
        },
        {
          title: "Virtual Studio Rooms",
          description: "3D virtual spaces for immersive collaborative music sessions",
          priority: "Low",
          icon: "🌐"
        },
        {
          title: "Blockchain Rights Management",
          description: "Decentralized music rights and ownership tracking",
          priority: "Medium",
          icon: "⛓️"
        }
      ]
    },
    {
      quarter: "Q4 2025",
      status: "Future",
      items: [
        {
          title: "AI Mastering Suite",
          description: "Professional-grade AI mastering with genre-specific presets",
          priority: "High",
          icon: "🎚️"
        },
        {
          title: "Live Performance Tools",
          description: "Real-time effects and collaborative live streaming capabilities",
          priority: "Medium",
          icon: "🎭"
        },
        {
          title: "Music NFT Marketplace",
          description: "Create, buy, and sell music NFTs with integrated royalty systems",
          priority: "Low",
          icon: "💎"
        }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "In Progress":
        return "bg-primary/20 text-primary border-primary/30";
      case "Planned":
        return "bg-accent/20 text-accent border-accent/30";
      case "Future":
        return "bg-muted/20 text-muted-foreground border-muted/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "Low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            🛣️ Development Roadmap
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Platform Roadmap</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See what's coming next and help shape the future of music collaboration. 
            Your feedback drives our development priorities.
          </p>
        </div>

        {/* Roadmap Timeline */}
        <div className="space-y-12">
          {roadmapItems.map((quarter, quarterIndex) => (
            <div key={quarterIndex} className="relative">
              {/* Timeline Line */}
              {quarterIndex < roadmapItems.length - 1 && (
                <div className="absolute left-8 top-20 w-0.5 h-full bg-border/50 -z-10"></div>
              )}
              
              {/* Quarter Header */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {quarterIndex + 1}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{quarter.quarter}</h2>
                  <Badge className={`${getStatusColor(quarter.status)} text-xs`}>
                    {quarter.status}
                  </Badge>
                </div>
              </div>

              {/* Quarter Items */}
              <div className="ml-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quarter.items.map((item, itemIndex) => (
                  <Card 
                    key={itemIndex}
                    className="hover:shadow-glow transition-all duration-300 hover:scale-[1.02] bg-gradient-card border-border/50"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{item.icon}</span>
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                        </div>
                        <Badge className={`${getPriorityColor(item.priority)} text-xs`}>
                          {item.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {item.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Community Feedback Section */}
        <div className="mt-16">
          <Card className="bg-gradient-accent/10 border-accent/30">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2">Shape Our Roadmap</CardTitle>
              <CardDescription>
                Your feedback is invaluable in helping us prioritize features and build what matters most to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/beta-program">
                  <Button variant="premium" size="lg">
                    Join Beta Program
                  </Button>
                </Link>
                <Link to="/community">
                  <Button variant="outline" size="lg">
                    Share Feedback
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Beta members get early access to new features and direct input on development priorities. 
                Join our community to vote on features and share your ideas.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Status Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Completed</Badge>
                <span className="text-sm">Successfully launched and active</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">In Progress</Badge>
                <span className="text-sm">Currently being developed</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">Planned</Badge>
                <span className="text-sm">Scheduled for development</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className="bg-muted/20 text-muted-foreground border-muted/30 text-xs">Future</Badge>
                <span className="text-sm">Under consideration</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="text-lg">Priority Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">High</Badge>
                <span className="text-sm">Critical features for core functionality</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Medium</Badge>
                <span className="text-sm">Important enhancements</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Low</Badge>
                <span className="text-sm">Nice-to-have features</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Roadmap;