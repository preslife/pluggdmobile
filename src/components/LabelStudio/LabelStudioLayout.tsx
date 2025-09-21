import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CreateLabelForm from "@/components/LabelStudio/CreateLabelForm";

const navLinkBase =
  "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground";

export default function LabelStudioLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) { setAuthorized(false); return; }
      // Allow if profile is a label OR user is a member of any label
      const [{ data: myProfile }, { data: membership }] = await Promise.all([
        supabase.from("profiles").select("is_label").eq("user_id", user.id).single(),
        supabase.from("label_members").select("label_id").eq("user_id", user.id).limit(1),
      ]);
      setAuthorized(!!myProfile?.is_label || (membership && membership.length > 0));
    };
    checkAccess();
  }, [user]);

  // If not authorized or still loading, show upgrade CTA + form
  if (!authorized) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Label Studio</h1>
            <p className="text-muted-foreground">Create or upgrade to a label to get started.</p>
          </div>
          <CreateLabelForm onCreated={() => navigate("/studio/label/roster")} />
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
            to="/studio/label/roster"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Roster
          </NavLink>
          <NavLink
            to="/studio/label/catalog"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Catalog
          </NavLink>
          <NavLink
            to="/studio/label/storefront"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Storefront
          </NavLink>
          <NavLink
            to="/studio/label/analytics"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Analytics
          </NavLink>
          <NavLink
            to="/studio/label/financials"
            className={({ isActive }) =>
              `${navLinkBase} ${isActive ? "bg-primary text-primary-foreground" : ""}`
            }
          >
            Financials
          </NavLink>
          <NavLink
            to="/studio/label/settings"
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


