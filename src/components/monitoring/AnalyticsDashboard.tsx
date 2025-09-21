import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Activity, Users, TrendingUp, AlertTriangle, Clock, Eye, MousePointer,
  Smartphone, Monitor, Globe, RefreshCw, Download, Filter, Calendar as CalendarIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, isAfter, isBefore } from 'date-fns';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    pageViews: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversionRate: number;
  };
  userEngagement: Array<{
    date: string;
    users: number;
    sessions: number;
    pageViews: number;
    avgDuration: number;
  }>;
  performanceMetrics: Array<{
    date: string;
    cls: number;
    fid: number;
    lcp: number;
    score: number;
  }>;
  errorMetrics: Array<{
    date: string;
    errors: number;
    errorRate: number;
    criticalErrors: number;
  }>;
  topPages: Array<{
    page: string;
    views: number;
    uniqueViews: number;
    avgDuration: number;
    bounceRate: number;
  }>;
  deviceStats: Array<{
    device: string;
    count: number;
    percentage: number;
  }>;
  geographicStats: Array<{
    country: string;
    users: number;
    sessions: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    users: number;
    conversionRate: number;
  }>;
}

interface DateRange {
  from: Date;
  to: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedMetric, setSelectedMetric] = useState('users');
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has admin access
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      fetchAnalyticsData();
    }
  }, [hasAccess, dateRange]);

  const checkAccess = async () => {
    if (!user) {
      setHasAccess(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setHasAccess(profile?.role === 'admin');
    } catch (error) {
      logger.error('Failed to check user access for analytics', {}, error);
      setHasAccess(false);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!hasAccess) return;

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch overview data
      const { data: overview } = await supabase.rpc('get_analytics_overview', {
        start_date: fromDate,
        end_date: toDate
      });

      // Fetch user engagement trends
      const { data: userEngagement } = await supabase.rpc('get_user_engagement_trends', {
        start_date: fromDate,
        end_date: toDate
      });

      // Fetch performance metrics
      const { data: performance } = await supabase.rpc('get_performance_trends', {
        start_date: fromDate,
        end_date: toDate
      });

      // Fetch error metrics
      const { data: errors } = await supabase.rpc('get_error_metrics', {
        start_date: fromDate,
        end_date: toDate
      });

      // Fetch top pages
      const { data: topPages } = await supabase.rpc('get_top_pages', {
        start_date: fromDate,
        end_date: toDate,
        limit_count: 10
      });

      // Fetch device stats
      const { data: deviceStats } = await supabase.rpc('get_device_stats', {
        start_date: fromDate,
        end_date: toDate
      });

      // Fetch geographic stats
      const { data: geoStats } = await supabase.rpc('get_geographic_stats', {
        start_date: fromDate,
        end_date: toDate
      });

      // Fetch conversion funnel
      const { data: funnel } = await supabase.rpc('get_conversion_funnel', {
        start_date: fromDate,
        end_date: toDate
      });

      setData({
        overview: overview || {
          totalUsers: 0,
          activeUsers: 0,
          pageViews: 0,
          averageSessionDuration: 0,
          bounceRate: 0,
          conversionRate: 0
        },
        userEngagement: userEngagement || [],
        performanceMetrics: performance || [],
        errorMetrics: errors || [],
        topPages: topPages || [],
        deviceStats: deviceStats || [],
        geographicStats: geoStats || [],
        conversionFunnel: funnel || []
      });

      logger.info('Analytics data fetched', {
        dateRange: { fromDate, toDate },
        recordCount: {
          userEngagement: userEngagement?.length || 0,
          performance: performance?.length || 0,
          errors: errors?.length || 0
        }
      });

    } catch (error) {
      logger.error('Failed to fetch analytics data', {}, error);
      toast({
        title: "Failed to load analytics data",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    if (!data) return;

    const exportData = {
      dateRange,
      generatedAt: new Date().toISOString(),
      data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Analytics data exported",
      description: "Data has been downloaded as a JSON file."
    });
  };

  // Calculate trends
  const calculateTrend = (current: number, previous: number): { value: number; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) return { value: 0, trend: 'neutral' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Please log in to view analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              You don't have permission to view analytics data.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor application performance and user engagement
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <div className="flex">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                />
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                />
              </div>
            </PopoverContent>
          </Popover>

          <Button onClick={fetchAnalyticsData} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button onClick={exportData} variant="outline" disabled={!data}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading analytics data...</p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {data && (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.overview.totalUsers.toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.overview.pageViews.toLocaleString()}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.round(data.overview.averageSessionDuration / 60)}m
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.overview.conversionRate.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Engagement Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>User Engagement Trends</CardTitle>
                    <CardDescription>Daily user activity over the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={data.userEngagement}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="users"
                          stackId="1"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="pageViews"
                          stackId="1"
                          stroke="#82ca9d"
                          fill="#82ca9d"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Pages */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Pages</CardTitle>
                    <CardDescription>Most visited pages in your application</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.topPages.map((page, index) => (
                        <div key={page.page} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge variant="secondary">{index + 1}</Badge>
                            <div>
                              <p className="font-medium">{page.page}</p>
                              <p className="text-sm text-muted-foreground">
                                {page.uniqueViews} unique views
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{page.views} views</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(page.avgDuration / 60)}m avg
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement Over Time</CardTitle>
                  <CardDescription>Track how users interact with your application</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data.userEngagement}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="sessions" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="pageViews" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            {data && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Core Web Vitals</CardTitle>
                    <CardDescription>Performance metrics over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.performanceMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="cls" stroke="#ff7300" name="CLS" />
                        <Line type="monotone" dataKey="fid" stroke="#387908" name="FID" />
                        <Line type="monotone" dataKey="lcp" stroke="#8884d8" name="LCP" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Score Trend</CardTitle>
                    <CardDescription>Overall performance score based on Core Web Vitals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={data.performanceMetrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle>Error Tracking</CardTitle>
                  <CardDescription>Monitor application errors and their trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.errorMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="errors" fill="#82ca9d" name="Total Errors" />
                      <Bar dataKey="criticalErrors" fill="#ff7300" name="Critical Errors" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-6">
            {data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Device Distribution</CardTitle>
                    <CardDescription>How users access your application</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data.deviceStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {data.deviceStats.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Geographic Distribution</CardTitle>
                    <CardDescription>Where your users are located</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.geographicStats.slice(0, 8).map((country, index) => (
                        <div key={country.country} className="flex items-center justify-between">
                          <span className="font-medium">{country.country}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">
                              {country.users} users
                            </span>
                            <div className="w-20">
                              <Progress 
                                value={(country.users / data.geographicStats[0]?.users) * 100} 
                                className="h-2" 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Funnel Tab */}
          <TabsContent value="funnel" className="space-y-6">
            {data && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                  <CardDescription>Track user journey through conversion steps</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.conversionFunnel.map((stage, index) => (
                      <div key={stage.stage} className="relative">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{stage.stage}</h4>
                            <p className="text-sm text-muted-foreground">
                              {stage.users} users ({stage.conversionRate.toFixed(1)}% conversion)
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{stage.users}</div>
                            <Badge variant={stage.conversionRate > 50 ? 'default' : 'secondary'}>
                              {stage.conversionRate.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        {index < data.conversionFunnel.length - 1 && (
                          <div className="flex justify-center py-2">
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AnalyticsDashboard;