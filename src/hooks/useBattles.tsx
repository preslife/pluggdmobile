import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Battle = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: 'upcoming' | 'live' | 'finished';
  created_by: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type BattleEntry = {
  id: string;
  battle_id: string;
  user_id: string;
  title: string;
  audio_path: string;
  created_at: string;
};

export type BattleMatchup = {
  id: string;
  battle_id: string;
  round_number: number;
  entry_a_id: string;
  entry_b_id: string;
  winner_entry_id?: string;
  entry_a?: BattleEntry;
  entry_b?: BattleEntry;
};

export const useBattles = () => {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchBattles = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .order('starts_at', { ascending: false });

      if (error) throw error;
      setBattles((data || []) as Battle[]);
    } catch (error) {
      console.error('Error fetching battles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch battles",
        variant: "destructive"
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [toast]);

  const createBattle = async (battleData: {
    title: string;
    starts_at: string;
    ends_at: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('battles')
        .insert({
          ...battleData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchBattles();
      toast({
        title: "Success",
        description: "Battle created successfully"
      });
      
      return data;
    } catch (error) {
      console.error('Error creating battle:', error);
      toast({
        title: "Error",
        description: "Failed to create battle",
        variant: "destructive"
      });
      throw error;
    }
  };

  const submitEntry = async (battleId: string, title: string, audioFile: File) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Upload audio file
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `${user.id}/${battleId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('battle-audio')
        .upload(fileName, audioFile);

      if (uploadError) throw uploadError;

      // Create entry record
      const { error: entryError } = await supabase
        .from('battle_entries')
        .insert({
          battle_id: battleId,
          user_id: user.id,
          title,
          audio_path: fileName
        });

      if (entryError) throw entryError;

      toast({
        title: "Success",
        description: "Entry submitted successfully"
      });
    } catch (error) {
      console.error('Error submitting entry:', error);
      toast({
        title: "Error", 
        description: "Failed to submit entry",
        variant: "destructive"
      });
      throw error;
    }
  };

  const vote = async (matchupId: string, entryId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('battle_votes')
        .insert({
          matchup_id: matchupId,
          voter_user_id: user.id,
          entry_id: entryId,
          battle_id: '' // Will be filled by trigger
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vote submitted successfully"
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchBattles();
  }, [fetchBattles]);

  useEffect(() => {
    const channel = supabase
      .channel('live-battles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'battles' },
        () => fetchBattles(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBattles]);

  const advanceBattleRounds = useCallback(
    async (battleId?: string) => {
      try {
        const options = battleId ? { body: { battleId } } : undefined;
        const { data, error } = await supabase.functions.invoke('advance-battle-rounds', options);

        if (error) throw error;

        toast({
          title: 'Rounds advanced',
          description: data?.processed
            ? `${data.processed} battle${data.processed === 1 ? '' : 's'} processed.`
            : 'Battle rounds processed successfully.'
        });

        await fetchBattles(false);
        return data;
      } catch (error: any) {
        console.error('Error advancing battle rounds:', error);
        toast({
          title: 'Error',
          description: error?.message || 'Failed to advance rounds',
          variant: 'destructive'
        });
        throw error;
      }
    },
    [fetchBattles, toast]
  );

  return {
    battles,
    loading,
    createBattle,
    submitEntry,
    vote,
    refetch: fetchBattles,
    advanceBattleRounds
  };
};