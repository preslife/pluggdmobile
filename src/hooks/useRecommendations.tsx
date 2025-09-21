import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Beat = {
  id: string;
  title: string;
  description: string;
  genre: string;
  bpm: number;
  key: string;
  price: number;
  tags: string[];
  audio_url: string;
  image_url: string;
  created_at: string;
  uploaded_by_admin: boolean;
  producer_name: string;
  profiles: {
    username: string;
    full_name: string;
  } | null;
};

export const useRecommendations = (currentBeat?: Beat | null, limit = 6) => {
  const [recommendations, setRecommendations] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentBeat) {
      fetchRecommendations(currentBeat);
    }
  }, [currentBeat?.id]);

  const fetchRecommendations = async (beat: Beat) => {
    if (!beat) return;
    
    setLoading(true);
    try {
      // First, get beats from the same genre
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('*')
        .eq('is_published', true)
        .neq('id', beat.id) // Exclude current beat
        .limit(limit * 2); // Get more to filter from

      if (beatsError) throw beatsError;

      if (!beatsData || beatsData.length === 0) {
        setRecommendations([]);
        return;
      }

      // Get unique user IDs from beats
      const userIds = [...new Set(beatsData.map(b => b.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine beats with profile data
      const beatsWithProfiles = beatsData.map(b => ({
        ...b,
        profiles: profilesData?.find(profile => profile.user_id === b.user_id) || null
      }));

      // Score and sort recommendations based on similarity
      const scoredBeats = beatsWithProfiles.map(b => ({
        ...b,
        similarity: calculateSimilarity(beat, b)
      }));

      // Sort by similarity score (highest first) and take the top results
      const sortedRecommendations = scoredBeats
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      setRecommendations(sortedRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateSimilarity = (beatA: Beat, beatB: Beat): number => {
    let score = 0;

    // Genre match (highest weight)
    if (beatA.genre === beatB.genre) {
      score += 50;
    }

    // BPM similarity (within 10 BPM range)
    if (beatA.bpm && beatB.bpm) {
      const bpmDiff = Math.abs(beatA.bpm - beatB.bpm);
      if (bpmDiff <= 5) score += 30;
      else if (bpmDiff <= 10) score += 20;
      else if (bpmDiff <= 20) score += 10;
    }

    // Key match
    if (beatA.key && beatB.key && beatA.key === beatB.key) {
      score += 20;
    }

    // Tags similarity
    if (beatA.tags && beatB.tags) {
      const commonTags = beatA.tags.filter(tag => 
        beatB.tags.some(bTag => bTag.toLowerCase() === tag.toLowerCase())
      );
      score += commonTags.length * 5;
    }

    // Same artist bonus (but lower score to promote discovery)
    if (beatA.profiles?.username === beatB.profiles?.username) {
      score += 10;
    }

    // Price range similarity (within similar price range)
    const priceDiff = Math.abs(beatA.price - beatB.price);
    if (priceDiff <= 5) score += 5;

    return score;
  };

  return {
    recommendations,
    loading,
    refetch: () => currentBeat && fetchRecommendations(currentBeat)
  };
};