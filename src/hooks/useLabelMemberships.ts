import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ActiveLabel } from "@/hooks/useActiveLabel";

export type LabelMembership = ActiveLabel & {
  role: string | null;
};

export function useLabelMemberships() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<LabelMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("get_current_user_labels");

    if (error) {
      setError(error.message);
      setMemberships([]);
      setLoading(false);
      return;
    }

    const mapped: LabelMembership[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name ?? null,
      slug: row.slug ?? null,
      logo_url: row.logo_url ?? null,
      cover_image_url: row.cover_image_url ?? null,
      role: row.role ?? null,
    }));

    setMemberships(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const reload = useCallback(async () => {
    await fetchMemberships();
  }, [fetchMemberships]);

  const ownersFirst = useMemo(() => {
    return memberships.slice().sort((a, b) => {
      const rank = (role?: string | null) => {
        switch (role) {
          case "owner":
            return 0;
          case "admin":
            return 1;
          case "editor":
            return 2;
          default:
            return 3;
        }
      };
      return rank(a.role) - rank(b.role);
    });
  }, [memberships]);

  return {
    memberships: ownersFirst,
    loading,
    error,
    refresh: reload,
  };
}
