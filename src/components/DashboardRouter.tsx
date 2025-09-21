import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CreatorStudioDashboard } from '@/components/CreatorStudio/CreatorStudioDashboard';
import Dashboard from '@/pages/Dashboard';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

/**
 * DashboardRouter - Intelligently routes to the best dashboard based on user type
 * Per master spec: Creators get the enhanced CreatorStudioDashboard with all features
 * Regular users get the standard Dashboard
 */
export const DashboardRouter: React.FC = () => {
  const { user } = useAuth();
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCreatorStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has creator status in profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_creator, user_type')
          .eq('user_id', user.id)
          .single();

        // User is a creator if is_creator is true OR user_type is 'producer' or 'artist'
        const creatorStatus = profile?.is_creator || 
                             profile?.user_type === 'producer' || 
                             profile?.user_type === 'artist';
        
        setIsCreator(creatorStatus);
      } catch (error) {
        console.error('Error checking creator status:', error);
        // Default to standard dashboard on error
        setIsCreator(false);
      } finally {
        setLoading(false);
      }
    };

    checkCreatorStatus();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Use CreatorStudioDashboard for creators (has sparklines, quick actions, etc per spec)
  // Use standard Dashboard for regular users
  return isCreator ? <CreatorStudioDashboard /> : <Dashboard />;
};

export default DashboardRouter;
