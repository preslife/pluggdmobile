import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Crown, Star, Users, Book, Music, Zap, Settings } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const UserTierCard = () => {
  const { subscription, usage, getTierLimits } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Could not open subscription management. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const tier = subscription?.tier || 'free';
  const limits = getTierLimits();

  const tierInfo = {
    free: { name: "Free", icon: Users, color: "text-muted-foreground", bgColor: "bg-card" },
    creator: { name: "Creator", icon: Star, color: "text-primary", bgColor: "bg-card" },
    pro: { name: "Pro", icon: Crown, color: "text-primary", bgColor: "bg-card" }
  };

  const info = tierInfo[tier];
  const Icon = info.icon;

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0; // Unlimited
    return Math.min((current / max) * 100, 100);
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  return (
    <>
      <Card className={`${info.bgColor} border`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${info.color}`} />
              <span>{info.name} Plan</span>
            </div>
            <div className="flex gap-2">
              {tier !== 'pro' && (
                <Button 
                  size="sm" 
                  onClick={() => setShowUpgradeModal(true)}
                  variant="default"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade
                </Button>
              )}
              {tier !== 'free' && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={handleManageSubscription}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Course Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Book className="h-4 w-4" />
                Active Courses
              </div>
              <span className="font-medium text-foreground">
                {usage?.active_courses || 0} / {formatLimit(limits.maxActiveCourses)}
              </span>
            </div>
            {limits.maxActiveCourses !== -1 && (
              <Progress 
                value={getUsagePercentage(usage?.active_courses || 0, limits.maxActiveCourses)}
                className="h-2"
              />
            )}
          </div>

          {/* Tool Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Zap className="h-4 w-4" />
                Daily Tool Usage
              </div>
              <span className="font-medium text-foreground">
                {usage?.tool_usage_today || 0} / {formatLimit(limits.maxToolUsagePerDay)}
              </span>
            </div>
            {limits.maxToolUsagePerDay !== -1 && (
              <Progress 
                value={getUsagePercentage(usage?.tool_usage_today || 0, limits.maxToolUsagePerDay)}
                className="h-2"
              />
            )}
          </div>

          {/* Beat Uploads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Music className="h-4 w-4" />
                Monthly Beats
              </div>
              <span className="font-medium text-foreground">
                {usage?.beats_uploaded_month || 0} / {formatLimit(limits.maxBeatsPerMonth)}
              </span>
            </div>
            {limits.maxBeatsPerMonth !== -1 && (
              <Progress 
                value={getUsagePercentage(usage?.beats_uploaded_month || 0, limits.maxBeatsPerMonth)}
                className="h-2"
              />
            )}
          </div>

          {/* Quick Features List */}
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              {limits.canSellSamplePacks && <div className="text-foreground">✓ Sell Sample Packs</div>}
              {limits.hasAnalyticsDashboard && <div className="text-foreground">✓ Analytics Dashboard</div>}
              {limits.hasFeaturedListings && <div className="text-foreground">✓ Featured Listings</div>}
              {limits.hasPrivateCollabs && <div className="text-foreground">✓ Private Collaborations</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={tier}
      />
    </>
  );
};