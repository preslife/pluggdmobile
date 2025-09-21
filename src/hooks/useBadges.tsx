import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface BadgeDefinition {
  id: string;
  badge_type: string;
  name: string;
  description: string;
  icon_url: string | null;
  required_points: number;
  required_count: number;
  required_action: string;
  tier: string;
  is_active: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  points_awarded: number;
  unlocked_at: string;
}

export const useBadges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserBadges();
    }
    fetchAllBadges();
    
    // Set up real-time subscriptions
    const achievementChannel = supabase
      .channel('user_achievements_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          const newAchievement = payload.new as UserBadge;
          setUserBadges(prev => [newAchievement, ...prev]);
          
          // Show toast notification for new badge
          toast({
            title: '🏆 New Achievement Unlocked!',
            description: `You earned: ${newAchievement.achievement_name}`,
          });
        }
      )
      .subscribe();

    const badgeChannel = supabase
      .channel('badge_definitions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'badge_definitions' },
        () => fetchAllBadges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(achievementChannel);
      supabase.removeChannel(badgeChannel);
    };
  }, [user, toast]);

  const fetchUserBadges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setUserBadges(data || []);
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };

  const fetchAllBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('required_points', { ascending: true });

      if (error) throw error;
      setAllBadges(data || []);
    } catch (error) {
      console.error('Error fetching all badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeProgress = (badge: BadgeDefinition, userStats: any) => {
    if (!userStats) return 0;

    let current = 0;
    let target = 0;

    switch (badge.required_action) {
      case 'beats_uploaded':
        current = userStats.beats_uploaded || 0;
        target = badge.required_count;
        break;
      case 'beats_sold':
        current = userStats.beats_sold || 0;
        target = badge.required_count;
        break;
      case 'collaborations_completed':
        current = userStats.collaborations_completed || 0;
        target = badge.required_count;
        break;
      case 'total_points':
        current = userStats.total_points || 0;
        target = badge.required_points;
        break;
      default:
        current = 0;
        target = 1;
    }

    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const isUnlocked = (badgeType: string) => {
    return userBadges.some(badge => badge.achievement_type === badgeType);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'text-orange-600 border-orange-600';
      case 'silver':
        return 'text-gray-500 border-gray-500';
      case 'gold':
        return 'text-yellow-500 border-yellow-500';
      case 'platinum':
        return 'text-purple-500 border-purple-500';
      default:
        return 'text-gray-400 border-gray-400';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return '🥉';
      case 'silver':
        return '🥈';
      case 'gold':
        return '🥇';
      case 'platinum':
        return '💎';
      default:
        return '🏆';
    }
  };

  const forceRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchUserBadges(), fetchAllBadges()]);
  };

  return {
    userBadges,
    allBadges,
    loading,
    getBadgeProgress,
    isUnlocked,
    getTierColor,
    getTierIcon,
    refreshBadges: fetchUserBadges,
    forceRefresh
  };
};