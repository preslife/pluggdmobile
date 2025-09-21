import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type SessionMembership = {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  role: 'host' | 'collaborator' | 'viewer';
};

export const useSessionMembership = (sessionId?: string) => {
  const [membership, setMembership] = useState<SessionMembership | null>(null);
  const [members, setMembers] = useState<SessionMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchMembership = async () => {
    if (!sessionId || !user) {
      setMembership(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('room_id', sessionId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setMembership({
          id: data.id,
          session_id: data.room_id,
          user_id: data.user_id,
          joined_at: data.joined_at,
          role: data.role as 'host' | 'collaborator' | 'viewer'
        });
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.error('Error fetching membership:', error);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select(`
          *,
          profiles!session_participants_user_id_fkey(full_name, username)
        `)
        .eq('room_id', sessionId)
        .is('left_at', null);

      if (error) throw error;

      const membersData = (data || []).map(member => ({
        id: member.id,
        session_id: member.room_id,
        user_id: member.user_id,
        joined_at: member.joined_at,
        role: member.role as 'host' | 'collaborator' | 'viewer'
      }));

      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const canWrite = () => {
    if (!membership) return false;
    return membership.role === 'host' || membership.role === 'collaborator';
  };

  const canModerate = () => {
    if (!membership) return false;
    return membership.role === 'host';
  };

  useEffect(() => {
    fetchMembership();
    fetchMembers();
  }, [sessionId, user]);

  return {
    membership,
    members,
    loading,
    canWrite: canWrite(),
    canModerate: canModerate(),
    refetch: fetchMembership
  };
};