import { useState, useEffect, useMemo } from "react";
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

interface KpiDailyRow {
  metric_date: string;
  kpi_key: string;
  total_value: number;
  attribution_source?: string | null;
  attribution_medium?: string | null;
  attribution_campaign?: string | null;
  post_id?: string | null;
  content_type?: string | null;
  content_id?: string | null;
}

interface AttributionRow {
  key: string;
  label: string;
  views: number;
  plays: number;
  revenue: number;
  conversionRate: number | null;
  revenuePerView: number | null;
}

const summarizeKpis = (rows: KpiDailyRow[]) => {
  return rows.reduce(
    (acc, row) => {
      const value = Number(row.total_value ?? 0);
      if (!Number.isFinite(value)) {
        return acc;
      }

      switch (row.kpi_key) {
        case "total_views":
          acc.totalViews += value;
          break;
        case "total_streams":
          acc.totalStreams += value;
          break;
        case "total_likes":
          acc.totalLikes += value;
          break;
        case "fan_revenue_cents":
          acc.fanRevenueCents += value;
          break;
        case "event_revenue_cents":
          acc.eventRevenueCents += value;
          break;
        case "battle_revenue_cents":
          acc.battleRevenueCents += value;
          break;
      }

      return acc;
    },
    {
      totalViews: 0,
      totalStreams: 0,
      totalLikes: 0,
      fanRevenueCents: 0,
      eventRevenueCents: 0,
      battleRevenueCents: 0,
    },
  );
};

const buildAttributionRows = (rows: KpiDailyRow[]): AttributionRow[] => {
  const buckets = new Map<
    string,
    {
      key: string;
      label: string;
      views: number;
      plays: number;
      revenueCents: number;
    }
  >();

  for (const row of rows) {
    const value = Number(row.total_value ?? 0);
    if (!Number.isFinite(value)) continue;

    const keyParts = [
      row.post_id ? `post:${row.post_id}` : null,
      row.attribution_source ? `src:${row.attribution_source}` : null,
      row.content_type ? `type:${row.content_type}` : null,
    ].filter(Boolean);

    const key = keyParts.join("|") || row.kpi_key || "unattributed";
    const labelSegments = [
      row.attribution_source,
      row.attribution_medium,
      row.content_type,
      row.post_id ? `post ${row.post_id.slice(0, 6)}` : null,
    ].filter(Boolean);
    const label = labelSegments.join(" • ") || "Organic / Unknown";

    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label,
        views: 0,
        plays: 0,
        revenueCents: 0,
      });
    }

    const bucket = buckets.get(key)!;
    switch (row.kpi_key) {
      case "total_views":
        bucket.views += value;
        break;
      case "total_streams":
        bucket.plays += value;
        break;
      case "fan_revenue_cents":
      case "event_revenue_cents":
      case "battle_revenue_cents":
        bucket.revenueCents += value;
        break;
    }
  }

  return Array.from(buckets.values())
    .filter((bucket) => bucket.views > 0 || bucket.plays > 0 || bucket.revenueCents > 0)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      views: bucket.views,
      plays: bucket.plays,
      revenue: bucket.revenueCents / 100,
      conversionRate: bucket.views > 0 ? (bucket.plays / bucket.views) * 100 : null,
      revenuePerView: bucket.views > 0 ? (bucket.revenueCents / 100) / bucket.views : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

