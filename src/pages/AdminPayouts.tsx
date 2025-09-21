
import { EnhancedAdminPayouts } from "@/components/EnhancedAdminPayouts";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminPayoutsPage = () => {
  useEffect(() => {
    setMeta(
      "Admin Payouts — Pluggd",
      "Manage producer payouts and batch processing for the platform.",
      "/admin/payouts"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <EnhancedAdminPayouts />
        </div>
      </main>
    </div>
  );
};

export default AdminPayoutsPage;