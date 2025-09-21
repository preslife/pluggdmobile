import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { CreatorRevenueAnalytics } from "@/components/CreatorRevenueAnalytics";

const CreatorAnalyticsPage = () => {
  useEffect(() => {
    setMeta(
      "Creator Analytics — Pluggd",
      "Track your revenue and performance across battles, events, and fan subscriptions.",
      "/dashboard/creator/analytics"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <CreatorRevenueAnalytics />
        </div>
      </main>
    </div>
  );
};

export default CreatorAnalyticsPage;