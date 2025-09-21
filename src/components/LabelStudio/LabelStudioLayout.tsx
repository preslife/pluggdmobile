import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import CreateLabelForm from "@/components/LabelStudio/CreateLabelForm";
import { useLabelMemberships } from "@/hooks/useLabelMemberships";

const navLinkBase =
  "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground";

export default function LabelStudioLayout() {
  const navigate = useNavigate();
  const { memberships, loading, refresh } = useLabelMemberships();
  const authorized = memberships.length > 0;

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
          </div>
          <CreateLabelForm
            onCreated={async () => {
              await refresh();
              navigate("/studio/label/roster");
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

