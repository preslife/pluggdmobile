import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import CreateLabelForm from "@/components/LabelStudio/CreateLabelForm";
import { supabase } from "@/integrations/supabase/client";

const navLinkBase =
  "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground";

export default function LabelStudioLayout() {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug?: string }>();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [labels, setLabels] = useState<
    {
      id: string;
      slug: string;
      name: string | null;
      logo_url: string | null;
      cover_image_url: string | null;
      role: string | null;
      created_at: string | null;
    }[]
  >([]);
  const [errText, setErrText] = useState<string | null>(null);

  // Use RPCs so RLS never blocks us
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrText(null);

      // must be signed in
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        if (!mounted) return;
        setAuthorized(false);
        setLabels([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_current_user_labels");
      if (!mounted) return;

      if (error) {
        setErrText(error.message);
        setAuthorized(false);
        setLabels([]);
        setLoading(false);
        return;
      }

      const parsed = Array.isArray(data) ? data : [];
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

      const mapped = parsed.map((item: any) => ({
        id: item.id,
        slug: item.slug,
        name: item.name ?? null,
        logo_url: item.logo_url ?? null,
        cover_image_url: item.cover_image_url ?? null,
        role: item.role ?? item.your_role ?? null,
        created_at: item.created_at ?? null,
      }));

      mapped.sort((a, b) => {
        const roleDiff = rank(a.role) - rank(b.role);
        if (roleDiff !== 0) return roleDiff;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });

      setLabels(mapped);
      setAuthorized(parsed.length > 0);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const resolvedSlug = useMemo(() => {
    if (!labels.length) return null;
    if (routeSlug && labels.some((label) => label.slug === routeSlug)) {
      return routeSlug;
    }
    return labels[0]?.slug ?? null;
  }, [labels, routeSlug]);

  const activeLabel = useMemo(() => {
    if (!labels.length) return null;
    if (resolvedSlug) {
      return labels.find((label) => label.slug === resolvedSlug) ?? labels[0] ?? null;
    }
    return labels[0] ?? null;
  }, [labels, resolvedSlug]);

  const slug = activeLabel?.slug ?? "";

  // Ensure we always have a valid slug in the URL once memberships are known
  useEffect(() => {
    if (!authorized || loading) return;
    if (!resolvedSlug) return;
    if (!routeSlug || routeSlug !== resolvedSlug) {
      navigate(`/studio/label/${resolvedSlug}/roster`, { replace: true });
    }
  }, [authorized, loading, navigate, resolvedSlug, routeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold mb-2">Label Studio</h1>
          <p className="text-muted-foreground">Checking your label access…</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Label Studio</h1>
            <p className="text-muted-foreground">Create or upgrade to a label to get started.</p>
            {errText ? <p className="text-sm text-red-500 mt-2">Error: {errText}</p> : null}
          </div>
          <CreateLabelForm
            onCreated={() => {
              // reload to re-run the RPC checks
              window.location.replace("/studio/label");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Label Studio</h1>
          <p className="text-muted-foreground">Manage roster, catalog, storefront, and finances</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          <NavLink
            to={`/studio/label/${slug}/roster`}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Roster
          </NavLink>
          <NavLink
            to={`/studio/label/${slug}/catalog`}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Catalog
          </NavLink>
          <NavLink
            to={`/studio/label/${slug}/storefront`}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Storefront
          </NavLink>
          <NavLink
            to={`/studio/label/${slug}/analytics`}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Analytics
          </NavLink>
          <NavLink
            to={`/studio/label/${slug}/financials`}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Financials
          </NavLink>
          <NavLink
            to={`/studio/label/${slug}/settings`}
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Settings
          </NavLink>
        </div>
        <Outlet context={{ label: activeLabel, labels }} />
      </div>
    </div>
  );
}
