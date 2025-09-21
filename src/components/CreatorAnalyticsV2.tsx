import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { DollarSign, Users, Heart, MessageCircle, Download, Play } from "lucide-react";
import { toast } from "sonner";

interface MetricsData {
  metric_date: string;
  sales_count: number;
  sales_revenue_cents: number;
  subs_active: number;
  subs_mrr_cents: number;
  battle_revenue_cents: number;
  event_revenue_cents: number;
  post_likes: number;
  post_comments: number;
  plays_count: number;
}

interface AnalyticsSummary {
  total_revenue: number;
  total_subscribers: number;
  total_engagement: number;
  total_plays: number;
}

export const CreatorAnalyticsV2 = () => {
  const { user } = useAuth();
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);

  // Load analytics data
  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const daysAgo = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('creator_metrics')
        .select('*')
        .eq('creator_id', user.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;

      const formattedData = data.map(row => ({
        metric_date: row.metric_date,
        sales_count: row.sales_count || 0,
        sales_revenue_cents: row.sales_revenue_cents || 0,
        subs_active: row.subs_active || 0,
        subs_mrr_cents: row.subs_mrr_cents || 0,
        battle_revenue_cents: row.battle_revenue_cents || 0,
        event_revenue_cents: row.event_revenue_cents || 0,
        post_likes: row.post_likes || 0,
        post_comments: row.post_comments || 0,
        plays_count: row.plays_count || 0
      }));

      setMetricsData(formattedData);

      // Calculate summary
      const totalRevenue = formattedData.reduce((sum, day) => 
        sum + day.sales_revenue_cents + day.battle_revenue_cents + day.event_revenue_cents + day.subs_mrr_cents, 0
      );
      const currentSubs = formattedData.length > 0 ? formattedData[formattedData.length - 1].subs_active : 0;
      const totalEngagement = formattedData.reduce((sum, day) => sum + day.post_likes + day.post_comments, 0);
      const totalPlays = formattedData.reduce((sum, day) => sum + day.plays_count, 0);

      setSummary({
        total_revenue: totalRevenue,
        total_subscribers: currentSubs,
        total_engagement: totalEngagement,
        total_plays: totalPlays
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!metricsData.length) return;

    const headers = [
      'Date',
      'Sales Count',
      'Sales Revenue ($)',
      'Active Subscribers',
      'MRR ($)',
      'Battle Revenue ($)',
      'Event Revenue ($)',
      'Post Likes',
      'Post Comments',
      'Plays'
    ];

    const csvData = [
      headers.join(','),
      ...metricsData.map(row => [
        row.metric_date,
        row.sales_count,
        (row.sales_revenue_cents / 100).toFixed(2),
        row.subs_active,
        (row.subs_mrr_cents / 100).toFixed(2),
        (row.battle_revenue_cents / 100).toFixed(2),
        (row.event_revenue_cents / 100).toFixed(2),
        row.post_likes,
        row.post_comments,
        row.plays_count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creator-analytics-${timeRange}days.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Prepare chart data
  const chartData = metricsData.map(row => ({
    date: new Date(row.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: (row.sales_revenue_cents + row.battle_revenue_cents + row.event_revenue_cents + row.subs_mrr_cents) / 100,
    sales: row.sales_revenue_cents / 100,
    battles: row.battle_revenue_cents / 100,
    events: row.event_revenue_cents / 100,
    subs: row.subs_mrr_cents / 100,
    subscribers: row.subs_active,
    likes: row.post_likes,
    comments: row.post_comments,
    plays: row.plays_count
  }));

  useEffect(() => {
    loadAnalytics();
  }, [user, timeRange]);

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creator Analytics</h1>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_revenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary?.total_subscribers || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary?.total_engagement || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plays</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary?.total_plays || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, '']} />
                <Area type="monotone" dataKey="sales" stackId="1" stroke="#8884d8" fill="#8884d8" name="Sales" />
                <Area type="monotone" dataKey="battles" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Battles" />
                <Area type="monotone" dataKey="events" stackId="1" stroke="#ffc658" fill="#ffc658" name="Events" />
                <Area type="monotone" dataKey="subs" stackId="1" stroke="#ff7300" fill="#ff7300" name="Subscriptions" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subscribers Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Active Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="subscribers" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="likes" fill="#e91e63" name="Likes" />
                <Bar dataKey="comments" fill="#2196f3" name="Comments" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plays Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Content Plays</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="plays" stroke="#9c27b0" fill="#9c27b0" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};