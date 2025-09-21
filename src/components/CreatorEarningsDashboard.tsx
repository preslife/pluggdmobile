import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, Download } from "lucide-react";
import { toast } from "sonner";

interface EarningsOverview {
  lifetime_gross: number;
  platform_fees: number;
  net_earnings: number;
  pending_amount: number;
  paid_amount: number;
}

interface ContentEarnings {
  content_type: string;
  content_id: string;
  content_title: string;
  gross_amount: number;
  net_amount: number;
  split_breakdown: Array<{
    payee_name: string;
    percent: number;
    amount: number;
  }>;
}

interface PayoutRecord {
  id: string;
  content_type: string;
  content_title: string;
  gross_amount: number;
  net_amount: number;
  payout_status: string;
  processed_at: string | null;
  created_at: string;
}

export const CreatorEarningsDashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [contentEarnings, setContentEarnings] = useState<ContentEarnings[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Load earnings overview
  const loadOverview = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('producer_payouts')
        .select('gross_amount, net_amount, payout_status')
        .eq('producer_id', user.id);

      if (error) throw error;

      const overview: EarningsOverview = {
        lifetime_gross: data.reduce((sum, p) => sum + Number(p.gross_amount), 0),
        platform_fees: data.reduce((sum, p) => sum + (Number(p.gross_amount) - Number(p.net_amount)), 0),
        net_earnings: data.reduce((sum, p) => sum + Number(p.net_amount), 0),
        pending_amount: data.filter(p => p.payout_status === 'pending').reduce((sum, p) => sum + Number(p.net_amount), 0),
        paid_amount: data.filter(p => p.payout_status === 'paid').reduce((sum, p) => sum + Number(p.net_amount), 0)
      };

      setOverview(overview);
    } catch (error) {
      console.error('Error loading overview:', error);
    }
  };

  // Load content earnings with split breakdown
  const loadContentEarnings = async () => {
    if (!user) return;

    try {
      // Get payouts grouped by content
      const { data: payoutData, error: payoutError } = await supabase
        .from('producer_payouts')
        .select(`
          id,
          producer_id,
          beat_id,
          gross_amount,
          net_amount,
          beats!inner(title)
        `)
        .eq('producer_id', user.id);

      if (payoutError) throw payoutError;

      // Process and group by content
      const grouped = new Map<string, ContentEarnings>();

      for (const payout of payoutData || []) {
        const key = `beat-${payout.beat_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            content_type: 'beat',
            content_id: payout.beat_id,
            content_title: (payout.beats as any)?.title || 'Unknown Beat',
            gross_amount: 0,
            net_amount: 0,
            split_breakdown: []
          });
        }

        const content = grouped.get(key)!;
        content.gross_amount += Number(payout.gross_amount);
        content.net_amount += Number(payout.net_amount);
      }

      setContentEarnings(Array.from(grouped.values()));
    } catch (error) {
      console.error('Error loading content earnings:', error);
    }
  };

  // Load payout records
  const loadPayouts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('producer_payouts')
        .select(`
          *,
          beats!inner(title)
        `)
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map(payout => ({
        id: payout.id,
        content_type: 'beat',
        content_title: (payout.beats as any)?.title || 'Unknown Beat',
        gross_amount: Number(payout.gross_amount),
        net_amount: Number(payout.net_amount),
        payout_status: payout.payout_status || 'pending',
        processed_at: payout.processed_at,
        created_at: payout.created_at
      }));

      setPayouts(formatted);
    } catch (error) {
      console.error('Error loading payouts:', error);
    }
  };

  // Check Stripe Connect status
  const checkStripeStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('producer_stripe_accounts')
        .select('onboarding_complete')
        .eq('user_id', user.id)
        .single();

      setStripeConnected(data?.onboarding_complete || false);
    } catch (error) {
      console.log('No Stripe account found');
    }
  };

  // Setup Stripe Connect
  const setupStripeConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error setting up Stripe:', error);
      toast.error('Failed to setup Stripe Connect');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500 text-white">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'disputed':
        return <Badge variant="destructive">Disputed</Badge>;
      case 'on_hold':
        return <Badge variant="secondary">On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        loadOverview(),
        loadContentEarnings(),
        loadPayouts(),
        checkStripeStatus()
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  if (loading) {
    return <div className="p-6">Loading earnings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creator Earnings</h1>
        {!stripeConnected && (
          <Button onClick={setupStripeConnect} className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Set up Payouts
          </Button>
        )}
      </div>

      {!stripeConnected && (
        <Card className="border-orange-200 bg-background">
          <CardContent className="p-4">
            <p className="text-orange-700">
              Complete your Stripe Connect setup to receive payouts for your content sales.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="by-content">By Content</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lifetime Gross</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview?.lifetime_gross || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview?.platform_fees || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview?.pending_amount || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview?.paid_amount || 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-content" className="space-y-4">
          {contentEarnings.map((content) => (
            <Card key={`${content.content_type}-${content.content_id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{content.content_title}</span>
                  <Badge variant="outline" className="capitalize">{content.content_type}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Revenue</p>
                    <p className="text-lg font-semibold">{formatCurrency(content.gross_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Revenue</p>
                    <p className="text-lg font-semibold">{formatCurrency(content.net_amount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <div className="space-y-3">
            {payouts.map((payout) => (
              <Card key={payout.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{payout.content_title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(payout.net_amount)}</p>
                      {getStatusBadge(payout.payout_status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};