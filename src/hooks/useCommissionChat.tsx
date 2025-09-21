import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CommissionMessage = {
  id: string;
  commission_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export const useCommissionChat = (commissionId: string) => {
  const [messages, setMessages] = useState<CommissionMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!commissionId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('commission_messages')
      .select('*')
      .eq('commission_id', commissionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [commissionId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!commissionId || !content.trim()) return { error: new Error('Invalid message') };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('commission_messages')
      .insert({
        commission_id: commissionId,
        sender_id: user.id,
        content: content.trim(),
      });

    if (error) {
      return { error };
    }

    return { ok: true };
  }, [commissionId]);

  // Set up realtime subscription
  useEffect(() => {
    if (!commissionId) return;

    fetchMessages();

    const channel = supabase
      .channel(`commission_messages_${commissionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_messages',
          filter: `commission_id=eq.${commissionId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [commissionId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  };
};