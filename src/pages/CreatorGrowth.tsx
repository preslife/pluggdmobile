import { useEffect, useState } from "react";
import { setMeta } from "@/lib/seo";
import { CreatorGrowthDashboard } from "@/components/CreatorGrowthDashboard";

const CreatorGrowthPage = () => {
  useEffect(() => {
    setMeta(
      "Growth Dashboard — Pluggd",
      "Track your referrals and grow the Pluggd community with your unique referral link.",
      "/dashboard/creator/growth"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <CreatorGrowthDashboard />
        </div>
      </main>
    </div>
  );
};

export default CreatorGrowthPage;