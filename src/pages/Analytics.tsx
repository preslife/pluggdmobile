import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Play, 
  Heart, 
  Eye, 
  Music,
  RefreshCw,
  Settings
} from "lucide-react";

import { AnalyticsSettings } from "@/components/AnalyticsSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsData {
  kpis: {
    totalStreams: number;
    totalViews: number; 
    totalLikes: number;
    totalComments: number;
  };
  topTracks: Array<{
    title: string;
    streams: number;
    views: number;
    likes: number;
    comments: number;
  }>;
  platforms: Array<{
    platform: string;
    streams: number;
    views: number;
  }>;
  demographics: Array<{
    age_range: string;
    percentage: number;
    listener_count: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    streams: number;
    views: number;
  }>;
}

const Analytics = () => {
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [artistIds, setArtistIds] = useState<{ spotifyArtistId: string; youtubeChannelId: string } | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    kpis: { totalStreams: 0, totalViews: 0, totalLikes: 0, totalComments: 0 },
    topTracks: [],
    platforms: [],
    demographics: [],
    timeSeriesData: []
  });
  const { toast } = useToast();

  const fetchAnalytics = async (ids?: { spotifyArtistId: string; youtubeChannelId: string }) => {
    if (!ids && !artistIds) return;
    
    const targetIds = ids || artistIds;
    if (!targetIds) return;

    setLoading(true);
    try {
      // Fetch Spotify analytics
      const { data: spotifyData, error: spotifyError } = await supabase.functions.invoke('fetch-spotify-analytics', {
        body: { artistId: targetIds.spotifyArtistId }
      });
      if (spotifyError) throw spotifyError;

      // Fetch YouTube analytics
      const { data: youtubeData, error: youtubeError } = await supabase.functions.invoke('fetch-youtube-analytics', {
        body: { channelId: targetIds.youtubeChannelId }
      });
      if (youtubeError) throw youtubeError;

      // Fetch stored analytics from database
      const { data: trackAnalytics, error: trackError } = await supabase
        .from('track_analytics')
        .select(`
          *,
          artist_analytics!inner(platform, artist_name)
        `)
        .order('created_at', { ascending: false });

      if (trackError) throw trackError;

      const { data: audienceAnalytics, error: audienceError } = await supabase
        .from('audience_analytics')
        .select(`
          *,
          artist_analytics!inner(platform)
        `)
        .order('created_at', { ascending: false });

      if (audienceError) throw audienceError;

      // Process data
      const processedData = processAnalyticsData(trackAnalytics || [], audienceAnalytics || []);
      setAnalyticsData(processedData);

      toast({
        title: "Analytics Updated",
        description: "Successfully fetched latest analytics data",
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data. Please check your Artist/Channel IDs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (trackData: any[], audienceData: any[]): AnalyticsData => {
    // Calculate KPIs
    const totalStreams = trackData.reduce((sum, track) => sum + (track.streams || 0), 0);
    const totalViews = trackData.reduce((sum, track) => sum + (track.views || 0), 0);
    const totalLikes = trackData.reduce((sum, track) => sum + (track.likes || 0), 0);
    const totalComments = trackData.reduce((sum, track) => sum + (track.comments || 0), 0);

    // Top tracks
    const topTracks = trackData
      .sort((a, b) => (b.streams || 0) + (b.views || 0) - (a.streams || 0) - (a.views || 0))
      .slice(0, 10)
      .map(track => ({
        title: track.track_name,
        streams: track.streams || 0,
        views: track.views || 0,
        likes: track.likes || 0,
        comments: track.comments || 0
      }));

    // Platform breakdown
    const platformMap = new Map();
    trackData.forEach(track => {
      const platform = track.artist_analytics.platform;
      if (!platformMap.has(platform)) {
        platformMap.set(platform, { platform: platform.charAt(0).toUpperCase() + platform.slice(1), streams: 0, views: 0 });
      }
      platformMap.get(platform).streams += track.streams || 0;
      platformMap.get(platform).views += track.views || 0;
    });
    const platforms = Array.from(platformMap.values());

    // Demographics
    const demoMap = new Map();
    audienceData.forEach(demo => {
      if (demo.age_range) {
        const key = demo.age_range;
        if (!demoMap.has(key)) {
          demoMap.set(key, { age_range: key, percentage: 0, listener_count: 0 });
        }
        demoMap.get(key).percentage += demo.percentage || 0;
        demoMap.get(key).listener_count += demo.listener_count || 0;
      }
    });
    const demographics = Array.from(demoMap.values());

    // Time series data (last 30 days)
    const timeSeriesMap = new Map();
    trackData.forEach(track => {
      const date = track.date_recorded;
      if (!timeSeriesMap.has(date)) {
        timeSeriesMap.set(date, { date, streams: 0, views: 0 });
      }
      timeSeriesMap.get(date).streams += track.streams || 0;
      timeSeriesMap.get(date).views += track.views || 0;
    });
    const timeSeriesData = Array.from(timeSeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      kpis: { totalStreams, totalViews, totalLikes, totalComments },
      topTracks,
      platforms,
      demographics,
      timeSeriesData
    };
  };

  const handleSettingsSave = (settings: { spotifyArtistId: string; youtubeChannelId: string }) => {
    setArtistIds(settings);
    setShowSettings(false);
    // Save to localStorage for persistence
    localStorage.setItem('analytics-settings', JSON.stringify(settings));
    fetchAnalytics(settings);
  };

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('analytics-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setArtistIds(settings);
      fetchAnalytics(settings);
    } else {
      setShowSettings(true);
    }
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const kpiData = [
    {
      title: "Total Streams",
      value: formatNumber(analyticsData.kpis.totalStreams),
      icon: Play,
      color: "text-primary"
    },
    {
      title: "Total Views",
      value: formatNumber(analyticsData.kpis.totalViews),
      icon: Eye,
      color: "text-accent"
    },
    {
      title: "Total Likes", 
      value: formatNumber(analyticsData.kpis.totalLikes),
      icon: Heart,
      color: "text-gold"
    },
    {
      title: "Total Comments",
      value: formatNumber(analyticsData.kpis.totalComments),
      icon: Users,
      color: "text-secondary"
    }
  ];

  if (showSettings) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Analytics</span>
              {" "}
              <span className="text-foreground">Setup</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Enter your artist IDs to view real analytics data
            </p>
          </div>
          <AnalyticsSettings onSave={handleSettingsSave} initialSettings={artistIds || undefined} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-primary bg-clip-text text-transparent">Analytics</span>
                {" "}
                <span className="text-foreground">Dashboard</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Real-time analytics from your music platforms
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchAnalytics()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiData.map((kpi, index) => (
            <Card key={index} className="hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-primary/10`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="tracks">Top Tracks</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="streams" stroke="#8884d8" name="Streams" />
                      <Line type="monotone" dataKey="views" stroke="#82ca9d" name="Views" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.platforms}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="streams"
                        label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.platforms.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Age Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.demographics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age_range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="percentage" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Tracks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topTracks.map((track, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{track.title}</h3>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              {formatNumber(track.streams)} streams
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatNumber(track.views)} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {formatNumber(track.likes)} likes
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.platforms.map((platform, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                          <Music className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{platform.platform}</h3>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{formatNumber(platform.streams)} streams</span>
                            <span>{formatNumber(platform.views)} views</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Producer Earnings Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Total Earnings</span>
                      <span className="text-lg font-bold">{formatNumber(analyticsData.kpis.totalStreams * 0.003)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">This Month</span>
                      <span className="text-lg font-bold">{formatNumber(analyticsData.kpis.totalViews * 0.001)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Pending Payouts</span>
                      <span className="text-lg font-bold">{formatNumber(analyticsData.kpis.totalLikes * 0.005)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={analyticsData.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="streams" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                        name="Estimated Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;