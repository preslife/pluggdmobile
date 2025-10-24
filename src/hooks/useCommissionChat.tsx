import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';

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
  const loggerMetadata = useMemo(() => ({ commission_id: commissionId || null }), [commissionId]);
  const { logEvent, logError } = useLogger({
    component: 'useCommissionChat',
    feature: 'messaging',
    metadata: loggerMetadata,
  });

  const fetchMessages = useCallback(async () => {
    if (!commissionId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('commission_messages')
      .select('*')
      .eq('commission_id', commissionId)
      .order('created_at', { ascending: true });

    if (error) {
      void logError('commission_chat_fetch_failed', error, { commission_id: commissionId });
    } else {
      setMessages(data || []);
      await logEvent('commission_chat_fetch_success', {
        commission_id: commissionId,
        message_count: data?.length ?? 0,
      });
    }
    setLoading(false);
  }, [commissionId, logError, logEvent]);

  const sendMessage = useCallback(async (content: string) => {
    if (!commissionId || !content.trim()) return { error: new Error('Invalid message') };

    await logEvent('commission_chat_send_attempt', {
      commission_id: commissionId,
      content_length: content.trim().length,
    });
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
      void logError('commission_chat_send_failed', error, {
        commission_id: commissionId,
        content_length: content.trim().length,
      });
      return { error };
    }

    await logEvent('commission_chat_send_success', {
      commission_id: commissionId,
      content_length: content.trim().length,
    });

    return { ok: true };
  }, [commissionId, logEvent, logError]);

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