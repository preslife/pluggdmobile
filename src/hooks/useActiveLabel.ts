import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalStudioContext } from "@/contexts/StudioContext";

export type ActiveLabel = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  role: string | null;
};

export function useActiveLabel() {
  const studioContext = useOptionalStudioContext();
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const { user } = useAuth();
  
  // Always call hooks unconditionally to satisfy Rules of Hooks
  const [label, setLabel] = useState<ActiveLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if we should use studio context
  const useStudioData = Boolean(studioContext);

  useEffect(() => {
    // If using studio context, skip the fetch logic
    if (useStudioData) {
      return;
    }

    const run = async () => {
      if (!user) { setLabel(null); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        if (routeSlug) {
          const { data: labelAccess, error: accessErr } = await supabase.rpc(
            "label_basic_by_slug",
            { p_slug: routeSlug }
          );
          if (accessErr) throw accessErr;

          const accessRow = Array.isArray(labelAccess)
            ? labelAccess[0]
            : labelAccess;

          if (!accessRow) {
            setLabel(null);
            setLoading(false);
            return;
          }

          const { data: labelRow, error: labelErr } = await supabase
            .from("labels")
            .select("id, name, slug, logo_url, cover_image_url")
            .eq("slug", routeSlug)
            .maybeSingle();

          if (labelErr) throw labelErr;

          if (!labelRow) {
            setLabel(null);
            setLoading(false);
            return;
          }

          setLabel({
            id: labelRow.id,
            name: labelRow.name,
            slug: labelRow.slug,
            logo_url: labelRow.logo_url,
            cover_image_url: labelRow.cover_image_url,
            role:
              accessRow.role ??
              accessRow.your_role ??
              accessRow.current_role ??
              null,
          });
          setLoading(false);
          return;
        }

        // Prefer an owned label, else first membership
        const { data: owned, error: ownedErr } = await supabase
          .from("label_members")
          .select("label_id, role")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .limit(1);
        if (ownedErr) throw ownedErr;

        let labelId = owned && owned.length > 0 ? owned[0].label_id : null;
        let role = owned && owned.length > 0 ? owned[0].role : null;

        if (!labelId) {
          const { data: anyMember, error: anyErr } = await supabase
            .from("label_members")
            .select("label_id, role")
            .eq("user_id", user.id)
            .limit(1);
          if (anyErr) throw anyErr;
          if (anyMember && anyMember.length > 0) {
            labelId = anyMember[0].label_id;
            role = anyMember[0].role;
          }
        }

        if (!labelId) {
          setLabel(null);
          setLoading(false);
          return;
        }

        const { data: lbl, error: lErr } = await supabase
          .from("labels")
          .select("id, name, slug, logo_url, cover_image_url")
          .eq("id", labelId)
          .maybeSingle();
        if (lErr) throw lErr;
        if (!lbl) { setLabel(null); setLoading(false); return; }
        setLabel({ id: lbl.id, name: lbl.name, slug: lbl.slug, logo_url: lbl.logo_url, cover_image_url: lbl.cover_image_url, role });
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [routeSlug, user?.id, useStudioData]);

  // If using studio context, return that data instead
  if (studioContext) {
    const { mode, activeLabel, labelsLoading } = studioContext;
    return {
      label: mode === "label" ? activeLabel : null,
      loading: labelsLoading,
      error: null as string | null,
    };
  }

  return { label, loading, error };
}
