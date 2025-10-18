import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export type SessionRoom = {
  id: string;
  host_id: string;
  title: string;
  status: 'idle' | 'live' | 'ended';
  created_at: string;
  ended_at?: string;
  participant_count?: number;
  host_name?: string;
  description?: string | null;
  is_public?: boolean | null;
  scheduled_for?: string | null;
};

export const useSessionRooms = () => {
  const [rooms, setRooms] = useState<SessionRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRooms = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('session_rooms')
        .select(`
          *,
          profiles!session_rooms_host_id_fkey(full_name)
        `)
        .in('status', ['idle', 'live'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts
      const roomsWithCounts = await Promise.all((data || []).map(async (room) => {
        const { count } = await supabase
          .from('session_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .is('left_at', null);

        return {
          id: room.id,
          host_id: room.host_id,
          title: room.title,
          status: room.status as 'idle' | 'live' | 'ended',
          created_at: room.created_at,
          ended_at: room.ended_at,
          participant_count: count || 0,
          host_name: room.profiles?.full_name || 'Unknown Host',
          description: room.description,
          is_public: room.is_public,
          scheduled_for: room.agora_live_started_at || room.created_at
        };
      }));

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const createRoom = async (title: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a room",
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('session_rooms')
        .insert({
          title,
          host_id: user.id,
          status: 'live'
        })
        .select()
        .single();

      if (error) throw error;

      // Add host as participant
      await supabase
        .from('session_participants')
        .insert({
          room_id: data.id,
          user_id: user.id,
          role: 'host'
        });

      await fetchRooms();
      return data.id;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive"
      });
      return null;
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to join a room",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Check if already a participant
      const { data: existing } = await supabase
        .from('session_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

      if (existing) {
        return true; // Already joined
      }

      const { error } = await supabase
        .from('session_participants')
        .insert({
          room_id: roomId,
          user_id: user.id,
          role: 'collaborator'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
      return false;
    }
  };

  const endRoom = async (roomId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('session_rooms')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .eq('host_id', user.id);

      if (error) throw error;

      await fetchRooms();
      return true;
    } catch (error) {
      console.error('Error ending room:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const channel = supabase
      .channel('session-rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_rooms' },
        () => fetchRooms(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants' },
        () => fetchRooms(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    createRoom,
    joinRoom,
    endRoom,
    refetch: fetchRooms
  };
};