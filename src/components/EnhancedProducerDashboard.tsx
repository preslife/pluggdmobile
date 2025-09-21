import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  CircleDollarSign, 
  Calendar, 
  TrendingUp, 
  Music, 
  Users, 
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface ProducerStats {
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  totalSales: number;
  beatsCount: number;
  payoutsCount: number;
}

interface StripeAccount {
  stripe_account_id: string;
  onboarding_complete: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  capabilities: any;
  country: string;
  default_currency: string;
}

interface BeatSale {
  id: string;
  beat_title: string;
  license_type: string;
  sale_price: number;
  producer_earnings: number;
  payout_status: string;
  created_at: string;
  buyer_name?: string;
}

const EnhancedProducerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProducerStats | null>(null);
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [beatSales, setBeatSales] = useState<BeatSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      // Fetch earnings summary
      const { data: earningsData } = await supabase
        .rpc('get_producer_earnings_summary', { p_producer_id: user.id });

      if (earningsData && typeof earningsData === 'object') {
        const summary = earningsData as any;
        setStats({
          totalEarnings: summary.total_earnings || 0,
          pendingEarnings: summary.pending_earnings || 0,
          thisMonthEarnings: summary.this_month_earnings || 0,
          totalSales: summary.total_sales_count || 0,
          beatsCount: 0, // We can fetch this separately if needed
          payoutsCount: 0, // We can fetch this separately if needed
        });
      }

      // Fetch Stripe account status
      const { data: stripeData } = await supabase
        .from('producer_stripe_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (stripeData) {
        setStripeAccount({
          stripe_account_id: stripeData.stripe_account_id || '',
          onboarding_complete: stripeData.onboarding_complete || false,
          payouts_enabled: stripeData.payouts_enabled || false,
          details_submitted: stripeData.details_submitted || false,
          capabilities: stripeData.capabilities || {},
          country: stripeData.country || 'GB',
          default_currency: stripeData.default_currency || 'gbp',
        });
      }

      // Fetch recent beat sales
      const { data: salesData } = await supabase
        .from('beat_sales')
        .select(`
          id,
          sale_price,
          producer_earnings,
          payout_status,
          created_at,
          license_type
        `)
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setBeatSales((salesData || []).map((sale: any) => ({
        id: sale.id,
        beat_title: 'Beat Sale', // Default title since we don't have beat_title in beat_sales
        license_type: sale.license_type || 'Standard',
        sale_price: sale.sale_price || 0,
        producer_earnings: sale.producer_earnings || 0,
        payout_status: sale.payout_status || 'pending',
        created_at: sale.created_at,
        buyer_name: undefined,
      })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStripeStatus = async () => {
    if (!user?.id) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-stripe-account-status', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Stripe account status has been refreshed",
      });

      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Error refreshing Stripe status:', error);
      toast({
        title: "Error",
        description: "Failed to refresh Stripe status",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const setupStripeConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast({
        title: "Error",
        description: "Failed to setup Stripe Connect account",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const getAccountStatusBadge = () => {
    if (!stripeAccount) {
      return <Badge variant="outline">Not Connected</Badge>;
    }

    if (stripeAccount.onboarding_complete && stripeAccount.payouts_enabled) {
      return <Badge variant="default" className="bg-success text-success-foreground">Active</Badge>;
    }

    if (stripeAccount.details_submitted) {
      return <Badge variant="secondary">Pending Verification</Badge>;
    }

    return <Badge variant="destructive">Setup Required</Badge>;
  };

  const getOnboardingProgress = () => {
    if (!stripeAccount) return 0;
    
    let progress = 0;
    if (stripeAccount.stripe_account_id) progress += 33;
    if (stripeAccount.details_submitted) progress += 33;
    if (stripeAccount.payouts_enabled) progress += 34;
    
    return Math.min(progress, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Producer Dashboard</h1>
          <p className="text-muted-foreground">Manage your beats, earnings, and payouts</p>
        </div>
        <Button 
          onClick={refreshStripeStatus} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats?.totalEarnings?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats?.pendingEarnings?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats?.thisMonthEarnings?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Payout Account
                {getAccountStatusBadge()}
              </CardTitle>
              <CardDescription>
                Set up your Stripe Connect account to receive payouts
              </CardDescription>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripeAccount ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Stripe account to start receiving payouts for your beat sales.
              </p>
              <Button onClick={setupStripeConnect} className="w-full">
                Connect Stripe Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Setup Progress</span>
                  <span>{getOnboardingProgress()}%</span>
                </div>
                <Progress value={getOnboardingProgress()} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {stripeAccount.details_submitted ? 
                    <CheckCircle className="h-4 w-4 text-success" /> : 
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  }
                  Details Submitted
                </div>
                <div className="flex items-center gap-2">
                  {stripeAccount.onboarding_complete ? 
                    <CheckCircle className="h-4 w-4 text-success" /> : 
                    <AlertCircle className="h-4 w-4 text-warning" />
                  }
                  Account Active
                </div>
                <div className="flex items-center gap-2">
                  {stripeAccount.payouts_enabled ? 
                    <CheckCircle className="h-4 w-4 text-success" /> : 
                    <AlertCircle className="h-4 w-4 text-warning" />
                  }
                  Payouts Enabled
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {stripeAccount.country?.toUpperCase()} • {stripeAccount.default_currency?.toUpperCase()}
                  </span>
                </div>
              </div>

              {!stripeAccount.onboarding_complete && (
                <Button onClick={setupStripeConnect} variant="outline" className="w-full">
                  Complete Setup
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Beat Sales</CardTitle>
          <CardDescription>Your latest beat sales and payout status</CardDescription>
        </CardHeader>
        <CardContent>
          {beatSales.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No sales yet. Start uploading beats to see your earnings here!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beat</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Your Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beatSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.beat_title}</TableCell>
                    <TableCell>{sale.license_type}</TableCell>
                    <TableCell>£{sale.sale_price.toFixed(2)}</TableCell>
                    <TableCell>£{sale.producer_earnings.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          sale.payout_status === 'paid' ? 'default' : 
                          sale.payout_status === 'pending' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {sale.payout_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedProducerDashboard;