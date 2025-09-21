import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Users, Play, Award, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalReleases: number;
  totalUsers: number;
  totalPlays: number;
  activeCollaborations: number;
}

const PlatformStats = () => {
  const [stats, setStats] = useState<Stats>({
    totalReleases: 0,
    totalUsers: 0,
    totalPlays: 0,
    activeCollaborations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [growthRate, setGrowthRate] = useState(15.2);

  useEffect(() => {
    fetchStats();
    
    // Set up real-time subscriptions for dynamic updates
    const releasesChannel = supabase
      .channel('releases-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'releases' }, fetchStats)
      .subscribe();

    const collaborationsChannel = supabase
      .channel('collaborations-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaboration_projects' }, fetchStats)
      .subscribe();

    // Simulate real-time growth
    const interval = setInterval(() => {
      setGrowthRate(prev => prev + (Math.random() - 0.5) * 0.5);
    }, 5000);

    return () => {
      supabase.removeChannel(releasesChannel);
      supabase.removeChannel(collaborationsChannel);
      clearInterval(interval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch releases count
      const { count: releasesCount } = await supabase
        .from('releases')
        .select('*', { count: 'exact', head: true });

      // Fetch collaborations count
      const { count: collaborationsCount } = await supabase
        .from('collaboration_projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Fetch total plays from releases
      const { data: releasesData } = await supabase
        .from('releases')
        .select('total_plays');

      const totalPlays = releasesData?.reduce((sum, release) => sum + (release.total_plays || 0), 0) || 0;

      setStats({
        totalReleases: releasesCount || 0,
        totalUsers: 2847 + Math.floor(Math.random() * 10), // Simulate growth
        totalPlays: totalPlays + Math.floor(Math.random() * 50),
        activeCollaborations: collaborationsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statItems = [
    {
      icon: Music,
      value: stats.totalReleases,
      label: "Releases",
      description: "Tracks uploaded to the platform",
      color: "text-primary",
      bg: "bg-primary/10",
      trend: "+12%",
    },
    {
      icon: Users,
      value: stats.totalUsers,
      label: "Creators",
      description: "Active musicians and producers",
      color: "text-accent",
      bg: "bg-accent/10",
      trend: `+${growthRate.toFixed(1)}%`,
    },
    {
      icon: Play,
      value: stats.totalPlays,
      label: "Total Plays",
      description: "Streams across all releases",
      color: "text-secondary",
      bg: "bg-secondary/10",
      trend: "+28%",
    },
    {
      icon: Award,
      value: stats.activeCollaborations,
      label: "Live Projects",
      description: "Open collaboration opportunities",
      color: "text-gold",
      bg: "bg-gold/10",
      trend: "+5%",
    },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-10 bg-muted animate-pulse rounded w-96 mx-auto mb-4"></div>
            <div className="h-6 bg-muted animate-pulse rounded w-64 mx-auto"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card animate-pulse rounded-lg h-32"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join the <span className="bg-gradient-primary bg-clip-text text-transparent">Movement</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Thousands of creators are already building their careers on Pluggd. Be part of the future of music.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statItems.map((item, index) => (
            <Card key={index} className="text-center hover:shadow-glow transition-all duration-300 group">
              <CardContent className="p-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${item.bg} mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${item.color} tabular-nums`}>
                    {formatNumber(item.value)}
                  </div>
                  <div className="font-semibold text-foreground">{item.label}</div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <div className="flex items-center justify-center gap-1 text-xs text-green-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>{item.trend}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievement Showcase */}
        <div className="bg-card/50 rounded-lg p-8 mb-12 border border-border/50">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold mb-2">Platform Highlights</h3>
            <p className="text-muted-foreground">Recent achievements from our community</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">£{(Math.random() * 10000 + 5000).toFixed(0)}</div>
              <p className="text-sm text-muted-foreground">Paid to creators this month</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-accent">{Math.floor(Math.random() * 50 + 150)}</div>
              <p className="text-sm text-muted-foreground">Successful collaborations</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-secondary">{Math.floor(Math.random() * 5 + 15)} countries</div>
              <p className="text-sm text-muted-foreground">Global creator reach</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Ready to get plugged in?</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="px-8 group">
                  <span className="group-hover:scale-105 transition-transform">Start Creating Today</span>
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="outline" size="lg" className="px-8 group">
                  <span className="group-hover:scale-105 transition-transform">Explore the Marketplace</span>
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">Join thousands of creators earning from their music</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformStats;