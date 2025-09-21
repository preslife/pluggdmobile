import { BundleManager } from "@/components/BundleManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminBundlesPage = () => {
  useEffect(() => {
    setMeta(
      "Bundle Management — Pluggd Admin",
      "Create and manage product bundles with discounts and special offers.",
      "/admin/bundles"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <BundleManager />
        </div>
      </main>
    </div>
  );
};

export default AdminBundlesPage;