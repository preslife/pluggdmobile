
import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionTier = 'free' | 'creator' | 'pro';

interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  billing_cycle: string;
  status: string;
  current_period_end?: string;
}

interface UserUsage {
  active_courses: number;
  beats_uploaded_month: number;
  projects_posted_month: number;
  tool_usage_today: number;
  feedback_submissions_month: number;
}

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  usage: UserUsage | null;
  loading: boolean;
  isAdmin: boolean;
  getTierLimits: () => TierLimits;
  canAccessFeature: (feature: string) => boolean;
  checkCourseLimit: () => boolean;
  checkToolUsage: () => boolean;
  incrementUsage: (type: keyof UserUsage) => Promise<void>;
  refreshData: () => Promise<void>;
}

interface TierLimits {
  maxActiveCourses: number;
  maxBeatsPerMonth: number;
  maxProjectsPerMonth: number;
  maxToolUsagePerDay: number;
  maxFeedbackPerMonth: number;
  canUploadBeats: boolean;
  canSellSamplePacks: boolean;
  canPostProjects: boolean;
  canHostEvents: boolean;
  canSubmitChallenges: boolean;
  hasAnalyticsDashboard: boolean;
  hasFullAnalytics: boolean;
  hasFeaturedListings: boolean;
  hasPrivateCollabs: boolean;
  hasDirectoryProfile: boolean;
  hasVerifiedBadge: boolean;
  hasAvailabilityCalendar: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const getTierLimits = (): TierLimits => {
    // Admins get unlimited everything
    if (isAdmin) {
      return {
        maxActiveCourses: -1, // unlimited
        maxBeatsPerMonth: -1, // unlimited
        maxProjectsPerMonth: -1, // unlimited
        maxToolUsagePerDay: -1, // unlimited
        maxFeedbackPerMonth: -1, // unlimited
        canUploadBeats: true,
        canSellSamplePacks: true,
        canPostProjects: true,
        canHostEvents: true,
        canSubmitChallenges: true,
        hasAnalyticsDashboard: true,
        hasFullAnalytics: true,
        hasFeaturedListings: true,
        hasPrivateCollabs: true,
        hasDirectoryProfile: true,
        hasVerifiedBadge: true,
        hasAvailabilityCalendar: true,
      };
    }

    const tier = subscription?.tier || 'free';
    
    switch (tier) {
      case 'creator':
        return {
          maxActiveCourses: 3,
          maxBeatsPerMonth: 15,
          maxProjectsPerMonth: 2,
          maxToolUsagePerDay: 5,
          maxFeedbackPerMonth: 2,
          canUploadBeats: true,
          canSellSamplePacks: true,
          canPostProjects: true,
          canHostEvents: true,
          canSubmitChallenges: true,
          hasAnalyticsDashboard: true,
          hasFullAnalytics: false,
          hasFeaturedListings: false,
          hasPrivateCollabs: true,
          hasDirectoryProfile: true,
          hasVerifiedBadge: true,
          hasAvailabilityCalendar: false,
        };
      case 'pro':
        return {
          maxActiveCourses: -1, // unlimited
          maxBeatsPerMonth: -1, // unlimited
          maxProjectsPerMonth: -1, // unlimited
          maxToolUsagePerDay: -1, // unlimited
          maxFeedbackPerMonth: -1, // unlimited
          canUploadBeats: true,
          canSellSamplePacks: true,
          canPostProjects: true,
          canHostEvents: true,
          canSubmitChallenges: true,
          hasAnalyticsDashboard: true,
          hasFullAnalytics: true,
          hasFeaturedListings: true,
          hasPrivateCollabs: true,
          hasDirectoryProfile: true,
          hasVerifiedBadge: true,
          hasAvailabilityCalendar: true,
        };
      default: // free
        return {
          maxActiveCourses: 1,
          maxBeatsPerMonth: 5,
          maxProjectsPerMonth: 0,
          maxToolUsagePerDay: 3,
          maxFeedbackPerMonth: 0,
          canUploadBeats: true,
          canSellSamplePacks: false,
          canPostProjects: false,
          canHostEvents: false,
          canSubmitChallenges: false,
          hasAnalyticsDashboard: false,
          hasFullAnalytics: false,
          hasFeaturedListings: false,
          hasPrivateCollabs: false,
          hasDirectoryProfile: false,
          hasVerifiedBadge: false,
          hasAvailabilityCalendar: false,
        };
    }
  };

  const canAccessFeature = (feature: string): boolean => {
    // Admins have access to all features
    if (isAdmin) return true;
    
    const limits = getTierLimits();
    return (limits as any)[feature] === true;
  };

  const checkCourseLimit = (): boolean => {
    // Admins have unlimited access
    if (isAdmin) return true;
    
    const limits = getTierLimits();
    if (limits.maxActiveCourses === -1) return true;
    return (usage?.active_courses || 0) < limits.maxActiveCourses;
  };

  const checkToolUsage = (): boolean => {
    // Admins have unlimited access
    if (isAdmin) return true;
    
    const limits = getTierLimits();
    if (limits.maxToolUsagePerDay === -1) return true;
    return (usage?.tool_usage_today || 0) < limits.maxToolUsagePerDay;
  };

  const incrementUsage = async (type: keyof UserUsage) => {
    if (!user) return;

    try {
      await supabase.rpc('increment_user_usage', {
        p_user_id: user.id,
        p_usage_type: type
      });
      await refreshData();
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  };

  const fetchSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Check if user is admin
      const { data: adminData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!adminData);

      // First check with Stripe to get latest subscription status
      try {
        const { data: stripeData } = await supabase.functions.invoke('check-subscription');
        if (stripeData) {
          console.log('Updated subscription from Stripe:', stripeData);
        }
      } catch (stripeError) {
        console.warn('Could not update from Stripe:', stripeError);
      }

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      } else {
        setSubscription(subData);
      }

      // Fetch or create usage record
      let { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageError) {
        console.error('Error fetching usage:', usageError);
      } else if (!usageData) {
        // Create initial usage record
        const { data: newUsage, error: createError } = await supabase
          .from('user_usage')
          .insert({
            user_id: user.id,
            active_courses: 0,
            beats_uploaded_month: 0,
            projects_posted_month: 0,
            tool_usage_today: 0,
            feedback_submissions_month: 0,
          })
          .select()
          .maybeSingle();

         if (createError) {
           console.error('Error creating usage record:', createError);
         } else if (newUsage) {
           usageData = newUsage;
         }
      }
      
      setUsage(usageData);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchSubscriptionData();
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  const value = {
    subscription,
    usage,
    loading,
    isAdmin,
    getTierLimits,
    canAccessFeature,
    checkCourseLimit,
    checkToolUsage,
    incrementUsage,
    refreshData,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
