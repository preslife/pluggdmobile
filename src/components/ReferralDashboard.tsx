import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, formatCreditsWithGBP } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { ShareToEarnModal } from "@/components/ShareToEarnModal";
import { Copy, Share2, Users, Gift, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ReferralDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
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
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = async () => {
    if (profile?.referral_code) {
      await navigator.clipboard.writeText(profile.referral_code);
      toast({
        title: "Referral code copied!",
        description: "Share it with friends to earn rewards",
      });
    }
  };

  const copyReferralLink = async () => {
    if (profile?.referral_code) {
      const link = `${window.location.origin}?ref=${profile.referral_code}`;
      await navigator.clipboard.writeText(link);
      toast({
        title: "Referral link copied!",
        description: "Share it with friends to earn rewards",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Referral Dashboard</h1>
          <p className="text-muted-foreground">Invite friends and earn rewards together</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Total Referrals</CardDescription>
            <CardTitle className="text-2xl">
              {profile?.referral_signups_count || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Friends joined</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Rewards Earned</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCreditsWithGBP(profile?.referral_rewards_earned || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">From referrals</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Your Referral Code</CardDescription>
            <CardTitle className="text-lg font-mono">
              {profile?.referral_code || 'LOADING...'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralCode}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sharing Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share & Earn
            </CardTitle>
            <CardDescription>
              Share Pluggd with friends and earn rewards when they join
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Referral Link</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}?ref=${profile?.referral_code || ''}`}
                  className="font-mono text-xs"
                />
                <Button variant="outline" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <ShareToEarnModal
              shareUrl={`${window.location.origin}?ref=${profile?.referral_code || ''}`}
              shareTitle="Join me on Pluggd!"
              shareDescription="Discover amazing beats and connect with creators on Pluggd.fm"
            >
              <Button className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                Share on Social Media
              </Button>
            </ShareToEarnModal>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Reward Structure
            </CardTitle>
            <CardDescription>
              How you and your friends earn rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Friend signs up</span>
                <Badge variant="secondary">200 Credits (£2) each</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Friend's first £5+ purchase</span>
                <Badge variant="secondary">1,000 Credits (£10) to you</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Friend starts subscription</span>
                <Badge variant="secondary">2,000 Credits (£20) each</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Share link signup</span>
                <Badge variant="secondary">200 Credits (£2) to you</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Referral Activity
          </CardTitle>
          <CardDescription>
            Your latest referral rewards and friend activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Referral signup bonus</p>
                  <p className="text-xs text-muted-foreground">2 days ago</p>
                </div>
              </div>
              <span className="text-sm font-medium text-green-600">+200 Credits (£2)</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Friend joined Pluggd</p>
                  <p className="text-xs text-muted-foreground">3 days ago</p>
                </div>
              </div>
              <Badge variant="outline">New referral</Badge>
            </div>
            
            <Button variant="link" className="w-full" size="sm">
              View all activity →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};