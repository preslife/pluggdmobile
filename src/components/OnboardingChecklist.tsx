import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, 
  Circle, 
  User, 
  CreditCard, 
  Music, 
  Heart,
  Share2,
  Smartphone,
  Gift,
  ExternalLink
} from "lucide-react";
import { trackPhase4Events } from "@/lib/analytics";
import { OnboardingRewards } from "./OnboardingRewards";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  icon: any;
  action?: string;
  actionUrl?: string;
  completed: boolean;
}

interface OnboardingProgress {
  completed_tasks: string[];
  completed_at: string | null;
  rewards_claimed: boolean;
  [key: string]: any; // Make it compatible with Json type
}

export const OnboardingChecklist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [progress, setProgress] = useState<OnboardingProgress>({
    completed_tasks: [],
    completed_at: null,
    rewards_claimed: false
  });
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);

  const tasks: OnboardingTask[] = [
    {
      id: 'complete_profile',
      title: 'Complete Your Profile',
      description: 'Add your bio, avatar, and social links',
      icon: User,
      action: 'Edit Profile',
      actionUrl: '/dashboard',
      completed: false
    },
    {
      id: 'connect_stripe',
      title: 'Connect Stripe Account',
      description: 'Set up payouts to receive earnings',
      icon: CreditCard,
      action: 'Connect Stripe',
      actionUrl: '/dashboard',
      completed: false
    },
    {
      id: 'publish_content',
      title: 'Publish First Content',
      description: 'Upload your first release or beat',
      icon: Music,
      action: 'Upload Content',
      actionUrl: '/dashboard',
      completed: false
    },
    {
      id: 'enable_tips',
      title: 'Enable Tip Jar',
      description: 'Let fans support you with tips',
      icon: Heart,
      action: 'Enable Tips',
      actionUrl: '/dashboard',
      completed: false
    },
    {
      id: 'connect_social',
      title: 'Connect Social Media',
      description: 'Link Instagram, Twitter, or Discord',
      icon: Share2,
      action: 'Connect Socials',
      actionUrl: '/dashboard',
      completed: false
    },
    {
      id: 'install_pwa',
      title: 'Install App',
      description: 'Install Pluggd as a mobile app and enable notifications',
      icon: Smartphone,
      action: 'Install App',
      completed: false
    }
  ];

  useEffect(() => {
    if (user) {
      fetchProgress();
      // Auto-check completion for users who finished the quiz
      checkInitialCompletionStatus();
    }
  }, [user]);

  const checkInitialCompletionStatus = async () => {
    try {
      // Check if user completed onboarding flow (has user_type set)
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, onboarding_completed, is_creator')
        .eq('user_id', user?.id)
        .single();

      if (profile?.onboarding_completed || profile?.user_type) {
        // Auto-complete some basic tasks for users who finished the quiz
        const autoCompleteTasks = ['enable_tips']; // Tips are enabled by default
        
        // If they're a creator, they likely completed profile setup
        if (profile?.is_creator || profile?.user_type === 'producer') {
          autoCompleteTasks.push('complete_profile');
        }

        for (const taskId of autoCompleteTasks) {
          await checkTaskCompletion(taskId);
        }
      }
    } catch (error) {
      console.error('Error checking initial completion status:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_progress')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data?.onboarding_progress) {
        setProgress(data.onboarding_progress as OnboardingProgress);
      }
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    }
    setLoading(false);
  };

  const checkTaskCompletion = async (taskId: string) => {
    setChecking(taskId);
    
    try {
      let isCompleted = false;

      switch (taskId) {
        case 'complete_profile': {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('bio, avatar_url, username, user_type, onboarding_completed')
            .eq('user_id', user?.id)
            .single();
          // Consider complete if they have basic info OR completed onboarding quiz
          isCompleted = !!(
            (profileData?.bio && profileData?.avatar_url && profileData?.username) ||
            (profileData?.user_type && profileData?.onboarding_completed)
          );
          break;
        }
        case 'connect_stripe': {
          const { data: stripe } = await supabase
            .from('producer_stripe_accounts')
            .select('onboarding_complete')
            .eq('user_id', user?.id)
            .single();
          isCompleted = stripe?.onboarding_complete || false;
          break;
        }
        case 'publish_content': {
          const { data: releases } = await supabase
            .from('releases')
            .select('id')
            .eq('user_id', user?.id)
            .limit(1);
          const { data: beats } = await supabase
            .from('beats')
            .select('id')
            .eq('user_id', user?.id)
            .limit(1);
          isCompleted = (releases?.length || 0) > 0 || (beats?.length || 0) > 0;
          break;
        }
        case 'enable_tips': {
          // Auto-complete for all users (tips are enabled by default)
          const { data: profileTip } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('user_id', user?.id)
            .single();
          isCompleted = !!profileTip?.user_type; // If they completed quiz, tips are enabled
          break;
        }
        case 'connect_social': {
          const { data: social } = await supabase
            .from('profiles')
            .select('discord_guild_id, mailchimp_status')
            .eq('user_id', user?.id)
            .single();
          isCompleted = !!(social?.discord_guild_id || social?.mailchimp_status === 'connected');
          break;
        }
        case 'install_pwa': {
          // Check if user has push subscription
          const { data: pushSub } = await supabase
            .from('web_push_subscriptions')
            .select('id')
            .eq('user_id', user?.id)
            .limit(1);
          isCompleted = (pushSub?.length || 0) > 0;
          break;
        }
      }

      if (isCompleted && !progress.completed_tasks.includes(taskId)) {
        const updatedTasks = [...progress.completed_tasks, taskId];
        const allTasksComplete = updatedTasks.length === tasks.length;
        
        const newProgress = {
          ...progress,
          completed_tasks: updatedTasks,
          completed_at: allTasksComplete ? new Date().toISOString() : progress.completed_at
        };

        await updateProgress(newProgress);

        if (allTasksComplete && !newProgress.rewards_claimed) {
          await claimRewards();
        }

        // Track task completion
        trackPhase4Events.onboardingTaskCompleted(taskId);

        toast({
          title: "Task Completed! 🎉",
          description: `Great job completing: ${tasks.find(t => t.id === taskId)?.title}`,
        });
      }
    } catch (error) {
      console.error('Error checking task completion:', error);
    }
    
    setChecking(null);
  };

  const updateProgress = async (newProgress: OnboardingProgress) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_progress: newProgress as any })
        .eq('user_id', user?.id);

      if (error) throw error;
      setProgress(newProgress);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const setupStripeConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) throw error;
      
      if (data?.url) {
        // Open Stripe onboarding in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Stripe Connect",
          description: "Opening Stripe setup in a new tab. Complete the setup and then click 'Check' to verify.",
        });
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      toast({
        title: "Error",
        description: "Failed to setup Stripe Connect. Please try again.",
        variant: "destructive",
      });
    }
  };

  const triggerPWAInstall = () => {
    // Check if PWA can be installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      toast({
        title: "App Already Installed",
        description: "Pluggd is already installed on this device.",
      });
      return;
    }

    // Try to trigger install prompt
    const event = new CustomEvent('show-pwa-install');
    window.dispatchEvent(event);
    
    toast({
      title: "Install App",
      description: "Look for the install prompt or add Pluggd to your home screen from your browser menu.",
    });
  };

  const handleTaskAction = async (task: OnboardingTask) => {
    if (task.id === 'connect_stripe') {
      await setupStripeConnect();
    } else if (task.id === 'install_pwa') {
      triggerPWAInstall();
    } else if (task.actionUrl) {
      // For other tasks, navigate as before
      window.open(task.actionUrl, task.actionUrl.startsWith('http') ? '_blank' : '_self');
    }
  };

  const claimRewards = async () => {
    try {
      // Award 200 credits
      const { error } = await supabase
        .from('wallet_ledger')
        .insert({
          user_id: user?.id,
          amount_credits: 200,
          kind: 'award_prize',
          metadata: { source: 'onboarding_completion', description: 'Onboarding completion bonus' }
        });

      if (error) throw error;

      // Update progress to mark rewards as claimed
      const newProgress = { 
        ...progress, 
        rewards_claimed: true,
        completed_tasks: progress.completed_tasks,
        completed_at: progress.completed_at || new Date().toISOString()
      };
      
      await updateProgress(newProgress);

      // Track rewards claimed
      trackPhase4Events.onboardingRewardsClaimed(200);
      trackPhase4Events.onboardingCompleted();

      toast({
        title: "Congratulations! 🎉",
        description: "You've earned 200 Credits for completing onboarding!",
      });
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast({
        title: "Error",
        description: "Failed to claim rewards. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const completedCount = progress.completed_tasks.length;
  const progressPercentage = (completedCount / tasks.length) * 100;
  const allCompleted = completedCount === tasks.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="animate-pulse py-8">
          <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-2 bg-muted rounded w-full mb-6"></div>
          <div className="space-y-3">
             {[...Array(6)].map((_, i) => (
               <div key={i} className="h-12 bg-muted rounded"></div>
             ))}
           </div>
         </CardContent>
       </Card>
     );
   }

  return (
    <div className="space-y-6">
      <OnboardingRewards />
      
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Getting Started Checklist
              {allCompleted && <Badge variant="default">Complete!</Badge>}
            </CardTitle>
            <CardDescription>
              Complete these tasks to get the most out of Pluggd
            </CardDescription>
          </div>
          {allCompleted && !progress.rewards_claimed && (
            <Gift className="h-8 w-8 text-primary animate-bounce" />
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{completedCount} of {tasks.length} completed</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task) => {
          const isCompleted = progress.completed_tasks.includes(task.id);
          const isChecking = checking === task.id;
          const IconComponent = task.icon;

          return (
            <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`${isCompleted ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <IconComponent className={`h-5 w-5 ${isCompleted ? 'text-green-500' : 'text-muted-foreground'}`} />
                <div>
                  <h4 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!isCompleted && (
                  <>
                    {(task.actionUrl || task.id === 'connect_stripe' || task.id === 'install_pwa') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleTaskAction(task)}
                      >
                        {task.action}
                        {task.actionUrl?.startsWith('http') && <ExternalLink className="h-4 w-4 ml-1" />}
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => checkTaskCompletion(task.id)}
                      disabled={isChecking}
                    >
                      {isChecking ? 'Checking...' : 'Check'}
                    </Button>
                  </>
                )}
                {isCompleted && (
                  <Badge variant="default">✓ Done</Badge>
                )}
              </div>
            </div>
          );
        })}

        {allCompleted && (
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <h3 className="font-semibold text-primary mb-2">
              🎉 Congratulations! You've completed onboarding!
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              You're now ready to start earning on Pluggd. 
              {progress.rewards_claimed 
                ? "You've already received your 200 Credits bonus!" 
                : "You've earned 200 Credits as a bonus!"
              }
            </p>
            {!progress.rewards_claimed && (
              <Button onClick={claimRewards} size="sm">
                <Gift className="h-4 w-4 mr-2" />
                Claim 200 Credits
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};

export default OnboardingChecklist;