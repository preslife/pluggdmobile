import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';

interface EarningsSummary {
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  this_month_earnings: number;
  total_sales_count: number;
}

const EarningsSummaryWidget = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSummary();
    }
  }, [user?.id]);

  const fetchSummary = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_producer_earnings_summary', { p_producer_id: user?.id });

      if (error) throw error;
      setSummary(data ? data as unknown as EarningsSummary : {
        total_earnings: 0,
        pending_earnings: 0,
        paid_earnings: 0,
        this_month_earnings: 0,
        total_sales_count: 0
      });
    } catch (error) {
      console.error('Error fetching earnings summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
          <CardDescription>Track your beat sales earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No earnings data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Earnings Overview
        </CardTitle>
        <CardDescription>Your beat sales performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Total Earnings
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(summary.total_earnings)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Pending
            </div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(summary.pending_earnings)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              This Month
            </div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(summary.this_month_earnings)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              Total Sales
            </div>
            <div className="text-lg font-semibold">
              {summary.total_sales_count}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EarningsSummaryWidget;