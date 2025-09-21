import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SessionMessage = {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export const useSessionChat = (sessionId: string | undefined) => {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data } = await supabase
      .from("session_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data || []);
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
        { event: "INSERT", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as SessionMessage]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const removed = payload.old as SessionMessage;
          setMessages((prev) => prev.filter((m) => m.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const send = useCallback(async (text: string) => {
    if (!sessionId || !text.trim()) return { error: new Error("Empty") } as const;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error("Please sign in") } as const;

    const { error } = await supabase.from("session_messages").insert({ session_id: sessionId, user_id: user.id, content: text.trim() });
    if (error) return { error } as const;
    return { ok: true } as const;
  }, [sessionId]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("session_messages").delete().eq("id", id);
    if (error) return { error } as const;
    return { ok: true } as const;
  }, []);

  return { messages, loading, send, remove } as const;
};
