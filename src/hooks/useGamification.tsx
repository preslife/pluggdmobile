import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserStats {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  beats_uploaded: number;
  beats_purchased: number;
  beats_sold: number;
  collaborations_completed: number;
  days_active: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description: string;
  points_awarded: number;
  unlocked_at: string;
  created_at: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  contest_type: 'weekly_challenge' | 'monthly_contest' | 'community_vote';
  genre: string | null;
  theme: string | null;
  rules: string | null;
  prize_description: string | null;
  start_date: string;
  end_date: string;
  voting_end_date: string | null;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  max_submissions: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContestSubmission {
  id: string;
  contest_id: string;
  user_id: string;
  beat_id: string;
  submission_title: string | null;
  submission_description: string | null;
  votes_count: number;
  rank: number | null;
  submitted_at: string;
  beats?: {
    title: string;
    audio_url: string;
    image_url: string;
  };
  profiles?: {
    username: string;
    full_name: string;
  };
}

export const useGamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!user) return null;

    try {
      let { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        const { data: newStats, error: createError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            total_points: 0,
            level: 1,
            beats_uploaded: 0,
            beats_purchased: 0,
            beats_sold: 0,
            collaborations_completed: 0,
            days_active: 1,
            current_streak: 1,
            longest_streak: 1,
            last_active_date: new Date().toISOString().split('T')[0]
          })
          .select()
           .maybeSingle();

         if (createError) throw createError;
         if (!newStats) throw new Error('Failed to create user stats');
         data = newStats;
      }

      setUserStats(data);
      return data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  };

  // Fetch user achievements
  const fetchAchievements = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  // Fetch active contests
  const fetchContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .in('status', ['upcoming', 'active', 'voting'])
        .order('start_date', { ascending: true });

      if (error) throw error;
      setContests((data as Contest[]) || []);
    } catch (error) {
      console.error('Error fetching contests:', error);
    }
  };

  // Submit to contest
  const submitToContest = async (contestId: string, beatId: string, title?: string, description?: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('contest_submissions')
        .insert({
          contest_id: contestId,
          user_id: user.id,
          beat_id: beatId,
          submission_title: title,
          submission_description: description
        });

      if (error) throw error;

      toast({
        title: "Submission successful!",
        description: "Your beat has been submitted to the contest."
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive"
      });
      return { error: error.message };
    }
  };

  // Vote for contest submission
  const voteForSubmission = async (contestId: string, submissionId: string) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('contest_votes')
        .insert({
          contest_id: contestId,
          submission_id: submissionId,
          voter_id: user.id
        });

      if (error) throw error;

      // Update vote count manually
      const { data: currentSubmission } = await supabase
        .from('contest_submissions')
        .select('votes_count')
        .eq('id', submissionId)
        .maybeSingle();

      if (currentSubmission) {
        await supabase
          .from('contest_submissions')
          .update({ votes_count: currentSubmission.votes_count + 1 })
          .eq('id', submissionId);
      }

      toast({
        title: "Vote cast!",
        description: "Your vote has been recorded."
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive"
      });
      return { error: error.message };
    }
  };

  // Calculate level from points
  const calculateLevel = (points: number): number => {
    return Math.floor(points / 100) + 1;
  };

  // Get next level progress
  const getLevelProgress = (points: number): { current: number; next: number; progress: number } => {
    const current = calculateLevel(points);
    const pointsForCurrentLevel = (current - 1) * 100;
    const pointsForNextLevel = current * 100;
    const pointsInCurrentLevel = points - pointsForCurrentLevel;
    const progress = (pointsInCurrentLevel / 100) * 100;

    return {
      current,
      next: current + 1,
      progress: Math.min(progress, 100)
    };
  };

  // Award achievement
  const awardAchievement = async (type: string, name: string, description: string, points: number) => {
    if (!user) return;

    try {
      // Check and award badges automatically via database triggers
      await supabase.rpc('check_and_award_badges', {
        p_user_id: user.id
      });

      toast({
        title: "Achievement Unlocked! 🏆",
        description: `${name} - ${description} (+${points} points)`
      });

      fetchAchievements();
      fetchUserStats();
    } catch (error) {
      console.error('Error awarding achievement:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchAchievements();
    }
    fetchContests();
    
    // Set up real-time subscriptions for user stats
    if (user) {
      const statsChannel = supabase
        .channel('user_stats_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_stats',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setUserStats(payload.new as UserStats);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(statsChannel);
      };
    }
  }, [user]);

  return {
    userStats,
    achievements,
    contests,
    loading,
    fetchUserStats,
    fetchAchievements,
    fetchContests,
    submitToContest,
    voteForSubmission,
    calculateLevel,
    getLevelProgress,
    awardAchievement
  };
};