import DistributionManager from "@/components/DistributionManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminDistributionPage = () => {
  useEffect(() => {
    setMeta(
      "Distribution Management — Pluggd Admin",
      "Manage music distribution to streaming platforms and track performance.",
      "/admin/distribution"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <DistributionManager />
        </div>
      </main>
    </div>
  );
};

export default AdminDistributionPage;