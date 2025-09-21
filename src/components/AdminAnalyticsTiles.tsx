import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  UserPlus, 
  Share2, 
  Eye,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AnalyticsData {
  dau: number;
  wau: number;
  totalCreditsTopup: number;
  totalCreditsTip: number;
  totalCreditsPurchase: number;
  firstEarningsCount: number;
  subscriptionCount: number;
  referralFunnel: {
    clicks: number;
    signups: number;
    rewards: number;
  };
  shareToEarnFunnel: {
    prompts: number;
    copies: number;
    signups: number;
  };
  embedStats: {
    impressions: number;
    clicks: number;
  };
}

export const AdminAnalyticsTiles = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('7d');
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch analytics events
      const { data: analyticsEvents, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEvents(analyticsEvents || []);

      // Calculate metrics
      const uniqueUsers = new Set(analyticsEvents?.map(e => e.user_id).filter(Boolean));
      const dau = uniqueUsers.size;
      
      // Weekly active users (last 7 days within the period)
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weeklyEvents = analyticsEvents?.filter(e => 
        new Date(e.created_at) >= weekStart
      ) || [];
      const weeklyUsers = new Set(weeklyEvents.map(e => e.user_id).filter(Boolean));
      const wau = weeklyUsers.size;

      // Credit events
      const creditEvents = analyticsEvents?.filter(e => 
        e.event_name.includes('credit') || 
        e.event_name.includes('topup') ||
        e.event_name.includes('spend')
      ) || [];

      const totalCreditsTopup = creditEvents
        .filter(e => e.event_name.includes('topup'))
        .reduce((sum, e) => sum + (typeof e.properties === 'object' && e.properties && 'amount_credits' in e.properties ? Number(e.properties.amount_credits) || 0 : 0), 0);

      const totalCreditsTip = creditEvents
        .filter(e => e.event_name === 'spend_tip')
        .reduce((sum, e) => sum + (typeof e.properties === 'object' && e.properties && 'amount_credits' in e.properties ? Number(e.properties.amount_credits) || 0 : 0), 0);

      const totalCreditsPurchase = creditEvents
        .filter(e => e.event_name === 'spend_purchase')
        .reduce((sum, e) => sum + (typeof e.properties === 'object' && e.properties && 'amount_credits' in e.properties ? Number(e.properties.amount_credits) || 0 : 0), 0);

      // Monetization
      const firstEarningsCount = analyticsEvents?.filter(e => 
        e.event_name === 'first_earnings'
      ).length || 0;

      const subscriptionCount = analyticsEvents?.filter(e => 
        e.event_name === 'subscription_started'
      ).length || 0;

      // Referral funnel
      const referralClicks = analyticsEvents?.filter(e => 
        e.event_name === 'referral_click'
      ).length || 0;
      
      const referralSignups = analyticsEvents?.filter(e => 
        e.event_name === 'referral_signup'
      ).length || 0;
      
      const referralRewards = analyticsEvents?.filter(e => 
        e.event_name === 'reward_granted' && 
        typeof e.properties === 'object' && e.properties && 'program' in e.properties && e.properties.program === 'referral'
      ).length || 0;

      // Share-to-earn funnel
      const sharePrompts = analyticsEvents?.filter(e => 
        e.event_name === 'share_prompt_shown'
      ).length || 0;
      
      const shareCopies = analyticsEvents?.filter(e => 
        e.event_name === 'share_link_copied'
      ).length || 0;
      
      const shareSignups = analyticsEvents?.filter(e => 
        e.event_name === 'share_signup'
      ).length || 0;

      // Embed stats
      const embedImpressions = analyticsEvents?.filter(e => 
        e.event_name === 'embed_impression'
      ).length || 0;
      
      const embedClicks = analyticsEvents?.filter(e => 
        e.event_name === 'embed_click'
      ).length || 0;

      setData({
        dau,
        wau,
        totalCreditsTopup,
        totalCreditsTip,
        totalCreditsPurchase,
        firstEarningsCount,
        subscriptionCount,
        referralFunnel: {
          clicks: referralClicks,
          signups: referralSignups,
          rewards: referralRewards
        },
        shareToEarnFunnel: {
          prompts: sharePrompts,
          copies: shareCopies,
          signups: shareSignups
        },
        embedStats: {
          impressions: embedImpressions,
          clicks: embedClicks
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    const csvContent = [
      ['Event Name', 'User ID', 'Created At', 'Properties'],
      ...events.map(event => [
        event.event_name,
        event.user_id || 'Anonymous',
        event.created_at,
        JSON.stringify(event.properties || {})
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCsv} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.dau}</div>
            <p className="text-xs text-muted-foreground">
              WAU: {data.wau}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Activity</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCreditsTopup}</div>
            <p className="text-xs text-muted-foreground">
              Tips: {data.totalCreditsTip} | Purchases: {data.totalCreditsPurchase}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monetization</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.firstEarningsCount}</div>
            <p className="text-xs text-muted-foreground">
              Subscriptions: {data.subscriptionCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embeds</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.embedStats.impressions}</div>
            <p className="text-xs text-muted-foreground">
              Clicks: {data.embedStats.clicks}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Referral Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Clicks</span>
                <span className="font-bold">{data.referralFunnel.clicks}</span>
              </div>
              <div className="flex justify-between">
                <span>Signups</span>
                <span className="font-bold">{data.referralFunnel.signups}</span>
              </div>
              <div className="flex justify-between">
                <span>Rewards Granted</span>
                <span className="font-bold">{data.referralFunnel.rewards}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Conversion: {data.referralFunnel.clicks > 0 ? 
                  ((data.referralFunnel.signups / data.referralFunnel.clicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share-to-Earn Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Prompts Shown</span>
                <span className="font-bold">{data.shareToEarnFunnel.prompts}</span>
              </div>
              <div className="flex justify-between">
                <span>Links Copied</span>
                <span className="font-bold">{data.shareToEarnFunnel.copies}</span>
              </div>
              <div className="flex justify-between">
                <span>Share Signups</span>
                <span className="font-bold">{data.shareToEarnFunnel.signups}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Copy Rate: {data.shareToEarnFunnel.prompts > 0 ? 
                  ((data.shareToEarnFunnel.copies / data.shareToEarnFunnel.prompts) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.slice(0, 10).map((event, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{event.event_name}</TableCell>
                  <TableCell>{event.user_id ? event.user_id.substring(0, 8) + '...' : 'Anonymous'}</TableCell>
                  <TableCell>{new Date(event.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-40 truncate">
                    {JSON.stringify(event.properties || {})}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};