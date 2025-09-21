import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Zap, Users, Music, TrendingUp, Sparkles, ArrowRight, Play, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const pluginBenefits = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Collaboration",
    description: "Connect with producers and artists in real-time, share ideas instantly",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: <Music className="w-5 h-5" />,
    title: "Unlimited Access",
    description: "Stream and download from our exclusive catalog of premium beats",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Network Effects",
    description: "Build your network with verified creators and industry professionals",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Analytics & Insights",
    description: "Track your music's performance and discover trending sounds",
    color: "from-green-500 to-emerald-500"
  }
];

const trendingTopics = [
  { name: "Lo-Fi Hip Hop", count: "1.2K beats", trending: true },
  { name: "Drill", count: "890 beats", trending: true },
  { name: "R&B Soul", count: "1.5K beats", trending: false },
  { name: "Afrobeats", count: "760 beats", trending: true },
  { name: "Trap", count: "2.1K beats", trending: false },
  { name: "Melodic Rap", count: "980 beats", trending: true }
];

const featuredCreators = [
  { name: "BeatsByTay", genre: "Hip Hop", verified: true, plays: "50K+" },
  { name: "SoulfulSounds", genre: "R&B", verified: true, plays: "35K+" },
  { name: "TrapLord", genre: "Trap", verified: false, plays: "28K+" },
  { name: "MelodicMike", genre: "Pop", verified: true, plays: "42K+" }
];

export const DiscoveryPanel = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-8 mb-12">
      {/* Why Plug-ins are Interesting Section */}
      <Card className="overflow-hidden bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 border-2 border-primary/10">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-primary to-purple-500 rounded-full">
              <Lightbulb className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Why Plug-ins are Interesting
          </CardTitle>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the power of our music creation ecosystem and how it transforms your creative process
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {pluginBenefits.map((benefit, index) => (
              <div key={index} className="group">
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r ${benefit.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                      {benefit.icon}
                    </div>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Button size="lg" className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 group">
              <Sparkles className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Explore Our Features
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Discovery Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trending Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trending Now
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Popular genres and styles this week
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {trendingTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full flex items-center justify-center">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {topic.name}
                      </span>
                      {topic.trending && (
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                          Hot
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{topic.count}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Featured Creators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Featured Creators
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Top creators in the community
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {featuredCreators.map((creator, index) => (
              <div key={index} className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {creator.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {creator.name}
                      </span>
                      {creator.verified && (
                        <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{creator.genre}</span>
                      <span>•</span>
                      <span>{creator.plays} plays</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Quick Start
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Jump into your creative journey
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/beats?genre=trending">
              <Button variant="outline" className="w-full justify-start group">
                <TrendingUp className="w-4 h-4 mr-2" />
                Browse Trending Beats
                <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/creators?verified=true">
              <Button variant="outline" className="w-full justify-start group">
                <Users className="w-4 h-4 mr-2" />
                Find Verified Creators
                <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/collaborate">
              <Button variant="outline" className="w-full justify-start group">
                <Zap className="w-4 h-4 mr-2" />
                Start Collaborating
                <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="default" className="w-full mt-4 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
              <Music className="w-4 h-4 mr-2" />
              Upload Your Music
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};