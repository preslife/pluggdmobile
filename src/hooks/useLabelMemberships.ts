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

    const { data, error } = await supabase
      .from("label_members")
      .select(
        `label_id, role, labels!inner(id, name, slug, logo_url, cover_image_url)`
      )
      .eq("user_id", user.id)
      .order("role", { ascending: true });

    if (error) {
      setError(error.message);
      setMemberships([]);
      setLoading(false);
      return;
    }

    const mapped: LabelMembership[] = (data || []).map((row: any) => ({
      id: row.labels?.id ?? row.label_id,
      name: row.labels?.name ?? null,
      slug: row.labels?.slug ?? null,
      logo_url: row.labels?.logo_url ?? null,
      cover_image_url: row.labels?.cover_image_url ?? null,
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
