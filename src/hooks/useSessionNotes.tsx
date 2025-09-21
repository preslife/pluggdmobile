import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSessionNotes = (sessionId: string | undefined) => {
  const [content, _setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ content: string; editorId?: string | null; editorName?: string | null } | null>(null);

  // Track if the user has unsaved local edits to avoid overwriting with remote updates
  const isDirtyRef = useRef(false);

  const setContent = useCallback((next: string) => {
    isDirtyRef.current = true;
    _setContent(next);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!sessionId) return;
      setLoading(true);
      const { data } = await supabase
        .from("session_notes")
        .select("content, updated_by")
        .eq("session_id", sessionId)
        .maybeSingle();
      _setContent((data as any)?.content || "");
      isDirtyRef.current = false;
      setLoading(false);
    };
    load();
  }, [sessionId]);

  const save = useCallback(
    async (next: string) => {
      if (!sessionId) return { error: new Error("No session") } as const;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: new Error("Please sign in") } as const;

      setSaving(true);
      const { error } = await supabase
        .from("session_notes")
        .upsert({ session_id: sessionId, content: next, updated_by: user.id })
        .select("session_id")
        .maybeSingle();
      setSaving(false);

      if (error) return { error } as const;
      isDirtyRef.current = false;
      return { ok: true } as const;
    },
    [sessionId]
  );

  // Realtime: listen for external updates to notes for this session
  useEffect(() => {
    let currentUserId: string | null = null;
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    };
    init();

    if (!sessionId) return;
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_notes", filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const next = payload.new as any;
          const fromOther = !currentUserId || next.updated_by !== currentUserId;
          if (!fromOther) return;

          if (isDirtyRef.current) {
            // hold as pending, and try to fetch editor name for UX
            let editorName: string | null = null;
            if (next.updated_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("user_id", next.updated_by)
                .maybeSingle();
              editorName = (profile as any)?.full_name || (profile as any)?.username || null;
            }
            setPending({ content: next.content || "", editorId: next.updated_by || null, editorName });
          } else {
            _setContent(next.content || "");
            isDirtyRef.current = false;
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "session_notes", filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const next = payload.new as any;
          const fromOther = !currentUserId || next.updated_by !== currentUserId;
          if (!fromOther) return;

          if (isDirtyRef.current) {
            let editorName: string | null = null;
            if (next.updated_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("user_id", next.updated_by)
                .maybeSingle();
              editorName = (profile as any)?.full_name || (profile as any)?.username || null;
            }
            setPending({ content: next.content || "", editorId: next.updated_by || null, editorName });
          } else {
            _setContent(next.content || "");
            isDirtyRef.current = false;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const applyIncoming = useCallback(() => {
    if (!pending) return;
    _setContent(pending.content);
    isDirtyRef.current = false;
    setPending(null);
  }, [pending]);

  return { content, setContent, loading, saving, save, pendingRemote: pending?.content || null, pendingEditorName: pending?.editorName || null, applyIncoming } as const;
};
