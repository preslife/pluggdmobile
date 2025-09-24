import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ReleaseRow = Database["public"]["Tables"]["releases"]["Row"];

export type ReleaseSummary = {
  id: string;
  title: string | null;
  artist: string | null;
  cover_art_url: string | null;
  release_date: string | null;
  genre: string | null;
  image_url?: string;
};

export function useReleases(limit = 10) {
  const [data, setData] = useState<ReleaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReleases = async () => {
      setLoading(true);
      setError(null);

      const { data: rows, error } = await supabase
        .from("releases")
        .select("id,title,artist,cover_art_url,release_date,genre,status,approved")
        .eq("approved", true)
        .eq("status", "live")
        .order("release_date", { ascending: false })
        .limit(limit);

      if (!isMounted) {
        return;
      }

      if (error) {
        setError(error.message);
        setData([]);
        setLoading(false);
        return;
      }

      const normalized = (rows ?? []).map((row: ReleaseRow) => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        cover_art_url: row.cover_art_url,
        release_date: row.release_date,
        genre: row.genre,
        image_url: row.cover_art_url || undefined,
      }));

      setData(normalized);
      setLoading(false);
    };

    fetchReleases();

    return () => {
      isMounted = false;
    };
  }, [limit]);

  return { data, loading, error };
}
