import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import CreateLabelForm from "@/components/LabelStudio/CreateLabelForm";
import { supabase } from "@/integrations/supabase/client";

const navLinkBase =
  "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground";

type MembershipRow = {
  role: "owner" | "admin" | "editor" | "viewer";
  created_at: string;
  labels: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
  } | null;
};

export default function LabelStudioLayout() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);

  // ✅ Minimal, reliable membership detection (no custom hooks)
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrText(null);

      // get current auth user
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        if (!mounted) return;
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // query memberships by user_id and join labels
      const { data, error } = await supabase
        .from("label_members")
        .select(
          `
          role,
          created_at,
          labels:label_id (
            id, slug, name, logo_url
          )
        `
        )
        .eq("user_id", userId);

      if (!mounted) return;

      if (error) {
        setErrText(error.message);
        setAuthorized(false);
      } else {
        const rows = (data as MembershipRow[] | null) ?? [];
        const has = rows.some((r) => r.labels); // at least one joined label row present
        setAuthorized(has);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
            <p className="text-muted-foreground">
              Create or upgrade to a label to get started.
            </p>
            {errText ? (
              <p className="text-sm text-red-500 mt-2">Error: {errText}</p>
            ) : null}
          </div>
          <CreateLabelForm
            onCreated={() => {
              // hard redirect to avoid stale state keeping you on the form
              window.location.replace("/studio/label/roster");
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
          <p className="text-muted-foreground">
            Manage roster, catalog, storefront, and finances
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          <NavLink
            to="/studio/label/roster"
            className={({ isActive }) =>
              `${navLinkBase} ${
                isActive ? "bg-primary text-primary-foreground" : ""
              }`
            }
          >
            Roster
          </NavLink>
          <NavLink
            to="/studio/label/catalog"
            className={({ isActive }) =>
              `${navLinkBase} ${
                isActive ? "bg-primary text-primary-foreground" : ""
              }`
            }
          >
            Catalog
          </NavLink>
          <NavLink
            to="/studio/label/storefront"
            className={({ isActive }) =>
              `${navLinkBase} ${
                isActive ? "bg-primary text-primary-foreground" : ""
              }`
            }
          >
            Storefront
          </NavLink>
          <NavLink
            to="/studio/label/analytics"
            className={({ isActive }) =>
              `${navLinkBase} ${
                isActive ? "bg-primary text-primary-foreground" : ""
              }`
            }
          >
            Analytics
          </NavLink>
          <NavLink
            to="/studio/label/financials"
            className={({ isActive }) =>
              `${navLinkBase} ${
                isActive ? "bg-primary text-primary-foreground" : ""
              }`
            }
          >
            Financials
          </NavLink>
          <NavLink
            to="/studio/label/settings"
            className={({ isActive }) =>
              `${navLinkBase} ${
                isActive ? "bg-primary text-primary-foreground" : ""
              }`
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
