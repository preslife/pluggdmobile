import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp, DollarSign, Trophy, Ticket, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreatorAnalyticsV2 } from "./CreatorAnalyticsV2";
import { AudienceInsights } from "./AudienceInsights";

interface RevenueData {
  date: string;
  battle_revenue_cents: number;
  event_revenue_cents: number;
  fan_subscription_revenue: number;
  total_revenue: number;
}

interface Transaction {
  id: string;
  amount_cents: number;
  type: string;
  created_at: string;
  source: string;
}

export const CreatorRevenueAnalytics = () => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('30');
  const { toast } = useToast();

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeframe));

      // Fetch creator metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('creator_metrics')
        .select('*')
        .eq('creator_id', user.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (metricsError) throw metricsError;

      const processedData = (metrics || []).map(metric => ({
        date: metric.metric_date,
        battle_revenue_cents: metric.battle_revenue_cents || 0,
        event_revenue_cents: metric.event_revenue_cents || 0,
        fan_subscription_revenue: metric.revenue_cents || 0,
        total_revenue: (metric.battle_revenue_cents || 0) + 
                      (metric.event_revenue_cents || 0) + 
                      (metric.revenue_cents || 0),
      }));

      setRevenueData(processedData);

      // Fetch recent transactions
      await fetchTransactions(user.id, startDate);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (userId: string, startDate: Date) => {
    try {
      // Battle transactions
      const { data: battleTx } = await supabase
        .from('battle_transactions')
        .select('id, amount_cents, type, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Event tickets (as creator)
      const { data: eventTx } = await supabase
        .from('event_tickets')
        .select(`
          id,
          created_at,
          events!inner(created_by, title)
        `)
        .eq('events.created_by', userId)
        .eq('payment_status', 'completed')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Fan subscriptions
      const { data: fanSubs } = await supabase
        .from('fan_subscriptions')
        .select('id, price_cents, created_at')
        .eq('creator_id', userId)
        .eq('status', 'active')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      const allTransactions: Transaction[] = [
        ...(battleTx || []).map(tx => ({
          id: tx.id,
          amount_cents: tx.amount_cents,
          type: tx.type,
          created_at: tx.created_at,
          source: 'battle',
        })),
        ...(eventTx || []).map(tx => ({
          id: tx.id,
          amount_cents: 500, // Default event ticket price
          type: 'ticket_sale',
          created_at: tx.created_at,
          source: 'event',
        })),
        ...(fanSubs || []).map(sub => ({
          id: sub.id,
          amount_cents: sub.price_cents,
          type: 'subscription',
          created_at: sub.created_at,
          source: 'fan_subscription',
        })),
      ];

      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(allTransactions.slice(0, 20)); // Show latest 20

    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getTotalRevenue = () => {
    return revenueData.reduce((sum, data) => sum + data.total_revenue, 0);
  };

  const getBattleRevenue = () => {
    return revenueData.reduce((sum, data) => sum + data.battle_revenue_cents, 0);
  };

  const getEventRevenue = () => {
    return revenueData.reduce((sum, data) => sum + data.event_revenue_cents, 0);
  };

  const getFanSubRevenue = () => {
    return revenueData.reduce((sum, data) => sum + data.fan_subscription_revenue, 0);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'battle':
        return <Trophy className="h-4 w-4" />;
      case 'event':
        return <Ticket className="h-4 w-4" />;
      case 'fan_subscription':
        return <Users className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string, source: string) => {
    if (source === 'battle') return type === 'payout' ? 'Battle Win' : 'Battle Entry';
    if (source === 'event') return 'Event Ticket';
    if (source === 'fan_subscription') return 'Fan Subscription';
    return type;
  };

  useEffect(() => {
    fetchRevenueData();
  }, [timeframe]);

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Revenue Analytics</h2>
              <p className="text-muted-foreground">
                Track your earnings across battles, events, and fan subscriptions
              </p>
            </div>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getTotalRevenue())}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Battle Winnings</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getBattleRevenue())}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Event Revenue</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getEventRevenue())}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fan Subscriptions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getFanSubRevenue())}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No transactions found for the selected timeframe
                </p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getSourceIcon(tx.source)}
                        <div>
                          <p className="font-medium">{getTypeLabel(tx.type, tx.source)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">
                          +{formatCurrency(tx.amount_cents)}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {tx.source.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <CreatorAnalyticsV2 />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <CreatorAnalyticsV2 />
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          <CreatorAnalyticsV2 />
        </TabsContent>
        
        <TabsContent value="audience" className="space-y-6">
          <AudienceInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
};