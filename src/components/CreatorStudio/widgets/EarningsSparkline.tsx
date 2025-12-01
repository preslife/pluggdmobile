import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SparklineData {
  day: string;
  earnings: number;
}

/**
 * EarningsSparkline - Implements spec requirement for "earnings sparkline (7/30d with % change)"
 * Shows mini line chart with toggle between 7 and 30 day views
 */
export const EarningsSparkline: React.FC = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<SparklineData[]>([]);
  const [percentChange, setPercentChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  useEffect(() => {
    if (user?.id) {
      fetchEarningsData();
    }
  }, [user?.id, timeRange]);

  const fetchEarningsData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const days = timeRange === '7d' ? 7 : 30;

      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('price, quantity, created_at')
        .eq('creator_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const earningsByDay = new Map<string, number>();

      orderItems?.forEach((item) => {
        const createdAt = item.created_at ? new Date(item.created_at) : null;
        if (!createdAt) return;

        const dayKey = createdAt.toISOString().split('T')[0];
        const amount = (item.price ?? 0) * (item.quantity ?? 1);
        earningsByDay.set(dayKey, (earningsByDay.get(dayKey) ?? 0) + amount);
      });

      const chartPoints: SparklineData[] = [];
      let total = 0;

      for (let i = 0; i < days; i++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        const dayKey = current.toISOString().split('T')[0];
        const value = parseFloat((earningsByDay.get(dayKey) ?? 0).toFixed(2));
        chartPoints.push({ day: dayKey, earnings: value });
        total += value;
      }

      setData(chartPoints);
      setTotalEarnings(total);

      if (chartPoints.length >= 2) {
        const midpoint = Math.floor(chartPoints.length / 2);
        const previous = chartPoints.slice(0, midpoint).reduce((sum, point) => sum + point.earnings, 0);
        const recent = chartPoints.slice(midpoint).reduce((sum, point) => sum + point.earnings, 0);
        const change = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
        setPercentChange(parseFloat(change.toFixed(1)));
      } else {
        setPercentChange(0);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      setData([]);
      setTotalEarnings(0);
      setPercentChange(0);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    if (percentChange > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (percentChange < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (percentChange > 0) return 'text-green-500';
    if (percentChange < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <Card className="studio-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Earnings Trend</CardTitle>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={timeRange === '7d' ? 'default' : 'ghost'}
              size="sm"
              className={`h-6 px-2.5 text-xs rounded-md transition-all ${timeRange === '7d' ? 'bg-orange-500 text-white shadow-sm' : 'hover:bg-muted'}`}
              onClick={() => setTimeRange('7d')}
            >
              7d
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'ghost'}
              size="sm"
              className={`h-6 px-2.5 text-xs rounded-md transition-all ${timeRange === '30d' ? 'bg-orange-500 text-white shadow-sm' : 'hover:bg-muted'}`}
              onClick={() => setTimeRange('30d')}
            >
              30d
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-3xl font-bold tracking-tight">${totalEarnings.toFixed(0)}</span>
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            percentChange > 0 ? 'bg-emerald-500/15 text-emerald-500' : 
            percentChange < 0 ? 'bg-red-500/15 text-red-500' : 'bg-muted text-muted-foreground'
          }`}>
            {getTrendIcon()}
            <span>{Math.abs(percentChange)}%</span>
          </div>
        </div>
        
        {!loading && data.length > 0 && (
          <div className="h-20 w-full chart-container rounded-lg p-2 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      return (
                        <div className="bg-card border border-border/50 rounded-lg px-3 py-1.5 text-xs shadow-lg">
                          <span className="font-semibold">${payload[0].value}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="url(#earningsGradient)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <p className="text-[11px] text-muted-foreground/70 mt-3 uppercase tracking-wide font-medium">
          Last {timeRange === '7d' ? '7 days' : '30 days'} performance
        </p>
      </CardContent>
    </Card>
  );
};

export default EarningsSparkline;
