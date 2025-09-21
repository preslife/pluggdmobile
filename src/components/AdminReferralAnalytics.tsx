import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCreditsWithGBP } from "@/hooks/useWallet";
import { Users, Gift, TrendingUp, DollarSign } from "lucide-react";

interface ReferralStats {
  totalReferrals: number;
  totalRewardsDistributed: number;
  activeReferrers: number;
  conversionRate: number;
  topReferrers: any[];
  recentActivity: any[];
}

export const AdminReferralAnalytics = () => {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalRewardsDistributed: 0,
    activeReferrers: 0,
    conversionRate: 0,
    topReferrers: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      // Get total referrals
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('referral_signups_count, referral_rewards_earned, username, full_name')
        .order('referral_signups_count', { ascending: false });

      if (profilesError) throw profilesError;

      // Get recent referral activity from wallet ledger
      const { data: ledger, error: ledgerError } = await supabase
        .from('wallet_ledger')
        .select('*')
        .in('kind', ['referral_signup', 'referral_purchase', 'share_signup'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (ledgerError) throw ledgerError;

      const totalReferrals = profiles?.reduce((sum, p) => sum + (p.referral_signups_count || 0), 0) || 0;
      const totalRewards = profiles?.reduce((sum, p) => sum + (p.referral_rewards_earned || 0), 0) || 0;
      const activeReferrers = profiles?.filter(p => (p.referral_signups_count || 0) > 0).length || 0;

      setStats({
        totalReferrals,
        totalRewardsDistributed: totalRewards,
        activeReferrers,
        conversionRate: totalReferrals > 0 ? (activeReferrers / totalReferrals) * 100 : 0,
        topReferrers: profiles?.slice(0, 5) || [],
        recentActivity: ledger || []
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading referral analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Referral Analytics</h1>
          <p className="text-muted-foreground">Monitor referral program performance</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Referrals</CardDescription>
            <CardTitle className="text-2xl">{stats.totalReferrals}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Users referred</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Active Referrers</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.activeReferrers}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Users making referrals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Rewards</CardDescription>
            <CardTitle className="text-xl text-green-600">
              {formatCreditsWithGBP(stats.totalRewardsDistributed)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Credits distributed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Conversion Rate</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              {stats.conversionRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Referrer success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Referrers
            </CardTitle>
            <CardDescription>
              Users with the most successful referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topReferrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {referrer.full_name || referrer.username || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {referrer.referral_signups_count || 0} referrals
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    {formatCreditsWithGBP(referrer.referral_rewards_earned || 0)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest referral rewards and events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Gift className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {activity.kind === 'referral_signup' && 'Signup Bonus'}
                        {activity.kind === 'referral_purchase' && 'Purchase Reward'}
                        {activity.kind === 'share_signup' && 'Share Reward'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-green-600">
                    +{formatCreditsWithGBP(activity.amount_credits)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};