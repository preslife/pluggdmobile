import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import CreateLabelForm from "@/components/LabelStudio/CreateLabelForm";
import { supabase } from "@/integrations/supabase/client";

const navLinkBase =
  "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground";

export default function LabelStudioLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
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
        setCurrentSlug(null);
        setLoading(false);
        return;
      }

      // 1) do I have any memberships?
      const { data: hasMem, error: memErr } = await supabase.rpc("has_label_membership");
      if (!mounted) return;

      if (memErr) {
        setErrText(memErr.message);
        setAuthorized(false);
        setCurrentSlug(null);
        setLoading(false);
        return;
      }

      const isMember = Boolean(hasMem);
      setAuthorized(isMember);

      // 2) if yes, get the first slug
      if (isMember) {
        const { data: slugRow, error: slugErr } = await supabase.rpc(
          "first_label_slug_for_current_user"
        );
        if (!mounted) return;

        if (slugErr) {
          setErrText(slugErr.message);
          setCurrentSlug(null);
        } else {
          setCurrentSlug(slugRow ?? null);
        }
      } else {
        setCurrentSlug(null);
      }

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Redirect base paths to slugged route
  useEffect(() => {
    if (!authorized || !currentSlug) return;

    const basePaths = [
      "/studio/label",
      "/studio/label/",
      "/studio/label/roster",
      "/studio/label/catalog",
      "/studio/label/storefront",
      "/studio/label/analytics",
      "/studio/label/financials",
      "/studio/label/settings",
    ];

    const isBase = basePaths.includes(location.pathname);
    const alreadySlugged = location.pathname.startsWith(`/studio/label/${currentSlug}`);

    if (isBase && !alreadySlugged) {
      navigate(`/studio/label/${currentSlug}/roster`, { replace: true });
    }
  }, [authorized, currentSlug, location.pathname, navigate]);

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

  const slug = currentSlug ?? "";

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
        <Outlet />
      </div>
    </div>
  );
}
