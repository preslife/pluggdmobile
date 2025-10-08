import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type LiveTicket = {
  id: string;
  sessionId: string;
  hostId: string;
  priceCents: number;
  inventory: number;
  sold: number;
  status: string;
  createdAt: string;
  sessionTitle?: string | null;
  scheduledFor?: string | null;
};

export type LiveTicketPayload = {
  session_id: string;
  price_cents: number;
  inventory: number;
  max_per_user?: number | null;
  status?: string;
  tiers?: string[];
  ticket_id?: string;
};

export const useLiveTickets = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<LiveTicket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user?.id) {
      setTickets([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_tickets')
        .select(`
          id,
          session_id,
          host_id,
          price_cents,
          inventory,
          tickets_sold,
          status,
          created_at,
          live_sessions:session_id (
            title,
            scheduled_for
          )
        `)
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((ticket: any) => ({
        id: ticket.id,
        sessionId: ticket.session_id,
        hostId: ticket.host_id,
        priceCents: ticket.price_cents ?? 0,
        inventory: ticket.inventory ?? 0,
        sold: ticket.tickets_sold ?? 0,
        status: ticket.status ?? 'draft',
        createdAt: ticket.created_at,
        sessionTitle: ticket.live_sessions?.title ?? null,
        scheduledFor: ticket.live_sessions?.scheduled_for ?? null,
      }));

      setTickets(formatted);
    } catch (error) {
      console.error('Error fetching live tickets:', error);
      toast({
        title: 'Unable to load tickets',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const invokeTicketManager = useCallback(
    async (action: 'create' | 'update' | 'delete', payload: LiveTicketPayload | { ticket_id: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-live-tickets', {
        body: { action, payload },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    []
  );

  const createTicket = useCallback(
    async (payload: LiveTicketPayload) => {
      try {
        await invokeTicketManager('create', payload);
        toast({
          title: 'Ticket created',
          description: 'Your ticket is now available for purchase.',
        });
        await fetchTickets();
        return true;
      } catch (error) {
        console.error('Error creating ticket:', error);
        toast({
          title: 'Ticket creation failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchTickets, invokeTicketManager, toast]
  );

  const updateTicket = useCallback(
    async (payload: LiveTicketPayload) => {
      try {
        await invokeTicketManager('update', payload);
        toast({
          title: 'Ticket updated',
          description: 'Changes to your ticket were saved.',
        });
        await fetchTickets();
        return true;
      } catch (error) {
        console.error('Error updating ticket:', error);
        toast({
          title: 'Ticket update failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchTickets, invokeTicketManager, toast]
  );

  const deleteTicket = useCallback(
    async (ticketId: string) => {
      try {
        await invokeTicketManager('delete', { ticket_id: ticketId });
        toast({
          title: 'Ticket deleted',
          description: 'The ticket has been removed from your inventory.',
        });
        await fetchTickets();
        return true;
      } catch (error) {
        console.error('Error deleting ticket:', error);
        toast({
          title: 'Ticket deletion failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchTickets, invokeTicketManager, toast]
  );

  return {
    tickets,
    loading,
    refetch: fetchTickets,
    createTicket,
    updateTicket,
    deleteTicket,
  };
};

export default useLiveTickets;
