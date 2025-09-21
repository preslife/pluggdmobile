import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeedbackItem = {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  timecode_seconds: number | null;
  created_at: string;
};

export const useSessionFeedback = (sessionId: string | undefined) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data, error } = await (supabase
      .from("session_feedback") as any)
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (!error) setItems(((data as unknown) as FeedbackItem[]) || []);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "session_feedback", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setItems((prev) => [...prev, payload.new as FeedbackItem]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "session_feedback", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const removed = payload.old as FeedbackItem;
          setItems((prev) => prev.filter((i) => i.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const add = useCallback(
    async (content: string, timecodeSeconds?: number | null) => {
      if (!sessionId || !content.trim()) return { error: new Error("Empty") } as const;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: new Error("Please sign in") } as const;

      setSending(true);
      const { error } = await (supabase.from("session_feedback") as any).insert({
        session_id: sessionId,
        user_id: user.id,
        content: content.trim(),
        timecode_seconds: typeof timecodeSeconds === "number" ? timecodeSeconds : null,
      });
      setSending(false);
      if (error) return { error } as const;
      return { ok: true } as const;
    },
    [sessionId]
  );

  const remove = useCallback(async (id: string) => {
    const { error } = await (supabase.from("session_feedback") as any).delete().eq("id", id);
    if (error) return { error } as const;
    return { ok: true } as const;
  }, []);

  return { items, loading, sending, add, remove, reload: load } as const;
};
