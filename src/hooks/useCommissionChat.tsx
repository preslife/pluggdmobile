import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/hooks/useLogger';
import { useAuth } from '@/hooks/useAuth';

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
  const [participants, setParticipants] = useState<{ requester_id: string; producer_id: string } | null>(null);
  const [interactionBlocked, setInteractionBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const { user } = useAuth();
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

  const fetchParticipants = useCallback(async () => {
    if (!commissionId) {
      setParticipants(null);
      return;
    }

    const { data, error } = await supabase
      .from('commission_requests')
      .select('requester_id, producer_id')
      .eq('id', commissionId)
      .maybeSingle();

    if (error) {
      setParticipants(null);
      void logError('commission_chat_participants_fetch_failed', error, { commission_id: commissionId });
      return;
    }

    if (data) {
      setParticipants({
        requester_id: data.requester_id,
        producer_id: data.producer_id,
      });
    } else {
      setParticipants(null);
    }
  }, [commissionId, logError]);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  const counterpartyId = useMemo(() => {
    if (!participants || !user?.id) return null;
    if (user.id === participants.requester_id) return participants.producer_id;
    if (user.id === participants.producer_id) return participants.requester_id;
    return null;
  }, [participants, user?.id]);

  const checkBlockStatus = useCallback(async () => {
    if (!user?.id || !counterpartyId) {
      setInteractionBlocked(false);
      return false;
    }

    setCheckingBlock(true);
    try {
      const { data, error } = await supabase.rpc('is_user_blocked', {
        p_actor: user.id,
        p_target: counterpartyId,
      });

      if (error) {
        void logError('commission_chat_block_check_failed', error, {
          commission_id: commissionId,
          target_id: counterpartyId,
        });
        return false;
      }

      const blocked = Boolean(data);
      setInteractionBlocked(blocked);
      return blocked;
    } finally {
      setCheckingBlock(false);
    }
  }, [user?.id, counterpartyId, commissionId, logError]);

  useEffect(() => {
    void checkBlockStatus();
  }, [checkBlockStatus]);

  const sendMessage = useCallback(async (content: string) => {
    if (!commissionId || !content.trim()) return { error: new Error('Invalid message') };

    await logEvent('commission_chat_send_attempt', {
      commission_id: commissionId,
      content_length: content.trim().length,
    });
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { error: new Error('Not authenticated') };

    const blocked = await checkBlockStatus();
    if (blocked) {
      return { error: new Error('Messaging is blocked for this commission.') };
    }

    const { error } = await supabase
      .from('commission_messages')
      .insert({
        commission_id: commissionId,
        sender_id: currentUser.id,
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
  }, [checkBlockStatus, commissionId, logEvent, logError]);

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
    interactionBlocked,
    checkingBlock,
  };
};
