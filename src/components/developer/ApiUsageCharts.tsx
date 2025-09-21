import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UsageData {
  date: string;
  requests: number;
  success_rate: number;
  rate_limit_hits: number;
}

interface ApiUsageChartsProps {
  tokenId?: string;
}

export const ApiUsageCharts = ({ tokenId }: ApiUsageChartsProps) => {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRequests, setTotalRequests] = useState(0);
  const [avgSuccessRate, setAvgSuccessRate] = useState(0);
  const [totalRateLimitHits, setTotalRateLimitHits] = useState(0);

  useEffect(() => {
    fetchUsageData();
  }, [tokenId]);

  const fetchUsageData = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const query = supabase
        .from('analytics_events')
        .select('*')
        .eq('event_name', 'api_request')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (tokenId) {
        query.eq('event_properties->>token_id', tokenId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data for charts
      const dailyData = processUsageData(data || []);
      setUsageData(dailyData);

      // Calculate summary stats
      const total = (data || []).length;
      const successful = (data || []).filter(d => {
        const status = d.properties && typeof d.properties === 'object' && 'status' in d.properties 
          ? parseInt(String(d.properties.status)) 
          : 0;
        return status >= 200 && status < 400;
      }).length;
      const rateLimitHits = (data || []).filter(d => {
        const status = d.properties && typeof d.properties === 'object' && 'status' in d.properties 
          ? parseInt(String(d.properties.status)) 
          : 0;
        return status === 429;
      }).length;

      setTotalRequests(total);
      setAvgSuccessRate(total > 0 ? (successful / total) * 100 : 0);
      setTotalRateLimitHits(rateLimitHits);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
    setLoading(false);
  };

  const processUsageData = (data: any[]): UsageData[] => {
    const dailyStats: Record<string, { requests: number; successful: number; rateLimitHits: number }> = {};

    data.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { requests: 0, successful: 0, rateLimitHits: 0 };
      }
      
      dailyStats[date].requests++;
      
      const status = event.properties && typeof event.properties === 'object' && 'status' in event.properties 
        ? parseInt(String(event.properties.status)) 
        : 0;
      if (status >= 200 && status < 400) {
        dailyStats[date].successful++;
      }
      if (status === 429) {
        dailyStats[date].rateLimitHits++;
      }
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      requests: stats.requests,
      success_rate: stats.requests > 0 ? (stats.successful / stats.requests) * 100 : 0,
      rate_limit_hits: stats.rateLimitHits,
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSuccessRate.toFixed(1)}%</div>
            <div className="flex items-center space-x-1 text-xs">
              <Badge variant={avgSuccessRate >= 95 ? "default" : avgSuccessRate >= 90 ? "secondary" : "destructive"}>
                {avgSuccessRate >= 95 ? "Excellent" : avgSuccessRate >= 90 ? "Good" : "Poor"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Hits</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRateLimitHits}</div>
            <p className="text-xs text-muted-foreground">429 responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">~150ms</div>
            <p className="text-xs text-muted-foreground">Estimated</p>
          </CardContent>
        </Card>
      </div>

      {usageData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Timeline</CardTitle>
            <CardDescription>API requests over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end space-x-2">
              {usageData.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t min-h-[4px]"
                    style={{
                      height: `${Math.max(4, (day.requests / Math.max(...usageData.map(d => d.requests))) * 180)}px`
                    }}
                  ></div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-xs font-medium">{day.requests}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};