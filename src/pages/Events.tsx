import { useAuth } from "@/hooks/useAuth";
import { EventsListing } from "@/components/EventsListing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Radio, Users, Video, Mic, Sparkles, Clock } from "lucide-react";
import { usePageMetadata } from "@/hooks/usePageMetadata";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Events() {
  const { user } = useAuth();

  usePageMetadata({
    title: "Community Events — Pluggd",
    description: "Discover upcoming workshops, live sessions, and community events hosted by creators on Pluggd.",
    path: "/events",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-background to-blue-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_50%)]" />
        
        <div className="relative z-10 container mx-auto px-4 pt-12 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
              <Calendar className="w-3 h-3 mr-1" />
              Live & Upcoming
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Community <span className="text-purple-500">Events</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Discover upcoming workshops, live sessions, and community events. 
              Connect with creators, learn new skills, and be part of the action.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {[
                { icon: Radio, label: "Live Sessions", color: "text-red-400" },
                { icon: Video, label: "Workshops", color: "text-blue-400" },
                { icon: Mic, label: "Listening Parties", color: "text-purple-400" },
                { icon: Users, label: "Meetups", color: "text-emerald-400" },
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

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25" asChild>
                <Link to="/live">
                  <Radio className="w-4 h-4 mr-2" />
                  View Live Now
                </Link>
              </Button>
              {user && (
                <Button variant="outline" asChild>
                  <a href="/events/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </a>
                </Button>
              )}
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto"
          >
            {[
              { icon: Sparkles, title: "Exclusive Access", desc: "Get early access to drops & announcements", color: "from-purple-500/20 to-violet-500/10" },
              { icon: Clock, title: "Never Miss Out", desc: "Set reminders for events you're interested in", color: "from-blue-500/20 to-cyan-500/10" },
              { icon: Users, title: "Network", desc: "Connect with creators and fellow fans", color: "from-emerald-500/20 to-teal-500/10" },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border border-white/10 bg-gradient-to-br ${card.color} backdrop-blur-sm`}
              >
                <card.icon className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">{card.title}</h3>
                <p className="text-sm text-zinc-400">{card.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pb-16">
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Upcoming Events</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Browse and join events from the community</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/live/sessions">
                View All Sessions
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <EventsListing />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}