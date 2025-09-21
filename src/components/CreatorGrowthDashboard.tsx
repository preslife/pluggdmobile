import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, TrendingUp, Users, DollarSign, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ReferralEarnings } from "@/components/ReferralEarnings";

interface ReferralStats {
  total_orders: number;
  total_revenue: number;
  total_subscriptions: number;
  recent_referrals: any[];
}

export const CreatorGrowthDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    total_orders: 0,
    total_revenue: 0,
    total_subscriptions: 0,
    recent_referrals: []
  });
  const [customReferralCode, setCustomReferralCode] = useState('');
  const [isUpdatingCode, setIsUpdatingCode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchReferralStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setCustomReferralCode(data.referral_code || '');

      // Generate referral code if it doesn't exist
      if (!data.referral_code) {
        await generateReferralCode();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchReferralStats = async () => {
    try {
      // Fetch orders with referrer code
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('referrer_code', profile?.referral_code || '');

      if (ordersError) throw ordersError;

      // Calculate stats
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setReferralStats({
        total_orders: orders?.length || 0,
        total_revenue: totalRevenue,
        total_subscriptions: 0, // TODO: Add subscription tracking
        recent_referrals: orders?.slice(0, 10) || []
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async () => {
    try {
      // Generate based on username or email
      const baseCode = profile?.username || 
                      user?.email?.split('@')[0] || 
                      `creator${Math.random().toString(36).substr(2, 6)}`;
      
      let referralCode = baseCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      let attempts = 0;
      
      // Ensure uniqueness
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', referralCode)
          .single();

        if (!existing) break;
        
        referralCode = `${baseCode}${Math.random().toString(36).substr(2, 3)}`;
        attempts++;
      }

      // Update profile with referral code
      const { error } = await supabase
        .from('profiles')
        .update({ referral_code: referralCode })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile, referral_code: referralCode });
      setCustomReferralCode(referralCode);
      
      toast({
        title: "Referral code generated",
        description: `Your referral code is: ${referralCode}`
      });
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast({
        title: "Error",
        description: "Failed to generate referral code",
        variant: "destructive"
      });
    }
  };

  const updateReferralCode = async () => {
    if (!customReferralCode.trim()) return;

    setIsUpdatingCode(true);
    try {
      // Check if code is available
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', customReferralCode)
        .neq('user_id', user?.id)
        .single();

      if (existing) {
        toast({
          title: "Code taken",
          description: "This referral code is already in use",
          variant: "destructive"
        });
        return;
      }

      // Update code
      const { error } = await supabase
        .from('profiles')
        .update({ referral_code: customReferralCode })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile, referral_code: customReferralCode });
      
      toast({
        title: "Referral code updated",
        description: `Your new referral code is: ${customReferralCode}`
      });
    } catch (error) {
      console.error('Error updating referral code:', error);
      toast({
        title: "Error",
        description: "Failed to update referral code",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingCode(false);
    }
  };

  const copyReferralLink = () => {
    if (!profile?.referral_code) return;
    
    const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    
    toast({
      title: "Link copied",
      description: "Referral link copied to clipboard"
    });
  };

  const shareReferralLink = () => {
    if (!profile?.referral_code) return;

    const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;
    const text = `Check out Pluggd - the ultimate platform for music creators! ${referralLink}`;

    if (navigator.share) {
      navigator.share({
        title: 'Join Pluggd',
        text,
        url: referralLink
      });
    } else {
      // Fallback to copying
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Growth Dashboard</h1>
        <p className="text-muted-foreground">
          Track your referrals and grow the Pluggd community
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralStats.total_orders}</div>
            <p className="text-xs text-muted-foreground">Orders from your referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{referralStats.total_revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total value of referred orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12%</div>
            <p className="text-xs text-muted-foreground">This month vs last</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="referral-link" className="space-y-4">
        <TabsList>
          <TabsTrigger value="referral-link">Referral Link</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="referral-link" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share this link to earn referral credit when people make purchases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Referral Code Management */}
              <div className="space-y-2">
                <Label htmlFor="referral-code">Referral Code</Label>
                <div className="flex space-x-2">
                  <Input
                    id="referral-code"
                    value={customReferralCode}
                    onChange={(e) => setCustomReferralCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="your-custom-code"
                  />
                  <Button onClick={updateReferralCode} disabled={isUpdatingCode}>
                    {isUpdatingCode ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>

              {/* Generated Link */}
              {profile?.referral_code && (
                <div className="space-y-2">
                  <Label>Your Referral Link</Label>
                  <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-sm">
                      {window.location.origin}/?ref={profile.referral_code}
                    </code>
                    <Button size="sm" variant="ghost" onClick={copyReferralLink}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={copyReferralLink} variant="outline" className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button onClick={shareReferralLink} className="flex-1">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Link
                    </Button>
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">How it works</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Share your referral link with friends and followers</li>
                  <li>• When someone makes a purchase using your link, you get credit</li>
                  <li>• Track your referral performance in this dashboard</li>
                  <li>• Future: Earn rewards based on successful referrals</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Referral Activity</CardTitle>
              <CardDescription>
                Latest orders from your referral link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralStats.recent_referrals.length > 0 ? (
                <div className="space-y-3">
                  {referralStats.recent_referrals.map((order, index) => (
                    <div key={order.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Order #{order.id?.substr(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>£{order.total_amount?.toFixed(2) || '0.00'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No referral activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start sharing your referral link to see activity here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <ReferralEarnings />
        </TabsContent>
      </Tabs>
    </div>
  );
};