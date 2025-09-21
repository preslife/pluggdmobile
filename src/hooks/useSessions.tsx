import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Session = {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  status: 'idle' | 'live' | 'ended';
  is_public: boolean;
  created_at: string;
  ended_at?: string;
  participant_count?: number;
  host_name?: string;
};

export const useSessions = (sessionId?: string) => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSession = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('session_rooms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get participant count
      const { count } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', id)
        .is('left_at', null);

      const sessionData: Session = {
        id: data.id,
        host_id: data.host_id,
        title: data.title,
        description: data.description,
        status: data.status as 'idle' | 'live' | 'ended',
        is_public: data.is_public || false,
        created_at: data.created_at,
        ended_at: data.ended_at,
        participant_count: count || 0,
        host_name: 'Host'
      };

      setSession(sessionData);
    } catch (error) {
      console.error('Error fetching session:', error);
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('session_rooms')
        .select('*')
        .in('status', ['idle', 'live'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts for all sessions
      const sessionsWithCounts = await Promise.all((data || []).map(async (room) => {
        const { count } = await supabase
          .from('session_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .is('left_at', null);

        return {
          id: room.id,
          host_id: room.host_id,
          title: room.title,
          description: room.description,
          status: room.status as 'idle' | 'live' | 'ended',
          is_public: room.is_public || false,
          created_at: room.created_at,
          ended_at: room.ended_at,
          participant_count: count || 0,
          host_name: 'Host'
        };
      }));

      setSessions(sessionsWithCounts);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
    } else {
      fetchSessions();
    }
  }, [sessionId]);

  return {
    session,
    sessions,
    loading,
    error,
    refetch: sessionId ? () => fetchSession(sessionId) : fetchSessions
  };
};