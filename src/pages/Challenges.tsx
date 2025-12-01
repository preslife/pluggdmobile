import { AutomatedChallenges } from "@/components/AutomatedChallenges";
import { ChallengeVoting } from "@/components/ChallengeVoting";
import { motion } from "framer-motion";
import { setMeta } from "@/lib/seo";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Flame, Crown, Users, Award, Zap, Star } from "lucide-react";
import { Link } from "react-router-dom";

const Challenges = () => {
  const [activeChallenge, setActiveChallenge] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setMeta(
      "Music Challenges — Pluggd",
      "Join automated music challenges, compete with creators, and earn rewards.",
      "/challenges"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-orange-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(234,179,8,0.1),transparent_50%)]" />
        
        <div className="relative z-10 container mx-auto px-4 pt-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Trophy className="w-3 h-3 mr-1" />
              Compete & Win
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Music <span className="text-amber-500">Challenges</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Compete with creators worldwide, showcase your skills, and win prizes. 
              From weekly battles to monthly competitions — there's always a challenge waiting.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {[
                { icon: Trophy, label: "Win Cash Prizes", color: "text-amber-400" },
                { icon: Users, label: "Compete Globally", color: "text-blue-400" },
                { icon: Crown, label: "Earn Badges", color: "text-purple-400" },
                { icon: Star, label: "Get Featured", color: "text-pink-400" },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-zinc-300">{item.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: Flame, title: "Weekly Battles", desc: "Fast-paced competitions every week", color: "from-orange-500/20 to-red-500/10" },
                { icon: Crown, title: "Monthly Contests", desc: "Big prizes & major recognition", color: "from-amber-500/20 to-yellow-500/10" },
                { icon: Zap, title: "Daily Challenges", desc: "Quick wins & streak rewards", color: "from-yellow-500/20 to-amber-500/10" },
              ].map((card, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className={`p-5 rounded-2xl border border-white/10 bg-gradient-to-br ${card.color} backdrop-blur-sm`}
                >
                  <card.icon className="w-8 h-8 text-amber-400 mb-3" />
                  <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                  <p className="text-sm text-zinc-400">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <Tabs defaultValue="challenges" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="challenges" className="data-[state=active]:bg-background">
                <Trophy className="w-4 h-4 mr-2" />
                All Challenges
              </TabsTrigger>
              <TabsTrigger value="voting" disabled={!activeChallenge} className="data-[state=active]:bg-background">
                <Award className="w-4 h-4 mr-2" />
                Vote {activeChallenge ? `(${activeChallenge.title})` : ''}
              </TabsTrigger>
            </TabsList>
            
            <Button variant="outline" asChild>
              <Link to="/community?tab=contests">
                <Users className="w-4 h-4 mr-2" />
                View Leaderboards
              </Link>
            </Button>
          </div>
          
          <TabsContent value="challenges">
            <AutomatedChallenges />
          </TabsContent>
          
          <TabsContent value="voting">
            {activeChallenge ? (
              <ChallengeVoting 
                challengeId={activeChallenge.id}
                challengeTitle={activeChallenge.title}
              />
            ) : (
              <div className="text-center py-16 rounded-2xl border border-dashed border-white/10 bg-muted/30">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Challenge Selected</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select a challenge from the list to view submissions and cast your vote.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Challenges;