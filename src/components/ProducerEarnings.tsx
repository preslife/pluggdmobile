import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Clock, CheckCircle, ExternalLink, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface StripeAccount {
  id: string;
  stripe_account_id: string;
  onboarding_complete: boolean | null;
  account_status: string | null;
  created_at: string | null;
}

interface EarningsSummary {
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  this_month_earnings: number;
  total_sales_count: number;
  total_sales_volume: number;
}

interface BeatSale {
  id: string;
  beat_id: string;
  license_type: string;
  sale_price: number;
  producer_earnings: number;
  platform_fee: number;
  payout_status: string;
  created_at: string;
  beats?: {
    title: string;
  };
}

const ProducerEarnings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stripeAccount, setStripeAccount] = useState<StripeAccount | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null);
  const [beatSales, setBeatSales] = useState<BeatSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      // Fetch Stripe account
      const { data: stripeData, error: stripeError } = await supabase
        .from('producer_stripe_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (stripeError && stripeError.code !== 'PGRST116') throw stripeError;
      setStripeAccount(stripeData);

      // Fetch earnings summary using the database function
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_producer_earnings_summary', { p_producer_id: user?.id });

      if (summaryError) throw summaryError;
      setEarningsSummary(summaryData ? summaryData as unknown as EarningsSummary : {
        total_earnings: 0,
        pending_earnings: 0,
        paid_earnings: 0,
        this_month_earnings: 0,
        total_sales_count: 0,
        total_sales_volume: 0
      });

      // Fetch recent beat sales
      const { data: salesData, error: salesError } = await supabase
        .from('beat_sales')
        .select(`
          *,
          beats:beat_id (
            title
          )
        `)
        .eq('producer_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (salesError) throw salesError;
      setBeatSales(salesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupStripeAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to create Stripe account",
          variant: "destructive",
        });
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to setup payout account",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading earnings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(earningsSummary?.total_earnings || 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold">{formatCurrency(earningsSummary?.pending_earnings || 0)}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(earningsSummary?.this_month_earnings || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{earningsSummary?.total_sales_count || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Account Setup */}
      {!stripeAccount?.onboarding_complete && (
        <Card className="border-orange-200 bg-background">
          <CardHeader>
            <CardTitle className="text-orange-700">Payout Account Required</CardTitle>
            <CardDescription className="text-orange-500">
              To receive payouts for your beat sales, you need to set up a Stripe Connect account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={setupStripeAccount} className="bg-orange-600 hover:bg-orange-700">
              <ExternalLink className="h-4 w-4 mr-2" />
              {stripeAccount ? 'Complete Account Setup' : 'Set Up Payout Account'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Earnings List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Beat Sales</CardTitle>
          <CardDescription>
            Your latest beat sales and earnings ({beatSales.length} sales)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {beatSales.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-2">No sales yet</p>
              <p>Start selling your beats to see earnings here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {beatSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{sale.beats?.title || 'Unknown Beat'}</p>
                        <p className="text-sm text-muted-foreground">
                          {sale.license_type} license • {new Date(sale.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold">{formatCurrency(sale.producer_earnings)}</p>
                    <Badge 
                      variant={sale.payout_status === 'paid' ? 'default' : 
                               sale.payout_status === 'pending' ? 'secondary' : 'destructive'}
                    >
                      {sale.payout_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProducerEarnings;