import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresenceUser = {
  user_id: string;
  online_at: string;
  name?: string | null;
  avatar_url?: string | null;
};

export const useSessionPresence = (sessionId: string | undefined) => {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    let room: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const presenceKey = user?.id || Math.random().toString(36).slice(2);

      room = supabase.channel(`presence:live-session:${sessionId}`, {
        config: {
          presence: { key: presenceKey },
        },
      });

      const updateState = () => {
        if (!room) return;
        const state = room.presenceState() as Record<string, PresenceUser[]>;
        const list: PresenceUser[] = Object.values(state).flat();
        setUsers(list);
      };

      room
        .on('presence', { event: 'sync' }, updateState)
        .on('presence', { event: 'join' }, updateState)
        .on('presence', { event: 'leave' }, updateState)
        .subscribe(async (status) => {
          if (status !== 'SUBSCRIBED') return;

          // try to enrich presence with profile info
          let name: string | null = null;
          let avatar_url: string | null = null;
          if (user?.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username, avatar_url')
              .eq('user_id', user.id)
              .maybeSingle();
            name = (profile as any)?.full_name || (profile as any)?.username || null;
            avatar_url = (profile as any)?.avatar_url || null;
          }

          await room!.track({
            user_id: user?.id || 'anon',
            online_at: new Date().toISOString(),
            name,
            avatar_url,
          } as PresenceUser);
        });
    };

    init();

    return () => {
      if (room) supabase.removeChannel(room);
    };
  }, [sessionId]);

  const count = useMemo(() => users.length, [users]);

  return { users, count } as const;
};
