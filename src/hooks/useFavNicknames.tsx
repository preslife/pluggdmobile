import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserFavNickname {
  nickname: string;
  custom_icon: string;
  display_order: number;
}

export const useFavNicknames = (userId?: string) => {
  const { user } = useAuth();
  const [nicknames, setNicknames] = useState<UserFavNickname[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchNicknames = useCallback(async () => {
    if (!targetUserId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_fav_nicknames')
        .select('nickname, custom_icon, display_order')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setNicknames(data || []);
    } catch (err) {
      console.error('Error fetching FAV nicknames:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch nicknames');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  const saveNicknames = useCallback(async (newNicknames: UserFavNickname[]) => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    if (newNicknames.length === 0) {
      setError('At least one nickname is required');
      return false;
    }

    if (newNicknames.length > 3) {
      setError('Maximum of 3 nicknames allowed');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const nicknamesData = newNicknames.map((nickname) => ({
        nickname: nickname.nickname,
        custom_icon: nickname.custom_icon
      }));

      const { error } = await supabase.rpc('set_user_fav_nicknames', {
        p_user_id: user.id,
        p_nicknames: nicknamesData
      });

      if (error) throw error;

      // Update local state
      setNicknames(newNicknames);
      return true;
    } catch (err) {
      console.error('Error saving FAV nicknames:', err);
      setError(err instanceof Error ? err.message : 'Failed to save nicknames');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const clearNicknames = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user_fav_nicknames')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setNicknames([]);
      return true;
    } catch (err) {
      console.error('Error clearing FAV nicknames:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear nicknames');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const hasSetupCompleted = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('fav_nicknames_setup_completed')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.fav_nicknames_setup_completed || false;
    } catch (err) {
      console.error('Error checking setup status:', err);
      return false;
    }
  }, [user?.id]);

  const markSetupCompleted = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ fav_nicknames_setup_completed: true })
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error marking setup completed:', err);
      return false;
    }
  }, [user?.id]);

  // Helper functions to get specific nicknames
  const getPrimaryNickname = useCallback(() => {
    return nicknames.find(n => n.display_order === 0) || null;
  }, [nicknames]);

  const getDisplayNickname = useCallback((fallback?: string) => {
    const primary = getPrimaryNickname();
    return primary ? `${primary.custom_icon} ${primary.nickname}` : fallback || 'User';
  }, [getPrimaryNickname]);

  const getAllDisplayNicknames = useCallback(() => {
    return nicknames
      .sort((a, b) => a.display_order - b.display_order)
      .map(n => `${n.custom_icon} ${n.nickname}`);
  }, [nicknames]);

  // Auto-fetch on mount and when targetUserId changes
  useEffect(() => {
    fetchNicknames();
  }, [fetchNicknames]);

  return {
    nicknames,
    loading,
    error,
    fetchNicknames,
    saveNicknames,
    clearNicknames,
    hasSetupCompleted,
    markSetupCompleted,
    getPrimaryNickname,
    getDisplayNickname,
    getAllDisplayNicknames,
    // Computed properties
    hasNicknames: nicknames.length > 0,
    nicknameCount: nicknames.length,
    primaryNickname: getPrimaryNickname(),
    displayName: getDisplayNickname()
  };
};

export default useFavNicknames;