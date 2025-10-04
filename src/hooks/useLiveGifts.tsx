import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface LiveGiftCatalogItem {
  id: string;
  slug: string;
  label: string;
  description?: string | null;
  credit_cost: number;
  animation_url?: string | null;
  thumbnail_url?: string | null;
}

export interface LiveGiftEventItem {
  id: string;
  room_id: string;
  sender_id: string;
  quantity: number;
  total_credits: number;
  message?: string | null;
  animation_variant?: string | null;
  created_at: string;
  gift: LiveGiftCatalogItem | null;
}

export interface SendGiftOptions {
  quantity?: number;
  message?: string;
  animationVariant?: string;
}

export interface SendGiftResult {
  success: boolean;
  error?: string;
  balance?: any;
  event?: LiveGiftEventItem;
}

export interface UseLiveGiftsState {
  catalog: LiveGiftCatalogItem[];
  events: LiveGiftEventItem[];
  loading: boolean;
  sending: boolean;
  sendGift: (giftId: string, options?: SendGiftOptions) => Promise<SendGiftResult>;
}

const normalizeEvent = (
  row: any,
  giftFallback?: LiveGiftCatalogItem | null
): LiveGiftEventItem => ({
  id: row.id,
  room_id: row.room_id,
  sender_id: row.sender_id,
  quantity: row.quantity,
  total_credits: row.total_credits,
  message: row.message,
  animation_variant: row.animation_variant,
  created_at: row.created_at,
  gift: row.live_gift_catalog || giftFallback || null,
});

export const useLiveGifts = (roomId?: string | null): UseLiveGiftsState => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [catalog, setCatalog] = useState<LiveGiftCatalogItem[]>([]);
  const [events, setEvents] = useState<LiveGiftEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const eventIdsRef = useRef<Set<string>>(new Set());

  const catalogById = useMemo(() => {
    const map = new Map<string, LiveGiftCatalogItem>();
    catalog.forEach((item) => map.set(item.id, item));
    return map;
  }, [catalog]);

  const fetchCatalog = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_gift_catalog')
        .select('*')
        .eq('is_active', true)
        .order('credit_cost', { ascending: true });

      if (error) throw error;
      setCatalog(data || []);
    } catch (error) {
      console.error('Failed to load gift catalog', error);
      toast({
        title: 'Gift catalog unavailable',
        description: 'We could not load the latest gift catalog. Please try again.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchEvents = useCallback(async () => {
    if (!roomId) {
      setEvents([]);
      eventIdsRef.current = new Set();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_gift_events')
        .select(`
          id,
          room_id,
          sender_id,
          quantity,
          total_credits,
          message,
          animation_variant,
          created_at,
          live_gift_catalog (
            id,
            slug,
            label,
            description,
            credit_cost,
            animation_url,
            thumbnail_url
          )
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped = (data || []).map((row: any) => normalizeEvent(row));
      eventIdsRef.current = new Set(mapped.map((item) => item.id));
      setEvents(mapped);
    } catch (error) {
      console.error('Failed to load live gift feed', error);
      toast({
        title: 'Unable to fetch gifts',
        description: 'We could not load the recent gifts for this stream.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, toast]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`live-gifts:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_gift_events',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const record = payload.new as any;
          if (!record?.id || eventIdsRef.current.has(record.id)) {
            return;
          }

          const gift = catalogById.get(record.gift_id) || null;
          const normalized = normalizeEvent(record, gift);
          eventIdsRef.current.add(normalized.id);
          setEvents((prev) => [normalized, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, catalogById]);

  const sendGift = useCallback(
    async (giftId: string, options?: SendGiftOptions): Promise<SendGiftResult> => {
      if (!roomId) {
        return { success: false, error: 'Live room is not available' };
      }

      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Create a free account or sign in to send gifts.',
          variant: 'destructive',
        });
        return { success: false, error: 'Authentication required' };
      }

      setSending(true);

      try {
        const { data, error } = await supabase.functions.invoke('send-live-gift', {
          body: {
            room_id: roomId,
            gift_id: giftId,
            quantity: options?.quantity ?? 1,
            message: options?.message ?? null,
            animation_variant: options?.animationVariant ?? null,
          },
        });

        if (error) throw error;

        const normalized = data?.event
          ? normalizeEvent(data.event, catalogById.get(giftId))
          : undefined;

        if (normalized && !eventIdsRef.current.has(normalized.id)) {
          eventIdsRef.current.add(normalized.id);
          setEvents((prev) => [normalized, ...prev].slice(0, 50));
        }

        return { success: true, balance: data?.balance, event: normalized };
      } catch (error: any) {
        const message =
          error?.message || error?.error || 'We could not send your gift. Please try again.';
        toast({
          title: 'Gift not sent',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message };
      } finally {
        setSending(false);
      }
    },
    [catalogById, roomId, toast, user]
  );

  return {
    catalog,
    events,
    loading,
    sending,
    sendGift,
  };
};
