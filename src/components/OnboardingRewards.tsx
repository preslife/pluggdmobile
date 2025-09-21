import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { trackPhase4Events } from "@/lib/analytics";

interface OnboardingProgress {
  completed_at: string | null;
  completed_tasks: string[];
  rewards_claimed: boolean;
}

export function OnboardingRewards() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user]);

  const fetchProgress = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      const progressData = data?.onboarding_progress as unknown as OnboardingProgress | null;
      setProgress(progressData || {
        completed_at: null,
        completed_tasks: [],
        rewards_claimed: false
      });
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    if (!user || !progress || progress.rewards_claimed) return;
    
    setClaiming(true);
    try {
      // Add 200 credits to user's wallet
      const { error: walletError } = await supabase
        .from('wallet_ledger')
        .insert({
          user_id: user.id,
          amount_credits: 200,
          kind: 'onboarding_bonus',
          description: 'Onboarding completion bonus'
        });

      if (walletError) throw walletError;

      // Update onboarding progress
      const { error: progressError } = await supabase
        .from('profiles')
        .update({
          onboarding_progress: {
            ...progress,
            rewards_claimed: true
          }
        })
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Track reward claim
      await trackPhase4Events.onboardingRewardsClaimed(200);

      setProgress(prev => prev ? { ...prev, rewards_claimed: true } : null);
      toast.success("🎉 Congratulations! 200 Credits added to your wallet!");
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast.error("Failed to claim rewards. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!progress) return null;

  const isCompleted = progress.completed_at !== null;
  const canClaimRewards = isCompleted && !progress.rewards_claimed;
  const completedTasksCount = progress.completed_tasks?.length || 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Onboarding Rewards</CardTitle>
          {progress.rewards_claimed && (
            <Badge variant="secondary" className="ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Claimed
            </Badge>
          )}
        </div>
        <CardDescription>
          Complete onboarding to unlock your creator rewards
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Summary */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">Tasks Completed</span>
          </div>
          <Badge variant={isCompleted ? "default" : "secondary"}>
            {completedTasksCount}/6
          </Badge>
        </div>

        {/* Reward Details */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Completion Rewards:</h4>
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span>💰 Credits Bonus</span>
              <span className="font-mono">200 Credits</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>🎯 Creator Profile</span>
              <span className="text-green-600">Unlocked</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>🚀 Premium Features</span>
              <span className="text-green-600">Access Granted</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {canClaimRewards ? (
          <Button 
            onClick={claimRewards} 
            disabled={claiming}
            className="w-full"
            size="lg"
          >
            {claiming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Claiming Rewards...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Claim Your Rewards
              </>
            )}
          </Button>
        ) : progress.rewards_claimed ? (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Rewards already claimed! Check your wallet.
            </p>
          </div>
        ) : (
          <Button disabled className="w-full" size="lg">
            Complete Onboarding to Unlock
          </Button>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((completedTasksCount / 6) * 100, 100)}%` }}
          />
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {isCompleted 
            ? "🎉 Onboarding completed! You're ready to create." 
            : `${6 - completedTasksCount} tasks remaining`
          }
        </p>
      </CardContent>
    </Card>
  );
}