import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrendingItem {
  content_type: string;
  content_id: string;
  title: string;
  user_id: string;
  created_at: string;
  total_score: number;
  rank: number;
}

export const useTrendingContent = (contentType?: 'beat' | 'release', limit = 10) => {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingContent();
  }, [contentType, limit]);

  const fetchTrendingContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('v_trending_content')
        .select('*');

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error: fetchError } = await query
        .order('total_score', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setItems(data || []);
    } catch (err) {
      console.error('Error fetching trending content:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getTrendingBeats = () => items.filter(item => item.content_type === 'beat');
  const getTrendingReleases = () => items.filter(item => item.content_type === 'release');

  return {
    items,
    loading,
    error,
    refetch: fetchTrendingContent,
    getTrendingBeats,
    getTrendingReleases
  };
};