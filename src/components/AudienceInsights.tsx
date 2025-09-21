import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Globe, Users, TrendingUp, TrendingDown } from "lucide-react";

interface CreatorMetrics {
  audience_geo: any;
  retention_30d: number;
  new_fans_30d: number;
  churn_30d: number;
  metric_date: string;
}

export const AudienceInsights = () => {
  const [metrics, setMetrics] = useState<CreatorMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('creator_metrics')
          .select('audience_geo, retention_30d, new_fans_30d, churn_30d, metric_date')
          .eq('creator_id', user.id)
          .gte('metric_date', thirtyDaysAgo)
          .order('metric_date', { ascending: false });

        if (error) throw error;

        setMetrics(data || []);
      } catch (error) {
        console.error('Error fetching audience insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audience Insights</CardTitle>
          <CardDescription>Loading your audience data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const latestMetrics = metrics[0];
  const previousMetrics = metrics[1];

  // Calculate trends
  const newFansTrend = previousMetrics ? 
    ((latestMetrics?.new_fans_30d || 0) - (previousMetrics.new_fans_30d || 0)) : 0;
  const churnTrend = previousMetrics ? 
    ((latestMetrics?.churn_30d || 0) - (previousMetrics.churn_30d || 0)) : 0;

  // Process geo data
  const topCountries = latestMetrics?.audience_geo && typeof latestMetrics.audience_geo === 'object' ? 
    Object.entries(latestMetrics.audience_geo as Record<string, number>)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30-Day Retention</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestMetrics?.retention_30d || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Active fans from 30+ days ago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Fans</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestMetrics?.new_fans_30d || 0}</div>
            <div className="flex items-center text-xs">
              {newFansTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : newFansTrend < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              ) : null}
              <span className={newFansTrend > 0 ? "text-green-500" : newFansTrend < 0 ? "text-red-500" : "text-muted-foreground"}>
                {newFansTrend > 0 ? '+' : ''}{newFansTrend} vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestMetrics?.churn_30d || 0}</div>
            <div className="flex items-center text-xs">
              {churnTrend > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
              ) : churnTrend < 0 ? (
                <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
              ) : null}
              <span className={churnTrend > 0 ? "text-red-500" : churnTrend < 0 ? "text-green-500" : "text-muted-foreground"}>
                {churnTrend > 0 ? '+' : ''}{churnTrend} vs previous period
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {topCountries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Countries
            </CardTitle>
            <CardDescription>
              Where your audience is located (last 30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCountries.map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="font-medium">{String(country)}</span>
                  <Badge variant="secondary">{String(count)} fans</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {topCountries.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Geographic Insights
            </CardTitle>
            <CardDescription>
              No geographic data available yet. Data will appear as your audience grows.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};