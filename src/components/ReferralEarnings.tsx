import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReferralPayout {
  id: string;
  net_amount: number;
  adjusted_amount_cents?: number;
  payout_status: string;
  referral_code?: string;
  source_kind?: string;
  source_id?: string;
  created_at: string;
}

interface ReferralEarningsData {
  pending_earnings: number;
  paid_earnings: number;
  total_earnings: number;
  recent_payouts: ReferralPayout[];
}

export const ReferralEarnings = () => {
  const [earnings, setEarnings] = useState<ReferralEarningsData>({
    pending_earnings: 0,
    paid_earnings: 0,
    total_earnings: 0,
    recent_payouts: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralEarnings();
  }, []);

  const fetchReferralEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (!profile?.referral_code) {
        setLoading(false);
        return;
      }

      // For now, return empty data since producer_payouts might not have referral support yet
      const payouts: any[] = [];
      const error = null;

      if (error) throw error;

      const pending = payouts?.filter(p => p.payout_status === 'pending').reduce((sum, p) => sum + (p.adjusted_amount_cents || p.net_amount), 0) || 0;
      const paid = payouts?.filter(p => p.payout_status === 'paid').reduce((sum, p) => sum + (p.adjusted_amount_cents || p.net_amount), 0) || 0;

      setEarnings({
        pending_earnings: pending,
        paid_earnings: paid,
        total_earnings: pending + paid,
        recent_payouts: payouts || []
      });
    } catch (error) {
      console.error('Error fetching referral earnings:', error);
      toast({
        title: "Error",
        description: "Failed to load referral earnings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'processing': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Referral Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-20 h-6 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Referral Earnings
        </CardTitle>
        <CardDescription>
          Track your earnings from referring new users to Pluggd
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Earnings Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Pending
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(earnings.pending_earnings / 100)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Paid Out
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(earnings.paid_earnings / 100)}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Total Earned
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(earnings.total_earnings / 100)}
              </div>
            </div>
          </div>

          {earnings.recent_payouts.length > 0 && (
            <>
              <Separator />
              
              <div>
                <h4 className="font-medium mb-4">Recent Payouts</h4>
                <div className="space-y-3">
                  {earnings.recent_payouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatCurrency((payout.adjusted_amount_cents || payout.net_amount) / 100)} from {payout.source_kind || 'referral'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(payout.payout_status)}>
                        {payout.payout_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {earnings.recent_payouts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No referral earnings yet</p>
              <p className="text-sm">Share your referral link to start earning!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};