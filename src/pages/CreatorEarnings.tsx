import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { CreatorEarningsDashboard } from "@/components/CreatorEarningsDashboard";

const CreatorEarningsPage = () => {
  useEffect(() => {
    setMeta(
      "Creator Earnings — Pluggd",
      "Track your earnings from content sales, splits, and payouts across all revenue streams.",
      "/dashboard/creator/earnings"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <CreatorEarningsDashboard />
        </div>
      </main>
    </div>
  );
};

export default CreatorEarningsPage;