export function CreatorAnalytics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CreatorMetric[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [splitInsights, setSplitInsights] = useState<{ totalNet: number; content: { key: string; label: string; net: number; averagePercent: number | null }[] } | null>(null);
  const [kpiRows, setKpiRows] = useState<KpiDailyRow[]>([]);
  const [attributionRows, setAttributionRows] = useState<AttributionRow[]>([]);

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
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data: metricsData, error: metricsError } = await supabase
        .from('creator_metrics')
        .select('*')
        .eq('creator_id', user.id)
        .gte('metric_date', startDateStr)
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

      const { data: statementData, error: statementError } = await supabase
        .from('creator_statements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (statementError) throw statementError;

      if (statementData && statementData.length > 0) {
        const attribution = statementData.reduce((acc, statement) => {
          const key = `${statement.content_type || 'content'}:${statement.content_id || 'none'}`;
          if (!acc[key]) {
            const label = statement.metadata?.content_title || statement.metadata?.product_name || `${statement.content_type || 'content'} · ${statement.content_id ? statement.content_id.slice(0, 8) : 'unlinked'}`;
            acc[key] = {
              key,
              label,
              net: 0,
              percentTotal: 0,
              percentCount: 0
            };
          }
          acc[key].net += (statement.net_amount_cents || 0) / 100;
          if (statement.split_percent !== null && statement.split_percent !== undefined) {
            acc[key].percentTotal += Number(statement.split_percent);
            acc[key].percentCount += 1;
          }
          return acc;
        }, {} as Record<string, { key: string; label: string; net: number; percentTotal: number; percentCount: number }>);

        const content = Object.values(attribution)
          .map(item => ({
            key: item.key,
            label: item.label,
            net: item.net,
            averagePercent: item.percentCount > 0 ? item.percentTotal / item.percentCount : null
          }))
          .sort((a, b) => b.net - a.net);

        const totalNet = content.reduce((sum, item) => sum + item.net, 0);
        setSplitInsights({ totalNet, content });
      } else {
        setSplitInsights(null);
      }

      const { data: kpiData, error: kpiError } = await supabase
        .from('creator_kpi_daily_personal')
        .select('metric_date, kpi_key, total_value, attribution_source, attribution_medium, attribution_campaign, post_id, content_type, content_id')
        .gte('metric_date', startDateStr)
        .order('metric_date', { ascending: true });

      if (kpiError) throw kpiError;

      const normalizedKpis: KpiDailyRow[] =
        (kpiData ?? []).map((row) => ({
          metric_date: row.metric_date,
          kpi_key: row.kpi_key,
          total_value: Number(row.total_value ?? 0),
          attribution_source: row.attribution_source,
          attribution_medium: row.attribution_medium,
          attribution_campaign: row.attribution_campaign,
          post_id: row.post_id,
          content_type: row.content_type,
          content_id: row.content_id,
        })) ?? [];

      setKpiRows(normalizedKpis);
      setAttributionRows(buildAttributionRows(normalizedKpis));

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

  const kpiSummary = useMemo(() => summarizeKpis(kpiRows), [kpiRows]);
  const hasKpiSnapshot =
    kpiRows.length > 0 &&
    (kpiSummary.totalViews > 0 ||
      kpiSummary.totalStreams > 0 ||
      kpiSummary.fanRevenueCents > 0 ||
      kpiSummary.eventRevenueCents > 0 ||
      kpiSummary.battleRevenueCents > 0);
  const attributedRevenue =
    (kpiSummary.fanRevenueCents + kpiSummary.eventRevenueCents + kpiSummary.battleRevenueCents) / 100;

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

        {splitInsights && (
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Split-adjusted Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(splitInsights.totalNet)}</p>
                </div>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                {splitInsights.content.slice(0, 5).map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.averagePercent !== null ? `${item.averagePercent.toFixed(1)}% share` : 'Pending collaborator approval'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(item.net)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

      {hasKpiSnapshot && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">Attributed Views (30d)</p>
                <p className="text-2xl font-bold">{kpiSummary.totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Captured across connected channels</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">Streams / Plays (30d)</p>
                <p className="text-2xl font-bold">{kpiSummary.totalStreams.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Includes on-platform and imported plays</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">Attributed Revenue (30d)</p>
                <p className="text-2xl font-bold">{formatCurrency(attributedRevenue)}</p>
                <p className="text-xs text-muted-foreground">Revenue from subscriptions, events, and battles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">Audience Likes (30d)</p>
                <p className="text-2xl font-bold">{kpiSummary.totalLikes.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Aggregated from community + streaming hooks</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Attribution & ROI</CardTitle>
          <CardDescription>Closed-loop funnel from post/UTM to views, plays, and revenue.</CardDescription>
        </CardHeader>
        <CardContent>
          {attributionRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attributed activity recorded for this date range. Publish via Plug-ins or sync your channels to start tracking ROI.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4 font-medium">Source / Post</th>
                    <th className="py-2 pr-4 font-medium">Views</th>
                    <th className="py-2 pr-4 font-medium">Plays</th>
                    <th className="py-2 pr-4 font-medium">Revenue</th>
                    <th className="py-2 pr-4 font-medium">Conversion</th>
                    <th className="py-2 font-medium">Rev / View</th>
                  </tr>
                </thead>
                <tbody>
                  {attributionRows.map((row) => (
                    <tr key={row.key} className="border-b last:border-none">
                      <td className="py-2 pr-4">
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{row.key}</p>
                      </td>
                      <td className="py-2 pr-4">{row.views.toLocaleString()}</td>
                      <td className="py-2 pr-4">{row.plays.toLocaleString()}</td>
                      <td className="py-2 pr-4">{formatCurrency(row.revenue)}</td>
                      <td className="py-2 pr-4">
                        {row.conversionRate !== null ? `${row.conversionRate.toFixed(1)}%` : "–"}
                      </td>
                      <td className="py-2">{row.revenuePerView ? formatCurrency(row.revenuePerView) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
