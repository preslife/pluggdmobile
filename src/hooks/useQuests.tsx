import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Quest {
  id: string;
  title: string;
  xp: number;
  is_active: boolean;
  completed?: boolean;
}

export interface QuestProgress {
  id: string;
  quest_id: string;
  user_id: string;
  completed_at: string | null;
  xp_awarded: number;
}

export const useQuests = () => {
  const { user } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [questProgress, setQuestProgress] = useState<QuestProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  // Fetch active quests
  const fetchQuests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuests(data || []);
    } catch (error) {
      console.error('Error fetching quests:', error);
    }
  }, []);

  // Fetch user's quest progress
  const fetchQuestProgress = useCallback(async () => {
    if (!user) {
      setQuestProgress([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_quest_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Map the data to match our interface
      const progressWithDefaults = (data || []).map((p: any) => ({
        id: p.id,
        quest_id: p.quest_id,
        user_id: p.user_id,
        completed_at: p.completed_at,
        xp_awarded: p.xp_awarded || 0
      }));
      
      setQuestProgress(progressWithDefaults);
    } catch (error) {
      console.error('Error fetching quest progress:', error);
    }
  }, [user]);

  // Complete a quest
  const completeQuest = useCallback(async (questId: string) => {
    if (!user || completing) return;

    setCompleting(questId);
    try {
      // Check if already completed
      const existingProgress = questProgress.find(p => p.quest_id === questId);
      if (existingProgress?.completed_at) {
        toast({
          title: "Already completed",
          description: "You've already completed this quest today!",
          variant: "destructive"
        });
        return;
      }

      const quest = quests.find(q => q.id === questId);
      if (!quest) throw new Error('Quest not found');

      // Record quest completion
      const { error: progressError } = await supabase
        .from('user_quest_progress')
        .upsert({
          user_id: user.id,
          quest_id: questId,
          completed_at: new Date().toISOString(),
          xp_awarded: quest.xp
        });

      if (progressError) throw progressError;

      // Award XP to user stats - first try to get existing stats
      const { data: existingStats } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (existingStats) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_stats')
          .update({
            total_points: existingStats.total_points + quest.xp,
            level: Math.floor((existingStats.total_points + quest.xp) / 100) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new stats record
        const { error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            total_points: quest.xp,
            level: Math.floor(quest.xp / 100) + 1
          });

        if (insertError) throw insertError;
      }

      // Update local state
      await fetchQuestProgress();

      toast({
        title: "Quest completed! 🎉",
        description: `You earned ${quest.xp} XP for "${quest.title}"`,
      });

    } catch (error) {
      console.error('Error completing quest:', error);
      toast({
        title: "Error",
        description: "Failed to complete quest. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCompleting(null);
    }
  }, [user, completing, questProgress, quests, fetchQuestProgress]);

  // Get quests with completion status
  const questsWithStatus = quests.map(quest => ({
    ...quest,
    completed: questProgress.some(p => p.quest_id === quest.id && p.completed_at)
  }));

  // Calculate total XP earned today from quests
  const todayXP = questProgress
    .filter(p => p.completed_at && new Date(p.completed_at).toDateString() === new Date().toDateString())
    .reduce((total, p) => total + p.xp_awarded, 0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchQuests(), fetchQuestProgress()]);
      setLoading(false);
    };

    loadData();
  }, [fetchQuests, fetchQuestProgress]);

  return {
    quests: questsWithStatus,
    loading,
    completing,
    completeQuest,
    todayXP,
    refresh: () => Promise.all([fetchQuests(), fetchQuestProgress()])
  };
};