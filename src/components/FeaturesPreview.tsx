import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getAcademyBasePath } from '@/lib/academyRoutes';
import { motion } from "framer-motion";
import { Handshake, Music2, Wrench, GraduationCap, BarChart3, Users } from "lucide-react";

const FeaturesPreview = () => {
  const academyPath = getAcademyBasePath();
  const features = [
    {
      category: "Collaboration",
      title: "Collab Hub",
      description: "Smart matching connects you with vocalists, producers, and writers who fit your sound.",
      status: "Live",
      highlights: ["Smart Matching", "Project Management", "Real-time Chat"],
      link: "/collaborate",
      accessible: true,
      Icon: Handshake,
      color: "from-emerald-500"
    },
    {
      category: "Marketplace",
      title: "Beat Store",
      description: "Sell beats with standard, premium, and exclusive licenses. Sync-ready for film & TV.",
      status: "Live",
      highlights: ["Multiple Licenses", "Instant Delivery", "Sync-Ready"],
      link: "/marketplace",
      accessible: true,
      Icon: Music2,
      color: "from-purple-500"
    },
    {
      category: "Tools",
      title: "Pro Tools",
      description: "AI lyric assists, contract templates, auto split sheets — everything to stay professional.",
      status: "Live",
      highlights: ["AI Generators", "Legal Templates", "Split Sheets"],
      link: "/tools",
      accessible: true,
      Icon: Wrench,
      color: "from-blue-500"
    },
    {
      category: "Education",
      title: "Academy",
      description: "Expert-led courses on production, sync licensing, and the music business.",
      status: "Live",
      highlights: ["Expert-Led", "Career-Focused", "Industry Secrets"],
      link: academyPath,
      accessible: true,
      Icon: GraduationCap,
      color: "from-amber-500"
    },
    {
      category: "Business",
      title: "Analytics",
      description: "Track growth, revenue, and audience insights. Know exactly what's working.",
      status: "Pro",
      highlights: ["Growth Tracking", "Market Insights", "Revenue Analytics"],
      link: "/tools",
      accessible: true,
      Icon: BarChart3,
      color: "from-cyan-500"
    },
    {
      category: "Network",
      title: "Directory",
      description: "Find verified managers, A&Rs, publishers, and sync agents with direct messaging.",
      status: "Live",
      highlights: ["Verified Pros", "Direct Messaging", "Availability"],
      link: "/directory",
      accessible: true,
      Icon: Users,
      color: "from-pink-500"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Beta":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Pro":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "Coming Soon":
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div className="relative rounded-3xl border border-white/10 bg-black/40 p-8 md:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.08),transparent_50%)]" />
      
      <div className="relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => {
            const Icon = feature.Icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <Card 
                  className="group h-full hover:border-white/20 transition-all duration-300 bg-white/[0.03] backdrop-blur-sm border-white/10"
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} to-transparent`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <Badge className={`text-[10px] ${getStatusColor(feature.status)}`}>
                        {feature.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-zinc-400">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {feature.highlights.map((highlight, i) => (
                        <span 
                          key={i}
                          className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/10"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                    
                    {feature.accessible && (
                      <Link to={feature.link}>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="w-full border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                        >
                          Explore →
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeaturesPreview;
