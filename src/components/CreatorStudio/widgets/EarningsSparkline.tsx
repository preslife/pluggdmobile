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
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      
      // Generate mock data for now - replace with actual query
      // In production, query from beat_sales, orders, etc.
      const mockData: SparklineData[] = [];
      let total = 0;
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const earnings = Math.random() * 500 + 100; // Mock earnings
        mockData.push({
          day: date.toISOString().split('T')[0],
          earnings: parseFloat(earnings.toFixed(2))
        });
        total += earnings;
      }
      
      setData(mockData);
      setTotalEarnings(total);
      
      // Calculate percent change
      if (mockData.length >= 2) {
        const recent = mockData.slice(-Math.ceil(days/2)).reduce((sum, d) => sum + d.earnings, 0);
        const previous = mockData.slice(0, Math.floor(days/2)).reduce((sum, d) => sum + d.earnings, 0);
        const change = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
        setPercentChange(parseFloat(change.toFixed(1)));
      }
      
    } catch (error) {
      console.error('Error fetching earnings data:', error);
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Earnings Trend</CardTitle>
          <div className="flex gap-1">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setTimeRange('7d')}
            >
              7d
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setTimeRange('30d')}
            >
              30d
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold">${totalEarnings.toFixed(0)}</span>
          <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(percentChange)}%</span>
          </div>
        </div>
        
        {!loading && data.length > 0 && (
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      return (
                        <div className="bg-background border rounded px-2 py-1 text-xs">
                          ${payload[0].value}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          Last {timeRange === '7d' ? '7 days' : '30 days'} performance
        </p>
      </CardContent>
    </Card>
  );
};

export default EarningsSparkline;
