import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SessionFile = {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_url: string; // storage path within the bucket
  file_type: string | null;
  size: number | null;
  created_at: string;
};

export const useSessionFiles = (sessionId: string | undefined) => {
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("session_files")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (!error) setFiles((data as SessionFile[]) || []);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime updates for file inserts and deletes within this session
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "session_files", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new as SessionFile;
          setFiles((prev) => {
            // avoid duplicate if already present
            if (prev.find((f) => f.id === next.id)) return prev;
            return [next, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "session_files", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const removed = payload.old as SessionFile;
          setFiles((prev) => prev.filter((f) => f.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const upload = useCallback(
    async (file: File) => {
      if (!sessionId) return { error: new Error("No session") } as const;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { error: new Error("Please sign in") } as const;

      setUploading(true);
      const path = `${sessionId}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase
        .storage
        .from("session-files")
        .upload(path, file, { contentType: file.type });

      if (storageError) {
        setUploading(false);
        return { error: storageError } as const;
      }

      const { error: dbError } = await supabase
        .from("session_files")
        .insert({
          session_id: sessionId,
          user_id: auth.user.id,
          file_name: file.name,
          file_url: path,
          file_type: file.type || null,
          size: file.size,
        })
        .select("id")
        .maybeSingle();

      setUploading(false);
      if (dbError) return { error: dbError } as const;

      await refresh();
      return { ok: true } as const;
    },
    [sessionId, refresh]
  );

  const remove = useCallback(
    async (id: string, filePath: string) => {
      // remove from storage first (ignore error until DB confirm)
      await supabase.storage.from("session-files").remove([filePath]);
      const { error } = await supabase
        .from("session_files")
        .delete()
        .eq("id", id);
      if (!error) await refresh();
      return { error } as const;
    },
    [refresh]
  );

  const getSignedUrl = useCallback(async (filePath: string) => {
    const { data, error } = await supabase
      .storage
      .from("session-files")
      .createSignedUrl(filePath, 60);
    return { url: data?.signedUrl, error } as const;
  }, []);

  return { files, loading, uploading, upload, remove, getSignedUrl, refresh } as const;
};
