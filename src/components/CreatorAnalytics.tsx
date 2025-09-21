import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Users, DollarSign, Heart, MessageSquare, Trophy, TrendingUp, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface CreatorMetric {
  id: string;
  metric_date: string;
  subs_count: number;
  revenue_cents: number;
  likes_count: number;
  comments_count: number;
  battles_entries_count: number;
}

interface AnalyticsSummary {
  totalSubs: number;
  totalRevenue: number;
  totalLikes: number;
  totalComments: number;
  totalBattles: number;
  growthRate: number;
}

export function CreatorAnalytics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CreatorMetric[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch metrics data
      const { data: metricsData, error: metricsError } = await supabase
        .from('creator_metrics')
        .select('*')
        .eq('creator_id', user.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (metricsError) throw metricsError;

      setMetrics(metricsData || []);

      // Calculate summary statistics
      if (metricsData && metricsData.length > 0) {
        const latest = metricsData[metricsData.length - 1];
        const previous = metricsData.length > 1 ? metricsData[metricsData.length - 2] : null;
        
        const growthRate = previous 
          ? ((latest.subs_count - previous.subs_count) / Math.max(previous.subs_count, 1)) * 100
          : 0;

        setSummary({
          totalSubs: latest.subs_count,
          totalRevenue: metricsData.reduce((sum, m) => sum + m.revenue_cents, 0),
          totalLikes: metricsData.reduce((sum, m) => sum + m.likes_count, 0),
          totalComments: metricsData.reduce((sum, m) => sum + m.comments_count, 0),
          totalBattles: metricsData.reduce((sum, m) => sum + m.battles_entries_count, 0),
          growthRate
        });
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = (data: CreatorMetric[]) => {
    return data.map(metric => ({
      date: new Date(metric.metric_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      subscribers: metric.subs_count,
      revenue: metric.revenue_cents / 100, // Convert to dollars
      likes: metric.likes_count,
      comments: metric.comments_count,
      battles: metric.battles_entries_count,
      engagement: metric.likes_count + metric.comments_count
    }));
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Sign in to view analytics</h3>
        <p className="text-muted-foreground">
          You need to be signed in to access creator analytics.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const chartData = formatChartData(metrics);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creator Analytics</h2>
          <p className="text-muted-foreground">
            Track your growth and engagement metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={dateRange === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('7')}
          >
            7 Days
          </Button>
          <Button
            variant={dateRange === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('30')}
          >
            30 Days
          </Button>
          <Button
            variant={dateRange === '90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('90')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Subscribers</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold">{summary.totalSubs}</p>
                    {summary.growthRate !== 0 && (
                      <Badge variant={summary.growthRate > 0 ? 'default' : 'destructive'}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {summary.growthRate > 0 ? '+' : ''}{summary.growthRate.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Revenue</p>
                  <p className="text-2xl font-bold">
                    ${(summary.totalRevenue / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Likes</p>
                  <p className="text-2xl font-bold">{summary.totalLikes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Comments</p>
                  <p className="text-2xl font-bold">{summary.totalComments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Battle Entries</p>
                  <p className="text-2xl font-bold">{summary.totalBattles}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscriber Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="subscribers" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="likes" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Likes"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="comments" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Comments"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="battles" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Battle Entries"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {metrics.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Analytics Data Yet</h3>
            <p className="text-muted-foreground">
              Analytics data will appear here once you start creating content and engaging with your audience. 
              Data is aggregated daily.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}