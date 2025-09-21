import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingStatusProps {
  className?: string;
}

export const OnboardingStatus = ({ className }: OnboardingStatusProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
  }, [user]);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setOnboardingProgress(data?.onboarding_progress || { completed_tasks: [] });
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = () => {
    if (!profile) return { status: 'error', message: 'Profile not found', icon: AlertCircle, color: 'text-red-500' };
    
    const completedTasks = onboardingProgress?.completed_tasks?.length || 0;
    const totalTasks = 6;
    
    if (profile.onboarding_completed || profile.user_type) {
      if (completedTasks === totalTasks) {
        return { 
          status: 'complete', 
          message: 'Onboarding Complete', 
          icon: CheckCircle, 
          color: 'text-green-500',
          description: 'All tasks completed'
        };
      } else {
        return { 
          status: 'unlocked', 
          message: 'Access Granted', 
          icon: CheckCircle, 
          color: 'text-blue-500',
          description: `${totalTasks - completedTasks} optional tasks remaining`
        };
      }
    }
    
    return { 
      status: 'pending', 
      message: 'Onboarding Required', 
      icon: Clock, 
      color: 'text-orange-500',
      description: 'Complete setup to unlock features'
    };
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <IconComponent className={`h-5 w-5 ${statusInfo.color}`} />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{statusInfo.message}</span>
              <Badge 
                variant={statusInfo.status === 'complete' ? 'default' : 
                        statusInfo.status === 'unlocked' ? 'secondary' : 'outline'}
              >
                {statusInfo.status === 'complete' ? 'Complete' :
                 statusInfo.status === 'unlocked' ? 'Unlocked' : 'Pending'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};